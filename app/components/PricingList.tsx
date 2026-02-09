'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import { PricingGridSkeleton } from '@/app/components/Skeleton'
import styles from './PricingList.module.css'

type PricingPlan = {
  id: string
  plan_name: string
  thumbnail_url: string
  minimum_price: number
  category: string
  creator_id: string
  created_at: string
  profiles: {
    user_id: string
    username: string
    display_name: string
    avatar_url: string | null
    is_accepting_orders: boolean
  }
  averageRating: number
  reviewCount: number
}

const CATEGORIES = [
  { value: 'illustration', label: 'イラスト', path: '/pricing/illustration', icon: 'fa-image' },
  { value: 'manga', label: 'マンガ', path: '/pricing/manga', icon: 'fa-book' },
  { value: 'novel', label: '小説', path: '/pricing/novel', icon: 'fa-file-alt' },
  { value: 'music', label: '音楽', path: '/pricing/music', icon: 'fa-music' },
  { value: 'voice', label: 'ボイス', path: '/pricing/voice', icon: 'fa-microphone' },
  { value: 'video', label: '動画', path: '/pricing/video', icon: 'fa-video' },
  { value: 'other', label: 'その他', path: '/pricing/other', icon: 'fa-ellipsis-h' }
]

const PRICE_RANGES = [
  { value: '', label: 'すべての価格' },
  { value: '0-5000', label: '〜¥5,000' },
  { value: '5000-10000', label: '¥5,000〜¥10,000' },
  { value: '10000-30000', label: '¥10,000〜¥30,000' },
  { value: '30000-', label: '¥30,000〜' }
]

const SORT_OPTIONS = [
  { value: 'newest', label: '新着順' },
  { value: 'price_low', label: '料金が安い順' },
  { value: 'price_high', label: '料金が高い順' },
  { value: 'rating', label: '評価順' }
]

type PricingListProps = {
  category?: string
  pageTitle?: string
  pageDescription?: string
}

export default function PricingList({ category, pageTitle, pageDescription }: PricingListProps) {
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [filteredPlans, setFilteredPlans] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [priceRange, setPriceRange] = useState('')
  const [acceptingOnly, setAcceptingOnly] = useState(false)
  const [sortOrder, setSortOrder] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchPricingPlans()
  }, [category])

  useEffect(() => {
    applyFilters()
    setCurrentPage(1)
  }, [pricingPlans, priceRange, acceptingOnly, sortOrder])

  async function fetchPricingPlans() {
    setLoading(true)
    
    try {
      let query = supabase
        .from('pricing_plans')
        .select('id, plan_name, thumbnail_url, minimum_price, category, creator_id, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (category) {
        query = query.eq('category', category)
      }

      const { data: plans, error } = await query

      if (error || !plans?.length) {
        setPricingPlans([])
        setFilteredPlans([])
        setLoading(false)
        return
      }

      const validPlans = plans.filter(p => p.creator_id !== null)
      if (!validPlans.length) {
        setPricingPlans([])
        setFilteredPlans([])
        setLoading(false)
        return
      }

      const creatorIds = [...new Set(validPlans.map(p => p.creator_id))]
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, is_accepting_orders')
        .in('id', creatorIds)

      const creatorMap = new Map()
      creators?.forEach(c => creatorMap.set(c.id, c))

      const { data: reviews } = await supabase
        .from('reviews')
        .select('reviewee_id, rating')
        .in('reviewee_id', creatorIds)

      const reviewMap = new Map<string, { total: number; count: number }>()
      reviews?.forEach(r => {
        const existing = reviewMap.get(r.reviewee_id) || { total: 0, count: 0 }
        reviewMap.set(r.reviewee_id, { total: existing.total + r.rating, count: existing.count + 1 })
      })

      const plansWithDetails: PricingPlan[] = validPlans.map(plan => {
        const creator = creatorMap.get(plan.creator_id)
        const reviewData = reviewMap.get(plan.creator_id)
        return {
          ...plan,
          profiles: creator ? { ...creator, is_accepting_orders: creator.is_accepting_orders ?? false } : {
            user_id: '', username: '', display_name: '不明', avatar_url: null, is_accepting_orders: false
          },
          averageRating: reviewData ? reviewData.total / reviewData.count : 0,
          reviewCount: reviewData?.count || 0
        }
      })

      setPricingPlans(plansWithDetails)
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let result = [...pricingPlans]

    if (priceRange) {
      const [min, max] = priceRange.split('-').map(v => v ? parseInt(v) : null)
      result = result.filter(p => {
        if (min !== null && p.minimum_price < min) return false
        if (max !== null && p.minimum_price > max) return false
        return true
      })
    }

    if (acceptingOnly) {
      result = result.filter(p => p.profiles.is_accepting_orders)
    }

    switch (sortOrder) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'price_low':
        result.sort((a, b) => a.minimum_price - b.minimum_price)
        break
      case 'price_high':
        result.sort((a, b) => b.minimum_price - a.minimum_price)
        break
      case 'rating':
        result.sort((a, b) => b.averageRating - a.averageRating)
        break
    }

    setFilteredPlans(result)
  }

  function getCategoryLabel(cat: string) {
    return CATEGORIES.find(c => c.value === cat)?.label || cat
  }

  function Pagination() {
    const totalPages = Math.ceil(filteredPlans.length / itemsPerPage)
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
              href="/pricing" 
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
            {pageTitle && (
              <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>{pageTitle}</h1>
                {pageDescription && <p className={styles.pageDescription}>{pageDescription}</p>}
              </div>
            )}

            {/* モバイル用カテゴリタブ */}
            <div className={styles.mobileTabs}>
              <Link 
                href="/pricing" 
                className={`${styles.mobileTab} ${!category ? styles.active : ''}`}
              >
                <i className="fas fa-th-large"></i>
                すべて
              </Link>
              {CATEGORIES.map((cat) => (
                <Link 
                  key={cat.value} 
                  href={cat.path} 
                  className={`${styles.mobileTab} ${category === cat.value ? styles.active : ''}`}
                >
                  <i className={`fas ${cat.icon}`}></i>
                  {cat.label}
                </Link>
              ))}
            </div>

            {/* フィルターバー */}
            <div className={styles.filterBar}>
              <select 
                value={priceRange} 
                onChange={(e) => setPriceRange(e.target.value)} 
                className={`${styles.filterSelect} ${priceRange ? styles.active : ''}`}
              >
                {PRICE_RANGES.map(range => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>

              <select 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value)} 
                className={styles.filterSelect}
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <label className={styles.filterCheckbox}>
                <input 
                  type="checkbox" 
                  checked={acceptingOnly} 
                  onChange={(e) => setAcceptingOnly(e.target.checked)} 
                />
                <span className={styles.checkboxMark}></span>
                受付中のみ
              </label>

              <span className={styles.resultCount}>
                <span className={styles.resultNumber}>{filteredPlans.length}</span>件
              </span>
            </div>

            {/* スケルトン */}
            {loading && <PricingGridSkeleton count={8} />}

            {/* 空状態 */}
            {!loading && filteredPlans.length === 0 && (
              <div className={styles.emptyState}>
                <i className="fas fa-search"></i>
                <p>条件に一致するサービスがありません</p>
                <p className={styles.sub}>フィルターを変更してみてください</p>
              </div>
            )}

            {/* カード一覧 */}
            {!loading && filteredPlans.length > 0 && (
              <>
                <div className={styles.grid}>
                  {filteredPlans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((plan) => (
                    <Link 
                      key={plan.id} 
                      href={`/pricing/${plan.id}`} 
                      className={styles.card}
                    >
                      {/* 画像 */}
                      <div className={styles.cardImage}>
                        {plan.thumbnail_url ? (
                          <Image 
                            src={plan.thumbnail_url} 
                            alt={plan.plan_name}
                            fill
                            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 200px"
                          />
                        ) : (
                          <div className={styles.placeholder}>
                            <i className="far fa-image"></i>
                          </div>
                        )}
                        <span className={styles.cardBadge}>{getCategoryLabel(plan.category)}</span>
                      </div>

                      {/* カードボディ */}
                      <div className={styles.cardBody}>
                        <h3 className={styles.cardTitle}>{plan.plan_name}</h3>
                        
                        <div className={styles.cardPrice}>
                          ¥{plan.minimum_price.toLocaleString()}<span>〜</span>
                        </div>

                        <div className={styles.cardCreator}>
                          <div className={styles.creatorAvatar}>
                            {plan.profiles.avatar_url ? (
                              <Image 
                                src={plan.profiles.avatar_url} 
                                alt="" 
                                width={24} 
                                height={24}
                                sizes="24px"
                              />
                            ) : (
                              <i className="fas fa-user"></i>
                            )}
                          </div>
                          <span className={styles.creatorName}>
                            {plan.profiles.display_name || '名前未設定'}
                          </span>
                        </div>

                        <div className={styles.cardFooter}>
                          {plan.reviewCount > 0 ? (
                            <span className={styles.cardRating}>
                              <i className="fas fa-star"></i>
                              {plan.averageRating.toFixed(1)}
                              <span className={styles.count}>({plan.reviewCount})</span>
                            </span>
                          ) : (
                            <span></span>
                          )}
                          
                          <span className={`${styles.statusBadge} ${plan.profiles.is_accepting_orders ? styles.statusOpen : styles.statusClosed}`}>
                            <i className="fas fa-circle"></i>
                            {plan.profiles.is_accepting_orders ? '受付中' : '受付停止'}
                          </span>
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