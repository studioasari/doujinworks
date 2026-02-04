'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter, useSearchParams } from 'next/navigation'
import useEmblaCarousel from 'embla-carousel-react'
import styles from './page.module.css'

type Props = {
  user: User
}

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
  
  // Embla Carousel（userType選択用）
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false })
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi])
  
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

  // 基本情報の入力チェック
  const isBasicInfoComplete = () => {
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

    if (!userType) {
      setError('利用方法を選択してください')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        throw new Error('セッションが切れています。もう一度ログインしてください。')
      }

      if (!usernameCheck.available) {
        throw new Error('ユーザーIDをご確認ください')
      }

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id, username, account_type')
        .eq('user_id', currentUser.id)
        .maybeSingle()

      if (existingProfile && existingProfile.account_type) {
        router.push('/dashboard')
        return
      }

      const profileData: any = {
        user_id: currentUser.id,
        username: username.toLowerCase(),
        display_name: displayName,
        account_type: userType,
        can_receive_work: userType === 'business',
        can_request_work: userType === 'business',
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' })
        .select()
        .single()

      if (profileError) {
        if (profileError.code === '23505') {
          if (profileError.message.includes('username')) {
            throw new Error('このユーザーIDは既に使用されています。別のユーザーIDをお試しください。')
          } else {
            throw new Error('既にプロフィールが登録されています。ページを更新してください。')
          }
        }
        throw profileError
      }

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

        const { error: businessError } = await supabase
          .from('business_profiles')
          .upsert(businessData, { onConflict: 'profile_id' })

        if (businessError) {
          if (businessError.code === '23505') {
            throw new Error('既にビジネス情報が登録されています。ページを更新してください。')
          }
          throw businessError
        }
      }

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
      <div className={styles.page}>
        <div className={styles.loading}>読み込み中...</div>
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
        <div className={styles.desktopIndicator}>
          {steps.map((label, index) => (
            <div key={index} className={styles.stepGroup}>
              <div className={styles.stepItem}>
                <div className={`${styles.stepNumber} ${index <= currentStepIndex ? styles.active : ''}`}>
                  {index < currentStepIndex ? '✓' : index + 1}
                </div>
                <span className={`${styles.stepText} ${index <= currentStepIndex ? styles.active : ''}`}>
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`${styles.stepLine} ${index < currentStepIndex ? styles.active : ''}`} />
              )}
            </div>
          ))}
        </div>

        <div className={styles.mobileIndicator}>
          <div className={styles.progressInfo}>
            <span className={styles.currentStepLabel}>{steps[currentStepIndex]}</span>
            <span className={styles.stepCounter}>{currentStep}/{totalSteps}</span>
          </div>
          <div className={styles.progressBarContainer}>
            <div 
              className={styles.progressBarFill} 
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </>
    )
  }

  // Step 1: 利用方法選択（新デザイン）
  if (step === 'userType') {
    const userTypeOptions = [
      {
        type: 'casual' as UserType,
        image: '/illustrations/usertype-casual.png',
        title: '作品を楽しむ',
        label: '一般ユーザー',
        description: '作品を見てもらったり\n気になる人をフォローしたり',
        hint: 'いつでもビジネスに変更できるよ',
      },
      {
        type: 'business' as UserType,
        image: '/illustrations/usertype-business.png',
        title: '仕事で使う',
        label: 'ビジネスユーザー',
        description: 'お仕事を受けたり\n依頼を出したり',
        hint: '依頼の受発注ができるよ',
      },
    ]

    const handleSelect = () => {
      setUserType(userTypeOptions[selectedIndex].type)
      changeStep('basicInfo')
    }

    return (
      <div className={styles.page}>
        <div className={styles.userTypeContainer}>
          <h1 className={styles.userTypeTitle}>同人ワークスへようこそ！</h1>
          <p className={styles.userTypeSubtitle}>利用方法を選んでね</p>

          {/* スマホ: スワイプ */}
          <div className={styles.userTypeCarousel}>
            <div className={styles.emblaViewport} ref={emblaRef}>
              <div className={styles.emblaContainer}>
                {userTypeOptions.map((option, index) => (
                  <div key={option.type} className={styles.emblaSlide}>
                    <div className={styles.userTypeCardNew}>
                      <span className={styles.userTypeBadge}>{option.label}</span>
                      <img 
                        src={option.image} 
                        alt={option.title}
                        className={styles.userTypeImage}
                      />
                      <div className={styles.userTypeCardTitle}>{option.title}</div>
                      <div className={styles.userTypeCardDesc}>
                        {option.description.split('\n').map((line, i) => (
                          <span key={i}>{line}<br /></span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.emblaDots}>
              {userTypeOptions.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.emblaDot} ${index === selectedIndex ? styles.active : ''}`}
                  onClick={() => emblaApi?.scrollTo(index)}
                />
              ))}
            </div>

            <button
              onClick={handleSelect}
              className={`btn btn-primary ${styles.userTypeSelectBtn}`}
            >
              これにする
            </button>
          </div>

          {/* PC: 横並び */}
          <div className={styles.userTypeGridNew}>
            {userTypeOptions.map((option) => (
              <div key={option.type} className={styles.userTypeCardWrapper}>
                <button
                  onClick={() => {
                    setUserType(option.type)
                    changeStep('basicInfo')
                  }}
                  className={styles.userTypeCardNew}
                >
                  <span className={styles.userTypeBadge}>{option.label}</span>
                  <img 
                    src={option.image} 
                    alt={option.title}
                    className={styles.userTypeImage}
                  />
                  <div className={styles.userTypeCardTitle}>{option.title}</div>
                  <div className={styles.userTypeCardDesc}>
                    {option.description.split('\n').map((line, i) => (
                      <span key={i}>{line}<br /></span>
                    ))}
                  </div>
                </button>
                <p className={styles.userTypeCardHint}>{option.hint}</p>
              </div>
            ))}
          </div>

          <p className={styles.userTypeHint}>
            {selectedIndex === 0 
              ? 'いつでもビジネスに変更できるよ' 
              : '依頼の受発注ができるよ'}
          </p>
        </div>
      </div>
    )
  }

  // Step 2: 基本情報入力
  if (step === 'basicInfo') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>基本情報の入力</h1>
          <p className={styles.subtitle}>アカウント情報を設定してください</p>
          
          <StepIndicator />

          <div className={styles.card}>
            <form onSubmit={(e) => {
              e.preventDefault()
              if (userType === 'business') {
                changeStep('businessInfo')
              } else {
                changeStep('confirm')
              }
            }}>
              <div className={styles.formGroup}>
                <label className="form-label">
                  メールアドレス
                  <span className={styles.readonlyBadge}>
                    <i className="fas fa-lock"></i> 変更不可
                  </span>
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="form-input"
                  style={{ maxWidth: '100%' }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className="form-label">
                  ユーザーID <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="doujinworks"
                  required
                  autoComplete="off"
                  className="form-input"
                  style={{ maxWidth: '100%' }}
                />
                <div className={styles.hint}>
                  4〜20文字 / 英数字とアンダースコア(_)のみ
                </div>
                {username && (
                  <div className={styles.validation}>
                    {usernameCheck.checking && (
                      <span className={styles.checking}>確認中...</span>
                    )}
                    {!usernameCheck.checking && usernameCheck.available === true && (
                      <span className={styles.available}>
                        <i className="fas fa-check-circle"></i> 利用可能です
                      </span>
                    )}
                    {!usernameCheck.checking && usernameCheck.available === false && (
                      <span className={styles.unavailable}>
                        <i className="fas fa-times-circle"></i> {usernameCheck.error}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className="form-label">
                  表示名 <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="同人ワークス"
                  required
                  className="form-input"
                  style={{ maxWidth: '100%' }}
                />
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>
                  <i className="fa-solid fa-circle-xmark alert-icon"></i>
                  {error}
                </div>
              )}

              <div className={styles.buttons}>
                <button
                  type="button"
                  onClick={() => changeStep('userType')}
                  className="btn btn-secondary"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={!isBasicInfoComplete()}
                  className="btn btn-primary"
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
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>ビジネス情報の入力</h1>
          <p className={styles.subtitle}>取引に必要な情報を入力してください</p>
          
          <StepIndicator />

          <div className={styles.card}>
            <form onSubmit={(e) => {
              e.preventDefault()
              changeStep('confirm')
            }}>
              <div className={styles.formGroup}>
                <label className="form-label">
                  個人/法人 <span className={styles.required}>*</span>
                </label>
                <div className={styles.toggleGroup}>
                  <button
                    type="button"
                    onClick={() => setAccountType('individual')}
                    className={`${styles.toggleBtn} ${accountType === 'individual' ? styles.active : ''}`}
                  >
                    個人
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('corporate')}
                    className={`${styles.toggleBtn} ${accountType === 'corporate' ? styles.active : ''}`}
                  >
                    法人
                  </button>
                </div>
              </div>

              {/* 姓名（横並び） */}
              <div className={styles.formGroup}>
                <label className="form-label">
                  氏名 <span className={styles.required}>*</span>
                </label>
                <div className={styles.row}>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="姓"
                    required
                    className="form-input"
                    style={{ maxWidth: '100%' }}
                  />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="名"
                    required
                    className="form-input"
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              </div>

              {/* 姓名かな（横並び） */}
              <div className={styles.formGroup}>
                <label className="form-label">
                  氏名(かな) <span className={styles.required}>*</span>
                </label>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <input
                      type="text"
                      value={lastNameKana}
                      onChange={(e) => {
                        setLastNameKana(e.target.value)
                        validateKana(e.target.value, setLastNameKanaError)
                      }}
                      placeholder="せい"
                      required
                      className={`form-input ${lastNameKanaError ? 'error' : ''}`}
                      style={{ maxWidth: '100%' }}
                    />
                    {lastNameKanaError && (
                      <p className="form-error">
                        <i className="fa-solid fa-circle-exclamation"></i> {lastNameKanaError}
                      </p>
                    )}
                  </div>
                  <div className={styles.field}>
                    <input
                      type="text"
                      value={firstNameKana}
                      onChange={(e) => {
                        setFirstNameKana(e.target.value)
                        validateKana(e.target.value, setFirstNameKanaError)
                      }}
                      placeholder="めい"
                      required
                      className={`form-input ${firstNameKanaError ? 'error' : ''}`}
                      style={{ maxWidth: '100%' }}
                    />
                    {firstNameKanaError && (
                      <p className="form-error">
                        <i className="fa-solid fa-circle-exclamation"></i> {firstNameKanaError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {accountType === 'corporate' && (
                <div className={styles.formGroup}>
                  <label className="form-label">
                    会社名 <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="株式会社○○"
                    required
                    className="form-input"
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label className="form-label">
                  電話番号 <span className={styles.required}>*</span>
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
                  className={`form-input ${phoneError ? 'error' : ''}`}
                  style={{ maxWidth: '100%' }}
                />
                {phoneError && (
                  <p className="form-error">
                    <i className="fa-solid fa-circle-exclamation"></i> {phoneError}
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className="form-label">
                  郵便番号 <span className={styles.required}>*</span>
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
                  className={`form-input ${postalCodeError ? 'error' : ''}`}
                  style={{ maxWidth: '100%' }}
                />
                {postalCodeError && (
                  <p className="form-error">
                    <i className="fa-solid fa-circle-exclamation"></i> {postalCodeError}
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className="form-label">
                  都道府県 <span className={styles.required}>*</span>
                </label>
                <select
                  value={prefecture}
                  onChange={(e) => setPrefecture(e.target.value)}
                  required
                  className={styles.select}
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

              <div className={styles.formGroup}>
                <label className="form-label">
                  住所(番地まで) <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="○○市○○町1-2-3"
                  required
                  className="form-input"
                  style={{ maxWidth: '100%' }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className="form-label">住所(建物名など)</label>
                <input
                  type="text"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="○○マンション101号室"
                  className="form-input"
                  style={{ maxWidth: '100%' }}
                />
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>
                  <i className="fa-solid fa-circle-xmark alert-icon"></i>
                  {error}
                </div>
              )}

              <div className={styles.buttons}>
                <button
                  type="button"
                  onClick={() => changeStep('basicInfo')}
                  className="btn btn-secondary"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={!isBusinessInfoComplete()}
                  className="btn btn-primary"
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
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>入力内容の確認</h1>
          <p className={styles.subtitle}>内容をご確認の上、登録を完了してください</p>
          
          <StepIndicator />

          <div className={styles.card}>
            
            {/* 基本情報 */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>基本情報</h2>
              <div className={styles.confirmList}>
                <div className={styles.confirmItem}>
                  <span className={styles.confirmLabel}>利用方法</span>
                  <span className={styles.confirmValue}>
                    {userType === 'casual' ? '作品を楽しむ' : '仕事で使う'}
                  </span>
                </div>
                <div className={styles.confirmItem}>
                  <span className={styles.confirmLabel}>メールアドレス</span>
                  <span className={styles.confirmValue}>{user?.email}</span>
                </div>
                <div className={styles.confirmItem}>
                  <span className={styles.confirmLabel}>ユーザーID</span>
                  <span className={styles.confirmValue}>{username}</span>
                </div>
                <div className={`${styles.confirmItem} ${styles.noBorder}`}>
                  <span className={styles.confirmLabel}>表示名</span>
                  <span className={styles.confirmValue}>{displayName}</span>
                </div>
              </div>
            </div>

            {/* ビジネス情報 */}
            {userType === 'business' && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>ビジネス情報</h2>
                <div className={styles.confirmList}>
                  <div className={styles.confirmItem}>
                    <span className={styles.confirmLabel}>個人/法人</span>
                    <span className={styles.confirmValue}>
                      {accountType === 'individual' ? '個人' : '法人'}
                    </span>
                  </div>
                  <div className={styles.confirmItem}>
                    <span className={styles.confirmLabel}>氏名</span>
                    <span className={styles.confirmValue}>{lastName} {firstName}</span>
                  </div>
                  <div className={styles.confirmItem}>
                    <span className={styles.confirmLabel}>氏名(かな)</span>
                    <span className={styles.confirmValue}>{lastNameKana} {firstNameKana}</span>
                  </div>
                  {accountType === 'corporate' && companyName && (
                    <div className={styles.confirmItem}>
                      <span className={styles.confirmLabel}>会社名</span>
                      <span className={styles.confirmValue}>{companyName}</span>
                    </div>
                  )}
                  <div className={styles.confirmItem}>
                    <span className={styles.confirmLabel}>電話番号</span>
                    <span className={styles.confirmValue}>{phone}</span>
                  </div>
                  <div className={`${styles.confirmItem} ${styles.noBorder}`}>
                    <span className={styles.confirmLabel}>住所</span>
                    <span className={styles.confirmValue} style={{ textAlign: 'right' }}>
                      〒{postalCode}<br />
                      {prefecture}{address1}{address2 && ` ${address2}`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>
                <i className="fa-solid fa-circle-xmark alert-icon"></i>
                {error}
              </div>
            )}

            <div className={styles.buttons}>
              <button
                type="button"
                onClick={() => changeStep(userType === 'business' ? 'businessInfo' : 'basicInfo')}
                className="btn btn-secondary"
              >
                戻る
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? '登録中...' : '登録完了'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}