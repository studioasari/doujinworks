'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useRef, useCallback, memo } from 'react'
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

type HamburgerMenuProps = {
  isOpen: boolean
  onClose: () => void
  profile: any
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  isAcceptingOrders: boolean
  isToggleLoading: boolean
  onToggleAcceptingOrders: () => void
  draftCount: number
  unreadCount: number
  onLogout: () => void
}

const HamburgerMenu = memo(function HamburgerMenu({
  isOpen,
  onClose,
  profile,
  theme,
  onToggleTheme,
  isAcceptingOrders,
  isToggleLoading,
  onToggleAcceptingOrders,
  draftCount,
  unreadCount,
  onLogout
}: HamburgerMenuProps) {
  const router = useRouter()

  return (
    <>
      <div 
        className={`${styles.hamburgerOverlay} ${isOpen ? styles.active : ''}`} 
        onClick={onClose}
      />
      <div className={`${styles.hamburgerMenu} ${isOpen ? styles.active : ''}`}>
        <div className={styles.hamburgerContent}>
          {/* ヘッダー行（✕ボタン） */}
          <div className={styles.hamburgerHeader}>
            <button className={styles.hamburgerCloseBtn} onClick={onClose} aria-label="メニューを閉じる">
              <i className="fas fa-times"></i>
            </button>
          </div>
          {/* 検索 */}
          <div className={styles.hamburgerSearch}>
            <div className="search-bar">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="作品やクリエイターを検索"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = (e.target as HTMLInputElement).value
                    if (q.trim()) {
                      router.push(`/search?q=${encodeURIComponent(q)}`)
                      onClose()
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* プロフィール */}
          <Link 
            href={profile?.username ? `/creators/${profile.username}` : '/dashboard/profile'} 
            className={styles.hamburgerProfile} 
            onClick={onClose}
          >
            <div className={styles.hamburgerProfileAvatar}>
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="" width={48} height={48} sizes="48px" />
              ) : (
                <i className="fas fa-user"></i>
              )}
            </div>
            <div className={styles.hamburgerProfileInfo}>
              <div className={styles.hamburgerProfileName}>{profile?.display_name || '名前未設定'}</div>
              {profile?.username && <div className={styles.hamburgerProfileUsername}>@{profile.username}</div>}
            </div>
            <i className={`fas fa-chevron-right ${styles.hamburgerArrow}`}></i>
          </Link>

          {/* 依頼受付（ビジネスのみ） */}
          {profile?.account_type === 'business' && (
            <div className={styles.hamburgerStatusCard}>
              <div className={styles.hamburgerToggleRow}>
                <i className="fas fa-store"></i>
                <span className={styles.hamburgerToggleLabel}>依頼受付</span>
                <span className={`${styles.hamburgerStatusText} ${isAcceptingOrders ? styles.active : ''}`}>
                  {isAcceptingOrders ? '受付中' : '停止中'}
                </span>
                <button
                  onClick={onToggleAcceptingOrders}
                  disabled={isToggleLoading}
                  className={`toggle ${isAcceptingOrders ? 'active' : ''}`}
                />
              </div>
            </div>
          )}

          <div className={styles.hamburgerDivider}></div>

          {/* 探す */}
          <div className={styles.hamburgerSectionTitle}>探す</div>
          <Link href="/portfolio" className={styles.hamburgerItem} onClick={onClose}>
            <i className="fas fa-images"></i>
            <span className={styles.hamburgerItemText}>作品を見る</span>
          </Link>
          <Link href="/creators" className={styles.hamburgerItem} onClick={onClose}>
            <i className="fas fa-users"></i>
            <span className={styles.hamburgerItemText}>クリエイター</span>
          </Link>
          <Link href="/requests" className={styles.hamburgerItem} onClick={onClose}>
            <i className="fas fa-clipboard-list"></i>
            <span className={styles.hamburgerItemText}>依頼を探す</span>
          </Link>

          <div className={styles.hamburgerDivider}></div>

          {/* 投稿 */}
          <div className={styles.hamburgerSectionTitle}>投稿</div>
          <Link href="/portfolio/upload" className={styles.hamburgerItem} onClick={onClose}>
            <i className="fas fa-cloud-upload-alt"></i>
            <span className={styles.hamburgerItemText}>作品を投稿</span>
          </Link>
          <Link href="/portfolio/drafts" className={styles.hamburgerItem} onClick={onClose}>
            <i className="fas fa-file-alt"></i>
            <span className={styles.hamburgerItemText}>下書き</span>
            {draftCount > 0 && <span className={styles.hamburgerBadge}>{draftCount}</span>}
          </Link>
          <Link href="/dashboard/portfolio" className={styles.hamburgerItem} onClick={onClose}>
            <i className="fas fa-folder-open"></i>
            <span className={styles.hamburgerItemText}>作品管理</span>
          </Link>

          <div className={styles.hamburgerDivider}></div>

          {/* 依頼 */}
          <div className={styles.hamburgerSectionTitle}>依頼</div>
          <Link href="/requests/create" className={styles.hamburgerItem} onClick={onClose}>
            <i className="fas fa-plus-circle"></i>
            <span className={styles.hamburgerItemText}>依頼を作成</span>
          </Link>
          <Link href="/requests/manage" className={styles.hamburgerItem} onClick={onClose}>
            <i className="fas fa-tasks"></i>
            <span className={styles.hamburgerItemText}>依頼管理</span>
          </Link>
          <Link href="/dashboard/pricing" className={styles.hamburgerItem} onClick={onClose}>
            <i className="fas fa-tags"></i>
            <span className={styles.hamburgerItemText}>料金表管理</span>
          </Link>

          <div className={styles.hamburgerDivider}></div>

          {/* アカウント */}
          <div className={styles.hamburgerSectionTitle}>アカウント</div>
          <Link href="/dashboard" className={styles.hamburgerItem} onClick={onClose}>
            <i className="fas fa-th-large"></i>
            <span className={styles.hamburgerItemText}>ダッシュボード</span>
          </Link>
          <Link href="/messages" className={styles.hamburgerItem} onClick={onClose}>
            <i className="fas fa-envelope"></i>
            <span className={styles.hamburgerItemText}>メッセージ</span>
            {unreadCount > 0 && <span className={styles.hamburgerBadge}>{unreadCount}</span>}
          </Link>
          <Link href="/saved" className={styles.hamburgerItem} onClick={onClose}>
            <i className="fas fa-bookmark"></i>
            <span className={styles.hamburgerItemText}>保存済み</span>
          </Link>
          <Link href="/dashboard/profile" className={styles.hamburgerItem} onClick={onClose}>
            <i className="fas fa-user-edit"></i>
            <span className={styles.hamburgerItemText}>プロフィール編集</span>
          </Link>

          {/* 収支（ビジネスのみ） */}
          {profile?.account_type === 'business' && (
            <>
              <div className={styles.hamburgerDivider}></div>
              <div className={styles.hamburgerSectionTitle}>収支</div>
              <Link href="/dashboard/earnings" className={styles.hamburgerItem} onClick={onClose}>
                <i className="fas fa-chart-line"></i>
                <span className={styles.hamburgerItemText}>売上管理</span>
              </Link>
              <Link href="/dashboard/payments" className={styles.hamburgerItem} onClick={onClose}>
                <i className="fas fa-credit-card"></i>
                <span className={styles.hamburgerItemText}>支払い管理</span>
              </Link>
            </>
          )}

          <div className={styles.hamburgerDivider}></div>

          {/* 設定 */}
          <div className={styles.hamburgerSectionTitle}>設定</div>
          <div className={styles.hamburgerToggleRow}>
            <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
            <span className={styles.hamburgerToggleLabel}>ダークモード</span>
            <button
              onClick={onToggleTheme}
              className={`toggle ${theme === 'dark' ? 'active' : ''}`}
            />
          </div>

          <div className={styles.hamburgerDivider}></div>

          {/* ログアウト */}
          <button className={styles.hamburgerLogout} onClick={onLogout}>
            <i className="fas fa-sign-out-alt"></i>ログアウト
          </button>
        </div>
      </div>
    </>
  )
})

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMessageMenuOpen, setIsMessageMenuOpen] = useState(false)
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false)
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false)
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false)
  const [notificationTab, setNotificationTab] = useState<'notifications' | 'announcements'>('notifications')
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentMessages, setRecentMessages] = useState<UnreadMessage[]>([])
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(false)
  const [isToggleLoading, setIsToggleLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  const draftCount = useDraftStore((state) => state.count)
  const recount = useDraftStore((state) => state.recount)
  
  const router = useRouter()
  const pathname = usePathname()
  const profileIdRef = useRef<string | null>(null)
  const isHamburgerOpenRef = useRef(false)

  useEffect(() => {
    isHamburgerOpenRef.current = isHamburgerOpen
  }, [isHamburgerOpen])

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
    document.body.dataset.theme = initialTheme
  }, [mounted])

  const setThemeValue = useCallback((newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    document.body.dataset.theme = newTheme
    localStorage.setItem('theme', newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light'
      document.body.dataset.theme = newTheme
      localStorage.setItem('theme', newTheme)
      return newTheme
    })
  }, [])

  const toggleAcceptingOrders = useCallback(async () => {
    if (!profile?.id || isToggleLoading) return
    setIsToggleLoading(true)
    try {
      const newStatus = !isAcceptingOrders
      const { error } = await supabase
        .from('profiles')
        .update({ is_accepting_orders: newStatus })
        .eq('id', profile.id)
      if (error) throw error
      setIsAcceptingOrders(newStatus)
    } catch (error) {
      console.error('受付状態更新エラー:', error)
    } finally {
      setIsToggleLoading(false)
    }
  }, [profile?.id, isAcceptingOrders, isToggleLoading])

  useEffect(() => {
    recount()
    window.addEventListener('storage', recount)
    return () => window.removeEventListener('storage', recount)
  }, [recount])

  useEffect(() => {
    if (isHamburgerOpen || (isMobile && (isMessageMenuOpen || isNotificationMenuOpen))) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isHamburgerOpen, isMobile, isMessageMenuOpen, isNotificationMenuOpen])

  useEffect(() => {
    checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        profileIdRef.current = null
        setUnreadCount(0)
        setRecentMessages([])
        setNotificationUnreadCount(0)
        setNotifications([])
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!profile?.id || profile.id === profileIdRef.current) return
    profileIdRef.current = profile.id
    const pid = profile.id

    loadUnreadMessages(pid)
    loadNotifications(pid)
    loadAcceptingStatus(pid)

    const messagesChannel = supabase
      .channel(`header_messages_${pid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        if (!isHamburgerOpenRef.current) {
          loadUnreadMessages(pid)
        }
      })
      .subscribe()

    const notificationsChannel = supabase
      .channel(`header_notifications_${pid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `profile_id=eq.${pid}` }, () => {
        if (!isHamburgerOpenRef.current) {
          loadNotifications(pid)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(notificationsChannel)
    }
  }, [profile?.id])

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

  useEffect(() => {
    setIsHamburgerOpen(false)
  }, [pathname])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) loadProfile(user.id)
  }

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).single()
    setProfile(data)
  }

  const loadAcceptingStatus = async (profileId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_accepting_orders')
        .eq('id', profileId)
        .single()
      if (data) {
        setIsAcceptingOrders(data.is_accepting_orders ?? false)
      }
    } catch (error) {
      console.error('受付状態取得エラー:', error)
    }
  }

  const loadNotifications = async (profileId: string) => {
    if (isHamburgerOpenRef.current) return
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifications(data || [])
      const count = await getUnreadCount(profileId)
      setNotificationUnreadCount(count)
    } catch (error) {
      console.error('通知読み込みエラー:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
      if (profile?.id) await loadNotifications(profile.id)
    }
    if (notification.link) {
      setIsNotificationMenuOpen(false)
      router.push(notification.link)
    }
  }

  const loadUnreadMessages = async (profileId: string) => {
    if (isHamburgerOpenRef.current) return
    try {
      const { data: participations } = await supabase
        .from('chat_room_participants')
        .select('chat_room_id, last_read_at, hidden')
        .eq('profile_id', profileId)
        .eq('hidden', false)

      if (!participations?.length) {
        setUnreadCount(0)
        setRecentMessages([])
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
          .neq('sender_id', profileId)
          .gt('created_at', participation.last_read_at || '1970-01-01')

        totalUnread += count || 0

        if (messages.length < 5) {
          const { data: unreadMessages } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('chat_room_id', participation.chat_room_id)
            .eq('deleted', false)
            .neq('sender_id', profileId)
            .gt('created_at', participation.last_read_at || '1970-01-01')
            .order('created_at', { ascending: false })
            .limit(1)

          if (unreadMessages?.length) {
            const { data: sender } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('id', unreadMessages[0].sender_id)
              .single()

            messages.push({
              chat_room_id: participation.chat_room_id,
              sender_name: sender?.display_name || '名前未設定',
              sender_avatar: sender?.avatar_url || null,
              content: unreadMessages[0].content,
              created_at: unreadMessages[0].created_at
            })
          }
        }
      }

      setUnreadCount(totalUnread)
      setRecentMessages(messages)
    } catch (error) {
      console.error('メッセージ読み込みエラー:', error)
    }
  }

  const toggleMessageMenu = () => {
    const willOpen = !isMessageMenuOpen
    setIsMenuOpen(false)
    setIsNotificationMenuOpen(false)
    setIsUploadMenuOpen(false)
    setIsHamburgerOpen(false)
    setIsMessageMenuOpen(willOpen)
  }

  const toggleNotificationMenu = () => {
    const willOpen = !isNotificationMenuOpen
    setIsMenuOpen(false)
    setIsMessageMenuOpen(false)
    setIsUploadMenuOpen(false)
    setIsHamburgerOpen(false)
    setIsNotificationMenuOpen(willOpen)
    if (willOpen) setNotificationTab('notifications')
  }

  const toggleProfileMenu = () => {
    const willOpen = !isMenuOpen
    setIsMessageMenuOpen(false)
    setIsNotificationMenuOpen(false)
    setIsUploadMenuOpen(false)
    setIsHamburgerOpen(false)
    setIsMenuOpen(willOpen)
  }

  const toggleUploadMenu = () => {
    const willOpen = !isUploadMenuOpen
    setIsMenuOpen(false)
    setIsMessageMenuOpen(false)
    setIsNotificationMenuOpen(false)
    setIsHamburgerOpen(false)
    setIsUploadMenuOpen(willOpen)
  }

  const toggleHamburgerMenu = () => {
    const willOpen = !isHamburgerOpen
    setIsMenuOpen(false)
    setIsMessageMenuOpen(false)
    setIsNotificationMenuOpen(false)
    setIsUploadMenuOpen(false)
    setIsHamburgerOpen(willOpen)
  }

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    setIsMenuOpen(false)
    setIsHamburgerOpen(false)
    router.push('/')
  }, [router])

  const handleCloseHamburger = useCallback(() => {
    setIsHamburgerOpen(false)
  }, [])

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}日前`
    if (hours > 0) return `${hours}時間前`
    return '今'
  }

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'application': return 'fa-file-alt'
      case 'contract': return 'fa-handshake'
      case 'payment': return 'fa-credit-card'
      case 'delivery': return 'fa-box'
      case 'review': return 'fa-star'
      case 'message': return 'fa-comment'
      default: return 'fa-bell'
    }
  }

  // mountedになるまでロゴだけ表示（ちらつき防止）
  if (!mounted) {
    return (
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link href="/" className={styles.logoLink}>
            <Image src="/logotype.png" alt="同人ワークス" width={120} height={20} sizes="120px" className={styles.logo} priority />
          </Link>
          <div className={styles.navPlaceholder}></div>
        </div>
      </header>
    )
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logoLink}>
          <Image src="/logotype.png" alt="同人ワークス" width={120} height={20} sizes="120px" className={styles.logo} priority />
        </Link>

        {/* 検索バー（PC） */}
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
          {user ? (
            <>
              {/* テーマ切り替え（PC） */}
              {!isMobile && (
                <div className="theme-switch theme-switch-sm">
                  <button 
                    className={`theme-switch-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setThemeValue('light')}
                    aria-label="ライトモード"
                  >
                    <i className="fas fa-sun"></i>
                  </button>
                  <button 
                    className={`theme-switch-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setThemeValue('dark')}
                    aria-label="ダークモード"
                  >
                    <i className="fas fa-moon"></i>
                  </button>
                </div>
              )}

              {/* メッセージ */}
              <div className={styles.menuContainer}>
                <button className={styles.iconBtn} onClick={toggleMessageMenu} aria-label="メッセージ">
                  <i className="far fa-envelope"></i>
                  {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
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
                            <Link key={`${message.chat_room_id}-${index}`} href={`/messages/${message.chat_room_id}`} className={styles.messageItem} onClick={() => setIsMessageMenuOpen(false)}>
                              <div className={`avatar avatar-sm ${styles.messageAvatar}`}>
                                {message.sender_avatar ? <Image src={message.sender_avatar} alt="" width={32} height={32} sizes="32px" /> : <i className="fas fa-user"></i>}
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
                        <Link href="/messages" className="link" onClick={() => setIsMessageMenuOpen(false)}>メッセージを確認する</Link>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 通知 */}
              <div className={styles.menuContainer}>
                <button className={styles.iconBtn} onClick={toggleNotificationMenu} aria-label="通知">
                  <i className="far fa-bell"></i>
                  {notificationUnreadCount > 0 && <span className={styles.badge}>{notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}</span>}
                </button>
                {isNotificationMenuOpen && (
                  <>
                    {isMobile && <div className={styles.overlay} onClick={() => setIsNotificationMenuOpen(false)} />}
                    <div className={`${styles.dropdown} ${isMobile ? styles.dropdownMobile : ''}`}>
                      <div className={styles.notificationTabs}>
                        <button className={`${styles.notificationTab} ${notificationTab === 'notifications' ? styles.active : ''}`} onClick={() => setNotificationTab('notifications')}>通知</button>
                        <button className={`${styles.notificationTab} ${notificationTab === 'announcements' ? styles.active : ''}`} onClick={() => setNotificationTab('announcements')}>お知らせ</button>
                      </div>
                      <div className={styles.dropdownContent}>
                        {notificationTab === 'notifications' ? (
                          notifications.length === 0 ? (
                            <div className={styles.emptyState}>新しい通知はありません</div>
                          ) : (
                            notifications.map((notification) => (
                              <div key={notification.id} className={`${styles.messageItem} ${!notification.read ? styles.unread : ''}`} onClick={() => handleNotificationClick(notification)} style={{ cursor: notification.link ? 'pointer' : 'default' }}>
                                <div className={styles.notificationIcon}><i className={`fas ${getNotificationIcon(notification.type)}`}></i></div>
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

              {/* PC版：プロフィールメニュー */}
              {!isMobile && (
                <div className={styles.profileMenuContainer}>
                  <button className={styles.avatarBtn} onClick={toggleProfileMenu}>
                    <div className="avatar avatar-sm">
                      {profile?.avatar_url ? <Image src={profile.avatar_url} alt="" width={32} height={32} sizes="32px" /> : <i className="fas fa-user"></i>}
                    </div>
                  </button>
                  {isMenuOpen && (
                    <div className={`${styles.dropdown} ${styles.dropdownRight} ${styles.profileDropdown}`}>
                      <Link href={profile?.username ? `/creators/${profile.username}` : '/dashboard/profile'} className={styles.profileHeader} onClick={() => setIsMenuOpen(false)}>
                        <div className={styles.profileHeaderAvatar}>
                          {profile?.avatar_url ? <Image src={profile.avatar_url} alt="" width={48} height={48} sizes="48px" /> : <i className="fas fa-user"></i>}
                        </div>
                        <div className={styles.profileHeaderInfo}>
                          <div className={styles.profileHeaderName}>{profile?.display_name || '名前未設定'}</div>
                          {profile?.username && <div className={styles.profileHeaderUsername}>@{profile.username}</div>}
                        </div>
                        <i className={`fas fa-chevron-right ${styles.profileHeaderArrow}`}></i>
                      </Link>
                      {profile?.account_type === 'business' && (
                        <div className={styles.acceptingToggle}>
                          <div className={styles.acceptingLabel}><i className="fas fa-store"></i><span>依頼受付</span></div>
                          <span className={`${styles.acceptingStatus} ${isAcceptingOrders ? styles.active : ''}`}>{isAcceptingOrders ? '受付中' : '停止中'}</span>
                          <button onClick={(e) => { e.preventDefault(); toggleAcceptingOrders() }} disabled={isToggleLoading} className={`toggle ${isAcceptingOrders ? 'active' : ''}`} />
                        </div>
                      )}
                      <Link href="/dashboard" className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}><i className="fas fa-th-large"></i>ダッシュボード</Link>
                      <Link href="/messages" className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}><i className="fas fa-envelope"></i>メッセージ</Link>
                      <Link href="/saved" className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}><i className="fas fa-bookmark"></i>保存済み</Link>
                      <div className={styles.dropdownDivider}></div>
                      <Link href="/dashboard/profile" className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}><i className="fas fa-user-edit"></i>プロフィール編集</Link>
                      <Link href="/dashboard/portfolio" className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}><i className="fas fa-images"></i>作品管理</Link>
                      <Link href="/portfolio/upload" className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}><i className="fas fa-cloud-upload-alt"></i>作品を投稿</Link>
                      <Link href="/dashboard/pricing" className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}><i className="fas fa-tags"></i>料金表管理</Link>
                      <Link href="/requests/manage" className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}><i className="fas fa-clipboard-list"></i>依頼管理</Link>
                      {profile?.account_type === 'business' && (
                        <>
                          <div className={styles.dropdownDivider}></div>
                          <Link href="/dashboard/earnings" className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}><i className="fas fa-chart-line"></i>売上管理</Link>
                          <Link href="/dashboard/payments" className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}><i className="fas fa-credit-card"></i>支払い管理</Link>
                        </>
                      )}
                      <div className={styles.dropdownDivider}></div>
                      <button className={styles.dropdownItem} onClick={handleLogout}><i className="fas fa-sign-out-alt"></i>ログアウト</button>
                    </div>
                  )}
                </div>
              )}

              {/* PC版：投稿ボタン */}
              {!isMobile && (
                <div className={styles.uploadMenuContainer}>
                  <div className={styles.uploadBtnGroup}>
                    <Link href="/portfolio/upload" className="btn btn-primary btn-sm"><i className="fas fa-pen"></i><span>投稿</span></Link>
                    <button className={`btn btn-primary btn-sm ${styles.uploadDropdownBtn}`} onClick={toggleUploadMenu}><i className="fas fa-chevron-down"></i></button>
                  </div>
                  {isUploadMenuOpen && (
                    <div className={`${styles.dropdown} ${styles.dropdownRight}`}>
                      <Link href="/portfolio/drafts" className={styles.dropdownItem} onClick={() => setIsUploadMenuOpen(false)}><i className="fas fa-file-alt"></i>下書き ({draftCount})</Link>
                      <Link href="/requests/create" className={styles.dropdownItem} onClick={() => setIsUploadMenuOpen(false)}><i className="fas fa-plus-circle"></i>依頼を作成</Link>
                    </div>
                  )}
                </div>
              )}

              {/* スマホ版：ハンバーガーボタン */}
              {isMobile && (
                <button className={`${styles.hamburgerBtn} ${isHamburgerOpen ? styles.active : ''}`} onClick={toggleHamburgerMenu} aria-label="メニュー">
                  <span></span><span></span><span></span>
                </button>
              )}
            </>
          ) : (
            <div className={styles.authButtons}>
              <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className="btn btn-secondary btn-sm">ログイン</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">会員登録</Link>
            </div>
          )}
        </nav>
      </div>

      {/* スマホ版ハンバーガーメニュー */}
      {user && isMobile && (
        <HamburgerMenu
          isOpen={isHamburgerOpen}
          onClose={handleCloseHamburger}
          profile={profile}
          theme={theme}
          onToggleTheme={toggleTheme}
          isAcceptingOrders={isAcceptingOrders}
          isToggleLoading={isToggleLoading}
          onToggleAcceptingOrders={toggleAcceptingOrders}
          draftCount={draftCount}
          unreadCount={unreadCount}
          onLogout={handleLogout}
        />
      )}
    </header>
  )
}