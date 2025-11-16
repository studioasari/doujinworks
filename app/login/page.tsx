'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // ログイン処理
  const handleLogin = async () => {
    setLoading(true)
    setError('')
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // ログイン成功後、プロフィールがあるかチェック
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        // プロフィールがなければ設定画面へ
        if (!profile) {
          router.push('/profile')
        } else {
          router.push('/')
        }
      }
    }
  }

  // 新規登録処理
  const handleSignup = async () => {
    setLoading(true)
    setError('')
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // 新規登録後、プロフィール設定へ
      router.push('/profile')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isLogin) {
      handleLogin()
    } else {
      handleSignup()
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      padding: '40px 20px'
    }}>
      <Link href="/" style={{ 
        marginBottom: '40px',
        fontSize: '20px',
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: '-0.5px'
      }}>
        同人ワークス
      </Link>

      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '48px',
        borderRadius: '12px',
        border: '1px solid #E5E5E5',
        width: '100%',
        maxWidth: '420px'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          marginBottom: '8px',
          color: '#1A1A1A',
          textAlign: 'center',
          letterSpacing: '-0.7px'
        }}>
          {isLogin ? 'ログイン' : '新規登録'}
        </h1>
        
        <p style={{ 
          textAlign: 'center', 
          color: '#6B6B6B', 
          marginBottom: '32px',
          fontSize: '14px'
        }}>
          アカウントにアクセス
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              color: '#1A1A1A',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
                color: '#1A1A1A',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              placeholder="example@email.com"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              color: '#1A1A1A',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
                color: '#1A1A1A',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              placeholder="6文字以上"
            />
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#FFF5F5',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              marginBottom: '20px',
              color: '#7F1D1D',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#E5E5E5' : '#1A1A1A',
              color: loading ? '#6B6B6B' : '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '16px',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? '処理中...' : isLogin ? 'ログイン' : '新規登録'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
            }}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: 'transparent',
              color: '#6B6B6B',
              border: '1px solid #E5E5E5',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isLogin ? 'アカウントをお持ちでない方' : 'すでにアカウントをお持ちの方'}
          </button>
        </form>
      </div>
    </div>
  )
}