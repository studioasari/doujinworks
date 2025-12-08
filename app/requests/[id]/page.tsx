'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { createNotification } from '../../../utils/notifications'

type WorkRequest = {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  category: string
  status: string
  request_type: string
  created_at: string
  requester_id: string
  selected_applicant_id: string | null
  final_price: number | null
  contracted_at: string | null
  paid_at: string | null
  delivered_at: string | null
  completed_at: string | null
  delivery_message: string | null
  profiles: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
}

type Application = {
  id: string
  message: string
  proposed_price: number | null
  proposed_deadline: string | null
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

type Review = {
  id: string
  rating: number
  comment: string | null
  reviewer_id: string
  reviewee_id: string
  created_at: string
}

export default function RequestDetailPage() {
  const [request, setRequest] = useState<WorkRequest | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [applicationMessage, setApplicationMessage] = useState('')
  const [proposedPrice, setProposedPrice] = useState('')
  const [hasApplied, setHasApplied] = useState(false)
  
  // 採用時の契約確定用
  const [showContractModal, setShowContractModal] = useState(false)
  const [contractPrice, setContractPrice] = useState('')
  const [contractDeadline, setContractDeadline] = useState('')
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null)
  
  // 納品用
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [deliveryMessage, setDeliveryMessage] = useState('')
  
  // 評価用
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [rating, setRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [hasReviewed, setHasReviewed] = useState(false)

  const router = useRouter()
  const params = useParams()
  const requestId = params.id as string

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentProfileId && requestId) {
      fetchRequest()
      fetchApplications()
      fetchReviews()
      
      // 決済成功時の処理
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('payment') === 'success') {
        handlePaymentSuccess()
      }
      
      // 自動仮払い処理
      if (urlParams.get('auto_payment') === 'true') {
        // URLパラメータを削除
        window.history.replaceState({}, '', `/requests/${requestId}`)
        // 少し待ってから仮払い処理を実行
        setTimeout(() => {
          handlePayment()
        }, 500)
      }
    }
  }, [currentProfileId, requestId])

  async function handlePaymentSuccess() {
    // URLパラメータを削除
    window.history.replaceState({}, '', `/requests/${requestId}`)
    
    // requestIdだけで動作させる
    const { data: currentRequest } = await supabase
      .from('work_requests')
      .select('*, profiles!work_requests_requester_id_fkey(id, username, display_name, avatar_url)')
      .eq('id', requestId)
      .single()
    
    if (!currentRequest) return
    
    // ステータスを更新
    const { error } = await supabase
      .from('work_requests')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('status', 'contracted') // 契約確定状態の時のみ更新

    if (!error) {
      // クリエイターに通知を送信
      if (currentRequest.selected_applicant_id) {
        await createNotification(
          currentRequest.selected_applicant_id,
          'paid',
          '仮払いが完了しました',
          `「${currentRequest.title}」の仮払いが完了しました。作業を開始してください。`,
          `/requests/${requestId}`
        )
      }

      alert('仮払いが完了しました！クリエイターが作業を開始できます。')
      fetchRequest()
    }
  }

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
    setLoading(true)

    const { data, error } = await supabase
      .from('work_requests')
      .select('*, profiles!work_requests_requester_id_fkey(id, username, display_name, avatar_url)')
      .eq('id', requestId)
      .single()

    if (error) {
      console.error('依頼取得エラー:', error)
    } else {
      setRequest(data)
    }

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
      
      const myApplication = data?.find(app => app.applicant_id === currentProfileId)
      setHasApplied(!!myApplication)
    }
  }

  async function fetchReviews() {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('work_request_id', requestId)

    if (error) {
      console.error('評価取得エラー:', error)
    } else {
      setReviews(data || [])
      
      const myReview = data?.find(r => r.reviewer_id === currentProfileId)
      setHasReviewed(!!myReview)
    }
  }

  async function handleSubmitApplication(e: React.FormEvent) {
    e.preventDefault()

    if (!applicationMessage.trim()) {
      alert('応募メッセージを入力してください')
      return
    }

    setProcessing(true)

    const { error } = await supabase
      .from('work_request_applications')
      .insert({
        work_request_id: requestId,
        applicant_id: currentProfileId,
        message: applicationMessage.trim(),
        proposed_price: proposedPrice ? parseInt(proposedPrice) : null,
        status: 'pending'
      })

    if (error) {
      console.error('応募エラー:', error)
      if (error.code === '23505') {
        alert('すでに応募済みです')
      } else {
        alert('応募に失敗しました')
      }
    } else {
      // 依頼者に通知を送信
      await createNotification(
        request!.requester_id,
        'application',
        '新しい応募が届きました',
        `「${request!.title}」に応募がありました`,
        `/requests/${requestId}`
      )

      alert('応募しました！')
      setShowApplicationForm(false)
      setApplicationMessage('')
      setProposedPrice('')
      fetchApplications()
    }

    setProcessing(false)
  }

  // 採用ボタンクリック → モーダル表示
  function handleAcceptApplicationClick(applicationId: string, applicantId: string, proposedPrice: number | null) {
    setSelectedApplicationId(applicationId)
    setSelectedApplicantId(applicantId)
    setContractPrice(proposedPrice?.toString() || request?.budget_max?.toString() || '')
    setContractDeadline(request?.deadline || '')
    setShowContractModal(true)
  }

  // 契約確定（採用処理）
  async function handleConfirmContract() {
    if (!contractPrice) {
      alert('金額を入力してください')
      return
    }

    if (!selectedApplicationId || !selectedApplicantId) {
      alert('エラー: 応募情報が見つかりません')
      return
    }

    setProcessing(true)

    try {
      // 1. 既存のチャットルームをチェック
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

      // 2. ルームがなければ新規作成
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
          alert(`チャットルーム作成エラー: ${roomError.message}`)
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

      // 3. 依頼カードメッセージを送信
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

      // 4. 依頼のステータスを「contracted（契約確定）」に更新
      await supabase
        .from('work_requests')
        .update({
          status: 'contracted',
          selected_applicant_id: selectedApplicantId,
          final_price: parseInt(contractPrice),
          deadline: contractDeadline || null,
          contracted_at: new Date().toISOString()
        })
        .eq('id', requestId)

      // 5. 応募のステータスを更新
      await supabase
        .from('work_request_applications')
        .update({ status: 'accepted' })
        .eq('id', selectedApplicationId)

      // 6. 他の応募を却下
      await supabase
        .from('work_request_applications')
        .update({ status: 'rejected' })
        .eq('work_request_id', requestId)
        .neq('id', selectedApplicationId)

      // クリエイターに通知を送信
      await createNotification(
        selectedApplicantId,
        'accepted',
        '応募が採用されました',
        `「${request!.title}」の応募が採用されました。仮払いをお待ちください。`,
        `/requests/${requestId}`
      )

      alert('契約を確定しました！仮払いページに移動します。')
      setShowContractModal(false)
      
      // 仮払いページに自動遷移するためのフラグ付きでリダイレクト
      window.location.href = `/requests/${requestId}?auto_payment=true`

    } catch (error) {
      console.error('契約確定エラー:', error)
      alert('契約の確定に失敗しました')
      setProcessing(false)
    }
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

  // 仮払い（Stripe Checkout）
  async function handlePayment() {
    setProcessing(true)

    try {
      // Stripe Checkout Session作成
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId }),
      })

      const data = await response.json()

      if (data.error) {
        alert(data.error)
        setProcessing(false)
        return
      }

      // Stripe CheckoutのURLに遷移
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('決済URLの取得に失敗しました')
        setProcessing(false)
      }
    } catch (error) {
      console.error('仮払いエラー:', error)
      alert('仮払いに失敗しました')
      setProcessing(false)
    }
  }

  // 納品
  async function handleDelivery() {
    if (!deliveryMessage.trim()) {
      alert('納品メッセージを入力してください')
      return
    }

    setProcessing(true)

    try {
      // 依頼ステータス更新（ファイルアップロードなし）
      const { error } = await supabase
        .from('work_requests')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          delivery_message: deliveryMessage.trim()
        })
        .eq('id', requestId)

      if (error) {
        console.error('納品エラー:', error)
        alert('納品に失敗しました')
      } else {
        // 依頼者に通知を送信
        await createNotification(
          request!.requester_id,
          'delivered',
          '納品されました',
          `「${request!.title}」が納品されました。検収をお願いします。`,
          `/requests/${requestId}`
        )

        alert('納品しました！依頼者の検収をお待ちください。')
        setShowDeliveryModal(false)
        setDeliveryMessage('')
        fetchRequest()
      }

    } catch (error) {
      console.error('納品処理エラー:', error)
      alert('納品処理に失敗しました')
    }

    setProcessing(false)
  }

  // 検収
  async function handleAcceptDelivery() {
    if (!confirm('納品物を確認して検収しますか？検収後、クリエイターへ入金されます。')) return

    setProcessing(true)

    const { error } = await supabase
      .from('work_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (error) {
      console.error('検収エラー:', error)
      alert('検収に失敗しました')
    } else {
      // クリエイターに通知を送信
      if (request?.selected_applicant_id) {
        await createNotification(
          request.selected_applicant_id,
          'completed',
          '検収が完了しました',
          `「${request.title}」の検収が完了しました。お疲れ様でした！`,
          `/requests/${requestId}`
        )
      }

      alert('検収完了しました！お互いに評価をお願いします。')
      fetchRequest()
    }

    setProcessing(false)
  }

  // 評価
  async function handleSubmitReview() {
    if (!reviewComment.trim()) {
      alert('コメントを入力してください')
      return
    }

    setProcessing(true)

    const revieweeId = request?.requester_id === currentProfileId 
      ? request?.selected_applicant_id 
      : request?.requester_id

    const { error } = await supabase
      .from('reviews')
      .insert({
        work_request_id: requestId,
        reviewer_id: currentProfileId,
        reviewee_id: revieweeId,
        rating: rating,
        comment: reviewComment.trim()
      })

    if (error) {
      console.error('評価エラー:', error)
      alert('評価の投稿に失敗しました')
    } else {
      // 相手に通知を送信
      if (revieweeId) {
        await createNotification(
          revieweeId,
          'review',
          '評価が投稿されました',
          `「${request!.title}」の評価が投稿されました（★${rating}）`,
          `/requests/${requestId}`
        )
      }

      alert('評価を投稿しました！')
      setShowReviewModal(false)
      setReviewComment('')
      fetchReviews()
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
      router.push('/requests')
    }

    setProcessing(false)
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

  function getStatusLabel(status: string) {
    const statuses: { [key: string]: string } = {
      open: '募集中',
      contracted: '契約確定',
      paid: '作業中',
      delivered: '納品済み',
      completed: '完了',
      cancelled: 'キャンセル'
    }
    return statuses[status] || '不明'
  }

  function getStatusColor(status: string) {
    const colors: { [key: string]: string } = {
      open: '#1A1A1A',
      contracted: '#4A4A4A',
      paid: '#6B6B6B',
      delivered: '#9E9E9E',
      completed: '#1A1A1A',
      cancelled: '#CCCCCC'
    }
    return colors[status] || '#9E9E9E'
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
              <Link href="/requests" className="btn-primary">依頼一覧に戻る</Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const isRequester = request.requester_id === currentProfileId
  const isCreator = request.selected_applicant_id === currentProfileId
  const canApply = request.status === 'open' && !isRequester && !hasApplied

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow" style={{ padding: '40px 20px' }}>
          <Link href="/requests" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '32px', fontSize: '14px', color: '#6B6B6B' }}>
            <i className="fas fa-arrow-left"></i>
            依頼一覧に戻る
          </Link>

          {/* ステータス別アクション */}
          {isRequester && request.status === 'contracted' && (
            <div className="card-no-hover p-24 mb-24" style={{ backgroundColor: '#F5F5F5', border: '1px solid #E5E5E5' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1A1A1A' }}>
                <i className="fas fa-credit-card" style={{ marginRight: '8px' }}></i>
                次のステップ: 仮払い
              </h3>
              <p style={{ fontSize: '14px', marginBottom: '8px', color: '#4A4A4A' }}>
                契約金額: <strong>{request.final_price?.toLocaleString()}円</strong>
              </p>
              <p style={{ fontSize: '14px', marginBottom: '16px', color: '#4A4A4A' }}>
                仮払いを行うと、クリエイターが作業を開始できます。
              </p>
              <button onClick={handlePayment} disabled={processing} className="btn-primary">
                {processing ? '処理中...' : '仮払いする'}
              </button>
            </div>
          )}

          {isCreator && request.status === 'paid' && (
            <div className="card-no-hover p-24 mb-24" style={{ backgroundColor: '#F5F5F5', border: '1px solid #E5E5E5' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1A1A1A' }}>
                <i className="fas fa-paint-brush" style={{ marginRight: '8px' }}></i>
                作業中
              </h3>
              <p style={{ fontSize: '14px', marginBottom: '16px', color: '#4A4A4A' }}>
                仮払いが完了しています。作業が完了したら納品してください。
              </p>
              <button onClick={() => setShowDeliveryModal(true)} className="btn-primary">
                納品する
              </button>
            </div>
          )}

          {isRequester && request.status === 'delivered' && (
            <div className="card-no-hover p-24 mb-24" style={{ backgroundColor: '#F5F5F5', border: '1px solid #E5E5E5' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1A1A1A' }}>
                <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
                次のステップ: 検収
              </h3>
              <p style={{ fontSize: '14px', marginBottom: '16px', color: '#4A4A4A' }}>
                納品物を確認して、問題なければ検収してください。
              </p>
              <button onClick={handleAcceptDelivery} disabled={processing} className="btn-primary">
                {processing ? '処理中...' : '検収する'}
              </button>
            </div>
          )}

          {request.status === 'completed' && !hasReviewed && (
            <div className="card-no-hover p-24 mb-24" style={{ backgroundColor: '#F5F5F5', border: '1px solid #E5E5E5' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1A1A1A' }}>
                <i className="fas fa-star" style={{ marginRight: '8px' }}></i>
                評価をお願いします
              </h3>
              <p style={{ fontSize: '14px', marginBottom: '16px', color: '#4A4A4A' }}>
                お仕事が完了しました。相手の評価をお願いします。
              </p>
              <button onClick={() => setShowReviewModal(true)} className="btn-primary">
                評価する
              </button>
            </div>
          )}

          {/* 依頼詳細 */}
          <div className="card-no-hover p-40 mb-24">
            <div className="flex gap-8 mb-24" style={{ flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '4px', fontSize: '14px', fontWeight: '600', backgroundColor: getStatusColor(request.status), color: '#FFFFFF' }}>
                {getStatusLabel(request.status)}
              </span>
              <span className="badge badge-category" style={{ padding: '6px 16px', fontSize: '14px' }}>
                {getCategoryLabel(request.category)}
              </span>
            </div>

            <h1 className="section-title mb-24">{request.title}</h1>

            <div className="flex gap-12 mb-32" style={{ alignItems: 'center', paddingBottom: '24px', borderBottom: '1px solid #E5E5E5' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#6B6B6B', overflow: 'hidden', flexShrink: 0 }}>
                {request.profiles?.avatar_url ? (
                  <img src={request.profiles.avatar_url} alt={request.profiles.display_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  request.profiles?.display_name?.charAt(0) || '?'
                )}
              </div>
              <div>
                <div className="text-tiny text-gray">依頼者</div>
                {request.profiles?.username ? (
                  <Link href={`/creators/${request.profiles.username}`} style={{ textDecoration: 'none', fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>
                    {request.profiles.display_name || '名前未設定'}
                  </Link>
                ) : (
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>
                    {request.profiles?.display_name || '名前未設定'}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-32">
              <h2 className="card-title mb-12">依頼内容</h2>
              <p className="text-small" style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {request.description}
              </p>
            </div>

            {request.delivery_message && (
              <div className="mb-32">
                <h2 className="card-title mb-12">納品メッセージ</h2>
                <div style={{ padding: '16px', backgroundColor: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: '8px' }}>
                  <p className="text-small" style={{ lineHeight: '1.7', whiteSpace: 'pre-wrap', color: '#1A1A1A' }}>
                    {request.delivery_message}
                  </p>
                  <div className="text-tiny" style={{ marginTop: '12px', color: '#6B6B6B' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                    納品ファイルはチャットをご確認ください
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', padding: '24px', backgroundColor: '#F9F9F9', borderRadius: '8px' }}>
              {request.final_price ? (
                <div>
                  <div className="text-tiny text-gray" style={{ marginBottom: '4px' }}>確定金額</div>
                  <div className="card-subtitle">{request.final_price.toLocaleString()}円</div>
                </div>
              ) : (request.budget_min || request.budget_max) && (
                <div>
                  <div className="text-tiny text-gray" style={{ marginBottom: '4px' }}>予算</div>
                  <div className="card-subtitle">
                    {request.budget_min?.toLocaleString() || '未設定'}円 〜 {request.budget_max?.toLocaleString() || '未設定'}円
                  </div>
                </div>
              )}
              {request.deadline && (
                <div>
                  <div className="text-tiny text-gray" style={{ marginBottom: '4px' }}>納期</div>
                  <div className="card-subtitle">{formatDate(request.deadline)}</div>
                </div>
              )}
              <div>
                <div className="text-tiny text-gray" style={{ marginBottom: '4px' }}>投稿日</div>
                <div className="card-subtitle">{formatDate(request.created_at)}</div>
              </div>
            </div>
          </div>

          {/* 評価表示 */}
          {reviews.length > 0 && (
            <div className="card-no-hover p-40 mb-24">
              <h2 className="card-title mb-24">評価</h2>
              <div className="flex flex-col gap-16">
                {reviews.map((review) => (
                  <div key={review.id} style={{ padding: '16px', border: '1px solid #E5E5E5', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i 
                          key={star} 
                          className={star <= review.rating ? 'fas fa-star' : 'far fa-star'}
                          style={{ color: '#F59E0B', fontSize: '16px' }}
                        ></i>
                      ))}
                    </div>
                    <p className="text-small" style={{ lineHeight: '1.7' }}>
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canApply && (
            <div className="mb-32">
              <button onClick={() => setShowApplicationForm(!showApplicationForm)} className="btn-primary" style={{ width: '100%' }}>
                <i className="fas fa-paper-plane" style={{ marginRight: '8px' }}></i>
                この依頼に応募する
              </button>
            </div>
          )}

          {hasApplied && !isRequester && (
            <div className="mb-32" style={{ padding: '16px', backgroundColor: '#F5F5F5', borderRadius: '8px', border: '1px solid #E5E5E5', color: '#1A1A1A', textAlign: 'center' }}>
              <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
              応募済みです
            </div>
          )}

          {showApplicationForm && (
            <div className="card-no-hover p-40 mb-32">
              <h2 className="card-title mb-24">応募する</h2>
              <form onSubmit={handleSubmitApplication}>
                <div className="mb-24">
                  <label className="form-label">
                    応募メッセージ <span className="form-required">*</span>
                  </label>
                  <textarea value={applicationMessage} onChange={(e) => setApplicationMessage(e.target.value)} placeholder="自己紹介や実績、この依頼への意気込みなどを記入してください" required rows={6} className="textarea-field" />
                </div>

                <div className="mb-32">
                  <label className="form-label">希望金額</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="number" value={proposedPrice} onChange={(e) => setProposedPrice(e.target.value)} placeholder="希望する金額" min="0" className="input-field" style={{ flex: 1 }} />
                    <span className="text-gray">円</span>
                  </div>
                </div>

                <div className="flex gap-16" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowApplicationForm(false)} disabled={processing} className="btn-secondary">
                    キャンセル
                  </button>
                  <button type="submit" disabled={processing} className="btn-primary">
                    {processing ? '送信中...' : '応募する'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {isRequester && applications.length > 0 && request.status === 'open' && (
            <div className="card-no-hover p-40">
              <h2 className="card-title mb-24">応募一覧 ({applications.length}件)</h2>

              <div className="flex flex-col gap-24">
                {applications.map((app) => (
                  <div key={app.id} style={{ padding: '24px', border: '1px solid #E5E5E5', borderRadius: '8px', backgroundColor: app.status === 'accepted' ? '#F9F9F9' : '#FFFFFF' }}>
                    <div className="flex gap-12 mb-16" style={{ alignItems: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#6B6B6B', overflow: 'hidden', flexShrink: 0 }}>
                        {app.profiles?.avatar_url ? (
                          <img src={app.profiles.avatar_url} alt={app.profiles.display_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          app.profiles?.display_name?.charAt(0) || '?'
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        {app.profiles?.username ? (
                          <Link href={`/creators/${app.profiles.username}`} style={{ textDecoration: 'none', fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>
                            {app.profiles.display_name || '名前未設定'}
                          </Link>
                        ) : (
                          <div style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>
                            {app.profiles?.display_name || '名前未設定'}
                          </div>
                        )}
                        <div className="text-tiny text-gray">{formatDate(app.created_at)}</div>
                      </div>
                      {app.status === 'accepted' && (
                        <span style={{ padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>採用済み</span>
                      )}
                      {app.status === 'rejected' && (
                        <span style={{ padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', backgroundColor: '#CCCCCC', color: '#6B6B6B' }}>却下済み</span>
                      )}
                    </div>

                    <p className="text-small mb-16" style={{ lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{app.message}</p>

                    {app.proposed_price && (
                      <div className="mb-12 text-small">
                        <strong>希望金額:</strong> {app.proposed_price.toLocaleString()}円
                      </div>
                    )}

                    {app.status === 'pending' && (
                      <div className="flex gap-12" style={{ justifyContent: 'flex-end' }}>
                        <button onClick={() => handleRejectApplication(app.id)} disabled={processing} className="btn-secondary" style={{ fontSize: '14px', padding: '8px 16px' }}>却下</button>
                        <button onClick={() => handleAcceptApplicationClick(app.id, app.applicant_id, app.proposed_price)} disabled={processing} className="btn-primary" style={{ fontSize: '14px', padding: '8px 16px' }}>採用する</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isRequester && request.status === 'open' && (
            <div className="flex gap-16 mt-24" style={{ justifyContent: 'flex-end' }}>
              <button onClick={handleCancelRequest} disabled={processing} className="btn-danger">依頼をキャンセル</button>
            </div>
          )}
        </div>
      </div>

      {/* 契約確定モーダル（採用時に使用） */}
      {showContractModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowContractModal(false)}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', maxWidth: '500px', width: '100%', padding: '32px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>契約を確定</h2>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">
                確定金額 <span className="form-required">*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="number" value={contractPrice} onChange={(e) => setContractPrice(e.target.value)} placeholder="金額を入力" min="0" required className="input-field" style={{ flex: 1 }} />
                <span>円</span>
              </div>
              {contractPrice && parseInt(contractPrice) > 0 && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#F9F9F9', borderRadius: '8px', fontSize: '13px' }}>
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
              <label className="form-label">納期</label>
              <input type="date" value={contractDeadline} onChange={(e) => setContractDeadline(e.target.value)} min={new Date().toISOString().split('T')[0]} className="input-field" />
            </div>

            <div style={{ padding: '12px', backgroundColor: '#F9F9F9', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6', color: '#4A4A4A' }}>
              <i className="fas fa-info-circle" style={{ marginRight: '8px', color: '#6B6B6B' }}></i>
              契約確定後、仮払いを行うとクリエイターが作業を開始できます。
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowContractModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                キャンセル
              </button>
              <button onClick={handleConfirmContract} disabled={processing} className="btn-primary" style={{ flex: 1 }}>
                {processing ? '処理中...' : '採用して契約確定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 納品モーダル */}
      {showDeliveryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowDeliveryModal(false)}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', maxWidth: '600px', width: '100%', padding: '32px', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>納品する</h2>

            <div style={{ padding: '16px', backgroundColor: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1A1A1A' }}>
                <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                ファイルについて
              </div>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#4A4A4A', margin: 0 }}>
                納品ファイルは<strong>チャットで送信</strong>してください。<br />
                こちらのフォームでは納品の報告のみ行います。
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label className="form-label">
                納品メッセージ <span className="form-required">*</span>
              </label>
              <textarea value={deliveryMessage} onChange={(e) => setDeliveryMessage(e.target.value)} placeholder="納品物についての説明や、チャットで送信したファイルについて記入してください" required rows={5} className="textarea-field" />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowDeliveryModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                キャンセル
              </button>
              <button onClick={handleDelivery} disabled={processing} className="btn-primary" style={{ flex: 1 }}>
                {processing ? '納品中...' : '納品する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 評価モーダル */}
      {showReviewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowReviewModal(false)}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', maxWidth: '500px', width: '100%', padding: '32px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>評価する</h2>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">評価</label>
              <div style={{ display: 'flex', gap: '8px', fontSize: '32px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <i 
                    key={star}
                    className={star <= rating ? 'fas fa-star' : 'far fa-star'}
                    onClick={() => setRating(star)}
                    style={{ color: '#F59E0B', cursor: 'pointer' }}
                  ></i>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label className="form-label">
                コメント <span className="form-required">*</span>
              </label>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="お仕事の感想をお願いします" required rows={4} className="textarea-field" />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowReviewModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                キャンセル
              </button>
              <button onClick={handleSubmitReview} disabled={processing} className="btn-primary" style={{ flex: 1 }}>
                {processing ? '送信中...' : '評価を投稿'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}