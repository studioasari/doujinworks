'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import DashboardSidebar from '@/app/components/DashboardSidebar'

type BankAccount = {
  id: string
  bank_name: string
  branch_name: string
  account_type: string
  account_number: string
  account_holder_name: string
  bank_code?: string
  branch_code?: string
}

type BankSuggestion = {
  code: string
  name: string
  kana: string
}

type BranchSuggestion = {
  code: string
  name: string
  kana: string
}

// トーストコンポーネント
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`bank-toast ${type}`}>
      <i className={type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'}></i>
      <span>{message}</span>
    </div>
  )
}

// 確認モーダルコンポーネント
function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isDestructive = false
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  isDestructive?: boolean
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="bank-modal-overlay" onClick={onCancel}>
      <div className="bank-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`bank-confirm-icon ${isDestructive ? 'danger' : ''}`}>
          <i className={isDestructive ? 'fas fa-trash-alt' : 'fas fa-question-circle'}></i>
        </div>
        <h2 className="bank-confirm-title">{title}</h2>
        <p className="bank-confirm-message">{message}</p>
        <div className="bank-confirm-actions">
          <button onClick={onCancel} className="bank-btn secondary">
            キャンセル
          </button>
          <button 
            onClick={onConfirm} 
            className={`bank-btn ${isDestructive ? 'danger' : 'primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BankAccountClient() {
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [profileAccountType, setProfileAccountType] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  // フォーム
  const [bankName, setBankName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [branchName, setBranchName] = useState('')
  const [branchCode, setBranchCode] = useState('')
  const [bankAccountType, setBankAccountType] = useState<'savings' | 'checking'>('savings')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  
  // オートコンプリート
  const [bankSuggestions, setBankSuggestions] = useState<BankSuggestion[]>([])
  const [branchSuggestions, setBranchSuggestions] = useState<BranchSuggestion[]>([])
  const [showBankSuggestions, setShowBankSuggestions] = useState(false)
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false)
  const [searchingBank, setSearchingBank] = useState(false)
  const [searchingBranch, setSearchingBranch] = useState(false)
  
  // 編集モード（既存データがある場合、銀行コードなしでも支店編集を許可）
  const [isEditMode, setIsEditMode] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      loadBankAccount()
    }
  }, [currentProfileId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent('/wallet/bank-account')}`)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type, is_admin')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentProfileId(profile.id)
      setProfileAccountType(profile.account_type)
      setIsAdmin(profile.is_admin || false)
    }
    
    setLoading(false)
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
      setBankAccountType(data.account_type)
      setAccountNumber(data.account_number)
      setAccountHolderName(data.account_holder_name)
      // 既存データがある場合は編集モードをON
      setIsEditMode(true)
      // bank_codeとbranch_codeがDBに保存されている場合は読み込む
      if (data.bank_code) {
        setBankCode(data.bank_code)
      }
      if (data.branch_code) {
        setBranchCode(data.branch_code)
      }
    }
  }

  // 銀行名検索
  async function searchBanks(query: string) {
    if (query.length < 1) {
      setBankSuggestions([])
      return
    }

    setSearchingBank(true)
    try {
      const response = await fetch(`https://bank.teraren.com/banks/search.json?name=${encodeURIComponent(query)}`)
      const data = await response.json()
      setBankSuggestions(data.slice(0, 10))
    } catch (error) {
      console.error('銀行検索エラー:', error)
    } finally {
      setSearchingBank(false)
    }
  }

  // 支店名検索
  async function searchBranches(query: string) {
    if (!bankCode || query.length < 1) {
      setBranchSuggestions([])
      return
    }

    setSearchingBranch(true)
    try {
      const response = await fetch(`https://bank.teraren.com/banks/${bankCode}/branches/search.json?name=${encodeURIComponent(query)}`)
      const data = await response.json()
      setBranchSuggestions(data.slice(0, 10))
    } catch (error) {
      console.error('支店検索エラー:', error)
    } finally {
      setSearchingBranch(false)
    }
  }

  // 銀行名入力時
  function handleBankNameChange(value: string) {
    setBankName(value)
    setBankCode('')
    setBranchName('')
    setBranchCode('')
    setIsEditMode(false) // 銀行名を変更したら編集モード解除
    setShowBankSuggestions(true)
    searchBanks(value)
  }

  // 銀行選択時
  function handleBankSelect(bank: BankSuggestion) {
    setBankName(bank.name)
    setBankCode(bank.code)
    setShowBankSuggestions(false)
    setBranchName('')
    setBranchCode('')
  }

  // 支店名入力時
  function handleBranchNameChange(value: string) {
    setBranchName(value)
    setBranchCode('')
    setShowBranchSuggestions(true)
    if (bankCode) {
      searchBranches(value)
    }
  }

  // 支店選択時
  function handleBranchSelect(branch: BranchSuggestion) {
    setBranchName(branch.name)
    setBranchCode(branch.code)
    setShowBranchSuggestions(false)
  }

  // 支店入力が可能かどうかの判定
  // bankCodeがある、または編集モードで銀行名が入力されている場合は編集可能
  const canEditBranch = bankCode || (isEditMode && bankName.trim().length > 0)

  async function handleSaveBankAccount() {
    if (!bankName.trim() || !branchName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
      setToast({ message: 'すべての項目を入力してください', type: 'error' })
      return
    }

    setProcessing(true)

    const bankData = {
      profile_id: currentProfileId,
      bank_name: bankName.trim(),
      branch_name: branchName.trim(),
      account_type: bankAccountType,
      account_number: accountNumber.trim(),
      account_holder_name: accountHolderName.trim(),
      // bank_codeとbranch_codeも保存（DBにカラムがあれば）
      ...(bankCode && { bank_code: bankCode }),
      ...(branchCode && { branch_code: branchCode })
    }

    try {
      if (bankAccount) {
        const { error } = await supabase
          .from('bank_accounts')
          .update({
            ...bankData,
            updated_at: new Date().toISOString()
          })
          .eq('id', bankAccount.id)

        if (error) {
          console.error('口座情報更新エラー:', error)
          setToast({ message: '口座情報の更新に失敗しました', type: 'error' })
          setProcessing(false)
          return
        }
        
        setToast({ message: '口座情報を更新しました', type: 'success' })
      } else {
        const { error } = await supabase
          .from('bank_accounts')
          .insert(bankData)

        if (error) {
          console.error('口座情報登録エラー:', error)
          setToast({ message: '口座情報の登録に失敗しました', type: 'error' })
          setProcessing(false)
          return
        }
        
        setToast({ message: '口座情報を登録しました', type: 'success' })
      }

      // 成功時のみリダイレクト
      // router.pushの代わりにwindow.location.hrefを使用して確実にリダイレクト
      setTimeout(() => {
        window.location.href = '/wallet/earnings'
      }, 1500)
    } catch (err) {
      console.error('予期せぬエラー:', err)
      setToast({ message: '予期せぬエラーが発生しました', type: 'error' })
      setProcessing(false)
    }
  }

  async function handleDeleteBankAccount() {
    setShowDeleteModal(false)
    
    const { error } = await supabase
      .from('bank_accounts')
      .delete()
      .eq('id', bankAccount!.id)

    if (error) {
      setToast({ message: '削除に失敗しました', type: 'error' })
    } else {
      setToast({ message: '口座情報を削除しました', type: 'success' })
      setTimeout(() => {
        window.location.href = '/wallet/earnings'
      }, 1500)
    }
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      
      <div className="bank-page dashboard-layout">
        <DashboardSidebar accountType={profileAccountType} isAdmin={isAdmin} />
        
        {loading ? (
          <div className="dashboard-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <span>読み込み中...</span>
          </div>
        ) : (
          <main className="bank-main">
            <div className="bank-container">
              <h1 className="bank-title">
                振込先口座の{bankAccount ? '編集' : '登録'}
              </h1>

              {/* 注意事項 */}
              <div className="bank-notice">
                <div className="bank-notice-title">
                  <i className="fas fa-info-circle"></i>
                  重要な注意事項
                </div>
                <div className="bank-notice-content">
                  ・口座情報は正確に入力してください<br />
                  ・誤った情報による振込エラーの責任は負いかねます<br />
                  ・口座名義はカタカナで入力してください<br />
                  ・変更は次回振込から反映されます
                </div>
              </div>

              {/* 入力フォーム */}
              <div className="bank-form-card">
                {/* 銀行名 */}
                <div className="bank-form-group">
                  <label className="bank-form-label">
                    銀行名 <span className="bank-required">*</span>
                  </label>
                  <div className="bank-input-wrapper">
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => handleBankNameChange(e.target.value)}
                      placeholder="例: みずほ銀行"
                      autoComplete="off"
                      className="bank-form-input"
                      onFocus={() => setShowBankSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowBankSuggestions(false), 200)}
                    />
                    {searchingBank && (
                      <div className="bank-input-spinner">
                        <i className="fas fa-spinner fa-spin"></i>
                      </div>
                    )}
                  </div>
                  
                  {showBankSuggestions && bankSuggestions.length > 0 && (
                    <div className="bank-suggestions">
                      {bankSuggestions.map((bank) => (
                        <div
                          key={bank.code}
                          onClick={() => handleBankSelect(bank)}
                          className="bank-suggestion-item"
                        >
                          <div className="bank-suggestion-name">{bank.name}</div>
                          <div className="bank-suggestion-info">{bank.kana} · {bank.code}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 支店名 */}
                <div className="bank-form-group">
                  <label className="bank-form-label">
                    支店名 <span className="bank-required">*</span>
                  </label>
                  <div className="bank-input-wrapper">
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => handleBranchNameChange(e.target.value)}
                      placeholder={!canEditBranch ? "先に銀行を選択してください" : "例: 新宿支店"}
                      disabled={!canEditBranch}
                      autoComplete="off"
                      className={`bank-form-input ${!canEditBranch ? 'disabled' : ''}`}
                      onFocus={() => bankCode && setShowBranchSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowBranchSuggestions(false), 200)}
                    />
                    {searchingBranch && (
                      <div className="bank-input-spinner">
                        <i className="fas fa-spinner fa-spin"></i>
                      </div>
                    )}
                  </div>
                  
                  {showBranchSuggestions && branchSuggestions.length > 0 && (
                    <div className="bank-suggestions">
                      {branchSuggestions.map((branch) => (
                        <div
                          key={branch.code}
                          onClick={() => handleBranchSelect(branch)}
                          className="bank-suggestion-item"
                        >
                          <div className="bank-suggestion-name">{branch.name}</div>
                          <div className="bank-suggestion-info">{branch.kana} · {branch.code}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* 編集モードで銀行コードがない場合のヒント */}
                  {isEditMode && !bankCode && bankName && (
                    <div className="bank-form-hint">
                      ※ 銀行名を変更する場合は、候補から選択し直してください
                    </div>
                  )}
                </div>

                {/* 口座種別 */}
                <div className="bank-form-group">
                  <label className="bank-form-label">
                    口座種別 <span className="bank-required">*</span>
                  </label>
                  <select
                    value={bankAccountType}
                    onChange={(e) => setBankAccountType(e.target.value as 'savings' | 'checking')}
                    className="bank-form-select"
                  >
                    <option value="savings">普通</option>
                    <option value="checking">当座</option>
                  </select>
                </div>

                {/* 口座番号 */}
                <div className="bank-form-group">
                  <label className="bank-form-label">
                    口座番号 <span className="bank-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="1234567"
                    maxLength={7}
                    className="bank-form-input"
                  />
                  <div className="bank-form-hint">数字のみ7桁以内で入力してください</div>
                </div>

                {/* 口座名義 */}
                <div className="bank-form-group">
                  <label className="bank-form-label">
                    口座名義 <span className="bank-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="ヤマダ タロウ"
                    className="bank-form-input"
                  />
                  <div className="bank-form-hint">カタカナで入力してください（姓と名の間にスペース）</div>
                </div>

                {/* ボタン */}
                <div className="bank-form-actions">
                  <button
                    onClick={() => router.push('/wallet/earnings')}
                    disabled={processing}
                    className="bank-btn secondary"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveBankAccount}
                    disabled={processing}
                    className={`bank-btn primary ${processing ? 'disabled' : ''}`}
                  >
                    {processing ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        保存中...
                      </>
                    ) : (
                      bankAccount ? '更新する' : '登録する'
                    )}
                  </button>
                </div>
              </div>

              {/* 削除ボタン（編集時のみ） */}
              {bankAccount && (
                <div className="bank-delete-section">
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="bank-delete-link"
                  >
                    <i className="fas fa-trash-alt"></i>
                    口座情報を削除
                  </button>
                </div>
              )}
            </div>
          </main>
        )}
      </div>

      <Footer />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showDeleteModal && (
        <ConfirmModal
          title="口座情報を削除"
          message="本当に口座情報を削除しますか？この操作は取り消せません。"
          confirmLabel="削除する"
          onConfirm={handleDeleteBankAccount}
          onCancel={() => setShowDeleteModal(false)}
          isDestructive={true}
        />
      )}
    </>
  )
}