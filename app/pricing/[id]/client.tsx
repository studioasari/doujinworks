'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { useAuth } from '@/app/components/AuthContext'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import styles from './page.module.css'

type Creator = {
  id: string
  user_id: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
}

type PricingPlan = {
  id: string
  creator_id: string
  category: string
  plan_name: string
  thumbnail_url: string
  sample_images: { url: string; order: number }[]
  minimum_price: number
  description: string
  is_public: boolean
  display_order: number
  created_at: string
}

const CATEGORIES = [
  { value: 'illustration', label: 'イラスト', icon: 'fas fa-image' },
  { value: 'manga', label: 'マンガ', icon: 'fas fa-book' },
  { value: 'novel', label: '小説', icon: 'fas fa-file-alt' },
  { value: 'music', label: '音楽', icon: 'fas fa-music' },
  { value: 'voice', label: 'ボイス', icon: 'fas fa-microphone' },
  { value: 'video', label: '動画', icon: 'fas fa-video' },
  { value: 'other', label: 'その他', icon: 'fas fa-ellipsis-h' }
]

const REPORT_REASONS = [
  { value: 'spam', label: 'スパム・宣伝目的' },
  { value: 'fraud', label: '詐欺・不正行為の疑い' },
  { value: 'inappropriate', label: '不適切なコンテンツ' },
  { value: 'illegal', label: '違法な内容' },
  { value: 'harassment', label: '嫌がらせ・誹謗中傷' },
  { value: 'copyright', label: '著作権侵害の疑い' },
  { value: 'other', label: 'その他の規約違反' }
]

function getCategoryInfo(category: string | null) {
  if (!category) return { label: 'その他', icon: 'fas fa-ellipsis-h' }
  return CATEGORIES.find(c => c.value === category) || { label: category, icon: 'fas fa-ellipsis-h' }
}

export default function PricingDetailClient() {
  const params = useParams()
  const planId = params.id as string
  const { requireAuth } = useAuth()

  const [plan, setPlan] = useState<PricingPlan | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // シェア
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  // 通報
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportContent, setReportContent] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)

  useEffect(() => {
    if (plan && creator) {
      document.title = `${plan.plan_name} - ${creator.display_name || creator.username} | 同人ワークス`
    }
  }, [plan, creator])

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (planId) {
      fetchPlanAndCreator()
    }
  }, [planId])

  // モーダル表示中は背景スクロール禁止
  useEffect(() => {
    if (showReportModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showReportModal])

  // シェアドロップダウン外側クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (isShareDropdownOpen && !target.closest('.share-dropdown-container')) {
        setIsShareDropdownOpen(false)
      }
    }
    if (isShareDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isShareDropdownOpen])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setIsLoggedIn(true)
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
    if (profile) setCurrentProfileId(profile.id)
  }

  async function fetchPlanAndCreator() {
    setLoading(true)

    const { data: planData, error: planError } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_public', true)
      .maybeSingle()

    if (planError) {
      console.error('料金プラン取得エラー:', planError)
      setPlan(null)
      setLoading(false)
      return
    }

    if (!planData) {
      setPlan(null)
      setLoading(false)
      return
    }

    setPlan(planData)

    const { data: creatorData, error: creatorError } = await supabase
      .from('profiles')
      .select('id, user_id, username, display_name, bio, avatar_url')
      .eq('id', planData.creator_id)
      .maybeSingle()

    if (creatorError) {
      console.error('クリエイター取得エラー:', creatorError)
      setCreator(null)
    } else if (!creatorData) {
      setCreator(null)
    } else {
      setCreator(creatorData)
    }

    setLoading(false)
  }

  function handleShare(platform: 'twitter' | 'facebook' | 'line' | 'copy') {
    const url = window.location.href
    const text = plan?.plan_name || '料金プラン'

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
        break
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
        break
      case 'line':
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text + ' ' + url)}`, '_blank')
        break
      case 'copy':
        navigator.clipboard.writeText(url).then(() => {
          setCopySuccess(true)
          setTimeout(() => setCopySuccess(false), 2000)
        }).catch(() => {
          const textArea = document.createElement('textarea')
          textArea.value = url
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          setCopySuccess(true)
          setTimeout(() => setCopySuccess(false), 2000)
        })
        return
    }
    setIsShareDropdownOpen(false)
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault()
    if (!reportReason) {
      alert('報告理由を選択してください')
      return
    }

    setSubmittingReport(true)
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: currentProfileId || null,
        report_type: 'pricing_plan',
        target_request_id: planId,
        reason: reportReason,
        description: reportContent.trim() || null,
        status: 'pending'
      })

      if (error) throw error

      alert('通報を送信しました。ご協力ありがとうございます。')
      setShowReportModal(false)
      setReportReason('')
      setReportContent('')
    } catch (error) {
      console.error('通報エラー:', error)
      alert('通報の送信に失敗しました')
    }
    setSubmittingReport(false)
  }

  const allImages = plan ? [
    { url: plan.thumbnail_url, order: 0 },
    ...(plan.sample_images || [])
  ].sort((a, b) => a.order - b.order) : []

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.header}>
              <div className={styles.skeleton} style={{ height: '1.5rem', width: '80px', borderRadius: '999px', marginBottom: 'var(--space-2)' }}></div>
              <div className={styles.skeleton} style={{ height: '2rem', width: '70%' }}></div>
            </div>
            <div className={styles.layout}>
              <div className={styles.main}>
                <div className={styles.skeleton} style={{ aspectRatio: '1.91 / 1', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-3)' }}></div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className={styles.skeleton} style={{ width: '72px', height: '72px', borderRadius: 'var(--radius-md)', flexShrink: 0 }}></div>
                  ))}
                </div>
                <div className={styles.skeleton} style={{ height: '200px', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-5)' }}></div>
                <div className={styles.skeleton} style={{ height: '72px', borderRadius: 'var(--radius-lg)' }}></div>
              </div>
              <div className={styles.sidebar}>
                <div className={styles.skeleton} style={{ height: '160px', borderRadius: 'var(--radius-lg)' }}></div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!plan || !creator) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.error}>
              <div className={styles.errorContent}>
                <i className="fas fa-exclamation-circle"></i>
                <h1>料金プランが見つかりません</h1>
                <p>このプランは存在しないか、非公開になっています。</p>
                <Link href="/" className="btn btn-primary">
                  トップページに戻る
                </Link>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const categoryInfo = getCategoryInfo(plan.category)

  return (
    <>
      <Header />

      <div className={styles.page}>
        <div className={styles.container}>
          {/* ヘッダー（2カラムの外） */}
          <div className={styles.header}>
            <span className="badge badge-accent">
              <i className={categoryInfo.icon}></i> {categoryInfo.label}
            </span>
            <h1 className={styles.title}>{plan.plan_name}</h1>
          </div>

          <div className={styles.layout}>
            {/* メインコンテンツ */}
            <div className={styles.main}>
              {/* 画像ギャラリー */}
              <div className={styles.gallery}>
                <div className={styles.mainImage}>
                  {allImages.length > 0 && (
                    <Image
                      src={allImages[currentImageIndex].url}
                      alt={plan.plan_name}
                      fill
                      priority
                    />
                  )}
                </div>

                {allImages.length > 1 && (
                  <div className={styles.thumbs}>
                    {allImages.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`${styles.thumb} ${currentImageIndex === index ? styles.active : ''}`}
                      >
                        <Image
                          src={img.url}
                          alt={`サンプル ${index + 1}`}
                          fill
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* プラン詳細 */}
              <div className={styles.detailSection}>
                <h2 className={styles.sectionTitle}>プランの詳細</h2>
                <div className={styles.description}>
                  {plan.description.split('\n').map((line, i) => (
                    <p key={i}>{line || <br />}</p>
                  ))}
                </div>
              </div>

              {/* クリエイター情報 */}
              <Link href={`/creators/${creator.username}`} className={styles.creatorSection}>
                <div className={styles.avatar}>
                  {creator.avatar_url ? (
                    <Image
                      src={creator.avatar_url}
                      alt={creator.display_name || ''}
                      width={48}
                      height={48}
                    />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </div>
                <div className={styles.creatorInfo}>
                  <span className={styles.creatorName}>
                    {creator.display_name || '名前未設定'}
                  </span>
                  <span className={styles.creatorMeta}>
                    @{creator.username}
                  </span>
                </div>
                <i className="fas fa-chevron-right" style={{ color: 'var(--text-tertiary)' }}></i>
              </Link>
            </div>

            {/* サイドバー */}
            <div className={styles.sidebar}>
              <div className={styles.actionCard}>
                {/* 料金 */}
                <div className={styles.priceSection}>
                  <div className={styles.priceLabel}>料金</div>
                  <div className={styles.priceValue}>
                    ¥{plan.minimum_price.toLocaleString()}<span className={styles.priceSuffix}>〜</span>
                  </div>
                </div>

                {/* 依頼を送るボタン */}
                {isLoggedIn ? (
                  <Link
                    href={`/requests/create?to=${creator.username}&plan=${plan.id}`}
                    className={`${styles.btn} ${styles.primary} ${styles.full}`}
                  >
                    <i className="fas fa-paper-plane"></i>
                    このプランで依頼を送る
                  </Link>
                ) : (
                  <button
                    onClick={() => requireAuth()}
                    className={`${styles.btn} ${styles.primary} ${styles.full}`}
                  >
                    <i className="fas fa-paper-plane"></i>
                    このプランで依頼を送る
                  </button>
                )}
              </div>

              {/* シェア & 通報 */}
              <div className={styles.sidebarFooter}>
                <div className={`${styles.shareContainer} share-dropdown-container`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsShareDropdownOpen(!isShareDropdownOpen) }}
                    className={styles.shareBtn}
                  >
                    <i className="fas fa-share-alt"></i>
                    シェア
                  </button>
                  {isShareDropdownOpen && (
                    <div className={styles.shareDropdown}>
                      <button onClick={() => handleShare('twitter')} className={styles.shareItem}>
                        <i className="fab fa-x-twitter"></i>
                        X
                      </button>
                      <button onClick={() => handleShare('facebook')} className={styles.shareItem}>
                        <i className="fab fa-facebook" style={{ color: '#1877F2' }}></i>
                        Facebook
                      </button>
                      <button onClick={() => handleShare('line')} className={styles.shareItem}>
                        <i className="fab fa-line" style={{ color: '#00B900' }}></i>
                        LINE
                      </button>
                      <button onClick={() => handleShare('copy')} className={styles.shareItem}>
                        <i className="fas fa-link"></i>
                        {copySuccess ? 'コピーしました！' : 'URLをコピー'}
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowReportModal(true)} className={styles.reportLink}>
                  <i className="fas fa-flag"></i>
                  このプランを通報する
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 通報モーダル */}
      {showReportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowReportModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>運営に規約違反を通報する</h3>
              <button className={styles.modalClose} onClick={() => setShowReportModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSubmitReport}>
              <div className={styles.modalBody}>
                <div className={styles.modalGroup}>
                  <label className={styles.modalLabel} htmlFor="report-reason">
                    報告理由 <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="report-reason"
                    name="report-reason"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    required
                    className={styles.modalSelect}
                  >
                    <option value="">選択してください</option>
                    {REPORT_REASONS.map(reason => (
                      <option key={reason.value} value={reason.value}>{reason.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.modalGroup}>
                  <label className={styles.modalLabel} htmlFor="report-content">
                    詳細（任意）
                  </label>
                  <textarea
                    id="report-content"
                    name="report-content"
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    placeholder="具体的な状況や問題点があればご記入ください"
                    rows={4}
                    className={styles.modalTextarea}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setShowReportModal(false)} disabled={submittingReport} className={`${styles.btn} ${styles.secondary}`}>
                  キャンセル
                </button>
                <button type="submit" disabled={submittingReport || !reportReason} className={`${styles.btn} ${styles.primary}`}>
                  {submittingReport ? '送信中...' : '通報する'}
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