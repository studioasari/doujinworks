'use client'

export const runtime = 'nodejs'

import { useState } from 'react'
import { getSupabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  
  const supabase = getSupabase()

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: Math.random().toString(36).slice(-8),
        options: {
          emailRedirectTo: 'https://www.dojinworks.com/signup/complete',
        },
      })

      if (error) throw error

      router.push('/signup/verify')
    } catch (error: any) {
      setError(error.message || '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialSignup = async (provider: 'google' | 'twitter' | 'discord') => {
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'https://www.dojinworks.com/signup/complete',
        },
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message || '登録に失敗しました')
      setLoading(false)
    }
  }

  return (
    <div className="container-narrow" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      {/* ... 以下同じ ... */}
    </div>
  )
}