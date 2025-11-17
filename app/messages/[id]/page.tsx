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
  display_name: string | null
  avatar_url: string | null
}

export default function ChatRoomPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentUserId && roomId) {
      fetchMessages()
      subscribeToMessages()
      updateLastReadAt()
    }
  }, [currentUserId, roomId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setCurrentUserId(user.id)
      fetchOtherUser(user.id)
    }
  }

  async function fetchOtherUser(userId: string) {
    const { data } = await supabase
      .from('chat_room_participants')
      .select('user_id, profiles(id, display_name, avatar_url)')
      .eq('chat_room_id', roomId)
      .neq('user_id', userId)
      .single()

    if (data) {
      const profile = data.profiles as any
      setOtherUser({
        id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url
      })
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
          setMessages(prev => [...prev, payload.new as Message])
          updateLastReadAt()
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
      .eq('user_id', currentUserId)
  }

  async function sendMessage() {
    if (!newMessage.trim() || sending) return

    setSending(true)

    const { error } = await supabase
      .from('messages')
      .insert({
        chat_room_id: roomId,
        sender_id: currentUserId,
        content: newMessage.trim()
      })

    if (error) {
      console.error('メッセージ送信エラー:', error)
      alert('メッセージの送信に失敗しました')
    } else {
      setNewMessage('')
    }

    setSending(false)
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  return (
    <>
      <Header />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 80px)',
        backgroundColor: '#FFFFFF'
      }}>
        {/* ヘッダー */}
        <div style={{
          borderBottom: '1px solid #E5E5E5',
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div className="flex gap-16" style={{ alignItems: 'center' }}>
            <Link
              href="/messages"
              className="text-gray"
              style={{
                textDecoration: 'none',
                fontSize: '24px'
              }}
            >
              ←
            </Link>

            {otherUser && (
              <>
                <div className="avatar avatar-medium">
                  {otherUser.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt={otherUser.display_name || ''}
                    />
                  ) : (
                    otherUser.display_name?.charAt(0) || '?'
                  )}
                </div>
                <Link
                  href={`/creators/${otherUser.id}`}
                  className="card-title"
                  style={{
                    textDecoration: 'none',
                    fontSize: '18px'
                  }}
                >
                  {otherUser.display_name || '名前未設定'}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* メッセージエリア */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          backgroundColor: '#F9F9F9'
        }}>
          {loading && (
            <div className="loading-state" style={{ padding: '40px 20px' }}>
              読み込み中...
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              メッセージがありません
            </div>
          )}

          {!loading && messages.map((message, index) => {
            const isCurrentUser = message.sender_id === currentUserId
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
                  marginBottom: '12px'
                }}>
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
                      border: isCurrentUser ? 'none' : '1px solid #E5E5E5'
                    }}>
                      {message.content}
                    </div>
                    <span className="text-tiny text-gray" style={{ marginTop: '4px' }}>
                      {formatTime(message.created_at)}
                    </span>
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
          <div className="flex gap-12" style={{
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="メッセージを入力..."
              disabled={sending}
              className="input-field"
              style={{
                flex: 1,
                borderRadius: '24px'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              style={{
                padding: '12px 24px',
                backgroundColor: !newMessage.trim() || sending ? '#E5E5E5' : '#1A1A1A',
                color: !newMessage.trim() || sending ? '#6B6B6B' : '#FFFFFF',
                border: 'none',
                borderRadius: '24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: !newMessage.trim() || sending ? 'not-allowed' : 'pointer'
              }}
            >
              送信
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}