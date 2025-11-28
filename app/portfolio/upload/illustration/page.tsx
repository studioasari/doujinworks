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

// 確認モーダルコンポーネント
function ConfirmModal({ 
  title, 
  description, 
  tags, 
  imagePreview, 
  visibility,
  onConfirm, 
  onCancel 
}: { 
  title: string
  description: string
  tags: string[]
  imagePreview: string
  visibility: string
  onConfirm: () => void
  onCancel: () => void 
}) {
  const visibilityLabels = {
    public: '全体公開',
    followers: 'フォロワーのみ',
    private: '非公開（自分のみ）'
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
        padding: '20px'
      }}
      onClick={onCancel}
    >
      <div
        className="card-no-hover"
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '32px',
          backgroundColor: '#FFFFFF'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="card-title mb-24">
          <i className="fas fa-check-circle" style={{ marginRight: '12px', color: '#4CAF50' }}></i>
          アップロード内容の確認
        </h2>

        {/* 画像プレビュー */}
        <div style={{ marginBottom: '24px' }}>
          <img 
            src={imagePreview} 
            alt="プレビュー" 
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '300px',
              objectFit: 'contain',
              borderRadius: '8px',
              border: '1px solid #E5E5E5'
            }}
          />
        </div>

        {/* タイトル */}
        <div className="mb-16">
          <div className="form-label" style={{ marginBottom: '8px' }}>タイトル</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{title}</div>
        </div>

        {/* 説明 */}
        {description && (
          <div className="mb-16">
            <div className="form-label" style={{ marginBottom: '8px' }}>説明</div>
            <div className="text-small" style={{ whiteSpace: 'pre-wrap' }}>{description}</div>
          </div>
        )}

        {/* タグ */}
        {tags.length > 0 && (
          <div className="mb-16">
            <div className="form-label" style={{ marginBottom: '8px' }}>タグ</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tags.map((tag, index) => (
                <span key={index} className="badge badge-category">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 公開範囲 */}
        <div className="mb-32">
          <div className="form-label" style={{ marginBottom: '8px' }}>公開範囲</div>
          <div style={{ fontSize: '14px', color: '#1A1A1A' }}>
            {visibilityLabels[visibility as keyof typeof visibilityLabels]}
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-16" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            修正する
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary"
          >
            確定してアップロード
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UploadIllustrationPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public')
  const [uploading, setUploading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [dragging, setDragging] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  
  // エラー状態
  const [errors, setErrors] = useState({
    title: '',
    image: ''
  })

  // トースト状態
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // プリセットタグ
  const presetTags = [
    'オリジナル', 'ファンアート', 'ファンタジー', '現代', 'SF',
    '女の子', '男の子', '風景', '動物', '静物',
    'モノクロ', 'カラー', '線画', '厚塗り', '水彩',
    'キャラクター', '背景', 'ポートレート', '全身', 'バストアップ'
  ]

  useEffect(() => {
    checkAuth()
    loadDraft()
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

  // 下書き保存
  function saveDraft() {
    const draft = {
      title,
      description,
      selectedTags,
      visibility,
      timestamp: Date.now()
    }
    localStorage.setItem('illustration_draft', JSON.stringify(draft))
    setToast({ message: '下書きを保存しました', type: 'success' })
  }

  // 下書き読み込み
  function loadDraft() {
    const saved = localStorage.getItem('illustration_draft')
    if (saved) {
      try {
        const draft = JSON.parse(saved)
        // 24時間以内の下書きのみ復元
        if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
          setTitle(draft.title || '')
          setDescription(draft.description || '')
          setSelectedTags(draft.selectedTags || [])
          setVisibility(draft.visibility || 'public')
        } else {
          localStorage.removeItem('illustration_draft')
        }
      } catch (e) {
        console.error('下書きの読み込みに失敗しました', e)
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

  // プリセットタグの追加/削除
  function togglePresetTag(tag: string) {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      if (selectedTags.length >= 10) {
        setToast({ message: 'タグは10個まで追加できます', type: 'error' })
        return
      }
      setSelectedTags([...selectedTags, tag])
    }
  }

  // カスタムタグの追加
  function addCustomTag() {
    const trimmedTag = customTag.trim()
    if (!trimmedTag) return

    if (selectedTags.includes(trimmedTag)) {
      setToast({ message: 'すでに追加されているタグです', type: 'error' })
      return
    }

    if (selectedTags.length >= 10) {
      setToast({ message: 'タグは10個まで追加できます', type: 'error' })
      return
    }

    setSelectedTags([...selectedTags, trimmedTag])
    setCustomTag('')
  }

  // タグの削除
  function removeTag(tag: string) {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  // フォーム送信前の確認
  function handlePreSubmit(e: React.FormEvent) {
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

    // 確認モーダルを表示
    setShowConfirmModal(true)
  }

  // 実際のアップロード処理
  async function handleConfirmedSubmit() {
    setShowConfirmModal(false)
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setToast({ message: 'ログインが必要です', type: 'error' })
        router.push('/login')
        return
      }

      // 1. 画像をStorageにアップロード
      const fileExt = imageFile!.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('portfolio-images')
        .upload(fileName, imageFile!)

      if (uploadError) {
        throw uploadError
      }

      // 2. 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-images')
        .getPublicUrl(fileName)

      // 3. データベースに保存
      const { error: dbError } = await supabase
        .from('portfolio_items')
        .insert({
          creator_id: currentUserId,
          title: title.trim(),
          description: description.trim() || null,
          category: 'illustration',
          tags: selectedTags,
          image_url: publicUrl,
          thumbnail_url: publicUrl,
          is_public: visibility === 'public' // 一旦is_publicで保存
        })

      if (dbError) {
        throw dbError
      }

      // 下書きを削除
      localStorage.removeItem('illustration_draft')

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

            {/* タイトル */}
            <div className="flex-between mb-40">
              <h1 className="page-title">
                イラストをアップロード
              </h1>
              <button
                type="button"
                onClick={saveDraft}
                className="btn-secondary btn-small"
              >
                <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                下書き保存
              </button>
            </div>

            <form onSubmit={handlePreSubmit} className="card-no-hover p-40">
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

              {/* タグ（プリセット） */}
              <div className="mb-24">
                <label className="form-label">
                  プリセットタグ
                  <span style={{ 
                    marginLeft: '12px', 
                    fontSize: '12px', 
                    color: '#6B6B6B',
                    fontWeight: 'normal'
                  }}>
                    クリックで追加/削除（最大10個）
                  </span>
                </label>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px',
                  padding: '16px',
                  backgroundColor: '#FAFAFA',
                  borderRadius: '8px'
                }}>
                  {presetTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => togglePresetTag(tag)}
                      className="filter-button"
                      style={{
                        backgroundColor: selectedTags.includes(tag) ? '#1A1A1A' : '#FFFFFF',
                        color: selectedTags.includes(tag) ? '#FFFFFF' : '#1A1A1A',
                        borderColor: selectedTags.includes(tag) ? '#1A1A1A' : '#E5E5E5'
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* カスタムタグ */}
              <div className="mb-24">
                <label className="form-label">カスタムタグを追加</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomTag()
                      }
                    }}
                    placeholder="タグを入力してEnterまたは追加ボタン"
                    className="input-field"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={addCustomTag}
                    className="btn-secondary"
                    disabled={!customTag.trim() || selectedTags.length >= 10}
                  >
                    追加
                  </button>
                </div>
              </div>

              {/* 選択されたタグ */}
              {selectedTags.length > 0 && (
                <div className="mb-32">
                  <label className="form-label">選択中のタグ ({selectedTags.length}/10)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedTags.map((tag, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 12px',
                          backgroundColor: '#1A1A1A',
                          color: '#FFFFFF',
                          borderRadius: '16px',
                          fontSize: '14px'
                        }}
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 公開範囲設定 */}
              <div className="mb-32">
                <label className="form-label mb-12">
                  公開範囲 <span className="form-required">*</span>
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label className="radio-card" style={{ borderColor: visibility === 'public' ? '#1A1A1A' : '#E5E5E5' }}>
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={visibility === 'public'}
                      onChange={(e) => setVisibility(e.target.value as 'public')}
                    />
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        <i className="fas fa-globe" style={{ marginRight: '8px' }}></i>
                        全体公開
                      </div>
                      <div className="text-small text-gray">
                        誰でも閲覧できます
                      </div>
                    </div>
                  </label>

                  <label className="radio-card" style={{ borderColor: visibility === 'followers' ? '#1A1A1A' : '#E5E5E5' }}>
                    <input
                      type="radio"
                      name="visibility"
                      value="followers"
                      checked={visibility === 'followers'}
                      onChange={(e) => setVisibility(e.target.value as 'followers')}
                    />
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        <i className="fas fa-users" style={{ marginRight: '8px' }}></i>
                        フォロワーのみ
                      </div>
                      <div className="text-small text-gray">
                        あなたをフォローしているユーザーのみ閲覧できます
                      </div>
                    </div>
                  </label>

                  <label className="radio-card" style={{ borderColor: visibility === 'private' ? '#1A1A1A' : '#E5E5E5' }}>
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={visibility === 'private'}
                      onChange={(e) => setVisibility(e.target.value as 'private')}
                    />
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        <i className="fas fa-lock" style={{ marginRight: '8px' }}></i>
                        非公開（自分のみ）
                      </div>
                      <div className="text-small text-gray">
                        あなただけが閲覧できます
                      </div>
                    </div>
                  </label>
                </div>
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
                  {uploading ? 'アップロード中...' : '確認画面へ'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
      <Footer />

      {/* 確認モーダル */}
      {showConfirmModal && (
        <ConfirmModal
          title={title}
          description={description}
          tags={selectedTags}
          imagePreview={imagePreview}
          visibility={visibility}
          onConfirm={handleConfirmedSubmit}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

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