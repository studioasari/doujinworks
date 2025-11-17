'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase' 
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import Footer from '../components/Footer'

type Creator = {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  role: string
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'creator' | 'both'>('all')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchCreators()
  }, [roleFilter])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  async function fetchCreators() {
    setLoading(true)
    
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('is_creator', true)
      .order('created_at', { ascending: false })

    if (roleFilter === 'creator') {
      query = query.eq('role', 'creator')
    } else if (roleFilter === 'both') {
      query = query.eq('role', 'both')
    }

    const { data, error } = await query

    if (error) {
      console.error('クリエイター取得エラー:', error)
    } else {
      setCreators(data || [])
    }
    
    setLoading(false)
  }

  const filteredCreators = creators.filter(creator => {
    if (!searchQuery) return true
    const displayName = creator.display_name || ''
    const bio = creator.bio || ''
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           bio.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          {/* タイトル */}
          <h1 className="page-title mb-40">
            クリエイター一覧
          </h1>

          {/* 検索・フィルターエリア */}
          <div className="filter-box">
            {/* 検索ボックス */}
            <div className="mb-24">
              <label className="text-small text-gray mb-8" style={{ display: 'block' }}>
                キーワード検索
              </label>
              <input
                type="text"
                placeholder="クリエイター名や自己紹介で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
              />
            </div>

            {/* 役割フィルター */}
            <div>
              <label className="text-small text-gray mb-8" style={{ display: 'block' }}>
                役割で絞り込み
              </label>
              <div className="filter-buttons">
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`filter-button ${roleFilter === 'all' ? 'active' : ''}`}
                  style={{ borderRadius: '4px' }}
                >
                  すべて
                </button>
                <button
                  onClick={() => setRoleFilter('creator')}
                  className={`filter-button ${roleFilter === 'creator' ? 'active' : ''}`}
                  style={{ borderRadius: '4px' }}
                >
                  クリエイターのみ
                </button>
                <button
                  onClick={() => setRoleFilter('both')}
                  className={`filter-button ${roleFilter === 'both' ? 'active' : ''}`}
                  style={{ borderRadius: '4px' }}
                >
                  両方
                </button>
              </div>
            </div>
          </div>

          {/* 検索結果件数 */}
          <p className="text-small text-gray mb-24">
            {filteredCreators.length}件のクリエイター
          </p>

          {/* ローディング */}
          {loading && (
            <div className="loading-state">
              読み込み中...
            </div>
          )}

          {/* クリエイターカード一覧 */}
          {!loading && filteredCreators.length === 0 && (
            <div className="empty-state">
              クリエイターが見つかりませんでした
            </div>
          )}

          {!loading && filteredCreators.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {filteredCreators.map((creator) => (
                <Link
                  key={creator.id}
                  href={`/creators/${creator.id}`}
                  className="card p-24"
                >
                  {/* アバター */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E5E5',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
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

                  {/* 表示名 */}
                  <h2 className="card-title mb-8">
                    {creator.display_name || '名前未設定'}
                  </h2>

                  {/* 役割バッジ */}
                  <span className="badge badge-category mb-12" style={{ display: 'inline-block' }}>
                    {creator.role === 'creator' && 'クリエイター'}
                    {creator.role === 'client' && 'クライアント'}
                    {creator.role === 'both' && 'クリエイター・クライアント'}
                  </span>

                  {/* 自己紹介 */}
                  <p className="text-small text-gray text-clamp-2" style={{ 
                    lineHeight: '1.6',
                    WebkitLineClamp: 3
                  }}>
                    {creator.bio || '自己紹介が登録されていません'}
                  </p>
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