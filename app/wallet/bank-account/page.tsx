'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import DashboardSidebar from '../../components/DashboardSidebar'

type BankAccount = {
  id: string
  bank_name: string
  branch_name: string
  account_type: string
  account_number: string
  account_holder_name: string
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

export default function BankAccountPage() {
  const [loading, setLoading] = useState(true)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [profileAccountType, setProfileAccountType] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [processing, setProcessing] = useState(false)
  
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
    searchBranches(value)
  }

  // 支店選択時
  function handleBranchSelect(branch: BranchSuggestion) {
    setBranchName(branch.name)
    setBranchCode(branch.code)
    setShowBranchSuggestions(false)
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
      account_type: bankAccountType,
      account_number: accountNumber.trim(),
      account_holder_name: accountHolderName.trim()
    }

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
        alert('口座情報の更新に失敗しました')
      } else {
        alert('口座情報を更新しました')
        router.push('/wallet/earnings')
      }
    } else {
      const { error } = await supabase
        .from('bank_accounts')
        .insert(bankData)

      if (error) {
        console.error('口座情報登録エラー:', error)
        alert('口座情報の登録に失敗しました')
      } else {
        alert('口座情報を登録しました')
        router.push('/wallet/earnings')
      }
    }

    setProcessing(false)
  }

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex' }}>
          <DashboardSidebar accountType={profileAccountType} isAdmin={isAdmin} />
          
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
            <div style={{ flex: 1, padding: '40px 20px', maxWidth: '720px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1A1A1A', marginBottom: '32px' }}>
                振込先口座の{bankAccount ? '編集' : '登録'}
              </h1>

              {/* 注意事項 */}
              <div style={{ padding: '20px', backgroundColor: '#FAFAFA', borderRadius: '12px', marginBottom: '32px', border: '1px solid #E5E5E5' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1A1A1A' }}>
                  重要な注意事項
                </div>
                <div style={{ fontSize: '13px', color: '#6B6B6B', lineHeight: '1.7' }}>
                  ・口座情報は正確に入力してください<br />
                  ・誤った情報による振込エラーの責任は負いかねます<br />
                  ・口座名義はカタカナで入力してください<br />
                  ・変更は次回振込から反映されます
                </div>
              </div>

              {/* 入力フォーム */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', border: '1px solid #E5E5E5' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {/* 銀行名 */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ 
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1A1A1A',
                      marginBottom: '8px'
                    }}>
                      銀行名
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => handleBankNameChange(e.target.value)}
                        placeholder="例: みずほ銀行"
                        autoComplete="off"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '15px',
                          border: '1px solid #D1D1D1',
                          borderRadius: '8px',
                          outline: 'none',
                          transition: 'all 0.2s',
                          backgroundColor: '#FFFFFF',
                          color: '#1A1A1A'
                        }}
                        onFocusCapture={(e) => {
                          e.target.style.borderColor = '#1A1A1A'
                          e.target.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.05)'
                          setShowBankSuggestions(true)
                        }}
                        onBlurCapture={(e) => {
                          e.target.style.borderColor = '#D1D1D1'
                          e.target.style.boxShadow = 'none'
                          setTimeout(() => setShowBankSuggestions(false), 200)
                        }}
                      />
                      {searchingBank && (
                        <div style={{ 
                          position: 'absolute', 
                          right: '16px', 
                          top: '50%', 
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          border: '2px solid #E5E5E5',
                          borderTopColor: '#1A1A1A',
                          borderRadius: '50%',
                          animation: 'spin 0.6s linear infinite'
                        }}></div>
                      )}
                    </div>
                    
                    {showBankSuggestions && bankSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E5E5',
                        borderRadius: '8px',
                        marginTop: '8px',
                        maxHeight: '280px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        zIndex: 1000
                      }}>
                        {bankSuggestions.map((bank, index) => (
                          <div
                            key={bank.code}
                            onClick={() => handleBankSelect(bank)}
                            style={{
                              padding: '14px 16px',
                              cursor: 'pointer',
                              borderBottom: index < bankSuggestions.length - 1 ? '1px solid #F5F5F5' : 'none',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                          >
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A', marginBottom: '4px' }}>
                              {bank.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#9B9B9B' }}>
                              {bank.kana} · {bank.code}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 支店名 */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ 
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1A1A1A',
                      marginBottom: '8px'
                    }}>
                      支店名
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={branchName}
                        onChange={(e) => handleBranchNameChange(e.target.value)}
                        placeholder={!bankCode ? "先に銀行を選択してください" : "例: 新宿支店"}
                        disabled={!bankCode}
                        autoComplete="off"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '15px',
                          border: '1px solid #D1D1D1',
                          borderRadius: '8px',
                          outline: 'none',
                          transition: 'all 0.2s',
                          backgroundColor: !bankCode ? '#F9F9F9' : '#FFFFFF',
                          color: !bankCode ? '#9B9B9B' : '#1A1A1A',
                          cursor: !bankCode ? 'not-allowed' : 'text'
                        }}
                        onFocusCapture={(e) => {
                          if (bankCode) {
                            e.target.style.borderColor = '#1A1A1A'
                            e.target.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.05)'
                            setShowBranchSuggestions(true)
                          }
                        }}
                        onBlurCapture={(e) => {
                          e.target.style.borderColor = '#D1D1D1'
                          e.target.style.boxShadow = 'none'
                          setTimeout(() => setShowBranchSuggestions(false), 200)
                        }}
                      />
                      {searchingBranch && (
                        <div style={{ 
                          position: 'absolute', 
                          right: '16px', 
                          top: '50%', 
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          border: '2px solid #E5E5E5',
                          borderTopColor: '#1A1A1A',
                          borderRadius: '50%',
                          animation: 'spin 0.6s linear infinite'
                        }}></div>
                      )}
                    </div>
                    
                    {showBranchSuggestions && branchSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E5E5',
                        borderRadius: '8px',
                        marginTop: '8px',
                        maxHeight: '280px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        zIndex: 1000
                      }}>
                        {branchSuggestions.map((branch, index) => (
                          <div
                            key={branch.code}
                            onClick={() => handleBranchSelect(branch)}
                            style={{
                              padding: '14px 16px',
                              cursor: 'pointer',
                              borderBottom: index < branchSuggestions.length - 1 ? '1px solid #F5F5F5' : 'none',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                          >
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A', marginBottom: '4px' }}>
                              {branch.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#9B9B9B' }}>
                              {branch.kana} · {branch.code}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 口座種別 */}
                  <div>
                    <label style={{ 
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1A1A1A',
                      marginBottom: '8px'
                    }}>
                      口座種別
                    </label>
                    <select
                      value={bankAccountType}
                      onChange={(e) => setBankAccountType(e.target.value as 'savings' | 'checking')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '15px',
                        border: '1px solid #D1D1D1',
                        borderRadius: '8px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        backgroundColor: '#FFFFFF',
                        color: '#1A1A1A',
                        cursor: 'pointer'
                      }}
                      onFocusCapture={(e) => {
                        e.target.style.borderColor = '#1A1A1A'
                        e.target.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.05)'
                      }}
                      onBlurCapture={(e) => {
                        e.target.style.borderColor = '#D1D1D1'
                        e.target.style.boxShadow = 'none'
                      }}
                    >
                      <option value="savings">普通</option>
                      <option value="checking">当座</option>
                    </select>
                  </div>

                  {/* 口座番号 */}
                  <div>
                    <label style={{ 
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1A1A1A',
                      marginBottom: '8px'
                    }}>
                      口座番号
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="1234567"
                      maxLength={7}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '15px',
                        border: '1px solid #D1D1D1',
                        borderRadius: '8px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        backgroundColor: '#FFFFFF',
                        color: '#1A1A1A'
                      }}
                      onFocusCapture={(e) => {
                        e.target.style.borderColor = '#1A1A1A'
                        e.target.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.05)'
                      }}
                      onBlurCapture={(e) => {
                        e.target.style.borderColor = '#D1D1D1'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                    <div style={{ fontSize: '12px', color: '#9B9B9B', marginTop: '6px' }}>
                      数字のみ7桁以内で入力してください
                    </div>
                  </div>

                  {/* 口座名義 */}
                  <div>
                    <label style={{ 
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1A1A1A',
                      marginBottom: '8px'
                    }}>
                      口座名義
                    </label>
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="ヤマダ タロウ"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '15px',
                        border: '1px solid #D1D1D1',
                        borderRadius: '8px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        backgroundColor: '#FFFFFF',
                        color: '#1A1A1A'
                      }}
                      onFocusCapture={(e) => {
                        e.target.style.borderColor = '#1A1A1A'
                        e.target.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.05)'
                      }}
                      onBlurCapture={(e) => {
                        e.target.style.borderColor = '#D1D1D1'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                    <div style={{ fontSize: '12px', color: '#9B9B9B', marginTop: '6px' }}>
                      カタカナで入力してください（姓と名の間にスペース）
                    </div>
                  </div>

                  {/* ボタン */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      onClick={handleSaveBankAccount}
                      disabled={processing}
                      style={{
                        flex: 1,
                        padding: '14px 24px',
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        backgroundColor: processing ? '#9B9B9B' : '#1A1A1A',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!processing) e.currentTarget.style.backgroundColor = '#333333'
                      }}
                      onMouseLeave={(e) => {
                        if (!processing) e.currentTarget.style.backgroundColor = '#1A1A1A'
                      }}
                    >
                      {processing ? '保存中...' : bankAccount ? '更新する' : '登録する'}
                    </button>
                    <button
                      onClick={() => router.push('/wallet/earnings')}
                      disabled={processing}
                      style={{
                        flex: 1,
                        padding: '14px 24px',
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#1A1A1A',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D1D1D1',
                        borderRadius: '8px',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!processing) e.currentTarget.style.backgroundColor = '#F9F9F9'
                      }}
                      onMouseLeave={(e) => {
                        if (!processing) e.currentTarget.style.backgroundColor = '#FFFFFF'
                      }}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>

              {/* 削除ボタン（編集時のみ） */}
              {bankAccount && (
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <button
                    onClick={async () => {
                      if (confirm('本当に口座情報を削除しますか？')) {
                        const { error } = await supabase
                          .from('bank_accounts')
                          .delete()
                          .eq('id', bankAccount.id)

                        if (error) {
                          alert('削除に失敗しました')
                        } else {
                          alert('口座情報を削除しました')
                          router.push('/wallet/earnings')
                        }
                      }
                    }}
                    style={{ 
                      fontSize: '13px',
                      color: '#9B9B9B', 
                      border: 'none', 
                      background: 'none', 
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: '8px',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#6B6B6B'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9B9B9B'}
                  >
                    口座情報を削除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            to { transform: translateY(-50%) rotate(360deg); }
          }
        `
      }} />
    </>
  )
}