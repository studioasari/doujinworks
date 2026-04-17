'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './page.module.css'

const MAX_FILE_SIZE = 524288000 // 500MB
const MAX_FILES = 10

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff',
  'psd', 'ai', 'pdf', 'sketch', 'fig', 'xd',
  'blend', 'fbx', 'obj', 'glb', 'gltf',
  'mp4', 'mov', 'webm', 'avi', 'mkv',
  'mp3', 'wav', 'm4a', 'ogg', 'flac',
  'zip', 'rar', '7z',
  'txt', 'md', 'doc', 'docx',
])

export type UploadedFile = {
  r2Key: string
  originalFilename: string
  fileSize: number
  mimeType: string
}

type PendingFile = {
  id: string
  file: File
  r2Key: string | null
  status: 'queued' | 'uploading' | 'done' | 'error'
  progress: number
  errorMessage?: string
}

type Props = {
  contractId: string
  deliveryId: string
  onFilesChange: (files: UploadedFile[]) => void
  disabled?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getExtension(filename: string): string | null {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === filename.length - 1) return null
  return filename.slice(dotIndex + 1).toLowerCase()
}

function getFileIcon(filename: string): string {
  const ext = getExtension(filename)
  if (!ext) return 'fa-file'
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

export default function DeliveryFileUploader({ contractId, deliveryId, onFilesChange, disabled }: Props) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const isUploadingRef = useRef(false)

  // 完了ファイルが変わるたびに親に通知
  useEffect(() => {
    const doneFiles: UploadedFile[] = pendingFiles
      .filter(f => f.status === 'done' && f.r2Key)
      .map(f => ({
        r2Key: f.r2Key!,
        originalFilename: f.file.name,
        fileSize: f.file.size,
        mimeType: f.file.type || 'application/octet-stream',
      }))
    onFilesChange(doneFiles)
  }, [pendingFiles, onFilesChange])

  // キューに queued があれば順次アップロード
  useEffect(() => {
    if (isUploadingRef.current) return
    const nextFile = pendingFiles.find(f => f.status === 'queued')
    if (!nextFile) return
    processUpload(nextFile.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFiles])

  const processUpload = useCallback(async (fileId: string) => {
    isUploadingRef.current = true
    setPendingFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'uploading' as const, progress: 0 } : f
    ))

    const target = pendingFiles.find(f => f.id === fileId)
    if (!target) {
      isUploadingRef.current = false
      return
    }

    try {
      // 署名URL 取得
      const res = await fetch('/api/upload-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          deliveryId,
          filename: target.file.name,
          contentType: target.file.type || 'application/octet-stream',
          fileSize: target.file.size,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'アップロードURLの取得に失敗しました')
      }

      const { uploadUrl, r2Key } = await res.json()

      // XHR で R2 に PUT
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr

        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', target.file.type || 'application/octet-stream')

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100)
            setPendingFiles(prev => prev.map(f =>
              f.id === fileId ? { ...f, progress: percent } : f
            ))
          }
        }

        xhr.onload = () => {
          xhrRef.current = null
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`アップロードに失敗しました (${xhr.status})`))
        }

        xhr.onerror = () => {
          xhrRef.current = null
          reject(new Error('ネットワークエラーが発生しました'))
        }

        xhr.onabort = () => {
          xhrRef.current = null
          reject(new Error('アップロードがキャンセルされました'))
        }

        xhr.send(target.file)
      })

      setPendingFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, status: 'done' as const, progress: 100, r2Key } : f
      ))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'アップロードに失敗しました'
      // abort は静かに処理（エラー表示しない）
      if (message === 'アップロードがキャンセルされました') {
        setPendingFiles(prev => prev.filter(f => f.id !== fileId))
      } else {
        setPendingFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, status: 'error' as const, errorMessage: message } : f
        ))
      }
    } finally {
      isUploadingRef.current = false
      // 次のキューをトリガー（state 更新で useEffect が発火）
      setPendingFiles(prev => [...prev])
    }
  }, [contractId, deliveryId, pendingFiles])

  function addFiles(newFiles: File[]) {
    const currentCount = pendingFiles.length
    const remaining = MAX_FILES - currentCount

    if (remaining <= 0) {
      alert(`ファイルは最大${MAX_FILES}件までです`)
      return
    }

    const toAdd = newFiles.slice(0, remaining)
    if (toAdd.length < newFiles.length) {
      alert(`ファイルは最大${MAX_FILES}件までです。${toAdd.length}件のみ追加されます。`)
    }

    const newPending: PendingFile[] = []

    for (const file of toAdd) {
      const ext = getExtension(file.name)
      if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
        alert(`「${file.name}」はアップロードできない形式です`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`「${file.name}」はサイズ上限（500MB）を超えています`)
        continue
      }
      if (file.size === 0) {
        alert(`「${file.name}」は空のファイルです`)
        continue
      }

      newPending.push({
        id: crypto.randomUUID(),
        file,
        r2Key: null,
        status: 'queued',
        progress: 0,
      })
    }

    if (newPending.length > 0) {
      setPendingFiles(prev => [...prev, ...newPending])
    }
  }

  function removeFile(fileId: string) {
    const file = pendingFiles.find(f => f.id === fileId)
    if (file?.status === 'uploading') {
      xhrRef.current?.abort()
    }
    setPendingFiles(prev => prev.filter(f => f.id !== fileId))
  }

  function retryFile(fileId: string) {
    setPendingFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'queued' as const, progress: 0, errorMessage: undefined } : f
    ))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) addFiles(files)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return
    const files = Array.from(e.target.files || [])
    if (files.length > 0) addFiles(files)
    e.target.value = ''
  }

  // cleanup on unmount (abort in-progress upload)
  useEffect(() => {
    return () => {
      xhrRef.current?.abort()
    }
  }, [])

  const isUploading = pendingFiles.some(f => f.status === 'uploading' || f.status === 'queued')

  return (
    <div>
      {/* ドロップゾーン */}
      <div
        className={`${styles.fileDropZone} ${dragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''}`}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className={styles.fileDropZoneIcon}>
          <i className="fa-solid fa-cloud-arrow-up"></i>
        </div>
        <p className={styles.fileDropZoneText}>
          クリックまたはドラッグしてファイルを追加
        </p>
        <p className={styles.fileDropZoneHint}>
          最大{MAX_FILES}ファイル（各500MBまで）
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* ファイル一覧 */}
      {pendingFiles.length > 0 && (
        <div className={styles.pendingFileList}>
          {pendingFiles.map((pf) => (
            <div key={pf.id} className={styles.pendingFileItem}>
              <div className={styles.pendingFileIcon}>
                <i className={`fa-solid ${getFileIcon(pf.file.name)}`}></i>
              </div>
              <div className={styles.pendingFileInfo}>
                <div className={styles.pendingFileName}>{pf.file.name}</div>
                <div className={styles.pendingFileMeta}>
                  {formatFileSize(pf.file.size)}
                  {pf.status === 'uploading' && ` • ${pf.progress}%`}
                </div>
                {pf.status === 'uploading' && (
                  <div className={styles.pendingFileProgress}>
                    <div
                      className={styles.pendingFileProgressBar}
                      style={{ width: `${pf.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {pf.status === 'done' && (
                <span className={`${styles.pendingFileStatus} ${styles.done}`}>
                  <i className="fa-solid fa-check"></i>
                </span>
              )}
              {pf.status === 'error' && (
                <span className={`${styles.pendingFileStatus} ${styles.error}`} title={pf.errorMessage}>
                  <i className="fa-solid fa-exclamation-triangle"></i>
                </span>
              )}
              {pf.status === 'uploading' && (
                <span className={`${styles.pendingFileStatus} ${styles.uploading}`}>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                </span>
              )}
              {pf.status === 'error' && (
                <button
                  type="button"
                  className={styles.pendingFileRemove}
                  onClick={() => retryFile(pf.id)}
                  title="再試行"
                >
                  <i className="fa-solid fa-rotate-right"></i>
                </button>
              )}
              <button
                type="button"
                className={styles.pendingFileRemove}
                onClick={() => removeFile(pf.id)}
                title="削除"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      {isUploading && (
        <div className={styles.pendingFileMeta} style={{ marginTop: 'var(--space-2)', textAlign: 'center' }}>
          アップロード中… モーダルを閉じるとキャンセルされます
        </div>
      )}
    </div>
  )
}
