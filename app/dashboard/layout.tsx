/**
 * app/dashboard/layout.tsx
 * 
 * ダッシュボード共通レイアウト
 * サイドバーをここに配置することで、ページ遷移時の再レンダリングを防止
 */

import DashboardSidebar from '@/app/components/DashboardSidebar'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import { createClient } from '@/utils/supabase/server'
import styles from './layout.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // ユーザー情報を取得
  const { data: { user } } = await supabase.auth.getUser()
  
  let accountType = null
  let isAdmin = false
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type, is_admin')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      accountType = profile.account_type
      isAdmin = profile.is_admin ?? false
    }
  }

  return (
    <>
      <Header />
      <div className={styles.dashboardLayout}>
        <DashboardSidebar accountType={accountType} isAdmin={isAdmin} />
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
      <Footer />
    </>
  )
}