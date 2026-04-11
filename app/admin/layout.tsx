import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AdminShell from './AdminShell'
import './admin.css'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/')
  }

  return <AdminShell>{children}</AdminShell>
}
