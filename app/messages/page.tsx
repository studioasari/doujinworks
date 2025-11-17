'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

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

export default function MessagesPage() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setCurrentUserId(user.id)
      fetchChatRooms(user.id)
    }
  }

  async function fetchChatRooms(userId: string) {
    setLoading(true)

    // 自分が参加しているチャットルームを取得
    const { data: participations, error: participationsError } = await supabase
      .from('chat_room_participants')
      .select('chat_room_id, last_read_at')
      .eq('user_id', userId)

    if (participationsError) {
      console.error('チャットルーム取得エラー:', participationsError)
      setLoading(false)
      return
    }

    if (!participations || participations.length === 0) {
      setLoading(false)
      return
    }

    const roomIds = participations.map(p => p.chat_room_id)

    // 各チャットルームの情報を取得
    const roomsData: ChatRoom[] = []

    for (const participation of participations) {
      const roomId = participation.chat_room_id

      // 相手のユーザー情報を取得
      const { data: otherParticipants } = await supabase
        .from('chat_room_participants')
        .select('user_id, profiles(id, display_name, avatar_url)')
        .eq('chat_room_id', roomId)
        .neq('user_id', userId)

      // 最新メッセージを取得
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // 未読メッセージ数を取得
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_room_id', roomId)
        .neq('sender_id', userId)
        .gt('created_at', participation.last_read_at || '1970-01-01')

      // チャットルームの更新日時を取得
      const { data: roomData } = await supabase
        .from('chat_rooms')
        .select('updated_at')
        .eq('id', roomId)
        .single()

      if (otherParticipants && otherParticipants.length > 0) {
        const otherUser = otherParticipants[0].profiles as any

        roomsData.push({
          id: roomId,
          updated_at: roomData?.updated_at || '',
          other_user: {
            id: otherUser.id,
            display_name: otherUser.display_name,
            avatar_url: otherUser.avatar_url
          },
          last_message: lastMessage || null,
          unread_count: unreadCount || 0
        })
      }
    }

    // 最新の更新順にソート
    roomsData.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    setChatRooms(roomsData)
    setLoading(false)
  }

  function formatDate(dateString: string) {
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
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow">
          <h1 className="page-title mb-40">
            メッセージ
          </h1>

          {loading && (
            <div className="loading-state">
              読み込み中...
            </div>
          )}

          {!loading && chatRooms.length === 0 && (
            <div className="empty-state">
              <p className="text-gray mb-24">
                メッセージがありません
              </p>
              <Link href="/creators" className="btn-primary">
                クリエイターを探す
              </Link>
            </div>
          )}

          {!loading && chatRooms.length > 0 && (
            <div className="card-no-hover" style={{ overflow: 'hidden' }}>
              {chatRooms.map((room, index) => (
                <Link
                  key={room.id}
                  href={`/messages/${room.id}`}
                  className="flex gap-16"
                  style={{
                    alignItems: 'center',
                    padding: '20px',
                    textDecoration: 'none',
                    borderBottom: index < chatRooms.length - 1 ? '1px solid #E5E5E5' : 'none',
                    backgroundColor: room.unread_count > 0 ? '#F9F9F9' : '#FFFFFF',
                    transition: 'background-color 0.2s',
                    display: 'flex'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = room.unread_count > 0 ? '#F9F9F9' : '#FFFFFF'
                  }}
                >
                  {/* アバター */}
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E5E5',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#6B6B6B',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {room.other_user.avatar_url ? (
                      <img
                        src={room.other_user.avatar_url}
                        alt={room.other_user.display_name || ''}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
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
                        minWidth: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '0 6px'
                      }}>
                        {room.unread_count}
                      </div>
                    )}
                  </div>

                  {/* メッセージ情報 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex-between mb-8" style={{ alignItems: 'baseline' }}>
                      <h3 className="card-subtitle" style={{
                        fontWeight: room.unread_count > 0 ? 'bold' : '600'
                      }}>
                        {room.other_user.display_name || '名前未設定'}
                      </h3>
                      <span className="text-tiny text-gray">
                        {room.last_message && formatDate(room.last_message.created_at)}
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
        </div>
      </div>
      <Footer />
    </>
  )
}