'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import DashboardSidebar from '../../components/DashboardSidebar'

type Category = 'all' | 'illustration' | 'manga' | 'novel' | 'music' | 'voice' | 'video'

type Draft = {
  id: string
  title: string
  savedAt: string
  category: Category
  data: any
}

type CategoryInfo = {
  id: Category
  name: string
  icon: string
  storageKey: string
  path: string
}

export default function DraftsPage() {
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<Category>('all')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const router = useRouter()

  const categories: CategoryInfo[] = [
    {
      id: 'all',
      name: 'すべて',
      icon: 'fas fa-th',
      storageKey: '',
      path: ''
    },
    {
      id: 'illustration',
      name: 'イラスト',
      icon: 'fas fa-image',
      storageKey: 'illustration_drafts',
      path: '/portfolio/upload/illustration'
    },
    {
      id: 'manga',
      name: 'マンガ',
      icon: 'fas fa-book',
      storageKey: 'manga_drafts',
      path: '/portfolio/upload/manga'
    },
    {
      id: 'novel',
      name: '小説',
      icon: 'fas fa-file-alt',
      storageKey: 'novel_drafts',
      path: '/portfolio/upload/novel'
    },
    {
      id: 'music',
      name: '音楽',
      icon: 'fas fa-music',
      storageKey: 'music_drafts',
      path: '/portfolio/upload/music'
    },
    {
      id: 'voice',
      name: 'ボイス',
      icon: 'fas fa-microphone',
      storageKey: 'voice_drafts',
      path: '/portfolio/upload/voice'
    },
    {
      id: 'video',
      name: '動画',
      icon: 'fas fa-video',
      storageKey: 'video_drafts',
      path: '/portfolio/upload/video'
    }
  ]

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      loadDrafts()
    }
  }, [currentUserId, selectedCategory])

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
        alert('プロフィールが見つかりません')
        router.push('/profile')
      }
    }
  }

  function loadDrafts() {
    try {
      const counts: Record<string, number> = {
        all: 0,
        illustration: 0,
        manga: 0,
        novel: 0,
        music: 0,
        voice: 0,
        video: 0
      }

      if (selectedCategory === 'all') {
        // 全カテゴリーの下書きを読み込み
        const allDrafts: Draft[] = []
        
        categories.forEach(cat => {
          if (cat.id === 'all') return
          
          const saved = localStorage.getItem(cat.storageKey)
          if (saved) {
            const parsed = JSON.parse(saved)
            const draftsArray: Draft[] = Object.entries(parsed)
              .map(([id, data]: [string, any]) => ({
                id,
                title: data.title || '無題',
                savedAt: data.savedAt || new Date().toISOString(),
                category: cat.id as Category,
                data
              }))
            
            counts[cat.id] = draftsArray.length
            counts.all += draftsArray.length
            allDrafts.push(...draftsArray)
          }
        })
        
        // 保存日時でソート（新しい順）
        allDrafts.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
        setDrafts(allDrafts)
        setCategoryCounts(counts)
      } else {
        // 特定カテゴリーの下書きを読み込み
        const category = categories.find(c => c.id === selectedCategory)
        if (!category || category.id === 'all') return

        const saved = localStorage.getItem(category.storageKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          const draftsArray: Draft[] = Object.entries(parsed)
            .map(([id, data]: [string, any]) => ({
              id,
              title: data.title || '無題',
              savedAt: data.savedAt || new Date().toISOString(),
              category: selectedCategory,
              data
            }))
          
          // 保存日時でソート（新しい順）
          draftsArray.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
          setDrafts(draftsArray)
          
          // 全カテゴリーの件数をカウント
          categories.forEach(cat => {
            if (cat.id === 'all') return
            const catSaved = localStorage.getItem(cat.storageKey)
            if (catSaved) {
              const catParsed = JSON.parse(catSaved)
              const count = Object.keys(catParsed).length
              counts[cat.id] = count
              counts.all += count
            }
          })
          setCategoryCounts(counts)
        } else {
          setDrafts([])
          // 他のカテゴリーの件数もカウント
          categories.forEach(cat => {
            if (cat.id === 'all') return
            const catSaved = localStorage.getItem(cat.storageKey)
            if (catSaved) {
              const catParsed = JSON.parse(catSaved)
              const count = Object.keys(catParsed).length
              counts[cat.id] = count
              counts.all += count
            }
          })
          setCategoryCounts(counts)
        }
      }
    } catch (error) {
      console.error('下書き読み込みエラー:', error)
      setDrafts([])
    }
  }

  function deleteDraft(draft: Draft) {
    if (!confirm('この下書きを削除しますか？')) return

    const category = categories.find(c => c.id === draft.category)
    if (!category || category.id === 'all') return

    try {
      const saved = localStorage.getItem(category.storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        delete parsed[draft.id]
        localStorage.setItem(category.storageKey, JSON.stringify(parsed))
        loadDrafts()
      }
    } catch (error) {
      console.error('下書き削除エラー:', error)
      alert('削除に失敗しました')
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return '今'
    if (minutes < 60) return `${minutes}分前`
    if (hours < 24) return `${hours}時間前`
    if (days < 7) return `${days}日前`
    
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
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
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* ヘッダー */}
            <div className="mb-32">
              <h1 className="page-title mb-8">
                下書き
              </h1>
              <p className="text-small text-gray">
                保存された下書きを確認・編集できます
              </p>
            </div>

            {/* カテゴリタブ */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '24px',
              borderBottom: '1px solid #E5E5E5',
              overflowX: 'auto',
              paddingBottom: '0'
            }}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${selectedCategory === category.id ? '#1A1A1A' : 'transparent'}`,
                    color: selectedCategory === category.id ? '#1A1A1A' : '#6B6B6B',
                    fontWeight: selectedCategory === category.id ? '600' : '400',
                    fontSize: '14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className={category.icon} style={{ fontSize: '14px' }}></i>
                  {category.name}
                  <span style={{ 
                    color: '#6B6B6B', 
                    fontSize: '13px',
                    fontWeight: '400'
                  }}>
                    ({categoryCounts[category.id] || 0})
                  </span>
                </button>
              ))}
            </div>

            {/* 下書き一覧 */}
            {drafts.length === 0 ? (
              <div className="card-no-hover" style={{
                padding: '60px 24px',
                textAlign: 'center'
              }}>
                <i className="fas fa-inbox" style={{
                  fontSize: '48px',
                  color: '#E5E5E5',
                  marginBottom: '16px',
                  display: 'block'
                }}></i>
                <p style={{
                  fontSize: '16px',
                  color: '#6B6B6B',
                  marginBottom: '8px'
                }}>
                  下書きがありません
                </p>
                <p className="text-small text-gray">
                  アップロードページで入力すると、自動的にここに保存されます
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '16px'
              }}>
                {drafts.map((draft) => {
                  const draftCategory = categories.find(c => c.id === draft.category)
                  const editPath = draftCategory?.path ? `${draftCategory.path}?draft=${draft.id}` : '/portfolio/upload'
                  
                  return (
                    <div
                      key={`${draft.category}-${draft.id}`}
                      className="card"
                      style={{
                        padding: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '20px'
                      }}
                    >
                      <Link
                        href={editPath}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0',
                          textDecoration: 'none',
                          color: 'inherit',
                          minWidth: 0
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            {selectedCategory === 'all' && draftCategory && (
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
                                <i className={draftCategory.icon} style={{ fontSize: '10px' }}></i>
                                {draftCategory.name}
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
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#1A1A1A',
                            marginBottom: '8px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {draft.title}
                          </h3>
                          <p className="text-small text-gray">
                            保存日時: {formatDate(draft.savedAt)}
                          </p>
                        </div>
                      </Link>

                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          deleteDraft(draft)
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
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}