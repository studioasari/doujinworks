'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ImagePickerModal from '@/app/components/admin/ImagePickerModal'

type Category = {
  id: string
  name: string
  slug: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function AdminNewPostPage() {
  const supabase = createClient()
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingInline, setUploadingInline] = useState(false)
  const [postId, setPostId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const lastSavedRef = useRef<string>('')
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [imagePickerMode, setImagePickerMode] = useState<'thumbnail' | 'inline'>('inline')
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category_id: '',
    excerpt: '',
    content: '',
    thumbnail_url: '',
    status: 'draft'
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    const currentData = JSON.stringify(formData)
    if (currentData === lastSavedRef.current) return
    if (!formData.title) return

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => handleAutoSave(), 30000)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
  }, [formData])

  const fetchCategories = async () => {
    const { data } = await supabase.from('post_categories').select('*').order('sort_order')
    if (data) setCategories(data)
  }

  const generateSlug = (title: string) => {
    const timestamp = Date.now().toString(36)
    const base = title.toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '-')
      .replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 30)
    return `${base}-${timestamp}`
  }

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({ ...prev, title, slug: prev.slug || generateSlug(title) }))
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload-posts', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Failed to upload')
      
      const data = await response.json()
      
      // 圧縮率をコンソールに表示（開発時の確認用）
      if (data.savedPercent) {
        console.log(`画像最適化: ${data.savedPercent}%削減`)
      }
      
      return data.fileUrl
    } catch (error) {
      console.error('Upload error:', error)
      alert('アップロードに失敗しました')
      return null
    }
  }

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newContent = formData.content.substring(0, start) + text + formData.content.substring(end)
    setFormData(prev => ({ ...prev, content: newContent }))
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }

  const wrapSelection = (before: string, after: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = formData.content.substring(start, end)
    const newContent = formData.content.substring(0, start) + before + selected + after + formData.content.substring(end)
    setFormData(prev => ({ ...prev, content: newContent }))
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingInline(true)
    const url = await uploadFile(file)
    if (url) insertAtCursor(`<img src="${url}" alt="" style="max-width: 100%;" />\n`)
    setUploadingInline(false)
    e.target.value = ''
  }

  const handleImageSelect = (url: string) => {
    if (imagePickerMode === 'thumbnail') {
      setFormData(prev => ({ ...prev, thumbnail_url: url }))
    } else {
      insertAtCursor(`<img src="${url}" alt="" style="max-width: 100%;" />\n`)
    }
  }

  const openImagePicker = (mode: 'thumbnail' | 'inline') => {
    setImagePickerMode(mode)
    setImagePickerOpen(true)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const imageFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    setUploadingInline(true)
    for (const file of imageFiles) {
      const url = await uploadFile(file)
      if (url) insertAtCursor(`<img src="${url}" alt="" style="max-width: 100%;" />\n`)
    }
    setUploadingInline(false)
  }, [formData.content])

  const handleAutoSave = async () => {
    if (!formData.title || !formData.slug) return
    setSaveStatus('saving')
    const postData = { ...formData, category_id: formData.category_id || null, status: 'draft', published_at: null }
    try {
      if (postId) {
        const { error } = await supabase.from('posts').update({ ...postData, updated_at: new Date().toISOString() }).eq('id', postId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('posts').insert(postData).select('id').single()
        if (error) throw error
        if (data) setPostId(data.id)
      }
      lastSavedRef.current = JSON.stringify(formData)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Auto-save error:', error)
      setSaveStatus('error')
    }
  }

  const handleSubmit = async (publish: boolean = false) => {
    if (!formData.title || !formData.slug || !formData.content) {
      alert('タイトル、スラッグ、本文は必須です')
      return
    }
    setLoading(true)
    const postData = {
      ...formData,
      category_id: formData.category_id || null,
      status: publish ? 'published' : 'draft',
      published_at: publish ? new Date().toISOString() : null
    }
    try {
      if (postId) {
        const { error } = await supabase.from('posts').update({ ...postData, updated_at: new Date().toISOString() }).eq('id', postId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('posts').insert(postData)
        if (error) throw error
      }
      router.push('/admin/posts')
    } catch (error: unknown) {
      alert('保存に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'))
    }
    setLoading(false)
  }

  const toolbarButtons = [
    { icon: 'fa-heading', label: 'H2', action: () => wrapSelection('<h2>', '</h2>') },
    { icon: 'fa-heading', label: 'H3', action: () => wrapSelection('<h3>', '</h3>'), small: true },
    { icon: 'fa-bold', label: '太字', action: () => wrapSelection('<strong>', '</strong>') },
    { icon: 'fa-link', label: 'リンク', action: () => wrapSelection('<a href="">', '</a>') },
    { icon: 'fa-list-ul', label: 'リスト', action: () => insertAtCursor('<ul>\n  <li></li>\n</ul>\n') },
    { icon: 'fa-quote-left', label: '引用', action: () => wrapSelection('<blockquote>', '</blockquote>') },
    { icon: 'fa-code', label: 'コード', action: () => wrapSelection('<code>', '</code>') },
    { icon: 'fa-paragraph', label: '段落', action: () => wrapSelection('<p>', '</p>') },
  ]

  const getSaveStatusDisplay = () => {
    switch (saveStatus) {
      case 'saving': return <span style={{ color: '#6b7280', fontSize: '0.8125rem' }}><i className="fas fa-spinner fa-spin"></i> 保存中</span>
      case 'saved': return <span style={{ color: '#22c55e', fontSize: '0.8125rem' }}><i className="fas fa-check"></i> 保存済</span>
      case 'error': return <span style={{ color: '#ef4444', fontSize: '0.8125rem' }}><i className="fas fa-exclamation-circle"></i> エラー</span>
      default: return null
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* ヘッダー */}
      <div style={{ 
        padding: '12px 20px', 
        borderBottom: '1px solid #e5e7eb', 
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/admin/posts" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-arrow-left"></i>
            <span>記事一覧</span>
          </Link>
          {getSaveStatusDisplay()}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="admin-action-btn secondary" onClick={() => handleSubmit(false)} disabled={loading} style={{ width: '100px', padding: '8px 0', fontSize: '0.8125rem' }}>
            下書き保存
          </button>
          <button className="admin-action-btn primary" onClick={() => handleSubmit(true)} disabled={loading} style={{ width: '100px', padding: '8px 0', fontSize: '0.8125rem' }}>
            公開する
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左：エディター */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {/* タイトル */}
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="タイトルを入力..."
            style={{
              padding: '20px 24px',
              fontSize: '1.5rem',
              fontWeight: '600',
              border: 'none',
              borderBottom: '1px solid #e5e7eb',
              outline: 'none',
              background: 'white'
            }}
          />
          
          {/* ツールバー */}
          <div style={{ 
            padding: '8px 16px', 
            borderBottom: '1px solid #e5e7eb', 
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexWrap: 'wrap',
            flexShrink: 0
          }}>
            {toolbarButtons.map((btn, i) => (
              <button
                key={i}
                onClick={btn.action}
                title={btn.label}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: btn.small ? '0.7rem' : '0.8rem',
                  color: '#374151'
                }}
              >
                <i className={`fas ${btn.icon}`}></i>
                {btn.label === 'H3' && <span style={{ marginLeft: '2px' }}>3</span>}
              </button>
            ))}
            <div style={{ width: '1px', height: '20px', background: '#e5e7eb', margin: '0 4px' }} />
            <button onClick={() => openImagePicker('inline')} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#374151' }}>
              <i className="fas fa-images"></i>
            </button>
            <label style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '4px', background: uploadingInline ? '#f3f4f6' : 'white', cursor: uploadingInline ? 'wait' : 'pointer', fontSize: '0.8rem', color: '#374151' }}>
              <i className={`fas ${uploadingInline ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
              <input type="file" accept="image/*" onChange={handleInlineImageUpload} style={{ display: 'none' }} disabled={uploadingInline} />
            </label>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                padding: '6px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                background: showPreview ? '#4f46e5' : 'white',
                color: showPreview ? 'white' : '#374151',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              <i className="fas fa-eye"></i>
            </button>
          </div>

          {/* エディター本体 */}
          <div 
            style={{ 
              flex: 1, 
              display: 'flex',
              overflow: 'hidden',
              position: 'relative',
              background: isDragging ? '#f0f0ff' : 'white'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(79, 70, 229, 0.1)', zIndex: 10, pointerEvents: 'none', border: '2px dashed #4f46e5'
              }}>
                <div style={{ color: '#4f46e5', fontSize: '1.125rem', fontWeight: '500' }}>
                  <i className="fas fa-cloud-upload-alt" style={{ marginRight: '8px' }}></i>
                  画像をドロップ
                </div>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="<p>本文をHTMLで入力...</p>"
              style={{
                flex: showPreview ? '1' : '1',
                minWidth: showPreview ? '50%' : '100%',
                padding: '20px 24px',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                lineHeight: '1.7',
                background: '#fafafa'
              }}
            />
            {showPreview && (
              <div
                className="post-content"
                style={{
                  flex: 1,
                  padding: '20px 24px',
                  overflowY: 'auto',
                  borderLeft: '1px solid #e5e7eb',
                  fontSize: '0.9375rem',
                  lineHeight: '1.8',
                  color: '#374151',
                  background: 'white'
                }}
                dangerouslySetInnerHTML={{ __html: formData.content }}
              />
            )}
          </div>
        </div>

        {/* 右：サイドバー */}
        <div style={{ width: '280px', background: '#fafafa', overflowY: 'auto', flexShrink: 0 }}>
          {/* ステータス */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '8px' }}>
              ステータス
            </label>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: '500',
              background: '#f3f4f6',
              color: '#6b7280'
            }}>
              <i className="fas fa-file-alt" style={{ fontSize: '0.75rem' }}></i>
              下書き
            </div>
          </div>

          {/* サムネイル */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '8px' }}>
              サムネイル
            </label>
            {formData.thumbnail_url ? (
              <div>
                <img
                  src={formData.thumbnail_url}
                  alt="thumbnail"
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openImagePicker('thumbnail')} className="admin-action-btn secondary" style={{ flex: 1, padding: '6px', fontSize: '0.75rem' }}>
                    変更
                  </button>
                  <button onClick={() => setFormData(prev => ({ ...prev, thumbnail_url: '' }))} className="admin-action-btn danger" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => openImagePicker('thumbnail')}
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#9ca3af',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.color = '#4f46e5' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#9ca3af' }}
              >
                <i className="fas fa-image" style={{ fontSize: '1.5rem' }}></i>
                <span style={{ fontSize: '0.75rem' }}>クリックして選択</span>
              </button>
            )}
          </div>

          {/* スラッグ */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '8px' }}>
              スラッグ
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="url-slug"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontFamily: 'monospace'
              }}
            />
          </div>

          {/* カテゴリー */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '8px' }}>
              カテゴリー
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                background: 'white'
              }}
            >
              <option value="">選択してください</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* 抜粋 */}
          <div style={{ padding: '16px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '8px' }}>
              抜粋
            </label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              placeholder="記事の概要..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      </div>

      <ImagePickerModal
        isOpen={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={handleImageSelect}
        mode={imagePickerMode}
      />
    </div>
  )
}