'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import DashboardSidebar from '@/app/components/DashboardSidebar'
import styles from './page.module.css'

type WorkRequest = {
  id: string
  title: string
  status: string
  final_price: number | null
  created_at: string
  deadline: string | null
  category: string
  contract_id?: string | null
  selected_applicant?: {
    display_name: string | null
    avatar_url: string | null
  }
}

type Application = {
  id: string
  status: string
  created_at: string
  contract_id: string | null
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
        let selected_applicant = undefined
        let contract_id = null

        // 選択された応募者の情報を取得
        if (request.selected_applicant_id) {
          const { data: applicantData } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', request.selected_applicant_id)
            .single()
          selected_applicant = applicantData || undefined
        }

        // 契約IDを取得（open以外のステータスの場合）
        if (request.status !== 'open') {
          const { data: contractData } = await supabase
            .from('work_contracts')
            .select('id')
            .eq('work_request_id', request.id)
            .single()
          contract_id = contractData?.id || null
        }

        return { ...request, selected_applicant, contract_id }
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

        // 採用された場合は契約IDを取得
        let contractId: string | null = null
        if (app.status === 'accepted') {
          const { data: contractData } = await supabase
            .from('work_contracts')
            .select('id')
            .eq('work_request_id', app.work_request_id)
            .eq('contractor_id', currentProfileId)
            .single()
          
          if (contractData) {
            contractId = contractData.id
          }
        }

        return {
          id: app.id,
          status: app.status,
          created_at: app.created_at,
          contract_id: contractId,
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
      closed: '募集終了',
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
    active: myRequests.filter(r => ['closed', 'contracted', 'paid', 'delivered'].includes(r.status)).length,
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
    if (requestTab === 'active') return ['closed', 'contracted', 'paid', 'delivered'].includes(r.status)
    if (requestTab === 'completed') return r.status === 'completed'
    return true
  })

  const filteredApplications = myApplications.filter(a => {
    if (applicationTab === 'pending') return a.status === 'pending'
    if (applicationTab === 'accepted') return a.status === 'accepted' && a.work_request?.status !== 'completed'
    if (applicationTab === 'completed') return a.work_request?.status === 'completed'
    return true
  })

  // クリエイター用のリンク先を決定
  function getCreatorLink(application: Application) {
    if (application.status === 'accepted' && application.contract_id) {
      return `/requests/${application.work_request?.id}/contracts/${application.contract_id}`
    }
    return `/requests/${application.work_request?.id}`
  }

  return (
    <>
      <Header />
      <div className={styles.pageWrapper}>
        <DashboardSidebar accountType={accountType} isAdmin={isAdmin} />

        {loading ? (
          <div className={styles.loading}>
            <i className="fas fa-spinner fa-spin"></i>
            <span>読み込み中...</span>
          </div>
        ) : (
          <main className={styles.main}>
            <div className={styles.container}>
              <h1 className={styles.title}>依頼管理</h1>

              {/* ビュー切り替え */}
              <div className={styles.viewToggle}>
                <button
                  onClick={() => setView('requester')}
                  className={`${styles.viewBtn} ${view === 'requester' ? styles.active : ''}`}
                >
                  <i className="fas fa-briefcase"></i>
                  依頼者として
                </button>
                <button
                  onClick={() => setView('creator')}
                  className={`${styles.viewBtn} ${view === 'creator' ? styles.active : ''}`}
                >
                  <i className="fas fa-palette"></i>
                  クリエイターとして
                </button>
              </div>

              {/* 依頼者ビュー */}
              {view === 'requester' && (
                <>
                  {/* 統計 */}
                  <div className={styles.stats}>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{requestStats.total}</div>
                      <div className={styles.statLabel}>総依頼数</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{requestStats.active}</div>
                      <div className={styles.statLabel}>進行中</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{requestStats.completed}</div>
                      <div className={styles.statLabel}>完了</div>
                    </div>
                  </div>

                  {/* タブ */}
                  <div className={styles.tabs}>
                    <button
                      onClick={() => setRequestTab('active')}
                      className={`${styles.tab} ${requestTab === 'active' ? styles.active : ''}`}
                    >
                      進行中 ({requestStats.active})
                    </button>
                    <button
                      onClick={() => setRequestTab('open')}
                      className={`${styles.tab} ${requestTab === 'open' ? styles.active : ''}`}
                    >
                      募集中 ({requestStats.open})
                    </button>
                    <button
                      onClick={() => setRequestTab('completed')}
                      className={`${styles.tab} ${requestTab === 'completed' ? styles.active : ''}`}
                    >
                      完了 ({requestStats.completed})
                    </button>
                  </div>

                  {/* 依頼一覧 */}
                  {filteredRequests.length === 0 ? (
                    <div className={styles.empty}>
                      <i className="fas fa-inbox"></i>
                      <p>該当する依頼がありません</p>
                      <Link href="/requests/create" className={styles.emptyBtn}>
                        <i className="fas fa-plus"></i>
                        新しい依頼を作成
                      </Link>
                    </div>
                  ) : (
                    <div className={styles.list}>
                      {filteredRequests.map((request) => (
                        <Link
                          key={request.id}
                          href={
                            request.status === 'open' 
                              ? `/requests/${request.id}/manage` 
                              : request.contract_id 
                                ? `/requests/${request.id}/contracts/${request.contract_id}`
                                : `/requests/${request.id}`
                          }
                          className={styles.card}
                        >
                          <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>{request.title}</h3>
                            <span className={`${styles.statusBadge} ${styles[request.status]}`}>
                              {getStatusLabel(request.status)}
                            </span>
                          </div>

                          <div className={styles.cardMeta}>
                            <span className={styles.categoryBadge}>
                              {getCategoryLabel(request.category)}
                            </span>
                            {request.final_price && (
                              <span className={styles.price}>
                                {request.final_price.toLocaleString()}円
                              </span>
                            )}
                            <span className={styles.date}>
                              <i className="fas fa-calendar"></i>
                              {formatDate(request.created_at)}
                            </span>
                          </div>

                          {request.selected_applicant && (
                            <div className={styles.cardUser}>
                              <div className={styles.avatar}>
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
                  <div className={styles.stats}>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{applicationStats.total}</div>
                      <div className={styles.statLabel}>総応募数</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{applicationStats.accepted}</div>
                      <div className={styles.statLabel}>進行中</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{applicationStats.completed}</div>
                      <div className={styles.statLabel}>完了</div>
                    </div>
                  </div>

                  {/* タブ */}
                  <div className={styles.tabs}>
                    <button
                      onClick={() => setApplicationTab('accepted')}
                      className={`${styles.tab} ${applicationTab === 'accepted' ? styles.active : ''}`}
                    >
                      受注中 ({applicationStats.accepted})
                    </button>
                    <button
                      onClick={() => setApplicationTab('pending')}
                      className={`${styles.tab} ${applicationTab === 'pending' ? styles.active : ''}`}
                    >
                      応募中 ({applicationStats.pending})
                    </button>
                    <button
                      onClick={() => setApplicationTab('completed')}
                      className={`${styles.tab} ${applicationTab === 'completed' ? styles.active : ''}`}
                    >
                      完了 ({applicationStats.completed})
                    </button>
                  </div>

                  {/* 応募一覧 */}
                  {filteredApplications.length === 0 ? (
                    <div className={styles.empty}>
                      <i className="fas fa-inbox"></i>
                      <p>該当する応募がありません</p>
                      <Link href="/requests" className={styles.emptyBtn}>
                        <i className="fas fa-search"></i>
                        依頼を探す
                      </Link>
                    </div>
                  ) : (
                    <div className={styles.list}>
                      {filteredApplications.map((application) => (
                        <Link
                          key={application.id}
                          href={getCreatorLink(application)}
                          className={styles.card}
                        >
                          <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>{application.work_request?.title}</h3>
                            <span className={`${styles.statusBadge} ${styles[application.status === 'accepted' ? (application.work_request?.status || '') : application.status]}`}>
                              {application.status === 'accepted' 
                                ? getStatusLabel(application.work_request?.status || '') 
                                : getStatusLabel(application.status)}
                            </span>
                          </div>

                          <div className={styles.cardMeta}>
                            <span className={styles.categoryBadge}>
                              {getCategoryLabel(application.work_request?.category || '')}
                            </span>
                            {application.work_request?.final_price && (
                              <span className={styles.price}>
                                {application.work_request.final_price.toLocaleString()}円
                              </span>
                            )}
                            <span className={styles.date}>
                              <i className="fas fa-calendar"></i>
                              {formatDate(application.created_at)}
                            </span>
                          </div>

                          {application.work_request?.requester && (
                            <div className={styles.cardUser}>
                              <div className={styles.avatar}>
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