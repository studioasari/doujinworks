'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function AccountDeletedClient() {
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(false)
  const [deletedAt, setDeletedAt] = useState<Date | null>(null)
  const [daysRemaining, setDaysRemaining] = useState(0)
  const [canRestore, setCanRestore] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const RESTORE_PERIOD_DAYS = 30

  useEffect(() => {
    loadDeletedStatus()
  }, [])

  const loadDeletedStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('deleted_at')
      .eq('user_id', user.id)
      .single()

    if (!profile?.deleted_at) {
      // 削除されていない → ダッシュボードへ
      router.push('/dashboard')
      return
    }

    const deleted = new Date(profile.deleted_at)
    const now = new Date()
    const diffMs = now.getTime() - deleted.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const remaining = RESTORE_PERIOD_DAYS - diffDays

    setDeletedAt(deleted)
    setDaysRemaining(Math.max(0, remaining))
    setCanRestore(remaining > 0)
    setLoading(false)
  }

  const handleRestore = async () => {
    setRestoring(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ deleted_at: null })
      .eq('user_id', user.id)

    if (updateError) {
      setError('アカウントの復元に失敗しました。もう一度お試しください。')
      setRestoring(false)
      return
    }

    router.push('/dashboard')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <i className="fa-solid fa-user-slash"></i>
        </div>

        <h1 className={styles.title}>アカウントは削除されています</h1>

        <p className={styles.desc}>
          {deletedAt && (
            <>
              {deletedAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
              にアカウントの削除手続きが行われました。
            </>
          )}
        </p>

        {canRestore ? (
          <>
            <div className={styles.info}>
              <i className="fa-solid fa-clock"></i>
              <span>
                復元可能な期間は残り <strong>{daysRemaining}日</strong> です。期間を過ぎると、ご自身での復元はできなくなります。
              </span>
            </div>

            {error && (
              <p className={styles.error}>
                <i className="fa-solid fa-circle-exclamation"></i> {error}
              </p>
            )}

            <div className={styles.actions}>
              <button
                onClick={handleRestore}
                disabled={restoring}
                className={styles.restoreBtn}
              >
                {restoring ? '復元中...' : 'アカウントを復元する'}
              </button>
              <button
                onClick={handleSignOut}
                disabled={restoring}
                className={styles.signOutBtn}
              >
                サインアウト
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.expired}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>
                復元可能な期間（{RESTORE_PERIOD_DAYS}日間）を過ぎたため、ご自身での復元はできません。復元をご希望の場合は、サポートまでお問い合わせください。
              </span>
            </div>

            <div className={styles.actions}>
              <a href="mailto:support@doujinworks.com" className={styles.contactBtn}>
                <i className="fa-solid fa-envelope"></i>
                サポートに問い合わせる
              </a>
              <button
                onClick={handleSignOut}
                className={styles.signOutBtn}
              >
                サインアウト
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}