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
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [sendingMessage, setSendingMessage] = useState(false)
  const router = useRouter()
  const params = useParams()
  const creatorId = params.id as string

  useEffect(() => {
    checkAuth()
    if (creatorId) {
      fetchCreator()
      fetchPortfolio()
    }
  }, [creatorId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setCurrentUser(user)
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
      .limit(6)

    if (error) {
      console.error('ポートフォリオ取得エラー:', error)
    } else {
      setPortfolioItems(data || [])
    }
  }

  async function handleSendMessage() {
    if (!currentUser || !creator) return

    setSendingMessage(true)

    const roomId = await getOrCreateChatRoom(currentUser.id, creator.id)

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

  // 自分のプロフィールかどうか判定
  const isOwnProfile = currentUser && creator && currentUser.id === creator.user_id

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
        <div className="container-narrow">
          {/* 戻るボタン */}
          <Link
            href="/creators"
            className="text-small text-gray"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              marginBottom: '32px'
            }}
          >
            ← クリエイター一覧に戻る
          </Link>

          {/* プロフィールカード */}
          <div className="card-no-hover p-40 mb-32">
            {/* アバターと基本情報 */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '32px',
              marginBottom: '32px',
              flexWrap: 'wrap'
            }}>
              {/* アバター */}
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: '#E5E5E5',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                color: '#6B6B6B',
                overflow: 'hidden'
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
                  creator.display_name?.charAt(0) || '?'
                )}
              </div>

              {/* 名前と役割 */}
              <div style={{ flex: 1, minWidth: '250px' }}>
                <h1 className="section-title mb-12">
                  {creator.display_name || '名前未設定'}
                </h1>

                {/* 役割バッジ */}
                <span className="badge badge-category mb-24" style={{
                  display: 'inline-block',
                  padding: '6px 16px',
                  fontSize: '14px'
                }}>
                  {creator.role === 'creator' && 'クリエイター'}
                  {creator.role === 'client' && 'クライアント'}
                  {creator.role === 'both' && 'クリエイター・クライアント'}
                </span>

                {/* アクションボタン */}
                <div className="flex gap-12" style={{ flexWrap: 'wrap' }}>
                  {/* メッセージボタン（他人のプロフィールの場合） */}
                  {!isOwnProfile && (
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage}
                      className="btn-primary"
                    >
                      {sendingMessage ? '処理中...' : 'メッセージを送る'}
                    </button>
                  )}

                  {/* プロフィール編集ボタン（自分のプロフィールの場合） */}
                  {isOwnProfile && (
                    <Link href="/profile" className="btn-secondary">
                      プロフィールを編集
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* 統計情報 */}
            <div className="info-box mb-32">
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
            <div>
              <h2 className="card-title mb-12">
                自己紹介
              </h2>
              <p className="text-small" style={{
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
                color: '#6B6B6B'
              }}>
                {creator.bio || '自己紹介が登録されていません'}
              </p>
            </div>
          </div>

          {/* ポートフォリオセクション */}
          <div className="card-no-hover p-40">
            <div className="flex-between mb-24">
              <h2 className="card-title">
                ポートフォリオ
              </h2>
              {portfolioItems.length > 0 && (
                <Link href="/portfolio" className="text-small text-gray">
                  すべて見る
                </Link>
              )}
            </div>

            {/* ポートフォリオ一覧 */}
            {portfolioItems.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p className="text-small text-gray">
                  まだ作品が登録されていません
                </p>
              </div>
            ) : (
              <div className="grid-portfolio">
                {portfolioItems.map((item) => (
                  <Link key={item.id} href={`/portfolio/${item.id}`} className="portfolio-card">
                    {/* 画像 */}
                    <div className="portfolio-card-image">
                      <img
                        src={item.thumbnail_url || item.image_url}
                        alt={item.title}
                      />
                    </div>

                    {/* 情報 */}
                    <div className="portfolio-card-content">
                      {/* カテゴリ */}
                      {item.category && (
                        <span className="badge badge-category mb-8" style={{ display: 'inline-block' }}>
                          {getCategoryLabel(item.category)}
                        </span>
                      )}

                      {/* タイトル */}
                      <h3 className="card-subtitle text-ellipsis">
                        {item.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}