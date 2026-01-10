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
function UploadVoiceContent() {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'link'>('file')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioFileName, setAudioFileName] = useState('')
  const [externalLink, setExternalLink] = useState('')
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
  const [audioDragging, setAudioDragging] = useState(false)
  const [thumbnailDragging, setThumbnailDragging] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  
  const [errors, setErrors] = useState({
    title: '',
    audio: '',
    link: '',
    thumbnail: '',
    terms: ''
  })

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const audioInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const presetTags = [
    'オリジナル', 'セリフ', 'ナレーション', 'ボイスドラマ', '朗読',
    '歌ってみた', 'ボイスコミック', 'ASMR', '囁き', '環境音',
    '男性向け', '女性向け', '癒し', 'シチュエーション', 'ロールプレイ',
    '演技', '感情表現', '方言', 'キャラボイス', 'モノローグ'
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
      const saved = localStorage.getItem('voice_drafts')
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
          setUploadMethod(draft.uploadMethod || 'file')
          if (draft.externalLink) {
            setExternalLink(draft.externalLink)
          }
          
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
                selectedTags: data.selectedTags || [],
                uploadMethod: data.uploadMethod || 'file',
                externalLink: data.externalLink || '',
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
    setUploadMethod(draft.uploadMethod || 'file')
    setExternalLink(draft.externalLink || '')
    setRating(draft.rating)
    setIsOriginal(draft.isOriginal)
    setAllowComments(draft.allowComments)
    setVisibility(draft.visibility)
    setShowDraftModal(false)
    setToast({ message: '下書きを復元しました', type: 'success' })
  }

  function deleteDraft(draft: Draft) {
    try {
      const storageKey = draft.category || 'voice_drafts'
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
    if (!title.trim() && selectedTags.length === 0) return

    const autoSaveTimer = setTimeout(() => {
      try {
        const saved = localStorage.getItem('voice_drafts')
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
          uploadMethod,
          externalLink,
          savedAt: new Date().toISOString()
        }
        
        localStorage.setItem('voice_drafts', JSON.stringify(allDrafts))
      } catch (error) {
        console.error('自動保存エラー:', error)
      }
    }, 2000)

    return () => clearTimeout(autoSaveTimer)
  }, [title, description, selectedTags, rating, isOriginal, allowComments, visibility, uploadMethod, externalLink, currentUserId])

  useEffect(() => {
    if (title.length > 50) {
      setErrors(prev => ({ ...prev, title: 'タイトルは50文字以内にしてください' }))
    } else if (title.length > 0 && title.trim().length === 0) {
      setErrors(prev => ({ ...prev, title: 'タイトルは空白のみにはできません' }))
    } else {
      setErrors(prev => ({ ...prev, title: '' }))
    }
  }, [title])

  function handleAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      processAudioFile(file)
    }
  }

  function processAudioFile(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      setToast({ message: 'ファイルサイズは20MB以下にしてください', type: 'error' })
      return
    }
    
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav']
    if (!allowedTypes.includes(file.type)) {
      setToast({ message: '対応フォーマット: MP3, WAV', type: 'error' })
      return
    }

    setAudioFile(file)
    setAudioFileName(file.name)
    setErrors(prev => ({ ...prev, audio: '' }))
  }

  function handleAudioClick() {
    audioInputRef.current?.click()
  }

  function handleAudioDrop(e: React.DragEvent) {
    e.preventDefault()
    setAudioDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      processAudioFile(file)
    }
  }

  function removeAudio() {
    setAudioFile(null)
    setAudioFileName('')
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
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
        setToast({ message: 'サムネイルは32MB以下にしてください', type: 'error' })
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

  function handleThumbnailClick() {
    thumbnailInputRef.current?.click()
  }

  function handleThumbnailDrop(e: React.DragEvent) {
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

    if (title.length > 50) {
      setToast({ message: 'タイトルは50文字以内にしてください', type: 'error' })
      return
    }

    if (uploadMethod === 'file' && !audioFile) {
      setErrors(prev => ({ ...prev, audio: '音声ファイルを選択してください' }))
      setToast({ message: '音声ファイルを選択してください', type: 'error' })
      return
    }

    if (uploadMethod === 'link' && !externalLink.trim()) {
      setErrors(prev => ({ ...prev, link: 'リンクを入力してください' }))
      setToast({ message: 'リンクを入力してください', type: 'error' })
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
    ((uploadMethod === 'file' && audioFile !== null) || (uploadMethod === 'link' && externalLink.trim().length > 0)) &&
    selectedTags.length > 0 && 
    agreedToTerms &&
    !errors.title &&
    !errors.audio &&
    !errors.link &&
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

      let audioUrl: string | null = null
      let thumbnailUrl: string | null = null

      // 1. 音声ファイルをR2にアップロード
      if (uploadMethod === 'file' && audioFile) {
        try {
          const { uploadUrl, fileUrl } = await getUploadUrl(
            'voice',
            'audio',
            audioFile.name,
            audioFile.type,
            user.id
          )
          
          await uploadToR2(audioFile, uploadUrl)
          audioUrl = fileUrl
          
        } catch (uploadError) {
          console.error('音声ファイルエラー:', uploadError)
          throw new Error('音声ファイルのアップロードに失敗しました')
        }
      }

      // 2. サムネイル画像をR2にアップロード（任意）
      if (thumbnailFile) {
        try {
          const { uploadUrl, fileUrl } = await getUploadUrl(
            'voice',
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

      // 3. データベースに保存
      const insertData: any = {
        creator_id: currentUserId,
        title: title.trim(),
        description: description.trim() || null,
        category: 'voice',
        rating: rating,
        is_original: isOriginal,
        allow_comments: allowComments,
        tags: selectedTags,
        image_url: thumbnailUrl,
        thumbnail_url: thumbnailUrl,
        is_public: visibility === 'public'
      }

      if (uploadMethod === 'file') {
        insertData.video_url = audioUrl
      } else {
        insertData.external_link = externalLink.trim()
      }

      const { error: dbError } = await supabase
        .from('portfolio_items')
        .insert(insertData)

      if (dbError) {
        throw dbError
      }

      setToast({ message: 'ボイスをアップロードしました！', type: 'success' })
      
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
                <h1 className="upload-illust-title">ボイスをアップロード</h1>
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
                {/* アップロード方法選択 */}
                <div className="upload-illust-section">
                  <label className="upload-illust-label">
                    音声のアップロード方法 <span className="required">*</span>
                  </label>
                  <div className="upload-illust-options" style={{ marginBottom: '16px' }}>
                    {([
                      { value: 'file', label: 'ファイルをアップロード', icon: 'fa-file-audio' },
                      { value: 'link', label: '外部リンク', icon: 'fa-link' }
                    ] as const).map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setUploadMethod(item.value)}
                        className={`upload-illust-option ${uploadMethod === item.value ? 'active' : ''}`}
                      >
                        <i className={`fas ${item.icon}`}></i>
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {uploadMethod === 'file' && (
                    <>
                      {!audioFile ? (
                        <div
                          className={`upload-illust-dropzone ${audioDragging ? 'dragging' : ''}`}
                          onClick={handleAudioClick}
                          onDragOver={(e) => { e.preventDefault(); setAudioDragging(true) }}
                          onDragLeave={() => setAudioDragging(false)}
                          onDrop={handleAudioDrop}
                        >
                          <div className="upload-illust-dropzone-icon">
                            <i className="fas fa-microphone"></i>
                          </div>
                          <p className="upload-illust-dropzone-text">
                            クリックまたはドラッグして音声ファイルを追加
                          </p>
                          <p className="upload-illust-dropzone-hint">
                            MP3 / WAV • 20MB以内
                          </p>
                        </div>
                      ) : (
                        <div className="upload-music-file-info">
                          <div className="file-icon">
                            <i className="fas fa-file-audio"></i>
                          </div>
                          <div className="file-details">
                            <span className="file-name">{audioFileName}</span>
                            <span className="file-size">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                          </div>
                          <button type="button" onClick={removeAudio} className="file-remove">
                            <i className="fas fa-times"></i>
                            削除
                          </button>
                        </div>
                      )}

                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/mpeg,audio/mp3,audio/wav"
                        onChange={handleAudioChange}
                        style={{ display: 'none' }}
                      />

                      {errors.audio && (
                        <div className="upload-illust-error">
                          <i className="fas fa-exclamation-circle"></i>
                          {errors.audio}
                        </div>
                      )}
                    </>
                  )}

                  {uploadMethod === 'link' && (
                    <>
                      <input
                        type="url"
                        value={externalLink}
                        onChange={(e) => {
                          setExternalLink(e.target.value)
                          setErrors(prev => ({ ...prev, link: '' }))
                        }}
                        placeholder="https://www.youtube.com/watch?v=... または https://soundcloud.com/..."
                        className={`upload-illust-input ${errors.link ? 'error' : ''}`}
                      />
                      <p className="upload-illust-hint" style={{ marginTop: '8px' }}>
                        YouTube、SoundCloud、ニコニコ動画などのURLを入力してください
                      </p>
                      {errors.link && (
                        <div className="upload-illust-error">
                          <i className="fas fa-exclamation-circle"></i>
                          {errors.link}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* サムネイル */}
                {uploadMethod === 'file' && (
                  <div className="upload-illust-section">
                    <label className="upload-illust-label">サムネイル画像（任意）</label>
                    <p className="upload-illust-hint">自動圧縮あり</p>

                    {!thumbnailPreview ? (
                      <div
                        className={`upload-illust-dropzone ${thumbnailDragging ? 'dragging' : ''}`}
                        onClick={handleThumbnailClick}
                        onDragOver={(e) => { e.preventDefault(); setThumbnailDragging(true) }}
                        onDragLeave={() => setThumbnailDragging(false)}
                        onDrop={handleThumbnailDrop}
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
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handleThumbnailChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}

                {/* タイトル */}
                <div className="upload-illust-section">
                  <label className="upload-illust-label">
                    タイトル <span className="required">*</span>
                  </label>
                  <p className="upload-illust-hint">{title.length}/50文字</p>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ボイスのタイトル"
                    maxLength={50}
                    className={`upload-illust-input ${errors.title ? 'error' : ''}`}
                  />
                  {errors.title && (
                    <div className="upload-illust-error">
                      <i className="fas fa-exclamation-circle"></i>
                      {errors.title}
                    </div>
                  )}
                </div>

                {/* 説明 */}
                <div className="upload-illust-section">
                  <label className="upload-illust-label">説明</label>
                  <p className="upload-illust-hint">{description.length}/1000文字</p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="ボイスの説明を入力してください"
                    rows={6}
                    maxLength={1000}
                    className="upload-illust-textarea"
                  />
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
                        既存キャラクターの演じ分けではない、独自に創作したボイスの場合はチェック
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

            {description && (
              <div className="upload-illust-confirm-item">
                <span className="label">説明</span>
                <span className="value">{description}</span>
              </div>
            )}

            <div className="upload-illust-confirm-item">
              <span className="label">音声</span>
              {uploadMethod === 'file' ? (
                <span className="value">
                  <i className="fas fa-file-audio" style={{ marginRight: '8px' }}></i>
                  {audioFileName}
                </span>
              ) : (
                <span className="value">
                  <i className="fas fa-link" style={{ marginRight: '8px' }}></i>
                  <a href={externalLink} target="_blank" rel="noopener noreferrer">{externalLink}</a>
                </span>
              )}
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
                        {new Date(draft.timestamp).toLocaleString('ja-JP')} · {draft.uploadMethod === 'file' ? 'ファイル' : 'リンク'}
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

export default function UploadVoiceClient() {
  return <UploadVoiceContent />
}