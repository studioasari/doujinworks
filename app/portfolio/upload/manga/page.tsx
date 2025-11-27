'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import DashboardSidebar from '../../../components/DashboardSidebar'

export default function UploadMangaPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
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
    const files = Array.from(e.target.files || [])
    processImageFiles(files)
  }

  function processImageFiles(files: File[]) {
    const validFiles: File[] = []
    const previews: string[] = []

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} は5MBを超えています`)
        continue
      }
      
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} は画像ファイルではありません`)
        continue
      }

      validFiles.push(file)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        previews.push(reader.result as string)
        if (previews.length === validFiles.length) {
          setImagePreviews([...imagePreviews, ...previews])
        }
      }
      reader.readAsDataURL(file)
    }

    setImageFiles([...imageFiles, ...validFiles])
  }

  function handleImageClick() {
    imageInputRef.current?.click()
  }

  function handleImageDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    processImageFiles(files)
  }

  function handleImageRemove(index: number) {
    const newFiles = imageFiles.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setImageFiles(newFiles)
    setImagePreviews(newPreviews)
  }

  function moveImage(index: number, direction: 'up' | 'down') {
    const newFiles = [...imageFiles]
    const newPreviews = [...imagePreviews]
    
    if (direction === 'up' && index > 0) {
      [newFiles[index], newFiles[index - 1]] = [newFiles[index - 1], newFiles[index]]
      ;[newPreviews[index], newPreviews[index - 1]] = [newPreviews[index - 1], newPreviews[index]]
    } else if (direction === 'down' && index < imageFiles.length - 1) {
      [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]]
      ;[newPreviews[index], newPreviews[index + 1]] = [newPreviews[index + 1], newPreviews[index]]
    }
    
    setImageFiles(newFiles)
    setImagePreviews(newPreviews)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      alert('タイトルは必須です')
      return
    }

    if (imageFiles.length === 0) {
      alert('最低1ページの画像を選択してください')
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

      // 1. 全ての画像をStorageにアップロード
      const imageUrls: string[] = []
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('portfolio-images')
          .upload(fileName, file)

        if (uploadError) {
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('portfolio-images')
          .getPublicUrl(fileName)
        
        imageUrls.push(publicUrl)
      }

      // 2. データベースに保存
      const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []

      const { error: dbError } = await supabase
        .from('portfolio_items')
        .insert({
          creator_id: currentUserId,
          title: title.trim(),
          description: description.trim() || null,
          category: 'manga',
          tags: tagsArray,
          image_url: imageUrls[0], // 1ページ目をサムネイルに
          thumbnail_url: imageUrls[0],
          image_urls: imageUrls, // 全ページ
          page_count: imageUrls.length,
          is_public: isPublic
        })

      if (dbError) {
        throw dbError
      }

      alert('マンガをアップロードしました！')
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
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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
              マンガをアップロード
            </h1>

            <form onSubmit={handleSubmit} className="card-no-hover p-40">
              {/* 画像アップロード */}
              <div className="mb-32">
                <label className="form-label">
                  マンガ画像（複数ページ） <span className="form-required">*</span>
                </label>
                
                <div
                  className={`upload-area ${dragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
                  style={{ width: '100%', height: '200px', cursor: 'pointer' }}
                  onClick={handleImageClick}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleImageDrop}
                >
                  <div className="upload-area-content" style={{ height: '100%' }}>
                    <div className="upload-area-icon">
                      <i className="fas fa-images"></i>
                    </div>
                    <div className="upload-area-text">
                      クリックまたはドラッグして<br />マンガのページをアップロード
                    </div>
                    <div className="upload-area-hint">
                      JPG, PNG / 1枚あたり最大5MB / 複数選択可
                    </div>
                  </div>
                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />

                {/* プレビュー */}
                {imagePreviews.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <div className="text-small text-gray mb-12">
                      {imagePreviews.length}ページ
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: '16px'
                    }}>
                      {imagePreviews.map((preview, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                          <img
                            src={preview}
                            alt={`ページ ${index + 1}`}
                            style={{
                              width: '100%',
                              aspectRatio: '3/4',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid #E5E5E5'
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: '#FFFFFF',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {index + 1}
                          </div>
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            display: 'flex',
                            gap: '4px'
                          }}>
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => moveImage(index, 'up')}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  backgroundColor: 'rgba(0,0,0,0.7)',
                                  color: '#FFFFFF',
                                  cursor: 'pointer',
                                  fontSize: '14px'
                                }}
                              >
                                ↑
                              </button>
                            )}
                            {index < imagePreviews.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveImage(index, 'down')}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  backgroundColor: 'rgba(0,0,0,0.7)',
                                  color: '#FFFFFF',
                                  cursor: 'pointer',
                                  fontSize: '14px'
                                }}
                              >
                                ↓
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleImageRemove(index)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#F44336',
                                color: '#FFFFFF',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
                  placeholder="マンガのタイトル"
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
                  placeholder="マンガの説明を入力してください"
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
                  placeholder="タグをカンマ区切りで入力 (例: オリジナル, コメディ, 短編)"
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