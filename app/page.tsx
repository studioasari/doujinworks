import Header from './components/Header'
import Footer from './components/Footer'
import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: '#FFFFFF'
    }}>
      <Header />
      
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: '32px',
        padding: '80px 40px',
        maxWidth: '800px',
        margin: '0 auto',
        width: '100%'
      }}>
        <h1 style={{ 
          fontSize: '56px', 
          fontWeight: '700',
          color: '#1A1A1A',
          textAlign: 'center',
          letterSpacing: '-1.5px',
          lineHeight: '1.2'
        }}>
          同人ワークス
        </h1>
        
        <p style={{ 
          fontSize: '20px', 
          color: '#6B6B6B',
          textAlign: 'center',
          lineHeight: '1.8'
        }}>
          クリエイターと依頼者を繋ぐ<br />
          マッチングプラットフォーム
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginTop: '24px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <Link href="/login">
            <button style={{
              padding: '14px 32px',
              fontSize: '16px',
              backgroundColor: '#1A1A1A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '24px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'transform 0.2s',
            }}>
              クリエイター登録
            </button>
          </Link>
          
          <Link href="/login">
            <button style={{
              padding: '14px 32px',
              fontSize: '16px',
              backgroundColor: '#FFFFFF',
              color: '#1A1A1A',
              border: '2px solid #E5E5E5',
              borderRadius: '24px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}>
              依頼を探す
            </button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}