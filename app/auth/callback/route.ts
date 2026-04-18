import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * オープンリダイレクト脆弱性を防ぐための安全なリダイレクトURL生成
 */
function getSafeRedirectUrl(next: string | null, baseUrl: string): string {
  const defaultPath = '/signup/complete'
  
  if (!next) {
    return new URL(defaultPath, baseUrl).toString()
  }
  
  if (!next.startsWith('/')) {
    console.warn('⚠️ Invalid redirect: not a relative path -', next)
    return new URL(defaultPath, baseUrl).toString()
  }
  
  if (next.startsWith('//')) {
    console.warn('⚠️ Invalid redirect: double slash -', next)
    return new URL(defaultPath, baseUrl).toString()
  }
  
  return new URL(next, baseUrl).toString()
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const nextParam = requestUrl.searchParams.get('next')

  if (!code && !token_hash) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // 👇 ここでCookieが自動設定される
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
  
  let session = null
  
  // token_hash がある場合（メール認証）
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'email' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
    })
    
    if (error) {
      console.error('メール認証エラー:', error)
      
      const errorMessage = error.message.toLowerCase()
      
      if (errorMessage.includes('expired') || 
          errorMessage.includes('invalid') ||
          errorMessage.includes('already') ||
          errorMessage.includes('used')) {
        return NextResponse.redirect(
          new URL('/login?error=token_expired', request.url)
        )
      }
      
      return NextResponse.redirect(
        new URL('/login?error=auth_failed', request.url)
      )
    }
    
    session = data.session
  }
  // code がある場合（OAuth等）
  else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('OAuth認証エラー:', error)
      
      const errorMessage = error.message.toLowerCase()
      
      if (errorMessage.includes('expired') || 
          errorMessage.includes('invalid') ||
          errorMessage.includes('already') ||
          errorMessage.includes('used')) {
        return NextResponse.redirect(
          new URL('/login?error=token_expired', request.url)
        )
      }
      
      return NextResponse.redirect(
        new URL('/login?error=auth_failed', request.url)
      )
    }
    
    session = data.session
  }

  if (!session) {
    return NextResponse.redirect(new URL('/login?error=no_session', request.url))
  }

  // 安全なリダイレクトURLを生成
  const safeRedirectUrl = getSafeRedirectUrl(nextParam, request.url)
  
  // 👇 Cookie設定の部分を削除（Supabaseが自動でやってくれる）
  return NextResponse.redirect(safeRedirectUrl)
}