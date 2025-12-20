'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

type WorkRequest = {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  category: string
  status: string
  request_type: string
  created_at: string
  requester_id: string
  payment_type: string | null
  hourly_rate_min: number | null
  hourly_rate_max: number | null
  price_negotiable: boolean | null
  job_features: string[] | null
  required_skills: string[] | null
  number_of_positions: number | null
  application_deadline: string | null
  profiles: {
    id: string
    display_name: string | null
    avatar_url: string | null
    username: string | null
  }
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<WorkRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<WorkRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // 追加フィルター
  const [budgetRange, setBudgetRange] = useState<'all' | 'low' | 'mid' | 'high'>('all')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'fixed' | 'hourly'>('all')
  const [jobFeatureFilter, setJobFeatureFilter] = useState<string>('all')
  
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [currentProfileId])

  useEffect(() => {
    applyFilters()
  }, [requests, categoryFilter, searchQuery, budgetRange, paymentTypeFilter, jobFeatureFilter])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      setIsLoggedIn(true)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        setCurrentProfileId(profile.id)
      }
    } else {
      setIsLoggedIn(false)
    }
  }

  async function fetchRequests() {
    setLoading(true)

    let query = supabase
      .from('work_requests')
      .select('*, profiles!work_requests_requester_id_fkey(id, display_name, avatar_url, username)')
      .eq('request_type', 'public')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('依頼取得エラー:', error)
    } else {
      setRequests(data || [])
    }

    setLoading(false)
  }

  function applyFilters() {
    let filtered = [...requests]

    // カテゴリフィルター
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === categoryFilter)
    }

    // 検索クエリ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(query) || 
        r.description.toLowerCase().includes(query) ||
        r.required_skills?.some(skill => skill.toLowerCase().includes(query))
      )
    }

    // 予算範囲フィルター
    if (budgetRange !== 'all') {
      filtered = filtered.filter(r => {
        const max = r.budget_max || 0
        if (budgetRange === 'low') return max > 0 && max <= 30000
        if (budgetRange === 'mid') return max > 30000 && max <= 100000
        if (budgetRange === 'high') return max > 100000
        return true
      })
    }

    // 支払い方式フィルター
    if (paymentTypeFilter !== 'all') {
      filtered = filtered.filter(r => r.payment_type === paymentTypeFilter)
    }

    // 仕事の特徴フィルター
    if (jobFeatureFilter !== 'all') {
      filtered = filtered.filter(r => 
        r.job_features?.includes(jobFeatureFilter)
      )
    }

    setFilteredRequests(filtered)
  }

  function getCategoryLabel(category: string) {
    const categories: { [key: string]: string } = {
      illustration: 'イラスト',
      manga: 'マンガ',
      novel: '小説',
      music: '音楽',
      voice: 'ボイス',
      video: '動画',
      logo: 'ロゴ',
      design: 'デザイン',
      other: 'その他'
    }
    return categories[category] || category
  }

  function getCategoryIcon(category: string) {
    const icons: { [key: string]: string } = {
      illustration: 'fa-image',
      manga: 'fa-book',
      novel: 'fa-file-alt',
      music: 'fa-music',
      voice: 'fa-microphone',
      video: 'fa-video',
      logo: 'fa-trademark',
      design: 'fa-palette',
      other: 'fa-ellipsis-h'
    }
    return icons[category] || 'fa-file'
  }

  function getStatusLabel(status: string) {
    const statuses: { [key: string]: string } = {
      open: '募集中',
      awaiting_payment: '仮払い待ち',
      in_progress: '作業中',
      delivered: '納品済み',
      completed: '完了',
      cancelled: 'キャンセル'
    }
    return statuses[status] || status
  }

  function getStatusColor(status: string) {
    const colors: { [key: string]: string } = {
      open: '#4CAF50',
      awaiting_payment: '#FF9800',
      in_progress: '#2196F3',
      delivered: '#9C27B0',
      completed: '#607D8B',
      cancelled: '#9E9E9E'
    }
    return colors[status] || '#9E9E9E'
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今日'
    if (days === 1) return '昨日'
    if (days < 7) return `${days}日前`
    
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  }

  function getJobFeatureLabel(feature: string) {
    const labels: { [key: string]: string } = {
      no_skill: 'スキル不要',
      skill_welcome: '専門スキル歓迎',
      one_time: '単発',
      continuous: '継続あり',
      flexible_time: 'スキマ時間歓迎'
    }
    return labels[feature] || feature
  }

  return (
    <>
      <style jsx>{`
        .request-card {
          position: relative;
          overflow: hidden;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .request-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: #000000;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .request-card:hover::before {
          opacity: 1;
        }
        
        .request-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }

        .grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }

        .filter-chip {
          padding: 8px 16px;
          border: 1.5px solid #E0E0E0;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: #FFFFFF;
          color: #666666;
        }

        .filter-chip:hover {
          border-color: #000000;
          background: #F5F5F5;
        }

        .filter-chip.active {
          background: #000000;
          color: #FFFFFF;
          border-color: #000000;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .grid-container {
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 16px;
          }
        }

        @media (max-width: 768px) {
          .page-container {
            padding: 20px 16px !important;
          }
          
          .search-bar {
            width: 100% !important;
            font-size: 15px !important;
            padding: 14.25px 18px 14.25px 48px !important;
            height: 50px !important;
          }
          
          .filter-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          
          .grid-container {
            grid-template-columns: 1fr !important;
            gap: 16px;
          }

          .request-card {
            padding: 20px !important;
          }

          .header-section {
            margin-bottom: 24px !important;
          }

          .page-title {
            font-size: 24px !important;
            margin-bottom: 4px !important;
          }

          .result-count {
            font-size: 13px !important;
          }

          .create-button {
            padding: 12px 20px !important;
            font-size: 14px !important;
          }

          .search-filter-row {
            flex-direction: column !important;
            gap: 10px !important;
            margin-bottom: 12px !important;
          }

          .search-filter-row > div {
            width: 100%;
          }

          .filter-toggle-btn {
            width: 100%;
            justify-content: center !important;
            padding: 14.25px 20px !important;
            height: 50px !important;
          }

          .filter-panel {
            padding: 20px !important;
            margin-bottom: 16px !important;
          }

          .filter-chips {
            gap: 6px !important;
            margin-bottom: 20px !important;
          }

          .filter-chip {
            font-size: 12px !important;
            padding: 7px 14px !important;
          }
        }
      `}</style>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#F8F8F8' }}>
        <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '48px 24px' }}>
          {/* ヘッダー */}
          <div className="header-section" style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div>
              <h1 className="page-title" style={{ 
                fontSize: '36px',
                fontWeight: '800',
                color: '#000000',
                marginBottom: '8px',
                letterSpacing: '-0.03em'
              }}>
                依頼を探す
              </h1>
              {!loading && (
                <div className="result-count" style={{ fontSize: '15px', color: '#666666', fontWeight: '500' }}>
                  {filteredRequests.length}件
                </div>
              )}
            </div>
            {isLoggedIn && (
              <Link 
                href="/requests/create" 
                className="create-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 32px',
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#333333'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#000000'
                }}
              >
                <i className="fas fa-plus"></i>
                新規作成
              </Link>
            )}
          </div>

          {/* 検索バー & フィルターボタン */}
          <div className="search-filter-row" style={{ 
            display: 'flex',
            gap: '16px',
            marginBottom: '16px',
            alignItems: 'center'
          }}>
            {/* 検索バー */}
            <div style={{ flex: 1, position: 'relative' }}>
              <i className="fas fa-search" style={{
                position: 'absolute',
                left: '18px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#999999',
                fontSize: '14px'
              }}></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="タイトル、説明、スキルで検索"
                className="search-bar"
                style={{
                  width: '100%',
                  padding: '14.25px 18px 14.25px 48px',
                  border: '1.5px solid #E0E0E0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  transition: 'all 0.2s',
                  fontWeight: '500',
                  boxSizing: 'border-box',
                  height: '50px'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#000000'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E0E0E0'
                }}
              />
            </div>

            {/* フィルター切り替えボタン */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="filter-toggle-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14.25px 24px',
                border: `1.5px solid ${showFilters ? '#000000' : '#E0E0E0'}`,
                borderRadius: '8px',
                backgroundColor: showFilters ? '#000000' : '#FFFFFF',
                color: showFilters ? '#FFFFFF' : '#666666',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                height: '50px'
              }}
              onMouseEnter={(e) => {
                if (!showFilters) {
                  e.currentTarget.style.borderColor = '#000000'
                  e.currentTarget.style.backgroundColor = '#F5F5F5'
                }
              }}
              onMouseLeave={(e) => {
                if (!showFilters) {
                  e.currentTarget.style.borderColor = '#E0E0E0'
                  e.currentTarget.style.backgroundColor = '#FFFFFF'
                }
              }}
            >
              <i className="fas fa-sliders-h"></i>
              詳細フィルター
            </button>
          </div>

          {/* 詳細フィルターパネル */}
          {showFilters && (
            <div className="filter-panel" style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1.5px solid #E0E0E0'
            }}>
              <div className="filter-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                {/* 予算範囲 */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#000000',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    予算
                  </label>
                  <select
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1.5px solid #E0E0E0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#000000'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#E0E0E0'}
                  >
                    <option value="all">すべて</option>
                    <option value="low">〜3万円</option>
                    <option value="mid">3万〜10万円</option>
                    <option value="high">10万円〜</option>
                  </select>
                </div>

                {/* 支払い方式 */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#000000',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    支払い方式
                  </label>
                  <select
                    value={paymentTypeFilter}
                    onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1.5px solid #E0E0E0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#000000'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#E0E0E0'}
                  >
                    <option value="all">すべて</option>
                    <option value="fixed">固定報酬制</option>
                    <option value="hourly">時間単価制</option>
                  </select>
                </div>

                {/* 仕事の特徴 */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#000000',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    仕事の特徴
                  </label>
                  <select
                    value={jobFeatureFilter}
                    onChange={(e) => setJobFeatureFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1.5px solid #E0E0E0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#000000'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#E0E0E0'}
                  >
                    <option value="all">すべて</option>
                    <option value="no_skill">スキル不要</option>
                    <option value="skill_welcome">専門スキル歓迎</option>
                    <option value="one_time">単発</option>
                    <option value="continuous">継続あり</option>
                    <option value="flexible_time">スキマ時間歓迎</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* カテゴリチップ */}
          <div className="filter-chips" style={{ 
            display: 'flex',
            gap: '8px',
            marginBottom: '32px',
            flexWrap: 'wrap'
          }}>
            <button
              className={`filter-chip ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              すべて
            </button>
            <button
              className={`filter-chip ${categoryFilter === 'illustration' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('illustration')}
            >
              <i className="fas fa-image" style={{ marginRight: '6px', fontSize: '11px' }}></i>
              イラスト
            </button>
            <button
              className={`filter-chip ${categoryFilter === 'manga' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('manga')}
            >
              <i className="fas fa-book" style={{ marginRight: '6px', fontSize: '11px' }}></i>
              マンガ
            </button>
            <button
              className={`filter-chip ${categoryFilter === 'novel' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('novel')}
            >
              <i className="fas fa-file-alt" style={{ marginRight: '6px', fontSize: '11px' }}></i>
              小説
            </button>
            <button
              className={`filter-chip ${categoryFilter === 'music' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('music')}
            >
              <i className="fas fa-music" style={{ marginRight: '6px', fontSize: '11px' }}></i>
              音楽
            </button>
            <button
              className={`filter-chip ${categoryFilter === 'design' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('design')}
            >
              <i className="fas fa-palette" style={{ marginRight: '6px', fontSize: '11px' }}></i>
              デザイン
            </button>
            <button
              className={`filter-chip ${categoryFilter === 'video' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('video')}
            >
              <i className="fas fa-video" style={{ marginRight: '6px', fontSize: '11px' }}></i>
              動画
            </button>
          </div>

          {/* ローディング */}
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#999999'
            }}>
              <div style={{ 
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '3px solid #E0E0E0',
                borderTopColor: '#000000',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}></div>
            </div>
          )}

          {/* 空の状態 */}
          {!loading && filteredRequests.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px dashed #D0D0D0'
            }}>
              <i className="fas fa-search" style={{ fontSize: '56px', color: '#D0D0D0', marginBottom: '20px' }}></i>
              <p style={{ fontSize: '16px', color: '#666666', marginBottom: '8px', fontWeight: '700' }}>
                {searchQuery ? '検索条件に一致する依頼が見つかりませんでした' : '依頼が見つかりませんでした'}
              </p>
              <p style={{ fontSize: '14px', color: '#999999' }}>
                別の条件で検索してみてください
              </p>
            </div>
          )}

          {/* 依頼一覧（グリッドレイアウト） */}
          {!loading && filteredRequests.length > 0 && (
            <div className="grid-container">
              {filteredRequests.map((request) => {
                const daysUntilDeadline = request.application_deadline 
                  ? Math.ceil((new Date(request.application_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null
                
                return (
                  <Link
                    key={request.id}
                    href={`/requests/${request.id}`}
                    className="request-card"
                    style={{ 
                      padding: '24px',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #E0E0E0',
                      borderRadius: '12px',
                      textDecoration: 'none'
                    }}
                  >
                    {/* カテゴリバッジ */}
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: '#000000',
                        color: '#FFFFFF',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        <i className={`fas ${getCategoryIcon(request.category)}`} style={{ fontSize: '10px' }}></i>
                        {getCategoryLabel(request.category)}
                      </span>
                    </div>

                    {/* タイトル */}
                    <h2 style={{ 
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#000000',
                      marginBottom: '12px',
                      lineHeight: '1.4',
                      letterSpacing: '-0.02em',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '50px'
                    }}>
                      {request.title}
                    </h2>

                    {/* 説明 */}
                    <p style={{ 
                      fontSize: '13px',
                      color: '#666666',
                      lineHeight: '1.6',
                      marginBottom: '20px',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '62px'
                    }}>
                      {request.description}
                    </p>

                    {/* 予算情報 */}
                    <div style={{
                      padding: '20px',
                      backgroundColor: '#F8F8F8',
                      borderRadius: '10px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ 
                        fontSize: '10px', 
                        color: '#999999',
                        fontWeight: '700',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                      }}>
                        {request.payment_type === 'hourly' ? '時間単価' : '固定報酬'}
                      </div>
                      
                      {request.payment_type === 'hourly' ? (
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: '700', 
                          color: '#000000',
                          lineHeight: '1.2',
                          letterSpacing: '-0.02em'
                        }}>
                          {request.hourly_rate_min && request.hourly_rate_max ? (
                            <>
                              {request.hourly_rate_min.toLocaleString()}〜{request.hourly_rate_max.toLocaleString()}
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#666666' }}>円/時</span>
                            </>
                          ) : request.hourly_rate_min ? (
                            <>
                              {request.hourly_rate_min.toLocaleString()}
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#666666' }}>円/時〜</span>
                            </>
                          ) : request.hourly_rate_max ? (
                            <>
                              〜{request.hourly_rate_max.toLocaleString()}
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#666666' }}>円/時</span>
                            </>
                          ) : (
                            <span style={{ fontSize: '14px', color: '#999999', fontWeight: '600' }}>応相談</span>
                          )}
                        </div>
                      ) : request.price_negotiable ? (
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#000000' }}>
                          相談して決める
                        </div>
                      ) : request.budget_min || request.budget_max ? (
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: '700', 
                          color: '#000000',
                          lineHeight: '1.2',
                          letterSpacing: '-0.02em'
                        }}>
                          {request.budget_min && request.budget_max ? (
                            <>
                              {request.budget_min.toLocaleString()}〜{request.budget_max.toLocaleString()}
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#666666' }}>円</span>
                            </>
                          ) : request.budget_min ? (
                            <>
                              {request.budget_min.toLocaleString()}
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#666666' }}>円〜</span>
                            </>
                          ) : (
                            <>
                              〜{request.budget_max?.toLocaleString()}
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#666666' }}>円</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '14px', color: '#999999', fontWeight: '600' }}>
                          金額未設定
                        </div>
                      )}
                    </div>

                    {/* 締切・募集情報 */}
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      marginBottom: '20px'
                    }}>
                      {/* 契約数 */}
                      <div style={{
                        padding: '14px',
                        backgroundColor: '#F8F8F8',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '10px', color: '#999999', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          契約数
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#000000', letterSpacing: '-0.02em' }}>
                          0<span style={{ fontSize: '12px', fontWeight: '600', color: '#666666' }}> / {request.number_of_positions || 1}</span>
                        </div>
                      </div>

                      {/* 応募期限 */}
                      {request.application_deadline && daysUntilDeadline !== null && (
                        <div style={{
                          padding: '14px',
                          backgroundColor: daysUntilDeadline <= 3 ? '#F5F5F5' : '#F8F8F8',
                          borderRadius: '8px',
                          textAlign: 'center',
                          border: daysUntilDeadline <= 3 ? '1.5px solid #E0E0E0' : 'none'
                        }}>
                          <div style={{ fontSize: '10px', color: '#999999', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            応募期限
                          </div>
                          {daysUntilDeadline > 0 ? (
                            <div style={{ fontSize: '18px', fontWeight: '700', color: daysUntilDeadline <= 3 ? '#000000' : '#000000', letterSpacing: '-0.02em' }}>
                              {daysUntilDeadline}<span style={{ fontSize: '12px', fontWeight: '600', color: '#666666' }}>日</span>
                            </div>
                          ) : daysUntilDeadline === 0 ? (
                            <div style={{ fontSize: '13px', color: '#000000', fontWeight: '700' }}>
                              本日締切
                            </div>
                          ) : (
                            <div style={{ fontSize: '13px', color: '#999999', fontWeight: '700' }}>
                              締切済み
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* スキル・特徴タグ */}
                    <div style={{ marginBottom: '20px', minHeight: '60px' }}>
                      {/* 求めるスキル */}
                      {request.required_skills && request.required_skills.length > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: '6px',
                          marginBottom: '8px'
                        }}>
                          {request.required_skills.slice(0, 3).map((skill, index) => (
                            <span key={index} style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              backgroundColor: '#F0F0F0',
                              color: '#000000',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              {skill}
                            </span>
                          ))}
                          {request.required_skills.length > 3 && (
                            <span style={{ 
                              fontSize: '11px', 
                              color: '#999999', 
                              alignSelf: 'center',
                              padding: '6px 0',
                              fontWeight: '700'
                            }}>
                              +{request.required_skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 仕事の特徴 */}
                      {request.job_features && request.job_features.length > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: '6px'
                        }}>
                          {request.job_features.slice(0, 2).map((feature, index) => (
                            <span key={index} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              backgroundColor: '#E8E8E8',
                              color: '#333333',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              <i className="fas fa-check" style={{ fontSize: '8px' }}></i>
                              {getJobFeatureLabel(feature)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 依頼者情報 */}
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '16px',
                      borderTop: '1.5px solid #F0F0F0',
                      marginTop: 'auto'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#E0E0E0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          {request.profiles?.avatar_url ? (
                            <img 
                              src={request.profiles.avatar_url} 
                              alt={request.profiles.display_name || ''} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          ) : (
                            <i className="fas fa-user" style={{ color: '#999999', fontSize: '14px' }}></i>
                          )}
                        </div>
                        <div style={{ 
                          fontSize: '13px', 
                          fontWeight: '700',
                          color: '#000000'
                        }}>
                          {request.profiles?.display_name || '名前未設定'}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#999999', fontWeight: '600' }}>
                        {formatDate(request.created_at)}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}