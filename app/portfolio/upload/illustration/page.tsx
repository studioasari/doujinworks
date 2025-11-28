'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import DashboardSidebar from '../../../components/DashboardSidebar'

// トーストメッセージコンポーネント
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '16px 24px',
        borderRadius: '8px',
        backgroundColor: type === 'success' ? '#4CAF50' : '#F44336',
        color: '#FFFFFF',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 9999,
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <i className={type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'}></i>
        <span>{message}</span>
      </div>
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

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
  
  // エラー状態
  const [errors, setErrors] = useState({
    title: '',
    image: ''
  })

  // トースト状態
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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
        setToast({ message: 'プロフィールが見つかりません', type: 'error' })
        router.push('/profile')
      }
    }
  }

  // タイトルのリアルタイムバリデーション
  useEffect(() => {
    if (title.length > 50) {
      setErrors(prev => ({ ...prev, title: 'タイトルは50文字以内にしてください' }))
    } else if (title.length > 0 && title.trim().length === 0) {
      setErrors(prev => ({ ...prev, title: 'タイトルは空白のみにはできません' }))
    } else {
      setErrors(prev => ({ ...prev, title: '' }))
    }
  }, [title])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(file)
    }
  }

  function processImageFile(file: File) {
    // ファイルサイズチェック
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'ファイルサイズは5MB以下にしてください' }))
      setToast({ message: 'ファイルサイズは5MB以下にしてください', type: 'error' })
      return
    }
    
    // ファイル形式チェック（厳格化）
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, image: '対応フォーマット: JPG, PNG, GIF, WebP' }))
      setToast({ message: '対応フォーマット: JPG, PNG, GIF, WebP', type: 'error' })
      return
    }

    setImageFile(file)
    setErrors(prev => ({ ...prev, image: '' }))
    
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
    setErrors(prev => ({ ...prev, image: '' }))
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // バリデーション
    if (!title.trim()) {
      setErrors(prev => ({ ...prev, title: 'タイトルは必須です' }))
      setToast({ message: 'タイトルを入力してください', type: 'error' })
      return
    }

    if (title.length > 50) {
      setToast({ message: 'タイトルは50文字以内にしてください', type: 'error' })
      return
    }

    if (!imageFile) {
      setErrors(prev => ({ ...prev, image: '画像を選択してください' }))
      setToast({ message: '画像を選択してください', type: 'error' })
      return
    }

    if (description.length > 1000) {
      setToast({ message: '説明は1000文字以内にしてください', type: 'error' })
      return
    }

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setToast({ message: 'ログインが必要です', type: 'error' })
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
      const tagsArray = tags 
        ? tags.split(/[,、]/).map(tag => tag.trim()).filter(tag => tag) 
        : []

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

      setToast({ message: 'イラストをアップロードしました！', type: 'success' })
      
      // 少し待ってから遷移（トーストを見せるため）
      setTimeout(() => {
        router.push('/portfolio/manage')
      }, 1500)
    } catch (error) {
      console.error('アップロードエラー:', error)
      setToast({ message: 'アップロードに失敗しました', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  if (!currentUserId) {
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
                        JPG, PNG, GIF, WebP / 最大5MB
                      </div>
                    </div>
                  )}
                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />

                {errors.image && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '14px',
                    color: '#F44336'
                  }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                    {errors.image}
                  </div>
                )}

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
                  <span style={{ 
                    marginLeft: '12px', 
                    fontSize: '12px', 
                    color: title.length > 50 ? '#F44336' : '#6B6B6B',
                    fontWeight: 'normal'
                  }}>
                    {title.length} / 50
                  </span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="イラストのタイトル"
                  maxLength={50}
                  className="input-field"
                  style={{
                    borderColor: errors.title ? '#F44336' : undefined
                  }}
                />
                {errors.title && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '14px',
                    color: '#F44336'
                  }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                    {errors.title}
                  </div>
                )}
              </div>

              {/* 説明 */}
              <div className="mb-24">
                <label className="form-label">
                  説明
                  <span style={{ 
                    marginLeft: '12px', 
                    fontSize: '12px', 
                    color: description.length > 1000 ? '#F44336' : '#6B6B6B',
                    fontWeight: 'normal'
                  }}>
                    {description.length} / 1000
                  </span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="イラストの説明を入力してください"
                  rows={6}
                  maxLength={1000}
                  className="textarea-field"
                  style={{
                    borderColor: description.length > 1000 ? '#F44336' : undefined
                  }}
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
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#6B6B6B'
                }}>
                  カンマ（,）または読点（、）で区切ってください
                </div>
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
                  disabled={uploading || !!errors.title || !!errors.image}
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

      {/* トーストメッセージ */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}