import Link from 'next/link'
import Breadcrumb from './Breadcrumb'

export default function Footer() {
  return (
    <>
      <style jsx>{`
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
          gap: 60px;
          margin-bottom: 40px;
        }

        .footer-main-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 60px 20px 40px;
        }

        .footer-social-legal-section {
          border-top: 1px solid #D0D5DA;
          padding: 20px 0;
        }

        .footer-social-legal-wrapper {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .footer-copyright {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px 20px;
          text-align: center;
          font-size: 13px;
          color: #555555;
        }

        .social-legal-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .social-links {
          display: flex;
          gap: 20px;
        }

        .social-links a {
          color: #555555;
          font-size: 24px;
          transition: color 0.2s;
        }

        .social-links a:hover {
          color: #5B7C99;
        }

        .legal-links {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 13px;
        }

        .legal-links a {
          color: #555555;
          text-decoration: none;
          transition: color 0.2s;
        }

        .legal-links a:hover {
          color: #222222;
        }

        .footer-link {
          color: #555555;
          text-decoration: none;
          transition: color 0.2s;
        }

        .footer-link:hover {
          color: #222222;
        }

        /* タブレット（768px～1024px） */
        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1.5fr 1fr 1fr;
            gap: 40px;
          }
        }

        /* スマホ（～768px） */
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }

          .footer-main-content {
            padding: 52px 16px 12px;
          }

          .footer-social-legal-section {
            padding: 52px 0;
          }

          .footer-social-legal-wrapper {
            padding: 0 16px;
          }

          .footer-copyright {
            padding: 20px 16px;
          }

          .social-legal-container {
            flex-direction: column;
            align-items: flex-start;
            gap: 24px;
          }

          .legal-links {
            gap: 16px;
          }
        }

        /* 小さいスマホ（～480px） */
        @media (max-width: 480px) {
          .social-links {
            gap: 16px;
          }

          .legal-links {
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>

      <Breadcrumb />

      <footer style={{
        backgroundColor: '#FFFFFF',
        color: '#555555',
        marginTop: 'auto',
        borderTop: '1px solid #D0D5DA'
      }}>
        {/* メインコンテンツエリア */}
        <div className="footer-main-content">
          <div className="footer-grid">
            {/* サービス情報 */}
            <div>
              <img 
                src="/logotype.png" 
                alt="同人ワークス" 
                style={{ 
                  height: '20px',
                  marginBottom: '16px',
                  display: 'block'
                }} 
              />
              <p style={{ 
                fontSize: '14px', 
                lineHeight: '1.8', 
                color: '#555555',
                marginBottom: '20px'
              }}>
                同人界隈特化の<br />
                クリエイターマッチングサービス
              </p>
            </div>

            {/* クリエイター向け */}
            <div>
              <h4 style={{ 
                color: '#222222', 
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                クリエイター
              </h4>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                fontSize: '14px',
                lineHeight: '2.4'
              }}>
                <li>
                  <Link href="/creators" className="footer-link">
                    クリエイターを探す
                  </Link>
                </li>
                <li>
                  <Link href="/portfolio" className="footer-link">
                    作品を見る
                  </Link>
                </li>
                <li>
                  <Link href="/portfolio/upload" className="footer-link">
                    作品を投稿
                  </Link>
                </li>
                <li>
                  <Link href="/earnings" className="footer-link">
                    売上管理
                  </Link>
                </li>
                <li>
                  <Link href="/profile/edit" className="footer-link">
                    プロフィール編集
                  </Link>
                </li>
              </ul>
            </div>

            {/* 依頼者向け */}
            <div>
              <h4 style={{ 
                color: '#222222', 
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                依頼
              </h4>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                fontSize: '14px',
                lineHeight: '2.4'
              }}>
                <li>
                  <Link href="/requests" className="footer-link">
                    依頼を探す
                  </Link>
                </li>
                <li>
                  <Link href="/requests/create" className="footer-link">
                    依頼を投稿
                  </Link>
                </li>
                <li>
                  <Link href="/requests/manage" className="footer-link">
                    依頼管理
                  </Link>
                </li>
                <li>
                  <Link href="/messages" className="footer-link">
                    メッセージ
                  </Link>
                </li>
              </ul>
            </div>

            {/* サポート */}
            <div>
              <h4 style={{ 
                color: '#222222', 
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                サポート
              </h4>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                fontSize: '14px',
                lineHeight: '2.4'
              }}>
                <li>
                  <a href="#" className="footer-link">
                    ヘルプセンター
                  </a>
                </li>
                <li>
                  <a href="#" className="footer-link">
                    よくある質問
                  </a>
                </li>
                <li>
                  <a href="#" className="footer-link">
                    お問い合わせ
                  </a>
                </li>
              </ul>
            </div>

            {/* 会社情報 */}
            <div>
              <h4 style={{ 
                color: '#222222', 
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                会社情報
              </h4>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                fontSize: '14px',
                lineHeight: '2.4'
              }}>
                <li>
                  <a href="#" className="footer-link">
                    運営会社
                  </a>
                </li>
                <li>
                  <a href="#" className="footer-link">
                    採用情報
                  </a>
                </li>
                <li>
                  <a href="#" className="footer-link">
                    ブログ
                  </a>
                </li>
                <li>
                  <a href="#" className="footer-link">
                    お知らせ
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* SNSアイコン + 法的リンク */}
        <div className="footer-social-legal-section">
          <div className="footer-social-legal-wrapper">
            <div className="social-legal-container">
              {/* SNSアイコン */}
              <div className="social-links">
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                >
                  <i className="fab fa-twitter"></i>
                </a>
                <a 
                  href="https://discord.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Discord"
                >
                  <i className="fab fa-discord"></i>
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <i className="fab fa-instagram"></i>
                </a>
                <a 
                  href="https://youtube.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                >
                  <i className="fab fa-youtube"></i>
                </a>
              </div>

              {/* 法的リンク */}
              <div className="legal-links">
                <Link href="/terms">
                  利用規約
                </Link>
                <Link href="/privacy">
                  プライバシーポリシー
                </Link>
                <Link href="/cookie_policy">
                  外部送信ポリシー
                </Link>
                <Link href="/law">
                  特定商取引法
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 下部：コピーライト */}
        <div style={{
          backgroundColor: '#F5F6F8',
          borderTop: '1px solid #D0D5DA'
        }}>
          <div className="footer-copyright">
            © 2025 Studio Asari. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  )
}