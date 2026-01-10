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
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const countDrafts = () => {
      try {
        const genres = ['illustration_drafts', 'manga_drafts', 'novel_drafts', 'music_drafts', 'voice_drafts', 'video_drafts']
        let totalCount = 0
        genres.forEach(genre => {
          const saved = localStorage.getItem(genre)
          if (saved) {
            totalCount += Object.keys(JSON.parse(saved)).length
          }
        })
        setDraftCount(totalCount)
      } catch (error) {
        setDraftCount(0)
      }
    }
    countDrafts()
    const interval = setInterval(countDrafts, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isMobile && (isMessageMenuOpen || isNotificationMenuOpen || isMenuOpen || isUploadMenuOpen)) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
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
      if (!target.closest('.profile-menu-container')) setIsMenuOpen(false)
      if (!target.closest('.message-menu-container')) setIsMessageMenuOpen(false)
      if (!target.closest('.notification-menu-container')) setIsNotificationMenuOpen(false)
      if (!target.closest('.upload-menu-container')) setIsUploadMenuOpen(false)
    }
    if (isMenuOpen || isMessageMenuOpen || isNotificationMenuOpen || isUploadMenuOpen) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMenuOpen, isMessageMenuOpen, isNotificationMenuOpen, isUploadMenuOpen])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) loadProfile(user.id)
  }

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).single()
    setProfile(data)
  }

  const loadNotifications = async () => {
    if (!profile?.id) return
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifications(data || [])
      const count = await getUnreadCount(profile.id)
      setNotificationUnreadCount(count)
    } catch (error) {
      console.error('通知読み込みエラー:', error)
    }
  }

  const subscribeToNotifications = () => {
    if (!profile?.id) return
    const channel = supabase
      .channel('header_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profile.id}` }, () => loadNotifications())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profile.id}` }, () => loadNotifications())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
      await loadNotifications()
    }
    if (notification.link) {
      setIsNotificationMenuOpen(false)
      router.push(notification.link)
    }
  }

  const loadUnreadMessages = async () => {
    if (!profile?.id) return
    try {
      const { data: participations } = await supabase
        .from('chat_room_participants')
        .select('chat_room_id, last_read_at, hidden')
        .eq('profile_id', profile.id)
        .eq('hidden', false)

      if (!participations?.length) return

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
          const { data: unreadMessages } = await supabase
            .from('messages')
            .select('id, chat_room_id, content, created_at, sender_id, file_type')
            .eq('chat_room_id', participation.chat_room_id)
            .eq('deleted', false)
            .neq('sender_id', profile.id)
            .gt('created_at', participation.last_read_at || '1970-01-01')
            .order('created_at', { ascending: false })
            .limit(30 - messages.length)

          if (unreadMessages?.length) {
            for (const msg of unreadMessages) {
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('display_name, avatar_url')
                .eq('id', msg.sender_id)
                .single()

              let displayContent = msg.content
              if (!displayContent?.trim()) {
                const fileLabels: { [key: string]: string } = {
                  image: '画像を送信しました',
                  video: '動画を送信しました',
                  pdf: 'PDFを送信しました',
                  zip: 'ZIPファイルを送信しました'
                }
                displayContent = fileLabels[msg.file_type] || (msg.file_type ? 'ファイルを送信しました' : 'メッセージ')
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

      messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setUnreadCount(totalUnread)
      setRecentMessages(messages.slice(0, 30))
    } catch (error) {
      console.error('loadUnreadMessages エラー:', error)
    }
  }

  const subscribeToMessages = () => {
    if (!profile?.id) return
    const channel = supabase
      .channel('header_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMessage = payload.new as any
        if (newMessage.sender_id !== profile.id && !newMessage.deleted) loadUnreadMessages()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_room_participants', filter: `profile_id=eq.${profile.id}` }, () => loadUnreadMessages())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        if ((payload.new as any).deleted) loadUnreadMessages()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsMenuOpen(false)
    router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
  }

  const formatMessageTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}日前`
    if (hours > 0) return `${hours}時間前`
    return '今'
  }

  const truncateText = (text: string, maxLength: number) => 
    text.length <= maxLength ? text : text.substring(0, maxLength) + '...'

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

  const closeAllMenus = () => {
    setIsMenuOpen(false)
    setIsMessageMenuOpen(false)
    setIsNotificationMenuOpen(false)
    setIsUploadMenuOpen(false)
  }

  // メッセージメニュー
  const MessageMenu = () => (
    <div className="message-menu-container" style={{ position: 'relative' }}>
      <button
        className="header-icon-btn"
        onClick={() => { closeAllMenus(); setIsMessageMenuOpen(!isMessageMenuOpen) }}
      >
        <i className="far fa-envelope"></i>
        {unreadCount > 0 && (
          <span className="header-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isMessageMenuOpen && (
        <>
          {isMobile && <div className="header-overlay" onClick={() => setIsMessageMenuOpen(false)} />}
          <div className="header-dropdown" style={isMobile ? { position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0, borderRadius: 0, display: 'flex', flexDirection: 'column' } : {}}>
            <div className="header-dropdown-header">メッセージ</div>
            {recentMessages.length === 0 ? (
              <div className="header-empty">新しいメッセージはありません</div>
            ) : (
              <div className="header-dropdown-content" style={isMobile ? { flex: 1 } : {}}>
                {recentMessages.map((message, index) => (
                  <Link
                    key={`${message.chat_room_id}-${index}`}
                    href={`/messages/${message.chat_room_id}`}
                    className="header-message-item"
                    onClick={() => setIsMessageMenuOpen(false)}
                  >
                    <div className="header-message-avatar">
                      {message.sender_avatar ? (
                        <img src={message.sender_avatar} alt="" />
                      ) : (
                        <i className="fas fa-user" style={{ color: '#888888' }}></i>
                      )}
                    </div>
                    <div className="header-message-content">
                      <div className="header-message-name">{message.sender_name}</div>
                      <div className="header-message-text">{truncateText(message.content, 40)}</div>
                    </div>
                    <div className="header-message-time">{formatMessageTime(message.created_at)}</div>
                  </Link>
                ))}
              </div>
            )}
            <div className="header-dropdown-footer">
              <Link href="/messages" onClick={() => setIsMessageMenuOpen(false)}>
                メッセージを確認する
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )

  // 通知メニュー
  const NotificationMenu = () => (
    <div className="notification-menu-container" style={{ position: 'relative' }}>
      <button
        className="header-icon-btn"
        onClick={() => { closeAllMenus(); setIsNotificationMenuOpen(!isNotificationMenuOpen); setNotificationTab('notifications') }}
      >
        <i className="far fa-bell"></i>
        {notificationUnreadCount > 0 && (
          <span className="header-badge">{notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}</span>
        )}
      </button>

      {isNotificationMenuOpen && (
        <>
          {isMobile && <div className="header-overlay" onClick={() => setIsNotificationMenuOpen(false)} />}
          <div className="header-dropdown" style={isMobile ? { position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0, borderRadius: 0, display: 'flex', flexDirection: 'column' } : {}}>
            <div className="header-notification-tabs">
              <button
                className={`header-notification-tab ${notificationTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setNotificationTab('notifications')}
              >
                通知
              </button>
              <button
                className={`header-notification-tab ${notificationTab === 'announcements' ? 'active' : ''}`}
                onClick={() => setNotificationTab('announcements')}
              >
                お知らせ
              </button>
            </div>
            <div className="header-dropdown-content" style={isMobile ? { flex: 1 } : {}}>
              {notificationTab === 'notifications' ? (
                notifications.length === 0 ? (
                  <div className="header-empty">新しい通知はありません</div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="header-message-item"
                      onClick={() => handleNotificationClick(notification)}
                      style={{ cursor: notification.link ? 'pointer' : 'default', backgroundColor: notification.read ? 'transparent' : '#EEF0F3' }}
                    >
                      <div className="header-message-avatar">
                        <i className={`fas ${getNotificationIcon(notification.type)}`} style={{ color: '#5B7C99' }}></i>
                      </div>
                      <div className="header-message-content">
                        <div className="header-message-name">{notification.title}</div>
                        <div className="header-message-text">{notification.message}</div>
                      </div>
                      <div className="header-message-time">{formatMessageTime(notification.created_at)}</div>
                    </div>
                  ))
                )
              ) : (
                <div className="header-empty">新しいお知らせはありません</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )

  // プロフィールメニュー
  const ProfileMenu = () => (
    <div className="profile-menu-container" style={{ position: 'relative' }}>
      <button className="header-avatar-btn" onClick={() => { closeAllMenus(); setIsMenuOpen(!isMenuOpen) }}>
        <div className="header-avatar">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" />
          ) : (
            <i className="fas fa-user"></i>
          )}
        </div>
      </button>

      {isMenuOpen && (
        <>
          {isMobile && <div className="header-overlay" onClick={() => setIsMenuOpen(false)} />}
          <div className="header-dropdown" style={isMobile ? { position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0, borderRadius: 0 } : {}}>
            <Link href="/dashboard" className="header-dropdown-item" onClick={() => setIsMenuOpen(false)}>
              <i className="fas fa-th-large"></i>
              ダッシュボード
            </Link>
            <button className="header-dropdown-item" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              ログアウト
            </button>
          </div>
        </>
      )}
    </div>
  )

  // 投稿メニュー
  const UploadMenu = () => (
    <div className="upload-menu-container" style={{ position: 'relative' }}>
      <div style={{ display: 'flex' }}>
        <Link href="/portfolio/upload" className="header-upload-btn" style={{ borderRadius: '24px 0 0 24px', borderRight: '1px solid rgba(91, 124, 153, 0.2)' }}>
          <i className="fas fa-pen"></i>
          {!isMobile && '投稿'}
        </Link>
        <button
          className="header-upload-btn"
          style={{ borderRadius: '0 24px 24px 0', padding: isMobile ? '8px 10px' : '10px 14px' }}
          onClick={() => { closeAllMenus(); setIsUploadMenuOpen(!isUploadMenuOpen) }}
        >
          <i className="fas fa-chevron-down" style={{ fontSize: '10px' }}></i>
        </button>
      </div>

      {isUploadMenuOpen && (
        <>
          {isMobile && <div className="header-overlay" onClick={() => setIsUploadMenuOpen(false)} />}
          <div className="header-dropdown" style={isMobile ? { position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0, borderRadius: 0 } : { minWidth: '180px' }}>
            <Link href="/portfolio/drafts" className="header-dropdown-item" onClick={() => setIsUploadMenuOpen(false)}>
              <i className="fas fa-file-alt"></i>
              下書き ({draftCount})
            </Link>
          </div>
        </>
      )}
    </div>
  )

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/">
          <img src="/logotype.png" alt="同人ワークス" className="header-logo" />
        </Link>

        {/* 検索ボックス（デスクトップ） */}
        <div className="header-search hidden-mobile">
          <i className="fas fa-search header-search-icon"></i>
          <input
            type="text"
            placeholder="作品やクリエイターを検索"
            className="header-search-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const query = (e.target as HTMLInputElement).value
                if (query.trim()) router.push(`/search?q=${encodeURIComponent(query)}`)
              }
            }}
          />
        </div>

        {/* ナビゲーション */}
        <nav className="header-nav">
          {user ? (
            <>
              <MessageMenu />
              <NotificationMenu />
              <ProfileMenu />
              <UploadMenu />
            </>
          ) : (
            <>
              <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className="header-auth-btn login">
                ログイン
              </Link>
              <Link href="/signup" className="header-auth-btn signup">
                会員登録
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}