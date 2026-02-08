'use client'

import { useEffect } from 'react'
import { useAuth } from '@/app/components/AuthContext'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import styles from './AuthRequiredModal.module.css'

/**
 * 認証が必要な時に表示するモーダル。
 * 
 * 2つの使い方：
 * 1. AuthContextから showAuthModal=true で表示（アクション時）
 * 2. ProtectedContentから直接表示（URL直打ち時のフォールバック）
 * 
 * standalone=true の場合はAuthContextに依存せず単体で表示する（ProtectedContent用）
 */
export default function AuthRequiredModal({ standalone = false }: { standalone?: boolean }) {
  const auth = standalone ? null : useAuth()
  const pathname = usePathname()

  const isVisible = standalone || auth?.showAuthModal

  // モーダル表示中はbodyのスクロールを無効化
  useEffect(() => {
    if (!isVisible) return

    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isVisible])

  if (!isVisible) {
    return null
  }

  const redirectUrl = encodeURIComponent(pathname)

  function handleOverlayClick() {
    if (!standalone && auth) {
      auth.closeAuthModal()
    }
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 閉じるボタン（standaloneでない場合のみ） */}
        {!standalone && auth && (
          <button className={styles.closeBtn} onClick={auth.closeAuthModal} aria-label="閉じる">
            <i className="fas fa-times"></i>
          </button>
        )}

        <div className={styles.icon}>
          <i className="fas fa-lock"></i>
        </div>

        <h2 className={styles.title}>ログインが必要です</h2>

        <p className={styles.message}>
          この機能を使うにはログインまたは会員登録が必要です。
        </p>

        <div className={styles.actions}>
          <Link
            href={`/login?redirect=${redirectUrl}`}
            className={styles.loginBtn}
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className={styles.signupBtn}
          >
            会員登録
          </Link>
        </div>

        {!standalone && auth && (
          <button className={styles.cancelBtn} onClick={auth.closeAuthModal}>
            あとで
          </button>
        )}
      </div>
    </div>
  )
}