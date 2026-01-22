import { create } from 'zustand'

type DraftState = {
  count: number
  recount: () => void
}

function countAllDrafts(): number {
  if (typeof window === 'undefined') return 0
  
  const keys = [
    'illustration_drafts',
    'manga_drafts', 
    'novel_drafts',
    'music_drafts',
    'voice_drafts',
    'video_drafts'
  ]
  
  let total = 0
  keys.forEach(key => {
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          total += parsed.length
        } else if (typeof parsed === 'object') {
          total += Object.keys(parsed).length
        }
      }
    } catch (e) {
      // 無視
    }
  })
  
  return total
}

export const useDraftStore = create<DraftState>((set, get) => ({
  count: 0,
  recount: () => {
    const newCount = countAllDrafts()
    // 値が同じなら更新しない（再レンダリング防止）
    if (get().count !== newCount) {
      set({ count: newCount })
    }
  }
}))