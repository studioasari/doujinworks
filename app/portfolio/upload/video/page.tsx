'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '../../../../utils/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
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
  rating: 'general' | 'r18' | 'r18g'
  isOriginal: boolean
  allowComments: boolean
  visibility: 'public' | 'followers' | 'private'
  timestamp: number
  category?: string
  categoryName?: string
  categoryIcon?: string
  // 小説用
  synopsis?: string
  content?: string
  // 音楽・ボイス・動画用
  uploadMethod?: 'file' | 'link'
  externalLink?: string
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
  uploadMethod,
  videoFileName,
  externalLink,
  rating,
  isOriginal,
  allowComments,
  thumbnailPreview,
  visibility,
  onConfirm, 
  onCancel 
}: { 
  title: string
  description: string
  tags: string[]
  uploadMethod: 'file' | 'link'
  videoFileName: string
  externalLink: string
  rating: string
  isOriginal: boolean
  allowComments: boolean
  thumbnailPreview: string
  visibility: string
  onConfirm: () => void
  onCancel: () => void 
}) {
  const visibilityLabels = {
    public: '全体公開',
    followers: 'フォロワーのみ',
    private: '非公開（自分のみ）'
  }

  const ratingLabels = {
    general: '全年齢',
    r18: 'R-18',
    r18g: 'R-18G'
  }

  // モーダル表示中はスクロール無効化
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
        padding: '20px',
        overflowY: 'auto'
      }}
      onClick={onCancel}
    >
      <div
        className="card-no-hover"
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
          アップロード内容の確認
        </h2>

        {/* サムネイルプレビュー */}
        {thumbnailPreview && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '32px'
            }}>
              <img 
                src={thumbnailPreview} 
                alt="サムネイル"
                style={{
                  maxWidth: '300px',
                  maxHeight: '300px',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            </div>
            <div style={{ 
              borderBottom: '1px solid #E5E5E5'
            }}></div>
          </div>
        )}

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
        {description && (
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
              説明
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
        )}

        {/* アップロード方法 */}
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
            動画
          </div>
          {uploadMethod === 'file' ? (
            <div style={{ 
              fontSize: '14px',
              color: '#1A1A1A',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-file-video"></i>
              {videoFileName}
            </div>
          ) : (
            <div style={{ 
              fontSize: '14px',
              color: '#1A1A1A',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-link"></i>
              <a href={externalLink} target="_blank" rel="noopener noreferrer" style={{ color: '#1A1A1A', textDecoration: 'underline' }}>
                {externalLink}
              </a>
            </div>
          )}
        </div>

        {/* タグ */}
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
            タグ ({tags.length}個)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tags.map((tag, index) => (
              <span key={index} className="badge badge-category">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* 年齢制限 */}
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
            年齢制限
          </div>
          <div style={{ fontSize: '14px', color: '#1A1A1A' }}>
            {ratingLabels[rating as keyof typeof ratingLabels]}
          </div>
        </div>

        {/* オリジナル作品 */}
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
            作品種別
          </div>
          <div style={{ fontSize: '14px', color: '#1A1A1A' }}>
            {isOriginal ? 'オリジナル作品' : '二次創作'}
          </div>
        </div>

        {/* コメント設定 */}
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
            コメント
          </div>
          <div style={{ fontSize: '14px', color: '#1A1A1A' }}>
            {allowComments ? '許可する' : '許可しない'}
          </div>
        </div>

        {/* 公開範囲 */}
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
            公開範囲
          </div>
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
  onDelete: (draft: Draft) => void
  onClose: () => void 
}) {
  // モーダル表示中はスクロール無効化
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
                key={`${draft.category || 'video_drafts'}-${draft.id}`}
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
                        color: '#6B6B6B',
                        backgroundColor: '#F5F5F5',
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
                        color: '#6B6B6B',
                        backgroundColor: '#F5F5F5',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        自動保存
                      </span>
                    )}
                  </div>
                  <h3 style={{ 
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {draft.title || '（タイトルなし）'}
                  </h3>
                  <div className="text-small text-gray">
                    {new Date(draft.timestamp).toLocaleString('ja-JP')} · {draft.uploadMethod === 'file' ? 'ファイル' : 'リンク'}
                  </div>
                  {draft.selectedTags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
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

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('この下書きを削除しますか？')) {
                      onDelete(draft)
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    color: '#999999',
                    backgroundColor: 'transparent',
                    border: '1px solid #E5E5E5',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    height: 'fit-content',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#FF4444'
                    e.currentTarget.style.borderColor = '#FF4444'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#999999'
                    e.currentTarget.style.borderColor = '#E5E5E5'
                  }}
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

// 下書き復元用コンポーネント（useSearchParamsを使用）
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
function UploadVideoPageContent() {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'link'>('file')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoFileName, setVideoFileName] = useState('')
  const [externalLink, setExternalLink] = useState('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')
  const [rating, setRating] = useState<'general' | 'r18' | 'r18g'>('general')
  const [isOriginal, setIsOriginal] = useState(false)
  const [allowComments, setAllowComments] = useState(true)
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [dragging, setDragging] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  
  // エラー状態
  const [errors, setErrors] = useState({
    title: '',
    video: '',
    link: '',
    thumbnail: '',
    terms: ''
  })

  // トースト状態
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // プリセットタグ（動画向け）
  const presetTags = [
    'アニメーション', '実写', '3DCG', 'モーショングラフィック', 'ストップモーション',
    'MV', 'PV', 'ショートムービー', '解説動画', 'チュートリアル',
    'ゲーム実況', 'VLOG', 'ドキュメンタリー', 'コメディ', 'ドラマ',
    'エフェクト', '編集技術', 'カラーグレーディング', '映像美', 'ストーリー性'
  ]

  useEffect(() => {
    checkAuth()
    loadDrafts()
  }, [])

  function restoreDraft(draftId: string) {
    try {
      const saved = localStorage.getItem('video_drafts')
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

  // 下書き読み込み（全ジャンル対応）
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
          
          // 配列形式の場合
          if (Array.isArray(parsed)) {
            const draftsArray = parsed.map(draft => ({
              ...draft,
              timestamp: draft.timestamp || Date.now(),
              category: category.key,
              categoryName: category.name,
              categoryIcon: category.icon
            }))
            allDrafts.push(...draftsArray)
          }
          // オブジェクト形式の場合
          else if (typeof parsed === 'object') {
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

      // 新しい順にソート
      allDrafts.sort((a, b) => b.timestamp - a.timestamp)
      setDrafts(allDrafts)
    } catch (e) {
      console.error('下書きの読み込みに失敗しました', e)
      setDrafts([])
    }
  }

  // 下書きを復元
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

  // 下書きを削除
  function deleteDraft(draft: Draft) {
    try {
      const storageKey = draft.category || 'video_drafts'
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const allDrafts = JSON.parse(saved)
        delete allDrafts[draft.id]
        localStorage.setItem(storageKey, JSON.stringify(allDrafts))
        loadDrafts() // 再読み込み
        setToast({ message: '下書きを削除しました', type: 'success' })
      }
    } catch (error) {
      console.error('下書き削除エラー:', error)
      setToast({ message: '削除に失敗しました', type: 'error' })
    }
  }

  // 自動保存（2秒後）
  useEffect(() => {
    if (!currentUserId) return
    if (!title.trim() && selectedTags.length === 0) return

    const autoSaveTimer = setTimeout(() => {
      try {
        const saved = localStorage.getItem('video_drafts')
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
        
        localStorage.setItem('video_drafts', JSON.stringify(allDrafts))
      } catch (error) {
        console.error('自動保存エラー:', error)
      }
    }, 2000)

    return () => clearTimeout(autoSaveTimer)
  }, [title, description, selectedTags, rating, isOriginal, allowComments, visibility, uploadMethod, externalLink, currentUserId])

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

  // 動画ファイル処理
  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      processVideoFile(file)
    }
  }

  function processVideoFile(file: File) {
    // ファイルサイズチェック（200MB）
    if (file.size > 200 * 1024 * 1024) {
      setToast({ message: 'ファイルサイズは200MB以下にしてください', type: 'error' })
      return
    }
    
    // ファイル形式チェック
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi']
    if (!allowedTypes.includes(file.type)) {
      setToast({ message: '対応フォーマット: MP4, MOV, AVI', type: 'error' })
      return
    }

    setVideoFile(file)
    setVideoFileName(file.name)
    setErrors(prev => ({ ...prev, video: '' }))
  }

  function handleVideoClick() {
    videoInputRef.current?.click()
  }

  function handleVideoDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      processVideoFile(file)
    }
  }

  function removeVideo() {
    setVideoFile(null)
    setVideoFileName('')
  }

  // サムネイル処理
  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      processThumbnailFile(file)
    }
  }

  function processThumbnailFile(file: File) {
    // ファイルサイズチェック（32MB）
    if (file.size > 32 * 1024 * 1024) {
      setToast({ message: 'サムネイルは32MB以下にしてください', type: 'error' })
      return
    }
    
    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setToast({ message: '対応フォーマット: JPEG, PNG, GIF', type: 'error' })
      return
    }

    setThumbnailFile(file)
    
    // プレビュー生成
    const reader = new FileReader()
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleThumbnailClick() {
    thumbnailInputRef.current?.click()
  }

  function handleThumbnailDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      processThumbnailFile(file)
    }
  }

  function removeThumbnail() {
    setThumbnailFile(null)
    setThumbnailPreview('')
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

    if (uploadMethod === 'file' && !videoFile) {
      setErrors(prev => ({ ...prev, video: '動画ファイルを選択してください' }))
      setToast({ message: '動画ファイルを選択してください', type: 'error' })
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

    // 確認モーダルを表示
    setShowConfirmModal(true)
  }

  // 必須項目がすべて満たされているかチェック
  const isFormValid = 
    title.trim().length > 0 && 
    title.length <= 50 &&
    ((uploadMethod === 'file' && videoFile !== null) || (uploadMethod === 'link' && externalLink.trim().length > 0)) &&
    selectedTags.length > 0 && 
    agreedToTerms &&
    !errors.title &&
    !errors.video &&
    !errors.link &&
    !uploading

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

      let videoUrl: string | null = null
      let thumbnailUrl: string | null = null

      // 1. 動画ファイルをアップロード（ファイルの場合）
      if (uploadMethod === 'file' && videoFile) {
        const fileExt = videoFile.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('portfolio-videos')
          .upload(fileName, videoFile)

        if (uploadError) {
          throw uploadError
        }

        // 公開URLを取得
        const { data: { publicUrl } } = supabase.storage
          .from('portfolio-videos')
          .getPublicUrl(fileName)

        videoUrl = publicUrl
      }

      // 2. サムネイルをアップロード（あれば）
      if (thumbnailFile) {
        const fileExt = thumbnailFile.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('portfolio-images')
          .upload(fileName, thumbnailFile)

        if (uploadError) {
          throw uploadError
        }

        // 公開URLを取得
        const { data: { publicUrl } } = supabase.storage
          .from('portfolio-images')
          .getPublicUrl(fileName)

        thumbnailUrl = publicUrl
      }

      // 3. データベースに保存
      const { error: dbError } = await supabase
        .from('portfolio_items')
        .insert({
          creator_id: currentUserId,
          title: title.trim(),
          description: description.trim() || null,
          category: 'video',
          rating: rating,
          is_original: isOriginal,
          allow_comments: allowComments,
          tags: selectedTags,
          video_url: uploadMethod === 'file' ? videoUrl : null,
          external_link: uploadMethod === 'link' ? externalLink.trim() : null,
          image_url: thumbnailUrl,
          thumbnail_url: thumbnailUrl,
          is_public: visibility === 'public'
        })

      if (dbError) {
        throw dbError
      }

      setToast({ message: '動画をアップロードしました！', type: 'success' })
      
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
      
      {/* 下書き復元コンポーネント */}
      <Suspense fallback={null}>
        <DraftRestorer onRestore={restoreDraft} />
      </Suspense>
      
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
            {/* タイトル */}
            <div className="flex-between mb-40">
              <h1 className="page-title">
                動画をアップロード
              </h1>
              <button
                type="button"
                onClick={() => setShowDraftModal(true)}
                className="btn-secondary btn-small"
              >
                <i className="fas fa-folder-open" style={{ marginRight: '8px' }}></i>
                下書き ({drafts.length})
              </button>
            </div>

            <form onSubmit={handlePreSubmit} className="card-no-hover p-40">
              {/* アップロード方法選択 */}
              <div className="mb-32">
                <label className="form-label mb-12">
                  動画のアップロード方法 <span className="form-required">*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setUploadMethod('file')}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: uploadMethod === 'file' ? '#1A1A1A' : '#FFFFFF',
                      color: uploadMethod === 'file' ? '#FFFFFF' : '#1A1A1A',
                      border: `2px solid ${uploadMethod === 'file' ? '#1A1A1A' : '#E5E5E5'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: uploadMethod === 'file' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className="fas fa-file-video" style={{ marginRight: '8px' }}></i>
                    ファイルをアップロード
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMethod('link')}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: uploadMethod === 'link' ? '#1A1A1A' : '#FFFFFF',
                      color: uploadMethod === 'link' ? '#FFFFFF' : '#1A1A1A',
                      border: `2px solid ${uploadMethod === 'link' ? '#1A1A1A' : '#E5E5E5'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: uploadMethod === 'link' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className="fas fa-link" style={{ marginRight: '8px' }}></i>
                    外部リンク
                  </button>
                </div>

                {/* ファイルアップロード */}
                {uploadMethod === 'file' && (
                  <>
                    {!videoFile && (
                      <div
                        className={`upload-area ${dragging ? 'dragging' : ''}`}
                        style={{ width: '100%', height: '150px' }}
                        onClick={handleVideoClick}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragging(true)
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleVideoDrop}
                      >
                        <div className="upload-area-content">
                          <div className="upload-area-icon">
                            <i className="fas fa-video"></i>
                          </div>
                          <div className="upload-area-text">
                            クリックまたはドラッグして動画ファイルを追加
                          </div>
                          <div className="upload-area-hint">
                            MP4 / MOV / AVI / 200MB以内
                          </div>
                        </div>
                      </div>
                    )}

                    {videoFile && (
                      <div style={{
                        padding: '16px',
                        border: '2px solid #E5E5E5',
                        borderRadius: '8px',
                        backgroundColor: '#FAFAFA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <i className="fas fa-file-video" style={{ fontSize: '24px', color: '#1A1A1A' }}></i>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{videoFileName}</div>
                            <div className="text-small text-gray">
                              {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeVideo}
                          className="btn-danger btn-small"
                        >
                          <i className="fas fa-times" style={{ marginRight: '6px' }}></i>
                          削除
                        </button>
                      </div>
                    )}

                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/quicktime,video/x-msvideo,video/avi"
                      onChange={handleVideoChange}
                      style={{ display: 'none' }}
                    />

                    {errors.video && (
                      <div style={{
                        marginTop: '8px',
                        fontSize: '14px',
                        color: '#F44336'
                      }}>
                        <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                        {errors.video}
                      </div>
                    )}
                  </>
                )}

                {/* 外部リンク */}
                {uploadMethod === 'link' && (
                  <>
                    <input
                      type="url"
                      value={externalLink}
                      onChange={(e) => {
                        setExternalLink(e.target.value)
                        setErrors(prev => ({ ...prev, link: '' }))
                      }}
                      placeholder="https://www.youtube.com/watch?v=... または https://vimeo.com/..."
                      className="input-field"
                      style={{
                        borderColor: errors.link ? '#F44336' : undefined
                      }}
                    />
                    <div style={{
                      marginTop: '8px',
                      fontSize: '13px',
                      color: '#6B6B6B'
                    }}>
                      YouTube、Vimeo、ニコニコ動画などのURLを入力してください
                    </div>
                    {errors.link && (
                      <div style={{
                        marginTop: '8px',
                        fontSize: '14px',
                        color: '#F44336'
                      }}>
                        <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                        {errors.link}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* サムネイル画像アップロード（ファイルの場合のみ） */}
              {uploadMethod === 'file' && (
                <div className="mb-32">
                  <label className="form-label mb-12">
                    サムネイル画像（任意）
                  </label>

                  {/* サムネイルなしの時：アップロードエリア */}
                  {!thumbnailPreview && (
                    <div
                      className={`upload-area ${dragging ? 'dragging' : ''}`}
                      style={{ width: '100%', height: '200px' }}
                      onClick={handleThumbnailClick}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDragging(true)
                      }}
                      onDragLeave={() => setDragging(false)}
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
                          JPEG / GIF / PNG / 32MB以内
                        </div>
                      </div>
                    </div>
                  )}

                  {/* サムネイルありの時：プレビュー表示 */}
                  {thumbnailPreview && (
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: '400px'
                    }}>
                      <img
                        src={thumbnailPreview}
                        alt="サムネイル"
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '400px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          border: '2px solid #E5E5E5'
                        }}
                      />
                      {/* 削除ボタン */}
                      <button
                        type="button"
                        onClick={removeThumbnail}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      >
                        <i className="fas fa-times" style={{ marginRight: '6px' }}></i>
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
                  placeholder="動画のタイトル"
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
              <div className="mb-32">
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
                  placeholder="動画の説明を入力してください"
                  rows={6}
                  maxLength={1000}
                  className="textarea-field"
                  style={{
                    borderColor: description.length > 1000 ? '#F44336' : undefined
                  }}
                />
              </div>

              {/* カスタムタグ（メイン） */}
              <div className="mb-24">
                <label className="form-label">
                  タグを追加 <span className="form-required">*</span>
                  <span style={{ 
                    marginLeft: '12px', 
                    fontSize: '12px', 
                    color: '#6B6B6B',
                    fontWeight: 'normal'
                  }}>
                    最大10個まで（1個以上必須）
                  </span>
                </label>
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
                <div className="mb-24">
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
                        <span>#{tag}</span>
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

              {/* プリセットタグ（補助） */}
              <div className="mb-32">
                <label className="form-label">
                  プリセットタグから選択
                  <span style={{ 
                    marginLeft: '12px', 
                    fontSize: '12px', 
                    color: '#6B6B6B',
                    fontWeight: 'normal'
                  }}>
                    クリックで追加/削除
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
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 年齢制限（タブ風） */}
              <div className="mb-32">
                <label className="form-label mb-12">
                  年齢制限 <span className="form-required">*</span>
                </label>
                <div style={{ 
                  display: 'flex', 
                  gap: '12px',
                  marginBottom: '8px'
                }}>
                  <button
                    type="button"
                    onClick={() => setRating('general')}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: rating === 'general' ? '#1A1A1A' : '#FFFFFF',
                      color: rating === 'general' ? '#FFFFFF' : '#1A1A1A',
                      border: `2px solid ${rating === 'general' ? '#1A1A1A' : '#E5E5E5'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: rating === 'general' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    全年齢
                  </button>
                  <button
                    type="button"
                    onClick={() => setRating('r18')}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: rating === 'r18' ? '#1A1A1A' : '#FFFFFF',
                      color: rating === 'r18' ? '#FFFFFF' : '#1A1A1A',
                      border: `2px solid ${rating === 'r18' ? '#1A1A1A' : '#E5E5E5'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: rating === 'r18' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    R-18
                  </button>
                  <button
                    type="button"
                    onClick={() => setRating('r18g')}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: rating === 'r18g' ? '#1A1A1A' : '#FFFFFF',
                      color: rating === 'r18g' ? '#FFFFFF' : '#1A1A1A',
                      border: `2px solid ${rating === 'r18g' ? '#1A1A1A' : '#E5E5E5'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: rating === 'r18g' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    R-18G
                  </button>
                </div>
                <div className="text-small text-gray" style={{ paddingLeft: '4px' }}>
                  R-18: 性的表現を含む / R-18G: 暴力的・グロテスク表現を含む
                </div>
              </div>

              {/* オリジナル作品 */}
              <div className="mb-24">
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  padding: '12px',
                  border: '2px solid #E5E5E5',
                  borderRadius: '8px',
                  backgroundColor: isOriginal ? '#FAFAFA' : '#FFFFFF',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={isOriginal}
                    onChange={(e) => setIsOriginal(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#1A1A1A'
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      オリジナル作品
                    </div>
                    <div className="text-small text-gray">
                      既存作品のMADや切り抜きではない、独自に制作した動画の場合はチェックしてください
                    </div>
                  </div>
                </label>
              </div>

              {/* コメント設定 */}
              <div className="mb-32">
                <label className="form-label mb-12">
                  作品へのコメント
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setAllowComments(true)}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: allowComments ? '#1A1A1A' : '#FFFFFF',
                      color: allowComments ? '#FFFFFF' : '#1A1A1A',
                      border: `2px solid ${allowComments ? '#1A1A1A' : '#E5E5E5'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: allowComments ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className="fas fa-comment" style={{ marginRight: '8px' }}></i>
                    許可する
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllowComments(false)}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: !allowComments ? '#1A1A1A' : '#FFFFFF',
                      color: !allowComments ? '#FFFFFF' : '#1A1A1A',
                      border: `2px solid ${!allowComments ? '#1A1A1A' : '#E5E5E5'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: !allowComments ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className="fas fa-comment-slash" style={{ marginRight: '8px' }}></i>
                    許可しない
                  </button>
                </div>
              </div>

              {/* 公開範囲（タブ風） */}
              <div className="mb-32">
                <label className="form-label mb-12">
                  公開範囲 <span className="form-required">*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: visibility === 'public' ? '#1A1A1A' : '#FFFFFF',
                      color: visibility === 'public' ? '#FFFFFF' : '#1A1A1A',
                      border: `2px solid ${visibility === 'public' ? '#1A1A1A' : '#E5E5E5'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: visibility === 'public' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className="fas fa-globe" style={{ marginRight: '8px' }}></i>
                    全体公開
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('followers')}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: visibility === 'followers' ? '#1A1A1A' : '#FFFFFF',
                      color: visibility === 'followers' ? '#FFFFFF' : '#1A1A1A',
                      border: `2px solid ${visibility === 'followers' ? '#1A1A1A' : '#E5E5E5'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: visibility === 'followers' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className="fas fa-users" style={{ marginRight: '8px' }}></i>
                    フォロワー限定
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: visibility === 'private' ? '#1A1A1A' : '#FFFFFF',
                      color: visibility === 'private' ? '#FFFFFF' : '#1A1A1A',
                      border: `2px solid ${visibility === 'private' ? '#1A1A1A' : '#E5E5E5'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: visibility === 'private' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className="fas fa-lock" style={{ marginRight: '8px' }}></i>
                    非公開
                  </button>
                </div>
              </div>

              {/* 利用規約同意 */}
              <div className="mb-32">
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                  padding: '16px',
                  border: `2px solid ${errors.terms ? '#F44336' : '#E5E5E5'}`,
                  borderRadius: '8px',
                  backgroundColor: agreedToTerms ? '#FAFAFA' : '#FFFFFF',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked)
                      if (e.target.checked) {
                        setErrors(prev => ({ ...prev, terms: '' }))
                      }
                    }}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      marginTop: '2px',
                      accentColor: '#1A1A1A'
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      利用規約への同意 <span className="form-required">*</span>
                    </div>
                    <div className="text-small text-gray">
                      <Link href="/terms" target="_blank" style={{ color: '#1A1A1A', textDecoration: 'underline' }}>利用規約</Link>や<Link href="/guideline" target="_blank" style={{ color: '#1A1A1A', textDecoration: 'underline' }}>ガイドライン</Link>に違反する作品は削除の対象となります。内容を確認し、同意した上でアップロードしてください。
                    </div>
                  </div>
                </label>
                {errors.terms && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '14px',
                    color: '#F44336'
                  }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                    {errors.terms}
                  </div>
                )}
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
                  disabled={!isFormValid}
                  style={{
                    padding: '12px 32px',
                    backgroundColor: isFormValid ? '#1A1A1A' : '#E5E5E5',
                    color: isFormValid ? '#FFFFFF' : '#999999',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: isFormValid ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    opacity: uploading ? 0.6 : 1
                  }}
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
          uploadMethod={uploadMethod}
          videoFileName={videoFileName}
          externalLink={externalLink}
          rating={rating}
          isOriginal={isOriginal}
          allowComments={allowComments}
          thumbnailPreview={thumbnailPreview}
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

// デフォルトエクスポート
export default function UploadVideoPage() {
  return <UploadVideoPageContent />
}