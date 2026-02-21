'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getUploadUrl, uploadToR2 } from '@/lib/r2-upload'
import { LoadingSpinner } from '@/app/components/Skeleton'
import { useDraft } from '@/app/hooks/useDraft'
import type { Draft } from '@/app/hooks/useDraft'
import DraftModal from '@/app/components/DraftModal'
import styles from './page.module.css'

// 画像圧縮関数
async function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob failed'))
              return
            }
            
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })

            if (compressedFile.size > file.size) {
              resolve(file)
            } else {
              resolve(compressedFile)
            }
          },
          file.type,
          quality
        )
      }
      img.onerror = () => reject(new Error('Image load failed'))
    }
    reader.onerror = () => reject(new Error('File read failed'))
  })
}

// 下書き復元用コンポーネント
function DraftRestorer({ onRestore }: { onRestore: (draftId: string) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const draftId = searchParams.get('draft')
    if (draftId) {
      onRestore(draftId)
    }
  }, [searchParams, onRestore])

  return null
}

// メインコンポーネント
function UploadIllustrationContent() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [activePreviewIndex, setActivePreviewIndex] = useState(0)
  const [rating, setRating] = useState<'general' | 'r18' | 'r18g'>('general')
  const [isOriginal, setIsOriginal] = useState(false)
  const [allowComments, setAllowComments] = useState(true)
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [accountType, setAccountType] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  const [errors, setErrors] = useState({
    title: '',
    images: '',
    terms: ''
  })

  const imageInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // 下書きフック
  const formData = {
    title,
    description,
    tags: selectedTags,
    rating,
    is_original: isOriginal,
    allow_comments: allowComments,
    is_public: visibility === 'public'
  }
  const { drafts, currentDraftId, saving, adoptDraftId, deleteDraft, getCategoryUrl, publishDraft } = useDraft('illustration', formData, currentUserId, imageFiles)

  const presetTags = [
    'オリジナル', 'ファンアート', 'ファンタジー', '現代', 'SF',
    '女の子', '男の子', '風景', '動物', '静物',
    'モノクロ', 'カラー', '線画', '厚塗り', '水彩',
    'キャラクター', '背景', 'ポートレート', '全身', 'バストアップ'
  ]

  useEffect(() => {
    checkAuth()
  }, [])

  // 離脱防止（入力がある場合）
  useEffect(() => {
    const hasInput = title.trim() || description.trim() || selectedTags.length > 0 || imageFiles.length > 0
    if (!hasInput) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [title, description, selectedTags, imageFiles])

  // モーダル表示時のスクロール禁止（position: fixedで確実に防ぐ）
  useEffect(() => {
    if (showConfirmModal) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
    } else {
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY) * -1)
      }
    }
    return () => {
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY) * -1)
      }
    }
  }, [showConfirmModal])

  async function restoreDraft(draftId: string) {
    try {
      const res = await fetch('/api/drafts')
      if (!res.ok) return
      const data = await res.json()
      const draft = (data.drafts || []).find((d: Draft) => d.id === draftId)
      if (draft) {
        handleLoadDraft(draft)
      }
    } catch (error) {
      console.error('下書き復元エラー:', error)
    }
  }

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, account_type')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        setCurrentUserId(user.id)
        setAccountType(profile.account_type)
        setLoading(false)
      } else {
        router.push('/profile')
      }
    }
  }

  // 下書き復元（自カテゴリ）
  function handleLoadDraft(draft: Draft) {
    setTitle(draft.title || '')
    setDescription(draft.description || '')
    setSelectedTags(draft.tags || [])
    setRating(draft.rating || 'general')
    setIsOriginal(draft.is_original ?? false)
    setAllowComments(draft.allow_comments ?? true)
    setVisibility(draft.is_public ? 'public' : 'private')
    adoptDraftId(draft.id)

    // 画像URLがある場合はプレビューに復元
    if (draft.image_urls && draft.image_urls.length > 0) {
      setImagePreviews(draft.image_urls)
      setActivePreviewIndex(0)
      // 注意: Fileオブジェクトは復元できないので、投稿時はpublishDraftを使う
    }
  }

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

  async function processImageFiles(files: File[]) {
    const totalFiles = imageFiles.length + files.length
    if (totalFiles > 100) {
      return
    }

    setCompressing(true)
    const validFiles: File[] = []
    const newPreviews: string[] = []

    try {
      for (const file of files) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
        if (!allowedTypes.includes(file.type)) {
          continue
        }

        let processedFile = file
        try {
          if (file.type !== 'image/gif') {
            processedFile = await compressImage(file, 1920, 0.8)
          }
        } catch (compressError) {
          console.error('圧縮エラー:', compressError)
          continue
        }

        if (processedFile.size > 32 * 1024 * 1024) {
          continue
        }

        validFiles.push(processedFile)

        const reader = new FileReader()
        reader.onloadend = () => {
          newPreviews.push(reader.result as string)
          if (newPreviews.length === validFiles.length) {
            setImagePreviews([...imagePreviews, ...newPreviews])
          }
        }
        reader.readAsDataURL(processedFile)
      }

      if (validFiles.length === 0) return

      const currentTotalSize = imageFiles.reduce((sum, file) => sum + file.size, 0)
      const newFilesSize = validFiles.reduce((sum, file) => sum + file.size, 0)
      const totalSize = currentTotalSize + newFilesSize
      
      if (totalSize > 200 * 1024 * 1024) {
        return
      }

      setImageFiles([...imageFiles, ...validFiles])
      setErrors(prev => ({ ...prev, images: '' }))

    } finally {
      setCompressing(false)
    }
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
    if (activePreviewIndex >= imagePreviews.length - 1) {
      setActivePreviewIndex(Math.max(0, imagePreviews.length - 2))
    }
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    // ドラッグ中のゴーストを半透明に
    const el = e.currentTarget as HTMLElement
    setTimeout(() => el.style.opacity = '0.4', 0)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedIndex === null || index === draggedIndex) return

    // リアルタイムで並び替え
    const newFiles = [...imageFiles]
    const newPreviews = [...imagePreviews]

    const [movedFile] = newFiles.splice(draggedIndex, 1)
    const [movedPreview] = newPreviews.splice(draggedIndex, 1)

    newFiles.splice(index, 0, movedFile)
    newPreviews.splice(index, 0, movedPreview)

    setImageFiles(newFiles)
    setImagePreviews(newPreviews)

    // activePreviewIndexも追従
    if (activePreviewIndex === draggedIndex) {
      setActivePreviewIndex(index)
    } else if (draggedIndex < activePreviewIndex && index >= activePreviewIndex) {
      setActivePreviewIndex(activePreviewIndex - 1)
    } else if (draggedIndex > activePreviewIndex && index <= activePreviewIndex) {
      setActivePreviewIndex(activePreviewIndex + 1)
    }

    setDraggedIndex(index)
  }

  function handleDragEnd(e: React.DragEvent) {
    const el = e.currentTarget as HTMLElement
    el.style.opacity = ''
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  function togglePresetTag(tag: string) {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      if (selectedTags.length >= 10) {
        return
      }
      setSelectedTags([...selectedTags, tag])
    }
  }

  function addCustomTag() {
    const trimmedTag = customTag.trim()
    if (!trimmedTag) return

    if (selectedTags.includes(trimmedTag)) {
      return
    }

    if (selectedTags.length >= 10) {
      return
    }

    setSelectedTags([...selectedTags, trimmedTag])
    setCustomTag('')
  }

  function removeTag(tag: string) {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  function handlePreSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      setErrors(prev => ({ ...prev, title: 'タイトルは必須です' }))
      return
    }

    if (title.length > 50) {
      return
    }

    if (imageFiles.length === 0) {
      setErrors(prev => ({ ...prev, images: '画像を選択してください' }))
      return
    }

    if (selectedTags.length === 0) {
      return
    }

    if (description.length > 1000) {
      return
    }

    if (!agreedToTerms) {
      setErrors(prev => ({ ...prev, terms: '利用規約に同意してください' }))
      return
    }

    setShowConfirmModal(true)
  }

  const isFormValid = 
    title.trim().length > 0 && 
    title.length <= 50 &&
    imageFiles.length > 0 && 
    selectedTags.length > 0 && 
    agreedToTerms &&
    !errors.title &&
    !errors.images &&
    !uploading &&
    !compressing

  async function handleConfirmedSubmit() {
    setShowConfirmModal(false)
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      let finalUrls: string[] = []

      if (currentDraftId && imageFiles.length === 0) {
        // 下書きから投稿（画像はR2にある→本番パスにコピー）
        finalUrls = await publishDraft(currentDraftId)
      } else {
        // 新規アップロード or 下書きから画像を差し替えた場合
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i]
          try {
            const { uploadUrl, fileUrl } = await getUploadUrl(
              'illustration',
              'image',
              file.name,
              file.type,
              user.id
            )
            await uploadToR2(file, uploadUrl)
            finalUrls.push(fileUrl)
          } catch (uploadError) {
            console.error(`${i + 1}枚目エラー:`, uploadError)
            throw new Error(`${i + 1}枚目の画像アップロードに失敗しました`)
          }
        }

        // 下書きがあれば削除
        if (currentDraftId) {
          try {
            await fetch(`/api/drafts/${currentDraftId}`, { method: 'DELETE' })
          } catch (e) {
            console.error('下書き削除エラー:', e)
          }
        }
      }

      const { error: dbError } = await supabase
        .from('portfolio_items')
        .insert({
          creator_id: currentUserId,
          title: title.trim(),
          description: description.trim() || null,
          category: 'illustration',
          rating: rating,
          is_original: isOriginal,
          allow_comments: allowComments,
          tags: selectedTags,
          image_url: finalUrls[0],
          thumbnail_url: finalUrls[0],
          image_urls: finalUrls.length > 1 ? finalUrls : null,
          is_public: visibility === 'public'
        })

      if (dbError) {
        throw dbError
      }

      setTimeout(() => {
        router.push('/dashboard/portfolio')
      }, 1500)
    } catch (error) {
      console.error('アップロードエラー:', error)
    } finally {
      setUploading(false)
    }
  }

  const visibilityLabels: { [key: string]: string } = {
    public: '全体公開',
    private: '非公開（自分のみ）'
  }

  const ratingLabels: { [key: string]: string } = {
    general: '全年齢',
    r18: 'R-18',
    r18g: 'R-18G'
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <>
      <Suspense fallback={null}>
        <DraftRestorer onRestore={restoreDraft} />
      </Suspense>

      <div className={styles.container}>
        <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>イラストをアップロード</h1>

        {/* 圧縮中 */}
        {compressing && (
          <div className="alert alert-info" style={{ marginBottom: 'var(--space-6)' }}>
            <i className="fa-solid fa-spinner fa-spin alert-icon"></i>
            <span>画像を圧縮しています...</span>
          </div>
        )}

        <form onSubmit={handlePreSubmit}>
          <div className={styles.layout}>
            {/* ====== 左カラム: 画像 ====== */}
            <div className={styles.imageColumn}>
              {imageFiles.length === 0 ? (
                <>
                  <div
                    className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
                    onClick={handleImageClick}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleImageDrop}
                  >
                    <div className={styles.dropzoneIcon}>
                      <i className="fa-solid fa-images"></i>
                    </div>
                    <p className={styles.dropzoneText}>クリックまたはドラッグして画像を追加</p>
                    <p className={styles.dropzoneHint}>JPEG / PNG / GIF • 最大100枚（合計200MB以内）</p>
                  </div>

                  <div className={styles.thumbStrip}>
                    <button
                      type="button"
                      className={styles.thumbAdd}
                      onClick={handleImageClick}
                    >
                      <i className="fa-solid fa-plus"></i>
                      <span>追加</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* メインプレビュー */}
                  <div className={styles.mainPreview}>
                    <img src={imagePreviews[activePreviewIndex]} alt={`プレビュー ${activePreviewIndex + 1}`} />
                    <button
                      type="button"
                      className={styles.mainRemove}
                      onClick={() => removeImage(activePreviewIndex)}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                    {activePreviewIndex === 0 && (
                      <span className={styles.mainBadge}>メイン</span>
                    )}
                    <span className={styles.imageCounter}>
                      <i className="fa-solid fa-images"></i> {imageFiles.length}枚
                    </span>
                  </div>

                  {/* サムネイルストリップ */}
                  <div className={styles.thumbStrip}>
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`${styles.thumbItem} ${activePreviewIndex === index ? styles.active : ''} ${draggedIndex === index ? styles.dragging : ''}`}
                        onClick={() => setActivePreviewIndex(index)}
                      >
                        <img src={preview} alt={`サムネ ${index + 1}`} />
                        {index === 0 && (
                          <span className={styles.thumbMainLabel}>メイン</span>
                        )}
                        <button
                          type="button"
                          className={styles.thumbRemove}
                          onClick={(e) => { e.stopPropagation(); removeImage(index) }}
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    ))}
                    {imageFiles.length < 100 && (
                      <button
                        type="button"
                        className={styles.thumbAdd}
                        onClick={handleImageClick}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleImageDrop}
                      >
                        <i className="fa-solid fa-plus"></i>
                        <span>追加</span>
                      </button>
                    )}
                  </div>

                  <p className={styles.imageHint}>ドラッグで並び替え • JPEG / PNG / GIF • 最大100枚</p>
                </>
              )}

              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={handleImageChange}
                multiple
                style={{ display: 'none' }}
              />

              {errors.images && (
                <p className="form-error">
                  <i className="fa-solid fa-circle-exclamation"></i> {errors.images}
                </p>
              )}
            </div>

            {/* ====== 右カラム: フォーム ====== */}
            <div className={styles.formColumn}>
              {/* 作品情報カード */}
              <div className={styles.formCard}>
                <div className={styles.cardHeading}>
                  <span className={styles.cardHeadingIcon}>
                    <i className="fa-solid fa-pen-nib"></i>
                  </span>
                  作品情報
                </div>

                <div className={styles.field}>
                  <label className="form-label">
                    タイトル <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="イラストのタイトル"
                    maxLength={50}
                    className={`form-input ${errors.title ? 'error' : ''}`}
                    style={{ maxWidth: '100%', background: 'var(--bg-base)' }}
                  />
                  <span className={styles.charCount}>{title.length} / 50</span>
                  {errors.title && (
                    <p className="form-error">
                      <i className="fa-solid fa-circle-exclamation"></i> {errors.title}
                    </p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className="form-label">説明</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="イラストの説明を入力してください"
                    rows={4}
                    maxLength={1000}
                    className="form-input"
                    style={{ maxWidth: '100%', resize: 'vertical', background: 'var(--bg-base)' }}
                  />
                  <span className={styles.charCount}>{description.length} / 1000</span>
                </div>
              </div>

              {/* タグカード */}
              <div className={styles.formCard}>
                <div className={styles.cardHeading}>
                  <span className={styles.cardHeadingIcon}>
                    <i className="fa-solid fa-tags"></i>
                  </span>
                  タグ
                </div>

                <div className={styles.field}>
                  <div className={styles.fieldRow}>
                    <label className="form-label">
                      タグを追加 <span className={styles.required}>*</span>
                    </label>
                    <span className={styles.hint}>{selectedTags.length} / 10</span>
                  </div>
                  <div className={styles.tagsInput}>
                    {selectedTags.map((tag, index) => (
                      <div key={index} className={styles.tagItem}>
                        <span>#{tag}</span>
                        <button type="button" onClick={() => removeTag(tag)}>
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    ))}
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
                      placeholder={selectedTags.length === 0 ? "タグを入力してEnter" : ""}
                      disabled={selectedTags.length >= 10}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.labelSub}>プリセットから選択</label>
                  <div className={styles.presetTags}>
                    {presetTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => togglePresetTag(tag)}
                        className={`${styles.presetTag} ${selectedTags.includes(tag) ? styles.active : ''}`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 設定カード */}
              <div className={styles.formCard}>
                <div className={styles.cardHeading}>
                  <span className={styles.cardHeadingIcon}>
                    <i className="fa-solid fa-sliders"></i>
                  </span>
                  設定
                </div>

                {/* 年齢制限 */}
                <div className={styles.field}>
                  <label className="form-label">年齢制限</label>
                  <div className={styles.optionRow}>
                    {(['general', 'r18', 'r18g'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className={`${styles.optionPill} ${rating === value ? styles.active : ''}`}
                      >
                        {ratingLabels[value]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 公開範囲 */}
                <div className={styles.field}>
                  <label className="form-label">公開範囲</label>
                  <div className={styles.optionGrid}>
                    {([
                      { value: 'public', icon: 'fa-globe', label: '全体公開' },
                      { value: 'private', icon: 'fa-lock', label: '非公開' }
                    ] as const).map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setVisibility(item.value)}
                        className={`${styles.optionBtn} ${visibility === item.value ? styles.active : ''}`}
                      >
                        <i className={`fa-solid ${item.icon}`}></i>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* オリジナル作品 */}
                <div
                  className={`${styles.toggleRow} ${isOriginal ? styles.active : ''}`}
                  onClick={() => setIsOriginal(!isOriginal)}
                >
                  <div className={styles.toggleLabel}>
                    <strong>オリジナル作品</strong>
                    <span>二次創作ではない独自の作品</span>
                  </div>
                  <div className={styles.toggleSwitch}></div>
                </div>

                {/* コメント許可 */}
                <div
                  className={`${styles.toggleRow} ${allowComments ? styles.active : ''}`}
                  onClick={() => setAllowComments(!allowComments)}
                >
                  <div className={styles.toggleLabel}>
                    <strong>コメントを許可</strong>
                    <span>作品へのコメントを受け付けます</span>
                  </div>
                  <div className={styles.toggleSwitch}></div>
                </div>
              </div>

              {/* 利用規約 */}
              <label
                className={`${styles.termsCheck} ${agreedToTerms ? styles.active : ''} ${errors.terms ? styles.error : ''}`}
              >
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked)
                    if (e.target.checked) {
                      setErrors(prev => ({ ...prev, terms: '' }))
                    }
                  }}
                />
                <span className={styles.checkBox}>
                  <i className="fa-solid fa-check"></i>
                </span>
                <div>
                  <span className={styles.termsTitle}>
                    利用規約への同意 <span className={styles.required}>*</span>
                  </span>
                  <span className={styles.termsDesc}>
                    <Link href="/terms" target="_blank" className="link">利用規約</Link>や
                    <Link href="/guideline" target="_blank" className="link">ガイドライン</Link>
                    に違反する作品は削除の対象となります
                  </span>
                </div>
              </label>
              {errors.terms && (
                <p className="form-error">
                  <i className="fa-solid fa-circle-exclamation"></i> {errors.terms}
                </p>
              )}

              {/* アクションボタン */}
              <div className={styles.actions}>
                <Link href="/dashboard/portfolio/upload" className="btn btn-secondary">
                  キャンセル
                </Link>
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className="btn btn-primary"
                >
                  {uploading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      アップロード中...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-upload"></i>
                      確認画面へ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* 下書き */}
      <DraftModal
        drafts={drafts}
        categoryKey="illustration"
        onLoadDraft={handleLoadDraft}
        onDeleteDraft={deleteDraft}
        getCategoryUrl={getCategoryUrl}
      />

      {/* 確認モーダル */}
      {showConfirmModal && (
        <div className="modal-overlay active" onClick={() => setShowConfirmModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="fa-solid fa-circle-check" style={{ color: 'var(--status-success)', marginRight: 'var(--space-2)' }}></i>
                アップロード内容の確認
              </h3>
              <button className="modal-close" onClick={() => setShowConfirmModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className={styles.confirmImages}>
                {imagePreviews.map((preview, index) => (
                  <div key={index} className={styles.confirmImage}>
                    <img src={preview} alt={`プレビュー ${index + 1}`} />
                    {index === 0 && <span className={styles.mainBadge}>メイン</span>}
                  </div>
                ))}
              </div>

              <div className={styles.confirmItem}>
                <span className={styles.confirmLabel}>タイトル</span>
                <span className={styles.confirmValue}>{title}</span>
              </div>

              {description && (
                <div className={styles.confirmItem}>
                  <span className={styles.confirmLabel}>説明</span>
                  <span className={styles.confirmValue}>{description}</span>
                </div>
              )}

              <div className={styles.confirmItem}>
                <span className={styles.confirmLabel}>タグ ({selectedTags.length}個)</span>
                <div className={styles.confirmTags}>
                  {selectedTags.map((tag, i) => (
                    <span key={i} className="badge">#{tag}</span>
                  ))}
                </div>
              </div>

              <div className={styles.confirmItem}>
                <span className={styles.confirmLabel}>年齢制限</span>
                <span className={styles.confirmValue}>{ratingLabels[rating]}</span>
              </div>

              <div className={styles.confirmItem}>
                <span className={styles.confirmLabel}>作品種別</span>
                <span className={styles.confirmValue}>{isOriginal ? 'オリジナル作品' : '二次創作'}</span>
              </div>

              <div className={styles.confirmItem}>
                <span className={styles.confirmLabel}>コメント</span>
                <span className={styles.confirmValue}>{allowComments ? '許可する' : '許可しない'}</span>
              </div>

              <div className={styles.confirmItem}>
                <span className={styles.confirmLabel}>公開範囲</span>
                <span className={styles.confirmValue}>{visibilityLabels[visibility]}</span>
              </div>
            </div>

            <div className="modal-footer button-group-equal">
              <button onClick={() => setShowConfirmModal(false)} className="btn btn-secondary">
                修正する
              </button>
              <button onClick={handleConfirmedSubmit} className="btn btn-primary">
                確定してアップロード
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}

export default function UploadIllustrationClient() {
  return <UploadIllustrationContent />
}