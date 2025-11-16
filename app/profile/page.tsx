'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
        router.push('/')
      }, 1500)
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        color: '#6B6B6B'
      }}>
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
        maxWidth: '600px'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          marginBottom: '8px',
          color: '#1A1A1A',
          letterSpacing: '-0.7px'
        }}>
          プロフィール設定
        </h1>
        
        <p style={{ 
          color: '#6B6B6B', 
          marginBottom: '32px',
          fontSize: '14px'
        }}>
          あなたの情報を入力してください
        </p>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            color: '#1A1A1A',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            表示名
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E5E5',
              borderRadius: '8px',
              color: '#1A1A1A',
              fontSize: '15px',
              outline: 'none'
            }}
            placeholder="例: 山田太郎"
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            color: '#1A1A1A',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            自己紹介
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E5E5',
              borderRadius: '8px',
              color: '#1A1A1A',
              fontSize: '15px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            placeholder="あなたについて教えてください"
          />
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '12px',
            color: '#1A1A1A',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            利用目的
          </label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                <div style={{ fontSize: '13px', color: '#6B6B6B' }}>
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
                <div style={{ fontSize: '13px', color: '#6B6B6B' }}>
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
                <div style={{ fontSize: '13px', color: '#6B6B6B' }}>
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

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: saving ? '#E5E5E5' : '#1A1A1A',
            color: saving ? '#6B6B6B' : '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {saving ? '保存中...' : 'プロフィールを保存'}
        </button>
      </div>
    </div>
  )
}