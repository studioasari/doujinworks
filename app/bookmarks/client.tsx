'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import { WorkGridSkeleton } from '@/app/components/Skeleton'
import styles from './page.module.css'

type BookmarkedItem = {
  id: string
  bookmarkId: string
  title: string
  image_url: string
  thumbnail_url: string | null
  creator_id: string
  category: string
  created_at: string
  bookmarked_at: string
  profiles: {
    username: string
    display_name: string
    avatar_url: string | null
  }
  likeCount: number
  commentCount: number
}

const CATEGORIES: { [key: string]: string } = {
  'illustration': 'イラスト',
  'manga': 'マンガ',
  'novel': '小説',
  'music': '音楽',
  'voice': 'ボイス',
  'video': '動画'
}

const SORT_TABS = [
  { value: 'newest', label: '保存日順' },
  { value: 'popular', label: '人気順' },
]

export default function BookmarksClient() {
  const router = useRouter()
  const [items, setItems] = useState<BookmarkedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const itemsPerPage = 30

  useEffect(() => {
    checkAuthAndFetch()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [sortOrder])

  async function checkAuthAndFetch() {
    try {
      const { data, error } = await supabase.auth.getUser()
      
      if (error || !data?.user) {
        router.push('/login?redirect=/bookmarks')
        return
      }
      
      setUserId(data.user.id)
      await fetchBookmarks(data.user.id)
    } catch (error) {
      console.error('認証エラー:', error)
      router.push('/login?redirect=/bookmarks')
    }
  }

  async function fetchBookmarks(uid: string) {
    setLoading(true)
    
    try {
      // ブックマーク取得
      const { data: bookmarks, error: bookmarkError } = await supabase
        .from('bookmarks')
        .select('id, portfolio_item_id, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      if (bookmarkError || !bookmarks?.length) {
        setItems([])
        setLoading(false)
        return
      }

      const portfolioIds = bookmarks.map(b => b.portfolio_item_id)
      const bookmarkMap = new Map(bookmarks.map(b => [b.portfolio_item_id, { id: b.id, created_at: b.created_at }]))

      // 作品情報取得
      const { data: portfolioItems, error: portfolioError } = await supabase
        .from('portfolio_items')
        .select('id, title, image_url, thumbnail_url, creator_id, category, created_at')
        .in('id', portfolioIds)

      if (portfolioError || !portfolioItems?.length) {
        setItems([])
        setLoading(false)
        return
      }

      // クリエイター情報取得
      const creatorIds = [...new Set(portfolioItems.map(w => w.creator_id).filter(Boolean))]
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url')
        .in('user_id', creatorIds)

      const creatorMap = new Map()
      creatorsData?.forEach(c => creatorMap.set(c.user_id, c))

      // いいね・コメント数取得
      const ids = portfolioItems.map(w => w.id)
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from('portfolio_likes').select('portfolio_item_id').in('portfolio_item_id', ids),
        supabase.from('comments').select('portfolio_item_id').in('portfolio_item_id', ids)
      ])

      const likeMap = new Map()
      likes?.forEach(l => likeMap.set(l.portfolio_item_id, (likeMap.get(l.portfolio_item_id) || 0) + 1))
      
      const commentMap = new Map()
      comments?.forEach(c => commentMap.set(c.portfolio_item_id, (commentMap.get(c.portfolio_item_id) || 0) + 1))

      // データ結合
      const itemsWithStats = portfolioItems.map((item: any) => {
        const bookmark = bookmarkMap.get(item.id)
        return {
          ...item,
          bookmarkId: bookmark?.id || '',
          bookmarked_at: bookmark?.created_at || item.created_at,
          profiles: creatorMap.get(item.creator_id) || {
            username: '',
            display_name: '不明',
            avatar_url: null
          },
          likeCount: likeMap.get(item.id) || 0,
          commentCount: commentMap.get(item.id) || 0
        }
      })

      setItems(itemsWithStats)
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  async function removeBookmark(e: React.MouseEvent, bookmarkId: string, itemId: string) {
    e.preventDefault()
    e.stopPropagation()
    
    if (removingId) return
    setRemovingId(itemId)

    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId)

      if (!error) {
        setItems(prev => prev.filter(item => item.id !== itemId))
      }
    } catch (error) {
      console.error('ブックマーク削除エラー:', error)
    } finally {
      setRemovingId(null)
    }
  }

  // ソート済みアイテム
  const sortedItems = useMemo(() => {
    let result = [...items]
    
    switch (sortOrder) {
      case 'newest':
        result.sort((a, b) => new Date(b.bookmarked_at).getTime() - new Date(a.bookmarked_at).getTime())
        break
      case 'popular':
        result.sort((a, b) => b.likeCount - a.likeCount)
        break
    }
    
    return result
  }, [items, sortOrder])

  // ページ分割
  const paginatedItems = useMemo(() => {
    return sortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [sortedItems, currentPage])

  function getCategoryLabel(cat: string) {
    return CATEGORIES[cat] || cat
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

  // ローディング
  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <main className={styles.main}>
            <div className={styles.mainInner}>
              <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>保存した作品</h1>
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
        <main className={styles.main}>
          <div className={styles.mainInner}>
            {/* ページヘッダー */}
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>
                保存した作品
                <span className={styles.pageCount}>{items.length}件</span>
              </h1>
            </div>

            {/* 空状態 */}
            {items.length === 0 && (
              <div className={styles.emptyState}>
                <i className="fa-regular fa-bookmark"></i>
                <p>保存した作品はありません</p>
                <span className={styles.sub}>気になる作品をブックマークして、後で見返しましょう</span>
                <Link href="/portfolio" className={styles.emptyBtn}>
                  作品を探す
                </Link>
              </div>
            )}

            {/* コンテンツ */}
            {items.length > 0 && (
              <>
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

                {/* グリッド */}
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

                      {/* カテゴリバッジ */}
                      <span className={styles.cardBadge}>{getCategoryLabel(item.category)}</span>

                      {/* 削除ボタン */}
                      <button 
                        className={styles.removeBtn}
                        onClick={(e) => removeBookmark(e, item.bookmarkId, item.id)}
                        disabled={removingId === item.id}
                        aria-label="保存を解除"
                      >
                        <i className={removingId === item.id ? "fas fa-spinner fa-spin" : "fas fa-bookmark"}></i>
                      </button>

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