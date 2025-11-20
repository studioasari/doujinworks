'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

type UserType = 'casual' | 'business'
type Role = 'creator' | 'client' | 'both'

export default function SignupCompletePage() {
  const [userType, setUserType] = useState<UserType | null>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [role, setRole] = useState<Role>('both')
  
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
      // ユーザーが未ログインの場合、サインアップページへ
      router.push('/signup')
      return
    }
    
    setUser(user)
    
    // 既にプロフィールが完成している場合、ダッシュボードへリダイレクト
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (profile && profile.username) {
      // プロフィール完成済み → ダッシュボードへ
      router.push('/dashboard')
      return
    }
    
    // プロフィール未完成 → このページで登録続行
    // ソーシャルログインの場合、メタデータから名前を取得
    if (user.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name)
    }
    if (user.user_metadata?.user_name) {
      setUsername(user.user_metadata.user_name.toLowerCase())
    }
  }

  // ユーザーID リアルタイムチェック
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // バリデーション
      if (!usernameCheck.available) {
        throw new Error('ユーザーIDをご確認ください')
      }

      if (password !== passwordConfirm) {
        throw new Error('パスワードが一致しません')
      }

      if (password.length < 6) {
        throw new Error('パスワードは6文字以上で入力してください')
      }

      // パスワード更新（仮パスワードを上書き）
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      })

      if (passwordError) throw passwordError

      // プロフィール作成・更新
      const profileData: any = {
        user_id: user.id,
        username: username.toLowerCase(),
        display_name: displayName,
        role,
        is_creator: role === 'creator' || role === 'both',
        is_client: role === 'client' || role === 'both',
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' })
        .select()
        .single()

      if (profileError) throw profileError

      // ビジネス利用の場合、business_profiles テーブルに保存
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

        // オプション項目
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

      // ダッシュボードへリダイレクト
      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message || '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div className="container" style={{ padding: '80px 40px' }}>読み込み中...</div>
  }

  // Step 1: 利用方法選択
  if (!userType) {
    return (
      <div className="container-narrow" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1 className="page-title" style={{ marginBottom: '16px', textAlign: 'center' }}>
            利用方法を選択
          </h1>
          <p className="text-gray" style={{ marginBottom: '40px', textAlign: 'center' }}>
            同人ワークスをどのように利用しますか？
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button
              onClick={() => setUserType('casual')}
              className="radio-card"
              style={{ padding: '24px', textAlign: 'left' }}
            >
              <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                一般利用
              </div>
              <div className="text-gray">
                趣味で作品を投稿したり、他のクリエイターの作品を楽しむ
              </div>
            </button>

            <button
              onClick={() => setUserType('business')}
              className="radio-card"
              style={{ padding: '24px', textAlign: 'left' }}
            >
              <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                ビジネス利用
              </div>
              <div className="text-gray">
                仕事の受発注、報酬の受け取りなどビジネスとして利用する
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: 詳細入力
  return (
    <div className="container-narrow" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 className="page-title" style={{ marginBottom: '40px', textAlign: 'center' }}>
          アカウント情報の入力
        </h1>

        <form onSubmit={handleSubmit}>
          {/* 共通項目 */}
          <div style={{ marginBottom: '32px' }}>
            <label className="form-label">
              ユーザーID <span className="form-required">必須</span>
            </label>
            <input
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="asari_studio"
              required
            />
            <div className="text-small text-gray" style={{ marginTop: '8px' }}>
              ・4〜20文字<br />
              ・英字で始まる<br />
              ・使用可能: 英数字、アンダースコア（_）
            </div>
            {username && (
              <div style={{ marginTop: '8px' }}>
                {usernameCheck.checking && (
                  <span className="text-small text-gray">確認中...</span>
                )}
                {!usernameCheck.checking && usernameCheck.available === true && (
                  <span className="text-small" style={{ color: '#4CAF50' }}>
                    ✓ 利用可能です
                  </span>
                )}
                {!usernameCheck.checking && usernameCheck.available === false && (
                  <span className="text-small" style={{ color: '#F44336' }}>
                    ✗ {usernameCheck.error}
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label className="form-label">
              表示名 <span className="form-required">必須</span>
            </label>
            <input
              type="text"
              className="input-field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="スタジオアサリ"
              required
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label className="form-label">
              パスワード <span className="form-required">必須</span>
            </label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              required
              minLength={6}
            />
            <div className="text-small text-gray" style={{ marginTop: '8px' }}>
              ログインに使用するパスワードを設定してください
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label className="form-label">
              パスワード（確認） <span className="form-required">必須</span>
            </label>
            <input
              type="password"
              className="input-field"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="もう一度入力"
              required
              minLength={6}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label className="form-label">
              主な利用方法 <span className="form-required">必須</span>
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setRole('creator')}
                className={role === 'creator' ? 'filter-button active' : 'filter-button'}
              >
                クリエイター
              </button>
              <button
                type="button"
                onClick={() => setRole('client')}
                className={role === 'client' ? 'filter-button active' : 'filter-button'}
              >
                依頼者
              </button>
              <button
                type="button"
                onClick={() => setRole('both')}
                className={role === 'both' ? 'filter-button active' : 'filter-button'}
              >
                両方
              </button>
            </div>
          </div>

          {/* ビジネス利用の追加情報 */}
          {userType === 'business' && (
            <>
              <div style={{ 
                borderTop: '1px solid #E5E5E5', 
                paddingTop: '32px', 
                marginTop: '32px',
                marginBottom: '32px' 
              }}>
                <h2 className="section-title" style={{ marginBottom: '24px' }}>
                  ビジネス情報
                </h2>

                <div style={{ marginBottom: '32px' }}>
                  <label className="form-label">
                    個人/法人 <span className="form-required">必須</span>
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setAccountType('individual')}
                      className={accountType === 'individual' ? 'filter-button active' : 'filter-button'}
                    >
                      個人
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType('corporate')}
                      className={accountType === 'corporate' ? 'filter-button active' : 'filter-button'}
                    >
                      法人
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label className="form-label">
                    氏名 <span className="form-required">必須</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="山田 太郎"
                    required
                  />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label className="form-label">
                    氏名（かな） <span className="form-required">必須</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={fullNameKana}
                    onChange={(e) => setFullNameKana(e.target.value)}
                    placeholder="やまだ たろう"
                    required
                  />
                </div>

                {accountType === 'individual' && (
                  <>
                    <div style={{ marginBottom: '32px' }}>
                      <label className="form-label">生年月日</label>
                      <input
                        type="date"
                        className="input-field"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                      />
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                      <label className="form-label">性別</label>
                      <select
                        className="select-field"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                      >
                        <option value="">選択してください</option>
                        <option value="male">男性</option>
                        <option value="female">女性</option>
                        <option value="other">その他</option>
                        <option value="not_specified">回答しない</option>
                      </select>
                    </div>
                  </>
                )}

                {accountType === 'corporate' && (
                  <div style={{ marginBottom: '32px' }}>
                    <label className="form-label">
                      会社名 <span className="form-required">必須</span>
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="株式会社○○"
                      required
                    />
                  </div>
                )}

                <div style={{ marginBottom: '32px' }}>
                  <label className="form-label">
                    電話番号 <span className="form-required">必須</span>
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09012345678"
                    required
                  />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label className="form-label">
                    郵便番号 <span className="form-required">必須</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="1234567"
                    required
                  />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label className="form-label">
                    都道府県 <span className="form-required">必須</span>
                  </label>
                  <select
                    className="select-field"
                    value={prefecture}
                    onChange={(e) => setPrefecture(e.target.value)}
                    required
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

                <div style={{ marginBottom: '32px' }}>
                  <label className="form-label">
                    住所（番地まで） <span className="form-required">必須</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    placeholder="○○市○○町1-2-3"
                    required
                  />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label className="form-label">住所（建物名など）</label>
                  <input
                    type="text"
                    className="input-field"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                    placeholder="○○マンション101号室"
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="info-box" style={{ 
              marginBottom: '24px', 
              padding: '12px', 
              backgroundColor: '#FEE', 
              color: '#C33',
              border: '1px solid #FCC'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setUserType(null)}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              戻る
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !usernameCheck.available}
              style={{ flex: 2 }}
            >
              {loading ? '登録中...' : '登録完了'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}