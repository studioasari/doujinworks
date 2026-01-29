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

type AccountTypeFilter = 'all' | 'casual' | 'business'

const ACCOUNT_TYPES = [
  { value: 'all', label: 'すべて' },
  { value: 'casual', label: '一般利用' },
  { value: 'business', label: 'ビジネス利用' },
]

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState<AccountTypeFilter>('all')
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
        {/* サイドバー */}
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>
            <button 
              onClick={() => setAccountTypeFilter('all')}
              className={`${styles.navItem} ${accountTypeFilter === 'all' ? styles.active : ''}`}
            >
              すべて
            </button>
          </nav>
          <div className={styles.separator}></div>
          <div className={styles.sidebarSection}>
            <div className={styles.sectionTitle}>アカウント種別</div>
            <button 
              onClick={() => setAccountTypeFilter('casual')}
              className={`${styles.navItem} ${accountTypeFilter === 'casual' ? styles.active : ''}`}
            >
              一般利用
            </button>
            <button 
              onClick={() => setAccountTypeFilter('business')}
              className={`${styles.navItem} ${accountTypeFilter === 'business' ? styles.active : ''}`}
            >
              ビジネス利用
            </button>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className={styles.main}>
          <div className={styles.mainInner}>
            {/* ページヘッダー */}
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>クリエイター一覧</h1>
              <p className={styles.pageDescription}>
                様々なジャンルで活躍するクリエイターを探してみましょう
              </p>
            </div>

            {/* モバイル用タブ */}
            <div className={styles.mobileTabs}>
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setAccountTypeFilter(type.value as AccountTypeFilter)}
                  className={`${styles.mobileTab} ${accountTypeFilter === type.value ? styles.active : ''}`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* フィルターバー */}
            <div className={styles.filterBar}>
              <div className={styles.searchWrapper}>
                <i className={`fas fa-magnifying-glass ${styles.searchIcon}`}></i>
                <input
                  type="text"
                  placeholder="クリエイター名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              <span className={styles.resultCount}>
                <span className={styles.resultNumber}>{filteredCreators.length}</span>件
              </span>
            </div>

            {/* ローディング */}
            {loading && (
              <div className={styles.loadingState}>
                <i className="fas fa-spinner fa-spin"></i>
                <p>読み込み中...</p>
              </div>
            )}

            {/* 空状態 */}
            {!loading && filteredCreators.length === 0 && (
              <div className={styles.emptyState}>
                <i className="far fa-user"></i>
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
                    className={styles.creatorCard}
                  >
                    {/* 左上バッジ（一般/ビジネス） */}
                    <span className={styles.typeBadge}>
                      {creator.account_type === 'business' ? 'ビジネス' : '一般'}
                    </span>

                    {/* アバター */}
                    <div className={styles.avatar}>
                      {creator.avatar_url ? (
                        <Image
                          src={creator.avatar_url}
                          alt={creator.display_name || ''}
                          width={64}
                          height={64}
                        />
                      ) : (
                        <span className={styles.avatarInitial}>
                          {creator.display_name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>

                    {/* 名前エリア */}
                    <div className={styles.nameArea}>
                      <h2 className={styles.creatorName}>
                        {creator.display_name || '名前未設定'}
                      </h2>
                      {creator.username && (
                        <p className={styles.creatorUsername}>@{creator.username}</p>
                      )}
                    </div>

                    {/* 受付状態バッジ（ビジネスのみ） */}
                    {creator.account_type === 'business' && (
                      <span className={`${styles.statusBadge} ${creator.is_accepting_orders ? styles.statusOpen : styles.statusClosed}`}>
                        <i className="fas fa-circle" style={{ fontSize: '6px' }}></i>
                        {creator.is_accepting_orders ? '受付中' : '受付停止'}
                      </span>
                    )}

                    {/* 自己紹介 */}
                    <p className={styles.creatorBio}>
                      {creator.bio || '自己紹介が登録されていません'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}