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

// プロフィール情報の型定義
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

// 作品情報の型定義
type PortfolioItem = {
  id: string
  title: string
  category: string | null
  thumbnail_url: string | null
}

// 料金表の型定義
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

// レビュー情報の型定義
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

// カテゴリラベルのマッピング（定数化して再利用）
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

// カテゴリの順序（定数化）
const CATEGORY_ORDER = ['illustration', 'manga', 'novel', 'music', 'voice', 'video']

// カテゴリラベル取得関数（コンポーネント外に移動）
function getCategoryLabel(category: string | null): string {
  if (!category) return 'その他'
  return CATEGORY_LABELS[category] || category
}

// 表示用の画像URL取得（コンポーネント外に移動）
function getWorkImageUrl(work: PortfolioItem): string | null {
  return work.thumbnail_url || null
}

// 作品カードコンポーネント（メモ化で高速化）
const WorkCard = memo(({ work }: { work: PortfolioItem }) => {
  const imageUrl = getWorkImageUrl(work)
  
  return (
    <Link
      href={`/portfolio/${work.id}`}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block'
      }}
    >
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: '1px solid #D0D5DA'
      }}
      className="work-card">
        {/* サムネイル */}
        <div style={{
          position: 'relative',
          paddingBottom: '100%',
          backgroundColor: '#F5F6F8',
          overflow: 'hidden'
        }}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={work.title}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
              quality={75}
              style={{ objectFit: 'cover', transition: 'transform 0.3s ease' }}
            />
          ) : (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#888888'
            }}>
              <i className="fas fa-image" style={{ fontSize: '48px', opacity: 0.3 }}></i>
            </div>
          )}
          {/* カテゴリバッジ */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            backdropFilter: 'blur(4px)'
          }}>
            {getCategoryLabel(work.category)}
          </div>
        </div>
        {/* タイトル */}
        <div style={{
          padding: '14px'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#222222',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            margin: 0,
            lineHeight: '1.4'
          }}>
            {work.title}
          </h3>
        </div>
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

  // ページタイトルを設定
  useEffect(() => {
    if (creator) {
      document.title = `${creator.display_name || creator.username || 'ユーザー'} - 同人ワークス`
    }
  }, [creator])

  // カテゴリ一覧をメモ化（高速化）
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(portfolioItems.map(work => work.category).filter(Boolean) as string[])
    )
    return CATEGORY_ORDER.filter(cat => uniqueCategories.includes(cat))
  }, [portfolioItems])

  // フィルタリングされた作品をメモ化（高速化）
  const filteredWorks = useMemo(() => {
    if (worksCategoryTab === 'all') {
      return portfolioItems
    }
    return portfolioItems.filter(work => work.category === worksCategoryTab)
  }, [worksCategoryTab, portfolioItems])

  // 自分のプロフィールかどうかをメモ化
  const isOwnProfile = useMemo(() => {
    return currentProfileId && creator && currentProfileId === creator.id
  }, [currentProfileId, creator])

  // 認証チェック（初回のみ）
  useEffect(() => {
    checkAuth()
  }, [])

  // usernameが変わったらクリエイター情報を取得
  useEffect(() => {
    if (username) {
      fetchCreator()
    }
  }, [username])

  // 外側クリックで共有メニューを閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (isShareDropdownOpen && !target.closest('.share-dropdown-container')) {
        setIsShareDropdownOpen(false)
      }
    }

    if (isShareDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [isShareDropdownOpen])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        setCurrentProfileId(profile.id)
      }
    }
  }

  async function fetchCreator() {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

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
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(display_name, avatar_url, username),
        work_request:work_requests(title)
      `)
      .eq('reviewee_id', creatorId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('レビュー取得エラー:', error)
      setReviews([])
    } else {
      setReviews(data || [])
      
      // 平均評価を計算
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
    const [
      { count: followerCnt },
      { count: followingCnt },
      { data: followData }
    ] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId),
      currentUserId ? supabase
        .from('follows')
        .select('*')
        .eq('follower_id', currentUserId)
        .eq('following_id', userId)
        .maybeSingle() : Promise.resolve({ data: null })
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
        if (!confirm('フォローを解除しますか？')) {
          return
        }
        
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', creator.user_id)

        setIsFollowing(false)
        setFollowerCount(prev => prev - 1)
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: creator.user_id })

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
      const { data: myRooms } = await supabase
        .from('chat_room_participants')
        .select('chat_room_id')
        .eq('profile_id', currentProfileId)

      if (myRooms && myRooms.length > 0) {
        const roomIds = myRooms.map(r => r.chat_room_id)
        
        const { data: sharedRooms, error: sharedError } = await supabase
          .from('chat_room_participants')
          .select('chat_room_id')
          .eq('profile_id', creator.id)
          .in('chat_room_id', roomIds)

        if (!sharedError && sharedRooms && sharedRooms.length > 0) {
          router.push(`/messages/${sharedRooms[0].chat_room_id}`)
          setSendingMessage(false)
          return
        }
      }

      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({})
        .select()
        .single()

      if (roomError || !newRoom) {
        console.error('チャットルーム作成エラー:', roomError)
        alert('チャットルームの作成に失敗しました')
        setSendingMessage(false)
        return
      }

      const { error: participantsError } = await supabase
        .from('chat_room_participants')
        .insert([
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
          }).catch((err) => {
            console.error('URLのコピーに失敗しました:', err)
            fallbackCopyToClipboard(url)
          })
        } else {
          fallbackCopyToClipboard(url)
        }
        break
    }
    
    if (platform !== 'copy') {
      setIsShareDropdownOpen(false)
    }
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
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#F5F6F8'
        }}>
          <div style={{ 
            textAlign: 'center', 
            backgroundColor: 'white', 
            padding: '40px', 
            borderRadius: '16px',
            border: '1px solid #D0D5DA'
          }}>
            <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#222222' }}>
              クリエイターが見つかりません
            </h1>
            <Link href="/portfolio" className="btn-primary">
              作品一覧に戻る
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* ヘッダー背景画像（絶対配置、3:1比率、もっと薄く表示） */}
        {creator.header_url && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: 'calc(100vw / 3)',
            maxHeight: '400px',
            overflow: 'hidden',
            zIndex: 0
          }}
          className="header-background">
            <Image
              src={creator.header_url}
              alt=""
              fill
              sizes="100vw"
              quality={85}
              priority
              style={{ 
                objectFit: 'cover',
                objectPosition: 'center'
              }}
            />
            {/* より薄い白オーバーレイ */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,1) 100%)'
            }}></div>
          </div>
        )}

        {/* メインコンテンツ */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '40px 20px',
          position: 'relative',
          zIndex: 10
        }}>
          {/* プロフィールセクション */}
          <div style={{
            backgroundColor: 'transparent',
            borderRadius: '12px',
            overflow: 'visible',
            marginBottom: '40px',
            position: 'relative',
            padding: '32px'
          }}
          className="profile-section">
            {/* 2カラムレイアウト */}
            <div style={{
              display: 'flex',
              gap: '32px',
              alignItems: 'flex-start'
            }}
            className="profile-layout">
              {/* 左カラム: アバター */}
              <div style={{
                flexShrink: 0
              }}
              className="profile-avatar-column">
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: '#F5F6F8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  border: '4px solid #FFFFFF'
                }}
                className="profile-avatar">
                  {creator.avatar_url ? (
                    <Image
                      src={creator.avatar_url}
                      alt={creator.display_name || ''}
                      fill
                      priority
                      quality={85}
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 80px, 120px"
                    />
                  ) : (
                    <i className="fas fa-user" style={{ fontSize: '48px', color: '#888888' }}></i>
                  )}
                </div>
              </div>

              {/* 右カラム: プロフィール情報 */}
              <div style={{ flex: 1, minWidth: 0 }} className="profile-info-column">
                {/* 上部: 名前行とアクションボタン */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  marginBottom: '12px',
                  flexWrap: 'wrap'
                }}
                className="profile-header-row">
                  {/* 名前とユーザーID */}
                  <div>
                    {/* 職業・肩書き（名前の上） */}
                    {creator.job_title && (
                      <div style={{
                        fontSize: '13px',
                        color: '#888888',
                        marginBottom: '4px',
                        fontWeight: '500'
                      }}>
                        {creator.job_title}
                      </div>
                    )}

                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'baseline', 
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}
                    className="name-username-row">
                      <h1 style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#222222',
                        lineHeight: '1.3',
                        margin: 0
                      }}
                      className="profile-name">
                        {creator.display_name || '名前未設定'}
                      </h1>
                      {creator.username && (
                        <div style={{
                          fontSize: '14px',
                          color: '#555555'
                        }}
                        className="username-display">
                          @{creator.username}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* アクションボタン（名前の横） */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexShrink: 0
                  }}
                  className="profile-action-buttons">
                    {!isOwnProfile ? (
                      <>
                        {/* メッセージボタン */}
                        <button
                          onClick={handleSendMessage}
                          disabled={sendingMessage}
                          style={{
                            width: '40px',
                            height: '40px',
                            border: '1px solid #D0D5DA',
                            borderRadius: '50%',
                            backgroundColor: '#FFFFFF',
                            color: '#555555',
                            fontSize: '16px',
                            cursor: sendingMessage ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          title="メッセージを送る"
                          onMouseEnter={(e) => {
                            if (!sendingMessage) {
                              e.currentTarget.style.backgroundColor = '#EEF0F3'
                              e.currentTarget.style.borderColor = '#B0B5BA'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FFFFFF'
                            e.currentTarget.style.borderColor = '#D0D5DA'
                          }}
                        >
                          <i className="fas fa-envelope"></i>
                        </button>
                        
                        {/* フォローボタン */}
                        <button
                          onClick={handleFollow}
                          style={{
                            height: '40px',
                            padding: '0 20px',
                            borderRadius: '20px',
                            backgroundColor: isFollowing ? '#FFFFFF' : '#5B7C99',
                            color: isFollowing ? '#555555' : '#FFFFFF',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            border: isFollowing ? '1px solid #D0D5DA' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (isFollowing) {
                              e.currentTarget.style.backgroundColor = '#EEF0F3'
                              e.currentTarget.style.borderColor = '#B0B5BA'
                            } else {
                              e.currentTarget.style.backgroundColor = '#4A6B85'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isFollowing ? '#FFFFFF' : '#5B7C99'
                            e.currentTarget.style.borderColor = '#D0D5DA'
                          }}
                        >
                          {isFollowing ? 'フォロー中' : 'フォロー'}
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/settings/profile"
                        style={{
                          height: '40px',
                          padding: '0 20px',
                          border: '1px solid #D0D5DA',
                          borderRadius: '20px',
                          backgroundColor: '#FFFFFF',
                          color: '#555555',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#EEF0F3'
                          e.currentTarget.style.borderColor = '#B0B5BA'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF'
                          e.currentTarget.style.borderColor = '#D0D5DA'
                        }}
                      >
                        <i className="fas fa-edit" style={{ fontSize: '12px' }}></i>
                        編集
                      </Link>
                    )}
                  </div>
                </div>

                {/* 統計情報 */}
                <div style={{
                  display: 'flex',
                  gap: '20px',
                  fontSize: '13px',
                  color: '#555555',
                  marginBottom: '16px'
                }}>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#222222' }}>
                      {followingCount.toLocaleString()}
                    </span> フォロー
                  </div>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#222222' }}>
                      {followerCount.toLocaleString()}
                    </span> フォロワー
                  </div>
                </div>

                {/* 自己紹介 */}
                {creator.bio && (
                  <p style={{
                    fontSize: '14px',
                    lineHeight: '1.7',
                    color: '#555555',
                    marginBottom: '16px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {creator.bio}
                  </p>
                )}

                {/* SNSリンクとシェアボタン */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  position: 'relative',
                  zIndex: 2
                }}>
                  {creator.twitter_url && (
                    <a
                      href={creator.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D0D5DA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#555555',
                        textDecoration: 'none',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EEF0F3'
                        e.currentTarget.style.borderColor = '#B0B5BA'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF'
                        e.currentTarget.style.borderColor = '#D0D5DA'
                      }}
                    >
                      <i className="fab fa-twitter"></i>
                    </a>
                  )}
                  {creator.pixiv_url && (
                    <a
                      href={creator.pixiv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D0D5DA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#555555',
                        textDecoration: 'none',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EEF0F3'
                        e.currentTarget.style.borderColor = '#B0B5BA'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF'
                        e.currentTarget.style.borderColor = '#D0D5DA'
                      }}
                    >
                      <i className="fas fa-palette"></i>
                    </a>
                  )}
                  {creator.instagram_url && (
                    <a
                      href={creator.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D0D5DA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#555555',
                        textDecoration: 'none',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EEF0F3'
                        e.currentTarget.style.borderColor = '#B0B5BA'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF'
                        e.currentTarget.style.borderColor = '#D0D5DA'
                      }}
                    >
                      <i className="fab fa-instagram"></i>
                    </a>
                  )}
                  {creator.youtube_url && (
                    <a
                      href={creator.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D0D5DA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#555555',
                        textDecoration: 'none',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EEF0F3'
                        e.currentTarget.style.borderColor = '#B0B5BA'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF'
                        e.currentTarget.style.borderColor = '#D0D5DA'
                      }}
                    >
                      <i className="fab fa-youtube"></i>
                    </a>
                  )}
                  {creator.website_url && (
                    <a
                      href={creator.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D0D5DA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#555555',
                        textDecoration: 'none',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EEF0F3'
                        e.currentTarget.style.borderColor = '#B0B5BA'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF'
                        e.currentTarget.style.borderColor = '#D0D5DA'
                      }}
                    >
                      <i className="fas fa-globe"></i>
                    </a>
                  )}
                  {/* シェアボタン（SNSリンクと一緒に配置） */}
                  <div 
                    className="share-dropdown-container"
                    style={{ position: 'relative', zIndex: 10 }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsShareDropdownOpen(!isShareDropdownOpen)
                      }}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D0D5DA',
                        color: '#555555',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      title="プロフィールを共有"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EEF0F3'
                        e.currentTarget.style.borderColor = '#B0B5BA'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF'
                        e.currentTarget.style.borderColor = '#D0D5DA'
                      }}
                    >
                      <i className="fas fa-share-alt"></i>
                    </button>

                    {/* ドロップダウンメニュー */}
                    {isShareDropdownOpen && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '0',
                          marginTop: '8px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #D0D5DA',
                          borderRadius: '8px',
                          padding: '8px',
                          minWidth: '200px',
                          maxWidth: '100vw',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          zIndex: 1000
                        }}
                      >
                        <button
                          onClick={() => handleShare('twitter')}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            textAlign: 'left',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            color: '#222222'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEF0F3'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <i className="fab fa-twitter" style={{ color: '#1DA1F2', fontSize: '18px' }}></i>
                          Twitter
                        </button>
                        <button
                          onClick={() => handleShare('facebook')}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            textAlign: 'left',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            color: '#222222'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEF0F3'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <i className="fab fa-facebook" style={{ color: '#1877F2', fontSize: '18px' }}></i>
                          Facebook
                        </button>
                        <button
                          onClick={() => handleShare('line')}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            textAlign: 'left',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            color: '#222222'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEF0F3'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <i className="fab fa-line" style={{ color: '#00B900', fontSize: '18px' }}></i>
                          LINE
                        </button>
                        <button
                          onClick={() => handleShare('copy')}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            textAlign: 'left',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            color: '#222222'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEF0F3'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <i className="fas fa-link" style={{ color: '#555555', fontSize: '18px' }}></i>
                          URLをコピー
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 依頼を送るボタン（目立つ位置に単独配置） */}
                {!isOwnProfile && (
                  <div style={{ marginTop: '20px' }}>
                    <Link
                      href={`/requests/create?to=${username}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        height: '44px',
                        padding: '0 32px',
                        backgroundColor: '#5B7C99',
                        color: '#FFFFFF',
                        borderRadius: '22px',
                        fontSize: '15px',
                        fontWeight: '600',
                        textDecoration: 'none',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4A6B85'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#5B7C99'
                      }}
                    >
                      <i className="fas fa-paper-plane"></i>
                      依頼を送る
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* メインタブナビゲーション */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            borderBottom: '2px solid #D0D5DA',
            paddingBottom: '0'
          }}>
            <button
              onClick={() => setMainTab('works')}
              style={{
                padding: '12px 24px',
                border: 'none',
                backgroundColor: 'transparent',
                color: mainTab === 'works' ? '#5B7C99' : '#555555',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                position: 'relative',
                transition: 'all 0.2s',
                minWidth: '100px',
                whiteSpace: 'nowrap'
              }}
            >
              作品
              {mainTab === 'works' && (
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: '#5B7C99'
                }}></div>
              )}
            </button>
            <button
              onClick={() => setMainTab('pricing')}
              style={{
                padding: '12px 24px',
                border: 'none',
                backgroundColor: 'transparent',
                color: mainTab === 'pricing' ? '#5B7C99' : '#555555',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                position: 'relative',
                transition: 'all 0.2s',
                minWidth: '100px',
                whiteSpace: 'nowrap'
              }}
            >
              料金表
              {mainTab === 'pricing' && (
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: '#5B7C99'
                }}></div>
              )}
            </button>
            <button
              onClick={() => setMainTab('reviews')}
              style={{
                padding: '12px 24px',
                border: 'none',
                backgroundColor: 'transparent',
                color: mainTab === 'reviews' ? '#5B7C99' : '#555555',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                position: 'relative',
                transition: 'all 0.2s',
                minWidth: '100px',
                whiteSpace: 'nowrap'
              }}
            >
              レビュー
              {mainTab === 'reviews' && (
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: '#5B7C99'
                }}></div>
              )}
            </button>
          </div>

          {/* 作品タブコンテンツ */}
          {mainTab === 'works' && (
            <>
              {/* カテゴリタブナビゲーション */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '32px',
                overflowX: 'auto',
                paddingBottom: '8px'
              }}
              className="tab-navigation">
                <button
                  onClick={() => setWorksCategoryTab('all')}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '24px',
                    border: worksCategoryTab === 'all' ? 'none' : '1px solid #D0D5DA',
                    backgroundColor: worksCategoryTab === 'all' ? '#5B7C99' : '#FFFFFF',
                    color: worksCategoryTab === 'all' ? 'white' : '#555555',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (worksCategoryTab !== 'all') {
                      e.currentTarget.style.backgroundColor = '#EEF0F3'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (worksCategoryTab !== 'all') {
                      e.currentTarget.style.backgroundColor = '#FFFFFF'
                    }
                  }}
                >
                  すべて
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setWorksCategoryTab(category)}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '24px',
                      border: worksCategoryTab === category ? 'none' : '1px solid #D0D5DA',
                      backgroundColor: worksCategoryTab === category ? '#5B7C99' : '#FFFFFF',
                      color: worksCategoryTab === category ? 'white' : '#555555',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (worksCategoryTab !== category) {
                        e.currentTarget.style.backgroundColor = '#EEF0F3'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (worksCategoryTab !== category) {
                        e.currentTarget.style.backgroundColor = '#FFFFFF'
                      }
                    }}
                  >
                    {getCategoryLabel(category)}
                  </button>
                ))}
              </div>

              {/* 作品グリッド */}
              {worksLoading ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '80px 20px',
                  color: '#555555'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
                    <p>作品を読み込み中...</p>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '24px'
                }}
                className="works-grid">
                  {filteredWorks.length === 0 ? (
                    <div style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      padding: '80px 20px',
                      color: '#555555'
                    }}>
                      <i className="fas fa-folder-open" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
                      <p>作品がありません</p>
                    </div>
                  ) : (
                    filteredWorks.map(work => (
                      <WorkCard key={work.id} work={work} />
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* 料金表タブコンテンツ */}
          {mainTab === 'pricing' && (
            <div>
              {pricingLoading ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '80px 20px',
                  color: '#555555'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
                    <p>料金表を読み込み中...</p>
                  </div>
                </div>
              ) : pricingPlans.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  color: '#555555'
                }}>
                  <i className="fas fa-receipt" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
                  <p>料金表がまだ登録されていません</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '24px',
                  padding: '24px 0'
                }}>
                  {pricingPlans.map(plan => (
                    <Link
                      key={plan.id}
                      href={`/pricing/${plan.id}`}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: '1px solid #D0D5DA',
                        textDecoration: 'none',
                        display: 'block'
                      }}
                      className="pricing-card"
                    >
                      <img
                        src={plan.thumbnail_url}
                        alt={plan.plan_name}
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover'
                        }}
                      />
                      
                      <div style={{ padding: '16px' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{
                            fontSize: '11px',
                            color: '#555555',
                            backgroundColor: '#EEF0F3',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            {getCategoryLabel(plan.category)}
                          </span>
                        </div>
                        
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#222222',
                          marginBottom: '8px'
                        }}>
                          {plan.plan_name}
                        </h3>
                        
                        <p style={{
                          fontSize: '20px',
                          fontWeight: '600',
                          color: '#5B7C99',
                          margin: 0
                        }}>
                          ¥{plan.minimum_price.toLocaleString()}〜
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* レビュータブコンテンツ */}
          {mainTab === 'reviews' && (
            <div>
              {reviewsLoading ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '80px 20px',
                  color: '#888888'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
                    <p style={{ fontSize: '14px', margin: 0 }}>レビューを読み込み中...</p>
                  </div>
                </div>
              ) : reviews.length === 0 ? (
                <div className="empty-state" style={{
                  textAlign: 'center',
                  padding: '80px 20px'
                }}>
                  <i className="fas fa-star" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3, color: '#D0D5DA' }}></i>
                  <p style={{ fontSize: '14px', color: '#888888', margin: 0 }}>まだレビューがありません</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '300px 1fr',
                  gap: '32px',
                  alignItems: 'start'
                }}
                className="reviews-layout">
                  {/* 左カラム: 統計 */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D0D5DA',
                    borderRadius: '12px',
                    padding: '24px',
                    position: 'sticky',
                    top: '20px'
                  }}>
                    {/* 平均スコア */}
                    <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                      <div style={{
                        fontSize: '48px',
                        fontWeight: '700',
                        color: '#222222',
                        lineHeight: '1',
                        marginBottom: '8px'
                      }}>
                        {averageRating.toFixed(1)}
                      </div>
                      <div style={{
                        fontSize: '20px',
                        color: '#FFB800',
                        letterSpacing: '2px',
                        marginBottom: '8px'
                      }}>
                        {[...Array(5)].map((_, i) => {
                          const diff = averageRating - i
                          if (diff >= 1) {
                            return <i key={i} className="fas fa-star"></i>
                          } else if (diff > 0) {
                            return <i key={i} className="fas fa-star-half-alt"></i>
                          } else {
                            return <i key={i} className="far fa-star"></i>
                          }
                        })}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#888888'
                      }}>
                        {totalReviews}件のレビューより
                      </div>
                    </div>

                    {/* 評価分布 */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {[5, 4, 3, 2, 1].map(rating => {
                        const count = reviews.filter(r => r.rating === rating).length
                        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
                        
                        return (
                          <div key={rating} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px'
                          }}>
                            {/* 星 */}
                            <div style={{
                              color: '#FFB800',
                              minWidth: '90px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {[...Array(5)].map((_, i) => (
                                <i 
                                  key={i} 
                                  className={i < rating ? 'fas fa-star' : 'far fa-star'}
                                  style={{ fontSize: '12px', color: i < rating ? '#FFB800' : '#E5E5E5' }}
                                ></i>
                              ))}
                            </div>
                            
                            {/* バー */}
                            <div style={{
                              flex: 1,
                              height: '8px',
                              backgroundColor: '#E5E5E5',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${percentage}%`,
                                height: '100%',
                                backgroundColor: '#FFB800',
                                transition: 'width 0.3s ease'
                              }}></div>
                            </div>
                            
                            {/* 件数 */}
                            <div style={{
                              minWidth: '20px',
                              textAlign: 'right',
                              color: '#888888',
                              fontWeight: '500'
                            }}>
                              {count}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 右カラム: レビュー一覧 */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    {reviews.map(review => (
                      <div
                        key={review.id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #D0D5DA',
                          borderRadius: '12px',
                          padding: '20px'
                        }}
                      >
                        {/* レビュアー情報 */}
                        <div style={{ marginBottom: '16px' }}>
                          {review.reviewer?.username ? (
                            <Link
                              href={`/creators/${review.reviewer.username}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                textDecoration: 'none',
                                color: 'inherit'
                              }}
                            >
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#D8DEE4',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0
                              }}>
                                {review.reviewer?.avatar_url ? (
                                  <img 
                                    src={review.reviewer.avatar_url} 
                                    alt={review.reviewer.display_name || ''} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                  />
                                ) : (
                                  <i className="fas fa-user" style={{ color: '#888888', fontSize: '16px' }}></i>
                                )}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ 
                                  fontSize: '14px', 
                                  fontWeight: '600', 
                                  color: '#222222'
                                }}>
                                  {review.reviewer?.display_name || '名前未設定'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#888888' }}>
                                  {new Date(review.created_at).toLocaleDateString('ja-JP', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </div>
                              </div>
                            </Link>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#D8DEE4',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0
                              }}>
                                <i className="fas fa-user" style={{ color: '#888888', fontSize: '16px' }}></i>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ 
                                  fontSize: '14px', 
                                  fontWeight: '600', 
                                  color: '#222222'
                                }}>
                                  名前未設定
                                </div>
                                <div style={{ fontSize: '12px', color: '#888888' }}>
                                  {new Date(review.created_at).toLocaleDateString('ja-JP', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 評価 */}
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ 
                            fontSize: '18px', 
                            color: '#FFB800',
                            letterSpacing: '2px',
                            marginBottom: '8px'
                          }}>
                            {[...Array(5)].map((_, i) => (
                              <i 
                                key={i} 
                                className={i < review.rating ? 'fas fa-star' : 'far fa-star'}
                              ></i>
                            ))}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#888888',
                            backgroundColor: '#F5F6F8',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            fontWeight: '500'
                          }}>
                            <i className="fas fa-briefcase" style={{ marginRight: '6px', fontSize: '11px' }}></i>
                            {review.work_request?.title || '削除された依頼'}
                          </div>
                        </div>

                        {/* コメント */}
                        {review.comment && (
                          <p style={{
                            fontSize: '14px',
                            lineHeight: '1.7',
                            color: '#555555',
                            whiteSpace: 'pre-wrap',
                            margin: 0
                          }}>
                            {review.comment}
                          </p>
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

      {/* スタイル */}
      <style jsx global>{`
        /* レビューレイアウト レスポンシブ */
        .reviews-layout {
          grid-template-columns: 300px 1fr;
          gap: 32px;
        }

        @media (max-width: 768px) {
          .reviews-layout {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          
          .reviews-layout > div:first-child {
            position: static !important;
          }

          .profile-layout {
            flex-direction: column !important;
            gap: 20px !important;
            align-items: center !important;
            text-align: center !important;
          }

          .profile-info-column {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .profile-header-row {
            flex-direction: column !important;
            align-items: center !important;
            gap: 16px !important;
          }

          .profile-header-row > div:first-child {
            text-align: center;
          }

          .name-username-row {
            justify-content: center !important;
            flex-direction: column !important;
            gap: 4px !important;
          }

          .profile-action-buttons {
            justify-content: center !important;
          }
        }

        @media (max-width: 1024px) {
          .works-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 20px !important;
          }
        }

        @media (max-width: 768px) {
          .profile-section {
            padding: 24px !important;
          }

          .profile-avatar {
            width: 100px !important;
            height: 100px !important;
          }

          .profile-avatar i {
            font-size: 40px !important;
          }

          .profile-name {
            font-size: 20px !important;
          }

          .tab-navigation {
            padding: 0 4px;
          }

          .works-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
        }

        @media (max-width: 480px) {
          .works-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
        }

        /* ホバーエフェクト */
        .work-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .work-card img {
          transition: transform 0.3s ease;
        }

        .work-card:hover img {
          transform: scale(1.05);
        }

        .pricing-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
      `}</style>

      <Footer />
    </>
  )
}