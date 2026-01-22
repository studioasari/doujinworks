'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import HeroSection from '@/app/components/HeroSection'
import styles from './page.module.css'

// ===================
// 型定義
// ===================
type Creator = {
  id: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  is_accepting_orders: boolean
  created_at: string
  // 集計データ
  rating: number
  review_count: number
  sales_count: number
  favorite_count: number
}

type PortfolioItem = {
  id: string
  title: string
  image_url: string
  thumbnail_url: string | null
  category: string
  creator_id: string
  created_at: string
  view_count: number
  like_count: number
  profiles: {
    username: string
    display_name: string
    avatar_url: string | null
  }
}

type PricingPlan = {
  id: string
  plan_name: string
  thumbnail_url: string
  minimum_price: number
  category: string
  creator_id: string
  // 集計データ
  sales_count: number
  review_count: number
  rating: number
  favorite_count: number
  repeat_rate: number
  profiles: {
    username: string
    display_name: string
    avatar_url: string | null
    is_accepting_orders: boolean
  }
}

type WorkRequest = {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  category: string
  created_at: string
  deadline: string | null
  applicant_count: number
  is_urgent: boolean
  profiles: {
    display_name: string
    avatar_url: string | null
  }
}

type Review = {
  id: string
  rating: number
  comment: string
  created_at: string
  reviewee_id: string
  reviewer: {
    display_name: string
    avatar_url: string | null
  }
  reviewee: {
    display_name: string
  }
}

type News = {
  id: string
  type: 'important' | 'new_feature' | 'campaign' | 'maintenance'
  title: string
  created_at: string
}

type Magazine = {
  id: string
  title: string
  category: string
  thumbnail_url: string | null
  created_at: string
  view_count: number
}

// ===================
// 静的データ
// ===================
const banners = [
  { id: 1, title: 'アイコン特集', subtitle: '人気クリエイターが受付中', color: '#5B7C99', icon: 'fa-user-circle', link: '/pricing?tag=アイコン' },
  { id: 2, title: '冬コミ応援', subtitle: 'サークルカット制作', color: '#7B5C99', icon: 'fa-snowflake', link: '/pricing?tag=同人誌' },
  { id: 3, title: '新機能', subtitle: 'いいね機能追加', color: '#5B9977', icon: 'fa-sparkles', link: '/news' },
]

const categories = [
  { id: 'illustration', title: 'イラスト', icon: 'fa-palette', color: '#E91E63' },
  { id: 'manga', title: 'マンガ', icon: 'fa-book-open', color: '#9C27B0' },
  { id: 'novel', title: '小説', icon: 'fa-feather-alt', color: '#673AB7' },
  { id: 'music', title: '音楽', icon: 'fa-music', color: '#3F51B5' },
  { id: 'voice', title: 'ボイス', icon: 'fa-microphone', color: '#2196F3' },
  { id: 'video', title: '動画', icon: 'fa-video', color: '#00BCD4' },
  { id: 'design', title: 'デザイン', icon: 'fa-pen-nib', color: '#009688' },
  { id: 'live2d', title: 'Live2D', icon: 'fa-cube', color: '#8BC34A' },
]

const popularTags = ['アイコン', 'TRPG', 'Vtuber', '立ち絵', '厚塗り', 'アニメ塗り', 'ロゴ', 'サムネ', '表紙', 'キャラデザ', 'Live2D', 'ゲーム', '背景', 'デフォルメ', 'ちびキャラ', 'MV']

const pickups = [
  { id: 1, title: '初心者向け', icon: 'fa-seedling', color: '#4CAF50', link: '/pricing?for=beginner' },
  { id: 2, title: 'スピード納品', icon: 'fa-bolt', color: '#FF9800', link: '/pricing?delivery=fast' },
  { id: 3, title: '商用利用OK', icon: 'fa-building', color: '#2196F3', link: '/pricing?commercial=true' },
  { id: 4, title: 'リピート率90%↑', icon: 'fa-redo', color: '#9C27B0', link: '/pricing?repeat=high' },
]

// ダミーのお知らせ（後でテーブル化）
const defaultNews: News[] = [
  { id: '1', type: 'important', title: '1/20 メンテナンスのお知らせ', created_at: '2024-01-18' },
  { id: '2', type: 'new_feature', title: 'いいね機能を追加しました', created_at: '2024-01-15' },
  { id: '3', type: 'campaign', title: '冬コミ応援キャンペーン実施中！', created_at: '2024-01-10' },
]

// ダミーのマガジン（後でテーブル化）
const defaultMagazines: Magazine[] = [
  { id: '1', title: 'イラスト依頼の相場ってどれくらい？初心者向けガイド', category: 'ガイド', thumbnail_url: null, created_at: '2024-01-15', view_count: 1234 },
  { id: '2', title: '人気クリエイターインタビュー Vol.3', category: 'インタビュー', thumbnail_url: null, created_at: '2024-01-12', view_count: 876 },
  { id: '3', title: '依頼時に伝えるべき5つのポイント', category: 'Tips', thumbnail_url: null, created_at: '2024-01-10', view_count: 2341 },
]

// ===================
// ユーティリティ
// ===================
function getCategoryLabel(category: string): string {
  const cat = categories.find(c => c.id === category)
  return cat?.title || 'その他'
}

function getNewsTypeBadgeClass(type: News['type']): string {
  const types = {
    important: 'badge-error',
    new_feature: 'badge-open',
    campaign: 'badge-accent',
    maintenance: 'badge-progress',
  }
  return types[type] || 'badge'
}

function getNewsTypeLabel(type: News['type']): string {
  const types = {
    important: '重要',
    new_feature: '新機能',
    campaign: 'キャンペーン',
    maintenance: 'メンテナンス',
  }
  return types[type] || 'お知らせ'
}

function getDeadlineText(deadline: string | null, createdAt: string): string {
  if (!deadline) {
    const created = new Date(createdAt)
    const deadlineDate = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000)
    const now = new Date()
    const diff = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff <= 0) return '期限切れ'
    return `残り${diff}日`
  }
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diff = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return '期限切れ'
  return `残り${diff}日`
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'たった今'
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}日前`
  return date.toLocaleDateString('ja-JP')
}

// ===================
// メインコンポーネント
// ===================
export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ creators: 0, works: 0, transactions: 0, newToday: 0 })
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [creators, setCreators] = useState<Creator[]>([])
  const [newCreators, setNewCreators] = useState<Creator[]>([])
  const [popularWorks, setPopularWorks] = useState<PortfolioItem[]>([])
  const [newWorks, setNewWorks] = useState<PortfolioItem[]>([])
  const [services, setServices] = useState<PricingPlan[]>([])
  const [requests, setRequests] = useState<WorkRequest[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [news] = useState<News[]>(defaultNews)
  const [magazines] = useState<Magazine[]>(defaultMagazines)
  const [currentNews, setCurrentNews] = useState(0)

  // お知らせローテーション
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentNews(prev => (prev + 1) % news.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [news.length])

  // データ取得
  useEffect(() => {
    fetchAllData()
  }, [])

  async function fetchAllData() {
    setLoading(true)
    try {
      await Promise.all([
        fetchStats(),
        fetchCategoryCounts(),
        fetchCreators(),
        fetchNewCreators(),
        fetchPopularWorks(),
        fetchNewWorks(),
        fetchServices(),
        fetchRequests(),
        fetchReviews(),
      ])
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // 統計情報
  async function fetchStats() {
    const [creatorsRes, worksRes, todayWorksRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('is_public', true),
      supabase.from('portfolio_items').select('id', { count: 'exact', head: true })
        .eq('is_public', true)
        .gte('created_at', new Date().toISOString().split('T')[0]),
    ])
    
    setStats({
      creators: creatorsRes.count || 0,
      works: worksRes.count || 0,
      transactions: 0,
      newToday: todayWorksRes.count || 0,
    })
  }

  // カテゴリ別カウント
  async function fetchCategoryCounts() {
    const { data } = await supabase
      .from('portfolio_items')
      .select('category')
      .eq('is_public', true)
    
    if (data) {
      const counts: Record<string, number> = {}
      data.forEach(item => {
        counts[item.category] = (counts[item.category] || 0) + 1
      })
      setCategoryCounts(counts)
    }
  }

  // 人気クリエイター
  async function fetchCreators() {
    const { data: creatorsData } = await supabase
      .from('profiles')
      .select('id, user_id, username, display_name, avatar_url, bio, is_accepting_orders, created_at')
      .not('display_name', 'is', null)
      .order('is_accepting_orders', { ascending: false })
      .limit(6)

    if (creatorsData) {
      const enrichedCreators = await Promise.all(creatorsData.map(async (creator) => {
        // いいね数を集計
        const { data: works } = await supabase
          .from('portfolio_items')
          .select('id')
          .eq('creator_id', creator.user_id)
        
        let totalLikes = 0
        if (works && works.length > 0) {
          const { count } = await supabase
            .from('portfolio_likes')
            .select('id', { count: 'exact', head: true })
            .in('portfolio_item_id', works.map(w => w.id))
          totalLikes = count || 0
        }

        // レビュー情報を取得
        const { data: reviewsData, count: reviewCount } = await supabase
          .from('reviews')
          .select('rating', { count: 'exact' })
          .eq('reviewee_id', creator.id)

        const avgRating = reviewsData && reviewsData.length > 0
          ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
          : 0

        return {
          ...creator,
          rating: avgRating,
          review_count: reviewCount || 0,
          sales_count: reviewCount || 0, // 取引数≒レビュー数として仮定
          favorite_count: totalLikes,
        }
      }))

      setCreators(enrichedCreators)
    }
  }

  // 新着クリエイター
  async function fetchNewCreators() {
    const { data } = await supabase
      .from('profiles')
      .select('id, user_id, username, display_name, avatar_url, bio, is_accepting_orders, created_at')
      .not('display_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(4)

    if (data) {
      setNewCreators(data.map(c => ({
        ...c,
        rating: 0,
        review_count: 0,
        sales_count: 0,
        favorite_count: 0,
      })))
    }
  }

  // 人気作品
  async function fetchPopularWorks() {
    const { data: items } = await supabase
      .from('portfolio_items')
      .select('id, title, image_url, thumbnail_url, category, creator_id, created_at, view_count')
      .eq('is_public', true)
      .limit(50)

    if (items && items.length > 0) {
      const itemIds = items.map(w => w.id)
      const { data: likes } = await supabase
        .from('portfolio_likes')
        .select('portfolio_item_id')
        .in('portfolio_item_id', itemIds)

      const likeMap = new Map<string, number>()
      likes?.forEach(l => {
        likeMap.set(l.portfolio_item_id, (likeMap.get(l.portfolio_item_id) || 0) + 1)
      })

      const creatorIds = [...new Set(items.map(w => w.creator_id))]
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url')
        .in('user_id', creatorIds)

      const creatorMap = new Map()
      creatorsData?.forEach(c => creatorMap.set(c.user_id, c))

      const itemsWithData = items.map(item => ({
        ...item,
        like_count: likeMap.get(item.id) || 0,
        profiles: creatorMap.get(item.creator_id) || {
          username: '',
          display_name: '不明',
          avatar_url: null,
        },
      }))

      itemsWithData.sort((a, b) => b.like_count - a.like_count)
      setPopularWorks(itemsWithData.slice(0, 7))
    }
  }

  // 新着作品
  async function fetchNewWorks() {
    const { data: items } = await supabase
      .from('portfolio_items')
      .select('id, title, image_url, thumbnail_url, category, creator_id, created_at, view_count')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(12)

    if (items && items.length > 0) {
      const itemIds = items.map(w => w.id)
      const { data: likes } = await supabase
        .from('portfolio_likes')
        .select('portfolio_item_id')
        .in('portfolio_item_id', itemIds)

      const likeMap = new Map<string, number>()
      likes?.forEach(l => {
        likeMap.set(l.portfolio_item_id, (likeMap.get(l.portfolio_item_id) || 0) + 1)
      })

      const creatorIds = [...new Set(items.map(w => w.creator_id))]
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url')
        .in('user_id', creatorIds)

      const creatorMap = new Map()
      creatorsData?.forEach(c => creatorMap.set(c.user_id, c))

      const itemsWithData = items.map(item => ({
        ...item,
        like_count: likeMap.get(item.id) || 0,
        profiles: creatorMap.get(item.creator_id) || {
          username: '',
          display_name: '不明',
          avatar_url: null,
        },
      }))

      setNewWorks(itemsWithData)
    }
  }

  // 人気サービス
  async function fetchServices() {
    const { data: plans } = await supabase
      .from('pricing_plans')
      .select('id, plan_name, thumbnail_url, minimum_price, category, creator_id')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(6)

    if (plans && plans.length > 0) {
      const creatorIds = [...new Set(plans.map(p => p.creator_id).filter(Boolean))]
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_accepting_orders')
        .in('id', creatorIds)

      const creatorMap = new Map()
      creatorsData?.forEach(c => creatorMap.set(c.id, c))

      const plansWithData = plans.map(plan => ({
        ...plan,
        sales_count: Math.floor(Math.random() * 150) + 10, // TODO: 実際の販売数
        review_count: Math.floor(Math.random() * 50) + 5,
        rating: 4.5 + Math.random() * 0.5,
        favorite_count: Math.floor(Math.random() * 100) + 20,
        repeat_rate: Math.floor(Math.random() * 25) + 70,
        profiles: creatorMap.get(plan.creator_id) || {
          username: '',
          display_name: '不明',
          avatar_url: null,
          is_accepting_orders: false,
        },
      }))

      setServices(plansWithData)
    }
  }

  // 依頼一覧
  async function fetchRequests() {
    const { data: requestsData } = await supabase
      .from('work_requests')
      .select('id, title, description, budget_min, budget_max, category, created_at, deadline, requester_id')
      .eq('request_type', 'public')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(6)

    if (requestsData && requestsData.length > 0) {
      const requesterIds = [...new Set(requestsData.map(r => r.requester_id))]
      const { data: requesters } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', requesterIds)

      const requesterMap = new Map()
      requesters?.forEach(r => requesterMap.set(r.id, r))

      const requestsWithData = requestsData.map(req => ({
        ...req,
        applicant_count: Math.floor(Math.random() * 20) + 1,
        is_urgent: Math.random() > 0.7,
        profiles: requesterMap.get(req.requester_id) || {
          display_name: '不明',
          avatar_url: null,
        },
      }))

      setRequests(requestsWithData)
    }
  }

  // 最新レビュー（実データ）
  async function fetchReviews() {
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, reviewer_id, reviewee_id')
      .order('created_at', { ascending: false })
      .limit(3)

    if (reviewsData && reviewsData.length > 0) {
      const userIds = [
        ...new Set([
          ...reviewsData.map(r => r.reviewer_id),
          ...reviewsData.map(r => r.reviewee_id)
        ])
      ]

      const { data: users } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds)

      const userMap = new Map()
      users?.forEach(u => userMap.set(u.id, u))

      const reviewsWithProfiles = reviewsData.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment || '',
        created_at: review.created_at,
        reviewee_id: review.reviewee_id,
        reviewer: userMap.get(review.reviewer_id) || { display_name: '不明', avatar_url: null },
        reviewee: userMap.get(review.reviewee_id) || { display_name: '不明' },
      }))

      setReviews(reviewsWithProfiles)
    }
  }

  // ===================
  // レンダリング
  // ===================
  return (
    <div className={styles.homePage}>
      <Header />
      
      <main>
        <HeroSection />

        {/* お知らせバー */}
        <div className={styles.newsBar}>
          <div className={styles.newsBarInner}>
            <div className={styles.newsContent}>
              <span className={`badge ${getNewsTypeBadgeClass(news[currentNews].type)}`}>
                {getNewsTypeLabel(news[currentNews].type)}
              </span>
              <span className={styles.newsText}>{news[currentNews].title}</span>
              <div className={styles.newsDots}>
                {news.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.newsDot} ${i === currentNews ? styles.active : ''}`}
                    onClick={() => setCurrentNews(i)}
                    aria-label={`お知らせ ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <Link href="/news" className={`link ${styles.newsMore}`}>
            すべて見る <i className="fas fa-arrow-right"></i>
          </Link>
        </div>

        {/* 統計バー */}
        <div className={styles.statsBar}>
          <div className={styles.statsBarInner}>
            <div className={styles.statItem}>
              <i className="fas fa-users"></i>
              <span className={styles.statLabel}>登録クリエイター</span>
              <span className={styles.statValue}>{stats.creators.toLocaleString()}</span>
            </div>
            <div className={styles.statItem}>
              <i className="fas fa-images"></i>
              <span className={styles.statLabel}>公開作品数</span>
              <span className={styles.statValue}>{stats.works.toLocaleString()}</span>
            </div>
            <div className={styles.statItem}>
              <i className="fas fa-handshake"></i>
              <span className={styles.statLabel}>取引完了</span>
              <span className={styles.statValue}>{stats.transactions.toLocaleString()}</span>
            </div>
            <div className={styles.statItem}>
              <i className="fas fa-plus-circle"></i>
              <span className={styles.statLabel}>本日の新着</span>
              <span className={styles.statValue}>{stats.newToday.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 3カラムレイアウト */}
        <div className={styles.homeLayout}>
          {/* 左サイドバー */}
          <aside className={styles.sidebarLeft}>
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>カテゴリ</h3>
              <div className={styles.categoryList}>
                {categories.map(cat => (
                  <Link key={cat.id} href={`/pricing?category=${cat.id}`} className={styles.categoryItem}>
                    <i className={`fas ${cat.icon}`} style={{ color: cat.color }}></i>
                    <span className={styles.categoryName}>{cat.title}</span>
                    <span className={styles.categoryCount}>{categoryCounts[cat.id] || 0}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>人気タグ</h3>
              <div className="tag-group">
                {popularTags.map(tag => (
                  <Link key={tag} href={`/pricing?tag=${encodeURIComponent(tag)}`} className="tag">
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>

            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>特集</h3>
              <div className={styles.pickupList}>
                {pickups.map(p => (
                  <Link key={p.id} href={p.link} className={styles.pickupItem}>
                    <i className={`fas ${p.icon}`} style={{ color: p.color }}></i>
                    <span>{p.title}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>新着クリエイター</h3>
              <div className={styles.newCreatorsList}>
                {newCreators.map(creator => (
                  <Link key={creator.id} href={`/creators/${creator.username || creator.id}`} className={styles.newCreatorItem}>
                    <div className="avatar avatar-xs">
                      {creator.avatar_url ? (
                        <Image src={creator.avatar_url} alt="" width={24} height={24} />
                      ) : (
                        <i className="fas fa-user"></i>
                      )}
                    </div>
                    <div className={styles.newCreatorInfo}>
                      <span className={styles.newCreatorName}>{creator.display_name}</span>
                      <span className={styles.newCreatorMeta}>{formatTimeAgo(creator.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* メインコンテンツ */}
          <div className={styles.mainContent}>
            {/* バナー */}
            <div className={styles.bannerGrid}>
              {banners.map(banner => (
                <Link key={banner.id} href={banner.link} className={styles.bannerItem} style={{ background: banner.color }}>
                  <div className={styles.bannerDecoration}></div>
                  <i className={`fas ${banner.icon} ${styles.bannerIcon}`}></i>
                  <div className={styles.bannerTitle}>{banner.title}</div>
                  <div className={styles.bannerSubtitle}>{banner.subtitle}</div>
                </Link>
              ))}
            </div>

            {/* 注目の作品 */}
            <section className={styles.section}>
              <div className="section-header">
                <h2 className="section-title">注目の作品</h2>
                <Link href="/portfolio?sort=popular" className="link">もっと見る →</Link>
              </div>
              {popularWorks.length > 0 ? (
                <div className={styles.featuredWorksGrid}>
                  {popularWorks[0] && (
                    <Link href={`/portfolio/${popularWorks[0].id}`} className={styles.featuredWorkLarge}>
                      <div className={styles.workImage}>
                        {popularWorks[0].thumbnail_url || popularWorks[0].image_url ? (
                          <img src={popularWorks[0].thumbnail_url || popularWorks[0].image_url} alt={popularWorks[0].title} />
                        ) : (
                          <i className="fas fa-image"></i>
                        )}
                        <span className={`badge badge-accent ${styles.workImageBadge}`}>
                          <i className="fas fa-fire"></i> HOT
                        </span>
                      </div>
                      <div className={styles.workContent}>
                        <span className={styles.workCategory}>{getCategoryLabel(popularWorks[0].category)}</span>
                        <h3 className={styles.workTitle}>{popularWorks[0].title}</h3>
                        <div className={styles.workStats}>
                          <span><i className="fa-solid fa-heart icon-like active"></i> {popularWorks[0].like_count}</span>
                          <span><i className="fa-regular fa-eye"></i> {popularWorks[0].view_count}</span>
                        </div>
                        <div className={styles.workCreator}>
                          <div className="avatar avatar-xs">
                            {popularWorks[0].profiles.avatar_url ? (
                              <Image src={popularWorks[0].profiles.avatar_url} alt="" width={24} height={24} />
                            ) : (
                              <i className="fas fa-user"></i>
                            )}
                          </div>
                          <span>{popularWorks[0].profiles.display_name}</span>
                        </div>
                      </div>
                    </Link>
                  )}
                  <div className={styles.featuredWorksSmall}>
                    {popularWorks.slice(1, 5).map((work) => (
                      <Link key={work.id} href={`/portfolio/${work.id}`} className={styles.featuredWorkSmall}>
                        <div className={styles.workImageSmall}>
                          {work.thumbnail_url || work.image_url ? (
                            <img src={work.thumbnail_url || work.image_url} alt={work.title} />
                          ) : (
                            <i className="fas fa-image"></i>
                          )}
                          {work.like_count > 50 && (
                            <span className="overlay-badge overlay-badge-top-right overlay-badge-pill">
                              <i className="fas fa-fire"></i> HOT
                            </span>
                          )}
                        </div>
                        <div className={styles.workContentSmall}>
                          <span className={styles.workCategorySmall}>{getCategoryLabel(work.category)}</span>
                          <h4 className={styles.workTitleSmall}>{work.title}</h4>
                          <div className={styles.workStatsSmall}>
                            <span><i className="fa-solid fa-heart icon-like active"></i> {work.like_count}</span>
                            <span><i className="fa-regular fa-eye"></i> {work.view_count}</span>
                          </div>
                          <div className={styles.workCreatorSmall}>
                            <span>{work.profiles.display_name}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fa-regular fa-folder-open"></i>
                  <p>まだ作品がありません</p>
                </div>
              )}
            </section>

            {/* 人気クリエイター */}
            <section className={styles.section}>
              <div className="section-header">
                <h2 className="section-title">人気クリエイター</h2>
                <Link href="/creators" className="link">もっと見る →</Link>
              </div>
              {creators.length > 0 ? (
                <div className={styles.creatorsGrid}>
                  {creators.map((creator, i) => (
                    <Link key={creator.id} href={`/creators/${creator.username || creator.id}`} className={`card ${styles.creatorCard}`}>
                      {i < 3 && (
                        <div className={`${styles.rankBadge} ${styles[`rank${i + 1}`]}`}>
                          {i + 1}
                        </div>
                      )}
                      <span className={`badge ${creator.is_accepting_orders ? 'badge-open' : 'badge-closed'} ${styles.statusBadge}`}>
                        <i className="fa-solid fa-circle fa-xs"></i>
                        {creator.is_accepting_orders ? '受付中' : '停止中'}
                      </span>
                      <div className={styles.creatorHeader}>
                        <div className="avatar avatar-sm">
                          {creator.avatar_url ? (
                            <Image src={creator.avatar_url} alt="" width={32} height={32} />
                          ) : (
                            <i className="fas fa-user"></i>
                          )}
                        </div>
                        <div className={styles.creatorInfo}>
                          <h4 className={styles.creatorName}>{creator.display_name}</h4>
                          {creator.rating > 0 && (
                            <div className={styles.creatorRating}>
                              <i className="fa-solid fa-star icon-star active"></i>
                              <span>{creator.rating.toFixed(1)}</span>
                              <span className={styles.reviewCount}>({creator.review_count}件)</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {creator.bio && <p className={styles.creatorBio}>{creator.bio.slice(0, 40)}...</p>}
                      <div className={styles.creatorFooter}>
                        <span><i className="fas fa-box"></i> {creator.sales_count}件</span>
                        <span><i className="fa-solid fa-heart icon-like"></i> {creator.favorite_count}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fa-regular fa-folder-open"></i>
                  <p>クリエイターがいません</p>
                </div>
              )}
            </section>

            {/* 人気サービス */}
            <section className={styles.section}>
              <div className="section-header">
                <h2 className="section-title">人気サービス</h2>
                <Link href="/pricing" className="link">もっと見る →</Link>
              </div>
              {services.length > 0 ? (
                <div className={styles.servicesGrid}>
                  {services.map(service => (
                    <Link key={service.id} href={`/pricing/${service.id}`} className="card card-service">
                      <div className="card-image">
                        {service.thumbnail_url ? (
                          <img src={service.thumbnail_url} alt={service.plan_name} />
                        ) : (
                          <i className="fas fa-concierge-bell"></i>
                        )}
                        <span className="overlay-badge overlay-badge-top-right overlay-badge-pill">
                          リピート率 {service.repeat_rate}%
                        </span>
                      </div>
                      <div className="card-body">
                        <h4 className="card-title">{service.plan_name}</h4>
                        <div className="card-stats-row">
                          <span><i className="fa-solid fa-star icon-star active"></i> {service.rating.toFixed(1)} ({service.review_count}件)</span>
                          <span><i className="fas fa-box"></i> {service.sales_count}件</span>
                        </div>
                        <div className="card-service-footer">
                          <div className="card-seller">
                            <div className="avatar avatar-sm">
                              {service.profiles.avatar_url ? (
                                <Image src={service.profiles.avatar_url} alt="" width={32} height={32} />
                              ) : (
                                <i className="fas fa-user"></i>
                              )}
                            </div>
                            <span>{service.profiles.display_name}</span>
                          </div>
                          <span className="card-price">¥{service.minimum_price.toLocaleString()}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fa-regular fa-folder-open"></i>
                  <p>まだサービスがありません</p>
                </div>
              )}
            </section>

            {/* 新着作品 */}
            <section className={styles.section}>
              <div className="section-header">
                <h2 className="section-title">新着作品</h2>
                <Link href="/portfolio" className="link">もっと見る →</Link>
              </div>
              {newWorks.length > 0 ? (
                <div className={styles.newWorksGrid}>
                  {newWorks.map(work => (
                    <Link key={work.id} href={`/portfolio/${work.id}`} className="card">
                      <div className="card-image">
                        {work.thumbnail_url || work.image_url ? (
                          <img src={work.thumbnail_url || work.image_url} alt={work.title} />
                        ) : (
                          <i className="fas fa-image"></i>
                        )}
                        <span className="overlay-badge overlay-badge-top-left">
                          {getCategoryLabel(work.category)}
                        </span>
                      </div>
                      <div className="card-body">
                        <h4 className="card-title">{work.title}</h4>
                        <div className={styles.workStatsSmall}>
                          <span><i className="fa-solid fa-heart icon-like"></i> {work.like_count}</span>
                          <span><i className="fa-regular fa-eye"></i> {work.view_count}</span>
                        </div>
                        <div className="card-meta">
                          <div className="card-author">
                            <div className="avatar avatar-xs">
                              {work.profiles.avatar_url ? (
                                <Image src={work.profiles.avatar_url} alt="" width={24} height={24} />
                              ) : (
                                <i className="fas fa-user"></i>
                              )}
                            </div>
                            <span>{work.profiles.display_name}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fa-regular fa-folder-open"></i>
                  <p>まだ作品がありません</p>
                </div>
              )}
            </section>

            {/* マガジン */}
            <section className={styles.section}>
              <div className="section-header">
                <h2 className="section-title">マガジン</h2>
                <Link href="/magazine" className="link">もっと見る →</Link>
              </div>
              <div className={styles.magazineGrid}>
                {magazines.map((mag) => (
                  <Link key={mag.id} href={`/magazine/${mag.id}`} className="card card-blog">
                    <div className="card-image">
                      {mag.thumbnail_url ? (
                        <img src={mag.thumbnail_url} alt={mag.title} />
                      ) : (
                        <i className="fas fa-file-lines"></i>
                      )}
                    </div>
                    <div className="card-body">
                      <div className="card-blog-meta">
                        <span className="badge badge-accent">{mag.category}</span>
                        <span className="card-date">{mag.created_at}</span>
                      </div>
                      <h4 className="card-title">{mag.title}</h4>
                      <div className="card-views">
                        <i className="fa-regular fa-eye"></i> {mag.view_count.toLocaleString()} views
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* 右サイドバー */}
          <aside className={styles.sidebarRight}>
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>
                お仕事募集中
                <span className={`badge badge-accent ${styles.titleBadge}`}>{requests.length}件</span>
              </h3>
              <div className={styles.requestsList}>
                {requests.map(req => (
                  <Link key={req.id} href={`/requests/${req.id}`} className={styles.requestItem}>
                    <div className={styles.requestBadges}>
                      {req.is_urgent && (
                        <span className="badge badge-error">
                          <i className="fas fa-bolt"></i> 急募
                        </span>
                      )}
                      <span className="badge">{getCategoryLabel(req.category)}</span>
                      <span className={styles.requestDeadline}>{getDeadlineText(req.deadline, req.created_at)}</span>
                    </div>
                    <h4 className={styles.requestTitle}>{req.title}</h4>
                    <div className={styles.requestFooter}>
                      <span className={styles.requestBudget}>
                        ¥{req.budget_min?.toLocaleString() || '0'}〜{req.budget_max?.toLocaleString() || ''}
                      </span>
                      <span className={styles.requestApplicants}>
                        <i className="fas fa-user"></i> {req.applicant_count}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/requests" className={`btn btn-secondary ${styles.sidebarButton}`}>
                すべて見る <i className="fas fa-arrow-right"></i>
              </Link>
            </div>

            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>週間ランキング</h3>
              <div className={styles.rankingList}>
                {popularWorks.slice(0, 5).map((work, i) => (
                  <Link key={work.id} href={`/portfolio/${work.id}`} className={styles.rankingItem}>
                    <div className={`${styles.rankingNumber} ${styles[`rank${i + 1}`]}`}>{i + 1}</div>
                    <div className={styles.rankingImage}>
                      {work.thumbnail_url || work.image_url ? (
                        <img src={work.thumbnail_url || work.image_url} alt={work.title} />
                      ) : (
                        <i className="fas fa-image"></i>
                      )}
                    </div>
                    <div className={styles.rankingInfo}>
                      <h4 className={styles.rankingTitle}>{work.title}</h4>
                      <span className={styles.rankingLikes}>
                        <i className="fa-solid fa-heart icon-like active"></i> {work.like_count}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>最新レビュー</h3>
              <div className={styles.reviewsList}>
                {reviews.length > 0 ? reviews.map(review => (
                  <div key={review.id} className={styles.reviewItem}>
                    <div className={styles.reviewHeader}>
                      <div className="avatar avatar-xs">
                        {review.reviewer.avatar_url ? (
                          <Image src={review.reviewer.avatar_url} alt="" width={24} height={24} />
                        ) : (
                          <i className="fas fa-user"></i>
                        )}
                      </div>
                      <div className={styles.reviewUserInfo}>
                        <span className={styles.reviewUserName}>{review.reviewer.display_name}</span>
                        <span className={styles.reviewDate}>{formatTimeAgo(review.created_at)}</span>
                      </div>
                    </div>
                    <div className={styles.reviewRating}>
                      {[...Array(5)].map((_, i) => (
                        <i key={i} className={`fa-solid fa-star icon-star ${i < review.rating ? 'active' : ''}`}></i>
                      ))}
                    </div>
                    <p className={styles.reviewComment}>{review.comment || '（コメントなし）'}</p>
                    <Link href={`/creators/${review.reviewee_id}`} className="link">
                      → {review.reviewee.display_name}
                    </Link>
                  </div>
                )) : (
                  <p className={styles.noReviews}>まだレビューがありません</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}