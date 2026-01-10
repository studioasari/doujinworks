'use client'

import { useState, useEffect, Suspense, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { resendEmailAction } from '@/app/actions/auth'

function VerifyContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResend = async () => {
    if (!email) {
      setError('メールアドレスが見つかりません。新規登録からやり直してください。')
      return
    }

    setError('')
    setMessage('')

    startTransition(async () => {
      const formData = new FormData()
      formData.append('email', email)

      const result = await resendEmailAction(formData)

      if (!result.success) {
        setError(result.error || '再送信に失敗しました')
        return
      }

      setMessage('認証メールを再送信しました。メールボックスをご確認ください。')
      setCountdown(60) // 60秒のクールダウン
    })
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <div className="auth-page">
        <div className="auth-card auth-card-wide" style={{ textAlign: 'center' }}>
          <div className="auth-icon-circle">
            <i className="fas fa-envelope"></i>
          </div>
          
          <h2 className="auth-card-title">認証メールを送信しました</h2>
          
          <p className="auth-description">
            {email ? (
              <>
                <strong>{email}</strong> に認証リンクを送信しました。<br />
              </>
            ) : (
              <>ご登録いただいたメールアドレスに認証リンクを送信しました。<br /></>
            )}
            メール内のリンクをクリックして、登録を完了してください。
          </p>

          {message && (
            <div className="auth-success">
              <i className="fas fa-check-circle"></i>
              {message}
            </div>
          )}

          {error && (
            <div className="auth-error">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <div className="auth-info-box">
            <p className="auth-info-title">メールが届かない場合</p>
            <ul className="auth-info-list">
              <li>迷惑メールフォルダをご確認ください</li>
              <li>メールアドレスが正しいかご確認ください</li>
              <li>数分お待ちいただいてから再度お試しください</li>
            </ul>
          </div>

          {email && (
            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={handleResend}
                disabled={isPending || countdown > 0}
                className="auth-text-btn"
              >
                {countdown > 0 
                  ? `認証メールを再送信（${countdown}秒後に再送信可能）`
                  : isPending 
                  ? '送信中...' 
                  : '認証メールを再送信'}
              </button>
            </div>
          )}

          <div className="auth-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
            <Link href="/login" className="auth-submit-btn active" style={{ textDecoration: 'none' }}>
              ログイン画面に戻る
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', color: '#888888' }}>
          読み込み中...
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}