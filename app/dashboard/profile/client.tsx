'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { uploadAvatar, uploadHeader, deleteImage, validateImageFile } from '@/utils/imageUtils'
import { LoadingSpinner } from '@/app/components/Skeleton'
import styles from './page.module.css'

export default function ProfileClient() {
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
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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
    return <LoadingSpinner />
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        {/* ヘッダー画像 */}
        <div className={styles.headerWrapper}>
          <div
            className={`${styles.headerUpload} ${draggingHeader ? styles.dragging : ''} ${uploadingHeader ? styles.uploading : ''}`}
            onClick={handleHeaderClick}
            onDragOver={(e) => {
              e.preventDefault()
              setDraggingHeader(true)
            }}
            onDragLeave={() => setDraggingHeader(false)}
            onDrop={handleHeaderDrop}
          >
            {headerPreview ? (
              <>
                <img src={headerPreview} alt="ヘッダー画像" className={styles.headerImage} />
                <div className={styles.uploadOverlay}>
                  <i className="fa-solid fa-camera"></i>
                  <span>クリックして変更</span>
                  <span className={styles.sizeHint}>推奨: 1500×500px</span>
                </div>
              </>
            ) : (
              <div className={styles.uploadPlaceholder}>
                <i className="fa-solid fa-camera"></i>
                <span>ヘッダー画像を追加</span>
                <span className={styles.sizeHint}>推奨: 1500×500px</span>
              </div>
            )}

            {headerUrl && (
              <button
                type="button"
                onClick={handleHeaderRemove}
                disabled={uploadingHeader}
                className={styles.removeBtn}
              >
                <i className="fa-solid fa-xmark"></i>
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
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper}>
            <div
              className={`${styles.avatarUpload} ${draggingAvatar ? styles.dragging : ''} ${uploadingAvatar ? styles.uploading : ''}`}
              onClick={handleAvatarClick}
              onDragOver={(e) => {
                e.preventDefault()
                setDraggingAvatar(true)
              }}
              onDragLeave={() => setDraggingAvatar(false)}
              onDrop={handleAvatarDrop}
            >
              {avatarPreview ? (
                <>
                  <img src={avatarPreview} alt="アイコン画像" className={styles.avatarImage} />
                  <div className={styles.avatarOverlay}>
                    <i className="fa-solid fa-camera"></i>
                  </div>
                </>
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <i className="fa-solid fa-user"></i>
                </div>
              )}
            </div>

            {/* 常時表示のカメラバッジ */}
            <div className={styles.editBadge}>
              <i className="fa-solid fa-camera"></i>
            </div>

            {avatarUrl && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                disabled={uploadingAvatar}
                className={`${styles.removeBtn} ${styles.avatarRemoveBtn}`}
              >
                <i className="fa-solid fa-xmark"></i>
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
          <div className="form-group">
            <label className="form-label">ユーザーID</label>
            <div className={styles.readonlyField}>
              @{profile.username}
            </div>
            <p className={styles.hint}>ユーザーIDは変更できません</p>
          </div>
        )}

        {/* 表示名 */}
        <div className="form-group">
          <label className="form-label">表示名</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="form-input"
            placeholder="例: 山田太郎"
          />
        </div>

        {/* 自己紹介 */}
        <div className="form-group">
          <label className="form-label">自己紹介</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="form-input"
            placeholder="あなたについて教えてください"
          />
        </div>

        {/* SNSリンク */}
        <div className="form-group">
          <label className="form-label">SNSリンク</label>
          
          <div className={styles.snsItem}>
            <label className={styles.snsLabel}>Twitter (X)</label>
            <input
              type="url"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              className="form-input"
              placeholder="https://twitter.com/username"
            />
          </div>

          <div className={styles.snsItem}>
            <label className={styles.snsLabel}>Pixiv</label>
            <input
              type="url"
              value={pixivUrl}
              onChange={(e) => setPixivUrl(e.target.value)}
              className="form-input"
              placeholder="https://www.pixiv.net/users/12345"
            />
          </div>

          <div className={styles.snsItem}>
            <label className={styles.snsLabel}>ウェブサイト</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="form-input"
              placeholder="https://example.com"
            />
          </div>
        </div>

        {/* アカウント種別 */}
        <div className="form-group">
          <label className="form-label">アカウント種別</label>
          
          <div className={styles.accountTypeOptions}>
            <label className={`radio ${currentAccountType === 'business' ? styles.disabled : ''}`}>
              <input
                type="radio"
                name="accountType"
                value="casual"
                checked={accountType === 'casual'}
                onChange={(e) => handleAccountTypeChange(e.target.value as 'casual')}
                disabled={currentAccountType === 'business'}
              />
              <span className="radio-mark"></span>
              <span className={styles.accountTypeContent}>
                <span className={styles.accountTypeTitle}>一般利用</span>
                <span className={styles.accountTypeDesc}>
                  趣味で作品を投稿したり、他のクリエイターの作品を楽しむ
                </span>
              </span>
            </label>

            <label className="radio">
              <input
                type="radio"
                name="accountType"
                value="business"
                checked={accountType === 'business'}
                onChange={(e) => handleAccountTypeChange(e.target.value as 'business')}
              />
              <span className="radio-mark"></span>
              <span className={styles.accountTypeContent}>
                <span className={styles.accountTypeTitle}>ビジネス利用</span>
                <span className={styles.accountTypeDesc}>
                  仕事の受発注、報酬の受け取りなどビジネスとして利用する
                </span>
              </span>
            </label>
          </div>

          {currentAccountType === 'business' && (
            <p className={styles.hint}>
              ※ ビジネスアカウントから一般アカウントへの変更はできません
            </p>
          )}
        </div>

        {/* ビジネス情報（ビジネス利用選択時のみ表示） */}
        {accountType === 'business' && (
          <div ref={businessSectionRef} className={styles.businessSection}>
            <h3 className={styles.businessTitle}>ビジネス情報</h3>
            <p className={styles.businessDesc}>取引に必要な情報を入力してください</p>

            {/* 個人/法人 */}
            <div className="form-group">
              <label className="form-label">
                個人/法人 <span className={styles.required}>*</span>
              </label>
              <div className={styles.toggleGroup}>
                <button
                  type="button"
                  onClick={() => setBusinessAccountType('individual')}
                  className={`${styles.toggleBtn} ${businessAccountType === 'individual' ? styles.active : ''}`}
                >
                  個人
                </button>
                <button
                  type="button"
                  onClick={() => setBusinessAccountType('corporate')}
                  className={`${styles.toggleBtn} ${businessAccountType === 'corporate' ? styles.active : ''}`}
                >
                  法人
                </button>
              </div>
            </div>

            {/* 氏名 */}
            <div className="form-group">
              <label className="form-label">
                氏名 <span className={styles.required}>*</span>
              </label>
              <div className={styles.formRow}>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="姓"
                  required
                  className="form-input"
                />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="名"
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* 氏名かな */}
            <div className="form-group">
              <label className="form-label">
                氏名(かな) <span className={styles.required}>*</span>
              </label>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <input
                    type="text"
                    value={lastNameKana}
                    onChange={(e) => {
                      setLastNameKana(e.target.value)
                      validateKana(e.target.value, setLastNameKanaError)
                    }}
                    placeholder="せい"
                    required
                    className={`form-input ${lastNameKanaError ? 'error' : ''}`}
                  />
                  {lastNameKanaError && (
                    <p className="form-error"><i className="fa-solid fa-circle-exclamation"></i> {lastNameKanaError}</p>
                  )}
                </div>
                <div className={styles.formField}>
                  <input
                    type="text"
                    value={firstNameKana}
                    onChange={(e) => {
                      setFirstNameKana(e.target.value)
                      validateKana(e.target.value, setFirstNameKanaError)
                    }}
                    placeholder="めい"
                    required
                    className={`form-input ${firstNameKanaError ? 'error' : ''}`}
                  />
                  {firstNameKanaError && (
                    <p className="form-error"><i className="fa-solid fa-circle-exclamation"></i> {firstNameKanaError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 会社名（法人のみ） */}
            {businessAccountType === 'corporate' && (
              <div className="form-group">
                <label className="form-label">
                  会社名 <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="株式会社○○"
                  required
                  className="form-input"
                />
              </div>
            )}

            {/* 電話番号 */}
            <div className="form-group">
              <label className="form-label">
                電話番号 <span className={styles.required}>*</span>
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
                className={`form-input ${phoneError ? 'error' : ''}`}
              />
              {phoneError && (
                <p className="form-error"><i className="fa-solid fa-circle-exclamation"></i> {phoneError}</p>
              )}
            </div>

            {/* 郵便番号 */}
            <div className="form-group">
              <label className="form-label">
                郵便番号 <span className={styles.required}>*</span>
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
                className={`form-input ${postalCodeError ? 'error' : ''}`}
              />
              {postalCodeError && (
                <p className="form-error"><i className="fa-solid fa-circle-exclamation"></i> {postalCodeError}</p>
              )}
            </div>

            {/* 都道府県 */}
            <div className="form-group">
              <label className="form-label">
                都道府県 <span className={styles.required}>*</span>
              </label>
              <select
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                required
                className="form-input"
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
            <div className="form-group">
              <label className="form-label">
                住所(番地まで) <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                placeholder="○○市○○町1-2-3"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">住所(建物名など)</label>
              <input
                type="text"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                placeholder="○○マンション101号室"
                className="form-input"
              />
            </div>
          </div>
        )}

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="alert alert-error">
            <i className="fa-solid fa-circle-xmark alert-icon"></i>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <i className="fa-solid fa-circle-check alert-icon"></i>
            {success}
          </div>
        )}

        {/* ボタン */}
        <div className={styles.actions}>
          <Link href="/dashboard" className="btn btn-secondary">
            キャンセル
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? '保存中...' : '変更を保存'}
          </button>
        </div>
      </div>
    </div>
  )
}