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
  
  // 契約確定モーダル
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

    // 依頼者本人かチェック
    if (data.requester_id !== currentProfileId) {
      alert('この依頼を管理する権限がありません')
      router.push(`/requests/${requestId}`)
      return
    }

    // 契約後はstatusページにリダイレクト
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
      // チャットルームを作成
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

      // メッセージで依頼カードを送信
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

      // 依頼を更新
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

      // 応募ステータスを更新
      await supabase
        .from('work_request_applications')
        .update({ status: 'accepted' })
        .eq('id', selectedApplicationId)

      await supabase
        .from('work_request_applications')
        .update({ status: 'rejected' })
        .eq('work_request_id', requestId)
        .neq('id', selectedApplicationId)

      // 通知
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
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
          <div className="loading-state">読み込み中...</div>
        </div>
        <Footer />
      </>
    )
  }

  if (!request) {
    return (
      <>
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
          <div className="container-narrow">
            <div className="empty-state">
              <p className="text-gray mb-24">依頼が見つかりませんでした</p>
              <Link href="/requests/manage" className="btn-primary">依頼管理に戻る</Link>
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

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow" style={{ padding: '32px 20px' }}>
          {/* ヘッダー */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1A1A1A', flex: 1 }}>
                {request.title}
              </h1>
              
              {/* キャンセルボタン（募集中のみ） */}
              {request.status === 'open' && applications.length === 0 && (
                <button onClick={handleCancelRequest} disabled={processing} className="btn-danger">
                  依頼をキャンセル
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span className="badge" style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>
                {getStatusLabel(request.status)}
              </span>
            </div>
          </div>

          {/* 応募一覧 */}
          {request.status === 'open' && (
            <>
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1A1A1A' }}>
                  応募一覧 ({applications.length}件)
                </h2>

                {/* 統計 */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                  marginBottom: '24px'
                }}>
                  <div style={{ padding: '16px', backgroundColor: '#F9F9F9', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '4px' }}>未対応</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A' }}>{pendingApplications.length}</div>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#F9F9F9', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '4px' }}>採用済み</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A' }}>{acceptedApplications.length}</div>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#F9F9F9', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '4px' }}>却下済み</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A' }}>{rejectedApplications.length}</div>
                  </div>
                </div>

                {/* 応募リスト */}
                {applications.length === 0 ? (
                  <div style={{ 
                    padding: '40px', 
                    textAlign: 'center', 
                    backgroundColor: '#F9F9F9', 
                    borderRadius: '8px',
                    border: '1px dashed #E5E5E5'
                  }}>
                    <i className="fas fa-inbox" style={{ fontSize: '48px', color: '#D0D0D0', marginBottom: '16px' }}></i>
                    <p style={{ fontSize: '14px', color: '#6B6B6B' }}>まだ応募がありません</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {applications.map((app) => (
                      <div 
                        key={app.id} 
                        style={{ 
                          padding: '20px', 
                          border: '1px solid #E5E5E5', 
                          borderRadius: '8px', 
                          backgroundColor: app.status === 'accepted' ? '#F9F9F9' : '#FFFFFF' 
                        }}
                      >
                        {/* ヘッダー */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: '#E5E5E5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              flexShrink: 0,
                              fontSize: '16px',
                              color: '#6B6B6B'
                            }}>
                              {app.profiles?.avatar_url ? (
                                <img 
                                  src={app.profiles.avatar_url} 
                                  alt={app.profiles.display_name || ''} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                              ) : (
                                app.profiles?.display_name?.charAt(0) || '?'
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              {app.profiles?.username ? (
                                <Link 
                                  href={`/creators/${app.profiles.username}`}
                                  style={{ 
                                    textDecoration: 'none', 
                                    fontSize: '15px', 
                                    fontWeight: '700', 
                                    color: '#1A1A1A',
                                    display: 'block',
                                    marginBottom: '2px'
                                  }}
                                >
                                  {app.profiles.display_name || '名前未設定'}
                                </Link>
                              ) : (
                                <div style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A', marginBottom: '2px' }}>
                                  {app.profiles?.display_name || '名前未設定'}
                                </div>
                              )}
                              <div style={{ fontSize: '12px', color: '#6B6B6B' }}>
                                {formatDate(app.created_at)}
                              </div>
                            </div>
                          </div>
                          
                          {/* ステータスバッジ */}
                          {app.status === 'accepted' && (
                            <span style={{ 
                              padding: '4px 12px', 
                              borderRadius: '4px', 
                              fontSize: '12px', 
                              fontWeight: '600', 
                              backgroundColor: '#1A1A1A', 
                              color: '#FFFFFF',
                              flexShrink: 0
                            }}>
                              採用済み
                            </span>
                          )}
                          {app.status === 'rejected' && (
                            <span style={{ 
                              padding: '4px 12px', 
                              borderRadius: '4px', 
                              fontSize: '12px', 
                              fontWeight: '600', 
                              backgroundColor: '#CCCCCC', 
                              color: '#6B6B6B',
                              flexShrink: 0
                            }}>
                              却下済み
                            </span>
                          )}
                        </div>

                        {/* メッセージ */}
                        <p style={{ 
                          fontSize: '14px', 
                          lineHeight: '1.7', 
                          whiteSpace: 'pre-wrap', 
                          marginBottom: '12px',
                          color: '#1A1A1A'
                        }}>
                          {app.message}
                        </p>

                        {/* 希望金額 */}
                        {app.proposed_price && (
                          <div style={{ fontSize: '14px', marginBottom: '16px', color: '#1A1A1A' }}>
                            <strong>希望金額:</strong> {app.proposed_price.toLocaleString()}円
                          </div>
                        )}

                        {/* アクションボタン */}
                        {app.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => handleRejectApplication(app.id)} 
                              disabled={processing} 
                              className="btn-secondary"
                              style={{ fontSize: '14px', padding: '8px 16px', minWidth: '100px' }}
                            >
                              却下
                            </button>
                            <button 
                              onClick={() => handleAcceptApplicationClick(app.id, app.applicant_id, app.proposed_price)} 
                              disabled={processing} 
                              className="btn-primary"
                              style={{ fontSize: '14px', padding: '8px 16px', minWidth: '100px' }}
                            >
                              採用する
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* キャンセルボタン */}
            </>
          )}

          {/* 募集中以外の状態 */}
          {request.status !== 'open' && (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              backgroundColor: '#F9F9F9', 
              borderRadius: '8px'
            }}>
              <p style={{ fontSize: '14px', color: '#6B6B6B', marginBottom: '16px' }}>
                現在のステータス: <strong>{getStatusLabel(request.status)}</strong>
              </p>
              <Link href={`/requests/${requestId}`} className="btn-primary">
                依頼詳細を見る
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 契約確定モーダル */}
      {showContractModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000, 
            padding: '20px' 
          }} 
          onClick={() => setShowContractModal(false)}
        >
          <div 
            style={{ 
              backgroundColor: '#FFFFFF', 
              borderRadius: '12px', 
              maxWidth: '500px', 
              width: '100%', 
              padding: '32px' 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>契約を確定</h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                marginBottom: '8px',
                color: '#1A1A1A'
              }}>
                確定金額 <span style={{ color: '#D32F2F' }}>*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="number" 
                  value={contractPrice} 
                  onChange={(e) => setContractPrice(e.target.value)} 
                  placeholder="金額を入力" 
                  min="0" 
                  required 
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <span style={{ fontSize: '14px', color: '#6B6B6B' }}>円</span>
              </div>
              {contractPrice && parseInt(contractPrice) > 0 && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#F9F9F9', borderRadius: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#6B6B6B' }}>
                    <span>依頼者支払額</span>
                    <span>{parseInt(contractPrice).toLocaleString()}円</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#6B6B6B' }}>
                    <span>プラットフォーム手数料（12%）</span>
                    <span>-{Math.floor(parseInt(contractPrice) * 0.12).toLocaleString()}円</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#6B6B6B' }}>
                    <span>振込手数料</span>
                    <span>-330円</span>
                  </div>
                  <div style={{ borderTop: '1px solid #E5E5E5', marginTop: '6px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: '#1A1A1A' }}>
                    <span>クリエイター実受取額</span>
                    <span>{Math.floor(parseInt(contractPrice) * 0.88) - 330 >= 0 ? (Math.floor(parseInt(contractPrice) * 0.88) - 330).toLocaleString() : 0}円</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#6B6B6B' }}>
                    ※1,000円未満の場合は翌月に繰越されます
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                marginBottom: '8px',
                color: '#1A1A1A'
              }}>
                納期 <span style={{ color: '#D32F2F' }}>*</span>
              </label>
              <input 
                type="date" 
                value={contractDeadline} 
                onChange={(e) => setContractDeadline(e.target.value)} 
                min={new Date().toISOString().split('T')[0]} 
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ padding: '12px', backgroundColor: '#F9F9F9', borderRadius: '6px', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6', color: '#4A4A4A' }}>
              <i className="fas fa-info-circle" style={{ marginRight: '8px', color: '#6B6B6B' }}></i>
              契約確定後、仮払いを行うとクリエイターが作業を開始できます。
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowContractModal(false)} 
                className="btn-secondary" 
                style={{ flex: 1 }}
              >
                キャンセル
              </button>
              <button 
                onClick={handleConfirmContract} 
                disabled={processing} 
                className="btn-primary" 
                style={{ flex: 1 }}
              >
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