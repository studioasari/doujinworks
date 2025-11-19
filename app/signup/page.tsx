'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: Math.random().toString(36).slice(-8),
        options: {
          emailRedirectTo: 'https://www.dojinworks.com/signup/complete',
        },
      })

      if (error) throw error

      router.push('/signup/verify')
    } catch (error: any) {
      setError(error.message || '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialSignup = async (provider: 'google' | 'twitter' | 'discord') => {
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'https://www.dojinworks.com/signup/complete',
        },
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message || '登録に失敗しました')
      setLoading(false)
    }
  }

  return (
    <div className="container-narrow" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h1 className="page-title" style={{ marginBottom: '40px', textAlign: 'center' }}>
          新規登録
        </h1>

        <form onSubmit={handleEmailSignup} style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <label className="form-label">メールアドレス</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
            />
          </div>

          {error && (
            <div className="info-box" style={{ 
              marginBottom: '24px', 
              padding: '12px', 
              backgroundColor: '#FEE', 
              color: '#C33',
              border: '1px solid #FCC'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? '送信中...' : '認証メールを送信'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span className="text-gray">または</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            className="btn-secondary"
            onClick={() => handleSocialSignup('google')}
            disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <i className="fab fa-google"></i>
            Googleで登録
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleSocialSignup('twitter')}
            disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <i className="fab fa-twitter"></i>
            Twitterで登録
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleSocialSignup('discord')}
            disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <i className="fab fa-discord"></i>
            Discordで登録
          </button>
        </div>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <span className="text-gray">既にアカウントをお持ちですか？ </span>
          <Link href="/login" style={{ color: '#1A1A1A', textDecoration: 'underline' }}>
            ログイン
          </Link>
        </div>
      </div>
    </div>
  )
}