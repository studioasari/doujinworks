'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
    <section className="hero-section">
      {/* Background Image */}
      <div className="hero-background">
        <div className="hero-background-image" />
        <div className="hero-background-overlay" />
      </div>

      {/* Content */}
      <div className="hero-content">
        <p className="hero-catchcopy">
          理想のクリエイターがきっと見つかる
        </p>
        
        {/* Logo */}
        <img 
          src="/logotype.png" 
          alt="DoujinWorks"
          className="hero-logo"
        />

        {/* Search Container */}
        <div className="hero-search-container">
          {/* Tabs */}
          <div className="hero-search-tabs">
            {[
              { id: 'keyword' as SearchTab, label: 'キーワードで探す' },
              { id: 'category' as SearchTab, label: 'カテゴリから探す' },
              { id: 'condition' as SearchTab, label: '条件から探す' },
            ].map((tab, index) => (
              <button
                key={tab.id}
                className={`hero-search-tab ${activeTab === tab.id ? 'active' : ''} ${
                  activeTab === tab.id && index === 0 ? 'first' : ''
                } ${activeTab === tab.id && index === 2 ? 'last' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {activeTab === tab.id && <div className="hero-search-tab-arrow" />}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="hero-search-box">
            {/* Keyword Tab */}
            {activeTab === 'keyword' && (
              <>
                {/* Desktop Layout */}
                <div className="hero-search-keyword-desktop">
                  <div className="hero-search-input-wrapper">
                    <input
                      type="text"
                      className="hero-search-input"
                      placeholder="クリエイター名・作風・タグで検索..."
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="hero-search-button" onClick={handleSearch}>
                      検索
                    </button>
                  </div>
                  
                  {/* Popular Tags */}
                  <div className="hero-popular-tags">
                    <span className="hero-popular-label">
                      <i className="fas fa-lightbulb"></i>
                      人気の検索
                    </span>
                    {popularTags.map((tag) => (
                      <span 
                        key={tag}
                        className="hero-popular-tag"
                        onClick={() => handleTagClick(tag)}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className="hero-search-keyword-mobile">
                  <input
                    type="text"
                    className="hero-search-input"
                    placeholder="クリエイター名・作風・タグで検索..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  
                  {/* Popular Tags - Between input and button on mobile */}
                  <div className="hero-popular-tags">
                    <span className="hero-popular-label">
                      <i className="fas fa-lightbulb"></i>
                      人気の検索
                    </span>
                    {popularTags.map((tag) => (
                      <span 
                        key={tag}
                        className="hero-popular-tag"
                        onClick={() => handleTagClick(tag)}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button className="hero-search-button hero-search-button-full" onClick={handleSearch}>
                    検索
                  </button>
                </div>
              </>
            )}

            {/* Category Tab */}
            {activeTab === 'category' && (
              <div className="hero-category-grid">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className="hero-category-button"
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
              <div className="hero-search-condition">
                <div className="hero-condition-row">
                  <span className="hero-condition-label">予算</span>
                  <select 
                    className="hero-condition-select"
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
                <div className="hero-condition-row">
                  <span className="hero-condition-label">受付状況</span>
                  <div 
                    className={`hero-checkbox-wrapper ${acceptingOnly ? 'checked' : ''}`}
                    onClick={() => setAcceptingOnly(!acceptingOnly)}
                  >
                    <div className="hero-checkbox">
                      {acceptingOnly && <i className="fas fa-check"></i>}
                    </div>
                    <span className="hero-checkbox-label">
                      受付中のクリエイターのみ表示
                    </span>
                  </div>
                </div>
                <button className="hero-search-button hero-search-button-full" onClick={handleSearch}>
                  この条件で検索
                </button>
              </div>
            )}
          </div>

          {/* Portfolio CTA */}
          <Link href="/portfolio" className="hero-portfolio-cta">
            <i className="fas fa-images"></i>
            作品から探す
            <i className="fas fa-arrow-right hero-portfolio-arrow"></i>
          </Link>
        </div>
      </div>
    </section>
  )
}