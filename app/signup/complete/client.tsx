'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'

// props の型定義
type Props = {
  user: User
}
import { useRouter, useSearchParams } from 'next/navigation'

type UserType = 'casual' | 'business'
type Step = 'userType' | 'basicInfo' | 'businessInfo' | 'confirm'

export function SignupCompleteClient({ user }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URLパラメータからステップを取得
  const stepFromUrl = (searchParams.get('step') as Step) || 'userType'
  const [step, setStep] = useState<Step>(stepFromUrl)
  const [userType, setUserType] = useState<UserType | null>(null)
  
  // 基本情報
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  
  // ビジネス利用の追加情報（姓名分離）
  const [accountType, setAccountType] = useState<'individual' | 'corporate'>('individual')
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
  
  const [usernameCheck, setUsernameCheck] = useState<{
    checking: boolean
    available: boolean | null
    error: string
  }>({ checking: false, available: null, error: '' })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // ステップを変更してURLも更新
  const changeStep = (newStep: Step) => {
    setStep(newStep)
    router.push(`/signup/complete?step=${newStep}`, { scroll: false })
  }

  // URLパラメータが変更されたらステップを同期
  useEffect(() => {
    const stepFromUrl = (searchParams.get('step') as Step) || 'userType'
    setStep(stepFromUrl)
  }, [searchParams])

  // 表示名の自動入力
  useEffect(() => {
    if (user.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name)
    }
  }, [])

  useEffect(() => {
    if (!username) {
      setUsernameCheck({ checking: false, available: null, error: '' })
      return
    }

    const timer = setTimeout(async () => {
      setUsernameCheck({ checking: true, available: null, error: '' })

      try {
        const res = await fetch('/api/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        })

        const data = await res.json()

        setUsernameCheck({
          checking: false,
          available: data.available,
          error: data.error || '',
        })
      } catch (error) {
        setUsernameCheck({
          checking: false,
          available: false,
          error: 'エラーが発生しました',
        })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [username])

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

  // 基本情報の入力チェック（修正版）
  const isBasicInfoComplete = () => {
    // OAuthユーザー(Google, Twitter, Discord)はパスワード不要
    // メールユーザーは既にパスワード設定済み(signup時に設定)
    return username && 
          displayName && 
          usernameCheck.available === true
  }

  // ビジネス情報の入力チェック
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
    
    if (accountType === 'corporate') {
      return basicComplete && companyName
    }
    return basicComplete
  }

  const handleSubmit = async () => {
    
    setLoading(true)
    setError('')

    // 🔒 userType が設定されているか確認
    if (!userType) {
      setError('利用方法を選択してください')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      
      // セッション確認
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        throw new Error('セッションが切れています。もう一度ログインしてください。')
      }

      if (!usernameCheck.available) {
        throw new Error('ユーザーIDをご確認ください')
      }

      // パスワード更新処理は完全に削除
      // OAuthユーザーはパスワード不要
      // メールユーザーは既にパスワード設定済み

      // 🔒 プロフィール登録前に再度チェック（競合防止）
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id, username, account_type')
        .eq('user_id', currentUser.id)
        .maybeSingle()

      if (existingProfile && existingProfile.account_type) {
        // プロフィールが完成している場合のみリダイレクト
        router.push('/dashboard')
        return
      }

      // プロフィールデータ作成
      const profileData: any = {
        user_id: currentUser.id,
        username: username.toLowerCase(),
        display_name: displayName,
        account_type: userType,
        can_receive_work: userType === 'business',
        can_request_work: userType === 'business',
      }

      // 🔒 プロフィール登録（競合エラーハンドリング）
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' })
        .select()
        .single()

      if (profileError) {
        // 🔒 UNIQUE制約違反の処理
        if (profileError.code === '23505') {
          // PostgreSQL UNIQUE violation
          if (profileError.message.includes('username')) {
            throw new Error('このユーザーIDは既に使用されています。別のユーザーIDをお試しください。')
          } else {
            throw new Error('既にプロフィールが登録されています。ページを更新してください。')
          }
        }
        throw profileError
      }

      // ビジネス情報の登録
      if (userType === 'business') {
        const businessData: any = {
          profile_id: profile.id,
          account_type: accountType,
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

        if (accountType === 'corporate' && companyName) {
          businessData.company_name = companyName
        }

        // 🔒 ビジネスプロフィール登録（競合エラーハンドリング）
        const { error: businessError } = await supabase
          .from('business_profiles')
          .upsert(businessData, { onConflict: 'profile_id' })

        if (businessError) {
          // 🔒 UNIQUE制約違反の処理
          if (businessError.code === '23505') {
            throw new Error('既にビジネス情報が登録されています。ページを更新してください。')
          }
          throw businessError
        }
      }

      // 🔒 登録完了後、ダッシュボードへリダイレクト
      window.location.href = '/dashboard'
      
    } catch (error: any) {
      console.error('Profile registration error:', {
        message: error?.message,
        code: error?.code,
      })
      setError(error.message || '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="signup-complete-page">
        <div className="signup-complete-loading">読み込み中...</div>
      </div>
    )
  }

  // ステップインジケーター
  const StepIndicator = () => {
    if (step === 'userType' || userType === 'casual') {
      return null
    }

    const steps = ['基本情報', 'ビジネス情報', '確認']
    
    const currentStepIndex = 
      step === 'basicInfo' ? 0 :
      step === 'businessInfo' ? 1 : 2

    const currentStep = currentStepIndex + 1
    const totalSteps = steps.length

    return (
      <>
        <div className="desktop-indicator">
          {steps.map((label, index) => (
            <div key={index} className="step-group">
              <div className="step-item">
                <div className={`step-number ${index <= currentStepIndex ? 'active' : ''}`}>
                  {index < currentStepIndex ? '✓' : index + 1}
                </div>
                <span className={`step-text ${index <= currentStepIndex ? 'active' : ''}`}>
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`step-line ${index < currentStepIndex ? 'active' : ''}`} />
              )}
            </div>
          ))}
        </div>

        <div className="mobile-indicator">
          <div className="progress-info">
            <span className="current-step-label">{steps[currentStepIndex]}</span>
            <span className="step-counter">{currentStep}/{totalSteps}</span>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </>
    )
  }

  // Step 1: 利用方法選択
  if (step === 'userType') {
    return (
      <div className="signup-complete-page">
        <div className="signup-complete-container signup-complete-container-wide">
          <StepIndicator />
          
          <h1 className="signup-complete-title">利用方法を選択</h1>
          <p className="signup-complete-subtitle">同人ワークスをどのように利用しますか?</p>

          <div className="user-type-grid">
            <button
              onClick={() => {
                setUserType('casual')
                changeStep('basicInfo')
              }}
              className="user-type-card"
            >
              <div className="user-type-card-content">
                <div className="user-type-card-text">
                  <div className="user-type-card-title">一般利用</div>
                  <div className="user-type-card-description">
                    趣味で作品を投稿したり、他のクリエイターの作品を楽しむ
                  </div>
                </div>
                <div className="user-type-card-image">
                  {/* 挿絵をここに配置 */}
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setUserType('business')
                changeStep('basicInfo')
              }}
              className="user-type-card"
            >
              <div className="user-type-card-content">
                <div className="user-type-card-text">
                  <div className="user-type-card-title">ビジネス利用</div>
                  <div className="user-type-card-description">
                    仕事の受発注、報酬の受け取りなどビジネスとして利用する
                  </div>
                </div>
                <div className="user-type-card-image">
                  {/* 挿絵をここに配置 */}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: 基本情報入力
  if (step === 'basicInfo') {
    return (
      <div className="signup-complete-page">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <div className="signup-complete-container">
          <h1 className="signup-complete-title">基本情報の入力</h1>
          <p className="signup-complete-subtitle">アカウント情報を設定してください</p>
          
          <StepIndicator />

          <div className="signup-complete-card">
            <form onSubmit={(e) => {
              e.preventDefault()
              if (userType === 'business') {
                changeStep('businessInfo')
              } else {
                changeStep('confirm')
              }
            }}>
              <div className="signup-complete-form-group">
                <label className="signup-complete-label">
                  メールアドレス
                  <span className="signup-complete-readonly-badge">
                    <i className="fas fa-lock"></i> 変更不可
                  </span>
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="signup-complete-input disabled"
                />
              </div>

              <div className="signup-complete-form-group">
                <label className="signup-complete-label">
                  ユーザーID <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="doujinworks"
                  required
                  autoComplete="off"
                  className="signup-complete-input"
                />
                <div className="signup-complete-hint">
                  4〜20文字 / 英数字とアンダースコア(_)のみ
                </div>
                {username && (
                  <div className="signup-complete-validation">
                    {usernameCheck.checking && (
                      <span className="checking">確認中...</span>
                    )}
                    {!usernameCheck.checking && usernameCheck.available === true && (
                      <span className="available">
                        <i className="fas fa-check-circle"></i> 利用可能です
                      </span>
                    )}
                    {!usernameCheck.checking && usernameCheck.available === false && (
                      <span className="unavailable">
                        <i className="fas fa-times-circle"></i> {usernameCheck.error}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="signup-complete-form-group">
                <label className="signup-complete-label">
                  表示名 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="同人ワークス"
                  required
                  className="signup-complete-input"
                />
              </div>

              {error && (
                <div className="auth-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              <div className="signup-complete-buttons">
                <button
                  type="button"
                  onClick={() => changeStep('userType')}
                  className="signup-complete-btn secondary"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={!isBasicInfoComplete()}
                  className={`signup-complete-btn primary ${!isBasicInfoComplete() ? 'disabled' : ''}`}
                >
                  {userType === 'business' ? '次へ' : '内容確認'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: ビジネス情報入力
  if (step === 'businessInfo') {
    return (
      <div className="signup-complete-page">
        <div className="signup-complete-container">
          <h1 className="signup-complete-title">ビジネス情報の入力</h1>
          <p className="signup-complete-subtitle">取引に必要な情報を入力してください</p>
          
          <StepIndicator />

          <div className="signup-complete-card">
            <form onSubmit={(e) => {
              e.preventDefault()
              changeStep('confirm')
            }}>
              <div className="signup-complete-form-group">
                <label className="signup-complete-label">
                  個人/法人 <span className="required">*</span>
                </label>
                <div className="signup-complete-toggle-group">
                  <button
                    type="button"
                    onClick={() => setAccountType('individual')}
                    className={`signup-complete-toggle ${accountType === 'individual' ? 'active' : ''}`}
                  >
                    個人
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('corporate')}
                    className={`signup-complete-toggle ${accountType === 'corporate' ? 'active' : ''}`}
                  >
                    法人
                  </button>
                </div>
              </div>

              {/* 姓名（横並び） */}
              <div className="signup-complete-form-group">
                <label className="signup-complete-label">
                  氏名 <span className="required">*</span>
                </label>
                <div className="signup-complete-row">
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="姓"
                    required
                    className="signup-complete-input"
                  />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="名"
                    required
                    className="signup-complete-input"
                  />
                </div>
              </div>

              {/* 姓名かな（横並び） */}
              <div className="signup-complete-form-group">
                <label className="signup-complete-label">
                  氏名(かな) <span className="required">*</span>
                </label>
                <div className="signup-complete-row">
                  <div className="signup-complete-field">
                    <input
                      type="text"
                      value={lastNameKana}
                      onChange={(e) => {
                        setLastNameKana(e.target.value)
                        validateKana(e.target.value, setLastNameKanaError)
                      }}
                      placeholder="せい"
                      required
                      className={`signup-complete-input ${lastNameKanaError ? 'error' : ''}`}
                    />
                    {lastNameKanaError && (
                      <div className="signup-complete-field-error">{lastNameKanaError}</div>
                    )}
                  </div>
                  <div className="signup-complete-field">
                    <input
                      type="text"
                      value={firstNameKana}
                      onChange={(e) => {
                        setFirstNameKana(e.target.value)
                        validateKana(e.target.value, setFirstNameKanaError)
                      }}
                      placeholder="めい"
                      required
                      className={`signup-complete-input ${firstNameKanaError ? 'error' : ''}`}
                    />
                    {firstNameKanaError && (
                      <div className="signup-complete-field-error">{firstNameKanaError}</div>
                    )}
                  </div>
                </div>
              </div>

              {accountType === 'corporate' && (
                <div className="signup-complete-form-group">
                  <label className="signup-complete-label">
                    会社名 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="株式会社○○"
                    required
                    className="signup-complete-input"
                  />
                </div>
              )}

              <div className="signup-complete-form-group">
                <label className="signup-complete-label">
                  電話番号 <span className="required">*</span>
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
                  className={`signup-complete-input ${phoneError ? 'error' : ''}`}
                />
                {phoneError && (
                  <div className="signup-complete-field-error">{phoneError}</div>
                )}
              </div>

              <div className="signup-complete-form-group">
                <label className="signup-complete-label">
                  郵便番号 <span className="required">*</span>
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
                  className={`signup-complete-input ${postalCodeError ? 'error' : ''}`}
                />
                {postalCodeError && (
                  <div className="signup-complete-field-error">{postalCodeError}</div>
                )}
              </div>

              <div className="signup-complete-form-group">
                <label className="signup-complete-label">
                  都道府県 <span className="required">*</span>
                </label>
                <select
                  value={prefecture}
                  onChange={(e) => setPrefecture(e.target.value)}
                  required
                  className="signup-complete-select"
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

              <div className="signup-complete-form-group">
                <label className="signup-complete-label">
                  住所(番地まで) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="○○市○○町1-2-3"
                  required
                  className="signup-complete-input"
                />
              </div>

              <div className="signup-complete-form-group">
                <label className="signup-complete-label">住所(建物名など)</label>
                <input
                  type="text"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="○○マンション101号室"
                  className="signup-complete-input"
                />
              </div>

              {error && (
                <div className="auth-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              <div className="signup-complete-buttons">
                <button
                  type="button"
                  onClick={() => changeStep('basicInfo')}
                  className="signup-complete-btn secondary"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={!isBusinessInfoComplete()}
                  className={`signup-complete-btn primary ${!isBusinessInfoComplete() ? 'disabled' : ''}`}
                >
                  内容確認
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: 確認ページ
  if (step === 'confirm') {
    return (
      <div className="signup-complete-page">
        <div className="signup-complete-container">
          <h1 className="signup-complete-title">入力内容の確認</h1>
          <p className="signup-complete-subtitle">内容をご確認の上、登録を完了してください</p>
          
          <StepIndicator />

          <div className="signup-complete-card">
            
            {/* 基本情報 */}
            <div className="signup-complete-section">
              <h2 className="signup-complete-section-title">基本情報</h2>
              <div className="signup-complete-confirm-list">
                <div className="signup-complete-confirm-item">
                  <span className="confirm-label">利用方法</span>
                  <span className="confirm-value">
                    {userType === 'casual' ? '一般利用' : 'ビジネス利用'}
                  </span>
                </div>
                <div className="signup-complete-confirm-item">
                  <span className="confirm-label">メールアドレス</span>
                  <span className="confirm-value">{user?.email}</span>
                </div>
                <div className="signup-complete-confirm-item">
                  <span className="confirm-label">ユーザーID</span>
                  <span className="confirm-value">{username}</span>
                </div>
                <div className="signup-complete-confirm-item">
                  <span className="confirm-label">表示名</span>
                  <span className="confirm-value">{displayName}</span>
                </div>
                {user?.app_metadata?.provider === 'email' && (
                  <div className="signup-complete-confirm-item no-border">
                    <span className="confirm-label">パスワード</span>
                    <span className="confirm-value">設定済み</span>
                  </div>
                )}
              </div>
            </div>

            {/* ビジネス情報 */}
            {userType === 'business' && (
              <div className="signup-complete-section">
                <h2 className="signup-complete-section-title">ビジネス情報</h2>
                <div className="signup-complete-confirm-list">
                  <div className="signup-complete-confirm-item">
                    <span className="confirm-label">個人/法人</span>
                    <span className="confirm-value">
                      {accountType === 'individual' ? '個人' : '法人'}
                    </span>
                  </div>
                  <div className="signup-complete-confirm-item">
                    <span className="confirm-label">氏名</span>
                    <span className="confirm-value">{lastName} {firstName}</span>
                  </div>
                  <div className="signup-complete-confirm-item">
                    <span className="confirm-label">氏名(かな)</span>
                    <span className="confirm-value">{lastNameKana} {firstNameKana}</span>
                  </div>
                  {accountType === 'corporate' && companyName && (
                    <div className="signup-complete-confirm-item">
                      <span className="confirm-label">会社名</span>
                      <span className="confirm-value">{companyName}</span>
                    </div>
                  )}
                  <div className="signup-complete-confirm-item">
                    <span className="confirm-label">電話番号</span>
                    <span className="confirm-value">{phone}</span>
                  </div>
                  <div className="signup-complete-confirm-item no-border">
                    <span className="confirm-label">住所</span>
                    <span className="confirm-value" style={{ textAlign: 'right' }}>
                      〒{postalCode}<br />
                      {prefecture}{address1}{address2 && ` ${address2}`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="auth-error">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <div className="signup-complete-buttons">
              <button
                type="button"
                onClick={() => changeStep(userType === 'business' ? 'businessInfo' : 'basicInfo')}
                className="signup-complete-btn secondary"
              >
                戻る
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`signup-complete-btn primary ${loading ? 'disabled' : ''}`}
              >
                {loading ? '登録中...' : '登録完了'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}