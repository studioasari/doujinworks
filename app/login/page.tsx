'use client'

import { Suspense, useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loginAction, resendEmailAction } from '@/app/actions/auth'
import { createClient } from '../../utils/supabase/client'

function LoginForm() {
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isEmailUnconfirmed, setIsEmailUnconfirmed] = useState(false)
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('')
  const [resendSuccess, setResendSuccess] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isResending, startResendTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // リダイレクト先を取得（デフォルトはダッシュボード）
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  // URLパラメータからエラーメッセージを表示
  useEffect(() => {
    const urlError = searchParams.get('error')
    
    if (urlError) {
      const errorMessages: Record<string, string> = {
        'auth_failed': '認証に失敗しました。もう一度お試しください。',
        'token_expired': '認証リンクの有効期限が切れているか、既に使用済みです。既にログイン済みの場合はそのままご利用ください。',
        'no_session': 'セッションの確立に失敗しました。もう一度お試しください。',
      }
      
      setError(errorMessages[urlError] || '予期しないエラーが発生しました。')
    }
  }, [searchParams])

  // 全ての条件が満たされているかチェック
  const isFormValid = emailOrUsername && password && password.length >= 8 && !isLocked

  // ログイン処理
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsEmailUnconfirmed(false)
    setResendSuccess(false)

    startTransition(async () => {
      const formData = new FormData()
      formData.append('emailOrUsername', emailOrUsername)
      formData.append('password', password)

      const result = await loginAction(formData)

      if (!result.success) {
        setError(result.error || 'ログインに失敗しました')
        setIsLocked(result.locked || false)
        
        if (result.isEmailUnconfirmed) {
          setIsEmailUnconfirmed(true)
          setUnconfirmedEmail(result.unconfirmedEmail || '')
        }
        return
      }

      // ログイン成功
      if (result.needsProfile) {
        router.push('/signup/complete')
      } else {
        // 特定のページから来た場合はダッシュボードへ
        const noRedirectPages = ['/login', '/signup', '/reset-password', '/reset-password/update']
        
        if (noRedirectPages.includes(redirectTo)) {
          router.push('/dashboard')
        } else {
          router.push(redirectTo)
        }
      }
    })
  }

  // 認証メール再送
  const handleResendEmail = async () => {
    setError('')
    setResendSuccess(false)

    startResendTransition(async () => {
      const formData = new FormData()
      formData.append('email', unconfirmedEmail)

      const result = await resendEmailAction(formData)

      if (!result.success) {
        setError(`再送信に失敗しました: ${result.error}`)
        return
      }

      setResendSuccess(true)
      setError('')
    })
  }

  // ソーシャルログイン
  const handleSocialLogin = async (provider: 'google' | 'x' | 'discord') => {
    setError('')

    startTransition(async () => {
      try {
        const supabase = createClient()

        // providerに応じて適切なプロバイダーを使用
        const oauthProvider = provider === 'x' ? 'twitter' : provider

        const { error } = await supabase.auth.signInWithOAuth({
          provider: oauthProvider, 
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            skipBrowserRedirect: false,
          },
        })

        if (error) throw error
      } catch (error: any) {
        setError(error.message || 'ログインに失敗しました')
      }
    })
  }

  return (
    <div className="auth-card">
      <h2 className="auth-card-title">ログイン</h2>

      <form onSubmit={handleLogin}>
        {/* メールアドレスまたはユーザーID */}
        <div className="auth-form-group">
          <label className="auth-label">メールアドレスまたはユーザーID</label>
          <div className="auth-input-wrapper">
            <input
              type="text"
              name="emailOrUsername"
              className="auth-input"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="メール or ユーザーID"
              required
              disabled={isLocked || isPending}
            />
          </div>
        </div>

        {/* パスワード */}
        <div className="auth-form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="auth-label" style={{ marginBottom: 0 }}>パスワード</label>
            <Link href="/reset-password" className="auth-link" style={{ fontSize: '13px' }}>
              パスワードを忘れた
            </Link>
          </div>
          <div className="auth-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              className="auth-input has-icon"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
              required
              minLength={6}
              disabled={isLocked || isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLocked || isPending}
              className="auth-password-toggle"
            >
              <i className={showPassword ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
            </button>
          </div>
        </div>

        {/* 成功メッセージ */}
        {resendSuccess && (
          <div className="auth-success" style={{ marginBottom: '16px' }}>
            <i className="fas fa-check-circle"></i>
            認証メールを再送信しました。メールボックスをご確認ください。
          </div>
        )}

        {/* エラーメッセージ */}
        {error && (
          <div className="auth-error">
            <i className="fas fa-exclamation-circle"></i>
            <div style={{ flex: 1 }}>
              {error}
              {isEmailUnconfirmed && (
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className="auth-resend-btn"
                >
                  {isResending ? '送信中...' : '認証メールを再送信'}
                </button>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !isFormValid}
          className={`auth-submit-btn ${isFormValid && !isPending ? 'active' : 'disabled'}`}
        >
          {isPending ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>

      <div className="auth-divider">
        <div className="auth-divider-line"></div>
        <span className="auth-divider-text">または</span>
        <div className="auth-divider-line"></div>
      </div>

      <div className="auth-social-buttons">
        <button
          onClick={() => handleSocialLogin('google')}
          disabled={isPending}
          className="auth-social-btn"
        >
          <img src="/icons/google.svg" alt="Google" />
          Googleでログイン
        </button>
        <button
          onClick={() => handleSocialLogin('x')}
          disabled={isPending}
          className="auth-social-btn"
        >
          <img src="/icons/x.svg" alt="X" />
          Xでログイン
        </button>
        {/* <button
          onClick={() => handleSocialLogin('discord')}
          disabled={isPending}
          className="auth-social-btn"
        >
          <i className="fab fa-discord" style={{ color: '#5865F2', fontSize: '20px' }}></i>
          Discordでログイン
        </button> */}
      </div>

      <div className="auth-footer">
        <Link href="/signup" className="auth-footer-link">
          新規登録はこちら
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <div className="auth-page">
        <Suspense fallback={
          <div className="auth-card" style={{ textAlign: 'center', color: '#888888' }}>
            読み込み中...
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </>
  )
}