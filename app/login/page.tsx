'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // リダイレクト先を取得（デフォルトはダッシュボード）
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      let loginEmail = emailOrUsername

      // @ が含まれていない場合、ユーザーIDとして扱う
      if (!emailOrUsername.includes('@')) {
        // APIを呼び出してユーザーIDからメールアドレスを取得
        const res = await fetch('/api/get-email-by-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: emailOrUsername }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'ユーザーIDが見つかりません')
        }

        loginEmail = data.email
      }

      // メールアドレスでログイン
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (signInError) {
        // エラーメッセージを日本語化
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('メールアドレスまたはパスワードが正しくありません')
        }
        throw signInError
      }

      // ログイン成功後、プロフィールがあるかチェック
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        // プロフィールがなければ登録完了画面へ
        if (!profile || !profile.username) {
          router.push('/signup/complete')
        } else {
          // 元のページまたはダッシュボードにリダイレクト
          router.push(redirectTo)
        }
      }
    } catch (error: any) {
      setError(error.message || 'ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // ソーシャルログイン
  const handleSocialLogin = async (provider: 'google' | 'twitter' | 'discord') => {
    setLoading(true)
    setError('')

    try {
      // リダイレクト先をクエリパラメータとして保持
      const redirectUrl = redirectTo !== '/dashboard' 
        ? `${window.location.origin}/signup/complete?redirect=${encodeURIComponent(redirectTo)}`
        : `${window.location.origin}/signup/complete`

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message || 'ログインに失敗しました')
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '40px 20px'
    }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
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
          ログイン
        </h2>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">
              メールアドレスまたはユーザーID
            </label>
            <input
              type="text"
              className="input-field"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="メール or ユーザーID"
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '8px' 
            }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                パスワード
              </label>
              <Link href="/reset-password" style={{ 
                color: '#6B6B6B', 
                fontSize: '13px',
                textDecoration: 'none'
              }}>
                パスワードを忘れた
              </Link>
            </div>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
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
            disabled={loading}
            style={{ 
              width: '100%'
            }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        {/* グレーの線 */}
        <div style={{
          width: '100%',
          height: '1px',
          backgroundColor: '#E5E5E5',
          margin: '32px 0'
        }}></div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          marginBottom: '32px'
        }}>
          <button
            className="btn-secondary"
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px' 
            }}
          >
            <i className="fab fa-google" style={{ color: '#DB4437' }}></i>
            Googleでログイン
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleSocialLogin('twitter')}
            disabled={loading}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px' 
            }}
          >
            <i className="fab fa-twitter" style={{ color: '#1DA1F2' }}></i>
            Twitterでログイン
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleSocialLogin('discord')}
            disabled={loading}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px' 
            }}
          >
            <i className="fab fa-discord" style={{ color: '#5865F2' }}></i>
            Discordでログイン
          </button>
        </div>

        {/* グレーの線 */}
        <div style={{
          width: '100%',
          height: '1px',
          backgroundColor: '#E5E5E5',
          margin: '32px 0'
        }}></div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/signup" style={{ 
            color: '#1A1A1A', 
            textDecoration: 'underline',
            fontSize: '14px'
          }}>
            新規登録はこちら
          </Link>
        </div>
      </div>
    </div>
  )
}