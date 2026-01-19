'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { passwordResetAction } from '@/app/actions/auth'
import styles from './page.module.css'

export default function ResetPasswordClient() {
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

  // 成功画面
  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>
            <i className="fas fa-check"></i>
          </div>

          <h2 className={styles.cardTitle}>メールを送信しました</h2>

          <p className={styles.description}>
            <strong>{email}</strong> にパスワード再設定用のリンクを送信しました。<br />
            メールをご確認ください。
          </p>

          <Link href="/login" className={`btn btn-primary ${styles.submitBtn}`}>
            ログインページに戻る
          </Link>
        </div>
      </div>
    )
  }

  // 入力フォーム
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>パスワードを再設定</h2>

        <form onSubmit={handleResetPassword}>
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
            {isPending ? '送信中...' : '再設定メールを送信'}
          </button>
        </form>

        <div className={styles.footer}>
          <Link href="/login" className="link">
            ログインページに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}