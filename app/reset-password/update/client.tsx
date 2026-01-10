'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updatePasswordAction } from '@/app/actions/auth'

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
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      <div className="auth-page">
        <div className="auth-card">
          <h2 className="auth-card-title">新しいパスワードを設定</h2>

          <form onSubmit={handleUpdatePassword}>
            {/* パスワード */}
            <div className="auth-form-group">
              <label className="auth-label">
                新しいパスワード <span className="auth-label-hint">（8文字以上、小文字・数字を含む）</span>
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
                  name="passwordConfirm"
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
              {isPending ? '更新中...' : 'パスワードを更新'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}