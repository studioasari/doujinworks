'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import PricingForm from '../_components/PricingForm'
import { LoadingSpinner } from '@/app/components/Skeleton'
import styles from './page.module.css'

export default function PricingNewClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profileId, setProfileId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

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
    setLoading(false)
  }

  function handleCancel() {
    router.push('/dashboard/pricing')
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className={styles.container}>
      {profileId && (
        <PricingForm
          userId={profileId}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}