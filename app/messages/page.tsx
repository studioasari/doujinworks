'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'

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
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

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
      fetchChatRooms(profile.id)
    }
  }

  async function fetchChatRooms(profileId: string) {
    setLoading(true)

    const { data: participations, error: participationsError } = await supabase
      .from('chat_room_participants')
      .select('chat_room_id, last_read_at')
      .eq('user_id', profileId)

    if (participationsError) {
      console.error('チャットルーム取得エラー:', participationsError)
      setLoading(false)
      return
    }

    if (!participations || participations.length === 0) {
      setLoading(false)
      return
    }

    const roomsData: ChatRoom[] = []

    for (const participation of participations) {
      const roomId = participation.chat_room_id

      const { data: otherParticipants } = await supabase
        .from('chat_room_participants')
        .select('user_id, profiles!chat_room_participants_user_id_fkey(id, display_name, avatar_url)')
        .eq('chat_room_id', roomId)
        .neq('user_id', profileId)

      const { data: lastMessage } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_room_id', roomId)
        .neq('sender_id', profileId)
        .gt('created_at', participation.last_read_at || '1970-01-01')

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

    roomsData.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    setChatRooms(roomsData)
    setLoading(false)
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
        height: 'calc(100vh - 80px)',
        backgroundColor: '#FFFFFF'
      }}>
        {/* 左サイドバー: メッセージ一覧 */}
        <aside style={{
          width: '320px',
          borderRight: '1px solid #E5E5E5',
          backgroundColor: '#FFFFFF',
          overflowY: 'auto',
          flexShrink: 0
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #E5E5E5',
            position: 'sticky',
            top: 0,
            backgroundColor: '#FFFFFF',
            zIndex: 10
          }}>
            <h2 className="card-title">メッセージ</h2>
          </div>

          {loading && (
            <div className="loading-state" style={{ padding: '40px 20px' }}>
              読み込み中...
            </div>
          )}

          {!loading && chatRooms.length === 0 && (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p className="text-gray text-small mb-16">メッセージがありません</p>
              <Link href="/creators" className="btn-primary btn-small" style={{ width: '100%', textAlign: 'center' }}>
                クリエイターを探す
              </Link>
            </div>
          )}

          {!loading && chatRooms.length > 0 && (
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
                    backgroundColor: '#FFFFFF',
                    transition: 'background-color 0.2s',
                    display: 'flex'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF'
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
                    // overflow: hidden を削除
                  }}>
                    {room.other_user.avatar_url ? (
                      <img
                        src={room.other_user.avatar_url}
                        alt={room.other_user.display_name || ''}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '50%'  // ← これを追加
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

        {/* 右側: 空の状態（PC版のみ表示） */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAFAFA'
        }}
        className="hidden-mobile"
        >
          <div style={{ textAlign: 'center', color: '#6B6B6B' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>
              <i className="fas fa-comments"></i>
            </div>
            <p className="text-gray" style={{ fontSize: '18px' }}>
              チャットを選択してください
            </p>
          </div>
        </div>
      </div>
    </>
  )
}