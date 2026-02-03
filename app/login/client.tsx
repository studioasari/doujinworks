'use client'

import { Suspense, useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loginAction, resendEmailAction } from '@/app/actions/auth'
import { createClient } from '../../utils/supabase/client'
import styles from './page.module.css'

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
    <div className={styles.cardArea}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>aaログイン</h2>

        <form onSubmit={handleLogin}>
          {/* メールアドレスまたはユーザーID */}
          <div className={styles.formGroup}>
            <label className="form-label">メールアドレスまたはユーザーID</label>
            <input
              type="text"
              name="emailOrUsername"
              className="form-input"
              style={{ maxWidth: '100%' }}
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="メール or ユーザーID"
              required
              disabled={isLocked || isPending}
            />
          </div>

          {/* パスワード */}
          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label className="form-label" style={{ marginBottom: 0 }}>パスワード</label>
              <Link href="/reset-password" className="link-subtle" style={{ fontSize: 'var(--text-xs)' }}>
                パスワードを忘れた
              </Link>
            </div>
            <div className={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input"
                style={{ maxWidth: '100%', paddingRight: '48px' }}
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
                className={styles.passwordToggle}
              >
                <i className={showPassword ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
              </button>
            </div>
          </div>

          {/* 成功メッセージ */}
          {resendSuccess && (
            <div className="alert alert-success" style={{ marginBottom: 'var(--space-5)' }}>
              <i className="fa-solid fa-circle-check alert-icon"></i>
              認証メールを再送信しました。メールボックスをご確認ください。
            </div>
          )}

          {/* エラーメッセージ */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>
              <i className="fa-solid fa-circle-xmark alert-icon"></i>
              <div style={{ flex: 1 }}>
                {error}
                {isEmailUnconfirmed && (
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={isResending}
                    className={styles.resendBtn}
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
            className={`btn btn-primary ${styles.submitBtn}`}
          >
            {isPending ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className={styles.divider}>
          <div className={styles.dividerLine}></div>
          <span className={styles.dividerText}>または</span>
          <div className={styles.dividerLine}></div>
        </div>

        <div className={styles.socialButtons}>
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={isPending}
            className={styles.socialBtn}
          >
            <img src="/icons/google.svg" alt="Google" />
            Googleでログイン
          </button>
          <button
            onClick={() => handleSocialLogin('x')}
            disabled={isPending}
            className={styles.socialBtn}
          >
            <img src="/icons/x.svg" alt="X" />
            Xでログイン
          </button>
          {/* <button
            onClick={() => handleSocialLogin('discord')}
            disabled={isPending}
            className={styles.socialBtn}
          >
            <i className="fab fa-discord" style={{ color: '#5865F2', fontSize: '20px' }}></i>
            Discordでログイン
          </button> */}
        </div>

        <div className={styles.footer}>
          <Link href="/signup" className="link">
            新規登録はこちら
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginClient() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* 左側：ロゴ */}
        <div className={styles.logoArea}>
          <img src="/logotype.png" alt="同人ワークス" className={styles.logo} />
        </div>

        {/* 右側：フォーム */}
        <Suspense fallback={
          <div className={styles.cardArea}>
            <div className={styles.card} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
              読み込み中...
            </div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}