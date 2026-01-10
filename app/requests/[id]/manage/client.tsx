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
  selected_applicant_id: string | null
  final_price: number | null
  contracted_at: string | null
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

export default function RequestManagePage() {
  const [request, setRequest] = useState<WorkRequest | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
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

    if (data.status !== 'open') {
      router.push(`/requests/${requestId}/status`)
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

  function handleAcceptApplicationClick(applicationId: string, applicantId: string, proposedPrice: number | null) {
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
          alert('チャットルーム作成に失敗しました')
          setProcessing(false)
          return
        }

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

      await supabase.from('messages').insert({
        chat_room_id: targetRoomId,
        sender_id: currentProfileId,
        content: '',
        request_card_id: requestId,
        deleted: false,
        created_at: new Date().toISOString()
      })

      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', targetRoomId)

      await supabase
        .from('work_requests')
        .update({
          status: 'contracted',
          selected_applicant_id: selectedApplicantId,
          final_price: parseInt(contractPrice),
          deadline: contractDeadline,
          contracted_at: new Date().toISOString()
        })
        .eq('id', requestId)

      await supabase
        .from('work_request_applications')
        .update({ status: 'accepted' })
        .eq('id', selectedApplicationId)

      await supabase
        .from('work_request_applications')
        .update({ status: 'rejected' })
        .eq('work_request_id', requestId)
        .neq('id', selectedApplicationId)

      await createNotification(
        selectedApplicantId,
        'accepted',
        '応募が採用されました',
        `「${request!.title}」の応募が採用されました。仮払いをお待ちください。`,
        `/requests/${requestId}`
      )

      alert('契約を確定しました！仮払いを行ってください。')
      setShowContractModal(false)
      router.push(`/requests/${requestId}/status`)

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

  async function handleCancelRequest() {
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
              {request.status === 'open' && applications.length === 0 && (
                <button onClick={handleCancelRequest} disabled={processing} className="app-manage-btn danger">
                  <i className="fas fa-times"></i>
                  キャンセル
                </button>
              )}
            </div>
            <div className="app-manage-badges">
              <span className="app-manage-badge status open">{getStatusLabel(request.status)}</span>
            </div>
          </div>

          {/* 応募一覧 */}
          {request.status === 'open' && (
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
              </div>

              {/* 応募リスト */}
              {applications.length === 0 ? (
                <div className="app-manage-empty">
                  <i className="fas fa-inbox"></i>
                  <p>まだ応募がありません</p>
                </div>
              ) : (
                <div className="app-manage-list">
                  {applications.map((app) => (
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
                      {app.status === 'pending' && (
                        <div className="app-manage-card-actions">
                          <button 
                            onClick={() => handleRejectApplication(app.id)} 
                            disabled={processing} 
                            className="app-manage-btn secondary"
                          >
                            却下
                          </button>
                          <button 
                            onClick={() => handleAcceptApplicationClick(app.id, app.applicant_id, app.proposed_price)} 
                            disabled={processing} 
                            className="app-manage-btn primary"
                          >
                            <i className="fas fa-check"></i>
                            採用する
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 募集中以外の状態 */}
          {request.status !== 'open' && (
            <div className="app-manage-closed">
              <p>現在のステータス: <strong>{getStatusLabel(request.status)}</strong></p>
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
                  min="0" 
                  required 
                  className="app-manage-modal-input"
                />
                <span className="app-manage-modal-unit">円</span>
              </div>
              {contractPrice && parseInt(contractPrice) > 0 && (
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