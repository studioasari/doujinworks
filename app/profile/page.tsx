'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [role, setRole] = useState('both')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  // ログイン確認
  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)

    // 既存のプロフィールを取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      setDisplayName(profile.display_name || '')
      setBio(profile.bio || '')
      setRole(profile.role || 'both')
    }

    setLoading(false)
  }

  // プロフィール保存
  const handleSave = async () => {
    if (!user) return
    
    setSaving(true)
    setError('')
    setSuccess('')

    // is_creator, is_client を role から決定
    const isCreator = role === 'creator' || role === 'both'
    const isClient = role === 'client' || role === 'both'

    const profileData = {
      user_id: user.id,
      display_name: displayName,
      bio: bio,
      role: role,
      is_creator: isCreator,
      is_client: isClient,
    }

    // upsert（存在すれば更新、なければ作成）
    const { error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      setSuccess('プロフィールを保存しました')
      setSaving(false)
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
          <div className="loading-state">
            読み込み中...
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#FFFFFF',
        display: 'flex'
      }}>
        {/* サイドバー */}
        <aside style={{
          width: '240px',
          borderRight: '1px solid #E5E5E5',
          padding: '40px 0',
          flexShrink: 0
        }}>
          <nav style={{ padding: '0 20px' }}>
            {/* 概要 */}
            <Link 
              href="/dashboard"
              style={{
                display: 'block',
                padding: '12px 20px',
                marginBottom: '4px',
                color: '#6B6B6B',
                borderRadius: '8px',
                fontSize: '15px',
                textDecoration: 'none',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9F9F9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              概要
            </Link>

            {/* プロフィール編集（現在のページ） */}
            <div style={{
              padding: '12px 20px',
              marginBottom: '4px',
              backgroundColor: '#1A1A1A',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600'
            }}>
              プロフィール編集
            </div>

            {/* 作品管理 */}
            <Link 
              href="/portfolio"
              style={{
                display: 'block',
                padding: '12px 20px',
                marginBottom: '4px',
                color: '#6B6B6B',
                borderRadius: '8px',
                fontSize: '15px',
                textDecoration: 'none',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9F9F9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              作品管理
            </Link>

            {/* 依頼管理 */}
            <Link 
              href="/requests"
              style={{
                display: 'block',
                padding: '12px 20px',
                marginBottom: '4px',
                color: '#6B6B6B',
                borderRadius: '8px',
                fontSize: '15px',
                textDecoration: 'none',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9F9F9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              依頼管理
            </Link>
          </nav>
        </aside>

        {/* メインコンテンツ */}
        <main style={{ flex: 1, padding: '40px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="page-title mb-40">プロフィール編集</h1>

            <div className="card-no-hover p-40">
              <div className="mb-24">
                <label className="form-label">
                  表示名
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="input-field"
                  placeholder="例: 山田太郎"
                />
              </div>

              <div className="mb-24">
                <label className="form-label">
                  自己紹介
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="textarea-field"
                  placeholder="あなたについて教えてください"
                />
              </div>

              <div className="mb-32">
                <label className="form-label mb-12" style={{ display: 'block' }}>
                  利用目的
                </label>
                
                <div className="flex flex-col gap-12">
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    border: '2px solid',
                    borderColor: role === 'creator' ? '#1A1A1A' : '#E5E5E5',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="radio"
                      name="role"
                      value="creator"
                      checked={role === 'creator'}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ marginRight: '12px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1A1A1A', marginBottom: '4px' }}>
                        クリエイター
                      </div>
                      <div className="text-tiny text-gray">
                        作品を作って依頼を受ける
                      </div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    border: '2px solid',
                    borderColor: role === 'client' ? '#1A1A1A' : '#E5E5E5',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="radio"
                      name="role"
                      value="client"
                      checked={role === 'client'}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ marginRight: '12px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1A1A1A', marginBottom: '4px' }}>
                        クライアント（依頼者）
                      </div>
                      <div className="text-tiny text-gray">
                        クリエイターに依頼する
                      </div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    border: '2px solid',
                    borderColor: role === 'both' ? '#1A1A1A' : '#E5E5E5',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="radio"
                      name="role"
                      value="both"
                      checked={role === 'both'}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ marginRight: '12px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1A1A1A', marginBottom: '4px' }}>
                        両方
                      </div>
                      <div className="text-tiny text-gray">
                        作品を作ることも依頼することもある
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#FFF5F5',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  color: '#7F1D1D',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#F0F9F0',
                  border: '1px solid #C6E7C6',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  color: '#1A5D1A',
                  fontSize: '14px'
                }}>
                  {success}
                </div>
              )}

              <div className="flex gap-12">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  {saving ? '保存中...' : '変更を保存'}
                </button>
                <Link
                  href="/dashboard"
                  className="btn-secondary"
                  style={{ flex: 1, textAlign: 'center', lineHeight: '48px' }}
                >
                  キャンセル
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}