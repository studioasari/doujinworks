'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { WorkGridSkeleton } from '@/app/components/Skeleton'
import styles from './page.module.css'

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
    <div className="modal-overlay active" onClick={onCancel}>
      <div className={`modal ${styles.confirmModal}`} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.confirmIcon} ${isDestructive ? styles.danger : ''}`}>
          <i className={isDestructive ? 'fa-solid fa-trash-can' : 'fa-solid fa-circle-question'}></i>
        </div>
        <h2 className={styles.confirmTitle}>{title}</h2>
        <p className={styles.confirmMessage}>{message}</p>
        <div className="button-group-equal">
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            キャンセル
          </button>
          <button 
            type="button"
            onClick={onConfirm} 
            className={`btn ${isDestructive ? styles.btnDanger : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PortfolioManageClient() {
  const [allItems, setAllItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [accountType, setAccountType] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all')
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    itemId: string
    itemTitle: string
  }>({ show: false, itemId: '', itemTitle: '' })

  // フィルター適用後のアイテム
  const items = useMemo(() => {
    if (filter === 'all') return allItems
    if (filter === 'public') return allItems.filter(item => item.is_public)
    return allItems.filter(item => !item.is_public)
  }, [allItems, filter])

  // 各カウント
  const publicCount = useMemo(() => allItems.filter(item => item.is_public).length, [allItems])
  const privateCount = useMemo(() => allItems.filter(item => !item.is_public).length, [allItems])

  useEffect(() => {
    loadAuth()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      fetchMyPortfolio()
    }
  }, [currentProfileId])

  async function loadAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentProfileId(user.id)
      setAccountType(profile.account_type)
    }
  }

  async function fetchMyPortfolio() {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('creator_id', currentProfileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('作品取得エラー:', error)
    } else {
      setAllItems(data || [])
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
    } else {
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
    } else {
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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>作品管理</h1>
          <Link href="/dashboard/portfolio/upload" className="btn btn-primary">
            <i className="fa-solid fa-plus"></i>
            作品をアップロード
          </Link>
        </div>
        <div className={styles.filterArea}>
          <div className="tabs">
            <button type="button" className="tab active">すべて</button>
            <button type="button" className="tab">公開中</button>
            <button type="button" className="tab">非公開</button>
          </div>
        </div>
        <WorkGridSkeleton count={8} />
      </div>
    )
  }

  return (
    <>
      <div className={styles.container}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <h1 className={styles.title}>作品管理</h1>
          <Link href="/dashboard/portfolio/upload" className="btn btn-primary">
            <i className="fa-solid fa-plus"></i>
            作品をアップロード
          </Link>
        </div>

        {/* フィルタータブ */}
        <div className={styles.filterArea}>
          <div className="tabs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`tab ${filter === 'all' ? 'active' : ''}`}
            >
              すべて ({allItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('public')}
              className={`tab ${filter === 'public' ? 'active' : ''}`}
            >
              公開中 ({publicCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('private')}
              className={`tab ${filter === 'private' ? 'active' : ''}`}
            >
              非公開 ({privateCount})
            </button>
          </div>
        </div>

        {/* 作品一覧 */}
        {items.length === 0 && (
          <div className="empty-state">
            <i className="fa-regular fa-images"></i>
            <p>
              {filter === 'all' 
                ? 'まだ作品が登録されていません' 
                : filter === 'public' 
                  ? '公開中の作品はありません'
                  : '非公開の作品はありません'
              }
            </p>
            {filter === 'all' && (
              <Link href="/dashboard/portfolio/upload" className="btn btn-primary">
                作品をアップロード
              </Link>
            )}
          </div>
        )}

        {items.length > 0 && (
          <div className={styles.grid}>
            {items.map((item) => (
              <div key={item.id} className={styles.card}>
                {/* 画像 */}
                <Link href={`/portfolio/${item.id}`} className={styles.cardImageLink}>
                  <div className={styles.cardImage}>
                    <img
                      src={item.thumbnail_url || item.image_url}
                      alt={item.title}
                    />
                    {/* 公開状態バッジ */}
                    <span className={`${styles.statusBadge} ${item.is_public ? styles.public : styles.private}`}>
                      {item.is_public ? '公開中' : '非公開'}
                    </span>
                  </div>
                </Link>

                {/* 情報 */}
                <div className={styles.cardContent}>
                  {/* カテゴリ */}
                  {item.category && (
                    <span className="badge">
                      {getCategoryLabel(item.category)}
                    </span>
                  )}

                  {/* タイトル */}
                  <Link href={`/portfolio/${item.id}`}>
                    <h3 className={styles.cardTitle}>
                      {item.title}
                    </h3>
                  </Link>

                  {/* 統計 */}
                  <div className={styles.cardMeta}>
                    <span><i className="fa-regular fa-eye"></i> {item.view_count || 0}</span>
                    <span>{new Date(item.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>

                  {/* アクションボタン */}
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      onClick={() => togglePublic(item.id, item.is_public)}
                      className="btn btn-secondary btn-sm"
                    >
                      {item.is_public ? '非公開にする' : '公開する'}
                    </button>
                    <button
                      type="button"
                      onClick={() => showDeleteConfirm(item.id, item.title)}
                      className={styles.btnIconDanger}
                      title="削除"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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