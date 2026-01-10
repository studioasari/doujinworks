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

  // ソーシャルログイン用モーダル
  const [showSocialModal, setShowSocialModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'x' | 'discord' | null>(null)
  const [socialAgreedToTerms, setSocialAgreedToTerms] = useState(false)

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

  // ソーシャルボタンクリック時にモーダルを表示
  const handleSocialButtonClick = (provider: 'google' | 'x' | 'discord') => {
    setSelectedProvider(provider)
    setSocialAgreedToTerms(false)
    setShowSocialModal(true)
  }

  // モーダルで同意後に実際のソーシャルログインを実行
  const handleSocialSignup = async () => {
    if (!selectedProvider || !socialAgreedToTerms) return

    setError('')
    setShowSocialModal(false)

    startTransition(async () => {
      try {
        const supabase = createClient()
        
        // providerに応じて適切なプロバイダーを使用
        const oauthProvider = selectedProvider === 'x' ? 'twitter' : selectedProvider
        
        const { error } = await supabase.auth.signInWithOAuth({
          provider: oauthProvider, 
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            skipBrowserRedirect: false,
          },
        })

        if (error) throw error
      } catch (error: any) {
        setError(error.message || '登録に失敗しました')
      }
    })
  }

  // プロバイダー名を取得
  const getProviderName = (provider: 'google' | 'x' | 'discord' | null) => {
    switch (provider) {
      case 'google': return 'Google'
      case 'x': return 'X'
      case 'discord': return 'Discord'
      default: return ''
    }
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <div className="auth-page">
        <div className="auth-container">
          {/* 左側：ウェルカムテキスト */}
          <div className="auth-welcome">
            <h1 className="auth-welcome-title">
              同人ワークスへようこそ！
            </h1>
            <p className="auth-welcome-text">
              同人ワークスは、創作する人も、それを楽しむ人も、"好き"を気軽に持ち寄れる街のような場所です。
            </p>
            <p className="auth-welcome-text">
              好みのクリエイターや作品に出会ったり、自分の表現を発信したりして楽しめます。
            </p>
            <p className="auth-welcome-text">
              ここでのつながりが、あなたの創作や活動をもっと広げるきっかけになりますように。
            </p>
          </div>

          {/* 右側：フォームカード */}
          <div className="auth-card">
            <h2 className="auth-card-title">新規会員登録</h2>

            <form onSubmit={handleEmailSignup}>
              {/* メールアドレス */}
              <div className="auth-form-group">
                <label className="auth-label">メールアドレス</label>
                <div className="auth-input-wrapper">
                  <input
                    type="email"
                    name="email"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* パスワード */}
              <div className="auth-form-group">
                <label className="auth-label">
                  パスワード <span className="auth-label-hint">（8文字以上、小文字・数字を含む）</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className={`auth-input has-icon ${passwordTouched && password && validatePassword(password) ? 'error' : ''}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password123"
                    required
                    minLength={8}
                    disabled={isPending}
                    onBlur={() => setPasswordTouched(true)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isPending}
                    className="auth-password-toggle"
                  >
                    <i className={showPassword ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
                  </button>
                </div>
                {passwordTouched && password && validatePassword(password) && (
                  <div className="auth-field-error">
                    <i className="fas fa-times-circle"></i>
                    {validatePassword(password)}
                  </div>
                )}
              </div>

              {/* パスワード（確認） */}
              <div className="auth-form-group">
                <label className="auth-label">パスワード（確認）</label>
                <div className="auth-input-wrapper">
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    className={`auth-input ${passwordConfirm && password === passwordConfirm ? 'has-check' : 'has-icon'} ${passwordConfirmTouched && passwordConfirm && password !== passwordConfirm ? 'error' : ''}`}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="もう一度入力"
                    required
                    minLength={8}
                    disabled={isPending}
                    onBlur={() => setPasswordConfirmTouched(true)}
                  />
                  {passwordConfirm && password === passwordConfirm && (
                    <span className="auth-check-icon">
                      <i className="fas fa-check-circle"></i>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    disabled={isPending}
                    className="auth-password-toggle"
                  >
                    <i className={showPasswordConfirm ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
                  </button>
                </div>
                {passwordConfirmTouched && passwordConfirm && password !== passwordConfirm && (
                  <div className="auth-field-error">
                    <i className="fas fa-times-circle"></i>
                    パスワードが一致しません
                  </div>
                )}
              </div>

              {/* 利用規約への同意 */}
              <div className="auth-form-group">
                <label className={`auth-checkbox-wrapper ${isPending ? 'disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    disabled={isPending}
                    className="auth-checkbox"
                  />
                  <span>
                    <Link href="/terms" target="_blank" className="auth-link">利用規約</Link>
                    {' '}と{' '}
                    <Link href="/privacy" target="_blank" className="auth-link">プライバシーポリシー</Link>
                    に同意します
                  </span>
                </label>
              </div>

              {error && (
                <div className="auth-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending || !isFormValid}
                className={`auth-submit-btn ${isFormValid && !isPending ? 'active' : 'disabled'}`}
              >
                {isPending ? (
                  '送信中...'
                ) : (
                  <>
                    <i className="fas fa-envelope"></i>
                    メールで登録
                  </>
                )}
              </button>
            </form>

            <div className="auth-divider">
              <div className="auth-divider-line"></div>
              <span className="auth-divider-text">または</span>
              <div className="auth-divider-line"></div>
            </div>

            <div className="auth-social-buttons">
              <button
                onClick={() => handleSocialButtonClick('google')}
                disabled={isPending}
                className="auth-social-btn"
              >
                <img src="/icons/google.svg" alt="Google" />
                Googleで登録
              </button>
              <button
                onClick={() => handleSocialButtonClick('x')}
                disabled={isPending}
                className="auth-social-btn"
              >
                <img src="/icons/x.svg" alt="X" />
                Xで登録
              </button>
              {/* <button
                onClick={() => handleSocialButtonClick('discord')}
                disabled={isPending}
                className="auth-social-btn"
              >
                <i className="fab fa-discord" style={{ color: '#5865F2', fontSize: '20px' }}></i>
                Discordで登録
              </button> */}
            </div>

            <div className="auth-footer">
              <Link href="/login" className="auth-footer-link">
                ログインはこちら
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ソーシャルログイン同意モーダル */}
      {showSocialModal && (
        <div 
          className="auth-modal-overlay"
          onClick={() => setShowSocialModal(false)}
        >
          <div 
            className="auth-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="auth-modal-title">
              {getProviderName(selectedProvider)}で登録
            </h3>
            <p className="auth-modal-description">
              続行するには、利用規約とプライバシーポリシーへの同意が必要です。
            </p>

            <label className="auth-checkbox-wrapper" style={{ marginBottom: '24px' }}>
              <input
                type="checkbox"
                checked={socialAgreedToTerms}
                onChange={(e) => setSocialAgreedToTerms(e.target.checked)}
                className="auth-checkbox"
              />
              <span>
                <Link href="/terms" target="_blank" className="auth-link">利用規約</Link>
                {' '}と{' '}
                <Link href="/privacy" target="_blank" className="auth-link">プライバシーポリシー</Link>
                に同意します
              </span>
            </label>

            <div className="auth-modal-buttons">
              <button
                onClick={() => setShowSocialModal(false)}
                className="auth-modal-btn cancel"
              >
                キャンセル
              </button>
              <button
                onClick={handleSocialSignup}
                disabled={!socialAgreedToTerms}
                className={`auth-modal-btn submit ${socialAgreedToTerms ? 'active' : 'disabled'}`}
              >
                同意して進む
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}