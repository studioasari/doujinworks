'use client'

import { useEffect, useState, useMemo, useCallback, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import '../../globals.css'
import { supabase } from '@/utils/supabase'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingSkeleton from './LoadingSkeleton'

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

function getWorkImageUrl(work: PortfolioItem): string | null {
  return work.thumbnail_url || null
}

const WorkCard = memo(({ work }: { work: PortfolioItem }) => {
  const imageUrl = getWorkImageUrl(work)
  
  return (
    <Link href={`/portfolio/${work.id}`} className="creator-work-card">
      <div className="creator-work-image">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={work.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy"
            quality={75}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
            <i className="fas fa-image" style={{ fontSize: '48px', opacity: 0.3 }}></i>
          </div>
        )}
        <div className="creator-work-badge">{getCategoryLabel(work.category)}</div>
      </div>
      <div className="creator-work-content">
        <h3 className="creator-work-title">{work.title}</h3>
      </div>
    </Link>
  )
})

WorkCard.displayName = 'WorkCard'

export default function CreatorDetailPage() {
  const router = useRouter()
  const params = useParams()
  const username = params.username as string
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [creator, setCreator] = useState<Creator | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [worksLoading, setWorksLoading] = useState(true)
  const [pricingLoading, setPricingLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
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

  useEffect(() => {
    if (creator) {
      document.title = `${creator.display_name || creator.username || 'ユーザー'} - 同人ワークス`
    }
  }, [creator])

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

  useEffect(() => { checkAuth() }, [])
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

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
      if (profile) setCurrentProfileId(profile.id)
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
    if (!currentUserId) {
      if (confirm('フォローするにはログインが必要です。ログインページに移動しますか？')) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      }
      return
    }
    if (!creator) return

    try {
      if (isFollowing) {
        if (!confirm('フォローを解除しますか？')) return
        await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', creator.user_id)
        setIsFollowing(false)
        setFollowerCount(prev => prev - 1)
      } else {
        await supabase.from('follows').insert({ follower_id: currentUserId, following_id: creator.user_id })
        setIsFollowing(true)
        setFollowerCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('フォロー処理エラー:', error)
    }
  }, [currentUserId, creator, isFollowing, router])

  const handleSendMessage = useCallback(async () => {
    if (!currentUserId) {
      if (confirm('メッセージを送るにはログインが必要です。ログインページに移動しますか？')) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      }
      return
    }
    if (!currentProfileId || !creator) return

    setSendingMessage(true)
    try {
      const { data: myRooms } = await supabase.from('chat_room_participants').select('chat_room_id').eq('profile_id', currentProfileId)

      if (myRooms && myRooms.length > 0) {
        const roomIds = myRooms.map(r => r.chat_room_id)
        const { data: sharedRooms, error: sharedError } = await supabase.from('chat_room_participants').select('chat_room_id').eq('profile_id', creator.id).in('chat_room_id', roomIds)
        if (!sharedError && sharedRooms && sharedRooms.length > 0) {
          router.push(`/messages/${sharedRooms[0].chat_room_id}`)
          setSendingMessage(false)
          return
        }
      }

      const { data: newRoom, error: roomError } = await supabase.from('chat_rooms').insert({}).select().single()
      if (roomError || !newRoom) {
        console.error('チャットルーム作成エラー:', roomError)
        alert('チャットルームの作成に失敗しました')
        setSendingMessage(false)
        return
      }

      const { error: participantsError } = await supabase.from('chat_room_participants').insert([
        { chat_room_id: newRoom.id, profile_id: currentProfileId },
        { chat_room_id: newRoom.id, profile_id: creator.id }
      ])
      if (participantsError) {
        console.error('参加者追加エラー:', participantsError)
        alert('参加者の追加に失敗しました')
        setSendingMessage(false)
        return
      }
      router.push(`/messages/${newRoom.id}`)
    } catch (error) {
      console.error('メッセージ送信エラー:', error)
      alert('エラーが発生しました')
    }
    setSendingMessage(false)
  }, [currentUserId, currentProfileId, creator, router])

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

  if (loading) {
    return (
      <>
        <Header />
        <LoadingSkeleton />
        <Footer />
      </>
    )
  }

  if (!creator) {
    return (
      <>
        <Header />
        <div className="creator-not-found">
          <div className="creator-not-found-card">
            <h1>クリエイターが見つかりません</h1>
            <Link href="/portfolio" className="btn-primary">作品一覧に戻る</Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="creator-detail-page">
        {/* ヘッダー背景 */}
        {creator.header_url && (
          <div className="creator-header-bg">
            <Image src={creator.header_url} alt="" fill sizes="100vw" quality={85} priority style={{ objectFit: 'cover', objectPosition: 'center' }} />
            <div className="creator-header-overlay"></div>
          </div>
        )}

        <div className="creator-container">
          {/* プロフィールセクション */}
          <div className="creator-profile-section">
            <div className="creator-profile-layout">
              {/* アバター */}
              <div className="creator-avatar-column">
                <div className="creator-avatar">
                  {creator.avatar_url ? (
                    <Image src={creator.avatar_url} alt={creator.display_name || ''} fill priority quality={85} style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100px, 120px" />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </div>
              </div>

              {/* プロフィール情報 */}
              <div className="creator-info-column">
                <div className="creator-header-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {creator.job_title && <div className="creator-job-title">{creator.job_title}</div>}
                    <h1 className="creator-name">{creator.display_name || '名前未設定'}</h1>
                    {creator.username && <div className="creator-username">@{creator.username}</div>}
                  </div>

                  <div className="creator-action-buttons">
                    {!isOwnProfile ? (
                      <>
                        <button onClick={handleSendMessage} disabled={sendingMessage} className="creator-msg-btn" title="メッセージを送る">
                          <i className="fas fa-envelope"></i>
                        </button>
                        <button onClick={handleFollow} className={`creator-follow-btn ${isFollowing ? 'following' : 'not-following'}`}>
                          {isFollowing ? 'フォロー中' : 'フォロー'}
                        </button>
                      </>
                    ) : (
                      <Link href="/dashboard/profile" className="creator-edit-btn">
                        <i className="fas fa-edit" style={{ fontSize: '12px' }}></i>
                        編集
                      </Link>
                    )}
                  </div>
                </div>

                {/* 統計 */}
                <div className="creator-stats">
                  <div><strong>{followingCount.toLocaleString()}</strong> フォロー</div>
                  <div><strong>{followerCount.toLocaleString()}</strong> フォロワー</div>
                </div>

                {/* SNSリンク */}
                <div className="creator-social-links">
                  {creator.twitter_url && (
                    <a href={creator.twitter_url} target="_blank" rel="noopener noreferrer" className="creator-social-icon">
                      <svg fill="currentColor" viewBox="0 0 24 24" height="18" width="18"><path d="M13.2672 10.9617L18.2259 5.21997H17.0509L12.7452 10.2054L9.30637 5.21997H5.34003L10.5403 12.7589L5.34003 18.78H6.51514L11.062 13.5151L14.6937 18.78H18.66L13.2669 10.9617H13.2672ZM11.6578 12.8253L11.1309 12.0746L6.93855 6.10115H8.74345L12.1267 10.9219L12.6536 11.6726L17.0514 17.9389H15.2465L11.6578 12.8256V12.8253Z"/></svg>
                    </a>
                  )}
                  {creator.pixiv_url && (
                    <a href={creator.pixiv_url} target="_blank" rel="noopener noreferrer" className="creator-social-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="18" height="18"><path d="M0 0h600v600H0Z" fill="#0096fa"/><path d="M313.164 371.503c-44.48 0-80.54-36.06-80.54-80.54s36.06-80.54 80.54-80.54 80.54 36.059 80.54 80.54c0 44.48-36.06 80.54-80.54 80.54M158.83 472.976a9.217 9.217 0 0 0 9.218 9.216h55.357a9.217 9.217 0 0 0 9.218-9.216v-50.351c23.448 14.373 51.023 22.671 80.541 22.671 85.236 0 154.334-69.097 154.334-154.334 0-85.236-69.098-154.333-154.334-154.333-36.26 0-69.572 12.537-95.913 33.469l-18.803-29.238a9.22 9.22 0 0 0-7.753-4.231h-22.647a9.22 9.22 0 0 0-9.218 9.218z" fill="#fff"/></svg>
                    </a>
                  )}
                  {creator.instagram_url && (
                    <a href={creator.instagram_url} target="_blank" rel="noopener noreferrer" className="creator-social-icon"><i className="fab fa-instagram"></i></a>
                  )}
                  {creator.youtube_url && (
                    <a href={creator.youtube_url} target="_blank" rel="noopener noreferrer" className="creator-social-icon"><i className="fab fa-youtube"></i></a>
                  )}
                  {creator.website_url && (
                    <a href={creator.website_url} target="_blank" rel="noopener noreferrer" className="creator-social-icon"><i className="fas fa-globe"></i></a>
                  )}
                  {/* シェアボタン */}
                  <div className="share-dropdown-container" style={{ position: 'relative', zIndex: 10 }}>
                    <button onClick={(e) => { e.stopPropagation(); setIsShareDropdownOpen(!isShareDropdownOpen) }} className="creator-social-icon" title="プロフィールを共有">
                      <i className="fas fa-share-alt"></i>
                    </button>
                    {isShareDropdownOpen && (
                      <div className="creator-share-dropdown">
                        <button onClick={() => handleShare('twitter')} className="creator-share-item">
                          <svg fill="#000" viewBox="0 0 24 24" height="18" width="18"><path d="M13.2672 10.9617L18.2259 5.21997H17.0509L12.7452 10.2054L9.30637 5.21997H5.34003L10.5403 12.7589L5.34003 18.78H6.51514L11.062 13.5151L14.6937 18.78H18.66L13.2669 10.9617H13.2672ZM11.6578 12.8253L11.1309 12.0746L6.93855 6.10115H8.74345L12.1267 10.9219L12.6536 11.6726L17.0514 17.9389H15.2465L11.6578 12.8256V12.8253Z"/></svg>
                          X
                        </button>
                        <button onClick={() => handleShare('facebook')} className="creator-share-item">
                          <i className="fab fa-facebook" style={{ color: '#1877F2', fontSize: '18px' }}></i>
                          Facebook
                        </button>
                        <button onClick={() => handleShare('line')} className="creator-share-item">
                          <i className="fab fa-line" style={{ color: '#00B900', fontSize: '18px' }}></i>
                          LINE
                        </button>
                        <button onClick={() => handleShare('copy')} className="creator-share-item">
                          <i className="fas fa-link" style={{ color: '#555', fontSize: '18px' }}></i>
                          URLをコピー
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 自己紹介 */}
                {creator.bio && <p className="creator-bio">{creator.bio}</p>}

                {/* 依頼ボタン */}
                {!isOwnProfile && (
                  <button
                    onClick={() => {
                      if (!currentUserId) {
                        if (confirm('依頼を送るにはログインが必要です。ログインページに移動しますか？')) {
                          router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
                        }
                        return
                      }
                      router.push(`/requests/create?to=${username}`)
                    }}
                    className="creator-request-btn"
                  >
                    <i className="fas fa-paper-plane"></i>
                    依頼を送る
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* メインタブ */}
          <div className="creator-main-tabs">
            <button onClick={() => setMainTab('works')} className={`creator-main-tab ${mainTab === 'works' ? 'active' : ''}`}>作品</button>
            <button onClick={() => setMainTab('pricing')} className={`creator-main-tab ${mainTab === 'pricing' ? 'active' : ''}`}>料金表</button>
            <button onClick={() => setMainTab('reviews')} className={`creator-main-tab ${mainTab === 'reviews' ? 'active' : ''}`}>レビュー</button>
          </div>

          {/* 作品タブ */}
          {mainTab === 'works' && (
            <>
              <div className="creator-category-tabs">
                <button onClick={() => setWorksCategoryTab('all')} className={`creator-category-tab ${worksCategoryTab === 'all' ? 'active' : ''}`}>すべて</button>
                {categories.map(category => (
                  <button key={category} onClick={() => setWorksCategoryTab(category)} className={`creator-category-tab ${worksCategoryTab === category ? 'active' : ''}`}>
                    {getCategoryLabel(category)}
                  </button>
                ))}
              </div>

              {worksLoading ? (
                <div className="creator-loading"><div className="creator-loading-content"><i className="fas fa-spinner fa-spin"></i><p>作品を読み込み中...</p></div></div>
              ) : (
                <div className="creator-works-grid">
                  {filteredWorks.length === 0 ? (
                    <div className="creator-empty" style={{ gridColumn: '1 / -1' }}><i className="fas fa-folder-open"></i><p>作品がありません</p></div>
                  ) : (
                    filteredWorks.map(work => <WorkCard key={work.id} work={work} />)
                  )}
                </div>
              )}
            </>
          )}

          {/* 料金表タブ */}
          {mainTab === 'pricing' && (
            <div>
              {pricingLoading ? (
                <div className="creator-loading"><div className="creator-loading-content"><i className="fas fa-spinner fa-spin"></i><p>料金表を読み込み中...</p></div></div>
              ) : pricingPlans.length === 0 ? (
                <div className="creator-empty"><i className="fas fa-receipt"></i><p>料金表がまだ登録されていません</p></div>
              ) : (
                <div className="creator-pricing-grid">
                  {pricingPlans.map(plan => (
                    <Link key={plan.id} href={`/pricing/${plan.id}`} className="creator-pricing-card">
                      <img src={plan.thumbnail_url} alt={plan.plan_name} className="creator-pricing-image" />
                      <div className="creator-pricing-content">
                        <span className="creator-pricing-category">{getCategoryLabel(plan.category)}</span>
                        <h3 className="creator-pricing-name">{plan.plan_name}</h3>
                        <p className="creator-pricing-price">¥{plan.minimum_price.toLocaleString()}〜</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* レビュータブ */}
          {mainTab === 'reviews' && (
            <div>
              {reviewsLoading ? (
                <div className="creator-loading"><div className="creator-loading-content"><i className="fas fa-spinner fa-spin"></i><p>レビューを読み込み中...</p></div></div>
              ) : reviews.length === 0 ? (
                <div className="creator-empty"><i className="fas fa-star"></i><p>まだレビューがありません</p></div>
              ) : (
                <div className="creator-reviews-layout">
                  {/* 統計 */}
                  <div className="creator-reviews-stats">
                    <div className="creator-reviews-avg">{averageRating.toFixed(1)}</div>
                    <div className="creator-reviews-stars">
                      {[...Array(5)].map((_, i) => {
                        const diff = averageRating - i
                        if (diff >= 1) return <i key={i} className="fas fa-star"></i>
                        if (diff > 0) return <i key={i} className="fas fa-star-half-alt"></i>
                        return <i key={i} className="far fa-star"></i>
                      })}
                    </div>
                    <div className="creator-reviews-count">{totalReviews}件のレビューより</div>
                    <div>
                      {[5, 4, 3, 2, 1].map(rating => {
                        const count = reviews.filter(r => r.rating === rating).length
                        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
                        return (
                          <div key={rating} className="creator-rating-bar">
                            <div className="creator-rating-stars">
                              {[...Array(5)].map((_, i) => (
                                <i key={i} className={i < rating ? 'fas fa-star' : 'far fa-star'} style={{ color: i < rating ? '#FFB800' : '#E5E5E5' }}></i>
                              ))}
                            </div>
                            <div className="creator-rating-progress"><div className="creator-rating-fill" style={{ width: `${percentage}%` }}></div></div>
                            <div className="creator-rating-count">{count}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* レビュー一覧 */}
                  <div className="creator-reviews-list">
                    {reviews.map(review => (
                      <div key={review.id} className="creator-review-card">
                        {review.reviewer?.username ? (
                          <Link href={`/creators/${review.reviewer.username}`} className="creator-review-header">
                            <div className="creator-review-avatar">
                              {review.reviewer?.avatar_url ? (
                                <img src={review.reviewer.avatar_url} alt={review.reviewer.display_name || ''} />
                              ) : (
                                <i className="fas fa-user"></i>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div className="creator-review-name">{review.reviewer?.display_name || '名前未設定'}</div>
                              <div className="creator-review-date">{new Date(review.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            </div>
                          </Link>
                        ) : (
                          <div className="creator-review-header">
                            <div className="creator-review-avatar"><i className="fas fa-user"></i></div>
                            <div style={{ flex: 1 }}>
                              <div className="creator-review-name">名前未設定</div>
                              <div className="creator-review-date">{new Date(review.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            </div>
                          </div>
                        )}
                        <div className="creator-review-rating">
                          {[...Array(5)].map((_, i) => <i key={i} className={i < review.rating ? 'fas fa-star' : 'far fa-star'}></i>)}
                        </div>
                        <div className="creator-review-project">
                          <i className="fas fa-briefcase" style={{ marginRight: '6px', fontSize: '11px' }}></i>
                          {review.work_request?.title || '削除された依頼'}
                        </div>
                        {review.comment && <p className="creator-review-comment">{review.comment}</p>}
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