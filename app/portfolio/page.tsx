'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

type PortfolioItem = {
  id: string
  title: string
  description: string | null
  category: string | null
  tags: string[] | null
  image_url: string
  thumbnail_url: string | null
  external_url: string | null
  view_count: number
  created_at: string
  creator_id: string
  profiles: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const router = useRouter()

  useEffect(() => {
    fetchPortfolioItems()
  }, [categoryFilter])

  async function fetchPortfolioItems() {
    setLoading(true)

    let query = supabase
      .from('portfolio_items')
      .select('*, profiles!portfolio_items_creator_id_fkey(id, display_name, avatar_url)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('作品取得エラー:', error)
    } else {
      setItems(data || [])
    }

    setLoading(false)
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

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px' }}>
          {/* ヘッダー */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px'
          }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1A1A1A'
            }}>
              ポートフォリオ
            </h1>
            <Link
              href="/portfolio/upload"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#1A1A1A',
                color: '#FFFFFF',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              + 作品をアップロード
            </Link>
          </div>

          {/* フィルター */}
          <div style={{
            marginBottom: '32px',
            padding: '20px 24px',
            border: '1px solid #E5E5E5',
            borderRadius: '8px'
          }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#6B6B6B',
              marginBottom: '12px'
            }}>
              カテゴリで絞り込み
            </label>
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setCategoryFilter('all')}
                style={{
                  padding: '8px 20px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '20px',
                  backgroundColor: categoryFilter === 'all' ? '#1A1A1A' : '#FFFFFF',
                  color: categoryFilter === 'all' ? '#FFFFFF' : '#1A1A1A',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                すべて
              </button>
              {['illustration', 'manga', 'novel', 'music', 'voice', 'video', 'game', '3d', 'other'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: '8px 20px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '20px',
                    backgroundColor: categoryFilter === cat ? '#1A1A1A' : '#FFFFFF',
                    color: categoryFilter === cat ? '#FFFFFF' : '#1A1A1A',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {getCategoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>

          {/* ローディング */}
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6B6B6B'
            }}>
              読み込み中...
            </div>
          )}

          {/* 作品一覧 */}
          {!loading && items.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6B6B6B'
            }}>
              作品が見つかりませんでした
            </div>
          )}

          {!loading && items.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px'
            }}>
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/portfolio/${item.id}`}
                  style={{
                    display: 'block',
                    border: '1px solid #E5E5E5',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* 画像 */}
                  <div style={{
                    width: '100%',
                    paddingTop: '100%',
                    position: 'relative',
                    backgroundColor: '#F9F9F9'
                  }}>
                    <img
                      src={item.thumbnail_url || item.image_url}
                      alt={item.title}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>

                  {/* 情報 */}
                  <div style={{ padding: '16px' }}>
                    {/* カテゴリ */}
                    {item.category && (
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        border: '1px solid #E5E5E5',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#6B6B6B',
                        marginBottom: '8px'
                      }}>
                        {getCategoryLabel(item.category)}
                      </div>
                    )}

                    {/* タイトル */}
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#1A1A1A',
                      marginBottom: '8px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.title}
                    </h3>

                    {/* クリエイター情報 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#E5E5E5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
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
                      <span style={{
                        fontSize: '14px',
                        color: '#6B6B6B'
                      }}>
                        {item.profiles?.display_name || '名前未設定'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}