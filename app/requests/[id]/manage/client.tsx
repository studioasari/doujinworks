'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import { createNotification } from '../../../../utils/notifications'

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

  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  useEffect(() => {
    checkAuth()
  }, [])

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentProfileId(profile.id)
    }
  }

  async function fetchRequest() {
    const { data, error } = await supabase
      .from('work_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (error) {
      console.error('依頼取得エラー:', error)
      return
    }

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

    if (error) {
      console.error('応募取得エラー:', error)
    } else {
      setApplications(data || [])
    }
  }

  async function fetchContracts() {
    const { data, error } = await supabase
      .from('work_contracts')
      .select('*, profiles!work_contracts_contractor_id_fkey(id, username, display_name, avatar_url)')
      .eq('work_request_id', requestId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('契約取得エラー:', error)
    } else {
      setContracts(data || [])
    }
  }

  function handleAcceptApplicationClick(applicationId: string, applicantId: string, proposedPrice: number | null) {
    // 既に契約済みかチェック
    const alreadyContracted = contracts.some(c => c.contractor_id === applicantId)
    if (alreadyContracted) {
      alert('この応募者とは既に契約済みです')
      return
    }

    setSelectedApplicationId(applicationId)
    setSelectedApplicantId(applicantId)
    setContractPrice(proposedPrice?.toString() || request?.budget_max?.toString() || '')
    setContractDeadline(request?.deadline || '')
    setShowContractModal(true)
  }

  async function handleConfirmContract() {
    if (!contractPrice) {
      alert('金額を入力してください')
      return
    }

    const price = parseInt(contractPrice)
    if (price < 500) {
      alert('金額は500円以上で設定してください')
      return
    }

    if (!contractDeadline) {
      alert('納期を入力してください')
      return
    }

    if (!selectedApplicationId || !selectedApplicantId) {
      alert('エラー: 応募情報が見つかりません')
      return
    }

    setProcessing(true)

    try {
      // 1. 契約レコードを作成
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
        .select()
        .single()

      if (contractError) {
        console.error('契約作成エラー:', contractError)
        if (contractError.code === '23505') {
          alert('この応募者とは既に契約済みです')
        } else {
          alert('契約の作成に失敗しました')
        }
        setProcessing(false)
        return
      }

      // 2. 応募ステータスを更新
      await supabase
        .from('work_request_applications')
        .update({ status: 'accepted' })
        .eq('id', selectedApplicationId)

      // 3. チャットルームを作成または取得
      const { data: existingRooms } = await supabase
        .from('chat_room_participants')
        .select('chat_room_id')
        .eq('profile_id', currentProfileId)

      let targetRoomId: string | null = null

      if (existingRooms && existingRooms.length > 0) {
        for (const room of existingRooms) {
          const { data: participants } = await supabase
            .from('chat_room_participants')
            .select('profile_id')
            .eq('chat_room_id', room.chat_room_id)

          const profileIds = participants?.map(p => p.profile_id) || []
          
          if (profileIds.length === 2 && profileIds.includes(selectedApplicantId)) {
            targetRoomId = room.chat_room_id
            break
          }
        }
      }

      if (!targetRoomId) {
        const { data: newRoom, error: roomError } = await supabase
          .from('chat_rooms')
          .insert({
            related_request_id: requestId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (roomError) {
          console.error('チャットルーム作成エラー:', roomError)
        } else {
          targetRoomId = newRoom.id

          await supabase.from('chat_room_participants').insert([
            {
              chat_room_id: targetRoomId,
              profile_id: currentProfileId,
              last_read_at: new Date().toISOString(),
              pinned: false,
              hidden: false
            },
            {
              chat_room_id: targetRoomId,
              profile_id: selectedApplicantId,
              last_read_at: new Date().toISOString(),
              pinned: false,
              hidden: false
            }
          ])
        }
      }

      // 4. 通知を送信
      await createNotification(
        selectedApplicantId,
        'accepted',
        '応募が採用されました',
        `「${request!.title}」の応募が採用されました。仮払いをお待ちください。`,
        `/requests/${requestId}/contracts/${newContract.id}`
      )

      // 5. 募集人数に達したかチェック
      const newContractsCount = contracts.length + 1
      const maxPositions = request?.number_of_positions || 1

      if (newContractsCount >= maxPositions) {
        // 募集人数に達したら、残りの応募を自動却下して募集終了
        await supabase
          .from('work_request_applications')
          .update({ status: 'rejected' })
          .eq('work_request_id', requestId)
          .eq('status', 'pending')

        await supabase
          .from('work_requests')
          .update({ status: 'closed' })
          .eq('id', requestId)

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

    const { error } = await supabase
      .from('work_request_applications')
      .update({ status: 'rejected' })
      .eq('id', applicationId)

    if (error) {
      console.error('却下エラー:', error)
      alert('却下に失敗しました')
    } else {
      alert('応募を却下しました')
      fetchApplications()
    }

    setProcessing(false)
  }

  async function handleCloseRecruitment() {
    if (!confirm('募集を終了しますか？\n※未対応の応募は全て却下されます。')) return

    setProcessing(true)

    // 未対応の応募を却下
    await supabase
      .from('work_request_applications')
      .update({ status: 'rejected' })
      .eq('work_request_id', requestId)
      .eq('status', 'pending')

    // 依頼のステータスを更新
    const { error } = await supabase
      .from('work_requests')
      .update({ status: 'closed' })
      .eq('id', requestId)

    if (error) {
      console.error('募集終了エラー:', error)
      alert('募集終了に失敗しました')
    } else {
      alert('募集を終了しました')
      fetchRequest()
      fetchApplications()
    }

    setProcessing(false)
  }

  async function handleCancelRequest() {
    if (contracts.length > 0) {
      alert('既に契約が存在するため、依頼をキャンセルできません。\n各契約ページからキャンセル申請を行ってください。')
      return
    }

    if (!confirm('この依頼をキャンセルしますか？')) return

    setProcessing(true)

    const { error } = await supabase
      .from('work_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId)

    if (error) {
      console.error('キャンセルエラー:', error)
      alert('キャンセルに失敗しました')
    } else {
      alert('依頼をキャンセルしました')
      router.push('/requests/manage')
    }

    setProcessing(false)
  }

  function getStatusLabel(status: string) {
    const statuses: { [key: string]: string } = {
      open: '募集中',
      closed: '募集終了',
      cancelled: 'キャンセル'
    }
    return statuses[status] || status
  }

  function getContractStatusLabel(status: string) {
    const statuses: { [key: string]: string } = {
      contracted: '仮払い待ち',
      paid: '作業中',
      delivered: '納品済み',
      completed: '完了',
      cancelled: 'キャンセル'
    }
    return statuses[status] || status
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <Header />
        <div className="app-manage-page">
          <div className="app-manage-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <span>読み込み中...</span>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!request) {
    return (
      <>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <Header />
        <div className="app-manage-page">
          <div className="app-manage-error">
            <i className="fas fa-exclamation-circle"></i>
            <h1>依頼が見つかりませんでした</h1>
            <Link href="/requests/manage" className="app-manage-btn primary">依頼管理に戻る</Link>
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
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      <div className="app-manage-page">
        <div className="app-manage-container">
          {/* ヘッダー */}
          <div className="app-manage-header">
            <div className="app-manage-header-top">
              <h1 className="app-manage-title">{request.title}</h1>
              <div className="app-manage-header-actions">
                {request.status === 'open' && contracts.length > 0 && (
                  <button onClick={handleCloseRecruitment} disabled={processing} className="app-manage-btn secondary">
                    <i className="fas fa-stop"></i>
                    募集終了
                  </button>
                )}
                {request.status === 'open' && contracts.length === 0 && (
                  <button onClick={handleCancelRequest} disabled={processing} className="app-manage-btn danger">
                    <i className="fas fa-times"></i>
                    キャンセル
                  </button>
                )}
              </div>
            </div>
            <div className="app-manage-badges">
              <span className={`app-manage-badge status ${request.status}`}>{getStatusLabel(request.status)}</span>
              <span className="app-manage-badge info">
                {contracts.length} / {maxPositions} 人採用済み
              </span>
            </div>
          </div>

          {/* 契約一覧 */}
          {contracts.length > 0 && (
            <div className="app-manage-section">
              <h2 className="app-manage-section-title">
                <i className="fas fa-file-contract"></i>
                契約一覧 ({contracts.length}件)
              </h2>
              <div className="app-manage-list">
                {contracts.map((contract) => (
                  <div key={contract.id} className="app-manage-card contracted">
                    <div className="app-manage-card-header">
                      <div className="app-manage-card-user">
                        <div className="app-manage-card-avatar">
                          {contract.profiles?.avatar_url ? (
                            <img src={contract.profiles.avatar_url} alt={contract.profiles.display_name || ''} />
                          ) : (
                            <span>{contract.profiles?.display_name?.charAt(0) || '?'}</span>
                          )}
                        </div>
                        <div className="app-manage-card-user-info">
                          {contract.profiles?.username ? (
                            <Link href={`/creators/${contract.profiles.username}`} className="app-manage-card-name">
                              {contract.profiles.display_name || '名前未設定'}
                            </Link>
                          ) : (
                            <div className="app-manage-card-name">{contract.profiles?.display_name || '名前未設定'}</div>
                          )}
                          <div className="app-manage-card-date">{formatDate(contract.created_at)}</div>
                        </div>
                      </div>
                      <span className={`app-manage-status-badge ${contract.status}`}>
                        {getContractStatusLabel(contract.status)}
                      </span>
                    </div>

                    <div className="app-manage-card-price">
                      <span className="app-manage-card-price-label">契約金額</span>
                      <span className="app-manage-card-price-value">{contract.final_price.toLocaleString()}円</span>
                    </div>

                    <div className="app-manage-card-actions">
                      <Link href={`/requests/${requestId}/contracts/${contract.id}`} className="app-manage-btn primary">
                        <i className="fas fa-arrow-right"></i>
                        契約詳細を見る
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 応募一覧 */}
          <div className="app-manage-section">
            <h2 className="app-manage-section-title">
              <i className="fas fa-users"></i>
              応募一覧 ({applications.length}件)
            </h2>

            {/* 統計 */}
            <div className="app-manage-stats">
              <div className="app-manage-stat-card">
                <div className="app-manage-stat-label">未対応</div>
                <div className="app-manage-stat-value pending">{pendingApplications.length}</div>
              </div>
              <div className="app-manage-stat-card">
                <div className="app-manage-stat-label">採用済み</div>
                <div className="app-manage-stat-value accepted">{acceptedApplications.length}</div>
              </div>
              <div className="app-manage-stat-card">
                <div className="app-manage-stat-label">却下済み</div>
                <div className="app-manage-stat-value rejected">{rejectedApplications.length}</div>
              </div>
              <div className="app-manage-stat-card">
                <div className="app-manage-stat-label">残り枠</div>
                <div className="app-manage-stat-value">{remainingPositions}</div>
              </div>
            </div>

            {/* 応募リスト */}
            {applications.length === 0 ? (
              <div className="app-manage-empty">
                <i className="fas fa-inbox"></i>
                <p>まだ応募がありません</p>
              </div>
            ) : (
              <div className="app-manage-list">
                {applications.map((app) => {
                  const isContracted = contracts.some(c => c.contractor_id === app.applicant_id)
                  
                  return (
                    <div key={app.id} className={`app-manage-card ${app.status}`}>
                      {/* ヘッダー */}
                      <div className="app-manage-card-header">
                        <div className="app-manage-card-user">
                          <div className="app-manage-card-avatar">
                            {app.profiles?.avatar_url ? (
                              <img src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} />
                            ) : (
                              <span>{app.profiles?.display_name?.charAt(0) || '?'}</span>
                            )}
                          </div>
                          <div className="app-manage-card-user-info">
                            {app.profiles?.username ? (
                              <Link href={`/creators/${app.profiles.username}`} className="app-manage-card-name">
                                {app.profiles.display_name || '名前未設定'}
                              </Link>
                            ) : (
                              <div className="app-manage-card-name">{app.profiles?.display_name || '名前未設定'}</div>
                            )}
                            <div className="app-manage-card-date">{formatDate(app.created_at)}</div>
                          </div>
                        </div>
                        
                        {app.status === 'accepted' && (
                          <span className="app-manage-status-badge accepted">
                            <i className="fas fa-check"></i>
                            採用済み
                          </span>
                        )}
                        {app.status === 'rejected' && (
                          <span className="app-manage-status-badge rejected">却下済み</span>
                        )}
                      </div>

                      {/* メッセージ */}
                      <p className="app-manage-card-message">{app.message}</p>

                      {/* 希望金額 */}
                      {app.proposed_price && (
                        <div className="app-manage-card-price">
                          <span className="app-manage-card-price-label">希望金額</span>
                          <span className="app-manage-card-price-value">{app.proposed_price.toLocaleString()}円</span>
                        </div>
                      )}

                      {/* アクションボタン */}
                      {app.status === 'pending' && request.status === 'open' && (
                        <div className="app-manage-card-actions">
                          <button 
                            onClick={() => handleRejectApplication(app.id)} 
                            disabled={processing} 
                            className="app-manage-btn secondary"
                          >
                            却下
                          </button>
                          {remainingPositions > 0 ? (
                            <button 
                              onClick={() => handleAcceptApplicationClick(app.id, app.applicant_id, app.proposed_price)} 
                              disabled={processing || isContracted} 
                              className="app-manage-btn primary"
                            >
                              <i className="fas fa-check"></i>
                              採用する
                            </button>
                          ) : (
                            <span className="app-manage-positions-full">募集枠が埋まっています</span>
                          )}
                        </div>
                      )}

                      {/* 既に契約済みの場合 */}
                      {isContracted && app.status === 'accepted' && (
                        <div className="app-manage-card-actions">
                          <Link 
                            href={`/requests/${requestId}/contracts/${contracts.find(c => c.contractor_id === app.applicant_id)?.id}`} 
                            className="app-manage-btn primary"
                          >
                            契約詳細を見る
                          </Link>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 募集終了・キャンセル済みの案内 */}
          {request.status !== 'open' && (
            <div className="app-manage-closed">
              <p>この依頼は{getStatusLabel(request.status)}です。</p>
              <Link href={`/requests/${requestId}`} className="app-manage-btn primary">依頼詳細を見る</Link>
            </div>
          )}
        </div>
      </div>

      {/* 契約確定モーダル */}
      {showContractModal && (
        <div className="app-manage-modal-overlay" onClick={() => setShowContractModal(false)}>
          <div className="app-manage-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="app-manage-modal-title">契約を確定</h2>

            <div className="app-manage-modal-group">
              <label className="app-manage-modal-label">
                確定金額 <span className="app-manage-required">*</span>
              </label>
              <div className="app-manage-modal-price-row">
                <input 
                  type="number" 
                  value={contractPrice} 
                  onChange={(e) => setContractPrice(e.target.value)} 
                  placeholder="金額を入力" 
                  min="500" 
                  required 
                  className="app-manage-modal-input"
                />
                <span className="app-manage-modal-unit">円</span>
              </div>
              <div className="app-manage-modal-hint">※最低金額は500円です</div>
              {contractPrice && parseInt(contractPrice) >= 500 && (
                <div className="app-manage-fee-breakdown">
                  <div className="app-manage-fee-row">
                    <span>依頼者支払額</span>
                    <span>{parseInt(contractPrice).toLocaleString()}円</span>
                  </div>
                  <div className="app-manage-fee-row">
                    <span>プラットフォーム手数料（12%）</span>
                    <span>-{Math.floor(parseInt(contractPrice) * 0.12).toLocaleString()}円</span>
                  </div>
                  <div className="app-manage-fee-row">
                    <span>振込手数料</span>
                    <span>-330円</span>
                  </div>
                  <div className="app-manage-fee-row total">
                    <span>クリエイター実受取額</span>
                    <span>{Math.floor(parseInt(contractPrice) * 0.88) - 330 >= 0 ? (Math.floor(parseInt(contractPrice) * 0.88) - 330).toLocaleString() : 0}円</span>
                  </div>
                  <div className="app-manage-fee-note">※1,000円未満の場合は翌月に繰越されます</div>
                </div>
              )}
            </div>

            <div className="app-manage-modal-group">
              <label className="app-manage-modal-label">
                納期 <span className="app-manage-required">*</span>
              </label>
              <input 
                type="date" 
                value={contractDeadline} 
                onChange={(e) => setContractDeadline(e.target.value)} 
                min={new Date().toISOString().split('T')[0]} 
                required
                className="app-manage-modal-input full"
              />
            </div>

            <div className="app-manage-modal-info">
              <i className="fas fa-info-circle"></i>
              契約確定後、仮払いを行うとクリエイターが作業を開始できます。
              {remainingPositions > 1 && (
                <><br />残り {remainingPositions - 1} 人まで追加で採用できます。</>
              )}
            </div>

            <div className="app-manage-modal-buttons">
              <button onClick={() => setShowContractModal(false)} className="app-manage-btn secondary">
                キャンセル
              </button>
              <button onClick={handleConfirmContract} disabled={processing} className="app-manage-btn primary">
                {processing ? '処理中...' : '採用して契約確定'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}