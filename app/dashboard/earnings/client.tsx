'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import DashboardSidebar from '@/app/components/DashboardSidebar'

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
  const [accountType, setAccountType] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([])
  const [completedPayments, setCompletedPayments] = useState<Payment[]>([])
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'history'>('overview')
  
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      loadPayments()
      loadBankAccount()
    }
  }, [currentProfileId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent('/dashboard/earnings')}`)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type, is_admin')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentProfileId(profile.id)
      setAccountType(profile.account_type)
      setIsAdmin(profile.is_admin || false)
    }
    
    setLoading(false)
  }

  async function loadPayments() {
    // 振込待ちの報酬を取得
    const { data: pending, error: pendingError } = await supabase
      .from('payments')
      .select(`
        *,
        work_request:work_requests!work_request_id (
          id,
          title,
          final_price,
          completed_at,
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

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      
      <div className="earnings-page dashboard-layout">
        <DashboardSidebar accountType={accountType} isAdmin={isAdmin} />
        
        {loading ? (
          <div className="dashboard-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <span>読み込み中...</span>
          </div>
        ) : (
          <main className="earnings-main">
            <div className="earnings-container">
              <h1 className="earnings-title">売上管理</h1>

              {/* タブ */}
              <div className="earnings-tabs">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`earnings-tab ${activeTab === 'overview' ? 'active' : ''}`}
                >
                  概要
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`earnings-tab ${activeTab === 'pending' ? 'active' : ''}`}
                >
                  振込待ち
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`earnings-tab ${activeTab === 'history' ? 'active' : ''}`}
                >
                  振込履歴
                </button>
              </div>

              {/* 概要タブ */}
              {activeTab === 'overview' && (
                <>
                  {/* 口座未登録の警告 */}
                  {!bankAccount && (
                    <div className="earnings-alert">
                      <div className="earnings-alert-content">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>振込先口座が未登録です。振込を受け取るには口座情報を登録してください。</span>
                      </div>
                      <Link href="/dashboard/bank-account" className="earnings-btn primary small">
                        今すぐ登録
                      </Link>
                    </div>
                  )}

                  {/* サマリー */}
                  <div className="earnings-summary-grid">
                    <div className="earnings-summary-card">
                      <div className="earnings-summary-value">
                        {totalEarnings.toLocaleString()}<span className="earnings-summary-unit">円</span>
                      </div>
                      <div className="earnings-summary-label">総売上（税込・手数料差引後）</div>
                    </div>
                    <div className="earnings-summary-card highlight">
                      <div className="earnings-summary-value">
                        {totalPendingAmount.toLocaleString()}<span className="earnings-summary-unit">円</span>
                      </div>
                      <div className="earnings-summary-label">振込待ち</div>
                    </div>
                    <div className="earnings-summary-card">
                      <div className="earnings-summary-value">
                        {totalWorks}<span className="earnings-summary-unit">件</span>
                      </div>
                      <div className="earnings-summary-label">完了した仕事</div>
                    </div>
                  </div>

                  {/* 振込予定 */}
                  {totalPendingAmount > 0 && (
                    <div className="earnings-transfer-card">
                      <h2 className="earnings-transfer-title">
                        <i className="fas fa-calendar-check"></i>
                        振込予定
                      </h2>

                      <div className="earnings-transfer-total">
                        <div className="earnings-transfer-row">
                          <span>振込待ち報酬（{pendingPayments.length}件）</span>
                          <span className="earnings-transfer-amount">{totalPendingAmount.toLocaleString()}円</span>
                        </div>
                        {totalPendingAmount >= MIN_PAYOUT_AMOUNT ? (
                          <>
                            <div className="earnings-transfer-row sub">
                              <span>振込手数料</span>
                              <span>-{TRANSFER_FEE}円</span>
                            </div>
                            <div className="earnings-transfer-row final">
                              <span>振込額</span>
                              <span className="earnings-transfer-final">{pendingTransferAmount.toLocaleString()}円</span>
                            </div>
                          </>
                        ) : (
                          <div className="earnings-transfer-notice warning">
                            <i className="fas fa-info-circle"></i>
                            最低振込額（{MIN_PAYOUT_AMOUNT.toLocaleString()}円）に達していないため、次月以降に繰り越されます
                          </div>
                        )}
                      </div>

                      {totalPendingAmount >= MIN_PAYOUT_AMOUNT && (
                        <div className="earnings-transfer-notice">
                          <i className="fas fa-info-circle"></i>
                          毎月20日頃に自動で振込されます
                        </div>
                      )}
                    </div>
                  )}

                  {/* 振込について */}
                  <div className="earnings-info-card">
                    <h3 className="earnings-info-title">
                      <i className="fas fa-info-circle"></i>
                      振込について
                    </h3>
                    <div className="earnings-info-content">
                      ・プラットフォーム手数料: 12%<br />
                      ・最低振込額: {MIN_PAYOUT_AMOUNT.toLocaleString()}円<br />
                      ・振込手数料: {TRANSFER_FEE}円（クリエイター負担）<br />
                      ・振込日: 毎月20日頃（前月末締め・土日祝の場合は翌営業日）<br />
                      ・{MIN_PAYOUT_AMOUNT.toLocaleString()}円未満の売上は繰り越されます
                    </div>
                  </div>
                </>
              )}

              {/* 振込待ちタブ */}
              {activeTab === 'pending' && (
                <div className="earnings-pending">
                  {pendingPayments.length === 0 ? (
                    <div className="earnings-empty">
                      <i className="fas fa-clock"></i>
                      <p>振込待ちの報酬はありません</p>
                    </div>
                  ) : (
                    <div className="earnings-monthly-list">
                      {Object.entries(pendingByMonth)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([month, payments]) => {
                          const isExpanded = expandedMonths.has(month)
                          const monthTotal = payments.reduce((sum, p) => sum + p.amount, 0)

                          return (
                            <div
                              key={month}
                              className={`earnings-month-card ${isExpanded ? 'expanded' : ''}`}
                            >
                              <div 
                                className="earnings-month-header"
                                onClick={() => toggleMonth(month)}
                              >
                                <div className="earnings-month-info">
                                  <div className="earnings-month-title">
                                    <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                                    {formatMonth(month)}分
                                  </div>
                                  <div className="earnings-month-count">
                                    {payments.length}件
                                  </div>
                                </div>
                                <div className="earnings-month-amount">
                                  <div className="earnings-month-total">
                                    {monthTotal.toLocaleString()}円
                                  </div>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="earnings-month-works">
                                  {payments.map((payment) => (
                                    <Link
                                      key={payment.id}
                                      href={`/requests/${payment.work_request?.id}`}
                                      className="earnings-work-item"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="earnings-work-info">
                                        <div className="earnings-work-title">{payment.work_request?.title || '不明'}</div>
                                        <div className="earnings-work-date">
                                          完了日: {payment.work_request?.completed_at ? formatDate(payment.work_request.completed_at) : '-'}
                                        </div>
                                      </div>
                                      <div className="earnings-work-amount">
                                        <div className="earnings-work-price">
                                          {payment.amount.toLocaleString()}円
                                        </div>
                                        <div className="earnings-work-original">
                                          依頼額: {payment.work_request?.final_price?.toLocaleString() || '-'}円
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
                <div className="earnings-history">
                  {completedPayments.length === 0 ? (
                    <div className="earnings-empty">
                      <i className="fas fa-history"></i>
                      <p>振込履歴はまだありません</p>
                    </div>
                  ) : (
                    <div className="earnings-history-list">
                      {Object.entries(completedByDate)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([date, payments]) => {
                          const isExpanded = expandedMonths.has(date)
                          const dateTotal = payments.reduce((sum, p) => sum + p.amount, 0)
                          const transferFee = payments[0]?.transfer_fee || TRANSFER_FEE
                          const netAmount = dateTotal - transferFee

                          return (
                            <div
                              key={date}
                              className={`earnings-month-card ${isExpanded ? 'expanded' : ''}`}
                            >
                              <div 
                                className="earnings-month-header"
                                onClick={() => toggleMonth(date)}
                              >
                                <div className="earnings-month-info">
                                  <div className="earnings-month-title">
                                    <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                                    {formatDate(date)}
                                  </div>
                                  <div className="earnings-month-status">
                                    <span className="status-paid">振込済み</span>
                                  </div>
                                </div>
                                <div className="earnings-month-amount">
                                  <div className="earnings-month-total">
                                    {netAmount.toLocaleString()}円
                                  </div>
                                  <div className="earnings-month-detail">
                                    <span>{payments.length}件</span>
                                  </div>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="earnings-month-works">
                                  <div className="earnings-history-summary">
                                    <div className="earnings-history-row">
                                      <span>報酬合計</span>
                                      <span>{dateTotal.toLocaleString()}円</span>
                                    </div>
                                    <div className="earnings-history-row">
                                      <span>振込手数料</span>
                                      <span>-{transferFee}円</span>
                                    </div>
                                    <div className="earnings-history-row total">
                                      <span>振込額</span>
                                      <span>{netAmount.toLocaleString()}円</span>
                                    </div>
                                  </div>
                                  
                                  {payments.map((payment) => (
                                    <Link
                                      key={payment.id}
                                      href={`/requests/${payment.work_request?.id}`}
                                      className="earnings-work-item"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="earnings-work-info">
                                        <div className="earnings-work-title">{payment.work_request?.title || '不明'}</div>
                                        <div className="earnings-work-date">
                                          {formatMonth(payment.completed_month)}分
                                        </div>
                                      </div>
                                      <div className="earnings-work-amount">
                                        <div className="earnings-work-price">
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
          </main>
        )}
      </div>

      <Footer />
    </>
  )
}