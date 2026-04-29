'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/components/AuthContext'
import AuthRequiredModal from '@/app/components/AuthRequiredModal'

// 認証不要の公開パス（完全一致）
const publicExactPaths = [
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/terms',
  '/privacy',
  '/law',
  '/cookie_policy',
  '/lp',
  '/search',
]

// 認証不要の公開パス（前方一致：配下も全て公開）
const publicPrefixPaths = [
  '/auth',
  '/portfolio',
  '/creators',
  '/tags',
]

// サーバーサイドで認証・認可チェック済みのパス（前方一致）
// これらのパスは layout.tsx などのサーバーコンポーネントで
// 認証チェックして redirect() するため、クライアント側の
// ProtectedContent では何もせずそのまま描画する。
// （クライアント側でモーダルを出すとサーバーのリダイレクトを邪魔してしまう）
//
// 将来 /dashboard などもサーバー保護に移行する場合は、
// 対応する layout.tsx をサーバーコンポーネント化した上で
// ここに追加する。
const serverProtectedPaths = [
  '/admin',
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

function isServerProtectedPath(pathname: string): boolean {
  return serverProtectedPaths.some(
    path => pathname === path || pathname.startsWith(path + '/')
  )
}

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
 * URL直打ち / 内部遷移を問わず保護ページの認証ガードを行う。
 *
 * 認証状態は AuthContext の userId / ready を真値とする。
 * AuthContext は onAuthStateChange を購読しているため、
 * ログイン/ログアウトは即座に反映される。
 *
 * 描画分岐:
 *   - サーバー保護パス（/admin/*）: 透過（layout.tsx 側で redirect 済み）
 *   - 公開パス: 透過
 *   - ready=false（初回認証チェック中）: null
 *   - userId=null（未ログイン）: standalone モーダル
 *   - その他: 透過
 */
export default function ProtectedContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { userId, ready } = useAuth()

  const isServerProtected = isServerProtectedPath(pathname)

  // サーバー保護ページ → クライアント側は何もせず透過
  // （サーバー側の redirect() に任せる）
  if (isServerProtected) {
    return <>{children}</>
  }

  // 公開パス → ready を待たず即透過
  if (isPublicPath(pathname)) {
    return <>{children}</>
  }

  // 初回認証チェック中 → 何も表示しない（ちらつき防止）
  if (!ready) {
    return null
  }

  // 未ログイン → standaloneモーダルだけ表示（閉じるボタンなし、ページの中身は見せない）
  if (userId === null) {
    return <AuthRequiredModal standalone={true} />
  }

  // ログイン済み → そのまま表示
  return <>{children}</>
}
