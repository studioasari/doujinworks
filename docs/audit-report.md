# 運用開始前 棚卸しレポート

調査日: 2026-04-10

---

## 1. 動作確認

### 1-1. 依存関係（npm install）
- **問題なし** — package.json と package-lock.json は整合しており、不足・不整合なし

### 1-2. ビルド（npm run build）
- **失敗（1件の致命的エラー）**
  - `supabase/functions/auto-approve-cancellations/index.ts:1:30` — Deno用の `https://esm.sh/...` インポートをNext.jsのTypeScriptが解決できない
  - **対策**: `tsconfig.json` の `exclude` に `supabase/functions/**` を追加すれば解消する見込み
- **警告**:
  - `middleware.ts` の `middleware` ファイル規約が非推奨（Next.js 16では `proxy` 推奨）
  - `baseline-browser-mapping` データが古い（`npm i baseline-browser-mapping@latest -D` で更新可能）

### 1-3. Lint（npm run lint）
- **182エラー / 171警告（計353件）**

| 件数 | ルール | 内容 |
|------|--------|------|
| 94 | `no-explicit-any` | `any` 型の多用 |
| ~33 | `react-hooks/immutability` | useEffect内で呼ぶ関数がuseEffectより後に定義されている（33ファイル） |
| 6 | `no-unescaped-entities` | `app/lp/client.tsx` でJSX内の `"` がエスケープされていない |
| 4 | `no-unused-vars`（エラー） | 未使用変数 |
| 1 | `rules-of-hooks` | `app/components/AuthRequiredModal.tsx:19` — useAuthが条件分岐内で呼ばれている |
| 73 | `exhaustive-deps`（警告） | useEffectの依存配列漏れ |
| 54 | `no-img-element`（警告） | `<img>` を使用（Next.js `<Image>` 推奨） |
| 44 | `no-unused-vars`（警告） | 未使用変数・引数 |

---

## 2. 未完成・バグの可能性

### 2-1. TODO / FIXME コメント
| ファイル | 行 | 内容 |
|----------|-----|------|
| `app/admin/requests/page.tsx` | 217 | `// TODO: Stripe返金処理を実装` — 管理画面のキャンセル処理でStripe返金が未実装。DBの状態だけ `cancelled` に変更し、実際の返金APIは呼ばれない |

### 2-2. コメントアウトされた怪しいコード
- 特になし（コメントは日本語の説明コメントのみ）

### 2-3. エラーハンドリングの問題

#### Stripe Webhook（`app/api/webhooks/stripe/route.ts`）
- **17-18行**: `request.text()` と `request.headers.get('stripe-signature')!` が try-catch の外。ヘッダー欠損時にクラッシュする
- **56-67行**: `work_requests` テーブルの更新失敗時、エラーログは出るが200を返す。Stripeはリトライしないため、DBが中途半端な状態になる（契約は `paid` だがリクエストは古いまま）

#### 返金API（`app/api/refund/route.ts`）
- **61-70行**: `work_contracts` 更新エラーを検知してもログだけで処理続行。Stripe返金は実行済みだがDB未反映のまま `success: true` を返す
- **73-82行**: `work_requests` 更新のエラーハンドリングが**完全に欠如**

#### 下書き公開API（`app/api/drafts/[id]/publish/route.ts`）
- **67-71行**: 公開後の下書き削除にエラーチェックなし。失敗してもゴーストデータが残る

#### 認証（`app/actions/auth.ts`）
- **185-201行**: `checkLoginLimitAction` にtry-catchなし。Redis障害時にクラッシュ

### 2-4. any型の多用（74箇所）
主な問題箇所:
- `app/api/create-checkout-session/route.ts:50-51` — Supabaseのjoin結果を `as any` でキャスト。型変更時にバグが隠れる
- `app/api/cron/auto-approve/route.ts:89,151,242` — `as any` が3箇所
- `app/messages/[id]/client.tsx` — Supabase Realtimeペイロードに6箇所の `any`
- `app/requests/[id]/contracts/[contractId]/client.tsx` — 14箇所の `as any`
- `app/components/Header.tsx:33` — `profile: any`

---

## 3. セキュリティ観点

### 3-1. サービスロールキーのクライアント側使用
- **問題なし** — `SUPABASE_SERVICE_ROLE_KEY` はサーバーサイドのみで使用。`utils/supabase/admin.ts` にブラウザ実行ガードあり

### 3-2. API Routeの認証チェック漏れ

| ルート | 危険度 | 問題 |
|--------|--------|------|
| `api/refund` | **致命的** | 認証なし＋管理者クライアント使用。誰でも任意の契約に対してStripe返金を実行可能 |
| `api/get-email-by-username` | **高** | 認証なし。ユーザー名からメールアドレスを取得可能（個人情報漏洩） |
| `api/create-checkout-session` | **高** | 認証なし。契約IDを知っていれば誰でも決済セッションを作成可能 |
| `api/delete-portfolio` | **高** | 認証なし。任意のファイルパスを指定してR2ファイルを削除可能 |
| `api/generate-receipt` | **高** | 認証なし。Pythonサブプロセスを起動するためDoS攻撃の標的にもなる |
| `api/upload-chat` | **高** | 認証なし。呼び出し側が `userId` を自由に指定可能 |
| `api/upload-portfolio` | **高** | 認証なし。任意のバケットパスの署名付きURLを発行可能 |
| `api/r2-signed-url` | **中** | 認証なし。プライベートバケット（チャット、納品物）の署名付きURL発行可能 |
| `api/r2-signed-url-batch` | **中** | 同上（バッチ版） |
| `api/posts-images` | **中** | 管理者チェックなし。画像一覧取得・削除が可能 |
| `api/upload-posts` | **中** | 認証なし。R2への画像アップロード可能 |
| `api/check-username` | **低** | ユーザー名の存在確認（列挙攻撃のリスク） |
| `api/upload-url` | **注意** | Authorizationヘッダーの存在確認のみで、トークンの有効性検証なし |

#### 3-2 の対応状況

**2026年4月13日時点**

`/api/refund`: **対応完了**
- 認証: cron 経由（Authorization ヘッダー）+ ブラウザ経由（ログイン + 当事者チェック）の2系統
- 追加の安全対策:
  - 返金済みチェック（409 Conflict）
  - DB 更新エラーハンドリング（silent fail 回避）
  - `error.message` の情報漏洩対策
  - 契約取得の1回化（レースコンディション対策）
- `auto-approve/route.ts` の refund 呼び出しに Authorization ヘッダーを追加済み
- 負テスト確認済み: 401（未ログイン）, 403（他人の契約）, 400（payment_intent_id なし）

未対応（テストデータ不足）:
- 409（返金済み）テスト: `refund_id` を持つ契約がローカルに存在せず確認できない
- 正常系（Stripe 返金発火）テスト: `payment_intent_id` を持つ契約がローカルに存在しない
- cron 経由の正常系テスト: 同上
- → 本番環境の初回返金運用時は、最初の1件を特に慎重に監視する

`/api/create-checkout-session`: **対応完了**（2026-04-13）
- 認証: ログイン必須 + 依頼者（`work_request.requester_id`）本人確認
- 実装パターン: `/api/refund` より軽量、cron 対応なし
- 情報漏洩対策: エラーメッセージを汎用化
- 負テスト確認済み:
  - 401（未ログイン）
  - 403（他人の契約、client_not_involved）
  - 403（自分がクリエイター側、client_is_contractor）→ 決済は依頼者のみ許可という厳格な認可を検証
  - 200（正常系、依頼者本人が自分の契約で Stripe セッション作成）→ `cs_test_` で始まる URL が返却、テストキー環境で動作確認済み

備考:
- Stripe テストキー（`sk_test_...`）で動作していることを確認
- 本番デプロイ時は Vercel 側で本番キー（`sk_live_...`）への切り替えが必要。これは別タスクとして記録

`/api/delete-portfolio`: **対応完了**（2026-04-13）
- 認証: ログイン必須 + パスセグメント検証
- 実装の特徴:
  - Supabase クライアントを新規組み込み（元は R2 のみ）
  - 所有者判定は filePath の auth uid パスセグメントで行う
  - 他のAPIと違い、`profiles.id` ではなく auth uid を直接比較（R2 パスが auth uid で組み立てられているため）
  - DELETE メソッドは既存コードを踏襲
- 情報漏洩対策: エラーメッセージを汎用化
- 負テスト確認済み:
  - 401（未ログイン）
  - 403（他人の auth uid を含むパス）
  - 403（auth uid が含まれない任意のパス）
- 正常系テストは実施せず（本物の R2 ファイル削除を避けるため）。認証・認可が機能することが確認できれば、既存の削除ロジックは変更していないので十分と判断

残 API Route 認証チェック対応状況:
- `/api/refund`: ✅ 完了
- `/api/create-checkout-session`: ✅ 完了
- `/api/delete-portfolio`: ✅ 完了
- その他 10ルート程度: ⏸️ 未着手
  主な未対応ルート:
    * `/api/check-username`
    * `/api/drafts/*`
    * `/api/generate-receipt`
    * `/api/get-email-by-username`
    * `/api/posts-images`
    * `/api/r2-signed-url`, `/api/r2-signed-url-batch`
    * `/api/upload-*`
    * `/api/webhooks/stripe`（冪等性対策と併せて別タスク）

### 3-3. レート制限の不足
- レート制限があるのは `app/actions/auth.ts`（ログイン、サインアップ、パスワードリセット等）のみ
- **全APIルートにレート制限がない** — 特に `refund`, `create-checkout-session`, `generate-receipt`, 各アップロード系は対策必須

### 3-4. Supabase RLS
- migrationファイルが存在しないため、RLSの設定状況はコードから確認不可
- Supabaseダッシュボードで直接確認が必要
- 管理者クライアント（RLSバイパス）が認証なしAPIで使われている箇所あり（上記3-2参照）

### 3-5. 管理者画面の認証
- `app/admin/layout.tsx` — 管理者チェックがクライアントサイドのuseEffectのみ。サーバーサイドのミドルウェアガードなし。レンダリング前に一瞬管理画面が表示される可能性あり

### 3-6. RLSポリシーの問題

#### 3-6「RLS ポリシー監査」完了マーカー

2026年4月12日、以下の6問題すべての対応を完了:

- ✅ 問題1: payments INSERT が緩い（3-7, 3-8, 3-9, 3-10 含む）
- ✅ 問題2: reviews INSERT に当事者チェックなし（3-12 含む）
- ✅ 問題3: work_request_applications の弱いポリシー
- ✅ 問題4: work_requests の弱いポリシー
- ✅ 問題5: post_categories / posts の管理者チェック条件バグ
- ✅ 問題6: notifications INSERT が緩い（3-13 の修正も含む）

副作業として以下のAPIルートを新設:
- `/api/payments/create`
- `/api/requests/[id]/complete`
- `/api/notifications/create`

残る P0/P1 項目は別タスクに移行。

Supabase RLSポリシーを SQL Editor 経由で全件取得して監査した結果、以下の問題が発見された。優先度はすべて **P1（高）**。

#### 問題1: payments テーブル INSERT が緩い
- **ポリシー名**: `"Authenticated users can insert payments"`
- **現在の条件**: `auth.uid() IS NOT NULL`
- **リスク**: ログインしていれば誰でも任意の payment レコードを偽造可能。お金まわりの整合性破壊リスク
- **対応**: このポリシーを削除し、サービスロール経由でのみINSERTできるようにする（管理者のみINSERTのポリシーは別途存在）

#### 問題2: reviews テーブル INSERT に当事者チェックなし
- **ポリシー名**: `"allow_authenticated_insert_reviews"`
- **現在の条件**: `true`
- **リスク**: 取引当事者でなくても他人名義でレビュー作成可能。なりすまし、レビュー詐欺のリスク
- **対応**: 自分が contractor または requester だった work_contract に対してのみ、自分名義でレビュー作成可能、という条件に変更

#### 問題3: work_request_applications INSERT に弱いポリシーが共存
- **ポリシー名**: `"allow_authenticated_insert_applications"`
- **現在の条件**: `true`
- **リスク**: 正しいポリシー（`"Users can create their own applications"`）と共存しているが、RLSはOR評価のため緩い方が勝ちザル化
- **対応**: この弱いポリシーを削除

#### 問題4: work_requests INSERT に弱いポリシーが共存
- **ポリシー名**: `"allow_authenticated_insert_work_requests"`
- **現在の条件**: `true`
- **リスク**: 問題3と同じ構造
- **対応**: この弱いポリシーを削除

#### 問題5: post_categories と posts の管理者チェックが構造的に壊れている
- **ポリシー名**: `"管理者のみカテゴリー管理可"` / `"管理者は全操作可"`
- **現在の条件**: `profiles.id = auth.uid()`
- **リスク**: `profiles.id` は内部ID、`auth.uid()` は Auth の UUID で別物。本来は `profiles.user_id = auth.uid()` であるべき。この条件は誰にもマッチしないか、意図せず通る可能性がある
- **対応**: `profiles.id` を `profiles.user_id` に修正

#### 問題6: notifications INSERT が緩い
- **ポリシー名**: `"認証済みユーザーは通知を作成可能"`
- **現在の条件**: `auth.uid() IS NOT NULL`
- **リスク**: ログインしていれば任意の他人宛に通知を作成可能。スパム通知、偽通知によるフィッシングのリスク
- **対応**: サービスロール経由のみINSERTできるよう、このポリシーを削除する（必要なら API 経由でサーバー側でINSERTする）

#### 重複ポリシー（メンテナンス課題）

加えて、複数テーブルでポリシーが日英で重複している。動作には影響しないがメンテ性を損なうため、後日整理予定:

- `payments`（Admin系の重複）
- `chat_rooms`（allow_系 と Enable系）
- `reviews`（allow_view と anon_select）
- `work_request_applications`（多数）
- `work_requests`（allow_系 と 日本語版）
- `profiles`（authenticated系 と public_select）

### 3-7. payments の重複チェックが work_request_id ベース

`/api/payments/create`（3-6 問題1対応で新設）の二重INSERT防止チェックは `work_request_id` をキーにしている。
しかし本プロジェクトでは **1つの work_request に対して複数の work_contract（異なるクリエイターとの並行契約）が成立する設計** であることが
[app/requests/[id]/manage/client.tsx:138](../app/requests/[id]/manage/client.tsx#L138) のロジックおよび
DBの一意制約（`(work_request_id, contractor_id)` の複合キー）から確認された。

このため、同じ依頼に対して2人目以降のクリエイターの検収承認を行った際、
既存レコードが見つかって冪等レスポンスが返り、**2人目以降の payments レコードが作られない**不具合がある。

- **現象**: 並行契約した2人目以降のクリエイターの振込レコードが作られず、売上に反映されない
- **優先度**: **P1（高）** — 業務上「同じ依頼に複数契約」が正常系として設計されているため
- **対応案**:
  - **案A（長期的・推奨スキーマ）**: `payments` テーブルに `work_contract_id` カラムを追加し、そこに一意制約を貼る（マイグレーション必要）。重複チェックも `work_contract_id` で行う
  - **案B（短期的・マイグレーション不要）**: 重複チェック条件を `(work_request_id, creator_id)` の複合キーに変更する
- **対応タイミング**: 暫定対応として案Bを即実施。案A（マイグレーション）は将来タスクとして保留

### 3-8. payments テーブルの一意制約が業務仕様と矛盾していた

**発見経緯**: 「3-7」の対応として API ルートの重複チェックを `(work_request_id, creator_id)` 複合キーに変更したが、動作確認で 500 エラーが発生。原因調査の結果、`payments` テーブル自体に `work_request_id` 単独の UNIQUE 制約 (`payments_work_request_id_key`) が貼られていることが判明。

業務仕様（同じ依頼に対して複数クリエイターと並行契約OK）と矛盾する設計であり、修正前の元コードでも 2 件目以降の INSERT は silent fail していた可能性が高い（エラーチェックなしのため）。

**対応（完了）**:
ALTER TABLE で単独一意制約を削除し、複合一意制約 `(work_request_id, creator_id)` に置き換え済み。

```sql
ALTER TABLE payments DROP CONSTRAINT payments_work_request_id_key;
ALTER TABLE payments ADD CONSTRAINT payments_work_request_id_creator_id_key
  UNIQUE (work_request_id, creator_id);
```

### 3-9. /api/payments/create の認可チェックで profile_id と auth_uid を混同

**発見経緯**: 動作確認で全リクエストが 403 で弾かれた。

`work_requests.requester_id` は `profiles.id` を指すが、API ルートで `auth.getUser()` の `user.id`（auth uid）と直接比較していた。両者は別物なので構造的に常にマッチせず、本人ですら 403 で弾かれる状態だった。

**対応（完了）**:
ステップ4 の前に「auth.uid から profiles.id を取得」する処理を追加。比較対象を `myProfile.id` に変更済み。

### 3-10. 修正前の元コードに残っていた問題（参考）

修正前の [app/requests/[id]/contracts/[contractId]/client.tsx](../app/requests/[id]/contracts/[contractId]/client.tsx) の payments INSERT は以下の問題を抱えていた（現在は API 経由に移行済み）:

- `await` の戻り値を一切チェックしていない → エラーが silent fail
- 金額計算がブラウザ側 → 改ざん可能
- 「Authenticated users can insert payments」ポリシーに依存
- 並行契約の 2 件目以降が DB 一意制約で失敗していたが、上記の silent fail により 2 ヶ月間気づかれずに本番運用されていた

これにより、過去に並行契約をした依頼者がいれば、2 人目以降のクリエイターへの振込予定が作られていない可能性がある。今後本番DBで以下の確認SQLを流して、孤立した contract がないかをチェックする必要がある（別タスク）:

```sql
SELECT c.id, c.work_request_id, c.contractor_id, c.status
FROM work_contracts c
WHERE c.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM payments p
    WHERE p.work_request_id = c.work_request_id
      AND p.creator_id = c.contractor_id
  );
```

### 3-11. 決済完了時の work_requests.status 遷移が抜けている可能性

**発見経緯**: `/requests/manage` の「仮払い待ち」表示バグ調査中、検収承認済み（contract.status = completed, delivery.status = approved, contract.paid_at と contract.completed_at に値あり）にも関わらず、親の work_requests.status が `'contracted'` のまま放置されているレコードが複数見つかった。

例:
- `work_request_id: b4123b3b-bf35-4565-a685-49535276386a` (44)
- `work_request_id: d4ad5dd5-07e6-4082-81d8-601954c61bd5` (ｓｓｓｓｓｓｓ)

これらは画面上「仮払い待ち」と誤表示される。

**仮説**:
- 今日発見した「検収承認時に paid → completed の遷移が抜けていた」バグ（今回 `/api/requests/[id]/complete` を新設して修正済み）の兄弟バグで、決済完了時の contracted → paid の遷移にも同様の抜けがある可能性
- あるいは Stripe Webhook の失敗で paid に進まなかった
- あるいは前任者がテストデータを手動作成した際に正規ルートを通さなかった（テストデータ特有）

**影響範囲**:
- 過去のレコードで status が `'contracted'` のまま止まっているものが何件あるかは未調査
- 現状本番で同じバグが発火するかも未検証

**優先度**: **P1（高）**

**対応方針**:
- Stripe Webhook と cron ジョブの status 更新ロジックを調査する別タスクを立てる
- 過去データの修正も同タスク内で行う

**補足 — status 遷移バグの全体像**:

今日の流れの中で、status 遷移に関するバグが4つ見つかっている:

1. **3-10**: payments INSERT が silent fail していた（エラーチェックなし、並行契約で2件目以降が消えていた）
2. **検収承認 → 依頼完了**: `handleSubmitReview` で `work_requests.status` が `paid` → `completed` に更新されていなかった（今日 `/api/requests/[id]/complete` を新設して修正済み）
3. **3-11（本件）**: 決済完了で `work_requests.status` が `contracted` → `paid` に更新されていない可能性（未対応）
4. **auto-approve cron の並行契約判定バグ**: `/api/cron/auto-approve/route.ts` で、契約が1件自動承認されるたびに親の `work_requests.status` を無条件で `completed` に更新している。並行契約の場合、他のクリエイターがまだ作業中でも親が `completed` になってしまう。手動承認側は今日 `/api/requests/[id]/complete` で並行契約を正しく判定するよう修正したが、auto-approve 側は未修正。優先度リストの 12 番でまとめて対応予定。

これらは全て「status の遷移管理が手動で散在している」ことが根本原因とも言える。将来的には status 遷移を DB トリガーまたは専用関数に集約するリファクタが望ましい。

### 3-12. reviews テーブル UNIQUE 制約の業務仕様との矛盾

**発見経緯**: 3-6 問題2 の対応中、当事者チェック RLS ポリシー作成前の事前調査で、reviews テーブルの既存 UNIQUE 制約が `(work_request_id, reviewer_id)` になっていることが判明した。

**問題**: 並行契約（1つの依頼に複数クリエイターと契約）で、同じ依頼者が各クリエイターにレビューしようとすると、2人目以降は DB 一意制約違反で失敗する。

**影響範囲**: コード側がエラーチェックをある程度しているため silent fail しないが、ユーザーには「なぜか2人目にレビューできない」という不可解な体験が発生していた可能性。

**対応（完了）**: UNIQUE 制約を `(work_contract_id, reviewer_id)` に変更。問題2 のセクションに詳細記載。

**補足**: これは 3-8（payments）、検収承認時の依頼完了処理と並ぶ、3つ目の「並行契約を考慮していない設計」バグ。

### 3-13. auto-approve cron の通知作成で is_read カラム名バグ

**発見経緯**: 3-6 問題6（notifications）の対応中、`utils/notifications.ts` と `app/api/cron/auto-approve/route.ts` でカラム名が不一致であることが判明。

- 実DBのカラム名: `read` (boolean)
- `utils/notifications.ts`: 正しく `read` を使用
- `auto-approve/route.ts`: 誤って `is_read` を使用

**影響**: cron から通知を作成するたびに INSERT が失敗していた可能性が高い。cron のエラーハンドリングが甘いため silent fail していた可能性。過去の自動承認タイミングで送るはずだった通知（クリエイターや依頼者への自動承認完了通知など）が届いていない可能性がある。

**対応（完了）**: 問題6 の修正と一緒に、`auto-approve/route.ts` L25 のローカル `createNotification` ヘルパー内の `is_read` → `read` 修正を実施。ヘルパー内1箇所の修正で5箇所の呼び出し全てに反映。

**未対応**: 過去の silent fail で送られなかった通知の復旧は不可能。件数把握のための調査SQLも現状では特定困難。記録のみ残す。

### 3-14. Supabase Edge Functions の recipient_id カラム名バグ

**発見経緯**: 3-6 問題6（notifications）の対応中、`supabase/functions/` 配下の3ファイルで notifications への INSERT に `recipient_id` カラムを使用していることを確認。

- 実DBのカラム名: `profile_id`
- Edge Functions のコード: `recipient_id`（誤り）

**影響**: Edge Functions から通知を作成する処理が全て silent fail している可能性が高い。ただし Edge Functions の実際の呼び出し頻度・用途は未確認。

**対応**: 別タスクとして記録。今回のスコープ外。Edge Functions 側のコード修正（`recipient_id` → `profile_id`）が必要だが、Edge Functions のデプロイフローを含むため現時点では手を出さない。

### 「問題1: payments INSERT が緩い」の対応状況

3-6 の問題1は、上記 3-7, 3-8, 3-9, 3-10 の関連修正と合わせてローカル動作確認まで完了。
RLSポリシー `"Authenticated users can insert payments"` も削除済み。

### 「問題2: reviews INSERT に当事者チェックなし」の対応状況

対応完了（2026-04-12）。以下の一連の修正で完了:

1. **UNIQUE 制約の修正**
   - 旧: `reviews_work_request_id_reviewer_id_key` UNIQUE `(work_request_id, reviewer_id)`
   - 新: `reviews_work_contract_id_reviewer_id_key` UNIQUE `(work_contract_id, reviewer_id)`
   - 理由: 旧制約では、同じ依頼に対して並行契約している複数のクリエイターに1人の依頼者がそれぞれレビューしようとすると2人目以降で失敗していた。payments テーブルで発見した 3-8 と同じ構造のバグ。
   ```sql
   ALTER TABLE reviews DROP CONSTRAINT reviews_work_request_id_reviewer_id_key;
   ALTER TABLE reviews ADD CONSTRAINT reviews_work_contract_id_reviewer_id_key
     UNIQUE (work_contract_id, reviewer_id);
   ```

2. **緩いRLSポリシー削除**: `"allow_authenticated_insert_reviews"`（WITH CHECK true）を削除

3. **当事者チェック付き新ポリシー作成**: `"当事者のみレビュー作成可"` — WITH CHECK に5条件:
   - reviewer_id がログインユーザー本人であること
   - 対象の契約が `status='completed'` であること
   - reviewer_id が契約の当事者（依頼者 or クリエイター）であること
   - reviewee_id も契約の当事者であること
   - `reviewer_id != reviewee_id`（自己レビュー防止）

4. **動作確認**: 単独契約・並行契約の2人目ともにレビュー投稿成功を確認

コード変更は不要（既存の `review/client.tsx` の INSERT が正しい `reviewer_id` / `reviewee_id` / `work_contract_id` を送っているため）。

補足: `work_contract_id` カラムはスキーマ上 nullable だが、実データには NULL が存在しない（全14件確認済み）。将来的に NOT NULL 制約に変更することを検討してもよい（別タスク）。

---

## 4. 運用観点

### 4-1. エラー監視
- **未導入** — Sentry、Datadog、LogRocket等のエラー監視サービスは一切なし
- 本番でのエラーは完全に見えない状態

### 4-2. ログ出力
- `console.error`: 243箇所、`console.log`: 8箇所、`console.warn`: 1箇所
- 構造化ログなし、リクエストID・ユーザーIDの紐付けなし
- Vercelのログでは追跡困難

### 4-3. Stripe Webhook の冪等性

~~**未対応** — `event.id` の記録・重複チェックなし~~

**対応完了（2026-04-13）**

実装内容:
- `stripe_events` テーブルを新規作成（`event_id` 主キー、`event_type`、`received_at`、`processed_at`、`status`（`'processing'`/`'completed'`/`'failed'`）、`error_message`）
- RLS 有効、ポリシーなし = adminClient 以外完全ブロック
- `status != 'completed'` 用の部分インデックス

`app/api/webhooks/stripe/route.ts` を書き換え:
- ステップ先頭で `stripe_events` に INSERT を試みる
- 主キー重複（`23505`）を検知して既存レコードの status で分岐
  - `completed` → 即 200（冪等）
  - `processing` かつ 5分以内 → 500（Stripe リトライさせる）
  - `processing` かつ 5分超過 → 先行リクエストクラッシュと判断、再処理
  - `failed` → 再処理
- 5分しきい値の定数 `PROCESSING_TIMEOUT_MINUTES` で明記
- 処理完了時に `completed` + `processed_at=now()` に更新
- 処理失敗時に `failed` + `error_message` で記録

既存バグの同時修正:
- `stripe-signature` ヘッダーの null チェック追加（旧: `!` non-null assert でクラッシュしていた）
- `work_requests` 更新失敗時に 500 を返すよう修正（旧: 200 でスルーしていた、audit-report 2-3 に記載）

動作確認:
- Stripe 署名検証があるためローカルでの手動テスト不可
- ビルド成功で動作保証
- 本番運用初期は以下を特にモニタリング:
  - `stripe_events` テーブルのレコードが増えていること
  - `status='completed'` に正しく遷移していること
  - `status='failed'` のレコードが出ていないか

本番モニタリング用SQL（別タスクとして記録）:

```sql
-- 最近のイベントを確認
SELECT event_id, event_type, status, received_at, processed_at, error_message
FROM stripe_events ORDER BY received_at DESC LIMIT 20;

-- 失敗しているイベント
SELECT * FROM stripe_events WHERE status = 'failed';

-- 処理中のまま5分以上経っているイベント（要調査）
SELECT * FROM stripe_events
WHERE status = 'processing'
  AND received_at < now() - interval '5 minutes';
```

### 4-4. 決済まわりのエッジケース

| 問題 | 詳細 |
|------|------|
| 二重決済 | Checkout Session作成時に既存セッションの確認なし。連打で複数セッション作成可能 |
| 返金の二重実行 | ~~`refund_id` の事前チェックなし。同じ契約に2回返金リクエスト可能~~ → ✅ 対応済み（`refund_id` 事前チェック追加、409 で拒否） |
| 返金後のDB不整合 | ~~Stripe返金成功→DB更新失敗でも `success: true` を返す~~ → ✅ 対応済み（`work_contracts` 更新失敗時に 500 を返すよう修正） |
| Cron返金の順序問題 | `auto-approve/route.ts` — キャンセル処理でDB状態を先に `cancelled` に変更した後にHTTP経由で返金API呼出。返金失敗時にDBだけキャンセル済みで返金されない |
| トランザクションなし | Cronの複数テーブル更新がトランザクションで囲まれていない。途中失敗でDB不整合 |
| Cron同時実行 | 排他制御（ロック）なし。同時に2回起動すると重複処理の可能性 |

---

## 5. ユーザー体験の観点

### 5-1. ローディング表示
- **良好** — 主要6画面すべてでスケルトンUI・ローディングスピナーが実装済み
  - ダッシュボード、メッセージ一覧、依頼詳細、ポートフォリオ詳細、クリエイター詳細、ブックマーク

### 5-2. 空状態の表示
- **良好** — データゼロ時のメッセージとCTAボタンが全画面で実装済み
  - 例:「メッセージはまだありません」→「クリエイターを探す」リンク

### 5-3. エラー画面
- `app/error.tsx` あり（500エラー用のカスタムUI）
- ただし**ルートレベルの1つのみ** — `/dashboard`, `/messages`, `/requests` 等に個別のerror.tsxなし。すべて同じ汎用500ページに飛ぶ

### 5-4. モバイル対応
- CSS Modules + `@media (max-width: 768px)` でレスポンシブ対応済み
- Header にハンバーガーメニューあり
- Tailwindのユーティリティクラスではなく、CSSファイル側でブレークポイント管理

---

## 6. 法務・規約観点

| ページ | 状態 |
|--------|------|
| 利用規約（`/terms`） | あり（最終更新: 2024-12-16） |
| プライバシーポリシー（`/privacy`） | あり（施行: 2024-12-08） |
| 特定商取引法（`/law`） | あり（施行: 2024-12-08）。運営: 合同会社スタジオアサリ |
| 外部送信ポリシー（`/cookie_policy`） | あり（施行: 2024-12-08） |
| **お問い合わせページ** | **なし** — Footerの「お問い合わせ」リンクが `href="#"`（リンク切れ）。連絡先は法務ページ内のメール・電話のみ |

---

## 優先度別アクションリスト

### 致命的（運用開始前に必須）
1. **全APIルートに認証チェックを追加** — 特に `refund`, `create-checkout-session`, `delete-portfolio`, `get-email-by-username`
2. ~~**Stripe Webhook の冪等性対策** — event.id の重複チェックテーブル追加~~ ✅ 完了（2026-04-13、`stripe_events` テーブル + Webhook ハンドラ書き換え + 既存バグ修正）
3. ~~**返金APIのステータス事前チェック** — 返金済み契約への再返金を防止~~ ✅ 完了（2026-04-13、`/api/refund` 修正に含む。`refund_id` 事前チェック + DB更新エラーハンドリング）
4. **管理画面のサーバーサイド認証** — middleware またはサーバーコンポーネントでの管理者チェック
5. **ビルドエラー修正** — tsconfig.json の exclude に supabase/functions を追加

### 高（早期対応推奨）
6. **エラー監視サービス導入**（Sentry等）
7. **APIルートへのレート制限追加**
8. **二重決済防止** — Checkout Session作成前の既存セッション確認
9. **Webhook の部分失敗対策** — work_requests更新失敗時に200を返さない
10. **管理画面の返金TODO実装** — `app/admin/requests/page.tsx:217`
11. **Cron処理のトランザクション化・排他制御**
12. **status 遷移バグの調査と修正** — contracted → paid の遷移漏れ調査（3-11）、過去データ修正SQL、auto-approve の並行契約バグ修正
13. **Edge Functions の recipient_id カラム名バグ修正** — 3-14、通知作成 INSERT が silent fail している可能性
14. **お問い合わせページの作成** — Footerのリンク切れ修正

### 中（品質向上）
15. **any型の削減**（74箇所 → 型定義の整備）
16. **useEffectの関数定義順序修正**（33ファイル）
17. **AuthRequiredModal.tsx のuseAuth条件呼び出し修正**
18. **`<img>` → Next.js `<Image>` への置き換え**（54箇所）
19. **構造化ログの導入**
20. **ルート別error.tsxの追加**（dashboard, messages等）
