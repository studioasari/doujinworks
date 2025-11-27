'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import DashboardSidebar from '../../../components/DashboardSidebar'

export default function UploadIllustrationPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [isPublic, setIsPublic] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [dragging, setDragging] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
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

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(file)
    }
  }

  function processImageFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください')
      return
    }
    
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください')
      return
    }

    setImageFile(file)
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleImageClick() {
    imageInputRef.current?.click()
  }

  function handleImageDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      processImageFile(file)
    }
  }

  function handleImageRemove(e: React.MouseEvent) {
    e.stopPropagation()
    setImageFile(null)
    setImagePreview('')
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      alert('タイトルは必須です')
      return
    }

    if (!imageFile) {
      alert('画像を選択してください')
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

      // 1. 画像をStorageにアップロード
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('portfolio-images')
        .upload(fileName, imageFile)

      if (uploadError) {
        throw uploadError
      }

      // 2. 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-images')
        .getPublicUrl(fileName)

      // 3. データベースに保存
      const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []

      const { error: dbError } = await supabase
        .from('portfolio_items')
        .insert({
          creator_id: currentUserId,
          title: title.trim(),
          description: description.trim() || null,
          category: 'illustration',
          tags: tagsArray,
          image_url: publicUrl,
          thumbnail_url: publicUrl,
          is_public: isPublic
        })

      if (dbError) {
        throw dbError
      }

      alert('イラストをアップロードしました！')
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
              イラストをアップロード
            </h1>

            <form onSubmit={handleSubmit} className="card-no-hover p-40">
              {/* 画像アップロード */}
              <div className="mb-32">
                <label className="form-label">
                  イラスト画像 <span className="form-required">*</span>
                </label>
                
                <div
                  className={`upload-area ${dragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
                  style={{ width: '100%', height: '400px' }}
                  onClick={handleImageClick}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleImageDrop}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="プレビュー" />
                  ) : (
                    <div className="upload-area-content" style={{ height: '100%' }}>
                      <div className="upload-area-icon">
                        <i className="fas fa-image"></i>
                      </div>
                      <div className="upload-area-text">
                        クリックまたはドラッグして<br />イラストをアップロード
                      </div>
                      <div className="upload-area-hint">
                        JPG, PNG, GIF / 最大5MB
                      </div>
                    </div>
                  )}
                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />

                {imagePreview && (
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    className="btn-danger btn-small"
                    style={{ marginTop: '12px' }}
                  >
                    削除
                  </button>
                )}
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
                  placeholder="イラストのタイトル"
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
                  placeholder="イラストの説明を入力してください"
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
                  placeholder="タグをカンマ区切りで入力 (例: オリジナル, ファンタジー, 女の子)"
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