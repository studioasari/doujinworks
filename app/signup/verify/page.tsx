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
    <div style={{ 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '40px 20px',
      backgroundColor: '#F5F6F8'
    }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      <div style={{ 
        width: '100%', 
        maxWidth: '500px',
        border: '1px solid #D0D5DA',
        borderRadius: '8px',
        padding: '40px',
        backgroundColor: '#FFFFFF',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#EEF0F3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '32px',
          color: '#5B7C99'
        }}>
          <i className="fas fa-envelope"></i>
        </div>
        
        <h2 className="page-title" style={{ 
          marginBottom: '16px',
          fontSize: '24px',
          color: '#222222'
        }}>
          認証メールを送信しました
        </h2>
        
        <p style={{ 
          marginBottom: '32px',
          fontSize: '14px',
          color: '#555555',
          lineHeight: '1.6'
        }}>
          {email ? (
            <>
              <strong style={{ color: '#222222' }}>{email}</strong> に認証リンクを送信しました。<br />
            </>
          ) : (
            <>ご登録いただいたメールアドレスに認証リンクを送信しました。<br /></>
          )}
          メール内のリンクをクリックして、登録を完了してください。
        </p>

        {message && (
          <div className="alert alert-success" style={{
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ 
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{ 
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#EEF0F3',
          borderRadius: '8px',
          textAlign: 'left'
        }}>
          <p style={{ marginBottom: '12px', fontWeight: '600', fontSize: '14px', color: '#222222' }}>
            メールが届かない場合
          </p>
          <ul style={{ 
            marginLeft: '20px', 
            fontSize: '14px',
            color: '#555555',
            lineHeight: '1.8'
          }}>
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
              style={{
                background: 'none',
                border: 'none',
                color: (isPending || countdown > 0) ? '#888888' : '#5B7C99',
                textDecoration: 'underline',
                cursor: (isPending || countdown > 0) ? 'not-allowed' : 'pointer',
                padding: 0,
                fontSize: '14px'
              }}
            >
              {countdown > 0 
                ? `認証メールを再送信（${countdown}秒後に再送信可能）`
                : isPending 
                ? '送信中...' 
                : '認証メールを再送信'}
            </button>
          </div>
        )}

        {/* グレーの線 */}
        <div style={{
          width: '100%',
          height: '1px',
          backgroundColor: '#D0D5DA',
          margin: '32px 0'
        }}></div>

        <Link href="/login" className="btn-primary" style={{
          display: 'inline-block',
          width: '100%',
          textAlign: 'center',
          color: '#FFFFFF'
        }}>
          ログイン画面に戻る
        </Link>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '40px 20px',
        backgroundColor: '#F5F6F8'
      }}>
        <div style={{ textAlign: 'center', color: '#888888' }}>読み込み中...</div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}