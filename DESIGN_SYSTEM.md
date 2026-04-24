# デザインシステム

同人系クリエイター向けサービスのデザインガイドライン。

---

## 概要

- **テーマ**: ライトモード / ダークモード 両対応
- **トーン**: ポップ、活気、親しみやすい
- **アイコン**: FontAwesome 6
- **フォント**: Outfit（見出し）、Noto Sans JP（本文）

---

## カラーパレット

### 背景色

| 変数 | ライト | ダーク | 用途 |
|------|--------|--------|------|
| `--bg-base` | `#faf9f7` | `#13131a` | ページ背景 |
| `--bg-elevated` | `#ffffff` | `#1c1c26` | カード、モーダル |
| `--bg-sunken` | `#f0eeeb` | `#0d0d12` | 凹み、入力欄 |
| `--bg-hover` | `#f8f7f5` | `#252532` | ホバー時 |

### テキスト色

| 変数 | ライト | ダーク | 用途 |
|------|--------|--------|------|
| `--text-primary` | `#1f1f23` | `#f5f5f7` | 見出し、本文 |
| `--text-secondary` | `#5c5c66` | `#a0a0b0` | 説明文、補足 |
| `--text-tertiary` | `#8c8c96` | `#6c6c7a` | プレースホルダー、ヒント |

### ボーダー色

| 変数 | ライト | ダーク |
|------|--------|--------|
| `--border-default` | `#e5e3df` | `#4a4a5a` |
| `--border-subtle` | `#f0eeeb` | `#3a3a48` |

### アクセントカラー

| 変数 | 値 | 用途 |
|------|-----|------|
| `--accent-primary` | `#ff6b4a` | メインカラー（オレンジ） |
| `--accent-primary-hover` | `#ff5533` | ホバー時 |
| `--accent-primary-subtle` | `#fff0ed` (L) / `#2a1f1d` (D) | 薄い背景 |
| `--accent-secondary` | `#ff8fab` | サブカラー（ピンク） |
| `--accent-gradient` | `linear-gradient(135deg, #ff6b4a, #ff8fab)` | グラデーション |

### インタラクション色

| 変数 | 値 | 用途 |
|------|-----|------|
| `--color-like` | `#ff6b8a` | いいね（ピンク） |
| `--color-star` | `#f59e0b` | レビュー★（ゴールド） |
| `--color-bookmark` | `#f59e0b` | ブックマーク（ゴールド） |

### ステータスカラー

| 変数 | 値 | 用途 |
|------|-----|------|
| `--status-success` | `#22c55e` | 成功、完了 |
| `--status-warning` | `#f59e0b` | 警告、注意 |
| `--status-error` | `#ef4444` | エラー |
| `--status-info` | `#3b82f6` | 情報 |

---

## タイポグラフィ

### フォント

```css
--font-display: 'Outfit', sans-serif;  /* 見出し、ロゴ */
--font-body: 'Noto Sans JP', sans-serif;  /* 本文 */
```

### サイズ

| 変数 | 値 |
|------|-----|
| `--text-xs` | 0.75rem (12px) |
| `--text-sm` | 0.875rem (14px) |
| `--text-base` | 1rem (16px) |
| `--text-lg` | 1.125rem (18px) |
| `--text-xl` | 1.25rem (20px) |
| `--text-2xl` | 1.5rem (24px) |
| `--text-3xl` | 2rem (32px) |

---

## スペーシング

| 変数 | 値 |
|------|-----|
| `--space-1` | 0.25rem (4px) |
| `--space-2` | 0.5rem (8px) |
| `--space-3` | 0.75rem (12px) |
| `--space-4` | 1rem (16px) |
| `--space-5` | 1.25rem (20px) |
| `--space-6` | 1.5rem (24px) |
| `--space-8` | 2rem (32px) |
| `--space-10` | 2.5rem (40px) |
| `--space-12` | 3rem (48px) |

---

## パディング（内側余白）

| 要素 | padding |
|------|---------|
| ボタン | `--space-3` `--space-5`（12px 20px） |
| ボタン小 | `--space-2` `--space-3`（8px 12px） |
| カード内 | `--space-5`（20px） |
| モーダル各部 | `--space-5`（20px） |
| フォーム入力 | `--space-3` `--space-4`（12px 16px） |
| バッジ | `--space-1` `--space-3`（4px 12px） |
| アラート | `--space-4` `--space-5`（16px 20px） |
| タブ | `--space-3` `--space-5`（12px 20px） |
| ドロップダウン項目 | `--space-3` `--space-4`（12px 16px） |
| テーブルセル | `--space-3` `--space-4`（12px 16px） |
| ページ全体 | `--space-6`（24px）、モバイル `--space-4` |

---

## マージン（外側余白）

| 用途 | margin |
|------|--------|
| 関連する要素間 | `--space-2`〜`--space-3`（8〜12px） |
| 要素間（標準） | `--space-4`（16px） |
| グループ間 | `--space-6`〜`--space-8`（24〜32px） |
| セクション間 | `--space-12`（48px） |

---

## line-height（行間）

| 用途 | 値 |
|------|-----|
| 見出し | 1.3 |
| 本文 | 1.7 |
| ボタン・バッジ | 1 |
| フォーム入力 | 1.5 |

---

## ボーダー・角丸

| 変数 | 値 | 用途 |
|------|-----|------|
| `--radius-sm` | 6px | バッジ、小要素 |
| `--radius-md` | 10px | ボタン、入力欄、画像 |
| `--radius-lg` | 16px | カード |
| `--radius-xl` | 24px | 大きなカード |
| `--radius-full` | 9999px | 丸型（アバター、ピル） |

---

## アバターサイズ

| クラス | サイズ | 用途 |
|--------|--------|------|
| `.avatar-xs` | 24px | コメント欄、密集表示 |
| `.avatar-sm` | 32px | カード内、リスト |
| `.avatar-md` | 48px | プロフィール欄 |
| `.avatar-lg` | 80px | プロフィールページ |
| `.avatar-xl` | 120px | 設定画面 |

---

## z-index 階層

| レイヤー | z-index | 用途 |
|----------|---------|------|
| base | 0 | 通常要素 |
| dropdown | 100 | ドロップダウンメニュー |
| sticky | 200 | ヘッダー |
| overlay | 300 | オーバーレイ背景 |
| modal | 400 | モーダル |
| toast | 500 | 通知トースト |

---

## フォーカス状態

Tabキーで要素を移動したときの見た目。

```css
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

---

## 影（box-shadow）

基本使わない。使う場面：

| 要素 | 値 |
|------|-----|
| ドロップダウン | `0 4px 16px rgba(0, 0, 0, 0.12)` |
| ツールチップ | `0 2px 8px rgba(0, 0, 0, 0.15)` |

---

## レスポンシブ ブレークポイント

| 名前 | 幅 | デバイス |
|------|-----|----------|
| sm | 640px〜 | スマホ横 |
| md | 768px〜 | タブレット |
| lg | 1024px〜 | PC小 |
| xl | 1280px〜 | PC |

---

## コンポーネント

### ボタン

```html
<button class="btn btn-primary">メインアクション</button>
<button class="btn btn-secondary">キャンセル</button>
<button class="btn btn-ghost">詳細を見る →</button>
<button class="btn btn-primary" disabled>送信できない</button>
```

**サイズ**
| クラス | padding | 用途 |
|--------|---------|------|
| `.btn` | 12px 20px | 通常（ページ内のメインアクション） |
| `.btn-sm` | 8px 12px | 小（ヘッダー、カード内、狭い場所） |

```html
<!-- 小さいボタン -->
<button class="btn btn-primary btn-sm">ログイン</button>
<button class="btn btn-secondary btn-sm">会員登録</button>
```

**ホバー挙動**
- `btn-primary`: opacity下がる
- `btn-secondary`: 背景色変化
- `btn-ghost`: アクセントカラーに変化

**幅揃え（2個並べるとき）**

```html
<div class="button-group-equal">
  <button class="btn btn-secondary">キャンセル</button>
  <button class="btn btn-primary">保存する</button>
</div>
```

---

### テキストリンク

```html
<!-- 目立たせたい・CTA的 -->
<a class="link">もっと見る →</a>

<!-- 本文に馴染む補足 -->
<a class="link-subtle">利用規約</a>
```

---

### カード（3種類）

#### 作品カード

```html
<article class="card">
  <div class="card-image">
    <img src="..." alt="">
  </div>
  <div class="card-body">
    <p class="card-category">イラスト</p>
    <h3 class="card-title">タイトル</h3>
    <p class="card-text">説明文</p>
    <div class="card-meta">
      <div class="card-author">
        <div class="avatar avatar-sm"></div>
        <span>作者名</span>
      </div>
      <span class="card-stats"><i class="fa-solid fa-heart icon-like active"></i> 234</span>
    </div>
  </div>
</article>
```

#### サービスカード

```html
<article class="card card-service">
  <div class="card-image">
    <img src="..." alt="">
    <span class="overlay-badge overlay-badge-top-right overlay-badge-pill">リピート率 72%</span>
  </div>
  <div class="card-body">
    <h3 class="card-title">サービス名</h3>
    <div class="card-stats-row">
      <span><i class="fa-solid fa-star icon-star active"></i> 4.9 (25件)</span>
      <span><i class="fa-solid fa-box"></i> 131件</span>
    </div>
    <div class="card-service-footer">
      <div class="card-seller">
        <div class="avatar avatar-sm"></div>
        <span>出品者名</span>
      </div>
      <span class="card-price">¥333</span>
    </div>
  </div>
</article>
```

#### ブログカード

```html
<article class="card card-blog">
  <div class="card-image">
    <img src="..." alt="">
  </div>
  <div class="card-body">
    <div class="card-blog-meta">
      <span class="badge badge-accent">ガイド</span>
      <span class="card-date">2024-01-15</span>
    </div>
    <h3 class="card-title">記事タイトル</h3>
    <div class="card-views">
      <i class="fa-regular fa-eye"></i> 1,234 views
    </div>
  </div>
</article>
```

**共通ルール**
- サムネイル比率: `1.91 : 1`（`object-fit: cover`で強制）
- ホバー: 背景色が`--bg-hover`に変化、サムネはopacity下がる
- フッター（メタ情報）は下揃え: テキスト量で高さが変わっても揃う

---

### オーバーレイバッジ

背景に重ねて表示する透過黒バッジ。

```html
<span class="overlay-badge overlay-badge-top-right">テキスト</span>
<span class="overlay-badge overlay-badge-bottom-left overlay-badge-pill">
  <i class="fa-solid fa-fire"></i> 人気
</span>
```

**位置クラス**
- `overlay-badge-top-left`
- `overlay-badge-top-right`
- `overlay-badge-bottom-left`
- `overlay-badge-bottom-right`

**修飾クラス**
- `overlay-badge-pill`: 角丸

---

### ステータスバッジ

```html
<span class="badge badge-open"><i class="fa-solid fa-circle fa-xs"></i> 募集中</span>
<span class="badge badge-progress"><i class="fa-solid fa-circle fa-xs"></i> 作業中</span>
<span class="badge badge-closed"><i class="fa-solid fa-circle fa-xs"></i> 完了</span>
<span class="badge badge-accent"><i class="fa-solid fa-sparkles fa-xs"></i> 新着</span>
```

---

### タブ

```html
<div class="tabs">
  <button class="tab active">作品一覧</button>
  <button class="tab">いいね</button>
  <button class="tab">ブックマーク</button>
</div>
```

---

### フォーム

```html
<div class="form-group">
  <label class="form-label">ラベル</label>
  <input type="text" class="form-input" placeholder="プレースホルダー">
</div>

<!-- エラー時 -->
<input type="text" class="form-input error" value="無効な値">
<p class="form-error"><i class="fa-solid fa-circle-exclamation"></i> エラーメッセージ</p>
```

---

### 検索バー

```html
<div class="search-bar">
  <i class="fa-solid fa-magnifying-glass search-icon"></i>
  <input type="text" placeholder="作品やクリエイターを検索...">
</div>
```

---

### アラート

左ラインスタイル。

```html
<div class="alert alert-info"><i class="fa-solid fa-circle-info alert-icon"></i> メッセージ</div>
<div class="alert alert-success"><i class="fa-solid fa-circle-check alert-icon"></i> メッセージ</div>
<div class="alert alert-warning"><i class="fa-solid fa-triangle-exclamation alert-icon"></i> メッセージ</div>
<div class="alert alert-error"><i class="fa-solid fa-circle-xmark alert-icon"></i> メッセージ</div>
```

---

### モーダル

```html
<div class="modal-overlay" id="modal">
  <div class="modal">
    <div class="modal-header">
      <h3 class="modal-title">タイトル</h3>
      <button class="modal-close"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="modal-body">
      <!-- コンテンツ -->
    </div>
    <div class="modal-footer button-group-equal">
      <button class="btn btn-secondary">キャンセル</button>
      <button class="btn btn-primary">実行</button>
    </div>
  </div>
</div>
```

**機能**
- 背景: `rgba(0, 0, 0, 0.6)`
- `body.modal-open`で背景スクロール禁止
- 背景クリック・Escキーで閉じる
- フッターは`button-group-equal`で幅揃え

---

### トグルスイッチ

```html
<div class="toggle" onclick="this.classList.toggle('active')"></div>
```

---

### テーマ切り替えスイッチ

ライト/ダークモードの切り替えUI。ヘッダーに配置。

```html
<!-- 通常サイズ -->
<div class="theme-switch">
  <button class="theme-switch-btn active">
    <i class="fa-solid fa-sun"></i>
  </button>
  <button class="theme-switch-btn">
    <i class="fa-solid fa-moon"></i>
  </button>
</div>

<!-- 小サイズ（ヘッダー向け） -->
<div class="theme-switch theme-switch-sm">
  <button class="theme-switch-btn active">
    <i class="fa-solid fa-sun"></i>
  </button>
  <button class="theme-switch-btn">
    <i class="fa-solid fa-moon"></i>
  </button>
</div>
```

**サイズ**
| クラス | ボタンサイズ | 用途 |
|--------|-------------|------|
| `.theme-switch` | 32px | 設定画面など |
| `.theme-switch-sm` | 28px | ヘッダー |

**状態**
- `.active` → 選択中（背景白、アクセントカラー）

---

### ドロップダウン

```html
<div class="dropdown">
  <button class="dropdown-trigger">選択 <i class="fa-solid fa-chevron-down"></i></button>
  <div class="dropdown-menu">
    <div class="dropdown-item">項目1</div>
    <div class="dropdown-item">項目2</div>
    <div class="dropdown-divider"></div>
    <div class="dropdown-item">項目3</div>
  </div>
</div>
```

**開閉**: `.dropdown`に`.active`クラスをトグル  
**ホバー**: 背景色変化

---

### テーブル

```html
<table class="table">
  <thead>
    <tr>
      <th>名前</th>
      <th>ステータス</th>
      <th>日付</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>依頼A</td>
      <td><span class="badge badge-open">募集中</span></td>
      <td>2025/01/18</td>
    </tr>
  </tbody>
</table>
```

**行ホバー**: 背景色変化

---

### チェックボックス

```html
<label class="checkbox">
  <input type="checkbox">
  <span class="checkbox-mark"></span>
  利用規約に同意する
</label>
```

**チェック時**: アクセントカラー背景 + 白チェックマーク

---

### ラジオボタン

```html
<label class="radio">
  <input type="radio" name="group">
  <span class="radio-mark"></span>
  選択肢A
</label>
```

**選択時**: アクセントカラー背景 + 白丸

---

### 空状態

コンテンツがないときの表示。

```html
<div class="empty-state">
  <i class="fa-regular fa-folder-open"></i>
  <p>作品がありません</p>
  <button class="btn btn-primary">作品を投稿する</button>
</div>
```

---

### 区切り線

```html
<div class="divider"></div>
```

```css
.divider {
  height: 1px;
  background: var(--border-default);
  margin: var(--space-6) 0;
}
```

---

### ページネーション

```html
<div class="pagination">
  <button class="page-btn"><i class="fa-solid fa-chevron-left"></i></button>
  <button class="page-btn active">1</button>
  <button class="page-btn">2</button>
  <button class="page-btn">...</button>
  <button class="page-btn"><i class="fa-solid fa-chevron-right"></i></button>
</div>
```

---

### インタラクションアイコン

```html
<!-- いいね -->
<i class="fa-regular fa-heart icon-like"></i>  <!-- 非活性 -->
<i class="fa-solid fa-heart icon-like active"></i>  <!-- 活性 -->

<!-- レビュー -->
<i class="fa-regular fa-star icon-star"></i>
<i class="fa-solid fa-star icon-star active"></i>

<!-- ブックマーク -->
<i class="fa-regular fa-bookmark icon-bookmark"></i>
<i class="fa-solid fa-bookmark icon-bookmark active"></i>
```

---

### スケルトンローディング

```html
<div class="skeleton skeleton-image"></div>
<div class="skeleton skeleton-text" style="width: 80%;"></div>
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-avatar avatar-md"></div>
```

---

## ホバー挙動まとめ

| 要素 | ホバー時 |
|------|----------|
| `btn-primary` | opacity下がる |
| `btn-secondary` | 背景色変化 |
| `btn-ghost` | アクセントカラー |
| `link` | アクセントカラー + 下線 |
| `link-subtle` | アクセントカラー |
| カード / リスト | 背景色変化 |
| サムネイル画像 | opacity下がる |
| テーブル行 | 背景色変化 |
| ドロップダウン項目 | 背景色変化 |
| チェックボックス / ラジオ | ボーダーがアクセントカラー |

---

## 使用FontAwesomeアイコン

| 用途 | アイコン |
|------|----------|
| 検索 | `fa-magnifying-glass` |
| いいね | `fa-heart` |
| ブックマーク | `fa-bookmark` |
| レビュー | `fa-star` |
| ダークモード | `fa-moon` / `fa-sun` |
| 閉じる | `fa-xmark` |
| ページ送り | `fa-chevron-left` / `fa-chevron-right` |
| ドロップダウン矢印 | `fa-chevron-down` |
| ステータス | `fa-circle` |
| 新着 | `fa-sparkles` |
| 人気 | `fa-fire` |
| 画像枚数 | `fa-images` |
| 拡大 | `fa-search-plus` |
| 時間 | `fa-clock` |
| 空フォルダ | `fa-folder-open` |
| チェック | `fa-check` |
| 販売件数 | `fa-box` |
| 閲覧数 | `fa-eye` |
| 記事 | `fa-file-lines` |
| アラート(info) | `fa-circle-info` |
| アラート(success) | `fa-circle-check` |
| アラート(warning) | `fa-triangle-exclamation` |
| アラート(error) | `fa-circle-xmark`, `fa-circle-exclamation` |
| イラスト | `fa-palette` |
| ペン | `fa-pen-nib` |

---

## 画像の扱い

- 枠は比率固定（サムネイル: 1.91:1）
- ユーザー画像は `object-fit: cover` でトリミング
- 角丸: `--radius-md` (10px)

```css
.image-container {
  border-radius: var(--radius-md);
  overflow: hidden;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

---

## テーマ切り替え

```javascript
// data-theme属性で切り替え
document.body.dataset.theme = 'dark';  // ダークモード
document.body.dataset.theme = 'light'; // ライトモード
```

```css
:root { /* ライトモードの変数 */ }
[data-theme="dark"] { /* ダークモードの変数 */ }
```

---

## ダークモード調整

ダークモードでは以下の変数が変わる。

### 変数の変更

| 変数 | ライト | ダーク |
|------|--------|--------|
| `--border-default` | `#e5e3df` | `#4a4a5a` |
| `--border-subtle` | `#f0eeeb` | `#3a3a48` |

### 個別調整が必要な要素

**オーバーレイバッジ**
```css
[data-theme="dark"] .overlay-badge {
  background: rgba(255, 255, 255, 0.15);
}
```

**タグ**
```css
[data-theme="dark"] .tag {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
```

---

## スケルトンローディング

データ読み込み中はカード形状のスケルトンを表示する。

### 基本スタイル

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-sunken) 25%,
    var(--bg-hover) 50%,
    var(--bg-sunken) 75%
  );
  background-size: 200% 100%;
  animation: skeletonLoading 1.5s infinite;
  border-radius: var(--radius-sm);
}

@keyframes skeletonLoading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 用意されたコンポーネント

| コンポーネント | 用途 | ファイル |
|--------------|------|---------|
| `WorkCardSkeleton` | 作品カード | Skeleton.tsx |
| `WorkGridSkeleton` | 作品グリッド | Skeleton.tsx |
| `FeaturedGridSkeleton` | おすすめ作品 | Skeleton.tsx |
| `CreatorCardSkeleton` | クリエイターカード | Skeleton.tsx |
| `CreatorGridSkeleton` | クリエイターグリッド | Skeleton.tsx |
| `RequestCardSkeleton` | 依頼カード | Skeleton.tsx |
| `RequestGridSkeleton` | 依頼グリッド | Skeleton.tsx |
| `PricingCardSkeleton` | 価格カード | Skeleton.tsx |
| `PricingGridSkeleton` | 価格グリッド | Skeleton.tsx |

### 使用例

```tsx
import { WorkGridSkeleton } from '@/app/components/Skeleton'

// loading中はスケルトン表示
{loading && <WorkGridSkeleton count={12} />}

// データ取得後は実際のコンテンツ
{!loading && items.length > 0 && (
  <div className={styles.grid}>
    {items.map(item => <WorkCard key={item.id} item={item} />)}
  </div>
)}
```

### ルール

- 一覧ページのデータ取得中はスケルトンを使用
- スピナーは使わない
- カードの形状に合わせたスケルトンを表示

---

## 画像最適化

Next.js `<Image>` を使用し、`sizes` 属性で表示サイズを指定する。

### 基本ルール

1. 全ての `<Image>` に `sizes` を指定する
2. `fill` を使う場合は必須
3. `width/height` を使う場合も指定する（元画像が大きい可能性があるため）

### アバター

| サイズ | width/height | sizes |
|--------|--------------|-------|
| XS | 24 | `24px` |
| SM | 36 | `36px` |
| MD | 48 | `48px` |
| LG | 64 | `64px` |
| XL | 120 | `120px` |

```tsx
<Image 
  src={avatarUrl} 
  alt="" 
  width={64} 
  height={64}
  sizes="64px"
/>
```

### カード画像（fill使用）

| 用途 | sizes |
|------|-------|
| 作品カード | `(max-width: 479px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 180px` |
| おすすめ作品 | `(max-width: 767px) 25vw, 15vw` |
| 価格カード | `(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 200px` |
| 関連作品 | `(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 200px` |

```tsx
<Image 
  src={imageUrl} 
  alt={title}
  fill
  sizes="(max-width: 479px) 50vw, (max-width: 767px) 33vw, 180px"
  style={{ objectFit: 'cover' }}
/>
```

### 詳細ページ

| 用途 | sizes |
|------|-------|
| メイン画像（イラスト） | `(max-width: 767px) 100vw, (max-width: 1023px) 80vw, 600px` |
| マンガページ | `(max-width: 767px) 100vw, (max-width: 1023px) 80vw, 700px` |
| オーディオカバー | `(max-width: 767px) 80vw, 400px` |
| サムネイルストリップ | `100px` |
| モーダル（フルスクリーン） | `100vw` |

### sizes の書き方

```
sizes="(条件1) サイズ1, (条件2) サイズ2, デフォルトサイズ"
```

- `vw` = ビューポート幅の割合
- `px` = 固定サイズ
- 条件は小さい画面から順に書く

---

## 参照ファイル

- `design-sample.html` - 全コンポーネントの実装サンプル