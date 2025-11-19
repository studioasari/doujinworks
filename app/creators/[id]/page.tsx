'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { getOrCreateChatRoom } from '@/utils/chatUtils'

type Creator = {
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
  const creatorId = params.id as string

  useEffect(() => {
    async function initialize() {
      await checkAuth()
      if (creatorId) {
        await fetchCreator()
        await fetchPortfolio()
      }
    }
    initialize()
  }, [creatorId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // auth.users.id から profiles.id を取得
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
      .eq('id', creatorId)
      .eq('is_creator', true)
      .single()

    if (error) {
      console.error('クリエイター取得エラー:', error)
    } else {
      setCreator(data)
    }
    
    setLoading(false)
  }

  async function fetchPortfolio() {
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

    // profiles.id を渡す（auth.users.id ではない）
    const roomId = await getOrCreateChatRoom(currentProfileId, creator.id)

    if (roomId) {
      router.push(`/messages/${roomId}`)
    } else {
      alert('チャットルームの作成に失敗しました')
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

        <div className="container" style={{ padding: '40px 20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gap: '32px',
            alignItems: 'start'
          }}>
            <aside>
              <div className="card-no-hover p-24">
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

                <h1 className="card-title mb-12" style={{ textAlign: 'center' }}>
                  {creator.display_name || '名前未設定'}
                </h1>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <span className="badge badge-category" style={{
                    padding: '6px 16px',
                    fontSize: '13px'
                  }}>
                    {creator.role === 'creator' && 'クリエイター'}
                    {creator.role === 'client' && '依頼者'}
                    {creator.role === 'both' && 'クリエイター・依頼者'}
                  </span>
                </div>

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

                {(creator.twitter_url || creator.pixiv_url || creator.website_url) && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                    {creator.twitter_url && (
                      <a href={creator.twitter_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', border: '1px solid #E5E5E5', borderRadius: '50%', fontSize: '16px', color: '#6B6B6B', textDecoration: 'none', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1A1A1A'; e.currentTarget.style.color = '#1A1A1A' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.color = '#6B6B6B' }}>
                        <i className="fab fa-twitter"></i>
                      </a>
                    )}
                    {creator.pixiv_url && (
                      <a href={creator.pixiv_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', border: '1px solid #E5E5E5', borderRadius: '50%', fontSize: '16px', color: '#6B6B6B', textDecoration: 'none', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1A1A1A'; e.currentTarget.style.color = '#1A1A1A' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.color = '#6B6B6B' }}>
                        <i className="fas fa-palette"></i>
                      </a>
                    )}
                    {creator.website_url && (
                      <a href={creator.website_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', border: '1px solid #E5E5E5', borderRadius: '50%', fontSize: '16px', color: '#6B6B6B', textDecoration: 'none', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1A1A1A'; e.currentTarget.style.color = '#1A1A1A' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.color = '#6B6B6B' }}>
                        <i className="fas fa-link"></i>
                      </a>
                    )}
                  </div>
                )}

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
                    <Link href="/profile" className="btn-secondary" style={{ width: '100%', textAlign: 'center', lineHeight: '48px' }}>
                      プロフィールを編集
                    </Link>
                  )}
                </div>
              </div>
            </aside>

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