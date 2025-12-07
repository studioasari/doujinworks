'use client'

import { useEffect, useState, useMemo, useCallback, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import '../../globals.css'
import { supabase } from '@/utils/supabase'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingScreen from '../../components/LoadingScreen'

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
        border: '1px solid #E5E5E5'
      }}
      className="work-card">
        {/* サムネイル */}
        <div style={{
          position: 'relative',
          paddingBottom: '100%',
          backgroundColor: '#F5F5F5',
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
              color: '#9B9B9B'
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
            color: '#1A1A1A',
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
  const [loading, setLoading] = useState(true)
  const [worksLoading, setWorksLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)

  // カテゴリ一覧をメモ化（高速化）
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(portfolioItems.map(work => work.category).filter(Boolean) as string[])
    )
    return CATEGORY_ORDER.filter(cat => uniqueCategories.includes(cat))
  }, [portfolioItems])

  // フィルタリングされた作品をメモ化（高速化）
  const filteredWorks = useMemo(() => {
    if (activeTab === 'all') {
      return portfolioItems
    }
    return portfolioItems.filter(work => work.category === activeTab)
  }, [activeTab, portfolioItems])

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
        // 並列実行で高速化
        await Promise.all([
          fetchPortfolio(data.user_id),
          fetchStats(data.user_id)
        ])
      }
    }
    
    setLoading(false)
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
        // 現在のページURLをredirectパラメータとして渡す
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      }
      return
    }

    if (!creator) return

    try {
      if (isFollowing) {
        // フォロー解除の確認
        if (!confirm('フォローを解除しますか？')) {
          return
        }
        
        // フォロー解除
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', creator.user_id)

        setIsFollowing(false)
        setFollowerCount(prev => prev - 1)
      } else {
        // フォロー追加
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
    // ログインチェック
    if (!currentUserId) {
      if (confirm('メッセージを送るにはログインが必要です。ログインページに移動しますか？')) {
        // 現在のページURLをredirectパラメータとして渡す
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      }
      return
    }

    if (!currentProfileId || !creator) return

    setSendingMessage(true)

    try {
      // 既存のチャットルームを検索
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

      // 新しいチャットルームを作成
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

      // 参加者を追加
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

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/creators/${username}`
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        alert('プロフィールURLをコピーしました！')
      }).catch((err) => {
        console.error('URLのコピーに失敗しました:', err)
        prompt('URLをコピーしてください:', url)
      })
    } else {
      prompt('URLをコピーしてください:', url)
    }
  }, [username])

  if (loading) {
    return <LoadingScreen message="読み込み中..." />
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
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{ textAlign: 'center', backgroundColor: 'white', padding: '40px', borderRadius: '16px' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>クリエイターが見つかりません</h1>
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
        backgroundColor: '#FFFFFF'
      }}>
        {/* メインコンテンツ */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '40px 20px'
        }}>
          {/* プロフィールセクション */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E5E5E5',
            overflow: 'hidden',
            marginBottom: '40px'
          }}
          className="profile-section">
            {/* ヘッダー画像 */}
            <div style={{
              width: '100%',
              height: '200px',
              backgroundColor: '#F5F5F5',
              position: 'relative',
              borderBottom: '1px solid #E5E5E5'
            }}>
              {creator.header_url && (
                <Image
                  src={creator.header_url}
                  alt=""
                  fill
                  sizes="100vw"
                  quality={75}
                  priority
                  style={{ objectFit: 'cover' }}
                />
              )}
              
              {/* アクションボタン（ヘッダー右下） */}
              {!isOwnProfile ? (
                <div style={{
                  position: 'absolute',
                  bottom: '-20px',
                  right: '40px',
                  display: 'flex',
                  gap: '8px',
                  zIndex: 10
                }}
                className="header-action-buttons">
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage}
                    style={{
                      width: '40px',
                      height: '40px',
                      border: '1px solid #E5E5E5',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      color: '#1A1A1A',
                      fontSize: '16px',
                      cursor: sendingMessage ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    title="メッセージ"
                    onMouseEnter={(e) => {
                      if (!sendingMessage) e.currentTarget.style.backgroundColor = '#F5F5F5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF'
                    }}
                  >
                    <i className="fas fa-envelope"></i>
                  </button>
                  <button
                    onClick={handleFollow}
                    style={{
                      minWidth: '80px',
                      height: '40px',
                      borderRadius: '20px',
                      backgroundColor: isFollowing ? '#FFFFFF' : '#1A1A1A',
                      color: isFollowing ? '#1A1A1A' : '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      border: isFollowing ? '1px solid #E5E5E5' : 'none',
                      padding: '0 16px'
                    }}
                    title={isFollowing ? 'フォロー中' : 'フォロー'}
                    onMouseEnter={(e) => {
                      if (isFollowing) {
                        e.currentTarget.style.backgroundColor = '#F5F5F5'
                      } else {
                        e.currentTarget.style.backgroundColor = '#333333'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isFollowing ? '#FFFFFF' : '#1A1A1A'
                    }}
                  >
                    {isFollowing ? 'フォロー中' : 'フォロー'}
                  </button>
                </div>
              ) : (
                <Link
                  href="/profile"
                  style={{
                    position: 'absolute',
                    bottom: '-20px',
                    right: '40px',
                    width: '140px',
                    height: '40px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '20px',
                    backgroundColor: '#FFFFFF',
                    color: '#1A1A1A',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    textDecoration: 'none',
                    zIndex: 10
                  }}
                  className="header-action-buttons"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF'
                  }}
                >
                  プロフィール編集
                </Link>
              )}
            </div>

            {/* プロフィール情報 */}
            <div style={{
              padding: '0 40px 40px 40px',
              position: 'relative'
            }}
            className="profile-content">
              {/* アバター（ヘッダーに重なる） */}
              <div style={{
                width: '120px',
                height: '120px',
                marginTop: '-60px',
                marginBottom: '16px',
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E5E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
              className="profile-avatar">
                {creator.avatar_url ? (
                  <Image
                    src={creator.avatar_url}
                    alt={creator.display_name || ''}
                    fill
                    priority
                    quality={75}
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 80px, 120px"
                  />
                ) : (
                  <i className="fas fa-user" style={{ fontSize: '48px', color: '#9B9B9B' }}></i>
                )}
              </div>

              {/* 名前とユーザーID */}
              <div style={{ marginBottom: '12px' }}>
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
                    color: '#1A1A1A',
                    lineHeight: '1.3',
                    margin: 0
                  }}
                  className="profile-name">
                    {creator.display_name || '名前未設定'}
                  </h1>
                  {creator.username && (
                    <div style={{
                      fontSize: '14px',
                      color: '#6B6B6B'
                    }}
                    className="username-display">
                      @{creator.username}
                    </div>
                  )}
                </div>
              </div>

              {/* 統計情報 */}
              <div style={{
                display: 'flex',
                gap: '20px',
                fontSize: '13px',
                color: '#6B6B6B',
                marginBottom: '16px'
              }}>
                <div>
                  <span style={{ fontWeight: 'bold', color: '#1A1A1A' }}>
                    {portfolioItems.length}
                  </span> 作品
                </div>
                <div>
                  <span style={{ fontWeight: 'bold', color: '#1A1A1A' }}>
                    {followingCount.toLocaleString()}
                  </span> フォロー
                </div>
                <div>
                  <span style={{ fontWeight: 'bold', color: '#1A1A1A' }}>
                    {followerCount.toLocaleString()}
                  </span> フォロワー
                </div>
              </div>

              {/* 自己紹介 */}
              {creator.bio && (
                <p style={{
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: '#4A4A4A',
                  marginBottom: '16px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {creator.bio}
                </p>
              )}

              {/* SNSリンクとシェアボタン */}
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
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
                      backgroundColor: '#F5F5F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1A1A1A',
                      textDecoration: 'none',
                      transition: 'all 0.2s'
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
                      backgroundColor: '#F5F5F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1A1A1A',
                      textDecoration: 'none',
                      transition: 'all 0.2s'
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
                      backgroundColor: '#F5F5F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1A1A1A',
                      textDecoration: 'none',
                      transition: 'all 0.2s'
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
                      backgroundColor: '#F5F5F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1A1A1A',
                      textDecoration: 'none',
                      transition: 'all 0.2s'
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
                      backgroundColor: '#F5F5F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1A1A1A',
                      textDecoration: 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <i className="fas fa-link"></i>
                  </a>
                )}
                {/* シェアボタン */}
                <button
                  onClick={handleShare}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#F5F5F5',
                    color: '#1A1A1A',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    border: 'none'
                  }}
                  title="プロフィールを共有"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E5E5E5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5'
                  }}
                >
                  <i className="fas fa-share-alt"></i>
                </button>
              </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '32px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}
        className="tab-navigation">
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '10px 24px',
              borderRadius: '24px',
              border: activeTab === 'all' ? 'none' : '1px solid #E5E5E5',
              backgroundColor: activeTab === 'all' ? '#1A1A1A' : '#FFFFFF',
              color: activeTab === 'all' ? 'white' : '#6B6B6B',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            すべて
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              style={{
                padding: '10px 24px',
                borderRadius: '24px',
                border: activeTab === category ? 'none' : '1px solid #E5E5E5',
                backgroundColor: activeTab === category ? '#1A1A1A' : '#FFFFFF',
                color: activeTab === category ? 'white' : '#6B6B6B',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
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
            color: '#6B6B6B'
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
                color: '#6B6B6B'
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
      </div>

      {/* スタイル */}
      <style jsx>{`
        @media (max-width: 1024px) {
          .works-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 20px !important;
          }
        }

        @media (max-width: 768px) {
          .profile-content {
            padding: 0 24px 24px 24px !important;
          }

          .header-action-buttons {
            right: 24px !important;
          }

          .profile-avatar {
            width: 80px !important;
            height: 80px !important;
            margin-top: -40px !important;
          }

          .profile-avatar > * {
            width: 80px !important;
            height: 80px !important;
            max-width: 80px !important;
            max-height: 80px !important;
            min-width: 80px !important;
            min-height: 80px !important;
          }

          .profile-avatar img {
            width: 80px !important;
            height: 80px !important;
          }

          .profile-avatar i {
            font-size: 32px !important;
          }

          .profile-name {
            font-size: 20px !important;
          }

          .name-username-row {
            flex-direction: column !important;
            gap: 4px !important;
            align-items: flex-start !important;
          }

          .username-display {
            margin: 0 !important;
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
          border-color: #D0D0D0;
        }

        .work-card img {
          transition: transform 0.3s ease;
        }

        .work-card:hover img {
          transform: scale(1.05);
        }
      `}</style>
    </div>
    <Footer />
  </>
  )
}