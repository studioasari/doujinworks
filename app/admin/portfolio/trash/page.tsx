'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../../utils/supabase/client'

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

const PER_PAGE = 20

export default function AdminPortfolioTrash() {
  const supabase = createClient()
  const [works, setWorks] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // 選択用
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // モーダル用
  const [modalWork, setModalWork] = useState<PortfolioItem | null>(null)
  const [modalAction, setModalAction] = useState<'restore' | 'delete' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadWorks()
  }, [search, page])

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
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })

    // 検索
    if (search) {
      query = query.ilike('title', `%${search}%`)
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

  function openModal(work: PortfolioItem, action: 'restore' | 'delete') {
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
  async function bulkAction(action: 'restore' | 'delete') {
    if (selectedIds.size === 0) return
    
    const confirmed = window.confirm(
      `${selectedIds.size}件の作品を${action === 'restore' ? '復元' : '完全に削除'}しますか？${action === 'delete' ? '\nこの操作は取り消せません。' : ''}`
    )
    if (!confirmed) return

    setActionLoading(true)

    const ids = Array.from(selectedIds)

    if (action === 'restore') {
      const { error } = await supabase
        .from('portfolio_items')
        .update({ 
          is_deleted: false,
          deleted_at: null,
          is_public: false
        })
        .in('id', ids)

      if (error) {
        console.error('Error bulk restoring:', error)
        alert('エラーが発生しました')
      }
    } else {
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .in('id', ids)

      if (error) {
        console.error('Error bulk deleting:', error)
        alert('エラーが発生しました')
      }
    }

    setActionLoading(false)
    await loadWorks()
  }

  async function executeAction() {
    if (!modalWork || !modalAction) return

    setActionLoading(true)

    if (modalAction === 'restore') {
      const { error } = await supabase
        .from('portfolio_items')
        .update({ 
          is_deleted: false,
          deleted_at: null,
          is_public: false
        })
        .eq('id', modalWork.id)

      if (error) {
        console.error('Error restoring work:', error)
        alert('エラーが発生しました')
      } else {
        await loadWorks()
        closeModal()
      }
    } else if (modalAction === 'delete') {
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', modalWork.id)

      if (error) {
        console.error('Error deleting work:', error)
        alert('エラーが発生しました')
      } else {
        await loadWorks()
        closeModal()
      }
    }

    setActionLoading(false)
  }

  const totalPages = Math.ceil(totalCount / PER_PAGE)

  return (
    <div>
      {/* ヘッダー */}
      <div className="admin-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>
              <i className="fas fa-trash" style={{ marginRight: 8 }}></i>
              ゴミ箱
            </h1>
            <p>削除された作品の管理</p>
          </div>
          <a href="/admin/portfolio" className="admin-action-btn secondary">
            <i className="fas fa-arrow-left" style={{ marginRight: 6 }}></i>
            作品管理に戻る
          </a>
        </div>
      </div>

      {/* 検索 */}
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
            <i className="fas fa-trash"></i>
            <p>ゴミ箱は空です</p>
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
                  <th>削除日</th>
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
                          <span className="admin-work-title">{work.title}</span>
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
                      {work.deleted_at 
                        ? new Date(work.deleted_at).toLocaleDateString('ja-JP')
                        : '-'
                      }
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="admin-action-btn primary"
                          onClick={() => openModal(work, 'restore')}
                        >
                          復元
                        </button>
                        <button
                          className="admin-action-btn danger"
                          onClick={() => openModal(work, 'delete')}
                        >
                          完全削除
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
                {modalAction === 'restore' && '作品を復元する'}
                {modalAction === 'delete' && '作品を完全に削除する'}
              </h3>
              <button className="admin-modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="admin-modal-body">
              <p style={{ marginBottom: 16 }}>
                <strong>{modalWork.title}</strong>
              </p>

              {modalAction === 'restore' && (
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  この作品を復元します。復元後は非公開状態になります。
                </p>
              )}

              {modalAction === 'delete' && (
                <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                  この作品を完全に削除します。この操作は取り消せません。
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
                className={`admin-action-btn ${modalAction === 'delete' ? 'danger' : 'primary'}`}
                onClick={executeAction}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <>
                    {modalAction === 'restore' && '復元する'}
                    {modalAction === 'delete' && '完全に削除する'}
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
              className="admin-action-btn primary"
              onClick={() => bulkAction('restore')}
              disabled={actionLoading}
            >
              復元
            </button>
            <button
              className="admin-action-btn danger"
              onClick={() => bulkAction('delete')}
              disabled={actionLoading}
            >
              完全削除
            </button>
          </div>
        </div>
      )}
    </div>
  )
}