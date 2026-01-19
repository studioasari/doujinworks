'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

type PortfolioItem = {
  id: string
  title: string
  image_url: string
  thumbnail_url: string | null
  creator_id: string
  category: string
  tags: string[]
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

export default function TagPageClient() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const tagName = decodeURIComponent(params.tagName as string)
  const categoryFilter = searchParams.get('category') || ''
  
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [filteredItems, setFilteredItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 24

  useEffect(() => {
    fetchPortfolioItems()
  }, [tagName, categoryFilter])

  useEffect(() => {
    applyFilters()
    setCurrentPage(1)
  }, [portfolioItems, sortOrder])

  async function fetchPortfolioItems() {
    setLoading(true)
    
    try {
      let query = supabase
        .from('portfolio_items')
        .select('id, title, image_url, thumbnail_url, creator_id, category, tags, created_at')
        .eq('is_public', true)
        .contains('tags', [tagName])
        .order('created_at', { ascending: false })

      // カテゴリーフィルター
      if (categoryFilter) {
        query = query.eq('category', categoryFilter)
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

      // クリエイター情報取得
      const creatorIds = [...new Set(validItems.map(w => w.creator_id))]
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url')
        .in('user_id', creatorIds)

      const creatorMap = new Map()
      creatorsData?.forEach(c => creatorMap.set(c.user_id, c))

      // いいね・コメント数取得
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

  function handleCategoryChange(category: string) {
    if (category) {
      router.push(`/tags/${encodeURIComponent(tagName)}?category=${category}`)
    } else {
      router.push(`/tags/${encodeURIComponent(tagName)}`)
    }
  }

  function getCategoryLabel(cat: string) {
    return CATEGORIES.find(c => c.value === cat)?.label || cat
  }

  function PortfolioCard({ item }: { item: PortfolioItem }) {
    return (
      <Link href={`/portfolio/${item.id}`} className="list-card">
        <div className="list-card-image ratio-portfolio">
          <img src={item.thumbnail_url || item.image_url} alt={item.title} loading="lazy" />
          <span className="list-card-badge">{getCategoryLabel(item.category)}</span>
        </div>
        <div className="list-card-content">
          <h3 className="list-card-title">{item.title}</h3>
          <div className="list-card-creator">
            <div className="list-card-avatar">
              {item.profiles?.avatar_url ? (
                <Image src={item.profiles.avatar_url} alt="" width={24} height={24} />
              ) : (
                <i className="fas fa-user"></i>
              )}
            </div>
            <span className="list-card-creator-name">{item.profiles?.display_name || '名前未設定'}</span>
          </div>
          <div className="list-card-stats">
            <span className="likes">
              <i className="fas fa-heart"></i>
              {item.likeCount}
            </span>
            <span>
              <i className="fas fa-comment"></i>
              {item.commentCount}
            </span>
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
      pages.push(<button key={1} onClick={() => setCurrentPage(1)} className="pagination-btn">1</button>)
      if (startPage > 2) pages.push(<span key="start-dots" className="pagination-dots">...</span>)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button key={i} onClick={() => setCurrentPage(i)} className={`pagination-btn ${currentPage === i ? 'active' : ''}`}>
          {i}
        </button>
      )
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push(<span key="end-dots" className="pagination-dots">...</span>)
      pages.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="pagination-btn">{totalPages}</button>)
    }

    return (
      <div className="list-pagination">
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="pagination-btn">
          <i className="fas fa-chevron-left"></i>
        </button>
        {pages}
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="pagination-btn">
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    )
  }

  return (
    <div className="list-page">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      
      <main className="list-page-main">
        {/* サイドバー */}
        <aside className="list-sidebar">
          <nav className="mb-16">
            <Link href="/portfolio" className={`sidebar-nav-item ${!categoryFilter ? 'active' : ''}`}>
              すべて
            </Link>
          </nav>
          <div className="sidebar-separator"></div>
          <div>
            <div className="sidebar-section-title">カテゴリで絞り込み</div>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => handleCategoryChange(cat.value)}
                className={`sidebar-nav-item ${categoryFilter === cat.value ? 'active' : ''}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </aside>

        {/* メインコンテンツ */}
        <div className="list-content">
          <div className="list-content-inner">
            <div className="list-page-header">
              <h1>
                <span style={{ color: '#5B7C99', marginRight: '4px' }}>#</span>
                {tagName}
              </h1>
              {categoryFilter && (
                <p>{getCategoryLabel(categoryFilter)}に絞り込み中</p>
              )}
            </div>

            <div className="list-filter-bar">
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="filter-select">
                {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <span className="results-count">{filteredItems.length}件の作品</span>
            </div>

            {loading ? (
              <div className="list-empty">
                <i className="fas fa-spinner fa-spin"></i>
                <p>読み込み中...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="list-empty">
                <i className="fas fa-tag"></i>
                <p>「#{tagName}」の作品がありません</p>
                {categoryFilter && (
                  <p className="sub">
                    <button 
                      onClick={() => handleCategoryChange('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#5B7C99',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: '13px'
                      }}
                    >
                      カテゴリ絞り込みを解除
                    </button>
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="list-grid portfolio">
                  {filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => (
                    <PortfolioCard key={item.id} item={item} />
                  ))}
                </div>
                <Pagination />
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}