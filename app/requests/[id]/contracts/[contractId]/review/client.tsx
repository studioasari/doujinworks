'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../../../utils/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../../../../components/Header'
import Footer from '../../../../../components/Footer'
import { createNotification } from '../../../../../../utils/notifications'

type ReviewTarget = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

type ExistingReview = {
  id: string
  rating: number
  comment: string | null
  created_at: string
}

export default function ReviewClient() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null)
  const [isRequester, setIsRequester] = useState(false)
  const [requestTitle, setRequestTitle] = useState<string>('')
  const [workRequestId, setWorkRequestId] = useState<string>('')
  
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [comment, setComment] = useState<string>('')
  const [error, setError] = useState<string>('')

  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string
  const contractId = params.contractId as string

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  async function checkAuthAndLoadData() {
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
    
    if (!profile) {
      setError('プロフィールが見つかりません')
      setLoading(false)
      return
    }

    setCurrentProfileId(profile.id)
    await loadContractData(profile.id)
  }

  async function loadContractData(profileId: string) {
    const { data: contract, error: contractError } = await supabase
      .from('work_contracts')
      .select(`
        *,
        work_request:work_requests!work_contracts_work_request_id_fkey(
          id,
          title,
          requester_id,
          requester:profiles!work_requests_requester_id_fkey(id, username, display_name, avatar_url)
        ),
        contractor:profiles!work_contracts_contractor_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      setError('契約が見つかりません')
      setLoading(false)
      return
    }

    const workRequest = contract.work_request as any
    const requesterId = workRequest?.requester_id
    const contractorId = contract.contractor_id

    const isReq = requesterId === profileId
    const isCon = contractorId === profileId

    if (!isReq && !isCon) {
      setError('この契約にアクセスする権限がありません')
      setLoading(false)
      return
    }

    if (contract.status !== 'completed') {
      setError('契約が完了していないためレビューできません')
      setLoading(false)
      return
    }

    setIsRequester(isReq)
    setRequestTitle(workRequest?.title || '')
    setWorkRequestId(workRequest?.id || '')

    if (isReq) {
      setReviewTarget({
        id: contract.contractor.id,
        username: contract.contractor.username,
        display_name: contract.contractor.display_name,
        avatar_url: contract.contractor.avatar_url
      })
    } else {
      setReviewTarget({
        id: workRequest?.requester?.id,
        username: workRequest?.requester?.username,
        display_name: workRequest?.requester?.display_name,
        avatar_url: workRequest?.requester?.avatar_url
      })
    }

    const { data: existingReviewData } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at')
      .eq('work_contract_id', contractId)
      .eq('reviewer_id', profileId)
      .single()

    if (existingReviewData) {
      setExistingReview(existingReviewData)
      setRating(existingReviewData.rating)
      setComment(existingReviewData.comment || '')
    }

    setLoading(false)
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()

    if (rating === 0) {
      alert('評価を選択してください')
      return
    }

    if (existingReview) {
      alert('既にレビュー済みです')
      return
    }

    setSubmitting(true)

    try {
      const { error: insertError } = await supabase
        .from('reviews')
        .insert({
          work_request_id: workRequestId,
          work_contract_id: contractId,
          reviewer_id: currentProfileId,
          reviewee_id: reviewTarget!.id,
          rating: rating,
          comment: comment.trim() || null,
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('レビュー送信エラー:', insertError)
        throw new Error('レビューの送信に失敗しました')
      }

      await createNotification(
        reviewTarget!.id,
        'review',
        'レビューが届きました',
        `「${requestTitle}」のレビューが届きました。`,
        `/creators/${reviewTarget!.username}`
      )

      alert('レビューを送信しました！')
      router.push(`/requests/${requestId}/contracts/${contractId}`)
    } catch (err: any) {
      console.error('レビュー送信エラー:', err)
      alert(err.message || 'レビューの送信に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <Header />
        <div className="review-page">
          <div className="review-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <span>読み込み中...</span>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (error) {
    return (
      <>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <Header />
        <div className="review-page">
          <div className="review-error">
            <i className="fas fa-exclamation-circle"></i>
            <h1>{error}</h1>
            <Link href={`/requests/${requestId}/contracts/${contractId}`} className="review-link-btn">
              契約詳細に戻る
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      <div className="review-page">
        <div className="review-container">
          {/* レビュー対象 */}
          <div className="review-target">
            <div className="review-target-avatar">
              {reviewTarget?.avatar_url ? (
                <img src={reviewTarget.avatar_url} alt="" />
              ) : (
                <i className="fas fa-user"></i>
              )}
            </div>
            <div className="review-target-info">
              <div className="review-target-name">
                {reviewTarget?.display_name || '名前未設定'}
              </div>
              <div className="review-target-role">
                {isRequester ? 'クリエイター' : '依頼者'}
              </div>
            </div>
          </div>

          {existingReview ? (
            /* 既存のレビュー表示 */
            <div className="review-existing">
              <div className="review-field">
                <label className="review-label">評価</label>
                <div className="review-existing-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i
                      key={star}
                      className={`fas fa-star ${star <= existingReview.rating ? 'active' : ''}`}
                    ></i>
                  ))}
                </div>
              </div>
              {existingReview.comment && (
                <div className="review-field">
                  <label className="review-label">コメント</label>
                  <div className="review-existing-comment">
                    {existingReview.comment}
                  </div>
                </div>
              )}
              <p className="review-existing-date">
                {formatDate(existingReview.created_at)}に投稿
              </p>
            </div>
          ) : (
            /* レビューフォーム */
            <form onSubmit={handleSubmitReview} className="review-form">
              {/* 星評価 */}
              <div className="review-field">
                <label className="review-label">評価 <span className="review-required">*</span></label>
                <div className="review-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`review-star ${star <= (hoverRating || rating) ? 'active' : ''}`}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      <i className="fas fa-star"></i>
                    </button>
                  ))}
                </div>
              </div>

              {/* コメント */}
              <div className="review-field">
                <label className="review-label">コメント（任意）</label>
                <div className="review-textarea-wrap">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={isRequester 
                      ? '作品のクオリティ、対応の丁寧さ、納期遵守などについてコメントしてください' 
                      : 'コミュニケーション、要望の明確さ、スムーズな進行などについてコメントしてください'
                    }
                    rows={5}
                    className="review-textarea"
                    maxLength={1000}
                  />
                </div>
                <div className="review-char-count">{comment.length}/1000</div>
              </div>

              {/* ボタン */}
              <div className="review-actions">
                <Link 
                  href={`/requests/${requestId}/contracts/${contractId}`} 
                  className="review-cancel"
                  style={{
                    flex: 1,
                    display: 'block',
                    padding: '14px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 700,
                    textAlign: 'center',
                    textDecoration: 'none',
                    color: '#555555'
                  }}
                >
                  キャンセル
                </Link>
                <button 
                  type="submit" 
                  disabled={submitting || rating === 0}
                  className="review-submit"
                >
                  {submitting ? '送信中...' : '送信する'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <Footer />

      <style jsx>{`
        .review-page {
          min-height: calc(100vh - 140px);
          background: #E8ECEF;
          padding: 40px 16px;
        }

        .review-container {
          max-width: 500px;
          margin: 0 auto;
          background: #E8ECEF;
          border-radius: 16px;
          padding: 28px 24px;
          box-shadow: inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff;
        }

        .review-loading,
        .review-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
          color: #555555;
        }

        .review-error i {
          font-size: 48px;
          color: #C05656;
        }

        .review-error h1 {
          font-size: 18px;
          font-weight: 700;
          color: #222222;
        }

        .review-link-btn {
          padding: 12px 24px;
          background: #5B7C99;
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
        }

        /* レビュー対象 */
        .review-target {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 28px;
        }

        .review-target-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #E8ECEF;
          box-shadow: inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .review-target-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .review-target-avatar i {
          font-size: 22px;
          color: #888888;
        }

        .review-target-info {
          flex: 1;
        }

        .review-target-name {
          font-size: 16px;
          font-weight: 700;
          color: #222222;
        }

        .review-target-role {
          font-size: 13px;
          color: #555555;
          margin-top: 2px;
        }

        /* フォーム */
        .review-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .review-field {
        }

        .review-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #222222;
          margin-bottom: 10px;
        }

        .review-required {
          color: #C05656;
        }

        /* 星評価 */
        .review-stars {
          display: flex;
          gap: 6px;
        }

        .review-star {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          font-size: 36px;
          color: #D0D5DA;
          transition: color 0.15s, transform 0.15s;
          line-height: 1;
        }

        .review-star:hover {
          transform: scale(1.1);
        }

        .review-star.active {
          color: #C7A23A;
        }

        /* テキストエリア */
        .review-textarea-wrap {
          background: #E8ECEF;
          border-radius: 8px;
          box-shadow: inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff;
        }

        .review-textarea {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
          min-height: 120px;
          font-family: inherit;
          color: #222222;
          background: transparent;
        }

        .review-textarea::placeholder {
          color: #888888;
        }

        .review-textarea:focus {
          outline: none;
        }

        .review-char-count {
          text-align: right;
          font-size: 12px;
          color: #888888;
          margin-top: 6px;
        }

        /* ボタン */
        .review-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }

        .review-cancel {
          flex: 1;
          display: block;
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          text-decoration: none;
          color: #555555;
          background: #E8ECEF;
          box-shadow: 3px 3px 6px #c5c9cc, -3px -3px 6px #ffffff;
          transition: box-shadow 0.2s;
        }

        .review-cancel:hover {
          box-shadow: inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff;
        }

        .review-submit {
          flex: 1;
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          text-align: center;
          border: none;
          background: #5B7C99;
          color: #FFFFFF;
          transition: background 0.2s;
        }

        .review-submit:hover:not(:disabled) {
          background: #4F6D86;
        }

        .review-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* 既存レビュー表示 */
        .review-existing {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .review-existing-stars {
          display: flex;
          gap: 6px;
        }

        .review-existing-stars i {
          font-size: 32px;
          color: #D0D5DA;
        }

        .review-existing-stars i.active {
          color: #C7A23A;
        }

        .review-existing-comment {
          font-size: 14px;
          color: #222222;
          line-height: 1.7;
          background: #E8ECEF;
          padding: 14px;
          border-radius: 8px;
          box-shadow: inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff;
        }

        .review-existing-date {
          font-size: 13px;
          color: #888888;
          margin: 0;
        }

        @media (max-width: 640px) {
          .review-page {
            padding: 24px 16px;
          }

          .review-container {
            padding: 24px 20px;
          }

          .review-star {
            font-size: 32px;
          }
        }
      `}</style>
    </>
  )
}