'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import DashboardSidebar from '../components/DashboardSidebar'
import styles from './page.module.css'

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
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
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
      .eq('hidden', false)

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

  function getLastMessageText(message: ChatRoom['last_message']): string {
    if (!message) return 'メッセージがありません'
    
    if (message.content && message.content.trim() !== '') {
      return message.content
    }
    
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
      <div className={styles.pageWrapper}>
        <DashboardSidebar />

        <main className={styles.main}>
          <div className={styles.header}>
            <h1 className={styles.title}>メッセージ</h1>
          </div>

          {loading && (
            <div className={styles.loading}>
              <i className="fas fa-spinner fa-spin"></i>
              <span>読み込み中...</span>
            </div>
          )}

          {!loading && chatRooms.length === 0 && (
            <div className={styles.emptyState}>
              <i className="far fa-comments"></i>
              <p>メッセージはまだありません</p>
              <Link href="/creators" className="btn btn-primary">
                クリエイターを探す
              </Link>
            </div>
          )}

          {!loading && chatRooms.length > 0 && (
            <div className={styles.messageList}>
              {chatRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/messages/${room.id}`}
                  className={styles.messageItem}
                >
                  {room.pinned && (
                    <i className={`fas fa-thumbtack ${styles.pinIcon}`}></i>
                  )}

                  <div className={styles.avatarWrapper}>
                    <div className={styles.avatar}>
                      {room.other_user.avatar_url ? (
                        <img
                          src={room.other_user.avatar_url}
                          alt={room.other_user.display_name || ''}
                        />
                      ) : (
                        room.other_user.display_name?.charAt(0) || '?'
                      )}
                    </div>
                    {room.unread_count > 0 && (
                      <span className={styles.unreadBadge}>
                        {room.unread_count > 99 ? '99+' : room.unread_count}
                      </span>
                    )}
                  </div>

                  <div className={styles.content}>
                    <div className={styles.contentHeader}>
                      <h3 className={`${styles.name} ${room.unread_count > 0 ? styles.unread : ''}`}>
                        {room.other_user.display_name || '名前未設定'}
                      </h3>
                      <span className={styles.time}>
                        {room.last_message && formatMessageTime(room.last_message.created_at)}
                      </span>
                    </div>
                    <p className={`${styles.lastMessage} ${room.unread_count > 0 ? styles.unread : ''}`}>
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