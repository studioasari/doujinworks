'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import AuthRequiredModal from '@/app/components/AuthRequiredModal'

// 認証不要の公開パス（完全一致）
const publicExactPaths = [
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/about',
  '/terms',
  '/privacy',
  '/search',
]

// 認証不要の公開パス（前方一致：配下も全て公開）
const publicPrefixPaths = [
  '/auth',
  '/portfolio',
  '/creators',
  '/tags',
]

// 認証不要の公開パス（特殊ルール）
// /requests → 公開（一覧）
// /requests/create → 保護
// /requests/manage → 保護
// /requests/[id] → 公開（詳細）
// /requests/[id]/manage → 保護
// /requests/[id]/contracts → 保護
// /pricing → 公開（一覧）
// /pricing/[id] → 公開（詳細）
// /pricing/new → 保護（dashboard配下なので既に保護）

function isPublicPath(pathname: string): boolean {
  // 完全一致
  if (publicExactPaths.includes(pathname)) return true

  // 前方一致（配下全て公開）
  if (publicPrefixPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return true
  }

  // /requests の特殊ルール
  if (pathname === '/requests') return true
  if (pathname.startsWith('/requests/')) {
    const segments = pathname.split('/').filter(Boolean)
    // /requests/create → 保護
    if (segments[1] === 'create') return false
    // /requests/manage → 保護
    if (segments[1] === 'manage') return false
    // /requests/[id] → 公開（2セグメントのみ）
    if (segments.length === 2) return true
    // /requests/[id]/manage, /requests/[id]/contracts 等 → 保護
    return false
  }

  // /pricing の特殊ルール
  if (pathname === '/pricing') return true
  if (pathname.startsWith('/pricing/')) {
    const segments = pathname.split('/').filter(Boolean)
    // /pricing/[id] → 公開（2セグメントのみ）
    if (segments.length === 2) return true
    // それ以外 → 保護
    return false
  }

  return false
}

/**
 * URL直打ちで保護ページにアクセスした場合のフォールバック。
 * ログイン済みユーザーの通常ナビゲーションでは透過的に通過する。
 * 未ログインの場合はページを表示せずモーダルだけ出す。
 */
export default function ProtectedContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const needsAuth = !isPublicPath(pathname)
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>(
    needsAuth ? 'checking' : 'authenticated'
  )
  const checkedPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!needsAuth) {
      setAuthState('authenticated')
      checkedPathRef.current = null
      return
    }

    // 既に認証済みなら再チェック不要（ダッシュボード内の遷移等）
    if (authState === 'authenticated') {
      return
    }

    if (checkedPathRef.current === pathname) {
      return
    }

    setAuthState('checking')

    let cancelled = false

    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (cancelled) return

      checkedPathRef.current = pathname
      setAuthState(user ? 'authenticated' : 'unauthenticated')
    }

    checkAuth()

    return () => {
      cancelled = true
    }
  }, [pathname, needsAuth])

  // 公開パス → そのまま表示
  if (!needsAuth) {
    return <>{children}</>
  }

  // チェック中 → 何も表示しない（ちらつき防止）
  if (authState === 'checking') {
    return null
  }

  // 未ログイン → standaloneモーダルだけ表示（閉じるボタンなし、ページの中身は見せない）
  if (authState === 'unauthenticated') {
    return <AuthRequiredModal standalone={true} />
  }

  // ログイン済み → そのまま表示
  return <>{children}</>
}