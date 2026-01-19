'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../utils/supabase/client'

type WorkRequest = {
  id: string
  requester_id: string
  title: string
  description: string | null
  category: string
  status: string
  request_type: string
  budget_min: number | null
  budget_max: number | null
  final_price: number | null
  deadline: string | null
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  requester?: {
    username: string
    display_name: string
  }
  target_creator?: {
    username: string
    display_name: string
  }
  selected_applicant?: {
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

const STATUSES = [
  { value: '', label: 'すべて' },
  { value: 'open', label: '募集中' },
  { value: 'contracted', label: '契約済み' },
  { value: 'paid', label: '支払済み' },
  { value: 'delivered', label: '納品済み' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: 'キャンセル' },
]

const PER_PAGE = 20

export default function AdminRequests() {
  const supabase = createClient()
  const [requests, setRequests] = useState<WorkRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // 選択用
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // モーダル用
  const [modalRequest, setModalRequest] = useState<WorkRequest | null>(null)
  const [modalAction, setModalAction] = useState<'delete' | 'cancel' | 'complete' | 'refund' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [search, category, status, page])

  async function loadRequests() {
    setLoading(true)

    let query = supabase
      .from('work_requests')
      .select(`
        *,
        requester:profiles!requester_id (
          username,
          display_name
        ),
        target_creator:profiles!target_creator_id (
          username,
          display_name
        ),
        selected_applicant:profiles!selected_applicant_id (
          username,
          display_name
        )
      `, { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    // 検索
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    // カテゴリ
    if (category) {
      query = query.eq('category', category)
    }

    // ステータス
    if (status) {
      query = query.eq('status', status)
    }

    // ページネーション
    const from = (page - 1) * PER_PAGE
    const to = from + PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Error loading requests:', error)
    } else {
      setRequests(data || [])
      setTotalCount(count || 0)
      setSelectedIds(new Set())
    }

    setLoading(false)
  }

  function openModal(request: WorkRequest, action: 'delete' | 'cancel' | 'complete' | 'refund') {
    setModalRequest(request)
    setModalAction(action)
  }

  function closeModal() {
    setModalRequest(null)
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
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(requests.map(r => r.id)))
    }
  }

  // 一括削除
  async function bulkDelete() {
    if (selectedIds.size === 0) return

    const confirmed = window.confirm(`${selectedIds.size}件の依頼を削除しますか？`)
    if (!confirmed) return

    setActionLoading(true)

    const ids = Array.from(selectedIds)
    const { error } = await supabase
      .from('work_requests')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .in('id', ids)

    if (error) {
      console.error('Error bulk deleting:', error)
      alert('エラーが発生しました')
    }

    setActionLoading(false)
    await loadRequests()
  }

  async function executeAction() {
    if (!modalRequest || !modalAction) return

    setActionLoading(true)

    let updateData: Record<string, unknown> = {}

    switch (modalAction) {
      case 'delete':
        updateData = {
          is_deleted: true,
          deleted_at: new Date().toISOString()
        }
        break
      case 'cancel':
        updateData = {
          status: 'cancelled'
        }
        break
      case 'complete':
        updateData = {
          status: 'completed',
          completed_at: new Date().toISOString()
        }
        break
      case 'refund':
        // TODO: Stripe返金処理を実装
        updateData = {
          status: 'cancelled'
        }
        break
    }

    const { error } = await supabase
      .from('work_requests')
      .update(updateData)
      .eq('id', modalRequest.id)

    if (error) {
      console.error('Error updating request:', error)
      alert('エラーが発生しました')
    } else {
      await loadRequests()
      closeModal()
    }

    setActionLoading(false)
  }

  function getCategoryLabel(value: string) {
    const cat = CATEGORIES.find(c => c.value === value)
    return cat ? cat.label : value
  }

  function getStatusLabel(value: string) {
    const s = STATUSES.find(st => st.value === value)
    return s ? s.label : value
  }

  function getStatusColor(value: string) {
    switch (value) {
      case 'open': return 'blue'
      case 'contracted': return 'yellow'
      case 'paid': return 'purple'
      case 'delivered': return 'green'
      case 'completed': return 'green'
      case 'cancelled': return 'red'
      default: return 'gray'
    }
  }

  function formatPrice(min: number | null, max: number | null, final: number | null) {
    if (final) return `¥${final.toLocaleString()}`
    if (min && max) return `¥${min.toLocaleString()}〜${max.toLocaleString()}`
    if (min) return `¥${min.toLocaleString()}〜`
    if (max) return `〜¥${max.toLocaleString()}`
    return '-'
  }

  const totalPages = Math.ceil(totalCount / PER_PAGE)

  return (
    <div>
      {/* ヘッダー */}
      <div className="admin-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>依頼管理</h1>
            <p>依頼の確認・紛争解決</p>
          </div>
          <a href="/admin/requests/trash" className="admin-action-btn secondary">
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
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* テーブル */}
      <div className="admin-table-container">
        {loading ? (
          <div className="admin-empty">
            <i className="fas fa-spinner fa-spin"></i>
            <p>読み込み中...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="admin-empty">
            <i className="fas fa-file-contract"></i>
            <p>依頼が見つかりません</p>
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={requests.length > 0 && selectedIds.size === requests.length}
                      onChange={toggleSelectAll}
                      className="admin-checkbox"
                    />
                  </th>
                  <th>タイトル</th>
                  <th>依頼者</th>
                  <th>クリエイター</th>
                  <th>カテゴリ</th>
                  <th>ステータス</th>
                  <th>金額</th>
                  <th>作成日</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(request.id)}
                        onChange={() => toggleSelect(request.id)}
                        className="admin-checkbox"
                      />
                    </td>
                    <td>
                      <a
                        href={`/requests/${request.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-request-title-link"
                      >
                        {request.title}
                        <i className="fas fa-external-link-alt"></i>
                      </a>
                    </td>
                    <td>
                      {request.requester ? (
                        <a
                          href={`/creators/${request.requester.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-user-username-link"
                        >
                          @{request.requester.username}
                          <i className="fas fa-external-link-alt"></i>
                        </a>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>不明</span>
                      )}
                    </td>
                    <td>
                      {request.selected_applicant ? (
                        <a
                          href={`/creators/${request.selected_applicant.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-user-username-link"
                        >
                          @{request.selected_applicant.username}
                          <i className="fas fa-external-link-alt"></i>
                        </a>
                      ) : request.target_creator ? (
                        <a
                          href={`/creators/${request.target_creator.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-user-username-link"
                        >
                          @{request.target_creator.username}
                          <i className="fas fa-external-link-alt"></i>
                        </a>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>未定</span>
                      )}
                    </td>
                    <td>
                      <span className="admin-badge gray">
                        {getCategoryLabel(request.category)}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${getStatusColor(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td>
                      {formatPrice(request.budget_min, request.budget_max, request.final_price)}
                    </td>
                    <td>
                      {new Date(request.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td>
                      <div className="admin-actions">
                        {request.status === 'open' && (
                          <button
                            className="admin-action-btn warning"
                            onClick={() => openModal(request, 'cancel')}
                          >
                            キャンセル
                          </button>
                        )}
                        {(request.status === 'paid' || request.status === 'delivered') && (
                          <>
                            <button
                              className="admin-action-btn primary"
                              onClick={() => openModal(request, 'complete')}
                            >
                              強制完了
                            </button>
                            <button
                              className="admin-action-btn warning"
                              onClick={() => openModal(request, 'refund')}
                            >
                              返金
                            </button>
                          </>
                        )}
                        <button
                          className="admin-action-btn danger"
                          onClick={() => openModal(request, 'delete')}
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
      {modalRequest && modalAction && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>
                {modalAction === 'delete' && '依頼を削除する'}
                {modalAction === 'cancel' && '依頼をキャンセルする'}
                {modalAction === 'complete' && '依頼を強制完了する'}
                {modalAction === 'refund' && '依頼を返金する'}
              </h3>
              <button className="admin-modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="admin-modal-body">
              <p style={{ marginBottom: 16 }}>
                <strong>{modalRequest.title}</strong>
              </p>

              {modalAction === 'delete' && (
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  この依頼をゴミ箱に移動します。
                </p>
              )}

              {modalAction === 'cancel' && (
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  この依頼を強制キャンセルします。依頼者・クリエイターに通知されます。
                </p>
              )}

              {modalAction === 'complete' && (
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  この依頼を強制完了します。クリエイターに報酬が支払われます。
                </p>
              )}

              {modalAction === 'refund' && (
                <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                  この依頼を返金処理します。依頼者に返金され、依頼はキャンセルされます。
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
                className={`admin-action-btn ${modalAction === 'delete' || modalAction === 'refund' ? 'danger' : modalAction === 'cancel' ? 'warning' : 'primary'}`}
                onClick={executeAction}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <>
                    {modalAction === 'delete' && '削除する'}
                    {modalAction === 'cancel' && 'キャンセルする'}
                    {modalAction === 'complete' && '強制完了する'}
                    {modalAction === 'refund' && '返金する'}
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
              className="admin-action-btn danger"
              onClick={bulkDelete}
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