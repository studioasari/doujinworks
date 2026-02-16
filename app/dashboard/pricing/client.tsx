'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/utils/supabase'
import { PricingPlan, CATEGORIES } from './_components/types'
import { LoadingSpinner } from '@/app/components/Skeleton'
import styles from './page.module.css'

// 削除確認モーダル
function ConfirmModal({
  planName,
  onConfirm,
  onCancel
}: {
  planName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="modal-overlay active" onClick={onCancel}>
      <div className={`modal ${styles.confirmModal}`} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.confirmIcon} ${styles.danger}`}>
          <i className="fas fa-trash-alt"></i>
        </div>
        <h2 className={styles.confirmTitle}>料金プランを削除</h2>
        <p className={styles.confirmMessage}>
          「{planName}」を削除しますか？<br />この操作は取り消せません。
        </p>
        <div className="button-group-equal">
          <button onClick={onCancel} className="btn btn-secondary">
            キャンセル
          </button>
          <button onClick={onConfirm} className={styles.btnDanger}>
            削除する
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PricingListClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [error, setError] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    planId: string
    planName: string
  }>({ show: false, planId: '', planName: '' })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('user_id', user.id)
      .single()

    if (!profile) return

    setProfileId(profile.id)
    await fetchPricingPlans(profile.id)
    setLoading(false)
  }

  async function fetchPricingPlans(pid: string) {
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('creator_id', pid)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('料金プラン取得エラー:', error)
      return
    }

    setPricingPlans(data || [])
  }

  function showDeleteConfirm(plan: PricingPlan) {
    setConfirmModal({
      show: true,
      planId: plan.id,
      planName: plan.plan_name
    })
  }

  async function handleDelete() {
    const { planId } = confirmModal
    setConfirmModal({ show: false, planId: '', planName: '' })
    setError(null)

    try {
      const { error } = await supabase
        .from('pricing_plans')
        .delete()
        .eq('id', planId)

      if (error) throw error

      if (profileId) {
        await fetchPricingPlans(profileId)
      }
    } catch (err) {
      console.error('削除エラー:', err)
      setError('削除に失敗しました')
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>料金表管理</h1>
          <div className={styles.headerActions}>
            <Link href="/dashboard/pricing/new" className="btn btn-primary btn-sm">
              <i className="fas fa-plus"></i>
              新規追加
            </Link>
          </div>
        </div>

        {error && (
          <div className={styles.alertError}>
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {/* 料金プラン一覧 */}
        <div className={styles.listSection}>
          <h2 className={styles.listTitle}>
            登録済みプラン（{pricingPlans.length}件）
          </h2>

          {pricingPlans.length === 0 ? (
            <div className={`empty-state ${styles.emptyStateCentered}`}>
              <i className="far fa-file-lines"></i>
              <p>料金プランが登録されていません</p>
              <Link href="/dashboard/pricing/new" className="btn btn-primary">
                <i className="fas fa-plus"></i>
                新規追加
              </Link>
            </div>
          ) : (
            <div className={styles.planList}>
              {pricingPlans.map(plan => {
                const categoryInfo = CATEGORIES.find(c => c.value === plan.category)
                return (
                  <div 
                    key={plan.id} 
                    className={styles.planCard}
                    onClick={() => router.push(`/pricing/${plan.id}`)}
                  >
                    <img
                      src={plan.thumbnail_url}
                      alt={plan.plan_name}
                      className={styles.planThumbnail}
                    />
                    <div className={styles.planContent}>
                      <div className={styles.planTags}>
                        <span className="badge">
                          <i className={categoryInfo?.icon}></i> {categoryInfo?.label}
                        </span>
                        <span className={`badge ${plan.is_public ? 'badge-success' : ''}`}>
                          {plan.is_public ? '公開中' : '下書き'}
                        </span>
                      </div>
                      <h3 className={styles.planName}>{plan.plan_name}</h3>
                      <p className={styles.planPrice}>
                        ¥{plan.minimum_price.toLocaleString()}〜
                      </p>
                    </div>
                    <div className={styles.planActions} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/dashboard/pricing/${plan.id}/edit`)}
                        className="btn btn-secondary btn-sm"
                      >
                        <i className="fas fa-pen"></i>
                        編集
                      </button>
                      <button
                        onClick={() => showDeleteConfirm(plan)}
                        className="btn btn-secondary btn-sm"
                      >
                        <i className="fas fa-trash-alt"></i>
                        削除
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {confirmModal.show && (
        <ConfirmModal
          planName={confirmModal.planName}
          onConfirm={handleDelete}
          onCancel={() => setConfirmModal({ show: false, planId: '', planName: '' })}
        />
      )}
    </>
  )
}