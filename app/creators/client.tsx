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
  is_accepting_orders: boolean
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
      .select('id, username, display_name, bio, avatar_url, account_type, is_accepting_orders')
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
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      <div className="creators-page">
        <div className="creators-container">
          {/* タイトル */}
          <h1 className="creators-title">クリエイター一覧</h1>

          {/* 検索・フィルターエリア */}
          <div className="creators-filter-box">
            {/* 検索ボックス */}
            <div className="creators-search-group">
              <label className="creators-label">キーワード検索</label>
              <div className="creators-search-input-wrap">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="クリエイター名やユーザーIDで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="creators-search-input"
                />
              </div>
            </div>

            {/* アカウント種別フィルター */}
            <div className="creators-filter-group">
              <label className="creators-label">アカウント種別</label>
              <div className="creators-filter-tabs">
                <button
                  onClick={() => setAccountTypeFilter('all')}
                  className={`creators-filter-tab ${accountTypeFilter === 'all' ? 'active' : ''}`}
                >
                  すべて
                </button>
                <button
                  onClick={() => setAccountTypeFilter('casual')}
                  className={`creators-filter-tab ${accountTypeFilter === 'casual' ? 'active' : ''}`}
                >
                  一般利用
                </button>
                <button
                  onClick={() => setAccountTypeFilter('business')}
                  className={`creators-filter-tab ${accountTypeFilter === 'business' ? 'active' : ''}`}
                >
                  ビジネス利用
                </button>
              </div>
            </div>
          </div>

          {/* 検索結果件数 */}
          <p className="creators-result-count">
            {filteredCreators.length}件のクリエイター
          </p>

          {/* ローディング */}
          {loading && (
            <div className="creators-loading">
              <i className="fas fa-spinner fa-spin"></i>
              <span>読み込み中...</span>
            </div>
          )}

          {/* 空状態 */}
          {!loading && filteredCreators.length === 0 && (
            <div className="creators-empty">
              <i className="fas fa-users-slash"></i>
              <p>クリエイターが見つかりませんでした</p>
            </div>
          )}

          {/* クリエイターカード一覧 */}
          {!loading && filteredCreators.length > 0 && (
            <div className="creators-grid">
              {filteredCreators.map((creator) => (
                <Link
                  key={creator.id}
                  href={`/creators/${creator.username}`}
                  className="creators-card"
                >
                  {/* カード上部 */}
                  <div className="creators-card-header">
                    {/* アバター */}
                    <div className="creators-avatar">
                      {creator.avatar_url ? (
                        <img
                          src={creator.avatar_url}
                          alt={creator.display_name || ''}
                        />
                      ) : (
                        <span>{creator.display_name?.charAt(0) || '?'}</span>
                      )}
                    </div>

                    {/* 表示名 */}
                    <h2 className="creators-card-name">
                      {creator.display_name || '名前未設定'}
                    </h2>

                    {/* Username */}
                    {creator.username && (
                      <p className="creators-card-username">@{creator.username}</p>
                    )}

                    {/* バッジエリア */}
                    <div className="creators-card-badges">
                      <span className="creators-type-badge">
                        {creator.account_type === 'business' ? 'ビジネス' : '一般'}
                      </span>
                      {creator.account_type === 'business' && (
                        <span className={`creators-status-badge ${creator.is_accepting_orders ? 'accepting' : 'paused'}`}>
                          <i className="fas fa-circle"></i>
                          {creator.is_accepting_orders ? '受付中' : '受付停止'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* カード下部 - 自己紹介 */}
                  <div className="creators-card-body">
                    <p className="creators-card-bio">
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