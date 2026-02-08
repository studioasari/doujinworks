'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/app/components/Skeleton'
import styles from './page.module.css'

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
    <div className={`${styles.toast} ${styles[type]}`}>
      <i className={type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'}></i>
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
    <div className="modal-overlay active" onClick={onCancel}>
      <div className={`modal ${styles.confirmModal}`} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.confirmIcon} ${isDestructive ? styles.danger : ''}`}>
          <i className={isDestructive ? 'fa-solid fa-trash' : 'fa-solid fa-circle-question'}></i>
        </div>
        <h2 className={styles.confirmTitle}>{title}</h2>
        <p className={styles.confirmMessage}>{message}</p>
        <div className="button-group-equal">
          <button onClick={onCancel} className="btn btn-secondary">
            キャンセル
          </button>
          <button 
            onClick={onConfirm} 
            className={`btn ${isDestructive ? styles.btnDanger : 'btn-primary'}`}
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
    loadData()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
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
      setIsEditMode(true)
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
    setIsEditMode(false)
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

      setTimeout(() => {
        window.location.href = '/dashboard/earnings'
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
        window.location.href = '/dashboard/earnings'
      }, 1500)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>
          振込先口座の{bankAccount ? '編集' : '登録'}
        </h1>

        {/* 注意事項 */}
        <div className="alert alert-warning">
          <i className="fa-solid fa-circle-info alert-icon"></i>
          <div>
            <div className={styles.noticeTitle}>重要な注意事項</div>
            <div className={styles.noticeContent}>
              ・口座情報は正確に入力してください<br />
              ・誤った情報による振込エラーの責任は負いかねます<br />
              ・口座名義はカタカナで入力してください<br />
              ・変更は次回振込から反映されます
            </div>
          </div>
        </div>

        {/* 入力フォーム */}
        <div className={styles.formCard}>
          {/* 銀行名 */}
          <div className="form-group">
            <label className="form-label">
              銀行名 <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={bankName}
                onChange={(e) => handleBankNameChange(e.target.value)}
                placeholder="例: みずほ銀行"
                autoComplete="off"
                className="form-input"
                onFocus={() => setShowBankSuggestions(true)}
                onBlur={() => setTimeout(() => setShowBankSuggestions(false), 200)}
              />
              {searchingBank && (
                <div className={styles.inputSpinner}>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                </div>
              )}
            </div>
            
            {showBankSuggestions && bankSuggestions.length > 0 && (
              <div className={styles.suggestions}>
                {bankSuggestions.map((bank) => (
                  <div
                    key={bank.code}
                    onClick={() => handleBankSelect(bank)}
                    className={styles.suggestionItem}
                  >
                    <div className={styles.suggestionName}>{bank.name}</div>
                    <div className={styles.suggestionInfo}>{bank.kana} · {bank.code}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 支店名 */}
          <div className="form-group">
            <label className="form-label">
              支店名 <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={branchName}
                onChange={(e) => handleBranchNameChange(e.target.value)}
                placeholder={!canEditBranch ? "先に銀行を選択してください" : "例: 新宿支店"}
                disabled={!canEditBranch}
                autoComplete="off"
                className="form-input"
                onFocus={() => bankCode && setShowBranchSuggestions(true)}
                onBlur={() => setTimeout(() => setShowBranchSuggestions(false), 200)}
              />
              {searchingBranch && (
                <div className={styles.inputSpinner}>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                </div>
              )}
            </div>
            
            {showBranchSuggestions && branchSuggestions.length > 0 && (
              <div className={styles.suggestions}>
                {branchSuggestions.map((branch) => (
                  <div
                    key={branch.code}
                    onClick={() => handleBranchSelect(branch)}
                    className={styles.suggestionItem}
                  >
                    <div className={styles.suggestionName}>{branch.name}</div>
                    <div className={styles.suggestionInfo}>{branch.kana} · {branch.code}</div>
                  </div>
                ))}
              </div>
            )}
            
            {isEditMode && !bankCode && bankName && (
              <div className={styles.formHint}>
                ※ 銀行名を変更する場合は、候補から選択し直してください
              </div>
            )}
          </div>

          {/* 口座種別 */}
          <div className="form-group">
            <label className="form-label">
              口座種別 <span className={styles.required}>*</span>
            </label>
            <select
              value={bankAccountType}
              onChange={(e) => setBankAccountType(e.target.value as 'savings' | 'checking')}
              className="form-input"
            >
              <option value="savings">普通</option>
              <option value="checking">当座</option>
            </select>
          </div>

          {/* 口座番号 */}
          <div className="form-group">
            <label className="form-label">
              口座番号 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="1234567"
              maxLength={7}
              className="form-input"
            />
            <div className={styles.formHint}>数字のみ7桁以内で入力してください</div>
          </div>

          {/* 口座名義 */}
          <div className="form-group">
            <label className="form-label">
              口座名義 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="ヤマダ タロウ"
              className="form-input"
            />
            <div className={styles.formHint}>カタカナで入力してください（姓と名の間にスペース）</div>
          </div>

          {/* ボタン */}
          <div className={styles.formActions}>
            <button
              onClick={() => router.push('/dashboard/earnings')}
              disabled={processing}
              className="btn btn-secondary"
            >
              キャンセル
            </button>
            <button
              onClick={handleSaveBankAccount}
              disabled={processing}
              className="btn btn-primary"
            >
              {processing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
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
          <div className={styles.deleteSection}>
            <button
              onClick={() => setShowDeleteModal(true)}
              className={styles.deleteLink}
            >
              <i className="fa-solid fa-trash"></i>
              口座情報を削除
            </button>
          </div>
        )}
      </div>

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