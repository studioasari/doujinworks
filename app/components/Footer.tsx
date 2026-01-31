import Link from 'next/link'
import Image from 'next/image'
import Breadcrumb from './Breadcrumb'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <>
      <Breadcrumb />

      <footer className={styles.footer}>
        {/* メインエリア */}
        <div className={styles.main}>
          <div className={styles.mainInner}>
            {/* 左：CTA */}
            <div className={styles.ctaArea}>
              <Image src="/logotype.png" alt="同人ワークス" width={160} height={32} sizes="160px" className={styles.logo} />
              
              <p className={styles.description}>
                同人界隈特化の<br />
                クリエイターマッチングサービス
              </p>

              <p className={styles.ctaText}>
                作品を投稿したり、クリエイターに<br />
                依頼したり。登録・利用は無料です。
              </p>

              <div className={styles.ctaButtons}>
                <Link href="/signup" className="btn btn-primary btn-sm">
                  無料で始める
                </Link>
                <Link href="/login" className="btn btn-secondary btn-sm">
                  ログイン
                </Link>
              </div>
            </div>

            {/* 右：リンク4列 */}
            <div className={styles.linksArea}>
              <div className={styles.linkColumn}>
                <h4 className={styles.heading}>クリエイター</h4>
                <ul className={styles.links}>
                  <li><Link href="/creators">クリエイターを探す</Link></li>
                  <li><Link href="/portfolio">作品を見る</Link></li>
                  <li><Link href="/portfolio/upload">作品を投稿</Link></li>
                  <li><Link href="/earnings">売上管理</Link></li>
                  <li><Link href="/profile/edit">プロフィール編集</Link></li>
                  <li><Link href="/favorites">お気に入り</Link></li>
                  <li><Link href="/following">フォロー中</Link></li>
                  <li><Link href="/dashboard">ダッシュボード</Link></li>
                </ul>
              </div>

              <div className={styles.linkColumn}>
                <h4 className={styles.heading}>依頼</h4>
                <ul className={styles.links}>
                  <li><Link href="/requests">依頼を探す</Link></li>
                  <li><Link href="/requests/create">依頼を投稿</Link></li>
                  <li><Link href="/requests/manage">依頼管理</Link></li>
                  <li><Link href="/messages">メッセージ</Link></li>
                  <li><Link href="/transactions">取引履歴</Link></li>
                  <li><Link href="/reviews">レビュー</Link></li>
                  <li><Link href="/contracts">契約管理</Link></li>
                </ul>
              </div>

              <div className={styles.linkColumn}>
                <h4 className={styles.heading}>サポート</h4>
                <ul className={styles.links}>
                  <li><a href="#">ヘルプセンター</a></li>
                  <li><a href="#">よくある質問</a></li>
                  <li><a href="#">お問い合わせ</a></li>
                  <li><a href="#">ご利用ガイド</a></li>
                  <li><a href="#">安全なお取引</a></li>
                  <li><a href="#">手数料について</a></li>
                </ul>
              </div>

              <div className={styles.linkColumn}>
                <h4 className={styles.heading}>会社情報</h4>
                <ul className={styles.links}>
                  <li><a href="#">運営会社</a></li>
                  <li><a href="#">採用情報</a></li>
                  <li><a href="#">ブログ</a></li>
                  <li><a href="#">お知らせ</a></li>
                  <li><a href="#">プレスキット</a></li>
                  <li><a href="#">パートナー募集</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 最下部 */}
        <div className={styles.bottom}>
          <div className={styles.bottomInner}>
            <div className={styles.social}>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className={styles.socialIcon}>
                <i className="fab fa-twitter"></i>
              </a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" aria-label="Discord" className={styles.socialIcon}>
                <i className="fab fa-discord"></i>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={styles.socialIcon}>
                <i className="fab fa-instagram"></i>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className={styles.socialIcon}>
                <i className="fab fa-youtube"></i>
              </a>
            </div>
            <div className={styles.legalLinks}>
              <Link href="/terms">利用規約</Link>
              <Link href="/privacy">プライバシーポリシー</Link>
              <Link href="/cookie_policy">外部送信ポリシー</Link>
              <Link href="/law">特定商取引法</Link>
            </div>
          </div>
        </div>

        {/* コピーライト */}
        <div className={styles.copyrightBar}>
          <div className={styles.copyrightInner}>
            © 2025 Studio Asari. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  )
}