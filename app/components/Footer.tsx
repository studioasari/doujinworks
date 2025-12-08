import Link from 'next/link'

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

        .legal-links {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 13px;
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

      <footer style={{
        backgroundColor: '#FFFFFF',
        color: '#6B6B6B',
        marginTop: 'auto',
        borderTop: '1px solid #E5E5E5'
      }}>
        {/* メインコンテンツエリア */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '60px 40px 40px'
        }}>
          <div className="footer-grid">
            {/* サービス情報 */}
            <div>
              <img 
                src="/logotype.png" 
                alt="同人ワークス" 
                style={{ 
                  height: '24px',
                  marginBottom: '16px',
                  display: 'block'
                }} 
              />
              <p style={{ 
                fontSize: '14px', 
                lineHeight: '1.8', 
                color: '#6B6B6B',
                marginBottom: '20px'
              }}>
                同人界隈特化の<br />
                クリエイターマッチングサービス
              </p>
            </div>

            {/* クリエイター向け */}
            <div>
              <h4 style={{ 
                color: '#1A1A1A', 
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
                  <Link href="/creators" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    クリエイターを探す
                  </Link>
                </li>
                <li>
                  <Link href="/portfolio" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    作品を見る
                  </Link>
                </li>
                <li>
                  <Link href="/portfolio/upload" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    作品を投稿
                  </Link>
                </li>
                <li>
                  <Link href="/earnings" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    売上管理
                  </Link>
                </li>
                <li>
                  <Link href="/profile/edit" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    プロフィール編集
                  </Link>
                </li>
              </ul>
            </div>

            {/* 依頼者向け */}
            <div>
              <h4 style={{ 
                color: '#1A1A1A', 
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
                  <Link href="/requests" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    依頼を探す
                  </Link>
                </li>
                <li>
                  <Link href="/requests/create" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    依頼を投稿
                  </Link>
                </li>
                <li>
                  <Link href="/requests/manage" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    依頼管理
                  </Link>
                </li>
                <li>
                  <Link href="/messages" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    メッセージ
                  </Link>
                </li>
              </ul>
            </div>

            {/* サポート */}
            <div>
              <h4 style={{ 
                color: '#1A1A1A', 
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
                  <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    ヘルプセンター
                  </a>
                </li>
                <li>
                  <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    よくある質問
                  </a>
                </li>
                <li>
                  <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    お問い合わせ
                  </a>
                </li>
              </ul>
            </div>

            {/* 会社情報 */}
            <div>
              <h4 style={{ 
                color: '#1A1A1A', 
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
                  <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    運営会社
                  </a>
                </li>
                <li>
                  <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    採用情報
                  </a>
                </li>
                <li>
                  <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    ブログ
                  </a>
                </li>
                <li>
                  <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                    お知らせ
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* SNSアイコン + 法的リンク（画面幅いっぱい） */}
        <div style={{
          borderTop: '1px solid #E5E5E5',
          padding: '20px 0'
        }}>
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '0 40px'
          }}>
            <div className="social-legal-container">
              {/* SNSアイコン */}
              <div className="social-links">
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    color: '#6B6B6B',
                    fontSize: '24px',
                    transition: 'color 0.2s'
                  }}
                >
                  <i className="fab fa-twitter"></i>
                </a>
                <a 
                  href="https://discord.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    color: '#6B6B6B',
                    fontSize: '24px',
                    transition: 'color 0.2s'
                  }}
                >
                  <i className="fab fa-discord"></i>
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    color: '#6B6B6B',
                    fontSize: '24px',
                    transition: 'color 0.2s'
                  }}
                >
                  <i className="fab fa-instagram"></i>
                </a>
                <a 
                  href="https://youtube.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    color: '#6B6B6B',
                    fontSize: '24px',
                    transition: 'color 0.2s'
                  }}
                >
                  <i className="fab fa-youtube"></i>
                </a>
              </div>

              {/* 法的リンク */}
              <div className="legal-links">
                <Link href="/terms" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                  利用規約
                </Link>
                <Link href="/privacy" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                  プライバシーポリシー
                </Link>
                <Link href="/cookie_policy" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                  外部送信ポリシー
                </Link>
                <Link href="/law" style={{ color: '#6B6B6B', transition: 'color 0.2s', textDecoration: 'none' }}>
                  特定商取引法
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 下部：コピーライト */}
        <div style={{
          backgroundColor: '#FAFAFA',
          padding: '20px 40px',
          borderTop: '1px solid #E5E5E5'
        }}>
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            textAlign: 'center',
            fontSize: '13px',
            color: '#6B6B6B'
          }}>
            © 2025 Studio Asari. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  )
}