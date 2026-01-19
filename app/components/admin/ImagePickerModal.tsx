'use client'

import { useEffect, useState } from 'react'

type ImageItem = {
  key: string
  url: string
  size: number
  lastModified: string
}

type ImagePickerModalProps = {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string) => void
  mode: 'thumbnail' | 'inline'  // サムネイル選択 or 本文挿入
}

export default function ImagePickerModal({ isOpen, onClose, onSelect, mode }: ImagePickerModalProps) {
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchImages()
    }
  }, [isOpen])

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload-posts', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Failed to upload')

      const data = await response.json()

      // 一覧を更新
      await fetchImages()
      
      // アップロードした画像を選択
      onSelect(data.fileUrl)
      onClose()
    } catch (error) {
      console.error('Upload error:', error)
      alert('アップロードに失敗しました')
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleSelect = (url: string) => {
    onSelect(url)
    onClose()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!isOpen) return null

  return (
    <div 
      className="admin-modal-overlay" 
      onClick={onClose}
      style={{ zIndex: 1000 }}
    >
      <div 
        className="admin-modal" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '800px', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="admin-modal-header">
          <h3>
            <i className="fas fa-images" style={{ marginRight: '8px' }}></i>
            {mode === 'thumbnail' ? 'サムネイル画像を選択' : '画像を挿入'}
          </h3>
          <button className="admin-modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <label 
            className="admin-action-btn primary" 
            style={{ cursor: uploading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
            {uploading ? 'アップロード中...' : '新しい画像をアップロード'}
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </label>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
              <p>読み込み中...</p>
            </div>
          ) : images.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <i className="fas fa-images" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
              <p>画像がありません</p>
              <p style={{ fontSize: '0.875rem' }}>上のボタンからアップロードしてください</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '12px'
            }}>
              {images.map(image => (
                <div
                  key={image.key}
                  onClick={() => handleSelect(image.url)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '8px',
                    border: '2px solid transparent',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    background: '#f3f4f6',
                    transition: 'border-color 0.15s, transform 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#4f46e5'
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'transparent'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
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
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '4px 6px',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    fontSize: '0.625rem'
                  }}>
                    {formatFileSize(image.size)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-modal-footer">
          <button className="admin-action-btn secondary" onClick={onClose}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}