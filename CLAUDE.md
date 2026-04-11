# CLAUDE.md - 同人ワークス（doujinworks）

## 1. サービス概要

「同人ワークス」は、同人系クリエイターと依頼者をつなぐマッチングプラットフォーム。
クリエイターがポートフォリオや料金表を公開し、依頼者がリクエスト（依頼）を出して、
マッチング → 契約 → 決済 → 納品 → レビュー の一連のフローを提供する。

本番URL: https://doujinworks.jp

## 2. 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| UI | Tailwind CSS v4, Font Awesome, Zen Maru Gothic フォント |
| 状態管理 | Zustand |
| 認証・DB | Supabase (Auth + PostgreSQL) |
| 決済 | Stripe (Checkout Session + Webhook) |
| ファイルストレージ | Cloudflare R2 (AWS SDK互換) |
| レート制限 | Upstash Redis |
| カルーセル | embla-carousel-react |
| ホスティング | Vercel |
| アナリティクス | Google Analytics (G-XT2NKCP2N5) |

## 3. ディレクトリ構成

```
doujinworks/
├── app/                    # Next.js App Router のページ・API
│   ├── api/                # APIルート（決済、アップロード、Webhook等）
│   ├── admin/              # 管理者画面（ユーザー管理、通報、ポートフォリオ審査等）
│   ├── dashboard/          # ログインユーザー用ダッシュボード
│   │   ├── portfolio/      # ポートフォリオ管理（アップロード: illustration/manga/music/novel/video/voice）
│   │   ├── pricing/        # 料金表管理
│   │   ├── earnings/       # 売上管理
│   │   ├── payments/       # 支払い履歴
│   │   ├── bank-account/   # 振込口座設定
│   │   ├── profile/        # プロフィール編集
│   │   ├── settings/       # アカウント設定
│   │   └── account/        # アカウント情報
│   ├── components/         # 共有UIコンポーネント（Header, Footer, Sidebar等）
│   ├── hooks/              # カスタムフック（useDraft）
│   ├── actions/            # Server Actions（認証関連）
│   ├── messages/           # チャット・メッセージ機能
│   ├── requests/           # 依頼（リクエスト）関連ページ
│   ├── portfolio/          # ポートフォリオ閲覧ページ（カテゴリ別）
│   ├── pricing/            # 料金表閲覧ページ（カテゴリ別）
│   ├── creators/           # クリエイター一覧・詳細
│   ├── bookmarks/          # ブックマーク
│   ├── search/             # 検索
│   ├── tags/               # タグ検索
│   ├── login/              # ログイン
│   ├── signup/             # 新規登録（メール確認 → プロフィール完成）
│   ├── reset-password/     # パスワードリセット
│   └── lp/                 # ランディングページ
├── components/             # グローバルコンポーネント（Skeleton）
├── lib/                    # R2アップロード関連ユーティリティ
├── utils/                  # ユーティリティ
│   ├── supabase/           # Supabaseクライアント（client/server/admin/middleware）
│   ├── stripe.ts           # Stripe初期化
│   ├── rateLimit.ts        # Upstashレート制限
│   ├── chatUtils.ts        # チャットルーム作成・取得
│   ├── notifications.ts    # 通知ヘルパー
│   └── imageUtils.ts       # 画像処理
├── stores/                 # Zustandストア（draftStore）
├── supabase/
│   └── functions/          # Supabase Edge Functions
│       ├── auto-approve-cancellations/  # キャンセル自動承認
│       ├── auto-approve-deliveries/     # 納品自動承認
│       ├── process-refund/              # 返金処理
│       └── send-deadline-warnings/      # 納期警告通知
├── docs/                   # デザインシステム（design-system.html）
├── public/                 # 静的アセット（ロゴ、アイコン、イラスト）
└── middleware.ts            # Supabase認証セッション管理
```

## 4. Supabaseテーブル構成

コードから特定されたテーブル一覧（migrationファイルなし）:

| テーブル名 | 用途 |
|---|---|
| profiles | ユーザープロフィール（display_name, username, is_admin, is_accepting_orders, deleted_at等） |
| business_profiles | ビジネスプロフィール |
| portfolio_items | ポートフォリオ作品 |
| portfolio_likes | ポートフォリオいいね |
| pricing_plans | 料金表プラン |
| work_requests | 依頼（リクエスト） |
| work_request_applications | 依頼への応募 |
| work_contracts | 契約（status, paid_at, payment_intent_id等） |
| work_deliveries | 納品物 |
| cancellation_requests | キャンセル申請 |
| payments | 支払い記録 |
| bank_accounts | 振込口座情報 |
| receipt_metadata | 領収書メタデータ |
| reviews | レビュー・評価 |
| chat_rooms | チャットルーム |
| chat_room_participants | チャット参加者 |
| messages | チャットメッセージ |
| notifications | 通知 |
| bookmarks | ブックマーク |
| comments | コメント |
| comment_likes | コメントいいね |
| follows | フォロー関係 |
| reports | 通報 |
| drafts | 下書き |
| posts | 管理者ブログ記事 |
| post_categories | 記事カテゴリ |

## 5. 主要機能一覧

### ユーザー向け
- **認証**: メール登録 / Google OAuth / ログイン / パスワードリセット
- **プロフィール**: 表示名・アイコン・自己紹介の編集、受注可否の切り替え
- **ポートフォリオ**: 6カテゴリ（イラスト/漫画/小説/音楽/動画/音声）の作品アップロード・管理・下書き保存
- **料金表**: プラン作成・編集・公開
- **依頼（リクエスト）**: 依頼作成 → 応募 → 契約 → 決済（Stripe）→ 納品 → レビュー
- **メッセージ**: ユーザー間チャット（画像送信対応）
- **検索・発見**: クリエイター検索、タグ検索、ポートフォリオ閲覧（カテゴリ別）
- **ソーシャル**: いいね、コメント、ブックマーク、フォロー
- **通知**: アクション通知（未読バッジ付き）
- **売上・支払い**: 売上管理、振込口座登録、支払い履歴、領収書

### 管理者向け（/admin）
- ユーザー管理
- ポートフォリオ審査（承認/却下/ゴミ箱）
- 依頼管理（ゴミ箱含む）
- 通報管理
- 支払い管理
- ブログ記事管理（投稿/カテゴリ/画像）

### バックグラウンド処理（Supabase Edge Functions）
- キャンセル申請の自動承認
- 納品の自動承認（期限切れ時）
- 返金処理
- 納期警告通知

## 6. 環境変数一覧

| 変数名 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー（ブラウザ用） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー（サーバー用） |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 公開キー |
| `STRIPE_SECRET_KEY` | Stripe シークレットキー |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook検証用シークレット |
| `NEXT_PUBLIC_SITE_URL` | サイトURL |
| `NEXT_PUBLIC_APP_URL` | アプリURL |
| `CRON_SECRET` | Cron API認証用シークレット |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 アクセスキー |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 シークレットキー |
| `R2_ACCOUNT_ID` | Cloudflare R2 アカウントID |
| `R2_ENDPOINT` | Cloudflare R2 エンドポイント |
| `R2_BUCKET_DELIVERIES` | R2バケット: 納品物 |
| `R2_BUCKET_PORTFOLIO` | R2バケット: ポートフォリオ |
| `R2_BUCKET_PROFILES` | R2バケット: プロフィール画像 |
| `R2_BUCKET_PRICING` | R2バケット: 料金表画像 |
| `R2_BUCKET_CHATS` | R2バケット: チャット画像 |
| `R2_BUCKET_POSTS` | R2バケット: ブログ記事画像 |
| `R2_PUBLIC_URL_PORTFOLIO` | R2公開URL: ポートフォリオ |
| `R2_PUBLIC_URL_PROFILES` | R2公開URL: プロフィール |
| `R2_PUBLIC_URL_DELIVERIES` | R2公開URL: 納品物 |
| `R2_PUBLIC_URL_PRICING` | R2公開URL: 料金表 |
| `R2_PUBLIC_URL_CHATS` | R2公開URL: チャット |
| `R2_PUBLIC_URL_POSTS` | R2公開URL: ブログ記事 |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis トークン |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth シークレット |

## 7. 未完成・TODO

- `app/admin/requests/page.tsx:217` — `// TODO: Stripe返金処理を実装`
- **Supabase migrationファイルが存在しない** — DBスキーマがコード管理されていない

## 8. 開発コマンド

```bash
npm run dev    # 開発サーバー起動（http://localhost:3000）
npm run build  # プロダクションビルド
npm run lint   # ESLint実行
```

## 9. デザインシステム

- UIを作成・修正するときは `docs/design-system.html` のデザイントークンとコンポーネントスタイルに従うこと
- CSS変数は `app/globals.css` に定義（デザイントークン）
- ライトモード / ダークモード対応（`body[data-theme]`）
- アクセントカラー: オレンジ (#ff6b4a) → ピンク (#ff8fab) のグラデーション
- フォント: Zen Maru Gothic
- 参考デザイン: `docs/design-system.html`

## 10. 注意事項

- `.env.local` に本番キーがコメントアウトで含まれている（取り扱い注意）
- Stripeはテストモードで運用中
- Cloudflare R2はカスタムドメインでアクセス（例: portfolio.doujinworks.jp）
- 画像アップロードはR2へ署名付きURL経由で直接アップロード

## 11. 作業ルール

- **専門用語はわかりやすく説明する**: コードやGitの用語を使うときは、初心者でもわかるように簡単な言葉で補足すること
- **ファイル変更前に必ず確認を取る**: ファイルを変更・削除する前に「何を、なぜ変えるか」を説明し、OKをもらってから実行すること
- **git commit / git push は絶対にしない**: コードの保存（commit）やサーバーへの送信（push）は行わない。必要な場合はユーザーに依頼する
- **Supabase migrationは内容確認してから実行**: データベースの構造を変えるファイル（migration）を作成・実行する場合は、必ず中身を見せてOKをもらってから実行すること
