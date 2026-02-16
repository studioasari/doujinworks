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
  // 1. プロフィール未完成でもアクセス可のパス
  //    （無限ループ防止用）
  // ========================================
  const allowWithoutProfile = [
    '/signup/complete',
    '/auth',
    '/login',
    '/signup',
  ]

  // 削除済みアカウントでもアクセス可のパス
  const allowWhenDeleted = [
    '/account-deleted',
    '/auth',
    '/login',
    '/signup',
  ]

  // セッション取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ========================================
  // 2. 未ログインユーザー → そのまま通す
  //    （認証が必要なページではクライアント側でモーダル表示）
  // ========================================
  if (!user) {
    return response
  }

  // ========================================
  // 3. ログイン済みユーザーの処理
  // ========================================
  
  // プロフィール未完成でもアクセス可のパスならスキップ
  if (allowWithoutProfile.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return response
  }

  // プロフィールチェック（deleted_atも取得）
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, account_type, deleted_at')
    .eq('user_id', user.id)
    .maybeSingle()

  // プロフィール未完成の場合は /signup/complete にリダイレクト
  if (!profile || !profile.username || !profile.account_type) {
    return NextResponse.redirect(new URL('/signup/complete', request.url))
  }

  // ========================================
  // 4. 削除済みアカウントのチェック
  // ========================================
  if (profile.deleted_at) {
    // 削除済みでもアクセス可のパスならスキップ
    if (allowWhenDeleted.some(path => pathname === path || pathname.startsWith(path + '/'))) {
      return response
    }

    // それ以外は /account-deleted にリダイレクト
    return NextResponse.redirect(new URL('/account-deleted', request.url))
  }

  return response
}