'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import LoadingScreen from '../components/LoadingScreen'

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
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarnings[]>([])
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [showBankForm, setShowBankForm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  
  // フォーム
  const [bankName, setBankName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [accountType, setAccountType] = useState<'savings' | 'checking'>('savings')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  
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
      router.push(`/login?redirect=${encodeURIComponent('/earnings')}`)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentProfileId(profile.id)
    }
    
    setLoading(false)
  }

  async function loadMonthlyEarnings() {
    // 自分が採用されて完了した依頼を取得
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

    // 完了した依頼を取得
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

    // 支払い情報を取得
    const worksWithPayment = await Promise.all(
      (requests || []).map(async (work) => {
        const { data: requester } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', work.requester_id)
          .single()

        // 支払い記録を取得
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

    // 月別にグループ化
    const groupedByMonth = worksWithPayment.reduce((acc: any, work) => {
      const completedDate = new Date(work.completed_at)
      const monthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`
      
      if (!acc[monthKey]) {
        acc[monthKey] = []
      }
      acc[monthKey].push(work)
      return acc
    }, {})

    // 月別売上を計算
    const monthlyData = Object.entries(groupedByMonth).map(([month, works]: [string, any]) => {
      const totalAmount = works.reduce((sum: number, work: any) => 
        sum + Math.floor(work.final_price * 0.88), 0
      )
      
      const transferFee = 330
      const finalAmount = totalAmount >= 1000 ? totalAmount - transferFee : 0
      
      // 振込日を計算（翌月20日）
      const [year, monthNum] = month.split('-').map(Number)
      const transferDate = new Date(year, monthNum, 20) // 翌月20日
      const today = new Date()
      const transferAvailable = today >= transferDate && totalAmount >= 1000
      
      const paid = works.every((work: any) => work.paid)

      return {
        month,
        works,
        total_amount: totalAmount,
        transfer_fee: totalAmount >= 1000 ? transferFee : 0,
        final_amount: finalAmount,
        transfer_date: `${year}年${monthNum + 1}月20日`,
        transfer_available: transferAvailable,
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
      setBankName(data.bank_name)
      setBranchName(data.branch_name)
      setAccountType(data.account_type)
      setAccountNumber(data.account_number)
      setAccountHolderName(data.account_holder_name)
    }
  }

  async function handleSaveBankAccount() {
    if (!bankName.trim() || !branchName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
      alert('すべての項目を入力してください')
      return
    }

    setProcessing(true)

    const bankData = {
      profile_id: currentProfileId,
      bank_name: bankName.trim(),
      branch_name: branchName.trim(),
      account_type: accountType,
      account_number: accountNumber.trim(),
      account_holder_name: accountHolderName.trim()
    }

    if (bankAccount) {
      // 更新
      const { error } = await supabase
        .from('bank_accounts')
        .update({
          ...bankData,
          updated_at: new Date().toISOString()
        })
        .eq('id', bankAccount.id)

      if (error) {
        console.error('口座情報更新エラー:', error)
        alert('口座情報の更新に失敗しました')
      } else {
        alert('口座情報を更新しました')
        loadBankAccount()
        setShowBankForm(false)
      }
    } else {
      // 新規登録
      const { error } = await supabase
        .from('bank_accounts')
        .insert(bankData)

      if (error) {
        console.error('口座情報登録エラー:', error)
        alert('口座情報の登録に失敗しました')
      } else {
        alert('口座情報を登録しました')
        loadBankAccount()
        setShowBankForm(false)
      }
    }

    setProcessing(false)
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

  function getAccountTypeLabel(type: string) {
    return type === 'savings' ? '普通' : '当座'
  }

  // 統計計算
  const totalEarnings = monthlyEarnings.reduce((sum, m) => sum + m.total_amount, 0)
  const pendingEarnings = monthlyEarnings.filter(m => !m.paid).reduce((sum, m) => sum + m.final_amount, 0)
  const totalWorks = monthlyEarnings.reduce((sum, m) => sum + m.works.length, 0)

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow" style={{ padding: '40px 20px' }}>
          <h1 className="section-title mb-32">売上管理</h1>

          {/* サマリー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>
                {totalEarnings.toLocaleString()}円
              </div>
              <div className="text-small text-gray">総売上（手数料差引後）</div>
            </div>
            <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>
                {pendingEarnings.toLocaleString()}円
              </div>
              <div className="text-small text-gray">振込待ち（振込手数料差引後）</div>
            </div>
            <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>
                {totalWorks}件
              </div>
              <div className="text-small text-gray">完了した仕事</div>
            </div>
          </div>

          {/* 重要なお知らせ */}
          <div style={{ padding: '16px', backgroundColor: '#F0F8FF', borderRadius: '8px', marginBottom: '32px', border: '1px solid #B0D4F1' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1A1A1A' }}>
              振込について
            </div>
            <div style={{ fontSize: '13px', color: '#4A4A4A', lineHeight: '1.6' }}>
              • 月末締め、翌月20日払い<br />
              • 振込手数料: 330円（クリエイター負担）<br />
              • 最低振込額: 1,000円（未満の場合は翌月に繰越）
            </div>
          </div>

          {/* 振込先情報 */}
          <div className="card-no-hover p-24 mb-32">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="card-title">振込先口座</h2>
              {!showBankForm && (
                <button
                  onClick={() => setShowBankForm(true)}
                  className="btn-secondary"
                >
                  {bankAccount ? '編集' : '登録'}
                </button>
              )}
            </div>

            {showBankForm ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">銀行名</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="例: 三菱UFJ銀行"
                  />
                </div>

                <div>
                  <label className="form-label">支店名</label>
                  <input
                    type="text"
                    className="form-input"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="例: 新宿支店"
                  />
                </div>

                <div>
                  <label className="form-label">口座種別</label>
                  <select
                    className="form-input"
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as 'savings' | 'checking')}
                  >
                    <option value="savings">普通</option>
                    <option value="checking">当座</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">口座番号</label>
                  <input
                    type="text"
                    className="form-input"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="例: 1234567"
                  />
                </div>

                <div>
                  <label className="form-label">口座名義</label>
                  <input
                    type="text"
                    className="form-input"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="例: ヤマダ タロウ"
                  />
                  <div className="text-small text-gray" style={{ marginTop: '4px' }}>
                    ※カタカナで入力してください
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleSaveBankAccount}
                    className="btn-primary"
                    disabled={processing}
                    style={{ flex: 1 }}
                  >
                    {processing ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={() => {
                      setShowBankForm(false)
                      if (bankAccount) {
                        setBankName(bankAccount.bank_name)
                        setBranchName(bankAccount.branch_name)
                        setAccountType(bankAccount.account_type as 'savings' | 'checking')
                        setAccountNumber(bankAccount.account_number)
                        setAccountHolderName(bankAccount.account_holder_name)
                      }
                    }}
                    className="btn-secondary"
                    disabled={processing}
                    style={{ flex: 1 }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : bankAccount ? (
              <div className="info-box">
                <div className="info-row">
                  <span className="text-gray">銀行名</span>
                  <span className="text-small" style={{ color: '#1A1A1A', fontWeight: '600' }}>
                    {bankAccount.bank_name}
                  </span>
                </div>
                <div className="info-row">
                  <span className="text-gray">支店名</span>
                  <span className="text-small" style={{ color: '#1A1A1A', fontWeight: '600' }}>
                    {bankAccount.branch_name}
                  </span>
                </div>
                <div className="info-row">
                  <span className="text-gray">口座種別</span>
                  <span className="text-small" style={{ color: '#1A1A1A', fontWeight: '600' }}>
                    {getAccountTypeLabel(bankAccount.account_type)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="text-gray">口座番号</span>
                  <span className="text-small" style={{ color: '#1A1A1A', fontWeight: '600' }}>
                    {bankAccount.account_number}
                  </span>
                </div>
                <div className="info-row">
                  <span className="text-gray">口座名義</span>
                  <span className="text-small" style={{ color: '#1A1A1A', fontWeight: '600' }}>
                    {bankAccount.account_holder_name}
                  </span>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p className="text-small text-gray">
                  振込先口座が登録されていません
                </p>
              </div>
            )}
          </div>

          {/* 月別売上 */}
          <div className="card-no-hover p-24">
            <h2 className="card-title mb-24">月別売上</h2>

            {monthlyEarnings.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p className="text-small text-gray mb-24">
                  完了した仕事はまだありません
                </p>
                <Link href="/requests" className="btn-primary">
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
                      className="card-hover p-20"
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleMonth(monthData.month)}
                    >
                      {/* 月ヘッダー */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? '16px' : '0' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '4px' }}>
                            {isExpanded ? '▼' : '▶'} {formatMonth(monthData.month)}分
                          </div>
                          <div style={{ fontSize: '13px', color: '#6B6B6B' }}>
                            {monthData.paid ? (
                              <span style={{ color: '#4CAF50' }}>✓ 振込済み</span>
                            ) : monthData.total_amount < 1000 ? (
                              <span style={{ color: '#FF9800' }}>繰越中（最低振込額未満）</span>
                            ) : monthData.transfer_available ? (
                              <span style={{ color: '#2196F3' }}>振込可能</span>
                            ) : (
                              <span>振込予定日: {monthData.transfer_date}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                          <div style={{ fontSize: '20px', fontWeight: '600', color: '#1A1A1A' }}>
                            {monthData.total_amount.toLocaleString()}円
                          </div>
                          {monthData.total_amount >= 1000 && (
                            <>
                              <div style={{ fontSize: '11px', color: '#6B6B6B' }}>
                                振込手数料: -330円
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginTop: '2px' }}>
                                振込額: {monthData.final_amount.toLocaleString()}円
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 依頼一覧（展開時） */}
                      {isExpanded && (
                        <div style={{ 
                          padding: '12px', 
                          backgroundColor: '#F9F9F9', 
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
                                backgroundColor: '#FFFFFF',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                marginBottom: index < monthData.works.length - 1 ? '8px' : '0'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A', marginBottom: '4px' }}>
                                    {work.title}
                                  </div>
                                  <div className="text-small text-gray">
                                    完了日: {formatDate(work.completed_at)}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A' }}>
                                    {Math.floor(work.final_price * 0.88).toLocaleString()}円
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#6B6B6B' }}>
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
        </div>
      </div>
      <Footer />
    </>
  )
}