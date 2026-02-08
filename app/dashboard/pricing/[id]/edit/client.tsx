'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { PricingPlan } from '../../_components/types'
import PricingForm from '../../_components/PricingForm'
import { LoadingSpinner } from '@/app/components/Skeleton'
import styles from './page.module.css'

export default function PricingEditClient() {
  const router = useRouter()
  const params = useParams()
  const planId = params.id as string

  const [loading, setLoading] = useState(true)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [planData, setPlanData] = useState<PricingPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [planId])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) return

    setProfileId(profile.id)

    // 料金プランデータを取得
    const { data: plan, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('id', planId)
      .eq('creator_id', profile.id)
      .single()

    if (error || !plan) {
      setError('料金プランが見つかりません')
      return
    }

    setPlanData(plan)
    setLoading(false)
  }

  function handleCancel() {
    router.push('/dashboard/pricing')
  }

  if (loading && !error) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.alertError}>
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {profileId && planData && (
        <PricingForm
          initialData={planData}
          userId={profileId}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}