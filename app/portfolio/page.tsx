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
        <div className="container">
          {/* ヘッダー */}
          <div className="flex-between mb-40">
            <h1 className="page-title">ポートフォリオ</h1>
            <Link href="/portfolio/upload" className="btn-primary">
              + 作品をアップロード
            </Link>
          </div>

          {/* フィルター */}
          <div className="filter-box">
            <label className="text-small text-gray mb-12" style={{ display: 'block' }}>
              カテゴリで絞り込み
            </label>
            <div className="filter-buttons">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`filter-button ${categoryFilter === 'all' ? 'active' : ''}`}
              >
                すべて
              </button>
              {['illustration', 'manga', 'novel', 'music', 'voice', 'video', 'game', '3d', 'other'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`filter-button ${categoryFilter === cat ? 'active' : ''}`}
                >
                  {getCategoryLabel(cat)}
                </button>
              ))}
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
              作品が見つかりませんでした
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="grid-creators">
              {items.map((item) => (
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
                    <h3 className="card-subtitle text-ellipsis mb-8">
                      {item.title}
                    </h3>

                    {/* クリエイター情報 */}
                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                      <div className="avatar avatar-small">
                        {item.profiles?.avatar_url ? (
                          <img
                            src={item.profiles.avatar_url}
                            alt={item.profiles.display_name || ''}
                          />
                        ) : (
                          item.profiles?.display_name?.charAt(0) || '?'
                        )}
                      </div>
                      <span className="text-small text-gray">
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