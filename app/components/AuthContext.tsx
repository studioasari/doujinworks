'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

type AuthContextType = {
  /** 現在のユーザーID（未ログインならnull） */
  userId: string | null
  /** 認証チェック完了済みか */
  ready: boolean
  /**
   * 認証が必要なアクションを実行する。
   * 未ログインならモーダルを出してfalseを返す。
   * ログイン済みならtrueを返す。
   * 
   * 使い方:
   * ```
   * async function handleLike() {
   *   if (!requireAuth()) return
   *   // いいね処理
   * }
   * ```
   */
  requireAuth: () => boolean
  /** モーダルを表示中か */
  showAuthModal: boolean
  /** モーダルを閉じる */
  closeAuthModal: () => void
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  ready: false,
  requireAuth: () => false,
  showAuthModal: false,
  closeAuthModal: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const initialCheckDone = useRef(false)

  useEffect(() => {
    if (initialCheckDone.current) return
    initialCheckDone.current = true

    const supabase = createClient()

    // 初回チェック
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
      setReady(true)
    })

    // 認証状態変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
      // ログインしたらモーダルを閉じる
      if (session?.user) {
        setShowAuthModal(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const requireAuth = useCallback(() => {
    if (userId) return true
    setShowAuthModal(true)
    return false
  }, [userId])

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false)
  }, [])

  return (
    <AuthContext.Provider value={{ userId, ready, requireAuth, showAuthModal, closeAuthModal }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}