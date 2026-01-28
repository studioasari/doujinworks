'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import { createNotification } from '@/utils/notifications'
import styles from './page.module.css'

type WorkRequest = {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  category: string
  status: string
  created_at: string
  requester_id: string
  payment_type: string | null
  hourly_rate_min: number | null
  hourly_rate_max: number | null
  price_negotiable: boolean | null
  number_of_positions: number | null
  application_deadline: string | null
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
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)

  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  useEffect(() => { checkAuth() }, [])

  // モーダル表示時に背景スクロール固定
  useEffect(() => {
    if (showContractModal || selectedApplication) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => document.body.classList.remove('modal-open')
  }, [showContractModal, selectedApplication])

  useEffect(() => {
    if (requestId && currentProfileId) {
      fetchRequest()
      fetchApplications()
      fetchContracts()
    }
  }, [requestId, currentProfileId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
    if (profile) setCurrentProfileId(profile.id)
  }

  async function fetchRequest() {
    const { data, error } = await supabase.from('work_requests').select('*').eq('id', requestId).single()
    if (error) { console.error('依頼取得エラー:', error); return }
    if (data.requester_id !== currentProfileId) {
      alert('この依頼を管理する権限がありません')
      router.push(`/requests/${requestId}`)
      return
    }
    setRequest(data)
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

  function handleAcceptApplicationClick(applicationId: string, applicantId: string, proposedPrice: number | null) {
    const alreadyContracted = contracts.some(c => c.contractor_id === applicantId)
    if (alreadyContracted) { alert('この応募者とは既に契約済みです'); return }
    setSelectedApplicationId(applicationId)
    setSelectedApplicantId(applicantId)
    setContractPrice(proposedPrice?.toString() || request?.budget_max?.toString() || '')
    setContractDeadline(request?.deadline || '')
    setShowContractModal(true)
  }

  async function handleConfirmContract() {
    if (!contractPrice) { alert('金額を入力してください'); return }
    const price = parseInt(contractPrice)
    if (price < 500) { alert('金額は500円以上で設定してください'); return }
    if (!contractDeadline) { alert('納期を入力してください'); return }
    if (!selectedApplicationId || !selectedApplicantId) { alert('エラー: 応募情報が見つかりません'); return }

    setProcessing(true)
    try {
      const { data: newContract, error: contractError } = await supabase
        .from('work_contracts')
        .insert({
          work_request_id: requestId,
          contractor_id: selectedApplicantId,
          application_id: selectedApplicationId,
          final_price: price,
          deadline: contractDeadline,
          status: 'contracted',
          contracted_at: new Date().toISOString()
        })
        .select().single()

      if (contractError) {
        if (contractError.code === '23505') alert('この応募者とは既に契約済みです')
        else alert('契約の作成に失敗しました')
        setProcessing(false)
        return
      }

      await supabase.from('work_request_applications').update({ status: 'accepted' }).eq('id', selectedApplicationId)

      // チャットルーム作成
      const { data: existingRooms } = await supabase.from('chat_room_participants').select('chat_room_id').eq('profile_id', currentProfileId)
      let targetRoomId: string | null = null

      if (existingRooms && existingRooms.length > 0) {
        for (const room of existingRooms) {
          const { data: participants } = await supabase.from('chat_room_participants').select('profile_id').eq('chat_room_id', room.chat_room_id)
          const profileIds = participants?.map(p => p.profile_id) || []
          if (profileIds.length === 2 && profileIds.includes(selectedApplicantId)) {
            targetRoomId = room.chat_room_id
            break
          }
        }
      }

      if (!targetRoomId) {
        const { data: newRoom } = await supabase.from('chat_rooms').insert({ related_request_id: requestId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single()
        if (newRoom) {
          targetRoomId = newRoom.id
          await supabase.from('chat_room_participants').insert([
            { chat_room_id: targetRoomId, profile_id: currentProfileId, last_read_at: new Date().toISOString(), pinned: false, hidden: false },
            { chat_room_id: targetRoomId, profile_id: selectedApplicantId, last_read_at: new Date().toISOString(), pinned: false, hidden: false }
          ])
        }
      }

      await createNotification(selectedApplicantId, 'accepted', '応募が採用されました', `「${request!.title}」の応募が採用されました。仮払いをお待ちください。`, `/requests/${requestId}/contracts/${newContract.id}`)

      const newContractsCount = contracts.length + 1
      const maxPositions = request?.number_of_positions || 1

      if (newContractsCount >= maxPositions) {
        await supabase.from('work_request_applications').update({ status: 'rejected' }).eq('work_request_id', requestId).eq('status', 'pending')
        await supabase.from('work_requests').update({ status: 'closed' }).eq('id', requestId)
        alert(`契約を確定しました！募集人数（${maxPositions}人）に達したため、募集を終了しました。`)
      } else {
        alert(`契約を確定しました！（${newContractsCount}/${maxPositions}人採用済み）`)
      }

      setShowContractModal(false)
      fetchApplications()
      fetchContracts()
      fetchRequest()
    } catch (error) {
      console.error('契約確定エラー:', error)
      alert('契約の確定に失敗しました')
    }
    setProcessing(false)
  }

  async function handleRejectApplication(applicationId: string) {
    if (!confirm('この応募を却下しますか？')) return
    setProcessing(true)
    const { error } = await supabase.from('work_request_applications').update({ status: 'rejected' }).eq('id', applicationId)
    if (error) alert('却下に失敗しました')
    else { alert('応募を却下しました'); fetchApplications() }
    setProcessing(false)
  }

  async function handleCloseRecruitment() {
    if (!confirm('募集を終了しますか？\n※未対応の応募は全て却下されます。')) return
    setProcessing(true)
    await supabase.from('work_request_applications').update({ status: 'rejected' }).eq('work_request_id', requestId).eq('status', 'pending')
    const { error } = await supabase.from('work_requests').update({ status: 'closed' }).eq('id', requestId)
    if (error) alert('募集終了に失敗しました')
    else { alert('募集を終了しました'); fetchRequest(); fetchApplications() }
    setProcessing(false)
  }

  async function handleCancelRequest() {
    if (contracts.length > 0) { alert('既に契約が存在するため、依頼をキャンセルできません。'); return }
    if (!confirm('この依頼をキャンセルしますか？')) return
    setProcessing(true)
    const { error } = await supabase.from('work_requests').update({ status: 'cancelled' }).eq('id', requestId)
    if (error) alert('キャンセルに失敗しました')
    else { alert('依頼をキャンセルしました'); router.push('/requests/manage') }
    setProcessing(false)
  }

  function getStatusLabel(status: string) {
    const statuses: { [key: string]: string } = { open: '募集中', closed: '募集終了', cancelled: 'キャンセル' }
    return statuses[status] || status
  }

  function getContractStatusLabel(status: string) {
    const statuses: { [key: string]: string } = { contracted: '仮払い待ち', paid: '作業中', delivered: '納品済み', completed: '完了', cancelled: 'キャンセル' }
    return statuses[status] || status
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.loading}>
              <i className="fas fa-spinner fa-spin"></i>
              <span>読み込み中...</span>
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
              <span className={`${styles.badge} ${styles[request.status]}`}>{getStatusLabel(request.status)}</span>
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
                                <img src={contract.profiles.avatar_url} alt={contract.profiles.display_name || ''} />
                              ) : (
                                <span>{contract.profiles?.display_name?.charAt(0) || '?'}</span>
                              )}
                            </div>
                          </Link>
                        ) : (
                          <div className={styles.cardAvatar}>
                            {contract.profiles?.avatar_url ? (
                              <img src={contract.profiles.avatar_url} alt={contract.profiles.display_name || ''} />
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
                                    <img src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} />
                                  ) : (
                                    <span>{app.profiles?.display_name?.charAt(0) || '?'}</span>
                                  )}
                                </div>
                              </Link>
                            ) : (
                              <div className={styles.applicationAvatar}>
                                {app.profiles?.avatar_url ? (
                                  <img src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} />
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
                                      <img src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} />
                                    ) : (
                                      <span>{app.profiles?.display_name?.charAt(0) || '?'}</span>
                                    )}
                                  </div>
                                </Link>
                              ) : (
                                <div className={styles.applicationAvatar}>
                                  {app.profiles?.avatar_url ? (
                                    <img src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} />
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
                            {contract && (
                              <Link 
                                href={`/requests/${requestId}/contracts/${contract.id}`} 
                                className={styles.linkBtn}
                                onClick={(e) => e.stopPropagation()}
                              >
                                契約詳細 <i className="fas fa-chevron-right"></i>
                              </Link>
                            )}
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
                                    <img src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} />
                                  ) : (
                                    <span>{app.profiles?.display_name?.charAt(0) || '?'}</span>
                                  )}
                                </div>
                              </Link>
                            ) : (
                              <div className={styles.applicationAvatar}>
                                {app.profiles?.avatar_url ? (
                                  <img src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} />
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
          {request.status === 'open' && contracts.length === 0 && (
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
          {request.status === 'open' && contracts.length > 0 && (
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

          {request.status !== 'open' && (
            <div className={styles.closed}>
              <p>この依頼は{getStatusLabel(request.status)}です。</p>
              <Link href={`/requests/${requestId}`} className={`${styles.btn} ${styles.primary}`}>依頼詳細を見る</Link>
            </div>
          )}
        </div>
      </div>

      {/* 契約確定モーダル */}
      {showContractModal && (
        <div className={styles.modalOverlay} onClick={() => setShowContractModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>契約を確定</h2>

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

            <div className={styles.modalButtons}>
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
            <div className={styles.appModalHeader}>
              <div className={styles.appModalUser}>
                {selectedApplication.profiles?.username ? (
                  <Link 
                    href={`/creators/${selectedApplication.profiles.username}`}
                    className={styles.appModalAvatarLink}
                    onClick={() => setSelectedApplication(null)}
                  >
                    <div className={styles.appModalAvatar}>
                      {selectedApplication.profiles?.avatar_url ? (
                        <img src={selectedApplication.profiles.avatar_url} alt={selectedApplication.profiles.display_name || ''} />
                      ) : (
                        <span>{selectedApplication.profiles?.display_name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className={styles.appModalAvatar}>
                    {selectedApplication.profiles?.avatar_url ? (
                      <img src={selectedApplication.profiles.avatar_url} alt={selectedApplication.profiles.display_name || ''} />
                    ) : (
                      <span>{selectedApplication.profiles?.display_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                )}
                <div className={styles.appModalName}>{selectedApplication.profiles?.display_name || '名前未設定'}</div>
              </div>
              <button onClick={() => setSelectedApplication(null)} className={styles.modalClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>

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

            {/* アクション */}
            {selectedApplication.status === 'pending' && request.status === 'open' && (
              <div className={styles.appModalActions}>
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
              <div className={styles.appModalStatus}>
                <i className="fas fa-check-circle"></i>
                採用済み
              </div>
            )}

            {selectedApplication.status === 'rejected' && (
              <div className={styles.appModalStatusRejected}>
                却下済み
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}