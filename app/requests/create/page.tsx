'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

export default function CreateRequestPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [deadline, setDeadline] = useState('')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [recipientProfile, setRecipientProfile] = useState<Profile | null>(null)
  const [requestType, setRequestType] = useState<'public' | 'direct'>('public')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const toUsername = searchParams.get('to')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (toUsername) {
      setRequestType('direct')
      fetchRecipient()
    } else {
      setLoading(false)
    }
  }, [toUsername])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentProfileId(profile.id)
    } else {
      alert('プロフィールが見つかりません')
      router.push('/profile')
    }
  }

  async function fetchRecipient() {
    if (!toUsername) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('username', toUsername)
      .single()

    if (error) {
      console.error('受取人取得エラー:', error)
      alert('指定されたクリエイターが見つかりませんでした')
      router.push('/requests/create')
    } else {
      setRecipientProfile(data)
    }

    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim() || !description.trim()) {
      alert('タイトルと依頼内容は必須です')
      return
    }

    if (!category) {
      alert('カテゴリを選択してください')
      return
    }

    if (requestType === 'direct' && !recipientProfile) {
      alert('受取人が設定されていません')
      return
    }

    setSubmitting(true)

    try {
      // 1. 依頼を作成
      const { data: newRequest, error: requestError } = await supabase
        .from('work_requests')
        .insert({
          requester_id: currentProfileId,
          title: title.trim(),
          description: description.trim(),
          budget_min: budgetMin ? parseInt(budgetMin) : null,
          budget_max: budgetMax ? parseInt(budgetMax) : null,
          deadline: deadline || null,
          category: category,
          status: 'open',
          request_type: requestType,
          selected_applicant_id: requestType === 'direct' ? recipientProfile!.id : null
        })
        .select()
        .single()

      if (requestError) {
        console.error('依頼作成エラー:', requestError)
        alert('依頼の作成に失敗しました')
        setSubmitting(false)
        return
      }

      // 2. 直接依頼の場合はチャットルームを作成
      if (requestType === 'direct' && recipientProfile) {
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
            
            if (profileIds.length === 2 && profileIds.includes(recipientProfile.id)) {
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
              related_request_id: newRequest.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (roomError) {
            console.error('チャットルーム作成エラー:', roomError)
            alert(`依頼は作成されましたが、チャットルームの作成に失敗しました`)
            router.push(`/requests/${newRequest.id}`)
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
                profile_id: recipientProfile.id,
                last_read_at: new Date().toISOString(),
                pinned: false,
                hidden: false
              }
            ])
        }

        // 依頼カードメッセージを送信
        await supabase
          .from('messages')
          .insert({
            chat_room_id: targetRoomId,
            sender_id: currentProfileId,
            content: '',
            request_card_id: newRequest.id,
            deleted: false,
            created_at: new Date().toISOString()
          })

        // updated_at更新
        await supabase
          .from('chat_rooms')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', targetRoomId)

        alert('依頼を送信しました！メッセージルームに移動します。')
        router.push(`/messages/${targetRoomId}`)
      } else {
        alert('依頼を作成しました！')
        router.push(`/requests/${newRequest.id}`)
      }

    } catch (error) {
      console.error('送信エラー:', error)
      alert('エラーが発生しました')
      setSubmitting(false)
    }
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

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow" style={{ padding: '40px 20px' }}>
          <h1 className="page-title mb-40">
            {requestType === 'direct' && recipientProfile ? '直接依頼を送る' : '公開依頼を作成'}
          </h1>

          {/* 直接依頼の場合、受取人を表示 */}
          {requestType === 'direct' && recipientProfile && (
            <div className="card-no-hover p-24 mb-32" style={{ backgroundColor: '#F9F9F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  {recipientProfile.avatar_url ? (
                    <img 
                      src={recipientProfile.avatar_url} 
                      alt={recipientProfile.display_name || ''} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    recipientProfile.display_name?.charAt(0) || '?'
                  )}
                </div>
                <div>
                  <div className="text-tiny text-gray">依頼先</div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>
                    {recipientProfile.display_name || '名前未設定'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="card-no-hover p-40">
            {/* タイトル */}
            <div className="mb-24">
              <label className="form-label">
                依頼タイトル <span className="form-required">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: YouTubeチャンネルのアイコン制作"
                required
                className="input-field"
              />
            </div>

            {/* カテゴリ */}
            <div className="mb-24">
              <label className="form-label">
                カテゴリ <span className="form-required">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="select-field"
              >
                <option value="">選択してください</option>
                <option value="illustration">イラスト</option>
                <option value="manga">マンガ</option>
                <option value="novel">小説</option>
                <option value="music">音楽</option>
                <option value="voice">ボイス</option>
                <option value="video">動画</option>
                <option value="logo">ロゴ</option>
                <option value="design">デザイン</option>
                <option value="other">その他</option>
              </select>
            </div>

            {/* 説明 */}
            <div className="mb-24">
              <label className="form-label">
                依頼内容 <span className="form-required">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="依頼内容を詳しく記載してください&#10;&#10;例:&#10;・用途: YouTubeチャンネルのアイコン&#10;・サイズ: 800x800px&#10;・イメージ: 可愛い猫のキャラクター&#10;・納品形式: PNG（透過背景）"
                required
                rows={10}
                className="textarea-field"
                style={{ whiteSpace: 'pre-wrap' }}
              />
            </div>

            {/* 予算 */}
            <div className="mb-24">
              <label className="form-label">予算</label>
              <div className="flex gap-16" style={{ alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="最低金額"
                    min="0"
                    className="input-field"
                  />
                </div>
                <span className="text-gray">〜</span>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="最高金額"
                    min="0"
                    className="input-field"
                  />
                </div>
                <span className="text-gray">円</span>
              </div>
            </div>

            {/* 納期 */}
            <div className="mb-32">
              <label className="form-label">希望納期</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input-field"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* 注意事項 */}
            <div className="mb-32" style={{
              padding: '16px',
              backgroundColor: '#F9F9F9',
              borderRadius: '8px',
              border: '1px solid #E5E5E5'
            }}>
              <h3 className="text-small" style={{ marginBottom: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-info-circle" style={{ color: '#6B6B6B' }}></i>
                {requestType === 'direct' ? '直接依頼について' : '公開依頼について'}
              </h3>
              <ul className="text-small text-gray" style={{
                lineHeight: '1.7',
                paddingLeft: '20px',
                margin: 0
              }}>
                {requestType === 'direct' ? (
                  <>
                    <li>この依頼は{recipientProfile?.display_name}さんに直接送られます</li>
                    <li>送信後、メッセージで詳細のやり取りができます</li>
                    <li>条件が合意できたら、お仕事を開始できます</li>
                  </>
                ) : (
                  <>
                    <li>この依頼は公開され、全てのクリエイターが応募できます</li>
                    <li>応募者の中から1名を選んで採用できます</li>
                    <li>採用後、メッセージで詳細のやり取りができます</li>
                  </>
                )}
              </ul>
            </div>

            {/* ボタン */}
            <div className="flex gap-16" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => requestType === 'direct' && recipientProfile 
                  ? router.push(`/creators/${recipientProfile.username}`) 
                  : router.back()
                }
                disabled={submitting}
                className="btn-secondary"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? '送信中...' : (requestType === 'direct' ? '依頼を送る' : '依頼を公開する')}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  )
}