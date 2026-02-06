import Link from 'next/link'
import Image from 'next/image'
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
          <Image 
            src="/illustrations/error-404.png" 
            alt="ページが見つからない" 
            width={180}
            height={180}
            sizes="180px"
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