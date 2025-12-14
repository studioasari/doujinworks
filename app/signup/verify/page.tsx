'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function VerifyContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)

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

    setLoading(true)
    setError('')
    setMessage('')

    try {
      // ランダムな仮パスワードを生成
      const tempPassword = Math.random().toString(36).slice(-12) + Date.now().toString(36)
      
      const { error } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/signup/complete`,
          data: {
            registration_step: 'email_confirmed',
          }
        },
      })

      if (error) throw error

      setMessage('認証メールを再送信しました。メールボックスをご確認ください。')
      setCountdown(60) // 60秒のクールダウン
    } catch (error: any) {
      setError(error.message || '再送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '40px 20px'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '500px',
        border: '1px solid #E5E5E5',
        borderRadius: '8px',
        padding: '40px',
        backgroundColor: '#FFFFFF',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#FAFAFA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '32px',
          color: '#1A1A1A'
        }}>
          <i className="fas fa-envelope"></i>
        </div>
        
        <h2 className="page-title" style={{ 
          marginBottom: '16px',
          fontSize: '24px'
        }}>
          認証メールを送信しました
        </h2>
        
        <p style={{ 
          marginBottom: '32px',
          fontSize: '14px',
          color: '#6B6B6B',
          lineHeight: '1.6'
        }}>
          {email ? (
            <>
              <strong style={{ color: '#1A1A1A' }}>{email}</strong> に認証リンクを送信しました。<br />
            </>
          ) : (
            <>ご登録いただいたメールアドレスに認証リンクを送信しました。<br /></>
          )}
          メール内のリンクをクリックして、登録を完了してください。
        </p>

        {message && (
          <div style={{
            padding: '12px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: '8px',
            marginBottom: '24px',
            color: '#166534',
            fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        {error && (
          <div className="info-box" style={{ 
            marginBottom: '24px', 
            padding: '12px', 
            backgroundColor: '#FEE', 
            color: '#C33',
            border: '1px solid #FCC',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{ 
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#FAFAFA',
          borderRadius: '8px',
          textAlign: 'left'
        }}>
          <p style={{ marginBottom: '12px', fontWeight: '600', fontSize: '14px', color: '#1A1A1A' }}>
            メールが届かない場合
          </p>
          <ul style={{ 
            marginLeft: '20px', 
            fontSize: '14px',
            color: '#6B6B6B',
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
              disabled={loading || countdown > 0}
              style={{
                background: 'none',
                border: 'none',
                color: (loading || countdown > 0) ? '#6B6B6B' : '#1A1A1A',
                textDecoration: 'underline',
                cursor: (loading || countdown > 0) ? 'not-allowed' : 'pointer',
                padding: 0,
                fontSize: '14px'
              }}
            >
              {countdown > 0 
                ? `認証メールを再送信（${countdown}秒後に再送信可能）`
                : loading 
                ? '送信中...' 
                : '認証メールを再送信'}
            </button>
          </div>
        )}

        {/* グレーの線 */}
        <div style={{
          width: '100%',
          height: '1px',
          backgroundColor: '#E5E5E5',
          margin: '32px 0'
        }}></div>

        <Link href="/login" className="btn-primary" style={{
          display: 'inline-block',
          width: '100%',
          textAlign: 'center'
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
        padding: '40px 20px'
      }}>
        <div style={{ textAlign: 'center', color: '#6B6B6B' }}>読み込み中...</div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}