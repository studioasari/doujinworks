'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

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
  account_type: string | null
  can_receive_work: boolean
  can_request_work: boolean
  created_at: string
}

type PortfolioItem = {
  id: string
  title: string
  category: string | null
  image_url: string
  thumbnail_url: string | null
}

export default function CreatorDetailPage() {
  const [creator, setCreator] = useState<Creator | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const router = useRouter()
  const params = useParams()
  const username = params.username as string

  useEffect(() => {
    async function initialize() {
      await checkAuth()
      if (username) {
        await fetchCreator()
      }
    }
    initialize()
  }, [username])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      setCurrentProfileId(profile.id)
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
        await fetchPortfolio(data.id)
      }
    }
    
    setLoading(false)
  }

  async function fetchPortfolio(creatorId: string) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('id, title, category, image_url, thumbnail_url')
      .eq('creator_id', creatorId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('ポートフォリオ取得エラー:', error)
    } else {
      setPortfolioItems(data || [])
    }
  }

  async function handleSendMessage() {
    if (!currentProfileId || !creator) return

    setSendingMessage(true)

    try {
      // 既存のチャットルームを検索（改善版）
      const { data: myRooms } = await supabase
        .from('chat_room_participants')
        .select('chat_room_id')
        .eq('profile_id', currentProfileId)

      if (myRooms && myRooms.length > 0) {
        const roomIds = myRooms.map(r => r.chat_room_id)
        
        // 相手も参加しているルームを探す
        const { data: sharedRooms, error: sharedError } = await supabase
          .from('chat_room_participants')
          .select('chat_room_id')
          .eq('profile_id', creator.id)
          .in('chat_room_id', roomIds)

        // エラーがなく、共有ルームが見つかった場合
        if (!sharedError && sharedRooms && sharedRooms.length > 0) {
          // 最初に見つかったルームにリダイレクト
          router.push(`/messages/${sharedRooms[0].chat_room_id}`)
          setSendingMessage(false)
          return
        }
      }

      // 既存ルームがない場合、新しいチャットルームを作成
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

  const isOwnProfile = currentProfileId && creator && currentProfileId === creator.id

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

  if (!creator) {
    return (
      <>
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
          <div className="container-narrow">
            <div className="empty-state">
              <p className="text-gray mb-24">
                クリエイターが見つかりませんでした
              </p>
              <Link href="/creators" className="btn-primary">
                クリエイター一覧に戻る
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        {/* ヘッダー画像 */}
        <div style={{
          width: '100%',
          height: '240px',
          backgroundColor: '#F5F5F5',
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '1px solid #E5E5E5'
        }}>
          {creator.header_url ? (
            <img
              src={creator.header_url}
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

        <div className="container">
          <div className="creator-detail-layout">
            {/* サイドバー */}
            <aside>
              <div className="card-no-hover p-24">
                {/* アバター */}
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: '#F5F5F5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  color: '#6B6B6B',
                  overflow: 'hidden',
                  margin: '0 auto 20px',
                  border: '1px solid #E5E5E5'
                }}>
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.display_name || ''}
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

                {/* 名前 */}
                <h1 className="card-title mb-8" style={{ textAlign: 'center' }}>
                  {creator.display_name || '名前未設定'}
                </h1>

                {/* Username */}
                {creator.username && (
                  <p className="text-small text-gray mb-16" style={{ textAlign: 'center' }}>
                    @{creator.username}
                  </p>
                )}

                {/* アカウント種別バッジ */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <span className="badge badge-category" style={{
                    padding: '6px 16px',
                    fontSize: '13px'
                  }}>
                    {creator.account_type === 'casual' ? '一般利用' : 'ビジネス利用'}
                  </span>
                </div>

                {/* 統計情報 */}
                <div className="info-box mb-24">
                  <div className="info-row">
                    <span className="text-gray">作品数</span>
                    <span className="text-small" style={{ color: '#1A1A1A', fontWeight: '600' }}>
                      {portfolioItems.length}点
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="text-gray">登録日</span>
                    <span className="text-small" style={{ color: '#1A1A1A', fontWeight: '600' }}>
                      {new Date(creator.created_at).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* 自己紹介 */}
                <div className="mb-24">
                  <h2 className="text-small mb-8" style={{ fontWeight: '600' }}>
                    自己紹介
                  </h2>
                  <p className="text-small" style={{
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap',
                    color: '#6B6B6B'
                  }}>
                    {creator.bio || '自己紹介が登録されていません'}
                  </p>
                </div>

                {/* SNSリンク */}
                {(creator.twitter_url || creator.pixiv_url || creator.website_url) && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                    {creator.twitter_url && (
                      <a 
                        href={creator.twitter_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: '40px', 
                          height: '40px', 
                          border: '1px solid #E5E5E5', 
                          borderRadius: '50%', 
                          fontSize: '16px', 
                          color: '#6B6B6B', 
                          textDecoration: 'none', 
                          transition: 'all 0.2s' 
                        }} 
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.borderColor = '#1A1A1A'; 
                          e.currentTarget.style.color = '#1A1A1A' 
                        }} 
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.borderColor = '#E5E5E5'; 
                          e.currentTarget.style.color = '#6B6B6B' 
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
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: '40px', 
                          height: '40px', 
                          border: '1px solid #E5E5E5', 
                          borderRadius: '50%', 
                          fontSize: '16px', 
                          color: '#6B6B6B', 
                          textDecoration: 'none', 
                          transition: 'all 0.2s' 
                        }} 
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.borderColor = '#1A1A1A'; 
                          e.currentTarget.style.color = '#1A1A1A' 
                        }} 
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.borderColor = '#E5E5E5'; 
                          e.currentTarget.style.color = '#6B6B6B' 
                        }}
                      >
                        <i className="fas fa-palette"></i>
                      </a>
                    )}
                    {creator.website_url && (
                      <a 
                        href={creator.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: '40px', 
                          height: '40px', 
                          border: '1px solid #E5E5E5', 
                          borderRadius: '50%', 
                          fontSize: '16px', 
                          color: '#6B6B6B', 
                          textDecoration: 'none', 
                          transition: 'all 0.2s' 
                        }} 
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.borderColor = '#1A1A1A'; 
                          e.currentTarget.style.color = '#1A1A1A' 
                        }} 
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.borderColor = '#E5E5E5'; 
                          e.currentTarget.style.color = '#6B6B6B' 
                        }}
                      >
                        <i className="fas fa-link"></i>
                      </a>
                    )}
                  </div>
                )}

                {/* アクションボタン */}
                <div className="flex flex-col gap-12">
                  {!isOwnProfile && (
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage}
                      className="btn-primary"
                      style={{ width: '100%' }}
                    >
                      {sendingMessage ? '処理中...' : 'メッセージを送る'}
                    </button>
                  )}

                  {isOwnProfile && (
                    <Link 
                      href="/profile" 
                      className="btn-secondary" 
                      style={{ width: '100%' }}
                    >
                      プロフィールを編集
                    </Link>
                  )}
                </div>
              </div>
            </aside>

            {/* メインコンテンツ */}
            <main>
              <h2 className="section-title mb-32">
                ポートフォリオ
              </h2>

              {portfolioItems.length === 0 ? (
                <div className="empty-state" style={{ padding: '60px 20px' }}>
                  <p className="text-gray">
                    まだ作品が登録されていません
                  </p>
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

                        <h3 className="text-small text-ellipsis" style={{ fontWeight: '600' }}>
                          {item.title}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}