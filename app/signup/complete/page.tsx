import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SignupCompleteClient } from './client'

export default async function SignupCompletePage() {
  // サーバー側でセッションチェック
  const supabase = await createClient()
  
  // 🔒 認証サーバーで確認
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }
  
  // 🔒 プロフィールの厳密なチェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, username, display_name, account_type')
    .eq('user_id', user.id)
    .maybeSingle()
  
  // ✅ プロフィールが既に完成している場合は即座にリダイレクト
  // 複数タブでの同時アクセスを防止
  if (profile && profile.username && profile.account_type) {
    redirect('/dashboard')
  }
  
  // Client Component にユーザー情報を渡す
  return <SignupCompleteClient user={user} />
}