'use client'

import { useState, useEffect, Suspense, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { resendEmailAction } from '@/app/actions/auth'
import styles from './page.module.css'

function VerifyContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResend = async () => {
    if (!email) {
      setError('メールアドレスが見つかりません。新規登録からやり直してください。')
      return
    }

    setError('')
    setMessage('')

    startTransition(async () => {
      const formData = new FormData()
      formData.append('email', email)

      const result = await resendEmailAction(formData)

      if (!result.success) {
        setError(result.error || '再送信に失敗しました')
        return
      }

      setMessage('認証メールを再送信しました。メールボックスをご確認ください。')
      setCountdown(60) // 60秒のクールダウン
    })
  }

  return (
    <div className={styles.cardArea}>
      <div className={styles.card}>
        <div className={styles.iconCircle}>
          <i className="fas fa-envelope"></i>
        </div>
        
        <h2 className={styles.cardTitle}>認証メールを送信しました</h2>
        
        <p className={styles.description}>
          {email ? (
            <>
              <strong>{email}</strong> に認証リンクを送信しました。<br />
            </>
          ) : (
            <>ご登録いただいたメールアドレスに認証リンクを送信しました。<br /></>
          )}
          メール内のリンクをクリックして、登録を完了してください。
        </p>

        {message && (
          <div className="alert alert-success" style={{ marginBottom: 'var(--space-5)' }}>
            <i className="fa-solid fa-circle-check alert-icon"></i>
            {message}
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>
            <i className="fa-solid fa-circle-xmark alert-icon"></i>
            {error}
          </div>
        )}

        <div className={styles.infoBox}>
          <p className={styles.infoTitle}>メールが届かない場合</p>
          <ul className={styles.infoList}>
            <li>迷惑メールフォルダをご確認ください</li>
            <li>メールアドレスが正しいかご確認ください</li>
            <li>数分お待ちいただいてから再度お試しください</li>
          </ul>
        </div>

        {email && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <button
              onClick={handleResend}
              disabled={isPending || countdown > 0}
              className={styles.resendBtn}
            >
              {countdown > 0 
                ? `認証メールを再送信（${countdown}秒後に再送信可能）`
                : isPending 
                ? '送信中...' 
                : '認証メールを再送信'}
            </button>
          </div>
        )}

        <div className={styles.footer}>
          <Link href="/login" className={`btn btn-primary ${styles.submitBtn}`}>
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VerifyClient() {
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
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  )
}