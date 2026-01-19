'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signupAction } from '@/app/actions/auth'
import { createClient } from '../../utils/supabase/client'
import styles from './page.module.css'

export default function SignupClient() {
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
      <div className={styles.page}>
        <div className={styles.container}>
          {/* 左側：ロゴ */}
          <div className={styles.logoArea}>
            <img src="/logotype.png" alt="同人ワークス" className={styles.logo} />
          </div>

          {/* 右側：フォームカード */}
          <div className={styles.cardArea}>
            <div className={styles.card}>
            <h2 className={styles.cardTitle}>新規会員登録</h2>

            <form onSubmit={handleEmailSignup}>
              {/* メールアドレス */}
              <div className={styles.formGroup}>
                <label className="form-label">メールアドレス</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  style={{ maxWidth: '100%' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  disabled={isPending}
                />
              </div>

              {/* パスワード */}
              <div className={styles.formGroup}>
                <label className="form-label">
                  パスワード <span className={styles.labelHint}>（8文字以上、小文字・数字を含む）</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className={`form-input ${styles.formInput} ${passwordTouched && password && validatePassword(password) ? 'error' : ''}`}
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
                    className={styles.passwordToggle}
                  >
                    <i className={showPassword ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
                  </button>
                </div>
                {passwordTouched && password && validatePassword(password) && (
                  <p className="form-error">
                    <i className="fa-solid fa-circle-exclamation"></i> {validatePassword(password)}
                  </p>
                )}
              </div>

              {/* パスワード（確認） */}
              <div className={styles.formGroup}>
                <label className="form-label">パスワード（確認）</label>
                <div className={styles.inputWrapper}>
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    className={`form-input ${styles.formInput} ${passwordConfirmTouched && passwordConfirm && password !== passwordConfirm ? 'error' : ''}`}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="もう一度入力"
                    required
                    minLength={8}
                    disabled={isPending}
                    onBlur={() => setPasswordConfirmTouched(true)}
                  />
                  {passwordConfirm && password === passwordConfirm && (
                    <span className={styles.checkIcon}>
                      <i className="fas fa-check-circle"></i>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    disabled={isPending}
                    className={styles.passwordToggle}
                  >
                    <i className={showPasswordConfirm ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
                  </button>
                </div>
                {passwordConfirmTouched && passwordConfirm && password !== passwordConfirm && (
                  <p className="form-error">
                    <i className="fa-solid fa-circle-exclamation"></i> パスワードが一致しません
                  </p>
                )}
              </div>

              {/* 利用規約への同意 */}
              <div className={styles.formGroup}>
                <div className={styles.checkboxRow}>
                  <label className={`checkbox ${isPending ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      disabled={isPending}
                    />
                    <span className="checkbox-mark"></span>
                  </label>
                  <span className={styles.checkboxText}>
                    <Link href="/terms" target="_blank" className="link-subtle">利用規約</Link>
                    {' '}と{' '}
                    <Link href="/privacy" target="_blank" className="link-subtle">プライバシーポリシー</Link>
                    に同意します
                  </span>
                </div>
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>
                  <i className="fa-solid fa-circle-xmark alert-icon"></i>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending || !isFormValid}
                className={`btn btn-primary ${styles.submitBtn}`}
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

            <div className={styles.divider}>
              <div className={styles.dividerLine}></div>
              <span className={styles.dividerText}>または</span>
              <div className={styles.dividerLine}></div>
            </div>

            <div className={styles.socialButtons}>
              <button
                onClick={() => handleSocialButtonClick('google')}
                disabled={isPending}
                className={styles.socialBtn}
              >
                <img src="/icons/google.svg" alt="Google" />
                Googleで登録
              </button>
              <button
                onClick={() => handleSocialButtonClick('x')}
                disabled={isPending}
                className={styles.socialBtn}
              >
                <img src="/icons/x.svg" alt="X" />
                Xで登録
              </button>
              {/* <button
                onClick={() => handleSocialButtonClick('discord')}
                disabled={isPending}
                className={styles.socialBtn}
              >
                <i className="fab fa-discord" style={{ color: '#5865F2', fontSize: '20px' }}></i>
                Discordで登録
              </button> */}
            </div>

            <div className={styles.footer}>
              <Link href="/login" className="link">
                ログインはこちら
              </Link>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* ソーシャルログイン同意モーダル */}
      {showSocialModal && (
        <div 
          className={styles.modalOverlay}
          onClick={() => setShowSocialModal(false)}
        >
          <div 
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalBody}>
              <h3 className={styles.modalTitle}>
                {getProviderName(selectedProvider)}で登録
              </h3>
              <p className={styles.modalDescription}>
                続行するには、利用規約とプライバシーポリシーへの同意が必要です。
              </p>

              <div className={styles.modalCheckboxRow}>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={socialAgreedToTerms}
                    onChange={(e) => setSocialAgreedToTerms(e.target.checked)}
                  />
                  <span className="checkbox-mark"></span>
                </label>
                <span className={styles.checkboxText}>
                  <Link href="/terms" target="_blank" className="link-subtle">利用規約</Link>
                  {' '}と{' '}
                  <Link href="/privacy" target="_blank" className="link-subtle">プライバシーポリシー</Link>
                  に同意します
                </span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowSocialModal(false)}
                className={`btn btn-secondary ${styles.modalBtn}`}
              >
                キャンセル
              </button>
              <button
                onClick={handleSocialSignup}
                disabled={!socialAgreedToTerms}
                className={`btn btn-primary ${styles.modalBtn}`}
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