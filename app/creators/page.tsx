'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase' 
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import Footer from '../components/Footer'

type Creator = {
  id: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  account_type: string | null
  can_receive_work: boolean
  can_request_work: boolean
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'casual' | 'business'>('all')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchCreators()
  }, [accountTypeFilter])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
    }
  }

  async function fetchCreators() {
    setLoading(true)
    
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (accountTypeFilter === 'casual') {
      query = query.eq('account_type', 'casual')
    } else if (accountTypeFilter === 'business') {
      query = query.eq('account_type', 'business')
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
    const username = creator.username || ''
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
           username.toLowerCase().includes(searchQuery.toLowerCase())
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
                placeholder="クリエイター名やユーザーIDで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
              />
            </div>

            {/* アカウント種別フィルター */}
            <div>
              <label className="text-small text-gray mb-8" style={{ display: 'block' }}>
                アカウント種別で絞り込み
              </label>
              <div className="filter-buttons">
                <button
                  onClick={() => setAccountTypeFilter('all')}
                  className={`filter-button ${accountTypeFilter === 'all' ? 'active' : ''}`}
                  style={{ borderRadius: '4px' }}
                >
                  すべて
                </button>
                <button
                  onClick={() => setAccountTypeFilter('casual')}
                  className={`filter-button ${accountTypeFilter === 'casual' ? 'active' : ''}`}
                  style={{ borderRadius: '4px' }}
                >
                  一般利用
                </button>
                <button
                  onClick={() => setAccountTypeFilter('business')}
                  className={`filter-button ${accountTypeFilter === 'business' ? 'active' : ''}`}
                  style={{ borderRadius: '4px' }}
                >
                  ビジネス利用
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {filteredCreators.map((creator) => (
                <Link
                  key={creator.id}
                  href={`/creators/${creator.username}`}
                  className="card"
                  style={{ padding: 0, overflow: 'hidden' }}
                >
                  {/* カード上部 - アバターエリア */}
                  <div style={{
                    backgroundColor: '#FAFAFA',
                    padding: '20px 16px 16px',
                    textAlign: 'center',
                    borderBottom: '1px solid #E5E5E5'
                  }}>
                    {/* アバター */}
                    <div style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      backgroundColor: '#E5E5E5',
                      margin: '0 auto 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      color: '#6B6B6B',
                      overflow: 'hidden',
                      border: '2px solid #FFFFFF'
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
                    <h2 style={{ 
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1A1A1A',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {creator.display_name || '名前未設定'}
                    </h2>

                    {/* Username */}
                    {creator.username && (
                      <p style={{
                        fontSize: '11px',
                        color: '#6B6B6B',
                        marginBottom: '8px'
                      }}>
                        @{creator.username}
                      </p>
                    )}

                    {/* アカウント種別バッジ */}
                    <span className="badge badge-category" style={{
                      fontSize: '10px',
                      padding: '3px 8px'
                    }}>
                      {creator.account_type === 'casual' ? '一般利用' : 'ビジネス利用'}
                    </span>
                  </div>

                  {/* カード下部 - 自己紹介エリア */}
                  <div style={{ padding: '12px' }}>
                    <p style={{ 
                      fontSize: '12px',
                      color: '#6B6B6B',
                      lineHeight: '1.5',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {creator.bio || '自己紹介が登録されていません'}
                    </p>
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