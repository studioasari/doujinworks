'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import DashboardSidebar from '@/app/components/DashboardSidebar'
import { getUploadUrl, uploadToR2 } from '@/lib/r2-upload'

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
function UploadNovelContent() {
  const [title, setTitle] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')
  const [rating, setRating] = useState<'general' | 'r18' | 'r18g'>('general')
  const [isOriginal, setIsOriginal] = useState(false)
  const [allowComments, setAllowComments] = useState(true)
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [accountType, setAccountType] = useState<string | null>(null)
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)
  const [thumbnailDragging, setThumbnailDragging] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  
  const [errors, setErrors] = useState({
    title: '',
    content: '',
    images: '',
    terms: ''
  })

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // エディタ機能: ルビ挿入
  function insertRuby() {
    if (!contentRef.current) return
    
    const textarea = contentRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    let newText
    let cursorPosition
    
    if (selectedText) {
      newText = content.substring(0, start) + `${selectedText}《》` + content.substring(end)
      cursorPosition = start + selectedText.length + 2
    } else {
      newText = content.substring(0, start) + '《》' + content.substring(end)
      cursorPosition = start + 1
    }
    
    setContent(newText)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorPosition, cursorPosition)
    }, 0)
  }

  // エディタ機能: 改ページ挿入
  function insertPageBreak() {
    if (!contentRef.current) return
    
    const textarea = contentRef.current
    const start = textarea.selectionStart
    const newText = content.substring(0, start) + '\n───\n' + content.substring(start)
    
    setContent(newText)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + 5, start + 5)
    }, 0)
  }

  // エディタ機能: 見出し挿入
  function insertHeading(level: number) {
    if (!contentRef.current) return
    
    const textarea = contentRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    const headingPrefix = '#'.repeat(level) + ' '
    let newText
    let cursorPosition
    
    if (selectedText) {
      newText = content.substring(0, start) + headingPrefix + selectedText + content.substring(end)
      cursorPosition = start + headingPrefix.length + selectedText.length
    } else {
      newText = content.substring(0, start) + headingPrefix + content.substring(end)
      cursorPosition = start + headingPrefix.length
    }
    
    setContent(newText)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorPosition, cursorPosition)
    }, 0)
  }

  // エディタ機能: 強調挿入
  function insertEmphasis() {
    if (!contentRef.current) return
    
    const textarea = contentRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    let newText
    let cursorPosition
    
    if (selectedText) {
      newText = content.substring(0, start) + `**${selectedText}**` + content.substring(end)
      cursorPosition = start + selectedText.length + 4
    } else {
      newText = content.substring(0, start) + '****' + content.substring(end)
      cursorPosition = start + 2
    }
    
    setContent(newText)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorPosition, cursorPosition)
    }, 0)
  }

  // プレビュー用フォーマット変換
  function convertRuby(text: string): string {
    return text.replace(/(.+?)《(.+?)》/g, '<ruby>$1<rt>$2</rt></ruby>')
  }

  function convertPageBreak(text: string): string {
    return text.replace(/───/g, '<div style="display: flex; align-items: center; justify-content: center; margin: 48px 0; padding: 16px; border: 2px solid #E5E5E5; border-radius: 8px; background-color: #FAFAFA; color: #6B6B6B; font-size: 14px; font-weight: bold;"><i class="fas fa-grip-lines" style="margin-right: 8px;"></i>ページ区切り</div>')
  }

  function convertHeadings(text: string): string {
    let result = text
    result = result.replace(/^### (.+)$/gm, '<h3 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0;">$1</h3>')
    result = result.replace(/^## (.+)$/gm, '<h2 style="font-size: 22px; font-weight: bold; margin: 28px 0 14px 0;">$1</h2>')
    result = result.replace(/^# (.+)$/gm, '<h1 style="font-size: 26px; font-weight: bold; margin: 32px 0 16px 0;">$1</h1>')
    return result
  }

  function convertEmphasis(text: string): string {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>')
  }

  function formatContent(text: string): string {
    let formatted = text
    formatted = convertRuby(formatted)
    formatted = convertHeadings(formatted)
    formatted = convertEmphasis(formatted)
    formatted = convertPageBreak(formatted)
    formatted = formatted.replace(/\n/g, '<br />')
    return formatted
  }

  const presetTags = [
    'ファンタジー', '恋愛', 'ミステリー', 'SF', 'ホラー',
    '現代', '歴史', '学園', '異世界', 'バトル',
    'コメディ', 'シリアス', '短編', '長編', '完結',
    '連載中', 'BL', 'GL', 'ハッピーエンド', 'バッドエンド'
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

  function restoreDraft(draftId: string) {
    try {
      const saved = localStorage.getItem('novel_drafts')
      if (saved) {
        const allDrafts = JSON.parse(saved)
        const draft = allDrafts[draftId]
        
        if (draft) {
          setTitle(draft.title || '')
          setSynopsis(draft.synopsis || '')
          setContent(draft.content || '')
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
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
    } else {
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
        { key: 'illustration_drafts', name: 'イラスト', icon: 'fas fa-image' },
        { key: 'manga_drafts', name: 'マンガ', icon: 'fas fa-book' },
        { key: 'novel_drafts', name: '小説', icon: 'fas fa-file-alt' },
        { key: 'music_drafts', name: '音楽', icon: 'fas fa-music' },
        { key: 'voice_drafts', name: 'ボイス', icon: 'fas fa-microphone' },
        { key: 'video_drafts', name: '動画', icon: 'fas fa-video' }
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
                synopsis: data.synopsis || '',
                content: data.content || '',
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
    setSynopsis(draft.synopsis || '')
    setContent(draft.content || '')
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
      const storageKey = draft.category || 'novel_drafts'
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const allDrafts = JSON.parse(saved)
        delete allDrafts[draft.id]
        localStorage.setItem(storageKey, JSON.stringify(allDrafts))
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
    if (!title.trim() && !content.trim() && selectedTags.length === 0) return

    const autoSaveTimer = setTimeout(() => {
      try {
        const saved = localStorage.getItem('novel_drafts')
        let allDrafts = saved ? JSON.parse(saved) : {}
        
        const autoSaveId = 'autosave'
        allDrafts[autoSaveId] = {
          title,
          synopsis,
          content,
          selectedTags,
          rating,
          isOriginal,
          allowComments,
          visibility,
          savedAt: new Date().toISOString()
        }
        
        localStorage.setItem('novel_drafts', JSON.stringify(allDrafts))
      } catch (error) {
        console.error('自動保存エラー:', error)
      }
    }, 2000)

    return () => clearTimeout(autoSaveTimer)
  }, [title, synopsis, content, selectedTags, rating, isOriginal, allowComments, visibility, currentUserId])

  useEffect(() => {
    if (title.length > 200) {
      setErrors(prev => ({ ...prev, title: 'タイトルは200文字以内にしてください' }))
    } else if (title.length > 0 && title.trim().length === 0) {
      setErrors(prev => ({ ...prev, title: 'タイトルは空白のみにはできません' }))
    } else {
      setErrors(prev => ({ ...prev, title: '' }))
    }
  }, [title])

  useEffect(() => {
    if (content.length > 100000) {
      setErrors(prev => ({ ...prev, content: '本文は100,000文字以内にしてください' }))
    } else {
      setErrors(prev => ({ ...prev, content: '' }))
    }
  }, [content])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      processThumbnailFile(file)
    }
  }

  async function processThumbnailFile(file: File) {
    setCompressing(true)
    
    try {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        setToast({ message: '対応フォーマット: JPEG, PNG, GIF', type: 'error' })
        return
      }

      let processedFile = file
      try {
        if (file.type !== 'image/gif') {
          processedFile = await compressImage(file, 1920, 0.8)
        }
      } catch (compressError) {
        console.error('圧縮エラー:', compressError)
        setToast({ message: '画像の圧縮に失敗しました', type: 'error' })
        return
      }

      if (processedFile.size > 32 * 1024 * 1024) {
        setToast({ message: 'ファイルサイズは32MB以下にしてください', type: 'error' })
        return
      }

      setThumbnailFile(processedFile)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(processedFile)
    } finally {
      setCompressing(false)
    }
  }

  function handleImageClick() {
    imageInputRef.current?.click()
  }

  function handleImageDrop(e: React.DragEvent) {
    e.preventDefault()
    setThumbnailDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      processThumbnailFile(file)
    }
  }

  function removeThumbnail() {
    setThumbnailFile(null)
    setThumbnailPreview('')
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

    if (title.length > 200) {
      setToast({ message: 'タイトルは200文字以内にしてください', type: 'error' })
      return
    }

    if (!content.trim()) {
      setErrors(prev => ({ ...prev, content: '本文は必須です' }))
      setToast({ message: '本文を入力してください', type: 'error' })
      return
    }

    if (content.length > 100000) {
      setToast({ message: '本文は100,000文字以内にしてください', type: 'error' })
      return
    }

    if (selectedTags.length === 0) {
      setToast({ message: 'タグを1個以上追加してください', type: 'error' })
      return
    }

    if (synopsis.length > 2000) {
      setToast({ message: 'あらすじは2000文字以内にしてください', type: 'error' })
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
    title.length <= 200 &&
    content.trim().length > 0 &&
    content.length <= 100000 &&
    selectedTags.length > 0 && 
    agreedToTerms &&
    !errors.title &&
    !errors.content &&
    !uploading &&
    !compressing

  async function handleConfirmedSubmit() {
    setShowConfirmModal(false)
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setToast({ message: 'ログインが必要です', type: 'error' })
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
        return
      }

      let thumbnailUrl: string | null = null
      
      if (thumbnailFile) {
        try {
          const { uploadUrl, fileUrl } = await getUploadUrl(
            'novel',
            'image',
            thumbnailFile.name,
            thumbnailFile.type,
            user.id
          )
          
          await uploadToR2(thumbnailFile, uploadUrl)
          thumbnailUrl = fileUrl
          
        } catch (uploadError) {
          console.error('サムネイルエラー:', uploadError)
          throw new Error('サムネイルのアップロードに失敗しました')
        }
      }

      const insertData = {
        creator_id: currentUserId,
        title: title.trim(),
        description: synopsis.trim() || null,
        category: 'novel',
        rating: rating,
        is_original: isOriginal,
        allow_comments: allowComments,
        tags: selectedTags,
        text_content: content.trim(),
        image_url: thumbnailUrl,
        thumbnail_url: thumbnailUrl,
        is_public: visibility === 'public'
      }

      const { error: dbError } = await supabase
        .from('portfolio_items')
        .insert(insertData)

      if (dbError) {
        throw dbError
      }

      setToast({ message: '小説をアップロードしました！', type: 'success' })
      
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

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      
      <Suspense fallback={null}>
        <DraftRestorer onRestore={restoreDraft} />
      </Suspense>
      
      <div className="upload-illust-page">
        <DashboardSidebar accountType={accountType} />

        {loading ? (
          <div className="upload-illust-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <span>読み込み中...</span>
          </div>
        ) : (
          <main className="upload-illust-main">
            <div className="upload-illust-container">
              {/* ヘッダー */}
              <div className="upload-illust-header">
                <h1 className="upload-illust-title">小説をアップロード</h1>
                <button
                  type="button"
                  onClick={() => setShowDraftModal(true)}
                  className="upload-illust-draft-btn"
                >
                  <i className="fas fa-folder-open"></i>
                  下書き ({drafts.length})
                </button>
              </div>

              {/* 圧縮中 */}
              {compressing && (
                <div className="upload-illust-alert info">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>画像を圧縮しています...</span>
                </div>
              )}

              <form onSubmit={handlePreSubmit} className="upload-illust-form">
                {/* サムネイル画像 */}
                <div className="upload-illust-section">
                  <label className="upload-illust-label">サムネイル画像（任意）</label>
                  <p className="upload-illust-hint">自動圧縮あり</p>

                  {!thumbnailPreview ? (
                    <div
                      className={`upload-illust-dropzone ${thumbnailDragging ? 'dragging' : ''}`}
                      onClick={handleImageClick}
                      onDragOver={(e) => { e.preventDefault(); setThumbnailDragging(true) }}
                      onDragLeave={() => setThumbnailDragging(false)}
                      onDrop={handleImageDrop}
                    >
                      <div className="upload-illust-dropzone-icon">
                        <i className="fas fa-image"></i>
                      </div>
                      <p className="upload-illust-dropzone-text">
                        クリックまたはドラッグしてサムネイルを追加
                      </p>
                      <p className="upload-illust-dropzone-hint">
                        JPEG / PNG / GIF • 32MB以内
                      </p>
                    </div>
                  ) : (
                    <div className="upload-music-thumbnail-preview">
                      <img src={thumbnailPreview} alt="サムネイル" />
                      <button type="button" onClick={removeThumbnail} className="thumbnail-remove">
                        <i className="fas fa-times"></i>
                        削除
                      </button>
                    </div>
                  )}

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* タイトル */}
                <div className="upload-illust-section">
                  <label className="upload-illust-label">
                    タイトル <span className="required">*</span>
                  </label>
                  <p className="upload-illust-hint">{title.length}/200文字</p>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="小説のタイトル"
                    maxLength={200}
                    className={`upload-illust-input ${errors.title ? 'error' : ''}`}
                  />
                  {errors.title && (
                    <div className="upload-illust-error">
                      <i className="fas fa-exclamation-circle"></i>
                      {errors.title}
                    </div>
                  )}
                </div>

                {/* あらすじ */}
                <div className="upload-illust-section">
                  <label className="upload-illust-label">あらすじ</label>
                  <p className="upload-illust-hint">{synopsis.length}/2000文字</p>
                  <textarea
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    placeholder="作品のあらすじを入力してください"
                    rows={4}
                    maxLength={2000}
                    className="upload-illust-textarea"
                  />
                </div>

                {/* 本文 */}
                <div className="upload-illust-section upload-novel-content-section">
                  <div className="upload-novel-content-header">
                    <div>
                      <label className="upload-illust-label">
                        本文 <span className="required">*</span>
                      </label>
                      <p className="upload-illust-hint">{content.length.toLocaleString()}/100,000文字</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPreviewModal(true)}
                      disabled={!title.trim() && !content.trim()}
                      className="upload-novel-preview-btn"
                    >
                      <i className="fas fa-eye"></i>
                      プレビュー
                    </button>
                  </div>

                  {/* ツールバー */}
                  <div className="upload-novel-toolbar">
                    <div className="upload-novel-heading-wrapper">
                      <button
                        type="button"
                        onClick={() => setShowHeadingMenu(!showHeadingMenu)}
                        className="upload-novel-toolbar-btn"
                      >
                        <i className="fas fa-heading"></i>
                        見出し
                        <i className="fas fa-chevron-down"></i>
                      </button>
                      
                      {showHeadingMenu && (
                        <>
                          <div className="upload-novel-heading-overlay" onClick={() => setShowHeadingMenu(false)} />
                          <div className="upload-novel-heading-menu">
                            <button type="button" onClick={() => { insertHeading(1); setShowHeadingMenu(false) }}>
                              # 見出し1
                            </button>
                            <button type="button" onClick={() => { insertHeading(2); setShowHeadingMenu(false) }}>
                              ## 見出し2
                            </button>
                            <button type="button" onClick={() => { insertHeading(3); setShowHeadingMenu(false) }}>
                              ### 見出し3
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <button type="button" onClick={insertEmphasis} className="upload-novel-toolbar-btn">
                      <i className="fas fa-bold"></i>
                      強調
                    </button>

                    <button type="button" onClick={insertRuby} className="upload-novel-toolbar-btn">
                      <i className="fas fa-language"></i>
                      ルビ
                    </button>
                    
                    <button type="button" onClick={insertPageBreak} className="upload-novel-toolbar-btn">
                      <i className="fas fa-grip-lines"></i>
                      改ページ
                    </button>
                  </div>

                  <textarea
                    ref={contentRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="本文を入力してください"
                    rows={20}
                    className={`upload-novel-textarea ${errors.content ? 'error' : ''}`}
                  />
                  {errors.content && (
                    <div className="upload-illust-error">
                      <i className="fas fa-exclamation-circle"></i>
                      {errors.content}
                    </div>
                  )}
                  
                  {/* 記法の説明 */}
                  <div className="upload-novel-syntax-help">
                    <div className="syntax-title">
                      <i className="fas fa-info-circle"></i>
                      記法の使い方
                    </div>
                    <div className="syntax-item">見出し1: <code># 見出し</code></div>
                    <div className="syntax-item">見出し2: <code>## 見出し</code></div>
                    <div className="syntax-item">見出し3: <code>### 見出し</code></div>
                    <div className="syntax-item">強調（太字）: <code>**強調したいテキスト**</code></div>
                    <div className="syntax-item">ルビ: <code>漢字《かんじ》</code></div>
                    <div className="syntax-item">改ページ: <code>───</code></div>
                  </div>
                </div>

                {/* タグ入力 */}
                <div className="upload-illust-section">
                  <label className="upload-illust-label">
                    タグを追加 <span className="required">*</span>
                  </label>
                  <p className="upload-illust-hint">
                    最大10個まで（1個以上必須）{selectedTags.length}/10
                  </p>
                  
                  <div className="upload-illust-tags-input">
                    {selectedTags.map((tag, index) => (
                      <div key={index} className="upload-illust-tag">
                        <span>#{tag}</span>
                        <button type="button" onClick={() => removeTag(tag)}>
                          <i className="fas fa-times"></i>
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
                <div className="upload-illust-section">
                  <label className="upload-illust-label-sub">プリセットタグから選択</label>
                  <div className="upload-illust-preset-tags">
                    {presetTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => togglePresetTag(tag)}
                        className={`upload-illust-preset-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 年齢制限 */}
                <div className="upload-illust-section">
                  <label className="upload-illust-label">
                    年齢制限 <span className="required">*</span>
                  </label>
                  <div className="upload-illust-options">
                    {(['general', 'r18', 'r18g'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className={`upload-illust-option ${rating === value ? 'active' : ''}`}
                      >
                        {ratingLabels[value]}
                      </button>
                    ))}
                  </div>
                  <p className="upload-illust-hint">
                    R-18: 性的表現を含む / R-18G: 暴力的・グロテスク表現を含む
                  </p>
                </div>

                {/* オリジナル作品 */}
                <div className="upload-illust-section">
                  <label className={`upload-illust-checkbox ${isOriginal ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isOriginal}
                      onChange={(e) => setIsOriginal(e.target.checked)}
                    />
                    <div className="upload-illust-checkbox-content">
                      <span className="upload-illust-checkbox-title">オリジナル作品</span>
                      <span className="upload-illust-checkbox-desc">
                        二次創作ではない、独自に創作した作品の場合はチェック
                      </span>
                    </div>
                  </label>
                </div>

                {/* コメント設定 */}
                <div className="upload-illust-section">
                  <label className="upload-illust-label">作品へのコメント</label>
                  <div className="upload-illust-options">
                    <button
                      type="button"
                      onClick={() => setAllowComments(true)}
                      className={`upload-illust-option ${allowComments ? 'active' : ''}`}
                    >
                      <i className="fas fa-comment"></i>
                      許可する
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllowComments(false)}
                      className={`upload-illust-option ${!allowComments ? 'active' : ''}`}
                    >
                      <i className="fas fa-comment-slash"></i>
                      許可しない
                    </button>
                  </div>
                </div>

                {/* 公開範囲 */}
                <div className="upload-illust-section">
                  <label className="upload-illust-label">
                    公開範囲 <span className="required">*</span>
                  </label>
                  <div className="upload-illust-options three">
                    {([
                      { value: 'public', icon: 'fa-globe', label: '全体公開' },
                      { value: 'followers', icon: 'fa-users', label: 'フォロワー限定' },
                      { value: 'private', icon: 'fa-lock', label: '非公開' }
                    ] as const).map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setVisibility(item.value)}
                        className={`upload-illust-option ${visibility === item.value ? 'active' : ''}`}
                      >
                        <i className={`fas ${item.icon}`}></i>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 利用規約同意 */}
                <div className="upload-illust-section">
                  <label className={`upload-illust-checkbox terms ${agreedToTerms ? 'checked' : ''} ${errors.terms ? 'error' : ''}`}>
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
                    <div className="upload-illust-checkbox-content">
                      <span className="upload-illust-checkbox-title">
                        利用規約への同意 <span className="required">*</span>
                      </span>
                      <span className="upload-illust-checkbox-desc">
                        <Link href="/terms" target="_blank">利用規約</Link>や
                        <Link href="/guideline" target="_blank">ガイドライン</Link>
                        に違反する作品は削除の対象となります
                      </span>
                    </div>
                  </label>
                  {errors.terms && (
                    <div className="upload-illust-error">
                      <i className="fas fa-exclamation-circle"></i>
                      {errors.terms}
                    </div>
                  )}
                </div>

                {/* ボタン */}
                <div className="upload-illust-actions">
                  <Link href="/dashboard/portfolio/upload" className="upload-illust-cancel">
                    キャンセル
                  </Link>
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`upload-illust-submit ${!isFormValid ? 'disabled' : ''}`}
                  >
                    {uploading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        アップロード中...
                      </>
                    ) : (
                      '確認画面へ'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </main>
        )}
      </div>

      {/* プレビューモーダル */}
      {showPreviewModal && (
        <div className="upload-illust-modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="upload-illust-modal preview" onClick={(e) => e.stopPropagation()}>
            <div className="upload-novel-preview-header">
              <h2>
                <i className="fas fa-eye"></i>
                プレビュー
              </h2>
              <button onClick={() => setShowPreviewModal(false)} className="close-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <h1 className="upload-novel-preview-title">
              {title || '（タイトルなし）'}
            </h1>

            {synopsis && (
              <div className="upload-novel-preview-synopsis">
                <div className="synopsis-label">あらすじ</div>
                <div className="synopsis-content">{synopsis}</div>
              </div>
            )}

            <div className="upload-novel-preview-content">
              {content ? (
                <div dangerouslySetInnerHTML={{ __html: formatContent(content) }} />
              ) : (
                <div className="empty">本文が入力されていません</div>
              )}
            </div>

            <div className="upload-novel-preview-footer">
              <button onClick={() => setShowPreviewModal(false)} className="close-btn-bottom">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 確認モーダル */}
      {showConfirmModal && (
        <div className="upload-illust-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="upload-illust-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="upload-illust-modal-title">
              <i className="fas fa-check-circle"></i>
              アップロード内容の確認
            </h2>

            {thumbnailPreview && (
              <div className="upload-music-confirm-thumbnail">
                <img src={thumbnailPreview} alt="サムネイル" />
              </div>
            )}

            <div className="upload-illust-confirm-item">
              <span className="label">タイトル</span>
              <span className="value title">{title}</span>
            </div>

            {synopsis && (
              <div className="upload-illust-confirm-item">
                <span className="label">あらすじ</span>
                <span className="value">{synopsis}</span>
              </div>
            )}

            <div className="upload-illust-confirm-item">
              <span className="label">本文</span>
              <span className="value">{content.length.toLocaleString()}文字</span>
            </div>

            <div className="upload-illust-confirm-item">
              <span className="label">タグ ({selectedTags.length}個)</span>
              <div className="upload-illust-confirm-tags">
                {selectedTags.map((tag, i) => (
                  <span key={i} className="tag">#{tag}</span>
                ))}
              </div>
            </div>

            <div className="upload-illust-confirm-item">
              <span className="label">年齢制限</span>
              <span className="value">{ratingLabels[rating]}</span>
            </div>

            <div className="upload-illust-confirm-item">
              <span className="label">作品種別</span>
              <span className="value">{isOriginal ? 'オリジナル作品' : '二次創作'}</span>
            </div>

            <div className="upload-illust-confirm-item">
              <span className="label">コメント</span>
              <span className="value">{allowComments ? '許可する' : '許可しない'}</span>
            </div>

            <div className="upload-illust-confirm-item">
              <span className="label">公開範囲</span>
              <span className="value">{visibilityLabels[visibility]}</span>
            </div>

            <div className="upload-illust-modal-actions">
              <button onClick={() => setShowConfirmModal(false)} className="secondary">
                修正する
              </button>
              <button onClick={handleConfirmedSubmit} className="primary">
                確定してアップロード
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 下書きモーダル */}
      {showDraftModal && (
        <div className="upload-illust-modal-overlay" onClick={() => setShowDraftModal(false)}>
          <div className="upload-illust-modal draft" onClick={(e) => e.stopPropagation()}>
            <h2 className="upload-illust-modal-title">
              <i className="fas fa-folder-open"></i>
              保存済みの下書き ({drafts.length}件)
            </h2>

            {drafts.length === 0 ? (
              <div className="upload-illust-draft-empty">
                <i className="fas fa-file-alt"></i>
                <p>保存された下書きはありません</p>
              </div>
            ) : (
              <div className="upload-illust-draft-list">
                {drafts.map((draft) => (
                  <div key={`${draft.category}-${draft.id}`} className="upload-illust-draft-item">
                    <div className="draft-content" onClick={() => loadDraft(draft)}>
                      <div className="draft-badges">
                        {draft.categoryName && (
                          <span className="category-badge">
                            <i className={draft.categoryIcon}></i>
                            {draft.categoryName}
                          </span>
                        )}
                        {draft.id === 'autosave' && (
                          <span className="autosave-badge">自動保存</span>
                        )}
                      </div>
                      <h3>{draft.title || '（タイトルなし）'}</h3>
                      <p className="draft-date">
                        {new Date(draft.timestamp).toLocaleString('ja-JP')} · {(draft.content || '').length.toLocaleString()}文字
                      </p>
                      {draft.selectedTags.length > 0 && (
                        <div className="draft-tags">
                          {draft.selectedTags.slice(0, 5).map((tag, i) => (
                            <span key={i}>#{tag}</span>
                          ))}
                          {draft.selectedTags.length > 5 && (
                            <span className="more">+{draft.selectedTags.length - 5}</span>
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
                      className="draft-delete"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="upload-illust-modal-close">
              <button onClick={() => setShowDraftModal(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* トースト */}
      {toast && (
        <div className={`upload-illust-toast ${toast.type}`}>
          <i className={toast.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'}></i>
          <span>{toast.message}</span>
        </div>
      )}

      <Footer />
    </>
  )
}

export default function UploadNovelClient() {
  return <UploadNovelContent />
}