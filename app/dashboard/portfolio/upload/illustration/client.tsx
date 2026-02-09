'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getUploadUrl, uploadToR2 } from '@/lib/r2-upload'
import { useDraftStore } from '@/stores/draftStore'
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

// 下書きの型定義
type Draft = {
  id: string
  title: string
  description: string
  selectedTags: string[]
  rating: 'general' | 'r18' | 'r18g'
  isOriginal: boolean
  allowComments: boolean
  visibility: 'public' | 'followers' | 'private'
  timestamp: number
  category?: string
  categoryName?: string
  categoryIcon?: string
  synopsis?: string
  content?: string
  uploadMethod?: 'file' | 'link'
  externalLink?: string
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
  const [rating, setRating] = useState<'general' | 'r18' | 'r18g'>('general')
  const [isOriginal, setIsOriginal] = useState(false)
  const [allowComments, setAllowComments] = useState(true)
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [accountType, setAccountType] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  const [errors, setErrors] = useState({
    title: '',
    images: '',
    terms: ''
  })

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  
  // Zustand: 下書きカウント更新用
  const recount = useDraftStore((state) => state.recount)

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

  // Toast自動消去
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // モーダル表示時のスクロール禁止（position: fixedで確実に防ぐ）
  useEffect(() => {
    if (showConfirmModal || showDraftModal) {
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
  }, [showConfirmModal, showDraftModal])

  function restoreDraft(draftId: string) {
    try {
      const saved = localStorage.getItem('illustration_drafts')
      if (saved) {
        const allDrafts = JSON.parse(saved)
        const draft = allDrafts[draftId]
        
        if (draft) {
          setTitle(draft.title || '')
          setDescription(draft.description || '')
          setSelectedTags(draft.selectedTags || [])
          setRating(draft.rating || 'general')
          setIsOriginal(draft.isOriginal || false)
          setAllowComments(draft.allowComments !== undefined ? draft.allowComments : true)
          setVisibility(draft.visibility || 'public')
          
          setToast({ message: '下書きを読み込みました', type: 'success' })
        }
      }
    } catch (error) {
      console.error('下書き復元エラー:', error)
      setToast({ message: '下書きの読み込みに失敗しました', type: 'error' })
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
        setToast({ message: 'プロフィールが見つかりません', type: 'error' })
        router.push('/profile')
      }
    }
  }

  function loadDrafts() {
    try {
      const allCategories = [
        { key: 'illustration_drafts', name: 'イラスト', icon: 'fa-solid fa-image' },
        { key: 'manga_drafts', name: 'マンガ', icon: 'fa-solid fa-book' },
        { key: 'novel_drafts', name: '小説', icon: 'fa-solid fa-file-lines' },
        { key: 'music_drafts', name: '音楽', icon: 'fa-solid fa-music' },
        { key: 'voice_drafts', name: 'ボイス', icon: 'fa-solid fa-microphone' },
        { key: 'video_drafts', name: '動画', icon: 'fa-solid fa-video' }
      ]

      let allDrafts: Draft[] = []

      allCategories.forEach(category => {
        const saved = localStorage.getItem(category.key)
        if (saved) {
          const parsed = JSON.parse(saved)
          
          if (Array.isArray(parsed)) {
            const draftsArray = parsed.map(draft => ({
              ...draft,
              timestamp: draft.timestamp || Date.now(),
              category: category.key,
              categoryName: category.name,
              categoryIcon: category.icon
            }))
            allDrafts.push(...draftsArray)
          } else if (typeof parsed === 'object') {
            const draftsArray = Object.entries(parsed)
              .map(([id, data]: [string, any]) => ({
                id,
                title: data.title || '無題',
                description: data.description || '',
                selectedTags: data.selectedTags || [],
                rating: data.rating || 'general',
                isOriginal: data.isOriginal || false,
                allowComments: data.allowComments !== undefined ? data.allowComments : true,
                visibility: data.visibility || 'public',
                timestamp: data.savedAt ? new Date(data.savedAt).getTime() : Date.now(),
                category: category.key,
                categoryName: category.name,
                categoryIcon: category.icon
              }))
            allDrafts.push(...draftsArray)
          }
        }
      })

      allDrafts.sort((a, b) => b.timestamp - a.timestamp)
      setDrafts(allDrafts)
    } catch (e) {
      console.error('下書きの読み込みに失敗しました', e)
      setDrafts([])
    }
  }

  function loadDraft(draft: Draft) {
    setTitle(draft.title)
    setDescription(draft.description)
    setSelectedTags(draft.selectedTags)
    setRating(draft.rating)
    setIsOriginal(draft.isOriginal)
    setAllowComments(draft.allowComments)
    setVisibility(draft.visibility)
    setShowDraftModal(false)
    setToast({ message: '下書きを復元しました', type: 'success' })
  }

  function deleteDraft(draft: Draft) {
    try {
      const storageKey = draft.category || 'illustration_drafts'
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const allDrafts = JSON.parse(saved)
        delete allDrafts[draft.id]
        localStorage.setItem(storageKey, JSON.stringify(allDrafts))
        recount()
        loadDrafts()
        setToast({ message: '下書きを削除しました', type: 'success' })
      }
    } catch (error) {
      console.error('下書き削除エラー:', error)
      setToast({ message: '削除に失敗しました', type: 'error' })
    }
  }

  // 自動保存
  useEffect(() => {
    if (!currentUserId) return
    if (!title.trim() && selectedTags.length === 0) return

    const autoSaveTimer = setTimeout(() => {
      try {
        const saved = localStorage.getItem('illustration_drafts')
        let allDrafts = saved ? JSON.parse(saved) : {}
        
        const autoSaveId = 'autosave'
        allDrafts[autoSaveId] = {
          title,
          description,
          selectedTags,
          rating,
          isOriginal,
          allowComments,
          visibility,
          savedAt: new Date().toISOString()
        }
        
        localStorage.setItem('illustration_drafts', JSON.stringify(allDrafts))
        recount()
      } catch (error) {
        console.error('自動保存エラー:', error)
      }
    }, 2000)

    return () => clearTimeout(autoSaveTimer)
  }, [title, description, selectedTags, rating, isOriginal, allowComments, visibility, currentUserId, recount])

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
      setToast({ message: '画像は最大100枚までアップロードできます', type: 'error' })
      return
    }

    setCompressing(true)
    const validFiles: File[] = []
    const newPreviews: string[] = []

    try {
      for (const file of files) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
        if (!allowedTypes.includes(file.type)) {
          setToast({ message: `${file.name}: 対応フォーマット JPEG, PNG, GIF`, type: 'error' })
          continue
        }

        let processedFile = file
        try {
          if (file.type !== 'image/gif') {
            processedFile = await compressImage(file, 1920, 0.8)
          }
        } catch (compressError) {
          console.error('圧縮エラー:', compressError)
          setToast({ message: `${file.name}: 圧縮に失敗しました`, type: 'error' })
          continue
        }

        if (processedFile.size > 32 * 1024 * 1024) {
          setToast({ message: `${file.name}: ファイルサイズは32MB以下にしてください`, type: 'error' })
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
        setToast({ message: '画像の合計サイズは200MB以内にしてください', type: 'error' })
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
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedIndex === null) return
    if (index !== draggedIndex) {
      setDragOverIndex(index)
    }
  }

  function handleDragEnd() {
    if (draggedIndex === null || dragOverIndex === null) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newFiles = [...imageFiles]
    const newPreviews = [...imagePreviews]

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

  function removeTag(tag: string) {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  function handlePreSubmit(e: React.FormEvent) {
    e.preventDefault()

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

    if (selectedTags.length === 0) {
      setToast({ message: 'タグを1個以上追加してください', type: 'error' })
      return
    }

    if (description.length > 1000) {
      setToast({ message: '説明は1000文字以内にしてください', type: 'error' })
      return
    }

    if (!agreedToTerms) {
      setErrors(prev => ({ ...prev, terms: '利用規約に同意してください' }))
      setToast({ message: '利用規約に同意してください', type: 'error' })
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
        setToast({ message: 'ログインが必要です', type: 'error' })
        return
      }

      const uploadedUrls: string[] = []
      
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
          uploadedUrls.push(fileUrl)
          
        } catch (uploadError) {
          console.error(`${i + 1}枚目エラー:`, uploadError)
          throw new Error(`${i + 1}枚目の画像アップロードに失敗しました`)
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
          image_url: uploadedUrls[0],
          thumbnail_url: uploadedUrls[0],
          image_urls: uploadedUrls.length > 1 ? uploadedUrls : null,
          is_public: visibility === 'public'
        })

      if (dbError) {
        throw dbError
      }

      setToast({ message: 'イラストをアップロードしました！', type: 'success' })
      
      setTimeout(() => {
        router.push('/dashboard/portfolio')
      }, 1500)
    } catch (error) {
      console.error('アップロードエラー:', error)
      setToast({ 
        message: error instanceof Error ? error.message : 'アップロードに失敗しました',
        type: 'error' 
      })
    } finally {
      setUploading(false)
    }
  }

  const visibilityLabels: { [key: string]: string } = {
    public: '全体公開',
    followers: 'フォロワーのみ',
    private: '非公開（自分のみ）'
  }

  const ratingLabels: { [key: string]: string } = {
    general: '全年齢',
    r18: 'R-18',
    r18g: 'R-18G'
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <i className="fa-solid fa-spinner fa-spin"></i>
        <span>読み込み中...</span>
      </div>
    )
  }

  return (
    <>
      <Suspense fallback={null}>
        <DraftRestorer onRestore={restoreDraft} />
      </Suspense>
      
      <div className={styles.container}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <h1 className={styles.title}>イラストをアップロード</h1>
          <button
            type="button"
            onClick={() => setShowDraftModal(true)}
            className="btn btn-secondary btn-sm"
          >
            <i className="fa-solid fa-folder-open"></i>
            下書き ({drafts.length})
          </button>
        </div>

        {/* 圧縮中 */}
        {compressing && (
          <div className="alert alert-info">
            <i className="fa-solid fa-spinner fa-spin alert-icon"></i>
            <span>画像を圧縮しています...</span>
          </div>
        )}

        <form onSubmit={handlePreSubmit} className={styles.form}>
          {/* 画像アップロード */}
          <div className={styles.section}>
            <label className="form-label">
              イラスト画像 <span className={styles.required}>*</span>
            </label>
            <p className={styles.hint}>
              {imageFiles.length}/100枚 • ドラッグして並び替え可能 • 自動圧縮あり
            </p>

            {imageFiles.length === 0 ? (
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
                <p className={styles.dropzoneText}>
                  クリックまたはドラッグして画像を追加
                </p>
                <p className={styles.dropzoneHint}>
                  JPEG / PNG / GIF • 最大100枚（合計200MB以内）
                </p>
              </div>
            ) : (
              <div className={styles.previewGrid}>
                {imagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`${styles.previewItem} ${draggedIndex === index ? styles.dragging : ''} ${dragOverIndex === index ? styles.dragover : ''}`}
                  >
                    <img src={preview} alt={`プレビュー ${index + 1}`} />
                    {index === 0 && (
                      <span className={styles.mainBadge}>メイン</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(index) }}
                      className={styles.removeBtn}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ))}
                {imageFiles.length < 100 && (
                  <div
                    onClick={handleImageClick}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleImageDrop}
                    className={styles.addBtn}
                  >
                    <i className="fa-solid fa-plus"></i>
                    <span>追加</span>
                  </div>
                )}
              </div>
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

          {/* タイトル */}
          <div className={styles.section}>
            <label className="form-label">
              タイトル <span className={styles.required}>*</span>
            </label>
            <p className={styles.hint}>{title.length}/50文字</p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="イラストのタイトル"
              maxLength={50}
              className={`form-input ${errors.title ? 'error' : ''}`}
              style={{ maxWidth: '100%' }}
            />
            {errors.title && (
              <p className="form-error">
                <i className="fa-solid fa-circle-exclamation"></i> {errors.title}
              </p>
            )}
          </div>

          {/* 説明 */}
          <div className={styles.section}>
            <label className="form-label">説明</label>
            <p className={styles.hint}>{description.length}/1000文字</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="イラストの説明を入力してください"
              rows={6}
              maxLength={1000}
              className="form-input"
              style={{ maxWidth: '100%', resize: 'vertical' }}
            />
          </div>

          {/* タグ入力 */}
          <div className={styles.section}>
            <label className="form-label">
              タグを追加 <span className={styles.required}>*</span>
            </label>
            <p className={styles.hint}>
              最大10個まで（1個以上必須）{selectedTags.length}/10
            </p>
            
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

          {/* プリセットタグ */}
          <div className={styles.section}>
            <label className={styles.labelSub}>プリセットタグから選択</label>
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

          {/* 年齢制限 */}
          <div className={styles.section}>
            <label className="form-label">
              年齢制限 <span className={styles.required}>*</span>
            </label>
            <div className={styles.optionsEqual}>
              {(['general', 'r18', 'r18g'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`${styles.option} ${rating === value ? styles.active : ''}`}
                >
                  {ratingLabels[value]}
                </button>
              ))}
            </div>
            <p className={styles.hint}>
              R-18: 性的表現を含む / R-18G: 暴力的・グロテスク表現を含む
            </p>
          </div>

          {/* オリジナル作品 */}
          <div className={styles.section}>
            <label className={`${styles.checkboxCard} ${isOriginal ? styles.checked : ''}`}>
              <input
                type="checkbox"
                checked={isOriginal}
                onChange={(e) => setIsOriginal(e.target.checked)}
              />
              <div className={styles.checkboxContent}>
                <span className={styles.checkboxTitle}>オリジナル作品</span>
                <span className={styles.checkboxDesc}>
                  二次創作ではない、独自に創作した作品の場合はチェック
                </span>
              </div>
            </label>
          </div>

          {/* コメント設定 */}
          <div className={styles.section}>
            <label className="form-label">作品へのコメント</label>
            <div className={`${styles.options} ${styles.optionsThree}`}>
              <button
                type="button"
                onClick={() => setAllowComments(true)}
                className={`${styles.option} ${allowComments ? styles.active : ''}`}
              >
                <i className="fa-solid fa-comment"></i>
                許可する
              </button>
              <button
                type="button"
                onClick={() => setAllowComments(false)}
                className={`${styles.option} ${!allowComments ? styles.active : ''}`}
              >
                <i className="fa-solid fa-comment-slash"></i>
                許可しない
              </button>
            </div>
          </div>

          {/* 公開範囲 */}
          <div className={styles.section}>
            <label className="form-label">
              公開範囲 <span className={styles.required}>*</span>
            </label>
            <div className={`${styles.options} ${styles.optionsThree}`}>
              {([
                { value: 'public', icon: 'fa-globe', label: '全体公開' },
                { value: 'followers', icon: 'fa-users', label: 'フォロワー限定' },
                { value: 'private', icon: 'fa-lock', label: '非公開' }
              ] as const).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setVisibility(item.value)}
                  className={`${styles.option} ${visibility === item.value ? styles.active : ''}`}
                >
                  <i className={`fa-solid ${item.icon}`}></i>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 利用規約同意 */}
          <div className={styles.section}>
            <label className={`${styles.checkboxCard} ${styles.terms} ${agreedToTerms ? styles.checked : ''} ${errors.terms ? styles.error : ''}`}>
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
              <div className={styles.checkboxContent}>
                <span className={styles.checkboxTitle}>
                  利用規約への同意 <span className={styles.required}>*</span>
                </span>
                <span className={styles.checkboxDesc}>
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
          </div>

          {/* ボタン */}
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
                '確認画面へ'
              )}
            </button>
          </div>
        </form>
      </div>

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

      {/* 下書きモーダル */}
      {showDraftModal && (
        <div className="modal-overlay active" onClick={() => setShowDraftModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="fa-solid fa-folder-open" style={{ marginRight: 'var(--space-2)' }}></i>
                保存済みの下書き ({drafts.length}件)
              </h3>
              <button className="modal-close" onClick={() => setShowDraftModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="modal-body">
              {drafts.length === 0 ? (
                <div className="empty-state">
                  <i className="fa-regular fa-file-lines"></i>
                  <p>保存された下書きはありません</p>
                </div>
              ) : (
                <div className={styles.draftList}>
                  {drafts.map((draft) => (
                    <div key={`${draft.category}-${draft.id}`} className={styles.draftItem}>
                      <div className={styles.draftContent} onClick={() => loadDraft(draft)}>
                        <div className={styles.draftBadges}>
                          {draft.categoryName && (
                            <span className={styles.categoryBadge}>
                              <i className={draft.categoryIcon}></i> {draft.categoryName}
                            </span>
                          )}
                          {draft.id === 'autosave' && (
                            <span className={styles.autosaveBadge}>自動保存</span>
                          )}
                        </div>
                        <h4 className={styles.draftTitle}>{draft.title || '（タイトルなし）'}</h4>
                        <p className={styles.draftDate}>
                          {new Date(draft.timestamp).toLocaleString('ja-JP')}
                        </p>
                        {draft.selectedTags.length > 0 && (
                          <div className={styles.draftTags}>
                            {draft.selectedTags.slice(0, 5).map((tag, i) => (
                              <span key={i}>#{tag}</span>
                            ))}
                            {draft.selectedTags.length > 5 && (
                              <span className={styles.more}>+{draft.selectedTags.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('この下書きを削除しますか？')) {
                            deleteDraft(draft)
                          }
                        }}
                        className={styles.deleteBtn}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowDraftModal(false)} className="btn btn-secondary" style={{ width: '100%' }}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* トースト */}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          <i className={toast.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'}></i>
          <span>{toast.message}</span>
        </div>
      )}
    </>
  )
}

export default function UploadIllustrationClient() {
  return <UploadIllustrationContent />
}