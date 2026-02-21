'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getUploadUrl, uploadToR2 } from '@/lib/r2-upload'

export type Draft = {
  id: string
  creator_id: string
  category: string
  title: string
  description: string
  tags: string[]
  rating: 'general' | 'r18' | 'r18g'
  is_original: boolean
  allow_comments: boolean
  is_public: boolean
  image_urls: string[] | null
  audio_url: string | null
  video_url: string | null
  text_content: string | null
  created_at: string
  updated_at: string
  // フロント用（API側で付与）
  categoryName?: string
  categoryIcon?: string
}

export type DraftFormData = {
  title: string
  description: string
  tags: string[]
  rating: 'general' | 'r18' | 'r18g'
  is_original: boolean
  allow_comments: boolean
  is_public: boolean
}

const CATEGORY_URLS: { [key: string]: string } = {
  illustration: '/dashboard/portfolio/upload/illustration',
  manga: '/dashboard/portfolio/upload/manga',
  novel: '/dashboard/portfolio/upload/novel',
  music: '/dashboard/portfolio/upload/music',
  voice: '/dashboard/portfolio/upload/voice',
  video: '/dashboard/portfolio/upload/video'
}

export function useDraft(category: string, formData: DraftFormData, userId: string, imageFiles?: File[]) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedRef = useRef<string>('')

  // 下書き一覧取得
  const loadDrafts = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch('/api/drafts')
      if (!res.ok) return
      const data = await res.json()
      setDrafts(data.drafts || [])
    } catch (error) {
      console.error('下書き取得エラー:', error)
    }
  }, [userId])

  // 初回読み込み
  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  // 画像をR2にアップロード
  async function uploadDraftImages(files: File[], uid: string): Promise<string[]> {
    const urls: string[] = []
    for (const file of files) {
      const { uploadUrl, fileUrl } = await getUploadUrl(
        'draft',
        'image',
        file.name,
        file.type,
        uid
      )
      await uploadToR2(file, uploadUrl)
      urls.push(fileUrl)
    }
    return urls
  }

  // 自動保存
  useEffect(() => {
    if (!userId) return
    if (!formData.title.trim() && formData.tags.length === 0 && (!imageFiles || imageFiles.length === 0)) return

    // 変更検知（無駄な保存を防ぐ）
    const snapshot = JSON.stringify({ ...formData, imageCount: imageFiles?.length || 0 })
    if (snapshot === lastSavedRef.current) return

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        // 画像アップロード（新規ファイルがある場合）
        let imageUrls: string[] | null = null
        if (imageFiles && imageFiles.length > 0) {
          // 既存の下書きに画像URLがあればそれを保持、新規ファイルだけアップ
          if (currentDraftId) {
            const existing = drafts.find(d => d.id === currentDraftId)
            const existingUrls = existing?.image_urls || []
            
            // 枚数が変わった場合のみ再アップロード
            if (existingUrls.length !== imageFiles.length) {
              imageUrls = await uploadDraftImages(imageFiles, userId)
            } else {
              imageUrls = existingUrls
            }
          } else {
            imageUrls = await uploadDraftImages(imageFiles, userId)
          }
        }

        const payload = {
          category,
          title: formData.title,
          description: formData.description,
          tags: formData.tags,
          rating: formData.rating,
          is_original: formData.is_original,
          allow_comments: formData.allow_comments,
          is_public: formData.is_public,
          image_urls: imageUrls
        }

        let res: Response
        if (currentDraftId) {
          // 既存の下書きを更新
          res = await fetch(`/api/drafts/${currentDraftId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        } else {
          // 新規作成
          res = await fetch('/api/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        }

        if (res.ok) {
          const data = await res.json()
          if (!currentDraftId && data.draft?.id) {
            setCurrentDraftId(data.draft.id)
          }
          lastSavedRef.current = snapshot
          await loadDrafts()
        }
      } catch (error) {
        console.error('自動保存エラー:', error)
      } finally {
        setSaving(false)
      }
    }, 3000)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [formData, userId, category, currentDraftId, imageFiles?.length])

  // 下書き削除
  async function deleteDraft(draft: Draft) {
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, { method: 'DELETE' })
      if (res.ok) {
        if (currentDraftId === draft.id) {
          setCurrentDraftId(null)
        }
        await loadDrafts()
      }
    } catch (error) {
      console.error('下書き削除エラー:', error)
    }
  }

  // 下書きIDを引き継ぎ
  function adoptDraftId(id: string) {
    setCurrentDraftId(id)
  }

  // 他カテゴリの遷移先URL取得
  function getCategoryUrl(draft: Draft): string | null {
    if (draft.category === category) return null
    return CATEGORY_URLS[draft.category] || null
  }

  // 投稿確定（R2コピー+下書き削除）
  async function publishDraft(draftId: string): Promise<string[]> {
    const res = await fetch(`/api/drafts/${draftId}/publish`, {
      method: 'POST'
    })
    if (!res.ok) {
      throw new Error('投稿確定に失敗しました')
    }
    const data = await res.json()
    setCurrentDraftId(null)
    await loadDrafts()
    return data.publishedUrls || []
  }

  return {
    drafts,
    currentDraftId,
    saving,
    deleteDraft,
    adoptDraftId,
    getCategoryUrl,
    publishDraft,
    loadDrafts
  }
}