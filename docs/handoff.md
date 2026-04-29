# 同人ワークス 引き継ぎドキュメント

最終更新: 2026-04-29

このドキュメントは「常に最新の 1 ファイル」として運用する。過去の状態は `git log docs/handoff.md` で追える。

---

## 1. プロジェクト基本情報

| 項目 | 値 |
|---|---|
| サービス名 | 同人ワークス（doujinworks） |
| 本番 URL | https://doujinworks.jp |
| GitHub | https://github.com/studioasari/doujinworks.git |
| Supabase | https://kzpmrmamzgmdwawvgfar.supabase.co |
| ホスティング | Vercel |

### 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| UI | Tailwind CSS v4, Font Awesome, Zen Maru Gothic |
| 状態管理 | Zustand |
| 認証・DB | Supabase (Auth + PostgreSQL) |
| 決済 | Stripe（テストモード運用中、本番は審査却下のため移行予定） |
| ファイルストレージ | Cloudflare R2 (AWS SDK 互換) |
| レート制限 | Upstash Redis |
| メール送信 | Resend（独自送信は今後検討） |
| アナリティクス | Google Analytics (G-XT2NKCP2N5) |

### 運営会社情報

- 運営会社: 合同会社スタジオアサリ（StudioAsari LLC）
  - 法人番号: 9180003027064
  - 代表: 高橋良輔
  - 所在地: 名古屋市中村区名駅3丁目4-10 アルティメイト名駅1st 2階
  - メール: info@studioasari.co.jp
  - 電話: 080-6349-9669

---

## 2. Stripe 状況

| 項目 | 値 |
|---|---|
| Stripe アカウント | `acct_1SbiHbLrGlrWu5b9` |
| 審査結果 | **却下済み**（2026年8月20日まで 100% リザーブ） |
| 現状 | テストモードでの運用継続 |
| 移行先候補 | KOMOJU 等の決済代行 |
| 移行作業 | リリース前作業として優先実施 |

---

## 3. 作業ルール

1. 日本語対応
2. Claude Code への指示プロンプトは省略せず完全形で
3. 計画を先に提示、OK 後に実装
4. git commit/push は手動で実行（指示プロンプトを作る）
5. SQL は手動実行（マイグレーションファイルを作って指示）
6. UI は `docs/design-system.html` に準拠
7. 丁寧に、推測ではなく事実ベースで
8. 実コードを確認してから判断、適当に言わない
9. 選択肢を出しすぎない、明白な判断は即実行
10. ユーザーは Claude Code を使って実装する

---

## 4. 完了済みタスク

### 2026-04-22〜26（法務・運用整備フェーズ）

| コミット | 日付 | 内容 |
|---|---|---|
| `aabebad` | 2026-04-23 | feat: Refactor to collection agency model for payment provider review（収納代行スキームへの移行） |
| `cc2dc4d` | 2026-04-24 | feat: expand legal pages and migrate to design system tokens（法務ページ拡充 + デザインシステム統合） |
| `e000e83` | 2026-04-25 | style: unify legal page footers and remove duplicated revision history（法務ページのフッター統一） |
| `2f20189` | 2026-04-25 | feat: 業務委託モデル整合のため利用規約の用語を整理 |
| `a6f1bfa` | 2026-04-25 | fix: align commercial law page with actual payment flow（特商法ページの整合） |
| `ba1beac` | 2026-04-27 | feat: restructure cancellation policy with 4 stages and add auto-cancel（キャンセルポリシー4段階化） |

### 2026-04-27〜28（未決済自動キャンセル機能 + 整合性修正）

| コミット | 日付 | 内容 |
|---|---|---|
| `bdfef3f` | 2026-04-27 | **fix: correct cancellation request approver guard** — `cancel/route.ts` で存在しないカラム `requested_by` を参照していた論理バグを修正。実 DB のカラム名は `requester_id`。`as Record<string, unknown>` キャストで型エラーが回避されサイレント失敗していた。結果、申請者が自分のキャンセル申請を承認できる状態になっていた（利用規約第10条第3項違反）|
| `1c7f3fd` | 2026-04-28 | **feat: add auto-cancellation for unpaid contracts after 7 days** — 未決済自動キャンセル機能の実装。5日経過リマインド + 7日経過自動キャンセル。マイグレーション `20260427000001_add_unpaid_cancel_columns.sql`、新通知タイプ3種、`decrementContractedCount` ヘルパー追加。Cron は1日2回（JST 04:00 / 16:00 = UTC 19:00 / 07:00）に変更 |
| `166f268` | 2026-04-28 | **fix: ensure consistency in all cancellation flows** — 既存2動線（手動キャンセル承認・キャンセル申請自動承認 cron）に `decrementContractedCount` + `recruitment_status` 書き戻しを追加。3キャンセル動線が統一された動作になった |
| `03014a5` | 2026-04-28 | **fix: align manage page contract counts with active contracts** — `manage/client.tsx` の `contracts.length` を `activeContracts`（cancelled 除外）に切り替え。残数計算・採用ガード・UI 表示の 6 箇所を統一。「契約一覧」→「契約履歴」リネーム |

### 2026-04-29（本セッション: 管理者キャンセル動線の整合性修正 + Phase 2 構造的バグ解消 + 認証保護の構造的バグ修正）

| コミット | 日付 | 内容 |
|---|---|---|
| `6286847` | 2026-04-29 | **fix: 管理者キャンセル動線の整合性修正 + Phase 2 構造的バグ解消** — 管理者画面の「キャンセル」「返金」ボタンが `progress_status` のみ更新し `work_contracts.status` を触らない問題を修正。新規 API `app/api/admin/requests/[id]/cancel/route.ts`（認可: `is_admin` 再検証、並行契約の全契約一括キャンセル対応）を作成。さらに `lib/work-request-status.ts` に `restoreRecruitmentStatusOnCancel` ヘルパーを新設し、Phase 2 全 4 動線（個別キャンセル承認・キャンセル申請自動承認 cron・未決済自動キャンセル cron・管理者一括キャンセル）で各 `syncProgressStatus` 直後に呼び出す形に統一（案D 採用）。Phase 2 で確立した「全キャンセル時 `recruitment_status='filled'` のまま」仕様が複数契約の連続キャンセル時に守られていなかった構造的バグを解消。実害: 公開一覧・検索・バッジ・タブ集計で「終了済み案件が募集中表示」される UX バグを解消。既存データの不整合は 0 件（2026-04-29 確認）、後追いマイグレーション不要 |
| `1bc0b1e` | 2026-04-29 | **fix: 認証保護を AuthContext 経由に統一（content leak バグ修正）** — `ProtectedContent.tsx` の `useState`/`useEffect`/`createClient` による独自認証状態管理を削除し、`useAuth()` ベースに置き換え。**公開→保護の内部遷移時に保護ページの中身が一瞬または完全に見えてしまう content leak バグ**（早期 return `if (authState === 'authenticated') return` が公開パスのデフォルト値で誤発火、`checkAuth` がスキップされる）を解消。あわせて個別 `router.push('/login?redirect=...')` を 3 ファイル（[app/bookmarks/client.tsx](../app/bookmarks/client.tsx), [app/business/page.tsx](../app/business/page.tsx), [app/dashboard/portfolio/drafts/page.tsx](../app/dashboard/portfolio/drafts/page.tsx)）から削除して中央集権化。`/account-deleted` は公開ページ化判断と併せて保留。`publicExactPaths` を整理: 追加=`/law`（特商法）, `/cookie_policy`, `/lp`（ランディング） / 削除=`/about`（デッドリンク、`app/about/page.tsx` 不在）。副次効果として、ログアウト時に即座にモーダル表示されるよう改善（従来は再 mount まで未反映）。設計意図（`AuthRequiredModal standalone={true}`）は維持、自動リダイレクト化はしない |

---

## 5. 次にやること（優先度順）

### 優先度: 中

#### `case 'complete'` の整合性問題（管理者強制完了動線）
- 場所: [app/admin/requests/page.tsx](../app/admin/requests/page.tsx) `case 'complete'`
- 問題: `progress_status='completed'` のみ更新、`work_contracts.status` と `payments` を触らない別系の整合性問題
- 修正方針: 新規 API `POST /api/admin/requests/[id]/complete` を作成し、有効契約全てを `completed` にし、`payments` を INSERT、通知を送る
- 注意点: `payments` 作成ロジックは [/api/payments/create](../app/api/payments/create/route.ts) と重複するため、共通化を検討
- 別系統のバグ。2026-04-29 完了の管理者キャンセル動線整合性修正タスクと独立

### 優先度: 低（UX 改善）

#### 応募一覧 acceptedApplications の整合性
- 場所: [app/requests/[id]/manage/client.tsx](../app/requests/[id]/manage/client.tsx) 「採用済み」グループ表示
- 問題: cancelled 契約に紐づく応募が「採用済み」グループに残るが、`activeContracts.find` で `contract = undefined` 表示になる
- 改善案: 「現在採用中」「過去採用（cancelled）」の 2 グループに分割、または別表記

#### `getNotificationIcon` の改善
- 場所: [app/components/Header.tsx:622-632](../app/components/Header.tsx#L622-L632)
- 既存12種中10種 + 新規3種が default `fa-bell` に落ちている
- 例: `accepted`→`fa-handshake`, `paid`→`fa-credit-card`, `delivered`→`fa-box`, `cancelled`系→`fa-times-circle`, `*reminder`系→`fa-exclamation-circle` 等
- 数行追加で済む。構造変更不要

#### `Header.module.css` の `messageText` の `white-space` 仕様検討
- 場所: [app/components/Header.module.css:491-500](../app/components/Header.module.css#L491-L500)
- 現状: `white-space: normal` + `-webkit-line-clamp: 2`（2行クランプ + ellipsis）
- 通知ドロップダウンで段落区切り（`\n\n`）が保持されない
- 専用通知一覧ページが将来できる場合は別途 CSS 分岐検討

#### ヘルプ・FAQ への記載
- 並行契約のキャンセル後再募集の挙動説明
- Step 1.5 で確定した運用ルール（並行契約の 1 名キャンセル時は再募集再開、単一/全キャンセルは案件終了）
- リリース時に対応

#### キャンセル動線の `cancelled_at` 設定漏れ
- 場所:
  - [app/api/contracts/[id]/cancel/route.ts](../app/api/contracts/[id]/cancel/route.ts)（双方合意承認フロー）
  - [app/api/cron/auto-approve/route.ts](../app/api/cron/auto-approve/route.ts) `processCancellationApproval`（キャンセル申請自動承認 cron）
- 問題: `work_contracts.status='cancelled'` への UPDATE 時に `cancelled_at` を設定していない
- 修正方針: 両ファイルの UPDATE ペイロードに `cancelled_at: new Date().toISOString()` を追加するだけの軽微な修正
- 影響: 既存の cancelled 契約も `cancelled_at` が NULL のままなので、運用上は影響軽微（ただし表示・分析時に困る可能性）
- 既存 NULL データの後追い更新は別途 SQL で対応する選択肢もあり（`updated_at` から推定するなど）
- 機能影響なし、データ整合性のみ
- 補足: 未決済自動キャンセル `processUnpaidContracts` と管理者一括キャンセル動線では既に `cancelled_at` 設定済み

#### `/account-deleted` の公開ページ化検討
- 場所: [app/account-deleted/client.tsx](../app/account-deleted/client.tsx)
- 現状: client.tsx で未ログイン時 `router.push('/login')` するが、ProtectedContent も保護扱い → 二重保護
- 削除済みユーザーが `/account-deleted` にアクセスする想定（ログインセッション残存中の遷移 vs 未ログインからの直打ち）を整理し、公開ページ化（`publicExactPaths` 追加）するか `router.push` を残すか別タスクで判断
- 2026-04-29 認証保護タスクでは保留（4ファイル中本ファイルだけ未修正）

#### `ready=false` 時の Skeleton 表示
- 場所: [app/components/ProtectedContent.tsx](../app/components/ProtectedContent.tsx) の `if (!ready) return null`
- 現状: `null`（白画面、通常 50-100ms）。Supabase の session キャッシュにより実害は軽微
- 改善案: Skeleton 表示にすると体感速度が向上する可能性あり
- UX 改善、優先度低

#### `/about` リンクの確認
- `publicExactPaths` から `/about` を削除済み（`app/about/page.tsx` 不在のデッドリンク）
- フッター・ヘッダー等から `/about` へのリンクが残っていないか別途確認が必要
- 残っているなら（a）ページを作成するか（b）リンクを削除するかの判断

### リリース前作業

#### テストデータの一括削除
- DB に `[TEST]` プレフィックス付きデータ残存（シナリオ 1, 2, 3, A, B 関連）
- 削除 SQL（実行前に件数確認推奨）:

```sql
-- 1. cancellation_requests を先に削除（FK 依存）
DELETE FROM cancellation_requests
WHERE work_contract_id IN (
  SELECT wc.id FROM work_contracts wc
  JOIN work_requests wr ON wr.id = wc.work_request_id
  WHERE wr.title LIKE '[TEST]%'
);

-- 2. work_contracts を削除
DELETE FROM work_contracts
WHERE work_request_id IN (
  SELECT id FROM work_requests WHERE title LIKE '[TEST]%'
);

-- 3. work_request_applications を削除
DELETE FROM work_request_applications
WHERE work_request_id IN (
  SELECT id FROM work_requests WHERE title LIKE '[TEST]%'
);

-- 4. テスト関連の通知を削除（時刻範囲で限定）
DELETE FROM notifications
WHERE created_at >= '2026-04-28 01:00:00'
  AND type IN (
    'contract_unpaid_reminder',
    'contract_unpaid_cancelled_requester',
    'contract_unpaid_cancelled_creator'
  );

-- 5. 最後に work_requests を削除
DELETE FROM work_requests WHERE title LIKE '[TEST]%';
```

#### 弁護士レビュー依頼
- 既存項目、変更なし（前セッションからの引き継ぎ）

#### 決済代行申請
- KOMOJU 等への切り替え（Stripe 本番運用は諦め）

### 任意（時期未定）

- **並行契約時の Checkout 一括化** — 1 案件の複数契約をまとめて 1 回の Checkout で決済できるようにする
- **アプリ独自メール送信（Resend）** — Supabase Auth のメール以外、運営側からの通知メール導入
- **Postgres RPC 化による `decrementContractedCount` の原子化** — SELECT + UPDATE のベストエフォート方式から `UPDATE ... SET contracted_count = contracted_count - 1` 方式へ
- **`useMemo` 化** — `manage/client.tsx` の `activeContracts` 等、配列が大きくなった将来のパフォーマンス対策

---

## 6. 本セッションで確立した運用パターン

### 認証保護の標準パターン（2026-04-29 確立）

ログイン必須ページの認証ガードは [ProtectedContent.tsx](../app/components/ProtectedContent.tsx) に一元化し、[AuthContext](../app/components/AuthContext.tsx) の `userId` / `ready` を真値とする。

- 個別ページの `client.tsx` で `router.push('/login?redirect=...')` を追加しない（ProtectedContent のモーダルが代行）
- ProtectedContent は `AuthContext.onAuthStateChange` を購読する `AuthProvider` 配下にあるため、ログイン/ログアウトは即座に反映
- 描画分岐の優先順位:
  1. `serverProtectedPaths`（`/admin/*`）→ 透過（layout.tsx で redirect 済み）
  2. `publicExactPaths` / `publicPrefixPaths` / 特殊ルール（`/requests`, `/pricing`）→ 透過
  3. `ready=false` → `null`（初回 auth check 中、SSR とも一致で hydration mismatch なし）
  4. `userId=null` → `<AuthRequiredModal standalone={true} />`
  5. それ以外 → 透過

実装: [app/components/ProtectedContent.tsx](../app/components/ProtectedContent.tsx), [app/components/AuthContext.tsx](../app/components/AuthContext.tsx)

#### 公開パス追加時のチェックリスト
1. `publicExactPaths` または `publicPrefixPaths` に追加（特殊ルールが必要なら `isPublicPath` 関数内に追加）
2. `app/<path>/page.tsx` の実在を確認（デッドリンクを残さない）
3. ログイン済みでも公開ページは閲覧可能なため、過剰保護の解消には積極的に追加して良い

### キャンセル動線の標準パターン（6 ステップ）

新しいキャンセル動線を追加する場合も、以下の順序を必ず維持すること:

```
1. UPDATE work_contracts.status = 'cancelled'
   (cancelled_at も併せて記録推奨)
        ↓
2. decrementContractedCount(workRequestId)
        ↓
3. 残り有効契約数を count
   (work_contracts WHERE work_request_id=? AND status != 'cancelled')
        ↓
4. 残り 1 件以上なら recruitment_status='open' に書き戻し
   (.eq('recruitment_status', 'filled') で原子的・冪等)
        ↓
5. syncProgressStatus(workRequestId)
        ↓
6. restoreRecruitmentStatusOnCancel(workRequestId)
   (全契約 cancelled かつ recruitment_status='open' のとき
    'filled' に復元、冪等)
```

#### 各ステップの失敗時挙動
- 1 が失敗 → 続行不可、ロールバック相当（処理中断）
- 2 が失敗 → ログのみで続行（契約は既に cancelled）
- 3 が失敗 → ログのみで続行（後段は `?? 0` で安全）
- 4 が失敗 → ログのみで続行
- 5 が失敗 → ログのみで続行（既存パターン）
- 6 が失敗 → ログのみで続行（整合性問題は次回キャンセル動線実行時に自然解消）

#### バッチ処理（管理者一括キャンセル）の例外
1 案件で複数契約を順次キャンセルする場合、ステップ 6 はループ最後に 1 回だけ呼ぶ最適化が可能（ループ内で毎回呼ぶのは冗長）。実装例: [app/api/admin/requests/[id]/cancel/route.ts](../app/api/admin/requests/[id]/cancel/route.ts)

#### 実装済みの動線（参照用）
- 手動キャンセル承認: [app/api/contracts/[id]/cancel/route.ts](../app/api/contracts/[id]/cancel/route.ts)
- キャンセル申請自動承認 cron: [app/api/cron/auto-approve/route.ts](../app/api/cron/auto-approve/route.ts) セクション 3
- 未決済自動キャンセル cron: [app/api/cron/auto-approve/route.ts](../app/api/cron/auto-approve/route.ts) セクション 4
- 管理者一括キャンセル: [app/api/admin/requests/[id]/cancel/route.ts](../app/api/admin/requests/[id]/cancel/route.ts)（2026-04-29 追加）

### 整合性検証 SQL

管理者キャンセル動線修正後の確認等で再利用可能。

#### `contracted_count` と実有効契約数の不整合検出
```sql
SELECT
  wr.id, wr.title,
  wr.contracted_count                                              AS recorded,
  COUNT(wc.id) FILTER (WHERE wc.status != 'cancelled')             AS actual_active
FROM work_requests wr
LEFT JOIN work_contracts wc ON wc.work_request_id = wr.id
GROUP BY wr.id, wr.title, wr.contracted_count
HAVING COALESCE(wr.contracted_count, 0)
       != COUNT(wc.id) FILTER (WHERE wc.status != 'cancelled');
```
期待値: 0 行（全件整合）

#### `recruitment_status='filled'` だが空き枠がある案件
```sql
SELECT id, title, recruitment_status, number_of_positions, contracted_count
FROM work_requests
WHERE recruitment_status = 'filled'
  AND COALESCE(contracted_count, 0) < COALESCE(number_of_positions, 1);
```
期待値: 0 行

#### `recruitment_status='open'` だが progress_status が終端状態の不整合検出
案D 対応前のキャンセル動線で発生していた構造的バグの検出用。
```sql
SELECT id, title, recruitment_status, progress_status, contracted_count
FROM work_requests
WHERE recruitment_status = 'open'
  AND progress_status IN ('cancelled', 'completed');
```
期待値: 0 行（案D 適用後の新規ケースは発生しない、既存データに不整合無いことを 2026-04-29 確認済み）

#### DB トリガの存在確認
```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('work_contracts', 'work_requests');
```
期待値: `update_work_requests_updated_at`（updated_at 自動更新）のみ

---

## 7. テストデータの管理

### 命名規則
- テスト用データは **`[TEST]` プレフィックス**を付けて作成
  - 例: `INSERT INTO work_requests (title, ...) VALUES ('[TEST] 並行契約シナリオ1', ...)`
- 削除時にプレフィックス検索で一括処理可能（前述の SQL 参照）

### 関連テーブルにわたるテストデータ作成
複数テーブルに同時にデータを挿入する場合は **`DO $$ ... END $$` ブロック**を使用:

```sql
DO $$
DECLARE
  test_request_id UUID;
  test_contract_id UUID;
BEGIN
  INSERT INTO work_requests (title, ...) VALUES ('[TEST] ...', ...) RETURNING id INTO test_request_id;
  INSERT INTO work_contracts (work_request_id, ...) VALUES (test_request_id, ...) RETURNING id INTO test_contract_id;
  -- ...
END $$;
```

理由: Supabase Studio の SQL Editor は CTE（`WITH ... AS`）を誤検知してエラーを出すケースがあるため、`DO $$` ブロックで包むと安全。

### ローカルから cron をテストする方法

#### 前提
- `npm run dev` で dev サーバが `http://localhost:3000` で起動済み
- `.env.local` に `CRON_SECRET=<値>` が設定済み

#### PowerShell コマンド
```powershell
$secret = (Select-String -Path .env.local -Pattern '^CRON_SECRET=' |
  ForEach-Object { $_.Line.Split('=', 2)[1].Trim('"').Trim("'") })

$response = Invoke-RestMethod -Method Post `
  -Uri http://localhost:3000/api/cron/auto-approve `
  -Headers @{ Authorization = "Bearer $secret" } `
  -ContentType 'application/json'

$response.results | ConvertTo-Json -Depth 10
```

#### 期待されるレスポンス
```json
{
  "deliveryWarningsSent": 0,
  "deliveryAutoApprovalsProcessed": 0,
  "cancellationAutoApprovalsProcessed": 0,
  "unpaidContractsCancelled": 0,
  "unpaidRemindersSent": 0,
  "errors": []
}
```

### テスト用に `contracted_at` を遡らせる方法
未決済自動キャンセルのテストには、特定契約の `contracted_at` を過去にずらす:

```sql
-- 7日経過のテスト（自動キャンセル対象）
UPDATE work_contracts
SET contracted_at = NOW() - INTERVAL '8 days'
WHERE id = '<test_contract_id>';

-- 5日経過のテスト（リマインド対象、自動キャンセル対象外）
UPDATE work_contracts
SET contracted_at = NOW() - INTERVAL '6 days',
    payment_reminder_sent_at = NULL
WHERE id = '<test_contract_id>';
```

`payment_intent_id = NULL` のままにしておけば、Stripe API は呼ばれない（既存の `processCancellationApproval` 内で `if (contract.payment_intent_id)` ガード済み）。

---

## 8. PowerShell での git 操作の注意点

### パスにブラケット（`[id]` 等）を含む場合
**シングルクォートで囲む**（PowerShell が `[id]` を文字クラス glob として解釈するのを防ぐ）:

```powershell
# 正しい
git add 'app/api/contracts/[id]/cancel/route.ts'

# NG（ブラケットが glob 展開されてマッチ失敗）
git add app/api/contracts/[id]/cancel/route.ts
```

### 複数行コミットメッセージ
**here-string `@'...'@` を使用**:

```powershell
git commit -m @'
fix: short summary

Detailed description here.
- Bullet 1
- Bullet 2
'@
```

注意点:
- **終端 `'@` は行頭から始める**（インデント禁止、パースエラー）
- メッセージ内の **ダブルクォート（`"`）は避けるか削除する**（PowerShell の解釈で破綻する場合あり）
- `$variable`、バッククォート、`@` は単一引用 here-string `@'...'@` ならリテラル扱い

### 期待されるステージング状態の確認

`git add` 後の状態確認:
```powershell
git status --short
```

`M ` (M + 半角スペース) はステージ済みの修正、` M` (半角スペース + M) は未ステージの修正。

---

## 9. 重要な学習リソース・参考

- Skeb 利用規約: 同人系のオーソリ+キャプチャ方式の参考
- クラウドワークス利用規約: 業務委託モデルの規約構造の参考
- 経産省「電子商取引及び情報財取引等に関する準則」: プラットフォーム事業者の責任範囲

---

## 10. 関連する既存ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/current-flow-analysis.md](current-flow-analysis.md) | 依頼〜決済〜検収〜精算フローの現状調査（2026-04-25 時点） |
| [docs/status-redesign.md](status-redesign.md) | `recruitment_status` / `progress_status` 2軸再設計の設計書 |
| [docs/audit-report.md](audit-report.md) | 監査レポート |
| [CLAUDE.md](../CLAUDE.md) | プロジェクト全体の概要・ディレクトリ構成・環境変数・作業ルール |

---

## 11. ユーザーの対話スタイル

- 「適当に言うな」「推測で答えるな」「選択肢出すな」
- 簡潔指示（「ok」「やれ」「で、どうするの」等）
- 矛盾・不整合の検出を求める
- 業界標準・ベストプラクティスを重視
- ガチガチ方針: 法的論点は全て対応、業界標準を上回るレベルの規約強度を望む
