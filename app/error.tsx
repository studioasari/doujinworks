'use client'

import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import styles from './error.module.css'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.background}>
          <div className={styles.errorCode}>500</div>
          <div className={styles.errorText}>SERVER ERROR</div>
        </div>
        <div className={styles.container}>
          <img 
            src="/illustrations/error-500.png" 
            alt="サーバーエラー" 
            className={styles.image}
          />
          <h1 className={styles.title}>ちょっと調子が悪いみたい</h1>
          <p className={styles.description}>
            時間をおいて再度お試しください
          </p>
          <div className={styles.buttons}>
            <button onClick={reset} className="btn btn-secondary">
              もう一度試す
            </button>
            <Link href="/" className="btn btn-primary">
              トップページへ
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}