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

  // プロフィールが既に存在するか確認
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('user_id', user.id)
    .maybeSingle()

  // プロフィールが完成している場合はダッシュボードへリダイレクト
  if (profile && profile.account_type) {
    redirect('/dashboard')
  }

  return <SignupCompleteClient user={user} />
}