'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { LoadingSpinner } from '@/app/components/Skeleton'
import styles from './page.module.css'

type Payment = {
  id: string
  work_request_id: string
  amount: number
  status: string
  completed_month: string
  paid_at: string | null
  transfer_fee: number | null
  created_at: string
  work_request?: {
    id: string
    title: string
    final_price: number
    completed_at: string
    status: string
    requester: {
      display_name: string | null
      avatar_url: string | null
    }
  }
}

type BankAccount = {
  id: string
  bank_name: string
  branch_name: string
  account_type: string
  account_number: string
  account_holder_name: string
}

const TRANSFER_FEE = 330
const MIN_PAYOUT_AMOUNT = 1000

export default function EarningsClient() {
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([])
  const [completedPayments, setCompletedPayments] = useState<Payment[]>([])
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'history'>('overview')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      loadPayments()
      loadBankAccount()
    }
  }, [currentProfileId])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type, is_admin')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentProfileId(profile.id)
    }
    
    setLoading(false)
  }

  async function loadPayments() {
    // 振込待ちの報酬を取得（依頼のステータスも取得）
    const { data: pending, error: pendingError } = await supabase
      .from('payments')
      .select(`
        *,
        work_request:work_requests!work_request_id (
          id,
          title,
          final_price,
          completed_at,
          status,
          requester:profiles!work_requests_requester_id_fkey (
            display_name,
            avatar_url
          )
        )
      `)
      .eq('creator_id', currentProfileId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (pendingError) {
      console.error('振込待ち取得エラー:', pendingError)
    } else {
      setPendingPayments(pending || [])
    }

    // 振込済みの報酬を取得
    const { data: completed, error: completedError } = await supabase
      .from('payments')
      .select(`
        *,
        work_request:work_requests!work_request_id (
          id,
          title,
          final_price,
          completed_at,
          status,
          requester:profiles!work_requests_requester_id_fkey (
            display_name,
            avatar_url
          )
        )
      `)
      .eq('creator_id', currentProfileId)
      .eq('status', 'completed')
      .order('paid_at', { ascending: false })

    if (completedError) {
      console.error('振込済み取得エラー:', completedError)
    } else {
      setCompletedPayments(completed || [])
    }
  }

  async function loadBankAccount() {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('profile_id', currentProfileId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('口座情報取得エラー:', error)
      return
    }

    if (data) {
      setBankAccount(data)
    }
  }

  function toggleMonth(month: string) {
    const newExpanded = new Set(expandedMonths)
    if (newExpanded.has(month)) {
      newExpanded.delete(month)
    } else {
      newExpanded.add(month)
    }
    setExpandedMonths(newExpanded)
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  function formatMonth(monthStr: string) {
    const [year, month] = monthStr.split('-')
    return `${year}年${parseInt(month)}月`
  }

  function getStatusLabel(status: string) {
    const statuses: { [key: string]: string } = {
      open: '募集中',
      in_progress: '進行中',
      delivered: '納品済み',
      completed: '完了',
      cancelled: 'キャンセル'
    }
    return statuses[status] || status
  }

  function getStatusBadgeClass(status: string) {
    const classes: { [key: string]: string } = {
      open: 'badge-open',
      in_progress: 'badge-progress',
      delivered: 'badge-accent',
      completed: 'badge-open',
      cancelled: 'badge-closed'
    }
    return classes[status] || ''
  }

  // 振込待ち合計
  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0)
  const pendingTransferAmount = totalPendingAmount >= MIN_PAYOUT_AMOUNT ? totalPendingAmount - TRANSFER_FEE : 0

  // 振込済み合計
  const totalCompletedAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0)

  // 総売上
  const totalEarnings = totalPendingAmount + totalCompletedAmount
  const totalWorks = pendingPayments.length + completedPayments.length

  // 振込待ちを月別にグループ化
  const pendingByMonth = pendingPayments.reduce((acc: { [key: string]: Payment[] }, payment) => {
    const month = payment.completed_month
    if (!acc[month]) {
      acc[month] = []
    }
    acc[month].push(payment)
    return acc
  }, {})

  // 振込履歴を振込日別にグループ化
  const completedByDate = completedPayments.reduce((acc: { [key: string]: Payment[] }, payment) => {
    const date = payment.paid_at ? payment.paid_at.split('T')[0] : 'unknown'
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(payment)
    return acc
  }, {})

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>売上管理</h1>

      {/* タブ */}
      <div className={`tabs ${styles.tabs}`}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
        >
          概要
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
        >
          振込待ち
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
        >
          振込履歴
        </button>
      </div>

      {/* 概要タブ */}
      {activeTab === 'overview' && (
        <div className={styles.tabContent}>
          {/* 口座未登録の警告 */}
          {!bankAccount && (
            <div className={`alert alert-warning ${styles.bankAlert}`}>
              <i className="fa-solid fa-triangle-exclamation alert-icon"></i>
              <span className={styles.alertText}>振込先口座が未登録です。振込を受け取るには口座情報を登録してください。</span>
              <Link href="/dashboard/bank-account" className="btn btn-primary btn-sm">
                今すぐ登録
              </Link>
            </div>
          )}

          {/* サマリー */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>
                {totalEarnings.toLocaleString()}<span className={styles.summaryUnit}>円</span>
              </div>
              <div className={styles.summaryLabel}>総売上（税込・手数料差引後）</div>
            </div>
            <div className={`${styles.summaryCard} ${styles.highlight}`}>
              <div className={styles.summaryValue}>
                {totalPendingAmount.toLocaleString()}<span className={styles.summaryUnit}>円</span>
              </div>
              <div className={styles.summaryLabel}>振込待ち</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>
                {totalWorks}<span className={styles.summaryUnit}>件</span>
              </div>
              <div className={styles.summaryLabel}>完了した仕事</div>
            </div>
          </div>

          {/* 振込予定 */}
          {totalPendingAmount > 0 && (
            <div className={styles.transferCard}>
              <h2 className={styles.transferTitle}>
                <i className="fa-solid fa-calendar-check"></i>
                振込予定
              </h2>

              <div className={styles.transferTotal}>
                <div className={styles.transferRow}>
                  <span>振込待ち報酬（{pendingPayments.length}件）</span>
                  <span className={styles.transferAmount}>{totalPendingAmount.toLocaleString()}円</span>
                </div>
                {totalPendingAmount >= MIN_PAYOUT_AMOUNT ? (
                  <>
                    <div className={`${styles.transferRow} ${styles.sub}`}>
                      <span>振込手数料</span>
                      <span>-{TRANSFER_FEE}円</span>
                    </div>
                    <div className={`${styles.transferRow} ${styles.final}`}>
                      <span>振込額</span>
                      <span className={styles.transferFinal}>{pendingTransferAmount.toLocaleString()}円</span>
                    </div>
                  </>
                ) : (
                  <div className={`${styles.transferNotice} ${styles.warning}`}>
                    <i className="fa-solid fa-circle-info"></i>
                    最低振込額（{MIN_PAYOUT_AMOUNT.toLocaleString()}円）に達していないため、次月以降に繰り越されます
                  </div>
                )}
              </div>

              {totalPendingAmount >= MIN_PAYOUT_AMOUNT && (
                <div className={styles.transferNotice}>
                  <i className="fa-solid fa-circle-info"></i>
                  毎月20日頃に自動で振込されます
                </div>
              )}
            </div>
          )}

          {/* 振込について */}
          <div className={styles.infoCard}>
            <h3 className={styles.infoTitle}>
              <i className="fa-solid fa-circle-info"></i>
              振込について
            </h3>
            <div className={styles.infoContent}>
              <ul className={styles.infoList}>
                <li>プラットフォーム手数料: 12%</li>
                <li>最低振込額: {MIN_PAYOUT_AMOUNT.toLocaleString()}円</li>
                <li>振込手数料: {TRANSFER_FEE}円（クリエイター負担）</li>
                <li>振込日: 毎月20日頃（前月末締め・土日祝の場合は翌営業日）</li>
                <li>{MIN_PAYOUT_AMOUNT.toLocaleString()}円未満の売上は繰り越されます</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 振込待ちタブ */}
      {activeTab === 'pending' && (
        <div className={styles.tabContent}>
          {pendingPayments.length === 0 ? (
            <div className="empty-state">
              <i className="fa-regular fa-clock"></i>
              <p>振込待ちの報酬はありません</p>
            </div>
          ) : (
            <div className={styles.monthlyList}>
              {Object.entries(pendingByMonth)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([month, payments]) => {
                  const isExpanded = expandedMonths.has(month)
                  const monthTotal = payments.reduce((sum, p) => sum + p.amount, 0)

                  return (
                    <div key={month} className={styles.monthCard}>
                      <div 
                        className={styles.monthHeader}
                        onClick={() => toggleMonth(month)}
                      >
                        <div className={styles.monthInfo}>
                          <div className={styles.monthTitle}>
                            <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                            {formatMonth(month)}分
                          </div>
                          <div className={styles.monthCount}>
                            {payments.length}件
                          </div>
                        </div>
                        <div className={styles.monthAmount}>
                          <div className={styles.monthTotal}>
                            {monthTotal.toLocaleString()}円
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={styles.monthWorks}>
                          {payments.map((payment) => (
                            <Link
                              key={payment.id}
                              href={`/requests/${payment.work_request?.id}`}
                              className={styles.workItem}
                            >
                              <div className={styles.workInfo}>
                                <div className={styles.workTitle}>{payment.work_request?.title || '不明'}</div>
                                <div className={styles.workMeta}>
                                  <div className="avatar avatar-xs">
                                    {payment.work_request?.requester?.avatar_url ? (
                                      <img src={payment.work_request.requester.avatar_url} alt="" />
                                    ) : (
                                      <i className="fa-solid fa-user"></i>
                                    )}
                                  </div>
                                  <span className={styles.requesterName}>
                                    {payment.work_request?.requester?.display_name || '名前未設定'}
                                  </span>
                                  <span className={`badge ${getStatusBadgeClass(payment.work_request?.status || '')}`}>
                                    {getStatusLabel(payment.work_request?.status || '')}
                                  </span>
                                </div>
                              </div>
                              <div className={styles.workAmount}>
                                <div className={styles.workPrice}>
                                  {payment.amount.toLocaleString()}円
                                </div>
                                <div className={styles.workDate}>
                                  {payment.work_request?.completed_at ? formatDate(payment.work_request.completed_at) : '-'}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* 振込履歴タブ */}
      {activeTab === 'history' && (
        <div className={styles.tabContent}>
          {completedPayments.length === 0 ? (
            <div className="empty-state">
              <i className="fa-regular fa-folder-open"></i>
              <p>振込履歴はまだありません</p>
            </div>
          ) : (
            <div className={styles.monthlyList}>
              {Object.entries(completedByDate)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, payments]) => {
                  const isExpanded = expandedMonths.has(date)
                  const dateTotal = payments.reduce((sum, p) => sum + p.amount, 0)
                  const transferFee = payments[0]?.transfer_fee || TRANSFER_FEE
                  const netAmount = dateTotal - transferFee

                  return (
                    <div key={date} className={styles.monthCard}>
                      <div 
                        className={styles.monthHeader}
                        onClick={() => toggleMonth(date)}
                      >
                        <div className={styles.monthInfo}>
                          <div className={styles.monthTitle}>
                            <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                            {formatDate(date)}
                          </div>
                          <span className="badge badge-open">
                            <i className="fa-solid fa-circle fa-xs"></i> 振込済み
                          </span>
                        </div>
                        <div className={styles.monthAmount}>
                          <div className={styles.monthTotal}>
                            {netAmount.toLocaleString()}円
                          </div>
                          <div className={styles.monthDetail}>
                            {payments.length}件
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={styles.monthWorks}>
                          <div className={styles.historySummary}>
                            <div className={styles.historyRow}>
                              <span>報酬合計</span>
                              <span>{dateTotal.toLocaleString()}円</span>
                            </div>
                            <div className={styles.historyRow}>
                              <span>振込手数料</span>
                              <span>-{transferFee}円</span>
                            </div>
                            <div className={`${styles.historyRow} ${styles.total}`}>
                              <span>振込額</span>
                              <span>{netAmount.toLocaleString()}円</span>
                            </div>
                          </div>
                          
                          {payments.map((payment) => (
                            <Link
                              key={payment.id}
                              href={`/requests/${payment.work_request?.id}`}
                              className={styles.workItem}
                            >
                              <div className={styles.workInfo}>
                                <div className={styles.workTitle}>{payment.work_request?.title || '不明'}</div>
                                <div className={styles.workMeta}>
                                  <div className="avatar avatar-xs">
                                    {payment.work_request?.requester?.avatar_url ? (
                                      <img src={payment.work_request.requester.avatar_url} alt="" />
                                    ) : (
                                      <i className="fa-solid fa-user"></i>
                                    )}
                                  </div>
                                  <span className={styles.requesterName}>
                                    {payment.work_request?.requester?.display_name || '名前未設定'}
                                  </span>
                                </div>
                              </div>
                              <div className={styles.workAmount}>
                                <div className={styles.workPrice}>
                                  {payment.amount.toLocaleString()}円
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}