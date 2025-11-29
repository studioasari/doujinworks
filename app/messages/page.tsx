'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import DashboardSidebar from '../components/DashboardSidebar'

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
    file_type: string | null
  } | null
  unread_count: number
  pinned: boolean
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
      .select('chat_room_id, last_read_at, pinned, hidden')
      .eq('profile_id', profileId)
      .eq('hidden', false) // 非表示でないもののみ

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
        .select('profile_id, profiles!chat_room_participants_profile_id_fkey(id, display_name, avatar_url)')
        .eq('chat_room_id', roomId)
        .neq('profile_id', profileId)

      const { data: lastMessage } = await supabase
        .from('messages')
        .select('content, created_at, file_type')
        .eq('chat_room_id', roomId)
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_room_id', roomId)
        .eq('deleted', false)
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
          unread_count: unreadCount || 0,
          pinned: participation.pinned || false
        })
      }
    }

    // ピン止めされたものを上に、その後は更新日時順
    roomsData.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

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

  // 最終メッセージの表示テキストを取得
  function getLastMessageText(message: ChatRoom['last_message']): string {
    if (!message) return 'メッセージがありません'
    
    // テキストがある場合はそれを表示
    if (message.content && message.content.trim() !== '') {
      return message.content
    }
    
    // テキストがなくてファイルがある場合
    if (message.file_type) {
      switch (message.file_type) {
        case 'image':
          return '画像を送信しました'
        case 'video':
          return '動画を送信しました'
        case 'pdf':
          return 'PDFを送信しました'
        case 'zip':
          return 'ZIPファイルを送信しました'
        default:
          return 'ファイルを送信しました'
      }
    }
    
    return 'メッセージ'
  }

  return (
    <>
      <Header />
      <div style={{
        display: 'flex',
        alignItems: 'flex-start'
      }}>
        <DashboardSidebar />

        <main style={{
          flex: 1,
          minHeight: '100vh',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{
            padding: '24px 40px',
            borderBottom: '1px solid #E5E5E5'
          }}>
            <h1 className="page-title">メッセージ</h1>
          </div>

          {loading && (
            <div className="loading-state">
              読み込み中...
            </div>
          )}

          {!loading && chatRooms.length === 0 && (
            <div className="empty-state">
              <p className="text-gray mb-24">メッセージがありません</p>
              <Link href="/creators" className="btn-primary">
                クリエイターを探す
              </Link>
            </div>
          )}

          {!loading && chatRooms.length > 0 && (
            <div>
              {chatRooms.map((room, index) => (
                <Link
                  key={room.id}
                  href={`/messages/${room.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '12px 20px',
                    textDecoration: 'none',
                    color: 'inherit',
                    backgroundColor: '#FFFFFF',
                    borderBottom: '1px solid #E5E5E5',
                    transition: 'background-color 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9F9F9'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF'
                  }}
                >
                  {room.pinned && (
                    <i className="fas fa-thumbtack" style={{
                      position: 'absolute',
                      top: '8px',
                      right: '12px',
                      fontSize: '12px',
                      color: '#6B6B6B'
                    }}></i>
                  )}

                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E5E5',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
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
                        minWidth: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '0 8px'
                      }}>
                        {room.unread_count}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: '6px'
                    }}>
                      <h3 style={{
                        fontSize: '15px',
                        fontWeight: room.unread_count > 0 ? 'bold' : '600',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: '#1A1A1A',
                        margin: 0
                      }}>
                        {room.other_user.display_name || '名前未設定'}
                      </h3>
                      <span style={{
                        fontSize: '12px',
                        color: '#6B6B6B',
                        flexShrink: 0,
                        marginLeft: '12px'
                      }}>
                        {room.last_message && formatMessageTime(room.last_message.created_at)}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      color: '#6B6B6B',
                      fontWeight: room.unread_count > 0 ? '600' : 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      margin: 0
                    }}>
                      {getLastMessageText(room.last_message)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  )
}