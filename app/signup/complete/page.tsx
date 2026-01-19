import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SignupCompleteClient } from './client'

export const metadata: Metadata = {
  title: 'プロフィール設定 | 同人ワークス',
  description: 'アカウント情報を設定して登録を完了してください。',
}

export default async function SignupCompletePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <SignupCompleteClient user={user} />
}