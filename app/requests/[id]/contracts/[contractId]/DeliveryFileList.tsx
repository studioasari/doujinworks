'use client'

import { useState } from 'react'
import styles from './page.module.css'

export type DeliveryFile = {
  id: string
  r2_key: string
  original_filename: string
  file_size: number
  mime_type: string
  uploaded_at: string
  deleted_at: string | null
}

type Props = {
  files: DeliveryFile[]
  isContractor: boolean
  deliveryStatus: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'].includes(ext)) return 'fa-file-image'
  if (['psd', 'ai', 'sketch', 'fig', 'xd'].includes(ext)) return 'fa-file-pen'
  if (['pdf'].includes(ext)) return 'fa-file-pdf'
  if (['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) return 'fa-file-video'
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext)) return 'fa-file-audio'
  if (['zip', 'rar', '7z'].includes(ext)) return 'fa-file-zipper'
  if (['blend', 'fbx', 'obj', 'glb', 'gltf'].includes(ext)) return 'fa-cube'
  if (['txt', 'md', 'doc', 'docx'].includes(ext)) return 'fa-file-lines'
  return 'fa-file'
}

export default function DeliveryFileList({ files, isContractor, deliveryStatus }: Props) {
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [visibleFiles, setVisibleFiles] = useState(files)

  async function handleDownload(file: DeliveryFile) {
    setLoadingFileId(file.id)
    try {
      const res = await fetch('/api/delivery-files/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'ダウンロードに失敗しました')
        return
      }

      const { signedUrl } = await res.json()
      window.open(signedUrl, '_blank')
    } catch {
      alert('ダウンロードに失敗しました')
    } finally {
      setLoadingFileId(null)
    }
  }

  async function handleDelete(file: DeliveryFile) {
    if (!confirm(`「${file.original_filename}」を削除しますか？\nこの操作は取り消せません。`)) return

    setDeletingFileId(file.id)
    try {
      const res = await fetch('/api/delivery-files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || '削除に失敗しました')
        return
      }

      setVisibleFiles(prev => prev.filter(f => f.id !== file.id))
    } catch {
      alert('削除に失敗しました')
    } finally {
      setDeletingFileId(null)
    }
  }

  if (visibleFiles.length === 0) return null

  const canDelete = isContractor && deliveryStatus === 'pending'

  return (
    <div className={styles.deliveryFileList}>
      {visibleFiles.map((file) => (
        <div key={file.id} className={styles.deliveryFileItem}>
          <div className={styles.deliveryFileIcon}>
            <i className={`fa-solid ${getFileIcon(file.original_filename)}`}></i>
          </div>
          <div className={styles.deliveryFileInfo}>
            <div className={styles.deliveryFileName}>{file.original_filename}</div>
            <div className={styles.deliveryFileMeta}>
              {formatFileSize(file.file_size)} • {formatDateTime(file.uploaded_at)}
            </div>
          </div>
          <div className={styles.deliveryFileActions}>
            {canDelete && (
              <button
                className={`${styles.deliveryFileBtn} ${styles.danger}`}
                onClick={() => handleDelete(file)}
                disabled={deletingFileId === file.id}
                title="削除"
              >
                <i className="fa-solid fa-trash-can"></i>
                {deletingFileId === file.id ? '...' : '削除'}
              </button>
            )}
            <button
              className={styles.deliveryFileBtn}
              onClick={() => handleDownload(file)}
              disabled={loadingFileId === file.id}
              title="ダウンロード"
            >
              <i className="fa-solid fa-download"></i>
              {loadingFileId === file.id ? '...' : 'ダウンロード'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
