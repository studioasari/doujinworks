'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import DashboardSidebar from '../../components/DashboardSidebar'

type PortfolioItem = {
  id: string
  title: string
  description: string | null
  category: string | null
  image_url: string
  thumbnail_url: string | null
  is_public: boolean
  view_count: number
  created_at: string
}

export default function PortfolioManagePage() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      fetchMyPortfolio()
    }
  }, [currentProfileId, filter])

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
    } else {
      alert('プロフィールが見つかりません')
      router.push('/profile')
    }
  }

  async function fetchMyPortfolio() {
    setLoading(true)

    let query = supabase
      .from('portfolio_items')
      .select('*')
      .eq('creator_id', currentProfileId)
      .order('created_at', { ascending: false })

    if (filter === 'public') {
      query = query.eq('is_public', true)
    } else if (filter === 'private') {
      query = query.eq('is_public', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('作品取得エラー:', error)
    } else {
      setItems(data || [])
    }

    setLoading(false)
  }

  async function handleDelete(itemId: string, title: string) {
    if (!confirm(`「${title}」を削除しますか？`)) return

    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    } else {
      alert('作品を削除しました')
      fetchMyPortfolio()
    }
  }

  async function togglePublic(itemId: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('portfolio_items')
      .update({ is_public: !currentStatus })
      .eq('id', itemId)

    if (error) {
      console.error('公開設定変更エラー:', error)
      alert('公開設定の変更に失敗しました')
    } else {
      fetchMyPortfolio()
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

  return (
    <>
      <Header />
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'flex-start'
      }}>
        <DashboardSidebar />

        <main style={{ 
          flex: 1, 
          padding: '40px',
          width: '100%',
          maxWidth: '100%',
          minHeight: '100vh'
        }}>
          {/* ヘッダー */}
          <div className="flex-between mb-40">
            <h1 className="page-title">作品管理</h1>
            <Link href="/portfolio/upload" className="btn-primary">
              + 作品をアップロード
            </Link>
          </div>

          {/* フィルター */}
          <div className="filter-box">
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <div>
                <label className="text-small text-gray mb-12" style={{ display: 'block' }}>
                  公開状態で絞り込み
                </label>
                <div className="filter-buttons">
                  <button
                    onClick={() => setFilter('all')}
                    className={`filter-button ${filter === 'all' ? 'active' : ''}`}
                  >
                    すべて
                  </button>
                  <button
                    onClick={() => setFilter('public')}
                    className={`filter-button ${filter === 'public' ? 'active' : ''}`}
                  >
                    公開中
                  </button>
                  <button
                    onClick={() => setFilter('private')}
                    className={`filter-button ${filter === 'private' ? 'active' : ''}`}
                  >
                    非公開
                  </button>
                </div>
              </div>
              <div className="text-small text-gray">
                {items.length}件の作品
              </div>
            </div>
          </div>

          {/* ローディング */}
          {loading && (
            <div className="loading-state">
              読み込み中...
            </div>
          )}

          {/* 作品一覧 */}
          {!loading && items.length === 0 && (
            <div className="empty-state">
              <p className="text-gray mb-24">
                まだ作品が登録されていません
              </p>
              <Link href="/portfolio/upload" className="btn-primary">
                作品をアップロード
              </Link>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {items.map((item) => (
                <div key={item.id} className="card-no-hover" style={{ overflow: 'hidden' }}>
                  {/* 画像 */}
                  <Link href={`/portfolio/${item.id}`}>
                    <div style={{
                      width: '100%',
                      paddingTop: '100%',
                      position: 'relative',
                      backgroundColor: '#F9F9F9',
                      cursor: 'pointer'
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
                      {/* 公開状態バッジ */}
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px'
                      }}>
                        <span className="badge" style={{
                          backgroundColor: item.is_public ? '#4CAF50' : '#9E9E9E',
                          color: '#FFFFFF',
                          fontWeight: '600',
                          padding: '4px 12px'
                        }}>
                          {item.is_public ? '公開中' : '非公開'}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* 情報 */}
                  <div style={{ padding: '16px' }}>
                    {/* カテゴリ */}
                    {item.category && (
                      <span className="badge badge-category mb-8" style={{ 
                        display: 'inline-block',
                        fontSize: '11px',
                        padding: '4px 10px'
                      }}>
                        {getCategoryLabel(item.category)}
                      </span>
                    )}

                    {/* タイトル */}
                    <Link href={`/portfolio/${item.id}`}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1A1A1A',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '12px',
                        cursor: 'pointer',
                        textDecoration: 'none'
                      }}>
                        {item.title}
                      </h3>
                    </Link>

                    {/* 統計 */}
                    <div className="text-tiny text-gray mb-16">
                      閲覧数: {item.view_count || 0} · {new Date(item.created_at).toLocaleDateString('ja-JP')}
                    </div>

                    {/* アクションボタン */}
                    <div className="flex gap-8">
                      <button
                        onClick={() => togglePublic(item.id, item.is_public)}
                        className="btn-secondary btn-small"
                        style={{ flex: 1 }}
                      >
                        {item.is_public ? '非公開にする' : '公開する'}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="btn-danger btn-small"
                        style={{ flex: 1 }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  )
}
