'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

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
      setError('セッションが無効です。パスワード再設定メールから再度アクセスしてください。')
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
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
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
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '40px 20px'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '400px',
        border: '1px solid #E5E5E5',
        borderRadius: '8px',
        padding: '40px',
        backgroundColor: '#FFFFFF'
      }}>
        <h2 className="page-title" style={{ 
          marginBottom: '40px', 
          textAlign: 'center',
          fontSize: '24px'
        }}>
          新しいパスワードを設定
        </h2>

        <form onSubmit={handleUpdatePassword}>
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">新しいパスワード</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              required
              minLength={6}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">パスワード（確認）</label>
            <input
              type="password"
              className="input-field"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="もう一度入力"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="info-box" style={{ 
              marginBottom: '16px', 
              padding: '12px', 
              backgroundColor: '#FEE', 
              color: '#C33',
              border: '1px solid #FCC',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !isValidSession}
            style={{ 
              width: '100%'
            }}
          >
            {loading ? '更新中...' : 'パスワードを更新'}
          </button>
        </form>
      </div>
    </div>
  )
}