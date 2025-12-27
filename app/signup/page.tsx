'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signupAction } from '@/app/actions/auth'
import { createClient } from '../../utils/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // パスワードバリデーション関数
  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'パスワードは8文字以上で入力してください'
    }
    if (!/[a-z]/.test(password)) {
      return 'パスワードには小文字を含めてください'
    }
    if (!/[0-9]/.test(password)) {
      return 'パスワードには数字を含めてください'
    }
    return ''
  }

  // 全ての条件が満たされているかチェック
  const isFormValid = email && 
                      password && 
                      passwordConfirm && 
                      password === passwordConfirm && 
                      password.length >= 8 &&
                      /[a-z]/.test(password) &&
                      /[0-9]/.test(password) &&
                      agreedToTerms

  const handleEmailSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    // パスワード確認
    if (password !== passwordConfirm) {
      setError('パスワードが一致しません')
      return
    }

    // パスワードバリデーション
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    // 利用規約同意チェック
    if (!agreedToTerms) {
      setError('利用規約とプライバシーポリシーに同意してください')
      return
    }

    // Server Action を使用
    startTransition(async () => {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)

      const result = await signupAction(formData)

      if (!result.success) {
        setError(result.error || '登録に失敗しました')
        return
      }

      // 成功したら認証メール確認画面へ
      router.push(`/signup/verify?email=${encodeURIComponent(email)}`)
    })
  }

  const handleSocialSignup = async (provider: 'google' | 'twitter' | 'discord') => {
    setError('')

    startTransition(async () => {
      try {
        const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
        
        const supabase = createClient()
        
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUrl,
          },
        })

        if (error) throw error
      } catch (error: any) {
        setError(error.message || '登録に失敗しました')
      }
    })
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <div className="signup-container">
        <div className="signup-wrapper">
          <div className="welcome-text">
            <h1 style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#222222',
              marginBottom: '32px',
              lineHeight: 1.3,
              whiteSpace: 'nowrap'
            }}>
              同人ワークスへようこそ！
            </h1>
            <p style={{
              fontSize: '18px',
              color: '#555555',
              lineHeight: 1.8,
              marginBottom: '24px'
            }}>
              同人ワークスは、創作する人も、それを楽しむ人も、"好き"を気軽に持ち寄れる街のような場所です。   
            </p>
            <p style={{
              fontSize: '18px',
              color: '#555555',
              lineHeight: 1.8,
              marginBottom: '24px'
            }}>
              好みのクリエイターや作品に出会ったり、自分の表現を発信したりして楽しめます。
            </p>
            <p style={{
              fontSize: '18px',
              color: '#555555',
              lineHeight: 1.8
            }}>
              ここでのつながりが、あなたの創作や活動をもっと広げるきっかけになりますように。
            </p>
          </div>

          <div className="form-wrapper">
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
                新規会員登録
              </h2>

              <form onSubmit={handleEmailSignup} style={{ marginBottom: '32px' }}>
                {/* メールアドレス */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#555555',
                    marginBottom: '6px'
                  }}>
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    name="email"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    disabled={isPending}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #D0D5DA',
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      color: '#222222',
                      backgroundColor: '#FFFFFF',
                      opacity: isPending ? 0.6 : 1
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#5B7C99'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#D0D5DA'}
                  />
                </div>

                {/* パスワード */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#555555',
                    marginBottom: '6px'
                  }}>
                    パスワード <span style={{ color: '#888888', fontSize: '12px', fontWeight: '400' }}>（8文字以上、小文字・数字を含む）</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      className="input-field"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="password123"
                      required
                      minLength={8}
                      disabled={isPending}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        paddingRight: '40px',
                        fontSize: '14px',
                        border: `1px solid ${passwordTouched && password && validatePassword(password) ? '#C05656' : '#D0D5DA'}`,
                        borderRadius: '8px',
                        outline: 'none',
                        transition: 'border-color 0.15s',
                        color: '#222222',
                        backgroundColor: '#FFFFFF',
                        opacity: isPending ? 0.6 : 1
                      }}
                      onFocus={(e) => {
                        if (!(passwordTouched && password && validatePassword(password))) {
                          e.currentTarget.style.borderColor = '#5B7C99'
                        }
                      }}
                      onBlur={(e) => {
                        setPasswordTouched(true)
                        if (!(password && validatePassword(password))) {
                          e.currentTarget.style.borderColor = '#D0D5DA'
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isPending}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        color: '#888888',
                        fontSize: '14px',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isPending ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => !isPending && (e.currentTarget.style.color = '#555555')}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#888888'}
                    >
                      <i className={showPassword ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
                    </button>
                  </div>
                  {passwordTouched && password && validatePassword(password) && (
                    <div style={{ marginTop: '6px', fontSize: '13px', color: '#C05656', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fas fa-times-circle"></i>
                      {validatePassword(password)}
                    </div>
                  )}
                </div>

                {/* パスワード（確認） */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#555555',
                    marginBottom: '6px'
                  }}>
                    パスワード（確認）
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswordConfirm ? 'text' : 'password'}
                      className="input-field"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="もう一度入力"
                      required
                      minLength={8}
                      disabled={isPending}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        paddingRight: passwordConfirm && password === passwordConfirm ? '70px' : '40px',
                        fontSize: '14px',
                        border: `1px solid ${passwordConfirmTouched && passwordConfirm && password !== passwordConfirm ? '#C05656' : '#D0D5DA'}`,
                        borderRadius: '8px',
                        outline: 'none',
                        transition: 'border-color 0.15s, padding-right 0.15s',
                        color: '#222222',
                        backgroundColor: '#FFFFFF',
                        opacity: isPending ? 0.6 : 1
                      }}
                      onFocus={(e) => {
                        if (!(passwordConfirmTouched && passwordConfirm && password !== passwordConfirm)) {
                          e.currentTarget.style.borderColor = '#5B7C99'
                        }
                      }}
                      onBlur={(e) => {
                        setPasswordConfirmTouched(true)
                        if (!(passwordConfirm && password !== passwordConfirm)) {
                          e.currentTarget.style.borderColor = '#D0D5DA'
                        }
                      }}
                    />
                    
                    {passwordConfirm && password === passwordConfirm && (
                      <div style={{
                        position: 'absolute',
                        right: '42px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#4F8A6B',
                        fontSize: '16px',
                        pointerEvents: 'none'
                      }}>
                        <i className="fas fa-check-circle"></i>
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      disabled={isPending}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        color: '#888888',
                        fontSize: '14px',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isPending ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => !isPending && (e.currentTarget.style.color = '#555555')}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#888888'}
                    >
                      <i className={showPasswordConfirm ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
                    </button>
                  </div>
                  
                  {passwordConfirmTouched && passwordConfirm && password !== passwordConfirm && (
                    <div style={{ marginTop: '6px', fontSize: '13px', color: '#C05656', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fas fa-times-circle"></i>
                      パスワードが一致しません
                    </div>
                  )}
                </div>

                {/* 利用規約への同意 */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    color: '#555555',
                    lineHeight: '1.6',
                    opacity: isPending ? 0.6 : 1
                  }}>
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      disabled={isPending}
                      style={{
                        marginTop: '4px',
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                        accentColor: '#5B7C99'
                      }}
                    />
                    <span>
                      <Link href="/terms" target="_blank" style={{ color: '#5B7C99', textDecoration: 'underline' }}>
                        利用規約
                      </Link>
                      {' '}と{' '}
                      <Link href="/privacy" target="_blank" style={{ color: '#5B7C99', textDecoration: 'underline' }}>
                        プライバシーポリシー
                      </Link>
                      に同意します
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="alert alert-error" style={{ 
                    marginBottom: '16px',
                    fontSize: '14px'
                  }}>
                    {error}
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
                  {isPending ? (
                    '送信中...'
                  ) : (
                    <>
                      <i className="fas fa-envelope" style={{ color: '#FFFFFF' }}></i>
                      メールで登録
                    </>
                  )}
                </button>
              </form>

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
                  onClick={() => handleSocialSignup('google')}
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
                  <i className="fab fa-google" style={{ color: '#DB4437' }}></i>
                  Googleで登録
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleSocialSignup('twitter')}
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
                  <i className="fab fa-twitter" style={{ color: '#1DA1F2' }}></i>
                  Twitterで登録
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleSocialSignup('discord')}
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
                  Discordで登録
                </button>
              </div>

              <div style={{
                width: '100%',
                height: '1px',
                backgroundColor: '#D0D5DA',
                margin: '32px 0'
              }}></div>

              <div style={{ textAlign: 'center' }}>
                <Link href="/login" style={{ 
                  color: '#5B7C99', 
                  textDecoration: 'underline',
                  fontSize: '14px'
                }}>
                  ログインはこちら
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}