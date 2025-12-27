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
      
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '40px 20px',
        backgroundColor: '#F5F6F8'
      }}>
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
            新しいパスワードを設定
          </h2>

          <form onSubmit={handleUpdatePassword}>
            {/* パスワード */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: '#555555',
                marginBottom: '6px'
              }}>
                新しいパスワード <span style={{ color: '#888888', fontSize: '12px', fontWeight: '400' }}>（8文字以上、小文字・数字を含む）</span>
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
                  name="passwordConfirm"
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
              {isPending ? '更新中...' : 'パスワードを更新'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}