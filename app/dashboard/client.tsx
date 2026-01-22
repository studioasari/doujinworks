'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
// Header/Footer/DashboardSidebar は layout.tsx で管理

type TabType = 'activity' | 'business'

type ActivityStats = {
  totalViews: number
  totalLikes: number
  totalFollowers: number
  totalComments: number
  weeklyViews: number
  weeklyLikes: number
  weeklyFollowers: number
  weeklyComments: number
}

type BusinessStats = {
  totalRevenue: number
  activeReceived: number
  activeSent: number
  pendingActions: number
  averageRating: number
  reviewCount: number
}

type PopularWork = {
  id: string
  title: string
  thumbnail_url: string | null
  view_count: number
  category: string
}

type RecentActivity = {
  id: string
  type: 'like' | 'follow' | 'comment'
  user_name: string
  user_avatar: string | null
  target_title?: string
  created_at: string
}

type RecentComment = {
  id: string
  content: string
  user_name: string
  user_avatar: string | null
  work_title: string
  created_at: string
}

type ActiveProject = {
  id: string
  title: string
  type: 'received' | 'sent'
  status: string
  other_party_name: string
  deadline: string | null
  final_price: number | null
}

type RecentTransaction = {
  id: string
  type: 'income' | 'expense'
  amount: number
  other_party_name: string
  paid_at: string
}

type ViewData = {
  date: string
  views: number
}

export default function DashboardClient() {
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [profileId, setProfileId] = useState<string>('')
  const [accountType, setAccountType] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('activity')
  
  // Activity Stats
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    totalViews: 0,
    totalLikes: 0,
    totalFollowers: 0,
    totalComments: 0,
    weeklyViews: 0,
    weeklyLikes: 0,
    weeklyFollowers: 0,
    weeklyComments: 0
  })
  const [popularWorks, setPopularWorks] = useState<PopularWork[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [recentComments, setRecentComments] = useState<RecentComment[]>([])
  const [viewData, setViewData] = useState<ViewData[]>([])
  const [viewPeriod, setViewPeriod] = useState<'7d' | '30d'>('7d')
  
  // Business Stats
  const [businessStats, setBusinessStats] = useState<BusinessStats>({
    totalRevenue: 0,
    activeReceived: 0,
    activeSent: 0,
    pendingActions: 0,
    averageRating: 0,
    reviewCount: 0
  })
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([])
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])

  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (profileId) {
      loadActivityData()
      if (accountType === 'business') {
        loadBusinessData()
      }
    }
  }, [profileId, accountType])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login?redirect=/dashboard')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      setCurrentUserId(user.id)
      setProfileId(profile.id)
      setAccountType(profile.account_type)
      setLoading(false)
    } else {
      router.push('/profile')
    }
  }

  async function loadActivityData() {
    try {
      // 作品の閲覧数合計
      const { data: portfolioItems } = await supabase
        .from('portfolio_items')
        .select('id, view_count')
        .eq('creator_id', profileId)

      const totalViews = portfolioItems?.reduce((sum, item) => sum + (item.view_count || 0), 0) || 0
      const portfolioIds = portfolioItems?.map(item => item.id) || []

      // いいね数
      let totalLikes = 0
      if (portfolioIds.length > 0) {
        const { count: likesCount } = await supabase
          .from('portfolio_likes')
          .select('*', { count: 'exact', head: true })
          .in('portfolio_item_id', portfolioIds)
        totalLikes = likesCount || 0
      }

      // フォロワー数
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId)

      // コメント数
      let totalComments = 0
      if (portfolioIds.length > 0) {
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .in('portfolio_item_id', portfolioIds)
        totalComments = commentsCount || 0
      }

      // 今週のデータ
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const weekAgoStr = oneWeekAgo.toISOString()

      let weeklyLikes = 0
      if (portfolioIds.length > 0) {
        const { count: weeklyLikesCount } = await supabase
          .from('portfolio_likes')
          .select('*', { count: 'exact', head: true })
          .in('portfolio_item_id', portfolioIds)
          .gte('created_at', weekAgoStr)
        weeklyLikes = weeklyLikesCount || 0
      }

      const { count: weeklyFollowersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId)
        .gte('created_at', weekAgoStr)

      let weeklyComments = 0
      if (portfolioIds.length > 0) {
        const { count: weeklyCommentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .in('portfolio_item_id', portfolioIds)
          .gte('created_at', weekAgoStr)
        weeklyComments = weeklyCommentsCount || 0
      }

      setActivityStats({
        totalViews,
        totalLikes,
        totalFollowers: followersCount || 0,
        totalComments,
        weeklyViews: 0, // view_countは累計なので週別は取れない
        weeklyLikes,
        weeklyFollowers: weeklyFollowersCount || 0,
        weeklyComments
      })

      // 人気作品TOP5
      const { data: popular } = await supabase
        .from('portfolio_items')
        .select('id, title, thumbnail_url, view_count, category')
        .eq('creator_id', profileId)
        .order('view_count', { ascending: false })
        .limit(5)

      setPopularWorks(popular || [])

      // 最近のアクティビティ
      await loadRecentActivities(portfolioIds)

      // 最近のコメント
      await loadRecentComments(portfolioIds)

      // 閲覧数推移（ダミーデータ - 実際はview履歴テーブルが必要）
      generateViewData()

    } catch (error) {
      console.error('Activity data error:', error)
    }
  }

  async function loadRecentActivities(portfolioIds: string[]) {
    const activities: RecentActivity[] = []

    // いいね
    if (portfolioIds.length > 0) {
      const { data: likes } = await supabase
        .from('portfolio_likes')
        .select(`
          id,
          created_at,
          portfolio_item_id,
          user_id
        `)
        .in('portfolio_item_id', portfolioIds)
        .order('created_at', { ascending: false })
        .limit(5)

      if (likes) {
        for (const like of likes) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', like.user_id)
            .single()

          const { data: item } = await supabase
            .from('portfolio_items')
            .select('title')
            .eq('id', like.portfolio_item_id)
            .single()

          activities.push({
            id: like.id,
            type: 'like',
            user_name: profile?.display_name || '名無し',
            user_avatar: profile?.avatar_url || null,
            target_title: item?.title,
            created_at: like.created_at
          })
        }
      }
    }

    // フォロー
    const { data: follows } = await supabase
      .from('follows')
      .select(`
        id,
        created_at,
        follower_id
      `)
      .eq('following_id', profileId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (follows) {
      for (const follow of follows) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', follow.follower_id)
          .single()

        activities.push({
          id: follow.id,
          type: 'follow',
          user_name: profile?.display_name || '名無し',
          user_avatar: profile?.avatar_url || null,
          created_at: follow.created_at
        })
      }
    }

    // ソートして最新5件
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setRecentActivities(activities.slice(0, 5))
  }

  async function loadRecentComments(portfolioIds: string[]) {
    if (portfolioIds.length === 0) {
      setRecentComments([])
      return
    }

    const { data: comments } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        portfolio_item_id
      `)
      .in('portfolio_item_id', portfolioIds)
      .order('created_at', { ascending: false })
      .limit(5)

    if (comments) {
      const formattedComments: RecentComment[] = []
      
      for (const comment of comments) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', comment.user_id)
          .single()

        const { data: item } = await supabase
          .from('portfolio_items')
          .select('title')
          .eq('id', comment.portfolio_item_id)
          .single()

        formattedComments.push({
          id: comment.id,
          content: comment.content,
          user_name: profile?.display_name || '名無し',
          user_avatar: profile?.avatar_url || null,
          work_title: item?.title || '',
          created_at: comment.created_at
        })
      }

      setRecentComments(formattedComments)
    }
  }

  function generateViewData() {
    const data: ViewData[] = []
    const days = viewPeriod === '7d' ? 7 : 30
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      data.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        views: Math.floor(Math.random() * 100) + 10 // ダミーデータ
      })
    }
    
    setViewData(data)
  }

  useEffect(() => {
    if (profileId) {
      generateViewData()
    }
  }, [viewPeriod, profileId])

  async function loadBusinessData() {
    try {
      // 総収益（受け取った支払い）
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('creator_id', profileId)
        .eq('status', 'completed')

      const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

      // 受注案件（進行中）
      const { data: receivedProjects, count: receivedCount } = await supabase
        .from('work_requests')
        .select('*', { count: 'exact' })
        .eq('selected_applicant_id', profileId)
        .in('status', ['contracted', 'in_progress', 'delivered'])

      // 発注案件（進行中）
      const { data: sentProjects, count: sentCount } = await supabase
        .from('work_requests')
        .select('*', { count: 'exact' })
        .eq('requester_id', profileId)
        .in('status', ['contracted', 'in_progress', 'delivered'])

      // 未対応（新しい依頼・応募）
      const { count: pendingApplications } = await supabase
        .from('work_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      const { count: pendingRequests } = await supabase
        .from('work_request_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // 平均評価
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', profileId)

      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0

      setBusinessStats({
        totalRevenue,
        activeReceived: receivedCount || 0,
        activeSent: sentCount || 0,
        pendingActions: (pendingApplications || 0) + (pendingRequests || 0),
        averageRating: avgRating,
        reviewCount: reviews?.length || 0
      })

      // 進行中の案件リスト
      const projects: ActiveProject[] = []

      if (receivedProjects) {
        for (const project of receivedProjects) {
          const { data: requester } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', project.requester_id)
            .single()

          projects.push({
            id: project.id,
            title: project.title,
            type: 'received',
            status: project.status,
            other_party_name: requester?.display_name || '名無し',
            deadline: project.deadline,
            final_price: project.final_price
          })
        }
      }

      if (sentProjects) {
        for (const project of sentProjects) {
          const { data: creator } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', project.selected_applicant_id)
            .single()

          projects.push({
            id: project.id,
            title: project.title,
            type: 'sent',
            status: project.status,
            other_party_name: creator?.display_name || '名無し',
            deadline: project.deadline,
            final_price: project.final_price
          })
        }
      }

      setActiveProjects(projects)

      // 最近の取引
      const { data: recentPayments } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          paid_at,
          creator_id,
          work_request_id
        `)
        .or(`creator_id.eq.${profileId}`)
        .order('paid_at', { ascending: false })
        .limit(5)

      if (recentPayments) {
        const transactions: RecentTransaction[] = []
        
        for (const payment of recentPayments) {
          const { data: workRequest } = await supabase
            .from('work_requests')
            .select('requester_id, selected_applicant_id')
            .eq('id', payment.work_request_id)
            .single()

          if (workRequest) {
            const isIncome = payment.creator_id === profileId
            const otherPartyId = isIncome ? workRequest.requester_id : workRequest.selected_applicant_id

            const { data: otherProfile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', otherPartyId)
              .single()

            transactions.push({
              id: payment.id,
              type: isIncome ? 'income' : 'expense',
              amount: payment.amount,
              other_party_name: otherProfile?.display_name || '名無し',
              paid_at: payment.paid_at
            })
          }
        }

        setRecentTransactions(transactions)
      }

    } catch (error) {
      console.error('Business data error:', error)
    }
  }

  function formatNumber(num: number): string {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toLocaleString()
  }

  function formatCurrency(num: number): string {
    return '¥' + num.toLocaleString()
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}分前`
    if (hours < 24) return `${hours}時間前`
    if (days < 7) return `${days}日前`
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  function getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      contracted: '契約中',
      in_progress: '作業中',
      delivered: '納品済み',
      pending: '確認待ち'
    }
    return labels[status] || status
  }

  function getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      contracted: '#5B7C99',
      in_progress: '#E6A23C',
      delivered: '#67C23A',
      pending: '#909399'
    }
    return colors[status] || '#909399'
  }

  function getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      illustration: 'fa-image',
      manga: 'fa-book',
      novel: 'fa-file-alt',
      music: 'fa-music',
      voice: 'fa-microphone',
      video: 'fa-video'
    }
    return icons[category] || 'fa-file'
  }

  // グラフの最大値を計算
  const maxViews = Math.max(...viewData.map(d => d.views), 1)

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      {loading ? (
        <div className="dashboard-loading">
          <i className="fas fa-spinner fa-spin"></i>
          <span>読み込み中...</span>
        </div>
      ) : (
        <div className="dashboard-container">
          {/* ヘッダー */}
          <div className="dashboard-header">
            <h1 className="dashboard-title">ダッシュボード</h1>
          </div>

          {/* タブ */}
          {accountType === 'business' && (
            <div className="dashboard-tabs">
              <button
                className={`dashboard-tab ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                <i className="fas fa-chart-line"></i>
                アクティビティ
              </button>
              <button
                className={`dashboard-tab ${activeTab === 'business' ? 'active' : ''}`}
                onClick={() => setActiveTab('business')}
              >
                <i className="fas fa-briefcase"></i>
                ビジネス
              </button>
            </div>
          )}

              {/* アクティビティタブ */}
              {activeTab === 'activity' && (
                <div className="dashboard-content">
                  {/* サマリーカード */}
                  <div className="dashboard-summary">
                    <div className="summary-card">
                      <div className="summary-icon views">
                        <i className="fas fa-eye"></i>
                      </div>
                      <div className="summary-data">
                        <span className="summary-value">{formatNumber(activityStats.totalViews)}</span>
                        <span className="summary-label">総閲覧数</span>
                      </div>
                    </div>
                    
                    <div className="summary-card">
                      <div className="summary-icon likes">
                        <i className="fas fa-heart"></i>
                      </div>
                      <div className="summary-data">
                        <span className="summary-value">{formatNumber(activityStats.totalLikes)}</span>
                        <span className="summary-label">いいね</span>
                        {activityStats.weeklyLikes > 0 && (
                          <span className="summary-change positive">+{activityStats.weeklyLikes} 今週</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="summary-card">
                      <div className="summary-icon followers">
                        <i className="fas fa-users"></i>
                      </div>
                      <div className="summary-data">
                        <span className="summary-value">{formatNumber(activityStats.totalFollowers)}</span>
                        <span className="summary-label">フォロワー</span>
                        {activityStats.weeklyFollowers > 0 && (
                          <span className="summary-change positive">+{activityStats.weeklyFollowers} 今週</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="summary-card">
                      <div className="summary-icon comments">
                        <i className="fas fa-comment"></i>
                      </div>
                      <div className="summary-data">
                        <span className="summary-value">{formatNumber(activityStats.totalComments)}</span>
                        <span className="summary-label">コメント</span>
                        {activityStats.weeklyComments > 0 && (
                          <span className="summary-change positive">+{activityStats.weeklyComments} 今週</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* メインコンテンツ */}
                  <div className="dashboard-grid">
                    {/* 閲覧数推移 */}
                    <div className="dashboard-card chart-card">
                      <div className="card-header">
                        <h2><i className="fas fa-chart-area"></i> 閲覧数の推移</h2>
                        <div className="period-toggle">
                          <button
                            className={viewPeriod === '7d' ? 'active' : ''}
                            onClick={() => setViewPeriod('7d')}
                          >
                            7日
                          </button>
                          <button
                            className={viewPeriod === '30d' ? 'active' : ''}
                            onClick={() => setViewPeriod('30d')}
                          >
                            30日
                          </button>
                        </div>
                      </div>
                      <div className="chart-container">
                        <div className="simple-chart">
                          {viewData.map((d, i) => (
                            <div key={i} className="chart-bar-wrapper">
                              <div
                                className="chart-bar"
                                style={{ height: `${(d.views / maxViews) * 100}%` }}
                              >
                                <span className="chart-tooltip">{d.views}</span>
                              </div>
                              <span className="chart-label">{d.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 人気作品 */}
                    <div className="dashboard-card">
                      <div className="card-header">
                        <h2><i className="fas fa-trophy"></i> 人気作品 TOP5</h2>
                        <Link href="/dashboard/portfolio" className="section-link">
                          すべて見る <i className="fas fa-arrow-right"></i>
                        </Link>
                      </div>
                      <div className="popular-list">
                        {popularWorks.length === 0 ? (
                          <div className="empty-state">
                            <i className="fas fa-image"></i>
                            <p>まだ作品がありません</p>
                            <Link href="/dashboard/portfolio/upload" className="empty-action">
                              作品を投稿する
                            </Link>
                          </div>
                        ) : (
                          popularWorks.map((work, index) => (
                            <Link key={work.id} href={`/portfolio/${work.id}`} className="popular-item">
                              <span className="popular-rank">{index + 1}</span>
                              <div className="popular-thumb">
                                {work.thumbnail_url ? (
                                  <img src={work.thumbnail_url} alt={work.title} />
                                ) : (
                                  <i className={`fas ${getCategoryIcon(work.category)}`}></i>
                                )}
                              </div>
                              <div className="popular-info">
                                <span className="popular-title">{work.title}</span>
                                <span className="popular-views">
                                  <i className="fas fa-eye"></i> {formatNumber(work.view_count)}
                                </span>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 最近のアクティビティ */}
                    <div className="dashboard-card">
                      <div className="card-header">
                        <h2><i className="fas fa-bell"></i> 最近のアクティビティ</h2>
                      </div>
                      <div className="activity-list">
                        {recentActivities.length === 0 ? (
                          <div className="empty-state small">
                            <i className="fas fa-bell-slash"></i>
                            <p>まだアクティビティはありません</p>
                          </div>
                        ) : (
                          recentActivities.map((activity) => (
                            <div key={activity.id} className="activity-item">
                              <div className="activity-avatar">
                                {activity.user_avatar ? (
                                  <img src={activity.user_avatar} alt="" />
                                ) : (
                                  <i className="fas fa-user"></i>
                                )}
                              </div>
                              <div className="activity-content">
                                <span className="activity-text">
                                  <strong>{activity.user_name}</strong>
                                  {activity.type === 'like' && (
                                    <> が「{activity.target_title}」にいいねしました</>
                                  )}
                                  {activity.type === 'follow' && (
                                    <> があなたをフォローしました</>
                                  )}
                                  {activity.type === 'comment' && (
                                    <> が「{activity.target_title}」にコメントしました</>
                                  )}
                                </span>
                                <span className="activity-time">{formatRelativeTime(activity.created_at)}</span>
                              </div>
                              <div className={`activity-icon ${activity.type}`}>
                                <i className={`fas ${activity.type === 'like' ? 'fa-heart' : activity.type === 'follow' ? 'fa-user-plus' : 'fa-comment'}`}></i>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 最近のコメント */}
                    <div className="dashboard-card">
                      <div className="card-header">
                        <h2><i className="fas fa-comments"></i> 最近のコメント</h2>
                      </div>
                      <div className="comment-list">
                        {recentComments.length === 0 ? (
                          <div className="empty-state small">
                            <i className="fas fa-comment-slash"></i>
                            <p>まだコメントはありません</p>
                          </div>
                        ) : (
                          recentComments.map((comment) => (
                            <div key={comment.id} className="comment-item">
                              <div className="comment-avatar">
                                {comment.user_avatar ? (
                                  <img src={comment.user_avatar} alt="" />
                                ) : (
                                  <i className="fas fa-user"></i>
                                )}
                              </div>
                              <div className="comment-content">
                                <div className="comment-header">
                                  <strong>{comment.user_name}</strong>
                                  <span className="comment-target">「{comment.work_title}」</span>
                                </div>
                                <p className="comment-text">{comment.content}</p>
                                <span className="comment-time">{formatRelativeTime(comment.created_at)}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ビジネスタブ */}
              {activeTab === 'business' && accountType === 'business' && (
                <div className="dashboard-content">
                  {/* サマリーカード */}
                  <div className="dashboard-summary">
                    <div className="summary-card">
                      <div className="summary-icon revenue">
                        <i className="fas fa-yen-sign"></i>
                      </div>
                      <div className="summary-data">
                        <span className="summary-value">{formatCurrency(businessStats.totalRevenue)}</span>
                        <span className="summary-label">総収益</span>
                      </div>
                    </div>
                    
                    <div className="summary-card">
                      <div className="summary-icon received">
                        <i className="fas fa-inbox"></i>
                      </div>
                      <div className="summary-data">
                        <span className="summary-value">{businessStats.activeReceived}</span>
                        <span className="summary-label">受注（進行中）</span>
                      </div>
                    </div>
                    
                    <div className="summary-card">
                      <div className="summary-icon sent">
                        <i className="fas fa-paper-plane"></i>
                      </div>
                      <div className="summary-data">
                        <span className="summary-value">{businessStats.activeSent}</span>
                        <span className="summary-label">発注（進行中）</span>
                      </div>
                    </div>
                    
                    <div className="summary-card">
                      <div className="summary-icon pending">
                        <i className="fas fa-exclamation-circle"></i>
                      </div>
                      <div className="summary-data">
                        <span className="summary-value">{businessStats.pendingActions}</span>
                        <span className="summary-label">未対応</span>
                      </div>
                    </div>
                  </div>

                  {/* 評価 */}
                  {businessStats.reviewCount > 0 && (
                    <div className="rating-banner">
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i
                            key={star}
                            className={`fas fa-star ${star <= Math.round(businessStats.averageRating) ? 'filled' : ''}`}
                          ></i>
                        ))}
                      </div>
                      <span className="rating-value">{businessStats.averageRating.toFixed(1)}</span>
                      <span className="rating-count">({businessStats.reviewCount}件のレビュー)</span>
                    </div>
                  )}

                  {/* メインコンテンツ */}
                  <div className="dashboard-grid business">
                    {/* 進行中の案件 */}
                    <div className="dashboard-card full-width">
                      <div className="card-header">
                        <h2><i className="fas fa-tasks"></i> 進行中の案件</h2>
                        <Link href="/dashboard/projects" className="section-link">
                          すべて見る <i className="fas fa-arrow-right"></i>
                        </Link>
                      </div>
                      <div className="projects-list">
                        {activeProjects.length === 0 ? (
                          <div className="empty-state">
                            <i className="fas fa-clipboard-check"></i>
                            <p>進行中の案件はありません</p>
                          </div>
                        ) : (
                          <div className="projects-table">
                            <div className="projects-header">
                              <span>種別</span>
                              <span>案件名</span>
                              <span>相手</span>
                              <span>ステータス</span>
                              <span>納期</span>
                              <span>金額</span>
                            </div>
                            {activeProjects.map((project) => (
                              <Link key={project.id} href={`/work-requests/${project.id}`} className="project-row">
                                <span className={`project-type ${project.type}`}>
                                  {project.type === 'received' ? '受注' : '発注'}
                                </span>
                                <span className="project-title">{project.title}</span>
                                <span className="project-party">{project.other_party_name}</span>
                                <span className="project-status" style={{ color: getStatusColor(project.status) }}>
                                  {getStatusLabel(project.status)}
                                </span>
                                <span className="project-deadline">
                                  {project.deadline ? formatDate(project.deadline) : '-'}
                                </span>
                                <span className="project-price">
                                  {project.final_price ? formatCurrency(project.final_price) : '-'}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 最近の取引 */}
                    <div className="dashboard-card">
                      <div className="card-header">
                        <h2><i className="fas fa-receipt"></i> 最近の取引</h2>
                      </div>
                      <div className="transaction-list">
                        {recentTransactions.length === 0 ? (
                          <div className="empty-state small">
                            <i className="fas fa-receipt"></i>
                            <p>まだ取引履歴はありません</p>
                          </div>
                        ) : (
                          recentTransactions.map((tx) => (
                            <div key={tx.id} className="transaction-item">
                              <div className={`transaction-icon ${tx.type}`}>
                                <i className={`fas ${tx.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                              </div>
                              <div className="transaction-info">
                                <span className="transaction-party">{tx.other_party_name}</span>
                                <span className="transaction-date">{formatDate(tx.paid_at)}</span>
                              </div>
                              <span className={`transaction-amount ${tx.type}`}>
                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

      <style jsx>{`
        .dashboard-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 16px;
          color: var(--text-secondary);
          min-height: 400px;
        }

        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 24px;
        }

        .dashboard-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
        }

        /* タブ */
        .dashboard-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }

        .dashboard-tab {
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .dashboard-tab:hover:not(.active) {
          background: var(--bg-hover);
        }

        .dashboard-tab.active {
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          border-color: var(--accent-primary);
        }

        /* サマリーカード */
        .dashboard-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .summary-icon {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .summary-icon.views { background: rgba(91, 124, 153, 0.12); color: #5B7C99; }
        .summary-icon.likes { background: rgba(255, 107, 138, 0.12); color: var(--color-like); }
        .summary-icon.followers { background: rgba(59, 130, 246, 0.12); color: var(--status-info); }
        .summary-icon.comments { background: rgba(34, 197, 94, 0.12); color: var(--status-success); }
        .summary-icon.revenue { background: rgba(245, 158, 11, 0.12); color: var(--status-warning); }
        .summary-icon.received { background: rgba(91, 124, 153, 0.12); color: #5B7C99; }
        .summary-icon.sent { background: rgba(149, 117, 205, 0.12); color: #9575CD; }
        .summary-icon.pending { background: rgba(239, 68, 68, 0.12); color: var(--status-error); }

        .summary-data {
          display: flex;
          flex-direction: column;
        }

        .summary-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .summary-label {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .summary-change {
          font-size: 12px;
          margin-top: 4px;
        }

        .summary-change.positive {
          color: var(--status-success);
        }

        /* グリッド */
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .dashboard-grid.business {
          grid-template-columns: 1fr;
        }

        .dashboard-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 24px;
        }

        .dashboard-card.full-width {
          grid-column: 1 / -1;
        }

        .dashboard-card.chart-card {
          grid-column: 1 / -1;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .card-header h2 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-header h2 i {
          color: var(--accent-primary);
        }

        .section-link {
          font-size: 13px;
          color: var(--accent-primary);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .section-link:hover {
          text-decoration: underline;
        }

        /* 期間切り替え */
        .period-toggle {
          display: flex;
          gap: 4px;
          background: var(--bg-sunken);
          padding: 4px;
          border-radius: var(--radius-md);
        }

        .period-toggle button {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s;
        }

        .period-toggle button:hover:not(.active) {
          color: var(--text-primary);
        }

        .period-toggle button.active {
          background: var(--bg-elevated);
          color: var(--accent-primary);
        }

        /* シンプルチャート */
        .chart-container {
          height: 200px;
          padding: 16px 0;
        }

        .simple-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 100%;
          gap: 4px;
        }

        .chart-bar-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
        }

        .chart-bar {
          width: 100%;
          max-width: 40px;
          background: var(--accent-gradient);
          border-radius: 6px 6px 0 0;
          position: relative;
          min-height: 4px;
          transition: height 0.3s ease;
        }

        .chart-bar:hover {
          opacity: 0.8;
        }

        .chart-bar:hover .chart-tooltip {
          opacity: 1;
          visibility: visible;
        }

        .chart-tooltip {
          position: absolute;
          top: -28px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--text-primary);
          color: var(--bg-base);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s;
        }

        .chart-label {
          font-size: 10px;
          color: var(--text-tertiary);
          margin-top: 8px;
        }

        /* 人気作品 */
        .popular-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .popular-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-sunken);
          border-radius: var(--radius-md);
          text-decoration: none;
          transition: all 0.2s;
        }

        .popular-item:hover {
          background: var(--bg-hover);
        }

        .popular-rank {
          width: 24px;
          height: 24px;
          background: var(--accent-gradient);
          color: #fff;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }

        .popular-thumb {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          overflow: hidden;
          background: var(--bg-sunken);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
        }

        .popular-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .popular-info {
          flex: 1;
          min-width: 0;
        }

        .popular-title {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .popular-views {
          font-size: 12px;
          color: var(--text-tertiary);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* アクティビティ */
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-sunken);
          border-radius: var(--radius-md);
        }

        .activity-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--accent-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }

        .activity-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .activity-content {
          flex: 1;
          min-width: 0;
        }

        .activity-text {
          display: block;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .activity-text strong {
          color: var(--text-primary);
        }

        .activity-time {
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .activity-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .activity-icon.like {
          background: rgba(255, 107, 138, 0.15);
          color: var(--color-like);
        }

        .activity-icon.follow {
          background: rgba(59, 130, 246, 0.15);
          color: var(--status-info);
        }

        .activity-icon.comment {
          background: rgba(34, 197, 94, 0.15);
          color: var(--status-success);
        }

        /* コメント */
        .comment-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .comment-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: var(--bg-sunken);
          border-radius: var(--radius-md);
        }

        .comment-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--accent-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }

        .comment-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .comment-content {
          flex: 1;
          min-width: 0;
        }

        .comment-header {
          font-size: 12px;
          margin-bottom: 4px;
        }

        .comment-header strong {
          color: var(--text-primary);
        }

        .comment-target {
          color: var(--text-tertiary);
          margin-left: 4px;
        }

        .comment-text {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .comment-time {
          font-size: 11px;
          color: var(--text-tertiary);
        }

        /* 評価バナー */
        .rating-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          margin-bottom: 24px;
        }

        .rating-stars {
          display: flex;
          gap: 4px;
        }

        .rating-stars i {
          color: var(--border-default);
          font-size: 18px;
        }

        .rating-stars i.filled {
          color: var(--color-star);
        }

        .rating-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .rating-count {
          font-size: 13px;
          color: var(--text-secondary);
        }

        /* プロジェクトテーブル */
        .projects-table {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .projects-header {
          display: grid;
          grid-template-columns: 60px 1fr 120px 100px 80px 100px;
          gap: 12px;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-tertiary);
        }

        .project-row {
          display: grid;
          grid-template-columns: 60px 1fr 120px 100px 80px 100px;
          gap: 12px;
          padding: 16px;
          background: var(--bg-sunken);
          border-radius: var(--radius-md);
          text-decoration: none;
          font-size: 13px;
          color: var(--text-secondary);
          align-items: center;
          transition: all 0.2s;
        }

        .project-row:hover {
          background: var(--bg-hover);
        }

        .project-type {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          text-align: center;
        }

        .project-type.received {
          background: rgba(91, 124, 153, 0.15);
          color: #5B7C99;
        }

        .project-type.sent {
          background: rgba(149, 117, 205, 0.15);
          color: #9575CD;
        }

        .project-title {
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .project-status {
          font-weight: 500;
        }

        /* 取引 */
        .transaction-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .transaction-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-sunken);
          border-radius: var(--radius-md);
        }

        .transaction-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .transaction-icon.income {
          background: rgba(34, 197, 94, 0.15);
          color: var(--status-success);
        }

        .transaction-icon.expense {
          background: rgba(239, 68, 68, 0.15);
          color: var(--status-error);
        }

        .transaction-info {
          flex: 1;
        }

        .transaction-party {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .transaction-date {
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .transaction-amount {
          font-size: 15px;
          font-weight: 700;
        }

        .transaction-amount.income {
          color: var(--status-success);
        }

        .transaction-amount.expense {
          color: var(--status-error);
        }

        /* 空状態 */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: var(--text-tertiary);
        }

        .empty-state.small {
          padding: 24px 16px;
        }

        .empty-state i {
          font-size: 32px;
          margin-bottom: 12px;
          opacity: 0.5;
        }

        .empty-state p {
          font-size: 14px;
          margin: 0;
        }

        .empty-action {
          margin-top: 12px;
          padding: 8px 16px;
          font-size: 13px;
          color: var(--accent-primary);
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          text-decoration: none;
        }

        .empty-action:hover {
          background: var(--bg-hover);
        }

        /* レスポンシブ */
        @media (max-width: 1024px) {
          .dashboard-summary {
            grid-template-columns: repeat(2, 1fr);
          }

          .projects-header,
          .project-row {
            grid-template-columns: 60px 1fr 100px 80px;
          }

          .projects-header span:nth-child(3),
          .projects-header span:nth-child(6),
          .project-row span:nth-child(3),
          .project-row span:nth-child(6) {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .dashboard-main {
            padding: 20px 16px;
          }

          .dashboard-title {
            font-size: 24px;
          }

          .dashboard-tabs {
            gap: 8px;
          }

          .dashboard-tab {
            flex: 1;
            justify-content: center;
            padding: 10px 16px;
          }

          .dashboard-summary {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .summary-card {
            padding: 16px;
          }

          .summary-icon {
            width: 44px;
            height: 44px;
            font-size: 18px;
          }

          .summary-value {
            font-size: 22px;
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-card {
            padding: 20px;
          }

          .projects-header {
            display: none;
          }

          .project-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .project-row > span {
            display: block !important;
          }

          .project-row .project-type {
            width: fit-content;
          }

          .chart-label {
            display: none;
          }

          .chart-bar-wrapper:nth-child(odd) .chart-label {
            display: block;
          }
        }
      `}</style>
    </>
  )
}