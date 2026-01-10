import Link from 'next/link'
import Breadcrumb from './Breadcrumb'

export default function Footer() {
  return (
    <>
      <Breadcrumb />

      <footer className="footer">
        <div className="footer-inner">
          {/* メインコンテンツ（白カード） */}
          <div className="footer-card">
            <div className="footer-grid">
              {/* サービス情報 */}
              <div>
                <img src="/logotype.png" alt="同人ワークス" className="footer-logo" />
                <p className="footer-description">
                  同人界隈特化の<br />
                  クリエイターマッチングサービス
                </p>
              </div>

              {/* クリエイター向け */}
              <div>
                <h4 className="footer-heading">クリエイター</h4>
                <ul className="footer-links">
                  <li><Link href="/creators" className="footer-link">クリエイターを探す</Link></li>
                  <li><Link href="/portfolio" className="footer-link">作品を見る</Link></li>
                  <li><Link href="/portfolio/upload" className="footer-link">作品を投稿</Link></li>
                  <li><Link href="/earnings" className="footer-link">売上管理</Link></li>
                  <li><Link href="/profile/edit" className="footer-link">プロフィール編集</Link></li>
                </ul>
              </div>

              {/* 依頼者向け */}
              <div>
                <h4 className="footer-heading">依頼</h4>
                <ul className="footer-links">
                  <li><Link href="/requests" className="footer-link">依頼を探す</Link></li>
                  <li><Link href="/requests/create" className="footer-link">依頼を投稿</Link></li>
                  <li><Link href="/requests/manage" className="footer-link">依頼管理</Link></li>
                  <li><Link href="/messages" className="footer-link">メッセージ</Link></li>
                </ul>
              </div>

              {/* サポート */}
              <div>
                <h4 className="footer-heading">サポート</h4>
                <ul className="footer-links">
                  <li><a href="#" className="footer-link">ヘルプセンター</a></li>
                  <li><a href="#" className="footer-link">よくある質問</a></li>
                  <li><a href="#" className="footer-link">お問い合わせ</a></li>
                </ul>
              </div>

              {/* 会社情報 */}
              <div>
                <h4 className="footer-heading">会社情報</h4>
                <ul className="footer-links">
                  <li><a href="#" className="footer-link">運営会社</a></li>
                  <li><a href="#" className="footer-link">採用情報</a></li>
                  <li><a href="#" className="footer-link">ブログ</a></li>
                  <li><a href="#" className="footer-link">お知らせ</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* SNS + 法的リンク */}
          <div className="footer-bottom">
            <div className="footer-social">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="footer-social-icon">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" aria-label="Discord" className="footer-social-icon">
                <i className="fab fa-discord"></i>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="footer-social-icon">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="footer-social-icon">
                <i className="fab fa-youtube"></i>
              </a>
            </div>

            <div className="footer-legal">
              <Link href="/terms">利用規約</Link>
              <Link href="/privacy">プライバシーポリシー</Link>
              <Link href="/cookie_policy">外部送信ポリシー</Link>
              <Link href="/law">特定商取引法</Link>
            </div>
          </div>

          {/* コピーライト */}
          <div className="footer-copyright">
            © 2025 Studio Asari. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  )
}