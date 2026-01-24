'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { getUploadUrl, uploadToR2 } from '@/lib/r2-upload'
import { PricingPlan, CATEGORIES, compressImage } from './types'
import styles from './PricingForm.module.css'

type PricingFormProps = {
  initialData?: PricingPlan
  userId: string
  onSuccess?: () => void
  onCancel: () => void
}

type FormErrors = {
  category?: string
  planName?: string
  thumbnail?: string
  minimumPrice?: string
  description?: string
  general?: string
}

// 保存確認モーダル
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
    <div className="modal-overlay active" onClick={onCancel}>
      <div className={`modal ${styles.saveModal}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.confirmIcon}>
          <i className={isPublishing ? 'fas fa-globe' : 'fas fa-save'}></i>
        </div>
        <h2 className={styles.confirmTitle}>{getTitle()}</h2>
        <p className={styles.confirmMessage}>以下の内容で{isPublishing ? '公開' : '保存'}します。よろしいですか？</p>
        
        <div className={styles.savePreview}>
          <div className={styles.savePreviewItem}>
            <span className={styles.savePreviewLabel}>カテゴリ</span>
            <span className={styles.savePreviewValue}>
              <i className={categoryInfo?.icon}></i> {categoryInfo?.label}
            </span>
          </div>
          <div className={styles.savePreviewItem}>
            <span className={styles.savePreviewLabel}>プラン名</span>
            <span className={styles.savePreviewValue}>{planName}</span>
          </div>
          <div className={styles.savePreviewItem}>
            <span className={styles.savePreviewLabel}>最低料金</span>
            <span className={`${styles.savePreviewValue} ${styles.priceValue}`}>¥{parseInt(minimumPrice).toLocaleString()}〜</span>
          </div>
          <div className={styles.savePreviewItem}>
            <span className={styles.savePreviewLabel}>公開範囲</span>
            <span className={styles.savePreviewValue}>{visibilityLabels[visibility]}</span>
          </div>
        </div>

        <div className="button-group-equal">
          <button onClick={onCancel} className="btn btn-secondary">
            戻る
          </button>
          <button onClick={onConfirm} className="btn btn-primary">
            {getActionLabel()}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PricingForm({ initialData, userId, onSuccess, onCancel }: PricingFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  // フォーム入力
  const [category, setCategory] = useState(initialData?.category || '')
  const [planName, setPlanName] = useState(initialData?.plan_name || '')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string>(initialData?.thumbnail_url || '')
  const [thumbnailDragging, setThumbnailDragging] = useState(false)
  const [sampleFiles, setSampleFiles] = useState<File[]>([])
  const [samplePreviews, setSamplePreviews] = useState<string[]>(
    initialData?.sample_images?.map(img => img.url) || []
  )
  const [existingSampleImages, setExistingSampleImages] = useState<{ url: string; order: number }[]>(
    initialData?.sample_images || []
  )
  const [sampleDragging, setSampleDragging] = useState(false)
  const [minimumPrice, setMinimumPrice] = useState(initialData?.minimum_price?.toString() || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>(
    initialData ? (initialData.is_public ? 'public' : 'private') : 'public'
  )
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)

  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const sampleInputRef = useRef<HTMLInputElement>(null)

  const isEditing = !!initialData

  // エラーをクリア
  function clearError(field: keyof FormErrors) {
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  // サムネイル処理
  async function processThumbnailFile(file: File) {
    setCompressing(true)
    clearError('thumbnail')
    
    try {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, thumbnail: '対応フォーマット: JPEG, PNG, GIF' }))
        return
      }

      let processedFile = file
      if (file.type !== 'image/gif') {
        processedFile = await compressImage(file, 1200, 0.85)
      }

      if (processedFile.size > 2 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, thumbnail: 'サムネイルは2MB以下にしてください' }))
        return
      }

      setThumbnailFile(processedFile)
      setThumbnailPreview(URL.createObjectURL(processedFile))
    } catch (err) {
      console.error('サムネイル処理エラー:', err)
      setErrors(prev => ({ ...prev, thumbnail: '画像の処理に失敗しました' }))
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

  // サンプル画像処理
  async function processSampleFiles(files: File[]) {
    setCompressing(true)
    
    try {
      const totalCount = existingSampleImages.length + sampleFiles.length + files.length
      if (totalCount > 5) {
        setErrors(prev => ({ ...prev, general: 'サンプル画像は最大5枚までです' }))
        return
      }

      const processedFiles: File[] = []
      const newPreviews: string[] = []

      for (const file of files) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
        if (!allowedTypes.includes(file.type)) {
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

        if (processedFile.size > 2 * 1024 * 1024) {
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
    if (index < existingSampleImages.length) {
      setExistingSampleImages(existingSampleImages.filter((_, i) => i !== index))
      setSamplePreviews(samplePreviews.filter((_, i) => i !== index))
    } else {
      const newIndex = index - existingSampleImages.length
      setSampleFiles(sampleFiles.filter((_, i) => i !== newIndex))
      setSamplePreviews(samplePreviews.filter((_, i) => i !== index))
    }
  }

  function validateForm(): boolean {
    const newErrors: FormErrors = {}

    if (!category) {
      newErrors.category = 'カテゴリを選択してください'
    }
    if (!planName.trim()) {
      newErrors.planName = 'プラン名を入力してください'
    }
    if (!thumbnailFile && !thumbnailPreview) {
      newErrors.thumbnail = 'サムネイル画像をアップロードしてください'
    }
    if (!minimumPrice) {
      newErrors.minimumPrice = '最低料金を入力してください'
    } else {
      const priceNum = parseInt(minimumPrice)
      if (isNaN(priceNum) || priceNum < 0) {
        newErrors.minimumPrice = '正しい料金を入力してください'
      }
    }
    if (!description.trim()) {
      newErrors.description = '詳細を入力してください'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setShowSaveConfirm(true)
  }

  async function handleSubmit() {
    setShowSaveConfirm(false)
    setSaving(true)
    setErrors({})

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setErrors({ general: 'ログインが必要です' })
        router.push('/login')
        return
      }

      // サムネイルアップロード
      let thumbnailUrl = initialData?.thumbnail_url || ''
      
      if (thumbnailFile) {
        const { uploadUrl, fileUrl } = await getUploadUrl(
          'pricing',
          'image',
          thumbnailFile.name,
          thumbnailFile.type,
          user.id
        )
        
        await uploadToR2(thumbnailFile, uploadUrl)
        thumbnailUrl = fileUrl
      }

      // サンプル画像アップロード
      const sampleImageUrls: { url: string; order: number }[] = [...existingSampleImages]
      
      for (let i = 0; i < sampleFiles.length; i++) {
        const { uploadUrl, fileUrl } = await getUploadUrl(
          'pricing',
          'image',
          sampleFiles[i].name,
          sampleFiles[i].type,
          user.id
        )
        
        await uploadToR2(sampleFiles[i], uploadUrl)
        sampleImageUrls.push({ url: fileUrl, order: sampleImageUrls.length + 1 })
      }

      const planData = {
        creator_id: userId,
        category,
        plan_name: planName,
        thumbnail_url: thumbnailUrl,
        sample_images: sampleImageUrls,
        minimum_price: parseInt(minimumPrice),
        description,
        is_public: visibility === 'public'
      }

      if (isEditing && initialData) {
        const { error: updateError } = await supabase
          .from('pricing_plans')
          .update(planData)
          .eq('id', initialData.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('pricing_plans')
          .insert(planData)

        if (insertError) throw insertError
      }

      onSuccess?.()
      router.push('/dashboard/pricing')
    } catch (err) {
      console.error('保存エラー:', err)
      setErrors({ general: '保存に失敗しました。もう一度お試しください。' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {compressing && (
        <div className={styles.alert}>
          <i className="fas fa-spinner fa-spin"></i>
          画像を圧縮しています...
        </div>
      )}

      {errors.general && (
        <div className={styles.alertError}>
          <i className="fas fa-exclamation-circle"></i>
          {errors.general}
        </div>
      )}

      <form onSubmit={handleFormSubmit} className={`card ${styles.formCard}`}>
        <h2 className={styles.formTitle}>
          {isEditing ? '料金プランを編集' : '新規料金プラン'}
        </h2>

        {/* カテゴリ */}
        <div className="form-group">
          <label className="form-label">
            カテゴリ <span className={styles.required}>*</span>
          </label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); clearError('category') }}
            className={`form-input ${errors.category ? 'error' : ''}`}
          >
            <option value="">選択してください</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {errors.category && <p className="form-error"><i className="fas fa-exclamation-circle"></i> {errors.category}</p>}
        </div>

        {/* プラン名 */}
        <div className="form-group">
          <label className="form-label">
            プラン名 <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={planName}
            onChange={(e) => { setPlanName(e.target.value); clearError('planName') }}
            placeholder="例：キャラクターイラスト"
            className={`form-input ${errors.planName ? 'error' : ''}`}
          />
          {errors.planName && <p className="form-error"><i className="fas fa-exclamation-circle"></i> {errors.planName}</p>}
        </div>

        {/* サムネイル */}
        <div className="form-group">
          <label className="form-label">
            サムネイル画像 <span className={styles.required}>*</span>
          </label>
          <p className={styles.formHint}>
            推奨サイズ: 1200×630px（2MB以内）・自動圧縮あり
          </p>

          {!thumbnailPreview ? (
            <div
              className={`${styles.uploadArea} ${thumbnailDragging ? styles.dragging : ''} ${errors.thumbnail ? styles.error : ''}`}
              onClick={handleThumbnailClick}
              onDragOver={(e) => {
                e.preventDefault()
                setThumbnailDragging(true)
              }}
              onDragLeave={() => setThumbnailDragging(false)}
              onDrop={handleThumbnailDrop}
            >
              <i className="fas fa-image"></i>
              <span>クリックまたはドラッグしてサムネイルを追加</span>
              <span className={styles.uploadHint}>JPEG / PNG / GIF • 2MB以内</span>
            </div>
          ) : (
            <div className={styles.thumbnailPreview}>
              <img src={thumbnailPreview} alt="サムネイル" />
              <button type="button" onClick={removeThumbnail} className={styles.imageRemoveBtn}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
          {errors.thumbnail && <p className="form-error"><i className="fas fa-exclamation-circle"></i> {errors.thumbnail}</p>}

          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif"
            onChange={handleThumbnailChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* サンプル画像 */}
        <div className="form-group">
          <label className="form-label">
            サンプル画像（任意、最大5枚）
          </label>
          <p className={styles.formHint}>
            作品サンプル、料金表の図解、サービス説明図など（各2MB以内）・自動圧縮あり
          </p>

          <div className={styles.sampleGrid}>
            {samplePreviews.map((preview, index) => (
              <div key={index} className={styles.sampleItem}>
                <img src={preview} alt={`サンプル${index + 1}`} />
                <button
                  type="button"
                  onClick={() => removeSampleImage(index)}
                  className={styles.imageRemoveBtn}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}

            {(existingSampleImages.length + sampleFiles.length) < 5 && (
              <div
                className={`${styles.sampleAdd} ${sampleDragging ? styles.dragging : ''}`}
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
        <div className="form-group">
          <label className="form-label">
            最低料金 <span className={styles.required}>*</span>
          </label>
          <p className={styles.formHint}>
            これより安い依頼は受け付けません
          </p>
          <div className={styles.priceInput}>
            <span className={styles.priceSymbol}>¥</span>
            <input
              type="number"
              value={minimumPrice}
              onChange={(e) => { setMinimumPrice(e.target.value); clearError('minimumPrice') }}
              placeholder="3000"
              min="0"
              className={`form-input ${errors.minimumPrice ? 'error' : ''}`}
            />
          </div>
          {errors.minimumPrice && <p className="form-error"><i className="fas fa-exclamation-circle"></i> {errors.minimumPrice}</p>}
        </div>

        {/* 詳細説明 */}
        <div className="form-group">
          <label className="form-label">
            詳細な料金・納期・条件 <span className={styles.required}>*</span>
          </label>
          <p className={styles.formHint}>
            {description.length}/5000文字
          </p>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); clearError('description') }}
            placeholder={`【料金】
・バストアップ: ¥3,000
・全身: ¥5,000

【納期】
・1枚: 7日
・2枚以上: 要相談

【オプション】
・背景追加: +¥3,000
・商用利用: +¥5,000`}
            rows={12}
            maxLength={5000}
            className={`form-input ${errors.description ? 'error' : ''}`}
          />
          {errors.description && <p className="form-error"><i className="fas fa-exclamation-circle"></i> {errors.description}</p>}
        </div>

        {/* 公開範囲 */}
        <div className="form-group">
          <label className="form-label">
            公開範囲 <span className={styles.required}>*</span>
          </label>
          <div className={styles.visibilityOptions}>
            {[
              { value: 'public', label: '全体公開', icon: 'fa-globe' },
              { value: 'followers', label: 'フォロワー限定', icon: 'fa-users' },
              { value: 'private', label: '非公開（下書き）', icon: 'fa-lock' }
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setVisibility(item.value as typeof visibility)}
                className={`${styles.visibilityBtn} ${visibility === item.value ? styles.active : ''}`}
              >
                <i className={`fas ${item.icon}`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ボタン */}
        <div className={styles.formActions}>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            キャンセル
          </button>
          
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
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

      {showSaveConfirm && (
        <SaveConfirmModal
          category={category}
          planName={planName}
          minimumPrice={minimumPrice}
          visibility={visibility}
          isEditing={isEditing}
          onConfirm={handleSubmit}
          onCancel={() => setShowSaveConfirm(false)}
        />
      )}
    </>
  )
}