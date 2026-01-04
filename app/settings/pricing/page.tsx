'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/utils/supabase'
import { getUploadUrl, uploadToR2 } from '@/lib/r2-upload'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingScreen from '../../components/LoadingScreen'
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
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '16px 24px',
        borderRadius: '8px',
        backgroundColor: type === 'success' ? '#4F8A6B' : '#C05656',
        color: '#FFFFFF',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 9999,
        animation: 'slideIn 0.3s ease-out',
        fontSize: '14px',
        fontWeight: '500'
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
          <i className="fas fa-folder-open" style={{ marginRight: '12px', color: '#5B7C99' }}></i>
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
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '20px'
                }}
              >
                <div 
                  onClick={() => onLoad(draft)}
                  style={{
                    flex: 1,
                    cursor: 'pointer',
                    minWidth: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    {draft.categoryName && (
                      <span style={{ 
                        fontSize: '11px', 
                        color: '#555555',
                        backgroundColor: '#EEF0F3',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <i className={draft.categoryIcon} style={{ fontSize: '10px' }}></i>
                        {draft.categoryName}
                      </span>
                    )}
                    {draft.id === 'autosave' && (
                      <span style={{ 
                        fontSize: '11px', 
                        color: '#555555',
                        backgroundColor: '#EEF0F3',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        自動保存
                      </span>
                    )}
                  </div>
                  <h3 style={{ 
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#222222',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {draft.plan_name || '（タイトルなし）'}
                  </h3>
                  <div className="text-small text-gray">
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
                  className="btn-secondary btn-small"
                  style={{ flexShrink: 0 }}
                >
                  削除
                </button>
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

function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
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

    // ✅ profiles.id を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      console.error('プロフィールが見つかりません')
      router.push('/login')
      return
    }

    setUserId(profile.id)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    console.log('🔵 handleSubmit 開始')

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

    console.log('🔵 バリデーション通過')
    console.log('🔵 userId:', userId)

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

  async function handleDelete(planId: string) {
    if (!confirm('この料金プランを削除しますか？')) return

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

  if (loading) {
    return <LoadingScreen message="読み込み中..." />
  }

  return (
    <>
      <Header />
      
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#F5F6F8',
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
            <div className="flex-between mb-40">
              <h1 className="page-title">料金表管理</h1>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={() => setShowDraftModal(true)}
                  className="btn-secondary"
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  <i className="fas fa-folder-open" style={{ marginRight: '8px' }}></i>
                  下書き ({drafts.length})
                </button>
                {!showForm && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary"
                    style={{
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                    新規プラン追加
                  </button>
                )}
              </div>
            </div>

            {compressing && (
              <div className="alert alert-info mb-24">
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                画像を圧縮しています...
              </div>
            )}

            {/* フォーム */}
            {showForm && (
              <form onSubmit={handleSubmit} className="card-no-hover p-40 mb-40">
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#222222',
                  marginBottom: '32px'
                }}>
                  {editingPlan ? '料金プランを編集' : '新規料金プラン'}
                </h2>

                {/* カテゴリ */}
                <div className="mb-24">
                  <label className="form-label-bold">
                    カテゴリ <span className="form-required">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="input-field"
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
                <div className="mb-24">
                  <label className="form-label-bold">
                    プラン名 <span className="form-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="例：キャラクターイラスト"
                    required
                    className="input-field"
                  />
                </div>

                {/* サムネイル */}
                <div className="mb-32">
                  <label className="form-label-bold mb-12">
                    サムネイル画像 <span className="form-required">*</span>
                  </label>
                  <div className="form-hint mb-12">
                    推奨サイズ: 1200×630px（2MB以内）・自動圧縮あり
                  </div>

                  {!thumbnailPreview && (
                    <div
                      className={`upload-area ${thumbnailDragging ? 'dragging' : ''} ${compressing ? 'uploading' : ''}`}
                      style={{ width: '100%', height: '200px' }}
                      onClick={handleThumbnailClick}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setThumbnailDragging(true)
                      }}
                      onDragLeave={() => setThumbnailDragging(false)}
                      onDrop={handleThumbnailDrop}
                    >
                      <div className="upload-area-content" style={{ height: '100%' }}>
                        <div className="upload-area-icon">
                          <i className="fas fa-image"></i>
                        </div>
                        <div className="upload-area-text">
                          クリックまたはドラッグしてサムネイルを追加
                        </div>
                        <div className="upload-area-hint">
                          JPEG / PNG / GIF • 2MB以内
                        </div>
                      </div>
                    </div>
                  )}

                  {thumbnailPreview && (
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: '600px'
                    }}>
                      <img
                        src={thumbnailPreview}
                        alt="サムネイル"
                        style={{
                          width: '100%',
                          height: 'auto',
                          borderRadius: '8px',
                          border: '2px solid #D0D5DA'
                        }}
                      />
                      <button
                        type="button"
                        onClick={removeThumbnail}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
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
                <div className="mb-32">
                  <label className="form-label-bold mb-12">
                    サンプル画像（任意、最大5枚）
                  </label>
                  <div className="form-hint mb-12">
                    作品サンプル、料金表の図解、サービス説明図など（各5MB以内）・自動圧縮あり
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '12px'
                  }}>
                    {/* アップロード済みサンプル画像 */}
                    {samplePreviews.map((preview, index) => (
                      <div key={index} style={{ position: 'relative' }}>
                        <img
                          src={preview}
                          alt={`サンプル${index + 1}`}
                          style={{
                            width: '100%',
                            height: '150px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #D0D5DA'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeSampleImage(index)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}

                    {/* サンプル画像追加エリア（5枚未満の場合のみ） */}
                    {sampleFiles.length < 5 && (
                      <div
                        className={`upload-area ${sampleDragging ? 'dragging' : ''} ${compressing ? 'uploading' : ''}`}
                        style={{ height: '150px' }}
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
                        <div className="upload-area-content" style={{ height: '100%' }}>
                          <div className="upload-area-icon">
                            <i className="fas fa-plus"></i>
                          </div>
                          <div className="upload-area-text" style={{ fontSize: '12px' }}>
                            画像を追加
                          </div>
                        </div>
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
                <div className="mb-24">
                  <label className="form-label-bold">
                    最低料金 <span className="form-required">*</span>
                  </label>
                  <div className="form-hint mb-8">
                    これより安い依頼は受け付けません
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '600' }}>¥</span>
                    <input
                      type="number"
                      value={minimumPrice}
                      onChange={(e) => setMinimumPrice(e.target.value)}
                      placeholder="3000"
                      required
                      min="0"
                      className="input-field"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                {/* 詳細説明 */}
                <div className="mb-32">
                  <label className="form-label-bold">
                    詳細な料金・納期・条件 <span className="form-required">*</span>
                  </label>
                  <div className="form-hint mb-8">
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
                    className="textarea-field"
                    style={{
                      fontFamily: 'inherit',
                      lineHeight: '1.8'
                    }}
                  />
                </div>

                {/* 公開範囲 */}
                <div className="mb-40">
                  <label className="form-label-bold mb-12">
                    公開範囲 <span className="form-required">*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {[
                      { value: 'public', label: '全体公開', icon: 'fa-globe' },
                      { value: 'followers', label: 'フォロワー限定', icon: 'fa-users' },
                      { value: 'private', label: '非公開（下書き）', icon: 'fa-lock' }
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setVisibility(item.value as any)}
                        className="radio-card"
                        style={{
                          flex: '1 1 calc(33.333% - 8px)',
                          minWidth: '140px',
                          padding: '12px',
                          justifyContent: 'center',
                          backgroundColor: visibility === item.value ? '#EAF0F5' : '#FFFFFF',
                          borderColor: visibility === item.value ? '#5B7C99' : '#D0D5DA'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className={`fas ${item.icon}`} style={{ color: '#5B7C99' }}></i>
                          <span style={{ 
                            fontSize: '14px',
                            fontWeight: visibility === item.value ? '600' : '400',
                            color: '#222222'
                          }}>
                            {item.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ボタン */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm()
                      setShowForm(false)
                    }}
                    style={{
                      fontSize: '14px',
                      color: '#555555',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#222222'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#555555'}
                  >
                    <i className="fas fa-chevron-left" style={{ fontSize: '12px' }}></i>
                    キャンセル
                  </button>
                  
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className="btn-primary"
                    style={{
                      padding: '14px 32px',
                      fontSize: '15px',
                      minWidth: '180px',
                      opacity: !isFormValid ? 0.5 : 1
                    }}
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                        保存中...
                      </>
                    ) : (
                      '保存する'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* 料金プラン一覧 */}
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#222222',
                marginBottom: '16px'
              }}>
                登録済みプラン（{pricingPlans.length}件）
              </h2>

              {pricingPlans.length === 0 ? (
                <div className="empty-state">
                  料金プランが登録されていません
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  {pricingPlans.map(plan => {
                    const categoryInfo = CATEGORIES.find(c => c.value === plan.category)
                    return (
                      <div
                        key={plan.id}
                        className="card"
                        style={{
                          padding: '24px',
                          display: 'flex',
                          gap: '16px'
                        }}
                      >
                        <img
                          src={plan.thumbnail_url}
                          alt={plan.plan_name}
                          style={{
                            width: '200px',
                            height: '105px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #D0D5DA',
                            flexShrink: 0
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start',
                            marginBottom: '8px',
                            gap: '12px'
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  backgroundColor: '#EEF0F3',
                                  color: '#555555',
                                  borderRadius: '4px'
                                }}>
                                  <i className={categoryInfo?.icon} style={{ fontSize: '10px' }}></i>
                                  {categoryInfo?.label}
                                </span>
                                <span style={{
                                  fontSize: '11px',
                                  color: plan.is_public ? '#4F8A6B' : '#888888'
                                }}>
                                  {plan.is_public ? '公開中' : '下書き'}
                                </span>
                              </div>
                              <h3 style={{
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#222222',
                                marginBottom: '4px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {plan.plan_name}
                              </h3>
                              <p style={{
                                fontSize: '16px',
                                fontWeight: '600',
                                color: '#5B7C99',
                                margin: 0
                              }}>
                                ¥{plan.minimum_price.toLocaleString()}〜
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                              <button
                                onClick={() => handleEdit(plan)}
                                className="btn-secondary btn-small"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => handleDelete(plan.id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '13px',
                                  backgroundColor: '#FFFFFF',
                                  color: '#C05656',
                                  border: '1px solid #C05656',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
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

      <style jsx global>{`
        @media (max-width: 768px) {
          main {
            padding: 24px 16px !important;
          }
          
          .page-title {
            font-size: 24px !important;
          }
          
          .card-no-hover.p-40 {
            padding: 24px !important;
          }
          
          .flex-between {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 12px;
          }
          
          .flex-between > div {
            width: 100%;
            flex-direction: column;
          }
          
          .flex-between .btn-primary,
          .flex-between .btn-secondary {
            width: 100%;
          }
          
          .card[style*="display: flex"] {
            flex-direction: column !important;
          }
          
          .card img[style*="width: 200px"] {
            width: 100% !important;
            height: auto !important;
          }
          
          div[style*="justifyContent: space-between"]:has(button[type="submit"]) {
            flex-direction: column-reverse !important;
            gap: 12px !important;
          }
          
          div[style*="justifyContent: space-between"]:has(button[type="submit"]) > *,
          div[style*="justifyContent: space-between"]:has(button[type="submit"]) button {
            width: 100% !important;
            justify-content: center !important;
          }
          
          div[style*="gridTemplateColumns: repeat(auto-fill, minmax(150px, 1fr))"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </>
  )
}

export default PricingPage