'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

type UserType = 'casual' | 'business'
type Step = 'userType' | 'basicInfo' | 'businessInfo' | 'confirm'

export default function SignupCompletePage() {
  const [step, setStep] = useState<Step>('userType')
  const [userType, setUserType] = useState<UserType | null>(null)
  
  // 基本情報
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  
  // ビジネス利用の追加情報
  const [accountType, setAccountType] = useState<'individual' | 'corporate'>('individual')
  const [fullName, setFullName] = useState('')
  const [fullNameKana, setFullNameKana] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [prefecture, setPrefecture] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  
  // バリデーションエラー
  const [fullNameKanaError, setFullNameKanaError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [postalCodeError, setPostalCodeError] = useState('')
  
  const [usernameCheck, setUsernameCheck] = useState<{
    checking: boolean
    available: boolean | null
    error: string
  }>({ checking: false, available: null, error: '' })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/signup')
      return
    }
    
    setUser(user)
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (profile && profile.username) {
      router.push('/dashboard')
      return
    }
    
    if (user.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name)
    }
    if (user.user_metadata?.user_name) {
      setUsername(user.user_metadata.user_name.toLowerCase())
    }
  }

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
  const validateFullNameKana = (value: string) => {
    if (!value) {
      setFullNameKanaError('')
      return true
    }
    const hiraganaRegex = /^[\u3040-\u309F\s]*$/
    if (!hiraganaRegex.test(value)) {
      setFullNameKanaError('ひらがなで入力してください')
      return false
    }
    setFullNameKanaError('')
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

  // 基本情報の入力チェック
  const isBasicInfoComplete = () => {
    return username && 
           displayName && 
           password && 
           passwordConfirm && 
           password.length >= 6 && 
           passwordConfirm.length >= 6 &&
           password === passwordConfirm &&
           usernameCheck.available === true
  }

  // ビジネス情報の入力チェック
  const isBusinessInfoComplete = () => {
    const basicComplete = fullName && 
                         fullNameKana && 
                         phone && 
                         postalCode && 
                         prefecture && 
                         address1 &&
                         !fullNameKanaError &&
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

    try {
      if (!usernameCheck.available) {
        throw new Error('ユーザーIDをご確認ください')
      }

      if (password !== passwordConfirm) {
        throw new Error('パスワードが一致しません')
      }

      if (password.length < 6) {
        throw new Error('パスワードは6文字以上で入力してください')
      }

      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      })

      if (passwordError) throw passwordError

      const profileData: any = {
        user_id: user.id,
        username: username.toLowerCase(),
        display_name: displayName,
        account_type: userType,
        can_receive_work: userType === 'business' ? true : false,
        can_request_work: userType === 'business' ? true : false,
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' })
        .select()
        .single()

      if (profileError) throw profileError

      if (userType === 'business') {
        const businessData: any = {
          profile_id: profile.id,
          account_type: accountType,
          full_name: fullName,
          full_name_kana: fullNameKana,
          phone,
          postal_code: postalCode,
          prefecture,
          address1,
        }

        if (address2) businessData.address2 = address2
        if (accountType === 'individual') {
          if (birthDate) businessData.birth_date = birthDate
          if (gender) businessData.gender = gender
        }
        if (accountType === 'corporate' && companyName) {
          businessData.company_name = companyName
        }

        const { error: businessError } = await supabase
          .from('business_profiles')
          .upsert(businessData, { onConflict: 'profile_id' })

        if (businessError) throw businessError
      }

      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message || '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#FAFAFA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#6B7280' }}>読み込み中...</div>
      </div>
    )
  }

  // ステップインジケーター
  const StepIndicator = () => {
    const steps = userType === 'business' 
      ? ['利用方法', '基本情報', 'ビジネス情報', '確認']
      : ['利用方法', '基本情報', '確認']
    
    const currentStepIndex = 
      step === 'userType' ? 0 :
      step === 'basicInfo' ? 1 :
      step === 'businessInfo' ? 2 :
      userType === 'business' ? 3 : 2

    const currentStep = currentStepIndex + 1
    const totalSteps = steps.length

    return (
      <>
        {/* PC版：ドット型インジケーター */}
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

        {/* スマホ版：プログレスバー */}
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
            min-width: 28px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: #E5E7EB;
            color: #9CA3AF;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 600;
            flex-shrink: 0;
          }

          .step-number.active {
            background-color: #1A1A1A;
            color: #FFFFFF;
          }

          .step-text {
            font-size: 13px;
            color: #9CA3AF;
            font-weight: 400;
          }

          .step-text.active {
            color: #1A1A1A;
            font-weight: 500;
          }

          .step-line {
            width: 50px;
            height: 2px;
            background-color: #E5E7EB;
            margin: 0 16px;
          }

          .step-line.active {
            background-color: #1A1A1A;
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
              color: #1A1A1A;
            }

            .step-counter {
              font-size: 12px;
              font-weight: 500;
              color: #6B7280;
            }

            .progress-bar-container {
              width: 100%;
              height: 4px;
              background-color: #E5E7EB;
              border-radius: 2px;
              overflow: hidden;
            }

            .progress-bar-fill {
              height: 100%;
              background-color: #1A1A1A;
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
        backgroundColor: '#FAFAFA',
        padding: '48px 20px'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <StepIndicator />
          
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700',
            marginBottom: '12px',
            textAlign: 'center',
            color: '#1A1A1A'
          }}>
            利用方法を選択
          </h1>
          <p style={{ 
            textAlign: 'center',
            color: '#6B7280',
            marginBottom: '40px',
            fontSize: '14px'
          }}>
            同人ワークスをどのように利用しますか?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button
              onClick={() => {
                setUserType('casual')
                setStep('basicInfo')
              }}
              style={{
                padding: '24px',
                textAlign: 'left',
                backgroundColor: '#FFFFFF',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
            >
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1A1A1A' }}>
                一般利用
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                趣味で作品を投稿したり、他のクリエイターの作品を楽しむ
              </div>
            </button>

            <button
              onClick={() => {
                setUserType('business')
                setStep('basicInfo')
              }}
              style={{
                padding: '24px',
                textAlign: 'left',
                backgroundColor: '#FFFFFF',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
            >
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1A1A1A' }}>
                ビジネス利用
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                仕事の受発注、報酬の受け取りなどビジネスとして利用する
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
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#FAFAFA',
        padding: '48px 20px'
      }}>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <StepIndicator />
          
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700',
            marginBottom: '12px',
            textAlign: 'center',
            color: '#1A1A1A'
          }}>
            基本情報の入力
          </h1>
          <p style={{ 
            textAlign: 'center',
            color: '#6B7280',
            marginBottom: '40px',
            fontSize: '14px'
          }}>
            アカウント情報を設定してください
          </p>

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #E5E7EB'
          }}>
            <form onSubmit={(e) => {
              e.preventDefault()
              if (userType === 'business') {
                setStep('businessInfo')
              } else {
                setStep('confirm')
              }
            }}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  ユーザーID <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="asari_studio"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                />
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
                  4〜20文字 / 英字で始まる / 英数字とアンダースコア(_)のみ
                </div>
                {username && (
                  <div style={{ marginTop: '8px', fontSize: '13px' }}>
                    {usernameCheck.checking && (
                      <span style={{ color: '#6B7280' }}>確認中...</span>
                    )}
                    {!usernameCheck.checking && usernameCheck.available === true && (
                      <span style={{ color: '#10B981' }}>✓ 利用可能です</span>
                    )}
                    {!usernameCheck.checking && usernameCheck.available === false && (
                      <span style={{ color: '#EF4444' }}>✗ {usernameCheck.error}</span>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  表示名 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="スタジオアサリ"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  パスワード <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6文字以上"
                    required
                    minLength={6}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      paddingRight: '40px',
                      fontSize: '14px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'border-color 0.15s'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#D1D5DB',
                      fontSize: '14px',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#9CA3AF'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#D1D5DB'}
                  >
                    <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  パスワード(確認) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="もう一度入力"
                    required
                    minLength={6}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      paddingRight: '40px',
                      fontSize: '14px',
                      border: `1px solid ${passwordConfirm && password !== passwordConfirm ? '#EF4444' : '#D1D5DB'}`,
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'border-color 0.15s'
                    }}
                    onFocus={(e) => {
                      if (!(passwordConfirm && password !== passwordConfirm)) {
                        e.currentTarget.style.borderColor = '#1A1A1A'
                      }
                    }}
                    onBlur={(e) => {
                      if (!(passwordConfirm && password !== passwordConfirm)) {
                        e.currentTarget.style.borderColor = '#D1D5DB'
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#D1D5DB',
                      fontSize: '14px',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#9CA3AF'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#D1D5DB'}
                  >
                    <i className={showPasswordConfirm ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                  </button>
                </div>
                {passwordConfirm && password !== passwordConfirm && (
                  <div style={{ marginTop: '6px', fontSize: '13px', color: '#EF4444' }}>
                    パスワードが一致しません
                  </div>
                )}
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  color: '#DC2626',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setStep('userType')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6B7280',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={!isBasicInfoComplete()}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#FFFFFF',
                    backgroundColor: isBasicInfoComplete() ? '#1A1A1A' : '#9CA3AF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isBasicInfoComplete() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (isBasicInfoComplete()) {
                      e.currentTarget.style.backgroundColor = '#374151'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isBasicInfoComplete()) {
                      e.currentTarget.style.backgroundColor = '#1A1A1A'
                    }
                  }}
                >
                  次へ
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
        backgroundColor: '#FAFAFA',
        padding: '48px 20px'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <StepIndicator />
          
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700',
            marginBottom: '12px',
            textAlign: 'center',
            color: '#1A1A1A'
          }}>
            ビジネス情報の入力
          </h1>
          <p style={{ 
            textAlign: 'center',
            color: '#6B7280',
            marginBottom: '40px',
            fontSize: '14px'
          }}>
            取引に必要な情報を入力してください
          </p>

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #E5E7EB'
          }}>
            <form onSubmit={(e) => {
              e.preventDefault()
              setStep('confirm')
            }}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '12px'
                }}>
                  個人/法人 <span style={{ color: '#EF4444' }}>*</span>
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
                      color: accountType === 'individual' ? '#FFFFFF' : '#6B7280',
                      backgroundColor: accountType === 'individual' ? '#1A1A1A' : '#FFFFFF',
                      border: `1px solid ${accountType === 'individual' ? '#1A1A1A' : '#D1D5DB'}`,
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
                      color: accountType === 'corporate' ? '#FFFFFF' : '#6B7280',
                      backgroundColor: accountType === 'corporate' ? '#1A1A1A' : '#FFFFFF',
                      border: `1px solid ${accountType === 'corporate' ? '#1A1A1A' : '#D1D5DB'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    法人
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  氏名 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="山田 太郎"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  氏名(かな) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={fullNameKana}
                  onChange={(e) => {
                    setFullNameKana(e.target.value)
                    validateFullNameKana(e.target.value)
                  }}
                  placeholder="やまだ たろう"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: `1px solid ${fullNameKanaError ? '#EF4444' : '#D1D5DB'}`,
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    if (!fullNameKanaError) e.currentTarget.style.borderColor = '#1A1A1A'
                  }}
                  onBlur={(e) => {
                    if (!fullNameKanaError) e.currentTarget.style.borderColor = '#D1D5DB'
                  }}
                />
                {fullNameKanaError && (
                  <div style={{ marginTop: '6px', fontSize: '13px', color: '#EF4444' }}>
                    {fullNameKanaError}
                  </div>
                )}
              </div>

              {accountType === 'corporate' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1A1A1A',
                    marginBottom: '8px'
                  }}>
                    会社名 <span style={{ color: '#EF4444' }}>*</span>
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
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                  />
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  電話番号 <span style={{ color: '#EF4444' }}>*</span>
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
                    border: `1px solid ${phoneError ? '#EF4444' : '#D1D5DB'}`,
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    if (!phoneError) e.currentTarget.style.borderColor = '#1A1A1A'
                  }}
                  onBlur={(e) => {
                    if (!phoneError) e.currentTarget.style.borderColor = '#D1D5DB'
                  }}
                />
                {phoneError && (
                  <div style={{ marginTop: '6px', fontSize: '13px', color: '#EF4444' }}>
                    {phoneError}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  郵便番号 <span style={{ color: '#EF4444' }}>*</span>
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
                    border: `1px solid ${postalCodeError ? '#EF4444' : '#D1D5DB'}`,
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    if (!postalCodeError) e.currentTarget.style.borderColor = '#1A1A1A'
                  }}
                  onBlur={(e) => {
                    if (!postalCodeError) e.currentTarget.style.borderColor = '#D1D5DB'
                  }}
                />
                {postalCodeError && (
                  <div style={{ marginTop: '6px', fontSize: '13px', color: '#EF4444' }}>
                    {postalCodeError}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  都道府県 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={prefecture}
                  onChange={(e) => setPrefecture(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
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
                  color: '#1A1A1A',
                  marginBottom: '8px'
                }}>
                  住所(番地まで) <span style={{ color: '#EF4444' }}>*</span>
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
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                />
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
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
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                />
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  color: '#DC2626',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setStep('basicInfo')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6B7280',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={!isBusinessInfoComplete()}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#FFFFFF',
                    backgroundColor: isBusinessInfoComplete() ? '#1A1A1A' : '#9CA3AF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isBusinessInfoComplete() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (isBusinessInfoComplete()) {
                      e.currentTarget.style.backgroundColor = '#374151'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isBusinessInfoComplete()) {
                      e.currentTarget.style.backgroundColor = '#1A1A1A'
                    }
                  }}
                >
                  次へ
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: 確認ページ (一般利用は Step 3)
  if (step === 'confirm') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#FAFAFA',
        padding: '48px 20px'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <StepIndicator />
          
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700',
            marginBottom: '12px',
            textAlign: 'center',
            color: '#1A1A1A'
          }}>
            入力内容の確認
          </h1>
          <p style={{ 
            textAlign: 'center',
            color: '#6B7280',
            marginBottom: '40px',
            fontSize: '14px'
          }}>
            内容をご確認の上、登録を完了してください
          </p>

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #E5E7EB'
          }}>
            
            {/* 基本情報 */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1A1A1A' }}>
                基本情報
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>利用方法</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A' }}>
                    {userType === 'casual' ? '一般利用' : 'ビジネス利用'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>ユーザーID</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A' }}>{username}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>表示名</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A' }}>{displayName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>パスワード</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A' }}>●●●●●●●●</span>
                </div>
              </div>
            </div>

            {/* ビジネス情報 */}
            {userType === 'business' && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1A1A1A' }}>
                  ビジネス情報
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: '14px', color: '#6B7280' }}>個人/法人</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A' }}>
                      {accountType === 'individual' ? '個人' : '法人'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: '14px', color: '#6B7280' }}>氏名</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A' }}>{fullName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: '14px', color: '#6B7280' }}>氏名(かな)</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A' }}>{fullNameKana}</span>
                  </div>
                  {accountType === 'corporate' && companyName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                      <span style={{ fontSize: '14px', color: '#6B7280' }}>会社名</span>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A' }}>{companyName}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: '14px', color: '#6B7280' }}>電話番号</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A' }}>{phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: '14px', color: '#6B7280' }}>住所</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#1A1A1A', textAlign: 'right' }}>
                      〒{postalCode}<br />
                      {prefecture}{address1}{address2 && ` ${address2}`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                marginBottom: '24px',
                color: '#DC2626',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setStep(userType === 'business' ? 'businessInfo' : 'basicInfo')}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#6B7280',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
              >
                戻る
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  backgroundColor: loading ? '#9CA3AF' : '#1A1A1A',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = '#374151'
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = '#1A1A1A'
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