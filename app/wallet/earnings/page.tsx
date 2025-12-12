'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import DashboardSidebar from '../../components/DashboardSidebar'

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

export default function EarningsPage() {
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
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex' }}>
          <DashboardSidebar accountType={accountType} isAdmin={isAdmin} />
          
          {loading ? (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: 'calc(100vh - 64px)',
              padding: '60px 20px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'center',
                  marginBottom: '32px',
                  height: '60px',
                  alignItems: 'center'
                }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: '6px',
                        height: '50px',
                        backgroundColor: '#1A1A1A',
                        transform: 'skewX(-20deg)',
                        animation: 'slideUp 1.2s ease-in-out infinite',
                        animationDelay: `${i * 0.15}s`
                      }}
                    ></div>
                  ))}
                </div>
                <p style={{ color: '#9B9B9B', fontSize: '13px', fontWeight: '400', letterSpacing: '0.3px' }}>
                  読み込み中...
                </p>
              </div>
              <style dangerouslySetInnerHTML={{
                __html: `
                  @keyframes slideUp {
                    0%, 100% { 
                      transform: skewX(-20deg) scaleY(0.3);
                      opacity: 0.3;
                    }
                    50% { 
                      transform: skewX(-20deg) scaleY(1);
                      opacity: 1;
                    }
                  }
                `
              }} />
            </div>
          ) : (
            <div style={{ flex: 1, padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1A1A1A', marginBottom: '32px' }}>
                売上管理
              </h1>

              {/* タブ */}
              <div style={{ 
                borderBottom: '1px solid #E5E5E5', 
                marginBottom: '32px',
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={() => setActiveTab('overview')}
                  style={{
                    minWidth: '100px',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'none',
                    fontSize: '15px',
                    fontWeight: activeTab === 'overview' ? '600' : '400',
                    color: activeTab === 'overview' ? '#1A1A1A' : '#9B9B9B',
                    cursor: 'pointer',
                    borderBottom: activeTab === 'overview' ? '2px solid #1A1A1A' : '2px solid transparent',
                    transition: 'all 0.2s',
                    marginBottom: '-1px'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'overview') e.currentTarget.style.color = '#6B6B6B'
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'overview') e.currentTarget.style.color = '#9B9B9B'
                  }}
                >
                  概要
                </button>
                <button
                  onClick={() => setActiveTab('monthly')}
                  style={{
                    minWidth: '100px',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'none',
                    fontSize: '15px',
                    fontWeight: activeTab === 'monthly' ? '600' : '400',
                    color: activeTab === 'monthly' ? '#1A1A1A' : '#9B9B9B',
                    cursor: 'pointer',
                    borderBottom: activeTab === 'monthly' ? '2px solid #1A1A1A' : '2px solid transparent',
                    transition: 'all 0.2s',
                    marginBottom: '-1px'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'monthly') e.currentTarget.style.color = '#6B6B6B'
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'monthly') e.currentTarget.style.color = '#9B9B9B'
                  }}
                >
                  月別売上
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  style={{
                    minWidth: '100px',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'none',
                    fontSize: '15px',
                    fontWeight: activeTab === 'history' ? '600' : '400',
                    color: activeTab === 'history' ? '#1A1A1A' : '#9B9B9B',
                    cursor: 'pointer',
                    borderBottom: activeTab === 'history' ? '2px solid #1A1A1A' : '2px solid transparent',
                    transition: 'all 0.2s',
                    marginBottom: '-1px'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'history') e.currentTarget.style.color = '#6B6B6B'
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'history') e.currentTarget.style.color = '#9B9B9B'
                  }}
                >
                  振込履歴
                </button>
              </div>

              {/* 概要タブ */}
              {activeTab === 'overview' && (
                <>
                  {/* 口座未登録の警告 */}
                  {!bankAccount && (
                    <div style={{ 
                      padding: '16px 20px', 
                      backgroundColor: '#FAFAFA', 
                      borderRadius: '8px', 
                      marginBottom: '24px',
                      border: '1px solid #E5E5E5',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '14px', color: '#1A1A1A' }}>
                        振込先口座が未登録です。振込を受け取るには口座情報を登録してください。
                      </div>
                      <Link
                        href="/wallet/bank-account"
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#FFFFFF',
                          backgroundColor: '#1A1A1A',
                          border: 'none',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          marginLeft: '16px'
                        }}
                      >
                        今すぐ登録
                      </Link>
                    </div>
                  )}

                  {/* サマリー */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ 
                      padding: '24px', 
                      backgroundColor: '#FAFAFA', 
                      borderRadius: '12px', 
                      border: '1px solid #E5E5E5',
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px', color: '#1A1A1A' }}>
                        {totalEarnings.toLocaleString()}円
                      </div>
                      <div style={{ fontSize: '13px', color: '#9B9B9B' }}>総売上（手数料差引後）</div>
                    </div>
                    <div style={{ 
                      padding: '24px', 
                      backgroundColor: '#FAFAFA', 
                      borderRadius: '12px', 
                      border: '1px solid #E5E5E5',
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px', color: '#1A1A1A' }}>
                        {finalApplicableAmount.toLocaleString()}円
                      </div>
                      <div style={{ fontSize: '13px', color: '#9B9B9B' }}>申請可能額</div>
                    </div>
                    <div style={{ 
                      padding: '24px', 
                      backgroundColor: '#FAFAFA', 
                      borderRadius: '12px', 
                      border: '1px solid #E5E5E5',
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px', color: '#1A1A1A' }}>
                        {totalWorks}件
                      </div>
                      <div style={{ fontSize: '13px', color: '#9B9B9B' }}>完了した仕事</div>
                    </div>
                  </div>

                  {/* 振込申請 */}
                  {canApplyTransfer && (
                    <div style={{ 
                      padding: '24px', 
                      backgroundColor: '#FAFAFA', 
                      borderRadius: '12px', 
                      marginBottom: '32px',
                      border: '1px solid #E5E5E5'
                    }}>
                      <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>
                        振込申請
                      </h2>
                      
                      {/* 申請対象の月別内訳 */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', color: '#9B9B9B', marginBottom: '8px' }}>
                          申請可能な売上
                        </div>
                        <div style={{ 
                          backgroundColor: '#FFFFFF', 
                          borderRadius: '8px', 
                          padding: '12px',
                          border: '1px solid #E5E5E5'
                        }}>
                          {applicableMonths.map((monthData, index) => (
                            <div 
                              key={monthData.month}
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                paddingBottom: index < applicableMonths.length - 1 ? '8px' : '0',
                                marginBottom: index < applicableMonths.length - 1 ? '8px' : '0',
                                borderBottom: index < applicableMonths.length - 1 ? '1px solid #F5F5F5' : 'none'
                              }}
                            >
                              <span style={{ fontSize: '13px', color: '#6B6B6B' }}>
                                {formatMonth(monthData.month)}分
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>
                                {monthData.total_amount.toLocaleString()}円
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 合計金額 */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px', color: '#6B6B6B' }}>合計</span>
                          <span style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A' }}>
                            {totalApplicableAmount.toLocaleString()}円
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', color: '#9B9B9B' }}>振込手数料</span>
                          <span style={{ fontSize: '13px', color: '#9B9B9B' }}>
                            -330円
                          </span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          paddingTop: '12px',
                          borderTop: '1px solid #E5E5E5'
                        }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A' }}>振込額</span>
                          <span style={{ fontSize: '24px', fontWeight: '600', color: '#1A1A1A' }}>
                            {finalApplicableAmount.toLocaleString()}円
                          </span>
                        </div>
                      </div>

                      {bankAccount ? (
                        <button
                          style={{
                            width: '100%',
                            padding: '14px',
                            fontSize: '15px',
                            fontWeight: '600',
                            color: '#FFFFFF',
                            backgroundColor: '#1A1A1A',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333333'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1A1A1A'}
                        >
                          まとめて申請する
                        </button>
                      ) : (
                        <div style={{ 
                          padding: '12px', 
                          backgroundColor: '#FFFFFF',
                          borderRadius: '8px',
                          border: '1px solid #E5E5E5',
                          fontSize: '13px',
                          color: '#6B6B6B',
                          textAlign: 'center'
                        }}>
                          振込申請には口座情報の登録が必要です
                        </div>
                      )}
                    </div>
                  )}

                  {/* 振込について */}
                  <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#FAFAFA', 
                    borderRadius: '12px',
                    border: '1px solid #E5E5E5'
                  }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1A1A1A' }}>
                      振込について
                    </h3>
                    <div style={{ fontSize: '13px', color: '#6B6B6B', lineHeight: '1.7' }}>
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
                <div>
                  {monthlyEarnings.length === 0 ? (
                    <div style={{ 
                      padding: '60px 20px', 
                      textAlign: 'center',
                      backgroundColor: '#FAFAFA',
                      borderRadius: '12px',
                      border: '1px solid #E5E5E5'
                    }}>
                      <p style={{ fontSize: '14px', color: '#9B9B9B', marginBottom: '24px' }}>
                        完了した仕事はまだありません
                      </p>
                      <Link 
                        href="/requests"
                        style={{
                          padding: '12px 24px',
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#FFFFFF',
                          backgroundColor: '#1A1A1A',
                          border: 'none',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          display: 'inline-block'
                        }}
                      >
                        依頼を探す
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {monthlyEarnings.map((monthData) => {
                        const isExpanded = expandedMonths.has(monthData.month)

                        return (
                          <div
                            key={monthData.month}
                            onClick={() => toggleMonth(monthData.month)}
                            style={{
                              padding: '20px',
                              backgroundColor: '#FAFAFA',
                              borderRadius: '12px',
                              border: '1px solid #E5E5E5',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? '16px' : '0' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '4px' }}>
                                  {isExpanded ? '▼' : '▶'} {formatMonth(monthData.month)}分
                                </div>
                                <div style={{ fontSize: '13px', color: '#6B6B6B' }}>
                                  {monthData.paid ? (
                                    <span style={{ color: '#1A1A1A' }}>振込済み</span>
                                  ) : monthData.total_amount < 1000 ? (
                                    <span style={{ color: '#9B9B9B' }}>繰越中（最低振込額未満）</span>
                                  ) : monthData.month < currentYearMonth ? (
                                    <span style={{ color: '#1A1A1A' }}>申請可能</span>
                                  ) : (
                                    <span style={{ color: '#9B9B9B' }}>当月（申請不可）</span>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                                <div style={{ fontSize: '20px', fontWeight: '600', color: '#1A1A1A' }}>
                                  {monthData.total_amount.toLocaleString()}円
                                </div>
                                {monthData.total_amount >= 1000 && (
                                  <>
                                    <div style={{ fontSize: '11px', color: '#9B9B9B' }}>
                                      振込手数料: -330円
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginTop: '2px' }}>
                                      振込額: {monthData.final_amount.toLocaleString()}円
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div style={{ 
                                padding: '12px', 
                                backgroundColor: '#FFFFFF', 
                                borderRadius: '8px',
                                marginTop: '12px'
                              }}>
                                {monthData.works.map((work, index) => (
                                  <Link
                                    key={work.id}
                                    href={`/requests/${work.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      display: 'block',
                                      padding: '12px',
                                      backgroundColor: '#FAFAFA',
                                      borderRadius: '6px',
                                      textDecoration: 'none',
                                      marginBottom: index < monthData.works.length - 1 ? '8px' : '0',
                                      transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A', marginBottom: '4px' }}>
                                          {work.title}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#9B9B9B' }}>
                                          完了日: {formatDate(work.completed_at)}
                                        </div>
                                      </div>
                                      <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A' }}>
                                          {Math.floor(work.final_price * 0.88).toLocaleString()}円
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#9B9B9B' }}>
                                          依頼額: {work.final_price.toLocaleString()}円
                                        </div>
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
                <div style={{ 
                  padding: '60px 20px', 
                  textAlign: 'center',
                  backgroundColor: '#FAFAFA',
                  borderRadius: '12px',
                  border: '1px solid #E5E5E5'
                }}>
                  <div style={{ fontSize: '14px', color: '#9B9B9B' }}>
                    振込履歴はまだありません
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}