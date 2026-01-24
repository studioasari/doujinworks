'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import PricingForm from '../_components/PricingForm'
import styles from './page.module.css'

export default function PricingNewClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      router.push('/login')
      return
    }

    setUserId(profile.id)
    setLoading(false)
  }

  function handleCancel() {
    router.push('/dashboard/pricing')
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <i className="fas fa-spinner fa-spin"></i>
        <span>読み込み中...</span>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {userId && (
        <PricingForm
          userId={userId}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}