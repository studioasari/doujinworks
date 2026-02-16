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
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUser(user)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      setDisplayName(profileData.display_name || '')
      setBio(profileData.bio || '')
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

  // アイコン画像: ドラッグ&ドロップ
  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDraggingAvatar(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      processImageFile(file, uploadAvatar, setUploadingAvatar, setAvatarUrl, setAvatarPreview, avatarUrl, 'avatars', 'アイコン画像をアップロードしました')
    }
  }

  const handleAvatarClick = () => { avatarInputRef.current?.click() }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(file, uploadAvatar, setUploadingAvatar, setAvatarUrl, setAvatarPreview, avatarUrl, 'avatars', 'アイコン画像をアップロードしました')
    }
    e.target.value = ''
  }

  // ヘッダー画像: ドラッグ&ドロップ
  const handleHeaderDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDraggingHeader(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      processImageFile(file, uploadHeader, setUploadingHeader, setHeaderUrl, setHeaderPreview, headerUrl, 'headers', 'ヘッダー画像をアップロードしました')
    }
  }

  const handleHeaderClick = () => { headerInputRef.current?.click() }

  const handleHeaderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(file, uploadHeader, setUploadingHeader, setHeaderUrl, setHeaderPreview, headerUrl, 'headers', 'ヘッダー画像をアップロードしました')
    }
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