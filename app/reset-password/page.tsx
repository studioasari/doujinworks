'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { passwordResetAction } from '@/app/actions/auth'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  // フォームが有効かチェック
  const isFormValid = email

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    startTransition(async () => {
      const formData = new FormData()
      formData.append('email', email)

      const result = await passwordResetAction(formData)

      if (!result.success) {
        setError(result.error || 'メールの送信に失敗しました')
        return
      }

      setSuccess(true)
    })
  }

  if (success) {
    return (
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '40px 20px',
        backgroundColor: '#F5F6F8'
      }}>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        
        <div style={{ 
          width: '100%', 
          maxWidth: '400px',
          border: '1px solid #D0D5DA',
          borderRadius: '8px',
          padding: '40px',
          backgroundColor: '#FFFFFF',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#E6F2EC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '32px',
            color: '#4F8A6B'
          }}>
            <i className="fas fa-check"></i>
          </div>

          <h2 className="page-title" style={{ 
            marginBottom: '16px',
            fontSize: '24px',
            color: '#222222'
          }}>
            メールを送信しました
          </h2>

          <p style={{ 
            marginBottom: '32px',
            fontSize: '14px',
            color: '#555555',
            lineHeight: '1.6'
          }}>
            <strong style={{ color: '#222222' }}>{email}</strong> にパスワード再設定用のリンクを送信しました。<br />
            メールをご確認ください。
          </p>

          <Link href="/login" className="btn-primary" style={{ 
            display: 'inline-block',
            width: '100%',
            textAlign: 'center',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            backgroundColor: '#5B7C99',
            border: 'none'
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
      padding: '40px 20px',
      backgroundColor: '#F5F6F8'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '400px',
        border: '1px solid #D0D5DA',
        borderRadius: '8px',
        padding: '40px',
        backgroundColor: '#FFFFFF'
      }}>
        <h2 className="page-title" style={{ 
          marginBottom: '40px', 
          textAlign: 'center',
          fontSize: '24px',
          color: '#222222'
        }}>
          パスワードを再設定
        </h2>

        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#555555',
              marginBottom: '6px'
            }}>
              メールアドレス
            </label>
            <input
              type="email"
              name="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              disabled={isPending}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #D0D5DA',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.15s',
                color: '#222222',
                backgroundColor: '#FFFFFF',
                opacity: isPending ? 0.6 : 1
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#5B7C99'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#D0D5DA'}
            />
          </div>

          {error && (
            <div className="alert alert-error" style={{ 
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={isPending || !isFormValid}
            style={{ 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: (isFormValid && !isPending) ? '#5B7C99' : '#D0D5DA',
              color: (isFormValid && !isPending) ? '#FFFFFF' : '#888888',
              border: 'none',
              cursor: (isFormValid && !isPending) ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {isPending ? '送信中...' : '再設定メールを送信'}
          </button>
        </form>

        {/* グレーの線 */}
        <div style={{
          width: '100%',
          height: '1px',
          backgroundColor: '#D0D5DA',
          margin: '32px 0'
        }}></div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/login" style={{ 
            color: '#5B7C99', 
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