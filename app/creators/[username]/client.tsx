'use client'

import { useEffect, useState, useMemo, useCallback, memo, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { useAuth } from '@/app/components/AuthContext'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { WorkGridSkeleton } from '../../components/Skeleton'
import styles from './page.module.css'

type Creator = {
  id: string
  user_id: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  header_url: string | null
  twitter_url: string | null
  pixiv_url: string | null
  website_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  account_type: string | null
  job_title: string | null
  can_receive_work: boolean
  can_request_work: boolean
  created_at: string
}

type PortfolioItem = {
  id: string
  title: string
  category: string | null
  thumbnail_url: string | null
}

type PricingPlan = {
  id: string
  category: string
  plan_name: string
  thumbnail_url: string
  sample_images: { url: string; order: number }[]
  minimum_price: number
  description: string
  is_public: boolean
  display_order: number
  created_at: string
}

type Review = {
  id: string
  work_request_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer: {
    display_name: string | null
    avatar_url: string | null
    username: string | null
  }
  work_request: {
    title: string
  }
}

const CATEGORY_LABELS: { [key: string]: string } = {
  'illustration': 'イラスト',
  'manga': 'マンガ',
  'novel': '小説',
  'music': '音楽',
  'voice': 'ボイス',
  'video': '動画',
  'logo': 'ロゴ',
  'thumbnail': 'サムネイル',
  'profile': '自己紹介画像',
  'other': 'その他'
}

const CATEGORY_ORDER = ['illustration', 'manga', 'novel', 'music', 'voice', 'video']

function getCategoryLabel(category: string | null): string {
  if (!category) return 'その他'
  return CATEGORY_LABELS[category] || category
}

function BioText({ bio, maxLength }: { bio: string; maxLength: number }) {
  const [expanded, setExpanded] = useState(false)
  const needsTruncate = bio.length > maxLength

  return (
    <div className={styles.bioWrapper}>
      <p className={styles.bio}>
        {needsTruncate && !expanded ? bio.slice(0, maxLength) + '…' : bio}
      </p>
      {needsTruncate && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={styles.bioToggle}
        >
          {expanded ? '閉じる' : 'もっと見る'}
        </button>
      )}
    </div>
  )
}

const WorkCard = memo(({ work }: { work: PortfolioItem }) => {
  return (
    <Link href={`/portfolio/${work.id}`} className="card">
      <div className="card-image">
        {work.thumbnail_url ? (
          <Image
            src={work.thumbnail_url}
            alt={work.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy"
            quality={75}
          />
        ) : (
          <i className="fa-regular fa-image"></i>
        )}
        <span className="overlay-badge overlay-badge-top-left">
          {getCategoryLabel(work.category)}
        </span>
      </div>
      <div className="card-body">
        <h3 className="card-title">{work.title}</h3>
      </div>
    </Link>
  )
})

WorkCard.displayName = 'WorkCard'

// プロフィールスケルトン
function ProfileSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.headerBg}>
        <div className="skeleton" style={{ width: '100%', height: '100%' }}></div>
      </div>
      <div className={styles.container}>
        <div className={`card ${styles.profileCard}`}>
          <div className={styles.profileLayout}>
            <div className="skeleton skeleton-avatar" style={{ width: 100, height: 100 }}></div>
            <div className={styles.profileInfo}>
              <div className={styles.profileHeader}>
                <div className={styles.profileNames}>
                  <div className="skeleton skeleton-text" style={{ width: 60, height: 14, marginBottom: 8 }}></div>
                  <div className="skeleton skeleton-text" style={{ width: 180, height: 28, marginBottom: 8 }}></div>
                  <div className="skeleton skeleton-text" style={{ width: 100, height: 14 }}></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 8 }}></div>
                  <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 8 }}></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                <div className="skeleton skeleton-text" style={{ width: 80, height: 16 }}></div>
                <div className="skeleton skeleton-text" style={{ width: 80, height: 16 }}></div>
              </div>
              <div className="skeleton skeleton-text" style={{ width: '100%', height: 60 }}></div>
            </div>
          </div>
        </div>
        <div className="tabs" style={{ marginBottom: 24 }}>
          <div className="skeleton" style={{ flex: 1, height: 40 }}></div>
          <div className="skeleton" style={{ flex: 1, height: 40 }}></div>
          <div className="skeleton" style={{ flex: 1, height: 40 }}></div>
        </div>
        <WorkGridSkeleton count={8} />
      </div>
    </div>
  )
}

// レビュースケルトン
function ReviewsSkeleton() {
  return (
    <div className={styles.reviewsLayout}>
      <div className={`card ${styles.reviewsStatsCard}`}>
        <div className="skeleton skeleton-text" style={{ width: 60, height: 48, margin: '0 auto 8px' }}></div>
        <div className="skeleton skeleton-text" style={{ width: 100, height: 20, margin: '0 auto 8px' }}></div>
        <div className="skeleton skeleton-text" style={{ width: 80, height: 14, margin: '0 auto 20px' }}></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div className="skeleton skeleton-text" style={{ width: 16, height: 14 }}></div>
            <div className="skeleton" style={{ flex: 1, height: 8, borderRadius: 4 }}></div>
            <div className="skeleton skeleton-text" style={{ width: 20, height: 14 }}></div>
          </div>
        ))}
      </div>
      <div className={styles.reviewsList}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`card ${styles.reviewCard}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div className="skeleton skeleton-avatar" style={{ width: 32, height: 32 }}></div>
              <div>
                <div className="skeleton skeleton-text" style={{ width: 100, height: 14, marginBottom: 4 }}></div>
                <div className="skeleton skeleton-text" style={{ width: 80, height: 12 }}></div>
              </div>
            </div>
            <div className="skeleton skeleton-text" style={{ width: 100, height: 16, marginBottom: 8 }}></div>
            <div className="skeleton skeleton-text" style={{ width: '100%', height: 40 }}></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CreatorDetailClient({ params }: { params: Promise<{ username: string }> }) {
  const unwrappedParams = use(params)
  const username = unwrappedParams.username
  const router = useRouter()
  const { userId: currentUserId, requireAuth } = useAuth()
  
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [creator, setCreator] = useState<Creator | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [worksLoading, setWorksLoading] = useState(true)
  const [pricingLoading, setPricingLoading] = useState(true)
  const [mainTab, setMainTab] = useState<'works' | 'pricing' | 'reviews'>('works')
  const [worksCategoryTab, setWorksCategoryTab] = useState<string>('all')
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [averageRating, setAverageRating] = useState<number>(0)
  const [totalReviews, setTotalReviews] = useState<number>(0)

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(portfolioItems.map(work => work.category).filter(Boolean) as string[]))
    return CATEGORY_ORDER.filter(cat => uniqueCategories.includes(cat))
  }, [portfolioItems])

  const filteredWorks = useMemo(() => {
    if (worksCategoryTab === 'all') return portfolioItems
    return portfolioItems.filter(work => work.category === worksCategoryTab)
  }, [worksCategoryTab, portfolioItems])

  const isOwnProfile = useMemo(() => {
    return currentProfileId && creator && currentProfileId === creator.id
  }, [currentProfileId, creator])

  useEffect(() => { loadProfile() }, [currentUserId])
  useEffect(() => { if (username) fetchCreator() }, [username])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (isShareDropdownOpen && !target.closest('.share-dropdown-container')) {
        setIsShareDropdownOpen(false)
      }
    }
    if (isShareDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isShareDropdownOpen])

  async function loadProfile() {
    if (!currentUserId) {
      setCurrentProfileId('')
      return
    }
    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', currentUserId).single()
      if (profile) setCurrentProfileId(profile.id)
    } catch (error) {
      console.error('プロフィール取得エラー:', error)
    }
  }

  async function fetchCreator() {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').eq('username', username).single()
    if (error) {
      console.error('クリエイター取得エラー:', error)
      setCreator(null)
    } else {
      setCreator(data)
      if (data) {
        await Promise.all([
          fetchPortfolio(data.user_id),
          fetchPricingPlans(data.id),
          fetchStats(data.user_id),
          fetchReviews(data.id)
        ])
      }
    }
    setLoading(false)
  }

  async function fetchReviews(creatorId: string) {
    setReviewsLoading(true)
    const { data, error } = await supabase
      .from('reviews')
      .select(`*, reviewer:profiles!reviews_reviewer_id_fkey(display_name, avatar_url, username), work_request:work_requests(title)`)
      .eq('reviewee_id', creatorId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('レビュー取得エラー:', error)
      setReviews([])
    } else {
      setReviews(data || [])
      if (data && data.length > 0) {
        const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length
        setAverageRating(Math.round(avg * 10) / 10)
        setTotalReviews(data.length)
      } else {
        setAverageRating(0)
        setTotalReviews(0)
      }
    }
    setReviewsLoading(false)
  }

  async function fetchPortfolio(userId: string) {
    setWorksLoading(true)
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('id, title, category, thumbnail_url')
      .eq('creator_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('ポートフォリオ取得エラー:', error)
      setPortfolioItems([])
    } else {
      setPortfolioItems(data || [])
    }
    setWorksLoading(false)
  }

  async function fetchPricingPlans(creatorId: string) {
    setPricingLoading(true)
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('is_public', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('料金表取得エラー:', error)
      setPricingPlans([])
    } else {
      setPricingPlans(data || [])
    }
    setPricingLoading(false)
  }

  async function fetchStats(userId: string) {
    const [{ count: followerCnt }, { count: followingCnt }, { data: followData }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      currentUserId ? supabase.from('follows').select('*').eq('follower_id', currentUserId).eq('following_id', userId).maybeSingle() : Promise.resolve({ data: null })
    ])
    setFollowerCount(followerCnt || 0)
    setFollowingCount(followingCnt || 0)
    setIsFollowing(!!followData)
  }

  const handleFollow = useCallback(async () => {
    if (!requireAuth()) return
    if (!creator) return

    try {
      if (isFollowing) {
        if (!confirm('フォローを解除しますか？')) return
        await supabase.from('follows').delete().eq('follower_id', currentUserId!).eq('following_id', creator.user_id)
        setIsFollowing(false)
        setFollowerCount(prev => prev - 1)
      } else {
        await supabase.from('follows').insert({ follower_id: currentUserId!, following_id: creator.user_id })
        setIsFollowing(true)
        setFollowerCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('フォロー処理エラー:', error)
    }
  }, [currentUserId, creator, isFollowing, requireAuth])

  const handleShare = useCallback((platform: 'twitter' | 'facebook' | 'line' | 'copy') => {
    const url = `${window.location.origin}/creators/${username}`
    const text = creator ? `${creator.display_name}さんのプロフィール` : 'クリエイタープロフィール'

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
        break
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
        break
      case 'line':
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text + ' ' + url)}`, '_blank')
        break
      case 'copy':
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            alert('プロフィールURLをコピーしました！')
            setIsShareDropdownOpen(false)
          }).catch(() => fallbackCopyToClipboard(url))
        } else {
          fallbackCopyToClipboard(url)
        }
        break
    }
    if (platform !== 'copy') setIsShareDropdownOpen(false)
  }, [username, creator])

  function fallbackCopyToClipboard(text: string) {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      const successful = document.execCommand('copy')
      if (successful) {
        alert('プロフィールURLをコピーしました！')
        setIsShareDropdownOpen(false)
      } else {
        alert('URLのコピーに失敗しました')
      }
    } catch (err) {
      console.error('コピーエラー:', err)
      alert('URLのコピーに失敗しました')
    }
    document.body.removeChild(textArea)
  }

  // ローディング状態
  if (loading) {
    return (
      <>
        <Header />
        <ProfileSkeleton />
        <Footer />
      </>
    )
  }

  // 404状態
  if (!creator) {
    return (
      <>
        <Header />
        <div className={styles.notFoundContainer}>
          <div className="empty-state">
            <i className="fa-regular fa-user"></i>
            <p>クリエイターが見つかりません</p>
            <Link href="/portfolio" className="btn btn-primary">作品一覧に戻る</Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className={styles.page}>
        {/* ヘッダー背景 */}
        <div className={styles.headerBg}>
          {creator.header_url && (
            <>
              <Image 
                src={creator.header_url} 
                alt="" 
                fill 
                sizes="100vw" 
                quality={85} 
                priority 
              />
              <div className={styles.headerOverlay}></div>
            </>
          )}
        </div>

        <div className={styles.container}>
          {/* プロフィールカード */}
          <div className={`card ${styles.profileCard}`}>
            <div className={styles.profileLayout}>
              {/* アバター */}
              <div className={`avatar avatar-xl ${styles.avatar} ${creator.avatar_url ? styles.hasImage : ''}`}>
                {creator.avatar_url ? (
                  <Image 
                    src={creator.avatar_url} 
                    alt={creator.display_name || ''} 
                    width={120} 
                    height={120}
                    sizes="120px"
                    priority 
                  />
                ) : (
                  <i className="fas fa-user"></i>
                )}
              </div>

              {/* プロフィール情報 */}
              <div className={styles.profileInfo}>
                <div className={styles.profileHeader}>
                  <div className={styles.profileNames}>
                    {creator.job_title && (
                      <span className={styles.jobTitle}>{creator.job_title}</span>
                    )}
                    <h1 className={styles.displayName}>
                      {creator.display_name || '名前未設定'}
                    </h1>
                    {creator.username && (
                      <span className={styles.username}>@{creator.username}</span>
                    )}
                  </div>

                  <div className={styles.actionButtons}>
                    {!isOwnProfile ? (
                      <>
                        <button 
                          onClick={handleFollow} 
                          className={`btn btn-sm ${styles.actionBtn} ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                        >
                          {isFollowing ? 'フォロー中' : 'フォロー'}
                        </button>
                        {creator.account_type === 'business' && creator.can_receive_work && (
                          <button
                            onClick={() => {
                              if (!requireAuth()) return
                              window.location.href = `/requests/create?to=${creator.username}`
                            }}
                            className={`btn btn-secondary btn-sm ${styles.actionBtn}`}
                          >
                            仕事を依頼
                          </button>
                        )}
                      </>
                    ) : (
                      <Link href="/dashboard/profile" className="btn btn-secondary btn-sm">
                        <i className="fas fa-edit"></i>
                        編集
                      </Link>
                    )}
                  </div>
                </div>

                {/* 統計 */}
                <div className={styles.stats}>
                  <div className={styles.statItem}>
                    <strong>{followingCount.toLocaleString()}</strong>
                    <span>フォロー</span>
                  </div>
                  <div className={styles.statItem}>
                    <strong>{followerCount.toLocaleString()}</strong>
                    <span>フォロワー</span>
                  </div>
                  <div className={styles.statItem}>
                    <strong>{portfolioItems.length}</strong>
                    <span>作品</span>
                  </div>
                </div>

                {/* SNSリンク */}
                {(creator.twitter_url || creator.pixiv_url || creator.instagram_url || creator.youtube_url || creator.website_url) && (
                  <div className={styles.socialLinks}>
                    {creator.twitter_url && (
                      <a href={creator.twitter_url} target="_blank" rel="noopener noreferrer" className={styles.socialIcon} title="X (Twitter)">
                        <i className="fa-brands fa-x-twitter"></i>
                      </a>
                    )}
                    {creator.pixiv_url && (
                      <a href={creator.pixiv_url} target="_blank" rel="noopener noreferrer" className={styles.socialIcon} title="pixiv">
                        <i className="fa-solid fa-p"></i>
                      </a>
                    )}
                    {creator.instagram_url && (
                      <a href={creator.instagram_url} target="_blank" rel="noopener noreferrer" className={styles.socialIcon} title="Instagram">
                        <i className="fa-brands fa-instagram"></i>
                      </a>
                    )}
                    {creator.youtube_url && (
                      <a href={creator.youtube_url} target="_blank" rel="noopener noreferrer" className={styles.socialIcon} title="YouTube">
                        <i className="fa-brands fa-youtube"></i>
                      </a>
                    )}
                    {creator.website_url && (
                      <a href={creator.website_url} target="_blank" rel="noopener noreferrer" className={styles.socialIcon} title="Webサイト">
                        <i className="fas fa-globe"></i>
                      </a>
                    )}
                    <div className={`${styles.shareContainer} share-dropdown-container`}>
                      <button 
                        onClick={() => setIsShareDropdownOpen(!isShareDropdownOpen)} 
                        className={styles.socialIcon} 
                        title="シェア"
                      >
                        <i className="fas fa-share-nodes"></i>
                      </button>
                      {isShareDropdownOpen && (
                        <div className={styles.shareDropdown}>
                          <button onClick={() => handleShare('twitter')} className={styles.shareItem}>
                            <i className="fa-brands fa-x-twitter"></i>
                            <span>X (Twitter)</span>
                          </button>
                          <button onClick={() => handleShare('facebook')} className={styles.shareItem}>
                            <i className="fa-brands fa-facebook"></i>
                            <span>Facebook</span>
                          </button>
                          <button onClick={() => handleShare('line')} className={styles.shareItem}>
                            <i className="fa-brands fa-line"></i>
                            <span>LINE</span>
                          </button>
                          <button onClick={() => handleShare('copy')} className={styles.shareItem}>
                            <i className="fas fa-link"></i>
                            <span>URLをコピー</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 自己紹介 */}
                {creator.bio && (
                  <BioText bio={creator.bio} maxLength={100} />
                )}
              </div>
            </div>
          </div>

          {/* タブ */}
          <div className="tabs">
            <button 
              onClick={() => setMainTab('works')} 
              className={`tab ${mainTab === 'works' ? 'active' : ''}`}
            >
              作品
            </button>
            <button 
              onClick={() => setMainTab('pricing')} 
              className={`tab ${mainTab === 'pricing' ? 'active' : ''}`}
            >
              料金表
            </button>
            <button 
              onClick={() => setMainTab('reviews')} 
              className={`tab ${mainTab === 'reviews' ? 'active' : ''}`}
            >
              レビュー
            </button>
          </div>

          {/* 作品タブ */}
          {mainTab === 'works' && (
            <div className={styles.tabContent}>
              {/* カテゴリーフィルター */}
              {categories.length > 0 && (
                <div className={styles.categoryFilter}>
                  <button 
                    onClick={() => setWorksCategoryTab('all')} 
                    className={`tag ${worksCategoryTab === 'all' ? styles.activeTag : ''}`}
                  >
                    すべて
                  </button>
                  {categories.map(category => (
                    <button 
                      key={category} 
                      onClick={() => setWorksCategoryTab(category)} 
                      className={`tag ${worksCategoryTab === category ? styles.activeTag : ''}`}
                    >
                      {getCategoryLabel(category)}
                    </button>
                  ))}
                </div>
              )}

              {worksLoading ? (
                <WorkGridSkeleton count={8} />
              ) : filteredWorks.length === 0 ? (
                <div className="empty-state">
                  <i className="fa-regular fa-folder-open"></i>
                  <p>作品がありません</p>
                </div>
              ) : (
                <div className={styles.worksGrid}>
                  {filteredWorks.map(work => <WorkCard key={work.id} work={work} />)}
                </div>
              )}
            </div>
          )}

          {/* 料金表タブ */}
          {mainTab === 'pricing' && (
            <div className={styles.tabContent}>
              {pricingLoading ? (
                <WorkGridSkeleton count={4} />
              ) : pricingPlans.length === 0 ? (
                <div className="empty-state">
                  <i className="fa-regular fa-file-lines"></i>
                  <p>料金表がまだ登録されていません</p>
                </div>
              ) : (
                <div className={styles.pricingGrid}>
                  {pricingPlans.map(plan => (
                    <Link key={plan.id} href={`/pricing/${plan.id}`} className={`card ${styles.pricingCard}`}>
                      <div className="card-image">
                        {plan.thumbnail_url ? (
                          <Image 
                            src={plan.thumbnail_url} 
                            alt={plan.plan_name} 
                            fill 
                            sizes="(max-width: 768px) 100vw, 280px"
                            loading="lazy"
                            quality={75}
                          />
                        ) : (
                          <i className="fa-regular fa-image"></i>
                        )}
                      </div>
                      <div className="card-body">
                        <span className={styles.pricingCategory}>{getCategoryLabel(plan.category)}</span>
                        <h3 className="card-title">{plan.plan_name}</h3>
                        <p className={styles.pricingPrice}>¥{plan.minimum_price.toLocaleString()}〜</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* レビュータブ */}
          {mainTab === 'reviews' && (
            <div className={styles.tabContent}>
              {reviewsLoading ? (
                <ReviewsSkeleton />
              ) : reviews.length === 0 ? (
                <div className="empty-state">
                  <i className="fa-regular fa-star"></i>
                  <p>まだレビューがありません</p>
                </div>
              ) : (
                <div className={styles.reviewsLayout}>
                  {/* 統計 */}
                  <div className={`card ${styles.reviewsStatsCard}`}>
                    <div className={styles.reviewsAvg}>{averageRating.toFixed(1)}</div>
                    <div className={styles.reviewsStars}>
                      {[...Array(5)].map((_, i) => {
                        const diff = averageRating - i
                        if (diff >= 1) return <i key={i} className="fas fa-star icon-star active"></i>
                        if (diff > 0) return <i key={i} className="fas fa-star-half-alt icon-star active"></i>
                        return <i key={i} className="far fa-star icon-star"></i>
                      })}
                    </div>
                    <div className={styles.reviewsCount}>{totalReviews}件のレビュー</div>
                    
                    <div className={styles.ratingBars}>
                      {[5, 4, 3, 2, 1].map(rating => {
                        const count = reviews.filter(r => r.rating === rating).length
                        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
                        return (
                          <div key={rating} className={styles.ratingBar}>
                            <div className={styles.ratingLabel}>{rating}</div>
                            <div className={styles.ratingProgress}>
                              <div className={styles.ratingFill} style={{ width: `${percentage}%` }}></div>
                            </div>
                            <div className={styles.ratingCount}>{count}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* レビュー一覧 */}
                  <div className={styles.reviewsList}>
                    {reviews.map(review => (
                      <div key={review.id} className={`card ${styles.reviewCard}`}>
                        <div className={styles.reviewHeader}>
                          {review.reviewer?.username ? (
                            <Link href={`/creators/${review.reviewer.username}`} className={styles.reviewerLink}>
                              <div className={`avatar avatar-sm ${styles.reviewerAvatar} ${review.reviewer?.avatar_url ? styles.hasImage : ''}`}>
                                {review.reviewer?.avatar_url ? (
                                  <Image 
                                    src={review.reviewer.avatar_url} 
                                    alt="" 
                                    width={32} 
                                    height={32}
                                    sizes="32px"
                                  />
                                ) : (
                                  <i className="fas fa-user"></i>
                                )}
                              </div>
                              <div>
                                <div className={styles.reviewerName}>{review.reviewer?.display_name || '名前未設定'}</div>
                                <div className={styles.reviewDate}>
                                  {new Date(review.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                              </div>
                            </Link>
                          ) : (
                            <div className={styles.reviewerInfo}>
                              <div className={`avatar avatar-sm ${styles.reviewerAvatar}`}>
                                <i className="fas fa-user"></i>
                              </div>
                              <div>
                                <div className={styles.reviewerName}>名前未設定</div>
                                <div className={styles.reviewDate}>
                                  {new Date(review.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className={styles.reviewRating}>
                          {[...Array(5)].map((_, i) => (
                            <i key={i} className={`${i < review.rating ? 'fas' : 'far'} fa-star icon-star ${i < review.rating ? 'active' : ''}`}></i>
                          ))}
                        </div>
                        
                        <div className={styles.reviewProject}>
                          <i className="fas fa-briefcase"></i>
                          {review.work_request?.title || '削除された依頼'}
                        </div>
                        
                        {review.comment && (
                          <p className={styles.reviewComment}>{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}