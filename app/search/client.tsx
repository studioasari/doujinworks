'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/utils/supabase'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import EmptySearch from '@/app/components/EmptySearch'
import { WorkGridSkeleton, CreatorGridSkeleton, RequestGridSkeleton, PricingGridSkeleton } from '@/app/components/Skeleton'
import styles from './page.module.css'

/* ============================================
   型定義
   ============================================ */

type PortfolioItem = {
  id: string
  title: string
  image_url: string
  thumbnail_url: string | null
  creator_id: string
  category: string
  created_at: string
  profiles?: {
    user_id: string
    username: string
    display_name: string
    avatar_url: string | null
  }
  likeCount: number
  commentCount: number
}

type Creator = {
  id: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  account_type: string | null
  is_accepting_orders: boolean
  workCount: number
}

type WorkRequestProfile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  username: string | null
}

type WorkRequest = {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  category: string
  payment_type: string | null
  hourly_rate_min: number | null
  price_negotiable: boolean | null
  job_features: string[] | null
  required_skills: string[] | null
  number_of_positions: number | null
  application_deadline: string | null
  created_at: string
  profiles: WorkRequestProfile
}

type PricingPlan = {
  id: string
  plan_name: string
  thumbnail_url: string | null
  minimum_price: number
  category: string
  creator_id: string
  created_at: string
  profiles: {
    user_id: string
    username: string
    display_name: string
    avatar_url: string | null
    is_accepting_orders: boolean
  }
  averageRating: number
  reviewCount: number
}

/* ============================================
   定数
   ============================================ */

const CATEGORY_LABELS: Record<string, string> = {
  illustration: 'イラスト',
  manga: 'マンガ',
  novel: '小説',
  music: '音楽',
  voice: 'ボイス',
  video: '動画',
  design: 'デザイン',
  other: 'その他',
}

const CATEGORY_ICONS: Record<string, string> = {
  illustration: 'fa-image',
  manga: 'fa-book',
  novel: 'fa-file-alt',
  music: 'fa-music',
  design: 'fa-palette',
  video: 'fa-video',
  other: 'fa-ellipsis-h',
}

const JOB_FEATURE_LABELS: Record<string, string> = {
  no_skill: 'スキル不要',
  skill_welcome: '専門スキル歓迎',
  one_time: '単発',
  continuous: '継続あり',
  flexible_time: 'スキマ時間歓迎',
}

/* ============================================
   SearchParamsReader
   ============================================ */

function SearchParamsReader({ onQueryChange }: { onQueryChange: (query: string) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.get('q') || ''
    onQueryChange(query)
  }, [searchParams, onQueryChange])

  return null
}

/* ============================================
   メインコンポーネント
   ============================================ */

function SearchContent() {
  const [query, setQuery] = useState('')
  const [works, setWorks] = useState<PortfolioItem[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [requests, setRequests] = useState<WorkRequest[]>([])
  const [services, setServices] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (query) {
      searchAll()
    }
  }, [query])

  const searchAll = async () => {
    setLoading(true)

    try {
      await Promise.all([
        searchWorks(),
        searchCreators(),
        searchRequests(),
        searchServices(),
      ])
    } catch (error) {
      console.error('検索エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  /* ---------- 作品検索 ---------- */
  const searchWorks = async () => {
    const { data: worksData, error } = await supabase
      .from('portfolio_items')
      .select('id, title, description, image_url, thumbnail_url, creator_id, category, created_at')
      .eq('is_public', true)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(12)

    if (error || !worksData?.length) {
      setWorks([])
      return
    }

    const creatorIds = [...new Set(worksData.map(w => w.creator_id))]
    const { data: creatorsData } = await supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url')
      .in('user_id', creatorIds)

    const creatorMap = new Map()
    creatorsData?.forEach(c => creatorMap.set(c.user_id, c))

    const ids = worksData.map(w => w.id)
    const [{ data: likes }, { data: comments }] = await Promise.all([
      supabase.from('portfolio_likes').select('portfolio_item_id').in('portfolio_item_id', ids),
      supabase.from('comments').select('portfolio_item_id').in('portfolio_item_id', ids)
    ])

    const likeMap = new Map()
    likes?.forEach(l => likeMap.set(l.portfolio_item_id, (likeMap.get(l.portfolio_item_id) || 0) + 1))

    const commentMap = new Map()
    comments?.forEach(c => commentMap.set(c.portfolio_item_id, (commentMap.get(c.portfolio_item_id) || 0) + 1))

    setWorks(worksData.map((work: any) => ({
      ...work,
      profiles: creatorMap.get(work.creator_id),
      likeCount: likeMap.get(work.id) || 0,
      commentCount: commentMap.get(work.id) || 0
    })))
  }

  /* ---------- クリエイター検索 ---------- */
  const searchCreators = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, username, display_name, avatar_url, bio, account_type, is_accepting_orders')
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%`)
      .limit(8)

    if (error || !data?.length) {
      setCreators([])
      return
    }

    const creatorsWithCount = await Promise.all(
      data.map(async (creator) => {
        const { count } = await supabase
          .from('portfolio_items')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creator.user_id)
          .eq('is_public', true)

        return { ...creator, workCount: count || 0 }
      })
    )

    setCreators(creatorsWithCount)
  }

  /* ---------- 依頼検索 ---------- */
  const searchRequests = async () => {
    const { data, error } = await supabase
      .from('work_requests')
      .select('id, title, description, budget_min, budget_max, category, payment_type, hourly_rate_min, price_negotiable, job_features, required_skills, number_of_positions, application_deadline, created_at, profiles!work_requests_requester_id_fkey(id, display_name, avatar_url, username)')
      .eq('request_type', 'public')
      .eq('status', 'open')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(6)

    if (error) {
      setRequests([])
      return
    }

    setRequests((data || []).map((r: any) => ({
      ...r,
      profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    })))
  }

  /* ---------- サービス検索 ---------- */
  const searchServices = async () => {
    const { data: plans, error } = await supabase
      .from('pricing_plans')
      .select('id, plan_name, thumbnail_url, minimum_price, category, creator_id, created_at')
      .eq('is_public', true)
      .ilike('plan_name', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(8)

    if (error || !plans?.length) {
      setServices([])
      return
    }

    const validPlans = plans.filter(p => p.creator_id !== null)
    if (!validPlans.length) {
      setServices([])
      return
    }

    const creatorIds = [...new Set(validPlans.map(p => p.creator_id))]
    const { data: creatorsData } = await supabase
      .from('profiles')
      .select('id, user_id, username, display_name, avatar_url, is_accepting_orders')
      .in('id', creatorIds)

    const creatorMap = new Map()
    creatorsData?.forEach(c => creatorMap.set(c.id, c))

    const { data: reviews } = await supabase
      .from('reviews')
      .select('reviewee_id, rating')
      .in('reviewee_id', creatorIds)

    const reviewMap = new Map<string, { total: number; count: number }>()
    reviews?.forEach(r => {
      const existing = reviewMap.get(r.reviewee_id) || { total: 0, count: 0 }
      reviewMap.set(r.reviewee_id, { total: existing.total + r.rating, count: existing.count + 1 })
    })

    setServices(validPlans.map(plan => {
      const creator = creatorMap.get(plan.creator_id)
      const reviewData = reviewMap.get(plan.creator_id)
      return {
        ...plan,
        profiles: creator ? { ...creator, is_accepting_orders: creator.is_accepting_orders ?? false } : {
          user_id: '', username: '', display_name: '不明', avatar_url: null, is_accepting_orders: false
        },
        averageRating: reviewData ? reviewData.total / reviewData.count : 0,
        reviewCount: reviewData?.count || 0
      }
    }))
  }

  const totalResults = works.length + creators.length + requests.length + services.length
  const hasNoResults = !loading && totalResults === 0

  /* ============================================
     レンダリング
     ============================================ */

  // 結果なしの場合は別レイアウト
  if (hasNoResults) {
    return (
      <>
        <Header />

        <Suspense fallback={null}>
          <SearchParamsReader onQueryChange={setQuery} />
        </Suspense>

        <main className={styles.mainEmpty}>
          <div className={styles.searchHeader}>
            <h1 className={styles.searchTitle}>「{query}」の検索結果</h1>
            <div className={styles.searchMeta}>0件の結果</div>
          </div>
          <div className={styles.emptyContent}>
            <EmptySearch query={query} message="キーワードを変えて検索してみてね" />
          </div>
        </main>

        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />

      <Suspense fallback={null}>
        <SearchParamsReader onQueryChange={setQuery} />
      </Suspense>

      <main className={styles.main}>
        {/* 検索ヘッダー */}
        <div className={styles.searchHeader}>
          <h1 className={styles.searchTitle}>「{query}」の検索結果</h1>
          {!loading && (
            <div className={styles.searchMeta}>
              {totalResults}件の結果
            </div>
          )}
        </div>

        {/* ローディング */}
        {loading && (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>作品</h2>
              <WorkGridSkeleton count={6} />
            </section>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>クリエイター</h2>
              <CreatorGridSkeleton count={4} />
            </section>
          </>
        )}

        {/* ===== 作品セクション ===== */}
        {!loading && works.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              作品
              <span className={styles.sectionCount}>{works.length}</span>
            </h2>
            <div className={styles.worksGrid}>
              {works.map((item) => (
                <Link key={item.id} href={`/portfolio/${item.id}`} className={styles.workCard}>
                  <div className={styles.workCardImage}>
                    {item.thumbnail_url || item.image_url ? (
                      <Image
                        src={item.thumbnail_url || item.image_url}
                        alt={item.title}
                        fill
                        sizes="(max-width: 479px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 180px"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className={styles.placeholder}>
                        <i className="far fa-image"></i>
                      </div>
                    )}
                  </div>
                  {item.category && (
                    <span className={styles.workCardBadge}>
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                  )}
                  <div className={styles.cardInfo}>
                    <div className={styles.cardTitle}>{item.title}</div>
                    <div className={styles.cardMeta}>
                      {item.profiles && (
                        <div className={styles.cardCreator}>
                          <div className={styles.creatorAvatar}>
                            {item.profiles.avatar_url ? (
                              <Image src={item.profiles.avatar_url} alt="" width={18} height={18} sizes="18px" style={{ objectFit: 'cover' }} />
                            ) : (
                              <i className="fas fa-user"></i>
                            )}
                          </div>
                          <span className={styles.creatorName}>{item.profiles.display_name}</span>
                        </div>
                      )}
                      <div className={styles.cardStats}>
                        <span className={styles.statItem}><i className="fas fa-heart"></i>{item.likeCount}</span>
                        <span className={styles.statItem}><i className="fas fa-comment"></i>{item.commentCount}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== クリエイターセクション ===== */}
        {!loading && creators.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              クリエイター
              <span className={styles.sectionCount}>{creators.length}</span>
            </h2>
            <div className={styles.creatorsGrid}>
              {creators.map((creator) => (
                <Link key={creator.id} href={`/creators/${creator.username}`} className={styles.creatorCard}>
                  <span className={styles.typeBadge}>
                    {creator.account_type === 'business' ? 'ビジネス' : '一般'}
                  </span>
                  <div className={styles.avatar}>
                    {creator.avatar_url ? (
                      <Image src={creator.avatar_url} alt={creator.display_name || ''} width={64} height={64} sizes="64px" />
                    ) : (
                      <span className={styles.avatarInitial}>{creator.display_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className={styles.nameArea}>
                    <h3 className={styles.creatorCardName}>{creator.display_name || '名前未設定'}</h3>
                    {creator.username && <p className={styles.creatorCardUsername}>@{creator.username}</p>}
                  </div>
                  <div className={styles.statusArea}>
                    {creator.account_type === 'business' && (
                      <span className={`${styles.statusBadge} ${creator.is_accepting_orders ? styles.statusOpen : styles.statusClosed}`}>
                        <i className="fas fa-circle" style={{ fontSize: '6px' }}></i>
                        {creator.is_accepting_orders ? '受付中' : '受付停止'}
                      </span>
                    )}
                  </div>
                  <p className={styles.creatorCardBio}>{creator.bio || '自己紹介が登録されていません'}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== 依頼セクション ===== */}
        {!loading && requests.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              依頼
              <span className={styles.sectionCount}>{requests.length}</span>
            </h2>
            <div className={styles.requestsGrid}>
              {requests.map((request) => {
                const daysUntilDeadline = request.application_deadline
                  ? Math.ceil((new Date(request.application_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null

                return (
                  <Link key={request.id} href={`/requests/${request.id}`} className={styles.requestCard}>
                    <div className={styles.requestBadge}>
                      <i className={`fas ${CATEGORY_ICONS[request.category] || 'fa-file'}`}></i>
                      {CATEGORY_LABELS[request.category] || request.category}
                    </div>
                    <h3 className={styles.requestTitle}>{request.title}</h3>
                    <p className={styles.requestDesc}>{request.description}</p>
                    <div className={styles.requestStatsRow}>
                      <div className={styles.requestStatItem}>
                        <i className="fas fa-user"></i>
                        <span>0/{request.number_of_positions || 1}人</span>
                      </div>
                      <div className={styles.requestStatItem}>
                        <i className="fas fa-clock"></i>
                        {request.application_deadline && daysUntilDeadline !== null ? (
                          daysUntilDeadline > 0 ? (
                            <span>あと{daysUntilDeadline}日</span>
                          ) : daysUntilDeadline === 0 ? (
                            <span className={styles.requestStatUrgent}>本日締切</span>
                          ) : (
                            <span className={styles.requestStatExpired}>締切済み</span>
                          )
                        ) : (
                          <span>期限なし</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.requestTags}>
                      {request.required_skills?.slice(0, 3).map((skill, i) => (
                        <span key={i} className={styles.skillTag}>{skill}</span>
                      ))}
                      {(request.required_skills?.length || 0) > 3 && (
                        <span className={styles.moreTags}>+{request.required_skills!.length - 3}</span>
                      )}
                      {request.job_features?.slice(0, 2).map((feature, i) => (
                        <span key={`f-${i}`} className={styles.featureTag}>
                          <i className="fas fa-check"></i>
                          {JOB_FEATURE_LABELS[feature] || feature}
                        </span>
                      ))}
                    </div>
                    <div className={styles.requestFooter}>
                      <div className={styles.requesterInfo}>
                        <div className={styles.requesterAvatar}>
                          {request.profiles?.avatar_url ? (
                            <Image src={request.profiles.avatar_url} alt="" width={24} height={24} sizes="24px" />
                          ) : (
                            <i className="fas fa-user"></i>
                          )}
                        </div>
                        <span className={styles.requesterName}>{request.profiles?.display_name || '名前未設定'}</span>
                      </div>
                      {request.payment_type === 'hourly' ? (
                        <span className={styles.requestPrice}>
                          {request.hourly_rate_min ? (
                            <>{request.hourly_rate_min.toLocaleString()}<span>円/時〜</span></>
                          ) : (
                            <span className={styles.requestPriceNegotiable}>応相談</span>
                          )}
                        </span>
                      ) : request.price_negotiable ? (
                        <span className={styles.requestPriceNegotiable}>相談して決める</span>
                      ) : request.budget_min || request.budget_max ? (
                        <span className={styles.requestPrice}>
                          {request.budget_max ? <>¥{request.budget_max.toLocaleString()}</> : <>{request.budget_min?.toLocaleString()}<span>円〜</span></>}
                        </span>
                      ) : (
                        <span className={styles.requestPriceNegotiable}>要相談</span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ===== サービスセクション ===== */}
        {!loading && services.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              サービス
              <span className={styles.sectionCount}>{services.length}</span>
            </h2>
            <div className={styles.servicesGrid}>
              {services.map((plan) => (
                <Link key={plan.id} href={`/pricing/${plan.id}`} className={styles.serviceCard}>
                  <div className={styles.serviceCardImage}>
                    {plan.thumbnail_url ? (
                      <Image src={plan.thumbnail_url} alt={plan.plan_name} fill sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 200px" />
                    ) : (
                      <div className={styles.placeholder}><i className="far fa-image"></i></div>
                    )}
                    <span className={styles.serviceCardBadge}>{CATEGORY_LABELS[plan.category] || plan.category}</span>
                  </div>
                  <div className={styles.serviceCardBody}>
                    <h3 className={styles.serviceCardTitle}>{plan.plan_name}</h3>
                    <div className={styles.serviceCardPrice}>¥{plan.minimum_price.toLocaleString()}<span>〜</span></div>
                    <div className={styles.serviceCardCreator}>
                      <div className={styles.serviceCreatorAvatar}>
                        {plan.profiles.avatar_url ? (
                          <Image src={plan.profiles.avatar_url} alt="" width={24} height={24} sizes="24px" />
                        ) : (
                          <i className="fas fa-user"></i>
                        )}
                      </div>
                      <span className={styles.serviceCreatorName}>{plan.profiles.display_name || '名前未設定'}</span>
                    </div>
                    <div className={styles.serviceCardFooter}>
                      {plan.reviewCount > 0 ? (
                        <span className={styles.serviceCardRating}>
                          <i className="fas fa-star"></i>
                          {plan.averageRating.toFixed(1)}
                          <span className={styles.ratingCount}>({plan.reviewCount})</span>
                        </span>
                      ) : (
                        <span></span>
                      )}
                      <span className={`${styles.statusBadge} ${plan.profiles.is_accepting_orders ? styles.statusOpen : styles.statusClosed}`}>
                        <i className="fas fa-circle" style={{ fontSize: '5px' }}></i>
                        {plan.profiles.is_accepting_orders ? '受付中' : '受付停止'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  )
}

export function SearchPageClient() {
  return <SearchContent />
}