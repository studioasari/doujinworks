'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../../utils/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'
import { createNotification } from '../../../../../utils/notifications'

type Contract = {
  id: string
  work_request_id: string
  contractor_id: string
  application_id: string | null
  final_price: number
  deadline: string | null
  status: string
  contracted_at: string | null
  paid_at: string | null
  delivered_at: string | null
  completed_at: string | null
  payment_intent_id: string | null
  delivery_file_urls: string[] | null
  work_request: {
    id: string
    title: string
    description: string
    category: string
    requester_id: string
    requester: {
      id: string
      username: string | null
      display_name: string | null
      avatar_url: string | null
    }
  }
  contractor: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
}

type Delivery = {
  id: string
  message: string
  delivery_url: string | null
  created_at: string
  status: string
  feedback: string | null
}

export default function ContractDetailPage() {
  const [contract, setContract] = useState<Contract | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [isRequester, setIsRequester] = useState(false)
  const [isContractor, setIsContractor] = useState(false)
  
  // デバッグ用
  const [debugInfo, setDebugInfo] = useState<string>('')
  
  // 納品モーダル
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [deliveryMessage, setDeliveryMessage] = useState('')
  const [deliveryUrl, setDeliveryUrl] = useState('')

  // 検収モーダル
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [reviewFeedback, setReviewFeedback] = useState('')

  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string
  const contractId = params.contractId as string

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (contractId && currentProfileId) {
      fetchContract()
      fetchDeliveries()
      
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('payment') === 'success') {
        handlePaymentSuccessFallback()
        window.history.replaceState({}, '', `/requests/${requestId}/contracts/${contractId}`)
      }
    }
  }, [contractId, currentProfileId])

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

  async function fetchContract() {
    const { data, error } = await supabase
      .from('work_contracts')
      .select(`
        *,
        work_request:work_requests!work_contracts_work_request_id_fkey(
          id,
          title,
          description,
          category,
          requester_id,
          requester:profiles!work_requests_requester_id_fkey(id, username, display_name, avatar_url)
        ),
        contractor:profiles!work_contracts_contractor_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('id', contractId)
      .single()

    // RLSエラーの場合
    if (error) {
      setDebugInfo(`データ取得エラー: ${JSON.stringify(error)}`)
      setLoading(false)
      return
    }

    // データがない場合
    if (!data) {
      setDebugInfo('データが取得できませんでした（RLSで弾かれた可能性）')
      setLoading(false)
      return
    }

    const requesterId = (data.work_request as any)?.requester_id
    const contractorId = data.contractor_id

    const isReq = requesterId === currentProfileId
    const isCon = contractorId === currentProfileId

    // デバッグ情報をセット（リダイレクトせずに画面に表示）
    if (!isReq && !isCon) {
      setDebugInfo(`
        権限エラー:
        - requesterId: ${requesterId}
        - contractorId: ${contractorId}
        - currentProfileId: ${currentProfileId}
        - isRequester: ${isReq}
        - isContractor: ${isCon}
      `)
      setLoading(false)
      return
    }

    setIsRequester(isReq)
    setIsContractor(isCon)
    setContract(data as any)
    setLoading(false)
  }

  async function fetchDeliveries() {
    const { data, error } = await supabase
      .from('work_deliveries')
      .select('*')
      .eq('work_contract_id', contractId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('納品履歴取得エラー:', error)
    } else {
      setDeliveries(data || [])
    }
  }

  async function handlePayment() {
    if (!confirm('仮払いを実行しますか？\n※Stripeの決済ページに移動します。')) return

    setProcessing(true)

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '決済処理に失敗しました')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      console.error('仮払いエラー:', error)
      alert(error.message || '仮払いに失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  async function handlePaymentSuccessFallback() {
    try {
      const { data: currentContract } = await supabase
        .from('work_contracts')
        .select('status, paid_at')
        .eq('id', contractId)
        .single()

      if (currentContract?.status === 'paid' && currentContract?.paid_at) {
        alert('仮払いが完了しました！クリエイターが作業を開始できます。')
        await fetchContract()
        return
      }

      await supabase
        .from('work_contracts')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', contractId)
        .eq('status', 'contracted')

      if (contract?.contractor_id) {
        await createNotification(
          contract.contractor_id,
          'paid',
          '仮払いが完了しました',
          `「${(contract.work_request as any)?.title}」の仮払いが完了しました。作業を開始してください。`,
          `/requests/${requestId}/contracts/${contractId}`
        )
      }

      alert('仮払いが完了しました！クリエイターが作業を開始できます。')
      await fetchContract()
    } catch (error) {
      console.error('仮払い完了処理エラー:', error)
    }
  }

  async function handleSubmitDelivery(e: React.FormEvent) {
    e.preventDefault()

    if (!deliveryMessage.trim()) {
      alert('納品メッセージを入力してください')
      return
    }

    setProcessing(true)

    try {
      const { error: deliveryError } = await supabase
        .from('work_deliveries')
        .insert({
          work_request_id: contract!.work_request_id,
          work_contract_id: contractId,
          contractor_id: currentProfileId,
          message: deliveryMessage.trim(),
          delivery_url: deliveryUrl.trim() || null,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (deliveryError) throw new Error('納品の登録に失敗しました')

      await supabase
        .from('work_contracts')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', contractId)

      const requesterId = (contract?.work_request as any)?.requester_id
      if (requesterId) {
        await createNotification(
          requesterId,
          'delivered',
          '納品されました',
          `「${(contract?.work_request as any)?.title}」が納品されました。検収をお願いします。`,
          `/requests/${requestId}/contracts/${contractId}`
        )
      }

      alert('納品しました！検収をお待ちください。')
      setShowDeliveryModal(false)
      setDeliveryMessage('')
      setDeliveryUrl('')
      fetchContract()
      fetchDeliveries()
    } catch (error) {
      console.error('納品エラー:', error)
      alert('納品に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  function openReviewModal(deliveryId: string, action: 'approve' | 'reject') {
    setSelectedDeliveryId(deliveryId)
    setReviewAction(action)
    setReviewFeedback('')
    setShowReviewModal(true)
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedDeliveryId) return

    if (reviewAction === 'reject' && !reviewFeedback.trim()) {
      alert('差戻し理由を入力してください')
      return
    }

    setProcessing(true)

    try {
      await supabase
        .from('work_deliveries')
        .update({
          status: reviewAction === 'approve' ? 'approved' : 'rejected',
          feedback: reviewFeedback.trim() || null
        })
        .eq('id', selectedDeliveryId)

      if (reviewAction === 'approve') {
        await supabase
          .from('work_contracts')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', contractId)

        if (contract?.contractor_id) {
          await createNotification(
            contract.contractor_id,
            'completed',
            '検収が完了しました',
            `「${(contract.work_request as any)?.title}」の検収が完了しました。お疲れ様でした！`,
            `/requests/${requestId}/contracts/${contractId}`
          )
        }

        alert('検収が完了しました！')
      } else {
        await supabase
          .from('work_contracts')
          .update({ status: 'paid' })
          .eq('id', contractId)

        if (contract?.contractor_id) {
          await createNotification(
            contract.contractor_id,
            'review',
            '納品が差し戻されました',
            `「${(contract.work_request as any)?.title}」の納品が差し戻されました。`,
            `/requests/${requestId}/contracts/${contractId}`
          )
        }

        alert('納品を差し戻しました。')
      }

      setShowReviewModal(false)
      fetchContract()
      fetchDeliveries()
    } catch (error) {
      console.error('検収エラー:', error)
      alert('検収に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  function getStatusLabel(status: string) {
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
    return new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <Header />
        <div className="req-status-page">
          <div className="req-status-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <span>読み込み中...</span>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  // デバッグ情報がある場合は表示
  if (debugInfo) {
    return (
      <>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <Header />
        <div className="req-status-page">
          <div style={{ padding: '40px', background: '#fff', margin: '20px', borderRadius: '8px' }}>
            <h1 style={{ color: 'red' }}>デバッグ情報</h1>
            <pre style={{ background: '#f5f5f5', padding: '20px', whiteSpace: 'pre-wrap' }}>
              {debugInfo}
            </pre>
            <p style={{ marginTop: '20px' }}>
              <strong>contractId:</strong> {contractId}<br />
              <strong>requestId:</strong> {requestId}<br />
              <strong>currentProfileId:</strong> {currentProfileId}
            </p>
            <Link href={`/requests/${requestId}`} style={{ color: 'blue' }}>依頼詳細に戻る</Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!contract) {
    return (
      <>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <Header />
        <div className="req-status-page">
          <div className="req-status-error">
            <i className="fas fa-exclamation-circle"></i>
            <h1>契約が見つかりませんでした</h1>
            <Link href="/requests/manage" className="req-status-btn primary">依頼管理に戻る</Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const workRequest = contract.work_request as any
  const pendingDeliveries = deliveries.filter(d => d.status === 'pending')

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      <div className="req-status-page">
        <div className="req-status-container">
          {/* パンくず */}
          <div className="req-status-breadcrumb">
            <Link href="/requests">依頼一覧</Link>
            <span>/</span>
            <Link href={`/requests/${requestId}`}>{workRequest?.title}</Link>
            <span>/</span>
            <span>契約詳細</span>
          </div>

          {/* ヘッダー */}
          <div className="req-status-header">
            <h1 className="req-status-title">{workRequest?.title}</h1>
            <div className="req-status-badges">
              <span className={`req-status-badge ${contract.status}`}>{getStatusLabel(contract.status)}</span>
            </div>
          </div>

          {/* 進捗タイムライン */}
          <div className="req-status-timeline">
            <h2 className="req-status-timeline-title">進捗状況</h2>
            <div className="req-status-timeline-list">
              <div className="req-status-timeline-item">
                <div className="req-status-timeline-icon done"><i className="fas fa-check"></i></div>
                <div className="req-status-timeline-content">
                  <div className="req-status-timeline-label">契約確定</div>
                  {contract.contracted_at && <div className="req-status-timeline-date">{formatDate(contract.contracted_at)}</div>}
                </div>
              </div>
              <div className="req-status-timeline-item">
                <div className={`req-status-timeline-icon ${contract.paid_at ? 'done' : 'pending'}`}>
                  {contract.paid_at ? <i className="fas fa-check"></i> : <div className="dot"></div>}
                </div>
                <div className="req-status-timeline-content">
                  <div className={`req-status-timeline-label ${!contract.paid_at ? 'inactive' : ''}`}>仮払い完了</div>
                  {contract.paid_at && <div className="req-status-timeline-date">{formatDate(contract.paid_at)}</div>}
                </div>
              </div>
              <div className="req-status-timeline-item">
                <div className={`req-status-timeline-icon ${contract.delivered_at ? 'done' : contract.status === 'paid' ? 'active' : 'pending'}`}>
                  {contract.delivered_at ? <i className="fas fa-check"></i> : contract.status === 'paid' ? <i className="fas fa-spinner fa-spin"></i> : <div className="dot"></div>}
                </div>
                <div className="req-status-timeline-content">
                  <div className={`req-status-timeline-label ${contract.status !== 'paid' && !contract.delivered_at ? 'inactive' : ''}`}>作業中</div>
                </div>
              </div>
              <div className="req-status-timeline-item">
                <div className={`req-status-timeline-icon ${contract.completed_at ? 'done' : contract.status === 'delivered' ? 'active' : 'pending'}`}>
                  {contract.completed_at ? <i className="fas fa-check"></i> : contract.status === 'delivered' ? <i className="fas fa-hourglass-half"></i> : <div className="dot"></div>}
                </div>
                <div className="req-status-timeline-content">
                  <div className={`req-status-timeline-label ${contract.status !== 'delivered' && !contract.completed_at ? 'inactive' : ''}`}>納品・検収</div>
                  {contract.delivered_at && <div className="req-status-timeline-date">{formatDate(contract.delivered_at)}</div>}
                </div>
              </div>
              <div className="req-status-timeline-item">
                <div className={`req-status-timeline-icon ${contract.completed_at ? 'done' : 'pending'}`}>
                  {contract.completed_at ? <i className="fas fa-check"></i> : <div className="dot"></div>}
                </div>
                <div className="req-status-timeline-content">
                  <div className={`req-status-timeline-label ${!contract.completed_at ? 'inactive' : ''}`}>完了</div>
                  {contract.completed_at && <div className="req-status-timeline-date">{formatDate(contract.completed_at)}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* 契約情報カード */}
          <div className="req-status-info-card">
            <h2 className="req-status-info-title">契約情報</h2>
            <div className="req-status-info-grid">
              <div className="req-status-info-row">
                <span className="req-status-info-label">契約金額</span>
                <span className="req-status-info-value">{contract.final_price?.toLocaleString()}円</span>
              </div>
              {contract.deadline && (
                <div className="req-status-info-row">
                  <span className="req-status-info-label">納期</span>
                  <span className="req-status-info-value">{formatDate(contract.deadline)}</span>
                </div>
              )}
            </div>
            <hr className="req-status-info-divider" />
            <h3 className="req-status-info-subtitle">{isRequester ? 'クリエイター' : '依頼者'}</h3>
            <div className="req-status-user-card">
              <div className="req-status-user-avatar">
                {(() => {
                  const profile = isRequester ? contract.contractor : workRequest?.requester
                  return profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{profile?.display_name?.charAt(0) || '?'}</span>
                })()}
              </div>
              <div>
                {(() => {
                  const profile = isRequester ? contract.contractor : workRequest?.requester
                  return profile?.username 
                    ? <Link href={`/creators/${profile.username}`} className="req-status-user-name">{profile.display_name || '名前未設定'}</Link>
                    : <div className="req-status-user-name">{profile?.display_name || '名前未設定'}</div>
                })()}
              </div>
            </div>
          </div>

          {/* 仮払い待ち - 依頼者 */}
          {contract.status === 'contracted' && isRequester && (
            <div className="req-status-action-card warning">
              <h3 className="req-status-action-title"><i className="fas fa-credit-card warning"></i>次のステップ: 仮払い</h3>
              <p className="req-status-action-text">仮払いを行うと、クリエイターが作業を開始できます。</p>
              <div className="req-status-action-buttons">
                <button onClick={handlePayment} disabled={processing} className="req-status-btn primary">
                  {processing ? '処理中...' : '仮払いする'}
                </button>
              </div>
            </div>
          )}

          {/* 仮払い待ち - クリエイター */}
          {contract.status === 'contracted' && isContractor && (
            <div className="req-status-action-card info center">
              <i className="fas fa-clock req-status-action-icon-large warning"></i>
              <h3 className="req-status-action-title" style={{ justifyContent: 'center' }}>仮払い待ち</h3>
              <p className="req-status-action-text">依頼者が仮払いを完了すると、作業を開始できます。</p>
            </div>
          )}

          {/* 作業中 - クリエイター */}
          {contract.status === 'paid' && isContractor && (
            <div className="req-status-action-card info">
              <h3 className="req-status-action-title"><i className="fas fa-upload info"></i>納品する</h3>
              <p className="req-status-action-text">作業が完了したら、成果物を納品してください。</p>
              <div className="req-status-action-buttons">
                <button onClick={() => setShowDeliveryModal(true)} className="req-status-btn primary">納品する</button>
              </div>
            </div>
          )}

          {/* 作業中 - 依頼者 */}
          {contract.status === 'paid' && isRequester && (
            <div className="req-status-action-card info center">
              <i className="fas fa-spinner fa-pulse req-status-action-icon-large"></i>
              <h3 className="req-status-action-title" style={{ justifyContent: 'center' }}>作業中</h3>
              <p className="req-status-action-text">クリエイターが作業を進めています。納品をお待ちください。</p>
            </div>
          )}

          {/* 検収待ち - 依頼者 */}
          {contract.status === 'delivered' && isRequester && pendingDeliveries.length > 0 && (
            <div className="req-status-action-card info">
              <h3 className="req-status-action-title"><i className="fas fa-check-circle info"></i>検収をお願いします</h3>
              <p className="req-status-action-text">クリエイターから納品物が提出されました。下記の納品履歴から検収を行ってください。</p>
            </div>
          )}

          {/* 検収待ち - クリエイター */}
          {contract.status === 'delivered' && isContractor && (
            <div className="req-status-action-card info center">
              <i className="fas fa-hourglass-half req-status-action-icon-large warning"></i>
              <h3 className="req-status-action-title" style={{ justifyContent: 'center' }}>検収待ち</h3>
              <p className="req-status-action-text">依頼者が検収を行っています。しばらくお待ちください。</p>
            </div>
          )}

          {/* 完了 */}
          {contract.status === 'completed' && (
            <div className="req-status-action-card success center">
              <i className="fas fa-check-circle req-status-action-icon-large success"></i>
              <h3 className="req-status-action-title" style={{ justifyContent: 'center' }}>完了</h3>
              <p className="req-status-action-text">お疲れ様でした！取引が完了しました。</p>
            </div>
          )}

          {/* 納品履歴 */}
          {deliveries.length > 0 && (
            <div className="req-status-deliveries">
              <h2 className="req-status-deliveries-title">納品履歴 ({deliveries.length}件)</h2>
              <div className="req-status-deliveries-list">
                {deliveries.map((delivery) => (
                  <div key={delivery.id} className={`req-status-delivery-card ${delivery.status === 'approved' ? 'approved' : ''}`}>
                    <div className="req-status-delivery-header">
                      <div className="req-status-delivery-date">{formatDateTime(delivery.created_at)}</div>
                      <span className={`req-status-delivery-badge ${delivery.status}`}>
                        {delivery.status === 'pending' && '検収待ち'}
                        {delivery.status === 'approved' && '承認済み'}
                        {delivery.status === 'rejected' && '差戻し'}
                      </span>
                    </div>
                    <p className="req-status-delivery-message">{delivery.message}</p>
                    {delivery.delivery_url && (
                      <a href={delivery.delivery_url} target="_blank" rel="noopener noreferrer" className="req-status-delivery-url">
                        <i className="fas fa-external-link-alt"></i>納品物を確認
                      </a>
                    )}
                    {delivery.feedback && (
                      <div className={`req-status-delivery-feedback ${delivery.status === 'rejected' ? 'rejected' : ''}`}>
                        <div className="req-status-delivery-feedback-label"><i className="fas fa-comment"></i>フィードバック</div>
                        <p className="req-status-delivery-feedback-text">{delivery.feedback}</p>
                      </div>
                    )}
                    {isRequester && delivery.status === 'pending' && (
                      <div className="req-status-delivery-actions">
                        <button onClick={() => openReviewModal(delivery.id, 'reject')} disabled={processing} className="req-status-btn secondary flex-1">差し戻す</button>
                        <button onClick={() => openReviewModal(delivery.id, 'approve')} disabled={processing} className="req-status-btn primary flex-1">承認して完了</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 納品モーダル */}
      {showDeliveryModal && (
        <div className="req-status-modal-overlay" onClick={() => setShowDeliveryModal(false)}>
          <div className="req-status-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="req-status-modal-title">納品する</h2>
            <form onSubmit={handleSubmitDelivery}>
              <div className="req-status-modal-group">
                <label className="req-status-modal-label">納品物のURL</label>
                <input type="url" value={deliveryUrl} onChange={(e) => setDeliveryUrl(e.target.value)} placeholder="https://..." className="req-status-modal-input" />
                <div className="req-status-modal-hint">ギガファイル便、Google Driveなどの共有URLを入力</div>
              </div>
              <div className="req-status-modal-group">
                <label className="req-status-modal-label">納品メッセージ <span className="req-status-required">*</span></label>
                <textarea value={deliveryMessage} onChange={(e) => setDeliveryMessage(e.target.value)} placeholder="納品物の説明を記入してください" required rows={5} className="req-status-modal-textarea" />
              </div>
              <div className="req-status-modal-buttons">
                <button type="button" onClick={() => setShowDeliveryModal(false)} disabled={processing} className="req-status-btn secondary">キャンセル</button>
                <button type="submit" disabled={processing} className="req-status-btn primary">{processing ? '送信中...' : '納品する'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 検収モーダル */}
      {showReviewModal && (
        <div className="req-status-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="req-status-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="req-status-modal-title">{reviewAction === 'approve' ? '納品を承認' : '納品を差し戻す'}</h2>
            <form onSubmit={handleSubmitReview}>
              <div className="req-status-modal-group">
                <label className="req-status-modal-label">フィードバック {reviewAction === 'reject' && <span className="req-status-required">*</span>}</label>
                <textarea value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} placeholder={reviewAction === 'approve' ? '任意' : '修正が必要な点を記入してください'} required={reviewAction === 'reject'} rows={5} className="req-status-modal-textarea" />
              </div>
              <div className="req-status-modal-buttons">
                <button type="button" onClick={() => setShowReviewModal(false)} disabled={processing} className="req-status-btn secondary">キャンセル</button>
                <button type="submit" disabled={processing} className="req-status-btn primary">{processing ? '処理中...' : reviewAction === 'approve' ? '承認する' : '差し戻す'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />

      <style jsx>{`
        .req-status-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          font-size: 14px;
          color: #888888;
        }
        .req-status-breadcrumb a {
          color: #5B7C99;
          text-decoration: none;
        }
        .req-status-breadcrumb a:hover {
          text-decoration: underline;
        }
      `}</style>
    </>
  )
}