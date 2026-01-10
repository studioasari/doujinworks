'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import DashboardSidebar from '../../components/DashboardSidebar'

type WorkRequest = {
  id: string
  title: string
  status: string
  final_price: number | null
  created_at: string
  deadline: string | null
  category: string
  selected_applicant?: {
    display_name: string | null
    avatar_url: string | null
  }
}

type Application = {
  id: string
  status: string
  created_at: string
  work_request: {
    id: string
    title: string
    status: string
    final_price: number | null
    category: string
    deadline: string | null
    requester: {
      display_name: string | null
      avatar_url: string | null
    }
  }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [accountType, setAccountType] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [view, setView] = useState<'requester' | 'creator'>('requester')
  
  // 依頼者ビュー
  const [myRequests, setMyRequests] = useState<WorkRequest[]>([])
  const [requestTab, setRequestTab] = useState<'open' | 'active' | 'completed'>('active')
  
  // クリエイタービュー
  const [myApplications, setMyApplications] = useState<Application[]>([])
  const [applicationTab, setApplicationTab] = useState<'pending' | 'accepted' | 'completed'>('accepted')
  
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      loadMyRequests()
      loadMyApplications()
    }
  }, [currentProfileId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent('/requests/manage')}`)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type, is_admin')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentProfileId(profile.id)
      setAccountType(profile.account_type)
      setIsAdmin(profile.is_admin || false)
    }
    
    setLoading(false)
  }

  async function loadMyRequests() {
    const { data, error } = await supabase
      .from('work_requests')
      .select(`
        id,
        title,
        status,
        final_price,
        created_at,
        deadline,
        category,
        selected_applicant_id
      `)
      .eq('requester_id', currentProfileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('依頼取得エラー:', error)
      return
    }

    const requestsWithApplicants = await Promise.all(
      (data || []).map(async (request) => {
        if (!request.selected_applicant_id) {
          return { ...request, selected_applicant: undefined }
        }

        const { data: applicantData } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', request.selected_applicant_id)
          .single()

        return { ...request, selected_applicant: applicantData || undefined }
      })
    )

    setMyRequests(requestsWithApplicants)
  }

  async function loadMyApplications() {
    const { data, error } = await supabase
      .from('work_request_applications')
      .select(`id, status, created_at, work_request_id`)
      .eq('applicant_id', currentProfileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('応募取得エラー:', error)
      return
    }

    const applicationsWithDetails = await Promise.all(
      (data || []).map(async (app) => {
        const { data: requestData } = await supabase
          .from('work_requests')
          .select(`id, title, status, final_price, category, deadline, requester_id`)
          .eq('id', app.work_request_id)
          .single()

        if (!requestData) return null

        const { data: requesterData } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', requestData.requester_id)
          .single()

        return {
          id: app.id,
          status: app.status,
          created_at: app.created_at,
          work_request: {
            id: requestData.id,
            title: requestData.title,
            status: requestData.status,
            final_price: requestData.final_price,
            category: requestData.category,
            deadline: requestData.deadline,
            requester: requesterData || { display_name: null, avatar_url: null }
          }
        }
      })
    )

    setMyApplications(applicationsWithDetails.filter(Boolean) as Application[])
  }

  function getStatusLabel(status: string) {
    const statuses: { [key: string]: string } = {
      open: '募集中',
      contracted: '仮払い待ち',
      paid: '作業中',
      delivered: '納品済み',
      completed: '完了',
      cancelled: 'キャンセル',
      pending: '応募中',
      accepted: '採用',
      rejected: '不採用'
    }
    return statuses[status] || status
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

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // 統計情報
  const requestStats = {
    open: myRequests.filter(r => r.status === 'open').length,
    active: myRequests.filter(r => ['contracted', 'paid', 'delivered'].includes(r.status)).length,
    completed: myRequests.filter(r => r.status === 'completed').length,
    total: myRequests.length
  }

  const applicationStats = {
    pending: myApplications.filter(a => a.status === 'pending').length,
    accepted: myApplications.filter(a => a.status === 'accepted' && a.work_request?.status !== 'completed').length,
    completed: myApplications.filter(a => a.work_request?.status === 'completed').length,
    total: myApplications.length
  }

  // フィルタリング
  const filteredRequests = myRequests.filter(r => {
    if (requestTab === 'open') return r.status === 'open'
    if (requestTab === 'active') return ['contracted', 'paid', 'delivered'].includes(r.status)
    if (requestTab === 'completed') return r.status === 'completed'
    return true
  })

  const filteredApplications = myApplications.filter(a => {
    if (applicationTab === 'pending') return a.status === 'pending'
    if (applicationTab === 'accepted') return a.status === 'accepted' && a.work_request?.status !== 'completed'
    if (applicationTab === 'completed') return a.work_request?.status === 'completed'
    return true
  })

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      <div className="requests-manage-page dashboard-layout">
        <DashboardSidebar accountType={accountType} isAdmin={isAdmin} />

        {loading ? (
          <div className="dashboard-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <span>読み込み中...</span>
          </div>
        ) : (
          <main className="requests-manage-main">
            <div className="requests-manage-container">
              <h1 className="requests-manage-title">依頼管理</h1>

              {/* ビュー切り替え */}
              <div className="requests-manage-view-toggle">
                <button
                  onClick={() => setView('requester')}
                  className={`requests-manage-view-btn ${view === 'requester' ? 'active' : ''}`}
                >
                  <i className="fas fa-briefcase"></i>
                  依頼者として
                </button>
                <button
                  onClick={() => setView('creator')}
                  className={`requests-manage-view-btn ${view === 'creator' ? 'active' : ''}`}
                >
                  <i className="fas fa-palette"></i>
                  クリエイターとして
                </button>
              </div>

              {/* 依頼者ビュー */}
              {view === 'requester' && (
                <>
                  {/* 統計 */}
                  <div className="requests-manage-stats">
                    <div className="requests-manage-stat-card">
                      <div className="requests-manage-stat-value">{requestStats.total}</div>
                      <div className="requests-manage-stat-label">総依頼数</div>
                    </div>
                    <div className="requests-manage-stat-card">
                      <div className="requests-manage-stat-value">{requestStats.active}</div>
                      <div className="requests-manage-stat-label">進行中</div>
                    </div>
                    <div className="requests-manage-stat-card">
                      <div className="requests-manage-stat-value">{requestStats.completed}</div>
                      <div className="requests-manage-stat-label">完了</div>
                    </div>
                  </div>

                  {/* タブ */}
                  <div className="requests-manage-tabs">
                    <button
                      onClick={() => setRequestTab('active')}
                      className={`requests-manage-tab ${requestTab === 'active' ? 'active' : ''}`}
                    >
                      進行中 ({requestStats.active})
                    </button>
                    <button
                      onClick={() => setRequestTab('open')}
                      className={`requests-manage-tab ${requestTab === 'open' ? 'active' : ''}`}
                    >
                      募集中 ({requestStats.open})
                    </button>
                    <button
                      onClick={() => setRequestTab('completed')}
                      className={`requests-manage-tab ${requestTab === 'completed' ? 'active' : ''}`}
                    >
                      完了 ({requestStats.completed})
                    </button>
                  </div>

                  {/* 依頼一覧 */}
                  {filteredRequests.length === 0 ? (
                    <div className="requests-manage-empty">
                      <i className="fas fa-inbox"></i>
                      <p>該当する依頼がありません</p>
                      <Link href="/requests/create" className="requests-manage-btn primary">
                        <i className="fas fa-plus"></i>
                        新しい依頼を作成
                      </Link>
                    </div>
                  ) : (
                    <div className="requests-manage-list">
                      {filteredRequests.map((request) => (
                        <Link
                          key={request.id}
                          href={request.status === 'open' ? `/requests/${request.id}/manage` : `/requests/${request.id}/status`}
                          className="requests-manage-card"
                        >
                          <div className="requests-manage-card-header">
                            <h3 className="requests-manage-card-title">{request.title}</h3>
                            <span className={`requests-manage-status-badge ${request.status}`}>
                              {getStatusLabel(request.status)}
                            </span>
                          </div>

                          <div className="requests-manage-card-meta">
                            <span className="requests-manage-category-badge">
                              {getCategoryLabel(request.category)}
                            </span>
                            {request.final_price && (
                              <span className="requests-manage-price">
                                {request.final_price.toLocaleString()}円
                              </span>
                            )}
                            <span className="requests-manage-date">
                              <i className="fas fa-calendar"></i>
                              {formatDate(request.created_at)}
                            </span>
                          </div>

                          {request.selected_applicant && (
                            <div className="requests-manage-card-creator">
                              <div className="requests-manage-avatar">
                                {request.selected_applicant.avatar_url ? (
                                  <img src={request.selected_applicant.avatar_url} alt="" />
                                ) : (
                                  <span>{request.selected_applicant.display_name?.charAt(0) || '?'}</span>
                                )}
                              </div>
                              <span>{request.selected_applicant.display_name || '名前未設定'}</span>
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* クリエイタービュー */}
              {view === 'creator' && (
                <>
                  {/* 統計 */}
                  <div className="requests-manage-stats">
                    <div className="requests-manage-stat-card">
                      <div className="requests-manage-stat-value">{applicationStats.total}</div>
                      <div className="requests-manage-stat-label">総応募数</div>
                    </div>
                    <div className="requests-manage-stat-card">
                      <div className="requests-manage-stat-value">{applicationStats.accepted}</div>
                      <div className="requests-manage-stat-label">進行中</div>
                    </div>
                    <div className="requests-manage-stat-card">
                      <div className="requests-manage-stat-value">{applicationStats.completed}</div>
                      <div className="requests-manage-stat-label">完了</div>
                    </div>
                  </div>

                  {/* タブ */}
                  <div className="requests-manage-tabs">
                    <button
                      onClick={() => setApplicationTab('accepted')}
                      className={`requests-manage-tab ${applicationTab === 'accepted' ? 'active' : ''}`}
                    >
                      受注中 ({applicationStats.accepted})
                    </button>
                    <button
                      onClick={() => setApplicationTab('pending')}
                      className={`requests-manage-tab ${applicationTab === 'pending' ? 'active' : ''}`}
                    >
                      応募中 ({applicationStats.pending})
                    </button>
                    <button
                      onClick={() => setApplicationTab('completed')}
                      className={`requests-manage-tab ${applicationTab === 'completed' ? 'active' : ''}`}
                    >
                      完了 ({applicationStats.completed})
                    </button>
                  </div>

                  {/* 応募一覧 */}
                  {filteredApplications.length === 0 ? (
                    <div className="requests-manage-empty">
                      <i className="fas fa-inbox"></i>
                      <p>該当する応募がありません</p>
                      <Link href="/requests" className="requests-manage-btn primary">
                        <i className="fas fa-search"></i>
                        依頼を探す
                      </Link>
                    </div>
                  ) : (
                    <div className="requests-manage-list">
                      {filteredApplications.map((application) => (
                        <Link
                          key={application.id}
                          href={application.status === 'accepted' ? `/requests/${application.work_request?.id}/status` : `/requests/${application.work_request?.id}`}
                          className="requests-manage-card"
                        >
                          <div className="requests-manage-card-header">
                            <h3 className="requests-manage-card-title">{application.work_request?.title}</h3>
                            <span className={`requests-manage-status-badge ${application.work_request?.status || ''}`}>
                              {getStatusLabel(application.work_request?.status || '')}
                            </span>
                          </div>

                          <div className="requests-manage-card-meta">
                            <span className="requests-manage-category-badge">
                              {getCategoryLabel(application.work_request?.category || '')}
                            </span>
                            {application.work_request?.final_price && (
                              <span className="requests-manage-price">
                                {application.work_request.final_price.toLocaleString()}円
                              </span>
                            )}
                            <span className="requests-manage-date">
                              <i className="fas fa-calendar"></i>
                              {formatDate(application.created_at)}
                            </span>
                          </div>

                          {application.work_request?.requester && (
                            <div className="requests-manage-card-creator">
                              <div className="requests-manage-avatar">
                                {application.work_request.requester.avatar_url ? (
                                  <img src={application.work_request.requester.avatar_url} alt="" />
                                ) : (
                                  <span>{application.work_request.requester.display_name?.charAt(0) || '?'}</span>
                                )}
                              </div>
                              <span>{application.work_request.requester.display_name || '名前未設定'}</span>
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        )}
      </div>
      <Footer />
    </>
  )
}