'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import {
  CONTRACT_STATUS_LABELS,
  RECRUITMENT_STATUS_LABELS,
} from '@/lib/status-labels'
import styles from './page.module.css'

type WorkRequest = {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  category: string
  recruitment_status: string
  progress_status: string
  created_at: string
  requester_id: string
  payment_type: string | null
  hourly_rate_min: number | null
  hourly_rate_max: number | null
  price_negotiable: boolean | null
  number_of_positions: number | null
  application_deadline: string | null
  contracted_count: number | null
}

type Application = {
  id: string
  message: string
  proposed_price: number | null
  status: string
  created_at: string
  applicant_id: string
  profiles: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
}

type Contract = {
  id: string
  contractor_id: string
  final_price: number
  status: string
  created_at: string
  profiles: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
}

function getRequestStatusLabel(
  recruitmentStatus: string,
  progressStatus: string
): string {
  if (recruitmentStatus === 'open') {
    return RECRUITMENT_STATUS_LABELS.open
  }
  if (recruitmentStatus === 'filled') {
    return RECRUITMENT_STATUS_LABELS.filled
  }
  if (recruitmentStatus === 'withdrawn') {
    return RECRUITMENT_STATUS_LABELS.withdrawn
  }
  return progressStatus
}

function getContractStatusLabel(status: string): string {
  const key = status as keyof typeof CONTRACT_STATUS_LABELS
  return CONTRACT_STATUS_LABELS[key] ?? status
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function RequestManagePage() {
  const [request, setRequest] = useState<WorkRequest | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')

  const [showContractModal, setShowContractModal] = useState(false)
  const [contractPrice, setContractPrice] = useState('')
  const [contractDeadline, setContractDeadline] = useState('')
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)

  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  useEffect(() => { loadData() }, [])

  // モーダル表示時に背景スクロール固定
  useEffect(() => {
    if (showContractModal || selectedApplication) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => document.body.classList.remove('modal-open')
  }, [showContractModal, selectedApplication])

  async function fetchRequest() {
    const { data, error } = await supabase.from('work_requests').select('*').eq('id', requestId).single()
    if (error) { console.error('依頼取得エラー:', error); return }
    if (data.requester_id !== currentProfileId) {
      alert('この依頼を管理する権限がありません')
      router.push(`/requests/${requestId}`)
      return
    }
    setRequest(data as WorkRequest)
    setLoading(false)
  }

  async function fetchApplications() {
    const { data, error } = await supabase
      .from('work_request_applications')
      .select('*, profiles!work_request_applications_applicant_id_fkey(id, username, display_name, avatar_url)')
      .eq('work_request_id', requestId)
      .order('created_at', { ascending: false })
    if (!error) setApplications(data || [])
  }

  async function fetchContracts() {
    const { data, error } = await supabase
      .from('work_contracts')
      .select('*, profiles!work_contracts_contractor_id_fkey(id, username, display_name, avatar_url)')
      .eq('work_request_id', requestId)
      .order('created_at', { ascending: false })
    if (!error) setContracts(data || [])
  }

  useEffect(() => {
    if (requestId && currentProfileId) {
      fetchRequest()
      fetchApplications()
      fetchContracts()
    }
  }, [requestId, currentProfileId])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
    if (profile) setCurrentProfileId(profile.id)
  }

  function handleAcceptApplicationClick(applicationId: string, applicantId: string, proposedPrice: number | null) {
    const alreadyContracted = contracts.some(c => c.contractor_id === applicantId)
    if (alreadyContracted) { alert('この応募者とは既に契約済みです'); return }
    setSelectedApplicationId(applicationId)
    setContractPrice(proposedPrice?.toString() || request?.budget_max?.toString() || '')
    setContractDeadline(request?.deadline || '')
    setShowContractModal(true)
  }

  async function handleConfirmContract() {
    if (!contractPrice) { alert('金額を入力してください'); return }
    const price = parseInt(contractPrice)
    if (price < 500) { alert('金額は500円以上で設定してください'); return }
    if (!contractDeadline) { alert('納期を入力してください'); return }
    if (!selectedApplicationId) { alert('エラー: 応募情報が見つかりません'); return }

    setProcessing(true)
    try {
      const response = await fetch(`/api/applications/${selectedApplicationId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalPrice: price, deadline: contractDeadline }),
      })
      const result = await response.json()
      if (!response.ok) {
        alert(result.error ?? '採用処理に失敗しました')
        setProcessing(false)
        return
      }

      if (result.filled) {
        alert('契約を確定しました！募集人数に達したため、募集を終了しました。')
      } else {
        alert('契約を確定しました！')
      }

      setShowContractModal(false)
      fetchApplications()
      fetchContracts()
      fetchRequest()
    } catch (error) {
      console.error('[accept] error:', error)
      alert('採用処理に失敗しました')
    }
    setProcessing(false)
  }

  async function handleRejectApplication(applicationId: string) {
    if (!confirm('この応募を却下しますか？')) return
    setProcessing(true)
    try {
      const response = await fetch(`/api/applications/${applicationId}/reject`, {
        method: 'POST',
      })
      const result = await response.json()
      if (!response.ok) {
        alert(result.error ?? '却下に失敗しました')
      } else {
        alert('応募を却下しました')
        fetchApplications()
      }
    } catch (error) {
      console.error('[reject] error:', error)
      alert('却下に失敗しました')
    }
    setProcessing(false)
  }

  async function handleCloseRecruitment() {
    if (!confirm('募集を終了しますか？\n※未対応の応募は全て却下されます。')) return
    setProcessing(true)
    try {
      const response = await fetch(`/api/requests/${requestId}/withdraw`, {
        method: 'POST',
      })
      const result = await response.json()
      if (!response.ok) {
        alert(result.error ?? '募集終了処理に失敗しました')
      } else {
        alert('募集を終了しました')
        fetchRequest()
        fetchApplications()
      }
    } catch (error) {
      console.error('[withdraw] error:', error)
      alert('募集終了処理に失敗しました')
    }
    setProcessing(false)
  }

  async function handleCancelRequest() {
    if (contracts.length > 0) { alert('既に契約が存在するため、依頼をキャンセルできません。'); return }
    if (!confirm('この依頼をキャンセルしますか？')) return
    setProcessing(true)
    try {
      const response = await fetch(`/api/requests/${requestId}/withdraw`, {
        method: 'POST',
      })
      const result = await response.json()
      if (!response.ok) {
        alert(result.error ?? 'キャンセルに失敗しました')
      } else {
        alert('依頼をキャンセルしました')
        router.push('/requests/manage')
      }
    } catch (error) {
      console.error('[cancel] error:', error)
      alert('キャンセルに失敗しました')
    }
    setProcessing(false)
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.header}>
              <div className={styles.skeleton} style={{ height: '2rem', width: '60%', marginBottom: 'var(--space-4)' }}></div>
              <div className={styles.skeleton} style={{ height: '1.5rem', width: '100px' }}></div>
            </div>
            <div className={styles.section}>
              <div className={styles.skeleton} style={{ height: '1.5rem', width: '150px', marginBottom: 'var(--space-4)' }}></div>
              <div className={styles.skeleton} style={{ height: '60px', marginBottom: 'var(--space-2)' }}></div>
              <div className={styles.skeleton} style={{ height: '60px', marginBottom: 'var(--space-2)' }}></div>
              <div className={styles.skeleton} style={{ height: '60px' }}></div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!request) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.error}>
              <i className="fas fa-exclamation-circle"></i>
              <h1>依頼が見つかりませんでした</h1>
              <Link href="/requests/manage" className={`${styles.btn} ${styles.primary}`}>依頼管理に戻る</Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const pendingApplications = applications.filter(app => app.status === 'pending')
  const acceptedApplications = applications.filter(app => app.status === 'accepted')
  const rejectedApplications = applications.filter(app => app.status === 'rejected')
  const maxPositions = request.number_of_positions || 1
  const remainingPositions = maxPositions - contracts.length
  const statusLabel = getRequestStatusLabel(request.recruitment_status, request.progress_status)

  // バッジ色の決定
  let statusBadgeClass = styles.open
  if (request.recruitment_status === 'filled' || request.recruitment_status === 'withdrawn') {
    statusBadgeClass = styles.contracted
  }
  if (request.progress_status === 'completed') {
    statusBadgeClass = styles.completed
  }
  if (request.progress_status === 'cancelled') {
    statusBadgeClass = styles.cancelled
  }

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          {/* ヘッダー */}
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <h1 className={styles.title}>{request.title}</h1>
            </div>
            <div className={styles.badges}>
              <span className={`${styles.badge} ${statusBadgeClass}`}>{statusLabel}</span>
              <span className={`${styles.badge} ${styles.info}`}>{contracts.length} / {maxPositions} 人採用済み</span>
            </div>
          </div>

          {/* 契約一覧 */}
          {contracts.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-file-contract"></i>契約一覧 ({contracts.length}件)
              </h2>
              <div className={styles.list}>
                {contracts.map((contract) => (
                  <div key={contract.id} className={`${styles.card} ${styles.contracted}`}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardUser}>
                        {contract.profiles?.username ? (
                          <Link href={`/creators/${contract.profiles.username}`} className={styles.cardAvatarLink}>
                            <div className={styles.cardAvatar}>
                              {contract.profiles?.avatar_url ? (
                                <Image src={contract.profiles.avatar_url} alt={contract.profiles.display_name || ''} width={36} height={36} sizes="36px" />
                              ) : (
                                <span>{contract.profiles?.display_name?.charAt(0) || '?'}</span>
                              )}
                            </div>
                          </Link>
                        ) : (
                          <div className={styles.cardAvatar}>
                            {contract.profiles?.avatar_url ? (
                              <Image src={contract.profiles.avatar_url} alt={contract.profiles.display_name || ''} width={36} height={36} sizes="36px" />
                            ) : (
                              <span>{contract.profiles?.display_name?.charAt(0) || '?'}</span>
                            )}
                          </div>
                        )}
                        <div className={styles.cardUserInfo}>
                          <div className={styles.cardName}>{contract.profiles?.display_name || '名前未設定'}</div>
                          <div className={styles.cardDate}>{formatDate(contract.created_at)}</div>
                        </div>
                      </div>
                      <span className={`${styles.statusBadge} ${styles[contract.status]}`}>
                        {getContractStatusLabel(contract.status)}
                      </span>
                    </div>
                    <div className={styles.cardPrice}>
                      <span className={styles.cardPriceLabel}>契約金額</span>
                      <span className={styles.cardPriceValue}>{contract.final_price.toLocaleString()}円</span>
                    </div>
                    <div className={styles.cardActions}>
                      <Link href={`/requests/${requestId}/contracts/${contract.id}`} className={`${styles.btn} ${styles.primary}`}>
                        <i className="fas fa-arrow-right"></i>契約詳細を見る
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 応募一覧 */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <i className="fas fa-users"></i>応募一覧 ({applications.length}件)
            </h2>

            {applications.length === 0 ? (
              <div className={styles.empty}>
                <i className="fas fa-inbox"></i>
                <p>まだ応募がありません</p>
              </div>
            ) : (
              <div className={styles.applicationGroups}>
                {/* 未対応 */}
                {pendingApplications.length > 0 && (
                  <div className={styles.applicationGroup}>
                    <h3 className={styles.groupTitle}>
                      <span className={`${styles.groupDot} ${styles.pending}`}></span>
                      未対応 ({pendingApplications.length})
                    </h3>
                    <div className={styles.applicationList}>
                      {pendingApplications.map((app) => (
                        <div key={app.id} className={styles.applicationRow} onClick={() => setSelectedApplication(app)}>
                          <div className={styles.applicationMain}>
                            {app.profiles?.username ? (
                              <Link
                                href={`/creators/${app.profiles.username}`}
                                className={styles.applicationAvatarLink}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className={styles.applicationAvatar}>
                                  {app.profiles?.avatar_url ? (
                                    <Image src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} width={36} height={36} sizes="36px" />
                                  ) : (
                                    <span>{app.profiles?.display_name?.charAt(0) || '?'}</span>
                                  )}
                                </div>
                              </Link>
                            ) : (
                              <div className={styles.applicationAvatar}>
                                {app.profiles?.avatar_url ? (
                                  <Image src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} width={36} height={36} sizes="36px" />
                                ) : (
                                  <span>{app.profiles?.display_name?.charAt(0) || '?'}</span>
                                )}
                              </div>
                            )}
                            <div className={styles.applicationInfo}>
                              <span className={styles.applicationName}>{app.profiles?.display_name || '名前未設定'}</span>
                              <span className={styles.applicationMeta}>
                                {app.proposed_price ? `¥${app.proposed_price.toLocaleString()}` : '金額未指定'}
                              </span>
                            </div>
                          </div>
                          <i className="fas fa-chevron-right" style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}></i>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 採用済み */}
                {acceptedApplications.length > 0 && (
                  <div className={styles.applicationGroup}>
                    <h3 className={styles.groupTitle}>
                      <span className={`${styles.groupDot} ${styles.accepted}`}></span>
                      採用済み ({acceptedApplications.length})
                    </h3>
                    <div className={styles.applicationList}>
                      {acceptedApplications.map((app) => {
                        const contract = contracts.find(c => c.contractor_id === app.applicant_id)
                        return (
                          <div key={app.id} className={styles.applicationRow} onClick={() => setSelectedApplication(app)}>
                            <div className={styles.applicationMain}>
                              {app.profiles?.username ? (
                                <Link
                                  href={`/creators/${app.profiles.username}`}
                                  className={styles.applicationAvatarLink}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className={styles.applicationAvatar}>
                                    {app.profiles?.avatar_url ? (
                                      <Image src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} width={36} height={36} sizes="36px" />
                                    ) : (
                                      <span>{app.profiles?.display_name?.charAt(0) || '?'}</span>
                                    )}
                                  </div>
                                </Link>
                              ) : (
                                <div className={styles.applicationAvatar}>
                                  {app.profiles?.avatar_url ? (
                                    <Image src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} width={36} height={36} sizes="36px" />
                                  ) : (
                                    <span>{app.profiles?.display_name?.charAt(0) || '?'}</span>
                                  )}
                                </div>
                              )}
                              <div className={styles.applicationInfo}>
                                <span className={styles.applicationName}>{app.profiles?.display_name || '名前未設定'}</span>
                                <span className={styles.applicationMeta}>
                                  {contract ? `¥${contract.final_price.toLocaleString()} で契約` : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 却下済み */}
                {rejectedApplications.length > 0 && (
                  <div className={styles.applicationGroup}>
                    <h3 className={styles.groupTitle}>
                      <span className={`${styles.groupDot} ${styles.rejected}`}></span>
                      却下済み ({rejectedApplications.length})
                    </h3>
                    <div className={styles.applicationList}>
                      {rejectedApplications.map((app) => (
                        <div key={app.id} className={styles.applicationRow} onClick={() => setSelectedApplication(app)}>
                          <div className={styles.applicationMain}>
                            {app.profiles?.username ? (
                              <Link
                                href={`/creators/${app.profiles.username}`}
                                className={styles.applicationAvatarLink}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className={styles.applicationAvatar}>
                                  {app.profiles?.avatar_url ? (
                                    <Image src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} width={36} height={36} sizes="36px" />
                                  ) : (
                                    <span>{app.profiles?.display_name?.charAt(0) || '?'}</span>
                                  )}
                                </div>
                              </Link>
                            ) : (
                              <div className={styles.applicationAvatar}>
                                {app.profiles?.avatar_url ? (
                                  <Image src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} width={36} height={36} sizes="36px" />
                                ) : (
                                  <span>{app.profiles?.display_name?.charAt(0) || '?'}</span>
                                )}
                              </div>
                            )}
                            <div className={styles.applicationInfo}>
                              <span className={styles.applicationName}>{app.profiles?.display_name || '名前未設定'}</span>
                              <span className={styles.applicationMeta}>
                                {app.proposed_price ? `¥${app.proposed_price.toLocaleString()}` : ''}
                              </span>
                            </div>
                          </div>
                          <i className="fas fa-chevron-right" style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}></i>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 依頼のキャンセル（契約がない時のみ表示） */}
          {request.recruitment_status === 'open' && contracts.length === 0 && (
            <div className={styles.dangerSection}>
              <h3 className={styles.dangerTitle}>この依頼をキャンセルする</h3>
              <p className={styles.dangerDescription}>
                依頼をキャンセルすると、募集が終了し、この依頼への応募ができなくなります。
                未対応の応募がある場合は、すべて却下されます。
              </p>
              <button onClick={handleCancelRequest} disabled={processing} className={styles.dangerBtn}>
                <i className="fas fa-times"></i>依頼をキャンセル
              </button>
            </div>
          )}

          {/* 募集終了（契約がある時のみ表示） */}
          {request.recruitment_status === 'open' && contracts.length > 0 && (
            <div className={styles.dangerSection}>
              <h3 className={styles.dangerTitle}>募集を終了する</h3>
              <p className={styles.dangerDescription}>
                募集を終了すると、この依頼への新規応募ができなくなります。
                未対応の応募がある場合は、すべて却下されます。
              </p>
              <button onClick={handleCloseRecruitment} disabled={processing} className={styles.dangerBtn}>
                <i className="fas fa-stop"></i>募集を終了
              </button>
            </div>
          )}

          {request.recruitment_status !== 'open' && (
            <div className={styles.closed}>
              <p>この依頼は{statusLabel}です。</p>
              <Link href={`/requests/${requestId}`} className={`${styles.btn} ${styles.primary}`}>依頼詳細を見る</Link>
            </div>
          )}
        </div>
      </div>

      {/* 契約確定モーダル */}
      {showContractModal && (
        <div className={styles.modalOverlay} onClick={() => setShowContractModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>契約を確定</h3>
              <button className={styles.modalClose} onClick={() => setShowContractModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalGroup}>
                <label className={styles.modalLabel}>確定金額 <span className={styles.required}>*</span></label>
                <div className={styles.modalPriceRow}>
                  <input type="number" value={contractPrice} onChange={(e) => setContractPrice(e.target.value)} placeholder="金額を入力" min="500" required className={styles.modalInput} />
                  <span className={styles.modalUnit}>円</span>
                </div>
                <div className={styles.modalHint}>※最低金額は500円です</div>
              </div>

              <div className={styles.modalGroup}>
                <label className={styles.modalLabel}>納期 <span className={styles.required}>*</span></label>
                <input type="date" value={contractDeadline} onChange={(e) => setContractDeadline(e.target.value)} min={new Date().toISOString().split('T')[0]} required className={`${styles.modalInput} ${styles.full}`} />
              </div>

              <div className={styles.modalInfo}>
                <i className="fas fa-info-circle"></i>
                <span>契約確定後、仮払いを行うとクリエイターが作業を開始できます。{remainingPositions > 1 && `残り ${remainingPositions - 1} 人まで追加で採用できます。`}</span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={() => setShowContractModal(false)} className={`${styles.btn} ${styles.secondary}`}>キャンセル</button>
              <button onClick={handleConfirmContract} disabled={processing} className={`${styles.btn} ${styles.primary}`}>
                {processing ? '処理中...' : '採用して契約確定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 応募詳細モーダル */}
      {selectedApplication && (
        <div className={styles.modalOverlay} onClick={() => setSelectedApplication(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* ヘッダー */}
            <div className={styles.modalHeader}>
              <div className={styles.appModalUser}>
                {selectedApplication.profiles?.username ? (
                  <Link
                    href={`/creators/${selectedApplication.profiles.username}`}
                    className={styles.appModalAvatarLink}
                    onClick={() => setSelectedApplication(null)}
                  >
                    <div className={styles.appModalAvatar}>
                      {selectedApplication.profiles?.avatar_url ? (
                        <Image src={selectedApplication.profiles.avatar_url} alt={selectedApplication.profiles.display_name || ''} width={48} height={48} sizes="48px" />
                      ) : (
                        <span>{selectedApplication.profiles?.display_name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className={styles.appModalAvatar}>
                    {selectedApplication.profiles?.avatar_url ? (
                      <Image src={selectedApplication.profiles.avatar_url} alt={selectedApplication.profiles.display_name || ''} width={48} height={48} sizes="48px" />
                    ) : (
                      <span>{selectedApplication.profiles?.display_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                )}
                <div className={styles.appModalName}>{selectedApplication.profiles?.display_name || '名前未設定'}</div>
              </div>
              <button onClick={() => setSelectedApplication(null)} className={styles.modalClose}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* ボディ */}
            <div className={styles.modalBody}>
              {/* 応募情報 */}
              <div className={styles.appModalInfo}>
                <div className={styles.appModalInfoRow}>
                  <span className={styles.appModalInfoLabel}>希望金額</span>
                  <span className={styles.appModalInfoValue}>
                    {selectedApplication.proposed_price
                      ? `¥${selectedApplication.proposed_price.toLocaleString()}`
                      : '未指定'}
                  </span>
                </div>
                <div className={styles.appModalInfoRow}>
                  <span className={styles.appModalInfoLabel}>応募日</span>
                  <span className={styles.appModalInfoValue}>{formatDate(selectedApplication.created_at)}</span>
                </div>
              </div>

              {/* メッセージ */}
              <div className={styles.appModalMessage}>
                <div className={styles.appModalMessageLabel}>応募メッセージ</div>
                <p className={styles.appModalMessageText}>{selectedApplication.message}</p>
              </div>
            </div>

            {/* フッター */}
            {selectedApplication.status === 'pending' && request.recruitment_status === 'open' && (
              <div className={styles.modalFooter}>
                <button
                  onClick={() => { handleRejectApplication(selectedApplication.id); setSelectedApplication(null); }}
                  disabled={processing}
                  className={`${styles.btn} ${styles.secondary}`}
                >
                  却下する
                </button>
                {remainingPositions > 0 ? (
                  <button
                    onClick={() => {
                      handleAcceptApplicationClick(selectedApplication.id, selectedApplication.applicant_id, selectedApplication.proposed_price);
                      setSelectedApplication(null);
                    }}
                    disabled={processing}
                    className={`${styles.btn} ${styles.primary}`}
                  >
                    採用する
                  </button>
                ) : (
                  <span className={styles.positionsFull}>募集枠が埋まっています</span>
                )}
              </div>
            )}

            {selectedApplication.status === 'accepted' && (
              <div className={styles.modalFooter}>
                <div className={styles.appModalStatus}>
                  <i className="fas fa-check-circle"></i>
                  採用済み
                </div>
              </div>
            )}

            {selectedApplication.status === 'rejected' && (
              <div className={styles.modalFooter}>
                <div className={styles.appModalStatusRejected}>
                  却下済み
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}
