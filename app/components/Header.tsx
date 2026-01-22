'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { getUnreadCount, markAsRead } from '@/utils/notifications'
import { useDraftStore } from '@/stores/draftStore'
import styles from './Header.module.css'

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
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  // Zustandで下書きカウントを管理
  const draftCount = useDraftStore((state) => state.count)
  const recount = useDraftStore((state) => state.recount)
  
  const router = useRouter()
  const pathname = usePathname()

  // テーマの初期化
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
    document.body.dataset.theme = initialTheme
  }, [])

  // テーマ切り替え
  const toggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    document.body.dataset.theme = newTheme
    localStorage.setItem('theme', newTheme)
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 下書きカウント（Zustand + storageイベント）
  useEffect(() => {
    recount()
    window.addEventListener('storage', recount)
    return () => window.removeEventListener('storage', recount)
  }, [recount])

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
      loadNotifications()
      
      // 購読を開始し、クリーンアップ関数を取得
      const unsubscribeMessages = subscribeToMessages()
      const unsubscribeNotifications = subscribeToNotifications()
      
      // コンポーネントのアンマウント時にチャンネルを削除
      return () => {
        unsubscribeMessages?.()
        unsubscribeNotifications?.()
      }
    }
  }, [profile])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(`.${styles.profileMenuContainer}`)) setIsMenuOpen(false)
      if (!target.closest(`.${styles.menuContainer}`)) {
        setIsMessageMenuOpen(false)
        setIsNotificationMenuOpen(false)
      }
      if (!target.closest(`.${styles.uploadMenuContainer}`)) setIsUploadMenuOpen(false)
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

  // テーマスイッチコンポーネント
  const ThemeSwitch = () => (
    <div className="theme-switch theme-switch-sm">
      <button
        className={`theme-switch-btn ${theme === 'light' ? 'active' : ''}`}
        onClick={() => toggleTheme('light')}
        aria-label="ライトモード"
      >
        <i className="fas fa-sun"></i>
      </button>
      <button
        className={`theme-switch-btn ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => toggleTheme('dark')}
        aria-label="ダークモード"
      >
        <i className="fas fa-moon"></i>
      </button>
    </div>
  )

  // メッセージメニュー
  const MessageMenu = () => (
    <div className={styles.menuContainer}>
      <button
        className={styles.iconBtn}
        onClick={() => { closeAllMenus(); setIsMessageMenuOpen(!isMessageMenuOpen) }}
        aria-label="メッセージ"
      >
        <i className="far fa-envelope"></i>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isMessageMenuOpen && (
        <>
          {isMobile && <div className={styles.overlay} onClick={() => setIsMessageMenuOpen(false)} />}
          <div className={`${styles.dropdown} ${isMobile ? styles.dropdownMobile : ''}`}>
            <div className={styles.dropdownHeader}>メッセージ</div>
            {recentMessages.length === 0 ? (
              <div className={styles.emptyState}>新しいメッセージはありません</div>
            ) : (
              <div className={styles.dropdownContent}>
                {recentMessages.map((message, index) => (
                  <Link
                    key={`${message.chat_room_id}-${index}`}
                    href={`/messages/${message.chat_room_id}`}
                    className={styles.messageItem}
                    onClick={() => setIsMessageMenuOpen(false)}
                  >
                    <div className={`avatar avatar-sm ${styles.messageAvatar}`}>
                      {message.sender_avatar ? (
                        <img src={message.sender_avatar} alt="" />
                      ) : (
                        <i className="fas fa-user"></i>
                      )}
                    </div>
                    <div className={styles.messageContent}>
                      <div className={styles.messageName}>{message.sender_name}</div>
                      <div className={styles.messageText}>{truncateText(message.content, 40)}</div>
                    </div>
                    <div className={styles.messageTime}>{formatMessageTime(message.created_at)}</div>
                  </Link>
                ))}
              </div>
            )}
            <div className={styles.dropdownFooter}>
              <Link href="/messages" className="link" onClick={() => setIsMessageMenuOpen(false)}>
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
    <div className={styles.menuContainer}>
      <button
        className={styles.iconBtn}
        onClick={() => { closeAllMenus(); setIsNotificationMenuOpen(!isNotificationMenuOpen); setNotificationTab('notifications') }}
        aria-label="通知"
      >
        <i className="far fa-bell"></i>
        {notificationUnreadCount > 0 && (
          <span className={styles.badge}>{notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}</span>
        )}
      </button>

      {isNotificationMenuOpen && (
        <>
          {isMobile && <div className={styles.overlay} onClick={() => setIsNotificationMenuOpen(false)} />}
          <div className={`${styles.dropdown} ${isMobile ? styles.dropdownMobile : ''}`}>
            <div className={styles.notificationTabs}>
              <button
                className={`${styles.notificationTab} ${notificationTab === 'notifications' ? styles.active : ''}`}
                onClick={() => setNotificationTab('notifications')}
              >
                通知
              </button>
              <button
                className={`${styles.notificationTab} ${notificationTab === 'announcements' ? styles.active : ''}`}
                onClick={() => setNotificationTab('announcements')}
              >
                お知らせ
              </button>
            </div>
            <div className={styles.dropdownContent}>
              {notificationTab === 'notifications' ? (
                notifications.length === 0 ? (
                  <div className={styles.emptyState}>新しい通知はありません</div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`${styles.messageItem} ${!notification.read ? styles.unread : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                      style={{ cursor: notification.link ? 'pointer' : 'default' }}
                    >
                      <div className={styles.notificationIcon}>
                        <i className={`fas ${getNotificationIcon(notification.type)}`}></i>
                      </div>
                      <div className={styles.messageContent}>
                        <div className={styles.messageName}>{notification.title}</div>
                        <div className={styles.messageText}>{notification.message}</div>
                      </div>
                      <div className={styles.messageTime}>{formatMessageTime(notification.created_at)}</div>
                    </div>
                  ))
                )
              ) : (
                <div className={styles.emptyState}>新しいお知らせはありません</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )

  // プロフィールメニュー
  const ProfileMenu = () => (
    <div className={styles.profileMenuContainer}>
      <button className={styles.avatarBtn} onClick={() => { closeAllMenus(); setIsMenuOpen(!isMenuOpen) }}>
        <div className="avatar avatar-sm">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" />
          ) : (
            <i className="fas fa-user"></i>
          )}
        </div>
      </button>

      {isMenuOpen && (
        <>
          {isMobile && <div className={styles.overlay} onClick={() => setIsMenuOpen(false)} />}
          <div className={`${styles.dropdown} ${styles.dropdownRight} ${isMobile ? styles.dropdownMobile : ''}`}>
            <Link href="/dashboard" className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}>
              <i className="fas fa-th-large"></i>
              ダッシュボード
            </Link>
            <div className={styles.dropdownDivider}></div>
            <button className={styles.dropdownItem} onClick={handleLogout}>
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
    <div className={styles.uploadMenuContainer}>
      <div className={styles.uploadBtnGroup}>
        <Link href="/portfolio/upload" className="btn btn-primary btn-sm">
          <i className="fas fa-pen"></i>
          {!isMobile && <span>投稿</span>}
        </Link>
        <button
          className={`btn btn-primary btn-sm ${styles.uploadDropdownBtn}`}
          onClick={() => { closeAllMenus(); setIsUploadMenuOpen(!isUploadMenuOpen) }}
          aria-label="その他の投稿オプション"
        >
          <i className="fas fa-chevron-down"></i>
        </button>
      </div>

      {isUploadMenuOpen && (
        <>
          {isMobile && <div className={styles.overlay} onClick={() => setIsUploadMenuOpen(false)} />}
          <div className={`${styles.dropdown} ${styles.dropdownRight} ${isMobile ? styles.dropdownMobile : ''}`}>
            <Link href="/portfolio/drafts" className={styles.dropdownItem} onClick={() => setIsUploadMenuOpen(false)}>
              <i className="fas fa-file-alt"></i>
              下書き ({draftCount})
            </Link>
          </div>
        </>
      )}
    </div>
  )

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logoLink}>
          <img src="/logotype.png" alt="同人ワークス" className={styles.logo} />
        </Link>

        {/* 検索バー（デスクトップ） */}
        {!isMobile && (
          <div className="search-bar">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="作品やクリエイターを検索"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = (e.target as HTMLInputElement).value
                  if (query.trim()) router.push(`/search?q=${encodeURIComponent(query)}`)
                }
              }}
            />
          </div>
        )}

        {/* ナビゲーション */}
        <nav className={styles.nav}>
          <ThemeSwitch />
          
          {user ? (
            <>
              <MessageMenu />
              <NotificationMenu />
              <ProfileMenu />
              <UploadMenu />
            </>
          ) : (
            <div className={styles.authButtons}>
              <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className="btn btn-secondary btn-sm">
                ログイン
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                会員登録
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}