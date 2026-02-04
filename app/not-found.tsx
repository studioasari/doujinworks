import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import styles from './not-found.module.css'

export default function NotFound() {
  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.background}>
          <div className={styles.errorCode}>404</div>
          <div className={styles.errorText}>NOT FOUND</div>
        </div>
        <div className={styles.container}>
          <img 
            src="/illustrations/error-404.png" 
            alt="ページが見つからない" 
            className={styles.image}
          />
          <h1 className={styles.title}>ページが見つからないよ</h1>
          <p className={styles.description}>
            お探しのページは存在しないか、<br />
            移動した可能性があります
          </p>
          <Link href="/" className={`btn btn-primary ${styles.button}`}>
            トップページへ
          </Link>
        </div>
      </div>
      <Footer />
    </>
  )
}