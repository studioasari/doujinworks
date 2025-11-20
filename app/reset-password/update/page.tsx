'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isValidSession, setIsValidSession] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setIsValidSession(true)
    } else {
      setError('セッションが無効です。パスワードリセットメールから再度アクセスしてください。')
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (password !== passwordConfirm) {
        throw new Error('パスワードが一致しません')
      }

      if (password.length < 6) {
        throw new Error('パスワードは6文字以上で入力してください')
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      alert('パスワードを更新しました。ログインしてください。')
      router.push('/login')
    } catch (error: any) {
      setError(error.message || 'パスワードの更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!isValidSession && !error) {
    return (
      <div className="loading-state" style={{ minHeight: '100vh' }}>
        読み込み中...
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
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

      <div className="card-no-hover" style={{
        padding: '48px',
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
          新しいパスワード
        </h1>
        
        <p className="text-small text-gray" style={{ 
          textAlign: 'center', 
          marginBottom: '32px'
        }}>
          新しいパスワードを入力してください
        </p>

        <form onSubmit={handleUpdatePassword}>
          <div className="mb-24">
            <label className="form-label">新しいパスワード</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="6文字以上"
            />
          </div>

          <div className="mb-24">
            <label className="form-label">パスワード（確認）</label>
            <input
              type="password"
              className="input-field"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={6}
              placeholder="もう一度入力"
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
            className="btn-primary"
            disabled={loading || !isValidSession}
            style={{ width: '100%' }}
          >
            {loading ? '更新中...' : 'パスワードを更新'}
          </button>
        </form>
      </div>
    </div>
  )
}