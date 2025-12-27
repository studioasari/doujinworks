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
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#F5F6F8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#888888' }}>読み込み中...</div>
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

        <style jsx>{`
          .desktop-indicator {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 48px;
            padding: 0 20px;
          }

          .mobile-indicator {
            display: none;
          }

          .step-group {
            display: flex;
            align-items: center;
          }

          .step-item {
            display: flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
          }

          .step-number {
            min-width: 32px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: #D8DEE4;
            color: #888888;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 600;
            flex-shrink: 0;
            transition: all 0.2s;
          }

          .step-number.active {
            background-color: #5B7C99;
            color: #FFFFFF;
          }

          .step-text {
            font-size: 14px;
            color: #888888;
            font-weight: 400;
          }

          .step-text.active {
            color: #222222;
            font-weight: 600;
          }

          .step-line {
            width: 60px;
            height: 2px;
            background-color: #D8DEE4;
            margin: 0 16px;
            transition: all 0.2s;
          }

          .step-line.active {
            background-color: #5B7C99;
          }

          @media (max-width: 640px) {
            .desktop-indicator {
              display: none;
            }

            .mobile-indicator {
              display: block;
              margin-bottom: 32px;
              padding: 0 20px;
            }

            .progress-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            }

            .current-step-label {
              font-size: 14px;
              font-weight: 600;
              color: #222222;
            }

            .step-counter {
              font-size: 12px;
              font-weight: 500;
              color: #888888;
            }

            .progress-bar-container {
              width: 100%;
              height: 4px;
              background-color: #D8DEE4;
              border-radius: 2px;
              overflow: hidden;
            }

            .progress-bar-fill {
              height: 100%;
              background-color: #5B7C99;
              border-radius: 2px;
              transition: width 0.3s ease;
            }
          }
        `}</style>
      </>
    )
  }

  // Step 1: 利用方法選択
  if (step === 'userType') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#F5F6F8',
        padding: '48px 20px'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <StepIndicator />
          
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700',
            marginBottom: '12px',
            textAlign: 'center',
            color: '#222222'
          }}>
            利用方法を選択
          </h1>
          <p style={{ 
            textAlign: 'center',
            color: '#555555',
            marginBottom: '40px',
            fontSize: '14px'
          }}>
            同人ワークスをどのように利用しますか?
          </p>

          <div className="user-type-container">
            <button
              onClick={() => {
                setUserType('casual')
                changeStep('basicInfo')
              }}
              className="user-type-card"
            >
              <div className="card-content">
                <div className="card-text">
                  <div className="card-title">一般利用</div>
                  <div className="card-description">
                    趣味で作品を投稿したり、他のクリエイターの作品を楽しむ
                  </div>
                </div>
                <div className="card-image-placeholder">
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
              <div className="card-content">
                <div className="card-text">
                  <div className="card-title">ビジネス利用</div>
                  <div className="card-description">
                    仕事の受発注、報酬の受け取りなどビジネスとして利用する
                  </div>
                </div>
                <div className="card-image-placeholder">
                  {/* 挿絵をここに配置 */}
                </div>
              </div>
            </button>
          </div>

          <style jsx>{`
            .user-type-container {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }

            .user-type-card {
              padding: 24px;
              text-align: left;
              background-color: #FFFFFF;
              border: 2px solid #D0D5DA;
              border-radius: 12px;
              cursor: pointer;
              transition: all 0.2s;
              width: 100%;
            }

            .user-type-card:hover {
              border-color: #5B7C99;
              box-shadow: 0 2px 8px rgba(91, 124, 153, 0.1);
            }

            .card-content {
              display: flex;
              flex-direction: column;
              gap: 20px;
            }

            .card-text {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }

            .card-title {
              font-size: 18px;
              font-weight: 600;
              color: #222222;
            }

            .card-description {
              font-size: 14px;
              color: #555555;
              line-height: 1.6;
            }

            .card-image-placeholder {
              width: 200px;
              height: 200px;
              background-color: #D0D5DA;
              border-radius: 8px;
              margin: 0 auto;
            }

            @media (max-width: 768px) {
              .user-type-container {
                grid-template-columns: 1fr;
              }
            }
          `}</style>
        </div>
      </div>
    )
  }

  // Step 2: 基本情報入力
  if (step === 'basicInfo') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#F5F6F8',
        padding: '48px 20px'
      }}>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700',
            marginBottom: '12px',
            textAlign: 'center',
            color: '#222222'
          }}>
            基本情報の入力
          </h1>
          <p style={{ 
            textAlign: 'center',
            color: '#555555',
            marginBottom: '40px',
            fontSize: '14px'
          }}>
            アカウント情報を設定してください
          </p>
          
          <StepIndicator />

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #D0D5DA'
          }}>
            <form onSubmit={(e) => {
              e.preventDefault()
              if (userType === 'business') {
                changeStep('businessInfo')
              } else {
                changeStep('confirm')
              }
            }}>
              {user?.app_metadata?.provider !== 'email' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#222222',
                    marginBottom: '8px'
                  }}>
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #D0D5DA',
                      borderRadius: '8px',
                      outline: 'none',
                      color: '#888888',
                      backgroundColor: '#EEF0F3',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#222222',
                  marginBottom: '8px'
                }}>
                  ユーザーID <span style={{ color: '#C05656' }}>*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="doujinworks"
                  required
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D0D5DA',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    color: '#222222',
                    backgroundColor: '#FFFFFF'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#5B7C99'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D0D5DA'}
                />
                <div style={{ fontSize: '12px', color: '#888888', marginTop: '6px' }}>
                  4〜20文字 / 英数字とアンダースコア(_)のみ
                </div>
                {username && (
                  <div style={{ marginTop: '8px', fontSize: '13px' }}>
                    {usernameCheck.checking && (
                      <span style={{ color: '#888888' }}>確認中...</span>
                    )}
                    {!usernameCheck.checking && usernameCheck.available === true && (
                      <span style={{ color: '#4F8A6B' }}>
                        <i className="fas fa-check-circle"></i> 利用可能です
                      </span>
                    )}
                    {!usernameCheck.checking && usernameCheck.available === false && (
                      <span style={{ color: '#C05656' }}>
                        <i className="fas fa-times-circle"></i> {usernameCheck.error}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#222222',
                  marginBottom: '8px'
                }}>
                  表示名 <span style={{ color: '#C05656' }}>*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="同人ワークス"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D0D5DA',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    color: '#222222',
                    backgroundColor: '#FFFFFF'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#5B7C99'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D0D5DA'}
                />
              </div>

              {error && (
                <div className="alert alert-error" style={{
                  marginBottom: '24px',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => changeStep('userType')}
                  style={{
                    flex: 1,
                    fontSize: '14px',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    backgroundColor: '#FFFFFF',
                    color: '#555555',
                    border: '1px solid #D0D5DA',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#5B7C99'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#D0D5DA'
                  }}
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={!isBasicInfoComplete()}
                  style={{
                    flex: 1,
                    fontSize: '14px',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    backgroundColor: isBasicInfoComplete() ? '#5B7C99' : '#D0D5DA',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: isBasicInfoComplete() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
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
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#F5F6F8',
        padding: '48px 20px'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700',
            marginBottom: '12px',
            textAlign: 'center',
            color: '#222222'
          }}>
            ビジネス情報の入力
          </h1>
          <p style={{ 
            textAlign: 'center',
            color: '#555555',
            marginBottom: '40px',
            fontSize: '14px'
          }}>
            取引に必要な情報を入力してください
          </p>
          
          <StepIndicator />

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #D0D5DA'
          }}>
            <form onSubmit={(e) => {
              e.preventDefault()
              changeStep('confirm')
            }}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#222222',
                  marginBottom: '12px'
                }}>
                  個人/法人 <span style={{ color: '#C05656' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setAccountType('individual')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: accountType === 'individual' ? '#FFFFFF' : '#555555',
                      backgroundColor: accountType === 'individual' ? '#5B7C99' : '#FFFFFF',
                      border: `1px solid ${accountType === 'individual' ? '#5B7C99' : '#D0D5DA'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    個人
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('corporate')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: accountType === 'corporate' ? '#FFFFFF' : '#555555',
                      backgroundColor: accountType === 'corporate' ? '#5B7C99' : '#FFFFFF',
                      border: `1px solid ${accountType === 'corporate' ? '#5B7C99' : '#D0D5DA'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    法人
                  </button>
                </div>
              </div>

              {/* 姓名（横並び） */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#222222',
                  marginBottom: '8px'
                }}>
                  氏名 <span style={{ color: '#C05656' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="姓"
                    required
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #D0D5DA',
                      borderRadius: '8px',
                      outline: 'none',
                      color: '#222222',
                      backgroundColor: '#FFFFFF'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#5B7C99'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#D0D5DA'}
                  />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="名"
                    required
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #D0D5DA',
                      borderRadius: '8px',
                      outline: 'none',
                      color: '#222222',
                      backgroundColor: '#FFFFFF'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#5B7C99'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#D0D5DA'}
                  />
                </div>
              </div>

              {/* 姓名かな（横並び） */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#222222',
                  marginBottom: '8px'
                }}>
                  氏名(かな) <span style={{ color: '#C05656' }}>*</span>
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
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: `1px solid ${lastNameKanaError ? '#C05656' : '#D0D5DA'}`,
                        borderRadius: '8px',
                        outline: 'none',
                        color: '#222222',
                        backgroundColor: '#FFFFFF'
                      }}
                      onFocus={(e) => {
                        if (!lastNameKanaError) e.currentTarget.style.borderColor = '#5B7C99'
                      }}
                      onBlur={(e) => {
                        if (!lastNameKanaError) e.currentTarget.style.borderColor = '#D0D5DA'
                      }}
                    />
                    {lastNameKanaError && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#C05656' }}>
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
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: `1px solid ${firstNameKanaError ? '#C05656' : '#D0D5DA'}`,
                        borderRadius: '8px',
                        outline: 'none',
                        color: '#222222',
                        backgroundColor: '#FFFFFF'
                      }}
                      onFocus={(e) => {
                        if (!firstNameKanaError) e.currentTarget.style.borderColor = '#5B7C99'
                      }}
                      onBlur={(e) => {
                        if (!firstNameKanaError) e.currentTarget.style.borderColor = '#D0D5DA'
                      }}
                    />
                    {firstNameKanaError && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#C05656' }}>
                        {firstNameKanaError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {accountType === 'corporate' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#222222',
                    marginBottom: '8px'
                  }}>
                    会社名 <span style={{ color: '#C05656' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="株式会社○○"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #D0D5DA',
                      borderRadius: '8px',
                      outline: 'none',
                      color: '#222222',
                      backgroundColor: '#FFFFFF'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#5B7C99'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#D0D5DA'}
                  />
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#222222',
                  marginBottom: '8px'
                }}>
                  電話番号 <span style={{ color: '#C05656' }}>*</span>
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
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: `1px solid ${phoneError ? '#C05656' : '#D0D5DA'}`,
                    borderRadius: '8px',
                    outline: 'none',
                    color: '#222222',
                    backgroundColor: '#FFFFFF'
                  }}
                  onFocus={(e) => {
                    if (!phoneError) e.currentTarget.style.borderColor = '#5B7C99'
                  }}
                  onBlur={(e) => {
                    if (!phoneError) e.currentTarget.style.borderColor = '#D0D5DA'
                  }}
                />
                {phoneError && (
                  <div style={{ marginTop: '6px', fontSize: '13px', color: '#C05656' }}>
                    {phoneError}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#222222',
                  marginBottom: '8px'
                }}>
                  郵便番号 <span style={{ color: '#C05656' }}>*</span>
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
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: `1px solid ${postalCodeError ? '#C05656' : '#D0D5DA'}`,
                    borderRadius: '8px',
                    outline: 'none',
                    color: '#222222',
                    backgroundColor: '#FFFFFF'
                  }}
                  onFocus={(e) => {
                    if (!postalCodeError) e.currentTarget.style.borderColor = '#5B7C99'
                  }}
                  onBlur={(e) => {
                    if (!postalCodeError) e.currentTarget.style.borderColor = '#D0D5DA'
                  }}
                />
                {postalCodeError && (
                  <div style={{ marginTop: '6px', fontSize: '13px', color: '#C05656' }}>
                    {postalCodeError}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#222222',
                  marginBottom: '8px'
                }}>
                  都道府県 <span style={{ color: '#C05656' }}>*</span>
                </label>
                <select
                  value={prefecture}
                  onChange={(e) => setPrefecture(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D0D5DA',
                    borderRadius: '8px',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    color: '#222222'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#5B7C99'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D0D5DA'}
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

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#222222',
                  marginBottom: '8px'
                }}>
                  住所(番地まで) <span style={{ color: '#C05656' }}>*</span>
                </label>
                <input
                  type="text"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="○○市○○町1-2-3"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D0D5DA',
                    borderRadius: '8px',
                    outline: 'none',
                    color: '#222222',
                    backgroundColor: '#FFFFFF'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#5B7C99'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D0D5DA'}
                />
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#222222',
                  marginBottom: '8px'
                }}>
                  住所(建物名など)
                </label>
                <input
                  type="text"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="○○マンション101号室"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D0D5DA',
                    borderRadius: '8px',
                    outline: 'none',
                    color: '#222222',
                    backgroundColor: '#FFFFFF'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#5B7C99'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D0D5DA'}
                />
              </div>

              {error && (
                <div className="alert alert-error" style={{
                  marginBottom: '24px',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => changeStep('basicInfo')}
                  style={{
                    flex: 1,
                    fontSize: '14px',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    backgroundColor: '#FFFFFF',
                    color: '#555555',
                    border: '1px solid #D0D5DA',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#5B7C99'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#D0D5DA'
                  }}
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={!isBusinessInfoComplete()}
                  style={{
                    flex: 1,
                    fontSize: '14px',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    backgroundColor: isBusinessInfoComplete() ? '#5B7C99' : '#D0D5DA',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: isBusinessInfoComplete() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
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
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#F5F6F8',
        padding: '48px 20px'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700',
            marginBottom: '12px',
            textAlign: 'center',
            color: '#222222'
          }}>
            入力内容の確認
          </h1>
          <p style={{ 
            textAlign: 'center',
            color: '#555555',
            marginBottom: '40px',
            fontSize: '14px'
          }}>
            内容をご確認の上、登録を完了してください
          </p>
          
          <StepIndicator />

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #D0D5DA'
          }}>
            
            {/* 基本情報 */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#222222' }}>
                基本情報
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #EEF0F3' }}>
                  <span style={{ fontSize: '14px', color: '#555555' }}>利用方法</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#222222' }}>
                    {userType === 'casual' ? '一般利用' : 'ビジネス利用'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #EEF0F3' }}>
                  <span style={{ fontSize: '14px', color: '#555555' }}>メールアドレス</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#222222' }}>{user?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #EEF0F3' }}>
                  <span style={{ fontSize: '14px', color: '#555555' }}>ユーザーID</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#222222' }}>{username}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #EEF0F3' }}>
                  <span style={{ fontSize: '14px', color: '#555555' }}>表示名</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#222222' }}>{displayName}</span>
                </div>
                {user?.app_metadata?.provider === 'email' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                    <span style={{ fontSize: '14px', color: '#555555' }}>パスワード</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#222222' }}>設定済み</span>
                  </div>
                )}
              </div>
            </div>

            {/* ビジネス情報 */}
            {userType === 'business' && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#222222' }}>
                  ビジネス情報
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #EEF0F3' }}>
                    <span style={{ fontSize: '14px', color: '#555555' }}>個人/法人</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#222222' }}>
                      {accountType === 'individual' ? '個人' : '法人'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #EEF0F3' }}>
                    <span style={{ fontSize: '14px', color: '#555555' }}>氏名</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#222222' }}>{lastName} {firstName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #EEF0F3' }}>
                    <span style={{ fontSize: '14px', color: '#555555' }}>氏名(かな)</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#222222' }}>{lastNameKana} {firstNameKana}</span>
                  </div>
                  {accountType === 'corporate' && companyName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #EEF0F3' }}>
                      <span style={{ fontSize: '14px', color: '#555555' }}>会社名</span>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#222222' }}>{companyName}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #EEF0F3' }}>
                    <span style={{ fontSize: '14px', color: '#555555' }}>電話番号</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#222222' }}>{phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #EEF0F3' }}>
                    <span style={{ fontSize: '14px', color: '#555555' }}>住所</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#222222', textAlign: 'right' }}>
                      〒{postalCode}<br />
                      {prefecture}{address1}{address2 && ` ${address2}`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-error" style={{
                marginBottom: '24px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => changeStep(userType === 'business' ? 'businessInfo' : 'basicInfo')}
                style={{
                  flex: 1,
                  fontSize: '14px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  backgroundColor: '#FFFFFF',
                  color: '#555555',
                  border: '1px solid #D0D5DA',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#5B7C99'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D0D5DA'
                }}
              >
                戻る
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 1,
                  fontSize: '14px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  backgroundColor: loading ? '#D0D5DA' : '#5B7C99',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
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