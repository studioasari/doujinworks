'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

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

type Application = {
  id: string
  applicant_id: string
  status: string
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

  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (requestId) {
      fetchRequest()
      checkApplication()
    }
  }, [requestId, currentProfileId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      setIsLoggedIn(true)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        setCurrentProfileId(profile.id)
      }
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

    if (!request) {
      alert('依頼情報が見つかりません')
      return
    }

    if (!messageText.trim()) {
      alert('メッセージを入力してください')
      return
    }

    if (!isLoggedIn) {
      alert('ログインが必要です')
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    setSendingMessage(true)

    try {
      // 既存のチャットルームをチェック
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

      // ルームがなければ新規作成
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
          alert('メッセージの送信に失敗しました')
          setSendingMessage(false)
          return
        }

        targetRoomId = newRoom.id

        // 参加者を追加
        await supabase
          .from('chat_room_participants')
          .insert([
            {
              chat_room_id: targetRoomId,
              profile_id: currentProfileId,
              last_read_at: new Date().toISOString(),
              pinned: false,
              hidden: false
            },
            {
              chat_room_id: targetRoomId,
              profile_id: request.requester_id,
              last_read_at: new Date().toISOString(),
              pinned: false,
              hidden: false
            }
          ])
      }

      // メッセージを送信
      await supabase
        .from('messages')
        .insert({
          chat_room_id: targetRoomId,
          sender_id: currentProfileId,
          content: messageText.trim(),
          deleted: false,
          created_at: new Date().toISOString()
        })

      // updated_at更新
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', targetRoomId)

      alert('メッセージを送信しました！')
      setMessageText('')
      router.push(`/messages/${targetRoomId}`)

    } catch (error) {
      console.error('メッセージ送信エラー:', error)
      alert('メッセージの送信に失敗しました')
    }

    setSendingMessage(false)
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

  function getJobFeatureLabel(feature: string) {
    const labels: { [key: string]: string } = {
      no_skill: 'スキル不要',
      skill_welcome: '専門スキル歓迎',
      one_time: '単発',
      continuous: '継続あり',
      flexible_time: 'スキマ時間歓迎'
    }
    return labels[feature] || feature
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
  const canApply = request.status === 'open' && !isRequester && !hasApplied

  return (
    <>
      <style jsx>{`
        .detail-container {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 20px;
        }

        .info-table {
          width: 100%;
          border-collapse: collapse;
        }

        .info-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #E5E5E5;
          font-size: 14px;
        }

        .info-table td:first-child {
          width: 120px;
          font-weight: 600;
          color: #4A4A4A;
          background-color: #F9F9F9;
        }

        .detail-section {
          margin-bottom: 28px;
          padding-bottom: 28px;
          border-bottom: 1px solid #E5E5E5;
        }

        .detail-section:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .detail-section-title {
          font-size: 16px;
          font-weight: 700;
          color: #1A1A1A;
          margin-bottom: 14px;
        }

        .sidebar {
          position: sticky;
          top: 80px;
          height: fit-content;
        }

        @media (max-width: 1024px) {
          .detail-container {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .sidebar {
            position: static;
            order: -1;
          }

          .info-table td:first-child {
            width: 120px;
          }
        }

        @media (max-width: 768px) {
          .detail-container {
            padding: 20px 16px;
          }

          .info-table td {
            padding: 12px;
            font-size: 14px;
          }

          .info-table td:first-child {
            width: 100px;
            font-size: 13px;
          }
        }
      `}</style>

      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="detail-container">
          {/* メインコンテンツ */}
          <div>
            {/* タイトル */}
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#1A1A1A', 
              marginBottom: '14px',
              lineHeight: '1.4'
            }}>
              {request.title}
            </h1>

            {/* カテゴリとステータス */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <span className="badge badge-category">
                {getCategoryLabel(request.category)}
              </span>
              <span className="badge" style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>
                {getStatusLabel(request.status)}
              </span>
            </div>

            {/* 仕事の概要 */}
            <div className="detail-section">
              <h2 className="detail-section-title">仕事の概要</h2>
              <table className="info-table">
                <tbody>
                  <tr>
                    <td>支払い方式</td>
                    <td>
                      {request.payment_type === 'hourly' ? '時間単価制' : '固定報酬制'}
                      {request.payment_type === 'hourly' ? (
                        <>
                          <br />
                          <strong style={{ fontSize: '18px', color: '#1A1A1A' }}>
                            {request.hourly_rate_min && request.hourly_rate_max ? (
                              `${request.hourly_rate_min.toLocaleString()}〜${request.hourly_rate_max.toLocaleString()}円/時`
                            ) : request.hourly_rate_min ? (
                              `${request.hourly_rate_min.toLocaleString()}円/時〜`
                            ) : request.hourly_rate_max ? (
                              `〜${request.hourly_rate_max.toLocaleString()}円/時`
                            ) : (
                              '応相談'
                            )}
                          </strong>
                          {request.estimated_hours && (
                            <div style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>
                              想定作業時間: {request.estimated_hours}時間
                            </div>
                          )}
                        </>
                      ) : request.price_negotiable ? (
                        <>
                          <br />
                          <span style={{ color: '#6B6B6B' }}>相談して決める</span>
                        </>
                      ) : (request.budget_min || request.budget_max) ? (
                        <>
                          <br />
                          <strong style={{ fontSize: '18px', color: '#1A1A1A' }}>
                            {request.budget_min?.toLocaleString() || '未設定'}円 〜 {request.budget_max?.toLocaleString() || '未設定'}円
                          </strong>
                        </>
                      ) : (
                        <>
                          <br />
                          <span style={{ color: '#6B6B6B' }}>金額未設定</span>
                        </>
                      )}
                    </td>
                  </tr>
                  {request.deadline && (
                    <tr>
                      <td>納品希望日</td>
                      <td>{formatDate(request.deadline)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>掲載日</td>
                    <td>{formatDate(request.created_at)}</td>
                  </tr>
                  {request.application_deadline && (
                    <tr>
                      <td>応募期限</td>
                      <td>
                        {formatDate(request.application_deadline)}
                        {(() => {
                          const daysUntil = Math.ceil(
                            (new Date(request.application_deadline).getTime() - new Date().getTime()) / 
                            (1000 * 60 * 60 * 24)
                          )
                          if (daysUntil > 0) {
                            return (
                              <span style={{ marginLeft: '8px', color: '#E65100', fontWeight: '600' }}>
                                （あと{daysUntil}日）
                              </span>
                            )
                          } else if (daysUntil === 0) {
                            return <span style={{ marginLeft: '8px', color: '#D32F2F', fontWeight: '600' }}>（本日締切）</span>
                          }
                          return null
                        })()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 応募状況 */}
            <div className="detail-section">
              <h2 className="detail-section-title">応募状況</h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
                padding: '16px',
                backgroundColor: '#F9F9F9',
                borderRadius: '6px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '8px' }}>応募した人</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A' }}>
                    {applicationCount}<span style={{ fontSize: '14px', fontWeight: '400' }}>人</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '8px' }}>募集人数</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A' }}>
                    {request.number_of_positions || 1}<span style={{ fontSize: '14px', fontWeight: '400' }}>人</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 仕事の詳細 */}
            <div className="detail-section">
              <h2 className="detail-section-title">仕事の詳細</h2>
              <div style={{ 
                padding: '16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E5E5',
                borderRadius: '6px',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
                fontSize: '14px',
                color: '#1A1A1A'
              }}>
                {request.description}
              </div>
            </div>

            {/* 参考URL */}
            {request.reference_urls && request.reference_urls.length > 0 && (
              <div className="detail-section">
                <h2 className="detail-section-title">参考URL</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {request.reference_urls.map((url, index) => (
                    <a 
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#1A1A1A',
                        textDecoration: 'underline',
                        wordBreak: 'break-all',
                        fontSize: '14px'
                      }}
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 添付ファイル */}
            {request.attached_file_urls && request.attached_file_urls.length > 0 && (
              <div className="detail-section">
                <h2 className="detail-section-title">添付ファイル</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {request.attached_file_urls.map((fileUrl, index) => {
                    const fileName = fileUrl.split('/').pop() || `file_${index + 1}`
                    return (
                      <a 
                        key={index}
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          backgroundColor: '#F9F9F9',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          border: '1px solid #E5E5E5',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F0F0F0'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#F9F9F9'}
                      >
                        <i className="fas fa-file-download" style={{ color: '#1A1A1A', fontSize: '16px' }}></i>
                        <span style={{ color: '#1A1A1A', fontSize: '14px', flex: 1 }}>
                          {fileName}
                        </span>
                        <i className="fas fa-external-link-alt" style={{ fontSize: '12px', color: '#9E9E9E' }}></i>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 求めるスキル */}
            {request.required_skills && request.required_skills.length > 0 && (
              <div className="detail-section">
                <h2 className="detail-section-title">求めるスキル</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {request.required_skills.map((skill, index) => (
                    <span key={index} className="badge" style={{
                      padding: '6px 12px',
                      backgroundColor: '#F5F5F5',
                      color: '#1A1A1A',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* この仕事の特徴 */}
            {request.job_features && request.job_features.length > 0 && (
              <div className="detail-section">
                <h2 className="detail-section-title">この仕事の特徴</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {request.job_features.map((feature, index) => (
                    <span key={index} className="badge" style={{
                      padding: '6px 12px',
                      backgroundColor: '#E8E8E8',
                      color: '#1A1A1A',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      {getJobFeatureLabel(feature)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* クライアント情報 */}
            <div className="detail-section">
              <h2 className="detail-section-title">クライアント情報</h2>
              <div style={{
                padding: '16px',
                border: '1px solid #E5E5E5',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E5E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    fontSize: '20px',
                    color: '#6B6B6B'
                  }}>
                    {request.profiles?.avatar_url ? (
                      <img 
                        src={request.profiles.avatar_url} 
                        alt={request.profiles.display_name || ''} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      request.profiles?.display_name?.charAt(0) || '?'
                    )}
                  </div>
                  <div>
                    {request.profiles?.username ? (
                      <Link 
                        href={`/creators/${request.profiles.username}`}
                        style={{ 
                          textDecoration: 'none', 
                          fontSize: '16px', 
                          fontWeight: '700', 
                          color: '#1A1A1A',
                          display: 'block',
                          marginBottom: '2px'
                        }}
                      >
                        {request.profiles.display_name || '名前未設定'}
                      </Link>
                    ) : (
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: '700', 
                        color: '#1A1A1A',
                        marginBottom: '2px'
                      }}>
                        {request.profiles?.display_name || '名前未設定'}
                      </div>
                    )}
                    {request.profiles?.username && (
                      <Link
                        href={`/creators/${request.profiles.username}`}
                        style={{
                          fontSize: '13px',
                          color: '#1A1A1A',
                          textDecoration: 'underline'
                        }}
                      >
                        プロフィールを見る →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="sidebar">
            {/* 応募ボタン */}
            {request.status === 'open' && !isRequester && (
              <div style={{ marginBottom: '16px' }}>
                {isLoggedIn ? (
                  hasApplied ? (
                    <div style={{
                      padding: '14px',
                      backgroundColor: '#F5F5F5',
                      borderRadius: '8px',
                      border: '1px solid #E5E5E5',
                      textAlign: 'center',
                      color: '#1A1A1A',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      <i className="fas fa-check-circle" style={{ marginRight: '8px', color: '#1A1A1A' }}></i>
                      応募済みです
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowApplicationForm(!showApplicationForm)}
                      style={{
                        width: '100%',
                        padding: '14px',
                        backgroundColor: '#1A1A1A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#333333'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1A1A1A'}
                    >
                      応募画面へ
                    </button>
                  )
                ) : (
                  <Link
                    href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#1A1A1A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '700',
                      textAlign: 'center',
                      textDecoration: 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    ログインして応募する
                  </Link>
                )}
              </div>
            )}

            {/* 依頼者向けリンク */}
            {isRequester && (
              <div style={{ marginBottom: '16px' }}>
                {request.status === 'open' ? (
                  <Link
                    href={`/requests/${requestId}/manage`}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#1A1A1A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '700',
                      textAlign: 'center',
                      textDecoration: 'none'
                    }}
                  >
                    <i className="fas fa-cog" style={{ marginRight: '8px' }}></i>
                    応募を管理する
                  </Link>
                ) : (
                  <Link
                    href={`/requests/${requestId}/status`}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#1A73E8',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '700',
                      textAlign: 'center',
                      textDecoration: 'none'
                    }}
                  >
                    <i className="fas fa-tasks" style={{ marginRight: '8px' }}></i>
                    契約進捗を確認
                  </Link>
                )}
              </div>
            )}

            {/* クリエイター向けリンク（契約済み） */}
            {!isRequester && currentProfileId && request.selected_applicant_id === currentProfileId && request.status !== 'open' && (
              <div style={{ marginBottom: '16px' }}>
                <Link
                  href={`/requests/${requestId}/status`}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#1A73E8',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '700',
                    textAlign: 'center',
                    textDecoration: 'none'
                  }}
                >
                  <i className="fas fa-tasks" style={{ marginRight: '8px' }}></i>
                  契約進捗を確認
                </Link>
              </div>
            )}

            {/* メッセージ */}
            <div style={{
              padding: '16px',
              backgroundColor: '#F9F9F9',
              borderRadius: '6px',
              border: '1px solid #E5E5E5'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#1A1A1A' }}>
                メッセージ
              </h3>
              <form onSubmit={handleSendMessage}>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="このお仕事に少しでも疑問があるときは、気軽に相談してみましょう"
                  rows={4}
                  disabled={sendingMessage}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '4px',
                    fontSize: '13px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !messageText.trim()}
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#FFFFFF',
                    color: '#1A1A1A',
                    border: '2px solid #1A1A1A',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: sendingMessage || !messageText.trim() ? 'not-allowed' : 'pointer',
                    opacity: sendingMessage || !messageText.trim() ? 0.5 : 1
                  }}
                >
                  {sendingMessage ? '送信中...' : 'メッセージを送る'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* 応募フォームモーダル */}
        {showApplicationForm && (
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
            onClick={() => setShowApplicationForm(false)}
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
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>
                この依頼に応募する
              </h2>

              <form onSubmit={handleSubmitApplication}>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    marginBottom: '8px',
                    color: '#1A1A1A'
                  }}>
                    応募メッセージ <span style={{ color: '#D32F2F' }}>*</span>
                  </label>
                  <textarea
                    value={applicationMessage}
                    onChange={(e) => setApplicationMessage(e.target.value)}
                    placeholder="自己紹介や実績、この依頼への意気込みなどを記入してください"
                    required
                    rows={8}
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

                <div style={{ marginBottom: '32px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    marginBottom: '8px',
                    color: '#1A1A1A'
                  }}>
                    希望金額
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(e.target.value)}
                      placeholder="希望する金額"
                      min="0"
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '1px solid #E5E5E5',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    <span style={{ color: '#6B6B6B', fontSize: '14px' }}>円</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowApplicationForm(false)}
                    disabled={processing}
                    style={{
                      flex: 1,
                      padding: '14px',
                      border: '2px solid #E5E5E5',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      color: '#1A1A1A',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: processing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    style={{
                      flex: 1,
                      padding: '14px',
                      border: 'none',
                      borderRadius: '8px',
                      backgroundColor: processing ? '#CCCCCC' : '#1A1A1A',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: processing ? 'not-allowed' : 'pointer'
                    }}
                  >
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