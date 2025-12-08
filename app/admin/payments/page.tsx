'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingScreen from '../../components/LoadingScreen'

type PaymentRequest = {
  work_request_id: string
  title: string
  amount: number
  original_amount?: number
  completed_at: string
  payment_id: string | null
  payment_status: string
}

type GroupedPayment = {
  creator_id: string
  creator_name: string
  bank_account: {
    bank_name: string
    branch_name: string
    account_type: string
    account_number: string
    account_holder_name: string
  } | null
  requests: PaymentRequest[]
}

type MonthlyGroup = {
  month: string
  groups: GroupedPayment[]
  total_amount: number
  transfer_available: boolean
}

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pendingPayments, setPendingPayments] = useState<MonthlyGroup[]>([])
  const [paidPayments, setPaidPayments] = useState<MonthlyGroup[]>([])
  const [tab, setTab] = useState<'pending' | 'paid'>('pending')
  const [processing, setProcessing] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/admin/payments'))
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()
    
    if (!profile?.is_admin) {
      alert('管理者権限がありません')
      router.push('/')
      return
    }

    setIsAdmin(true)
    await loadPayments()
    setLoading(false)
  }

  async function loadPayments() {
    try {
      // 完了した依頼を取得
      const { data: completedRequests } = await supabase
        .from('work_requests')
        .select('id, title, final_price, completed_at, selected_applicant_id')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (!completedRequests) return

      // 支払い情報を取得
      const paymentsData = await Promise.all(
        completedRequests.map(async (req) => {
          // クリエイター情報
          const { data: creator } = await supabase
            .from('profiles')
            .select('id, display_name')
            .eq('id', req.selected_applicant_id)
            .single()

          // 銀行口座情報
          const { data: bankAccount } = await supabase
            .from('bank_accounts')
            .select('*')
            .eq('profile_id', req.selected_applicant_id)
            .single()

          // 支払い記録
          const { data: payment } = await supabase
            .from('payments')
            .select('id, status, paid_at')
            .eq('work_request_id', req.id)
            .single()

          const finalPrice = req.final_price || 0
          
          // 完了月を計算（YYYY-MM形式）
          const completedDate = new Date(req.completed_at || '')
          const completedMonth = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`

          return {
            work_request_id: req.id,
            title: req.title,
            amount: Math.floor(finalPrice * 0.88),
            original_amount: finalPrice > 0 ? finalPrice : undefined,
            completed_at: req.completed_at || '',
            completed_month: completedMonth,
            creator_id: req.selected_applicant_id || '',
            creator_name: creator?.display_name || '名前未設定',
            bank_account: bankAccount,
            payment_id: payment?.id || null,
            payment_status: payment?.status || 'pending'
          }
        })
      )

      // 月とステータスでグループ化
      const groupedByMonthAndStatus = paymentsData.reduce((acc: any, payment) => {
        const key = `${payment.completed_month}_${payment.payment_status}`
        if (!acc[key]) {
          acc[key] = {
            month: payment.completed_month,
            status: payment.payment_status,
            payments: []
          }
        }
        acc[key].payments.push(payment)
        return acc
      }, {})

      // 各月のクリエイターごとにグループ化
      const monthlyGroups = Object.values(groupedByMonthAndStatus).map((monthData: any) => {
        // クリエイターごとにグループ化
        const creatorGroups = monthData.payments.reduce((acc: any, payment: any) => {
          const creatorId = payment.creator_id
          if (!acc[creatorId]) {
            acc[creatorId] = {
              creator_id: creatorId,
              creator_name: payment.creator_name,
              bank_account: payment.bank_account,
              requests: []
            }
          }
          acc[creatorId].requests.push(payment)
          return acc
        }, {})

        const groups = Object.values(creatorGroups) as GroupedPayment[]
        const totalAmount = groups.reduce((sum, group) => 
          sum + group.requests.reduce((s, req: any) => s + req.amount, 0), 0
        )

        // 振込可能日を計算（翌月20日）
        const [year, month] = monthData.month.split('-').map(Number)
        const transferDate = new Date(year, month, 20) // 翌月20日
        const today = new Date()
        const transferAvailable = today >= transferDate

        return {
          month: monthData.month,
          groups: groups,
          total_amount: totalAmount,
          transfer_available: transferAvailable,
          status: monthData.status
        }
      })

      const pending = monthlyGroups
        .filter((m: any) => m.status === 'pending')
        .sort((a, b) => b.month.localeCompare(a.month))
      
      const paid = monthlyGroups
        .filter((m: any) => m.status === 'paid')
        .sort((a, b) => b.month.localeCompare(a.month))

      setPendingPayments(pending as any)
      setPaidPayments(paid as any)
    } catch (error) {
      console.error('支払い情報取得エラー:', error)
    }
  }

  async function markGroupAsPaid(group: GroupedPayment, month: string) {
    const totalAmount = group.requests.reduce((sum, req) => sum + req.amount, 0)
    const transferFee = 330
    const finalAmount = totalAmount - transferFee
    const requestCount = group.requests.length

    // 最低振込額チェック
    if (totalAmount < 1000) {
      alert(`振込額が1,000円未満です。\n現在の売上: ${totalAmount.toLocaleString()}円\n\n1,000円以上になるまで翌月に繰り越されます。`)
      return
    }

    if (!confirm(`${group.creator_name}さんの${requestCount}件の依頼を振込済みにしますか？\n\n売上合計: ${totalAmount.toLocaleString()}円\n振込手数料: ${transferFee.toLocaleString()}円\n実振込額: ${finalAmount.toLocaleString()}円`)) return

    setProcessing(true)

    try {
      for (const request of group.requests) {
        const completedMonth = month

        if (request.payment_id) {
          // 既存のレコードを更新
          const { error } = await supabase
            .from('payments')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              transfer_fee: transferFee,
              completed_month: completedMonth,
              updated_at: new Date().toISOString()
            })
            .eq('id', request.payment_id)

          if (error) throw error
        } else {
          // 新規レコード作成
          const { error } = await supabase
            .from('payments')
            .insert({
              work_request_id: request.work_request_id,
              creator_id: group.creator_id,
              amount: request.amount,
              status: 'paid',
              transfer_fee: transferFee,
              completed_month: completedMonth,
              paid_at: new Date().toISOString()
            })

          if (error) throw error
        }
      }

      alert(`${requestCount}件の依頼を振込済みにマークしました`)
      await loadPayments()
    } catch (error) {
      console.error('支払い更新エラー:', error)
      alert('支払い情報の更新に失敗しました')
    }

    setProcessing(false)
  }

  function toggleGroup(creatorId: string) {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(creatorId)) {
      newExpanded.delete(creatorId)
    } else {
      newExpanded.add(creatorId)
    }
    setExpandedGroups(newExpanded)
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

  function formatMonth(monthStr: string) {
    const [year, month] = monthStr.split('-')
    return `${year}年${parseInt(month)}月`
  }

  function getTransferDate(monthStr: string) {
    const [year, month] = monthStr.split('-').map(Number)
    return `${year}年${month + 1}月20日`
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  function getAccountTypeLabel(type: string) {
    return type === 'savings' ? '普通' : '当座'
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (!isAdmin) {
    return null
  }

  const displayPayments = tab === 'pending' ? pendingPayments : paidPayments
  
  const pendingCount = pendingPayments.reduce((sum, month) => 
    sum + month.groups.reduce((s, group) => s + group.requests.length, 0), 0
  )
  const paidCount = paidPayments.reduce((sum, month) => 
    sum + month.groups.reduce((s, group) => s + group.requests.length, 0), 0
  )

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow" style={{ padding: '40px 20px' }}>
          <h1 className="section-title mb-32">振込管理</h1>

          {/* ナビゲーション */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <Link href="/admin" className="btn-secondary">
              ダッシュボード
            </Link>
            <Link href="/admin/payments" className="btn-primary">
              振込管理
            </Link>
            <Link href="/admin/users" className="btn-secondary">
              ユーザー管理
            </Link>
          </div>

          {/* タブ */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #E5E5E5' }}>
            <button
              onClick={() => setTab('pending')}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${tab === 'pending' ? '#1A1A1A' : 'transparent'}`,
                color: tab === 'pending' ? '#1A1A1A' : '#6B6B6B',
                fontWeight: tab === 'pending' ? '600' : '400',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              未払い ({pendingCount})
            </button>
            <button
              onClick={() => setTab('paid')}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${tab === 'paid' ? '#1A1A1A' : 'transparent'}`,
                color: tab === 'paid' ? '#1A1A1A' : '#6B6B6B',
                fontWeight: tab === 'paid' ? '600' : '400',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              振込済み ({paidCount})
            </button>
          </div>

          {/* 月別支払い一覧 */}
          {displayPayments.length === 0 ? (
            <div className="empty-state">
              <p className="text-gray">
                {tab === 'pending' ? '未払いの依頼はありません' : '振込済みの依頼はありません'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {displayPayments.map((monthlyGroup) => {
                const isMonthExpanded = expandedMonths.has(monthlyGroup.month)
                const transferFee = 330
                const finalAmount = monthlyGroup.total_amount - (monthlyGroup.groups.length * transferFee)

                return (
                  <div
                    key={monthlyGroup.month}
                    className="card-no-hover p-24"
                  >
                    {/* 月ヘッダー */}
                    <div 
                      onClick={() => toggleMonth(monthlyGroup.month)}
                      style={{ cursor: 'pointer', marginBottom: '16px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '20px', fontWeight: '600', color: '#1A1A1A', marginBottom: '4px' }}>
                            {isMonthExpanded ? '▼' : '▶'} {formatMonth(monthlyGroup.month)}分
                          </div>
                          <div style={{ fontSize: '13px', color: '#6B6B6B' }}>
                            振込予定日: {getTransferDate(monthlyGroup.month)}
                            {!monthlyGroup.transfer_available && tab === 'pending' && (
                              <span style={{ marginLeft: '8px', color: '#FF4444' }}>（振込日前）</span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '24px', fontWeight: '600', color: '#1A1A1A' }}>
                            {monthlyGroup.total_amount.toLocaleString()}円
                          </div>
                          {tab === 'pending' && (
                            <div style={{ fontSize: '12px', color: '#6B6B6B' }}>
                              手数料差引後: {finalAmount.toLocaleString()}円
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* クリエイター一覧（展開時） */}
                    {isMonthExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {monthlyGroup.groups.map((group) => {
                          const totalAmount = group.requests.reduce((sum, req) => sum + req.amount, 0)
                          const totalOriginalAmount = group.requests.reduce((sum, req) => sum + (req.original_amount || 0), 0)
                          const isExpanded = expandedGroups.has(group.creator_id)
                          const canTransfer = tab === 'pending' && monthlyGroup.transfer_available && totalAmount >= 1000

                          return (
                            <div
                              key={group.creator_id}
                              style={{
                                padding: '16px',
                                backgroundColor: '#F9F9F9',
                                borderRadius: '8px'
                              }}
                            >
                              {/* クリエイター情報 */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '4px' }}>
                                    {group.creator_name}
                                  </div>
                                  <div style={{ fontSize: '13px', color: '#6B6B6B' }}>
                                    {tab === 'pending' ? '未払い依頼' : '振込済み依頼'}: {group.requests.length}件
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#1A1A1A' }}>
                                    {totalAmount.toLocaleString()}円
                                  </div>
                                  {totalOriginalAmount > 0 && (
                                    <>
                                      <div style={{ fontSize: '11px', color: '#6B6B6B' }}>
                                        依頼額計: {totalOriginalAmount.toLocaleString()}円
                                      </div>
                                      <div style={{ fontSize: '11px', color: '#6B6B6B' }}>
                                        手数料: -{Math.floor(totalOriginalAmount * 0.12).toLocaleString()}円
                                      </div>
                                    </>
                                  )}
                                  {tab === 'pending' && (
                                    <div style={{ fontSize: '11px', color: '#6B6B6B', marginTop: '4px' }}>
                                      振込手数料: -330円
                                    </div>
                                  )}
                                  {tab === 'pending' && (
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #E5E5E5' }}>
                                      実振込額: {(totalAmount - 330).toLocaleString()}円
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 口座情報 */}
                              {group.bank_account ? (
                                <div className="info-box mb-12" style={{ fontSize: '12px' }}>
                                  <div className="info-row">
                                    <span className="text-gray">銀行</span>
                                    <span className="text-small">{group.bank_account.bank_name} {group.bank_account.branch_name}</span>
                                  </div>
                                  <div className="info-row">
                                    <span className="text-gray">口座</span>
                                    <span className="text-small">{getAccountTypeLabel(group.bank_account.account_type)} {group.bank_account.account_number}</span>
                                  </div>
                                  <div className="info-row">
                                    <span className="text-gray">名義</span>
                                    <span className="text-small">{group.bank_account.account_holder_name}</span>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ 
                                  padding: '8px 12px', 
                                  backgroundColor: '#FFF3CD', 
                                  borderRadius: '4px',
                                  marginBottom: '12px',
                                  fontSize: '12px'
                                }}>
                                  <span style={{ color: '#856404' }}>
                                    振込先口座が登録されていません
                                  </span>
                                </div>
                              )}

                              {/* 最低振込額未満の警告 */}
                              {tab === 'pending' && totalAmount < 1000 && (
                                <div style={{ 
                                  padding: '8px 12px', 
                                  backgroundColor: '#FFF3CD', 
                                  borderRadius: '4px',
                                  marginBottom: '12px',
                                  fontSize: '12px'
                                }}>
                                  <span style={{ color: '#856404' }}>
                                    最低振込額（1,000円）未満のため、翌月に繰り越されます
                                  </span>
                                </div>
                              )}

                              {/* 依頼一覧展開ボタン */}
                              <button
                                onClick={() => toggleGroup(group.creator_id)}
                                style={{
                                  width: '100%',
                                  padding: '6px',
                                  backgroundColor: 'transparent',
                                  border: '1px solid #E5E5E5',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  color: '#6B6B6B',
                                  marginBottom: '12px'
                                }}
                              >
                                {isExpanded ? '▼ 依頼一覧を閉じる' : '▶ 依頼一覧を表示'}
                              </button>

                              {/* 依頼一覧 */}
                              {isExpanded && (
                                <div style={{ 
                                  marginBottom: '12px', 
                                  padding: '8px', 
                                  backgroundColor: '#FFFFFF', 
                                  borderRadius: '4px' 
                                }}>
                                  {group.requests.map((request, reqIndex) => (
                                    <div
                                      key={request.work_request_id}
                                      style={{
                                        padding: '8px 0',
                                        borderBottom: reqIndex < group.requests.length - 1 ? '1px solid #E5E5E5' : 'none'
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Link
                                          href={`/requests/${request.work_request_id}`}
                                          style={{ 
                                            fontSize: '13px', 
                                            fontWeight: '500', 
                                            color: '#1A1A1A',
                                            textDecoration: 'none',
                                            flex: 1
                                          }}
                                        >
                                          {request.title}
                                        </Link>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginLeft: '12px' }}>
                                          {request.amount.toLocaleString()}円
                                        </div>
                                      </div>
                                      <div className="text-small text-gray" style={{ marginTop: '2px', fontSize: '11px' }}>
                                        完了日: {formatDate(request.completed_at)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* 振込済みボタン */}
                              {canTransfer && group.bank_account && (
                                <button
                                  onClick={() => markGroupAsPaid(group, monthlyGroup.month)}
                                  className="btn-primary"
                                  disabled={processing}
                                  style={{ width: '100%', fontSize: '14px', padding: '10px' }}
                                >
                                  {processing ? '処理中...' : '振込済みにする'}
                                </button>
                              )}

                              {/* 振込日前の注意 */}
                              {tab === 'pending' && !monthlyGroup.transfer_available && (
                                <div style={{ 
                                  padding: '8px 12px', 
                                  backgroundColor: '#F0F0F0', 
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  color: '#6B6B6B',
                                  textAlign: 'center'
                                }}>
                                  {getTransferDate(monthlyGroup.month)}以降に振込可能になります
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}