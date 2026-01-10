'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import DashboardSidebar from '@/app/components/DashboardSidebar'

type CompletedWork = {
  id: string
  title: string
  final_price: number
  completed_at: string
  requester: {
    display_name: string | null
    avatar_url: string | null
  }
}

type MonthlyEarnings = {
  month: string
  works: CompletedWork[]
  total_amount: number
  transfer_fee: number
  final_amount: number
  transfer_date: string
  transfer_available: boolean
  paid: boolean
}

type BankAccount = {
  id: string
  bank_name: string
  branch_name: string
  account_type: string
  account_number: string
  account_holder_name: string
}

export default function EarningsClient() {
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [accountType, setAccountType] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarnings[]>([])
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'history'>('overview')
  
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      loadMonthlyEarnings()
      loadBankAccount()
    }
  }, [currentProfileId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent('/wallet/earnings')}`)
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

  async function loadMonthlyEarnings() {
    const { data: applications, error: appError } = await supabase
      .from('work_request_applications')
      .select('work_request_id')
      .eq('applicant_id', currentProfileId)
      .eq('status', 'accepted')

    if (appError) {
      console.error('応募取得エラー:', appError)
      return
    }

    if (!applications || applications.length === 0) {
      setMonthlyEarnings([])
      return
    }

    const requestIds = applications.map(app => app.work_request_id)

    const { data: requests, error: reqError } = await supabase
      .from('work_requests')
      .select('id, title, final_price, completed_at, requester_id')
      .in('id', requestIds)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    if (reqError) {
      console.error('依頼取得エラー:', reqError)
      return
    }

    const worksWithPayment = await Promise.all(
      (requests || []).map(async (work) => {
        const { data: requester } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', work.requester_id)
          .single()

        const { data: payment } = await supabase
          .from('payments')
          .select('status, paid_at')
          .eq('work_request_id', work.id)
          .single()

        return {
          id: work.id,
          title: work.title,
          final_price: work.final_price || 0,
          completed_at: work.completed_at || '',
          requester: requester || { display_name: null, avatar_url: null },
          paid: payment?.status === 'paid'
        }
      })
    )

    const groupedByMonth = worksWithPayment.reduce((acc: any, work) => {
      const completedDate = new Date(work.completed_at)
      const monthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`
      
      if (!acc[monthKey]) {
        acc[monthKey] = []
      }
      acc[monthKey].push(work)
      return acc
    }, {})

    const monthlyData = Object.entries(groupedByMonth).map(([month, works]: [string, any]) => {
      const totalAmount = works.reduce((sum: number, work: any) => 
        sum + Math.floor(work.final_price * 0.88), 0
      )
      
      const transferFee = 330
      const finalAmount = totalAmount >= 1000 ? totalAmount - transferFee : 0
      
      const paid = works.every((work: any) => work.paid)
      const canApply = totalAmount >= 1000 && !paid

      return {
        month,
        works,
        total_amount: totalAmount,
        transfer_fee: totalAmount >= 1000 ? transferFee : 0,
        final_amount: finalAmount,
        transfer_date: '',
        transfer_available: canApply,
        paid: paid
      }
    }).sort((a, b) => b.month.localeCompare(a.month))

    setMonthlyEarnings(monthlyData)
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

  const totalEarnings = monthlyEarnings.reduce((sum, m) => sum + m.total_amount, 0)
  const totalWorks = monthlyEarnings.reduce((sum, m) => sum + m.works.length, 0)

  // 当月を取得
  const today = new Date()
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  // 前月以前の未払い売上を取得
  const applicableMonths = monthlyEarnings.filter(m => 
    !m.paid && m.month < currentYearMonth
  )

  // 申請可能な売上の合計
  const totalApplicableAmount = applicableMonths.reduce((sum, m) => sum + m.total_amount, 0)
  const transferFee = 330
  const finalApplicableAmount = totalApplicableAmount >= 1000 ? totalApplicableAmount - transferFee : 0
  const canApplyTransfer = totalApplicableAmount >= 1000

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
                  onClick={() => setActiveTab('monthly')}
                  className={`earnings-tab ${activeTab === 'monthly' ? 'active' : ''}`}
                >
                  月別売上
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
                      <Link href="/wallet/bank-account" className="earnings-btn primary small">
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
                      <div className="earnings-summary-label">総売上（手数料差引後）</div>
                    </div>
                    <div className="earnings-summary-card highlight">
                      <div className="earnings-summary-value">
                        {finalApplicableAmount.toLocaleString()}<span className="earnings-summary-unit">円</span>
                      </div>
                      <div className="earnings-summary-label">申請可能額</div>
                    </div>
                    <div className="earnings-summary-card">
                      <div className="earnings-summary-value">
                        {totalWorks}<span className="earnings-summary-unit">件</span>
                      </div>
                      <div className="earnings-summary-label">完了した仕事</div>
                    </div>
                  </div>

                  {/* 振込申請 */}
                  {canApplyTransfer && (
                    <div className="earnings-transfer-card">
                      <h2 className="earnings-transfer-title">
                        <i className="fas fa-paper-plane"></i>
                        振込申請
                      </h2>
                      
                      {/* 申請対象の月別内訳 */}
                      <div className="earnings-transfer-section">
                        <div className="earnings-transfer-label">申請可能な売上</div>
                        <div className="earnings-transfer-breakdown">
                          {applicableMonths.map((monthData, index) => (
                            <div 
                              key={monthData.month}
                              className={`earnings-transfer-item ${index < applicableMonths.length - 1 ? 'border' : ''}`}
                            >
                              <span className="earnings-transfer-item-label">
                                {formatMonth(monthData.month)}分
                              </span>
                              <span className="earnings-transfer-item-value">
                                {monthData.total_amount.toLocaleString()}円
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 合計金額 */}
                      <div className="earnings-transfer-total">
                        <div className="earnings-transfer-row">
                          <span>合計</span>
                          <span className="earnings-transfer-amount">{totalApplicableAmount.toLocaleString()}円</span>
                        </div>
                        <div className="earnings-transfer-row sub">
                          <span>振込手数料</span>
                          <span>-330円</span>
                        </div>
                        <div className="earnings-transfer-row final">
                          <span>振込額</span>
                          <span className="earnings-transfer-final">{finalApplicableAmount.toLocaleString()}円</span>
                        </div>
                      </div>

                      {bankAccount ? (
                        <button className="earnings-btn primary full">
                          まとめて申請する
                        </button>
                      ) : (
                        <div className="earnings-transfer-notice">
                          振込申請には口座情報の登録が必要です
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
                      ・最低振込額: 1,000円（手数料差引前）<br />
                      ・振込手数料: 330円（クリエイター負担）<br />
                      ・申請後、3営業日以内に振込<br />
                      ・1,000円未満の売上は繰越されます
                    </div>
                  </div>
                </>
              )}

              {/* 月別売上タブ */}
              {activeTab === 'monthly' && (
                <div className="earnings-monthly">
                  {monthlyEarnings.length === 0 ? (
                    <div className="earnings-empty">
                      <i className="fas fa-chart-line"></i>
                      <p>完了した仕事はまだありません</p>
                      <Link href="/requests" className="earnings-btn primary">
                        依頼を探す
                      </Link>
                    </div>
                  ) : (
                    <div className="earnings-monthly-list">
                      {monthlyEarnings.map((monthData) => {
                        const isExpanded = expandedMonths.has(monthData.month)

                        return (
                          <div
                            key={monthData.month}
                            className={`earnings-month-card ${isExpanded ? 'expanded' : ''}`}
                          >
                            <div 
                              className="earnings-month-header"
                              onClick={() => toggleMonth(monthData.month)}
                            >
                              <div className="earnings-month-info">
                                <div className="earnings-month-title">
                                  <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                                  {formatMonth(monthData.month)}分
                                </div>
                                <div className="earnings-month-status">
                                  {monthData.paid ? (
                                    <span className="status-paid">振込済み</span>
                                  ) : monthData.total_amount < 1000 ? (
                                    <span className="status-pending">繰越中（最低振込額未満）</span>
                                  ) : monthData.month < currentYearMonth ? (
                                    <span className="status-available">申請可能</span>
                                  ) : (
                                    <span className="status-pending">当月（申請不可）</span>
                                  )}
                                </div>
                              </div>
                              <div className="earnings-month-amount">
                                <div className="earnings-month-total">
                                  {monthData.total_amount.toLocaleString()}円
                                </div>
                                {monthData.total_amount >= 1000 && (
                                  <div className="earnings-month-detail">
                                    <span>手数料 -330円</span>
                                    <span className="earnings-month-final">振込額: {monthData.final_amount.toLocaleString()}円</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="earnings-month-works">
                                {monthData.works.map((work) => (
                                  <Link
                                    key={work.id}
                                    href={`/requests/${work.id}`}
                                    className="earnings-work-item"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="earnings-work-info">
                                      <div className="earnings-work-title">{work.title}</div>
                                      <div className="earnings-work-date">完了日: {formatDate(work.completed_at)}</div>
                                    </div>
                                    <div className="earnings-work-amount">
                                      <div className="earnings-work-price">
                                        {Math.floor(work.final_price * 0.88).toLocaleString()}円
                                      </div>
                                      <div className="earnings-work-original">
                                        依頼額: {work.final_price.toLocaleString()}円
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
                <div className="earnings-empty">
                  <i className="fas fa-history"></i>
                  <p>振込履歴はまだありません</p>
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