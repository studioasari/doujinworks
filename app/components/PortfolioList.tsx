'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import { WorkGridSkeleton, FeaturedGridSkeleton } from '@/app/components/Skeleton'
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

const SORT_TABS = [
  { value: 'newest', label: '新着' },
  { value: 'trending', label: '急上昇' },
  { value: 'popular', label: '人気' },
]

type PortfolioListProps = {
  category?: string
  pageTitle?: string
  pageDescription?: string
}

export default function PortfolioList({ category, pageTitle, pageDescription }: PortfolioListProps) {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 30

  useEffect(() => {
    fetchPortfolioItems()
  }, [category])

  useEffect(() => {
    setCurrentPage(1)
  }, [sortOrder])

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

      const { data: items, error } = await query.limit(200)

      if (error || !items?.length) {
        setPortfolioItems([])
        setLoading(false)
        return
      }

      const validItems = items.filter(item => item.creator_id !== null)
      if (!validItems.length) {
        setPortfolioItems([])
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

  // おすすめ作品（いいね数上位8件）
  const featuredItems = useMemo(() => {
    return [...portfolioItems]
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 8)
  }, [portfolioItems])

  // ソート済みアイテム
  const sortedItems = useMemo(() => {
    let result = [...portfolioItems]
    
    switch (sortOrder) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'trending':
        // 直近の投稿で いいね/コメント が多いもの
        const now = new Date().getTime()
        result.sort((a, b) => {
          const ageA = (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24) + 1
          const ageB = (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24) + 1
          const scoreA = (a.likeCount + a.commentCount * 2) / Math.sqrt(ageA)
          const scoreB = (b.likeCount + b.commentCount * 2) / Math.sqrt(ageB)
          return scoreB - scoreA
        })
        break
      case 'popular':
        result.sort((a, b) => b.likeCount - a.likeCount)
        break
    }
    
    return result
  }, [portfolioItems, sortOrder])

  // ページ分割
  const paginatedItems = useMemo(() => {
    return sortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [sortedItems, currentPage])

  function getCategoryLabel(cat: string) {
    return CATEGORIES.find(c => c.value === cat)?.label || cat
  }

  // 新着判定（3日以内）
  function isNew(createdAt: string) {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    return new Date(createdAt) >= threeDaysAgo
  }

  // 人気判定（いいね10以上）
  function isHot(likeCount: number) {
    return likeCount >= 10
  }

  function Pagination() {
    const totalPages = Math.ceil(sortedItems.length / itemsPerPage)
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

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <aside className={styles.sidebar}>
            <nav className={styles.sidebarNav}>
              <Link href="/portfolio" className={`${styles.navItem} ${!category ? styles.active : ''}`}>
                すべて
              </Link>
            </nav>
            <div className={styles.separator}></div>
            <div className={styles.sidebarSection}>
              <div className={styles.sectionTitle}>カテゴリ</div>
              {CATEGORIES.map((cat) => (
                <Link key={cat.value} href={cat.path} className={`${styles.navItem} ${category === cat.value ? styles.active : ''}`}>
                  {cat.label}
                </Link>
              ))}
            </div>
          </aside>
          <main className={styles.main}>
            <div className={styles.mainInner}>
              <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>{pageTitle || '作品一覧'}</h1>
                {pageDescription && <p className={styles.pageDescription}>{pageDescription}</p>}
              </div>
              <div className={styles.mobileTabs}>
                <Link href="/portfolio" className={`${styles.mobileTab} ${!category ? styles.active : ''}`}>
                  すべて
                </Link>
                {CATEGORIES.map((cat) => (
                  <Link key={cat.value} href={cat.path} className={`${styles.mobileTab} ${category === cat.value ? styles.active : ''}`}>
                    {cat.label}
                  </Link>
                ))}
              </div>
              {!category && (
                <section className={styles.featuredSection}>
                  <div className={styles.featuredHeader}>
                    <h2 className={styles.featuredTitle}>おすすめ作品</h2>
                  </div>
                  <FeaturedGridSkeleton count={8} />
                </section>
              )}
              <div className={styles.sortTabs}>
                <button className={`${styles.sortTab} ${styles.active}`}>新着</button>
                <button className={styles.sortTab}>急上昇</button>
                <button className={styles.sortTab}>人気</button>
              </div>
              <WorkGridSkeleton count={12} />
            </div>
          </main>
        </div>
        <Footer />
      </>
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
            {/* ページヘッダー */}
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>
                {pageTitle || '作品一覧'}
                <span className={styles.pageCount}>{sortedItems.length}件</span>
              </h1>
              {pageDescription && <p className={styles.pageDescription}>{pageDescription}</p>}
            </div>

            {/* モバイル用カテゴリタブ */}
            <div className={styles.mobileTabs}>
              <Link 
                href="/portfolio" 
                className={`${styles.mobileTab} ${!category ? styles.active : ''}`}
              >
                すべて
              </Link>
              {CATEGORIES.map((cat) => (
                <Link 
                  key={cat.value} 
                  href={cat.path} 
                  className={`${styles.mobileTab} ${category === cat.value ? styles.active : ''}`}
                >
                  {cat.label}
                </Link>
              ))}
            </div>

            {/* 空状態 */}
            {portfolioItems.length === 0 && (
              <div className={styles.emptyState}>
                <i className="fa-regular fa-image"></i>
                <p>作品がありません</p>
              </div>
            )}

            {/* コンテンツ */}
            {portfolioItems.length > 0 && (
              <>
                {/* おすすめ作品 */}
                {featuredItems.length > 0 && !category && (
                  <section className={styles.featuredSection}>
                    <div className={styles.featuredHeader}>
                      <h2 className={styles.featuredTitle}>おすすめ作品</h2>
                    </div>
                    <div className={styles.featuredGrid}>
                      {featuredItems.map((item) => (
                        <Link 
                          key={item.id} 
                          href={`/portfolio/${item.id}`} 
                          className={styles.featuredCard}
                        >
                          <Image 
                            src={item.thumbnail_url || item.image_url} 
                            alt={item.title}
                            fill
                            sizes="(max-width: 767px) 25vw, 15vw"
                            style={{ objectFit: 'cover' }}
                          />
                          <div className={styles.featuredCardContent}>
                            <h3 className={styles.featuredCardTitle}>{item.title}</h3>
                            <div className={styles.featuredCardMeta}>
                              <div className={styles.featuredCardCreator}>
                                <div className={styles.featuredCardAvatar}>
                                  {item.profiles?.avatar_url && (
                                    <Image 
                                      src={item.profiles.avatar_url} 
                                      alt="" 
                                      width={16} 
                                      height={16}
                                      sizes="16px"
                                    />
                                  )}
                                </div>
                                <span>{item.profiles?.display_name || '名前未設定'}</span>
                              </div>
                              <div className={styles.featuredCardStats}>
                                <span><i className="fas fa-heart"></i> {item.likeCount}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* ソートタブ */}
                <div className={styles.sortTabs}>
                  {SORT_TABS.map(tab => (
                    <button
                      key={tab.value}
                      onClick={() => setSortOrder(tab.value)}
                      className={`${styles.sortTab} ${sortOrder === tab.value ? styles.active : ''}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* サムネイルグリッド */}
                <div className={styles.worksGrid}>
                  {paginatedItems.map((item) => (
                    <Link 
                      key={item.id} 
                      href={`/portfolio/${item.id}`} 
                      className={styles.workCard}
                    >
                      {/* 画像 */}
                      <div className={styles.workCardImage}>
                        {item.thumbnail_url || item.image_url ? (
                          <Image 
                            src={item.thumbnail_url || item.image_url} 
                            alt={item.title}
                            fill
                            sizes="(max-width: 479px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 180px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div className={styles.placeholder}>
                            <i className="fa-regular fa-image"></i>
                          </div>
                        )}
                      </div>

                      {/* バッジ */}
                      <span className={styles.cardBadge}>{getCategoryLabel(item.category)}</span>
                      
                      {/* NEW / HOT ラベル */}
                      {isNew(item.created_at) && !isHot(item.likeCount) && (
                        <span className={`${styles.cardLabel} ${styles.new}`}>NEW</span>
                      )}
                      {isHot(item.likeCount) && (
                        <span className={`${styles.cardLabel} ${styles.hot}`}>🔥</span>
                      )}

                      {/* ホバー時に表示される情報 */}
                      <div className={styles.cardInfo}>
                        <h3 className={styles.cardTitle}>{item.title}</h3>
                        <div className={styles.cardMeta}>
                          <div className={styles.cardCreator}>
                            <div className={styles.creatorAvatar}>
                              {item.profiles?.avatar_url ? (
                                <Image 
                                  src={item.profiles.avatar_url} 
                                  alt="" 
                                  width={18} 
                                  height={18}
                                  sizes="18px"
                                />
                              ) : (
                                <i className="fas fa-user"></i>
                              )}
                            </div>
                            <span className={styles.creatorName}>
                              {item.profiles?.display_name || '名前未設定'}
                            </span>
                          </div>
                          <div className={styles.cardStats}>
                            <span className={styles.statItem}>
                              <i className="fas fa-heart"></i>
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