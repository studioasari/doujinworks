'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type ImageItem = {
  key: string
  url: string
  size: number
  lastModified: string
}

export default function AdminPostImagesPage() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchImages()
  }, [])

  const fetchImages = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/posts-images')
      const data = await response.json()
      setImages(data.images || [])
    } catch (error) {
      console.error('Failed to fetch images:', error)
    }
    setLoading(false)
  }

  const handleDelete = async (key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('この画像を削除しますか？\n※記事内で使用中の場合、表示されなくなります')) return

    setDeleting(key)
    try {
      const response = await fetch('/api/posts-images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      })

      if (response.ok) {
        setImages(images.filter(img => img.key !== key))
        setSelectedImages(prev => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      } else {
        alert('削除に失敗しました')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('削除に失敗しました')
    }
    setDeleting(null)
  }

  const handleBulkDelete = async () => {
    if (selectedImages.size === 0) return
    if (!confirm(`${selectedImages.size}件の画像を削除しますか？\n※記事内で使用中の場合、表示されなくなります`)) return

    for (const key of selectedImages) {
      setDeleting(key)
      try {
        await fetch('/api/posts-images', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key })
        })
      } catch (error) {
        console.error('Delete error:', error)
      }
    }
    
    setImages(images.filter(img => !selectedImages.has(img.key)))
    setSelectedImages(new Set())
    setDeleting(null)
  }

  const copyUrl = (url: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const toggleSelect = (key: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set())
    } else {
      setSelectedImages(new Set(images.map(img => img.key)))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: '#6b7280' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginRight: '12px' }}></i>
        読み込み中...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* ヘッダー */}
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid #e5e7eb', 
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin/posts" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-arrow-left"></i>
            <span>記事一覧</span>
          </Link>
          <div style={{ width: '1px', height: '16px', background: '#e5e7eb' }} />
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>画像管理</h1>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{images.length}件の画像</p>
          </div>
        </div>
        {selectedImages.size > 0 && (
          <button
            className="admin-action-btn danger"
            onClick={handleBulkDelete}
            style={{ padding: '8px 16px', fontSize: '0.8125rem' }}
          >
            <i className="fas fa-trash" style={{ marginRight: '6px' }}></i>
            {selectedImages.size}件を削除
          </button>
        )}
      </div>

      {/* 選択バー */}
      {images.length > 0 && (
        <div style={{ 
          padding: '10px 24px',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8125rem', color: '#374151' }}>
            <input
              type="checkbox"
              checked={selectedImages.size === images.length && images.length > 0}
              onChange={toggleSelectAll}
              style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }}
            />
            すべて選択
          </label>
          {selectedImages.size > 0 && (
            <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
              {selectedImages.size}件選択中
            </span>
          )}
        </div>
      )}

      {/* 画像グリッド */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {images.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            color: '#9ca3af'
          }}>
            <i className="fas fa-images" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <p style={{ fontSize: '1rem', marginBottom: '8px' }}>画像がありません</p>
            <p style={{ fontSize: '0.875rem' }}>記事作成時にアップロードしてください</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '16px'
          }}>
            {images.map(image => {
              const isSelected = selectedImages.has(image.key)
              return (
                <div
                  key={image.key}
                  onClick={() => toggleSelect(image.key)}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    transform: isSelected ? 'scale(0.98)' : 'scale(1)',
                    boxShadow: isSelected ? '0 0 0 3px rgba(79, 70, 229, 0.1)' : 'none'
                  }}
                >
                  {/* 画像 */}
                  <div style={{
                    aspectRatio: '1',
                    background: '#f3f4f6',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <img
                      src={image.url}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      loading="lazy"
                    />
                    {/* チェックマーク */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isSelected ? '#4f46e5' : 'rgba(255,255,255,0.9)',
                      border: isSelected ? 'none' : '2px solid #d1d5db',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s'
                    }}>
                      {isSelected && <i className="fas fa-check" style={{ color: 'white', fontSize: '12px' }}></i>}
                    </div>
                    {/* ファイルタイプ表示 */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      fontSize: '0.625rem',
                      fontWeight: '500'
                    }}>
                      {image.key.match(/\.(mp4|webm|mov)$/i) ? '動画' : '画像'}
                    </div>
                  </div>

                  {/* 情報・アクション */}
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{formatFileSize(image.size)}</span>
                      <span>{formatDate(image.lastModified)}</span>
                    </div>

                    {/* アクションボタン */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={(e) => copyUrl(image.url, e)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          background: copiedUrl === image.url ? '#22c55e' : 'white',
                          color: copiedUrl === image.url ? 'white' : '#374151',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          transition: 'all 0.15s'
                        }}
                      >
                        {copiedUrl === image.url ? 'コピー済' : 'URLをコピー'}
                      </button>
                      <button
                        onClick={(e) => handleDelete(image.key, e)}
                        disabled={deleting === image.key}
                        style={{
                          width: '36px',
                          padding: '8px',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          cursor: deleting === image.key ? 'wait' : 'pointer',
                          fontSize: '0.75rem',
                          flexShrink: 0
                        }}
                      >
                        {deleting === image.key ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fas fa-trash"></i>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}