'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LoadingSpinner } from '@/app/components/Skeleton'
import styles from './page.module.css'

export default function AccountClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  // アカウント種別
  const [accountType, setAccountType] = useState<'casual' | 'business'>('casual')
  const [currentAccountType, setCurrentAccountType] = useState<'casual' | 'business'>('casual')

  // ビジネス情報
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

  // バリデーションエラー
  const [lastNameKanaError, setLastNameKanaError] = useState('')
  const [firstNameKanaError, setFirstNameKanaError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [postalCodeError, setPostalCodeError] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const businessSectionRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUser(user)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      setAccountType(profileData.account_type || 'casual')
      setCurrentAccountType(profileData.account_type || 'casual')

      if (profileData.account_type === 'business') {
        const { data: businessData } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('profile_id', profileData.id)
          .single()

        if (businessData) {
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
        }
      }
    }

    setLoading(false)
  }

  // ビジネス利用を選択した時にスクロール
  useEffect(() => {
    if (accountType === 'business' && currentAccountType === 'casual' && businessSectionRef.current) {
      setTimeout(() => {
        businessSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [accountType])

  // バリデーション
  const validateKana = (value: string, setError: (error: string) => void) => {
    if (!value) { setError(''); return true }
    const hiraganaRegex = /^[\u3040-\u309F\s]*$/
    if (!hiraganaRegex.test(value)) { setError('ひらがなで入力してください'); return false }
    setError('')
    return true
  }

  const validatePhone = (value: string) => {
    if (!value) { setPhoneError(''); return true }
    if (!/^[0-9]*$/.test(value)) { setPhoneError('数字のみで入力してください'); return false }
    setPhoneError('')
    return true
  }

  const validatePostalCode = (value: string) => {
    if (!value) { setPostalCodeError(''); return true }
    if (!/^[0-9]*$/.test(value)) { setPostalCodeError('数字のみで入力してください'); return false }
    setPostalCodeError('')
    return true
  }

  const isBusinessInfoComplete = () => {
    const basicComplete = lastName && firstName && lastNameKana && firstNameKana &&
      phone && postalCode && prefecture && address1 &&
      !lastNameKanaError && !firstNameKanaError && !phoneError && !postalCodeError

    if (businessAccountType === 'corporate') {
      return basicComplete && companyName
    }
    return basicComplete
  }

  const handleAccountTypeChange = (newType: 'casual' | 'business') => {
    setAccountType(newType)
  }

  // 保存
  const handleSave = async () => {
    if (!user || !profile) return

    setSaving(true)
    setError('')
    setSuccess('')

    if (accountType === 'business' && !isBusinessInfoComplete()) {
      setError('ビジネス情報を全て入力してください')
      setSaving(false)
      businessSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    // アカウント種別を更新
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        account_type: accountType,
        can_receive_work: accountType === 'business',
        can_request_work: accountType === 'business',
      })
      .eq('user_id', user.id)

    if (profileError) {
      setError(profileError.message)
      setSaving(false)
      return
    }

    // ビジネス情報保存
    if (accountType === 'business') {
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
      if (businessAccountType === 'corporate' && companyName) {
        businessData.company_name = companyName
      }

      const { error: businessError } = await supabase
        .from('business_profiles')
        .upsert(businessData, { onConflict: 'profile_id' })

      if (businessError) {
        setError(businessError.message)
        setSaving(false)
        return
      }
    }

    setSuccess('アカウント情報を保存しました')
    setSaving(false)
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>アカウント情報</h2>
          <p className={styles.cardDesc}>アカウント種別とビジネス情報を管理します</p>
        </div>

        {/* ユーザーID */}
        {profile?.username && (
          <div className="form-group">
            <label className="form-label">ユーザーID</label>
            <div className={styles.readonlyField}>
              @{profile.username}
            </div>
            <p className={styles.hint}>ユーザーIDは変更できません</p>
          </div>
        )}

        {/* アカウント種別 */}
        <div className="form-group">
          <label className="form-label">アカウント種別</label>

          <div className={styles.accountTypeOptions}>
            <label className={`radio ${currentAccountType === 'business' ? styles.disabled : ''}`}>
              <input
                type="radio"
                name="accountType"
                value="casual"
                checked={accountType === 'casual'}
                onChange={(e) => handleAccountTypeChange(e.target.value as 'casual')}
                disabled={currentAccountType === 'business'}
              />
              <span className="radio-mark"></span>
              <span className={styles.accountTypeContent}>
                <span className={styles.accountTypeTitle}>一般利用</span>
                <span className={styles.accountTypeDesc}>
                  趣味で作品を投稿したり、他のクリエイターの作品を楽しむ
                </span>
              </span>
            </label>

            <label className="radio">
              <input
                type="radio"
                name="accountType"
                value="business"
                checked={accountType === 'business'}
                onChange={(e) => handleAccountTypeChange(e.target.value as 'business')}
              />
              <span className="radio-mark"></span>
              <span className={styles.accountTypeContent}>
                <span className={styles.accountTypeTitle}>ビジネス利用</span>
                <span className={styles.accountTypeDesc}>
                  仕事の受発注、報酬の受け取りなどビジネスとして利用する
                </span>
              </span>
            </label>
          </div>

          {currentAccountType === 'business' && (
            <p className={styles.hint}>
              ※ ビジネスアカウントから一般アカウントへの変更はできません
            </p>
          )}
        </div>

        {/* ビジネス情報 */}
        {accountType === 'business' && (
          <div ref={businessSectionRef} className={styles.businessSection}>
            <h3 className={styles.businessTitle}>ビジネス情報</h3>
            <p className={styles.businessDesc}>取引に必要な情報を入力してください</p>

            {/* 個人/法人 */}
            <div className="form-group">
              <label className="form-label">
                個人/法人 <span className={styles.required}>*</span>
              </label>
              <div className={styles.toggleGroup}>
                <button
                  type="button"
                  onClick={() => setBusinessAccountType('individual')}
                  className={`${styles.toggleBtn} ${businessAccountType === 'individual' ? styles.active : ''}`}
                >
                  個人
                </button>
                <button
                  type="button"
                  onClick={() => setBusinessAccountType('corporate')}
                  className={`${styles.toggleBtn} ${businessAccountType === 'corporate' ? styles.active : ''}`}
                >
                  法人
                </button>
              </div>
            </div>

            {/* 氏名 */}
            <div className="form-group">
              <label className="form-label">
                氏名 <span className={styles.required}>*</span>
              </label>
              <div className={styles.formRow}>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="姓" required className="form-input" />
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="名" required className="form-input" />
              </div>
            </div>

            {/* 氏名かな */}
            <div className="form-group">
              <label className="form-label">
                氏名(かな) <span className={styles.required}>*</span>
              </label>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <input
                    type="text"
                    value={lastNameKana}
                    onChange={(e) => { setLastNameKana(e.target.value); validateKana(e.target.value, setLastNameKanaError) }}
                    placeholder="せい"
                    required
                    className={`form-input ${lastNameKanaError ? 'error' : ''}`}
                  />
                  {lastNameKanaError && <p className="form-error"><i className="fa-solid fa-circle-exclamation"></i> {lastNameKanaError}</p>}
                </div>
                <div className={styles.formField}>
                  <input
                    type="text"
                    value={firstNameKana}
                    onChange={(e) => { setFirstNameKana(e.target.value); validateKana(e.target.value, setFirstNameKanaError) }}
                    placeholder="めい"
                    required
                    className={`form-input ${firstNameKanaError ? 'error' : ''}`}
                  />
                  {firstNameKanaError && <p className="form-error"><i className="fa-solid fa-circle-exclamation"></i> {firstNameKanaError}</p>}
                </div>
              </div>
            </div>

            {/* 会社名（法人のみ） */}
            {businessAccountType === 'corporate' && (
              <div className="form-group">
                <label className="form-label">
                  会社名 <span className={styles.required}>*</span>
                </label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="株式会社○○" required className="form-input" />
              </div>
            )}

            {/* 電話番号 */}
            <div className="form-group">
              <label className="form-label">
                電話番号 <span className={styles.required}>*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); validatePhone(e.target.value) }}
                placeholder="09012345678"
                required
                maxLength={11}
                className={`form-input ${phoneError ? 'error' : ''}`}
              />
              {phoneError && <p className="form-error"><i className="fa-solid fa-circle-exclamation"></i> {phoneError}</p>}
            </div>

            {/* 郵便番号 */}
            <div className="form-group">
              <label className="form-label">
                郵便番号 <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => { setPostalCode(e.target.value); validatePostalCode(e.target.value) }}
                placeholder="1234567"
                required
                maxLength={7}
                className={`form-input ${postalCodeError ? 'error' : ''}`}
              />
              {postalCodeError && <p className="form-error"><i className="fa-solid fa-circle-exclamation"></i> {postalCodeError}</p>}
            </div>

            {/* 都道府県 */}
            <div className="form-group">
              <label className="form-label">
                都道府県 <span className={styles.required}>*</span>
              </label>
              <select value={prefecture} onChange={(e) => setPrefecture(e.target.value)} required className="form-input">
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

            {/* 住所 */}
            <div className="form-group">
              <label className="form-label">
                住所(番地まで) <span className={styles.required}>*</span>
              </label>
              <input type="text" value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="○○市○○町1-2-3" required className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">住所(建物名など)</label>
              <input type="text" value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="○○マンション101号室" className="form-input" />
            </div>
          </div>
        )}

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="alert alert-error">
            <i className="fa-solid fa-circle-xmark alert-icon"></i>
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <i className="fa-solid fa-circle-check alert-icon"></i>
            {success}
          </div>
        )}

        {/* ボタン */}
        <div className={styles.actions}>
          <Link href="/dashboard" className="btn btn-secondary">
            キャンセル
          </Link>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? '保存中...' : '変更を保存'}
          </button>
        </div>
      </div>
    </div>
  )
}