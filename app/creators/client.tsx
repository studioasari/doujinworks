'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase' 
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import Footer from '../components/Footer'
import styles from './page.module.css'

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
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          {/* ヘッダー */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>クリエイター一覧</h1>
            <p className={styles.pageDescription}>
              様々なジャンルで活躍するクリエイターを探してみましょう
            </p>
          </div>

          {/* 検索・フィルターエリア */}
          <div className={`card ${styles.filterCard}`}>
            {/* 検索ボックス */}
            <div className={styles.searchSection}>
              <label className="form-label">キーワード検索</label>
              <div className="search-bar">
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input
                  type="text"
                  placeholder="クリエイター名やユーザーIDで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* アカウント種別フィルター */}
            <div className={styles.filterSection}>
              <label className="form-label">アカウント種別</label>
              <div className="tabs">
                <button
                  onClick={() => setAccountTypeFilter('all')}
                  className={`tab ${accountTypeFilter === 'all' ? 'active' : ''}`}
                >
                  すべて
                </button>
                <button
                  onClick={() => setAccountTypeFilter('casual')}
                  className={`tab ${accountTypeFilter === 'casual' ? 'active' : ''}`}
                >
                  一般利用
                </button>
                <button
                  onClick={() => setAccountTypeFilter('business')}
                  className={`tab ${accountTypeFilter === 'business' ? 'active' : ''}`}
                >
                  ビジネス利用
                </button>
              </div>
            </div>
          </div>

          {/* 検索結果件数 */}
          <p className={styles.resultCount}>
            <span className={styles.resultNumber}>{filteredCreators.length}</span>
            件のクリエイター
          </p>

          {/* ローディング */}
          {loading && (
            <div className={styles.loadingState}>
              <i className="fas fa-spinner fa-spin"></i>
              <span>読み込み中...</span>
            </div>
          )}

          {/* 空状態 */}
          {!loading && filteredCreators.length === 0 && (
            <div className="empty-state">
              <i className="fa-regular fa-user"></i>
              <p>クリエイターが見つかりませんでした</p>
            </div>
          )}

          {/* クリエイターカード一覧 */}
          {!loading && filteredCreators.length > 0 && (
            <div className={styles.creatorsGrid}>
              {filteredCreators.map((creator) => (
                <Link
                  key={creator.id}
                  href={`/creators/${creator.username}`}
                  className={`card ${styles.creatorCard}`}
                >
                  {/* カード上部 */}
                  <div className={styles.cardHeader}>
                    {/* アバター */}
                    <div className={`avatar avatar-lg ${styles.avatar} ${creator.avatar_url ? styles.hasImage : ''}`}>
                      {creator.avatar_url ? (
                        <Image
                          src={creator.avatar_url}
                          alt={creator.display_name || ''}
                          width={80}
                          height={80}
                        />
                      ) : (
                        <span className={styles.avatarInitial}>
                          {creator.display_name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>

                    {/* 表示名 */}
                    <h2 className={styles.creatorName}>
                      {creator.display_name || '名前未設定'}
                    </h2>

                    {/* Username */}
                    {creator.username && (
                      <p className={styles.creatorUsername}>@{creator.username}</p>
                    )}

                    {/* バッジエリア */}
                    <div className={styles.badgeGroup}>
                      <span className="badge">
                        {creator.account_type === 'business' ? 'ビジネス' : '一般'}
                      </span>
                      {creator.account_type === 'business' && (
                        <span className={`badge ${creator.is_accepting_orders ? 'badge-open' : 'badge-closed'}`}>
                          <i className="fa-solid fa-circle fa-xs"></i>
                          {creator.is_accepting_orders ? '受付中' : '受付停止'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* カード下部 - 自己紹介 */}
                  <div className={styles.cardBody}>
                    <p className={styles.creatorBio}>
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