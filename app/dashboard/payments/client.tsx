'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { LoadingSpinner } from '@/app/components/Skeleton'
import styles from './page.module.css'

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
  const [paidContracts, setPaidContracts] = useState<PaidContract[]>([])
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([])
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'history'>('overview')
  
  // 領収書編集モーダル
  const [showEditModal, setShowEditModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<ReceiptEditData | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      loadPaidContracts()
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

  async function loadPaidContracts() {
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
    const { data: existingMetadata } = await supabase
      .from('receipt_metadata')
      .select('*')
      .eq('request_id', contract.work_request_id)
      .single()

    if (existingMetadata) {
      setEditingReceipt({
        requestId: contract.work_request_id,
        addressee: existingMetadata.addressee,
        purpose: existingMetadata.purpose,
        isFirstTime: false
      })
    } else {
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
    
    if (!editingReceipt.isFirstTime) {
      await generateReceipt()
      return
    }
    
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

  function getStatusBadgeClass(status: string) {
    const classes: { [key: string]: string } = {
      contracted: '',
      paid: 'badge-progress',
      delivered: 'badge-accent',
      completed: 'badge-open',
      cancelled: 'badge-closed'
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

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>支払い管理</h1>

        {/* タブ */}
        <div className={`tabs ${styles.tabs}`}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          >
            概要
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`tab ${activeTab === 'monthly' ? 'active' : ''}`}
          >
            月別支払い
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          >
            支払い履歴
          </button>
        </div>

        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <div className={styles.tabContent}>
            {/* サマリー */}
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryValue}>
                  {totalPaid.toLocaleString()}<span className={styles.summaryUnit}>円</span>
                </div>
                <div className={styles.summaryLabel}>総支払額</div>
              </div>
              <div className={`${styles.summaryCard} ${styles.highlight}`}>
                <div className={styles.summaryValue}>
                  {thisMonthPaid.toLocaleString()}<span className={styles.summaryUnit}>円</span>
                </div>
                <div className={styles.summaryLabel}>今月の支払額</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryValue}>
                  {activeContracts}<span className={styles.summaryUnit}>件</span>
                </div>
                <div className={styles.summaryLabel}>進行中の依頼</div>
              </div>
            </div>

            {/* 最近の支払い */}
            <div className={styles.recentCard}>
              <h2 className={styles.recentTitle}>
                <i className="fa-solid fa-clock"></i>
                最近の支払い
              </h2>

              {paidContracts.length === 0 ? (
                <div className={styles.emptyInline}>
                  <p>支払い履歴はまだありません</p>
                </div>
              ) : (
                <div className={styles.recentList}>
                  {paidContracts.slice(0, 5).map((contract) => (
                    <Link
                      key={contract.id}
                      href={`/requests/${contract.work_request_id}`}
                      className={styles.recentItem}
                    >
                      <div className={styles.recentInfo}>
                        <div className={styles.recentItemTitle}>{contract.work_request.title}</div>
                        <div className={styles.recentMeta}>
                          <div className="avatar avatar-xs">
                            {contract.contractor.avatar_url ? (
                              <img src={contract.contractor.avatar_url} alt="" />
                            ) : (
                              <i className="fa-solid fa-user"></i>
                            )}
                          </div>
                          <span className={styles.creatorName}>
                            {contract.contractor.display_name || '名前未設定'}
                          </span>
                          <span className={`badge ${getStatusBadgeClass(contract.status)}`}>
                            {getStatusLabel(contract.status)}
                          </span>
                        </div>
                      </div>
                      <div className={styles.recentAmount}>
                        <div className={styles.price}>{contract.final_price?.toLocaleString()}円</div>
                        <div className={styles.date}>{formatDate(contract.paid_at)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 月別支払いタブ */}
        {activeTab === 'monthly' && (
          <div className={styles.tabContent}>
            {monthlyPayments.length === 0 ? (
              <div className="empty-state">
                <i className="fa-regular fa-calendar"></i>
                <p>支払い履歴はまだありません</p>
              </div>
            ) : (
              <div className={styles.monthlyList}>
                {monthlyPayments.map((monthData) => {
                  const isExpanded = expandedMonths.has(monthData.month)

                  return (
                    <div key={monthData.month} className={styles.monthCard}>
                      <div 
                        className={styles.monthHeader}
                        onClick={() => toggleMonth(monthData.month)}
                      >
                        <div className={styles.monthInfo}>
                          <div className={styles.monthTitle}>
                            <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                            {formatMonth(monthData.month)}
                          </div>
                          <div className={styles.monthCount}>
                            {monthData.contracts.length}件の支払い
                          </div>
                        </div>
                        <div className={styles.monthTotal}>
                          {monthData.total_amount.toLocaleString()}円
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={styles.monthWorks}>
                          {monthData.contracts.map((contract) => (
                            <div
                              key={contract.id}
                              className={styles.workItem}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link
                                href={`/requests/${contract.work_request_id}`}
                                className={styles.workLink}
                              >
                                <div className={styles.workTitle}>{contract.work_request.title}</div>
                                <div className={styles.workDate}>支払日: {formatDate(contract.paid_at)}</div>
                                <div className={styles.workCreator}>
                                  <div className="avatar avatar-xs">
                                    {contract.contractor.avatar_url ? (
                                      <img src={contract.contractor.avatar_url} alt="" />
                                    ) : (
                                      <i className="fa-solid fa-user"></i>
                                    )}
                                  </div>
                                  <span>{contract.contractor.display_name || '名前未設定'}</span>
                                </div>
                              </Link>
                              <div className={styles.workAmount}>
                                <div className={styles.workPrice}>
                                  {contract.final_price?.toLocaleString()}円
                                </div>
                                <button
                                  onClick={() => openReceiptEditor(contract)}
                                  className="btn btn-secondary btn-sm"
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
          <div className={styles.tabContent}>
            {paidContracts.length === 0 ? (
              <div className="empty-state">
                <i className="fa-regular fa-file-lines"></i>
                <p>支払い履歴はまだありません</p>
                <Link href="/requests/create" className="btn btn-primary">
                  依頼を作成
                </Link>
              </div>
            ) : (
              <div className={styles.historyList}>
                {paidContracts.map((contract) => (
                  <div key={contract.id} className={styles.historyCard}>
                    <Link href={`/requests/${contract.work_request_id}`} className={styles.historyLink}>
                      <div className={styles.historyTitle}>{contract.work_request.title}</div>
                      <div className={styles.historyBadges}>
                        <span className="badge">
                          {getCategoryLabel(contract.work_request.category)}
                        </span>
                        <span className={`badge ${getStatusBadgeClass(contract.status)}`}>
                          {getStatusLabel(contract.status)}
                        </span>
                        <span className={styles.historyDate}>
                          支払日: {formatDate(contract.paid_at)}
                        </span>
                      </div>
                      <div className={styles.historyCreator}>
                        <div className="avatar avatar-sm">
                          {contract.contractor.avatar_url ? (
                            <img src={contract.contractor.avatar_url} alt="" />
                          ) : (
                            <i className="fa-solid fa-user"></i>
                          )}
                        </div>
                        <span>{contract.contractor.display_name || '名前未設定'}</span>
                      </div>
                    </Link>
                    <div className={styles.historyAmount}>
                      <div className={styles.historyPrice}>
                        {contract.final_price?.toLocaleString()}円
                      </div>
                      <button
                        onClick={() => openReceiptEditor(contract)}
                        className="btn btn-secondary btn-sm"
                      >
                        <i className="fa-solid fa-download"></i>
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

      {/* 領収書編集モーダル */}
      {showEditModal && editingReceipt && (
        <div className="modal-overlay active" onClick={() => { setShowEditModal(false); setEditingReceipt(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingReceipt.isFirstTime ? '領収書の作成' : '領収書の再発行'}
              </h3>
              <button className="modal-close" onClick={() => { setShowEditModal(false); setEditingReceipt(null); }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body">
              <p className={styles.modalNote}>
                {editingReceipt.isFirstTime 
                  ? '※ 一度生成すると、宛名と但し書きは変更できません。'
                  : '※ 既に生成された領収書です。宛名と但し書きは変更できません。'
                }
              </p>

              <div className="form-group">
                <label className="form-label">宛名</label>
                <textarea
                  value={editingReceipt.addressee}
                  onChange={(e) => editingReceipt.isFirstTime && setEditingReceipt({ ...editingReceipt, addressee: e.target.value })}
                  rows={3}
                  disabled={!editingReceipt.isFirstTime}
                  className={`form-input ${styles.textarea}`}
                  placeholder="例: 株式会社サンプル&#10;山田 太郎 様"
                />
              </div>

              <div className="form-group">
                <label className="form-label">但し書き</label>
                <input
                  type="text"
                  value={editingReceipt.purpose}
                  onChange={(e) => editingReceipt.isFirstTime && setEditingReceipt({ ...editingReceipt, purpose: e.target.value })}
                  disabled={!editingReceipt.isFirstTime}
                  className="form-input"
                  placeholder="例: イラスト制作費として"
                />
              </div>

              <div className="form-group">
                <label className="form-label">金額（変更不可）</label>
                <div className={styles.formAmount}>
                  {paidContracts.find(c => c.work_request_id === editingReceipt.requestId)?.final_price.toLocaleString()}円
                </div>
              </div>
            </div>
            <div className="modal-footer button-group-equal">
              <button
                onClick={() => { setShowEditModal(false); setEditingReceipt(null); }}
                disabled={generatingPdf}
                className="btn btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={openConfirmModal}
                disabled={generatingPdf}
                className="btn btn-primary"
              >
                {editingReceipt.isFirstTime ? '内容を確認' : '領収書を再発行'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 確認モーダル */}
      {showConfirmModal && editingReceipt && (
        <div className="modal-overlay active" onClick={() => setShowConfirmModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">内容を確認してください</h3>
              <button className="modal-close" onClick={() => setShowConfirmModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning">
                <i className="fa-solid fa-triangle-exclamation alert-icon"></i>
                一度生成すると、宛名と但し書きは変更できません。内容をよく確認してください。
              </div>

              <div className={styles.confirmPreview}>
                <div className={styles.confirmItem}>
                  <div className={styles.confirmLabel}>宛名</div>
                  <div className={styles.confirmValue}>{editingReceipt.addressee}</div>
                </div>
                <div className={styles.confirmItem}>
                  <div className={styles.confirmLabel}>但し書き</div>
                  <div className={styles.confirmValue}>{editingReceipt.purpose}</div>
                </div>
                <div className={styles.confirmItem}>
                  <div className={styles.confirmLabel}>金額</div>
                  <div className={`${styles.confirmValue} ${styles.large}`}>
                    {paidContracts.find(c => c.work_request_id === editingReceipt.requestId)?.final_price.toLocaleString()}円
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer button-group-equal">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={generatingPdf}
                className="btn btn-secondary"
              >
                修正する
              </button>
              <button
                onClick={generateReceipt}
                disabled={generatingPdf}
                className="btn btn-primary"
              >
                {generatingPdf ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
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
    </>
  )
}