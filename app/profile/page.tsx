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

  // ファイル処理共通関数
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
    // バリデーション
    const maxSize = bucketName === 'avatars' ? 5 : 10
    const validation = validateImageFile(file, maxSize)
    if (!validation.valid) {
      setError(validation.error || '')
      return
    }

    // プレビュー表示
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // アップロード
    setUploading(true)
    setError('')

    try {
      // 古い画像を削除
      if (oldUrl) {
        await deleteImage(oldUrl, bucketName)
      }

      // 新しい画像をアップロード
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

  // アイコン画像: ドラッグ&ドロップ
  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDraggingAvatar(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      processImageFile(
        file,
        uploadAvatar,
        setUploadingAvatar,
        setAvatarUrl,
        setAvatarPreview,
        avatarUrl,
        'avatars',
        'アイコン画像をアップロードしました'
      )
    }
  }

  // アイコン画像: クリック
  const handleAvatarClick = () => {
    avatarInputRef.current?.click()
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(
        file,
        uploadAvatar,
        setUploadingAvatar,
        setAvatarUrl,
        setAvatarPreview,
        avatarUrl,
        'avatars',
        'アイコン画像をアップロードしました'
      )
    }
  }

  // ヘッダー画像: ドラッグ&ドロップ
  const handleHeaderDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDraggingHeader(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      processImageFile(
        file,
        uploadHeader,
        setUploadingHeader,
        setHeaderUrl,
        setHeaderPreview,
        headerUrl,
        'headers',
        'ヘッダー画像をアップロードしました'
      )
    }
  }

  // ヘッダー画像: クリック
  const handleHeaderClick = () => {
    headerInputRef.current?.click()
  }

  const handleHeaderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(
        file,
        uploadHeader,
        setUploadingHeader,
        setHeaderUrl,
        setHeaderPreview,
        headerUrl,
        'headers',
        'ヘッダー画像をアップロードしました'
      )
    }
  }

  // アイコン画像削除
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

  // ヘッダー画像削除
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
      avatar_url: avatarUrl,
      header_url: headerUrl,
      twitter_url: twitterUrl,
      pixiv_url: pixivUrl,
      website_url: websiteUrl,
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
              
              {/* ヘッダー画像 */}
              <div className="mb-32">
                <label className="form-label mb-12">
                  ヘッダー画像
                </label>
                
                <div
                  className={`upload-area ${draggingHeader ? 'dragging' : ''} ${uploadingHeader ? 'uploading' : ''}`}
                  style={{ width: '100%', height: '200px' }}
                  onClick={handleHeaderClick}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDraggingHeader(true)
                  }}
                  onDragLeave={() => setDraggingHeader(false)}
                  onDrop={handleHeaderDrop}
                >
                  {headerPreview ? (
                    <img src={headerPreview} alt="ヘッダー画像" />
                  ) : (
                    <div className="upload-area-content" style={{ height: '100%' }}>
                      <div className="upload-area-icon">
                        <i className="fas fa-image"></i>
                      </div>
                      <div className="upload-area-text">
                        クリックまたはドラッグして<br />ヘッダー画像をアップロード
                      </div>
                      <div className="upload-area-hint">
                        推奨: 1500×500px / JPG, PNG, WebP / 最大10MB
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
                    className="btn-danger btn-small"
                    style={{ marginTop: '12px' }}
                  >
                    削除
                  </button>
                )}
              </div>

              {/* アイコン画像 */}
              <div className="mb-32">
                <label className="form-label mb-12">
                  アイコン画像
                </label>
                
                <div className="flex gap-20" style={{ alignItems: 'flex-start' }}>
                  <div
                    className={`upload-area ${draggingAvatar ? 'dragging' : ''} ${uploadingAvatar ? 'uploading' : ''}`}
                    style={{ 
                      width: '120px', 
                      height: '120px', 
                      borderRadius: '50%',
                      flexShrink: 0
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
                      <img src={avatarPreview} alt="アイコン画像" style={{ borderRadius: '50%' }} />
                    ) : (
                      <div className="upload-area-content" style={{ height: '100%' }}>
                        <div className="upload-area-icon" style={{ fontSize: '48px', marginBottom: 0 }}>
                          <i className="fas fa-user"></i>
                        </div>
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
                    
                    <div className="text-small mb-8">
                      クリックまたはドラッグしてアイコン画像をアップロード
                    </div>
                    
                    <div className="text-tiny text-gray mb-12">
                      推奨: 400×400px / JPG, PNG, WebP / 最大5MB
                    </div>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleAvatarRemove}
                        disabled={uploadingAvatar}
                        className="btn-danger btn-small"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 表示名 */}
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

              {/* 自己紹介 */}
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

              {/* SNSリンク */}
              <div className="mb-32">
                <label className="form-label mb-12">
                  SNSリンク
                </label>
                
                <div className="mb-16">
                  <label className="text-small text-gray mb-8" style={{ display: 'block' }}>
                    Twitter (X)
                  </label>
                  <input
                    type="url"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    className="input-field"
                    placeholder="https://twitter.com/username"
                  />
                </div>

                <div className="mb-16">
                  <label className="text-small text-gray mb-8" style={{ display: 'block' }}>
                    Pixiv
                  </label>
                  <input
                    type="url"
                    value={pixivUrl}
                    onChange={(e) => setPixivUrl(e.target.value)}
                    className="input-field"
                    placeholder="https://www.pixiv.net/users/12345"
                  />
                </div>

                <div>
                  <label className="text-small text-gray mb-8" style={{ display: 'block' }}>
                    ウェブサイト
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="input-field"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* 利用目的 */}
              <div className="mb-32">
                <label className="form-label mb-12">
                  利用目的
                </label>
                
                <div className="flex flex-col gap-12">
                  <label className={`radio-card ${role === 'creator' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="creator"
                      checked={role === 'creator'}
                      onChange={(e) => setRole(e.target.value)}
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

                  <label className={`radio-card ${role === 'client' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="client"
                      checked={role === 'client'}
                      onChange={(e) => setRole(e.target.value)}
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

                  <label className={`radio-card ${role === 'both' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="both"
                      checked={role === 'both'}
                      onChange={(e) => setRole(e.target.value)}
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

              {/* エラー・成功メッセージ */}
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

              {/* ボタン */}
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