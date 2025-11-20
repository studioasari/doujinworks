'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      let loginEmail = emailOrUsername

      // @ が含まれていない場合、ユーザーIDとして扱う
      if (!emailOrUsername.includes('@')) {
        // ユーザーIDからメールアドレスを取得
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('username', emailOrUsername.toLowerCase())
          .single()

        if (profileError || !profile) {
          throw new Error('ユーザーIDが見つかりません')
        }

        // auth.users からメールアドレスを取得
        const { data: authData, error: authError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('id', profile.user_id)
          .single()

        if (authError) {
          throw new Error('ユーザー情報の取得に失敗しました')
        }

        // user_idからauth.usersのemailを取得する方法が必要
        // 一旦、エラーメッセージで対応
        throw new Error('ユーザーIDでのログインは現在準備中です。メールアドレスをご使用ください。')
      }

      // メールアドレスでログイン
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (signInError) throw signInError

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
          router.push('/dashboard')
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/signup/complete`,
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
          ログイン
        </h1>
        
        <p style={{ 
          textAlign: 'center', 
          color: '#6B6B6B', 
          marginBottom: '32px',
          fontSize: '14px'
        }}>
          アカウントにアクセス
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              color: '#1A1A1A',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              メールアドレスまたはユーザーID
            </label>
            <input
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
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
              placeholder="example@email.com または username"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '8px' 
            }}>
              <label style={{ 
                color: '#1A1A1A',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                パスワード
              </label>
              <Link 
                href="/reset-password" 
                style={{ 
                  color: '#6B6B6B', 
                  fontSize: '13px',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#1A1A1A'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#6B6B6B'}
              >
                パスワードを忘れた
              </Link>
            </div>
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
            {loading ? '処理中...' : 'ログイン'}
          </button>

          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <span style={{ color: '#6B6B6B', fontSize: '14px' }}>または</span>
          </div>

          {/* ソーシャルログインボタン */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <i className="fab fa-google"></i>
              Googleでログイン
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('twitter')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <i className="fab fa-twitter"></i>
              Twitterでログイン
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('discord')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <i className="fab fa-discord"></i>
              Discordでログイン
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#6B6B6B', fontSize: '14px' }}>アカウントをお持ちでない方は </span>
            <Link href="/signup" style={{ color: '#1A1A1A', fontSize: '14px', textDecoration: 'underline' }}>
              新規登録
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}