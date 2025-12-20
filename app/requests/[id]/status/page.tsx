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
  final_price: number | null
  deadline: string | null
  category: string
  status: string
  created_at: string
  requester_id: string
  selected_applicant_id: string | null
  contracted_at: string | null
  paid_at: string | null
  delivered_at: string | null
  completed_at: string | null
  delivery_file_urls: string[] | null
  requester: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
  contractor: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

type Delivery = {
  id: string
  message: string
  delivery_url: string | null
  created_at: string
  status: string
  feedback: string | null
}

type CancellationRequest = {
  id: string
  work_request_id: string
  requester_id: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  resolved_at: string | null
  requester: {
    id: string
    display_name: string | null
  }
}

export default function RequestStatusPage() {
  const [request, setRequest] = useState<WorkRequest | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [isRequester, setIsRequester] = useState(false)
  const [isContractor, setIsContractor] = useState(false)
  
  // 納品モーダル
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [deliveryMessage, setDeliveryMessage] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'file' | 'url'>('file')
  const [deliveryUrl, setDeliveryUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // 検収モーダル
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [reviewFeedback, setReviewFeedback] = useState('')

  // キャンセルモーダル
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelType, setCancelType] = useState<'free' | 'overdue'>('free')

  // キャンセル申請
  const [cancellationRequest, setCancellationRequest] = useState<CancellationRequest | null>(null)
  const [showCancellationResponseModal, setShowCancellationResponseModal] = useState(false)
  const [cancellationResponseAction, setCancellationResponseAction] = useState<'approve' | 'reject'>('approve')

  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (requestId && currentProfileId && request) {
      fetchCancellationRequest()
    }
  }, [requestId, currentProfileId, request?.status])

  useEffect(() => {
    if (requestId && currentProfileId) {
      fetchRequest()
      fetchDeliveries()
      
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('payment') === 'success') {
        alert('仮払いが完了しました！クリエイターが作業を開始できます。')
        window.history.replaceState({}, '', `/requests/${requestId}/status`)
      }
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
      .select(`
        *,
        requester:profiles!work_requests_requester_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('id', requestId)
      .single()

    if (error) {
      console.error('依頼取得エラー:', error)
      return
    }

    let contractorData = null
    if (data.selected_applicant_id) {
      const { data: contractor } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', data.selected_applicant_id)
        .single()
      
      contractorData = contractor
    }

    const fullData = {
      ...data,
      contractor: contractorData
    }

    const isReq = data.requester_id === currentProfileId
    const isCon = data.selected_applicant_id === currentProfileId

    if (!isReq && !isCon) {
      alert('このページを閲覧する権限がありません')
      router.push(`/requests/${requestId}`)
      return
    }

    if (data.status === 'open') {
      if (isReq) {
        router.push(`/requests/${requestId}/manage`)
      } else {
        router.push(`/requests/${requestId}`)
      }
      return
    }

    setIsRequester(isReq)
    setIsContractor(isCon)
    setRequest(fullData)
    setLoading(false)
  }

  async function fetchDeliveries() {
    const { data, error } = await supabase
      .from('work_deliveries')
      .select('*')
      .eq('work_request_id', requestId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('納品履歴取得エラー:', error)
    } else {
      setDeliveries(data || [])
    }
  }

  async function fetchCancellationRequest() {
    if (request?.status === 'cancelled') {
      setCancellationRequest(null)
      return
    }

    const { data, error } = await supabase
      .from('cancellation_requests')
      .select(`
        *,
        requester:profiles!cancellation_requests_requester_id_fkey(id, display_name)
      `)
      .eq('work_request_id', requestId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('キャンセル申請取得エラー:', error)
    } else if (data) {
      setCancellationRequest(data as any)
    } else {
      setCancellationRequest(null)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // 1GB制限チェック
    const maxSize = 1024 * 1024 * 1024 // 1GB
    if (file.size > maxSize) {
      alert('ファイルサイズは1GB以下にしてください。\n1GBを超える場合は、ギガファイル便などの外部サービスをご利用ください。')
      e.target.value = ''
      return
    }

    setSelectedFile(file)
  }

  async function uploadFileToR2(file: File): Promise<string> {
    try {
      // 署名付きURL取得
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          workRequestId: requestId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'アップロードURL取得に失敗しました')
      }

      const { uploadUrl, fileUrl } = await response.json()

      // R2にアップロード
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        }
      })

      if (!uploadResponse.ok) {
        throw new Error('ファイルのアップロードに失敗しました')
      }

      return fileUrl

    } catch (error) {
      console.error('R2アップロードエラー:', error)
      throw error
    }
  }

  async function handleSubmitDelivery(e: React.FormEvent) {
    e.preventDefault()

    if (!deliveryMessage.trim()) {
      alert('納品メッセージを入力してください')
      return
    }

    // ファイルまたはURL必須
    if (deliveryMethod === 'file' && !selectedFile) {
      alert('ファイルを選択してください')
      return
    }

    if (deliveryMethod === 'url' && !deliveryUrl.trim()) {
      alert('URLを入力してください')
      return
    }

    // URL検証
    if (deliveryMethod === 'url') {
      try {
        new URL(deliveryUrl.trim())
      } catch {
        alert('有効なURLを入力してください（例: https://example.com）')
        return
      }
    }

    if (deliveryMessage.length > 2000) {
      alert('メッセージは2000文字以内で入力してください')
      return
    }

    setProcessing(true)
    setUploadProgress(0)

    try {
      let fileUrl = null

      // ファイルアップロード
      if (deliveryMethod === 'file' && selectedFile) {
        setUploadProgress(10)
        fileUrl = await uploadFileToR2(selectedFile)
        setUploadProgress(80)
      }

      // 納品レコード作成
      const { error: deliveryError } = await supabase
        .from('work_deliveries')
        .insert({
          work_request_id: requestId,
          contractor_id: currentProfileId,
          message: deliveryMessage.trim(),
          delivery_url: deliveryMethod === 'url' ? deliveryUrl.trim() : null,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (deliveryError) {
        console.error('納品エラー:', deliveryError)
        throw new Error('納品の登録に失敗しました')
      }

      setUploadProgress(90)

      // work_requests更新
      await supabase
        .from('work_requests')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          delivery_file_urls: fileUrl ? [fileUrl] : null
        })
        .eq('id', requestId)

      setUploadProgress(95)

      if (request) {
        await createNotification(
          request.requester_id,
          'delivered',
          '納品されました',
          `「${request.title}」が納品されました。検収をお願いします。`,
          `/requests/${requestId}/status`
        )
      }

      setUploadProgress(100)

      alert('納品しました！検収をお待ちください。')
      setShowDeliveryModal(false)
      setDeliveryMessage('')
      setDeliveryUrl('')
      setSelectedFile(null)
      setUploadProgress(0)
      fetchRequest()
      fetchDeliveries()

    } catch (error) {
      console.error('納品エラー:', error)
      alert(error instanceof Error ? error.message : '納品に失敗しました')
      setUploadProgress(0)
    } finally {
      setProcessing(false)
    }
  }

  async function handlePayment() {
    if (!confirm('仮払いを実行しますか？\n※Stripeの決済ページに移動します。')) return

    setProcessing(true)

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: requestId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '決済処理に失敗しました')
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('決済URLの取得に失敗しました')
      }
    } catch (error: any) {
      console.error('仮払いエラー:', error)
      alert(error.message || '仮払いに失敗しました')
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
      const { error: updateError } = await supabase
        .from('work_deliveries')
        .update({
          status: reviewAction === 'approve' ? 'approved' : 'rejected',
          feedback: reviewFeedback.trim() || null
        })
        .eq('id', selectedDeliveryId)

      if (updateError) {
        throw new Error('検収処理に失敗しました')
      }

      if (reviewAction === 'approve') {
        await supabase
          .from('work_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', requestId)

        if (request?.selected_applicant_id) {
          await createNotification(
            request.selected_applicant_id,
            'completed',
            '検収が完了しました',
            `「${request.title}」の検収が完了しました。お疲れ様でした！`,
            `/requests/${requestId}/status`
          )
        }

        alert('検収が完了しました！お疲れ様でした。')
      } else {
        await supabase
          .from('work_requests')
          .update({
            status: 'paid'
          })
          .eq('id', requestId)

        if (request?.selected_applicant_id) {
          await createNotification(
            request.selected_applicant_id,
            'review',
            '納品が差し戻されました',
            `「${request.title}」の納品が差し戻されました。フィードバックを確認してください。`,
            `/requests/${requestId}/status`
          )
        }

        alert('納品を差し戻しました。')
      }

      setShowReviewModal(false)
      fetchRequest()
      fetchDeliveries()

    } catch (error) {
      console.error('検収エラー:', error)
      alert(error instanceof Error ? error.message : '検収に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  function openCancelModal(type: 'free' | 'overdue') {
    setCancelType(type)
    setCancelReason('')
    setShowCancelModal(true)
  }

  async function handleSubmitCancel(e: React.FormEvent) {
    e.preventDefault()

    if (!cancelReason.trim()) {
      alert('キャンセル理由を入力してください')
      return
    }

    setProcessing(true)

    try {
      const { error: cancelError } = await supabase
        .from('cancellation_requests')
        .insert({
          work_request_id: requestId,
          requester_id: currentProfileId,
          reason: cancelReason.trim(),
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (cancelError) {
        console.error('キャンセル申請エラー:', cancelError)
        throw new Error('キャンセル申請に失敗しました')
      }

      const recipientId = isRequester ? request?.selected_applicant_id : request?.requester_id
      if (recipientId && request) {
        const notificationMessage = cancelType === 'free' 
          ? `「${request.title}」についてキャンセル申請がありました。7日以内に同意または拒否してください。応答がない場合は自動的にキャンセルされます。`
          : `「${request.title}」について納期超過によるキャンセル申請がありました。`
        
        await createNotification(
          recipientId,
          'cancellation_request',
          'キャンセル申請がありました',
          notificationMessage,
          `/requests/${requestId}/status`
        )
      }

      const successMessage = cancelType === 'free'
        ? 'キャンセル申請を送信しました。相手が7日以内に応答しない場合、自動的にキャンセルされます。'
        : 'キャンセル申請を送信しました。運営が確認し、対応いたします。'

      alert(successMessage)
      setShowCancelModal(false)
      setCancelReason('')
      fetchRequest()

    } catch (error) {
      console.error('キャンセル申請エラー:', error)
      alert(error instanceof Error ? error.message : 'キャンセル申請に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  function isOverdue(): boolean {
    if (!request?.deadline) return false
    const deadline = new Date(request.deadline)
    const sevenDaysAfter = new Date(deadline)
    sevenDaysAfter.setDate(sevenDaysAfter.getDate() + 7)
    return new Date() > sevenDaysAfter
  }

  function openCancellationResponseModal(action: 'approve' | 'reject') {
    setCancellationResponseAction(action)
    setShowCancellationResponseModal(true)
  }

  async function handleCancellationResponse(e: React.FormEvent) {
    e.preventDefault()

    if (!cancellationRequest) return

    const isApproval = cancellationResponseAction === 'approve'

    if (!confirm(
      isApproval 
        ? 'キャンセル申請に同意しますか？\n※契約が解除され、仮払い済みの場合は返金されます。'
        : 'キャンセル申請を拒否しますか？'
    )) return

    setProcessing(true)

    try {
      const { error: updateError } = await supabase
        .from('cancellation_requests')
        .update({
          status: isApproval ? 'approved' : 'rejected',
          resolved_at: new Date().toISOString()
        })
        .eq('id', cancellationRequest.id)

      if (updateError) {
        throw new Error('応答処理に失敗しました')
      }

      if (isApproval) {
        await supabase
          .from('work_requests')
          .update({
            status: 'cancelled'
          })
          .eq('id', requestId)

        await createNotification(
          cancellationRequest.requester_id,
          'cancelled',
          'キャンセルが承認されました',
          `「${request?.title}」のキャンセル申請が承認されました。契約が解除されました。`,
          `/requests/${requestId}/status`
        )

        alert('キャンセル申請を承認しました。契約が解除されました。')
        router.push('/requests/manage')
      } else {
        await createNotification(
          cancellationRequest.requester_id,
          'cancelled',
          'キャンセル申請が拒否されました',
          `「${request?.title}」のキャンセル申請が拒否されました。`,
          `/requests/${requestId}/status`
        )

        alert('キャンセル申請を拒否しました。')
      }

      setShowCancellationResponseModal(false)
      await fetchRequest()
      await fetchCancellationRequest()

    } catch (error) {
      console.error('応答処理エラー:', error)
      alert(error instanceof Error ? error.message : '応答処理に失敗しました')
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
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
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

  const pendingDeliveries = deliveries.filter(d => d.status === 'pending')
  const approvedDeliveries = deliveries.filter(d => d.status === 'approved')
  const rejectedDeliveries = deliveries.filter(d => d.status === 'rejected')

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow" style={{ padding: '32px 20px' }}>
          {/* ヘッダー */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>
              {request.title}
            </h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span className="badge" style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>
                {getStatusLabel(request.status)}
              </span>
            </div>
          </div>

          {/* 進捗タイムライン */}
          <div style={{ 
            marginBottom: '28px',
            padding: '20px',
            backgroundColor: '#F9F9F9',
            borderRadius: '8px'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#1A1A1A' }}>
              進捗状況
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 契約確定 */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: '#1A1A1A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <i className="fas fa-check" style={{ fontSize: '12px', color: '#FFFFFF' }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A' }}>契約確定</div>
                  {request.contracted_at && (
                    <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '2px' }}>
                      {formatDate(request.contracted_at)}
                    </div>
                  )}
                </div>
              </div>

              {/* 仮払い */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: request.paid_at ? '#1A1A1A' : '#E5E5E5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {request.paid_at ? (
                    <i className="fas fa-check" style={{ fontSize: '12px', color: '#FFFFFF' }}></i>
                  ) : (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9E9E9E' }}></div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: request.paid_at ? '#1A1A1A' : '#9E9E9E' }}>
                    仮払い完了
                  </div>
                  {request.paid_at && (
                    <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '2px' }}>
                      {formatDate(request.paid_at)}
                    </div>
                  )}
                </div>
              </div>

              {/* 作業中 */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: request.status === 'paid' ? '#1A73E8' : request.delivered_at ? '#1A1A1A' : '#E5E5E5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {request.delivered_at ? (
                    <i className="fas fa-check" style={{ fontSize: '12px', color: '#FFFFFF' }}></i>
                  ) : request.status === 'paid' ? (
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '12px', color: '#FFFFFF' }}></i>
                  ) : (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9E9E9E' }}></div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: request.status === 'paid' || request.delivered_at ? '#1A1A1A' : '#9E9E9E' }}>
                    作業中
                  </div>
                </div>
              </div>

              {/* 納品 */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: request.status === 'delivered' ? '#9C27B0' : request.completed_at ? '#1A1A1A' : '#E5E5E5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {request.completed_at ? (
                    <i className="fas fa-check" style={{ fontSize: '12px', color: '#FFFFFF' }}></i>
                  ) : request.status === 'delivered' ? (
                    <i className="fas fa-hourglass-half" style={{ fontSize: '12px', color: '#FFFFFF' }}></i>
                  ) : (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9E9E9E' }}></div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: request.status === 'delivered' || request.completed_at ? '#1A1A1A' : '#9E9E9E' }}>
                    納品・検収待ち
                  </div>
                  {request.delivered_at && (
                    <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '2px' }}>
                      {formatDate(request.delivered_at)}
                    </div>
                  )}
                </div>
              </div>

              {/* 完了 */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: request.completed_at ? '#4CAF50' : '#E5E5E5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {request.completed_at ? (
                    <i className="fas fa-check" style={{ fontSize: '12px', color: '#FFFFFF' }}></i>
                  ) : (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9E9E9E' }}></div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: request.completed_at ? '#1A1A1A' : '#9E9E9E' }}>
                    完了
                  </div>
                  {request.completed_at && (
                    <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '2px' }}>
                      {formatDate(request.completed_at)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 依頼情報カード */}
          <div style={{ 
            padding: '20px', 
            border: '1px solid #E5E5E5', 
            borderRadius: '8px',
            marginBottom: '28px',
            backgroundColor: '#FFFFFF'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#1A1A1A' }}>
              依頼情報
            </h2>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#6B6B6B' }}>契約金額</span>
                <strong style={{ color: '#1A1A1A' }}>{request.final_price?.toLocaleString()}円</strong>
              </div>
              {request.deadline && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#6B6B6B' }}>納期</span>
                    <strong style={{ color: '#1A1A1A' }}>{formatDate(request.deadline)}</strong>
                  </div>
                  {request.status === 'paid' && (
                    <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '6px', textAlign: 'right' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                      納期から7日以上経過しても納品がない場合、キャンセル申請が可能です。
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E5E5' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: '#1A1A1A' }}>
                依頼内容
              </h3>
              <p style={{ fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: '#4A4A4A' }}>
                {request.description}
              </p>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E5E5' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>
                {isRequester ? 'クリエイター' : '依頼者'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  {(() => {
                    const profile = isRequester ? request.contractor : request.requester
                    return profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.display_name || ''} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      profile?.display_name?.charAt(0) || '?'
                    )
                  })()}
                </div>
                <div>
                  {(() => {
                    const profile = isRequester ? request.contractor : request.requester
                    return profile?.username ? (
                      <Link 
                        href={`/creators/${profile.username}`}
                        style={{ 
                          textDecoration: 'none', 
                          fontSize: '15px', 
                          fontWeight: '700', 
                          color: '#1A1A1A'
                        }}
                      >
                        {profile.display_name || '名前未設定'}
                      </Link>
                    ) : (
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A' }}>
                        {profile?.display_name || '名前未設定'}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* 納品ファイル（依頼者のみ表示） */}
            {isRequester && request.delivery_file_urls && request.delivery_file_urls.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E5E5' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>
                  納品ファイル
                </h3>
                {request.delivery_file_urls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      backgroundColor: '#F5F5F5',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      color: '#1A1A1A',
                      border: '1px solid #E5E5E5'
                    }}
                  >
                    <i className="fas fa-download"></i>
                    納品ファイルをダウンロード
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* アクション（ステータス別） */}
          
          {/* キャンセル申請の表示（相手からの申請） */}
          {cancellationRequest && cancellationRequest.requester_id !== currentProfileId && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#FFF3E0', 
              border: '2px solid #FF9800', 
              borderRadius: '8px',
              marginBottom: '28px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>
                <i className="fas fa-exclamation-circle" style={{ marginRight: '8px', color: '#FF9800' }}></i>
                キャンセル申請があります
              </h3>
              
              <div style={{ 
                padding: '16px', 
                backgroundColor: '#FFFFFF', 
                borderRadius: '6px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '13px', color: '#6B6B6B', marginBottom: '8px' }}>
                  申請者: {cancellationRequest.requester.display_name || '名前未設定'}
                </div>
                <div style={{ fontSize: '13px', color: '#6B6B6B', marginBottom: '12px' }}>
                  申請日: {formatDateTime(cancellationRequest.created_at)}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#1A1A1A' }}>
                  理由:
                </div>
                <p style={{ fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: '#4A4A4A' }}>
                  {cancellationRequest.reason}
                </p>
              </div>

              <div style={{ 
                padding: '12px', 
                backgroundColor: '#FFEBEE', 
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#4A4A4A'
              }}>
                <i className="fas fa-info-circle" style={{ marginRight: '8px', color: '#D32F2F' }}></i>
                7日以内に応答しない場合、自動的に同意したものとみなされます。
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => openCancellationResponseModal('reject')}
                  disabled={processing}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  拒否する
                </button>
                <button
                  onClick={() => openCancellationResponseModal('approve')}
                  disabled={processing}
                  style={{ 
                    flex: 1,
                    padding: '12px 24px',
                    backgroundColor: '#D32F2F',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  同意する
                </button>
              </div>
            </div>
          )}

          {/* 自分が申請したキャンセルの状態表示 */}
          {cancellationRequest && cancellationRequest.requester_id === currentProfileId && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#FFF9F5', 
              border: '1px solid #FFE0CC', 
              borderRadius: '8px',
              marginBottom: '28px',
              textAlign: 'center'
            }}>
              <i className="fas fa-clock" style={{ fontSize: '36px', color: '#FF9800', marginBottom: '12px' }}></i>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: '#1A1A1A' }}>
                キャンセル申請中
              </h3>
              <p style={{ fontSize: '14px', color: '#6B6B6B', marginBottom: '12px' }}>
                相手の応答を待っています。7日以内に応答がない場合、自動的に承認されます。
              </p>
              <div style={{ fontSize: '13px', color: '#9E9E9E' }}>
                申請日: {formatDateTime(cancellationRequest.created_at)}
              </div>
            </div>
          )}

          {request.status === 'contracted' && isRequester && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#FFF9F5', 
              border: '1px solid #FFE0CC', 
              borderRadius: '8px',
              marginBottom: '28px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>
                <i className="fas fa-credit-card" style={{ marginRight: '8px', color: '#FF9800' }}></i>
                次のステップ: 仮払い
              </h3>
              <p style={{ fontSize: '14px', marginBottom: '16px', color: '#4A4A4A' }}>
                仮払いを行うと、クリエイターが作業を開始できます。
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={handlePayment} disabled={processing} className="btn-primary">
                  {processing ? '処理中...' : '仮払いする'}
                </button>
                <button 
                  onClick={() => openCancelModal('free')} 
                  disabled={processing} 
                  className="btn-secondary"
                  style={{ backgroundColor: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2' }}
                >
                  キャンセル申請
                </button>
              </div>
            </div>
          )}

          {request.status === 'contracted' && isContractor && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#FFF9F5', 
              border: '1px solid #FFE0CC', 
              borderRadius: '8px',
              marginBottom: '28px',
              textAlign: 'center'
            }}>
              <i className="fas fa-clock" style={{ fontSize: '36px', color: '#FF9800', marginBottom: '12px' }}></i>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: '#1A1A1A' }}>
                仮払い待ち
              </h3>
              <p style={{ fontSize: '14px', color: '#6B6B6B', marginBottom: '16px' }}>
                依頼者が仮払いを完了すると、作業を開始できます。
              </p>
              <button 
                onClick={() => openCancelModal('free')} 
                disabled={processing} 
                className="btn-secondary"
                style={{ backgroundColor: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2' }}
              >
                キャンセル申請
              </button>
            </div>
          )}

          {request.status === 'paid' && isContractor && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#F0F7FF', 
              border: '1px solid #BBDEFB', 
              borderRadius: '8px',
              marginBottom: '28px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>
                <i className="fas fa-upload" style={{ marginRight: '8px', color: '#2196F3' }}></i>
                納品する
              </h3>
              <p style={{ fontSize: '14px', marginBottom: '16px', color: '#4A4A4A' }}>
                作業が完了したら、成果物を納品してください。
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={() => setShowDeliveryModal(true)} className="btn-primary">
                  納品する
                </button>
                <button 
                  onClick={() => openCancelModal('free')} 
                  disabled={processing} 
                  className="btn-secondary"
                  style={{ backgroundColor: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2' }}
                >
                  キャンセル申請
                </button>
              </div>
            </div>
          )}

          {/* 納期超過キャンセル */}
          {request.status === 'paid' && isRequester && isOverdue() && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#FFF3E0', 
              border: '1px solid #FFE0B2', 
              borderRadius: '8px',
              marginBottom: '28px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px', color: '#F57C00' }}></i>
                納期超過
              </h3>
              <p style={{ fontSize: '14px', marginBottom: '16px', color: '#4A4A4A' }}>
                納期から7日以上経過しています。キャンセル申請が可能です。
              </p>
              <button 
                onClick={() => openCancelModal('overdue')} 
                disabled={processing}
                className="btn-secondary"
                style={{ backgroundColor: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2' }}
              >
                納期超過のためキャンセル申請
              </button>
            </div>
          )}

          {/* 作業中（納期超過なし） */}
          {request.status === 'paid' && isRequester && !isOverdue() && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#F9F9F9', 
              border: '1px solid #E5E5E5', 
              borderRadius: '8px',
              marginBottom: '28px',
              textAlign: 'center'
            }}>
              <i className="fas fa-spinner fa-pulse" style={{ fontSize: '36px', color: '#6B6B6B', marginBottom: '12px' }}></i>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: '#1A1A1A' }}>
                作業中
              </h3>
              <p style={{ fontSize: '14px', color: '#6B6B6B', marginBottom: '16px' }}>
                クリエイターが作業を進めています。納品をお待ちください。
              </p>
              <button 
                onClick={() => openCancelModal('free')} 
                disabled={processing} 
                className="btn-secondary"
                style={{ backgroundColor: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', fontSize: '14px', padding: '8px 16px' }}
              >
                キャンセル申請
              </button>
            </div>
          )}

          {request.status === 'delivered' && isRequester && pendingDeliveries.length > 0 && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#F0F7FF', 
              border: '1px solid #BBDEFB', 
              borderRadius: '8px',
              marginBottom: '28px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1A1A1A' }}>
                <i className="fas fa-check-circle" style={{ marginRight: '8px', color: '#2196F3' }}></i>
                検収をお願いします
              </h3>
              <p style={{ fontSize: '14px', marginBottom: '16px', color: '#4A4A4A' }}>
                クリエイターから納品物が提出されました。下記の納品履歴から検収を行ってください。
              </p>
            </div>
          )}

          {request.status === 'delivered' && isContractor && pendingDeliveries.length > 0 && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#FFF9F5', 
              border: '1px solid #FFE0CC', 
              borderRadius: '8px',
              marginBottom: '28px',
              textAlign: 'center'
            }}>
              <i className="fas fa-hourglass-half" style={{ fontSize: '36px', color: '#FF9800', marginBottom: '12px' }}></i>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: '#1A1A1A' }}>
                検収待ち
              </h3>
              <p style={{ fontSize: '14px', color: '#6B6B6B' }}>
                依頼者が検収を行っています。しばらくお待ちください。
              </p>
            </div>
          )}

          {request.status === 'completed' && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#F1F8F4', 
              border: '1px solid #C8E6C9', 
              borderRadius: '8px',
              marginBottom: '28px',
              textAlign: 'center'
            }}>
              <i className="fas fa-check-circle" style={{ fontSize: '36px', color: '#4CAF50', marginBottom: '12px' }}></i>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: '#1A1A1A' }}>
                完了
              </h3>
              <p style={{ fontSize: '14px', color: '#6B6B6B' }}>
                お疲れ様でした！取引が完了しました。
              </p>
            </div>
          )}

          {/* 納品履歴 */}
          {deliveries.length > 0 && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1A1A1A' }}>
                納品履歴 ({deliveries.length}件)
              </h2>

              {/* 統計 */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ padding: '12px', backgroundColor: '#F9F9F9', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#6B6B6B', marginBottom: '4px' }}>検収待ち</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>{pendingDeliveries.length}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F9F9F9', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#6B6B6B', marginBottom: '4px' }}>承認済み</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>{approvedDeliveries.length}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F9F9F9', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#6B6B6B', marginBottom: '4px' }}>差戻し</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>{rejectedDeliveries.length}</div>
                </div>
              </div>

              {/* 納品リスト */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {deliveries.map((delivery) => (
                  <div 
                    key={delivery.id} 
                    style={{ 
                      padding: '16px', 
                      border: '1px solid #E5E5E5', 
                      borderRadius: '8px',
                      backgroundColor: delivery.status === 'approved' ? '#F9F9F9' : '#FFFFFF'
                    }}
                  >
                    {/* ヘッダー */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#6B6B6B' }}>
                        {formatDateTime(delivery.created_at)}
                      </div>
                      
                      {delivery.status === 'pending' && (
                        <span style={{ 
                          padding: '4px 12px', 
                          borderRadius: '4px', 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          backgroundColor: '#FFF3E0', 
                          color: '#E65100'
                        }}>
                          検収待ち
                        </span>
                      )}
                      {delivery.status === 'approved' && (
                        <span style={{ 
                          padding: '4px 12px', 
                          borderRadius: '4px', 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          backgroundColor: '#1A1A1A', 
                          color: '#FFFFFF'
                        }}>
                          承認済み
                        </span>
                      )}
                      {delivery.status === 'rejected' && (
                        <span style={{ 
                          padding: '4px 12px', 
                          borderRadius: '4px', 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          backgroundColor: '#FFEBEE', 
                          color: '#C62828'
                        }}>
                          差戻し
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
                      {delivery.message}
                    </p>

                    {/* URL */}
                    {delivery.delivery_url && (
                      <div style={{ marginBottom: '12px' }}>
                        <a 
                          href={delivery.delivery_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            backgroundColor: '#F5F5F5',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            fontSize: '13px',
                            color: '#1A1A1A',
                            border: '1px solid #E5E5E5'
                          }}
                        >
                          <i className="fas fa-external-link-alt"></i>
                          納品物を確認
                        </a>
                      </div>
                    )}

                    {/* フィードバック */}
                    {delivery.feedback && (
                      <div style={{ 
                        padding: '12px', 
                        backgroundColor: delivery.status === 'rejected' ? '#FFEBEE' : '#F0F7FF', 
                        borderRadius: '6px',
                        marginTop: '12px'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#6B6B6B' }}>
                          <i className="fas fa-comment" style={{ marginRight: '6px' }}></i>
                          {isRequester ? 'あなたのフィードバック' : '依頼者からのフィードバック'}
                        </div>
                        <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#1A1A1A' }}>
                          {delivery.feedback}
                        </p>
                      </div>
                    )}

                    {/* 検収ボタン（依頼者のみ・pending時） */}
                    {isRequester && delivery.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <button
                          onClick={() => openReviewModal(delivery.id, 'reject')}
                          disabled={processing}
                          className="btn-secondary"
                          style={{ flex: 1, fontSize: '14px', padding: '10px' }}
                        >
                          差し戻す
                        </button>
                        <button
                          onClick={() => openReviewModal(delivery.id, 'approve')}
                          disabled={processing}
                          className="btn-primary"
                          style={{ flex: 1, fontSize: '14px', padding: '10px' }}
                        >
                          承認して完了
                        </button>
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
          onClick={() => {
            if (!processing) {
              setShowDeliveryModal(false)
              setSelectedFile(null)
              setUploadProgress(0)
            }
          }}
        >
          <div 
            style={{ 
              backgroundColor: '#FFFFFF', 
              borderRadius: '12px', 
              maxWidth: '600px', 
              width: '100%', 
              padding: '32px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>納品する</h2>

            <form onSubmit={handleSubmitDelivery}>
              {/* 納品方法選択 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  color: '#1A1A1A'
                }}>
                  納品方法を選択
                </label>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ 
                    flex: 1,
                    padding: '16px',
                    border: deliveryMethod === 'file' ? '2px solid #1A1A1A' : '1px solid #E5E5E5',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: deliveryMethod === 'file' ? '#F9F9F9' : '#FFFFFF'
                  }}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="file"
                      checked={deliveryMethod === 'file'}
                      onChange={(e) => setDeliveryMethod('file')}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>
                      ファイルアップロード
                    </span>
                    <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '4px', marginLeft: '24px' }}>
                      1GB以下
                    </div>
                  </label>

                  <label style={{ 
                    flex: 1,
                    padding: '16px',
                    border: deliveryMethod === 'url' ? '2px solid #1A1A1A' : '1px solid #E5E5E5',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: deliveryMethod === 'url' ? '#F9F9F9' : '#FFFFFF'
                  }}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="url"
                      checked={deliveryMethod === 'url'}
                      onChange={(e) => setDeliveryMethod('url')}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>
                      URL入力
                    </span>
                    <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '4px', marginLeft: '24px' }}>
                      1GB超える場合
                    </div>
                  </label>
                </div>
              </div>

              {/* ファイルアップロード */}
              {deliveryMethod === 'file' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    marginBottom: '8px',
                    color: '#1A1A1A'
                  }}>
                    納品ファイル <span style={{ color: '#D32F2F' }}>*</span>
                  </label>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    required={deliveryMethod === 'file'}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #E5E5E5',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {selectedFile && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#6B6B6B' }}>
                      <i className="fas fa-file" style={{ marginRight: '6px' }}></i>
                      {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </div>
                  )}
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B6B6B' }}>
                    ※ファイルは1GB以下にしてください。ZIPファイルでまとめての提出を推奨します。
                  </div>
                </div>
              )}

              {/* URL入力 */}
              {deliveryMethod === 'url' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    marginBottom: '8px',
                    color: '#1A1A1A'
                  }}>
                    納品物のURL <span style={{ color: '#D32F2F' }}>*</span>
                  </label>
                  <input
                    type="url"
                    value={deliveryUrl}
                    onChange={(e) => setDeliveryUrl(e.target.value)}
                    placeholder="https://gigafile.nu/..."
                    required={deliveryMethod === 'url'}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #E5E5E5',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B6B6B' }}>
                    ※ギガファイル便、Google Drive、Dropboxなどの共有URLを入力してください
                  </div>
                </div>
              )}

              {/* 納品メッセージ */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#1A1A1A'
                }}>
                  納品メッセージ <span style={{ color: '#D32F2F' }}>*</span>
                </label>
                <textarea
                  value={deliveryMessage}
                  onChange={(e) => setDeliveryMessage(e.target.value)}
                  placeholder="納品物の説明や依頼者への連絡事項を記入してください"
                  required
                  rows={6}
                  maxLength={2000}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#6B6B6B', textAlign: 'right' }}>
                  {deliveryMessage.length} / 2000
                </div>
              </div>

              {/* アップロード進捗 */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#6B6B6B', marginBottom: '8px' }}>
                    アップロード中... {uploadProgress}%
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    backgroundColor: '#E5E5E5', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${uploadProgress}%`, 
                      height: '100%', 
                      backgroundColor: '#1A73E8',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              )}

              <div style={{ padding: '12px', backgroundColor: '#F9F9F9', borderRadius: '6px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.6', color: '#4A4A4A' }}>
                <i className="fas fa-info-circle" style={{ marginRight: '8px', color: '#6B6B6B' }}></i>
                納品後、依頼者が検収を行います。承認されると取引が完了します。
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setShowDeliveryModal(false)
                    setSelectedFile(null)
                    setUploadProgress(0)
                  }}
                  disabled={processing}
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                >
                  キャンセル
                </button>
                <button 
                  type="submit"
                  disabled={processing || (uploadProgress > 0 && uploadProgress < 100)} 
                  className="btn-primary" 
                  style={{ flex: 1 }}
                >
                  {processing ? 'アップロード中...' : '納品する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 検収モーダル */}
      {showReviewModal && (
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
          onClick={() => setShowReviewModal(false)}
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
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>
              {reviewAction === 'approve' ? '納品を承認' : '納品を差し戻す'}
            </h2>

            <form onSubmit={handleSubmitReview}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#1A1A1A'
                }}>
                  フィードバック {reviewAction === 'reject' && <span style={{ color: '#D32F2F' }}>*</span>}
                </label>
                <textarea
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder={reviewAction === 'approve' ? '良かった点や感謝のメッセージを記入してください（任意）' : '修正が必要な点を具体的に記入してください'}
                  required={reviewAction === 'reject'}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {reviewAction === 'approve' && (
                <div style={{ padding: '12px', backgroundColor: '#F1F8F4', borderRadius: '6px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.6', color: '#4A4A4A' }}>
                  <i className="fas fa-check-circle" style={{ marginRight: '8px', color: '#4CAF50' }}></i>
                  承認すると取引が完了し、クリエイターへの支払い処理が行われます。
                </div>
              )}

              {reviewAction === 'reject' && (
                <div style={{ padding: '12px', backgroundColor: '#FFF3E0', borderRadius: '6px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.6', color: '#4A4A4A' }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px', color: '#FF9800' }}></i>
                  差し戻すと、クリエイターが再度納品できる状態になります。
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => setShowReviewModal(false)} 
                  disabled={processing}
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                >
                  キャンセル
                </button>
                <button 
                  type="submit"
                  disabled={processing} 
                  className="btn-primary" 
                  style={{ flex: 1 }}
                >
                  {processing ? '処理中...' : reviewAction === 'approve' ? '承認する' : '差し戻す'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* キャンセルモーダル */}
      {showCancelModal && (
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
          onClick={() => setShowCancelModal(false)}
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
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#1A1A1A' }}>
              {cancelType === 'free' ? 'キャンセル申請' : 'キャンセル申請（納期超過）'}
            </h2>

            <form onSubmit={handleSubmitCancel}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#1A1A1A'
                }}>
                  キャンセル理由 <span style={{ color: '#D32F2F' }}>*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="キャンセル理由を入力してください"
                  required
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {cancelType === 'free' && (
                <div style={{ padding: '12px', backgroundColor: '#FFF3E0', borderRadius: '6px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.6', color: '#4A4A4A' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '8px', color: '#FF9800' }}></i>
                  キャンセル申請を送信します。相手が同意すると契約が解除されます。<br />
                  ※相手が7日以内に応答しない場合、自動的にキャンセルされます。
                </div>
              )}

              {cancelType === 'overdue' && (
                <div style={{ padding: '12px', backgroundColor: '#FFEBEE', borderRadius: '6px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.6', color: '#4A4A4A' }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px', color: '#D32F2F' }}></i>
                  納期超過のためキャンセル申請を行います。運営が内容を確認し、承認された場合は返金処理が行われます。
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => setShowCancelModal(false)} 
                  disabled={processing}
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                >
                  戻る
                </button>
                <button 
                  type="submit"
                  disabled={processing} 
                  style={{ 
                    flex: 1,
                    padding: '12px 24px',
                    backgroundColor: '#D32F2F',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {processing ? '送信中...' : '申請する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* キャンセル申請応答モーダル */}
      {showCancellationResponseModal && (
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
          onClick={() => setShowCancellationResponseModal(false)}
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
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#1A1A1A' }}>
              {cancellationResponseAction === 'approve' ? 'キャンセルに同意' : 'キャンセルを拒否'}
            </h2>

            <form onSubmit={handleCancellationResponse}>
              {cancellationResponseAction === 'approve' && (
                <div style={{ padding: '12px', backgroundColor: '#FFEBEE', borderRadius: '6px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.6', color: '#4A4A4A' }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px', color: '#D32F2F' }}></i>
                  同意すると契約が解除されます。仮払い済みの場合は返金処理が行われます。
                </div>
              )}

              {cancellationResponseAction === 'reject' && (
                <div style={{ padding: '12px', backgroundColor: '#FFF3E0', borderRadius: '6px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.6', color: '#4A4A4A' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '8px', color: '#FF9800' }}></i>
                  拒否すると、契約は継続されます。
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => setShowCancellationResponseModal(false)} 
                  disabled={processing}
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                >
                  戻る
                </button>
                <button 
                  type="submit"
                  disabled={processing} 
                  style={{ 
                    flex: 1,
                    padding: '12px 24px',
                    backgroundColor: cancellationResponseAction === 'approve' ? '#D32F2F' : '#1A1A1A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {processing ? '処理中...' : cancellationResponseAction === 'approve' ? '同意する' : '拒否する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}