'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

type UnreadMessage = {
  chat_room_id: string
  sender_name: string
  sender_avatar: string | null
  content: string
  created_at: string
}

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMessageMenuOpen, setIsMessageMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentMessages, setRecentMessages] = useState<UnreadMessage[]>([])
  const router = useRouter()

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
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (profile?.id) {
      loadUnreadMessages()
      subscribeToMessages()
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
    }

    if (isMenuOpen || isMessageMenuOpen) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isMenuOpen, isMessageMenuOpen])

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

  const loadUnreadMessages = async () => {
    if (!profile?.id) return

    try {
      console.log('未読メッセージ取得開始:', profile.id)

      // 自分が参加しているチャットルームを取得
      const { data: participations, error: participationError } = await supabase
        .from('chat_room_participants')
        .select('chat_room_id, last_read_at')
        .eq('profile_id', profile.id)

      if (participationError) {
        console.error('参加ルーム取得エラー:', participationError)
        return
      }

      if (!participations || participations.length === 0) {
        console.log('参加しているチャットルームがありません')
        return
      }

      console.log('参加チャットルーム:', participations)

      let totalUnread = 0
      const messages: UnreadMessage[] = []

      for (const participation of participations) {
        // 未読メッセージ数を取得
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_room_id', participation.chat_room_id)
          .neq('sender_id', profile.id)
          .gt('created_at', participation.last_read_at || '1970-01-01')

        totalUnread += count || 0

        // 最新の未読メッセージを取得（最大5件まで）
        if (messages.length < 5) {
          const { data: unreadMessages, error: messagesError } = await supabase
            .from('messages')
            .select('id, chat_room_id, content, created_at, sender_id, file_type')
            .eq('chat_room_id', participation.chat_room_id)
            .neq('sender_id', profile.id)
            .gt('created_at', participation.last_read_at || '1970-01-01')
            .order('created_at', { ascending: false })
            .limit(5 - messages.length)

          if (messagesError) {
            console.error('メッセージ取得エラー:', messagesError)
            continue
          }

          if (unreadMessages && unreadMessages.length > 0) {
            // 各メッセージの送信者情報を個別に取得
            for (const msg of unreadMessages) {
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('display_name, avatar_url')
                .eq('id', msg.sender_id)
                .single()

              // コンテンツの決定
              let displayContent = msg.content
              if (!displayContent || displayContent.trim() === '') {
                if (msg.file_type === 'image') {
                  displayContent = '画像を送信しました'
                } else if (msg.file_type === 'video') {
                  displayContent = '動画を送信しました'
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

      // 作成日時でソート（新しい順）
      messages.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      console.log('未読メッセージ総数:', totalUnread)
      console.log('表示するメッセージ:', messages.slice(0, 5))

      setUnreadCount(totalUnread)
      setRecentMessages(messages.slice(0, 5))
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
          // 自分が送ったメッセージは除外
          if (newMessage.sender_id !== profile.id) {
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsMenuOpen(false)
    router.push('/login')
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

  const MessageIcon = () => (
    <div className="message-menu-container" style={{ position: 'relative' }}>
      <button
        onClick={() => setIsMessageMenuOpen(!isMessageMenuOpen)}
        style={{
          color: '#6B6B6B',
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
            backgroundColor: '#FF4444',
            color: '#FFFFFF',
            borderRadius: '10px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '0 5px'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* メッセージドロップダウン */}
      {isMessageMenuOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 12px)',
          right: 0,
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E5E5',
          borderRadius: '8px',
          minWidth: '320px',
          maxWidth: '400px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #E5E5E5',
            fontWeight: '600',
            fontSize: '14px',
            color: '#1A1A1A'
          }}>
            メッセージ
          </div>

          {recentMessages.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: '#6B6B6B',
              fontSize: '14px'
            }}>
              新しいメッセージはありません
            </div>
          ) : (
            <div>
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
                    borderBottom: index < recentMessages.length - 1 ? '1px solid #F0F0F0' : 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9F9F9'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E5E5',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {message.sender_avatar ? (
                      <img
                        src={message.sender_avatar}
                        alt={message.sender_name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '16px', color: '#6B6B6B' }}>
                        {message.sender_name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: '4px'
                    }}>
                      <div style={{
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#1A1A1A',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {message.sender_name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6B6B6B',
                        flexShrink: 0,
                        marginLeft: '8px'
                      }}>
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#6B6B6B',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
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
            style={{
              display: 'block',
              padding: '12px 16px',
              textAlign: 'center',
              color: '#1A1A1A',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600',
              borderTop: '1px solid #E5E5E5',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F9F9F9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            メッセージを確認する
          </Link>
        </div>
      )}
    </div>
  )

  return (
    <>
      <style jsx>{`
        .header-container {
          padding: 16px 40px;
        }
        
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .header-container {
            padding: 12px 16px;
          }
        }
        @media (min-width: 769px) {
          .mobile-nav {
            display: none !important;
          }
        }
      `}</style>

      <header className="header-container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E5E5',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <Link href="/" style={{ 
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center'
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
        
        {/* デスクトップナビゲーション */}
        <nav className="desktop-nav" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/creators" style={{ 
            color: '#6B6B6B', 
            textDecoration: 'none',
            fontSize: '15px',
            transition: 'color 0.2s'
          }}>
            クリエイター一覧
          </Link>
          <Link href="/portfolio" style={{ 
            color: '#6B6B6B', 
            textDecoration: 'none',
            fontSize: '15px',
            transition: 'color 0.2s'
          }}>
            ポートフォリオ
          </Link>
          <Link href="/requests" style={{ 
            color: '#6B6B6B', 
            textDecoration: 'none',
            fontSize: '15px',
            transition: 'color 0.2s'
          }}>
            依頼一覧
          </Link>

          {user ? (
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <MessageIcon />

              <button style={{
                color: '#6B6B6B',
                fontSize: '20px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                position: 'relative'
              }}>
                <i className="far fa-bell"></i>
              </button>

              <div className="profile-menu-container" style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
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
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E5E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: `2px solid ${isMenuOpen ? '#1A1A1A' : '#E5E5E5'}`,
                    transition: 'border-color 0.2s'
                  }}>
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name || 'プロフィール'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <i className="fas fa-user" style={{ 
                        fontSize: '16px', 
                        color: '#6B6B6B' 
                      }}></i>
                    )}
                  </div>
                </button>

                {isMenuOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E5E5',
                    borderRadius: '8px',
                    minWidth: '200px',
                    zIndex: 1000
                  }}>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        color: '#1A1A1A',
                        textDecoration: 'none',
                        fontSize: '14px',
                        transition: 'background-color 0.2s',
                        borderBottom: '1px solid #E5E5E5'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9F9F9'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <i className="fas fa-th-large" style={{ color: '#6B6B6B', width: '16px' }}></i>
                      ダッシュボード
                    </Link>

                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        width: '100%',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#1A1A1A',
                        textDecoration: 'none',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9F9F9'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <i className="fas fa-sign-out-alt" style={{ color: '#6B6B6B', width: '16px' }}></i>
                      ログアウト
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Link href="/login" style={{ 
                color: '#1A1A1A',
                backgroundColor: 'transparent',
                padding: '8px 20px',
                border: '1px solid #E5E5E5',
                borderRadius: '24px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}>
                ログイン
              </Link>

              <Link href="/signup" style={{ 
                color: '#FFFFFF',
                backgroundColor: '#1A1A1A',
                padding: '8px 20px',
                borderRadius: '24px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'opacity 0.2s'
              }}>
                会員登録
              </Link>
            </div>
          )}
        </nav>

        {/* モバイルナビゲーション */}
        <nav className="mobile-nav" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {user ? (
            <>
              <MessageIcon />

              <button style={{
                color: '#6B6B6B',
                fontSize: '20px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                position: 'relative'
              }}>
                <i className="far fa-bell"></i>
              </button>

              <div className="profile-menu-container" style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
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
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E5E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: `2px solid ${isMenuOpen ? '#1A1A1A' : '#E5E5E5'}`,
                    transition: 'border-color 0.2s'
                  }}>
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name || 'プロフィール'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <i className="fas fa-user" style={{ 
                        fontSize: '16px', 
                        color: '#6B6B6B' 
                      }}></i>
                    )}
                  </div>
                </button>

                {isMenuOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E5E5',
                    borderRadius: '8px',
                    minWidth: '200px',
                    zIndex: 1000
                  }}>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        color: '#1A1A1A',
                        textDecoration: 'none',
                        fontSize: '14px',
                        transition: 'background-color 0.2s',
                        borderBottom: '1px solid #E5E5E5'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9F9F9'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <i className="fas fa-th-large" style={{ color: '#6B6B6B', width: '16px' }}></i>
                      ダッシュボード
                    </Link>

                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        width: '100%',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#1A1A1A',
                        textDecoration: 'none',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9F9F9'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <i className="fas fa-sign-out-alt" style={{ color: '#6B6B6B', width: '16px' }}></i>
                      ログアウト
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Link href="/login" style={{ 
                color: '#1A1A1A',
                backgroundColor: 'transparent',
                padding: '8px 16px',
                border: '1px solid #E5E5E5',
                borderRadius: '24px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}>
                ログイン
              </Link>

              <Link href="/signup" style={{ 
                color: '#FFFFFF',
                backgroundColor: '#1A1A1A',
                padding: '8px 16px',
                borderRadius: '24px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'opacity 0.2s'
              }}>
                会員登録
              </Link>
            </div>
          )}
        </nav>
      </header>
    </>
  )
}