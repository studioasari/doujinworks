'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
}

type OtherUser = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
}

type ChatRoom = {
  id: string
  updated_at: string
  other_user: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  last_message: {
    content: string
    created_at: string
  } | null
  unread_count: number
}

export default function ChatRoomPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [otherUserLastReadAt, setOtherUserLastReadAt] = useState<string | null>(null)
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [showProfileModal, setShowProfileModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      fetchChatRooms(currentProfileId)
    }
  }, [currentProfileId])

  useEffect(() => {
    if (currentProfileId && roomId) {
      fetchMessages()
      fetchOtherUser(currentProfileId)
      fetchOtherUserLastReadAt()
      const unsubscribeMessages = subscribeToMessages()
      const unsubscribeReadStatus = subscribeToReadStatus()
      updateLastReadAt()
      
      return () => {
        unsubscribeMessages()
        unsubscribeReadStatus()
      }
    }
  }, [currentProfileId, roomId])

  // 初回読み込み完了時のみスクロール
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      scrollToBottom(true)
    }
  }, [loading])

  // テキストエリアの自動リサイズ
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      const newHeight = textarea.scrollHeight
      
      // 最大高さ（5行分：約144px）
      const maxHeight = 144
      
      if (newHeight > maxHeight) {
        textarea.style.height = maxHeight + 'px'
        textarea.style.overflowY = 'auto'
      } else {
        textarea.style.height = newHeight + 'px'
        textarea.style.overflowY = 'hidden'
      }
    }
  }, [newMessage])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
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

  async function fetchChatRooms(profileId: string) {
    const { data: participations, error: participationsError } = await supabase
      .from('chat_room_participants')
      .select('chat_room_id, last_read_at')
      .eq('profile_id', profileId)

    if (participationsError || !participations || participations.length === 0) {
      return
    }

    const roomsData: ChatRoom[] = []

    for (const participation of participations) {
      const roomIdTemp = participation.chat_room_id

      const { data: otherParticipants } = await supabase
        .from('chat_room_participants')
        .select('profile_id, profiles!chat_room_participants_profile_id_fkey(id, display_name, avatar_url)')
        .eq('chat_room_id', roomIdTemp)
        .neq('profile_id', profileId)

      const { data: lastMessage } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('chat_room_id', roomIdTemp)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_room_id', roomIdTemp)
        .neq('sender_id', profileId)
        .gt('created_at', participation.last_read_at || '1970-01-01')

      const { data: roomData } = await supabase
        .from('chat_rooms')
        .select('updated_at')
        .eq('id', roomIdTemp)
        .single()

      if (otherParticipants && otherParticipants.length > 0) {
        const otherUserData = otherParticipants[0].profiles as any

        roomsData.push({
          id: roomIdTemp,
          updated_at: roomData?.updated_at || '',
          other_user: {
            id: otherUserData.id,
            display_name: otherUserData.display_name,
            avatar_url: otherUserData.avatar_url
          },
          last_message: lastMessage || null,
          unread_count: unreadCount || 0
        })
      }
    }

    roomsData.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    setChatRooms(roomsData)
  }

  async function fetchOtherUser(profileId: string) {
    const { data } = await supabase
      .from('chat_room_participants')
      .select('profile_id, profiles!chat_room_participants_profile_id_fkey(id, username, display_name, avatar_url, bio)')
      .eq('chat_room_id', roomId)
      .neq('profile_id', profileId)
      .single()

    if (data) {
      const profile = data.profiles as any
      setOtherUser({
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio
      })
    }
  }

  async function fetchOtherUserLastReadAt() {
    if (!otherUser) return

    const { data } = await supabase
      .from('chat_room_participants')
      .select('last_read_at')
      .eq('chat_room_id', roomId)
      .neq('profile_id', currentProfileId)
      .single()

    if (data) {
      setOtherUserLastReadAt(data.last_read_at)
    }
  }

  async function fetchMessages() {
    setLoading(true)

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', roomId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('メッセージ取得エラー:', error)
    } else {
      setMessages(data || [])
    }

    setLoading(false)
  }

  // ユーザーが下にいるかチェック
  function isNearBottom() {
    const container = messagesContainerRef.current
    if (!container) return true
    const threshold = 100
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }

  // スクロール関数（メッセージエリア内だけ）
  function scrollToBottom(force = false) {
    const container = messagesContainerRef.current
    if (!container) return
    
    if (force || isNearBottom()) {
      container.scrollTop = container.scrollHeight
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || sending) return

    setSending(true)

    const messageData = {
      chat_room_id: roomId,
      sender_id: currentProfileId,
      content: newMessage.trim()
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      console.error('メッセージ送信エラー:', error)
      alert('メッセージの送信に失敗しました')
    } else {
      setMessages(prev => [...prev, data as Message])
      setNewMessage('')
      
      // 送信後は強制スクロール
      setTimeout(() => scrollToBottom(true), 50)
      
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', roomId)
      
      if (currentProfileId) {
        fetchChatRooms(currentProfileId)
      }
    }

    setSending(false)
  }

  function subscribeToMessages() {
    const channel = supabase
      .channel(`chat_room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${roomId}`
        },
        (payload) => {
          const newMsg = payload.new as Message
          
          if (newMsg.sender_id !== currentProfileId) {
            const shouldScroll = isNearBottom()
            
            setMessages(prev => {
              if (prev.find(m => m.id === newMsg.id)) {
                return prev
              }
              return [...prev, newMsg]
            })
            
            if (shouldScroll) {
              setTimeout(() => scrollToBottom(true), 50)
            }
            
            // 相手のメッセージを受信したら既読をつける
            updateLastReadAt()
          }
          
          if (currentProfileId) {
            fetchChatRooms(currentProfileId)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  function subscribeToReadStatus() {
    const channel = supabase
      .channel(`read_status_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_room_participants',
          filter: `chat_room_id=eq.${roomId}`
        },
        (payload) => {
          const updated = payload.new as any
          // 相手の既読状態が更新された場合
          if (updated.profile_id !== currentProfileId) {
            setOtherUserLastReadAt(updated.last_read_at)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  async function updateLastReadAt() {
    await supabase
      .from('chat_room_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_room_id', roomId)
      .eq('profile_id', currentProfileId)

    // 未読カウントを更新
    if (currentProfileId) {
      fetchChatRooms(currentProfileId)
    }
  }

  function isMessageRead(message: Message): boolean {
    if (message.sender_id !== currentProfileId) return false
    if (!otherUserLastReadAt) return false
    return new Date(otherUserLastReadAt) >= new Date(message.created_at)
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return '今日'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨日'
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
    }
  }

  function formatMessageTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}日前`
    } else if (hours > 0) {
      return `${hours}時間前`
    } else {
      return '今'
    }
  }

  return (
    <>
      <Header />
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 64px)',
        backgroundColor: '#FFFFFF'
      }}>
        {/* 左サイドバー: メッセージ一覧（PC only） */}
        <aside 
          className="hidden-mobile"
          style={{
            width: '320px',
            borderRight: '1px solid #E5E5E5',
            backgroundColor: '#FFFFFF',
            overflowY: 'auto',
            flexShrink: 0
          }}
        >
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid #E5E5E5',
            position: 'sticky',
            top: 0,
            backgroundColor: '#FFFFFF',
            zIndex: 10
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1A1A1A'
            }}>メッセージ</h2>
          </div>

          {chatRooms.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p className="text-gray text-small">メッセージがありません</p>
            </div>
          ) : (
            <div>
              {chatRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/messages/${room.id}`}
                  className="flex gap-12"
                  style={{
                    alignItems: 'center',
                    padding: '16px 20px',
                    textDecoration: 'none',
                    borderBottom: '1px solid #E5E5E5',
                    backgroundColor: room.id === roomId ? '#F9F9F9' : '#FFFFFF',
                    transition: 'background-color 0.2s',
                    display: 'flex'
                  }}
                  onMouseEnter={(e) => {
                    if (room.id !== roomId) {
                      e.currentTarget.style.backgroundColor = '#F5F5F5'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = room.id === roomId ? '#F9F9F9' : '#FFFFFF'
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E5E5',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: '#6B6B6B',
                    position: 'relative'
                  }}>
                    {room.other_user.avatar_url ? (
                      <img
                        src={room.other_user.avatar_url}
                        alt={room.other_user.display_name || ''}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '50%'
                        }}
                      />
                    ) : (
                      room.other_user.display_name?.charAt(0) || '?'
                    )}
                    {room.unread_count > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        backgroundColor: '#FF4444',
                        color: '#FFFFFF',
                        borderRadius: '12px',
                        minWidth: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '0 6px',
                        zIndex: 10
                      }}>
                        {room.unread_count}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex-between mb-4" style={{ alignItems: 'baseline' }}>
                      <h3 className="text-small" style={{
                        fontWeight: room.unread_count > 0 ? 'bold' : '600',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {room.other_user.display_name || '名前未設定'}
                      </h3>
                      <span className="text-tiny text-gray" style={{ flexShrink: 0, marginLeft: '8px' }}>
                        {room.last_message && formatMessageTime(room.last_message.created_at)}
                      </span>
                    </div>
                    <p className="text-small text-gray text-ellipsis" style={{
                      fontWeight: room.unread_count > 0 ? '600' : 'normal'
                    }}>
                      {room.last_message?.content || 'メッセージがありません'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>

        {/* 右側: チャットエリア */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF'
        }}>
          {/* ヘッダー */}
          <div style={{
            borderBottom: '1px solid #E5E5E5',
            padding: '12px 20px',
            backgroundColor: '#FFFFFF'
          }}>
            {otherUser && (
              <div className="flex gap-12" style={{ alignItems: 'center' }}>
                <Link
                  href="/messages"
                  style={{
                    fontSize: '18px',
                    color: '#6B6B6B',
                    textDecoration: 'none'
                  }}
                >
                  ←
                </Link>
                <div 
                  onClick={() => setShowProfileModal(true)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E5E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    color: '#6B6B6B',
                    overflow: 'hidden',
                    flexShrink: 0,
                    cursor: 'pointer'
                  }}
                >
                  {otherUser.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt={otherUser.display_name || ''}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    otherUser.display_name?.charAt(0) || '?'
                  )}
                </div>
                <div
                  onClick={() => setShowProfileModal(true)}
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    color: '#1A1A1A'
                  }}
                >
                  {otherUser.display_name || '名前未設定'}
                </div>
              </div>
            )}
          </div>

          {/* メッセージエリア */}
          <div 
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              backgroundColor: '#F9F9F9'
            }}
          >
            {loading && (
              <div className="loading-state">
                読み込み中...
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div className="empty-state">
                メッセージがありません
              </div>
            )}

            {!loading && messages.map((message, index) => {
              const isCurrentUser = message.sender_id === currentProfileId
              const showDate = index === 0 || 
                new Date(messages[index - 1].created_at).toDateString() !== 
                new Date(message.created_at).toDateString()

              return (
                <div key={message.id}>
                  {showDate && (
                    <div style={{
                      textAlign: 'center',
                      margin: '20px 0'
                    }}>
                      <span className="text-tiny text-gray">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                    marginBottom: '12px',
                    gap: '8px',
                    alignItems: 'flex-start'
                  }}>
                    {/* 相手のメッセージの場合、左側にアイコン表示 */}
                    {!isCurrentUser && otherUser && (
                      <div 
                        onClick={() => setShowProfileModal(true)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#E5E5E5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          color: '#6B6B6B',
                          overflow: 'hidden',
                          flexShrink: 0,
                          cursor: 'pointer'
                        }}
                      >
                        {otherUser.avatar_url ? (
                          <img
                            src={otherUser.avatar_url}
                            alt={otherUser.display_name || ''}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          otherUser.display_name?.charAt(0) || '?'
                        )}
                      </div>
                    )}

                    <div style={{
                      maxWidth: '70%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isCurrentUser ? 'flex-end' : 'flex-start'
                    }}>
                      <div style={{
                        backgroundColor: isCurrentUser ? '#1A1A1A' : '#FFFFFF',
                        color: isCurrentUser ? '#FFFFFF' : '#1A1A1A',
                        padding: '12px 16px',
                        borderRadius: '16px',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        border: isCurrentUser ? 'none' : '1px solid #E5E5E5'
                      }}>
                        {message.content}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '4px'
                      }}>
                        <span className="text-tiny text-gray">
                          {formatTime(message.created_at)}
                        </span>
                        {isCurrentUser && isMessageRead(message) && (
                          <span className="text-tiny" style={{ color: '#B0B0B0' }}>
                            既読
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* 入力エリア */}
          <div style={{
            borderTop: '1px solid #E5E5E5',
            padding: '16px 20px',
            backgroundColor: '#FFFFFF'
          }}>
            <div className="flex gap-12" style={{ alignItems: 'flex-end' }}>
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="メッセージを入力..."
                disabled={sending}
                rows={1}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '24px',
                  fontSize: '16px',
                  color: '#1A1A1A',
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  overflowY: 'hidden',
                  maxHeight: '144px'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="btn-primary"
                style={{
                  borderRadius: '24px',
                  opacity: !newMessage.trim() || sending ? 0.5 : 1,
                  flexShrink: 0
                }}
              >
                送信
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* プロフィールモーダル */}
      {showProfileModal && otherUser && (
        <div
          onClick={() => setShowProfileModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '40px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}
          >
            {/* アバター */}
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: '#E5E5E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              color: '#6B6B6B',
              overflow: 'hidden',
              margin: '0 auto 24px',
              border: '1px solid #E5E5E5'
            }}>
              {otherUser.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.display_name || ''}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <i className="fas fa-user"></i>
              )}
            </div>

            {/* 名前 */}
            <h2 className="card-title mb-8" style={{ textAlign: 'center' }}>
              {otherUser.display_name || '名前未設定'}
            </h2>

            {/* Username */}
            {otherUser.username && (
              <p className="text-small text-gray mb-24" style={{ textAlign: 'center' }}>
                @{otherUser.username}
              </p>
            )}

            {/* 自己紹介 */}
            {otherUser.bio && (
              <div className="mb-32">
                <p className="text-small" style={{
                  lineHeight: '1.7',
                  whiteSpace: 'pre-wrap',
                  color: '#6B6B6B',
                  textAlign: 'center'
                }}>
                  {otherUser.bio}
                </p>
              </div>
            )}

            {/* ボタン */}
            <div className="flex flex-col gap-16">
              {otherUser.username && (
                <Link
                  href={`/creators/${otherUser.username}`}
                  className="btn-primary"
                  style={{ width: '100%', textAlign: 'center' }}
                >
                  プロフィールを見る
                </Link>
              )}
              <button
                onClick={() => setShowProfileModal(false)}
                className="btn-secondary"
                style={{ width: '100%' }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}