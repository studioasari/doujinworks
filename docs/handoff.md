# 同人ワークス 引き継ぎドキュメント

最終更新: 2026-04-29（利用規約改訂 Phase 1〜4 完了 + 累積タスク反映）

このドキュメントは「常に最新の 1 ファイル」として運用する。過去の状態は `git log docs/handoff.md` で追える。

**次にこのプロジェクトに着手する人へ**: まず「0. 現在の作業状態」を読んで未コミット変更を把握すること。次に「5. 次にやること」の優先度: 中の項目（メッセージ通報・admin閲覧・発信者情報開示）が利用規約と実装の乖離を埋めるタスクなので最優先で確認推奨。

---

## 0. 現在の作業状態（2026-04-29 セッション末時点）

### 未コミットの変更
`git status --short` 時点で以下が未コミット：

| ファイル | 状態 | 内容 |
|---|---|---|
| `app/terms/client.tsx` | M | **利用規約 大幅改訂(Phase 1〜4 + 法務レビュー13点 + 抜け4点 + 用語整理)**。14章43条構成は維持、内容面の構造的バグ・矛盾・曖昧表現を全面解消 |
| `.claude/settings.local.json` | M | Claude Code 設定（permission/env など）。本タスクと無関係 |
| `docs/current-flow-analysis.md` | ??（untracked） | 既存の調査メモ。本タスクと無関係 |

### 推奨コミット手順
本セッション完了時、利用規約改訂のみを 1 コミットにまとめてコミット推奨：

```powershell
git add 'app/terms/client.tsx' 'docs/handoff.md'
git commit -m @'
docs: revise terms of service - resolve 13 legal review items + 4 gaps + terminology

[Legal review #1] Rewrite 第14条 to resolve logic conflict between 限定列挙 and キャンセル申請 flows. Unified post-payment to キャンセル申請+7日自動承認. Removed 作業開始前/後 distinction. Added 第4項 for unilateral cancellation with admin approval. Consolidated decimal handling fee triple-definition into 第6項 (当社負担明記).

[Legal review #2] Fix 第15条第1項第1号 dangling reference: 第14条第2項 → 第14条第5項.

[Legal review #3] Clarify 第7条第7項: removed 成果物/ブックマーク references, kept only CDN cache reflection delay.

[Legal review #4] 第31条第3項: removed 応募中 from 退会阻害事由, added 応募取り下げ義務 before 退会.

[Legal review #5] 第33条第7項第2号: clarify 当社の判断による削除 vs 利用者の自己送信メッセージ削除権.

[Legal review #7] 第13条第3項: removed 合理的な理由なく (matches auto-approve cron).

[Legal review #8] 第27条第1項: explicit damage calculation formula.

[Legal review #9] 第8条第3項: extended ゾーニング to 未ログイン閲覧者 with 初期状態 display + 表示希望意思表示.

[Legal review #10] 第34条第2項: removed 消費者に限る, unified 上限 for both 消費者 and 事業者.

[Legal review #11] 第24条第3項: aligned 利用態様 列挙 with 第7条第5項.

[Legal review #12] Removed 第18条第12項, consolidated to 第25条第39号 (第18条 12項 → 11項).

[Gap A] Added クーリングオフ不適用 (第14条第10項).
[Gap B] Updated 第4条第3項第6号 to specify 日本国内向け only.
[Gap C] Added 緊急連絡先 (第43条第2項・第3項) - email only, no SLA guarantee.
[Gap D] Added サービス終了時の取扱い (第33条第10〜14項) - ココナラ方式 みなし振込申請 + 供託.

[Terminology] R18コンテンツ → 成人向け作品, R18ラベル → 成人向けラベル (14 occurrences).

Verified: lint clean, JSX tag balance, 条番号 1〜43 連続性, no orphan references.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

### 開発環境の特記事項
- バックアップ: `/tmp/terms_backup_phase4.tsx`（Phase 4 開始前のスナップショット、シェル再起動で消える可能性あり、必要なら早めに別箇所へ退避）
- 検証済み: `npm run lint` クリーン、grep 検証で旧仮条番号（第100〜109条）と旧条番号からの参照漏れゼロを確認
- ローカル `/terms` での目視確認は**未実施** — 実機表示の確認をユーザーに依頼推奨

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
| **未コミット** | 2026-04-29 | **docs: 利用規約 全面改訂（14章43条構成への再編、Phase 1〜4）** — `app/terms/client.tsx` の構造を一新。**Phase 1**: 第2条定義に投稿作品・コメント・レビュー・メッセージ・投稿物・R18コンテンツ・未閲覧設定の用語追加、第7条取引成立を双方向化（依頼者/クリエイターどちらも募集投稿可）、第17条「ポートフォリオ掲載」→「成果物の二次利用」、第18条禁止事項に投稿物・レビュー・脅迫等7項目追加（45→52項目、その他を末尾配置）、第23条第7項を保管期間細目（成果物30日/メッセージ無削除/レビュー無削除）と利用者ダウンロード責任の2項に分割。**Phase 2**: 新章「第3章 投稿作品」（第7-10条：投稿/R18ゾーニング/コメント/投稿物の削除）、新章「第5章 レビュー」（第16-17条：レビュー投稿/不適切レビュー）を追加。**Phase 3**: 新章「第6章 メッセージ機能」（第18条、12項構成、添付14日保管・スパム禁止・外部連絡先交換禁止）、新章「第10章 通報・削除手続」（第28-30条：通報/削除等の判断/発信者情報開示）を追加。**Phase 4**: 仮条番号（第100〜109条）を正規番号に振り直し（2-pass placeholder sed 方式で衝突回避、民法第21条・刑法第175条は保護）、章番号を14章まで連番化、手数料・支払章を物理的に第7章位置（メッセージ機能の後・知財の前）へ移動、附則に「2026-04-29 改定」追記。検証: `npm run lint` クリーン、旧仮番号・旧参照すべて新番号に置換済み |
| **未コミット** | 2026-04-29 | **docs: 利用規約 法務レビュー指摘事項13点 + 抜け論点4点 + 用語整理を反映** — Phase 1〜4 完了後の精読で発見された規約上の構造的バグ・矛盾・曖昧表現を全面解消。<br><br>**[精読 #1]** 第14条 全面リライト: 旧版で並走していた「ロジック1(限定列挙)」と「ロジック2(キャンセル申請+7日自動承認)」の矛盾を解消。決済後は全て第3項のキャンセル申請フローに統一。「作業開始前/後」の区別を削除(実装上判定困難)。新設の第4項で相手応答なしでも当社判断で承認できる枠組みを追加(クリエイター失踪・依頼者アカウント放棄ケース対応)。第14条を12項→10項に整理。決済手数料の三重定義(旧第2項・第6項・第10項)を新版の第6項に統一(当社負担を明示)。<br><br>**[精読 #2]** 第15条第1項第1号: 旧第14条第2項参照を新版の第14条第5項参照へ修正(dangling reference 解消)。<br><br>**[精読 #3]** 第7条第7項: 「成果物として納品された場合」「ブックマーク参照中」の言及を削除。「投稿作品」と「成果物」は第2条定義上排他的なので、両者の重複は実態として発生しないため。「キャッシュサーバ・CDN等の事情により反映に時間を要する」のみに整理。<br><br>**[精読 #4]** 第31条第3項: 「応募中」を退会阻害事由から除外(応募は契約ではないため)。退会前の応募取り下げ義務を明記。消費者契約法第10条の不当条項リスク回避。<br><br>**[精読 #5]** 第33条第7項第2号: 「当社の判断による削除は原則として行わない」と明示し、「第18条第4項に基づく利用者による自己送信メッセージの削除を妨げない」を追記。当社保管方針と利用者削除権の矛盾を解消。<br><br>**[精読 #7]** 第13条第3項: 「合理的な理由なく」削除(実装の auto-approve cron は機械的処理のため)。実装と規約の整合。<br><br>**[精読 #8]** 第27条第1項: 損害推定額の計算式を明記(「直接取引の対価額(不明な場合は直近取引の報酬額)に第19条第1項の手数料率を乗じた金額」)。違反者の「相当額」争点を防止。<br><br>**[精読 #9]** 第8条第3項: ゾーニング対象を「未閲覧設定をしている利用者」のみから「未ログイン閲覧者」も含む形に拡張。「初期状態において表示しない」「表示希望の意思表示があった場合のみ表示」を明記。<br><br>**[精読 #10]** 第34条第2項: 「消費者契約法上の消費者に限る」を削除し、消費者・事業者を区別せず一律で上限を設ける形に変更。事業者(個人事業主クリエイター含む)への賠償リスクを限定。<br><br>**[精読 #11]** 第24条第3項: 利用態様の列挙を第7条第5項と整合させて補強(「複製、公衆送信、サムネイル化、トリミング、二次的著作物の作成、翻訳」)。<br><br>**[精読 #12]** 第18条第12項を削除し、第25条第39号(外部連絡先交換禁止)に一本化。第18条は11項構成に。<br><br>**[抜け A]** 第14条第10項(新): クーリングオフ不適用条項を追加(通信販売契約のため特商法第15条の3不適用)。<br><br>**[抜け B]** 第4条第3項第6号: 「日本国内に住所、居所又は本店所在地を有する」「海外在住者の登録、海外通貨での決済、海外送金は対応しない」を明示。<br><br>**[抜け C]** 第43条: 緊急連絡先(脅迫・嫌がらせ・不正アクセス・個人情報漏洩等)としてメール窓口(`info@studioasari.co.jp`)を明記。電話番号は緊急対応用としては不要。営業時間外の対応は保証しない旨も明記。<br><br>**[抜け D]** 第33条第10〜14項(新): サービス終了時の取扱いをココナラ方式で規定。「相当な期間」予告 → 終了日までに出金申請なき場合は「みなし振込申請」で強制振込(最低振込額1,000円ルール撤廃) → 口座未登録なら供託(供託費用は利用者負担)。当社負担の追加なし、収納代行モデル整合。<br><br>**[用語整理]** 「R18コンテンツ」→「成人向け作品」、「R18ラベル」→「成人向けラベル」に全置換(14箇所)。第8条見出しも「第8条(成人向け作品とゾーニング)」に変更。<br><br>**検証**: `npm run lint` クリーン、JSXタグ開閉バランス完全一致(section/h2/h3/p/div)、条番号1〜43連続性維持、旧条文への dangling reference 全件解消、R18 残存ゼロ。行数 1404 → 1408 (+4行で各種修正を吸収)。 |

---

## 5. 次にやること（優先度順）

### 優先度: 中

#### UI 用語の「R18 → 成人向け」変更(規約と実装の乖離)
- 場所: 投稿画面、ポートフォリオ表示、検索フィルタ、設定画面(未閲覧設定周り)等
- 利用規約で「R18コンテンツ」「R18ラベル」を「成人向け作品」「成人向けラベル」に全置換済み(2026-04-29)
- 実装側の UI 表示が「R18」のままになっている箇所を全て「成人向け」に変更する必要あり
- DB カラム名は変えなくてよい(内部識別子)が、ユーザー表示部分は要確認
- 確認方法: `grep -ri "R18" app/ components/` で出現箇所を洗い出し
- リリース前推奨(規約と実装の用語整合のため)

#### 未ログイン者向けの成人向け作品ゾーニング措置の実装
- 場所: 投稿作品の表示ページ全般(ポートフォリオ、検索結果、個別作品ページ等)
- 利用規約第8条第3項で「未ログイン閲覧者にも初期状態で表示しない、表示希望の意思表示があった場合のみ表示する」を明記済み(2026-04-29)
- 現状の実装: 未ログイン者にも成人向け作品が見えてしまう状態(ユーザー談)
- 必要な実装:
  - 未ログインで成人向け作品ページにアクセス → 初期状態で非表示
  - 「成人向けコンテンツが含まれます。表示しますか?」確認ダイアログを表示
  - 表示同意のセッション保存(クッキーまたは sessionStorage)
- リリース前必須(規約と実装の乖離が法的リスク)

#### メッセージ通報機能の実装（規約第28条で予約済み）
- 場所: `reports` テーブル / [app/admin/reports/page.tsx](../app/admin/reports/page.tsx) / メッセージ画面の通報 UI
- 現状: `reports.target_message_id` カラムなし、メッセージ通報の UI なし、`report_type` に `'message'` 値もなし
- 規約 第28条第1項で「投稿物又は行為」への通報が一般化されており、メッセージも対象に含むと読めるが**実装が無い**
- 修正方針:
  - migration 追加: `reports.target_message_id` カラム + FK
  - メッセージ画面（[app/messages/[id]/client.tsx](../app/messages/[id]/client.tsx)）にコンテキストメニューから「通報」追加
  - admin/reports/page.tsx の `REPORT_TYPES` に `'message'` 追加、target 表示に対応

#### メッセージ閲覧の admin 機能整備（規約第18条第7項で予約済み）
- 場所: admin 配下にメッセージ閲覧 UI/API なし
- 現状: Service Role Key で技術的には可能だが**運用ベース（Studio 直接 SQL）**
- 規約 第18条第7項で「本規約違反の調査... メッセージの内容を閲覧することがあります」と明記済み
- 修正方針: 通報ベースで該当メッセージのみ admin が閲覧できる UI 追加（メッセージ通報機能とセット）
- 通報機能と一緒に対応するのが自然

#### 発信者情報開示のための IP/タイムスタンプ保存実装確認（規約第30条）
- 場所: 投稿物（messages, comments, reviews, portfolio_items）作成時に IP を記録する機構の有無未確認
- 規約 第30条第5項で「IPアドレス、タイムスタンプ、通信履歴その他の情報を取得・利用することがあります」と明記
- 確認内容:
  - Supabase Auth の `auth.audit_log_entries` で IP/タイムスタンプ記録されているか
  - 投稿物作成時に IP を別途記録する機構が必要か
  - プロバイダ責任制限法対応として、開示請求があった場合に提出可能な情報の棚卸し
- リリース前に整備推奨（実害発生時に対応不可となるリスク）

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

#### `delivery-retention` cron の実機検証
- 場所: [app/api/cron/delivery-retention/route.ts](../app/api/cron/delivery-retention/route.ts)
- 規約 第33条第7項(1) で「成果物のファイル本体は納品の日から30日間」と明記
- 確認内容:
  - DB の `delivery_files.scheduled_delete_at` の DEFAULT 値が「納品の日から30日後」になっているか（Supabase Studio で `information_schema.columns` 確認）
  - 既存データの `uploaded_at` と `scheduled_delete_at` の差を SQL で確認
  - cron が実機で30日後に削除しているかをテストデータで検証
- 規約とのズレがあれば DB DEFAULT 調整 or 規約改訂

#### 投稿作品削除 API のキャッシュ削除モジュール調査
- 規約 第7条第7項で「キャッシュ削除等のシステム上の処理に合理的な期間を要する」と抽象表現で記述
- 確認内容:
  - 投稿作品削除 API の存在（`portfolio_items.delete` 等）
  - CDN キャッシュ（Cloudflare R2 / Next.js キャッシュ）の即時削除機能の有無
  - ブックマークから参照されている投稿作品の削除フロー
- 実装が即時削除なら規約をより具体化、CDN TTL が長い場合は具体期間を明記する選択肢あり

#### メッセージ添付ファイル 14日自動削除 cron の実装
- 場所: [vercel.json](../vercel.json) の cron リスト、[app/api/upload-chat/route.ts](../app/api/upload-chat/route.ts)
- 規約 第18条第5項で「添付ファイルを送信日から14日間に限り保管」と明記
- 現状: cron なし（vercel.json は auto-approve / delivery-retention の2 cron のみ）。**規約と実装が乖離**
- 修正方針:
  - 新規 cron `/api/cron/chat-attachment-retention` を追加
  - `messages.created_at` から14日経過した `file_url` を持つメッセージの R2 ファイルを削除
  - DB 側は `messages.file_url`/`file_type`/`file_name` を null 化、または専用 `attachment_deleted_at` カラム追加
- **規約公開前の対応推奨**

### 利用規約改訂タスクからの派生

#### 「採用」の主語双方向化に伴う文書全体の文言整合性手動レビュー
- 場所: [app/terms/client.tsx](../app/terms/client.tsx) 全条文
- 第11条第3項（旧第7条第3項）で「採用」の主語が「依頼者」から「募集の投稿者（依頼者又はクリエイター）」に変更
- 他条文では「依頼者」「クリエイター」が役割を前提とした文言が残存している可能性あり
- リリース前の手動レビュー推奨。grep `"採用"` で関連箇所を洗い出して確認
- 機械的な置換ではなく文脈判断が必要

#### `chatUtils.ts` の `user_id` → `profile_id` バグ修正
- 場所: [utils/chatUtils.ts:18,32,61,62](../utils/chatUtils.ts#L18)
- 問題: `chat_room_participants.user_id` を参照しているが、実カラム名は `profile_id`（types/database.types.ts より）
- 影響: `getOrCreateChatRoom` 関数が実行時にクエリ失敗する可能性あり
- 修正方針: `user_id` を `profile_id` に置換するだけ（4箇所）
- 規約改訂タスクとは独立、軽微な修正だが実害の可能性あり

#### メッセージ削除時の「削除されました」表示への変更（仕様変更）
- 場所: [app/messages/[id]/client.tsx:1067-1072](../app/messages/[id]/client.tsx#L1067-L1072), 各 select 文の `.eq('deleted', false)` フィルタ
- 現状: 送信者がメッセージを削除すると、双方の画面から完全に消える（プレースホルダ表示なし）
- 検討内容: 「メッセージは削除されました」のプレースホルダ表示にすべきか
- 規約 第18条第4項に「自己が送信したメッセージを削除することができます」と書いており、表示挙動の規定はない
- UX 改善 + 利用者間の誤解防止の観点で要検討
- 別タスク

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
