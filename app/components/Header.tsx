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
        <Link href="#" style={{ 
          color: '#6B6B6B', 
          textDecoration: 'none',
          fontSize: '15px',
          transition: 'color 0.2s'
        }}>
          探す
        </Link>
        <Link href="#" style={{ 
          color: '#6B6B6B', 
          textDecoration: 'none',
          fontSize: '15px',
          transition: 'color 0.2s'
        }}>
          依頼する
        </Link>

        {user ? (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Link href="/profile" style={{ 
              color: '#6B6B6B', 
              textDecoration: 'none',
              fontSize: '15px',
              transition: 'color 0.2s'
            }}>
              {profile?.display_name || 'プロフィール'}
            </Link>
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