'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

type Profile = {
  id: string
  user_id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  header_url: string | null
  twitter_url: string | null
  pixiv_url: string | null
  website_url: string | null
  role: string
  is_creator: boolean
  is_client: boolean
}

type PortfolioItem = {
  id: string
  title: string
  category: string | null
  image_url: string
  thumbnail_url: string | null
}

type ChatRoom = {
  id: string
  updated_at: string
  chat_room_participants: Array<{
    profiles: {
      id: string
      display_name: string | null
      avatar_url: string | null
    } | null
  }> | null
  messages: Array<{
    content: string
    created_at: string
  }> | null
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [stats, setStats] = useState({
    portfolioCount: 0,
    requestCount: 0,
    messageCount: 0
  })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    await loadProfile(user.id)
    await loadPortfolio(user.id)
    await loadChatRooms(user.id)
    await loadStats(user.id)
    setLoading(false)
  }

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    setProfile(data)
  }

  async function loadPortfolio(userId: string) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!profileData) return

    const { data } = await supabase
      .from('portfolio_items')
      .select('id, title, category, image_url, thumbnail_url')
      .eq('creator_id', profileData.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(6)

    setPortfolioItems(data || [])
  }

  async function loadChatRooms(userId: string) {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!profileData) {
        setChatRooms([])
        return
      }

      const { data: participantData } = await supabase
        .from('chat_room_participants')
        .select('chat_room_id')
        .eq('profile_id', profileData.id)

      if (!participantData || participantData.length === 0) {
        setChatRooms([])
        return
      }

      const roomIds = participantData.map(p => p.chat_room_id)

      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          updated_at,
          chat_room_participants(
            profiles(id, display_name, avatar_url)
          ),
          messages(content, created_at)
        `)
        .in('id', roomIds)
        .order('updated_at', { ascending: false })
        .limit(3)

      if (error) {
        console.error('チャットルーム取得エラー:', error)
        setChatRooms([])
        return
      }

      if (data) {
        setChatRooms(data as any)
      } else {
        setChatRooms([])
      }
    } catch (error) {
      console.error('loadChatRooms エラー:', error)
      setChatRooms([])
    }
  }

  async function loadStats(userId: string) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!profileData) return

    const { count: portfolioCount } = await supabase
      .from('portfolio_items')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', profileData.id)
      .eq('is_public', true)

    const { count: receivedCount } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', profileData.id)

    const { count: sentCount } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', profileData.id)

    const requestCount = (receivedCount || 0) + (sentCount || 0)

    const { count: messageCount } = await supabase
      .from('chat_room_participants')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileData.id)

    setStats({
      portfolioCount: portfolioCount || 0,
      requestCount,
      messageCount: messageCount || 0
    })
  }

  function getCategoryLabel(category: string | null) {
    const categories: { [key: string]: string } = {
      illustration: 'イラスト',
      manga: '漫画',
      novel: '小説',
      music: '音楽',
      voice: 'ボイス',
      video: '動画',
      game: 'ゲーム',
      '3d': '3Dモデル',
      other: 'その他'
    }
    return category ? categories[category] || category : '未設定'
  }

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
          <div className="loading-state">
            読み込み中...
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
        display: 'flex'
      }}>
        <aside style={{
          width: '240px',
          borderRight: '1px solid #E5E5E5',
          padding: '40px 0',
          flexShrink: 0
        }}>
          <nav style={{ padding: '0 20px' }}>
            <div style={{
              padding: '12px 20px',
              marginBottom: '4px',
              backgroundColor: '#1A1A1A',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600'
            }}>
              概要
            </div>

            <Link 
              href="/profile"
              style={{
                display: 'block',
                padding: '12px 20px',
                marginBottom: '4px',
                color: '#6B6B6B',
                borderRadius: '8px',
                fontSize: '15px',
                textDecoration: 'none',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9F9F9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              プロフィール編集
            </Link>

            <Link 
              href="/portfolio"
              style={{
                display: 'block',
                padding: '12px 20px',
                marginBottom: '4px',
                color: '#6B6B6B',
                borderRadius: '8px',
                fontSize: '15px',
                textDecoration: 'none',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9F9F9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              作品管理
            </Link>

            <Link 
              href="/requests"
              style={{
                display: 'block',
                padding: '12px 20px',
                marginBottom: '4px',
                color: '#6B6B6B',
                borderRadius: '8px',
                fontSize: '15px',
                textDecoration: 'none',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9F9F9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              依頼管理
            </Link>
          </nav>
        </aside>

        <main style={{ flex: 1, padding: '40px' }}>
          <h1 className="page-title mb-40">ダッシュボード</h1>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
          }}>
            <div className="card-no-hover" style={{ overflow: 'hidden', padding: 0 }}>
              <div style={{
                width: '100%',
                height: '160px',
                backgroundColor: '#F5F5F5',
                position: 'relative',
                overflow: 'hidden',
                borderBottom: '1px solid #E5E5E5'
              }}>
                {profile?.header_url ? (
                  <img
                    src={profile.header_url}
                    alt="ヘッダー画像"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6B6B6B',
                    fontSize: '48px'
                  }}>
                    <i className="fas fa-image"></i>
                  </div>
                )}
              </div>

              <div style={{ padding: '0 24px 24px 24px', position: 'relative' }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  border: '4px solid #FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  color: '#6B6B6B',
                  overflow: 'hidden',
                  marginTop: '-50px',
                  marginBottom: '16px',
                  boxShadow: '0 0 0 1px #E5E5E5',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || ''}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <h2 className="card-title" style={{ marginBottom: 0 }}>
                    {profile?.display_name || '名前未設定'}
                  </h2>
                  
                  {(profile?.twitter_url || profile?.pixiv_url || profile?.website_url) && (
                    <div className="flex gap-8">
                      {profile.twitter_url && (
                        <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid #E5E5E5', borderRadius: '50%', fontSize: '14px', color: '#6B6B6B', textDecoration: 'none', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1A1A1A'; e.currentTarget.style.color = '#1A1A1A' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.color = '#6B6B6B' }}>
                          <i className="fab fa-twitter"></i>
                        </a>
                      )}
                      {profile.pixiv_url && (
                        <a href={profile.pixiv_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid #E5E5E5', borderRadius: '50%', fontSize: '14px', color: '#6B6B6B', textDecoration: 'none', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1A1A1A'; e.currentTarget.style.color = '#1A1A1A' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.color = '#6B6B6B' }}>
                          <i className="fas fa-palette"></i>
                        </a>
                      )}
                      {profile.website_url && (
                        <a href={profile.website_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid #E5E5E5', borderRadius: '50%', fontSize: '14px', color: '#6B6B6B', textDecoration: 'none', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1A1A1A'; e.currentTarget.style.color = '#1A1A1A' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.color = '#6B6B6B' }}>
                          <i className="fas fa-link"></i>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <span className="badge badge-category">
                    {profile?.role === 'creator' && 'クリエイター'}
                    {profile?.role === 'client' && 'クライアント'}
                    {profile?.role === 'both' && 'クリエイター・依頼者'}
                  </span>
                </div>

                <div className="info-box mb-32">
                  <div className="info-row">
                    <span className="text-gray">作品数</span>
                    <span className="text-small" style={{ color: '#1A1A1A', fontWeight: '600' }}>
                      {stats.portfolioCount}点
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="text-gray">依頼数</span>
                    <span className="text-small" style={{ color: '#1A1A1A', fontWeight: '600' }}>
                      {stats.requestCount}件
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="text-gray">メッセージ</span>
                    <span className="text-small" style={{ color: '#1A1A1A', fontWeight: '600' }}>
                      {stats.messageCount}件
                    </span>
                  </div>
                </div>

                <Link href={`/creators/${profile?.id}`} className="btn-secondary" style={{ width: '100%' }}>
                  プロフィールを見る
                </Link>
              </div>
            </div>

            <div className="card-no-hover p-24">
              <div className="flex-between mb-24">
                <h2 className="card-title">最近のメッセージ</h2>
                {chatRooms.length > 0 && (
                  <Link href="/messages" className="text-small text-gray">
                    すべて見る
                  </Link>
                )}
              </div>

              {chatRooms.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <p className="text-small text-gray">
                    メッセージはまだありません
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {chatRooms.map((room) => {
                    const otherParticipant = room.chat_room_participants
                      ?.find((p) => p.profiles && p.profiles.id !== profile?.id)
                      ?.profiles
                    const lastMessage = room.messages?.[0]

                    return (
                      <Link
                        key={room.id}
                        href={`/messages/${room.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          border: '1px solid #E5E5E5',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#1A1A1A'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#E5E5E5'
                        }}
                      >
                        <div className="avatar avatar-medium">
                          {otherParticipant?.avatar_url ? (
                            <img
                              src={otherParticipant.avatar_url}
                              alt={otherParticipant.display_name || ''}
                            />
                          ) : (
                            <i className="fas fa-user"></i>
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="text-small" style={{ 
                            fontWeight: '600', 
                            color: '#1A1A1A',
                            marginBottom: '4px'
                          }}>
                            {otherParticipant?.display_name || '名前未設定'}
                          </div>
                          <div className="text-small text-gray text-ellipsis">
                            {lastMessage?.content || 'メッセージなし'}
                          </div>
                        </div>

                        <div className="text-tiny text-gray" style={{ flexShrink: 0 }}>
                          {lastMessage?.created_at ? 
                            new Date(lastMessage.created_at).toLocaleDateString('ja-JP', {
                              month: 'short',
                              day: 'numeric'
                            })
                            : ''
                          }
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="card-no-hover p-24 mb-40">
            <div className="flex-between mb-24">
              <h2 className="card-title">あなたの作品</h2>
              {portfolioItems.length > 0 && (
                <Link href="/portfolio" className="text-small text-gray">
                  すべて見る
                </Link>
              )}
            </div>

            {portfolioItems.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p className="text-small text-gray mb-16">
                  まだ作品が登録されていません
                </p>
                <Link href="/portfolio/upload" className="btn-primary">
                  作品をアップロード
                </Link>
              </div>
            ) : (
              <div className="grid-portfolio">
                {portfolioItems.map((item) => (
                  <Link key={item.id} href={`/portfolio/${item.id}`} className="portfolio-card">
                    <div className="portfolio-card-image">
                      <img
                        src={item.thumbnail_url || item.image_url}
                        alt={item.title}
                      />
                    </div>
                    <div className="portfolio-card-content">
                      {item.category && (
                        <span className="badge badge-category mb-8" style={{ display: 'inline-block' }}>
                          {getCategoryLabel(item.category)}
                        </span>
                      )}
                      <h3 className="card-subtitle text-ellipsis">
                        {item.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
      <Footer />
    </>
  )
}