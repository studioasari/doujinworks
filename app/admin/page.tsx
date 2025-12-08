'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import LoadingScreen from '../components/LoadingScreen'

type Stats = {
  totalUsers: number
  totalRequests: number
  totalRevenue: number
  pendingPayments: number
  activeRequests: number
  completedRequests: number
}

type RecentActivity = {
  id: string
  type: string
  title: string
  user: string
  created_at: string
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalRequests: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    activeRequests: 0,
    completedRequests: 0
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/admin'))
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()
    
    if (!profile?.is_admin) {
      alert('管理者権限がありません')
      router.push('/')
      return
    }

    setIsAdmin(true)
    await Promise.all([
      loadStats(),
      loadRecentActivities()
    ])
    setLoading(false)
  }

  async function loadStats() {
    try {
      // ユーザー数
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // 依頼数
      const { count: requestCount } = await supabase
        .from('work_requests')
        .select('*', { count: 'exact', head: true })

      // 進行中の依頼
      const { count: activeCount } = await supabase
        .from('work_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'contracted', 'paid', 'delivered'])

      // 完了した依頼
      const { data: completedRequests } = await supabase
        .from('work_requests')
        .select('id, final_price')
        .eq('status', 'completed')

      const completedCount = completedRequests?.length || 0

      // 総売上
      const totalRevenue = (completedRequests || []).reduce(
        (sum, req) => sum + (req.final_price || 0),
        0
      )

      // 未払い件数（完了した依頼のうち、paymentsテーブルにstatus='paid'のレコードがないもの）
      let pendingCount = 0
      if (completedRequests && completedRequests.length > 0) {
        for (const req of completedRequests) {
          const { data: payment } = await supabase
            .from('payments')
            .select('status')
            .eq('work_request_id', req.id)
            .single()

          if (!payment || payment.status === 'pending') {
            pendingCount++
          }
        }
      }

      setStats({
        totalUsers: userCount || 0,
        totalRequests: requestCount || 0,
        totalRevenue: totalRevenue,
        pendingPayments: pendingCount,
        activeRequests: activeCount || 0,
        completedRequests: completedCount
      })
    } catch (error) {
      console.error('統計取得エラー:', error)
    }
  }

  async function loadRecentActivities() {
    try {
      // 最近の依頼を取得
      const { data: requests } = await supabase
        .from('work_requests')
        .select(`
          id,
          title,
          status,
          created_at,
          requester_id
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!requests) return

      const activities: RecentActivity[] = await Promise.all(
        requests.map(async (req) => {
          const { data: user } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', req.requester_id)
            .single()

          return {
            id: req.id,
            type: 'request',
            title: req.title,
            user: user?.display_name || '名前未設定',
            created_at: req.created_at
          }
        })
      )

      setRecentActivities(activities)
    } catch (error) {
      console.error('アクティビティ取得エラー:', error)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (!isAdmin) {
    return null
  }

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow" style={{ padding: '40px 20px' }}>
          <h1 className="section-title mb-32">管理画面</h1>

          {/* ナビゲーション */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <Link href="/admin" className="btn-primary">
              ダッシュボード
            </Link>
            <Link href="/admin/payments" className="btn-secondary">
              振込管理
            </Link>
            <Link href="/admin/users" className="btn-secondary">
              ユーザー管理
            </Link>
          </div>

          {/* 統計カード */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '16px', 
            marginBottom: '32px' 
          }}>
            <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>
                {stats.totalUsers}
              </div>
              <div className="text-small text-gray">総ユーザー数</div>
            </div>

            <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>
                {stats.totalRequests}
              </div>
              <div className="text-small text-gray">総依頼数</div>
            </div>

            <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>
                {stats.totalRevenue.toLocaleString()}円
              </div>
              <div className="text-small text-gray">総売上</div>
            </div>

            <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>
                {stats.activeRequests}
              </div>
              <div className="text-small text-gray">進行中の依頼</div>
            </div>

            <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>
                {stats.completedRequests}
              </div>
              <div className="text-small text-gray">完了した依頼</div>
            </div>

            <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px', color: '#FF4444' }}>
                {stats.pendingPayments}
              </div>
              <div className="text-small text-gray">未払い件数</div>
            </div>
          </div>

          {/* 最近のアクティビティ */}
          <div className="card-no-hover p-24">
            <h2 className="card-title mb-24">最近のアクティビティ</h2>

            {recentActivities.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p className="text-small text-gray">
                  アクティビティはありません
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentActivities.map((activity, index) => (
                  <Link
                    key={activity.id}
                    href={`/requests/${activity.id}`}
                    className="card-hover p-16"
                    style={{
                      textDecoration: 'none',
                      borderBottom: index < recentActivities.length - 1 ? '1px solid #E5E5E5' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A', marginBottom: '4px' }}>
                          {activity.title}
                        </div>
                        <div className="text-small text-gray">
                          {activity.user} が依頼を投稿
                        </div>
                      </div>
                      <div className="text-small text-gray" style={{ flexShrink: 0, marginLeft: '16px' }}>
                        {formatDate(activity.created_at)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}