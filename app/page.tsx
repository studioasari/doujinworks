'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

type PricingPlan = {
  id: string
  plan_name: string
  thumbnail_url: string
  minimum_price: number
  category: string
  creator_id: string
  profiles: {
    username: string
    display_name: string
    avatar_url: string | null
    is_accepting_orders: boolean
  }
}

type PortfolioItem = {
  id: string
  title: string
  image_url: string
  thumbnail_url: string | null
  category: string
  creator_id: string
  like_count: number
  profiles: {
    username: string
    display_name: string
    avatar_url: string | null
  }
}

type Creator = {
  id: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  is_accepting_orders: boolean
  specialties: string[] | null
}

type WorkRequest = {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  category: string
  created_at: string
  profiles: {
    display_name: string
    avatar_url: string | null
  }
}

export default function HomePage() {
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [popularWorks, setPopularWorks] = useState<PortfolioItem[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [workRequests, setWorkRequests] = useState<WorkRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    
    try {
      // 料金表を取得
      const { data: plans } = await supabase
        .from('pricing_plans')
        .select('id, plan_name, thumbnail_url, minimum_price, category, creator_id')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(8)

      if (plans && plans.length > 0) {
        const validPlans = plans.filter(p => p.creator_id !== null)
        const creatorIds = [...new Set(validPlans.map(p => p.creator_id))]
        
        const { data: creatorsData } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, is_accepting_orders')
          .in('id', creatorIds)

        const creatorMap = new Map()
        creatorsData?.forEach(c => creatorMap.set(c.id, c))

        const plansWithProfiles = validPlans.map(plan => ({
          ...plan,
          profiles: creatorMap.get(plan.creator_id) || {
            username: '',
            display_name: '不明',
            avatar_url: null,
            is_accepting_orders: false
          }
        }))

        setPricingPlans(plansWithProfiles)
      }

      // 作品を取得
      const { data: items } = await supabase
        .from('portfolio_items')
        .select('id, title, image_url, thumbnail_url, category, creator_id')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(8)

      if (items && items.length > 0) {
        const validItems = items.filter(item => item.creator_id !== null)
        const creatorIds = [...new Set(validItems.map(w => w.creator_id))]
        
        const { data: creatorsData } = await supabase
          .from('profiles')
          .select('id, user_id, username, display_name, avatar_url')
          .in('user_id', creatorIds)

        const creatorMap = new Map()
        creatorsData?.forEach(c => creatorMap.set(c.user_id, c))

        const itemsWithProfiles = validItems.map(item => ({
          ...item,
          like_count: 0,
          profiles: creatorMap.get(item.creator_id) || {
            username: '',
            display_name: '不明',
            avatar_url: null
          }
        }))

        setPortfolioItems(itemsWithProfiles)
      }

      // 人気作品（いいね数順）
      const { data: allItems } = await supabase
        .from('portfolio_items')
        .select('id, title, image_url, thumbnail_url, category, creator_id')
        .eq('is_public', true)
        .limit(50)

      if (allItems && allItems.length > 0) {
        const validItems = allItems.filter(item => item.creator_id !== null)
        const itemIds = validItems.map(w => w.id)
        
        const { data: likes } = await supabase
          .from('portfolio_likes')
          .select('portfolio_item_id')
          .in('portfolio_item_id', itemIds)

        const likeMap = new Map()
        likes?.forEach(l => {
          likeMap.set(l.portfolio_item_id, (likeMap.get(l.portfolio_item_id) || 0) + 1)
        })

        const creatorIds = [...new Set(validItems.map(w => w.creator_id))]
        const { data: creatorsData } = await supabase
          .from('profiles')
          .select('id, user_id, username, display_name, avatar_url')
          .in('user_id', creatorIds)

        const creatorMap = new Map()
        creatorsData?.forEach(c => creatorMap.set(c.user_id, c))

        const itemsWithLikes = validItems.map(item => ({
          ...item,
          like_count: likeMap.get(item.id) || 0,
          profiles: creatorMap.get(item.creator_id) || {
            username: '',
            display_name: '不明',
            avatar_url: null
          }
        }))

        itemsWithLikes.sort((a, b) => b.like_count - a.like_count)
        setPopularWorks(itemsWithLikes.slice(0, 6))
      }

      // クリエイターを取得（受付中優先）
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, bio, is_accepting_orders, specialties')
        .not('display_name', 'is', null)
        .order('is_accepting_orders', { ascending: false })
        .limit(8)

      if (creatorsData) {
        setCreators(creatorsData)
      }

      // 依頼を取得（募集中のみ）
      const { data: requestsData } = await supabase
        .from('work_requests')
        .select('id, title, description, budget_min, budget_max, category, created_at, requester_id')
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

        const requestsWithProfiles = requestsData.map(req => ({
          ...req,
          profiles: requesterMap.get(req.requester_id) || {
            display_name: '不明',
            avatar_url: null
          }
        }))

        setWorkRequests(requestsWithProfiles)
      }

    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  function getCategoryLabel(category: string) {
    const labels: { [key: string]: string } = {
      illustration: 'イラスト',
      manga: 'マンガ',
      novel: '小説',
      music: '音楽',
      voice: 'ボイス',
      video: '動画',
      design: 'デザイン',
      other: 'その他'
    }
    return labels[category] || 'その他'
  }

  return (
    <div className="flex flex-col bg-page" style={{ minHeight: '100vh' }}>
      <Header />

      <main>
        {/* サービスを探す */}
        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">サービスを探す</h2>
            <Link href="/pricing" className="section-link">
              もっと見る <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          
          {pricingPlans.length > 0 ? (
            <div className="card-grid">
              {pricingPlans.map((plan) => (
                <Link key={plan.id} href={`/pricing/${plan.id}`} className="soft-card">
                  <div className="pricing-card-image">
                    <img src={plan.thumbnail_url} alt={plan.plan_name} loading="lazy" />
                  </div>
                  <div className="pricing-card-content">
                    <div className="text-ellipsis mb-8" style={{ fontSize: '15px', fontWeight: 600, color: '#222222' }}>
                      {plan.plan_name}
                    </div>
                    <div className="text-price mb-12">¥{plan.minimum_price.toLocaleString()}〜</div>
                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                      <div className="avatar-neu avatar-neu-medium">
                        {plan.profiles.avatar_url ? (
                          <Image src={plan.profiles.avatar_url} alt="" width={28} height={28} />
                        ) : (
                          <i className="fas fa-user"></i>
                        )}
                      </div>
                      <span className="text-ellipsis text-secondary" style={{ fontSize: '13px', flex: 1 }}>
                        {plan.profiles.display_name || '名前未設定'}
                      </span>
                    </div>
                    <div className={`status-badge ${plan.profiles.is_accepting_orders ? 'accepting' : 'not-accepting'}`} style={{ marginTop: '12px' }}>
                      <i className="fas fa-circle"></i>
                      {plan.profiles.is_accepting_orders ? '受付中' : '受付停止'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-briefcase"></i>
              <p>まだサービスがありません</p>
            </div>
          )}
        </section>

        {/* 人気クリエイター */}
        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">人気クリエイター</h2>
          </div>
          
          {creators.length > 0 ? (
            <div className="creator-grid">
              {creators.map((creator) => (
                <Link key={creator.id} href={`/creator/${creator.username || creator.id}`} className="soft-card" style={{ padding: '24px 20px', textAlign: 'center' }}>
                  <div className="avatar-neu avatar-neu-xlarge" style={{ margin: '0 auto 16px' }}>
                    {creator.avatar_url ? (
                      <Image src={creator.avatar_url} alt="" width={72} height={72} />
                    ) : (
                      <i className="fas fa-user"></i>
                    )}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#222222', marginBottom: '6px' }}>
                    {creator.display_name || '名前未設定'}
                  </div>
                  <div className="text-clamp-2 text-secondary" style={{ fontSize: '12px', marginBottom: '12px', minHeight: '36px', lineHeight: 1.5 }}>
                    {creator.bio || 'よろしくお願いします！'}
                  </div>
                  <div className={`status-badge ${creator.is_accepting_orders ? 'accepting' : 'not-accepting'}`} style={{ padding: '6px 14px' }}>
                    <i className="fas fa-circle"></i>
                    {creator.is_accepting_orders ? '受付中' : '受付停止'}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-users"></i>
              <p>クリエイターがいません</p>
            </div>
          )}
        </section>

        {/* 人気作品ランキング */}
        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">人気作品ランキング</h2>
            <Link href="/portfolio" className="section-link">
              もっと見る <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          
          {popularWorks.length > 0 ? (
            <div className="ranking-grid">
              {popularWorks.map((item, index) => (
                <Link key={item.id} href={`/portfolio/${item.id}`} className="soft-card" style={{ position: 'relative' }}>
                  <div className={`ranking-badge ${index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other'}`}>
                    {index + 1}
                  </div>
                  <div className="portfolio-card-image">
                    <img src={item.thumbnail_url || item.image_url} alt={item.title} loading="lazy" />
                  </div>
                  <div className="portfolio-card-content">
                    <div className="text-ellipsis mb-8" style={{ fontSize: '14px', fontWeight: 600, color: '#222222' }}>
                      {item.title}
                    </div>
                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                      <div className="avatar-neu avatar-neu-small">
                        {item.profiles.avatar_url ? (
                          <Image src={item.profiles.avatar_url} alt="" width={24} height={24} />
                        ) : (
                          <i className="fas fa-user"></i>
                        )}
                      </div>
                      <span className="text-ellipsis text-secondary" style={{ fontSize: '12px' }}>
                        {item.profiles.display_name || '名前未設定'}
                      </span>
                    </div>
                    <div className="like-count" style={{ marginTop: '8px' }}>
                      <i className="fas fa-heart"></i>
                      {item.like_count}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-trophy"></i>
              <p>まだランキングがありません</p>
            </div>
          )}
        </section>

        {/* 新着作品 */}
        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">新着作品</h2>
            <Link href="/portfolio" className="section-link">
              もっと見る <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          
          {portfolioItems.length > 0 ? (
            <div className="portfolio-grid">
              {portfolioItems.map((item) => (
                <Link key={item.id} href={`/portfolio/${item.id}`} className="soft-card">
                  <div className="portfolio-card-image">
                    <img src={item.thumbnail_url || item.image_url} alt={item.title} loading="lazy" />
                  </div>
                  <div className="portfolio-card-content">
                    <div className="text-ellipsis mb-8" style={{ fontSize: '14px', fontWeight: 600, color: '#222222' }}>
                      {item.title}
                    </div>
                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                      <div className="avatar-neu avatar-neu-small">
                        {item.profiles.avatar_url ? (
                          <Image src={item.profiles.avatar_url} alt="" width={24} height={24} />
                        ) : (
                          <i className="fas fa-user"></i>
                        )}
                      </div>
                      <span className="text-ellipsis text-secondary" style={{ fontSize: '12px' }}>
                        {item.profiles.display_name || '名前未設定'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-image"></i>
              <p>まだ作品がありません</p>
            </div>
          )}
        </section>

        {/* 依頼を探す */}
        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">依頼を探す</h2>
            <Link href="/requests" className="section-link">
              もっと見る <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          
          {workRequests.length > 0 ? (
            <div className="request-grid">
              {workRequests.map((request) => (
                <Link key={request.id} href={`/requests/${request.id}`} className="soft-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="badge-category" style={{ alignSelf: 'flex-start' }}>
                    {getCategoryLabel(request.category)}
                  </div>
                  <div className="text-clamp-2" style={{ fontSize: '16px', fontWeight: 700, color: '#222222', lineHeight: 1.4 }}>
                    {request.title}
                  </div>
                  <div className="text-clamp-2 text-secondary" style={{ fontSize: '13px', lineHeight: 1.5 }}>
                    {request.description}
                  </div>
                  <div className="text-price">
                    {request.budget_min && request.budget_max ? (
                      <>¥{request.budget_min.toLocaleString()}〜{request.budget_max.toLocaleString()}</>
                    ) : request.budget_min ? (
                      <>¥{request.budget_min.toLocaleString()}〜</>
                    ) : request.budget_max ? (
                      <>〜¥{request.budget_max.toLocaleString()}</>
                    ) : '予算未定'}
                  </div>
                  <div className="separator-light" style={{ margin: '0', marginTop: 'auto' }}></div>
                  <div className="flex gap-8" style={{ alignItems: 'center' }}>
                    <div className="avatar-neu avatar-neu-small">
                      {request.profiles.avatar_url ? (
                        <Image src={request.profiles.avatar_url} alt="" width={24} height={24} />
                      ) : (
                        <i className="fas fa-user"></i>
                      )}
                    </div>
                    <span className="text-secondary" style={{ fontSize: '12px' }}>
                      {request.profiles.display_name || '名前未設定'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-clipboard-list"></i>
              <p>まだ依頼がありません</p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}