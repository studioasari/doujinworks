'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function VerifyPage() {
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
      const tempPassword = crypto.randomUUID()
      
      const { error } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          emailRedirectTo: 'https://www.dojinworks.com/signup/complete',
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
    <div className="container-narrow" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px', color: '#1A1A1A' }}>
          <i className="fas fa-envelope"></i>
        </div>
        
        <h1 className="page-title" style={{ marginBottom: '16px' }}>
          認証メールを送信しました
        </h1>
        
        <p className="text-gray" style={{ marginBottom: '32px', lineHeight: '1.6' }}>
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
          <div style={{
            padding: '12px 16px',
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
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#FFF5F5',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            marginBottom: '24px',
            color: '#7F1D1D',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div className="info-box" style={{ marginBottom: '24px', textAlign: 'left' }}>
          <p style={{ marginBottom: '8px', fontWeight: '600' }}>メールが届かない場合</p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
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
              className="text-small"
              style={{
                background: 'none',
                border: 'none',
                color: (loading || countdown > 0) ? '#6B6B6B' : '#1A1A1A',
                textDecoration: 'underline',
                cursor: (loading || countdown > 0) ? 'not-allowed' : 'pointer',
                padding: 0
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

        <Link href="/login" className="btn-secondary">
          ログイン画面に戻る
        </Link>
      </div>
    </div>
  )
}