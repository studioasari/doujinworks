'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import DashboardSidebar from '../../../components/DashboardSidebar'

export default function UploadVideoPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoFileName, setVideoFileName] = useState<string>('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')
  const [externalUrl, setExternalUrl] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        setCurrentUserId(profile.id)
      } else {
        alert('プロフィールが見つかりません')
        router.push('/profile')
      }
    }
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        alert('動画ファイルは100MB以下にしてください')
        return
      }
      
      if (!file.type.startsWith('video/')) {
        alert('動画ファイルを選択してください')
        return
      }

      setVideoFile(file)
      setVideoFileName(file.name)
    }
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('サムネイル画像は5MB以下にしてください')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください')
        return
      }

      setThumbnailFile(file)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      alert('タイトルは必須です')
      return
    }

    if (!videoFile && !externalUrl.trim()) {
      alert('動画ファイルまたは外部リンク（YouTube等）を入力してください')
      return
    }

    if (!thumbnailFile) {
      alert('サムネイル画像は必須です')
      return
    }

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('ログインが必要です')
        router.push('/login')
        return
      }

      let videoUrl = null
      let thumbnailUrl = null

      // 1. 動画ファイルをStorageにアップロード
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('portfolio-videos')
          .upload(fileName, videoFile)

        if (uploadError) {
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('portfolio-videos')
          .getPublicUrl(fileName)
        
        videoUrl = publicUrl
      }

      // 2. サムネイル画像をStorageにアップロード（必須）
      if (thumbnailFile) {
        const fileExt = thumbnailFile.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}_thumb.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('portfolio-images')
          .upload(fileName, thumbnailFile)

        if (uploadError) {
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('portfolio-images')
          .getPublicUrl(fileName)
        
        thumbnailUrl = publicUrl
      }

      // 3. データベースに保存
      const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []

      const { error: dbError } = await supabase
        .from('portfolio_items')
        .insert({
          creator_id: currentUserId,
          title: title.trim(),
          description: description.trim() || null,
          category: 'video',
          tags: tagsArray,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          external_url: externalUrl.trim() || null,
          is_public: isPublic
        })

      if (dbError) {
        throw dbError
      }

      alert('動画をアップロードしました！')
      router.push('/portfolio/manage')
    } catch (error) {
      console.error('アップロードエラー:', error)
      alert('アップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Header />
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'flex-start'
      }}>
        <DashboardSidebar />

        <main style={{ 
          flex: 1, 
          padding: '40px',
          width: '100%',
          maxWidth: '100%',
          minHeight: '100vh'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* 戻るボタン */}
            <Link
              href="/portfolio/upload"
              className="text-small text-gray"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                marginBottom: '24px'
              }}
            >
              ← ジャンル選択に戻る
            </Link>

            <h1 className="page-title mb-40">
              動画をアップロード
            </h1>

            <form onSubmit={handleSubmit} className="card-no-hover p-40">
              {/* 外部リンク（推奨） */}
              <div className="mb-32">
                <label className="form-label">
                  外部リンク（推奨）
                </label>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... または https://www.nicovideo.jp/watch/..."
                  className="input-field"
                />
                <div className="text-tiny text-gray" style={{ marginTop: '8px' }}>
                  YouTube、ニコニコ動画、Vimeo等のリンクを入力（推奨）
                </div>
              </div>

              {/* 動画ファイル */}
              <div className="mb-32">
                <label className="form-label">
                  または動画ファイル
                </label>
                <div
                  onClick={() => videoInputRef.current?.click()}
                  style={{
                    border: '2px dashed #E5E5E5',
                    borderRadius: '8px',
                    padding: '32px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#FAFAFA',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                >
                  {videoFile ? (
                    <div>
                      <i className="fas fa-video" style={{ fontSize: '32px', color: '#1A1A1A', marginBottom: '12px' }}></i>
                      <div className="text-small" style={{ fontWeight: '600', color: '#1A1A1A' }}>
                        {videoFileName}
                      </div>
                      <div className="text-tiny text-gray" style={{ marginTop: '4px' }}>
                        クリックして変更
                      </div>
                    </div>
                  ) : (
                    <div>
                      <i className="fas fa-upload" style={{ fontSize: '32px', color: '#6B6B6B', marginBottom: '12px' }}></i>
                      <div className="text-small" style={{ fontWeight: '600', color: '#1A1A1A' }}>
                        動画ファイルを選択
                      </div>
                      <div className="text-tiny text-gray" style={{ marginTop: '4px' }}>
                        MP4, MOV / 最大100MB
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* サムネイル画像（必須） */}
              <div className="mb-32">
                <label className="form-label">
                  サムネイル画像 <span className="form-required">*</span>
                </label>
                <div
                  onClick={() => thumbnailInputRef.current?.click()}
                  style={{
                    width: '100%',
                    height: '300px',
                    border: '2px dashed #E5E5E5',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#FAFAFA',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="サムネイル" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <i className="fas fa-image" style={{ fontSize: '48px', color: '#6B6B6B', marginBottom: '12px' }}></i>
                      <div className="text-small" style={{ fontWeight: '600', color: '#1A1A1A' }}>
                        クリックしてサムネイルを選択
                      </div>
                      <div className="text-tiny text-gray" style={{ marginTop: '4px' }}>
                        16:9の比率を推奨
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* タイトル */}
              <div className="mb-24">
                <label className="form-label">
                  タイトル <span className="form-required">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="動画のタイトル"
                  required
                  className="input-field"
                />
              </div>

              {/* 説明 */}
              <div className="mb-24">
                <label className="form-label">説明</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="動画の説明を入力してください"
                  rows={6}
                  className="textarea-field"
                />
              </div>

              {/* タグ */}
              <div className="mb-24">
                <label className="form-label">タグ</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="タグをカンマ区切りで入力 (例: アニメーション, MV, 実写)"
                  className="input-field"
                />
              </div>

              {/* 公開設定 */}
              <div className="mb-32">
                <label 
                  className="flex gap-12" 
                  style={{
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      accentColor: '#1A1A1A'
                    }}
                  />
                  <span className="text-small">
                    この作品を公開する
                  </span>
                </label>
              </div>

              {/* ボタン */}
              <div className="flex gap-16" style={{ justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => router.push('/portfolio/upload')}
                  disabled={uploading}
                  className="btn-secondary"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-primary"
                >
                  {uploading ? 'アップロード中...' : 'アップロード'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}