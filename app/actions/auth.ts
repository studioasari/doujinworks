'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { 
  emailResendLimiter,
  emailResendDailyLimiter,  // 🆕 追加
  signupLimiter,
  signupDailyLimiter,  // 🆕 追加
  loginFailureLimiter, 
  passwordResetLimiter,
  passwordResetDailyLimiter,  // 🆕 追加
  getVagueRetryTime
} from '@/utils/rateLimit'

// Supabase クライアント作成
const getSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// IPアドレス取得（Server Actionsでは headers から取得）
const getClientIp = async (): Promise<string> => {
  const { headers } = await import('next/headers')
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = headersList.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return 'unknown'
}

// バリデーション関数
const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'メールアドレスの形式が正しくありません'
  }
  return null
}

const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return 'パスワードは8文字以上で入力してください'
  }
  if (!/[a-z]/.test(password)) {
    return 'パスワードには小文字を含めてください'
  }
  if (!/[0-9]/.test(password)) {
    return 'パスワードには数字を含めてください'
  }
  return null
}

// 新規登録
export async function signupAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // バリデーション
  const emailError = validateEmail(email)
  if (emailError) {
    return { success: false, error: emailError }
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    return { success: false, error: passwordError }
  }

  // レート制限チェック（時間制限）
  const ip = await getClientIp()
  const { success: hourlySuccess, reset: hourlyReset } = await signupLimiter.limit(ip)
  
  if (!hourlySuccess) {
    const retryAfterSeconds = Math.ceil((hourlyReset - Date.now()) / 1000)
    const vagueTime = getVagueRetryTime(retryAfterSeconds)
    return { 
      success: false, 
      error: `登録回数の上限に達しました。${vagueTime}後に再試行してください。` 
    }
  }

  // 🆕 レート制限チェック（日次制限）
  const { success: dailySuccess, reset: dailyReset } = await signupDailyLimiter.limit(ip)
  
  if (!dailySuccess) {
    const retryAfterSeconds = Math.ceil((dailyReset - Date.now()) / 1000)
    const vagueTime = getVagueRetryTime(retryAfterSeconds)
    return { 
      success: false, 
      error: `登録回数の上限に達しました。${vagueTime}後に再試行してください。` 
    }
  }

  // Supabaseで登録
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: {
        registration_step: 'email_confirmed',
      }
    },
  })

  if (error) {
    // 🔒 エラーログのサニタイズ
    console.error('Signup error:', {
      code: error.code,
      message: error.message,
    })
    return { success: false, error: error.message }
  }

  return { success: true, user: data.user }
}

// メール再送信
export async function resendEmailAction(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { success: false, error: 'メールアドレスが必要です' }
  }

  // レート制限チェック（時間制限）
  const ip = await getClientIp()
  const { success: hourlySuccess, reset: hourlyReset } = await emailResendLimiter.limit(ip)

  if (!hourlySuccess) {
    const retryAfterSeconds = Math.ceil((hourlyReset - Date.now()) / 1000)
    const vagueTime = getVagueRetryTime(retryAfterSeconds)
    return { 
      success: false, 
      error: `送信回数の上限に達しました。${vagueTime}後に再試行してください。` 
    }
  }

  // 🆕 レート制限チェック（日次制限）
  const { success: dailySuccess, reset: dailyReset } = await emailResendDailyLimiter.limit(ip)

  if (!dailySuccess) {
    const retryAfterSeconds = Math.ceil((dailyReset - Date.now()) / 1000)
    const vagueTime = getVagueRetryTime(retryAfterSeconds)
    return { 
      success: false, 
      error: `送信回数の上限に達しました。${vagueTime}後に再試行してください。` 
    }
  }

  // メール再送信
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    }
  })

  if (error) {
    // 🔒 エラーログのサニタイズ
    console.error('Email resend error:', {
      code: error.code,
      message: error.message,
    })
    return { success: false, error: error.message }
  }

  return { success: true, message: '認証メールを再送信しました' }
}

// ログイン失敗チェック
export async function checkLoginLimitAction(identifier: string) {
  const ip = await getClientIp()
  const limitKey = `${ip}:${identifier}`
  
  const { success, reset } = await loginFailureLimiter.limit(limitKey)

  if (!success) {
    const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000)
    const vagueTime = getVagueRetryTime(retryAfterSeconds)
    return { 
      success: false, 
      locked: true,
      error: `ログイン試行回数の上限に達しました。${vagueTime}後に再試行してください。` 
    }
  }

  return { success: true, locked: false }
}

// パスワードリセット
export async function passwordResetAction(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { success: false, error: 'メールアドレスが必要です' }
  }

  // レート制限チェック（時間制限）
  const { success: hourlySuccess, reset: hourlyReset } = await passwordResetLimiter.limit(email.toLowerCase())

  if (!hourlySuccess) {
    const retryAfterSeconds = Math.ceil((hourlyReset - Date.now()) / 1000)
    const vagueTime = getVagueRetryTime(retryAfterSeconds)
    return { 
      success: false, 
      error: `パスワードリセット試行回数の上限に達しました。${vagueTime}後に再試行してください。` 
    }
  }

  // 🆕 レート制限チェック（日次制限）
  const { success: dailySuccess, reset: dailyReset } = await passwordResetDailyLimiter.limit(email.toLowerCase())

  if (!dailySuccess) {
    const retryAfterSeconds = Math.ceil((dailyReset - Date.now()) / 1000)
    const vagueTime = getVagueRetryTime(retryAfterSeconds)
    return { 
      success: false, 
      error: `パスワードリセット試行回数の上限に達しました。${vagueTime}後に再試行してください。` 
    }
  }

  // パスワードリセットメール送信
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password/update`,
  })

  if (error) {
    // 🔒 エラーログのサニタイズ
    console.error('Password reset error:', {
      code: error.code,
      message: error.message,
    })
    return { success: false, error: error.message }
  }

  return { success: true, message: 'パスワード再設定用のリンクを送信しました' }
}

// ログイン処理
export async function loginAction(formData: FormData) {
  const emailOrUsername = formData.get('emailOrUsername') as string
  const password = formData.get('password') as string

  if (!emailOrUsername || !password) {
    return { 
      success: false, 
      error: 'メールアドレスまたはユーザーIDとパスワードを入力してください',
      locked: false,
      isEmailUnconfirmed: false
    }
  }

  // レート制限チェック
  const ip = await getClientIp()
  const limitKey = `${ip}:${emailOrUsername}`
  const { success: rateLimitSuccess, reset } = await loginFailureLimiter.limit(limitKey)

  if (!rateLimitSuccess) {
    const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000)
    
    // 🔒 セキュリティ改善: 時間を曖昧に表示
    const vagueTime = getVagueRetryTime(retryAfterSeconds)
    
    return { 
      success: false,
      error: `ログイン試行回数の上限に達しました。${vagueTime}後に再試行してください。`,
      locked: true,
      isEmailUnconfirmed: false
    }
  }

  try {
    let loginEmail = emailOrUsername

    // 🔒 タイミング攻撃対策: 常にprofilesテーブルをクエリ
    const adminSupabase = createAdminClient()
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('email')
      .eq('username', emailOrUsername.toLowerCase())
      .single()

    // メールアドレス形式かどうかで分岐
    if (!emailOrUsername.includes('@')) {
      // ユーザーIDの場合
      if (!profile?.email) {
        // ログイン失敗をカウント
        await loginFailureLimiter.limit(limitKey)
        return { 
          success: false, 
          error: 'メールアドレスまたはパスワードが正しくありません',
          locked: false,
          isEmailUnconfirmed: false
        }
      }
      loginEmail = profile.email
    }
    // メールアドレス形式の場合は emailOrUsername をそのまま使用

    // Supabaseでログイン（サーバー側）
    const supabase = await createServerClient()
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    })

    if (signInError) {
      // 🔒 エラーログのサニタイズ
      console.error('Login error:', {
        code: signInError.code,
        message: signInError.message,
        // email, password は含めない
      })
      
      // ログイン失敗をカウント
      const { success: retrySuccess } = await loginFailureLimiter.limit(limitKey)
      
      return { 
        success: false, 
        error: 'メールアドレスまたはパスワードが正しくありません',
        locked: !retrySuccess,
        isEmailUnconfirmed: false
      }
    }

    // メール認証チェック
    if (authData.user && !authData.user.email_confirmed_at) {
      await supabase.auth.signOut()
      return { 
        success: false,
        error: 'メールアドレスが認証されていません。認証メールをご確認ください。',
        locked: false,
        isEmailUnconfirmed: true,
        unconfirmedEmail: loginEmail
      }
    }

    // プロフィールチェック
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    return { 
      success: true,
      needsProfile: !profileData || !profileData.username || !profileData.account_type,
      locked: false,
      isEmailUnconfirmed: false
    }

  } catch (error: any) {
    // 🔒 エラーログのサニタイズ
    console.error('Login error:', {
      message: error?.message || 'Unknown error',
      code: error?.code,
    })
    
    return { 
      success: false, 
      error: 'ログインに失敗しました',
      locked: false,
      isEmailUnconfirmed: false
    }
  }
}

// パスワード更新（リセット後）
export async function updatePasswordAction(formData: FormData) {
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('passwordConfirm') as string

  if (!password || !passwordConfirm) {
    return { 
      success: false, 
      error: 'パスワードを入力してください' 
    }
  }

  if (password !== passwordConfirm) {
    return { 
      success: false, 
      error: 'パスワードが一致しません' 
    }
  }

  // パスワードバリデーション
  if (password.length < 8) {
    return { 
      success: false, 
      error: 'パスワードは8文字以上で入力してください' 
    }
  }
  if (!/[a-z]/.test(password)) {
    return { 
      success: false, 
      error: 'パスワードには小文字を含めてください' 
    }
  }
  if (!/[0-9]/.test(password)) {
    return { 
      success: false, 
      error: 'パスワードには数字を含めてください' 
    }
  }

  try {
    const supabase = await createServerClient()
    
    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      // 🔒 エラーログのサニタイズ
      console.error('Update password error:', {
        code: error.code,
        message: error.message,
      })
      return { 
        success: false, 
        error: error.message 
      }
    }

    return { 
      success: true, 
      message: 'パスワードを更新しました' 
    }

  } catch (error: any) {
    // 🔒 エラーログのサニタイズ
    console.error('Update password error:', {
      message: error?.message || 'Unknown error',
      code: error?.code,
    })
    return { 
      success: false, 
      error: 'パスワードの更新に失敗しました' 
    }
  }
}