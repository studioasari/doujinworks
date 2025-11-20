'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://www.dojinworks.com/reset-password/update',
      })

      if (error) throw error

      setSuccess(true)
    } catch (error: any) {
      setError(error.message || 'パスワードリセットメールの送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
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
          maxWidth: '420px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#F0FDF4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '24px'
          }}>
            ✓
          </div>

          <h1 className="card-title" style={{ marginBottom: '12px' }}>
            メールを送信しました
          </h1>

          <p className="text-small text-gray" style={{ 
            marginBottom: '32px',
            lineHeight: '1.6'
          }}>
            <strong>{email}</strong> にパスワードリセット用のリンクを送信しました。<br />
            メールをご確認ください。
          </p>

          <Link href="/login" className="btn-primary" style={{ display: 'inline-block' }}>
            ログインページに戻る
          </Link>
        </div>
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
          パスワードをリセット
        </h1>
        
        <p className="text-small text-gray" style={{ 
          textAlign: 'center', 
          marginBottom: '32px'
        }}>
          登録されたメールアドレスを入力してください
        </p>

        <form onSubmit={handleResetPassword}>
          <div className="mb-24">
            <label className="form-label">メールアドレス</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@email.com"
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
            disabled={loading}
            style={{ width: '100%', marginBottom: '16px' }}
          >
            {loading ? '送信中...' : 'リセットメールを送信'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <Link href="/login" className="text-small text-gray" style={{ textDecoration: 'none' }}>
              ← ログインページに戻る
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}