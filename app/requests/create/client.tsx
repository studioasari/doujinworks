'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import DashboardSidebar from '@/app/components/DashboardSidebar'
import styles from './page.module.css'

type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

// 確認モーダルコンポーネント
function ConfirmModal({ 
  requestType, category, title, description, referenceUrls, requiredSkills, attachedFiles,
  paymentType, budgetType, budgetMin, budgetMax, fixedBudget, hourlyRateMin, hourlyRateMax,
  estimatedHours, jobFeatures, deadline, numberOfPositions, multiplePositionsCount,
  applicationDeadline, onConfirm, onCancel 
}: { 
  requestType: string
  category: string
  title: string
  description: string
  referenceUrls: string[]
  requiredSkills: string[]
  attachedFiles: File[]
  paymentType: string
  budgetType: string
  budgetMin: string
  budgetMax: string
  fixedBudget: string
  hourlyRateMin: string
  hourlyRateMax: string
  estimatedHours: string
  jobFeatures: string[]
  deadline: string
  numberOfPositions: string
  multiplePositionsCount: string
  applicationDeadline: string
  onConfirm: () => void
  onCancel: () => void 
}) {
  const categoryLabels: { [key: string]: string } = {
    illustration: 'イラスト', manga: 'マンガ', novel: '小説', music: '音楽',
    voice: 'ボイス', video: '動画', logo: 'ロゴ', design: 'デザイン', other: 'その他'
  }

  const jobFeatureLabels: { [key: string]: string } = {
    no_skill: 'スキル不要', skill_welcome: '専門スキル歓迎', one_time: '単発',
    continuous: '継続あり', flexible_time: 'スキマ時間歓迎'
  }

  const positionsCount = numberOfPositions === '1' ? 1 : parseInt(multiplePositionsCount) || 2

  useEffect(() => {
    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [])

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>
          <i className="fas fa-check-circle"></i>
          依頼内容の確認
        </h2>

        <div className={styles.modalSection}>
          <div className={styles.modalLabel}>カテゴリ</div>
          <div className={styles.modalValue}>{categoryLabels[category] || category}</div>
        </div>

        <div className={styles.modalSection}>
          <div className={styles.modalLabel}>タイトル</div>
          <div className={styles.modalValue} style={{ fontSize: '17px', fontWeight: '700' }}>{title}</div>
        </div>

        <div className={styles.modalSection}>
          <div className={styles.modalLabel}>依頼内容</div>
          <div className={styles.modalValue} style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{description}</div>
        </div>

        {referenceUrls.filter(url => url.trim()).length > 0 && (
          <div className={styles.modalSection}>
            <div className={styles.modalLabel}>参考URL</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {referenceUrls.filter(url => url.trim()).map((url, index) => (
                <a key={index} href={url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '14px', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
                  {url}
                </a>
              ))}
            </div>
          </div>
        )}

        {requiredSkills.length > 0 && (
          <div className={styles.modalSection}>
            <div className={styles.modalLabel}>求めるスキル</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {requiredSkills.map((skill, index) => (
                <span key={index} className={styles.skillTag}>{skill}</span>
              ))}
            </div>
          </div>
        )}

        {attachedFiles.length > 0 && (
          <div className={styles.modalSection}>
            <div className={styles.modalLabel}>添付ファイル ({attachedFiles.length}件)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attachedFiles.map((file, index) => (
                <div key={index} className={styles.fileItem}>
                  <i className="fas fa-file"></i>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>({formatFileSize(file.size)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.modalSection}>
          <div className={styles.modalLabel}>支払い方式・予算</div>
          <div className={styles.modalValue}>
            {paymentType === 'fixed' ? '固定報酬制' : '時間単価制'}
            <br />
            {paymentType === 'fixed' ? (
              budgetType === 'negotiable' ? (
                <span style={{ color: 'var(--text-tertiary)' }}>金額は相談して決定</span>
              ) : budgetType === 'fixed' && fixedBudget ? (
                <span style={{ color: 'var(--accent-primary)', fontWeight: '700' }}>{parseInt(fixedBudget).toLocaleString()}円</span>
              ) : budgetMin || budgetMax ? (
                <span style={{ color: 'var(--accent-primary)', fontWeight: '700' }}>
                  {budgetMin && parseInt(budgetMin).toLocaleString()}円 
                  {budgetMin && budgetMax && ' 〜 '}
                  {budgetMax && parseInt(budgetMax).toLocaleString()}円
                </span>
              ) : (
                <span style={{ color: 'var(--text-tertiary)' }}>金額未設定</span>
              )
            ) : (
              <>
                <span style={{ color: 'var(--accent-primary)', fontWeight: '700' }}>
                  時給: {hourlyRateMin && parseInt(hourlyRateMin).toLocaleString()}円
                  {hourlyRateMin && hourlyRateMax && ' 〜 '}
                  {hourlyRateMax && parseInt(hourlyRateMax).toLocaleString()}円
                </span>
                {estimatedHours && (<><br />想定作業時間: {estimatedHours}時間</>)}
              </>
            )}
          </div>
        </div>

        {jobFeatures.length > 0 && (
          <div className={styles.modalSection}>
            <div className={styles.modalLabel}>この仕事の特徴</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {jobFeatures.map((feature, index) => (
                <span key={index} className={styles.featureTag}>{jobFeatureLabels[feature] || feature}</span>
              ))}
            </div>
          </div>
        )}

        {deadline && (
          <div className={styles.modalSection}>
            <div className={styles.modalLabel}>希望納期</div>
            <div className={styles.modalValue}>
              {new Date(deadline).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        )}

        <div className={styles.modalSection}>
          <div className={styles.modalLabel}>募集人数</div>
          <div className={styles.modalValue}>{positionsCount}人</div>
        </div>

        <div className={styles.modalSection} style={{ borderBottom: 'none', marginBottom: '0' }}>
          <div className={styles.modalLabel}>応募期限</div>
          <div className={styles.modalValue}>
            {new Date(applicationDeadline).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div className={styles.modalButtons}>
          <button type="button" onClick={onCancel} className={`${styles.btn} ${styles.secondary}`}>
            修正する
          </button>
          <button type="button" onClick={onConfirm} className={`${styles.btn} ${styles.primary}`}>
            {requestType === 'direct' ? '確定して送信する' : '確定して公開する'}
          </button>
        </div>
      </div>
    </div>
  )
}

// メインコンテンツ
function CreateRequestContent() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [budgetType, setBudgetType] = useState<'range' | 'fixed' | 'negotiable'>('range')
  const [fixedBudget, setFixedBudget] = useState('')
  const [hourlyRateMin, setHourlyRateMin] = useState('')
  const [hourlyRateMax, setHourlyRateMax] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [deadline, setDeadline] = useState('')
  const [category, setCategory] = useState('')
  const [jobFeatures, setJobFeatures] = useState<string[]>([])
  const [applicationDeadline, setApplicationDeadline] = useState('')
  const [numberOfPositions, setNumberOfPositions] = useState<'1' | 'multiple'>('1')
  const [multiplePositionsCount, setMultiplePositionsCount] = useState('')
  const [referenceUrls, setReferenceUrls] = useState<string[]>([''])
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [paymentType, setPaymentType] = useState<'fixed' | 'hourly'>('fixed')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [accountType, setAccountType] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [recipientProfile, setRecipientProfile] = useState<Profile | null>(null)
  const [requestType, setRequestType] = useState<'public' | 'direct'>('public')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const toUsername = searchParams.get('to')

  function toggleJobFeature(feature: string) {
    if (jobFeatures.includes(feature)) {
      setJobFeatures(jobFeatures.filter(f => f !== feature))
    } else {
      setJobFeatures([...jobFeatures, feature])
    }
  }

  function addReferenceUrl() { setReferenceUrls([...referenceUrls, '']) }
  function removeReferenceUrl(index: number) { setReferenceUrls(referenceUrls.filter((_, i) => i !== index)) }
  function updateReferenceUrl(index: number, value: string) {
    const newUrls = [...referenceUrls]
    newUrls[index] = value
    setReferenceUrls(newUrls)
  }

  function addSkill(skill: string) {
    if (skill.trim() && !requiredSkills.includes(skill.trim())) {
      setRequiredSkills([...requiredSkills, skill.trim()])
      setSkillInput('')
    }
  }

  function removeSkill(skill: string) { setRequiredSkills(requiredSkills.filter(s => s !== skill)) }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const maxSize = 100 * 1024 * 1024
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`${file.name} は100MBを超えているため追加できません`)
        return false
      }
      return true
    })
    setAttachedFiles([...attachedFiles, ...validFiles])
    e.target.value = ''
  }

  function removeFile(index: number) { setAttachedFiles(attachedFiles.filter((_, i) => i !== index)) }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function getTitlePlaceholder(category: string) {
    const placeholders: { [key: string]: string } = {
      illustration: '例: YouTubeチャンネルのアイコン制作',
      manga: '例: 4コマ漫画の制作',
      novel: '例: 短編小説の執筆依頼',
      music: '例: BGM・効果音の制作',
      voice: '例: ナレーション・ボイス収録',
      video: '例: YouTube動画の編集',
      logo: '例: 企業ロゴのデザイン',
      design: '例: チラシ・バナーのデザイン',
      other: '例: 制作物のタイトルを入力'
    }
    return placeholders[category] || '例: 依頼のタイトルを入力してください'
  }

  function getDescriptionPlaceholder(category: string) {
    const placeholders: { [key: string]: string } = {
      illustration: '依頼内容を詳しく記載してください\n\n例:\n・用途: YouTubeチャンネルのアイコン\n・サイズ: 800x800px\n・イメージ: 可愛い猫のキャラクター\n・納品形式: PNG（透過背景）',
      manga: '依頼内容を詳しく記載してください\n\n例:\n・ページ数: 4ページ\n・テーマ: 日常系コメディ\n・キャラクター: 2〜3人\n・納品形式: JPGまたはPNG',
      other: '依頼内容を詳しく記載してください\n\n例:\n・制作物の種類\n・用途\n・イメージ\n・納品形式'
    }
    return placeholders[category] || '依頼内容を詳しく記載してください'
  }

  useEffect(() => {
    checkAuth()
    const defaultDeadline = new Date()
    defaultDeadline.setDate(defaultDeadline.getDate() + 14)
    setApplicationDeadline(defaultDeadline.toISOString().split('T')[0])
    loadDraft()
  }, [])

  function saveDraft() {
    const draft = {
      title, description, category, paymentType, budgetType, budgetMin, budgetMax,
      fixedBudget, hourlyRateMin, hourlyRateMax, estimatedHours, deadline,
      referenceUrls, requiredSkills, jobFeatures, numberOfPositions,
      multiplePositionsCount, applicationDeadline
    }
    localStorage.setItem('request_draft', JSON.stringify(draft))
    alert('下書きを保存しました')
  }

  function loadDraft() {
    const saved = localStorage.getItem('request_draft')
    if (!saved) return
    try {
      const draft = JSON.parse(saved)
      setTitle(draft.title || '')
      setDescription(draft.description || '')
      setCategory(draft.category || '')
      setPaymentType(draft.paymentType || 'fixed')
      setBudgetType(draft.budgetType || 'range')
      setBudgetMin(draft.budgetMin || '')
      setBudgetMax(draft.budgetMax || '')
      setFixedBudget(draft.fixedBudget || '')
      setHourlyRateMin(draft.hourlyRateMin || '')
      setHourlyRateMax(draft.hourlyRateMax || '')
      setEstimatedHours(draft.estimatedHours || '')
      setDeadline(draft.deadline || '')
      setReferenceUrls(draft.referenceUrls || [''])
      setRequiredSkills(draft.requiredSkills || [])
      setJobFeatures(draft.jobFeatures || [])
      setNumberOfPositions(draft.numberOfPositions || '1')
      setMultiplePositionsCount(draft.multiplePositionsCount || '')
      setApplicationDeadline(draft.applicationDeadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    } catch (error) {
      console.error('下書き読み込みエラー:', error)
    }
  }

  function clearDraft() { localStorage.removeItem('request_draft') }

  useEffect(() => {
    if (toUsername) {
      setRequestType('direct')
      fetchRecipient()
    } else {
      setLoading(false)
    }
  }, [toUsername])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type, is_admin')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentProfileId(profile.id)
      setAccountType(profile.account_type)
      setIsAdmin(profile.is_admin || false)
    } else {
      alert('プロフィールが見つかりません')
      router.push('/profile')
    }
  }

  async function fetchRecipient() {
    if (!toUsername) { setLoading(false); return }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('username', toUsername)
      .single()

    if (error) {
      console.error('受取人取得エラー:', error)
      alert('指定されたクリエイターが見つかりませんでした')
      router.push('/requests/create')
    } else {
      setRecipientProfile(data)
    }
    setLoading(false)
  }

  async function handlePreSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) { alert('タイトルと依頼内容は必須です'); return }
    if (!category) { alert('カテゴリを選択してください'); return }
    if (requestType === 'direct' && !recipientProfile) { alert('受取人が設定されていません'); return }
    setShowConfirmModal(true)
  }

  async function handleConfirmedSubmit() {
    setShowConfirmModal(false)
    setSubmitting(true)

    try {
      const uploadedFileUrls: string[] = []
      
      if (attachedFiles.length > 0) {
        setUploading(true)
        for (const file of attachedFiles) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('request-files')
            .upload(filePath, file)

          if (uploadError) {
            console.error('ファイルアップロードエラー:', uploadError)
            alert(`ファイル ${file.name} のアップロードに失敗しました`)
            setUploading(false)
            setSubmitting(false)
            return
          }

          const { data: { publicUrl } } = supabase.storage.from('request-files').getPublicUrl(filePath)
          uploadedFileUrls.push(publicUrl)
        }
        setUploading(false)
      }

      const positionsCount = numberOfPositions === '1' ? 1 : parseInt(multiplePositionsCount) || 2
      let budgetMinValue = null, budgetMaxValue = null, priceNegotiable = false

      if (budgetType === 'range') {
        budgetMinValue = budgetMin ? parseInt(budgetMin) : null
        budgetMaxValue = budgetMax ? parseInt(budgetMax) : null
      } else if (budgetType === 'fixed') {
        budgetMinValue = fixedBudget ? parseInt(fixedBudget) : null
        budgetMaxValue = fixedBudget ? parseInt(fixedBudget) : null
      } else if (budgetType === 'negotiable') {
        priceNegotiable = true
      }

      const { data: newRequest, error: requestError } = await supabase
        .from('work_requests')
        .insert({
          requester_id: currentProfileId,
          title: title.trim(),
          description: description.trim(),
          budget_min: budgetMinValue,
          budget_max: budgetMaxValue,
          deadline: deadline || null,
          category: category,
          status: 'open',
          request_type: requestType,
          selected_applicant_id: requestType === 'direct' ? recipientProfile!.id : null,
          reference_urls: referenceUrls.filter(url => url.trim()).length > 0 ? referenceUrls.filter(url => url.trim()) : null,
          required_skills: requiredSkills.length > 0 ? requiredSkills : null,
          attached_file_urls: uploadedFileUrls.length > 0 ? uploadedFileUrls : null,
          payment_type: paymentType,
          hourly_rate_min: paymentType === 'hourly' && hourlyRateMin ? parseInt(hourlyRateMin) : null,
          hourly_rate_max: paymentType === 'hourly' && hourlyRateMax ? parseInt(hourlyRateMax) : null,
          estimated_hours: paymentType === 'hourly' && estimatedHours ? parseInt(estimatedHours) : null,
          job_features: jobFeatures.length > 0 ? jobFeatures : null,
          number_of_positions: positionsCount,
          application_deadline: applicationDeadline || null,
          price_negotiable: priceNegotiable
        })
        .select()
        .single()

      if (requestError) {
        console.error('依頼作成エラー:', requestError)
        alert('依頼の作成に失敗しました')
        setSubmitting(false)
        return
      }

      if (requestType === 'direct' && recipientProfile) {
        const { data: existingRooms } = await supabase
          .from('chat_room_participants')
          .select('chat_room_id')
          .eq('profile_id', currentProfileId)

        let targetRoomId: string | null = null

        if (existingRooms && existingRooms.length > 0) {
          for (const room of existingRooms) {
            const { data: participants } = await supabase
              .from('chat_room_participants')
              .select('profile_id')
              .eq('chat_room_id', room.chat_room_id)

            const profileIds = participants?.map(p => p.profile_id) || []
            if (profileIds.length === 2 && profileIds.includes(recipientProfile.id)) {
              targetRoomId = room.chat_room_id
              break
            }
          }
        }

        if (!targetRoomId) {
          const { data: newRoom, error: roomError } = await supabase
            .from('chat_rooms')
            .insert({ related_request_id: newRequest.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .select()
            .single()

          if (roomError) {
            console.error('チャットルーム作成エラー:', roomError)
            alert(`依頼は作成されましたが、チャットルームの作成に失敗しました`)
            router.push(`/requests/${newRequest.id}`)
            return
          }

          targetRoomId = newRoom.id

          await supabase
            .from('chat_room_participants')
            .insert([
              { chat_room_id: targetRoomId, profile_id: currentProfileId, last_read_at: new Date().toISOString(), pinned: false, hidden: false },
              { chat_room_id: targetRoomId, profile_id: recipientProfile.id, last_read_at: new Date().toISOString(), pinned: false, hidden: false }
            ])
        }

        await supabase
          .from('messages')
          .insert({ chat_room_id: targetRoomId, sender_id: currentProfileId, content: '', request_card_id: newRequest.id, deleted: false, created_at: new Date().toISOString() })

        await supabase
          .from('chat_rooms')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', targetRoomId)

        clearDraft()
        alert('依頼を送信しました！メッセージルームに移動します。')
        router.push(`/messages/${targetRoomId}`)
      } else {
        clearDraft()
        alert('依頼を作成しました！')
        router.push(`/requests/${newRequest.id}`)
      }

    } catch (error) {
      console.error('送信エラー:', error)
      alert('エラーが発生しました')
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.pageWrapper}>
      <DashboardSidebar accountType={accountType} isAdmin={isAdmin} />

      {loading ? (
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <span>読み込み中...</span>
        </div>
      ) : (
        <main className={styles.main}>
          <div className={styles.container}>
            {/* ヘッダー（タイトル + 下書き保存） */}
            <div className={styles.header}>
              <h1 className={styles.title}>
                {requestType === 'direct' && recipientProfile ? '直接依頼を送る' : '依頼を作成'}
              </h1>
              <button type="button" onClick={saveDraft} disabled={submitting || uploading} className={styles.btnDraft}>
                <i className="fas fa-save"></i>下書き保存
              </button>
            </div>

            {requestType === 'direct' && recipientProfile && (
              <div className={styles.recipientCard}>
                <div className={styles.recipientAvatar}>
                  {recipientProfile.avatar_url ? (
                    <img src={recipientProfile.avatar_url} alt={recipientProfile.display_name || ''} />
                  ) : (
                    recipientProfile.display_name?.charAt(0) || '?'
                  )}
                </div>
                <div>
                  <div className={styles.recipientLabel}>依頼先</div>
                  <div className={styles.recipientName}>{recipientProfile.display_name || '名前未設定'}</div>
                </div>
              </div>
            )}

            <form onSubmit={handlePreSubmit} className={styles.formCard}>
              
              {/* カテゴリ */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>カテゴリ <span className={styles.required}>*</span></label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} required className={styles.formSelect}>
                  <option value="">選択してください</option>
                  <option value="illustration">イラスト</option>
                  <option value="manga">マンガ</option>
                  <option value="novel">小説</option>
                  <option value="music">音楽</option>
                  <option value="voice">ボイス</option>
                  <option value="video">動画</option>
                  <option value="logo">ロゴ</option>
                  <option value="design">デザイン</option>
                  <option value="other">その他</option>
                </select>
              </div>

              {/* タイトル */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>依頼タイトル <span className={styles.required}>*</span></label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={getTitlePlaceholder(category)} required className={styles.formInput} />
              </div>

              {/* 説明 */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>依頼内容 <span className={styles.required}>*</span></label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={getDescriptionPlaceholder(category)} required rows={16} className={styles.formTextarea} />
                <div className={styles.warningBox}>
                  <strong>禁止事項:</strong> メールアドレス・電話番号など連絡先の直接掲載、レベニューシェア型契約、正社員・常駐募集、プラットフォーム外取引の誘導
                </div>
              </div>

              {/* 参考URL */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>参考URL</label>
                {referenceUrls.map((url, index) => (
                  <div key={index} className={styles.urlRow}>
                    <input type="url" value={url} onChange={(e) => updateReferenceUrl(index, e.target.value)} placeholder="https://example.com" className={styles.formInput} style={{ flex: 1 }} />
                    {referenceUrls.length > 1 && (
                      <button type="button" onClick={() => removeReferenceUrl(index)} className={styles.btnIconRemove}><i className="fas fa-times"></i></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addReferenceUrl} className={styles.btnAdd}><i className="fas fa-plus"></i>URLを追加</button>
              </div>

              {/* 求めるスキル */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>求めるスキル</label>
                <div className={styles.skillInputRow}>
                  <input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) } }} placeholder="例: Photoshop, Illustrator, HTML" className={styles.formInput} style={{ flex: 1 }} />
                  <button type="button" onClick={() => addSkill(skillInput)} className={styles.btnAddSkill}>追加</button>
                </div>
                <div className={styles.hintText}>スキル名を入力してEnterキーまたは「追加」ボタンで追加</div>
                {requiredSkills.length > 0 && (
                  <div className={styles.skillsList}>
                    {requiredSkills.map((skill, index) => (
                      <span key={index} className={styles.skillItem}>{skill}<button type="button" onClick={() => removeSkill(skill)} className={styles.skillRemove}>×</button></span>
                    ))}
                  </div>
                )}
              </div>

              {/* 添付ファイル */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>添付ファイル</label>
                <input type="file" onChange={handleFileSelect} multiple style={{ display: 'none' }} id="file-upload" />
                <label htmlFor="file-upload" className={styles.fileUploadBtn}><i className="fas fa-paperclip"></i>ファイルを選択</label>
                <div className={styles.hintText}>要件定義書、参考資料などがあれば添付してください（各ファイル100MB以下）</div>
                
                {attachedFiles.length > 0 && (
                  <div className={styles.filesList}>
                    {attachedFiles.map((file, index) => (
                      <div key={index} className={styles.fileItem}>
                        <i className="fas fa-file"></i>
                        <span className={styles.fileName}>{file.name}</span>
                        <span className={styles.fileSize}>({formatFileSize(file.size)})</span>
                        <button type="button" onClick={() => removeFile(index)} className={styles.fileRemove}><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 支払い方式 */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>支払い方式 <span className={styles.required}>*</span></label>
                <div className={styles.radioGroup}>
                  <label className={`${styles.radioCard} ${paymentType === 'fixed' ? styles.active : ''}`}>
                    <input type="radio" name="paymentType" checked={paymentType === 'fixed'} onChange={() => setPaymentType('fixed')} />
                    <span>固定報酬制</span>
                  </label>
                  <label className={`${styles.radioCard} ${paymentType === 'hourly' ? styles.active : ''}`}>
                    <input type="radio" name="paymentType" checked={paymentType === 'hourly'} onChange={() => setPaymentType('hourly')} />
                    <span>時間単価制</span>
                  </label>
                </div>
                <div className={styles.infoBox}>
                  {paymentType === 'fixed' ? '固定報酬制: プロジェクト全体の金額で契約します' : '時間単価制: 時給×作業時間で報酬を計算します'}
                </div>
              </div>

              {/* 予算 */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{paymentType === 'hourly' ? '時給' : '予算'}</label>
                
                {paymentType === 'fixed' && (
                  <>
                    <div className={styles.radioGroupVertical}>
                      <label className={`${styles.radioCardFull} ${budgetType === 'range' ? styles.active : ''}`}>
                        <input type="radio" name="budgetType" checked={budgetType === 'range'} onChange={() => setBudgetType('range')} />
                        <span>金額を範囲で指定する</span>
                      </label>
                      <label className={`${styles.radioCardFull} ${budgetType === 'fixed' ? styles.active : ''}`}>
                        <input type="radio" name="budgetType" checked={budgetType === 'fixed'} onChange={() => setBudgetType('fixed')} />
                        <span>特定の金額を入力する</span>
                      </label>
                      <label className={`${styles.radioCardFull} ${budgetType === 'negotiable' ? styles.active : ''}`}>
                        <input type="radio" name="budgetType" checked={budgetType === 'negotiable'} onChange={() => setBudgetType('negotiable')} />
                        <span>指定しない（クリエイターと相談して決める）</span>
                      </label>
                    </div>

                    {budgetType === 'range' && (
                      <div className={styles.priceRangeRow}>
                        <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="最低金額" min="0" className={styles.formInput} />
                        <span className={styles.rangeSeparator}>〜</span>
                        <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="最高金額" min="0" className={styles.formInput} />
                        <span className={styles.unit}>円</span>
                      </div>
                    )}

                    {budgetType === 'fixed' && (
                      <div className={styles.priceSingleRow}>
                        <input type="number" value={fixedBudget} onChange={(e) => setFixedBudget(e.target.value)} placeholder="金額を入力" min="0" className={styles.formInput} style={{ flex: 1 }} />
                        <span className={styles.unit}>円</span>
                      </div>
                    )}

                    {budgetType === 'negotiable' && (<div className={styles.infoBox}>予算は応募者と相談して決定します</div>)}
                  </>
                )}

                {paymentType === 'hourly' && (
                  <>
                    <div className={styles.subLabel}>時給（範囲）</div>
                    <div className={styles.priceRangeRow}>
                      <input type="number" value={hourlyRateMin} onChange={(e) => setHourlyRateMin(e.target.value)} placeholder="最低時給" min="0" className={styles.formInput} />
                      <span className={styles.rangeSeparator}>〜</span>
                      <input type="number" value={hourlyRateMax} onChange={(e) => setHourlyRateMax(e.target.value)} placeholder="最高時給" min="0" className={styles.formInput} />
                      <span className={styles.unit}>円</span>
                    </div>

                    <div className={styles.subLabel} style={{ marginTop: '16px' }}>想定作業時間</div>
                    <div className={styles.priceSingleRow}>
                      <input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} placeholder="例: 20" min="0" className={styles.formInput} style={{ width: '150px' }} />
                      <span className={styles.unit}>時間</span>
                    </div>
                    <div className={styles.infoBox}>実際の作業時間に応じて報酬が決まります</div>
                  </>
                )}
              </div>

              {/* この仕事の特徴 */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>この仕事の特徴</label>
                <div className={styles.checkboxGrid}>
                  {[
                    { value: 'no_skill', label: 'スキル不要' },
                    { value: 'skill_welcome', label: '専門スキル歓迎' },
                    { value: 'one_time', label: '単発' },
                    { value: 'continuous', label: '継続あり' },
                    { value: 'flexible_time', label: 'スキマ時間歓迎' }
                  ].map(feature => (
                    <label key={feature.value} className={`${styles.checkboxCard} ${jobFeatures.includes(feature.value) ? styles.active : ''}`}>
                      <input type="checkbox" checked={jobFeatures.includes(feature.value)} onChange={() => toggleJobFeature(feature.value)} />
                      {feature.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* 納期 */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>希望納期</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={styles.formInput} min={new Date().toISOString().split('T')[0]} style={{ maxWidth: '250px' }} />
              </div>

              {/* 募集人数 */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>募集人数 <span className={styles.required}>*</span></label>
                <div className={styles.radioGroupVertical}>
                  <label className={`${styles.radioCardFull} ${numberOfPositions === '1' ? styles.active : ''}`}>
                    <input type="radio" name="numberOfPositions" checked={numberOfPositions === '1'} onChange={() => setNumberOfPositions('1')} />
                    <span>1人</span>
                  </label>
                  <div>
                    <label className={`${styles.radioCardFull} ${numberOfPositions === 'multiple' ? styles.active : ''}`} onClick={() => setNumberOfPositions('multiple')}>
                      <input type="radio" name="numberOfPositions" checked={numberOfPositions === 'multiple'} onChange={() => setNumberOfPositions('multiple')} />
                      <span>2人以上</span>
                    </label>
                    {numberOfPositions === 'multiple' && (
                      <div className={styles.nestedInput}>
                        <input type="number" value={multiplePositionsCount} onChange={(e) => setMultiplePositionsCount(e.target.value)} placeholder="人数を入力" min="2" className={styles.formInput} style={{ width: '150px' }} />
                        <span className={styles.unit}>人</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 応募期限 */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>応募期限 <span className={styles.required}>*</span></label>
                <input type="date" value={applicationDeadline} onChange={(e) => setApplicationDeadline(e.target.value)} className={styles.formInput} min={new Date().toISOString().split('T')[0]} required style={{ maxWidth: '250px' }} />
                <div className={styles.hintText}>この日までクリエイターが応募できます（デフォルト: 14日後）</div>
              </div>

              {/* 注意事項 */}
              <div className={styles.noticeBox}>
                <h3><i className="fas fa-info-circle"></i>{requestType === 'direct' ? '直接依頼について' : '公開依頼について'}</h3>
                <ul>
                  {requestType === 'direct' ? (
                    <>
                      <li>この依頼は{recipientProfile?.display_name}さんに直接送られます</li>
                      <li>送信後、メッセージで詳細のやり取りができます</li>
                      <li>条件が合意できたら、お仕事を開始できます</li>
                    </>
                  ) : (
                    <>
                      <li>この依頼は公開され、全てのクリエイターが応募できます</li>
                      <li>応募者の中から1名を選んで採用できます</li>
                      <li>採用後、メッセージで詳細のやり取りができます</li>
                    </>
                  )}
                </ul>
              </div>

              {/* ボタン */}
              <div className={styles.buttonGroup}>
                <button type="button" onClick={() => router.back()} disabled={submitting || uploading} className={`${styles.btn} ${styles.secondary}`}>
                  キャンセル
                </button>
                <button type="submit" disabled={submitting || uploading} className={`${styles.btn} ${styles.primary}`}>
                  {uploading ? (<><i className="fas fa-spinner fa-spin"></i> アップロード中...</>) 
                    : submitting ? (<><i className="fas fa-spinner fa-spin"></i> 送信中...</>) 
                    : (requestType === 'direct' ? '依頼を送る' : '依頼を公開する')}
                </button>
              </div>
            </form>

            {showConfirmModal && (
              <ConfirmModal
                requestType={requestType} category={category} title={title} description={description}
                referenceUrls={referenceUrls} requiredSkills={requiredSkills} attachedFiles={attachedFiles}
                paymentType={paymentType} budgetType={budgetType} budgetMin={budgetMin} budgetMax={budgetMax}
                fixedBudget={fixedBudget} hourlyRateMin={hourlyRateMin} hourlyRateMax={hourlyRateMax}
                estimatedHours={estimatedHours} jobFeatures={jobFeatures} deadline={deadline}
                numberOfPositions={numberOfPositions} multiplePositionsCount={multiplePositionsCount}
                applicationDeadline={applicationDeadline}
                onConfirm={handleConfirmedSubmit} onCancel={() => setShowConfirmModal(false)}
              />
            )}
          </div>
        </main>
      )}
    </div>
  )
}

export default function CreateRequestClient() {
  return (
    <>
      <Header />
      <Suspense fallback={
        <div className={styles.pageWrapper}>
          <div className={styles.loading}>
            <i className="fas fa-spinner fa-spin"></i>
            <span>読み込み中...</span>
          </div>
        </div>
      }>
        <CreateRequestContent />
      </Suspense>
      <Footer />
    </>
  )
}