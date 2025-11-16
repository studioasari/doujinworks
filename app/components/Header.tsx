'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
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
    router.push('/login')
  }

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 40px',
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E5E5E5',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: '700',
          color: '#1A1A1A',
          letterSpacing: '-0.5px'
        }}>
          同人ワークス
        </h2>
      </Link>
      
      <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
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
              {/* 未読バッジ（オプション） */}
              {/* <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '8px',
                height: '8px',
                backgroundColor: '#FF4444',
                borderRadius: '50%'
              }}></span> */}
            </button>

            {/* プロフィールアイコン */}
            <Link href="/profile" style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#E5E5E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '2px solid #E5E5E5',
                transition: 'border-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1A1A1A'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E5E5'
              }}
              >
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
            </Link>

            {/* ログアウトボタン */}
            <button
              onClick={handleLogout}
              style={{ 
                color: '#6B6B6B',
                backgroundColor: 'transparent',
                padding: '8px 20px',
                border: '1px solid #E5E5E5',
                borderRadius: '24px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ログアウト
            </button>
          </div>
        ) : (
          <Link href="/login" style={{ 
            color: '#FFFFFF',
            backgroundColor: '#1A1A1A',
            padding: '8px 20px',
            borderRadius: '24px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'background-color 0.2s'
          }}>
            ログイン
          </Link>
        )}
      </nav>
    </header>
  )
}