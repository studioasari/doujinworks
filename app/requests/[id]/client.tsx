'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import styles from './page.module.css'

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
  reference_urls: string[] | null
  required_skills: string[] | null
  attached_file_urls: string[] | null
  payment_type: string | null
  hourly_rate_min: number | null
  hourly_rate_max: number | null
  estimated_hours: number | null
  job_features: string[] | null
  number_of_positions: number | null
  application_deadline: string | null
  price_negotiable: boolean | null
  profiles: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
}

const CATEGORY_LABELS: { [key: string]: string } = {
  illustration: 'イラスト', manga: 'マンガ', novel: '小説', music: '音楽',
  voice: 'ボイス', video: '動画', logo: 'ロゴ', design: 'デザイン', other: 'その他'
}

const STATUS_LABELS: { [key: string]: string } = {
  open: '募集中', closed: '募集終了', contracted: '仮払い待ち', paid: '作業中',
  delivered: '納品済み', completed: '完了', cancelled: 'キャンセル'
}

const JOB_FEATURE_LABELS: { [key: string]: string } = {
  no_skill: 'スキル不要', skill_welcome: '専門スキル歓迎', one_time: '単発',
  continuous: '継続あり', flexible_time: 'スキマ時間歓迎'
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function RequestDetailPage() {
  const [request, setRequest] = useState<WorkRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [applicationCount, setApplicationCount] = useState(0)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [applicationMessage, setApplicationMessage] = useState('')
  const [proposedPrice, setProposedPrice] = useState('')
  const [processing, setProcessing] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [myContractId, setMyContractId] = useState<string | null>(null)

  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  useEffect(() => { checkAuth() }, [])

  useEffect(() => {
    if (requestId) {
      fetchRequest()
      checkApplication()
    }
  }, [requestId, currentProfileId])

  useEffect(() => {
    if (requestId && currentProfileId && request) { checkMyContract() }
  }, [requestId, currentProfileId, request])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setIsLoggedIn(true)
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
      if (profile) setCurrentProfileId(profile.id)
    }
  }

  async function fetchRequest() {
    setLoading(true)
    const { data, error } = await supabase
      .from('work_requests')
      .select('*, profiles!work_requests_requester_id_fkey(id, username, display_name, avatar_url)')
      .eq('id', requestId)
      .single()

    if (error) console.error('依頼取得エラー:', error)
    else setRequest(data)
    setLoading(false)
  }

  async function checkApplication() {
    const { data, error } = await supabase
      .from('work_request_applications')
      .select('id, applicant_id, status')
      .eq('work_request_id', requestId)

    if (!error && data) {
      setApplicationCount(data.length)
      if (currentProfileId) {
        const myApp = data.find(app => app.applicant_id === currentProfileId)
        setHasApplied(!!myApp)
      }
    }
  }

  async function checkMyContract() {
    if (!currentProfileId || !request) return
    
    // クリエイターの場合：自分が契約者の契約を取得
    // 依頼者の場合：この依頼に紐づく契約を取得
    const isReq = request.requester_id === currentProfileId
    
    let query = supabase
      .from('work_contracts')
      .select('id')
      .eq('work_request_id', requestId)
    
    if (!isReq) {
      query = query.eq('contractor_id', currentProfileId)
    }
    
    const { data, error } = await query.single()

    if (!error && data) setMyContractId(data.id)
  }

  async function handleSubmitApplication(e: React.FormEvent) {
    e.preventDefault()
    if (!applicationMessage.trim()) { alert('応募メッセージを入力してください'); return }

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
      alert(error.code === '23505' ? 'すでに応募済みです' : '応募に失敗しました')
    } else {
      alert('応募しました！')
      setShowApplicationForm(false)
      setApplicationMessage('')
      setProposedPrice('')
      checkApplication()
    }
    setProcessing(false)
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!request) { alert('依頼情報が見つかりません'); return }
    if (!messageText.trim()) { alert('メッセージを入力してください'); return }
    if (!isLoggedIn) {
      alert('ログインが必要です')
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    setSendingMessage(true)
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
          if (profileIds.length === 2 && profileIds.includes(request.requester_id)) {
            targetRoomId = room.chat_room_id
            break
          }
        }
      }

      if (!targetRoomId) {
        const { data: newRoom, error: roomError } = await supabase
          .from('chat_rooms')
          .insert({ related_request_id: requestId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .select()
          .single()

        if (roomError) {
          console.error('チャットルーム作成エラー:', roomError)
          alert('メッセージの送信に失敗しました')
          setSendingMessage(false)
          return
        }

        targetRoomId = newRoom.id
        await supabase.from('chat_room_participants').insert([
          { chat_room_id: targetRoomId, profile_id: currentProfileId, last_read_at: new Date().toISOString(), pinned: false, hidden: false },
          { chat_room_id: targetRoomId, profile_id: request.requester_id, last_read_at: new Date().toISOString(), pinned: false, hidden: false }
        ])
      }

      await supabase.from('messages').insert({ chat_room_id: targetRoomId, sender_id: currentProfileId, content: messageText.trim(), deleted: false, created_at: new Date().toISOString() })
      await supabase.from('chat_rooms').update({ updated_at: new Date().toISOString() }).eq('id', targetRoomId)

      alert('メッセージを送信しました！')
      setMessageText('')
      router.push(`/messages/${targetRoomId}`)
    } catch (error) {
      console.error('メッセージ送信エラー:', error)
      alert('メッセージの送信に失敗しました')
    }
    setSendingMessage(false)
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.loading}>
              <i className="fas fa-spinner fa-spin"></i>
              <span>読み込み中...</span>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!request) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.error}>
              <i className="fas fa-exclamation-circle"></i>
              <h1>依頼が見つかりませんでした</h1>
              <Link href="/requests" className={`${styles.btn} ${styles.primary}`}>依頼一覧に戻る</Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const isRequester = request.requester_id === currentProfileId

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.layout}>
            {/* メインコンテンツ */}
            <div className={styles.main}>
              {/* ヘッダー */}
              <div className={styles.header}>
                <div>
                  <span className="badge badge-accent">
                    {CATEGORY_LABELS[request.category] || request.category}
                  </span>
                  <h1 className={styles.title}>{request.title}</h1>
                </div>
                <span className={`${styles.statusBadge} ${styles[request.status]}`}>
                  {STATUS_LABELS[request.status] || request.status}
                </span>
              </div>

              {/* 仕事の概要 */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>仕事の概要</h2>
                <div className={styles.infoCard}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>支払い方式</span>
                    <span className={styles.infoValue}>
                      {request.payment_type === 'hourly' ? '時間単価制' : '固定報酬制'}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>
                      {request.payment_type === 'hourly' ? '時給' : '予算'}
                    </span>
                    <span className={`${styles.infoValue} ${styles.price}`}>
                      {request.payment_type === 'hourly' ? (
                        request.hourly_rate_min && request.hourly_rate_max
                          ? `${request.hourly_rate_min.toLocaleString()}〜${request.hourly_rate_max.toLocaleString()}円/時`
                          : request.hourly_rate_min
                          ? `${request.hourly_rate_min.toLocaleString()}円/時〜`
                          : request.hourly_rate_max
                          ? `〜${request.hourly_rate_max.toLocaleString()}円/時`
                          : '応相談'
                      ) : request.price_negotiable ? (
                        '相談して決める'
                      ) : (request.budget_min || request.budget_max) ? (
                        `${request.budget_min?.toLocaleString() || '未設定'}円 〜 ${request.budget_max?.toLocaleString() || '未設定'}円`
                      ) : (
                        '金額未設定'
                      )}
                    </span>
                  </div>
                  {request.payment_type === 'hourly' && request.estimated_hours && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>想定作業時間</span>
                      <span className={styles.infoValue}>{request.estimated_hours}時間</span>
                    </div>
                  )}
                  {request.deadline && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>納品希望日</span>
                      <span className={styles.infoValue}>{formatDate(request.deadline)}</span>
                    </div>
                  )}
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>掲載日</span>
                    <span className={styles.infoValue}>{formatDate(request.created_at)}</span>
                  </div>
                  {request.application_deadline && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>応募期限</span>
                      <span className={styles.infoValue}>
                        {formatDate(request.application_deadline)}
                        {(() => {
                          const daysUntil = Math.ceil((new Date(request.application_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                          if (daysUntil > 0) return <span className={styles.deadlineBadge}>あと{daysUntil}日</span>
                          if (daysUntil === 0) return <span className={`${styles.deadlineBadge} ${styles.urgent}`}>本日締切</span>
                          return null
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 応募状況 */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>応募状況</h2>
                <div className={styles.stats}>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>応募した人</div>
                    <div className={styles.statValue}>
                      {applicationCount}<span className={styles.statUnit}>人</span>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>募集人数</div>
                    <div className={styles.statValue}>
                      {request.number_of_positions || 1}<span className={styles.statUnit}>人</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 仕事の詳細 */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>仕事の詳細</h2>
                <div className={styles.description}>{request.description}</div>
              </div>

              {/* 参考URL */}
              {request.reference_urls && request.reference_urls.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>参考URL</h2>
                  <div className={styles.links}>
                    {request.reference_urls.map((url, index) => (
                      <a key={index} href={url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                        <i className="fas fa-external-link-alt"></i>
                        <span>{url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 添付ファイル */}
              {request.attached_file_urls && request.attached_file_urls.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>添付ファイル</h2>
                  <div className={styles.files}>
                    {request.attached_file_urls.map((fileUrl, index) => {
                      const fileName = fileUrl.split('/').pop() || `file_${index + 1}`
                      return (
                        <a key={index} href={fileUrl} target="_blank" rel="noopener noreferrer" className={styles.file}>
                          <i className="fas fa-file-download"></i>
                          <span>{fileName}</span>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 求めるスキル */}
              {request.required_skills && request.required_skills.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>求めるスキル</h2>
                  <div className={styles.tags}>
                    {request.required_skills.map((skill, index) => (
                      <span key={index} className={styles.tag}>{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* この仕事の特徴 */}
              {request.job_features && request.job_features.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>この仕事の特徴</h2>
                  <div className={styles.tags}>
                    {request.job_features.map((feature, index) => (
                      <span key={index} className={styles.tag}>{JOB_FEATURE_LABELS[feature] || feature}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 依頼者情報（メイン下部） */}
              {request.profiles?.username ? (
                <Link href={`/creators/${request.profiles.username}`} className={styles.creatorCard}>
                  <div className={styles.creatorAvatar}>
                    {request.profiles?.avatar_url ? (
                      <img src={request.profiles.avatar_url} alt={request.profiles.display_name || ''} />
                    ) : (
                      <span>{request.profiles?.display_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className={styles.creatorInfo}>
                    <div className={styles.creatorName}>{request.profiles?.display_name || '名前未設定'}</div>
                    <div className={styles.creatorMeta}>依頼者のプロフィールを見る</div>
                  </div>
                  <i className="fas fa-chevron-right" style={{ color: 'var(--text-tertiary)' }}></i>
                </Link>
              ) : (
                <div className={styles.creatorCard}>
                  <div className={styles.creatorAvatar}>
                    <span>{request.profiles?.display_name?.charAt(0) || '?'}</span>
                  </div>
                  <div className={styles.creatorInfo}>
                    <div className={styles.creatorName}>{request.profiles?.display_name || '名前未設定'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* サイドバー */}
            <div className={styles.sidebar}>
              {/* 予算 + 応募カード */}
              <div className={styles.actionCard}>
                <div className={styles.priceSection}>
                  <div className={styles.priceLabel}>
                    {request.payment_type === 'hourly' ? '時給' : '予算'}
                  </div>
                  <div className={styles.priceValue}>
                    {request.payment_type === 'hourly' ? (
                      request.hourly_rate_min && request.hourly_rate_max
                        ? `¥${request.hourly_rate_min.toLocaleString()}〜${request.hourly_rate_max.toLocaleString()}`
                        : request.hourly_rate_min
                        ? `¥${request.hourly_rate_min.toLocaleString()}〜`
                        : request.hourly_rate_max
                        ? `〜¥${request.hourly_rate_max.toLocaleString()}`
                        : '応相談'
                    ) : request.price_negotiable ? (
                      '相談して決める'
                    ) : (request.budget_min || request.budget_max) ? (
                      <>
                        ¥{request.budget_min?.toLocaleString() || '0'}
                        <span className={styles.priceSuffix}>〜</span>
                        {request.budget_max && `¥${request.budget_max.toLocaleString()}`}
                      </>
                    ) : (
                      '金額未設定'
                    )}
                  </div>
                  {request.payment_type === 'hourly' && (
                    <div className={styles.priceUnit}>/時間</div>
                  )}
                </div>

                {/* 応募ボタン */}
                {request.status === 'open' && !isRequester && (
                  <>
                    {isLoggedIn ? (
                      hasApplied ? (
                        <div className={styles.appliedBadge}>
                          <i className="fas fa-check-circle"></i>応募済みです
                        </div>
                      ) : (
                        <button onClick={() => setShowApplicationForm(!showApplicationForm)} className={`${styles.btn} ${styles.primary} ${styles.full}`}>
                          応募画面へ
                        </button>
                      )
                    ) : (
                      <Link href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`} className={`${styles.btn} ${styles.primary} ${styles.full}`}>
                        ログインして応募する
                      </Link>
                    )}
                  </>
                )}

                {/* 依頼者向けリンク */}
                {isRequester && (
                  request.status === 'open' ? (
                    <Link href={`/requests/${requestId}/manage`} className={`${styles.btn} ${styles.primary} ${styles.full}`}>
                      <i className="fas fa-cog"></i>応募を管理する
                    </Link>
                  ) : myContractId ? (
                    <Link href={`/requests/${requestId}/contracts/${myContractId}`} className={`${styles.btn} ${styles.primary} ${styles.full}`}>
                      <i className="fas fa-tasks"></i>契約進捗を確認
                    </Link>
                  ) : null
                )}

                {/* クリエイター向けリンク（契約済み） */}
                {!isRequester && myContractId && (
                  <Link href={`/requests/${requestId}/contracts/${myContractId}`} className={`${styles.btn} ${styles.primary} ${styles.full}`}>
                    <i className="fas fa-tasks"></i>契約進捗を確認
                  </Link>
                )}
              </div>

              {/* メッセージカード（依頼者以外に表示） */}
              {!isRequester && (
                <div className={styles.messageCard}>
                  <h3 className={styles.messageTitle}>メッセージで相談</h3>
                  <form onSubmit={handleSendMessage}>
                    <textarea
                      id="consultation-message"
                      name="consultation-message"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="このお仕事に少しでも疑問があるときは、気軽に相談してみましょう"
                      rows={4}
                      disabled={sendingMessage}
                      className={styles.messageTextarea}
                    />
                    <button type="submit" disabled={sendingMessage || !messageText.trim()} className={`${styles.btn} ${styles.secondary} ${styles.full}`}>
                      {sendingMessage ? '送信中...' : 'メッセージを送る'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 応募フォームモーダル */}
        {showApplicationForm && (
          <div className={styles.modalOverlay} onClick={() => setShowApplicationForm(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>この依頼に応募する</h2>
              <form onSubmit={handleSubmitApplication}>
                <div className={styles.modalGroup}>
                  <label className={styles.modalLabel} htmlFor="application-message">
                    応募メッセージ <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    id="application-message"
                    name="application-message"
                    value={applicationMessage}
                    onChange={(e) => setApplicationMessage(e.target.value)}
                    placeholder="自己紹介や実績、この依頼への意気込みなどを記入してください"
                    required
                    className={styles.modalTextarea}
                  />
                </div>
                <div className={styles.modalGroup}>
                  <label className={styles.modalLabel} htmlFor="proposed-price">希望金額</label>
                  <div className={styles.modalPriceRow}>
                    <input
                      id="proposed-price"
                      name="proposed-price"
                      type="number"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(e.target.value)}
                      placeholder="希望する金額"
                      min="0"
                      className={styles.modalInput}
                    />
                    <span className={styles.modalUnit}>円</span>
                  </div>
                </div>
                <div className={styles.modalButtons}>
                  <button type="button" onClick={() => setShowApplicationForm(false)} disabled={processing} className={`${styles.btn} ${styles.secondary}`}>
                    キャンセル
                  </button>
                  <button type="submit" disabled={processing} className={`${styles.btn} ${styles.primary}`}>
                    {processing ? '送信中...' : '応募する'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}