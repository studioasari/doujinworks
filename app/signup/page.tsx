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
      // メールアドレスが既に登録されているかチェック
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      // より確実な方法：signUpを試してエラーをキャッチ
      const tempPassword = Math.random().toString(36).slice(-12) + Date.now().toString(36)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          emailRedirectTo: 'https://www.dojinworks.com/signup/complete',
          data: {
            registration_step: 'email_confirmed',
          }
        },
      })

      if (error) {
        // Supabaseのエラーメッセージをチェック
        if (error.message.includes('User already registered') || 
            error.message.includes('already been registered')) {
          setError('このメールアドレスは既に登録されています。')
          return
        }
        throw error
      }

      // signUpが成功したが、ユーザーが既に存在する場合
      // (メール確認がOFFの開発環境では data.user が null になる)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('このメールアドレスは既に登録されています。')
        return
      }

      // 新規登録成功
      router.push(`/signup/verify?email=${encodeURIComponent(email)}`)
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
    <>
      <style jsx>{`
        .signup-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 40px 20px;
        }
        
        .signup-wrapper {
          display: flex;
          width: 100%;
          max-width: 1200px;
          align-items: center;
          gap: 60px;
        }
        
        .welcome-text {
          flex: 1;
        }
        
        .form-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        @media (max-width: 1024px) {
          .welcome-text {
            display: none;
          }
        }
      `}</style>

      <div className="signup-container">
        <div className="signup-wrapper">
          {/* 左側：説明文（画面幅1024px以上で表示） */}
          <div className="welcome-text">
            <h1 style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#1A1A1A',
              marginBottom: '32px',
              lineHeight: 1.3,
              whiteSpace: 'nowrap'
            }}>
              同人ワークスへようこそ！
            </h1>
            <p style={{
              fontSize: '18px',
              color: '#6B6B6B',
              lineHeight: 1.8,
              marginBottom: '24px'
            }}>
              同人ワークスは、創作する人も、それを楽しむ人も、“好き”を気軽に持ち寄れる街のような場所です。   
            </p>
            <p style={{
              fontSize: '18px',
              color: '#6B6B6B',
              lineHeight: 1.8,
              marginBottom: '24px'
            }}>
              好みのクリエイターや作品に出会ったり、自分の表現を発信したりして楽しめます。
            </p>
            <p style={{
              fontSize: '18px',
              color: '#6B6B6B',
              lineHeight: 1.8
            }}>
              ここでのつながりが、あなたの創作や活動をもっと広げるきっかけになりますように。
            </p>
          </div>

          {/* 右側：サインアップフォーム */}
          <div className="form-wrapper">
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
                新規会員登録
              </h2>

              <form onSubmit={handleEmailSignup} style={{ marginBottom: '32px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="email"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="メールアドレス"
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
                    {error.includes('既に登録されています') && (
                      <div style={{ marginTop: '8px' }}>
                        <Link href="/login" style={{ 
                          color: '#C33', 
                          textDecoration: 'underline',
                          fontWeight: 'bold'
                        }}>
                          ログインページはこちら
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ 
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {loading ? (
                    '送信中...'
                  ) : (
                    <>
                      <i className="fas fa-envelope" style={{ color: '#FFFFFF' }}></i>
                      メールで登録
                    </>
                  )}
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
                  onClick={() => handleSocialSignup('google')}
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
                  Googleで登録
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleSocialSignup('twitter')}
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
                  Twitterで登録
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleSocialSignup('discord')}
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
                  Discordで登録
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
                <Link href="/login" style={{ 
                  color: '#1A1A1A', 
                  textDecoration: 'underline',
                  fontSize: '14px'
                }}>
                  ログインはこちら
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}