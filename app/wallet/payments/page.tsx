'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import DashboardSidebar from '../../components/DashboardSidebar'

type PaidRequest = {
  id: string
  title: string
  final_price: number
  paid_at: string
  status: string
  category: string
  selected_applicant_id: string | null
  creator: {
    display_name: string | null
    avatar_url: string | null
  }
}

type MonthlyPayment = {
  month: string
  requests: PaidRequest[]
  total_amount: number
}

type ReceiptEditData = {
  requestId: string
  addressee: string
  purpose: string
  isFirstTime: boolean
}

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [accountType, setAccountType] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [paidRequests, setPaidRequests] = useState<PaidRequest[]>([])
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([])
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'history'>('overview')
  
  // 領収書編集モーダル
  const [showEditModal, setShowEditModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<ReceiptEditData | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      loadPaidRequests()
    }
  }, [currentProfileId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent('/wallet/payments')}`)
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

  async function loadPaidRequests() {
    const { data: requests, error } = await supabase
      .from('work_requests')
      .select('id, title, final_price, paid_at, status, category, selected_applicant_id')
      .eq('requester_id', currentProfileId)
      .not('paid_at', 'is', null)
      .order('paid_at', { ascending: false })

    if (error) {
      console.error('支払い履歴取得エラー:', error)
      return
    }

    const requestsWithCreator = await Promise.all(
      (requests || []).map(async (request) => {
        if (!request.selected_applicant_id) {
          return {
            ...request,
            creator: { display_name: null, avatar_url: null }
          }
        }

        const { data: creator } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', request.selected_applicant_id)
          .single()

        return {
          ...request,
          creator: creator || { display_name: null, avatar_url: null }
        }
      })
    )

    setPaidRequests(requestsWithCreator)

    // 月別にグループ化
    const groupedByMonth = requestsWithCreator.reduce((acc: any, request) => {
      const paidDate = new Date(request.paid_at)
      const monthKey = `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, '0')}`
      
      if (!acc[monthKey]) {
        acc[monthKey] = []
      }
      acc[monthKey].push(request)
      return acc
    }, {})

    const monthlyData = Object.entries(groupedByMonth).map(([month, requests]: [string, any]) => {
      const totalAmount = requests.reduce((sum: number, req: any) => sum + (req.final_price || 0), 0)
      
      return {
        month,
        requests,
        total_amount: totalAmount
      }
    }).sort((a, b) => b.month.localeCompare(a.month))

    setMonthlyPayments(monthlyData)
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  function formatMonth(monthStr: string) {
    const [year, month] = monthStr.split('-')
    return `${year}年${parseInt(month)}月`
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

  async function openReceiptEditor(request: PaidRequest) {
    // 既存の領収書メタデータをチェック
    const { data: existingMetadata } = await supabase
      .from('receipt_metadata')
      .select('*')
      .eq('request_id', request.id)
      .single()

    if (existingMetadata) {
      // 既に生成済み - DBの内容を使用（編集不可）
      setEditingReceipt({
        requestId: request.id,
        addressee: existingMetadata.addressee,
        purpose: existingMetadata.purpose,
        isFirstTime: false
      })
    } else {
      // 初回生成 - デフォルト値を設定（編集可能）
      const { data: requesterBusiness } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('profile_id', currentProfileId)
        .single()

      let defaultAddressee = ''
      if (requesterBusiness) {
        if (requesterBusiness.company_name) {
          defaultAddressee = `${requesterBusiness.company_name}\n${requesterBusiness.last_name} ${requesterBusiness.first_name} 様`
        } else {
          defaultAddressee = `${requesterBusiness.last_name} ${requesterBusiness.first_name} 様`
        }
      }

      setEditingReceipt({
        requestId: request.id,
        addressee: defaultAddressee,
        purpose: request.title,
        isFirstTime: true
      })
    }
    
    setShowEditModal(true)
  }

  async function openConfirmModal() {
    if (!editingReceipt) return
    
    // 再発行の場合は確認不要
    if (!editingReceipt.isFirstTime) {
      await generateReceipt()
      return
    }
    
    // 入力チェック
    if (!editingReceipt.addressee.trim()) {
      alert('宛名を入力してください')
      return
    }
    
    if (!editingReceipt.purpose.trim()) {
      alert('但し書きを入力してください')
      return
    }
    
    setShowConfirmModal(true)
  }

  async function generateReceipt() {
    if (!editingReceipt) return

    try {
      setGeneratingPdf(true)
      
      const request = paidRequests.find(r => r.id === editingReceipt.requestId)
      if (!request || !request.selected_applicant_id) {
        alert('クリエイター情報が見つかりません')
        return
      }

      // 初回生成の場合、メタデータをDBに保存
      if (editingReceipt.isFirstTime) {
        const { error: saveError } = await supabase
          .from('receipt_metadata')
          .insert({
            request_id: editingReceipt.requestId,
            addressee: editingReceipt.addressee,
            purpose: editingReceipt.purpose
          })

        if (saveError) {
          console.error('領収書メタデータ保存エラー:', saveError)
          alert('領収書メタデータの保存に失敗しました')
          return
        }
      }

      const response = await fetch('/api/generate-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: editingReceipt.requestId,
          title: editingReceipt.purpose,
          addressee: editingReceipt.addressee,
          amount: request.final_price, // システムの金額のみ使用
          paidAt: request.paid_at,
          requesterId: currentProfileId,
          creatorId: request.selected_applicant_id
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        
        let userMessage = '領収書の生成に失敗しました。\n\n'
        
        if (errorData.error === 'Incomplete requester business profile') {
          userMessage += 'あなたのビジネス情報が不完全です。\n'
          userMessage += '/settings で以下の項目を入力してください：\n\n'
          if (errorData.missing) {
            if (errorData.missing.last_name) userMessage += '・苗字\n'
            if (errorData.missing.first_name) userMessage += '・名前\n'
            if (errorData.missing.postal_code) userMessage += '・郵便番号\n'
            if (errorData.missing.prefecture) userMessage += '・都道府県\n'
            if (errorData.missing.address1) userMessage += '・住所\n'
            if (errorData.missing.phone) userMessage += '・電話番号\n'
          }
        } else if (errorData.error === 'Incomplete creator business profile') {
          userMessage += 'クリエイターのビジネス情報が不完全です。\n'
          userMessage += 'クリエイターに/settingsでビジネス情報の登録を依頼してください。'
        } else if (errorData.error === 'Requester business profile not found') {
          userMessage += 'あなたのビジネス情報が見つかりません。\n'
          userMessage += '/settings でビジネス情報を登録してください。'
        } else if (errorData.error === 'Creator business profile not found') {
          userMessage += 'クリエイターのビジネス情報が見つかりません。\n'
          userMessage += 'クリエイターに/settingsでビジネス情報の登録を依頼してください。'
        } else {
          userMessage += `エラー: ${errorData.error}\n`
          if (errorData.details) {
            userMessage += `詳細: ${errorData.details}`
          }
        }
        
        alert(userMessage)
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `領収書_${editingReceipt.purpose}_${formatDate(request.paid_at)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      setShowEditModal(false)
      setShowConfirmModal(false)
      setEditingReceipt(null)
    } catch (error) {
      console.error('領収書生成エラー:', error)
      alert('領収書の生成に失敗しました')
    } finally {
      setGeneratingPdf(false)
    }
  }

  function getCategoryLabel(category: string) {
    const categories: { [key: string]: string } = {
      illustration: 'イラスト',
      manga: 'マンガ',
      novel: '小説',
      music: '音楽',
      voice: 'ボイス',
      video: '動画',
      logo: 'ロゴ',
      design: 'デザイン',
      other: 'その他'
    }
    return categories[category] || category
  }

  function getStatusLabel(status: string) {
    const statuses: { [key: string]: string } = {
      paid: '作業中',
      delivered: '納品済み',
      completed: '完了',
      cancelled: 'キャンセル'
    }
    return statuses[status] || status
  }

  function getStatusColor(status: string) {
    const colors: { [key: string]: string } = {
      paid: '#6B6B6B',
      delivered: '#9E9E9E',
      completed: '#1A1A1A',
      cancelled: '#CCCCCC'
    }
    return colors[status] || '#9E9E9E'
  }

  const totalPaid = paidRequests.reduce((sum, r) => sum + (r.final_price || 0), 0)
  const thisMonthPaid = paidRequests
    .filter(r => {
      const paidDate = new Date(r.paid_at)
      const now = new Date()
      return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear()
    })
    .reduce((sum, r) => sum + (r.final_price || 0), 0)
  const activeRequests = paidRequests.filter(r => ['paid', 'delivered'].includes(r.status)).length

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
                支払い管理
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
                  月別支払い
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
                  支払い履歴
                </button>
              </div>

              {/* 概要タブ */}
              {activeTab === 'overview' && (
                <>
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
                        {totalPaid.toLocaleString()}円
                      </div>
                      <div style={{ fontSize: '13px', color: '#9B9B9B' }}>総支払額</div>
                    </div>
                    <div style={{ 
                      padding: '24px', 
                      backgroundColor: '#FAFAFA', 
                      borderRadius: '12px', 
                      border: '1px solid #E5E5E5',
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px', color: '#1A1A1A' }}>
                        {thisMonthPaid.toLocaleString()}円
                      </div>
                      <div style={{ fontSize: '13px', color: '#9B9B9B' }}>今月の支払額</div>
                    </div>
                    <div style={{ 
                      padding: '24px', 
                      backgroundColor: '#FAFAFA', 
                      borderRadius: '12px', 
                      border: '1px solid #E5E5E5',
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px', color: '#1A1A1A' }}>
                        {activeRequests}件
                      </div>
                      <div style={{ fontSize: '13px', color: '#9B9B9B' }}>進行中の依頼</div>
                    </div>
                  </div>

                  {/* 最近の支払い */}
                  <div style={{ 
                    padding: '24px', 
                    backgroundColor: '#FAFAFA', 
                    borderRadius: '12px',
                    border: '1px solid #E5E5E5'
                  }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>
                      最近の支払い
                    </h2>

                    {paidRequests.length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <p style={{ fontSize: '14px', color: '#9B9B9B' }}>
                          支払い履歴はまだありません
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {paidRequests.slice(0, 5).map((request) => (
                          <Link
                            key={request.id}
                            href={`/requests/${request.id}`}
                            style={{
                              display: 'block',
                              padding: '16px',
                              backgroundColor: '#FFFFFF',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '4px' }}>
                                  {request.title}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: '#E5E5E5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    fontSize: '10px',
                                    color: '#6B6B6B'
                                  }}>
                                    {request.creator.avatar_url ? (
                                      <img 
                                        src={request.creator.avatar_url} 
                                        alt="" 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                      />
                                    ) : (
                                      request.creator.display_name?.charAt(0) || '?'
                                    )}
                                  </div>
                                  <span style={{ fontSize: '13px', color: '#6B6B6B' }}>
                                    {request.creator.display_name || '名前未設定'}
                                  </span>
                                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', backgroundColor: getStatusColor(request.status), color: '#FFFFFF' }}>
                                    {getStatusLabel(request.status)}
                                  </span>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A' }}>
                                  {request.final_price?.toLocaleString()}円
                                </div>
                                <div style={{ fontSize: '12px', color: '#9B9B9B', marginTop: '2px' }}>
                                  {formatDate(request.paid_at)}
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* 月別支払いタブ */}
              {activeTab === 'monthly' && (
                <div>
                  {monthlyPayments.length === 0 ? (
                    <div style={{ 
                      padding: '60px 20px', 
                      textAlign: 'center',
                      backgroundColor: '#FAFAFA',
                      borderRadius: '12px',
                      border: '1px solid #E5E5E5'
                    }}>
                      <p style={{ fontSize: '14px', color: '#9B9B9B', marginBottom: '24px' }}>
                        支払い履歴はまだありません
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {monthlyPayments.map((monthData) => {
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
                                  {isExpanded ? '▼' : '▶'} {formatMonth(monthData.month)}
                                </div>
                                <div style={{ fontSize: '13px', color: '#6B6B6B' }}>
                                  {monthData.requests.length}件の支払い
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                                <div style={{ fontSize: '20px', fontWeight: '600', color: '#1A1A1A' }}>
                                  {monthData.total_amount.toLocaleString()}円
                                </div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div style={{ 
                                padding: '12px', 
                                backgroundColor: '#FFFFFF', 
                                borderRadius: '8px',
                                marginTop: '12px'
                              }}>
                                {monthData.requests.map((request, index) => (
                                  <div
                                    key={request.id}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      padding: '12px',
                                      backgroundColor: '#FAFAFA',
                                      borderRadius: '6px',
                                      marginBottom: index < monthData.requests.length - 1 ? '8px' : '0',
                                      transition: 'background-color 0.2s'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                      <Link
                                        href={`/requests/${request.id}`}
                                        style={{
                                          flex: 1,
                                          textDecoration: 'none'
                                        }}
                                      >
                                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A', marginBottom: '4px' }}>
                                          {request.title}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#9B9B9B' }}>
                                          支払日: {formatDate(request.paid_at)}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                          <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            backgroundColor: '#E5E5E5',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            fontSize: '10px',
                                            color: '#6B6B6B'
                                          }}>
                                            {request.creator.avatar_url ? (
                                              <img 
                                                src={request.creator.avatar_url} 
                                                alt="" 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                              />
                                            ) : (
                                              request.creator.display_name?.charAt(0) || '?'
                                            )}
                                          </div>
                                          <span style={{ fontSize: '12px', color: '#9B9B9B' }}>
                                            {request.creator.display_name || '名前未設定'}
                                          </span>
                                        </div>
                                      </Link>
                                      <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '8px' }}>
                                          {request.final_price?.toLocaleString()}円
                                        </div>
                                        <button
                                          onClick={() => openReceiptEditor(request)}
                                          style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            color: '#1A1A1A',
                                            backgroundColor: '#FFFFFF',
                                            border: '1px solid #D1D1D1',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            whiteSpace: 'nowrap'
                                          }}
                                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9F9F9'}
                                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                                        >
                                          領収書
                                        </button>
                                      </div>
                                    </div>
                                  </div>
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

              {/* 支払い履歴タブ */}
              {activeTab === 'history' && (
                <div>
                  {paidRequests.length === 0 ? (
                    <div style={{ 
                      padding: '60px 20px', 
                      textAlign: 'center',
                      backgroundColor: '#FAFAFA',
                      borderRadius: '12px',
                      border: '1px solid #E5E5E5'
                    }}>
                      <p style={{ fontSize: '14px', color: '#9B9B9B', marginBottom: '24px' }}>
                        支払い履歴はまだありません
                      </p>
                      <Link 
                        href="/requests/create"
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
                        依頼を作成
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {paidRequests.map((request) => (
                        <div
                          key={request.id}
                          style={{
                            padding: '20px',
                            backgroundColor: '#FAFAFA',
                            borderRadius: '12px',
                            border: '1px solid #E5E5E5',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <Link
                              href={`/requests/${request.id}`}
                              style={{
                                flex: 1,
                                textDecoration: 'none'
                              }}
                            >
                              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A', marginBottom: '8px' }}>
                                {request.title}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <span className="badge badge-category" style={{ fontSize: '12px', padding: '4px 10px' }}>
                                  {getCategoryLabel(request.category)}
                                </span>
                                <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', backgroundColor: getStatusColor(request.status), color: '#FFFFFF' }}>
                                  {getStatusLabel(request.status)}
                                </span>
                                <span style={{ fontSize: '13px', color: '#6B6B6B' }}>
                                  支払日: {formatDate(request.paid_at)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: '#E5E5E5',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  overflow: 'hidden',
                                  fontSize: '12px',
                                  color: '#6B6B6B'
                                }}>
                                  {request.creator.avatar_url ? (
                                    <img 
                                      src={request.creator.avatar_url} 
                                      alt="" 
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                  ) : (
                                    request.creator.display_name?.charAt(0) || '?'
                                  )}
                                </div>
                                <span style={{ fontSize: '14px', color: '#6B6B6B' }}>
                                  {request.creator.display_name || '名前未設定'}
                                </span>
                              </div>
                            </Link>
                            <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                              <div style={{ fontSize: '24px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>
                                {request.final_price?.toLocaleString()}円
                              </div>
                              <button
                                onClick={() => openReceiptEditor(request)}
                                style={{
                                  padding: '8px 16px',
                                  fontSize: '13px',
                                  fontWeight: '500',
                                  color: '#1A1A1A',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #D1D1D1',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9F9F9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                              >
                                領収書ダウンロード
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 領収書編集モーダル */}
      {showEditModal && editingReceipt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '32px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1A1A1A', marginBottom: '8px' }}>
              {editingReceipt.isFirstTime ? '領収書の作成' : '領収書の再発行'}
            </h2>
            
            {!editingReceipt.isFirstTime && (
              <p style={{ fontSize: '13px', color: '#9B9B9B', marginBottom: '24px' }}>
                ※ 既に生成された領収書です。宛名と但し書きは変更できません。
              </p>
            )}

            {editingReceipt.isFirstTime && (
              <p style={{ fontSize: '13px', color: '#9B9B9B', marginBottom: '24px' }}>
                ※ 一度生成すると、宛名と但し書きは変更できません。
              </p>
            )}

            {/* 宛名 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1A1A1A', marginBottom: '8px' }}>
                宛名
              </label>
              <textarea
                value={editingReceipt.addressee}
                onChange={(e) => editingReceipt.isFirstTime && setEditingReceipt({ ...editingReceipt, addressee: e.target.value })}
                rows={3}
                disabled={!editingReceipt.isFirstTime}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #D1D1D1',
                  borderRadius: '8px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  backgroundColor: editingReceipt.isFirstTime ? '#FFFFFF' : '#F5F5F5',
                  cursor: editingReceipt.isFirstTime ? 'text' : 'not-allowed'
                }}
                placeholder="例: 株式会社サンプル&#10;山田 太郎 様"
              />
            </div>

            {/* 但し書き */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1A1A1A', marginBottom: '8px' }}>
                但し書き
              </label>
              <input
                type="text"
                value={editingReceipt.purpose}
                onChange={(e) => editingReceipt.isFirstTime && setEditingReceipt({ ...editingReceipt, purpose: e.target.value })}
                disabled={!editingReceipt.isFirstTime}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #D1D1D1',
                  borderRadius: '8px',
                  backgroundColor: editingReceipt.isFirstTime ? '#FFFFFF' : '#F5F5F5',
                  cursor: editingReceipt.isFirstTime ? 'text' : 'not-allowed'
                }}
                placeholder="例: イラスト制作費として"
              />
            </div>

            {/* 金額（表示のみ） */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1A1A1A', marginBottom: '8px' }}>
                金額（変更不可）
              </label>
              <div style={{
                padding: '12px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#1A1A1A',
                backgroundColor: '#F5F5F5',
                borderRadius: '8px',
                border: '1px solid #E5E5E5'
              }}>
                {paidRequests.find(r => r.id === editingReceipt.requestId)?.final_price.toLocaleString()}円
              </div>
            </div>

            {/* ボタン */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingReceipt(null)
                }}
                disabled={generatingPdf}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6B6B6B',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D1D1',
                  borderRadius: '8px',
                  cursor: generatingPdf ? 'not-allowed' : 'pointer',
                  opacity: generatingPdf ? 0.5 : 1
                }}
              >
                キャンセル
              </button>
              <button
                onClick={openConfirmModal}
                disabled={generatingPdf}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  backgroundColor: '#1A1A1A',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: generatingPdf ? 'not-allowed' : 'pointer',
                  opacity: generatingPdf ? 0.5 : 1
                }}
              >
                {editingReceipt.isFirstTime ? '内容を確認' : '領収書を再発行'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 確認モーダル */}
      {showConfirmModal && editingReceipt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '32px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1A1A1A', marginBottom: '8px' }}>
              内容を確認してください
            </h2>
            
            <div style={{
              padding: '16px',
              backgroundColor: '#FFF9E6',
              border: '1px solid #FFE066',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <p style={{ fontSize: '13px', color: '#8B6914', margin: 0 }}>
                ⚠️ 一度生成すると、宛名と但し書きは変更できません。<br />
                内容をよく確認してください。
              </p>
            </div>

            {/* 確認内容 */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                padding: '16px',
                backgroundColor: '#FAFAFA',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '12px', color: '#9B9B9B', marginBottom: '8px' }}>宛名</div>
                <div style={{ fontSize: '14px', color: '#1A1A1A', whiteSpace: 'pre-wrap' }}>
                  {editingReceipt.addressee}
                </div>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: '#FAFAFA',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '12px', color: '#9B9B9B', marginBottom: '8px' }}>但し書き</div>
                <div style={{ fontSize: '14px', color: '#1A1A1A' }}>
                  {editingReceipt.purpose}
                </div>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: '#FAFAFA',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '12px', color: '#9B9B9B', marginBottom: '8px' }}>金額</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A' }}>
                  {paidRequests.find(r => r.id === editingReceipt.requestId)?.final_price.toLocaleString()}円
                </div>
              </div>
            </div>

            {/* ボタン */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={generatingPdf}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6B6B6B',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D1D1',
                  borderRadius: '8px',
                  cursor: generatingPdf ? 'not-allowed' : 'pointer',
                  opacity: generatingPdf ? 0.5 : 1
                }}
              >
                修正する
              </button>
              <button
                onClick={generateReceipt}
                disabled={generatingPdf}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  backgroundColor: '#1A1A1A',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: generatingPdf ? 'not-allowed' : 'pointer',
                  opacity: generatingPdf ? 0.5 : 1
                }}
              >
                {generatingPdf ? '生成中...' : 'この内容で生成する'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}