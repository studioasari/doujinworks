'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import DashboardSidebar from '@/app/components/DashboardSidebar'
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
  
  // ビジネス情報
  const [businessAccountType, setBusinessAccountType] = useState<'individual' | 'corporate'>('individual')
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastNameKana, setLastNameKana] = useState('')
  const [firstNameKana, setFirstNameKana] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [prefecture, setPrefecture] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  
  // バリデーションエラー
  const [lastNameKanaError, setLastNameKanaError] = useState('')
  const [firstNameKanaError, setFirstNameKanaError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [postalCodeError, setPostalCodeError] = useState('')
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const headerInputRef = useRef<HTMLInputElement>(null)
  const businessSectionRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // ログイン確認
  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
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

      // ビジネス情報を取得
      if (profileData.account_type === 'business') {
        const { data: businessData } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('profile_id', profileData.id)
          .single()

        if (businessData) {
          setBusinessAccountType(businessData.account_type || 'individual')
          setLastName(businessData.last_name || '')
          setFirstName(businessData.first_name || '')
          setLastNameKana(businessData.last_name_kana || '')
          setFirstNameKana(businessData.first_name_kana || '')
          setCompanyName(businessData.company_name || '')
          setPhone(businessData.phone || '')
          setPostalCode(businessData.postal_code || '')
          setPrefecture(businessData.prefecture || '')
          setAddress1(businessData.address1 || '')
          setAddress2(businessData.address2 || '')
        }
      }
    }

    setLoading(false)
  }

  // ビジネス利用を選択した時にスクロール
  useEffect(() => {
    if (accountType === 'business' && currentAccountType === 'casual' && businessSectionRef.current) {
      setTimeout(() => {
        businessSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [accountType])

  // バリデーション関数
  const validateKana = (value: string, setError: (error: string) => void) => {
    if (!value) {
      setError('')
      return true
    }
    const hiraganaRegex = /^[\u3040-\u309F\s]*$/
    if (!hiraganaRegex.test(value)) {
      setError('ひらがなで入力してください')
      return false
    }
    setError('')
    return true
  }

  const validatePhone = (value: string) => {
    if (!value) {
      setPhoneError('')
      return true
    }
    const numberRegex = /^[0-9]*$/
    if (!numberRegex.test(value)) {
      setPhoneError('数字のみで入力してください')
      return false
    }
    setPhoneError('')
    return true
  }

  const validatePostalCode = (value: string) => {
    if (!value) {
      setPostalCodeError('')
      return true
    }
    const numberRegex = /^[0-9]*$/
    if (!numberRegex.test(value)) {
      setPostalCodeError('数字のみで入力してください')
      return false
    }
    setPostalCodeError('')
    return true
  }

  // ビジネス情報の入力チェック
  const isBusinessInfoComplete = () => {
    const basicComplete = lastName && 
                         firstName &&
                         lastNameKana && 
                         firstNameKana &&
                         phone && 
                         postalCode && 
                         prefecture && 
                         address1 &&
                         !lastNameKanaError &&
                         !firstNameKanaError &&
                         !phoneError &&
                         !postalCodeError
    
    if (businessAccountType === 'corporate') {
      return basicComplete && companyName
    }
    return basicComplete
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
    // input要素をリセット（同じファイルを再選択可能にする）
    e.target.value = ''
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
    // input要素をリセット（同じファイルを再選択可能にする）
    e.target.value = ''
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

  // アカウント種別変更
  const handleAccountTypeChange = (newType: 'casual' | 'business') => {
    setAccountType(newType)
  }

  // プロフィール保存
  const handleSave = async () => {
    if (!user) return
    
    setSaving(true)
    setError('')
    setSuccess('')

    // ビジネスアカウントの場合、ビジネス情報のバリデーション
    if (accountType === 'business' && !isBusinessInfoComplete()) {
      setError('ビジネス情報を全て入力してください')
      setSaving(false)
      // ビジネス情報セクションにスクロール
      businessSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    // プロフィール保存
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

    if (profile?.username) {
      profileData.username = profile.username
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' })

    if (profileError) {
      setError(profileError.message)
      setSaving(false)
      return
    }

    // ビジネス情報保存（ビジネスアカウントの場合）
    if (accountType === 'business') {
      const businessData: any = {
        profile_id: profile.id,
        account_type: businessAccountType,
        last_name: lastName,
        first_name: firstName,
        last_name_kana: lastNameKana,
        first_name_kana: firstNameKana,
        phone,
        postal_code: postalCode,
        prefecture,
        address1,
      }

      if (address2) businessData.address2 = address2
      if (businessAccountType === 'corporate' && companyName) {
        businessData.company_name = companyName
      }

      const { error: businessError } = await supabase
        .from('business_profiles')
        .upsert(businessData, { onConflict: 'profile_id' })

      if (businessError) {
        setError(businessError.message)
        setSaving(false)
        return
      }
    }

    setSuccess('プロフィールを保存しました')
    setSaving(false)
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
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
        <main style={{ 
          flex: 1, 
          padding: '40px',
        }}>
          <style jsx>{`
            .visually-hidden {
              position: absolute;
              width: 1px;
              height: 1px;
              padding: 0;
              margin: -1px;
              overflow: hidden;
              clip: rect(0, 0, 0, 0);
              white-space: nowrap;
              border-width: 0;
            }
            .profile-avatar-wrapper {
              border: 2px dashed #D0D5DA;
              border-radius: 50%;
              transition: all 0.2s;
            }
            .profile-avatar-wrapper:hover {
              border-color: #5b7c99;
            }
            .profile-avatar-wrapper.dragging {
              border-color: #5b7c99;
            }
            @media (max-width: 1024px) {
              main {
                padding: 32px 24px !important;
              }
            }
            @media (max-width: 768px) {
              main {
                padding: 32px 16px !important;
              }
              .card-no-hover {
                border: none !important;
                padding: 0 !important;
              }
              .profile-avatar {
                width: 80px !important;
                height: 80px !important;
              }
              .upload-area-icon {
                margin-bottom: 0 !important;
                font-size: 28px !important;
              }
              .header-wrapper {
                margin-bottom: -44px !important;
              }
              .remove-image-btn {
                width: 28px !important;
                height: 28px !important;
                font-size: 14px !important;
              }
            }
            @media (min-width: 769px) {
              .header-wrapper {
                margin-bottom: -64px !important;
              }
            }
          `}</style>

          <h1 className="visually-hidden">プロフィール編集</h1>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card-no-hover p-40">
              
              {/* ヘッダー画像 */}
              <div className="header-wrapper" style={{ position: 'relative' }}>
                <div
                  className={`upload-area ${draggingHeader ? 'dragging' : ''} ${uploadingHeader ? 'uploading' : ''}`}
                  style={{ width: '100%', paddingBottom: '33.33%', position: 'relative' }}
                  onClick={handleHeaderClick}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDraggingHeader(true)
                  }}
                  onDragLeave={() => setDraggingHeader(false)}
                  onDrop={handleHeaderDrop}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    {headerPreview ? (
                      <img src={headerPreview} alt="ヘッダー画像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div className="upload-area-content" style={{ height: '100%' }}>
                        <div className="upload-area-icon" style={{ marginBottom: '8px' }}>
                          <i className="fas fa-image"></i>
                        </div>
                        <div className="text-tiny text-gray">
                          推奨: 1500×500px
                        </div>
                      </div>
                    )}
                  </div>

                  {headerUrl && (
                    <button
                      type="button"
                      onClick={handleHeaderRemove}
                      disabled={uploadingHeader}
                      className="remove-image-btn"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        zIndex: 10,
                        fontSize: '16px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>

                <input
                  ref={headerInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleHeaderSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {/* アイコン画像 */}
              <div style={{ paddingLeft: '16px', marginBottom: '24px' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div
                    className={`upload-area profile-avatar profile-avatar-wrapper ${draggingAvatar ? 'dragging' : ''} ${uploadingAvatar ? 'uploading' : ''}`}
                    style={{ 
                      width: '120px', 
                      height: '120px'
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

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      disabled={uploadingAvatar}
                      className="remove-image-btn"
                      style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        zIndex: 10,
                        fontSize: '16px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleAvatarSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {/* ユーザーID（変更不可） */}
              {profile?.username && (
                <div className="mb-24">
                  <label className="form-label">
                    ユーザーID
                  </label>
                  <div className="input-field" style={{
                    backgroundColor: '#EEF0F3',
                    color: '#888888',
                    cursor: 'not-allowed'
                  }}>
                    @{profile.username}
                  </div>
                  <div className="form-hint">
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
                  <label className="text-small text-secondary mb-8" style={{ display: 'block' }}>
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
                  <label className="text-small text-secondary mb-8" style={{ display: 'block' }}>
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
                  <label className="text-small text-secondary mb-8" style={{ display: 'block' }}>
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
                      <div style={{ fontWeight: '600', color: '#222222', marginBottom: '4px' }}>
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
                      <div style={{ fontWeight: '600', color: '#222222', marginBottom: '4px' }}>
                        ビジネス利用
                      </div>
                      <div className="text-tiny text-gray">
                        仕事の受発注、報酬の受け取りなどビジネスとして利用する
                      </div>
                    </div>
                  </label>
                </div>

                {currentAccountType === 'business' && (
                  <div className="form-hint" style={{ marginTop: '12px' }}>
                    ※ ビジネスアカウントから一般アカウントへの変更はできません
                  </div>
                )}
              </div>

              {/* ビジネス情報（ビジネス利用選択時のみ表示） */}
              {accountType === 'business' && (
                <div 
                  ref={businessSectionRef}
                  style={{
                    marginBottom: '32px',
                    padding: '24px',
                    backgroundColor: '#EEF0F3',
                    borderRadius: '12px',
                    border: '2px solid #D0D5DA',
                    scrollMarginTop: '80px'
                  }}
                >
                  <h3 className="card-subtitle mb-8">
                    ビジネス情報
                  </h3>
                  <p className="text-small text-secondary mb-24">
                    取引に必要な情報を入力してください
                  </p>

                  {/* 個人/法人 */}
                  <div className="mb-24">
                    <label className="form-label mb-12">
                      個人/法人 <span className="form-required">*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setBusinessAccountType('individual')}
                        className={businessAccountType === 'individual' ? 'btn-primary' : 'btn-secondary'}
                        style={{ flex: 1 }}
                      >
                        個人
                      </button>
                      <button
                        type="button"
                        onClick={() => setBusinessAccountType('corporate')}
                        className={businessAccountType === 'corporate' ? 'btn-primary' : 'btn-secondary'}
                        style={{ flex: 1 }}
                      >
                        法人
                      </button>
                    </div>
                  </div>

                  {/* 氏名 */}
                  <div className="mb-24">
                    <label className="form-label">
                      氏名 <span className="form-required">*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="姓"
                        required
                        className="input-field"
                        style={{ flex: 1 }}
                      />
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="名"
                        required
                        className="input-field"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  {/* 氏名かな */}
                  <div className="mb-24">
                    <label className="form-label">
                      氏名(かな) <span className="form-required">*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          value={lastNameKana}
                          onChange={(e) => {
                            setLastNameKana(e.target.value)
                            validateKana(e.target.value, setLastNameKanaError)
                          }}
                          placeholder="せい"
                          required
                          className={`input-field ${lastNameKanaError ? 'error' : ''}`}
                        />
                        {lastNameKanaError && (
                          <div className="form-error">
                            <i className="fas fa-times-circle"></i>
                            {lastNameKanaError}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          value={firstNameKana}
                          onChange={(e) => {
                            setFirstNameKana(e.target.value)
                            validateKana(e.target.value, setFirstNameKanaError)
                          }}
                          placeholder="めい"
                          required
                          className={`input-field ${firstNameKanaError ? 'error' : ''}`}
                        />
                        {firstNameKanaError && (
                          <div className="form-error">
                            <i className="fas fa-times-circle"></i>
                            {firstNameKanaError}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 会社名（法人のみ） */}
                  {businessAccountType === 'corporate' && (
                    <div className="mb-24">
                      <label className="form-label">
                        会社名 <span className="form-required">*</span>
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="株式会社○○"
                        required
                        className="input-field"
                      />
                    </div>
                  )}

                  {/* 電話番号 */}
                  <div className="mb-24">
                    <label className="form-label">
                      電話番号 <span className="form-required">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value)
                        validatePhone(e.target.value)
                      }}
                      placeholder="09012345678"
                      required
                      maxLength={11}
                      className={`input-field ${phoneError ? 'error' : ''}`}
                    />
                    {phoneError && (
                      <div className="form-error">
                        <i className="fas fa-times-circle"></i>
                        {phoneError}
                      </div>
                    )}
                  </div>

                  {/* 郵便番号 */}
                  <div className="mb-24">
                    <label className="form-label">
                      郵便番号 <span className="form-required">*</span>
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => {
                        setPostalCode(e.target.value)
                        validatePostalCode(e.target.value)
                      }}
                      placeholder="1234567"
                      required
                      maxLength={7}
                      className={`input-field ${postalCodeError ? 'error' : ''}`}
                    />
                    {postalCodeError && (
                      <div className="form-error">
                        <i className="fas fa-times-circle"></i>
                        {postalCodeError}
                      </div>
                    )}
                  </div>

                  {/* 都道府県 */}
                  <div className="mb-24">
                    <label className="form-label">
                      都道府県 <span className="form-required">*</span>
                    </label>
                    <select
                      value={prefecture}
                      onChange={(e) => setPrefecture(e.target.value)}
                      required
                      className="select-field"
                    >
                      <option value="">選択してください</option>
                      <option value="北海道">北海道</option>
                      <option value="青森県">青森県</option>
                      <option value="岩手県">岩手県</option>
                      <option value="宮城県">宮城県</option>
                      <option value="秋田県">秋田県</option>
                      <option value="山形県">山形県</option>
                      <option value="福島県">福島県</option>
                      <option value="茨城県">茨城県</option>
                      <option value="栃木県">栃木県</option>
                      <option value="群馬県">群馬県</option>
                      <option value="埼玉県">埼玉県</option>
                      <option value="千葉県">千葉県</option>
                      <option value="東京都">東京都</option>
                      <option value="神奈川県">神奈川県</option>
                      <option value="新潟県">新潟県</option>
                      <option value="富山県">富山県</option>
                      <option value="石川県">石川県</option>
                      <option value="福井県">福井県</option>
                      <option value="山梨県">山梨県</option>
                      <option value="長野県">長野県</option>
                      <option value="岐阜県">岐阜県</option>
                      <option value="静岡県">静岡県</option>
                      <option value="愛知県">愛知県</option>
                      <option value="三重県">三重県</option>
                      <option value="滋賀県">滋賀県</option>
                      <option value="京都府">京都府</option>
                      <option value="大阪府">大阪府</option>
                      <option value="兵庫県">兵庫県</option>
                      <option value="奈良県">奈良県</option>
                      <option value="和歌山県">和歌山県</option>
                      <option value="鳥取県">鳥取県</option>
                      <option value="島根県">島根県</option>
                      <option value="岡山県">岡山県</option>
                      <option value="広島県">広島県</option>
                      <option value="山口県">山口県</option>
                      <option value="徳島県">徳島県</option>
                      <option value="香川県">香川県</option>
                      <option value="愛媛県">愛媛県</option>
                      <option value="高知県">高知県</option>
                      <option value="福岡県">福岡県</option>
                      <option value="佐賀県">佐賀県</option>
                      <option value="長崎県">長崎県</option>
                      <option value="熊本県">熊本県</option>
                      <option value="大分県">大分県</option>
                      <option value="宮崎県">宮崎県</option>
                      <option value="鹿児島県">鹿児島県</option>
                      <option value="沖縄県">沖縄県</option>
                    </select>
                  </div>

                  {/* 住所 */}
                  <div className="mb-24">
                    <label className="form-label">
                      住所(番地まで) <span className="form-required">*</span>
                    </label>
                    <input
                      type="text"
                      value={address1}
                      onChange={(e) => setAddress1(e.target.value)}
                      placeholder="○○市○○町1-2-3"
                      required
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      住所(建物名など)
                    </label>
                    <input
                      type="text"
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                      placeholder="○○マンション101号室"
                      className="input-field"
                    />
                  </div>
                </div>
              )}

              {/* エラー・成功メッセージ */}
              {error && (
                <div className="alert alert-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success">
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
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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