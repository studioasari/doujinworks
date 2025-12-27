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

  // 👇 URLパラメータからエラーメッセージを表示
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

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'x' as any,
          options: {
            queryParams: {
              // 💡 offline.access を含め、余計なものを送らない最小構成です
              scope: 'users.read tweet.read offline.access',
            },
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
    <div style={{ 
      width: '100%', 
      maxWidth: '400px',
      border: '1px solid #D0D5DA',
      borderRadius: '8px',
      padding: '40px',
      backgroundColor: '#FFFFFF'
    }}>
      <h2 className="page-title" style={{ 
        marginBottom: '40px', 
        textAlign: 'center',
        fontSize: '24px',
        color: '#222222'
      }}>
        ログイン
      </h2>

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label" style={{ color: '#222222' }}>
            メールアドレスまたはユーザーID
          </label>
          <input
            type="text"
            name="emailOrUsername"
            className="input-field"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            placeholder="メール or ユーザーID"
            required
            disabled={isLocked || isPending}
            style={{
              borderColor: '#D0D5DA',
              color: '#222222',
              opacity: (isLocked || isPending) ? 0.6 : 1,
              cursor: (isLocked || isPending) ? 'not-allowed' : 'text'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '8px' 
          }}>
            <label className="form-label" style={{ marginBottom: 0, color: '#222222' }}>
              パスワード
            </label>
            <Link href="/reset-password" style={{ 
              color: '#5B7C99', 
              fontSize: '13px',
              textDecoration: 'none'
            }}>
              パスワードを忘れた
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
              required
              minLength={6}
              disabled={isLocked || isPending}
              style={{
                width: '100%',
                paddingRight: '40px',
                borderColor: '#D0D5DA',
                color: '#222222',
                opacity: (isLocked || isPending) ? 0.6 : 1,
                cursor: (isLocked || isPending) ? 'not-allowed' : 'text'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLocked || isPending}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: (isLocked || isPending) ? 'not-allowed' : 'pointer',
                color: '#888888',
                fontSize: '14px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (isLocked || isPending) ? 0.6 : 1
              }}
              onMouseEnter={(e) => !(isLocked || isPending) && (e.currentTarget.style.color = '#555555')}
              onMouseLeave={(e) => e.currentTarget.style.color = '#888888'}
            >
              <i className={showPassword ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
            </button>
          </div>
        </div>

        {resendSuccess && (
          <div className="alert alert-success" style={{ 
            marginBottom: '16px', 
            fontSize: '14px'
          }}>
            認証メールを再送信しました。メールボックスをご確認ください。
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ 
            marginBottom: '16px', 
            fontSize: '14px'
          }}>
            {error}
            {isEmailUnconfirmed && (
              <div style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className="btn-secondary btn-small"
                  style={{
                    width: '100%',
                    borderColor: '#C05656',
                    color: '#C05656',
                    opacity: isResending ? 0.6 : 1,
                    cursor: isResending ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isResending ? '送信中...' : '認証メールを再送信'}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={isPending || !isFormValid}
          style={{ 
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: (isFormValid && !isPending) ? '#5B7C99' : '#D0D5DA',
            color: (isFormValid && !isPending) ? '#FFFFFF' : '#888888',
            border: 'none',
            cursor: (isFormValid && !isPending) ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          {isPending ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>

      {/* グレーの線 */}
      <div style={{
        width: '100%',
        height: '1px',
        backgroundColor: '#D0D5DA',
        margin: '32px 0'
      }}></div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        marginBottom: '32px'
      }}>
        <button
          className="btn-secondary"
          onClick={() => handleSocialLogin('google')}
          disabled={isPending}
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            opacity: isPending ? 0.6 : 1,
            cursor: isPending ? 'not-allowed' : 'pointer'
          }}
        >
          <img src="/icons/google.svg" alt="Google" width={20} height={20} />
          Googleでログイン
        </button>
        <button
          className="btn-secondary"
          onClick={() => handleSocialLogin('x')}
          disabled={isPending}
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            opacity: isPending ? 0.6 : 1,
            cursor: isPending ? 'not-allowed' : 'pointer'
          }}
        >
          <img src="/icons/x.svg" alt="X" width={20} height={20} />
          Xでログイン
        </button>
        {/* <button
          className="btn-secondary"
          onClick={() => handleSocialLogin('discord')}
          disabled={isPending}
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            opacity: isPending ? 0.6 : 1,
            cursor: isPending ? 'not-allowed' : 'pointer'
          }}
        >
          <i className="fab fa-discord" style={{ color: '#5865F2' }}></i>
          Discordでログイン
        </button> */}
      </div>

      {/* グレーの線 */}
      <div style={{
        width: '100%',
        height: '1px',
        backgroundColor: '#D0D5DA',
        margin: '32px 0'
      }}></div>

      <div style={{ textAlign: 'center' }}>
        <Link href="/signup" style={{ 
          color: '#5B7C99', 
          textDecoration: 'underline',
          fontSize: '14px'
        }}>
          新規登録はこちら
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
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
      <Suspense fallback={
        <div style={{ 
          width: '100%', 
          maxWidth: '400px',
          border: '1px solid #D0D5DA',
          borderRadius: '8px',
          padding: '40px',
          backgroundColor: '#FFFFFF',
          textAlign: 'center',
          color: '#888888'
        }}>
          読み込み中...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}