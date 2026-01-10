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

  // レビュー関連
  const [myReview, setMyReview] = useState<any>(null)
  const [partnerReview, setPartnerReview] = useState<any>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState<number>(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

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
        handlePaymentSuccessFallback()
        window.history.replaceState({}, '', `/requests/${requestId}/status`)
      }
    }
  }, [requestId, currentProfileId])

  useEffect(() => {
    if (request?.status === 'completed' && currentProfileId) {
      fetchReviews()
    }
  }, [request?.status, currentProfileId])

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

  async function fetchReviews() {
    if (!request || request.status !== 'completed') {
      setMyReview(null)
      setPartnerReview(null)
      return
    }

    const partnerId = isRequester ? request.selected_applicant_id : request.requester_id

    const { data: myReviewData } = await supabase
      .from('reviews')
      .select('*')
      .eq('work_request_id', requestId)
      .eq('reviewer_id', currentProfileId)
      .maybeSingle()

    setMyReview(myReviewData)

    if (partnerId) {
      const { data: partnerReviewData } = await supabase
        .from('reviews')
        .select('*')
        .eq('work_request_id', requestId)
        .eq('reviewer_id', partnerId)
        .maybeSingle()

      setPartnerReview(partnerReviewData)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 1024 * 1024 * 1024
    if (file.size > maxSize) {
      alert('ファイルサイズは1GB以下にしてください。\n1GBを超える場合は、ギガファイル便などの外部サービスをご利用ください。')
      e.target.value = ''
      return
    }

    setSelectedFile(file)
  }

  async function uploadFileToR2(file: File): Promise<string> {
    try {
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

    if (deliveryMethod === 'file' && !selectedFile) {
      alert('ファイルを選択してください')
      return
    }

    if (deliveryMethod === 'url' && !deliveryUrl.trim()) {
      alert('URLを入力してください')
      return
    }

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

      if (deliveryMethod === 'file' && selectedFile) {
        setUploadProgress(10)
        fileUrl = await uploadFileToR2(selectedFile)
        setUploadProgress(80)
      }

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

  async function handlePaymentSuccessFallback() {
    try {
      const { data: currentRequest, error: fetchError } = await supabase
        .from('work_requests')
        .select('status, paid_at')
        .eq('id', requestId)
        .single()

      if (fetchError) {
        console.error('ステータス確認エラー:', fetchError)
        alert('ステータスの確認に失敗しました')
        return
      }

      if (currentRequest.status === 'paid' && currentRequest.paid_at) {
        console.log('✅ Webhookで既に更新済み')
        alert('仮払いが完了しました！クリエイターが作業を開始できます。')
        await fetchRequest()
        return
      }

      console.log('⚠️ Webhookが届いていないため、フォールバックで更新します')
      
      const { error: updateError } = await supabase
        .from('work_requests')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('status', 'contracted')

      if (updateError) {
        console.error('ステータス更新エラー:', updateError)
        alert('ステータスの更新に失敗しました')
        return
      }

      if (request?.selected_applicant_id) {
        await createNotification(
          request.selected_applicant_id,
          'paid',
          '仮払いが完了しました',
          `「${request.title}」の仮払いが完了しました。作業を開始してください。`,
          `/requests/${requestId}/status`
        )
      }

      alert('仮払いが完了しました！クリエイターが作業を開始できます。')
      await fetchRequest()

    } catch (error) {
      console.error('仮払い完了処理エラー:', error)
      alert('エラーが発生しました')
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

  async function handleSubmitReviewForm(e: React.FormEvent) {
    e.preventDefault()

    if (reviewRating === 0) {
      alert('評価を選択してください')
      return
    }

    if (!confirm('レビューを投稿しますか？\n※投稿後は編集・削除できません。')) {
      return
    }

    setSubmittingReview(true)

    try {
      const revieweeId = isRequester ? request?.selected_applicant_id : request?.requester_id

      const { error } = await supabase
        .from('reviews')
        .insert({
          work_request_id: requestId,
          reviewer_id: currentProfileId,
          reviewee_id: revieweeId,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('レビュー投稿エラー:', error)
        throw new Error('レビューの投稿に失敗しました')
      }

      if (revieweeId && request) {
        await createNotification(
          revieweeId,
          'review',
          'レビューが投稿されました',
          `「${request.title}」のレビューが投稿されました。`,
          `/creators/${isRequester ? request.contractor?.username : request.requester.username}`
        )
      }

      alert('レビューを投稿しました！')
      setShowReviewForm(false)
      setReviewRating(0)
      setReviewComment('')
      await fetchReviews()

    } catch (error) {
      console.error('レビュー投稿エラー:', error)
      alert(error instanceof Error ? error.message : 'レビューの投稿に失敗しました')
    } finally {
      setSubmittingReview(false)
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

  if (!request) {
    return (
      <>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <Header />
        <div className="req-status-page">
          <div className="req-status-error">
            <i className="fas fa-exclamation-circle"></i>
            <h1>依頼が見つかりませんでした</h1>
            <Link href="/requests/manage" className="req-status-btn primary">依頼管理に戻る</Link>
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
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      <div className="req-status-page">
        <div className="req-status-container">
          {/* ヘッダー */}
          <div className="req-status-header">
            <h1 className="req-status-title">{request.title}</h1>
            <div className="req-status-badges">
              <span className={`req-status-badge ${request.status}`}>{getStatusLabel(request.status)}</span>
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
                  {request.contracted_at && <div className="req-status-timeline-date">{formatDate(request.contracted_at)}</div>}
                </div>
              </div>
              <div className="req-status-timeline-item">
                <div className={`req-status-timeline-icon ${request.paid_at ? 'done' : 'pending'}`}>
                  {request.paid_at ? <i className="fas fa-check"></i> : <div className="dot"></div>}
                </div>
                <div className="req-status-timeline-content">
                  <div className={`req-status-timeline-label ${!request.paid_at ? 'inactive' : ''}`}>仮払い完了</div>
                  {request.paid_at && <div className="req-status-timeline-date">{formatDate(request.paid_at)}</div>}
                </div>
              </div>
              <div className="req-status-timeline-item">
                <div className={`req-status-timeline-icon ${request.delivered_at ? 'done' : request.status === 'paid' ? 'active' : 'pending'}`}>
                  {request.delivered_at ? <i className="fas fa-check"></i> : request.status === 'paid' ? <i className="fas fa-spinner fa-spin"></i> : <div className="dot"></div>}
                </div>
                <div className="req-status-timeline-content">
                  <div className={`req-status-timeline-label ${request.status !== 'paid' && !request.delivered_at ? 'inactive' : ''}`}>作業中</div>
                </div>
              </div>
              <div className="req-status-timeline-item">
                <div className={`req-status-timeline-icon ${request.completed_at ? 'done' : request.status === 'delivered' ? 'active' : 'pending'}`}>
                  {request.completed_at ? <i className="fas fa-check"></i> : request.status === 'delivered' ? <i className="fas fa-hourglass-half"></i> : <div className="dot"></div>}
                </div>
                <div className="req-status-timeline-content">
                  <div className={`req-status-timeline-label ${request.status !== 'delivered' && !request.completed_at ? 'inactive' : ''}`}>納品・検収待ち</div>
                  {request.delivered_at && <div className="req-status-timeline-date">{formatDate(request.delivered_at)}</div>}
                </div>
              </div>
              <div className="req-status-timeline-item">
                <div className={`req-status-timeline-icon ${request.completed_at ? 'done' : 'pending'}`}>
                  {request.completed_at ? <i className="fas fa-check"></i> : <div className="dot"></div>}
                </div>
                <div className="req-status-timeline-content">
                  <div className={`req-status-timeline-label ${!request.completed_at ? 'inactive' : ''}`}>完了</div>
                  {request.completed_at && <div className="req-status-timeline-date">{formatDate(request.completed_at)}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* 依頼情報カード */}
          <div className="req-status-info-card">
            <h2 className="req-status-info-title">依頼情報</h2>
            <div className="req-status-info-grid">
              <div className="req-status-info-row">
                <span className="req-status-info-label">契約金額</span>
                <span className="req-status-info-value">{request.final_price?.toLocaleString()}円</span>
              </div>
              {request.deadline && (
                <div>
                  <div className="req-status-info-row">
                    <span className="req-status-info-label">納期</span>
                    <span className="req-status-info-value">{formatDate(request.deadline)}</span>
                  </div>
                  {request.status === 'paid' && (
                    <div className="req-status-info-note"><i className="fas fa-info-circle"></i>納期から7日以上経過しても納品がない場合、キャンセル申請が可能です。</div>
                  )}
                </div>
              )}
            </div>
            <hr className="req-status-info-divider" />
            <h3 className="req-status-info-subtitle">依頼内容</h3>
            <p className="req-status-info-description">{request.description}</p>
            <hr className="req-status-info-divider" />
            <h3 className="req-status-info-subtitle">{isRequester ? 'クリエイター' : '依頼者'}</h3>
            <div className="req-status-user-card">
              <div className="req-status-user-avatar">
                {(() => {
                  const profile = isRequester ? request.contractor : request.requester
                  return profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.display_name || ''} /> : <span>{profile?.display_name?.charAt(0) || '?'}</span>
                })()}
              </div>
              <div>
                {(() => {
                  const profile = isRequester ? request.contractor : request.requester
                  return profile?.username ? <Link href={`/creators/${profile.username}`} className="req-status-user-name">{profile.display_name || '名前未設定'}</Link> : <div className="req-status-user-name">{profile?.display_name || '名前未設定'}</div>
                })()}
              </div>
            </div>
            {isRequester && request.delivery_file_urls && request.delivery_file_urls.length > 0 && (
              <>
                <hr className="req-status-info-divider" />
                <h3 className="req-status-info-subtitle">納品ファイル</h3>
                {request.delivery_file_urls.map((url, index) => (
                  <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="req-status-file-link"><i className="fas fa-download"></i>納品ファイルをダウンロード</a>
                ))}
              </>
            )}
          </div>

          {/* キャンセル申請（相手から） */}
          {cancellationRequest && cancellationRequest.requester_id !== currentProfileId && (
            <div className="req-status-cancel-request">
              <h3 className="req-status-cancel-request-title"><i className="fas fa-exclamation-circle"></i>キャンセル申請があります</h3>
              <div className="req-status-cancel-request-content">
                <div className="req-status-cancel-request-meta">申請者: {cancellationRequest.requester.display_name || '名前未設定'}<br />申請日: {formatDateTime(cancellationRequest.created_at)}</div>
                <div className="req-status-cancel-request-label">理由:</div>
                <p className="req-status-cancel-request-reason">{cancellationRequest.reason}</p>
              </div>
              <div className="req-status-cancel-request-warning"><i className="fas fa-info-circle"></i>7日以内に応答しない場合、自動的に同意したものとみなされます。</div>
              <div className="req-status-action-buttons">
                <button onClick={() => openCancellationResponseModal('reject')} disabled={processing} className="req-status-btn secondary flex-1">拒否する</button>
                <button onClick={() => openCancellationResponseModal('approve')} disabled={processing} className="req-status-btn danger-solid flex-1">同意する</button>
              </div>
            </div>
          )}

          {/* 自分のキャンセル申請 */}
          {cancellationRequest && cancellationRequest.requester_id === currentProfileId && (
            <div className="req-status-action-card info center">
              <i className="fas fa-clock req-status-action-icon-large warning"></i>
              <h3 className="req-status-action-title" style={{ justifyContent: 'center' }}>キャンセル申請中</h3>
              <p className="req-status-action-text">相手の応答を待っています。7日以内に応答がない場合、自動的に承認されます。<br /><span style={{ fontSize: '13px', color: '#888888' }}>申請日: {formatDateTime(cancellationRequest.created_at)}</span></p>
            </div>
          )}

          {/* 仮払い待ち - 依頼者 */}
          {request.status === 'contracted' && isRequester && (
            <div className="req-status-action-card warning">
              <h3 className="req-status-action-title"><i className="fas fa-credit-card warning"></i>次のステップ: 仮払い</h3>
              <p className="req-status-action-text">仮払いを行うと、クリエイターが作業を開始できます。</p>
              <div className="req-status-action-buttons">
                <button onClick={handlePayment} disabled={processing} className="req-status-btn primary">{processing ? '処理中...' : '仮払いする'}</button>
                <button onClick={() => openCancelModal('free')} disabled={processing} className="req-status-btn danger">キャンセル申請</button>
              </div>
            </div>
          )}

          {/* 仮払い待ち - クリエイター */}
          {request.status === 'contracted' && isContractor && (
            <div className="req-status-action-card info center">
              <i className="fas fa-clock req-status-action-icon-large warning"></i>
              <h3 className="req-status-action-title" style={{ justifyContent: 'center' }}>仮払い待ち</h3>
              <p className="req-status-action-text">依頼者が仮払いを完了すると、作業を開始できます。</p>
              <button onClick={() => openCancelModal('free')} disabled={processing} className="req-status-btn danger small">キャンセル申請</button>
            </div>
          )}

          {/* 作業中 - クリエイター */}
          {request.status === 'paid' && isContractor && (
            <div className="req-status-action-card info">
              <h3 className="req-status-action-title"><i className="fas fa-upload info"></i>納品する</h3>
              <p className="req-status-action-text">作業が完了したら、成果物を納品してください。</p>
              <div className="req-status-action-buttons">
                <button onClick={() => setShowDeliveryModal(true)} className="req-status-btn primary">納品する</button>
                <button onClick={() => openCancelModal('free')} disabled={processing} className="req-status-btn danger">キャンセル申請</button>
              </div>
            </div>
          )}

          {/* 納期超過 */}
          {request.status === 'paid' && isRequester && isOverdue() && (
            <div className="req-status-action-card alert">
              <h3 className="req-status-action-title"><i className="fas fa-exclamation-triangle danger"></i>納期超過</h3>
              <p className="req-status-action-text">納期から7日以上経過しています。キャンセル申請が可能です。</p>
              <button onClick={() => openCancelModal('overdue')} disabled={processing} className="req-status-btn danger">納期超過のためキャンセル申請</button>
            </div>
          )}

          {/* 作業中 - 依頼者 */}
          {request.status === 'paid' && isRequester && !isOverdue() && (
            <div className="req-status-action-card info center">
              <i className="fas fa-spinner fa-pulse req-status-action-icon-large"></i>
              <h3 className="req-status-action-title" style={{ justifyContent: 'center' }}>作業中</h3>
              <p className="req-status-action-text">クリエイターが作業を進めています。納品をお待ちください。</p>
              <button onClick={() => openCancelModal('free')} disabled={processing} className="req-status-btn danger small">キャンセル申請</button>
            </div>
          )}

          {/* 検収待ち - 依頼者 */}
          {request.status === 'delivered' && isRequester && pendingDeliveries.length > 0 && (
            <div className="req-status-action-card info">
              <h3 className="req-status-action-title"><i className="fas fa-check-circle info"></i>検収をお願いします</h3>
              <p className="req-status-action-text">クリエイターから納品物が提出されました。下記の納品履歴から検収を行ってください。</p>
            </div>
          )}

          {/* 検収待ち - クリエイター */}
          {request.status === 'delivered' && isContractor && pendingDeliveries.length > 0 && (
            <div className="req-status-action-card info center">
              <i className="fas fa-hourglass-half req-status-action-icon-large warning"></i>
              <h3 className="req-status-action-title" style={{ justifyContent: 'center' }}>検収待ち</h3>
              <p className="req-status-action-text">依頼者が検収を行っています。しばらくお待ちください。</p>
            </div>
          )}

          {/* 完了 */}
          {request.status === 'completed' && (
            <>
              <div className="req-status-action-card success center">
                <i className="fas fa-check-circle req-status-action-icon-large success"></i>
                <h3 className="req-status-action-title" style={{ justifyContent: 'center' }}>完了</h3>
                <p className="req-status-action-text">お疲れ様でした！取引が完了しました。</p>
              </div>

              <div className="req-status-review-section">
                <h2 className="req-status-review-section-title">レビュー</h2>
                {!myReview && !showReviewForm && (
                  <div className="req-status-review-prompt">
                    <i className="fas fa-star"></i>
                    <h3>{isRequester ? 'クリエイターを評価' : '依頼者を評価'}</h3>
                    <p>取引はいかがでしたか？レビューを投稿してください。</p>
                    <button onClick={() => setShowReviewForm(true)} className="req-status-btn primary">レビューを書く</button>
                  </div>
                )}
                {!myReview && showReviewForm && (
                  <div className="req-status-review-form">
                    <h3>レビューを投稿</h3>
                    <form onSubmit={handleSubmitReviewForm}>
                      <div className="req-status-modal-group">
                        <label className="req-status-modal-label">評価 <span className="req-status-required">*</span></label>
                        <div className="req-status-review-stars">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} type="button" onClick={() => setReviewRating(star)}><i className={star <= reviewRating ? 'fas fa-star' : 'far fa-star'}></i></button>
                          ))}
                        </div>
                      </div>
                      <div className="req-status-modal-group">
                        <label className="req-status-modal-label">コメント（任意）</label>
                        <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="取引の感想やフィードバックを記入してください" rows={4} maxLength={500} className="req-status-modal-textarea" />
                        <div className="req-status-modal-char-count">{reviewComment.length} / 500</div>
                      </div>
                      <div className="req-status-modal-info"><i className="fas fa-info-circle info"></i>投稿したレビューは編集・削除できません。</div>
                      <div className="req-status-modal-buttons">
                        <button type="button" onClick={() => { setShowReviewForm(false); setReviewRating(0); setReviewComment(''); }} disabled={submittingReview} className="req-status-btn secondary">キャンセル</button>
                        <button type="submit" disabled={submittingReview || reviewRating === 0} className="req-status-btn primary">{submittingReview ? '投稿中...' : '投稿する'}</button>
                      </div>
                    </form>
                  </div>
                )}
                {myReview && (
                  <div className="req-status-review-card">
                    <div className="req-status-review-card-header">
                      <div className="req-status-review-card-title">あなたのレビュー</div>
                      <div className="req-status-review-card-date">{new Date(myReview.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                    <div className="req-status-review-card-stars">{[...Array(5)].map((_, i) => (<i key={i} className={i < myReview.rating ? 'fas fa-star' : 'far fa-star'}></i>))}</div>
                    {myReview.comment && <p className="req-status-review-card-comment">{myReview.comment}</p>}
                  </div>
                )}
                {partnerReview && (
                  <div className="req-status-review-card partner">
                    <div className="req-status-review-card-header">
                      <div className="req-status-review-card-title">{isRequester ? 'クリエイターからのレビュー' : '依頼者からのレビュー'}</div>
                      <div className="req-status-review-card-date">{new Date(partnerReview.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                    <div className="req-status-review-card-stars">{[...Array(5)].map((_, i) => (<i key={i} className={i < partnerReview.rating ? 'fas fa-star' : 'far fa-star'}></i>))}</div>
                    {partnerReview.comment && <p className="req-status-review-card-comment">{partnerReview.comment}</p>}
                  </div>
                )}
                {!myReview && !partnerReview && !showReviewForm && (
                  <div className="req-status-review-empty"><i className="fas fa-star"></i><p>まだレビューがありません</p></div>
                )}
              </div>
            </>
          )}

          {/* 納品履歴 */}
          {deliveries.length > 0 && (
            <div className="req-status-deliveries">
              <h2 className="req-status-deliveries-title">納品履歴 ({deliveries.length}件)</h2>
              <div className="req-status-deliveries-stats">
                <div className="req-status-deliveries-stat">
                  <div className="req-status-deliveries-stat-label">検収待ち</div>
                  <div className="req-status-deliveries-stat-value">{pendingDeliveries.length}</div>
                </div>
                <div className="req-status-deliveries-stat">
                  <div className="req-status-deliveries-stat-label">承認済み</div>
                  <div className="req-status-deliveries-stat-value">{approvedDeliveries.length}</div>
                </div>
                <div className="req-status-deliveries-stat">
                  <div className="req-status-deliveries-stat-label">差戻し</div>
                  <div className="req-status-deliveries-stat-value">{rejectedDeliveries.length}</div>
                </div>
              </div>
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
                        <div className="req-status-delivery-feedback-label"><i className="fas fa-comment"></i>{isRequester ? 'あなたのフィードバック' : '依頼者からのフィードバック'}</div>
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
        <div className="req-status-modal-overlay" onClick={() => { if (!processing) { setShowDeliveryModal(false); setSelectedFile(null); setUploadProgress(0); } }}>
          <div className="req-status-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="req-status-modal-title">納品する</h2>
            <form onSubmit={handleSubmitDelivery}>
              <div className="req-status-modal-group">
                <label className="req-status-modal-label">納品方法を選択</label>
                <div className="req-status-delivery-method">
                  <label className={`req-status-delivery-method-option ${deliveryMethod === 'file' ? 'selected' : ''}`}>
                    <input type="radio" name="deliveryMethod" value="file" checked={deliveryMethod === 'file'} onChange={() => setDeliveryMethod('file')} />
                    <span>ファイルアップロード</span>
                    <div>1GB以下</div>
                  </label>
                  <label className={`req-status-delivery-method-option ${deliveryMethod === 'url' ? 'selected' : ''}`}>
                    <input type="radio" name="deliveryMethod" value="url" checked={deliveryMethod === 'url'} onChange={() => setDeliveryMethod('url')} />
                    <span>URL入力</span>
                    <div>1GB超える場合</div>
                  </label>
                </div>
              </div>
              {deliveryMethod === 'file' && (
                <div className="req-status-modal-group">
                  <label className="req-status-modal-label">納品ファイル <span className="req-status-required">*</span></label>
                  <input type="file" onChange={handleFileSelect} required={deliveryMethod === 'file'} className="req-status-modal-file-input" />
                  {selectedFile && <div className="req-status-modal-file-info"><i className="fas fa-file"></i>{selectedFile.name} ({formatFileSize(selectedFile.size)})</div>}
                  <div className="req-status-modal-hint">※ファイルは1GB以下にしてください。ZIPファイルでまとめての提出を推奨します。</div>
                </div>
              )}
              {deliveryMethod === 'url' && (
                <div className="req-status-modal-group">
                  <label className="req-status-modal-label">納品物のURL <span className="req-status-required">*</span></label>
                  <input type="url" value={deliveryUrl} onChange={(e) => setDeliveryUrl(e.target.value)} placeholder="https://gigafile.nu/..." required={deliveryMethod === 'url'} className="req-status-modal-input" />
                  <div className="req-status-modal-hint">※ギガファイル便、Google Drive、Dropboxなどの共有URLを入力してください</div>
                </div>
              )}
              <div className="req-status-modal-group">
                <label className="req-status-modal-label">納品メッセージ <span className="req-status-required">*</span></label>
                <textarea value={deliveryMessage} onChange={(e) => setDeliveryMessage(e.target.value)} placeholder="納品物の説明や依頼者への連絡事項を記入してください" required rows={6} maxLength={2000} className="req-status-modal-textarea" />
                <div className="req-status-modal-char-count">{deliveryMessage.length} / 2000</div>
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="req-status-progress">
                  <div className="req-status-progress-label">アップロード中... {uploadProgress}%</div>
                  <div className="req-status-progress-bar"><div className="req-status-progress-fill" style={{ width: `${uploadProgress}%` }}></div></div>
                </div>
              )}
              <div className="req-status-modal-info"><i className="fas fa-info-circle info"></i>納品後、依頼者が検収を行います。承認されると取引が完了します。</div>
              <div className="req-status-modal-buttons">
                <button type="button" onClick={() => { setShowDeliveryModal(false); setSelectedFile(null); setUploadProgress(0); }} disabled={processing} className="req-status-btn secondary">キャンセル</button>
                <button type="submit" disabled={processing || (uploadProgress > 0 && uploadProgress < 100)} className="req-status-btn primary">{processing ? 'アップロード中...' : '納品する'}</button>
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
                <textarea value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} placeholder={reviewAction === 'approve' ? '良かった点や感謝のメッセージを記入してください（任意）' : '修正が必要な点を具体的に記入してください'} required={reviewAction === 'reject'} rows={5} className="req-status-modal-textarea" />
              </div>
              {reviewAction === 'approve' && (
                <div className="req-status-modal-info"><i className="fas fa-check-circle success"></i>承認すると取引が完了し、クリエイターへの支払い処理が行われます。</div>
              )}
              {reviewAction === 'reject' && (
                <div className="req-status-modal-info"><i className="fas fa-exclamation-triangle warning"></i>差し戻すと、クリエイターが再度納品できる状態になります。</div>
              )}
              <div className="req-status-modal-buttons">
                <button type="button" onClick={() => setShowReviewModal(false)} disabled={processing} className="req-status-btn secondary">キャンセル</button>
                <button type="submit" disabled={processing} className="req-status-btn primary">{processing ? '処理中...' : reviewAction === 'approve' ? '承認する' : '差し戻す'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* キャンセルモーダル */}
      {showCancelModal && (
        <div className="req-status-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="req-status-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="req-status-modal-title">{cancelType === 'free' ? 'キャンセル申請' : 'キャンセル申請（納期超過）'}</h2>
            <form onSubmit={handleSubmitCancel}>
              <div className="req-status-modal-group">
                <label className="req-status-modal-label">キャンセル理由 <span className="req-status-required">*</span></label>
                <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="キャンセル理由を入力してください" required rows={5} className="req-status-modal-textarea" />
              </div>
              {cancelType === 'free' && (
                <div className="req-status-modal-info"><i className="fas fa-info-circle warning"></i>キャンセル申請を送信します。相手が同意すると契約が解除されます。<br />※相手が7日以内に応答しない場合、自動的にキャンセルされます。</div>
              )}
              {cancelType === 'overdue' && (
                <div className="req-status-modal-info"><i className="fas fa-exclamation-triangle danger"></i>納期超過のためキャンセル申請を行います。運営が内容を確認し、承認された場合は返金処理が行われます。</div>
              )}
              <div className="req-status-modal-buttons">
                <button type="button" onClick={() => setShowCancelModal(false)} disabled={processing} className="req-status-btn secondary">戻る</button>
                <button type="submit" disabled={processing} className="req-status-btn danger-solid">{processing ? '送信中...' : '申請する'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* キャンセル申請応答モーダル */}
      {showCancellationResponseModal && (
        <div className="req-status-modal-overlay" onClick={() => setShowCancellationResponseModal(false)}>
          <div className="req-status-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="req-status-modal-title">{cancellationResponseAction === 'approve' ? 'キャンセルに同意' : 'キャンセルを拒否'}</h2>
            <form onSubmit={handleCancellationResponse}>
              {cancellationResponseAction === 'approve' && (
                <div className="req-status-modal-info"><i className="fas fa-exclamation-triangle danger"></i>同意すると契約が解除されます。仮払い済みの場合は返金処理が行われます。</div>
              )}
              {cancellationResponseAction === 'reject' && (
                <div className="req-status-modal-info"><i className="fas fa-info-circle warning"></i>拒否すると、契約は継続されます。</div>
              )}
              <div className="req-status-modal-buttons">
                <button type="button" onClick={() => setShowCancellationResponseModal(false)} disabled={processing} className="req-status-btn secondary">戻る</button>
                <button type="submit" disabled={processing} className={cancellationResponseAction === 'approve' ? 'req-status-btn danger-solid' : 'req-status-btn primary'}>{processing ? '処理中...' : cancellationResponseAction === 'approve' ? '同意する' : '拒否する'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}