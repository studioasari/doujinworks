export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#FFFFFF',
      borderTop: '1px solid #E5E5E5',
      padding: '60px 40px 40px',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '60px',
        color: '#6B6B6B'
      }}>
        {/* 左側：サービス情報 */}
        <div>
          <h3 style={{ 
            color: '#1A1A1A', 
            fontSize: '16px',
            fontWeight: '700',
            marginBottom: '16px',
            letterSpacing: '-0.3px'
          }}>
            同人ワークス
          </h3>
          <p style={{ fontSize: '14px', lineHeight: '1.8', color: '#6B6B6B' }}>
            クリエイターと依頼者を繋ぐ<br />
            マッチングプラットフォーム
          </p>
        </div>

        {/* 中央：リンク */}
        <div>
          <h4 style={{ 
            color: '#1A1A1A', 
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            サービス
          </h4>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            fontSize: '14px',
            lineHeight: '2.2'
          }}>
            <li><a href="#" style={{ color: '#6B6B6B' }}>クリエイターを探す</a></li>
            <li><a href="#" style={{ color: '#6B6B6B' }}>依頼を探す</a></li>
            <li><a href="#" style={{ color: '#6B6B6B' }}>使い方</a></li>
          </ul>
        </div>

        {/* 右側：会社情報 */}
        <div>
          <h4 style={{ 
            color: '#1A1A1A', 
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            運営
          </h4>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            fontSize: '14px',
            lineHeight: '2.2'
          }}>
            <li><a href="#" style={{ color: '#6B6B6B' }}>運営会社</a></li>
            <li><a href="#" style={{ color: '#6B6B6B' }}>利用規約</a></li>
            <li><a href="#" style={{ color: '#6B6B6B' }}>プライバシーポリシー</a></li>
            <li><a href="#" style={{ color: '#6B6B6B' }}>お問い合わせ</a></li>
          </ul>
        </div>
      </div>

      {/* コピーライト */}
      <div style={{
        textAlign: 'center',
        marginTop: '60px',
        paddingTop: '24px',
        borderTop: '1px solid #E5E5E5',
        color: '#6B6B6B',
        fontSize: '13px'
      }}>
        © 2025 Studio Asari. All rights reserved.
      </div>
    </footer>
  )
}