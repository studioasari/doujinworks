'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/utils/supabase'
import { getUploadUrl, uploadToR2 } from '@/lib/r2-upload'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import DashboardSidebar from '../../components/DashboardSidebar'

// 画像圧縮関数
async function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new window.Image()
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

type PricingPlan = {
  id: string
  category: string
  plan_name: string
  thumbnail_url: string
  sample_images: { url: string; order: number }[]
  minimum_price: number
  description: string
  is_public: boolean
  display_order: number
  created_at: string
}

type Draft = {
  id: string
  category: string
  plan_name: string
  minimum_price: string
  description: string
  visibility: 'public' | 'followers' | 'private'
  timestamp: number
  categoryName?: string
  categoryIcon?: string
}

const CATEGORIES = [
  { value: 'illustration', label: 'イラスト', icon: 'fas fa-image' },
  { value: 'manga', label: 'マンガ', icon: 'fas fa-book' },
  { value: 'novel', label: '小説', icon: 'fas fa-file-alt' },
  { value: 'music', label: '音楽', icon: 'fas fa-music' },
  { value: 'voice', label: 'ボイス', icon: 'fas fa-microphone' },
  { value: 'video', label: '動画', icon: 'fas fa-video' },
  { value: 'other', label: 'その他', icon: 'fas fa-ellipsis-h' }
]

// トーストメッセージコンポーネント
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`pricing-toast ${type}`}>
      <i className={type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'}></i>
      <span>{message}</span>
    </div>
  )
}

// 下書きモーダルコンポーネント
function DraftModal({ 
  drafts, 
  onLoad, 
  onDelete, 
  onClose 
}: { 
  drafts: Draft[]
  onLoad: (draft: Draft) => void
  onDelete: (draft: Draft) => void
  onClose: () => void 
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="pricing-modal-overlay" onClick={onClose}>
      <div className="pricing-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="pricing-modal-title">
          <i className="fas fa-folder-open"></i>
          保存済みの下書き ({drafts.length}件)
        </h2>

        {drafts.length === 0 ? (
          <div className="pricing-modal-empty">
            保存された下書きはありません
          </div>
        ) : (
          <div className="pricing-draft-list">
            {drafts.map((draft) => (
              <div key={draft.id} className="pricing-draft-item">
                <div className="pricing-draft-content" onClick={() => onLoad(draft)}>
                  <div className="pricing-draft-tags">
                    {draft.categoryName && (
                      <span className="pricing-draft-tag">
                        <i className={draft.categoryIcon}></i>
                        {draft.categoryName}
                      </span>
                    )}
                    {draft.id === 'autosave' && (
                      <span className="pricing-draft-tag">自動保存</span>
                    )}
                  </div>
                  <h3 className="pricing-draft-title">
                    {draft.plan_name || '（タイトルなし）'}
                  </h3>
                  <div className="pricing-draft-meta">
                    {new Date(draft.timestamp).toLocaleString('ja-JP')} ・ ¥{draft.minimum_price || '0'}〜
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('この下書きを削除しますか？')) {
                      onDelete(draft)
                    }
                  }}
                  className="pricing-draft-delete"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="pricing-modal-actions">
          <button onClick={onClose} className="pricing-btn secondary">
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

// 確認モーダルコンポーネント
function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isDestructive = false
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  isDestructive?: boolean
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="pricing-modal-overlay" onClick={onCancel}>
      <div className="pricing-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`pricing-confirm-icon ${isDestructive ? 'danger' : ''}`}>
          <i className={isDestructive ? 'fas fa-trash-alt' : 'fas fa-question-circle'}></i>
        </div>
        <h2 className="pricing-confirm-title">{title}</h2>
        <p className="pricing-confirm-message">{message}</p>
        <div className="pricing-confirm-actions">
          <button onClick={onCancel} className="pricing-btn secondary">
            キャンセル
          </button>
          <button 
            onClick={onConfirm} 
            className={`pricing-btn ${isDestructive ? 'danger' : 'primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// 保存確認モーダルコンポーネント
function SaveConfirmModal({
  category,
  planName,
  minimumPrice,
  visibility,
  isEditing,
  onConfirm,
  onCancel
}: {
  category: string
  planName: string
  minimumPrice: string
  visibility: string
  isEditing: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const categoryInfo = CATEGORIES.find(c => c.value === category)
  const visibilityLabels: { [key: string]: string } = {
    public: '全体公開',
    followers: 'フォロワー限定',
    private: '非公開（下書き）'
  }

  // 公開範囲に応じてボタンテキストを変更
  const getActionLabel = () => {
    if (visibility !== 'private') {
      return isEditing ? '更新して公開' : '公開する'
    }
    return isEditing ? '更新する' : '下書き保存'
  }

  const getTitle = () => {
    if (visibility !== 'private') {
      return isEditing ? '料金プランを更新・公開' : '料金プランを公開'
    }
    return isEditing ? '料金プランを更新' : '料金プランを下書き保存'
  }

  const isPublishing = visibility !== 'private'

  return (
    <div className="pricing-modal-overlay" onClick={onCancel}>
      <div className="pricing-save-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pricing-confirm-icon">
          <i className={isPublishing ? 'fas fa-globe' : 'fas fa-save'}></i>
        </div>
        <h2 className="pricing-confirm-title">{getTitle()}</h2>
        <p className="pricing-confirm-message">以下の内容で{isPublishing ? '公開' : '保存'}します。よろしいですか？</p>
        
        <div className="pricing-save-preview">
          <div className="pricing-save-preview-item">
            <span className="pricing-save-preview-label">カテゴリ</span>
            <span className="pricing-save-preview-value">
              <i className={categoryInfo?.icon}></i>
              {categoryInfo?.label}
            </span>
          </div>
          <div className="pricing-save-preview-item">
            <span className="pricing-save-preview-label">プラン名</span>
            <span className="pricing-save-preview-value">{planName}</span>
          </div>
          <div className="pricing-save-preview-item">
            <span className="pricing-save-preview-label">最低料金</span>
            <span className="pricing-save-preview-value pricing-price">¥{parseInt(minimumPrice).toLocaleString()}〜</span>
          </div>
          <div className="pricing-save-preview-item">
            <span className="pricing-save-preview-label">公開範囲</span>
            <span className="pricing-save-preview-value">{visibilityLabels[visibility]}</span>
          </div>
        </div>

        <div className="pricing-confirm-actions">
          <button onClick={onCancel} className="pricing-btn secondary">
            戻る
          </button>
          <button onClick={onConfirm} className="pricing-btn primary">
            {getActionLabel()}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PricingClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<string | null>(null)
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null)

  // フォーム入力
  const [category, setCategory] = useState('')
  const [planName, setPlanName] = useState('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')
  const [thumbnailDragging, setThumbnailDragging] = useState(false)
  const [sampleFiles, setSampleFiles] = useState<File[]>([])
  const [samplePreviews, setSamplePreviews] = useState<string[]>([])
  const [sampleDragging, setSampleDragging] = useState(false)
  const [minimumPrice, setMinimumPrice] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    planId: string
    planName: string
  }>({ show: false, planId: '', planName: '' })
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)

  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const sampleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkAuth()
    loadDrafts()
  }, [])

  // 自動保存（2秒後）
  useEffect(() => {
    if (!userId) return
    if (!planName.trim() && !description.trim() && !category) return

    const autoSaveTimer = setTimeout(() => {
      try {
        const saved = localStorage.getItem('pricing_drafts')
        let allDrafts = saved ? JSON.parse(saved) : {}
        
        const autoSaveId = 'autosave'
        allDrafts[autoSaveId] = {
          category,
          plan_name: planName,
          minimum_price: minimumPrice,
          description,
          visibility,
          savedAt: new Date().toISOString()
        }
        
        localStorage.setItem('pricing_drafts', JSON.stringify(allDrafts))
      } catch (error) {
        console.error('自動保存エラー:', error)
      }
    }, 2000)

    return () => clearTimeout(autoSaveTimer)
  }, [category, planName, minimumPrice, description, visibility, userId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    // profiles.id と account_type を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      console.error('プロフィールが見つかりません')
      router.push('/login')
      return
    }

    setUserId(profile.id)
    setAccountType(profile.account_type)
    await fetchPricingPlans(profile.id)
    setLoading(false)
  }

  async function fetchPricingPlans(profileId: string) {
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('creator_id', profileId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('料金プラン取得エラー:', error)
      return
    }

    setPricingPlans(data || [])
  }

  function loadDrafts() {
    try {
      const saved = localStorage.getItem('pricing_drafts')
      if (saved) {
        const parsed = JSON.parse(saved)
        const draftsArray = Object.entries(parsed)
          .map(([id, data]: [string, any]) => {
            const categoryInfo = CATEGORIES.find(c => c.value === data.category)
            return {
              id,
              category: data.category || '',
              plan_name: data.plan_name || '無題',
              minimum_price: data.minimum_price || '',
              description: data.description || '',
              visibility: data.visibility || 'public',
              timestamp: data.savedAt ? new Date(data.savedAt).getTime() : Date.now(),
              categoryName: categoryInfo?.label || '',
              categoryIcon: categoryInfo?.icon || ''
            }
          })
          .sort((a, b) => b.timestamp - a.timestamp)
        
        setDrafts(draftsArray)
      }
    } catch (e) {
      console.error('下書きの読み込みに失敗しました', e)
      setDrafts([])
    }
  }

  function loadDraft(draft: Draft) {
    setCategory(draft.category)
    setPlanName(draft.plan_name)
    setMinimumPrice(draft.minimum_price)
    setDescription(draft.description)
    setVisibility(draft.visibility)
    setShowDraftModal(false)
    setShowForm(true)
    setToast({ message: '下書きを復元しました', type: 'success' })
  }

  function deleteDraft(draft: Draft) {
    try {
      const saved = localStorage.getItem('pricing_drafts')
      if (saved) {
        const allDrafts = JSON.parse(saved)
        delete allDrafts[draft.id]
        localStorage.setItem('pricing_drafts', JSON.stringify(allDrafts))
        loadDrafts()
        setToast({ message: '下書きを削除しました', type: 'success' })
      }
    } catch (error) {
      console.error('下書き削除エラー:', error)
      setToast({ message: '削除に失敗しました', type: 'error' })
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
          processedFile = await compressImage(file, 1200, 0.85)
          console.log(`圧縮: ${file.name} ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`)
        }
      } catch (compressError) {
        console.error('圧縮エラー:', compressError)
        setToast({ message: '画像の圧縮に失敗しました', type: 'error' })
        return
      }

      if (processedFile.size > 2 * 1024 * 1024) {
        setToast({ message: 'サムネイルは2MB以下にしてください', type: 'error' })
        return
      }

      setThumbnailFile(processedFile)
      setThumbnailPreview(URL.createObjectURL(processedFile))
    } finally {
      setCompressing(false)
    }
  }

  function handleThumbnailClick() {
    thumbnailInputRef.current?.click()
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      processThumbnailFile(file)
    }
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

  async function processSampleFiles(files: File[]) {
    setCompressing(true)
    
    try {
      if (sampleFiles.length + files.length > 5) {
        setToast({ message: 'サンプル画像は最大5枚までです', type: 'error' })
        return
      }

      const processedFiles: File[] = []
      const newPreviews: string[] = []

      for (const file of files) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
        if (!allowedTypes.includes(file.type)) {
          setToast({ message: '対応フォーマット: JPEG, PNG, GIF', type: 'error' })
          continue
        }

        let processedFile = file
        try {
          if (file.type !== 'image/gif') {
            processedFile = await compressImage(file, 1920, 0.85)
          }
        } catch (compressError) {
          console.error('圧縮エラー:', compressError)
          continue
        }

        if (processedFile.size > 5 * 1024 * 1024) {
          setToast({ message: `${file.name}は5MB以下にしてください`, type: 'error' })
          continue
        }

        processedFiles.push(processedFile)
        newPreviews.push(URL.createObjectURL(processedFile))
      }

      setSampleFiles([...sampleFiles, ...processedFiles])
      setSamplePreviews([...samplePreviews, ...newPreviews])
    } finally {
      setCompressing(false)
    }
  }

  function handleSampleClick() {
    sampleInputRef.current?.click()
  }

  function handleSampleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      processSampleFiles(files)
    }
  }

  function removeSampleImage(index: number) {
    setSampleFiles(sampleFiles.filter((_, i) => i !== index))
    setSamplePreviews(samplePreviews.filter((_, i) => i !== index))
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!category || !planName || !minimumPrice || !description) {
      setToast({ message: '必須項目を入力してください', type: 'error' })
      return
    }

    if (!thumbnailFile && !editingPlan) {
      setToast({ message: 'サムネイル画像をアップロードしてください', type: 'error' })
      return
    }

    const priceNum = parseInt(minimumPrice)
    if (isNaN(priceNum) || priceNum < 0) {
      setToast({ message: '正しい料金を入力してください', type: 'error' })
      return
    }

    // バリデーション通過 → 確認モーダルを表示
    setShowSaveConfirm(true)
  }

  async function handleSubmit() {
    setShowSaveConfirm(false)

    console.log('🔵 handleSubmit 開始')
    console.log('🔵 userId:', userId)

    const priceNum = parseInt(minimumPrice)

    setSaving(true)

    try {
      console.log('🔵 try ブロック開始')
      
      const { data: { user } } = await supabase.auth.getUser()
      console.log('🔵 user取得:', user?.id)
      
      if (!user) {
        setToast({ message: 'ログインが必要です', type: 'error' })
        router.push('/login')
        return
      }

      // サムネイルアップロード
      let thumbnailUrl = editingPlan?.thumbnail_url || ''
      console.log('🔵 サムネイルアップロード開始')
      
      if (thumbnailFile) {
        try {
          const { uploadUrl, fileUrl } = await getUploadUrl(
            'pricing',
            'image',
            thumbnailFile.name,
            thumbnailFile.type,
            user.id
          )
          
          console.log('🔵 uploadUrl取得:', uploadUrl)
          
          await uploadToR2(thumbnailFile, uploadUrl)
          thumbnailUrl = fileUrl
          
          console.log('🔵 サムネイルアップロード完了:', thumbnailFile.name)
        } catch (uploadError) {
          console.error('🔴 サムネイルエラー:', uploadError)
          throw new Error('サムネイルのアップロードに失敗しました')
        }
      }

      // サンプル画像アップロード
      const sampleImageUrls: { url: string; order: number }[] = editingPlan?.sample_images || []
      console.log('🔵 サンプル画像数:', sampleFiles.length)
      
      for (let i = 0; i < sampleFiles.length; i++) {
        try {
          const { uploadUrl, fileUrl } = await getUploadUrl(
            'pricing',
            'image',
            sampleFiles[i].name,
            sampleFiles[i].type,
            user.id
          )
          
          await uploadToR2(sampleFiles[i], uploadUrl)
          sampleImageUrls.push({ url: fileUrl, order: sampleImageUrls.length + 1 })
          
          console.log(`🔵 サンプル画像${i + 1}アップロード完了`)
        } catch (uploadError) {
          console.error('🔴 サンプル画像エラー:', uploadError)
        }
      }

      const planData = {
        creator_id: userId,
        category,
        plan_name: planName,
        thumbnail_url: thumbnailUrl,
        sample_images: sampleImageUrls,
        minimum_price: priceNum,
        description,
        is_public: visibility === 'public'
      }

      console.log('🔵 planData:', planData)

      if (editingPlan) {
        console.log('🔵 更新モード')
        const { error: updateError } = await supabase
          .from('pricing_plans')
          .update(planData)
          .eq('id', editingPlan.id)

        console.log('🔵 更新結果:', updateError)
        if (updateError) throw updateError
        
        setToast({ message: '料金プランを更新しました', type: 'success' })
      } else {
        console.log('🔵 新規作成モード')
        const { error: insertError } = await supabase
          .from('pricing_plans')
          .insert(planData)

        console.log('🔵 挿入結果 error:', insertError)
        if (insertError) throw insertError
        
        setToast({ message: '料金プランを追加しました', type: 'success' })
      }

      console.log('🔵 保存成功')

      // リセット
      resetForm()
      setShowForm(false)
      await fetchPricingPlans(userId!)
    } catch (err) {
      console.error('🔴 保存エラー詳細:', {
        error: err,
        errorType: typeof err,
        errorKeys: err ? Object.keys(err) : [],
        errorString: JSON.stringify(err, null, 2),
        errorMessage: err instanceof Error ? err.message : 'unknown'
      })
      
      let errorMessage = '保存に失敗しました'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String((err as any).message)
      }
      
      setToast({ 
        message: errorMessage,
        type: 'error' 
      })
    }

    setSaving(false)
    console.log('🔵 handleSubmit 終了')
  }

  function resetForm() {
    setCategory('')
    setPlanName('')
    setThumbnailFile(null)
    setThumbnailPreview('')
    setSampleFiles([])
    setSamplePreviews([])
    setMinimumPrice('')
    setDescription('')
    setVisibility('public')
    setEditingPlan(null)
  }

  function handleEdit(plan: PricingPlan) {
    setEditingPlan(plan)
    setCategory(plan.category)
    setPlanName(plan.plan_name)
    setThumbnailPreview(plan.thumbnail_url)
    setSamplePreviews(plan.sample_images.map(img => img.url))
    setMinimumPrice(plan.minimum_price.toString())
    setDescription(plan.description)
    setVisibility(plan.is_public ? 'public' : 'private')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function showDeleteConfirm(plan: PricingPlan) {
    setConfirmModal({
      show: true,
      planId: plan.id,
      planName: plan.plan_name
    })
  }

  async function handleDelete() {
    const planId = confirmModal.planId
    setConfirmModal({ show: false, planId: '', planName: '' })

    const { error } = await supabase
      .from('pricing_plans')
      .delete()
      .eq('id', planId)

    if (error) {
      console.error('削除エラー:', error)
      setToast({ message: '削除に失敗しました', type: 'error' })
      return
    }

    setToast({ message: '料金プランを削除しました', type: 'success' })
    await fetchPricingPlans(userId!)
  }

  const isFormValid = 
    category &&
    planName.trim().length > 0 &&
    minimumPrice &&
    description.trim().length > 0 &&
    (thumbnailFile || editingPlan) &&
    !saving &&
    !compressing

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      
      {/* dashboard-layout クラスを追加 */}
      <div className="pricing-manage-page dashboard-layout">
        <DashboardSidebar accountType={accountType} />

        {/* ローディング中もレイアウト維持（mainの外に配置） */}
        {loading ? (
          <div className="dashboard-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <span>読み込み中...</span>
          </div>
        ) : (
          <main className="pricing-manage-main">
            <div className="pricing-manage-container">
              <div className="pricing-manage-header">
                <h1 className="pricing-manage-title">料金表管理</h1>
                <div className="pricing-manage-actions">
                  <button
                    onClick={() => setShowDraftModal(true)}
                    className="pricing-btn secondary"
                  >
                    <i className="fas fa-folder-open"></i>
                    下書き ({drafts.length})
                  </button>
                  {!showForm && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="pricing-btn primary"
                    >
                      <i className="fas fa-plus"></i>
                      新規プラン追加
                    </button>
                  )}
                </div>
              </div>

              {compressing && (
                <div className="pricing-alert info">
                  <i className="fas fa-spinner fa-spin"></i>
                  画像を圧縮しています...
                </div>
              )}

              {/* フォーム */}
              {showForm && (
                <form onSubmit={handleFormSubmit} className="pricing-form-card">
                  <h2 className="pricing-form-title">
                    {editingPlan ? '料金プランを編集' : '新規料金プラン'}
                  </h2>

                  {/* カテゴリ */}
                  <div className="pricing-form-group">
                    <label className="pricing-form-label">
                      カテゴリ <span className="required">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      className="pricing-form-select"
                    >
                      <option value="">選択してください</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* プラン名 */}
                  <div className="pricing-form-group">
                    <label className="pricing-form-label">
                      プラン名 <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder="例：キャラクターイラスト"
                      required
                      className="pricing-form-input"
                    />
                  </div>

                  {/* サムネイル */}
                  <div className="pricing-form-group">
                    <label className="pricing-form-label">
                      サムネイル画像 <span className="required">*</span>
                    </label>
                    <div className="pricing-form-hint">
                      推奨サイズ: 1200×630px（2MB以内）・自動圧縮あり
                    </div>

                    {!thumbnailPreview && (
                      <div
                        className={`pricing-upload-area ${thumbnailDragging ? 'dragging' : ''} ${compressing ? 'uploading' : ''}`}
                        onClick={handleThumbnailClick}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setThumbnailDragging(true)
                        }}
                        onDragLeave={() => setThumbnailDragging(false)}
                        onDrop={handleThumbnailDrop}
                      >
                        <div className="pricing-upload-content">
                          <i className="fas fa-image"></i>
                          <span>クリックまたはドラッグしてサムネイルを追加</span>
                          <span className="pricing-upload-hint">JPEG / PNG / GIF • 2MB以内</span>
                        </div>
                      </div>
                    )}

                    {thumbnailPreview && (
                      <div className="pricing-thumbnail-preview">
                        <img src={thumbnailPreview} alt="サムネイル" />
                        <button type="button" onClick={removeThumbnail} className="pricing-image-remove">
                          <i className="fas fa-times"></i>
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

                  {/* サンプル画像 */}
                  <div className="pricing-form-group">
                    <label className="pricing-form-label">
                      サンプル画像（任意、最大5枚）
                    </label>
                    <div className="pricing-form-hint">
                      作品サンプル、料金表の図解、サービス説明図など（各5MB以内）・自動圧縮あり
                    </div>

                    <div className="pricing-sample-grid">
                      {/* アップロード済みサンプル画像 */}
                      {samplePreviews.map((preview, index) => (
                        <div key={index} className="pricing-sample-item">
                          <img src={preview} alt={`サンプル${index + 1}`} />
                          <button
                            type="button"
                            onClick={() => removeSampleImage(index)}
                            className="pricing-image-remove"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}

                      {/* サンプル画像追加エリア（5枚未満の場合のみ） */}
                      {sampleFiles.length < 5 && (
                        <div
                          className={`pricing-sample-add ${sampleDragging ? 'dragging' : ''} ${compressing ? 'uploading' : ''}`}
                          onClick={handleSampleClick}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setSampleDragging(true)
                          }}
                          onDragLeave={() => setSampleDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault()
                            setSampleDragging(false)
                            const files = Array.from(e.dataTransfer.files)
                            if (files.length > 0) {
                              processSampleFiles(files)
                            }
                          }}
                        >
                          <i className="fas fa-plus"></i>
                          <span>画像を追加</span>
                        </div>
                      )}
                    </div>

                    <input
                      ref={sampleInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      multiple
                      onChange={handleSampleChange}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {/* 最低料金 */}
                  <div className="pricing-form-group">
                    <label className="pricing-form-label">
                      最低料金 <span className="required">*</span>
                    </label>
                    <div className="pricing-form-hint">
                      これより安い依頼は受け付けません
                    </div>
                    <div className="pricing-price-input">
                      <span className="pricing-price-symbol">¥</span>
                      <input
                        type="number"
                        value={minimumPrice}
                        onChange={(e) => setMinimumPrice(e.target.value)}
                        placeholder="3000"
                        required
                        min="0"
                        className="pricing-form-input"
                      />
                    </div>
                  </div>

                  {/* 詳細説明 */}
                  <div className="pricing-form-group">
                    <label className="pricing-form-label">
                      詳細な料金・納期・条件 <span className="required">*</span>
                    </label>
                    <div className="pricing-form-hint">
                      {description.length}/5000文字
                    </div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={`【料金】
・バストアップ: ¥3,000
・全身: ¥5,000

【納期】
・1枚: 7日
・2枚以上: 要相談

【オプション】
・背景追加: +¥3,000
・商用利用: +¥5,000`}
                      required
                      rows={12}
                      maxLength={5000}
                      className="pricing-form-textarea"
                    />
                  </div>

                  {/* 公開範囲 */}
                  <div className="pricing-form-group">
                    <label className="pricing-form-label">
                      公開範囲 <span className="required">*</span>
                    </label>
                    <div className="pricing-visibility-options">
                      {[
                        { value: 'public', label: '全体公開', icon: 'fa-globe' },
                        { value: 'followers', label: 'フォロワー限定', icon: 'fa-users' },
                        { value: 'private', label: '非公開（下書き）', icon: 'fa-lock' }
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setVisibility(item.value as any)}
                          className={`pricing-visibility-btn ${visibility === item.value ? 'active' : ''}`}
                        >
                          <i className={`fas ${item.icon}`}></i>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ボタン */}
                  <div className="pricing-form-actions">
                    <button
                      type="button"
                      onClick={() => {
                        resetForm()
                        setShowForm(false)
                      }}
                      className="pricing-btn secondary"
                    >
                      キャンセル
                    </button>
                    
                    <button
                      type="submit"
                      disabled={!isFormValid}
                      className={`pricing-btn primary large ${!isFormValid ? 'disabled' : ''}`}
                    >
                      {saving ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          {visibility === 'private' ? '保存中...' : '公開中...'}
                        </>
                      ) : (
                        visibility === 'private' ? '下書き保存' : '公開する'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* 料金プラン一覧 */}
              <div className="pricing-list-section">
                <h2 className="pricing-list-title">
                  登録済みプラン（{pricingPlans.length}件）
                </h2>

                {pricingPlans.length === 0 ? (
                  <div className="pricing-empty">
                    料金プランが登録されていません
                  </div>
                ) : (
                  <div className="pricing-list">
                    {pricingPlans.map(plan => {
                      const categoryInfo = CATEGORIES.find(c => c.value === plan.category)
                      return (
                        <div key={plan.id} className="pricing-plan-card">
                          <img
                            src={plan.thumbnail_url}
                            alt={plan.plan_name}
                            className="pricing-plan-thumbnail"
                          />
                          <div className="pricing-plan-content">
                            <div className="pricing-plan-header">
                              <div className="pricing-plan-info">
                                <div className="pricing-plan-tags">
                                  <span className="pricing-plan-category">
                                    <i className={categoryInfo?.icon}></i>
                                    {categoryInfo?.label}
                                  </span>
                                  <span className={`pricing-plan-status ${plan.is_public ? 'public' : 'draft'}`}>
                                    {plan.is_public ? '公開中' : '下書き'}
                                  </span>
                                </div>
                                <h3 className="pricing-plan-name">{plan.plan_name}</h3>
                                <p className="pricing-plan-price">
                                  ¥{plan.minimum_price.toLocaleString()}〜
                                </p>
                              </div>
                              <div className="pricing-plan-actions">
                                <button
                                  onClick={() => handleEdit(plan)}
                                  className="pricing-btn secondary small"
                                >
                                  編集
                                </button>
                                <button
                                  onClick={() => showDeleteConfirm(plan)}
                                  className="pricing-btn danger small"
                                >
                                  削除
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </main>
        )}
      </div>

      <Footer />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showDraftModal && (
        <DraftModal
          drafts={drafts}
          onLoad={loadDraft}
          onDelete={deleteDraft}
          onClose={() => setShowDraftModal(false)}
        />
      )}

      {confirmModal.show && (
        <ConfirmModal
          title="料金プランを削除"
          message={`「${confirmModal.planName}」を削除しますか？この操作は取り消せません。`}
          confirmLabel="削除する"
          onConfirm={handleDelete}
          onCancel={() => setConfirmModal({ show: false, planId: '', planName: '' })}
          isDestructive={true}
        />
      )}

      {showSaveConfirm && (
        <SaveConfirmModal
          category={category}
          planName={planName}
          minimumPrice={minimumPrice}
          visibility={visibility}
          isEditing={!!editingPlan}
          onConfirm={handleSubmit}
          onCancel={() => setShowSaveConfirm(false)}
        />
      )}
    </>
  )
}