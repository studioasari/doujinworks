'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '../../../../utils/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingScreen from '../../../components/LoadingScreen'
import DashboardSidebar from '../../../components/DashboardSidebar'
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

// プレビューモーダルコンポーネント
function PreviewModal({ 
  title,
  synopsis,
  content,
  onClose 
}: { 
  title: string
  synopsis: string
  content: string
  onClose: () => void 
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

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
      onClick={onClose}
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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <i className="fas fa-eye"></i>
            プレビュー
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6B6B6B'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '24px',
          lineHeight: '1.4'
        }}>
          {title || '（タイトルなし）'}
        </h1>

        {synopsis && (
          <div style={{
            padding: '16px',
            backgroundColor: '#FAFAFA',
            borderRadius: '8px',
            marginBottom: '32px',
            borderLeft: '4px solid #1A1A1A'
          }}>
            <div style={{
              fontSize: '13px',
              color: '#6B6B6B',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              あらすじ
            </div>
            <div style={{
              fontSize: '14px',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap'
            }}>
              {synopsis}
            </div>
          </div>
        )}

        <div style={{
          fontSize: '16px',
          lineHeight: '2.0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {content ? (
            <div dangerouslySetInnerHTML={{ __html: formatContent(content) }} />
          ) : (
            <div style={{ color: '#6B6B6B', fontStyle: 'italic' }}>
              本文が入力されていません
            </div>
          )}
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <button onClick={onClose} className="btn-secondary">
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
  synopsis,
  content,
  tags,
  rating,
  isOriginal,
  allowComments,
  thumbnailPreview,
  visibility,
  onConfirm, 
  onCancel 
}: { 
  title: string
  synopsis: string
  content: string
  tags: string[]
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

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const charCount = content.length

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
            <div style={{ borderBottom: '1px solid #E5E5E5' }}></div>
          </div>
        )}

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

        {synopsis && (
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
              あらすじ
            </div>
            <div style={{ 
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#1A1A1A',
              whiteSpace: 'pre-wrap'
            }}>
              {synopsis}
            </div>
          </div>
        )}

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
            本文
          </div>
          <div style={{ 
            fontSize: '14px',
            color: '#1A1A1A'
          }}>
            {charCount.toLocaleString()}文字
          </div>
        </div>

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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontSize: '14px',
              color: '#999999',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1A1A1A'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#999999'}
          >
            <i className="fas fa-chevron-left" style={{ fontSize: '12px' }}></i>
            修正する
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary"
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
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
                key={`${draft.category || 'novel_drafts'}-${draft.id}`}
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
                    {draft.title || '（タイトルなし）'}
                  </h3>
                  <div className="text-small text-gray">
                    {new Date(draft.timestamp).toLocaleString('ja-JP')} · {(draft.content || '').length.toLocaleString()}文字
                  </div>
                  {draft.selectedTags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                      {draft.selectedTags.slice(0, 5).map((tag, index) => (
                        <span key={index} className="badge badge-category" style={{ fontSize: '11px' }}>
                          #{tag}
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
function UploadNovelPageContent() {
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
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        setCurrentUserId(user.id)
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
          }
          else if (typeof parsed === 'object') {
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
          console.log(`圧縮: ${file.name} ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`)
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
          
          console.log(`✅ サムネイルアップロード完了: ${thumbnailFile.name}`)
          
        } catch (uploadError) {
          console.error('❌ サムネイルエラー:', uploadError)
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
        router.push('/portfolio/manage')
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

  if (loading) {
    return <LoadingScreen message="読み込み中..." />
  }

  return (
    <>
      <Header />
      
      <Suspense fallback={null}>
        <DraftRestorer onRestore={restoreDraft} />
      </Suspense>
      
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
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="flex-between mb-40">
              <h1 className="page-title">
                小説をアップロード
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

            {compressing && (
              <div className="alert alert-info mb-24">
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                画像を圧縮しています...
              </div>
            )}

            <form onSubmit={handlePreSubmit} className="card-no-hover p-40">
              {/* サムネイル画像アップロード */}
              <div className="mb-32">
                <label className="form-label-bold mb-12">
                  サムネイル画像（任意）
                </label>
                <div className="form-hint mb-12">
                  自動圧縮あり
                </div>

                {!thumbnailPreview && (
                  <div
                    className={`upload-area ${thumbnailDragging ? 'dragging' : ''} ${compressing ? 'uploading' : ''}`}
                    style={{ width: '100%', height: '200px' }}
                    onClick={handleImageClick}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setThumbnailDragging(true)
                    }}
                    onDragLeave={() => setThumbnailDragging(false)}
                    onDrop={handleImageDrop}
                  >
                    <div className="upload-area-content" style={{ height: '100%' }}>
                      <div className="upload-area-icon">
                        <i className="fas fa-image"></i>
                      </div>
                      <div className="upload-area-text">
                        クリックまたはドラッグしてサムネイルを追加
                      </div>
                      <div className="upload-area-hint">
                        JPEG / PNG / GIF • 32MB以内
                      </div>
                    </div>
                  </div>
                )}

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
                        border: '2px solid #D0D5DA'
                      }}
                    />
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
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* タイトル */}
              <div className="mb-24">
                <label className="form-label-bold">
                  タイトル <span className="form-required">*</span>
                </label>
                <div className="form-hint mb-8">
                  {title.length}/200文字
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="小説のタイトル"
                  maxLength={200}
                  className={`input-field ${errors.title ? 'error' : ''}`}
                />
                {errors.title && (
                  <div className="form-error">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.title}
                  </div>
                )}
              </div>

              {/* あらすじ */}
              <div className="mb-32">
                <label className="form-label-bold">
                  あらすじ
                </label>
                <div className="form-hint mb-8">
                  {synopsis.length}/2000文字
                </div>
                <textarea
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="作品のあらすじを入力してください"
                  rows={4}
                  maxLength={2000}
                  className="textarea-field"
                />
              </div>

              {/* 本文 */}
              <div className="mb-24" style={{ position: 'relative' }}>
                <label className="form-label-bold">
                  本文 <span className="form-required">*</span>
                </label>
                <div className="form-hint mb-8">
                  {content.length.toLocaleString()}/100,000文字
                </div>

                {/* プレビューボタン - 右上固定 */}
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  disabled={!title.trim() && !content.trim()}
                  className="novel-preview-button"
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    padding: '8px 16px',
                    fontSize: '13px',
                    backgroundColor: '#5B7C99',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (!title.trim() && !content.trim()) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: (!title.trim() && !content.trim()) ? 0.5 : 1,
                    transition: 'all 0.2s',
                    zIndex: 10
                  }}
                  onMouseEnter={(e) => {
                    if (title.trim() || content.trim()) {
                      e.currentTarget.style.backgroundColor = '#4A6B85'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#5B7C99'
                  }}
                >
                  <i className="fas fa-eye"></i>
                  プレビュー
                </button>

                {/* ツールバー */}
                <div className="novel-toolbar" style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: '#EEF0F3',
                  borderRadius: '8px 8px 0 0',
                  borderBottom: '1px solid #D0D5DA',
                  position: 'relative'
                }}>
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setShowHeadingMenu(!showHeadingMenu)}
                      className="btn-secondary btn-small"
                      style={{ fontSize: '13px' }}
                    >
                      <i className="fas fa-heading" style={{ marginRight: '6px' }}></i>
                      見出し
                      <i className="fas fa-chevron-down" style={{ marginLeft: '6px', fontSize: '10px' }}></i>
                    </button>
                    
                    {showHeadingMenu && (
                      <>
                        <div
                          onClick={() => setShowHeadingMenu(false)}
                          style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: '4px',
                          backgroundColor: '#FFFFFF',
                          border: '2px solid #D0D5DA',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          zIndex: 1000,
                          minWidth: '150px'
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              insertHeading(1)
                              setShowHeadingMenu(false)
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              textAlign: 'left',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              fontSize: '13px',
                              borderBottom: '1px solid #F5F5F5'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            # 見出し1
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              insertHeading(2)
                              setShowHeadingMenu(false)
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              textAlign: 'left',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              fontSize: '13px',
                              borderBottom: '1px solid #F5F5F5'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            ## 見出し2
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              insertHeading(3)
                              setShowHeadingMenu(false)
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              textAlign: 'left',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            ### 見出し3
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={insertEmphasis}
                    className="btn-secondary btn-small"
                    style={{ fontSize: '13px' }}
                  >
                    <i className="fas fa-bold" style={{ marginRight: '6px' }}></i>
                    強調
                  </button>

                  <button
                    type="button"
                    onClick={insertRuby}
                    className="btn-secondary btn-small"
                    style={{ fontSize: '13px' }}
                  >
                    <i className="fas fa-language" style={{ marginRight: '6px' }}></i>
                    ルビ
                  </button>
                  
                  <button
                    type="button"
                    onClick={insertPageBreak}
                    className="btn-secondary btn-small"
                    style={{ fontSize: '13px' }}
                  >
                    <i className="fas fa-grip-lines" style={{ marginRight: '6px' }}></i>
                    改ページ
                  </button>
                </div>

                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="本文を入力してください"
                  rows={20}
                  className={`textarea-field ${errors.content ? 'error' : ''}`}
                  style={{
                    fontFamily: 'monospace',
                    lineHeight: '1.8',
                    borderRadius: '0 0 8px 8px'
                  }}
                />
                {errors.content && (
                  <div className="form-error">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.content}
                  </div>
                )}
                
                {/* 記法の説明 */}
                <div className="alert alert-info" style={{ marginTop: '12px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                    記法の使い方
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    見出し1：<code style={{ backgroundColor: '#E5E5E5', padding: '2px 6px', borderRadius: '4px' }}># 見出し</code>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    見出し2：<code style={{ backgroundColor: '#E5E5E5', padding: '2px 6px', borderRadius: '4px' }}>## 見出し</code>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    見出し3：<code style={{ backgroundColor: '#E5E5E5', padding: '2px 6px', borderRadius: '4px' }}>### 見出し</code>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    強調（太字）：<code style={{ backgroundColor: '#E5E5E5', padding: '2px 6px', borderRadius: '4px' }}>**強調したいテキスト**</code>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    ルビ：<code style={{ backgroundColor: '#E5E5E5', padding: '2px 6px', borderRadius: '4px' }}>漢字《かんじ》</code>
                  </div>
                  <div>
                    改ページ：<code style={{ backgroundColor: '#E5E5E5', padding: '2px 6px', borderRadius: '4px' }}>───</code>
                  </div>
                </div>
              </div>

              {/* タグ入力 */}
              <div className="mb-24">
                <label className="form-label-bold mb-12">
                  タグを追加 <span className="form-required">*</span>
                </label>
                <div className="form-hint mb-8">
                  最大10個まで（1個以上必須） {selectedTags.length}/10
                </div>
                
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  padding: '12px',
                  border: '1px solid #D0D5DA',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  minHeight: '48px',
                  alignItems: 'center'
                }}>
                  {selectedTags.map((tag, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        backgroundColor: '#5B7C99',
                        color: '#FFFFFF',
                        borderRadius: '16px',
                        fontSize: '13px',
                        fontWeight: '500'
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
                          alignItems: 'center',
                          fontSize: '12px'
                        }}
                      >
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
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      border: 'none',
                      outline: 'none',
                      fontSize: '14px',
                      padding: '4px',
                      color: '#222222'
                    }}
                  />
                </div>
              </div>

              {/* プリセットタグ */}
              <div className="mb-32">
                <label className="form-label mb-12">
                  プリセットタグから選択
                </label>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px',
                  padding: '16px',
                  backgroundColor: '#EEF0F3',
                  borderRadius: '8px'
                }}>
                  {presetTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => togglePresetTag(tag)}
                      className="filter-button"
                      style={{
                        backgroundColor: selectedTags.includes(tag) ? '#5B7C99' : '#FFFFFF',
                        color: selectedTags.includes(tag) ? '#FFFFFF' : '#222222',
                        borderColor: selectedTags.includes(tag) ? '#5B7C99' : '#D0D5DA'
                      }}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 年齢制限 */}
              <div className="mb-32">
                <label className="form-label-bold mb-12">
                  年齢制限 <span className="form-required">*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { value: 'general', label: '全年齢' },
                    { value: 'r18', label: 'R-18' },
                    { value: 'r18g', label: 'R-18G' }
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRating(item.value as any)}
                      className="radio-card"
                      style={{
                        flex: 1,
                        padding: '12px',
                        justifyContent: 'center',
                        backgroundColor: rating === item.value ? '#EAF0F5' : '#FFFFFF',
                        borderColor: rating === item.value ? '#5B7C99' : '#D0D5DA'
                      }}
                    >
                      <span style={{ 
                        fontSize: '14px',
                        fontWeight: rating === item.value ? '600' : '400',
                        color: '#222222'
                      }}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="form-hint" style={{ marginTop: '8px' }}>
                  R-18: 性的表現を含む / R-18G: 暴力的・グロテスク表現を含む
                </div>
              </div>

              {/* オリジナル作品 */}
              <div className="mb-24">
                <label className="radio-card" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isOriginal}
                    onChange={(e) => setIsOriginal(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      marginRight: '12px',
                      cursor: 'pointer',
                      accentColor: '#5B7C99'
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#222222' }}>
                      オリジナル作品
                    </div>
                    <div className="text-small text-gray">
                      二次創作ではない、独自に創作した作品の場合はチェック
                    </div>
                  </div>
                </label>
              </div>

              {/* コメント設定 */}
              <div className="mb-32">
                <label className="form-label-bold mb-12">
                  作品へのコメント
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { value: true, label: '許可する', icon: 'fa-comment' },
                    { value: false, label: '許可しない', icon: 'fa-comment-slash' }
                  ].map((item) => (
                    <button
                      key={String(item.value)}
                      type="button"
                      onClick={() => setAllowComments(item.value)}
                      className="radio-card"
                      style={{
                        flex: 1,
                        padding: '12px',
                        justifyContent: 'center',
                        backgroundColor: allowComments === item.value ? '#EAF0F5' : '#FFFFFF',
                        borderColor: allowComments === item.value ? '#5B7C99' : '#D0D5DA'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className={`fas ${item.icon}`} style={{ color: '#5B7C99' }}></i>
                        <span style={{ 
                          fontSize: '14px',
                          fontWeight: allowComments === item.value ? '600' : '400',
                          color: '#222222'
                        }}>
                          {item.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 公開範囲 */}
              <div className="mb-32">
                <label className="form-label-bold mb-12">
                  公開範囲 <span className="form-required">*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'public', label: '全体公開', icon: 'fa-globe' },
                    { value: 'followers', label: 'フォロワー限定', icon: 'fa-users' },
                    { value: 'private', label: '非公開', icon: 'fa-lock' }
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

              {/* 利用規約同意 */}
              <div className="mb-40">
                <label className="radio-card" style={{ 
                  cursor: 'pointer',
                  borderColor: errors.terms ? '#C05656' : (agreedToTerms ? '#5B7C99' : '#D0D5DA'),
                  backgroundColor: agreedToTerms ? '#EAF0F5' : '#FFFFFF'
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
                      marginRight: '12px',
                      cursor: 'pointer',
                      accentColor: '#5B7C99'
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#222222' }}>
                      利用規約への同意 <span className="form-required">*</span>
                    </div>
                    <div className="text-small text-gray">
                      <Link href="/terms" target="_blank" className="text-link">利用規約</Link>や
                      <Link href="/guideline" target="_blank" className="text-link">ガイドライン</Link>
                      に違反する作品は削除の対象となります
                    </div>
                  </div>
                </label>
                {errors.terms && (
                  <div className="form-error">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.terms}
                  </div>
                )}
              </div>

              {/* ボタン */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Link 
                  href="/portfolio/upload"
                  style={{
                    fontSize: '14px',
                    color: '#555555',
                    textDecoration: 'none',
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
                </Link>
                
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
                  {uploading ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
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
      </div>
      <Footer />

      {showPreviewModal && (
        <PreviewModal
          title={title}
          synopsis={synopsis}
          content={content}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {showConfirmModal && (
        <ConfirmModal
          title={title}
          synopsis={synopsis}
          content={content}
          tags={selectedTags}
          rating={rating}
          isOriginal={isOriginal}
          allowComments={allowComments}
          thumbnailPreview={thumbnailPreview}
          visibility={visibility}
          onConfirm={handleConfirmedSubmit}
          onCancel={() => setShowConfirmModal(false)}
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
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
          
          .mb-40 {
            margin-bottom: 24px !important;
          }
          
          .mb-32 {
            margin-bottom: 24px !important;
          }
          
          .flex-between {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 12px;
          }
          
          .btn-small {
            width: 100%;
            padding: 10px 16px !important;
          }
          
          /* プレビューボタン - スマホで下部に移動 */
          .novel-preview-button {
            position: static !important;
            width: 100% !important;
            justify-content: center !important;
            margin-bottom: 12px !important;
          }
          
          /* ツールバー - 縦並び */
          .novel-toolbar {
            flex-direction: column !important;
            gap: 8px !important;
          }
          
          .novel-toolbar button {
            width: 100% !important;
            justify-content: center !important;
          }
          
          /* 年齢制限・コメント・公開範囲 */
          div[style*="display: flex"][style*="gap: 12px"]:has(.radio-card) {
            flex-direction: column !important;
            gap: 8px !important;
          }
          
          .radio-card {
            width: 100% !important;
            flex: 1 1 100% !important;
            min-width: 100% !important;
          }
          
          /* 確認モーダル */
          .card-no-hover[style*="maxWidth: 800px"] {
            padding: 24px 16px !important;
          }
          
          /* 下書きモーダル */
          .card-no-hover[style*="maxWidth: 600px"] {
            padding: 20px 16px !important;
          }
          
          .card[style*="padding: 20px"] {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          
          .card[style*="padding: 20px"] > div[style*="flex: 1"] {
            width: 100% !important;
          }
          
          .card[style*="padding: 20px"] .btn-small {
            margin-top: 12px !important;
          }

          /* ボタンエリア */
          div[style*="justifyContent: space-between"]:has(a[href="/portfolio/upload"]) {
            flex-direction: column-reverse !important;
            gap: 12px !important;
          }
          
          div[style*="justifyContent: space-between"]:has(a[href="/portfolio/upload"]) a,
          div[style*="justifyContent: space-between"]:has(a[href="/portfolio/upload"]) button {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </>
  )
}

export default function UploadNovelPage() {
  return <UploadNovelPageContent />
}