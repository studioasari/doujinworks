'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../utils/supabase/client'

type PaymentSummary = {
  creator_id: string
  completed_month: string
  total_amount: number
  count: number
  status: string
  note: string | null
  creator?: {
    username: string
    display_name: string
  }
  bank_account?: {
    bank_name: string
    branch_name: string
    account_type: string
    account_number: string
    account_holder_name: string
  }
}

type Payment = {
  id: string
  work_request_id: string
  creator_id: string
  amount: number
  status: string
  completed_month: string
  paid_at: string | null
  transfer_fee: number | null
  note: string | null
  created_at: string
  work_request?: {
    title: string
  }
}

const TRANSFER_FEE = 330
const MIN_PAYOUT_AMOUNT = 1000

// 前月を取得（振込対象の最新月）
function getLastMonth() {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export default function AdminPayments() {
  const supabase = createClient()
  const [summaries, setSummaries] = useState<PaymentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed'>('pending')

  // モーダル用
  const [modalSummary, setModalSummary] = useState<PaymentSummary | null>(null)
  const [modalPayments, setModalPayments] = useState<Payment[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [paymentNote, setPaymentNote] = useState('')

  // 前月（振込対象の最新月）
  const lastMonth = getLastMonth()

  useEffect(() => {
    loadSummaries()
  }, [statusFilter])

  async function loadSummaries() {
    setLoading(true)

    // 前月までのpending/completedを取得
    let query = supabase
      .from('payments')
      .select(`
        id,
        creator_id,
        amount,
        status,
        completed_month,
        note,
        creator:profiles!creator_id (
          username,
          display_name
        )
      `)
      .eq('status', statusFilter)
      .order('completed_month', { ascending: false })

    // pendingの場合は前月までのみ
    if (statusFilter === 'pending') {
      query = query.lte('completed_month', lastMonth)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading payments:', error)
      setLoading(false)
      return
    }

    // クリエイターごとにグループ化（月は関係なく累計）
    const grouped: { [key: string]: PaymentSummary } = {}

    for (const payment of data || []) {
      const key = payment.creator_id
      
      if (!grouped[key]) {
        grouped[key] = {
          creator_id: payment.creator_id,
          completed_month: payment.completed_month, // 最新月を表示用に
          total_amount: 0,
          count: 0,
          status: payment.status,
          note: payment.note || null,
          creator: payment.creator as any
        }
      }
      
      grouped[key].total_amount += payment.amount
      grouped[key].count += 1
      // 最新月を更新
      if (payment.completed_month > grouped[key].completed_month) {
        grouped[key].completed_month = payment.completed_month
      }
      // noteがあれば更新
      if (payment.note) {
        grouped[key].note = payment.note
      }
    }

    // 配列に変換して最低金額以上のみ（pendingの場合）
    let result = Object.values(grouped)
    
    // 銀行口座情報を取得
    const creatorIds = [...new Set(result.map(r => r.creator_id))]
    if (creatorIds.length > 0) {
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .in('profile_id', creatorIds)

      const bankMap: { [key: string]: any } = {}
      for (const account of bankAccounts || []) {
        bankMap[account.profile_id] = account
      }

      result = result.map(r => ({
        ...r,
        bank_account: bankMap[r.creator_id]
      }))
    }

    // 日付順にソート（新しい順）
    result.sort((a, b) => b.completed_month.localeCompare(a.completed_month))

    setSummaries(result)
    setLoading(false)
  }

  async function openModal(summary: PaymentSummary) {
    setModalSummary(summary)
    setModalLoading(true)
    setPaymentNote(summary.note || '')

    // 該当クリエイターのpayments詳細を取得（前月まで）
    let query = supabase
      .from('payments')
      .select(`
        *,
        work_request:work_requests!work_request_id (
          title
        )
      `)
      .eq('creator_id', summary.creator_id)
      .eq('status', summary.status)
      .order('created_at', { ascending: false })

    // pendingの場合は前月までのみ
    if (summary.status === 'pending') {
      query = query.lte('completed_month', lastMonth)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading payment details:', error)
    } else {
      setModalPayments(data || [])
    }

    setModalLoading(false)
  }

  function closeModal() {
    setModalSummary(null)
    setModalPayments([])
    setPaymentNote('')
  }

  async function processPayment() {
    if (!modalSummary) return

    const netAmount = modalSummary.total_amount - TRANSFER_FEE
    if (netAmount < MIN_PAYOUT_AMOUNT - TRANSFER_FEE) {
      alert(`振込金額が最低金額（${MIN_PAYOUT_AMOUNT}円）未満です`)
      return
    }

    if (!modalSummary.bank_account) {
      alert('振込先口座が登録されていません')
      return
    }

    if (!confirm(`${modalSummary.creator?.display_name || 'クリエイター'}に${netAmount.toLocaleString()}円を振込済みにしますか？`)) {
      return
    }

    setActionLoading(true)

    // 該当するpayments全てを更新
    const paymentIds = modalPayments.map(p => p.id)
    
    const { error } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        transfer_fee: TRANSFER_FEE,
        note: paymentNote || null,
        updated_at: new Date().toISOString()
      })
      .in('id', paymentIds)

    if (error) {
      console.error('Error processing payment:', error)
      alert('エラーが発生しました')
    } else {
      alert('振込処理が完了しました')
      closeModal()
      loadSummaries()
    }

    setActionLoading(false)
  }

  async function revertPayment() {
    if (!modalSummary) return

    if (!confirm(`${modalSummary.creator?.display_name || 'クリエイター'}の振込を「振込待ち」に戻しますか？`)) {
      return
    }

    setActionLoading(true)

    const paymentIds = modalPayments.map(p => p.id)
    
    const { error } = await supabase
      .from('payments')
      .update({
        status: 'pending',
        paid_at: null,
        transfer_fee: null,
        updated_at: new Date().toISOString()
      })
      .in('id', paymentIds)

    if (error) {
      console.error('Error reverting payment:', error)
      alert('エラーが発生しました')
    } else {
      alert('振込待ちに戻しました')
      closeModal()
      loadSummaries()
    }

    setActionLoading(false)
  }

  async function saveNote() {
    if (!modalSummary) return

    const paymentIds = modalPayments.map(p => p.id)
    
    await supabase
      .from('payments')
      .update({
        note: paymentNote || null,
        updated_at: new Date().toISOString()
      })
      .in('id', paymentIds)

    // 静かに保存（alertなし）
    loadSummaries()
  }

  function formatMonth(month: string) {
    const [year, m] = month.split('-')
    return `${year}年${parseInt(m)}月`
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="admin-header">
        <h1>振込管理</h1>
        <p>クリエイターへの報酬振込（{formatMonth(lastMonth)}分までが対象）</p>
      </div>

      {/* タブ */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          振込待ち
        </button>
        <button
          className={`admin-tab ${statusFilter === 'completed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('completed')}
        >
          振込済み
        </button>
      </div>

      {/* 統計 */}
      {statusFilter === 'pending' && summaries.length > 0 && (
        <div className="admin-stats-bar">
          <div className="admin-stat-item">
            <span className="admin-stat-label">振込待ち件数</span>
            <span className="admin-stat-value">{summaries.length}件</span>
          </div>
          <div className="admin-stat-item">
            <span className="admin-stat-label">振込待ち合計</span>
            <span className="admin-stat-value">
              ¥{summaries.reduce((sum, s) => sum + s.total_amount - TRANSFER_FEE, 0).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* テーブル */}
      <div className="admin-table-container">
        {loading ? (
          <div className="admin-empty">
            <i className="fas fa-spinner fa-spin"></i>
            <p>読み込み中...</p>
          </div>
        ) : summaries.length === 0 ? (
          <div className="admin-empty">
            <i className="fas fa-wallet"></i>
            <p>{statusFilter === 'pending' ? '振込待ちはありません' : '振込履歴はありません'}</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>クリエイター</th>
                <th>件数</th>
                <th>報酬</th>
                <th>振込額</th>
                <th>口座</th>
                <th>メモ</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => {
                const netAmount = summary.total_amount - TRANSFER_FEE
                const hasBank = !!summary.bank_account
                const canPayout = netAmount >= MIN_PAYOUT_AMOUNT - TRANSFER_FEE && hasBank

                return (
                  <tr 
                    key={summary.creator_id}
                    onClick={() => openModal(summary)}
                    className="admin-table-row-clickable"
                  >
                    <td>
                      {summary.creator ? (
                        <a
                          href={`/creators/${summary.creator.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-user-username-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {summary.creator.display_name || summary.creator.username}
                          <i className="fas fa-external-link-alt"></i>
                        </a>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>不明</span>
                      )}
                    </td>
                    <td>{summary.count}件</td>
                    <td>¥{summary.total_amount.toLocaleString()}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#059669' }}>
                        ¥{netAmount.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      {hasBank ? (
                        <span className="admin-badge green">登録済み</span>
                      ) : (
                        <span className="admin-badge red">未登録</span>
                      )}
                    </td>
                    <td>
                      {summary.note ? (
                        <span className="admin-note-preview" title={summary.note}>
                          {summary.note.length > 10 ? summary.note.slice(0, 10) + '...' : summary.note}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {statusFilter === 'pending' && (
                        <button
                          className="admin-action-btn secondary"
                          onClick={() => openModal(summary)}
                          disabled={!canPayout}
                        >
                          振込処理
                        </button>
                      )}
                      {statusFilter === 'completed' && (
                        <span className="admin-badge green">振込済み</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* モーダル */}
      {modalSummary && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal wide" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>
                {modalSummary.creator?.display_name || 'クリエイター'}（{modalPayments.length}件）
              </h3>
              <button className="admin-modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="admin-modal-body">
              {modalLoading ? (
                <div className="admin-empty">
                  <i className="fas fa-spinner fa-spin"></i>
                </div>
              ) : (
                <>
                  {/* 振込先情報 */}
                  <div className="admin-payment-bank">
                    <h4>振込先口座</h4>
                    {modalSummary.bank_account ? (
                      <div className="admin-payment-bank-info">
                        <p>{modalSummary.bank_account.bank_name} {modalSummary.bank_account.branch_name}</p>
                        <p>{modalSummary.bank_account.account_type === 'savings' ? '普通' : modalSummary.bank_account.account_type === 'checking' ? '当座' : modalSummary.bank_account.account_type} {modalSummary.bank_account.account_number}</p>
                        <p>{modalSummary.bank_account.account_holder_name}</p>
                      </div>
                    ) : (
                      <p style={{ color: '#dc2626' }}>口座が登録されていません</p>
                    )}
                  </div>

                  {/* 金額内訳 */}
                  <div className="admin-payment-summary">
                    <div className="admin-payment-row">
                      <span>報酬合計（{modalPayments.length}件）</span>
                      <span>¥{modalSummary.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="admin-payment-row">
                      <span>振込手数料</span>
                      <span>-¥{TRANSFER_FEE.toLocaleString()}</span>
                    </div>
                    <div className="admin-payment-row total">
                      <span>振込額</span>
                      <span className="admin-payment-total-value">
                        ¥{(modalSummary.total_amount - TRANSFER_FEE).toLocaleString()}
                        <button
                          className="admin-copy-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(String(modalSummary.total_amount - TRANSFER_FEE))
                            alert('コピーしました')
                          }}
                          title="金額をコピー"
                        >
                          <i className="fas fa-copy"></i>
                        </button>
                      </span>
                    </div>
                  </div>

                  {/* 明細 */}
                  <div className="admin-payment-details">
                    <h4>明細</h4>
                    <table className="admin-table small">
                      <thead>
                        <tr>
                          <th>依頼</th>
                          <th>金額</th>
                          <th>対象月</th>
                          <th>完了日</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalPayments.map((payment) => (
                          <tr key={payment.id}>
                            <td>{payment.work_request?.title || '不明'}</td>
                            <td>¥{payment.amount.toLocaleString()}</td>
                            <td>{formatMonth(payment.completed_month)}</td>
                            <td>{new Date(payment.created_at).toLocaleDateString('ja-JP')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* メモ */}
                  <div className="admin-form-group" style={{ marginTop: 16 }}>
                    <label className="admin-form-label">メモ</label>
                    {statusFilter === 'pending' ? (
                      <textarea
                        className="admin-form-textarea"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        onBlur={saveNote}
                        placeholder="口座情報が間違っている、連絡済みなど"
                      />
                    ) : (
                      <div className="admin-form-readonly">
                        {modalPayments[0]?.note || 'なし'}
                      </div>
                    )}
                  </div>
                </>
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
              {statusFilter === 'pending' && modalSummary.bank_account && (
                <button
                  className="admin-action-btn primary"
                  onClick={processPayment}
                  disabled={actionLoading || modalSummary.total_amount - TRANSFER_FEE < MIN_PAYOUT_AMOUNT - TRANSFER_FEE}
                >
                  {actionLoading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    '振込済みにする'
                  )}
                </button>
              )}
              {statusFilter === 'completed' && (
                <button
                  className="admin-action-btn warning"
                  onClick={revertPayment}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    '振込待ちに戻す'
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