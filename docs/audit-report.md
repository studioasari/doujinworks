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

### 3-3. レート制限の不足
- レート制限があるのは `app/actions/auth.ts`（ログイン、サインアップ、パスワードリセット等）のみ
- **全APIルートにレート制限がない** — 特に `refund`, `create-checkout-session`, `generate-receipt`, 各アップロード系は対策必須

### 3-4. Supabase RLS
- migrationファイルが存在しないため、RLSの設定状況はコードから確認不可
- Supabaseダッシュボードで直接確認が必要
- 管理者クライアント（RLSバイパス）が認証なしAPIで使われている箇所あり（上記3-2参照）

### 3-5. 管理者画面の認証
- `app/admin/layout.tsx` — 管理者チェックがクライアントサイドのuseEffectのみ。サーバーサイドのミドルウェアガードなし。レンダリング前に一瞬管理画面が表示される可能性あり

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
- **未対応** — `event.id` の記録・重複チェックなし
- 同一イベントが2回配信された場合、`paid_at` が上書きされる
- `work_requests` 更新失敗時にも200を返すため、Stripeはリトライせず部分的な不整合が発生する

### 4-4. 決済まわりのエッジケース

| 問題 | 詳細 |
|------|------|
| 二重決済 | Checkout Session作成時に既存セッションの確認なし。連打で複数セッション作成可能 |
| 返金の二重実行 | `refund_id` の事前チェックなし。同じ契約に2回返金リクエスト可能（Stripe側で拒否されるが、エラーハンドリングが汎用的） |
| 返金後のDB不整合 | Stripe返金成功→DB更新失敗でも `success: true` を返す |
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
2. **Stripe Webhook の冪等性対策** — event.id の重複チェックテーブル追加
3. **返金APIのステータス事前チェック** — 返金済み契約への再返金を防止
4. **管理画面のサーバーサイド認証** — middleware またはサーバーコンポーネントでの管理者チェック
5. **ビルドエラー修正** — tsconfig.json の exclude に supabase/functions を追加

### 高（早期対応推奨）
6. **エラー監視サービス導入**（Sentry等）
7. **APIルートへのレート制限追加**
8. **二重決済防止** — Checkout Session作成前の既存セッション確認
9. **Webhook の部分失敗対策** — work_requests更新失敗時に200を返さない
10. **管理画面の返金TODO実装** — `app/admin/requests/page.tsx:217`
11. **Cron処理のトランザクション化・排他制御**
12. **お問い合わせページの作成** — Footerのリンク切れ修正

### 中（品質向上）
13. **any型の削減**（74箇所 → 型定義の整備）
14. **useEffectの関数定義順序修正**（33ファイル）
15. **AuthRequiredModal.tsx のuseAuth条件呼び出し修正**
16. **`<img>` → Next.js `<Image>` への置き換え**（54箇所）
17. **構造化ログの導入**
18. **ルート別error.tsxの追加**（dashboard, messages等）
