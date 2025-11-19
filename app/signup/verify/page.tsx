import Link from 'next/link'

export default function VerifyPage() {
  return (
    <div className="container-narrow" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px', color: '#1A1A1A' }}>
          <i className="fas fa-envelope"></i>
        </div>
        
        <h1 className="page-title" style={{ marginBottom: '16px' }}>
          認証メールを送信しました
        </h1>
        
        <p className="text-gray" style={{ marginBottom: '32px', lineHeight: '1.6' }}>
          ご登録いただいたメールアドレスに認証リンクを送信しました。<br />
          メール内のリンクをクリックして、登録を完了してください。
        </p>

        <div className="info-box" style={{ marginBottom: '32px', textAlign: 'left' }}>
          <p style={{ marginBottom: '8px', fontWeight: '600' }}>メールが届かない場合</p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
            <li>迷惑メールフォルダをご確認ください</li>
            <li>メールアドレスが正しいかご確認ください</li>
            <li>数分お待ちいただいてから再度お試しください</li>
          </ul>
        </div>

        <Link href="/login" className="btn-secondary">
          ログイン画面に戻る
        </Link>
      </div>
    </div>
  )
}