'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingScreen from '../../components/LoadingScreen'

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
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentProfileId(profile.id)
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

    // selected_applicant情報を取得
    const requestsWithApplicants = await Promise.all(
      (data || []).map(async (request) => {
        if (!request.selected_applicant_id) {
          return {
            ...request,
            selected_applicant: undefined
          }
        }

        const { data: applicantData } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', request.selected_applicant_id)
          .single()

        return {
          ...request,
          selected_applicant: applicantData || undefined
        }
      })
    )

    setMyRequests(requestsWithApplicants)
  }

  async function loadMyApplications() {
    const { data, error } = await supabase
      .from('work_request_applications')
      .select(`
        id,
        status,
        created_at,
        work_request_id
      `)
      .eq('applicant_id', currentProfileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('応募取得エラー:', error)
      return
    }

    // 各応募の依頼情報を取得
    const applicationsWithDetails = await Promise.all(
      (data || []).map(async (app) => {
        const { data: requestData } = await supabase
          .from('work_requests')
          .select(`
            id,
            title,
            status,
            final_price,
            category,
            deadline,
            requester_id
          `)
          .eq('id', app.work_request_id)
          .single()

        if (!requestData) return null

        // 依頼者情報を取得
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
      awaiting_payment: '仮払い待ち',
      in_progress: '作業中',
      delivered: '納品済み',
      completed: '完了',
      cancelled: 'キャンセル',
      pending: '応募中',
      accepted: '採用',
      rejected: '不採用'
    }
    return statuses[status] || status
  }

  function getStatusColor(status: string) {
    const colors: { [key: string]: string } = {
      open: '#1A1A1A',
      awaiting_payment: '#FF9800',
      in_progress: '#2196F3',
      delivered: '#9C27B0',
      completed: '#1A1A1A',
      cancelled: '#CCCCCC',
      pending: '#4A4A4A',
      accepted: '#1A1A1A',
      rejected: '#CCCCCC'
    }
    return colors[status] || '#9E9E9E'
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
    active: myRequests.filter(r => ['awaiting_payment', 'in_progress', 'delivered'].includes(r.status)).length,
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
    if (requestTab === 'active') return ['awaiting_payment', 'in_progress', 'delivered'].includes(r.status)
    if (requestTab === 'completed') return r.status === 'completed'
    return true
  })

  const filteredApplications = myApplications.filter(a => {
    if (applicationTab === 'pending') return a.status === 'pending'
    if (applicationTab === 'accepted') return a.status === 'accepted' && a.work_request?.status !== 'completed'
    if (applicationTab === 'completed') return a.work_request?.status === 'completed'
    return true
  })

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow" style={{ padding: '40px 20px' }}>
          <h1 className="section-title mb-32">依頼管理</h1>

          {/* ビュー切り替え */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <button
              onClick={() => setView('requester')}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: view === 'requester' ? '#1A1A1A' : '#FFFFFF',
                color: view === 'requester' ? '#FFFFFF' : '#1A1A1A',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              依頼者として
            </button>
            <button
              onClick={() => setView('creator')}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: view === 'creator' ? '#1A1A1A' : '#FFFFFF',
                color: view === 'creator' ? '#FFFFFF' : '#1A1A1A',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              クリエイターとして
            </button>
          </div>

          {/* 依頼者ビュー */}
          {view === 'requester' && (
            <>
              {/* 統計 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>{requestStats.total}</div>
                  <div className="text-small text-gray">総依頼数</div>
                </div>
                <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>{requestStats.active}</div>
                  <div className="text-small text-gray">進行中</div>
                </div>
                <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>{requestStats.completed}</div>
                  <div className="text-small text-gray">完了</div>
                </div>
              </div>

              {/* タブ */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #E5E5E5' }}>
                <button
                  onClick={() => setRequestTab('active')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${requestTab === 'active' ? '#1A1A1A' : 'transparent'}`,
                    color: requestTab === 'active' ? '#1A1A1A' : '#6B6B6B',
                    fontWeight: requestTab === 'active' ? '600' : '400',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  進行中 ({requestStats.active})
                </button>
                <button
                  onClick={() => setRequestTab('open')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${requestTab === 'open' ? '#1A1A1A' : 'transparent'}`,
                    color: requestTab === 'open' ? '#1A1A1A' : '#6B6B6B',
                    fontWeight: requestTab === 'open' ? '600' : '400',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  募集中 ({requestStats.open})
                </button>
                <button
                  onClick={() => setRequestTab('completed')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${requestTab === 'completed' ? '#1A1A1A' : 'transparent'}`,
                    color: requestTab === 'completed' ? '#1A1A1A' : '#6B6B6B',
                    fontWeight: requestTab === 'completed' ? '600' : '400',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  完了 ({requestStats.completed})
                </button>
              </div>

              {/* 依頼一覧 */}
              {filteredRequests.length === 0 ? (
                <div className="empty-state">
                  <p className="text-gray mb-24">該当する依頼がありません</p>
                  <Link href="/requests/create" className="btn-primary">新しい依頼を作成</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredRequests.map((request, index) => (
                    <Link
                      key={request.id}
                      href={`/requests/${request.id}`}
                      className="card-hover p-24"
                      style={{ 
                        textDecoration: 'none',
                        borderBottom: index < filteredRequests.length - 1 ? '1px solid #E5E5E5' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', margin: 0 }}>
                          {request.title}
                        </h3>
                        <span style={{ padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', backgroundColor: getStatusColor(request.status), color: '#FFFFFF', flexShrink: 0, marginLeft: '12px' }}>
                          {getStatusLabel(request.status)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#6B6B6B' }}>
                        <span className="badge badge-category">{getCategoryLabel(request.category)}</span>
                        {request.final_price && (
                          <span>金額: {request.final_price.toLocaleString()}円</span>
                        )}
                        <span>投稿日: {formatDate(request.created_at)}</span>
                      </div>

                      {request.selected_applicant && (
                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {request.selected_applicant.avatar_url ? (
                              <img src={request.selected_applicant.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '10px', color: '#6B6B6B' }}>
                                {request.selected_applicant.display_name?.charAt(0) || '?'}
                              </span>
                            )}
                          </div>
                          <span className="text-small text-gray">
                            {request.selected_applicant.display_name || '名前未設定'}
                          </span>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>{applicationStats.total}</div>
                  <div className="text-small text-gray">総応募数</div>
                </div>
                <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>{applicationStats.accepted}</div>
                  <div className="text-small text-gray">進行中</div>
                </div>
                <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>{applicationStats.completed}</div>
                  <div className="text-small text-gray">完了</div>
                </div>
              </div>

              {/* タブ */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #E5E5E5' }}>
                <button
                  onClick={() => setApplicationTab('accepted')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${applicationTab === 'accepted' ? '#1A1A1A' : 'transparent'}`,
                    color: applicationTab === 'accepted' ? '#1A1A1A' : '#6B6B6B',
                    fontWeight: applicationTab === 'accepted' ? '600' : '400',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  受注中 ({applicationStats.accepted})
                </button>
                <button
                  onClick={() => setApplicationTab('pending')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${applicationTab === 'pending' ? '#1A1A1A' : 'transparent'}`,
                    color: applicationTab === 'pending' ? '#1A1A1A' : '#6B6B6B',
                    fontWeight: applicationTab === 'pending' ? '600' : '400',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  応募中 ({applicationStats.pending})
                </button>
                <button
                  onClick={() => setApplicationTab('completed')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${applicationTab === 'completed' ? '#1A1A1A' : 'transparent'}`,
                    color: applicationTab === 'completed' ? '#1A1A1A' : '#6B6B6B',
                    fontWeight: applicationTab === 'completed' ? '600' : '400',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  完了 ({applicationStats.completed})
                </button>
              </div>

              {/* 応募一覧 */}
              {filteredApplications.length === 0 ? (
                <div className="empty-state">
                  <p className="text-gray mb-24">該当する応募がありません</p>
                  <Link href="/requests" className="btn-primary">依頼を探す</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredApplications.map((application, index) => (
                    <Link
                      key={application.id}
                      href={`/requests/${application.work_request?.id}`}
                      className="card-hover p-24"
                      style={{ 
                        textDecoration: 'none',
                        borderBottom: index < filteredApplications.length - 1 ? '1px solid #E5E5E5' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', margin: 0 }}>
                          {application.work_request?.title}
                        </h3>
                        <span style={{ padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', backgroundColor: getStatusColor(application.work_request?.status || ''), color: '#FFFFFF', flexShrink: 0, marginLeft: '12px' }}>
                          {getStatusLabel(application.work_request?.status || '')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#6B6B6B' }}>
                        <span className="badge badge-category">{getCategoryLabel(application.work_request?.category || '')}</span>
                        {application.work_request?.final_price && (
                          <span>金額: {application.work_request.final_price.toLocaleString()}円</span>
                        )}
                        <span>応募日: {formatDate(application.created_at)}</span>
                      </div>

                      {application.work_request?.requester && (
                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {application.work_request.requester.avatar_url ? (
                              <img src={application.work_request.requester.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '10px', color: '#6B6B6B' }}>
                                {application.work_request.requester.display_name?.charAt(0) || '?'}
                              </span>
                            )}
                          </div>
                          <span className="text-small text-gray">
                            {application.work_request.requester.display_name || '名前未設定'}
                          </span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}