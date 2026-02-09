'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../../../utils/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '../../../../../components/Header'
import Footer from '../../../../../components/Footer'
import { createNotification } from '../../../../../../utils/notifications'
import styles from './page.module.css'

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
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string
  const contractId = params.contractId as string

  useEffect(() => {
    loadData()
  }, [])

  // モーダル表示時に背景スクロール固定
  useEffect(() => {
    if (showConfirmModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showConfirmModal])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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

    // 確認モーダルを表示
    setShowConfirmModal(true)
  }

  async function submitReview() {
    setShowConfirmModal(false)
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
        <Header />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.card}>
              {/* スケルトン：レビュー対象 */}
              <div className={styles.target}>
                <div className={`${styles.skeleton} ${styles.skeletonAvatar}`}></div>
                <div className={styles.targetInfo}>
                  <div className={`${styles.skeleton} ${styles.skeletonName}`}></div>
                  <div className={`${styles.skeleton} ${styles.skeletonRole}`}></div>
                </div>
              </div>
              {/* スケルトン：フォーム */}
              <div className={styles.skeletonForm}>
                <div className={`${styles.skeleton} ${styles.skeletonLabel}`}></div>
                <div className={`${styles.skeleton} ${styles.skeletonStars}`}></div>
                <div className={`${styles.skeleton} ${styles.skeletonLabel}`}></div>
                <div className={`${styles.skeleton} ${styles.skeletonTextarea}`}></div>
                <div className={styles.skeletonActions}>
                  <div className={`${styles.skeleton} ${styles.skeletonButton}`}></div>
                  <div className={`${styles.skeleton} ${styles.skeletonButton}`}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.error}>
              <i className="fas fa-exclamation-circle"></i>
              <h1 className={styles.errorTitle}>{error}</h1>
              <Link href={`/requests/${requestId}/contracts/${contractId}`} className={`${styles.btn} ${styles.primary}`}>
                契約詳細に戻る
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            {/* レビュー対象 */}
            <div className={styles.target}>
              <div className={styles.targetAvatar}>
                {reviewTarget?.avatar_url ? (
                  <Image src={reviewTarget.avatar_url} alt="" width={64} height={64} sizes="64px" />
                ) : (
                  <i className="fas fa-user"></i>
                )}
              </div>
              <div className={styles.targetInfo}>
                <h2 className={styles.targetName}>
                  {reviewTarget?.display_name || '名前未設定'}
                </h2>
                <div className={styles.targetRole}>
                  {isRequester ? 'クリエイター' : '依頼者'}
                </div>
              </div>
            </div>

            {existingReview ? (
              /* 既存のレビュー表示 */
              <div className={styles.existing}>
                <div className={styles.field}>
                  <label className={styles.label}>評価</label>
                  <div className={styles.existingStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <i
                        key={star}
                        className={`fas fa-star ${star <= existingReview.rating ? styles.active : ''}`}
                      ></i>
                    ))}
                  </div>
                </div>
                {existingReview.comment && (
                  <div className={styles.field}>
                    <label className={styles.label}>コメント</label>
                    <div className={styles.existingComment}>
                      {existingReview.comment}
                    </div>
                  </div>
                )}
                <p className={styles.existingDate}>
                  {formatDate(existingReview.created_at)}に投稿
                </p>
                <Link href={`/requests/${requestId}/contracts/${contractId}`} className={styles.backLink}>
                  <i className="fas fa-arrow-left"></i>
                  契約詳細に戻る
                </Link>
              </div>
            ) : (
              /* レビューフォーム */
              <form onSubmit={handleSubmitReview} className={styles.form}>
                {/* 星評価 */}
                <div className={styles.field}>
                  <label className={styles.label}>
                    評価<span className={styles.required}>*</span>
                  </label>
                  <div className={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`${styles.star} ${star <= (hoverRating || rating) ? styles.active : ''}`}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`${star}つ星`}
                      >
                        <i className="fas fa-star"></i>
                      </button>
                    ))}
                  </div>
                </div>

                {/* コメント */}
                <div className={styles.field}>
                  <label htmlFor="review-comment" className={styles.label}>コメント（任意）</label>
                  <textarea
                    id="review-comment"
                    name="review-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={isRequester 
                      ? '作品のクオリティ、対応の丁寧さ、納期遵守などについてコメントしてください' 
                      : 'コミュニケーション、要望の明確さ、スムーズな進行などについてコメントしてください'
                    }
                    rows={5}
                    className={styles.textarea}
                    maxLength={1000}
                  />
                  <div className={styles.charCount}>{comment.length}/1000</div>
                </div>

                {/* ボタン */}
                <div className={styles.actions}>
                  <Link 
                    href={`/requests/${requestId}/contracts/${contractId}`} 
                    className={`${styles.btn} ${styles.secondary}`}
                  >
                    キャンセル
                  </Link>
                  <button 
                    type="submit" 
                    disabled={submitting || rating === 0}
                    className={`${styles.btn} ${styles.primary}`}
                  >
                    {submitting ? '送信中...' : '送信する'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* 確認モーダル */}
      {showConfirmModal && (
        <div className={styles.modalOverlay} onClick={() => setShowConfirmModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>レビューを送信</h2>
            <p className={styles.modalText}>
              この内容でレビューを送信しますか？<br />
              送信後の変更はできません。
            </p>
            <div className={styles.modalPreview}>
              <div className={styles.previewStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <i
                    key={star}
                    className={`fas fa-star ${star <= rating ? styles.active : ''}`}
                  ></i>
                ))}
              </div>
              {comment && (
                <div className={styles.previewComment}>{comment}</div>
              )}
            </div>
            <div className={styles.modalButtons}>
              <button 
                type="button" 
                onClick={() => setShowConfirmModal(false)} 
                className={`${styles.btn} ${styles.secondary}`}
              >
                戻る
              </button>
              <button 
                type="button" 
                onClick={submitReview}
                disabled={submitting}
                className={`${styles.btn} ${styles.primary}`}
              >
                {submitting ? '送信中...' : '送信する'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}