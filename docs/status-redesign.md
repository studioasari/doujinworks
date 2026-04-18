# ステータス設計リファクタリング仕様書

## 1. 背景と目的

### 1.1 現状の問題点

現行のデータベース設計では、`work_requests.status` カラム1つに「募集の状態」と「進行の状態」という異なる意味が混在している。このため以下の問題が発生している。

1. **並行契約時の不整合**: 1つの `work_request` に複数の `work_contracts` が紐づく並行契約において、親のステータス1つで全体を表現できない。実際に本番DBで「親は `open` のまま、子契約は全て `completed`」という不整合が確認されている。

2. **応募ステータスの更新漏れ**: 案件完了後も `work_request_applications.status` が `pending` のまま残り、ダッシュボードに「応募中」として誤表示される。現在1件のゴミデータが存在する。

3. **ラベルのゆれ**: 同一ステータス値(`contracted`)が画面によって「仮払い待ち」「募集終了」「契約済み」の3通りに表示されている。

4. **同期ロジックの散在**: ステータス更新処理が各 API・画面に分散しており、更新漏れや整合性破壊のリスクが高い。

5. **`contracted_count` の競合リスク**: フロントエンド側で採用人数をカウントして DB に書き込んでいるため、同時採用操作で不整合が発生しうる。

### 1.2 リファクタリングの目的

- `work_requests` の状態を「募集の状態(recruitment_status)」と「進行の状態(progress_status)」の2軸に分離する
- ステータスラベル変換を単一のソースに集約する
- 親子同期ロジックを共通関数に集約する
- 関連する付随バグを同時に修正する

### 1.3 スコープ外

- Stripe Webhook の他イベント対応(返金等)
- `supabase/migrations/` ディレクトリの導入による永続的なスキーマ管理体制

これらは別タスクとして `docs/audit-report.md` に追記する。

---

## 2. 新スキーマ定義

### 2.1 `work_requests` テーブル

#### 追加カラム

| カラム名 | 型 | NOT NULL | デフォルト | 意味 |
|---|---|---|---|---|
| `recruitment_status` | TEXT | ✓ | `'open'` | 募集の状態 |
| `progress_status` | TEXT | ✓ | `'pending'` | 進行の状態 |

#### 削除カラム

| カラム名 | 理由 |
|---|---|
| `status` | 新2軸に置き換え |

#### CHECK 制約

```sql
ALTER TABLE work_requests
  ADD CONSTRAINT work_requests_recruitment_status_check
    CHECK (recruitment_status IN ('open', 'filled', 'withdrawn')),
  ADD CONSTRAINT work_requests_progress_status_check
    CHECK (progress_status IN ('pending', 'active', 'completed', 'cancelled'));
```

### 2.2 `work_contracts` テーブル

**スキーマ変更なし**(`status` カラムはそのまま、値も現状維持)。ただし CHECK 制約を新設する。

```sql
ALTER TABLE work_contracts
  ADD CONSTRAINT work_contracts_status_check
    CHECK (status IN ('contracted', 'paid', 'delivered', 'completed', 'cancelled'));
```

### 2.3 `work_request_applications` テーブル

#### 追加カラム

| カラム名 | 型 | NOT NULL | デフォルト | 意味 |
|---|---|---|---|---|
| `rejected_at` | TIMESTAMPTZ | - | NULL | 却下日時(ダッシュボードのフェードアウト判定用) |
| `rejection_reason` | TEXT | - | NULL | 却下理由(メッセージ出し分け用) |

#### CHECK 制約(status は現状維持)

```sql
ALTER TABLE work_request_applications
  ADD CONSTRAINT work_request_applications_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  ADD CONSTRAINT work_request_applications_rejection_reason_check
    CHECK (rejection_reason IS NULL OR rejection_reason IN
      ('filled', 'withdrawn', 'cancelled', 'completed', 'manual'));
```

---

## 3. `recruitment_status` の値と状態遷移

### 3.1 値の定義

| 値 | 意味 | いつこの状態になる |
|---|---|---|
| `open` | 応募受付中 | 案件作成時の初期値 |
| `filled` | 募集枠が全て埋まった(前向きな終了) | 採用人数が `number_of_positions` に達した瞬間 |
| `withdrawn` | クライアントが取り下げた(後ろ向きな終了) | クライアントが手動で募集を終了した・案件を取り下げた |

### 3.2 状態遷移

```
[作成]
  │
  ↓
[open]
  │
  ├── 採用人数が number_of_positions に到達 ───→ [filled]
  │
  └── クライアントが取り下げ ────────────────→ [withdrawn]
```

### 3.3 遷移ルール

- `open` → `filled`: 自動(採用処理内で判定)
- `open` → `withdrawn`: 手動(クライアント操作)
- `filled` → いずれも禁止(終端)
- `withdrawn` → いずれも禁止(終端)
- `filled` ↔ `withdrawn` 間の遷移禁止

---

## 4. `progress_status` の値と状態遷移

### 4.1 値の定義

| 値 | 意味 | いつこの状態になる |
|---|---|---|
| `pending` | 契約まだなし | 案件作成時の初期値 |
| `active` | 契約1件以上あり、かつ未終端の契約が1つ以上ある | 初めての `work_contract` が作成された瞬間 |
| `completed` | 全契約が終端、かつ1件以上 completed | 全子契約が completed または cancelled、かつ completed が1件以上 |
| `cancelled` | 全契約が終端、かつ全て cancelled | 全子契約が cancelled、または契約ゼロで取り下げ |

### 4.2 状態遷移

```
[作成]
  │
  ↓
[pending]
  │
  ├── 初めての契約作成 ────────────────→ [active]
  │                                          │
  │                                          ├── 全契約終端かつ1件以上 completed ──→ [completed]
  │                                          │
  │                                          └── 全契約が cancelled ──────────────→ [cancelled]
  │
  └── 契約ゼロで取り下げ ────────────────→ [cancelled]
```

### 4.3 遷移ルール

- `pending` → `active`: 自動(契約作成時)
- `pending` → `cancelled`: 自動(`recruitment_status` が `withdrawn` になった時、かつ契約ゼロ)
- `active` → `completed`: 自動(子契約のステータス変更時に判定)
- `active` → `cancelled`: 自動(子契約のステータス変更時に判定)
- `completed`/`cancelled`: 終端(管理者による強制操作を除き戻れない)

### 4.4 判定ロジック(active から遷移する条件)

子契約の状態が変化したときに毎回判定:

```
全子契約が completed または cancelled:
  completed が1件以上 → progress_status = 'completed'
  全て cancelled → progress_status = 'cancelled'

未終端の子契約(contracted / paid / delivered)が1つでもある:
  progress_status = 'active' のまま
```

---

## 5. `work_contracts.status` の値(現状維持)

### 5.1 値の定義

| 値 | 意味 |
|---|---|
| `contracted` | 仮払い待ち |
| `paid` | 仮払い済・作業中 |
| `delivered` | 納品済・検収待ち |
| `completed` | 検収完了 |
| `cancelled` | キャンセル |

### 5.2 状態遷移(既存通り)

```
[作成]
  │
  ↓
[contracted] ── Stripe 仮払い完了 ──→ [paid] ── 納品 ──→ [delivered] ── 検収承認 ──→ [completed]
  │                                   │                   │
  │                                   │                   └── 差戻し ──→ [paid]
  │                                   │
  └─── キャンセル ──→ [cancelled] ──┘
```

- `delivered` → `paid`(差戻し)は例外的に戻れる唯一の遷移
- それ以外は単方向

---

## 6. `work_request_applications.status` の値

### 6.1 値の定義

| 値 | 意味 |
|---|---|
| `pending` | 選考中 |
| `accepted` | 採用 |
| `rejected` | 不採用 |

### 6.2 `rejected_at` の設定タイミング

`status` が `pending` から `rejected` に変わる全てのタイミングで、`rejected_at = NOW()` を設定する。

### 6.3 `rejection_reason` の設定タイミング

`status` を `rejected` に更新する際に、必ず以下のいずれかの値を設定する。

| 値 | 契機 | ダッシュボード表示メッセージ |
|---|---|---|
| `filled` | 募集枠が埋まった際に、残りの pending を一括却下 | 「別の方が採用されました」 |
| `withdrawn` | クライアントが案件を取り下げ(withdrawn) | 「依頼者が募集を終了しました」 |
| `cancelled` | 案件全体がキャンセル(progress_status = cancelled) | 「依頼がキャンセルされました」 |
| `completed` | 案件完了時に未処理の pending を一括却下 | 「依頼が他の方で完了しました」 |
| `manual` | クライアントが個別に「不採用」操作 | 「残念ながら今回は選考に漏れました」 |

---

## 7. 状態遷移を起こす操作の一覧

### 7.1 APIルートごとの責務

| API / 操作 | 遷移させるステータス | 補足処理 |
|---|---|---|
| 案件作成 (`POST /api/requests/create` 等) | `work_requests`: `recruitment_status=open`, `progress_status=pending` を INSERT | - |
| 応募作成 | `applications.status=pending` を INSERT | - |
| 採用処理 (`/requests/[id]/manage/client.tsx` 内) | 該当 application: `pending` → `accepted`、`work_contract` を INSERT (`status=contracted`)、`progress_status`: `pending` → `active`、定員到達時は `recruitment_status`: `open` → `filled` と残り pending を一括 rejected(`rejection_reason=filled`) | 共通関数 `acceptApplication()` に集約 |
| 募集終了 (手動) | `recruitment_status`: `open` → `withdrawn`、残り pending を一括 rejected(`rejection_reason=withdrawn`)、契約ゼロ時は `progress_status`: `pending` → `cancelled` | 共通関数 `withdrawWorkRequest()` に集約 |
| 個別却下 | 該当 application: `pending` → `rejected`、`rejection_reason=manual` | - |
| Stripe Webhook (`/api/webhooks/stripe`) | `work_contracts.status`: `contracted` → `paid` | 親 `progress_status` は変化なし(既に active) |
| 納品 (`/api/deliveries/create`) | `work_contracts.status`: `paid` → `delivered` | - |
| 検収承認 (契約詳細画面) | `work_contracts.status`: `delivered` → `completed`、全契約完了時は `progress_status`: `active` → `completed` と残り pending を一括 rejected(`rejection_reason=completed`) | 共通関数 `syncProgressStatus()` に集約 |
| 差戻し (契約詳細画面) | `work_contracts.status`: `delivered` → `paid` | - |
| キャンセル承認 (契約詳細画面) | `work_contracts.status`: `cancelled`、全契約キャンセル時は `progress_status`: `active` → `cancelled` と残り pending を一括 rejected(`rejection_reason=cancelled`) | 共通関数 `syncProgressStatus()` に集約 |
| 自動承認 Cron (`/api/cron/auto-approve`) | 7日経過 `delivered` → `completed`、同様の親判定 | 共通関数 `syncProgressStatus()` を呼ぶ |
| 管理者強制操作 (`/admin/requests`) | 任意のステータスに強制遷移可能 | 監査ログに記録 |

### 7.2 共通関数の設計(`lib/work-request-status.ts`)

```typescript
/**
 * 採用処理: application を accepted にし、契約を作成し、
 * 定員判定と一括却下を行う
 */
async function acceptApplication(params: {
  applicationId: string
  workRequestId: string
  finalPrice: number
  deadline: string | null
}): Promise<{ workContractId: string }>

/**
 * 案件取り下げ: recruitment_status を withdrawn にし、
 * pending を一括却下し、契約ゼロなら progress_status を cancelled に
 */
async function withdrawWorkRequest(workRequestId: string): Promise<void>

/**
 * 子契約の状態変化後に呼ぶ: 親の progress_status を再計算して更新
 */
async function syncProgressStatus(workRequestId: string): Promise<void>

/**
 * 指定 work_request の pending な応募を一括却下する
 * (filled/withdrawn/completed/cancelled 契機で使用)
 */
async function rejectPendingApplications(params: {
  workRequestId: string
  reason: 'filled' | 'withdrawn' | 'cancelled' | 'completed'
}): Promise<void>
```

### 7.3 トランザクション性

- 1つのSQLトランザクション内で親子を更新するのは困難なため、**ベストエフォート方式**を採用
- 子を更新 → 親を更新 の順で実行
- 失敗時はログに記録
- Cron ジョブで定期的に親子整合性を検証・修復(self-healing)

---

## 8. ラベル統一表

### 8.1 実装場所

`lib/status-labels.ts` に集約。各画面はこのファイルから import するのみ。画面独自のラベル変換は全て削除。

### 8.2 ラベル定義

```typescript
export const RECRUITMENT_STATUS_LABELS = {
  open: '募集中',
  filled: '募集終了',
  withdrawn: '取下げ',
} as const

export const PROGRESS_STATUS_LABELS = {
  pending: '契約前',
  active: '進行中',
  completed: '完了',
  cancelled: 'キャンセル',
} as const

export const CONTRACT_STATUS_LABELS = {
  contracted: '仮払い待ち',
  paid: '作業中',
  delivered: '納品済み',
  completed: '完了',
  cancelled: 'キャンセル',
} as const

export const APPLICATION_STATUS_LABELS = {
  pending: '応募中',
  accepted: '採用',
  rejected: '不採用',
} as const

export const REJECTION_REASON_MESSAGES = {
  filled: '別の方が採用されました',
  withdrawn: '依頼者が募集を終了しました',
  cancelled: '依頼がキャンセルされました',
  completed: '依頼が他の方で完了しました',
  manual: '残念ながら今回は選考に漏れました',
} as const

/**
 * 案件の表示用ラベルを取得(バッジ表示統合関数)
 * open の場合は募集中を、それ以外は progress_status のラベルを返す
 */
export function getWorkRequestDisplayLabel(request: {
  recruitment_status: string
  progress_status: string
}): string {
  if (request.recruitment_status === 'open') {
    return RECRUITMENT_STATUS_LABELS.open
  }
  return PROGRESS_STATUS_LABELS[
    request.progress_status as keyof typeof PROGRESS_STATUS_LABELS
  ] ?? request.progress_status
}
```

### 8.3 バッジ色の対応表

既存の CSS 変数を流用。

| ステータス | CSS クラス(例) | 色系統 |
|---|---|---|
| `recruitment_status=open` | `statusInfo` | 青 |
| `recruitment_status=filled` | `statusNeutral` | グレー |
| `recruitment_status=withdrawn` | `statusNeutral` | グレー |
| `progress_status=pending` | `statusNeutral` | グレー |
| `progress_status=active` | `statusWarning` | 黄 |
| `progress_status=completed` | `statusSuccess` | 緑 |
| `progress_status=cancelled` | `statusError` | 赤 |
| `contract.status=contracted` | `statusWarning` | 黄 |
| `contract.status=paid` | `statusInfo` | 青 |
| `contract.status=delivered` | `statusSuccess` | 緑 |
| `contract.status=completed` | `statusSuccess` | 緑 |
| `contract.status=cancelled` | `statusError` | 赤 |

---

## 9. UIフィルター定義

### 9.1 ダッシュボード `/dashboard` - 依頼者視点

#### 進行中のお仕事(メインセクション)

```
progress_status IN ('pending', 'active')
AND 自分が requester
AND 30日ルール(updated_at が30日以内)
```

バッジで `募集中` / `進行中` を区別。

### 9.2 ダッシュボード `/dashboard` - 受注者視点

#### 進行中のお仕事(メインセクション)

```
自分の application.status = 'accepted'
AND 対応する work_contract.status IN ('contracted', 'paid', 'delivered')
AND 30日ルール
```

#### 応募中(サブセクション)

```
自分の application.status = 'pending'
AND 親の recruitment_status = 'open'
AND 親の progress_status IN ('pending', 'active')
```

#### 最近の選考結果(新規サブセクション、配置: 進行中の下、注釈の上)

```
自分の application.status = 'rejected'
AND rejected_at >= NOW() - INTERVAL '7 days'
```

表示メッセージは `rejection_reason` に従って出し分け(`REJECTION_REASON_MESSAGES` を使用)。

### 9.3 依頼管理 `/requests/manage` - 依頼者ビュー

| タブ | 定義 |
|---|---|
| 募集中 | `recruitment_status = 'open'` |
| 進行中 | `progress_status = 'active'` |
| 完了 | `progress_status IN ('completed', 'cancelled')` AND `recruitment_status ≠ 'open'` (= withdrawn も含む) |

完了タブ内ではバッジで `完了` / `キャンセル` / `取下げ` を区別。

### 9.4 依頼管理 `/requests/manage` - クリエイタービュー

| タブ | 定義 |
|---|---|
| 応募中 | `application.status = 'pending'` AND 親 `recruitment_status = 'open'` AND 親 `progress_status IN ('pending','active')` |
| 受注中 | `application.status = 'accepted'` AND `work_contract.status IN ('contracted','paid','delivered')` |
| 完了 | `application.status = 'accepted'` AND `work_contract.status = 'completed'` |
| 不採用(新規) | `application.status = 'rejected'`(期間制限なし、全件) |

### 9.5 案件詳細 `/requests/[id]`

- **応募ボタン表示**: `recruitment_status = 'open'`
- **「募集終了」表示**: `recruitment_status IN ('filled','withdrawn')`
- **「完了済み」表示**: `progress_status = 'completed'`

### 9.6 公開案件一覧 `/requests`, `/search`

```
recruitment_status = 'open'
AND is_deleted = false
```

`filled`/`withdrawn` は公開一覧に表示しない。

### 9.7 支払い管理 `/dashboard/payments`

`work_contracts.status` のみで動作(現状維持)。親のステータスは参照しない。

### 9.8 売上管理 `/dashboard/earnings`

親案件の表示ラベルは `getWorkRequestDisplayLabel()` を使用。

### 9.9 管理画面 `/admin/requests`

2軸のフィルターを独立して提供:
- `recruitment_status` フィルター(open / filled / withdrawn / 全て)
- `progress_status` フィルター(pending / active / completed / cancelled / 全て)

### 9.10 アカウント削除前チェック `/dashboard/settings`

既存バグ修正: `contracted` のみでなく、進行中の全契約をチェック。

```
work_contracts.status IN ('contracted', 'paid', 'delivered')
AND (contractor_id = 自分 OR work_request.requester_id = 自分)
```

---

## 10. 既存データマイグレーション方針

### 10.1 方針: 全データ削除によるクリーンスタート

テストデータのみであるため、既存15件の `work_requests` とその関連データは全削除する。

### 10.2 削除対象テーブル(実行順序)

```sql
DELETE FROM reviews;
DELETE FROM messages;
DELETE FROM chat_rooms;
DELETE FROM delivery_files;
DELETE FROM work_deliveries;
DELETE FROM payments;
DELETE FROM cancellation_requests;
DELETE FROM work_contracts;
DELETE FROM work_request_applications;
DELETE FROM notifications;
DELETE FROM work_requests;
```

### 10.3 保持するテーブル

- `profiles`(ユーザーアカウント)
- `portfolio_items`(ポートフォリオ)
- `stripe_events`(Webhook 冪等性履歴)
- `auth.users`(認証情報)

### 10.4 スキーマ変更 SQL(概要、詳細は Phase 3 で作成)

```sql
-- work_requests
ALTER TABLE work_requests ADD COLUMN recruitment_status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE work_requests ADD COLUMN progress_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE work_requests DROP COLUMN status;

-- CHECK 制約追加
(省略、Phase 3 で詳細化)

-- work_request_applications
ALTER TABLE work_request_applications ADD COLUMN rejected_at TIMESTAMPTZ;
ALTER TABLE work_request_applications ADD COLUMN rejection_reason TEXT;

-- 各種 CHECK 制約追加
(省略、Phase 3 で詳細化)
```

### 10.5 実行手順

1. (事前)Supabase の Database Backup を取得
2. Supabase SQL Editor でデータ削除 SQL を実行
3. Supabase SQL Editor でスキーマ変更 SQL を実行
4. `npx supabase gen types typescript` で `types/database.types.ts` を再生成
5. Phase 4〜5 のコード修正中は一部画面が動かなくなる期間が発生
6. Phase 5 完了後に全機能復旧・動作確認

### 10.6 R2 上のファイル

孤児化する可能性があるが、実害なし。将来的に別タスクでクリーンアップ。

---

## 11. 同時対応する別バグ

### 11.1 バグD: `contracted_count` の競合リスク

- **場所**: `app/requests/[id]/manage/client.tsx` L207-215
- **問題**: フロントエンドで `contracts.length + 1` を計算して書き込み
- **対応**: DB 側で原子的に INCREMENT するか、サーバーサイド処理で SELECT + UPDATE を1トランザクションに
- **実施タイミング**: 採用処理の共通関数 `acceptApplication()` 内でサーバーサイド処理化

### 11.2 バグE: 一覧ページで `contracted_count` がハードコード 0

- **場所**:
  - `app/components/RequestList.tsx` L400: `0/{request.number_of_positions || 1}人`
  - `app/search/client.tsx` L508: `0/{request.number_of_positions || 1}人`
- **対応**: `{request.contracted_count || 0}/{request.number_of_positions || 1}人` に変更

### 11.3 バグF: アカウント削除前チェックの漏れ

- **場所**: `app/dashboard/settings/client.tsx` L198, L213
- **問題**: `contracted` のみチェック、`paid`/`delivered` が見落とされる
- **対応**: `status IN ('contracted', 'paid', 'delivered')` に変更

### 11.4 バグH: Edge Functions ディレクトリの削除

- **場所**: `supabase/functions/` ディレクトリ(空)
- **対応**: ディレクトリを削除

---

## 12. 別タスクに回すもの

### 12.1 Webhook 他イベント対応(G)

Stripe Webhook が `checkout.session.completed` しか処理していない。返金関連イベントへの対応は別タスク。`docs/audit-report.md` に追記。

### 12.2 マイグレーションファイル管理(I)

`supabase/migrations/` でのスキーマ管理導入。今回のリファクタリング以降、スキーマ変更は全てマイグレーションファイルで管理する運用に切り替える。Phase 3 の作業中に基盤を作る。

---

## 13. 実装フェーズ計画

| Phase | 内容 | 備考 |
|---|---|---|
| Phase 1 | 全容調査(完了) | - |
| Phase 2 | 本ドキュメント作成(完了) | - |
| Phase 3 | マイグレーション SQL 作成 | ユーザーが Supabase SQL Editor で手動実行 |
| Phase 4 | バックエンド修正 | API、共通関数、Cron、Webhook |
| Phase 5 | フロントエンド修正 | 全画面のステータス参照、ラベル統合 |
| Phase 6 | 動作確認 | 全フロー通しテスト |

### 13.1 Phase 3 での成果物

- `supabase/migrations/YYYYMMDDHHMMSS_status_redesign.sql`(新規)
- データ削除 SQL
- 再生成された `types/database.types.ts`

### 13.2 Phase 4 での成果物

- `lib/work-request-status.ts`(新規、共通関数)
- `lib/status-labels.ts`(新規、ラベル定義)
- 各 API ルートの修正

### 13.3 Phase 5 での成果物

- 各画面ファイルの修正(ステータス参照箇所の書き換え)

### 13.4 Phase 6 でのテストシナリオ

1. 案件作成 → 応募 → 採用 → 仮払い → 納品 → 検収 → 完了(単一契約)
2. 案件作成 → 応募(複数) → 採用(複数) → 全員完了(並行契約)
3. 案件作成 → 応募 → 募集終了(取り下げ)
4. 案件作成 → 応募 → 採用 → キャンセル
5. ダッシュボードでの「応募中」「進行中」「最近の選考結果」の表示
6. アカウント削除前チェック(進行中契約ありで拒否される)

---

## Phase 6 動作確認チェックリスト

### 単一契約シナリオ
1. [ ] クライアントで案件作成(recruitment_status=open, progress_status=pending で作成される)
2. [ ] 別アカウントで応募
3. [ ] クライアントで採用 → 契約自動作成、チャットルーム自動作成、採用通知、recruitment_status=filled, progress_status=active
4. [ ] クライアントで仮払い(Stripe) → work_contract.status=paid
5. [ ] 受注者で納品 → work_contract.status=delivered
6. [ ] クライアントで検収承認 → work_contract.status=completed, progress_status=completed
7. [ ] 依頼者ダッシュボードから案件が消える(完了扱い)

### 並行契約シナリオ
1. [ ] 案件作成(number_of_positions=2)
2. [ ] 3人が応募
3. [ ] 1人目採用 → recruitment_status=open のまま、progress_status=active
4. [ ] 2人目採用 → recruitment_status=filled, 残りの1人は自動で rejected
5. [ ] 採用漏れた人のダッシュボードの「最近の選考結果」に「別の方が採用されました」表示
6. [ ] 両方完了 → progress_status=completed

### 取下げシナリオ
1. [ ] 案件作成、応募が1-2件集まる
2. [ ] クライアントが募集終了 → recruitment_status=withdrawn, progress_status=cancelled(契約ゼロなので)
3. [ ] pending の応募者が「依頼者が募集を終了しました」通知を受ける

### 個別却下シナリオ
1. [ ] 案件作成、応募集まる
2. [ ] 個別に却下 → rejection_reason='manual'
3. [ ] 却下された応募者のダッシュボード「最近の選考結果」に「残念ながら今回は選考に漏れました」表示

### キャンセルシナリオ
1. [ ] 契約進行中にキャンセル申請
2. [ ] 相手方が承認 → work_contract.status=cancelled
3. [ ] 返金処理、親 progress_status の再計算

### 管理画面
1. [ ] 募集中/進行中/完了/キャンセル/取下げ のフィルターが正常動作
2. [ ] 強制キャンセル・強制完了が新スキーマで正常動作

### アカウント削除チェック(バグF修正)
1. [ ] contracted 契約がある状態で削除不可
2. [ ] paid 契約がある状態でも削除不可(←バグ修正)
3. [ ] delivered 契約がある状態でも削除不可(←バグ修正)
