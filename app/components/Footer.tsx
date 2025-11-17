import Link from 'next/link'

export default function Footer() {
  return (
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px',
          marginBottom: '40px'
        }}>
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
                <Link href="/creators" style={{ color: '#6B6B6B', transition: 'color 0.2s' }}>
                  クリエイター一覧
                </Link>
              </li>
              <li>
                <Link href="/portfolio" style={{ color: '#6B6B6B', transition: 'color 0.2s' }}>
                  ポートフォリオ
                </Link>
              </li>
              <li>
                <Link href="/portfolio/upload" style={{ color: '#6B6B6B', transition: 'color 0.2s' }}>
                  作品をアップロード
                </Link>
              </li>
            </ul>
          </div>

          {/* クライアント向け */}
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
                <Link href="/requests" style={{ color: '#6B6B6B', transition: 'color 0.2s' }}>
                  依頼一覧
                </Link>
              </li>
              <li>
                <Link href="/requests/create" style={{ color: '#6B6B6B', transition: 'color 0.2s' }}>
                  依頼を作成
                </Link>
              </li>
            </ul>
          </div>

          {/* コミュニティ */}
          <div>
            <h4 style={{ 
              color: '#1A1A1A', 
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '16px'
            }}>
              コミュニティ
            </h4>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              fontSize: '14px',
              lineHeight: '2.4'
            }}>
              <li>
                <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s' }}>
                  ブログ
                </a>
              </li>
              <li>
                <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s' }}>
                  Discord
                </a>
              </li>
              <li>
                <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s' }}>
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
          padding: '0 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          {/* SNSアイコン */}
          <div style={{ display: 'flex', gap: '20px' }}>
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
              <i className="fab fa-x-twitter"></i>
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
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            flexWrap: 'wrap',
            fontSize: '13px'
          }}>
            <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s' }}>
              利用規約
            </a>
            <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s' }}>
              プライバシーポリシー
            </a>
            <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s' }}>
              特定商取引法
            </a>
            <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s' }}>
              運営会社
            </a>
            <a href="#" style={{ color: '#6B6B6B', transition: 'color 0.2s' }}>
              お問い合わせ
            </a>
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
  )
}