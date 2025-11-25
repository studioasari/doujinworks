'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // メニュー外クリックで閉じる
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.profile-menu-container')) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isMenuOpen])

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsMenuOpen(false)
    router.push('/login')
  }

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
        {/* ロゴ */}
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
        
        {/* デスクトップナビゲーション（768px以上） */}
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
              {/* メッセージアイコン */}
              <Link href="/messages" style={{ 
                color: '#6B6B6B',
                fontSize: '20px',
                transition: 'color 0.2s',
                position: 'relative'
              }}>
                <i className="far fa-envelope"></i>
              </Link>

              {/* 通知アイコン */}
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

              {/* プロフィールアイコン → メニュー表示 */}
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

                {/* ドロップダウンメニュー */}
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
              {/* ログインボタン（グレー） */}
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

              {/* 会員登録ボタン（黒） */}
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

        {/* モバイルナビゲーション（768px以下） */}
        <nav className="mobile-nav" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {user ? (
            <>
              {/* メッセージアイコン */}
              <Link href="/messages" style={{ 
                color: '#6B6B6B',
                fontSize: '20px',
                transition: 'color 0.2s',
                position: 'relative'
              }}>
                <i className="far fa-envelope"></i>
              </Link>

              {/* 通知アイコン */}
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

              {/* プロフィールアイコン → メニュー表示 */}
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

                {/* ドロップダウンメニュー */}
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
              {/* ログインボタン（グレー） */}
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

              {/* 会員登録ボタン（黒） */}
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