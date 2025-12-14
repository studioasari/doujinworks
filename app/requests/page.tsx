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
        }
        
        .request-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(to bottom, #4CAF50, #2196F3);
          opacity: 0;
          transition: opacity 0.3s;
        }
        
        .request-card:hover::before {
          opacity: 1;
        }
        
        .request-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }

        @media (max-width: 768px) {
          .page-container {
            padding: 20px 16px !important;
          }
          
          .search-bar {
            width: 100% !important;
          }
          
          .request-card {
            padding: 20px !important;
          }
          
          .filter-grid {
            grid-template-columns: 1fr !important;
          }
          
          .card-layout {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          
          .right-sidebar {
            border-left: none !important;
            padding-left: 0 !important;
            border-top: 1px solid #E5E5E5;
            padding-top: 20px !important;
          }
        }
      `}</style>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          {/* ヘッダー */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap', 
            gap: '16px',
            marginBottom: '32px'
          }}>
            <div>
              <h1 style={{ 
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1A1A1A',
                marginBottom: '8px',
                letterSpacing: '-0.02em'
              }}>
                依頼を探す
              </h1>
              {!loading && (
                <div style={{ fontSize: '14px', color: '#6B6B6B' }}>
                  {filteredRequests.length}件の依頼が見つかりました
                </div>
              )}
            </div>
            {isLoggedIn && (
              <Link 
                href="/requests/create" 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: '#1A1A1A',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#000000'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1A1A1A'}
              >
                <i className="fas fa-plus"></i>
                依頼を作成
              </Link>
            )}
          </div>

          {/* 検索バー */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6B6B6B',
                fontSize: '14px'
              }}></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="タイトル、説明、スキルで検索..."
                className="search-bar"
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  border: '2px solid #E5E5E5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
              />
            </div>
          </div>

          {/* フィルターパネル */}
          <div style={{
            padding: '24px',
            backgroundColor: '#F9F9F9',
            borderRadius: '12px',
            marginBottom: '32px'
          }}>
            <div className="filter-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {/* カテゴリ */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  カテゴリ
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">すべて</option>
                  <option value="illustration">イラスト</option>
                  <option value="manga">マンガ</option>
                  <option value="novel">小説</option>
                  <option value="music">音楽</option>
                  <option value="voice">ボイス</option>
                  <option value="video">動画</option>
                  <option value="logo">ロゴ</option>
                  <option value="design">デザイン</option>
                  <option value="other">その他</option>
                </select>
              </div>

              {/* 予算範囲 */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  予算
                </label>
                <select
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
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
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  支払い方式
                </label>
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
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
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  仕事の特徴
                </label>
                <select
                  value={jobFeatureFilter}
                  onChange={(e) => setJobFeatureFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
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

          {/* 空の状態 */}
          {!loading && filteredRequests.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px'
            }}>
              <i className="fas fa-search" style={{ fontSize: '48px', color: '#E5E5E5', marginBottom: '16px' }}></i>
              <p style={{ fontSize: '14px', color: '#6B6B6B', marginBottom: '24px' }}>
                {searchQuery ? '検索条件に一致する依頼が見つかりませんでした' : '依頼が見つかりませんでした'}
              </p>
            </div>
          )}

          {/* 依頼一覧 */}
          {!loading && filteredRequests.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                      display: 'block',
                      padding: '24px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E5E5',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div className="card-layout" style={{ 
                      display: 'grid',
                      gridTemplateColumns: '1fr 240px',
                      gap: '32px',
                      alignItems: 'start'
                    }}>
                      {/* メインコンテンツエリア */}
                      <div style={{ minWidth: 0 }}>
                        {/* カテゴリバッジ */}
                        <div style={{ marginBottom: '12px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: '#F5F5F5',
                            color: '#1A1A1A'
                          }}>
                            <i className={`fas ${getCategoryIcon(request.category)}`} style={{ fontSize: '11px' }}></i>
                            {getCategoryLabel(request.category)}
                          </span>
                        </div>

                        {/* タイトル */}
                        <h2 style={{ 
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#1A1A1A',
                          marginBottom: '12px',
                          lineHeight: '1.4',
                          letterSpacing: '-0.01em'
                        }}>
                          {request.title}
                        </h2>

                        {/* 説明 */}
                        <p style={{ 
                          fontSize: '14px',
                          color: '#6B6B6B',
                          lineHeight: '1.6',
                          marginBottom: '16px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {request.description}
                        </p>

                        {/* タグエリア */}
                        <div style={{ marginBottom: '16px' }}>
                          {/* 求めるスキル */}
                          {request.required_skills && request.required_skills.length > 0 && (
                            <div style={{ 
                              display: 'flex', 
                              flexWrap: 'wrap', 
                              gap: '6px',
                              marginBottom: '8px'
                            }}>
                              {request.required_skills.slice(0, 6).map((skill, index) => (
                                <span key={index} style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  backgroundColor: '#E8F5E9',
                                  color: '#2E7D32',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  {skill}
                                </span>
                              ))}
                              {request.required_skills.length > 6 && (
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: '#9E9E9E', 
                                  alignSelf: 'center',
                                  padding: '4px 0'
                                }}>
                                  +{request.required_skills.length - 6}
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
                              {request.job_features.map((feature, index) => (
                                <span key={index} style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  backgroundColor: '#FFF3E0',
                                  color: '#E65100',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '500'
                                }}>
                                  <i className="fas fa-check" style={{ fontSize: '9px' }}></i>
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
                          gap: '10px',
                          paddingTop: '12px',
                          borderTop: '1px solid #F5F5F5'
                        }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: '#E5E5E5',
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
                              <i className="fas fa-user" style={{ color: '#9E9E9E', fontSize: '13px' }}></i>
                            )}
                          </div>
                          <div style={{ 
                            fontSize: '13px', 
                            fontWeight: '500',
                            color: '#1A1A1A'
                          }}>
                            {request.profiles?.display_name || '名前未設定'}
                          </div>
                        </div>
                      </div>

                      {/* 右サイドバー（予算・締切を縦並び） */}
                      <div className="right-sidebar" style={{ 
                        paddingLeft: '32px',
                        borderLeft: '1px solid #E5E5E5',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px'
                      }}>
                        {/* 予算エリア */}
                        <div>
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#9E9E9E',
                            fontWeight: '600',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {request.payment_type === 'hourly' ? '時間単価' : '固定報酬'}
                          </div>
                          
                          {request.payment_type === 'hourly' ? (
                            <div style={{ 
                              fontSize: '22px', 
                              fontWeight: '700', 
                              color: '#1A1A1A',
                              lineHeight: '1.2',
                              marginBottom: '12px'
                            }}>
                              {request.hourly_rate_min && request.hourly_rate_max ? (
                                <>
                                  {request.hourly_rate_min.toLocaleString()}〜{request.hourly_rate_max.toLocaleString()}
                                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#6B6B6B' }}>円/時</span>
                                </>
                              ) : request.hourly_rate_min ? (
                                <>
                                  {request.hourly_rate_min.toLocaleString()}
                                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#6B6B6B' }}>円/時〜</span>
                                </>
                              ) : request.hourly_rate_max ? (
                                <>
                                  〜{request.hourly_rate_max.toLocaleString()}
                                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#6B6B6B' }}>円/時</span>
                                </>
                              ) : (
                                <span style={{ fontSize: '15px', color: '#6B6B6B' }}>応相談</span>
                              )}
                            </div>
                          ) : request.price_negotiable ? (
                            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>
                              相談して決める
                            </div>
                          ) : request.budget_min || request.budget_max ? (
                            <div style={{ 
                              fontSize: '22px', 
                              fontWeight: '700', 
                              color: '#1A1A1A',
                              lineHeight: '1.2',
                              marginBottom: '12px'
                            }}>
                              {request.budget_min && request.budget_max ? (
                                <>
                                  {request.budget_min.toLocaleString()}〜{request.budget_max.toLocaleString()}
                                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#6B6B6B' }}>円</span>
                                </>
                              ) : request.budget_min ? (
                                <>
                                  {request.budget_min.toLocaleString()}
                                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#6B6B6B' }}>円〜</span>
                                </>
                              ) : (
                                <>
                                  〜{request.budget_max?.toLocaleString()}
                                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#6B6B6B' }}>円</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: '15px', color: '#6B6B6B', marginBottom: '12px' }}>
                              金額未設定
                            </div>
                          )}

                          <div style={{
                            padding: '10px 14px',
                            backgroundColor: '#F9F9F9',
                            borderRadius: '6px'
                          }}>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#9E9E9E',
                              marginBottom: '4px'
                            }}>
                              契約数
                            </div>
                            <div style={{ fontSize: '17px', fontWeight: '700', color: '#1A1A1A' }}>
                              0<span style={{ fontSize: '13px', fontWeight: '500', color: '#6B6B6B' }}> / {request.number_of_positions || 1}人</span>
                            </div>
                          </div>
                        </div>

                        {/* 締切エリア */}
                        {request.application_deadline && daysUntilDeadline !== null && (
                          <div style={{
                            padding: '16px',
                            backgroundColor: '#FFF9F5',
                            borderRadius: '8px',
                            border: '1px solid #FFE5D5'
                          }}>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#9E9E9E',
                              fontWeight: '600',
                              marginBottom: '10px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              応募期限
                            </div>
                            {daysUntilDeadline > 0 ? (
                              <div>
                                <div style={{ 
                                  display: 'flex',
                                  alignItems: 'baseline',
                                  gap: '4px',
                                  marginBottom: '8px'
                                }}>
                                  <span style={{ fontSize: '14px', color: '#6B6B6B', fontWeight: '500' }}>あと</span>
                                  <span style={{ fontSize: '32px', fontWeight: '700', color: daysUntilDeadline <= 3 ? '#FF5722' : '#FF9800' }}>
                                    {daysUntilDeadline}
                                  </span>
                                  <span style={{ fontSize: '14px', color: '#6B6B6B', fontWeight: '500' }}>日</span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#9E9E9E' }}>
                                  {new Date(request.application_deadline).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}まで
                                </div>
                              </div>
                            ) : daysUntilDeadline === 0 ? (
                              <div style={{ 
                                padding: '10px 14px',
                                backgroundColor: '#FFEBEE',
                                borderRadius: '6px',
                                fontSize: '14px', 
                                color: '#C62828', 
                                fontWeight: '700',
                                textAlign: 'center'
                              }}>
                                本日締切
                              </div>
                            ) : (
                              <div style={{ fontSize: '14px', color: '#9E9E9E' }}>
                                締切済み
                              </div>
                            )}
                          </div>
                        )}

                        {/* スペーサー */}
                        <div style={{ flex: 1 }}></div>

                        {/* 掲載日 */}
                        <div style={{ 
                          paddingTop: '16px',
                          borderTop: '1px solid #F5F5F5',
                          fontSize: '11px',
                          color: '#9E9E9E'
                        }}>
                          掲載 {new Date(request.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
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