'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import styles from './PortfolioList.module.css'

type PortfolioItem = {
  id: string
  title: string
  image_url: string
  thumbnail_url: string | null
  creator_id: string
  category: string
  created_at: string
  profiles: {
    username: string
    display_name: string
    avatar_url: string | null
  }
  likeCount: number
  commentCount: number
}

const CATEGORIES = [
  { value: 'illustration', label: 'イラスト', path: '/portfolio/illustration' },
  { value: 'manga', label: 'マンガ', path: '/portfolio/manga' },
  { value: 'novel', label: '小説', path: '/portfolio/novel' },
  { value: 'music', label: '音楽', path: '/portfolio/music' },
  { value: 'voice', label: 'ボイス', path: '/portfolio/voice' },
  { value: 'video', label: '動画', path: '/portfolio/video' }
]

const SORT_OPTIONS = [
  { value: 'newest', label: '新着順' },
  { value: 'popular', label: '人気順' },
  { value: 'comments', label: 'コメント順' }
]

type PortfolioListProps = {
  category?: string
  pageTitle?: string
  pageDescription?: string
}

export default function PortfolioList({ category, pageTitle, pageDescription }: PortfolioListProps) {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [filteredItems, setFilteredItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false)
  const itemsPerPage = 24

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (isSortDropdownOpen && !target.closest('.sort-dropdown-container')) {
        setIsSortDropdownOpen(false)
      }
    }
    if (isSortDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isSortDropdownOpen])

  useEffect(() => {
    fetchPortfolioItems()
  }, [category])

  useEffect(() => {
    applyFilters()
    setCurrentPage(1)
  }, [portfolioItems, sortOrder])

  async function fetchPortfolioItems() {
    setLoading(true)
    
    try {
      let query = supabase
        .from('portfolio_items')
        .select('id, title, image_url, thumbnail_url, creator_id, category, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (category) {
        query = query.eq('category', category)
      }

      const { data: items, error } = await query.limit(100)

      if (error || !items?.length) {
        setPortfolioItems([])
        setFilteredItems([])
        setLoading(false)
        return
      }

      const validItems = items.filter(item => item.creator_id !== null)
      if (!validItems.length) {
        setPortfolioItems([])
        setFilteredItems([])
        setLoading(false)
        return
      }

      const creatorIds = [...new Set(validItems.map(w => w.creator_id))]
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url')
        .in('user_id', creatorIds)

      const creatorMap = new Map()
      creatorsData?.forEach(c => creatorMap.set(c.user_id, c))

      const ids = validItems.map(w => w.id)
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from('portfolio_likes').select('portfolio_item_id').in('portfolio_item_id', ids),
        supabase.from('comments').select('portfolio_item_id').in('portfolio_item_id', ids)
      ])

      const likeMap = new Map()
      likes?.forEach(l => likeMap.set(l.portfolio_item_id, (likeMap.get(l.portfolio_item_id) || 0) + 1))
      
      const commentMap = new Map()
      comments?.forEach(c => commentMap.set(c.portfolio_item_id, (commentMap.get(c.portfolio_item_id) || 0) + 1))

      const itemsWithStats = validItems.map((item: any) => ({
        ...item,
        profiles: creatorMap.get(item.creator_id) || {
          username: '',
          display_name: '不明',
          avatar_url: null
        },
        likeCount: likeMap.get(item.id) || 0,
        commentCount: commentMap.get(item.id) || 0
      }))

      setPortfolioItems(itemsWithStats)
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let result = [...portfolioItems]

    switch (sortOrder) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'popular':
        result.sort((a, b) => b.likeCount - a.likeCount)
        break
      case 'comments':
        result.sort((a, b) => b.commentCount - a.commentCount)
        break
    }

    setFilteredItems(result)
  }

  function getCategoryLabel(cat: string) {
    return CATEGORIES.find(c => c.value === cat)?.label || cat
  }

  function PortfolioCard({ item }: { item: PortfolioItem }) {
    return (
      <Link href={`/portfolio/${item.id}`} className={`card ${styles.workCard}`}>
        <div className={`card-image ${styles.workCardImage}`}>
          {item.thumbnail_url || item.image_url ? (
            <Image 
              src={item.thumbnail_url || item.image_url} 
              alt={item.title} 
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
            />
          ) : (
            <i className="fa-regular fa-image"></i>
          )}
          <span className="overlay-badge overlay-badge-top-left">
            {getCategoryLabel(item.category)}
          </span>
        </div>
        <div className={`card-body ${styles.workCardBody}`}>
          <h3 className="card-title">{item.title}</h3>
          <div className={styles.cardMeta}>
            <div className={styles.cardCreator}>
              <div className={`avatar avatar-xs ${styles.creatorAvatar} ${item.profiles?.avatar_url ? styles.hasImage : ''}`}>
                {item.profiles?.avatar_url ? (
                  <Image src={item.profiles.avatar_url} alt="" width={20} height={20} />
                ) : (
                  <i className="fas fa-user"></i>
                )}
              </div>
              <span className={styles.creatorName}>{item.profiles?.display_name || '名前未設定'}</span>
            </div>
            <div className={styles.cardStats}>
              <span className={styles.statItem}>
                <i className="fas fa-heart icon-like"></i>
                {item.likeCount}
              </span>
              <span className={styles.statItem}>
                <i className="fas fa-comment"></i>
                {item.commentCount}
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  function Pagination() {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
    if (totalPages <= 1) return null

    const pages = []
    let startPage = Math.max(1, currentPage - 2)
    let endPage = Math.min(totalPages, startPage + 4)
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4)

    if (startPage > 1) {
      pages.push(
        <button key={1} onClick={() => setCurrentPage(1)} className={styles.pageBtn}>
          1
        </button>
      )
      if (startPage > 2) pages.push(<span key="start-dots" className={styles.pageDots}>...</span>)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button 
          key={i} 
          onClick={() => setCurrentPage(i)} 
          className={`${styles.pageBtn} ${currentPage === i ? styles.active : ''}`}
        >
          {i}
        </button>
      )
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push(<span key="end-dots" className={styles.pageDots}>...</span>)
      pages.push(
        <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className={styles.pageBtn}>
          {totalPages}
        </button>
      )
    }

    return (
      <div className={styles.pagination}>
        <button 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
          disabled={currentPage === 1} 
          className={styles.pageBtn}
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        {pages}
        <button 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
          disabled={currentPage === totalPages} 
          className={styles.pageBtn}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    )
  }

  return (
    <>
      <Header />
      <div className={styles.page}>
        {/* サイドバー */}
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>
            <Link 
              href="/portfolio" 
              className={`${styles.navItem} ${!category ? styles.active : ''}`}
            >
              すべて
            </Link>
          </nav>
          <div className={styles.separator}></div>
          <div className={styles.sidebarSection}>
            <div className={styles.sectionTitle}>カテゴリ</div>
            {CATEGORIES.map((cat) => (
              <Link 
                key={cat.value} 
                href={cat.path} 
                className={`${styles.navItem} ${category === cat.value ? styles.active : ''}`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className={styles.main}>
          <div className={styles.mainInner}>
            {pageTitle && (
              <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>{pageTitle}</h1>
                {pageDescription && <p className={styles.pageDescription}>{pageDescription}</p>}
              </div>
            )}

            <div className={styles.filterBar}>
              <div className={`${styles.dropdown} sort-dropdown-container ${isSortDropdownOpen ? styles.dropdownActive : ''}`}>
                <button 
                  className={styles.dropdownTrigger}
                  onClick={(e) => { e.stopPropagation(); setIsSortDropdownOpen(!isSortDropdownOpen) }}
                >
                  {SORT_OPTIONS.find(o => o.value === sortOrder)?.label}
                  <i className="fas fa-chevron-down"></i>
                </button>
                <div className={styles.dropdownMenu}>
                  {SORT_OPTIONS.map(option => (
                    <div 
                      key={option.value} 
                      className={`${styles.dropdownItem} ${sortOrder === option.value ? styles.dropdownItemActive : ''}`}
                      onClick={() => { setSortOrder(option.value); setIsSortDropdownOpen(false) }}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              </div>
              <span className={styles.resultCount}>
                <span className={styles.resultNumber}>{filteredItems.length}</span>件の作品
              </span>
            </div>

            {loading ? (
              <div className={styles.loadingState}>
                <i className="fas fa-spinner fa-spin"></i>
                <p>読み込み中...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="empty-state">
                <i className="fa-regular fa-image"></i>
                <p>作品がありません</p>
              </div>
            ) : (
              <>
                <div className={styles.worksGrid}>
                  {filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => (
                    <PortfolioCard key={item.id} item={item} />
                  ))}
                </div>
                <Pagination />
              </>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}