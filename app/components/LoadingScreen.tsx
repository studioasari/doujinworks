import Header from './Header'
import Footer from './Footer'

export default function LoadingScreen({ message = '読み込み中...' }: { message?: string }) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: '#FFFFFF'
    }}>
      <Header />
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'center',
            marginBottom: '32px',
            height: '60px',
            alignItems: 'center'
          }}>
            {[0, 1, 2, 3].map((i) => (  // ← 3から4に変更
              <div
                key={i}
                style={{
                  width: '6px',
                  height: '50px',
                  backgroundColor: '#1A1A1A',
                  transform: 'skewX(-20deg)',
                  animation: 'slideUp 1.2s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`
                }}
              ></div>
            ))}
          </div>
          <p style={{ 
            color: '#9B9B9B',
            fontSize: '13px',
            fontWeight: '400',
            letterSpacing: '0.3px'
          }}>
            {message}
          </p>
        </div>
      </div>
      <Footer />
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideUp {
            0%, 100% { 
              transform: skewX(-20deg) scaleY(0.3);
              opacity: 0.3;
            }
            50% { 
              transform: skewX(-20deg) scaleY(1);
              opacity: 1;
            }
          }
        `
      }} />
    </div>
  )
}