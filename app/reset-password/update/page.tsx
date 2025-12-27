import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { UpdatePasswordClient } from './client'

export default async function UpdatePasswordPage() {
  // サーバー側でセッションチェック
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/reset-password?error=invalid_session')
  }
  
  return <UpdatePasswordClient />
}