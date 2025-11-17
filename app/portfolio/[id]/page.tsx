'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

type PortfolioItem = {
  id: string
  title: string
  description: string | null
  category: string | null
  tags: string[] | null
  image_url: string
  external_url: string | null
  view_count: number
  created_at: string
  creator_id: string
  profiles: {
    id: string
    display_name: string | null
    avatar_url: string | null
    bio: string | null
  }
}

export default function PortfolioDetailPage() {
  const [item, setItem] = useState<PortfolioItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const router = useRouter()
  const params = useParams()
  const itemId = params.id as string

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (itemId) {
      fetchPortfolioItem()
    }
  }, [itemId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        setCurrentUserId(profile.id)
      }
    }
  }

  async function fetchPortfolioItem() {
    setLoading(true)

    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*, profiles!portfolio_items_creator_id_fkey(id, display_name, avatar_url, bio)')
      .eq('id', itemId)
      .single()

    if (error) {
      console.error('作品取得エラー:', error)
    } else {
      setItem(data)
      
      // 閲覧数を増やす
      await supabase
        .from('portfolio_items')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', itemId)
    }

    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('この作品を削除しますか？')) return

    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    } else {
      alert('作品を削除しました')
      router.push('/portfolio')
    }
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

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
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

  if (!item) {
    return (
      <>
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
          <div className="container-narrow">
            <div className="empty-state">
              <p className="text-gray mb-24">
                作品が見つかりませんでした
              </p>
              <Link href="/portfolio" className="btn-primary">
                ポートフォリオに戻る
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const isOwner = item.creator_id === currentUserId

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          {/* 戻るボタン */}
          <Link
            href="/portfolio"
            className="text-small text-gray"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              marginBottom: '32px'
            }}
          >
            ← ポートフォリオに戻る
          </Link>

          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '40px',
            flexWrap: 'wrap'
          }}>
            {/* 左側: 画像 */}
            <div style={{ flex: '1 1 600px', minWidth: '300px' }}>
              <div className="card-no-hover" style={{
                overflow: 'hidden',
                backgroundColor: '#F9F9F9'
              }}>
                <img
                  src={item.image_url}
                  alt={item.title}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </div>
            </div>

            {/* 右側: 情報 */}
            <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
              {/* カテゴリ */}
              {item.category && (
                <span className="badge badge-category mb-16" style={{
                  display: 'inline-block',
                  padding: '6px 16px',
                  borderRadius: '16px',
                  fontSize: '14px'
                }}>
                  {getCategoryLabel(item.category)}
                </span>
              )}

              {/* タイトル */}
              <h1 className="section-title mb-24" style={{ lineHeight: '1.4' }}>
                {item.title}
              </h1>

              {/* クリエイター情報 */}
              <div className="flex gap-12 mb-32" style={{
                alignItems: 'center',
                paddingBottom: '24px',
                borderBottom: '1px solid #E5E5E5'
              }}>
                <div className="avatar avatar-medium">
                  {item.profiles?.avatar_url ? (
                    <img
                      src={item.profiles.avatar_url}
                      alt={item.profiles.display_name || ''}
                    />
                  ) : (
                    item.profiles?.display_name?.charAt(0) || '?'
                  )}
                </div>
                <div>
                  <div className="text-tiny text-gray">クリエイター</div>
                  <Link
                    href={`/creators/${item.profiles?.id}`}
                    className="card-subtitle"
                    style={{ textDecoration: 'none' }}
                  >
                    {item.profiles?.display_name || '名前未設定'}
                  </Link>
                </div>
              </div>

              {/* 説明 */}
              {item.description && (
                <div className="mb-24">
                  <h2 className="form-label">説明</h2>
                  <p className="text-small" style={{
                    lineHeight: '1.8',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {item.description}
                  </p>
                </div>
              )}

              {/* タグ */}
              {item.tags && item.tags.length > 0 && (
                <div className="mb-24">
                  <h2 className="form-label">タグ</h2>
                  <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                    {item.tags.map((tag, index) => (
                      <span key={index} className="badge" style={{
                        backgroundColor: '#F9F9F9',
                        border: '1px solid #E5E5E5',
                        color: '#6B6B6B'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 詳細情報 */}
              <div className="info-box mb-24">
                <div className="info-row">
                  <span>投稿日</span>
                  <span className="info-row-value">{formatDate(item.created_at)}</span>
                </div>
                <div className="info-row">
                  <span>閲覧数</span>
                  <span className="info-row-value">{item.view_count || 0}</span>
                </div>
              </div>

              {/* 外部リンク */}
              {item.external_url && (
                <a
                  href={item.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary mb-16"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    textDecoration: 'none'
                  }}
                >
                  外部サイトで見る ↗
                </a>
              )}

              {/* 所有者のみのアクション */}
              {isOwner && (
                <button onClick={handleDelete} className="btn-danger" style={{ width: '100%' }}>
                  作品を削除
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}