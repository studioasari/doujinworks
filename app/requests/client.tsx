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

export default function RequestsClient() {
  const [requests, setRequests] = useState<WorkRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<WorkRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [budgetRange, setBudgetRange] = useState<'all' | 'low' | 'mid' | 'high'>('all')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'fixed' | 'hourly'>('all')
  const [jobFeatureFilter, setJobFeatureFilter] = useState<string>('all')
  
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
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

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === categoryFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(query) || 
        r.description.toLowerCase().includes(query) ||
        r.required_skills?.some(skill => skill.toLowerCase().includes(query))
      )
    }

    if (budgetRange !== 'all') {
      filtered = filtered.filter(r => {
        const max = r.budget_max || 0
        if (budgetRange === 'low') return max > 0 && max <= 30000
        if (budgetRange === 'mid') return max > 30000 && max <= 100000
        if (budgetRange === 'high') return max > 100000
        return true
      })
    }

    if (paymentTypeFilter !== 'all') {
      filtered = filtered.filter(r => r.payment_type === paymentTypeFilter)
    }

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

  const categories = [
    { value: 'all', label: 'すべて', icon: null },
    { value: 'illustration', label: 'イラスト', icon: 'fa-image' },
    { value: 'manga', label: 'マンガ', icon: 'fa-book' },
    { value: 'novel', label: '小説', icon: 'fa-file-alt' },
    { value: 'music', label: '音楽', icon: 'fa-music' },
    { value: 'design', label: 'デザイン', icon: 'fa-palette' },
    { value: 'video', label: '動画', icon: 'fa-video' },
  ]

  return (
    <>
      <style jsx global>{`
        .requests-page {
          min-height: 100vh;
          background-color: #E8ECEF;
        }

        .requests-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 24px;
        }

        .requests-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .requests-title {
          font-size: 28px;
          font-weight: 700;
          color: #222222;
          margin: 0 0 4px 0;
        }

        .requests-count {
          font-size: 14px;
          color: #555555;
        }

        /* 新規作成ボタン - ニューモーフィズム浮き→凹み */
        .create-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 28px;
          background: #EEF0F3;
          color: #5B7C99;
          border: none;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          box-shadow: 3px 3px 6px #c5c9cc, -3px -3px 6px #ffffff;
          transition: all 0.15s ease;
        }

        .create-btn:hover {
          box-shadow: inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff;
        }

        .create-btn i {
          font-size: 12px;
        }

        /* 検索・フィルター行 */
        .search-filter-row {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-wrapper {
          flex: 1;
          min-width: 280px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #888888;
          font-size: 14px;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          height: 44px;
          padding: 0 18px 0 48px;
          background: #E8ECEF;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: #222222;
          box-shadow: inset 3px 3px 6px #c5c9cc, inset -3px -3px 6px #ffffff;
          transition: all 0.15s ease;
          outline: none;
        }

        .search-input::placeholder {
          color: #888888;
        }

        .search-input:focus {
          box-shadow: inset 4px 4px 8px #c5c9cc, inset -4px -4px 8px #ffffff;
        }

        /* フィルターセレクト - 通常時浮き、選択時凹み */
        .filter-select {
          height: 44px;
          padding: 0 36px 0 14px;
          background: #E8ECEF;
          border: none;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          color: #222222;
          cursor: pointer;
          box-shadow: 3px 3px 6px #c5c9cc, -3px -3px 6px #ffffff;
          transition: all 0.15s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23555555' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          outline: none;
          min-width: 140px;
        }

        .filter-select:hover {
          color: #5B7C99;
        }

        .filter-select:focus {
          box-shadow: inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff;
        }

        /* フィルター選択時（all以外）は凹み */
        .filter-select.active {
          color: #5B7C99;
          box-shadow: inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff;
        }

        /* カテゴリチップ - 非選択時フラット、選択時凹み */
        .category-chips {
          display: flex;
          gap: 10px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }

        .category-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: transparent;
          border: none;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          color: #555555;
          cursor: pointer;
          box-shadow: none;
          transition: all 0.15s ease;
        }

        .category-chip:hover {
          color: #5B7C99;
          background: rgba(91, 124, 153, 0.08);
        }

        .category-chip.active {
          background: #EEF0F3;
          color: #5B7C99;
          box-shadow: inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff;
        }

        .category-chip i {
          font-size: 11px;
        }

        /* グリッド */
        .requests-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }

        .request-card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 24px;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: all 0.2s ease;
        }

        .request-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }

        .card-category-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #5B7C99;
          color: #FFFFFF;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 16px;
          width: fit-content;
        }

        .card-category-badge i {
          font-size: 10px;
        }

        .card-title {
          font-size: 17px;
          font-weight: 700;
          color: #222222;
          margin-bottom: 10px;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 48px;
        }

        .card-description {
          font-size: 13px;
          color: #555555;
          line-height: 1.6;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 42px;
        }

        .card-budget-box {
          padding: 16px;
          background: #EEF0F3;
          border-radius: 12px;
          margin-bottom: 16px;
          box-shadow: inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff;
        }

        .budget-label {
          font-size: 10px;
          color: #888888;
          font-weight: 600;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .budget-value {
          font-size: 22px;
          font-weight: 700;
          color: #222222;
        }

        .budget-value span {
          font-size: 13px;
          font-weight: 500;
          color: #555555;
        }

        .budget-negotiable {
          font-size: 15px;
          font-weight: 600;
          color: #222222;
        }

        .card-stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 16px;
        }

        .card-stat-item {
          padding: 12px;
          background: #EEF0F3;
          border-radius: 10px;
          text-align: center;
          box-shadow: inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff;
        }

        .stat-label {
          font-size: 10px;
          color: #888888;
          font-weight: 600;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .stat-value {
          font-size: 16px;
          font-weight: 700;
          color: #222222;
        }

        .stat-value span {
          font-size: 11px;
          font-weight: 500;
          color: #555555;
        }

        .card-tags {
          margin-bottom: 16px;
          min-height: 56px;
        }

        .skill-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
        }

        .skill-tag {
          padding: 5px 10px;
          background: #E8ECEF;
          color: #222222;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }

        .feature-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .feature-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          background: #D8DEE4;
          color: #555555;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }

        .feature-tag i {
          font-size: 8px;
        }

        .more-tags {
          font-size: 11px;
          color: #888888;
          padding: 5px 0;
          font-weight: 600;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 16px;
          border-top: 1px solid #EEF0F3;
          margin-top: auto;
        }

        .requester-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .requester-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #EEF0F3;
          box-shadow: inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .requester-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .requester-avatar i {
          color: #888888;
          font-size: 12px;
        }

        .requester-name {
          font-size: 13px;
          font-weight: 600;
          color: #222222;
        }

        .card-date {
          font-size: 11px;
          color: #888888;
          font-weight: 500;
        }

        .loading-state {
          text-align: center;
          padding: 80px 20px;
        }

        .loading-spinner {
          display: inline-block;
          width: 40px;
          height: 40px;
          border: 3px solid #D0D5DA;
          border-top-color: #5B7C99;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          background: #E8ECEF;
          border-radius: 16px;
          box-shadow: inset 3px 3px 6px #c5c9cc, inset -3px -3px 6px #ffffff;
        }

        .empty-state i {
          font-size: 56px;
          color: #C0C5CA;
          margin-bottom: 20px;
        }

        .empty-state p {
          font-size: 15px;
          color: #555555;
          margin: 0 0 8px 0;
          font-weight: 600;
        }

        .empty-state .sub {
          font-size: 13px;
          color: #888888;
        }

        @media (max-width: 1024px) {
          .requests-grid {
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
          }
        }

        @media (max-width: 768px) {
          .requests-container {
            padding: 24px 16px;
          }

          .requests-header {
            margin-bottom: 24px;
          }

          .requests-title {
            font-size: 22px;
          }

          .create-btn {
            width: 100%;
            justify-content: center;
            padding: 12px 20px;
            font-size: 14px;
          }

          .search-filter-row {
            flex-direction: column;
            gap: 10px;
          }

          .search-wrapper {
            width: 100%;
            min-width: unset;
          }

          .filter-select {
            width: 100%;
          }

          .category-chips {
            gap: 8px;
            margin-bottom: 20px;
          }

          .category-chip {
            padding: 8px 14px;
            font-size: 12px;
          }

          .requests-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .request-card {
            padding: 20px;
          }
        }
      `}</style>

      <Header />
      
      <div className="requests-page">
        <div className="requests-container">
          {/* ヘッダー */}
          <div className="requests-header">
            <div>
              <h1 className="requests-title">依頼一覧</h1>
              {!loading && (
                <div className="requests-count">{filteredRequests.length}件の依頼</div>
              )}
            </div>
            {isLoggedIn && (
              <Link href="/requests/create" className="create-btn">
                <i className="fas fa-plus"></i>
                新規作成
              </Link>
            )}
          </div>

          {/* 検索バー & フィルターセレクト */}
          <div className="search-filter-row">
            <div className="search-wrapper">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="タイトル、説明、スキルで検索"
                className="search-input"
              />
            </div>

            <select
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value as any)}
              className={`filter-select ${budgetRange !== 'all' ? 'active' : ''}`}
            >
              <option value="all">予算</option>
              <option value="low">〜3万円</option>
              <option value="mid">3万〜10万円</option>
              <option value="high">10万円〜</option>
            </select>

            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
              className={`filter-select ${paymentTypeFilter !== 'all' ? 'active' : ''}`}
            >
              <option value="all">支払い方式</option>
              <option value="fixed">固定報酬制</option>
              <option value="hourly">時間単価制</option>
            </select>

            <select
              value={jobFeatureFilter}
              onChange={(e) => setJobFeatureFilter(e.target.value)}
              className={`filter-select ${jobFeatureFilter !== 'all' ? 'active' : ''}`}
            >
              <option value="all">仕事の特徴</option>
              <option value="no_skill">スキル不要</option>
              <option value="skill_welcome">専門スキル歓迎</option>
              <option value="one_time">単発</option>
              <option value="continuous">継続あり</option>
              <option value="flexible_time">スキマ時間歓迎</option>
            </select>
          </div>

          {/* カテゴリチップ */}
          <div className="category-chips">
            {categories.map((cat) => (
              <button
                key={cat.value}
                className={`category-chip ${categoryFilter === cat.value ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat.value)}
              >
                {cat.icon && <i className={`fas ${cat.icon}`}></i>}
                {cat.label}
              </button>
            ))}
          </div>

          {/* ローディング */}
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
            </div>
          )}

          {/* 空の状態 */}
          {!loading && filteredRequests.length === 0 && (
            <div className="empty-state">
              <i className="fas fa-search"></i>
              <p>
                {searchQuery ? '検索条件に一致する依頼が見つかりませんでした' : '依頼が見つかりませんでした'}
              </p>
              <p className="sub">別の条件で検索してみてください</p>
            </div>
          )}

          {/* 依頼一覧（グリッドレイアウト） */}
          {!loading && filteredRequests.length > 0 && (
            <div className="requests-grid">
              {filteredRequests.map((request) => {
                const daysUntilDeadline = request.application_deadline 
                  ? Math.ceil((new Date(request.application_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null
                
                return (
                  <Link
                    key={request.id}
                    href={`/requests/${request.id}`}
                    className="request-card"
                  >
                    {/* カテゴリバッジ */}
                    <div className="card-category-badge">
                      <i className={`fas ${getCategoryIcon(request.category)}`}></i>
                      {getCategoryLabel(request.category)}
                    </div>

                    {/* タイトル */}
                    <h2 className="card-title">{request.title}</h2>

                    {/* 説明 */}
                    <p className="card-description">{request.description}</p>

                    {/* 予算情報 */}
                    <div className="card-budget-box">
                      <div className="budget-label">
                        {request.payment_type === 'hourly' ? '時間単価' : '固定報酬'}
                      </div>
                      
                      {request.payment_type === 'hourly' ? (
                        <div className="budget-value">
                          {request.hourly_rate_min && request.hourly_rate_max ? (
                            <>
                              {request.hourly_rate_min.toLocaleString()}〜{request.hourly_rate_max.toLocaleString()}
                              <span>円/時</span>
                            </>
                          ) : request.hourly_rate_min ? (
                            <>
                              {request.hourly_rate_min.toLocaleString()}<span>円/時〜</span>
                            </>
                          ) : request.hourly_rate_max ? (
                            <>
                              〜{request.hourly_rate_max.toLocaleString()}<span>円/時</span>
                            </>
                          ) : (
                            <span className="budget-negotiable">応相談</span>
                          )}
                        </div>
                      ) : request.price_negotiable ? (
                        <div className="budget-negotiable">相談して決める</div>
                      ) : request.budget_min || request.budget_max ? (
                        <div className="budget-value">
                          {request.budget_min && request.budget_max ? (
                            <>
                              {request.budget_min.toLocaleString()}〜{request.budget_max.toLocaleString()}
                              <span>円</span>
                            </>
                          ) : request.budget_min ? (
                            <>
                              {request.budget_min.toLocaleString()}<span>円〜</span>
                            </>
                          ) : (
                            <>
                              〜{request.budget_max?.toLocaleString()}<span>円</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="budget-negotiable">金額未設定</div>
                      )}
                    </div>

                    {/* 締切・募集情報 */}
                    <div className="card-stats-row">
                      <div className="card-stat-item">
                        <div className="stat-label">契約数</div>
                        <div className="stat-value">
                          0<span> / {request.number_of_positions || 1}</span>
                        </div>
                      </div>

                      {request.application_deadline && daysUntilDeadline !== null && (
                        <div className="card-stat-item">
                          <div className="stat-label">応募期限</div>
                          {daysUntilDeadline > 0 ? (
                            <div className="stat-value">
                              {daysUntilDeadline}<span>日</span>
                            </div>
                          ) : daysUntilDeadline === 0 ? (
                            <div className="stat-value" style={{ fontSize: '13px', color: '#C05656' }}>
                              本日締切
                            </div>
                          ) : (
                            <div className="stat-value" style={{ fontSize: '13px', color: '#888888' }}>
                              締切済み
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* スキル・特徴タグ */}
                    <div className="card-tags">
                      {request.required_skills && request.required_skills.length > 0 && (
                        <div className="skill-tags">
                          {request.required_skills.slice(0, 3).map((skill, index) => (
                            <span key={index} className="skill-tag">{skill}</span>
                          ))}
                          {request.required_skills.length > 3 && (
                            <span className="more-tags">+{request.required_skills.length - 3}</span>
                          )}
                        </div>
                      )}

                      {request.job_features && request.job_features.length > 0 && (
                        <div className="feature-tags">
                          {request.job_features.slice(0, 2).map((feature, index) => (
                            <span key={index} className="feature-tag">
                              <i className="fas fa-check"></i>
                              {getJobFeatureLabel(feature)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 依頼者情報 */}
                    <div className="card-footer">
                      <div className="requester-info">
                        <div className="requester-avatar">
                          {request.profiles?.avatar_url ? (
                            <img 
                              src={request.profiles.avatar_url} 
                              alt={request.profiles.display_name || ''} 
                            />
                          ) : (
                            <i className="fas fa-user"></i>
                          )}
                        </div>
                        <div className="requester-name">
                          {request.profiles?.display_name || '名前未設定'}
                        </div>
                      </div>
                      <div className="card-date">{formatDate(request.created_at)}</div>
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