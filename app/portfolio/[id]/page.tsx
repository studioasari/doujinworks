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
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6B6B6B'
          }}>
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
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{
              textAlign: 'center',
              padding: '60px 20px'
            }}>
              <p style={{ color: '#6B6B6B', marginBottom: '24px' }}>
                作品が見つかりませんでした
              </p>
              <Link
                href="/portfolio"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: '#1A1A1A',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  borderRadius: '4px'
                }}
              >
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#6B6B6B',
              textDecoration: 'none',
              fontSize: '14px',
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
              <div style={{
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
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
                <div style={{
                  display: 'inline-block',
                  padding: '6px 16px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '16px',
                  fontSize: '14px',
                  color: '#6B6B6B',
                  marginBottom: '16px'
                }}>
                  {getCategoryLabel(item.category)}
                </div>
              )}

              {/* タイトル */}
              <h1 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1A1A1A',
                marginBottom: '24px',
                lineHeight: '1.4'
              }}>
                {item.title}
              </h1>

              {/* クリエイター情報 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '32px',
                paddingBottom: '24px',
                borderBottom: '1px solid #E5E5E5'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#E5E5E5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  color: '#6B6B6B'
                }}>
                  {item.profiles?.avatar_url ? (
                    <img
                      src={item.profiles.avatar_url}
                      alt={item.profiles.display_name || ''}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    item.profiles?.display_name?.charAt(0) || '?'
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B6B6B' }}>クリエイター</div>
                  <Link
                    href={`/creators/${item.profiles?.id}`}
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1A1A1A',
                      textDecoration: 'none'
                    }}
                  >
                    {item.profiles?.display_name || '名前未設定'}
                  </Link>
                </div>
              </div>

              {/* 説明 */}
              {item.description && (
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1A1A1A',
                    marginBottom: '8px'
                  }}>
                    説明
                  </h2>
                  <p style={{
                    fontSize: '14px',
                    color: '#1A1A1A',
                    lineHeight: '1.8',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {item.description}
                  </p>
                </div>
              )}

              {/* タグ */}
              {item.tags && item.tags.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1A1A1A',
                    marginBottom: '8px'
                  }}>
                    タグ
                  </h2>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {item.tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          backgroundColor: '#F9F9F9',
                          border: '1px solid #E5E5E5',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#6B6B6B'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 詳細情報 */}
              <div style={{
                padding: '16px',
                backgroundColor: '#F9F9F9',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  color: '#6B6B6B',
                  marginBottom: '8px'
                }}>
                  <span>投稿日</span>
                  <span style={{ color: '#1A1A1A' }}>{formatDate(item.created_at)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  color: '#6B6B6B'
                }}>
                  <span>閲覧数</span>
                  <span style={{ color: '#1A1A1A' }}>{item.view_count || 0}</span>
                </div>
              </div>

              {/* 外部リンク */}
              {item.external_url && (
                <a
                  href={item.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    padding: '12px 24px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF',
                    color: '#1A1A1A',
                    textAlign: 'center',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '16px'
                  }}
                >
                  外部サイトで見る ↗
                </a>
              )}

              {/* 所有者のみのアクション */}
              {isOwner && (
                <button
                  onClick={handleDelete}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    border: '1px solid #F44336',
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF',
                    color: '#F44336',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
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