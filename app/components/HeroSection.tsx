'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './HeroSection.module.css'

type SearchTab = 'keyword' | 'category' | 'condition'

const categories = [
  { id: 'illustration', label: 'イラスト', icon: 'fa-palette' },
  { id: 'manga', label: 'マンガ', icon: 'fa-book-open' },
  { id: 'novel', label: '小説', icon: 'fa-feather-alt' },
  { id: 'music', label: '音楽', icon: 'fa-music' },
  { id: 'voice', label: 'ボイス', icon: 'fa-microphone' },
  { id: 'video', label: '動画', icon: 'fa-video' },
]

const popularTags = ['厚塗り', 'アイコン', 'TRPG', 'Vtuber', '立ち絵']

export default function HeroSection() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SearchTab>('keyword')
  const [keyword, setKeyword] = useState('')
  const [budget, setBudget] = useState('')
  const [acceptingOnly, setAcceptingOnly] = useState(false)

  const handleSearch = () => {
    const params = new URLSearchParams()
    
    if (activeTab === 'keyword' && keyword) {
      params.set('q', keyword)
    } else if (activeTab === 'condition') {
      if (budget) params.set('budget', budget)
      if (acceptingOnly) params.set('accepting', 'true')
    }
    
    router.push(`/pricing?${params.toString()}`)
  }

  const handleTagClick = (tag: string) => {
    router.push(`/pricing?q=${encodeURIComponent(tag)}`)
  }

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/pricing?category=${categoryId}`)
  }

  return (
    <section className={styles.hero}>
      {/* Background Image */}
      <div className={styles.background}>
        <div className={styles.backgroundImage} />
        <div className={styles.backgroundOverlay} />
      </div>

      {/* Content */}
      <div className={styles.content}>
        <p className={styles.catchcopy}>
          理想のクリエイターがきっと見つかる
        </p>
        
        {/* Logo */}
        <img 
          src="/logotype.png" 
          alt="DoujinWorks"
          className={styles.logo}
        />

        {/* Search Container */}
        <div className={styles.searchContainer}>
          {/* Tabs */}
          <div className={styles.tabs}>
            {[
              { id: 'keyword' as SearchTab, label: 'キーワードで探す' },
              { id: 'category' as SearchTab, label: 'カテゴリから探す' },
              { id: 'condition' as SearchTab, label: '条件から探す' },
            ].map((tab, index) => (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''} ${
                  index === 0 ? styles.tabFirst : ''
                } ${index === 2 ? styles.tabLast : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {activeTab === tab.id && <div className={styles.tabArrow} />}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className={styles.searchBox}>
            {/* Keyword Tab */}
            {activeTab === 'keyword' && (
              <>
                {/* Desktop Layout */}
                <div className={styles.keywordDesktop}>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="クリエイター名・作風・タグで検索..."
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className={`btn btn-primary ${styles.searchButton}`} onClick={handleSearch}>
                      検索
                    </button>
                  </div>
                  
                  {/* Popular Tags */}
                  <div className={styles.popularTags}>
                    <span className={styles.popularLabel}>
                      <i className="fas fa-lightbulb"></i>
                      人気の検索
                    </span>
                    {popularTags.map((tag) => (
                      <span 
                        key={tag}
                        className={styles.popularTag}
                        onClick={() => handleTagClick(tag)}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className={styles.keywordMobile}>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="クリエイター名・作風・タグで検索..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  
                  {/* Popular Tags */}
                  <div className={styles.popularTags}>
                    <span className={styles.popularLabel}>
                      <i className="fas fa-lightbulb"></i>
                      人気の検索
                    </span>
                    {popularTags.map((tag) => (
                      <span 
                        key={tag}
                        className={styles.popularTag}
                        onClick={() => handleTagClick(tag)}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button className={`btn btn-primary ${styles.searchButtonFull}`} onClick={handleSearch}>
                    検索
                  </button>
                </div>
              </>
            )}

            {/* Category Tab */}
            {activeTab === 'category' && (
              <div className={styles.categoryGrid}>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={styles.categoryButton}
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    <i className={`fas ${cat.icon}`}></i>
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            {/* Condition Tab */}
            {activeTab === 'condition' && (
              <div className={styles.conditionContent}>
                <div className={styles.conditionRow}>
                  <span className={styles.conditionLabel}>予算</span>
                  <select 
                    className={styles.conditionSelect}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  >
                    <option value="">指定なし</option>
                    <option value="3000">〜3,000円</option>
                    <option value="5000">〜5,000円</option>
                    <option value="10000">〜10,000円</option>
                    <option value="30000">〜30,000円</option>
                    <option value="50000">〜50,000円</option>
                    <option value="100000">〜100,000円</option>
                  </select>
                </div>
                <div className={styles.conditionRow}>
                  <span className={styles.conditionLabel}>受付状況</span>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={acceptingOnly}
                      onChange={(e) => setAcceptingOnly(e.target.checked)}
                    />
                    <span className="checkbox-mark"></span>
                    受付中のクリエイターのみ表示
                  </label>
                </div>
                <button className={`btn btn-primary ${styles.searchButtonFull}`} onClick={handleSearch}>
                  この条件で検索
                </button>
              </div>
            )}
          </div>

          {/* CTA Buttons */}
          <div className={styles.ctaButtons}>
            <Link href="/portfolio" className={styles.ctaButton}>
              <i className="fas fa-images"></i>
              作品から探す
              <i className={`fas fa-arrow-right ${styles.ctaArrow}`}></i>
            </Link>
            <Link href="/requests" className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`}>
              <i className="fas fa-briefcase"></i>
              お仕事を探す
              <i className={`fas fa-arrow-right ${styles.ctaArrow}`}></i>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}