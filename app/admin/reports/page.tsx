'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../utils/supabase/client'

type Report = {
  id: string
  reporter_id: string | null
  report_type: string
  target_user_id: string | null
  target_work_id: string | null
  target_request_id: string | null
  reason: string
  description: string | null
  status: string
  handled_by: string | null
  handled_at: string | null
  admin_note: string | null
  created_at: string
  reporter?: {
    username: string
    display_name: string
  }
  target_user?: {
    username: string
    display_name: string
  }
  target_work?: {
    id: string
    title: string
  }
  target_request?: {
    id: string
    title: string
  }
}

const REPORT_TYPES = [
  { value: '', label: 'すべて' },
  { value: 'user', label: 'ユーザー' },
  { value: 'work', label: '作品' },
  { value: 'request', label: '依頼' },
]

const STATUSES = [
  { value: 'pending', label: '未対応' },
  { value: 'processed', label: '処理済み' },
]

const PER_PAGE = 20

export default function AdminReports() {
  const supabase = createClient()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState('')
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // モーダル用
  const [modalReport, setModalReport] = useState<Report | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadReports()
  }, [reportType, status, page])

  async function loadReports() {
    setLoading(true)

    let query = supabase
      .from('reports')
      .select(`
        *,
        reporter:profiles!reporter_id (
          username,
          display_name
        ),
        target_user:profiles!target_user_id (
          username,
          display_name
        ),
        target_work:portfolio_items!target_work_id (
          id,
          title
        ),
        target_request:work_requests!target_request_id (
          id,
          title
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: true })

    // タイプフィルター
    if (reportType) {
      query = query.eq('report_type', reportType)
    }

    // ステータスフィルター
    if (status === 'pending') {
      query = query.eq('status', 'pending')
    } else if (status === 'processed') {
      query = query.in('status', ['resolved', 'dismissed', 'processed'])
    }

    // ページネーション
    const from = (page - 1) * PER_PAGE
    const to = from + PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Error loading reports:', error)
    } else {
      setReports(data || [])
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  function openModal(report: Report) {
    setModalReport(report)
    setAdminNote(report.admin_note || '')
  }

  function closeModal() {
    setModalReport(null)
    setAdminNote('')
  }

  async function markAsProcessed() {
    if (!modalReport) return

    setActionLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('reports')
      .update({
        status: 'processed',
        handled_by: user?.id,
        handled_at: new Date().toISOString(),
        admin_note: adminNote || null
      })
      .eq('id', modalReport.id)

    if (error) {
      console.error('Error updating report:', error)
      alert('エラーが発生しました')
    } else {
      await loadReports()
      closeModal()
    }

    setActionLoading(false)
  }

  function getTypeLabel(value: string) {
    const t = REPORT_TYPES.find(rt => rt.value === value)
    return t ? t.label : value
  }

  function getTargetLink(report: Report) {
    if (report.report_type === 'user' && report.target_user) {
      return {
        href: `/creators/${report.target_user.username}`,
        label: `@${report.target_user.username}`
      }
    }
    if (report.report_type === 'work' && report.target_work) {
      return {
        href: `/portfolio/${report.target_work.id}`,
        label: report.target_work.title
      }
    }
    if (report.report_type === 'request' && report.target_request) {
      return {
        href: `/requests/${report.target_request.id}`,
        label: report.target_request.title
      }
    }
    return null
  }

  function isProcessed(report: Report) {
    return report.status === 'resolved' || report.status === 'dismissed' || report.status === 'processed'
  }

  const totalPages = Math.ceil(totalCount / PER_PAGE)

  return (
    <div>
      {/* ヘッダー */}
      <div className="admin-header">
        <h1>通報管理</h1>
        <p>ユーザーからの通報を確認・対応</p>
      </div>

      {/* フィルター */}
      <div className="admin-search-bar">
        <select
          className="admin-filter-select"
          value={reportType}
          onChange={(e) => {
            setReportType(e.target.value)
            setPage(1)
          }}
        >
          {REPORT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
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
        ) : reports.length === 0 ? (
          <div className="admin-empty">
            <i className="fas fa-flag"></i>
            <p>通報がありません</p>
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>通報日</th>
                  <th>種類</th>
                  <th>通報対象</th>
                  <th>理由</th>
                  <th>通報者</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const target = getTargetLink(report)
                  const processed = isProcessed(report)
                  return (
                    <tr 
                      key={report.id} 
                      onClick={() => openModal(report)}
                      className="admin-table-row-clickable"
                    >
                      <td>
                        {new Date(report.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td>
                        <span className="admin-badge gray">
                          {getTypeLabel(report.report_type)}
                        </span>
                      </td>
                      <td>
                        {target ? (
                          <a
                            href={target.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-user-username-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {target.label}
                            <i className="fas fa-external-link-alt"></i>
                          </a>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>削除済み</span>
                        )}
                      </td>
                      <td>{report.reason}</td>
                      <td>
                        {report.reporter ? (
                          <a
                            href={`/creators/${report.reporter.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-user-username-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            @{report.reporter.username}
                            <i className="fas fa-external-link-alt"></i>
                          </a>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>不明</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {processed ? (
                          <span className="admin-badge green">処理済み</span>
                        ) : (
                          <button
                            className="admin-action-btn primary"
                            onClick={() => openModal(report)}
                          >
                            処理する
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
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
      {modalReport && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>通報詳細</h3>
              <button className="admin-modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="admin-modal-body">
              {/* 通報情報 */}
              <div className="admin-report-detail">
                <div className="admin-report-row">
                  <span className="admin-report-label">種類</span>
                  <span>{getTypeLabel(modalReport.report_type)}</span>
                </div>
                <div className="admin-report-row">
                  <span className="admin-report-label">通報対象</span>
                  <span>
                    {(() => {
                      const target = getTargetLink(modalReport)
                      if (target) {
                        return (
                          <a
                            href={target.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-user-username-link"
                          >
                            {target.label}
                            <i className="fas fa-external-link-alt"></i>
                          </a>
                        )
                      }
                      return '削除済み'
                    })()}
                  </span>
                </div>
                <div className="admin-report-row">
                  <span className="admin-report-label">理由</span>
                  <span>{modalReport.reason}</span>
                </div>
                {modalReport.description && (
                  <div className="admin-report-row">
                    <span className="admin-report-label">詳細</span>
                    <span>{modalReport.description}</span>
                  </div>
                )}
                <div className="admin-report-row">
                  <span className="admin-report-label">通報者</span>
                  <span>
                    {modalReport.reporter ? (
                      <a
                        href={`/creators/${modalReport.reporter.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-user-username-link"
                      >
                        @{modalReport.reporter.username}
                        <i className="fas fa-external-link-alt"></i>
                      </a>
                    ) : '不明'}
                  </span>
                </div>
                <div className="admin-report-row">
                  <span className="admin-report-label">通報日時</span>
                  <span>{new Date(modalReport.created_at).toLocaleString('ja-JP')}</span>
                </div>
                {modalReport.handled_at && (
                  <div className="admin-report-row">
                    <span className="admin-report-label">処理日時</span>
                    <span>{new Date(modalReport.handled_at).toLocaleString('ja-JP')}</span>
                  </div>
                )}
              </div>

              {/* 管理者メモ */}
              {!isProcessed(modalReport) ? (
                <div className="admin-form-group" style={{ marginTop: 16 }}>
                  <label className="admin-form-label">管理者メモ（任意）</label>
                  <textarea
                    className="admin-form-textarea"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="対応内容をメモ（BANした、問題なしなど）"
                  />
                </div>
              ) : modalReport.admin_note && (
                <div className="admin-report-row" style={{ marginTop: 16 }}>
                  <span className="admin-report-label">管理者メモ</span>
                  <span>{modalReport.admin_note}</span>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button
                className="admin-action-btn secondary"
                onClick={closeModal}
                disabled={actionLoading}
              >
                閉じる
              </button>
              {!isProcessed(modalReport) && (
                <button
                  className="admin-action-btn primary"
                  onClick={markAsProcessed}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    '処理済みにする'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}