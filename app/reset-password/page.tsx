'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { passwordResetAction } from '@/app/actions/auth'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  // フォームが有効かチェック
  const isFormValid = email

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    startTransition(async () => {
      const formData = new FormData()
      formData.append('email', email)

      const result = await passwordResetAction(formData)

      if (!result.success) {
        setError(result.error || 'メールの送信に失敗しました')
        return
      }

      setSuccess(true)
    })
  }

  if (success) {
    return (
      <>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <div className="auth-page">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <div className="auth-success-icon">
              <i className="fas fa-check"></i>
            </div>

            <h2 className="auth-card-title">メールを送信しました</h2>

            <p className="auth-description">
              <strong>{email}</strong> にパスワード再設定用のリンクを送信しました。<br />
              メールをご確認ください。
            </p>

            <Link href="/login" className="auth-submit-btn active" style={{ textDecoration: 'none' }}>
              ログインページに戻る
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <div className="auth-page">
        <div className="auth-card">
          <h2 className="auth-card-title">パスワードを再設定</h2>

          <form onSubmit={handleResetPassword}>
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
              {isPending ? '送信中...' : '再設定メールを送信'}
            </button>
          </form>

          <div className="auth-footer">
            <Link href="/login" className="auth-footer-link">
              ログインページに戻る
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}