'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import DashboardSidebar from '../components/DashboardSidebar'
import { uploadAvatar, uploadHeader, deleteImage, validateImageFile } from '@/utils/imageUtils'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingHeader, setUploadingHeader] = useState(false)
  const [draggingAvatar, setDraggingAvatar] = useState(false)
  const [draggingHeader, setDraggingHeader] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  
  // 基本情報
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [accountType, setAccountType] = useState<'casual' | 'business'>('casual')
  const [currentAccountType, setCurrentAccountType] = useState<'casual' | 'business'>('casual')
  
  // 画像
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [headerUrl, setHeaderUrl] = useState<string | null>(null)
  const [headerPreview, setHeaderPreview] = useState<string | null>(null)
  
  // SNSリンク
  const [twitterUrl, setTwitterUrl] = useState('')
  const [pixivUrl, setPixivUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  
  // ビジネスアカウント切り替え確認
  const [showBusinessUpgrade, setShowBusinessUpgrade] = useState(false)
  
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
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      setDisplayName(profileData.display_name || '')
      setBio(profileData.bio || '')
      setAccountType(profileData.account_type || 'casual')
      setCurrentAccountType(profileData.account_type || 'casual')
      setAvatarUrl(profileData.avatar_url || null)
      setAvatarPreview(profileData.avatar_url || null)
      setHeaderUrl(profileData.header_url || null)
      setHeaderPreview(profileData.header_url || null)
      setTwitterUrl(profileData.twitter_url || '')
      setPixivUrl(profileData.pixiv_url || '')
      setWebsiteUrl(profileData.website_url || '')
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

  // ビジネスアカウントへの切り替え確認
  const handleAccountTypeChange = (newType: 'casual' | 'business') => {
    // 一般→ビジネスへの切り替えのみ確認
    if (currentAccountType === 'casual' && newType === 'business') {
      setShowBusinessUpgrade(true)
    } else {
      setAccountType(newType)
    }
  }

  // ビジネスアカウント切り替え実行
  const confirmBusinessUpgrade = () => {
    setAccountType('business')
    setShowBusinessUpgrade(false)
    setSuccess('ビジネスアカウントに切り替えます。保存してください。')
    setTimeout(() => setSuccess(''), 3000)
  }

  // プロフィール保存
  const handleSave = async () => {
    if (!user) return
    
    setSaving(true)
    setError('')
    setSuccess('')

    const profileData: any = {
      user_id: user.id,
      display_name: displayName,
      bio: bio,
      account_type: accountType,
      can_receive_work: accountType === 'business',
      can_request_work: accountType === 'business',
      avatar_url: avatarUrl,
      header_url: headerUrl,
      twitter_url: twitterUrl,
      pixiv_url: pixivUrl,
      website_url: websiteUrl,
    }

    // username が存在する場合のみ含める（変更はしない）
    if (profile?.username) {
      profileData.username = profile.username
    }

    // upsert（存在すれば更新、なければ作成）
    const { error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      // ビジネスアカウントに切り替えた場合、settings画面へ誘導
      if (currentAccountType === 'casual' && accountType === 'business') {
        setSuccess('ビジネスアカウントに切り替えました。ビジネス情報を入力してください。')
        setSaving(false)
        setTimeout(() => {
          router.push('/settings')
        }, 2000)
      } else {
        setSuccess('プロフィールを保存しました')
        setSaving(false)
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      }
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
        <DashboardSidebar />

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

              {/* ユーザーID（変更不可） */}
              {profile?.username && (
                <div className="mb-24">
                  <label className="form-label">
                    ユーザーID
                  </label>
                  <div style={{
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '8px',
                    backgroundColor: '#F9F9F9',
                    color: '#6B6B6B'
                  }}>
                    @{profile.username}
                  </div>
                  <div className="text-tiny text-gray" style={{ marginTop: '6px' }}>
                    ユーザーIDは変更できません
                  </div>
                </div>
              )}

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

              {/* アカウント種別 */}
              <div className="mb-32">
                <label className="form-label mb-12">
                  アカウント種別
                </label>
                
                <div className="flex flex-col gap-12">
                  <label className={`radio-card ${accountType === 'casual' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="accountType"
                      value="casual"
                      checked={accountType === 'casual'}
                      onChange={(e) => handleAccountTypeChange(e.target.value as 'casual')}
                      disabled={currentAccountType === 'business'}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1A1A1A', marginBottom: '4px' }}>
                        一般利用
                      </div>
                      <div className="text-tiny text-gray">
                        趣味で作品を投稿したり、他のクリエイターの作品を楽しむ
                      </div>
                    </div>
                  </label>

                  <label className={`radio-card ${accountType === 'business' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="accountType"
                      value="business"
                      checked={accountType === 'business'}
                      onChange={(e) => handleAccountTypeChange(e.target.value as 'business')}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1A1A1A', marginBottom: '4px' }}>
                        ビジネス利用
                      </div>
                      <div className="text-tiny text-gray">
                        仕事の受発注、報酬の受け取りなどビジネスとして利用する
                      </div>
                    </div>
                  </label>
                </div>

                {currentAccountType === 'business' && (
                  <div className="text-tiny text-gray" style={{ marginTop: '12px' }}>
                    ※ ビジネスアカウントから一般アカウントへの変更はできません
                  </div>
                )}
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

      {/* ビジネスアカウント切り替え確認モーダル */}
      {showBusinessUpgrade && (
        <>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }} onClick={() => setShowBusinessUpgrade(false)}>
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%'
            }} onClick={(e) => e.stopPropagation()}>
              <h2 className="card-title mb-16">ビジネスアカウントに切り替えますか？</h2>
              
              <div className="text-small text-gray mb-24">
                ビジネスアカウントに切り替えると、以下の機能が利用できるようになります。
                <ul style={{ marginTop: '12px', paddingLeft: '20px' }}>
                  <li>仕事の受発注</li>
                  <li>報酬の受け取り</li>
                  <li>請求書の発行</li>
                </ul>
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#FFF5F5', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '13px', color: '#7F1D1D' }}>
                  ※ 一度ビジネスアカウントに切り替えると、一般アカウントには戻せません
                </div>
              </div>

              <div className="flex gap-12">
                <button
                  onClick={() => setShowBusinessUpgrade(false)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmBusinessUpgrade}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  切り替える
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <Footer />
    </>
  )
}