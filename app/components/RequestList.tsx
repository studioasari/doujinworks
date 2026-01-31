'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import { RequestGridSkeleton } from '@/app/components/Skeleton'
import styles from './RequestList.module.css'

type WorkRequest = {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  category: string
  status: string
  request_type: string
  created_at: string
  requester_id: string
  payment_type: string | null
  hourly_rate_min: number | null
  hourly_rate_max: number | null
  price_negotiable: boolean | null
  job_features: string[] | null
  required_skills: string[] | null
  number_of_positions: number | null
  application_deadline: string | null
  profiles: {
    id: string
    display_name: string | null
    avatar_url: string | null
    username: string | null
  }
}

type BudgetRangeType = 'all' | 'under1' | '1to3' | '3to5' | '5to10' | '10to30' | 'over30'

const CATEGORIES = [
  { value: 'all', label: 'すべて', icon: null },
  { value: 'illustration', label: 'イラスト', icon: 'fa-image' },
  { value: 'manga', label: 'マンガ', icon: 'fa-book' },
  { value: 'novel', label: '小説', icon: 'fa-file-alt' },
  { value: 'music', label: '音楽', icon: 'fa-music' },
  { value: 'design', label: 'デザイン', icon: 'fa-palette' },
  { value: 'video', label: '動画', icon: 'fa-video' },
  { value: 'other', label: 'その他', icon: 'fa-ellipsis-h' },
]

const BUDGET_RANGES = [
  { value: 'all', label: '指定なし' },
  { value: 'under1', label: '〜1万円' },
  { value: '1to3', label: '1万〜3万円' },
  { value: '3to5', label: '3万〜5万円' },
  { value: '5to10', label: '5万〜10万円' },
  { value: '10to30', label: '10万〜30万円' },
  { value: 'over30', label: '30万円〜' },
]

const PAYMENT_TYPES = [
  { value: 'all', label: '指定なし' },
  { value: 'fixed', label: '固定報酬制' },
  { value: 'hourly', label: '時間単価制' },
]

const JOB_FEATURES = [
  { value: 'all', label: '指定なし' },
  { value: 'no_skill', label: 'スキル不要' },
  { value: 'skill_welcome', label: '専門スキル歓迎' },
  { value: 'one_time', label: '単発' },
  { value: 'continuous', label: '継続あり' },
  { value: 'flexible_time', label: 'スキマ時間歓迎' },
]

export default function RequestList() {
  const [requests, setRequests] = useState<WorkRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<WorkRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [budgetRange, setBudgetRange] = useState<BudgetRangeType>('all')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'fixed' | 'hourly'>('all')
  const [jobFeatureFilter, setJobFeatureFilter] = useState<string>('all')
  
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [currentProfileId])

  useEffect(() => {
    applyFilters()
  }, [requests, categoryFilter, searchQuery, budgetRange, paymentTypeFilter, jobFeatureFilter])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      setIsLoggedIn(true)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        setCurrentProfileId(profile.id)
      }
    } else {
      setIsLoggedIn(false)
    }
  }

  async function fetchRequests() {
    setLoading(true)

    let query = supabase
      .from('work_requests')
      .select('*, profiles!work_requests_requester_id_fkey(id, display_name, avatar_url, username)')
      .eq('request_type', 'public')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('依頼取得エラー:', error)
    } else {
      setRequests(data || [])
    }

    setLoading(false)
  }

  function applyFilters() {
    let filtered = [...requests]

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === categoryFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(query) || 
        r.description.toLowerCase().includes(query) ||
        r.required_skills?.some(skill => skill.toLowerCase().includes(query))
      )
    }

    if (budgetRange !== 'all') {
      filtered = filtered.filter(r => {
        const max = r.budget_max || 0
        const min = r.budget_min || 0
        const budget = max || min
        
        switch (budgetRange) {
          case 'under1': return budget > 0 && budget <= 10000
          case '1to3': return budget > 10000 && budget <= 30000
          case '3to5': return budget > 30000 && budget <= 50000
          case '5to10': return budget > 50000 && budget <= 100000
          case '10to30': return budget > 100000 && budget <= 300000
          case 'over30': return budget > 300000
          default: return true
        }
      })
    }

    if (paymentTypeFilter !== 'all') {
      filtered = filtered.filter(r => r.payment_type === paymentTypeFilter)
    }

    if (jobFeatureFilter !== 'all') {
      filtered = filtered.filter(r => 
        r.job_features?.includes(jobFeatureFilter)
      )
    }

    setFilteredRequests(filtered)
  }

  function getCategoryLabel(category: string) {
    return CATEGORIES.find(c => c.value === category)?.label || category
  }

  function getCategoryIcon(category: string) {
    return CATEGORIES.find(c => c.value === category)?.icon || 'fa-file'
  }

  function getJobFeatureLabel(feature: string) {
    return JOB_FEATURES.find(f => f.value === feature)?.label || feature
  }

  return (
    <>
      <Header />
      <div className={styles.page}>
        {/* サイドバー */}
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>
            <button 
              onClick={() => setCategoryFilter('all')}
              className={`${styles.navItem} ${categoryFilter === 'all' ? styles.active : ''}`}
            >
              すべて
            </button>
          </nav>
          <div className={styles.separator}></div>
          
          {/* カテゴリ */}
          <div className={styles.sidebarSection}>
            <div className={styles.sectionTitle}>カテゴリ</div>
            {CATEGORIES.filter(c => c.value !== 'all').map((cat) => (
              <button 
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`${styles.navItem} ${categoryFilter === cat.value ? styles.active : ''}`}
              >
                {cat.icon && <i className={`fas ${cat.icon}`}></i>}
                {cat.label}
              </button>
            ))}
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className={styles.main}>
          <div className={styles.mainInner}>
            {/* ページヘッダー */}
            <div className={styles.pageHeader}>
              <div className={styles.pageHeaderLeft}>
                <h1 className={styles.pageTitle}>依頼一覧</h1>
                {!loading && (
                  <span className={styles.pageCount}>{filteredRequests.length}件</span>
                )}
              </div>
              {isLoggedIn && (
                <Link href="/requests/create" className="btn btn-primary btn-sm">
                  <i className="fas fa-plus"></i>
                  新規作成
                </Link>
              )}
            </div>

            {/* モバイル用カテゴリタブ */}
            <div className={styles.mobileTabs}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`${styles.mobileTab} ${categoryFilter === cat.value ? styles.active : ''}`}
                >
                  {cat.icon && <i className={`fas ${cat.icon}`}></i>}
                  {cat.label}
                </button>
              ))}
            </div>

            {/* モバイル用フィルター */}
            <div className={styles.mobileFilters}>
              <select
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value as BudgetRangeType)}
                className={`${styles.mobileFilterSelect} ${budgetRange !== 'all' ? styles.active : ''}`}
              >
                <option value="all">予算</option>
                {BUDGET_RANGES.filter(r => r.value !== 'all').map((range) => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>

              <select
                value={paymentTypeFilter}
                onChange={(e) => setPaymentTypeFilter(e.target.value as 'all' | 'fixed' | 'hourly')}
                className={`${styles.mobileFilterSelect} ${paymentTypeFilter !== 'all' ? styles.active : ''}`}
              >
                <option value="all">支払い方式</option>
                {PAYMENT_TYPES.filter(t => t.value !== 'all').map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              <select
                value={jobFeatureFilter}
                onChange={(e) => setJobFeatureFilter(e.target.value)}
                className={`${styles.mobileFilterSelect} ${jobFeatureFilter !== 'all' ? styles.active : ''}`}
              >
                <option value="all">特徴</option>
                {JOB_FEATURES.filter(f => f.value !== 'all').map((feature) => (
                  <option key={feature.value} value={feature.value}>{feature.label}</option>
                ))}
              </select>
            </div>

            {/* フィルターバー */}
            <div className={styles.filterBar}>
              <div className={styles.searchWrapper}>
                <i className={`fas fa-magnifying-glass ${styles.searchIcon}`}></i>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="タイトル、説明、スキルで検索"
                  className={styles.searchInput}
                />
              </div>

              <select
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value as BudgetRangeType)}
                className={`${styles.filterSelect} ${budgetRange !== 'all' ? styles.active : ''}`}
              >
                <option value="all">予算</option>
                {BUDGET_RANGES.filter(r => r.value !== 'all').map((range) => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>

              <select
                value={paymentTypeFilter}
                onChange={(e) => setPaymentTypeFilter(e.target.value as 'all' | 'fixed' | 'hourly')}
                className={`${styles.filterSelect} ${paymentTypeFilter !== 'all' ? styles.active : ''}`}
              >
                <option value="all">支払い方式</option>
                {PAYMENT_TYPES.filter(t => t.value !== 'all').map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              <select
                value={jobFeatureFilter}
                onChange={(e) => setJobFeatureFilter(e.target.value)}
                className={`${styles.filterSelect} ${jobFeatureFilter !== 'all' ? styles.active : ''}`}
              >
                <option value="all">特徴</option>
                {JOB_FEATURES.filter(f => f.value !== 'all').map((feature) => (
                  <option key={feature.value} value={feature.value}>{feature.label}</option>
                ))}
              </select>
            </div>

            {/* スケルトン */}
            {loading && <RequestGridSkeleton count={6} />}

            {/* 空の状態 */}
            {!loading && filteredRequests.length === 0 && (
              <div className={styles.emptyState}>
                <i className="far fa-folder-open"></i>
                <p>
                  {searchQuery ? '検索条件に一致する依頼が見つかりませんでした' : '依頼が見つかりませんでした'}
                </p>
                <p className={styles.sub}>別の条件で検索してみてください</p>
              </div>
            )}

            {/* 依頼一覧 */}
            {!loading && filteredRequests.length > 0 && (
              <div className={styles.grid}>
                {filteredRequests.map((request) => {
                  const daysUntilDeadline = request.application_deadline 
                    ? Math.ceil((new Date(request.application_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : null
                  
                  const hasSkills = request.required_skills && request.required_skills.length > 0
                  const hasFeatures = request.job_features && request.job_features.length > 0
                  
                  return (
                    <Link
                      key={request.id}
                      href={`/requests/${request.id}`}
                      className={styles.card}
                    >
                      {/* カテゴリバッジ */}
                      <div className={styles.cardBadge}>
                        <i className={`fas ${getCategoryIcon(request.category)}`}></i>
                        {getCategoryLabel(request.category)}
                      </div>

                      {/* タイトル */}
                      <h2 className={styles.cardTitle}>{request.title}</h2>

                      {/* 説明 */}
                      <p className={styles.cardDesc}>{request.description}</p>

                      {/* stats行 */}
                      <div className={styles.statsRow}>
                        <div className={styles.statItem}>
                          <i className="fas fa-user"></i>
                          <span>0/{request.number_of_positions || 1}人</span>
                        </div>
                        <div className={styles.statItem}>
                          <i className="fas fa-clock"></i>
                          {request.application_deadline && daysUntilDeadline !== null ? (
                            daysUntilDeadline > 0 ? (
                              <span>あと{daysUntilDeadline}日</span>
                            ) : daysUntilDeadline === 0 ? (
                              <span className={styles.statUrgent}>本日締切</span>
                            ) : (
                              <span className={styles.statExpired}>締切済み</span>
                            )
                          ) : (
                            <span>期限なし</span>
                          )}
                        </div>
                      </div>

                      {/* タグエリア */}
                      <div className={styles.tags}>
                        {hasSkills && (
                          <>
                            {request.required_skills!.slice(0, 3).map((skill, index) => (
                              <span key={index} className={styles.skillTag}>{skill}</span>
                            ))}
                            {request.required_skills!.length > 3 && (
                              <span className={styles.moreTags}>+{request.required_skills!.length - 3}</span>
                            )}
                          </>
                        )}
                        {hasFeatures && (
                          <>
                            {request.job_features!.slice(0, 2).map((feature, index) => (
                              <span key={`feature-${index}`} className={styles.featureTag}>
                                <i className="fas fa-check"></i>
                                {getJobFeatureLabel(feature)}
                              </span>
                            ))}
                          </>
                        )}
                      </div>

                      {/* フッター */}
                      <div className={styles.cardFooter}>
                        <div className={styles.requesterInfo}>
                          <div className={styles.requesterAvatar}>
                            {request.profiles?.avatar_url ? (
                              <Image 
                                src={request.profiles.avatar_url} 
                                alt={request.profiles.display_name || ''} 
                                width={24}
                                height={24}
                                sizes="24px"
                              />
                            ) : (
                              <i className="fas fa-user"></i>
                            )}
                          </div>
                          <span className={styles.requesterName}>
                            {request.profiles?.display_name || '名前未設定'}
                          </span>
                        </div>
                        
                        {/* 価格 */}
                        {request.payment_type === 'hourly' ? (
                          <span className={styles.cardPrice}>
                            {request.hourly_rate_min ? (
                              <>{request.hourly_rate_min.toLocaleString()}<span>円/時〜</span></>
                            ) : (
                              <span className={styles.cardPriceNegotiable}>応相談</span>
                            )}
                          </span>
                        ) : request.price_negotiable ? (
                          <span className={styles.cardPriceNegotiable}>相談して決める</span>
                        ) : request.budget_min || request.budget_max ? (
                          <span className={styles.cardPrice}>
                            {request.budget_max ? (
                              <>¥{request.budget_max.toLocaleString()}</>
                            ) : (
                              <>{request.budget_min?.toLocaleString()}<span>円〜</span></>
                            )}
                          </span>
                        ) : (
                          <span className={styles.cardPriceNegotiable}>要相談</span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}