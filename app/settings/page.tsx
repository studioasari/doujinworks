'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import DashboardSidebar from '../components/DashboardSidebar'

type Profile = {
  id: string
  user_id: string
  username: string | null
  display_name: string | null
  account_type: string | null
}

type BusinessProfile = {
  id: string
  profile_id: string
  account_type: string | null
  last_name: string | null
  first_name: string | null
  last_name_kana: string | null
  first_name_kana: string | null
  company_name: string | null
  phone: string | null
  postal_code: string | null
  prefecture: string | null
  address1: string | null
  address2: string | null
  birth_date: string | null
  gender: string | null
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  
  // ビジネス情報（姓名分離）
  const [businessAccountType, setBusinessAccountType] = useState<'individual' | 'corporate'>('individual')
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastNameKana, setLastNameKana] = useState('')
  const [firstNameKana, setFirstNameKana] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [prefecture, setPrefecture] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  
  // バリデーションエラー
  const [lastNameKanaError, setLastNameKanaError] = useState('')
  const [firstNameKanaError, setFirstNameKanaError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [postalCodeError, setPostalCodeError] = useState('')
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    setUser(user)

    // プロフィール取得
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)

      // ビジネスプロフィール取得
      const { data: businessData } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('profile_id', profileData.id)
        .single()

      if (businessData) {
        setBusinessProfile(businessData)
        setBusinessAccountType(businessData.account_type || 'individual')
        setLastName(businessData.last_name || '')
        setFirstName(businessData.first_name || '')
        setLastNameKana(businessData.last_name_kana || '')
        setFirstNameKana(businessData.first_name_kana || '')
        setCompanyName(businessData.company_name || '')
        setPhone(businessData.phone || '')
        setPostalCode(businessData.postal_code || '')
        setPrefecture(businessData.prefecture || '')
        setAddress1(businessData.address1 || '')
        setAddress2(businessData.address2 || '')
        setBirthDate(businessData.birth_date || '')
        setGender(businessData.gender || '')
      }
    }

    setLoading(false)
  }

  // バリデーション関数
  const validateKana = (value: string, setError: (error: string) => void) => {
    if (!value) {
      setError('')
      return true
    }
    const hiraganaRegex = /^[\u3040-\u309F\s]*$/
    if (!hiraganaRegex.test(value)) {
      setError('ひらがなで入力してください')
      return false
    }
    setError('')
    return true
  }

  const validatePhone = (value: string) => {
    if (!value) {
      setPhoneError('')
      return true
    }
    const numberRegex = /^[0-9]*$/
    if (!numberRegex.test(value)) {
      setPhoneError('数字のみで入力してください')
      return false
    }
    setPhoneError('')
    return true
  }

  const validatePostalCode = (value: string) => {
    if (!value) {
      setPostalCodeError('')
      return true
    }
    const numberRegex = /^[0-9]*$/
    if (!numberRegex.test(value)) {
      setPostalCodeError('数字のみで入力してください')
      return false
    }
    setPostalCodeError('')
    return true
  }

  // 入力チェック
  const isBusinessInfoComplete = () => {
    const basicComplete = lastName && 
                         firstName &&
                         lastNameKana && 
                         firstNameKana &&
                         phone && 
                         postalCode && 
                         prefecture && 
                         address1 &&
                         !lastNameKanaError &&
                         !firstNameKanaError &&
                         !phoneError &&
                         !postalCodeError
    
    if (businessAccountType === 'corporate') {
      return basicComplete && companyName
    }
    return basicComplete
  }

  // ビジネス情報保存
  const handleSave = async () => {
    if (!profile) return
    
    setSaving(true)
    setError('')
    setSuccess('')

    const businessData: any = {
      profile_id: profile.id,
      account_type: businessAccountType,
      last_name: lastName,
      first_name: firstName,
      last_name_kana: lastNameKana,
      first_name_kana: firstNameKana,
      phone,
      postal_code: postalCode,
      prefecture,
      address1,
    }

    if (address2) businessData.address2 = address2
    if (businessAccountType === 'individual') {
      if (birthDate) businessData.birth_date = birthDate
      if (gender) businessData.gender = gender
    }
    if (businessAccountType === 'corporate' && companyName) {
      businessData.company_name = companyName
    }

    const { error } = await supabase
      .from('business_profiles')
      .upsert(businessData, { onConflict: 'profile_id' })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      setSuccess('ビジネス情報を保存しました')
      setSaving(false)
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
          <div className="loading-state">
            読み込み中...
          </div>
        </div>
        <Footer />
      </>
    )
  }

  // 一般アカウントの場合は設定がない旨を表示
  if (profile?.account_type !== 'business') {
    return (
      <>
        <Header />
        <div style={{ 
          minHeight: '100vh', 
          backgroundColor: '#FFFFFF',
          display: 'flex'
        }}>
          <DashboardSidebar />

          <main style={{ flex: 1, padding: '40px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <h1 className="page-title mb-40">設定</h1>

              <div className="card-no-hover p-40">
                <div className="empty-state">
                  <p className="text-small text-gray mb-16">
                    ビジネスアカウントに切り替えると、ビジネス情報の設定が可能になります。
                  </p>
                  <Link href="/profile" className="btn-primary">
                    プロフィール編集へ
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#FFFFFF',
        display: 'flex'
      }}>
        <DashboardSidebar />

        <main style={{ flex: 1, padding: '40px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="page-title mb-40">設定</h1>

            <div className="card-no-hover p-40">
              <h2 className="section-title mb-32">ビジネス情報</h2>

              {/* 個人/法人 */}
              <div className="mb-24">
                <label className="form-label mb-12">
                  個人/法人 <span className="form-required">*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setBusinessAccountType('individual')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: businessAccountType === 'individual' ? '#FFFFFF' : '#6B6B6B',
                      backgroundColor: businessAccountType === 'individual' ? '#1A1A1A' : '#FFFFFF',
                      border: `1px solid ${businessAccountType === 'individual' ? '#1A1A1A' : '#D1D5DB'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    個人
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusinessAccountType('corporate')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: businessAccountType === 'corporate' ? '#FFFFFF' : '#6B6B6B',
                      backgroundColor: businessAccountType === 'corporate' ? '#1A1A1A' : '#FFFFFF',
                      border: `1px solid ${businessAccountType === 'corporate' ? '#1A1A1A' : '#D1D5DB'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    法人
                  </button>
                </div>
              </div>

              {/* 氏名（横並び） */}
              <div className="mb-24">
                <label className="form-label">
                  氏名 <span className="form-required">*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="姓"
                    required
                    className="input-field"
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="名"
                    required
                    className="input-field"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              {/* 氏名かな（横並び） */}
              <div className="mb-24">
                <label className="form-label">
                  氏名(かな) <span className="form-required">*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={lastNameKana}
                      onChange={(e) => {
                        setLastNameKana(e.target.value)
                        validateKana(e.target.value, setLastNameKanaError)
                      }}
                      placeholder="せい"
                      required
                      className="input-field"
                      style={{
                        width: '100%',
                        borderColor: lastNameKanaError ? '#EF4444' : undefined
                      }}
                    />
                    {lastNameKanaError && (
                      <div className="text-tiny" style={{ marginTop: '6px', color: '#EF4444' }}>
                        {lastNameKanaError}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={firstNameKana}
                      onChange={(e) => {
                        setFirstNameKana(e.target.value)
                        validateKana(e.target.value, setFirstNameKanaError)
                      }}
                      placeholder="めい"
                      required
                      className="input-field"
                      style={{
                        width: '100%',
                        borderColor: firstNameKanaError ? '#EF4444' : undefined
                      }}
                    />
                    {firstNameKanaError && (
                      <div className="text-tiny" style={{ marginTop: '6px', color: '#EF4444' }}>
                        {firstNameKanaError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 会社名（法人のみ） */}
              {businessAccountType === 'corporate' && (
                <div className="mb-24">
                  <label className="form-label">
                    会社名 <span className="form-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="株式会社○○"
                    required
                    className="input-field"
                  />
                </div>
              )}

              {/* 電話番号 */}
              <div className="mb-24">
                <label className="form-label">
                  電話番号 <span className="form-required">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    validatePhone(e.target.value)
                  }}
                  placeholder="09012345678"
                  required
                  maxLength={11}
                  className="input-field"
                  style={{
                    borderColor: phoneError ? '#EF4444' : undefined
                  }}
                />
                {phoneError && (
                  <div className="text-tiny" style={{ marginTop: '6px', color: '#EF4444' }}>
                    {phoneError}
                  </div>
                )}
              </div>

              {/* 郵便番号 */}
              <div className="mb-24">
                <label className="form-label">
                  郵便番号 <span className="form-required">*</span>
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => {
                    setPostalCode(e.target.value)
                    validatePostalCode(e.target.value)
                  }}
                  placeholder="1234567"
                  required
                  maxLength={7}
                  className="input-field"
                  style={{
                    borderColor: postalCodeError ? '#EF4444' : undefined
                  }}
                />
                {postalCodeError && (
                  <div className="text-tiny" style={{ marginTop: '6px', color: '#EF4444' }}>
                    {postalCodeError}
                  </div>
                )}
              </div>

              {/* 都道府県 */}
              <div className="mb-24">
                <label className="form-label">
                  都道府県 <span className="form-required">*</span>
                </label>
                <select
                  value={prefecture}
                  onChange={(e) => setPrefecture(e.target.value)}
                  required
                  className="select-field"
                >
                  <option value="">選択してください</option>
                  <option value="北海道">北海道</option>
                  <option value="青森県">青森県</option>
                  <option value="岩手県">岩手県</option>
                  <option value="宮城県">宮城県</option>
                  <option value="秋田県">秋田県</option>
                  <option value="山形県">山形県</option>
                  <option value="福島県">福島県</option>
                  <option value="茨城県">茨城県</option>
                  <option value="栃木県">栃木県</option>
                  <option value="群馬県">群馬県</option>
                  <option value="埼玉県">埼玉県</option>
                  <option value="千葉県">千葉県</option>
                  <option value="東京都">東京都</option>
                  <option value="神奈川県">神奈川県</option>
                  <option value="新潟県">新潟県</option>
                  <option value="富山県">富山県</option>
                  <option value="石川県">石川県</option>
                  <option value="福井県">福井県</option>
                  <option value="山梨県">山梨県</option>
                  <option value="長野県">長野県</option>
                  <option value="岐阜県">岐阜県</option>
                  <option value="静岡県">静岡県</option>
                  <option value="愛知県">愛知県</option>
                  <option value="三重県">三重県</option>
                  <option value="滋賀県">滋賀県</option>
                  <option value="京都府">京都府</option>
                  <option value="大阪府">大阪府</option>
                  <option value="兵庫県">兵庫県</option>
                  <option value="奈良県">奈良県</option>
                  <option value="和歌山県">和歌山県</option>
                  <option value="鳥取県">鳥取県</option>
                  <option value="島根県">島根県</option>
                  <option value="岡山県">岡山県</option>
                  <option value="広島県">広島県</option>
                  <option value="山口県">山口県</option>
                  <option value="徳島県">徳島県</option>
                  <option value="香川県">香川県</option>
                  <option value="愛媛県">愛媛県</option>
                  <option value="高知県">高知県</option>
                  <option value="福岡県">福岡県</option>
                  <option value="佐賀県">佐賀県</option>
                  <option value="長崎県">長崎県</option>
                  <option value="熊本県">熊本県</option>
                  <option value="大分県">大分県</option>
                  <option value="宮崎県">宮崎県</option>
                  <option value="鹿児島県">鹿児島県</option>
                  <option value="沖縄県">沖縄県</option>
                </select>
              </div>

              {/* 住所(番地まで) */}
              <div className="mb-24">
                <label className="form-label">
                  住所(番地まで) <span className="form-required">*</span>
                </label>
                <input
                  type="text"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="○○市○○町1-2-3"
                  required
                  className="input-field"
                />
              </div>

              {/* 住所(建物名など) */}
              <div className="mb-32">
                <label className="form-label">
                  住所(建物名など)
                </label>
                <input
                  type="text"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="○○マンション101号室"
                  className="input-field"
                />
              </div>

              {/* エラー・成功メッセージ */}
              {error && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#FFF5F5',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  color: '#7F1D1D',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#F0F9F0',
                  border: '1px solid #C6E7C6',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  color: '#1A5D1A',
                  fontSize: '14px'
                }}>
                  {success}
                </div>
              )}

              {/* ボタン */}
              <div className="flex gap-12">
                <button
                  onClick={handleSave}
                  disabled={saving || !isBusinessInfoComplete()}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  {saving ? '保存中...' : '変更を保存'}
                </button>
                <Link
                  href="/dashboard"
                  className="btn-secondary"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  キャンセル
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}