'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import DashboardSidebar from '@/app/components/DashboardSidebar'

type PortfolioItem = {
  id: string
  title: string
  description: string | null
  category: string | null
  image_url: string
  thumbnail_url: string | null
  is_public: boolean
  view_count: number
  created_at: string
}

// トーストコンポーネント
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`portfolio-manage-toast ${type}`}>
      <i className={type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'}></i>
      <span>{message}</span>
    </div>
  )
}

// 確認モーダルコンポーネント
function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isDestructive = false
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  isDestructive?: boolean
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="portfolio-manage-modal-overlay" onClick={onCancel}>
      <div className="portfolio-manage-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`portfolio-manage-confirm-icon ${isDestructive ? 'danger' : ''}`}>
          <i className={isDestructive ? 'fas fa-trash-alt' : 'fas fa-question-circle'}></i>
        </div>
        <h2 className="portfolio-manage-confirm-title">{title}</h2>
        <p className="portfolio-manage-confirm-message">{message}</p>
        <div className="portfolio-manage-confirm-actions">
          <button onClick={onCancel} className="portfolio-manage-btn secondary">
            キャンセル
          </button>
          <button 
            onClick={onConfirm} 
            className={`portfolio-manage-btn ${isDestructive ? 'danger' : 'primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PortfolioManageClient() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [accountType, setAccountType] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    itemId: string
    itemTitle: string
  }>({ show: false, itemId: '', itemTitle: '' })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      fetchMyPortfolio()
    }
  }, [currentProfileId, filter])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentProfileId(user.id)
      setAccountType(profile.account_type)
    } else {
      setToast({ message: 'プロフィールが見つかりません', type: 'error' })
      router.push('/profile')
    }
  }

  async function fetchMyPortfolio() {
    setLoading(true)

    let query = supabase
      .from('portfolio_items')
      .select('*')
      .eq('creator_id', currentProfileId)
      .order('created_at', { ascending: false })

    if (filter === 'public') {
      query = query.eq('is_public', true)
    } else if (filter === 'private') {
      query = query.eq('is_public', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('作品取得エラー:', error)
    } else {
      setItems(data || [])
    }

    setLoading(false)
  }

  function showDeleteConfirm(itemId: string, title: string) {
    setConfirmModal({
      show: true,
      itemId,
      itemTitle: title
    })
  }

  async function handleDelete() {
    const itemId = confirmModal.itemId
    setConfirmModal({ show: false, itemId: '', itemTitle: '' })

    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('削除エラー:', error)
      setToast({ message: '削除に失敗しました', type: 'error' })
    } else {
      setToast({ message: '作品を削除しました', type: 'success' })
      fetchMyPortfolio()
    }
  }

  async function togglePublic(itemId: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('portfolio_items')
      .update({ is_public: !currentStatus })
      .eq('id', itemId)

    if (error) {
      console.error('公開設定変更エラー:', error)
      setToast({ message: '公開設定の変更に失敗しました', type: 'error' })
    } else {
      setToast({ 
        message: currentStatus ? '非公開に変更しました' : '公開しました', 
        type: 'success' 
      })
      fetchMyPortfolio()
    }
  }

  function getCategoryLabel(category: string | null) {
    const categories: { [key: string]: string } = {
      illustration: 'イラスト',
      manga: '漫画',
      novel: '小説',
      music: '音楽',
      voice: 'ボイス',
      video: '動画',
      game: 'ゲーム',
      '3d': '3Dモデル',
      other: 'その他'
    }
    return category ? categories[category] || category : '未設定'
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      
      <div className="portfolio-manage-page dashboard-layout">
        <DashboardSidebar accountType={accountType} />

        {loading ? (
          <div className="dashboard-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <span>読み込み中...</span>
          </div>
        ) : (
          <main className="portfolio-manage-main">
            <div className="portfolio-manage-container">
              {/* ヘッダー */}
              <div className="portfolio-manage-header">
                <h1 className="portfolio-manage-title">作品管理</h1>
                <Link href="/dashboard/portfolio/upload" className="portfolio-manage-btn primary">
                  <i className="fas fa-plus"></i>
                  作品をアップロード
                </Link>
              </div>

              {/* フィルター */}
              <div className="portfolio-manage-filter-card">
                <div className="portfolio-manage-filter-row">
                  <div>
                    <label className="portfolio-manage-filter-label">公開状態で絞り込み</label>
                    <div className="portfolio-manage-filter-buttons">
                      <button
                        onClick={() => setFilter('all')}
                        className={`portfolio-manage-filter-btn ${filter === 'all' ? 'active' : ''}`}
                      >
                        すべて
                      </button>
                      <button
                        onClick={() => setFilter('public')}
                        className={`portfolio-manage-filter-btn ${filter === 'public' ? 'active' : ''}`}
                      >
                        公開中
                      </button>
                      <button
                        onClick={() => setFilter('private')}
                        className={`portfolio-manage-filter-btn ${filter === 'private' ? 'active' : ''}`}
                      >
                        非公開
                      </button>
                    </div>
                  </div>
                  <div className="portfolio-manage-count">
                    {items.length}件の作品
                  </div>
                </div>
              </div>

              {/* 作品一覧 */}
              {items.length === 0 && (
                <div className="portfolio-manage-empty">
                  <i className="fas fa-images"></i>
                  <p>まだ作品が登録されていません</p>
                  <Link href="/dashboard/portfolio/upload" className="portfolio-manage-btn primary">
                    作品をアップロード
                  </Link>
                </div>
              )}

              {items.length > 0 && (
                <div className="portfolio-manage-grid">
                  {items.map((item) => (
                    <div key={item.id} className="portfolio-manage-card">
                      {/* 画像 */}
                      <Link href={`/portfolio/${item.id}`} className="portfolio-manage-card-image-link">
                        <div className="portfolio-manage-card-image">
                          <img
                            src={item.thumbnail_url || item.image_url}
                            alt={item.title}
                          />
                          {/* 公開状態バッジ */}
                          <span className={`portfolio-manage-status-badge ${item.is_public ? 'public' : 'private'}`}>
                            {item.is_public ? '公開中' : '非公開'}
                          </span>
                        </div>
                      </Link>

                      {/* 情報 */}
                      <div className="portfolio-manage-card-content">
                        {/* カテゴリ */}
                        {item.category && (
                          <span className="portfolio-manage-category-badge">
                            {getCategoryLabel(item.category)}
                          </span>
                        )}

                        {/* タイトル */}
                        <Link href={`/portfolio/${item.id}`}>
                          <h3 className="portfolio-manage-card-title">
                            {item.title}
                          </h3>
                        </Link>

                        {/* 統計 */}
                        <div className="portfolio-manage-card-meta">
                          <span><i className="fas fa-eye"></i> {item.view_count || 0}</span>
                          <span>{new Date(item.created_at).toLocaleDateString('ja-JP')}</span>
                        </div>

                        {/* アクションボタン */}
                        <div className="portfolio-manage-card-actions">
                          <button
                            onClick={() => togglePublic(item.id, item.is_public)}
                            className="portfolio-manage-btn secondary small"
                          >
                            {item.is_public ? '非公開にする' : '公開する'}
                          </button>
                          <button
                            onClick={() => showDeleteConfirm(item.id, item.title)}
                            className="portfolio-manage-btn danger small"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        )}
      </div>

      <Footer />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {confirmModal.show && (
        <ConfirmModal
          title="作品を削除"
          message={`「${confirmModal.itemTitle}」を削除しますか？この操作は取り消せません。`}
          confirmLabel="削除する"
          onConfirm={handleDelete}
          onCancel={() => setConfirmModal({ show: false, itemId: '', itemTitle: '' })}
          isDestructive={true}
        />
      )}
    </>
  )
}