'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import AuthRequiredModal from '@/app/components/AuthRequiredModal'

// 認証不要の公開パス
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
  '/tags',
]

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    path => pathname === path || pathname.startsWith(path + '/')
  )
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