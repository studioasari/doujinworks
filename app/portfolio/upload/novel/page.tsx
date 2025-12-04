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
  // モーダル表示中はスクロール無効化
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // ルビを変換
  function convertRuby(text: string): string {
    return text.replace(/(.+?)《(.+?)》/g, '<ruby>$1<rt>$2</rt></ruby>')
  }

  // 改ページを変換
  function convertPageBreak(text: string): string {
    return text.replace(/───/g, '<div style="display: flex; align-items: center; justify-content: center; margin: 48px 0; padding: 16px; border: 2px solid #E5E5E5; border-radius: 8px; background-color: #FAFAFA; color: #6B6B6B; font-size: 14px; font-weight: bold;"><i class="fas fa-grip-lines" style="margin-right: 8px;"></i>ページ区切り</div>')
  }

  // 見出しを変換
  function convertHeadings(text: string): string {
    let result = text
    // ### を h3 に
    result = result.replace(/^### (.+)$/gm, '<h3 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0;">$1</h3>')
    // ## を h2 に
    result = result.replace(/^## (.+)$/gm, '<h2 style="font-size: 22px; font-weight: bold; margin: 28px 0 14px 0;">$1</h2>')
    // # を h1 に
    result = result.replace(/^# (.+)$/gm, '<h1 style="font-size: 26px; font-weight: bold; margin: 32px 0 16px 0;">$1</h1>')
    return result
  }

  // 強調を変換
  function convertEmphasis(text: string): string {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: bold; background: linear-gradient(transparent 60%, #FFE066 60%);">$1</strong>')
  }

  // テキストを変換
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

        {/* タイトル */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '24px',
          lineHeight: '1.4'
        }}>
          {title || '（タイトルなし）'}
        </h1>

        {/* あらすじ */}
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

        {/* 本文 */}
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

        {/* 閉じるボタン */}
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

  // モーダル表示中はスクロール無効化
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // 文字数カウント
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

        {/* あらすじ */}
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

        {/* 本文（文字数のみ） */}
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
                    {new Date(draft.timestamp).toLocaleString('ja-JP')} · {(draft.content || '').length.toLocaleString()}文字
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
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  
  // エラー状態
  const [errors, setErrors] = useState({
    title: '',
    content: '',
    images: '',
    terms: ''
  })

  // トースト状態
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // ルビを挿入
  function insertRuby() {
    if (!contentRef.current) return
    
    const textarea = contentRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    let newText
    let cursorPosition
    
    if (selectedText) {
      // 選択範囲がある場合：選択テキスト《》
      newText = content.substring(0, start) + `${selectedText}《》` + content.substring(end)
      cursorPosition = start + selectedText.length + 2 // 《の後ろ
    } else {
      // 選択範囲がない場合：《》を挿入
      newText = content.substring(0, start) + '《》' + content.substring(end)
      cursorPosition = start + 1 // 《の後ろ
    }
    
    setContent(newText)
    
    // カーソル位置を復元
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorPosition, cursorPosition)
    }, 0)
  }

  // 改ページを挿入
  function insertPageBreak() {
    if (!contentRef.current) return
    
    const textarea = contentRef.current
    const start = textarea.selectionStart
    const newText = content.substring(0, start) + '\n───\n' + content.substring(start)
    
    setContent(newText)
    
    // カーソル位置を復元
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + 5, start + 5)
    }, 0)
  }

  // 見出しを挿入
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
      // 選択範囲がある場合：# 選択テキスト
      newText = content.substring(0, start) + headingPrefix + selectedText + content.substring(end)
      cursorPosition = start + headingPrefix.length + selectedText.length
    } else {
      // 選択範囲がない場合：# を挿入
      newText = content.substring(0, start) + headingPrefix + content.substring(end)
      cursorPosition = start + headingPrefix.length
    }
    
    setContent(newText)
    
    // カーソル位置を復元
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorPosition, cursorPosition)
    }, 0)
  }

  // 強調を挿入
  function insertEmphasis() {
    if (!contentRef.current) return
    
    const textarea = contentRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    let newText
    let cursorPosition
    
    if (selectedText) {
      // 選択範囲がある場合：**選択テキスト**
      newText = content.substring(0, start) + `**${selectedText}**` + content.substring(end)
      cursorPosition = start + selectedText.length + 4
    } else {
      // 選択範囲がない場合：****を挿入
      newText = content.substring(0, start) + '****' + content.substring(end)
      cursorPosition = start + 2 // **の間
    }
    
    setContent(newText)
    
    // カーソル位置を復元
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorPosition, cursorPosition)
    }, 0)
  }

  // プリセットタグ
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

  // 下書きを削除
  function deleteDraft(draft: Draft) {
    try {
      const storageKey = draft.category || 'novel_drafts'
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

  // 本文のリアルタイムバリデーション
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

  function processThumbnailFile(file: File) {
    // ファイルサイズチェック（32MB）
    if (file.size > 32 * 1024 * 1024) {
      setToast({ message: 'ファイルサイズは32MB以下にしてください', type: 'error' })
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

  function handleImageClick() {
    imageInputRef.current?.click()
  }

  function handleImageDrop(e: React.DragEvent) {
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

    if (synopsis.length > 500) {
      setToast({ message: 'あらすじは500文字以内にしてください', type: 'error' })
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
    content.trim().length > 0 &&
    content.length <= 100000 &&
    selectedTags.length > 0 && 
    agreedToTerms &&
    !errors.title &&
    !errors.content &&
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

      // 1. サムネイルをStorageにアップロード（あれば）
      let thumbnailUrl: string | null = null
      
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

      // 2. データベースに保存
      const { error: dbError } = await supabase
        .from('portfolio_items')
        .insert({
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
        })

      if (dbError) {
        throw dbError
      }

      setToast({ message: '小説をアップロードしました！', type: 'success' })
      
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

            <form onSubmit={handlePreSubmit} className="card-no-hover p-40">
              {/* サムネイル画像アップロード */}
              <div className="mb-32">
                <label className="form-label mb-12">
                  サムネイル画像（任意）
                </label>

                {/* サムネイルなしの時：アップロードエリア */}
                {!thumbnailPreview && (
                  <div
                    className={`upload-area ${dragging ? 'dragging' : ''}`}
                    style={{ width: '100%', height: '200px' }}
                    onClick={handleImageClick}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
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
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </div>

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
                  placeholder="小説のタイトル"
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

              {/* あらすじ */}
              <div className="mb-32">
                <label className="form-label">
                  あらすじ
                  <span style={{ 
                    marginLeft: '12px', 
                    fontSize: '12px', 
                    color: synopsis.length > 500 ? '#F44336' : '#6B6B6B',
                    fontWeight: 'normal'
                  }}>
                    {synopsis.length} / 500
                  </span>
                </label>
                <textarea
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="作品のあらすじを入力してください"
                  rows={4}
                  maxLength={500}
                  className="textarea-field"
                  style={{
                    borderColor: synopsis.length > 500 ? '#F44336' : undefined
                  }}
                />
              </div>

              {/* 本文 */}
              <div className="mb-24">
                <label className="form-label">
                  本文 <span className="form-required">*</span>
                  <span style={{ 
                    marginLeft: '12px', 
                    fontSize: '12px', 
                    color: content.length > 100000 ? '#F44336' : '#6B6B6B',
                    fontWeight: 'normal'
                  }}>
                    {content.length.toLocaleString()} / 100,000
                  </span>
                </label>

                {/* ツールバー */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: '#FAFAFA',
                  borderRadius: '8px 8px 0 0',
                  borderBottom: '1px solid #E5E5E5',
                  position: 'relative'
                }}>
                  {/* 見出しボタン（ドロップダウン付き） */}
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
                    
                    {/* ドロップダウンメニュー */}
                    {showHeadingMenu && (
                      <>
                        {/* 背景クリックで閉じる */}
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
                          border: '2px solid #E5E5E5',
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
                  className="textarea-field"
                  style={{
                    borderColor: errors.content ? '#F44336' : undefined,
                    fontFamily: 'monospace',
                    lineHeight: '1.8',
                    borderRadius: '0 0 8px 8px'
                  }}
                />
                {errors.content && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '14px',
                    color: '#F44336'
                  }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                    {errors.content}
                  </div>
                )}
                
                {/* 記法の説明 */}
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#FAFAFA',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#6B6B6B'
                }}>
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
                    強調：<code style={{ backgroundColor: '#E5E5E5', padding: '2px 6px', borderRadius: '4px' }}>**強調したいテキスト**</code>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    ルビ：<code style={{ backgroundColor: '#E5E5E5', padding: '2px 6px', borderRadius: '4px' }}>漢字《かんじ》</code>
                  </div>
                  <div>
                    改ページ：<code style={{ backgroundColor: '#E5E5E5', padding: '2px 6px', borderRadius: '4px' }}>───</code>
                  </div>
                </div>
              </div>

              {/* プレビューボタン */}
              <div className="mb-32" style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="btn-secondary"
                  disabled={!title.trim() && !content.trim()}
                >
                  <i className="fas fa-eye" style={{ marginRight: '8px' }}></i>
                  プレビュー
                </button>
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
                      二次創作ではない、独自に創作した作品の場合はチェックしてください
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

      {/* プレビューモーダル */}
      {showPreviewModal && (
        <PreviewModal
          title={title}
          synopsis={synopsis}
          content={content}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {/* 確認モーダル */}
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
export default function UploadNovelPage() {
  return <UploadNovelPageContent />
}