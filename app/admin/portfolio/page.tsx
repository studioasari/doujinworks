'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../utils/supabase/client'

type PortfolioItem = {
  id: string
  creator_id: string
  title: string
  description: string | null
  category: string
  tags: string[]
  thumbnail_url: string | null
  image_url: string | null
  is_public: boolean
  is_deleted: boolean
  deleted_at: string | null
  view_count: number
  created_at: string
  creator?: {
    username: string
    display_name: string
  }
}

const CATEGORIES = [
  { value: '', label: 'すべて' },
  { value: 'illustration', label: 'イラスト' },
  { value: 'manga', label: 'マンガ' },
  { value: 'novel', label: '小説' },
  { value: 'music', label: '音楽' },
  { value: 'voice', label: 'ボイス' },
  { value: 'video', label: '動画' },
]

const PER_PAGE = 20

export default function AdminWorks() {
  const supabase = createClient()
  const [works, setWorks] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // 選択用
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // モーダル用
  const [modalWork, setModalWork] = useState<PortfolioItem | null>(null)
  const [modalAction, setModalAction] = useState<'hide' | 'show' | 'delete' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadWorks()
  }, [search, category, filter, page])

  async function loadWorks() {
    setLoading(true)

    let query = supabase
      .from('portfolio_items')
      .select(`
        *,
        creator:profiles!creator_id (
          username,
          display_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // 検索
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    // カテゴリ
    if (category) {
      query = query.eq('category', category)
    }

    // 削除済みは除外
    query = query.eq('is_deleted', false)

    // 公開状態フィルター
    if (filter === 'public') {
      query = query.eq('is_public', true)
    } else if (filter === 'private') {
      query = query.eq('is_public', false)
    }

    // ページネーション
    const from = (page - 1) * PER_PAGE
    const to = from + PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Error loading works:', error)
    } else {
      setWorks(data || [])
      setTotalCount(count || 0)
      setSelectedIds(new Set())
    }

    setLoading(false)
  }

  function openModal(work: PortfolioItem, action: 'hide' | 'show' | 'delete') {
    setModalWork(work)
    setModalAction(action)
  }

  function closeModal() {
    setModalWork(null)
    setModalAction(null)
  }

  // チェックボックス操作
  function toggleSelect(id: string) {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  function toggleSelectAll() {
    if (selectedIds.size === works.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(works.map(w => w.id)))
    }
  }

  // 一括処理
  async function bulkAction(action: 'hide' | 'show' | 'delete') {
    if (selectedIds.size === 0) return
    
    const confirmed = window.confirm(
      `${selectedIds.size}件の作品を${action === 'hide' ? '非公開に' : action === 'show' ? '公開に' : '削除'}しますか？`
    )
    if (!confirmed) return

    setActionLoading(true)

    const ids = Array.from(selectedIds)

    if (action === 'delete') {
      const { error } = await supabase
        .from('portfolio_items')
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .in('id', ids)

      if (error) {
        console.error('Error bulk deleting:', error)
        alert('エラーが発生しました')
      }
    } else {
      const { error } = await supabase
        .from('portfolio_items')
        .update({ is_public: action === 'show' })
        .in('id', ids)

      if (error) {
        console.error('Error bulk updating:', error)
        alert('エラーが発生しました')
      }
    }

    setActionLoading(false)
    await loadWorks()
  }

  async function executeAction() {
    if (!modalWork || !modalAction) return

    setActionLoading(true)

    if (modalAction === 'delete') {
      const { error } = await supabase
        .from('portfolio_items')
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', modalWork.id)

      if (error) {
        console.error('Error deleting work:', error)
        alert('エラーが発生しました')
      } else {
        await loadWorks()
        closeModal()
      }
    } else {
      const { error } = await supabase
        .from('portfolio_items')
        .update({ is_public: modalAction === 'show' })
        .eq('id', modalWork.id)

      if (error) {
        console.error('Error updating work:', error)
        alert('エラーが発生しました')
      } else {
        await loadWorks()
        closeModal()
      }
    }

    setActionLoading(false)
  }

  function getCategoryLabel(value: string) {
    const cat = CATEGORIES.find(c => c.value === value)
    return cat ? cat.label : value
  }

  const totalPages = Math.ceil(totalCount / PER_PAGE)

  return (
    <div>
      {/* ヘッダー */}
      <div className="admin-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>作品管理</h1>
            <p>投稿された作品の管理</p>
          </div>
          <a href="/admin/portfolio/trash" className="admin-action-btn secondary">
            <i className="fas fa-trash" style={{ marginRight: 6 }}></i>
            ゴミ箱
          </a>
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="admin-search-bar">
        <input
          type="text"
          className="admin-search-input"
          placeholder="タイトルで検索..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <select
          className="admin-filter-select"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            setPage(1)
          }}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <select
          className="admin-filter-select"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as typeof filter)
            setPage(1)
          }}
        >
          <option value="all">すべて</option>
          <option value="public">公開中</option>
          <option value="private">非公開</option>
        </select>
      </div>

      {/* テーブル */}
      <div className="admin-table-container">
        {loading ? (
          <div className="admin-empty">
            <i className="fas fa-spinner fa-spin"></i>
            <p>読み込み中...</p>
          </div>
        ) : works.length === 0 ? (
          <div className="admin-empty">
            <i className="fas fa-palette"></i>
            <p>作品が見つかりません</p>
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={works.length > 0 && selectedIds.size === works.length}
                      onChange={toggleSelectAll}
                      className="admin-checkbox"
                    />
                  </th>
                  <th>作品</th>
                  <th>投稿者</th>
                  <th>カテゴリ</th>
                  <th>ステータス</th>
                  <th>閲覧数</th>
                  <th>投稿日</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {works.map((work) => (
                  <tr key={work.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(work.id)}
                        onChange={() => toggleSelect(work.id)}
                        className="admin-checkbox"
                      />
                    </td>
                    <td>
                      <div className="admin-work-cell">
                        <div className="admin-work-thumbnail">
                          {work.thumbnail_url || work.image_url ? (
                            <img src={work.thumbnail_url || work.image_url || ''} alt="" />
                          ) : (
                            <i className="fas fa-image"></i>
                          )}
                        </div>
                        <div className="admin-work-info">
                          <a
                            href={`/portfolio/${work.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-work-title-link"
                          >
                            {work.title}
                            <i className="fas fa-external-link-alt"></i>
                          </a>
                        </div>
                      </div>
                    </td>
                    <td>
                      {work.creator ? (
                        <a
                          href={`/creators/${work.creator.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-user-username-link"
                        >
                          @{work.creator.username}
                          <i className="fas fa-external-link-alt"></i>
                        </a>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>不明</span>
                      )}
                    </td>
                    <td>
                      <span className="admin-badge gray">
                        {getCategoryLabel(work.category)}
                      </span>
                    </td>
                    <td>
                      {work.is_public ? (
                        <span className="admin-badge green">公開中</span>
                      ) : (
                        <span className="admin-badge yellow">非公開</span>
                      )}
                    </td>
                    <td>{work.view_count.toLocaleString()}</td>
                    <td>
                      {new Date(work.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td>
                      <div className="admin-actions">
                        {work.is_public ? (
                          <button
                            className="admin-action-btn warning"
                            onClick={() => openModal(work, 'hide')}
                          >
                            非公開
                          </button>
                        ) : (
                          <button
                            className="admin-action-btn secondary"
                            onClick={() => openModal(work, 'show')}
                          >
                            公開
                          </button>
                        )}
                        <button
                          className="admin-action-btn danger"
                          onClick={() => openModal(work, 'delete')}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ページネーション */}
            <div className="admin-pagination">
              <span className="admin-pagination-info">
                {totalCount}件中 {(page - 1) * PER_PAGE + 1}〜{Math.min(page * PER_PAGE, totalCount)}件
              </span>
              <div className="admin-pagination-btns">
                <button
                  className="admin-pagination-btn"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  前へ
                </button>
                <button
                  className="admin-pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  次へ
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* モーダル */}
      {modalWork && modalAction && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>
                {modalAction === 'hide' && '作品を非公開にする'}
                {modalAction === 'show' && '作品を公開する'}
                {modalAction === 'delete' && '作品を削除する'}
              </h3>
              <button className="admin-modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="admin-modal-body">
              <p style={{ marginBottom: 16 }}>
                <strong>{modalWork.title}</strong>
              </p>

              {modalAction === 'hide' && (
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  この作品を非公開にします。ユーザーからは見えなくなりますが、投稿者は編集・再公開できます。
                </p>
              )}

              {modalAction === 'show' && (
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  この作品を公開状態に戻します。
                </p>
              )}

              {modalAction === 'delete' && (
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  この作品をゴミ箱に移動します。ゴミ箱から復元または完全削除できます。
                </p>
              )}
            </div>
            <div className="admin-modal-footer">
              <button
                className="admin-action-btn secondary"
                onClick={closeModal}
                disabled={actionLoading}
              >
                キャンセル
              </button>
              <button
                className={`admin-action-btn ${modalAction === 'delete' ? 'danger' : modalAction === 'hide' ? 'warning' : 'primary'}`}
                onClick={executeAction}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <>
                    {modalAction === 'hide' && '非公開にする'}
                    {modalAction === 'show' && '公開する'}
                    {modalAction === 'delete' && '削除する'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 一括操作フローティングバー */}
      {selectedIds.size > 0 && (
        <div className="admin-floating-bar">
          <span className="admin-bulk-count">{selectedIds.size}件選択中</span>
          <div className="admin-bulk-buttons">
            <button
              className="admin-action-btn secondary"
              onClick={() => bulkAction('show')}
              disabled={actionLoading}
            >
              公開
            </button>
            <button
              className="admin-action-btn warning"
              onClick={() => bulkAction('hide')}
              disabled={actionLoading}
            >
              非公開
            </button>
            <button
              className="admin-action-btn danger"
              onClick={() => bulkAction('delete')}
              disabled={actionLoading}
            >
              削除
            </button>
          </div>
        </div>
      )}
    </div>
  )
}