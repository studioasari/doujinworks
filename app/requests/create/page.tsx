'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

// 確認モーダルコンポーネント
function ConfirmModal({ 
  requestType,
  category,
  title, 
  description, 
  referenceUrls,
  requiredSkills,
  attachedFiles,
  paymentType,
  budgetType,
  budgetMin,
  budgetMax,
  fixedBudget,
  hourlyRateMin,
  hourlyRateMax,
  estimatedHours,
  jobFeatures,
  deadline,
  numberOfPositions,
  multiplePositionsCount,
  applicationDeadline,
  onConfirm, 
  onCancel 
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
    illustration: 'イラスト',
    manga: 'マンガ',
    novel: '小説',
    music: '音楽',
    voice: 'ボイス',
    video: '動画',
    logo: 'ロゴ',
    design: 'デザイン',
    other: 'その他'
  }

  const jobFeatureLabels: { [key: string]: string } = {
    no_skill: 'スキル不要',
    skill_welcome: '専門スキル歓迎',
    one_time: '単発',
    continuous: '継続あり',
    flexible_time: 'スキマ時間歓迎'
  }

  const positionsCount = numberOfPositions === '1' ? 1 : parseInt(multiplePositionsCount) || 2

  // モーダル表示中はスクロール無効化
  useEffect(() => {
    // 現在のスクロール位置を保存
    const scrollY = window.scrollY
    
    document.body.classList.add('modal-open')
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    
    return () => {
      document.body.classList.remove('modal-open')
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      
      // スクロール位置を復元
      window.scrollTo(0, scrollY)
    }
  }, [])

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
        padding: '16px',
        overflowY: 'auto'
      }}
      onClick={onCancel}
    >
      <div
        className="card-no-hover confirm-modal-content"
        style={{
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '40px',
          backgroundColor: '#FFFFFF'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          marginBottom: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="fas fa-check-circle" style={{ color: '#4CAF50' }}></i>
          依頼内容の確認
        </h2>

        {/* カテゴリ */}
        <div style={{ 
          paddingBottom: '24px',
          marginBottom: '24px',
          borderBottom: '1px solid #E5E5E5'
        }}>
          <div style={{ 
            fontSize: '13px',
            color: '#6B6B6B',
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            カテゴリ
          </div>
          <div style={{ 
            fontSize: '14px',
            color: '#1A1A1A'
          }}>
            {categoryLabels[category] || category}
          </div>
        </div>

        {/* タイトル */}
        <div style={{ 
          paddingBottom: '24px',
          marginBottom: '24px',
          borderBottom: '1px solid #E5E5E5'
        }}>
          <div style={{ 
            fontSize: '13px',
            color: '#6B6B6B',
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            タイトル
          </div>
          <div style={{ 
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1A1A1A'
          }}>
            {title}
          </div>
        </div>

        {/* 説明 */}
        <div style={{ 
          paddingBottom: '24px',
          marginBottom: '24px',
          borderBottom: '1px solid #E5E5E5'
        }}>
          <div style={{ 
            fontSize: '13px',
            color: '#6B6B6B',
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            依頼内容
          </div>
          <div style={{ 
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#1A1A1A',
            whiteSpace: 'pre-wrap'
          }}>
            {description}
          </div>
        </div>

        {/* 参考URL */}
        {referenceUrls.filter(url => url.trim()).length > 0 && (
          <div style={{ 
            paddingBottom: '24px',
            marginBottom: '24px',
            borderBottom: '1px solid #E5E5E5'
          }}>
            <div style={{ 
              fontSize: '13px',
              color: '#6B6B6B',
              marginBottom: '8px',
              fontWeight: 'bold'
            }}>
              参考URL
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {referenceUrls.filter(url => url.trim()).map((url, index) => (
                <a 
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    fontSize: '14px',
                    color: '#1A73E8',
                    textDecoration: 'underline',
                    wordBreak: 'break-all'
                  }}
                >
                  {url}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 求めるスキル */}
        {requiredSkills.length > 0 && (
          <div style={{ 
            paddingBottom: '24px',
            marginBottom: '24px',
            borderBottom: '1px solid #E5E5E5'
          }}>
            <div style={{ 
              fontSize: '13px',
              color: '#6B6B6B',
              marginBottom: '12px',
              fontWeight: 'bold'
            }}>
              求めるスキル
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {requiredSkills.map((skill, index) => (
                <span key={index} style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  backgroundColor: '#F5F5F5',
                  border: '1px solid #E5E5E5',
                  borderRadius: '16px',
                  fontSize: '13px',
                  color: '#1A1A1A'
                }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 添付ファイル */}
        {attachedFiles.length > 0 && (
          <div style={{ 
            paddingBottom: '24px',
            marginBottom: '24px',
            borderBottom: '1px solid #E5E5E5'
          }}>
            <div style={{ 
              fontSize: '13px',
              color: '#6B6B6B',
              marginBottom: '12px',
              fontWeight: 'bold'
            }}>
              添付ファイル ({attachedFiles.length}件)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attachedFiles.map((file, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#F9F9F9',
                  borderRadius: '4px'
                }}>
                  <i className="fas fa-file" style={{ color: '#6B6B6B', fontSize: '14px' }}></i>
                  <span style={{ fontSize: '13px', color: '#1A1A1A', flex: 1 }}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B6B6B' }}>
                    ({formatFileSize(file.size)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 支払い方式と予算 */}
        <div style={{ 
          paddingBottom: '24px',
          marginBottom: '24px',
          borderBottom: '1px solid #E5E5E5'
        }}>
          <div style={{ 
            fontSize: '13px',
            color: '#6B6B6B',
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            支払い方式・予算
          </div>
          <div style={{ fontSize: '14px', color: '#1A1A1A' }}>
            {paymentType === 'fixed' ? '固定報酬制' : '時間単価制'}
            <br />
            {paymentType === 'fixed' ? (
              budgetType === 'negotiable' ? (
                <span style={{ color: '#6B6B6B' }}>金額は相談して決定</span>
              ) : budgetType === 'fixed' && fixedBudget ? (
                <span>{parseInt(fixedBudget).toLocaleString()}円</span>
              ) : budgetMin || budgetMax ? (
                <span>
                  {budgetMin && parseInt(budgetMin).toLocaleString()}円 
                  {budgetMin && budgetMax && ' 〜 '}
                  {budgetMax && parseInt(budgetMax).toLocaleString()}円
                </span>
              ) : (
                <span style={{ color: '#6B6B6B' }}>金額未設定</span>
              )
            ) : (
              <>
                時給: {hourlyRateMin && parseInt(hourlyRateMin).toLocaleString()}円
                {hourlyRateMin && hourlyRateMax && ' 〜 '}
                {hourlyRateMax && parseInt(hourlyRateMax).toLocaleString()}円
                {estimatedHours && (
                  <>
                    <br />
                    想定作業時間: {estimatedHours}時間
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* この仕事の特徴 */}
        {jobFeatures.length > 0 && (
          <div style={{ 
            paddingBottom: '24px',
            marginBottom: '24px',
            borderBottom: '1px solid #E5E5E5'
          }}>
            <div style={{ 
              fontSize: '13px',
              color: '#6B6B6B',
              marginBottom: '12px',
              fontWeight: 'bold'
            }}>
              この仕事の特徴
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {jobFeatures.map((feature, index) => (
                <span key={index} style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  backgroundColor: '#F5F5F5',
                  border: '1px solid #E5E5E5',
                  borderRadius: '16px',
                  fontSize: '13px',
                  color: '#1A1A1A'
                }}>
                  {jobFeatureLabels[feature] || feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 希望納期 */}
        {deadline && (
          <div style={{ 
            paddingBottom: '24px',
            marginBottom: '24px',
            borderBottom: '1px solid #E5E5E5'
          }}>
            <div style={{ 
              fontSize: '13px',
              color: '#6B6B6B',
              marginBottom: '8px',
              fontWeight: 'bold'
            }}>
              希望納期
            </div>
            <div style={{ fontSize: '14px', color: '#1A1A1A' }}>
              {new Date(deadline).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        )}

        {/* 募集人数 */}
        <div style={{ 
          paddingBottom: '24px',
          marginBottom: '24px',
          borderBottom: '1px solid #E5E5E5'
        }}>
          <div style={{ 
            fontSize: '13px',
            color: '#6B6B6B',
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            募集人数
          </div>
          <div style={{ fontSize: '14px', color: '#1A1A1A' }}>
            {positionsCount}人
          </div>
        </div>

        {/* 応募期限 */}
        <div style={{ 
          paddingBottom: '32px',
          marginBottom: '32px',
          borderBottom: '1px solid #E5E5E5'
        }}>
          <div style={{ 
            fontSize: '13px',
            color: '#6B6B6B',
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            応募期限
          </div>
          <div style={{ fontSize: '14px', color: '#1A1A1A' }}>
            {new Date(applicationDeadline).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* ボタン */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '14px 24px',
              border: '2px solid #E5E5E5',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              color: '#1A1A1A',
              transition: 'all 0.2s ease'
            }}
          >
            修正する
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '14px 24px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#1A1A1A',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
          >
            {requestType === 'direct' ? '確定して送信する' : '確定して公開する'}
          </button>
        </div>
      </div>
    </div>
  )
}

// useSearchParams()を使うコンポーネントを分離
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
  const [recipientProfile, setRecipientProfile] = useState<Profile | null>(null)
  const [requestType, setRequestType] = useState<'public' | 'direct'>('public')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const toUsername = searchParams.get('to')

  // この仕事の特徴のトグル
  function toggleJobFeature(feature: string) {
    if (jobFeatures.includes(feature)) {
      setJobFeatures(jobFeatures.filter(f => f !== feature))
    } else {
      setJobFeatures([...jobFeatures, feature])
    }
  }

  // 参考URLの追加・削除
  function addReferenceUrl() {
    setReferenceUrls([...referenceUrls, ''])
  }

  function removeReferenceUrl(index: number) {
    setReferenceUrls(referenceUrls.filter((_, i) => i !== index))
  }

  function updateReferenceUrl(index: number, value: string) {
    const newUrls = [...referenceUrls]
    newUrls[index] = value
    setReferenceUrls(newUrls)
  }

  // スキルの追加・削除
  function addSkill(skill: string) {
    if (skill.trim() && !requiredSkills.includes(skill.trim())) {
      setRequiredSkills([...requiredSkills, skill.trim()])
      setSkillInput('')
    }
  }

  function removeSkill(skill: string) {
    setRequiredSkills(requiredSkills.filter(s => s !== skill))
  }

  // ファイルの追加・削除
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    
    // 100MB制限チェック
    const maxSize = 100 * 1024 * 1024 // 100MB
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`${file.name} は100MBを超えているため追加できません`)
        return false
      }
      return true
    })

    setAttachedFiles([...attachedFiles, ...validFiles])
    
    // input要素をリセット（同じファイルを再選択できるように）
    e.target.value = ''
  }

  function removeFile(index: number) {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index))
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // カテゴリごとのプレースホルダー
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
      novel: '依頼内容を詳しく記載してください\n\n例:\n・文字数: 5,000〜10,000字\n・ジャンル: ファンタジー\n・テーマ: 冒険と友情\n・納品形式: テキストファイル',
      music: '依頼内容を詳しく記載してください\n\n例:\n・用途: ゲームのBGM\n・長さ: 2〜3分\n・イメージ: 明るく爽やか\n・納品形式: MP3、WAV',
      voice: '依頼内容を詳しく記載してください\n\n例:\n・用途: YouTube動画のナレーション\n・文字数: 約1,000字\n・声質: 落ち着いた男性/女性\n・納品形式: MP3、WAV',
      video: '依頼内容を詳しく記載してください\n\n例:\n・動画の長さ: 5〜10分\n・編集内容: カット、テロップ、BGM挿入\n・素材: こちらで用意します\n・納品形式: MP4',
      logo: '依頼内容を詳しく記載してください\n\n例:\n・用途: 企業ロゴ\n・イメージ: シンプルでモダン\n・色: 青系統\n・納品形式: AI、PNG（透過背景）',
      design: '依頼内容を詳しく記載してください\n\n例:\n・制作物: A4チラシ\n・用途: イベント告知\n・イメージ: ポップで明るい\n・納品形式: PDF、AI',
      other: '依頼内容を詳しく記載してください\n\n例:\n・制作物の種類\n・用途\n・イメージ\n・納品形式'
    }
    return placeholders[category] || '依頼内容を詳しく記載してください'
  }

  useEffect(() => {
    checkAuth()
    
    // 応募期限のデフォルト値（14日後）を設定
    const defaultDeadline = new Date()
    defaultDeadline.setDate(defaultDeadline.getDate() + 14)
    setApplicationDeadline(defaultDeadline.toISOString().split('T')[0])

    // 下書きを読み込み
    loadDraft()
  }, [])

  // 下書きを保存
  function saveDraft() {
    const draft = {
      title,
      description,
      category,
      paymentType,
      budgetType,
      budgetMin,
      budgetMax,
      fixedBudget,
      hourlyRateMin,
      hourlyRateMax,
      estimatedHours,
      deadline,
      referenceUrls,
      requiredSkills,
      jobFeatures,
      numberOfPositions,
      multiplePositionsCount,
      applicationDeadline
    }
    
    localStorage.setItem('request_draft', JSON.stringify(draft))
    alert('下書きを保存しました')
  }

  // 下書きを読み込み
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

  // 下書きを削除
  function clearDraft() {
    localStorage.removeItem('request_draft')
  }

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
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentProfileId(profile.id)
    } else {
      alert('プロフィールが見つかりません')
      router.push('/profile')
    }
  }

  async function fetchRecipient() {
    if (!toUsername) {
      setLoading(false)
      return
    }

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

    if (!title.trim() || !description.trim()) {
      alert('タイトルと依頼内容は必須です')
      return
    }

    if (!category) {
      alert('カテゴリを選択してください')
      return
    }

    if (requestType === 'direct' && !recipientProfile) {
      alert('受取人が設定されていません')
      return
    }

    // 確認モーダルを表示
    setShowConfirmModal(true)
  }

  async function handleConfirmedSubmit() {
    setShowConfirmModal(false)
    setSubmitting(true)

    try {
      // ファイルをアップロード
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

          // 公開URLを取得
          const { data: { publicUrl } } = supabase.storage
            .from('request-files')
            .getPublicUrl(filePath)
          
          uploadedFileUrls.push(publicUrl)
        }
        
        setUploading(false)
      }

      // 募集人数を計算
      const positionsCount = numberOfPositions === '1' ? 1 : parseInt(multiplePositionsCount) || 2

      // 予算を計算
      let budgetMinValue = null
      let budgetMaxValue = null
      let priceNegotiable = false

      if (budgetType === 'range') {
        budgetMinValue = budgetMin ? parseInt(budgetMin) : null
        budgetMaxValue = budgetMax ? parseInt(budgetMax) : null
      } else if (budgetType === 'fixed') {
        budgetMinValue = fixedBudget ? parseInt(fixedBudget) : null
        budgetMaxValue = fixedBudget ? parseInt(fixedBudget) : null
      } else if (budgetType === 'negotiable') {
        priceNegotiable = true
      }

      // デバッグ用：新しい項目を確認
      console.log('新しい項目:', {
        referenceUrls: referenceUrls.filter(url => url.trim()),
        requiredSkills,
        attachedFileUrls: uploadedFileUrls,
        paymentType,
        hourlyRate: paymentType === 'hourly' ? { min: hourlyRateMin, max: hourlyRateMax, estimatedHours } : null,
        jobFeatures,
        applicationDeadline,
        numberOfPositions: positionsCount,
        budgetType,
        priceNegotiable
      })

      // 1. 依頼を作成
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
          // 新しい項目
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

      // 2. 直接依頼の場合はチャットルームを作成
      if (requestType === 'direct' && recipientProfile) {
        // 既存のチャットルームをチェック
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

        // ルームがなければ新規作成
        if (!targetRoomId) {
          const { data: newRoom, error: roomError } = await supabase
            .from('chat_rooms')
            .insert({
              related_request_id: newRequest.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (roomError) {
            console.error('チャットルーム作成エラー:', roomError)
            alert(`依頼は作成されましたが、チャットルームの作成に失敗しました`)
            router.push(`/requests/${newRequest.id}`)
            return
          }

          targetRoomId = newRoom.id

          // 参加者を追加
          await supabase
            .from('chat_room_participants')
            .insert([
              {
                chat_room_id: targetRoomId,
                profile_id: currentProfileId,
                last_read_at: new Date().toISOString(),
                pinned: false,
                hidden: false
              },
              {
                chat_room_id: targetRoomId,
                profile_id: recipientProfile.id,
                last_read_at: new Date().toISOString(),
                pinned: false,
                hidden: false
              }
            ])
        }

        // 依頼カードメッセージを送信
        await supabase
          .from('messages')
          .insert({
            chat_room_id: targetRoomId,
            sender_id: currentProfileId,
            content: '',
            request_card_id: newRequest.id,
            deleted: false,
            created_at: new Date().toISOString()
          })

        // updated_at更新
        await supabase
          .from('chat_rooms')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', targetRoomId)

        // 下書きを削除
        clearDraft()

        alert('依頼を送信しました！メッセージルームに移動します。')
        router.push(`/messages/${targetRoomId}`)
      } else {
        // 下書きを削除
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="loading-state">読み込み中...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
      <div className="container-narrow" style={{ padding: '40px 20px' }}>
        <h1 className="page-title mb-40">
          {requestType === 'direct' && recipientProfile ? '直接依頼を送る' : '公開依頼を作成'}
        </h1>

        {/* 直接依頼の場合、受取人を表示 */}
        {requestType === 'direct' && recipientProfile && (
          <div className="card-no-hover p-24 mb-32" style={{ backgroundColor: '#F9F9F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#E5E5E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                fontSize: '20px',
                color: '#6B6B6B'
              }}>
                {recipientProfile.avatar_url ? (
                  <img 
                    src={recipientProfile.avatar_url} 
                    alt={recipientProfile.display_name || ''} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  recipientProfile.display_name?.charAt(0) || '?'
                )}
              </div>
              <div>
                <div className="text-tiny text-gray">依頼先</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>
                  {recipientProfile.display_name || '名前未設定'}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handlePreSubmit} className="card-no-hover p-40">
          
          {/* カテゴリ */}
          <div className="mb-24">
            <label className="form-label">
              カテゴリ <span className="form-required">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="select-field"
            >
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
          <div className="mb-24">
            <label className="form-label">
              依頼タイトル <span className="form-required">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={getTitlePlaceholder(category)}
              required
              className="input-field"
            />
          </div>

          {/* 説明 */}
          <div className="mb-24">
            <label className="form-label">
              依頼内容 <span className="form-required">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={getDescriptionPlaceholder(category)}
              required
              rows={20}
              className="textarea-field"
              style={{ whiteSpace: 'pre-wrap' }}
            />
            {/* 控えめな禁止事項 */}
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: '#FFF9F5',
              border: '1px solid #FFE0CC',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#D84315'
            }}>
              <strong>禁止事項:</strong> メールアドレス・電話番号など連絡先の直接掲載、レベニューシェア型契約、正社員・常駐募集、プラットフォーム外取引の誘導
            </div>
          </div>

          {/* 参考URL */}
          <div className="mb-24">
            <label className="form-label">参考URL</label>
            {referenceUrls.map((url, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateReferenceUrl(index, e.target.value)}
                  placeholder="https://example.com"
                  className="input-field"
                  style={{ flex: 1 }}
                />
                {referenceUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeReferenceUrl(index)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #E5E5E5',
                      borderRadius: '4px',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#6B6B6B'
                    }}
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addReferenceUrl}
              style={{
                padding: '8px 16px',
                border: '1px solid #E5E5E5',
                borderRadius: '4px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#1A1A1A',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-plus"></i>
              URLを追加
            </button>
          </div>

          {/* 求めるスキル */}
          <div className="mb-24">
            <label className="form-label">求めるスキル</label>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addSkill(skillInput)
                    }
                  }}
                  placeholder="例: Photoshop, Illustrator, HTML"
                  className="input-field"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => addSkill(skillInput)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#1A1A1A',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  追加
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '4px' }}>
                スキル名を入力してEnterキーまたは「追加」ボタンで追加できます
              </div>
            </div>
            {requiredSkills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {requiredSkills.map((skill, index) => (
                  <span
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      backgroundColor: '#F5F5F5',
                      border: '1px solid #E5E5E5',
                      borderRadius: '16px',
                      fontSize: '13px',
                      color: '#1A1A1A'
                    }}
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0',
                        color: '#6B6B6B',
                        fontSize: '14px'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 添付ファイル */}
          <div className="mb-24">
            <label className="form-label">添付ファイル</label>
            <div style={{ marginBottom: '8px' }}>
              <input
                type="file"
                onChange={handleFileSelect}
                multiple
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '4px',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#1A1A1A',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F9F9F9'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
              >
                <i className="fas fa-paperclip"></i>
                ファイルを選択
              </label>
              <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '4px' }}>
                要件定義書、参考資料などがあれば添付してください（各ファイル100MB以下）
              </div>
            </div>
            
            {attachedFiles.length > 0 && (
              <div>
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      marginBottom: index < attachedFiles.length - 1 ? '8px' : '0',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '4px',
                      border: '1px solid #E5E5E5'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <i className="fas fa-file" style={{ color: '#6B6B6B', fontSize: '14px' }}></i>
                      <span style={{ 
                        fontSize: '13px', 
                        color: '#1A1A1A',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {file.name}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6B6B6B', flexShrink: 0 }}>
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      style={{
                        padding: '4px 8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#6B6B6B'
                      }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 支払い方式 */}
          <div className="mb-24">
            <label className="form-label">
              支払い方式 <span className="form-required">*</span>
            </label>
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <label style={{
                flex: '1 1 calc(50% - 6px)',
                minWidth: '200px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: paymentType === 'fixed' ? '2px solid #1A1A1A' : '2px solid #E5E5E5',
                borderRadius: '8px',
                backgroundColor: paymentType === 'fixed' ? '#FAFAFA' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name="paymentType"
                  checked={paymentType === 'fixed'}
                  onChange={() => setPaymentType('fixed')}
                  style={{ 
                    width: '18px', 
                    height: '18px', 
                    cursor: 'pointer',
                    accentColor: '#1A1A1A'
                  }}
                />
                <span style={{ fontSize: '14px', fontWeight: paymentType === 'fixed' ? '600' : '400' }}>
                  固定報酬制
                </span>
              </label>
              <label style={{
                flex: '1 1 calc(50% - 6px)',
                minWidth: '200px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: paymentType === 'hourly' ? '2px solid #1A1A1A' : '2px solid #E5E5E5',
                borderRadius: '8px',
                backgroundColor: paymentType === 'hourly' ? '#FAFAFA' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name="paymentType"
                  checked={paymentType === 'hourly'}
                  onChange={() => setPaymentType('hourly')}
                  style={{ 
                    width: '18px', 
                    height: '18px', 
                    cursor: 'pointer',
                    accentColor: '#1A1A1A'
                  }}
                />
                <span style={{ fontSize: '14px', fontWeight: paymentType === 'hourly' ? '600' : '400' }}>
                  時間単価制
                </span>
              </label>
            </div>
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: '#F9F9F9',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#6B6B6B'
            }}>
              {paymentType === 'fixed' 
                ? '固定報酬制: プロジェクト全体の金額で契約します'
                : '時間単価制: 時給×作業時間で報酬を計算します'
              }
            </div>
          </div>

          {/* 予算 */}
          <div className="mb-24">
            <label className="form-label">
              {paymentType === 'hourly' ? '時給' : '予算'}
            </label>
            
            {/* 固定報酬制の場合 */}
            {paymentType === 'fixed' && (
              <>
                {/* 予算タイプ選択 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    border: budgetType === 'range' ? '2px solid #1A1A1A' : '2px solid #E5E5E5',
                    borderRadius: '8px',
                    backgroundColor: budgetType === 'range' ? '#FAFAFA' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="radio"
                      name="budgetType"
                      checked={budgetType === 'range'}
                      onChange={() => setBudgetType('range')}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        cursor: 'pointer',
                        accentColor: '#1A1A1A'
                      }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: budgetType === 'range' ? '600' : '400' }}>
                      金額を範囲で指定する
                    </span>
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    border: budgetType === 'fixed' ? '2px solid #1A1A1A' : '2px solid #E5E5E5',
                    borderRadius: '8px',
                    backgroundColor: budgetType === 'fixed' ? '#FAFAFA' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="radio"
                      name="budgetType"
                      checked={budgetType === 'fixed'}
                      onChange={() => setBudgetType('fixed')}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        cursor: 'pointer',
                        accentColor: '#1A1A1A'
                      }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: budgetType === 'fixed' ? '600' : '400' }}>
                      特定の金額を入力する
                    </span>
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    border: budgetType === 'negotiable' ? '2px solid #1A1A1A' : '2px solid #E5E5E5',
                    borderRadius: '8px',
                    backgroundColor: budgetType === 'negotiable' ? '#FAFAFA' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="radio"
                      name="budgetType"
                      checked={budgetType === 'negotiable'}
                      onChange={() => setBudgetType('negotiable')}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        cursor: 'pointer',
                        accentColor: '#1A1A1A'
                      }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: budgetType === 'negotiable' ? '600' : '400' }}>
                      指定しない（クリエイターと相談して決める）
                    </span>
                  </label>
                </div>

                {/* 範囲指定 */}
                {budgetType === 'range' && (
                  <div className="flex gap-16" style={{ alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="number"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(e.target.value)}
                        placeholder="最低金額"
                        min="0"
                        className="input-field"
                      />
                    </div>
                    <span className="text-gray">〜</span>
                    <div style={{ flex: 1 }}>
                      <input
                        type="number"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(e.target.value)}
                        placeholder="最高金額"
                        min="0"
                        className="input-field"
                      />
                    </div>
                    <span className="text-gray">円</span>
                  </div>
                )}

                {/* 固定金額 */}
                {budgetType === 'fixed' && (
                  <div className="flex gap-16" style={{ alignItems: 'center' }}>
                    <input
                      type="number"
                      value={fixedBudget}
                      onChange={(e) => setFixedBudget(e.target.value)}
                      placeholder="金額を入力"
                      min="0"
                      className="input-field"
                      style={{ flex: 1 }}
                    />
                    <span className="text-gray">円</span>
                  </div>
                )}

                {/* 相談する場合のメッセージ */}
                {budgetType === 'negotiable' && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#F9F9F9',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#6B6B6B'
                  }}>
                    予算は応募者と相談して決定します
                  </div>
                )}
              </>
            )}

            {/* 時間単価制の場合 */}
            {paymentType === 'hourly' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label className="text-small text-gray" style={{ marginBottom: '8px', display: 'block' }}>
                    時給（範囲）
                  </label>
                  <div className="flex gap-16" style={{ alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="number"
                        value={hourlyRateMin}
                        onChange={(e) => setHourlyRateMin(e.target.value)}
                        placeholder="最低時給"
                        min="0"
                        className="input-field"
                      />
                    </div>
                    <span className="text-gray">〜</span>
                    <div style={{ flex: 1 }}>
                      <input
                        type="number"
                        value={hourlyRateMax}
                        onChange={(e) => setHourlyRateMax(e.target.value)}
                        placeholder="最高時給"
                        min="0"
                        className="input-field"
                      />
                    </div>
                    <span className="text-gray">円</span>
                  </div>
                </div>

                <div>
                  <label className="text-small text-gray" style={{ marginBottom: '8px', display: 'block' }}>
                    想定作業時間
                  </label>
                  <div className="flex gap-16" style={{ alignItems: 'center' }}>
                    <input
                      type="number"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      placeholder="例: 20"
                      min="0"
                      className="input-field"
                      style={{ width: '150px' }}
                    />
                    <span className="text-gray">時間</span>
                  </div>
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#F9F9F9',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#6B6B6B'
                  }}>
                    実際の作業時間に応じて報酬が決まります
                  </div>
                </div>
              </>
            )}
          </div>

          {/* この仕事の特徴 */}
          <div className="mb-24">
            <label className="form-label">この仕事の特徴</label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px',
              marginTop: '8px'
            }}>
              {[
                { value: 'no_skill', label: 'スキル不要' },
                { value: 'skill_welcome', label: '専門スキル歓迎' },
                { value: 'one_time', label: '単発' },
                { value: 'continuous', label: '継続あり' },
                { value: 'flexible_time', label: 'スキマ時間歓迎' }
              ].map(feature => (
                <label
                  key={feature.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    border: jobFeatures.includes(feature.value) ? '2px solid #1A1A1A' : '2px solid #E5E5E5',
                    borderRadius: '8px',
                    backgroundColor: jobFeatures.includes(feature.value) ? '#FAFAFA' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '14px',
                    fontWeight: jobFeatures.includes(feature.value) ? '600' : '400'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={jobFeatures.includes(feature.value)}
                    onChange={() => toggleJobFeature(feature.value)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#1A1A1A'
                    }}
                  />
                  {feature.label}
                </label>
              ))}
            </div>
          </div>

          {/* 納期 */}
          <div className="mb-24">
            <label className="form-label">希望納期</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input-field"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* 募集人数 */}
          <div className="mb-24">
            <label className="form-label">
              募集人数 <span className="form-required">*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: numberOfPositions === '1' ? '2px solid #1A1A1A' : '2px solid #E5E5E5',
                borderRadius: '8px',
                backgroundColor: numberOfPositions === '1' ? '#FAFAFA' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name="numberOfPositions"
                  checked={numberOfPositions === '1'}
                  onChange={() => setNumberOfPositions('1')}
                  style={{ 
                    width: '18px', 
                    height: '18px', 
                    cursor: 'pointer',
                    accentColor: '#1A1A1A'
                  }}
                />
                <span style={{ fontSize: '14px', fontWeight: numberOfPositions === '1' ? '600' : '400' }}>
                  1人
                </span>
              </label>
              <div>
                <label 
                  onClick={() => setNumberOfPositions('multiple')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    border: numberOfPositions === 'multiple' ? '2px solid #1A1A1A' : '2px solid #E5E5E5',
                    borderRadius: '8px',
                    backgroundColor: numberOfPositions === 'multiple' ? '#FAFAFA' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="numberOfPositions"
                    checked={numberOfPositions === 'multiple'}
                    onChange={() => setNumberOfPositions('multiple')}
                    style={{ 
                      width: '18px', 
                      height: '18px', 
                      cursor: 'pointer',
                      accentColor: '#1A1A1A'
                    }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: numberOfPositions === 'multiple' ? '600' : '400' }}>
                    2人以上
                  </span>
                </label>
                {numberOfPositions === 'multiple' && (
                  <div style={{ marginTop: '12px', paddingLeft: '42px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        value={multiplePositionsCount}
                        onChange={(e) => setMultiplePositionsCount(e.target.value)}
                        placeholder="人数を入力"
                        min="2"
                        className="input-field"
                        style={{ width: '150px', padding: '8px 12px' }}
                      />
                      <span className="text-gray">人</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 応募期限 */}
          <div className="mb-32">
            <label className="form-label">
              応募期限 <span className="form-required">*</span>
            </label>
            <input
              type="date"
              value={applicationDeadline}
              onChange={(e) => setApplicationDeadline(e.target.value)}
              className="input-field"
              min={new Date().toISOString().split('T')[0]}
              required
            />
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#6B6B6B'
            }}>
              この日までクリエイターが応募できます（デフォルト: 14日後）
            </div>
          </div>

          {/* 注意事項 */}
          <div className="mb-32" style={{
            padding: '16px',
            backgroundColor: '#F9F9F9',
            borderRadius: '8px',
            border: '1px solid #E5E5E5'
          }}>
            <h3 className="text-small" style={{ marginBottom: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-info-circle" style={{ color: '#6B6B6B' }}></i>
              {requestType === 'direct' ? '直接依頼について' : '公開依頼について'}
            </h3>
            <ul className="text-small text-gray" style={{
              lineHeight: '1.7',
              paddingLeft: '20px',
              margin: 0
            }}>
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
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginTop: '40px'
          }}>
            <button
              type="button"
              onClick={saveDraft}
              disabled={submitting || uploading}
              style={{
                padding: '14px 24px',
                border: '2px solid #E5E5E5',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                cursor: submitting || uploading ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                color: '#1A1A1A',
                opacity: submitting || uploading ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (!submitting && !uploading) {
                  e.currentTarget.style.backgroundColor = '#F9F9F9'
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF'
              }}
            >
              <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
              下書き保存
            </button>
            
            <button
              type="submit"
              disabled={submitting || uploading}
              style={{
                padding: '14px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: submitting || uploading ? '#E5E5E5' : '#1A1A1A',
                color: '#FFFFFF',
                cursor: submitting || uploading ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (!submitting && !uploading) {
                  e.currentTarget.style.backgroundColor = '#2A2A2A'
                }
              }}
              onMouseOut={(e) => {
                if (!submitting && !uploading) {
                  e.currentTarget.style.backgroundColor = '#1A1A1A'
                }
              }}
            >
              {uploading ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                  ファイルアップロード中...
                </>
              ) : submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                  送信中...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane" style={{ marginRight: '8px' }}></i>
                  {requestType === 'direct' ? '依頼を送る' : '依頼を公開する'}
                </>
              )}
            </button>
          </div>
        </form>

        {/* 確認モーダル */}
        {showConfirmModal && (
          <ConfirmModal
            requestType={requestType}
            category={category}
            title={title}
            description={description}
            referenceUrls={referenceUrls}
            requiredSkills={requiredSkills}
            attachedFiles={attachedFiles}
            paymentType={paymentType}
            budgetType={budgetType}
            budgetMin={budgetMin}
            budgetMax={budgetMax}
            fixedBudget={fixedBudget}
            hourlyRateMin={hourlyRateMin}
            hourlyRateMax={hourlyRateMax}
            estimatedHours={estimatedHours}
            jobFeatures={jobFeatures}
            deadline={deadline}
            numberOfPositions={numberOfPositions}
            multiplePositionsCount={multiplePositionsCount}
            applicationDeadline={applicationDeadline}
            onConfirm={handleConfirmedSubmit}
            onCancel={() => setShowConfirmModal(false)}
          />
        )}
      </div>
    </div>
  )
}

// メインコンポーネント（Suspenseで囲む）
export default function CreateRequestPage() {
  return (
    <>
      <style jsx global>{`
        @media (max-width: 768px) {
          .container-narrow {
            padding: 16px !important;
          }
          
          .card-no-hover {
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          
          /* 受取人表示カード */
          .card-no-hover.p-24 {
            padding: 16px !important;
            margin-bottom: 24px !important;
          }
          
          .page-title {
            font-size: 20px !important;
            margin-bottom: 24px !important;
          }
          
          .mb-24 {
            margin-bottom: 20px !important;
          }
          
          .mb-32 {
            margin-bottom: 24px !important;
          }
          
          /* 支払い方式を縦並びに */
          div[style*="flex: 1 1 calc(50% - 6px)"] {
            flex: 1 1 100% !important;
          }
          
          /* ボタンを縦並びに */
          div[style*="gridTemplateColumns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          
          /* ボタンエリアの上余白 */
          div[style*="marginTop: 40px"] {
            margin-top: 32px !important;
          }
          
          /* テキストエリアの行数調整 */
          textarea[rows="20"] {
            min-height: 300px !important;
          }
        }
        
        /* モーダル表示時に背景を固定 */
        body.modal-open {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
          touch-action: none !important;
          -webkit-overflow-scrolling: none !important;
        }
      `}</style>
      <style jsx>{`
        @media (max-width: 768px) {
          /* 確認モーダルのスマホ対応 */
          :global(.confirm-modal-content) {
            padding: 16px !important;
            max-height: 95vh !important;
            max-width: calc(100vw - 32px) !important;
            border-radius: 8px !important;
          }
          
          :global(.confirm-modal-content) h2 {
            font-size: 18px !important;
            margin-bottom: 20px !important;
          }
          
          /* モーダル内のセクション間の余白を調整 */
          :global(.confirm-modal-content) > div[style*="paddingBottom: 24px"] {
            padding-bottom: 12px !important;
            margin-bottom: 12px !important;
          }
          
          :global(.confirm-modal-content) > div[style*="paddingBottom: 32px"] {
            padding-bottom: 16px !important;
            margin-bottom: 16px !important;
          }
        }
      `}</style>
      <Header />
      <Suspense fallback={
        <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
          <div className="loading-state">読み込み中...</div>
        </div>
      }>
        <CreateRequestContent />
      </Suspense>
      <Footer />
    </>
  )
}