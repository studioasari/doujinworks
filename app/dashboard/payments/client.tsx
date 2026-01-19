'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import DashboardSidebar from '@/app/components/DashboardSidebar'

type PaidContract = {
  id: string
  work_request_id: string
  final_price: number
  paid_at: string
  completed_at: string | null
  status: string
  work_request: {
    id: string
    title: string
    category: string
  }
  contractor: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

type MonthlyPayment = {
  month: string
  contracts: PaidContract[]
  total_amount: number
}

type ReceiptEditData = {
  requestId: string
  addressee: string
  purpose: string
  isFirstTime: boolean
}

export default function PaymentsClient() {
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [accountType, setAccountType] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [paidContracts, setPaidContracts] = useState<PaidContract[]>([])
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
      loadPaidContracts()
    }
  }, [currentProfileId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent('/dashboard/payments')}`)
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

  async function loadPaidContracts() {
    // work_contractsから支払い済みのデータを取得
    const { data: contracts, error } = await supabase
      .from('work_contracts')
      .select(`
        id,
        work_request_id,
        final_price,
        paid_at,
        completed_at,
        status,
        contractor_id,
        work_request:work_requests!work_request_id (
          id,
          title,
          category,
          requester_id
        ),
        contractor:profiles!work_contracts_contractor_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .not('paid_at', 'is', null)
      .order('paid_at', { ascending: false })

    if (error) {
      console.error('支払い履歴取得エラー:', error)
      return
    }

    // 自分が依頼者のもののみフィルター＆整形
    const myContracts = (contracts || [])
      .filter((c: any) => c.work_request?.requester_id === currentProfileId)
      .map((c: any) => ({
        id: c.id,
        work_request_id: c.work_request_id,
        final_price: c.final_price,
        paid_at: c.paid_at,
        completed_at: c.completed_at,
        status: c.status,
        work_request: {
          id: c.work_request?.id || '',
          title: c.work_request?.title || '',
          category: c.work_request?.category || ''
        },
        contractor: {
          id: c.contractor?.id || '',
          display_name: c.contractor?.display_name || null,
          avatar_url: c.contractor?.avatar_url || null
        }
      }))

    setPaidContracts(myContracts)

    // 月別にグループ化
    const groupedByMonth = myContracts.reduce((acc: any, contract: any) => {
      const paidDate = new Date(contract.paid_at)
      const monthKey = `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, '0')}`
      
      if (!acc[monthKey]) {
        acc[monthKey] = []
      }
      acc[monthKey].push(contract)
      return acc
    }, {})

    const monthlyData = Object.entries(groupedByMonth).map(([month, contracts]: [string, any]) => {
      const totalAmount = contracts.reduce((sum: number, c: any) => sum + (c.final_price || 0), 0)
      
      return {
        month,
        contracts,
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

  async function openReceiptEditor(contract: PaidContract) {
    // 既存の領収書メタデータをチェック
    const { data: existingMetadata } = await supabase
      .from('receipt_metadata')
      .select('*')
      .eq('request_id', contract.work_request_id)
      .single()

    if (existingMetadata) {
      // 既に生成済み - DBの内容を使用（編集不可）
      setEditingReceipt({
        requestId: contract.work_request_id,
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
        requestId: contract.work_request_id,
        addressee: defaultAddressee,
        purpose: contract.work_request.title,
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
      
      const contract = paidContracts.find(c => c.work_request_id === editingReceipt.requestId)
      if (!contract) {
        alert('契約情報が見つかりません')
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
          amount: contract.final_price,
          paidAt: contract.paid_at,
          requesterId: currentProfileId,
          creatorId: contract.contractor.id
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
      a.download = `領収書_${editingReceipt.purpose}_${formatDate(contract.paid_at)}.pdf`
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
      contracted: '契約済み',
      paid: '作業中',
      delivered: '納品済み',
      completed: '完了',
      cancelled: 'キャンセル'
    }
    return statuses[status] || status
  }

  function getStatusClass(status: string) {
    const classes: { [key: string]: string } = {
      contracted: 'contracted',
      paid: 'working',
      delivered: 'delivered',
      completed: 'completed',
      cancelled: 'cancelled'
    }
    return classes[status] || ''
  }

  const totalPaid = paidContracts.reduce((sum, c) => sum + (c.final_price || 0), 0)
  const thisMonthPaid = paidContracts
    .filter(c => {
      const paidDate = new Date(c.paid_at)
      const now = new Date()
      return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear()
    })
    .reduce((sum, c) => sum + (c.final_price || 0), 0)
  const activeContracts = paidContracts.filter(c => ['paid', 'delivered'].includes(c.status)).length

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      
      <div className="payments-page dashboard-layout">
        <DashboardSidebar accountType={accountType} isAdmin={isAdmin} />
        
        {loading ? (
          <div className="dashboard-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <span>読み込み中...</span>
          </div>
        ) : (
          <main className="payments-main">
            <div className="payments-container">
              <h1 className="payments-title">支払い管理</h1>

              {/* タブ */}
              <div className="payments-tabs">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`payments-tab ${activeTab === 'overview' ? 'active' : ''}`}
                >
                  概要
                </button>
                <button
                  onClick={() => setActiveTab('monthly')}
                  className={`payments-tab ${activeTab === 'monthly' ? 'active' : ''}`}
                >
                  月別支払い
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`payments-tab ${activeTab === 'history' ? 'active' : ''}`}
                >
                  支払い履歴
                </button>
              </div>

              {/* 概要タブ */}
              {activeTab === 'overview' && (
                <>
                  {/* サマリー */}
                  <div className="payments-summary-grid">
                    <div className="payments-summary-card">
                      <div className="payments-summary-value">
                        {totalPaid.toLocaleString()}<span className="payments-summary-unit">円</span>
                      </div>
                      <div className="payments-summary-label">総支払額</div>
                    </div>
                    <div className="payments-summary-card highlight">
                      <div className="payments-summary-value">
                        {thisMonthPaid.toLocaleString()}<span className="payments-summary-unit">円</span>
                      </div>
                      <div className="payments-summary-label">今月の支払額</div>
                    </div>
                    <div className="payments-summary-card">
                      <div className="payments-summary-value">
                        {activeContracts}<span className="payments-summary-unit">件</span>
                      </div>
                      <div className="payments-summary-label">進行中の依頼</div>
                    </div>
                  </div>

                  {/* 最近の支払い */}
                  <div className="payments-recent-card">
                    <h2 className="payments-recent-title">
                      <i className="fas fa-clock"></i>
                      最近の支払い
                    </h2>

                    {paidContracts.length === 0 ? (
                      <div className="payments-empty-inline">
                        <p>支払い履歴はまだありません</p>
                      </div>
                    ) : (
                      <div className="payments-recent-list">
                        {paidContracts.slice(0, 5).map((contract) => (
                          <Link
                            key={contract.id}
                            href={`/requests/${contract.work_request_id}`}
                            className="payments-recent-item"
                          >
                            <div className="payments-recent-info">
                              <div className="payments-recent-item-title">{contract.work_request.title}</div>
                              <div className="payments-recent-meta">
                                <div className="payments-avatar">
                                  {contract.contractor.avatar_url ? (
                                    <img src={contract.contractor.avatar_url} alt="" />
                                  ) : (
                                    <span>{contract.contractor.display_name?.charAt(0) || '?'}</span>
                                  )}
                                </div>
                                <span className="payments-creator-name">
                                  {contract.contractor.display_name || '名前未設定'}
                                </span>
                                <span className={`payments-status-badge ${getStatusClass(contract.status)}`}>
                                  {getStatusLabel(contract.status)}
                                </span>
                              </div>
                            </div>
                            <div className="payments-recent-amount">
                              <div className="payments-price">{contract.final_price?.toLocaleString()}円</div>
                              <div className="payments-date">{formatDate(contract.paid_at)}</div>
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
                <div className="payments-monthly">
                  {monthlyPayments.length === 0 ? (
                    <div className="payments-empty">
                      <i className="fas fa-calendar-alt"></i>
                      <p>支払い履歴はまだありません</p>
                    </div>
                  ) : (
                    <div className="payments-monthly-list">
                      {monthlyPayments.map((monthData) => {
                        const isExpanded = expandedMonths.has(monthData.month)

                        return (
                          <div
                            key={monthData.month}
                            className={`payments-month-card ${isExpanded ? 'expanded' : ''}`}
                          >
                            <div 
                              className="payments-month-header"
                              onClick={() => toggleMonth(monthData.month)}
                            >
                              <div className="payments-month-info">
                                <div className="payments-month-title">
                                  <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                                  {formatMonth(monthData.month)}
                                </div>
                                <div className="payments-month-count">
                                  {monthData.contracts.length}件の支払い
                                </div>
                              </div>
                              <div className="payments-month-total">
                                {monthData.total_amount.toLocaleString()}円
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="payments-month-works">
                                {monthData.contracts.map((contract) => (
                                  <div
                                    key={contract.id}
                                    className="payments-work-item"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Link
                                      href={`/requests/${contract.work_request_id}`}
                                      className="payments-work-link"
                                    >
                                      <div className="payments-work-title">{contract.work_request.title}</div>
                                      <div className="payments-work-date">支払日: {formatDate(contract.paid_at)}</div>
                                      <div className="payments-work-creator">
                                        <div className="payments-avatar small">
                                          {contract.contractor.avatar_url ? (
                                            <img src={contract.contractor.avatar_url} alt="" />
                                          ) : (
                                            <span>{contract.contractor.display_name?.charAt(0) || '?'}</span>
                                          )}
                                        </div>
                                        <span>{contract.contractor.display_name || '名前未設定'}</span>
                                      </div>
                                    </Link>
                                    <div className="payments-work-amount">
                                      <div className="payments-work-price">
                                        {contract.final_price?.toLocaleString()}円
                                      </div>
                                      <button
                                        onClick={() => openReceiptEditor(contract)}
                                        className="payments-btn secondary small"
                                      >
                                        領収書
                                      </button>
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
                <div className="payments-history">
                  {paidContracts.length === 0 ? (
                    <div className="payments-empty">
                      <i className="fas fa-receipt"></i>
                      <p>支払い履歴はまだありません</p>
                      <Link href="/requests/create" className="payments-btn primary">
                        依頼を作成
                      </Link>
                    </div>
                  ) : (
                    <div className="payments-history-list">
                      {paidContracts.map((contract) => (
                        <div key={contract.id} className="payments-history-card">
                          <Link href={`/requests/${contract.work_request_id}`} className="payments-history-link">
                            <div className="payments-history-title">{contract.work_request.title}</div>
                            <div className="payments-history-badges">
                              <span className="payments-category-badge">
                                {getCategoryLabel(contract.work_request.category)}
                              </span>
                              <span className={`payments-status-badge ${getStatusClass(contract.status)}`}>
                                {getStatusLabel(contract.status)}
                              </span>
                              <span className="payments-history-date">
                                支払日: {formatDate(contract.paid_at)}
                              </span>
                            </div>
                            <div className="payments-history-creator">
                              <div className="payments-avatar">
                                {contract.contractor.avatar_url ? (
                                  <img src={contract.contractor.avatar_url} alt="" />
                                ) : (
                                  <span>{contract.contractor.display_name?.charAt(0) || '?'}</span>
                                )}
                              </div>
                              <span>{contract.contractor.display_name || '名前未設定'}</span>
                            </div>
                          </Link>
                          <div className="payments-history-amount">
                            <div className="payments-history-price">
                              {contract.final_price?.toLocaleString()}円
                            </div>
                            <button
                              onClick={() => openReceiptEditor(contract)}
                              className="payments-btn secondary"
                            >
                              <i className="fas fa-download"></i>
                              領収書
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        )}
      </div>

      {/* 領収書編集モーダル */}
      {showEditModal && editingReceipt && (
        <div className="payments-modal-overlay" onClick={() => { setShowEditModal(false); setEditingReceipt(null); }}>
          <div className="payments-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="payments-modal-title">
              {editingReceipt.isFirstTime ? '領収書の作成' : '領収書の再発行'}
            </h2>
            
            <p className="payments-modal-note">
              {editingReceipt.isFirstTime 
                ? '※ 一度生成すると、宛名と但し書きは変更できません。'
                : '※ 既に生成された領収書です。宛名と但し書きは変更できません。'
              }
            </p>

            {/* 宛名 */}
            <div className="payments-form-group">
              <label className="payments-form-label">宛名</label>
              <textarea
                value={editingReceipt.addressee}
                onChange={(e) => editingReceipt.isFirstTime && setEditingReceipt({ ...editingReceipt, addressee: e.target.value })}
                rows={3}
                disabled={!editingReceipt.isFirstTime}
                className={`payments-form-textarea ${!editingReceipt.isFirstTime ? 'disabled' : ''}`}
                placeholder="例: 株式会社サンプル&#10;山田 太郎 様"
              />
            </div>

            {/* 但し書き */}
            <div className="payments-form-group">
              <label className="payments-form-label">但し書き</label>
              <input
                type="text"
                value={editingReceipt.purpose}
                onChange={(e) => editingReceipt.isFirstTime && setEditingReceipt({ ...editingReceipt, purpose: e.target.value })}
                disabled={!editingReceipt.isFirstTime}
                className={`payments-form-input ${!editingReceipt.isFirstTime ? 'disabled' : ''}`}
                placeholder="例: イラスト制作費として"
              />
            </div>

            {/* 金額 */}
            <div className="payments-form-group">
              <label className="payments-form-label">金額（変更不可）</label>
              <div className="payments-form-amount">
                {paidContracts.find(c => c.work_request_id === editingReceipt.requestId)?.final_price.toLocaleString()}円
              </div>
            </div>

            {/* ボタン */}
            <div className="payments-modal-actions">
              <button
                onClick={() => { setShowEditModal(false); setEditingReceipt(null); }}
                disabled={generatingPdf}
                className="payments-btn secondary"
              >
                キャンセル
              </button>
              <button
                onClick={openConfirmModal}
                disabled={generatingPdf}
                className={`payments-btn primary ${generatingPdf ? 'disabled' : ''}`}
              >
                {editingReceipt.isFirstTime ? '内容を確認' : '領収書を再発行'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 確認モーダル */}
      {showConfirmModal && editingReceipt && (
        <div className="payments-modal-overlay confirm" onClick={() => setShowConfirmModal(false)}>
          <div className="payments-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="payments-modal-title">内容を確認してください</h2>
            
            <div className="payments-confirm-warning">
              <i className="fas fa-exclamation-triangle"></i>
              <span>一度生成すると、宛名と但し書きは変更できません。内容をよく確認してください。</span>
            </div>

            {/* 確認内容 */}
            <div className="payments-confirm-preview">
              <div className="payments-confirm-item">
                <div className="payments-confirm-label">宛名</div>
                <div className="payments-confirm-value">{editingReceipt.addressee}</div>
              </div>
              <div className="payments-confirm-item">
                <div className="payments-confirm-label">但し書き</div>
                <div className="payments-confirm-value">{editingReceipt.purpose}</div>
              </div>
              <div className="payments-confirm-item">
                <div className="payments-confirm-label">金額</div>
                <div className="payments-confirm-value large">
                  {paidContracts.find(c => c.work_request_id === editingReceipt.requestId)?.final_price.toLocaleString()}円
                </div>
              </div>
            </div>

            {/* ボタン */}
            <div className="payments-modal-actions">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={generatingPdf}
                className="payments-btn secondary"
              >
                修正する
              </button>
              <button
                onClick={generateReceipt}
                disabled={generatingPdf}
                className={`payments-btn primary ${generatingPdf ? 'disabled' : ''}`}
              >
                {generatingPdf ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    生成中...
                  </>
                ) : (
                  'この内容で生成する'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}