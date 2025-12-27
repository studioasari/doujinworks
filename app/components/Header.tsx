'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { getUnreadCount, markAsRead } from '@/utils/notifications'

type UnreadMessage = {
  chat_room_id: string
  sender_name: string
  sender_avatar: string | null
  content: string
  created_at: string
}

type Notification = {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMessageMenuOpen, setIsMessageMenuOpen] = useState(false)
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false)
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false)
  const [notificationTab, setNotificationTab] = useState<'notifications' | 'announcements'>('notifications')
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentMessages, setRecentMessages] = useState<UnreadMessage[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [draftCount, setDraftCount] = useState(0)
  
  // 通知関連
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 下書き件数をカウント
  useEffect(() => {
    const countDrafts = () => {
      try {
        const genres = ['illustration_drafts', 'manga_drafts', 'novel_drafts', 'music_drafts', 'voice_drafts', 'video_drafts']
        let totalCount = 0
        
        genres.forEach(genre => {
          const saved = localStorage.getItem(genre)
          if (saved) {
            const allDrafts = JSON.parse(saved)
            const count = Object.keys(allDrafts).length
            totalCount += count
          }
        })
        
        setDraftCount(totalCount)
      } catch (error) {
        console.error('下書き件数の取得エラー:', error)
        setDraftCount(0)
      }
    }

    countDrafts()
    const interval = setInterval(countDrafts, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // スマホでメニューが開いているときに背面スクロールを禁止
  useEffect(() => {
    if (isMobile && (isMessageMenuOpen || isNotificationMenuOpen || isMenuOpen || isUploadMenuOpen)) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobile, isMessageMenuOpen, isNotificationMenuOpen, isMenuOpen, isUploadMenuOpen])

  useEffect(() => {
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setUnreadCount(0)
        setRecentMessages([])
        setNotificationUnreadCount(0)
        setNotifications([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (profile?.id) {
      loadUnreadMessages()
      subscribeToMessages()
      loadNotifications()
      subscribeToNotifications()
    }
  }, [profile])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.profile-menu-container')) {
        setIsMenuOpen(false)
      }
      if (!target.closest('.message-menu-container')) {
        setIsMessageMenuOpen(false)
      }
      if (!target.closest('.notification-menu-container')) {
        setIsNotificationMenuOpen(false)
      }
      if (!target.closest('.upload-menu-container')) {
        setIsUploadMenuOpen(false)
      }
    }

    if (isMenuOpen || isMessageMenuOpen || isNotificationMenuOpen || isUploadMenuOpen) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isMenuOpen, isMessageMenuOpen, isNotificationMenuOpen, isUploadMenuOpen])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      loadProfile(user.id)
    }
  }

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    setProfile(data)
  }

  // 通知を読み込む
  const loadNotifications = async () => {
    if (!profile?.id) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('通知取得エラー:', error)
        return
      }

      setNotifications(data || [])
      
      // 未読数を取得
      const count = await getUnreadCount(profile.id)
      setNotificationUnreadCount(count)
    } catch (error) {
      console.error('通知読み込みエラー:', error)
    }
  }

  // 通知のリアルタイム購読
  const subscribeToNotifications = () => {
    if (!profile?.id) return

    const channel = supabase
      .channel('header_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profile.id}`
        },
        () => {
          loadNotifications()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profile.id}`
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  // 通知クリック時の処理
  const handleNotificationClick = async (notification: Notification) => {
    // 既読にする
    if (!notification.read) {
      await markAsRead(notification.id)
      await loadNotifications()
    }

    // リンク先に遷移
    if (notification.link) {
      setIsNotificationMenuOpen(false)
      router.push(notification.link)
    }
  }

  const loadUnreadMessages = async () => {
    if (!profile?.id) return

    try {
      const { data: participations, error: participationError } = await supabase
        .from('chat_room_participants')
        .select('chat_room_id, last_read_at, hidden')
        .eq('profile_id', profile.id)
        .eq('hidden', false)

      if (participationError) {
        console.error('参加ルーム取得エラー:', participationError)
        return
      }

      if (!participations || participations.length === 0) {
        return
      }

      let totalUnread = 0
      const messages: UnreadMessage[] = []

      for (const participation of participations) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_room_id', participation.chat_room_id)
          .eq('deleted', false)
          .neq('sender_id', profile.id)
          .gt('created_at', participation.last_read_at || '1970-01-01')

        totalUnread += count || 0

        if (messages.length < 30) {
          const { data: unreadMessages, error: messagesError } = await supabase
            .from('messages')
            .select('id, chat_room_id, content, created_at, sender_id, file_type')
            .eq('chat_room_id', participation.chat_room_id)
            .eq('deleted', false)
            .neq('sender_id', profile.id)
            .gt('created_at', participation.last_read_at || '1970-01-01')
            .order('created_at', { ascending: false })
            .limit(30 - messages.length)

          if (messagesError) {
            console.error('メッセージ取得エラー:', messagesError)
            continue
          }

          if (unreadMessages && unreadMessages.length > 0) {
            for (const msg of unreadMessages) {
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('display_name, avatar_url')
                .eq('id', msg.sender_id)
                .single()

              let displayContent = msg.content
              if (!displayContent || displayContent.trim() === '') {
                if (msg.file_type === 'image') {
                  displayContent = '画像を送信しました'
                } else if (msg.file_type === 'video') {
                  displayContent = '動画を送信しました'
                } else if (msg.file_type === 'pdf') {
                  displayContent = 'PDFを送信しました'
                } else if (msg.file_type === 'zip') {
                  displayContent = 'ZIPファイルを送信しました'
                } else if (msg.file_type) {
                  displayContent = 'ファイルを送信しました'
                } else {
                  displayContent = 'メッセージ'
                }
              }

              messages.push({
                chat_room_id: msg.chat_room_id,
                sender_name: senderProfile?.display_name || '名前未設定',
                sender_avatar: senderProfile?.avatar_url || null,
                content: displayContent,
                created_at: msg.created_at
              })
            }
          }
        }
      }

      messages.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setUnreadCount(totalUnread)
      setRecentMessages(messages.slice(0, 30))
    } catch (error) {
      console.error('loadUnreadMessages 全体エラー:', error)
    }
  }

  const subscribeToMessages = () => {
    if (!profile?.id) return

    const channel = supabase
      .channel('header_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as any
          if (newMessage.sender_id !== profile.id && !newMessage.deleted) {
            loadUnreadMessages()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_room_participants',
          filter: `profile_id=eq.${profile.id}`
        },
        () => {
          loadUnreadMessages()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const updatedMessage = payload.new as any
          if (updatedMessage.deleted) {
            loadUnreadMessages()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsMenuOpen(false)
    router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
  }

  const formatMessageTime = (dateString: string) => {
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

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getNotificationIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      application: 'fa-paper-plane',
      accepted: 'fa-check-circle',
      paid: 'fa-credit-card',
      delivered: 'fa-box',
      completed: 'fa-flag-checkered',
      review: 'fa-star'
    }
    return icons[type] || 'fa-bell'
  }

  const MessageIcon = () => (
    <div className="message-menu-container" style={{ position: 'relative' }}>
      <button
        onClick={() => {
          setIsNotificationMenuOpen(false)
          setIsMenuOpen(false)
          setIsUploadMenuOpen(false)
          setIsMessageMenuOpen(!isMessageMenuOpen)
        }}
        style={{
          color: '#555555',
          fontSize: '20px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          position: 'relative'
        }}
      >
        <i className="far fa-envelope"></i>
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            backgroundColor: '#C05656',
            color: '#FFFFFF',
            borderRadius: '10px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: '600',
            padding: '0 5px'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {isMessageMenuOpen && (
        <>
          <div 
            className="message-overlay"
            onClick={() => setIsMessageMenuOpen(false)}
            style={{
              position: 'fixed',
              top: '64px',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              display: isMobile ? 'block' : 'none'
            }}
          />
          
          <div className="message-dropdown" style={isMobile ? {
            position: 'fixed',
            top: '64px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            border: 'none',
            borderRadius: 0,
            zIndex: 9999,
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column'
          } : {
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid #D0D5DA',
            borderRadius: '8px',
            minWidth: '320px',
            maxWidth: '400px',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #D0D5DA',
              fontWeight: '600',
              fontSize: '14px',
              color: '#222222',
              textAlign: isMobile ? 'center' : 'left'
            }}>
              メッセージ
            </div>

            {recentMessages.length === 0 ? (
              <div style={{
                padding: '40px 16px',
                textAlign: 'center',
                color: '#888888',
                fontSize: '14px'
              }}>
                新しいメッセージはありません
              </div>
            ) : (
              <div style={isMobile ? {
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch'
              } : {
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {recentMessages.map((message, index) => (
                  <Link
                    key={`${message.chat_room_id}-${index}`}
                    href={`/messages/${message.chat_room_id}`}
                    onClick={() => setIsMessageMenuOpen(false)}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px 16px',
                      textDecoration: 'none',
                      borderBottom: index < recentMessages.length - 1 ? '1px solid #EEF0F3' : 'none',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F5F6F8'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <div className="avatar avatar-medium">
                      {message.sender_avatar ? (
                        <img
                          src={message.sender_avatar}
                          alt={message.sender_name}
                        />
                      ) : (
                        <span style={{ fontSize: '16px', color: '#888888' }}>
                          {message.sender_name.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex-between mb-4">
                        <div style={{
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#222222',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {message.sender_name}
                        </div>
                        <div className="text-tiny text-gray" style={{
                          flexShrink: 0,
                          marginLeft: '8px'
                        }}>
                          {formatMessageTime(message.created_at)}
                        </div>
                      </div>
                      <div className="text-small text-secondary text-ellipsis">
                        {truncateText(message.content, 40)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <Link
              href="/messages"
              onClick={() => setIsMessageMenuOpen(false)}
              style={isMobile ? {
                display: 'block',
                padding: '12px 16px',
                textAlign: 'center',
                color: '#222222',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600',
                margin: '16px',
                backgroundColor: '#EEF0F3',
                borderRadius: '8px',
                border: 'none',
                transition: 'background-color 0.2s'
              } : {
                display: 'block',
                padding: '12px 16px',
                textAlign: 'center',
                color: '#222222',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600',
                borderTop: '1px solid #D0D5DA',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F5F6F8'
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              メッセージを確認する
            </Link>
          </div>
        </>
      )}
    </div>
  )

  const NotificationIcon = () => (
    <div className="notification-menu-container" style={{ position: 'relative' }}>
      <button
        onClick={() => {
          setIsMessageMenuOpen(false)
          setIsMenuOpen(false)
          setIsUploadMenuOpen(false)
          setIsNotificationMenuOpen(!isNotificationMenuOpen)
          if (!isNotificationMenuOpen) {
            setNotificationTab('notifications')
          }
        }}
        style={{
          color: '#555555',
          fontSize: '20px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          position: 'relative'
        }}
      >
        <i className="far fa-bell"></i>
        {notificationUnreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            backgroundColor: '#C05656',
            color: '#FFFFFF',
            borderRadius: '10px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: '600',
            padding: '0 5px'
          }}>
            {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
          </div>
        )}
      </button>

      {isNotificationMenuOpen && (
        <>
          <div 
            className="notification-overlay"
            onClick={() => setIsNotificationMenuOpen(false)}
            style={{
              position: 'fixed',
              top: '64px',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              display: isMobile ? 'block' : 'none'
            }}
          />
          
          <div className="notification-dropdown" style={isMobile ? {
            position: 'fixed',
            top: '64px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            border: 'none',
            borderRadius: 0,
            zIndex: 9999,
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column'
          } : {
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid #D0D5DA',
            borderRadius: '8px',
            minWidth: '320px',
            maxWidth: '400px',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <div className="notification-tabs" style={{
              display: 'flex',
              borderBottom: '1px solid #D0D5DA'
            }}>
              <button 
                onClick={() => setNotificationTab('notifications')}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${notificationTab === 'notifications' ? '#5B7C99' : 'transparent'}`,
                  color: notificationTab === 'notifications' ? '#222222' : '#555555',
                  fontWeight: notificationTab === 'notifications' ? '600' : '400',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                通知
              </button>
              <button 
                onClick={() => setNotificationTab('announcements')}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${notificationTab === 'announcements' ? '#5B7C99' : 'transparent'}`,
                  color: notificationTab === 'announcements' ? '#222222' : '#555555',
                  fontWeight: notificationTab === 'announcements' ? '600' : '400',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                お知らせ
              </button>
            </div>

            <div className="notification-content" style={isMobile ? {
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch'
            } : {
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {notificationTab === 'notifications' ? (
                notifications.length === 0 ? (
                  <div style={{
                    padding: '40px 16px',
                    textAlign: 'center',
                    color: '#888888',
                    fontSize: '14px'
                  }}>
                    新しい通知はありません
                  </div>
                ) : (
                  <div>
                    {notifications.map((notification, index) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          padding: '12px 16px',
                          cursor: notification.link ? 'pointer' : 'default',
                          backgroundColor: notification.read ? 'transparent' : '#EEF0F3',
                          borderBottom: index < notifications.length - 1 ? '1px solid #EEF0F3' : 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (notification.link) {
                            e.currentTarget.style.backgroundColor = '#F5F6F8'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = notification.read ? 'transparent' : '#EEF0F3'
                        }}
                      >
                        <div className="avatar avatar-medium">
                          <i className={`fas ${getNotificationIcon(notification.type)}`} style={{ fontSize: '16px', color: '#555555' }}></i>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="flex-between mb-4">
                            <div style={{
                              fontWeight: '600',
                              fontSize: '14px',
                              color: '#222222'
                            }}>
                              {notification.title}
                            </div>
                            <div className="text-tiny text-gray" style={{
                              flexShrink: 0,
                              marginLeft: '8px'
                            }}>
                              {formatMessageTime(notification.created_at)}
                            </div>
                          </div>
                          <div className="text-small text-secondary text-ellipsis">
                            {notification.message}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div style={{
                  padding: '40px 16px',
                  textAlign: 'center',
                  color: '#888888',
                  fontSize: '14px'
                }}>
                  新しいお知らせはありません
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )

  const UploadButton = () => (
    <div className="upload-menu-container" style={{ position: 'relative' }}>
      {/* デスクトップ版 */}
      {!isMobile && (
        <div style={{
          display: 'flex',
          backgroundColor: '#5B7C99',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <Link
            href="/portfolio/upload"
            className="btn-primary"
            style={{
              padding: '8px 16px',
              borderRadius: 0,
              borderRight: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-pen" style={{ fontSize: '12px' }}></i>
            投稿
          </Link>

          <button
            onClick={() => {
              setIsMessageMenuOpen(false)
              setIsNotificationMenuOpen(false)
              setIsMenuOpen(false)
              setIsUploadMenuOpen(!isUploadMenuOpen)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-chevron-down" style={{ fontSize: '10px' }}></i>
          </button>
        </div>
      )}

      {/* モバイル版 */}
      {isMobile && (
        <div style={{
          display: 'flex',
          backgroundColor: '#5B7C99',
          borderRadius: '20px',
          overflow: 'hidden',
          height: '36px'
        }}>
          <Link
            href="/portfolio/upload"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 12px',
              color: '#FFFFFF',
              textDecoration: 'none',
              borderRight: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <i className="fas fa-pen" style={{ fontSize: '14px' }}></i>
          </Link>

          <button
            onClick={() => {
              setIsMessageMenuOpen(false)
              setIsNotificationMenuOpen(false)
              setIsMenuOpen(false)
              setIsUploadMenuOpen(!isUploadMenuOpen)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 10px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-chevron-down" style={{ fontSize: '8px' }}></i>
          </button>
        </div>
      )}

      {isUploadMenuOpen && (
        <>
          <div 
            className="upload-overlay"
            onClick={() => setIsUploadMenuOpen(false)}
            style={{
              position: 'fixed',
              top: '64px',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              display: isMobile ? 'block' : 'none'
            }}
          />
          
          <div className="upload-dropdown" style={isMobile ? {
            position: 'fixed',
            top: '64px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            border: 'none',
            borderRadius: 0,
            zIndex: 9999,
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column'
          } : {
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid #D0D5DA',
            borderRadius: '8px',
            minWidth: '180px',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <Link
              href="/portfolio/drafts"
              onClick={() => setIsUploadMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                color: '#222222',
                textDecoration: 'none',
                fontSize: '14px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F5F6F8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <i className="fas fa-file-alt" style={{ color: '#555555', width: '16px', fontSize: '14px' }}></i>
              下書き ({draftCount})
            </Link>
          </div>
        </>
      )}
    </div>
  )

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .header-container {
          padding: 16px 40px;
          height: 64px;
          box-sizing: border-box;
        }
        
        @media (max-width: 768px) {
          .desktop-nav, .desktop-search {
            display: none !important;
          }
          .header-container {
            padding: 12px 16px;
            height: 60px;
            box-sizing: border-box;
          }
        }
        
        @media (min-width: 769px) {
          .mobile-nav {
            display: none !important;
          }
        }
      `}} />

      <header className="header-container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #D0D5DA',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        gap: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
          gap: '20px'
        }}>
          <Link href="/" style={{ 
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <img 
              src="/logotype.png" 
              alt="同人ワークス" 
              style={{ 
                height: '20px',
                display: 'block'
              }} 
            />
          </Link>
          
          {/* デスクトップ検索ボックス */}
          <div className="desktop-search" style={{ 
            position: 'relative', 
            flex: 1,
            maxWidth: '500px'
          }}>
            <i className="fas fa-search" style={{ 
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#888888',
              fontSize: '14px'
            }}></i>
            <input
              type="text"
              placeholder="作品やクリエイターを検索"
              className="input-field"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = (e.target as HTMLInputElement).value
                  if (query.trim()) {
                    router.push(`/search?q=${encodeURIComponent(query)}`)
                  }
                }
              }}
              style={{
                paddingLeft: '44px',
                borderRadius: '24px',
                backgroundColor: '#EEF0F3'
              }}
              onFocus={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF'
              }}
              onBlur={(e) => {
                e.currentTarget.style.backgroundColor = '#EEF0F3'
              }}
            />
          </div>

          {/* 右側のアイコン群（デスクトップ） */}
          <nav className="desktop-nav" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
            {user ? (
              <>
                <MessageIcon />
                <NotificationIcon />

                <div className="profile-menu-container" style={{ position: 'relative' }}>
                  <button
                    onClick={() => {
                      setIsMessageMenuOpen(false)
                      setIsNotificationMenuOpen(false)
                      setIsUploadMenuOpen(false)
                      setIsMenuOpen(!isMenuOpen)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      textDecoration: 'none',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <div className="avatar avatar-medium" style={{
                      border: `2px solid ${isMenuOpen ? '#5B7C99' : '#D0D5DA'}`
                    }}>
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.display_name || 'プロフィール'}
                        />
                      ) : (
                        <i className="fas fa-user" style={{ 
                          fontSize: '16px'
                        }}></i>
                      )}
                    </div>
                  </button>

                  {isMenuOpen && (
                    <>
                      <div 
                        className="profile-overlay"
                        onClick={() => setIsMenuOpen(false)}
                        style={{
                          position: 'fixed',
                          top: '64px',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          zIndex: 998,
                          display: isMobile ? 'block' : 'none'
                        }}
                      />
                      
                      <div style={isMobile ? {
                        position: 'fixed',
                        top: '64px',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#FFFFFF',
                        border: 'none',
                        borderRadius: 0,
                        zIndex: 999,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '16px'
                      } : {
                        position: 'absolute',
                        top: 'calc(100% + 12px)',
                        right: 0,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D0D5DA',
                        borderRadius: '8px',
                        minWidth: '200px',
                        zIndex: 1000,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}>
                        <Link
                          href="/dashboard"
                          onClick={() => setIsMenuOpen(false)}
                          style={isMobile ? {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            color: '#222222',
                            textDecoration: 'none',
                            fontSize: '16px',
                            backgroundColor: '#EEF0F3',
                            borderRadius: '8px',
                            marginBottom: '12px',
                            transition: 'background-color 0.2s'
                          } : {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            color: '#222222',
                            textDecoration: 'none',
                            fontSize: '14px',
                            borderBottom: '1px solid #D0D5DA',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (!isMobile) {
                              e.currentTarget.style.backgroundColor = '#F5F6F8'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isMobile) {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          <i className="fas fa-th-large" style={{ color: '#555555', width: '16px' }}></i>
                          ダッシュボード
                        </Link>

                        <button
                          onClick={handleLogout}
                          style={isMobile ? {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            width: '100%',
                            backgroundColor: '#EEF0F3',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#222222',
                            textDecoration: 'none',
                            fontSize: '16px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background-color 0.2s'
                          } : {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            width: '100%',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#222222',
                            textDecoration: 'none',
                            fontSize: '14px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (!isMobile) {
                              e.currentTarget.style.backgroundColor = '#F5F6F8'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isMobile) {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          <i className="fas fa-sign-out-alt" style={{ color: '#555555', width: '16px' }}></i>
                          ログアウト
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <UploadButton />
              </>
            ) : (
              <>
                <Link 
                  href={`/login?redirect=${encodeURIComponent(pathname)}`}
                  className="btn-secondary"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '20px'
                  }}
                >
                  ログイン
                </Link>

                <Link 
                  href="/signup"
                  className="btn-primary"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '20px'
                  }}
                >
                  会員登録
                </Link>
              </>
            )}
          </nav>

          {/* モバイルナビゲーション */}
          <nav className="mobile-nav" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {user ? (
              <>
                <MessageIcon />
                <NotificationIcon />

                <div className="profile-menu-container" style={{ position: 'relative' }}>
                  <button
                    onClick={() => {
                      setIsMessageMenuOpen(false)
                      setIsNotificationMenuOpen(false)
                      setIsUploadMenuOpen(false)
                      setIsMenuOpen(!isMenuOpen)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      textDecoration: 'none',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <div className="avatar avatar-medium" style={{
                      border: `2px solid ${isMenuOpen ? '#5B7C99' : '#D0D5DA'}`
                    }}>
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.display_name || 'プロフィール'}
                        />
                      ) : (
                        <i className="fas fa-user" style={{ 
                          fontSize: '16px'
                        }}></i>
                      )}
                    </div>
                  </button>

                  {isMenuOpen && (
                    <>
                      <div 
                        className="profile-overlay"
                        onClick={() => setIsMenuOpen(false)}
                        style={{
                          position: 'fixed',
                          top: '60px',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          zIndex: 998
                        }}
                      />
                      
                      <div style={{
                        position: 'fixed',
                        top: '60px',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#FFFFFF',
                        border: 'none',
                        borderRadius: 0,
                        zIndex: 999,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '16px'
                      }}>
                        <Link
                          href="/dashboard"
                          onClick={() => setIsMenuOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            color: '#222222',
                            textDecoration: 'none',
                            fontSize: '16px',
                            backgroundColor: '#EEF0F3',
                            borderRadius: '8px',
                            marginBottom: '12px'
                          }}
                        >
                          <i className="fas fa-th-large" style={{ color: '#555555', width: '16px' }}></i>
                          ダッシュボード
                        </Link>

                        <button
                          onClick={handleLogout}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            width: '100%',
                            backgroundColor: '#EEF0F3',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#222222',
                            textDecoration: 'none',
                            fontSize: '16px',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <i className="fas fa-sign-out-alt" style={{ color: '#555555', width: '16px' }}></i>
                          ログアウト
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <UploadButton />
              </>
            ) : (
              <>
                <Link 
                  href={`/login?redirect=${encodeURIComponent(pathname)}`}
                  className="btn-secondary btn-small"
                  style={{
                    borderRadius: '20px'
                  }}
                >
                  ログイン
                </Link>

                <Link 
                  href="/signup"
                  className="btn-primary btn-small"
                  style={{
                    borderRadius: '20px'
                  }}
                >
                  会員登録
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  )
}