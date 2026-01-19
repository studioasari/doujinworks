'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updatePasswordAction } from '@/app/actions/auth'
import styles from './page.module.css'

export function UpdatePasswordClient() {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false)
  const [error, setError] = useState('')
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

  // フォームが有効かチェック
  const isFormValid = password && 
                      passwordConfirm && 
                      password === passwordConfirm && 
                      password.length >= 8 &&
                      /[a-z]/.test(password) &&
                      /[0-9]/.test(password)

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      const formData = new FormData()
      formData.append('password', password)
      formData.append('passwordConfirm', passwordConfirm)

      const result = await updatePasswordAction(formData)

      if (!result.success) {
        setError(result.error || 'パスワードの更新に失敗しました')
        return
      }

      alert('パスワードを更新しました。ログインしてください。')
      router.push('/login')
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>新しいパスワードを設定</h2>

        <form onSubmit={handleUpdatePassword}>
          {/* パスワード */}
          <div className={styles.formGroup}>
            <label className="form-label">
              新しいパスワード <span className={styles.labelHint}>（8文字以上、小文字・数字を含む）</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className={`form-input ${passwordTouched && password && validatePassword(password) ? 'error' : ''}`}
                style={{ maxWidth: '100%', paddingRight: '48px' }}
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
                name="passwordConfirm"
                className={`form-input ${passwordConfirmTouched && passwordConfirm && password !== passwordConfirm ? 'error' : ''}`}
                style={{ maxWidth: '100%', paddingRight: '48px' }}
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
            {isPending ? '更新中...' : 'パスワードを更新'}
          </button>
        </form>
      </div>
    </div>
  )
}