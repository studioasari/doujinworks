'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { uploadAvatar, uploadHeader, deleteImage, validateImageFile } from '@/utils/imageUtils'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingHeader, setUploadingHeader] = useState(false)
  const [draggingAvatar, setDraggingAvatar] = useState(false)
  const [draggingHeader, setDraggingHeader] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  // 基本情報
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [role, setRole] = useState('both')
  
  // 画像
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [headerUrl, setHeaderUrl] = useState<string | null>(null)
  const [headerPreview, setHeaderPreview] = useState<string | null>(null)
  
  // SNSリンク
  const [twitterUrl, setTwitterUrl] = useState('')
  const [pixivUrl, setPixivUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const headerInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      setDisplayName(profile.display_name || '')
      setBio(profile.bio || '')
      setRole(profile.role || 'both')
      setAvatarUrl(profile.avatar_url || null)
      setAvatarPreview(profile.avatar_url || null)
      setHeaderUrl(profile.header_url || null)
      setHeaderPreview(profile.header_url || null)
      setTwitterUrl(profile.twitter_url || '')
      setPixivUrl(profile.pixiv_url || '')
      setWebsiteUrl(profile.website_url || '')
    }

    setLoading(false)
  }

  const processImageFile = async (
    file: File,
    uploadFunc: (userId: string, file: File) => Promise<string>,
    setUploading: (val: boolean) => void,
    setUrl: (url: string) => void,
    setPreview: (url: string | null) => void,
    oldUrl: string | null,
    bucketName: 'avatars' | 'headers',
    successMsg: string
  ) => {
    const maxSize = bucketName === 'avatars' ? 5 : 10
    const validation = validateImageFile(file, maxSize)
    if (!validation.valid) {
      setError(validation.error || '')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setUploading(true)
    setError('')

    try {
      if (oldUrl) {
        await deleteImage(oldUrl, bucketName)
      }

      const newUrl = await uploadFunc(user.id, file)
      setUrl(newUrl)
      setSuccess(successMsg)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || `${successMsg}に失敗しました`)
      setPreview(oldUrl)
    } finally {
      setUploading(false)
    }
  }

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDraggingAvatar(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      processImageFile(file, uploadAvatar, setUploadingAvatar, setAvatarUrl, setAvatarPreview, avatarUrl, 'avatars', 'アイコン画像をアップロードしました')
    }
  }

  const handleAvatarClick = () => avatarInputRef.current?.click()

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(file, uploadAvatar, setUploadingAvatar, setAvatarUrl, setAvatarPreview, avatarUrl, 'avatars', 'アイコン画像をアップロードしました')
    }
  }

  const handleHeaderDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDraggingHeader(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      processImageFile(file, uploadHeader, setUploadingHeader, setHeaderUrl, setHeaderPreview, headerUrl, 'headers', 'ヘッダー画像をアップロードしました')
    }
  }

  const handleHeaderClick = () => headerInputRef.current?.click()

  const handleHeaderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(file, uploadHeader, setUploadingHeader, setHeaderUrl, setHeaderPreview, headerUrl, 'headers', 'ヘッダー画像をアップロードしました')
    }
  }

  const handleAvatarRemove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!avatarUrl) return
    setUploadingAvatar(true)
    setError('')
    try {
      await deleteImage(avatarUrl, 'avatars')
      setAvatarUrl(null)
      setAvatarPreview(null)
      setSuccess('アイコン画像を削除しました')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'アイコン画像の削除に失敗しました')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleHeaderRemove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!headerUrl) return
    setUploadingHeader(true)
    setError('')
    try {
      await deleteImage(headerUrl, 'headers')
      setHeaderUrl(null)
      setHeaderPreview(null)
      setSuccess('ヘッダー画像を削除しました')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'ヘッダー画像の削除に失敗しました')
    } finally {
      setUploadingHeader(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError('')
    setSuccess('')

    const isCreator = role === 'creator' || role === 'both'
    const isClient = role === 'client' || role === 'both'

    const profileData = {
      user_id: user.id,
      display_name: displayName,
      bio: bio,
      role: role,
      is_creator: isCreator,
      is_client: isClient,
      avatar_url: avatarUrl,
      header_url: headerUrl,
      twitter_url: twitterUrl,
      pixiv_url: pixivUrl,
      website_url: websiteUrl,
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      setSuccess('プロフィールを保存しました')
      setSaving(false)
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA' }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            color: '#6B6B6B'
          }}>
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
        backgroundColor: '#FAFAFA',
        display: 'flex'
      }}>
        {/* サイドバー */}
        <aside style={{
          width: '240px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E5E5E5',
          padding: '32px 0',
          flexShrink: 0
        }}>
          <nav style={{ padding: '0 16px' }}>
            <Link 
              href="/dashboard"
              style={{
                display: 'block',
                padding: '10px 16px',
                marginBottom: '2px',
                color: '#6B6B6B',
                borderRadius: '6px',
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              概要
            </Link>

            <div style={{
              padding: '10px 16px',
              marginBottom: '2px',
              backgroundColor: '#1A1A1A',
              color: '#FFFFFF',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              プロフィール編集
            </div>

            <Link 
              href="/portfolio"
              style={{
                display: 'block',
                padding: '10px 16px',
                marginBottom: '2px',
                color: '#6B6B6B',
                borderRadius: '6px',
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              作品管理
            </Link>

            <Link 
              href="/requests"
              style={{
                display: 'block',
                padding: '10px 16px',
                marginBottom: '2px',
                color: '#6B6B6B',
                borderRadius: '6px',
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              依頼管理
            </Link>
          </nav>
        </aside>

        {/* メインコンテンツ */}
        <main style={{ flex: 1, padding: '48px 32px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '700',
              marginBottom: '32px',
              color: '#1A1A1A'
            }}>
              プロフィール編集
            </h1>

            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '32px',
              border: '1px solid #E5E5E5'
            }}>
              
              {/* ヘッダー画像 */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '12px'
                }}>
                  ヘッダー画像
                </label>
                
                <div
                  style={{
                    width: '100%',
                    height: '180px',
                    borderRadius: '8px',
                    border: draggingHeader ? '2px solid #1A1A1A' : '2px dashed #D1D5DB',
                    backgroundColor: headerPreview ? 'transparent' : '#F9FAFB',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}
                  onClick={handleHeaderClick}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDraggingHeader(true)
                  }}
                  onDragLeave={() => setDraggingHeader(false)}
                  onDrop={handleHeaderDrop}
                >
                  {headerPreview ? (
                    <img src={headerPreview} alt="ヘッダー画像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: '#9CA3AF'
                    }}>
                      <i className="fas fa-image" style={{ fontSize: '32px', marginBottom: '8px' }}></i>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#6B7280' }}>
                        クリックまたはドラッグしてアップロード
                      </div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                        推奨: 1500×500px / 最大10MB
                      </div>
                    </div>
                  )}
                </div>

                <input
                  ref={headerInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleHeaderSelect}
                  style={{ display: 'none' }}
                />

                {headerUrl && (
                  <button
                    type="button"
                    onClick={handleHeaderRemove}
                    disabled={uploadingHeader}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      color: '#DC2626',
                      backgroundColor: 'transparent',
                      border: '1px solid #FCA5A5',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    削除
                  </button>
                )}
              </div>

              {/* アイコン画像 */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '12px'
                }}>
                  アイコン画像
                </label>
                
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      border: draggingAvatar ? '2px solid #1A1A1A' : '2px dashed #D1D5DB',
                      backgroundColor: avatarPreview ? 'transparent' : '#F9FAFB',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      flexShrink: 0,
                      transition: 'all 0.2s'
                    }}
                    onClick={handleAvatarClick}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDraggingAvatar(true)
                    }}
                    onDragLeave={() => setDraggingAvatar(false)}
                    onDrop={handleAvatarDrop}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="アイコン画像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#9CA3AF',
                        fontSize: '32px'
                      }}>
                        <i className="fas fa-user"></i>
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleAvatarSelect}
                      style={{ display: 'none' }}
                    />
                    
                    <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
                      クリックまたはドラッグしてアップロード
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '12px' }}>
                      推奨: 400×400px / 最大5MB
                    </div>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleAvatarRemove}
                        disabled={uploadingAvatar}
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          color: '#DC2626',
                          backgroundColor: 'transparent',
                          border: '1px solid #FCA5A5',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 表示名 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  表示名
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="例: 山田太郎"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    transition: 'border-color 0.15s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                />
              </div>

              {/* 自己紹介 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  自己紹介
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="あなたについて教えてください"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    resize: 'vertical',
                    transition: 'border-color 0.15s',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                />
              </div>

              {/* SNSリンク */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '12px'
                }}>
                  SNSリンク
                </label>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6B7280', marginBottom: '6px' }}>
                    Twitter (X)
                  </label>
                  <input
                    type="url"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    placeholder="https://twitter.com/username"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      transition: 'border-color 0.15s',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6B7280', marginBottom: '6px' }}>
                    Pixiv
                  </label>
                  <input
                    type="url"
                    value={pixivUrl}
                    onChange={(e) => setPixivUrl(e.target.value)}
                    placeholder="https://www.pixiv.net/users/12345"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      transition: 'border-color 0.15s',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6B7280', marginBottom: '6px' }}>
                    ウェブサイト
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      transition: 'border-color 0.15s',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                  />
                </div>
              </div>

              {/* 利用目的 */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '12px'
                }}>
                  利用目的
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 16px',
                    border: role === 'creator' ? '2px solid #1A1A1A' : '1px solid #D1D5DB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: role === 'creator' ? '#F9FAFB' : '#FFFFFF',
                    transition: 'all 0.15s'
                  }}>
                    <input
                      type="radio"
                      name="role"
                      value="creator"
                      checked={role === 'creator'}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ marginRight: '12px', accentColor: '#1A1A1A', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1A1A1A', fontSize: '14px' }}>
                        クリエイター
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        作品を作って依頼を受ける
                      </div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 16px',
                    border: role === 'client' ? '2px solid #1A1A1A' : '1px solid #D1D5DB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: role === 'client' ? '#F9FAFB' : '#FFFFFF',
                    transition: 'all 0.15s'
                  }}>
                    <input
                      type="radio"
                      name="role"
                      value="client"
                      checked={role === 'client'}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ marginRight: '12px', accentColor: '#1A1A1A', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1A1A1A', fontSize: '14px' }}>
                        クライアント（依頼者）
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        クリエイターに依頼する
                      </div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 16px',
                    border: role === 'both' ? '2px solid #1A1A1A' : '1px solid #D1D5DB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: role === 'both' ? '#F9FAFB' : '#FFFFFF',
                    transition: 'all 0.15s'
                  }}>
                    <input
                      type="radio"
                      name="role"
                      value="both"
                      checked={role === 'both'}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ marginRight: '12px', accentColor: '#1A1A1A', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1A1A1A', fontSize: '14px' }}>
                        両方
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        作品を作ることも依頼することもある
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* エラー・成功メッセージ */}
              {error && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  color: '#DC2626',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  color: '#16A34A',
                  fontSize: '14px'
                }}>
                  {success}
                </div>
              )}

              {/* ボタン */}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#FFFFFF',
                    backgroundColor: saving ? '#9CA3AF' : '#1A1A1A',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#374151')}
                  onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#1A1A1A')}
                >
                  {saving ? '保存中...' : '変更を保存'}
                </button>
                <Link
                  href="/dashboard"
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1A1A1A',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
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