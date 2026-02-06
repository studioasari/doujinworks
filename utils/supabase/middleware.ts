import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // 🔒 セッション有効期限の統一: 7日間
          const cookieOptions: CookieOptions = {
            ...options,
            maxAge: 60 * 60 * 24 * 7, // 7日間（秒単位）
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          }

          request.cookies.set({
            name,
            value,
            ...cookieOptions,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...cookieOptions,
          })
        },
        remove(name: string, options: CookieOptions) {
          const cookieOptions: CookieOptions = {
            ...options,
            maxAge: 0,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          }

          request.cookies.set({
            name,
            value: '',
            ...cookieOptions,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...cookieOptions,
          })
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // ========================================
  // 1. 認証不要のパス（未ログインでもアクセス可）
  // ========================================
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/reset-password',
    '/auth',
    '/about',
    '/terms',
    '/privacy',
    '/portfolio',
    '/creators',
    '/requests',
    '/pricing',
    '/search',
  ]

  // ========================================
  // 2. プロフィール未完成でもアクセス可のパス
  //    （無限ループ防止用）
  // ========================================
  const allowWithoutProfile = [
    '/signup/complete',
    '/auth',
    '/login',
    '/signup',
  ]

  // セッション取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ========================================
  // 3. 未ログインユーザーの処理
  // ========================================
  if (!user) {
    // 公開パスならそのままアクセス許可
    if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
      return response
    }
    // 非公開パスならログインページへリダイレクト
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ========================================
  // 4. ログイン済みユーザーの処理
  // ========================================
  
  // プロフィール未完成でもアクセス可のパスならスキップ
  if (allowWithoutProfile.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return response
  }

  // プロフィールチェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, account_type')
    .eq('user_id', user.id)
    .maybeSingle()

  // プロフィール未完成の場合は /signup/complete にリダイレクト
  if (!profile || !profile.username || !profile.account_type) {
    return NextResponse.redirect(new URL('/signup/complete', request.url))
  }

  return response
}