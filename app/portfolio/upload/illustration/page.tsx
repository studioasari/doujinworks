'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import DashboardSidebar from '../../../components/DashboardSidebar'

// 下書きの型定義
type Draft = {
  id: string
  title: string
  description: string
  selectedTags: string[]
  visibility: 'public' | 'followers' | 'private'
  timestamp: number
}

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
  imagePreviews, 
  visibility,
  onConfirm, 
  onCancel 
}: { 
  title: string
  description: string
  tags: string[]
  imagePreviews: string[]
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
          maxWidth: '700px',
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
          <div className="form-label" style={{ marginBottom: '12px' }}>
            画像 ({imagePreviews.length}枚)
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '12px'
          }}>
            {imagePreviews.map((preview, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <img 
                  src={preview} 
                  alt={`プレビュー ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #E5E5E5'
                  }}
                />
                {index === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    padding: '4px 8px',
                    backgroundColor: '#1A1A1A',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    borderRadius: '4px'
                  }}>
                    メイン
                  </div>
                )}
              </div>
            ))}
          </div>
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

// 下書き管理モーダル
function DraftModal({ 
  drafts, 
  onLoad, 
  onDelete, 
  onClose 
}: { 
  drafts: Draft[]
  onLoad: (draft: Draft) => void
  onDelete: (draftId: string) => void
  onClose: () => void 
}) {
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
      onClick={onClose}
    >
      <div
        className="card-no-hover"
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: '32px',
          backgroundColor: '#FFFFFF'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="card-title mb-24">
          <i className="fas fa-folder-open" style={{ marginRight: '12px' }}></i>
          保存済みの下書き ({drafts.length}件)
        </h2>

        {drafts.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            保存された下書きはありません
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="card"
                style={{
                  padding: '16px',
                  cursor: 'default'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex-between mb-12">
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {draft.title || '（タイトルなし）'}
                    </div>
                    <div className="text-small text-gray">
                      {new Date(draft.timestamp).toLocaleString('ja-JP')}
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <button
                      onClick={() => onLoad(draft)}
                      className="btn-primary btn-small"
                    >
                      復元
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('この下書きを削除しますか？')) {
                          onDelete(draft.id)
                        }
                      }}
                      className="btn-danger btn-small"
                    >
                      削除
                    </button>
                  </div>
                </div>
                {draft.selectedTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {draft.selectedTags.slice(0, 5).map((tag, index) => (
                      <span key={index} className="badge badge-category" style={{ fontSize: '11px' }}>
                        {tag}
                      </span>
                    ))}
                    {draft.selectedTags.length > 5 && (
                      <span className="text-tiny text-gray">+{draft.selectedTags.length - 5}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button onClick={onClose} className="btn-secondary">
            閉じる
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
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public')
  const [uploading, setUploading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [dragging, setDragging] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  
  // ドラッグ＆ドロップ用の状態
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  // エラー状態
  const [errors, setErrors] = useState({
    title: '',
    images: ''
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
    loadDrafts()
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

  // 下書き一覧を読み込み
  function loadDrafts() {
    try {
      const saved = localStorage.getItem('illustration_drafts')
      if (saved) {
        const parsedDrafts = JSON.parse(saved)
        setDrafts(parsedDrafts)
      }
    } catch (e) {
      console.error('下書きの読み込みに失敗しました', e)
    }
  }

  // 下書き保存
  function saveDraft() {
    if (!title.trim() && selectedTags.length === 0) {
      setToast({ message: 'タイトルまたはタグを入力してから保存してください', type: 'error' })
      return
    }

    const newDraft: Draft = {
      id: Date.now().toString(),
      title,
      description,
      selectedTags,
      visibility,
      timestamp: Date.now()
    }

    const updatedDrafts = [newDraft, ...drafts]
    localStorage.setItem('illustration_drafts', JSON.stringify(updatedDrafts))
    setDrafts(updatedDrafts)
    setToast({ message: '下書きを保存しました', type: 'success' })
  }

  // 下書きを復元
  function loadDraft(draft: Draft) {
    setTitle(draft.title)
    setDescription(draft.description)
    setSelectedTags(draft.selectedTags)
    setVisibility(draft.visibility)
    setShowDraftModal(false)
    setToast({ message: '下書きを復元しました', type: 'success' })
  }

  // 下書きを削除
  function deleteDraft(draftId: string) {
    const updatedDrafts = drafts.filter(d => d.id !== draftId)
    localStorage.setItem('illustration_drafts', JSON.stringify(updatedDrafts))
    setDrafts(updatedDrafts)
    setToast({ message: '下書きを削除しました', type: 'success' })
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
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      processImageFiles(files)
    }
  }

  function processImageFiles(files: File[]) {
    // 既存の画像と合わせて10枚まで
    const totalFiles = imageFiles.length + files.length
    if (totalFiles > 10) {
      setToast({ message: '画像は最大10枚までアップロードできます', type: 'error' })
      return
    }

    // 各ファイルをチェック
    const validFiles: File[] = []
    for (const file of files) {
      // ファイルサイズチェック
      if (file.size > 5 * 1024 * 1024) {
        setToast({ message: `${file.name}: ファイルサイズは5MB以下にしてください`, type: 'error' })
        continue
      }
      
      // ファイル形式チェック
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setToast({ message: `${file.name}: 対応フォーマット: JPG, PNG, GIF, WebP`, type: 'error' })
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    // 画像ファイルを追加
    setImageFiles([...imageFiles, ...validFiles])
    setErrors(prev => ({ ...prev, images: '' }))
    
    // プレビュー生成
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  function handleImageClick() {
    imageInputRef.current?.click()
  }

  function handleImageDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processImageFiles(files)
    }
  }

  function removeImage(index: number) {
    setImageFiles(imageFiles.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  // ドラッグ開始
  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  // ドラッグ中
  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedIndex === null) return
    if (index !== draggedIndex) {
      setDragOverIndex(index)
    }
  }

  // ドラッグ終了
  function handleDragEnd() {
    if (draggedIndex === null || dragOverIndex === null) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newFiles = [...imageFiles]
    const newPreviews = [...imagePreviews]

    // 要素を移動
    const draggedFile = newFiles[draggedIndex]
    const draggedPreview = newPreviews[draggedIndex]

    newFiles.splice(draggedIndex, 1)
    newPreviews.splice(draggedIndex, 1)

    newFiles.splice(dragOverIndex, 0, draggedFile)
    newPreviews.splice(dragOverIndex, 0, draggedPreview)

    setImageFiles(newFiles)
    setImagePreviews(newPreviews)
    setDraggedIndex(null)
    setDragOverIndex(null)
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

    if (imageFiles.length === 0) {
      setErrors(prev => ({ ...prev, images: '画像を選択してください' }))
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
      const uploadedUrls: string[] = []
      
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

        // 公開URLを取得
        const { data: { publicUrl } } = supabase.storage
          .from('portfolio-images')
          .getPublicUrl(fileName)

        uploadedUrls.push(publicUrl)
      }

      // 2. データベースに保存
      const { error: dbError } = await supabase
        .from('portfolio_items')
        .insert({
          creator_id: currentUserId,
          title: title.trim(),
          description: description.trim() || null,
          category: 'illustration',
          tags: selectedTags,
          image_url: uploadedUrls[0], // メイン画像（1枚目）
          thumbnail_url: uploadedUrls[0],
          image_urls: uploadedUrls.length > 1 ? uploadedUrls : null, // 複数枚の場合のみ
          is_public: visibility === 'public'
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

            {/* タイトル */}
            <div className="flex-between mb-40">
              <h1 className="page-title">
                イラストをアップロード
              </h1>
              <div className="flex gap-12">
                <button
                  type="button"
                  onClick={() => setShowDraftModal(true)}
                  className="btn-secondary btn-small"
                >
                  <i className="fas fa-folder-open" style={{ marginRight: '8px' }}></i>
                  下書き ({drafts.length})
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  className="btn-secondary btn-small"
                >
                  <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                  下書き保存
                </button>
              </div>
            </div>

            <form onSubmit={handlePreSubmit} className="card-no-hover p-40">
              {/* 画像アップロード */}
              <div className="mb-32">
                <label className="form-label mb-12">
                  イラスト画像 <span className="form-required">*</span>
                  <span style={{ 
                    marginLeft: '12px', 
                    fontSize: '12px', 
                    color: '#6B6B6B',
                    fontWeight: 'normal'
                  }}>
                    {imageFiles.length}/10枚（ドラッグして並び替え）
                  </span>
                </label>

                {/* アップロード済み画像 */}
                {imageFiles.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        style={{
                          position: 'relative',
                          cursor: 'grab',
                          opacity: draggedIndex === index ? 0.5 : 1,
                          border: dragOverIndex === index ? '3px solid #1A1A1A' : '2px solid #E5E5E5',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease',
                          overflow: 'hidden'
                        }}
                      >
                        <img
                          src={preview}
                          alt={`プレビュー ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '150px',
                            objectFit: 'cover',
                            pointerEvents: 'none'
                          }}
                        />

                        {/* メインバッジ */}
                        {index === 0 && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            padding: '4px 8px',
                            backgroundColor: '#1A1A1A',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            borderRadius: '4px'
                          }}>
                            メイン
                          </div>
                        )}

                        {/* 削除ボタン（右上の角） */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeImage(index)
                          }}
                          style={{
                            position: 'absolute',
                            top: '0',
                            right: '0',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FFFFFF',
                            color: '#1A1A1A',
                            border: '1px solid #E5E5E5',
                            borderRadius: '0 8px 0 4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* アップロードエリア */}
                {imageFiles.length < 10 && (
                  <div
                    className={`upload-area ${dragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
                    style={{ width: '100%', height: '200px' }}
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
                        クリックまたはドラッグして<br />画像を追加
                      </div>
                      <div className="upload-area-hint">
                        JPG, PNG, GIF, WebP / 最大5MB / 最大10枚
                      </div>
                    </div>
                  </div>
                )}

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  multiple
                  style={{ display: 'none' }}
                />

                {errors.images && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '14px',
                    color: '#F44336'
                  }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                    {errors.images}
                  </div>
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
                  disabled={uploading || !!errors.title || !!errors.images}
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
          imagePreviews={imagePreviews}
          visibility={visibility}
          onConfirm={handleConfirmedSubmit}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {/* 下書き管理モーダル */}
      {showDraftModal && (
        <DraftModal
          drafts={drafts}
          onLoad={loadDraft}
          onDelete={deleteDraft}
          onClose={() => setShowDraftModal(false)}
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