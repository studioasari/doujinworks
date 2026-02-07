'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './HeroSection.module.css'

export default function HeroSection() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')

  const handleSearch = () => {
    if (keyword.trim()) {
      router.push(`/search?q=${encodeURIComponent(keyword.trim())}`)
    }
  }

  return (
    <section className={styles.hero}>
      {/* Background */}
      <div className={styles.background}>
        <div className={styles.backgroundImage} />
        <div className={styles.backgroundOverlay} />
      </div>

      {/* Content */}
      <div className={styles.content}>
        <p className={styles.catchcopy}>
          理想のクリエイターがきっと見つかる
        </p>
        
        <img 
          src="/logotype.png" 
          alt="DoujinWorks"
          className={styles.logo}
        />

        {/* Search Box */}
        <div className={styles.searchBox}>
          <div className={styles.searchInputWrapper}>
            <i className="fas fa-search"></i>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="クリエイター名・作風・タグで検索..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className={styles.searchButton} onClick={handleSearch}>
              検索
            </button>
          </div>

          {/* CTA Grid */}
          <div className={styles.ctaGrid}>
            <Link href="/pricing" className={styles.ctaButton}>
              <i className="fas fa-store"></i>
              サービスから探す
            </Link>
            <Link href="/requests" className={styles.ctaButton}>
              <i className="fas fa-briefcase"></i>
              お仕事を探す
            </Link>
            <Link href="/portfolio" className={styles.ctaButton}>
              <i className="fas fa-images"></i>
              作品から探す
            </Link>
            <Link href="/creators" className={styles.ctaButton}>
              <i className="fas fa-users"></i>
              クリエイターを探す
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}