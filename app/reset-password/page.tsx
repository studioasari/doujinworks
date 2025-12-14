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
        redirectTo: 'https://www.doujinworks.jp/reset-password/update',
      })

      if (error) throw error

      setSuccess(true)
    } catch (error: any) {
      setError(error.message || 'メールの送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
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
          backgroundColor: '#FFFFFF',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#F0FDF4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '32px',
            color: '#22C55E'
          }}>
            ✓
          </div>

          <h2 className="page-title" style={{ 
            marginBottom: '16px',
            fontSize: '24px'
          }}>
            メールを送信しました
          </h2>

          <p style={{ 
            marginBottom: '32px',
            fontSize: '14px',
            color: '#6B6B6B',
            lineHeight: '1.6'
          }}>
            <strong style={{ color: '#1A1A1A' }}>{email}</strong> にパスワード再設定用のリンクを送信しました。<br />
            メールをご確認ください。
          </p>

          <Link href="/login" className="btn-primary" style={{ 
            display: 'inline-block',
            width: '100%',
            textAlign: 'center'
          }}>
            ログインページに戻る
          </Link>
        </div>
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
          パスワードを再設定
        </h2>

        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '16px' }}>
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
            disabled={loading}
            style={{ 
              width: '100%'
            }}
          >
            {loading ? '送信中...' : '再設定メールを送信'}
          </button>
        </form>

        {/* グレーの線 */}
        <div style={{
          width: '100%',
          height: '1px',
          backgroundColor: '#E5E5E5',
          margin: '32px 0'
        }}></div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/login" style={{ 
            color: '#1A1A1A', 
            textDecoration: 'underline',
            fontSize: '14px'
          }}>
            ログインページに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}