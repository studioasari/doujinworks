'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import Header from './components/Header'
import Footer from './components/Footer'
import LoadingSkeleton from './LoadingSkeleton'
import Link from 'next/link'
import Image from 'next/image'

type PortfolioItem = {
  id: string
  title: string
  image_url: string
  thumbnail_url: string | null
  creator_id: string
  category: string
  created_at: string
  profiles: {
    username: string
    display_name: string
    avatar_url: string | null
  }
  likeCount: number
  commentCount: number
}

type Creator = {
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  workCount: number
  followerCount: number
}

export default function Home() {
  const [featuredWorks, setFeaturedWorks] = useState<PortfolioItem[]>([])
  const [newWorks, setNewWorks] = useState<PortfolioItem[]>([])
  const [popularWorks, setPopularWorks] = useState<PortfolioItem[]>([])
  const [featuredCreators, setFeaturedCreators] = useState<Creator[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'following'>('all')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    setIsLoggedIn(!!user)
  }

  async function fetchData() {
    console.time('データ取得時間')
    setLoading(true)
    
    try {
      const { data: allWorks, error } = await supabase
        .from('portfolio_items')
        .select('id, title, image_url, thumbnail_url, creator_id, category, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('作品取得エラー:', error)
        return
      }

      if (allWorks && allWorks.length > 0) {
        const creatorIds = [...new Set(allWorks.map(w => w.creator_id))]
        const { data: creatorsData } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', creatorIds)

        const creatorMap = new Map()
        creatorsData?.forEach(c => creatorMap.set(c.user_id, c))

        const ids = allWorks.map(w => w.id)
        const [{ data: likes }, { data: comments }] = await Promise.all([
          supabase.from('portfolio_likes').select('portfolio_item_id').in('portfolio_item_id', ids),
          supabase.from('comments').select('portfolio_item_id').in('portfolio_item_id', ids)
        ])

        const likeMap = new Map()
        likes?.forEach(l => likeMap.set(l.portfolio_item_id, (likeMap.get(l.portfolio_item_id) || 0) + 1))
        
        const commentMap = new Map()
        comments?.forEach(c => commentMap.set(c.portfolio_item_id, (commentMap.get(c.portfolio_item_id) || 0) + 1))

        const worksWithStats = allWorks.map((work: any) => ({
          ...work,
          profiles: creatorMap.get(work.creator_id),
          likeCount: likeMap.get(work.id) || 0,
          commentCount: commentMap.get(work.id) || 0
        }))

        setNewWorks(worksWithStats.slice(0, 30))
        setFeaturedWorks(worksWithStats.sort((a, b) => b.likeCount - a.likeCount).slice(0, 8))
        setPopularWorks(worksWithStats.sort((a, b) => b.likeCount - a.likeCount).slice(0, 18))
      }

      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, bio')
        .limit(30)

      if (creatorsData) {
        const creatorIds = creatorsData.map(c => c.user_id)
        const [{ data: works }, { data: follows }] = await Promise.all([
          supabase.from('portfolio_items').select('creator_id').eq('is_public', true).in('creator_id', creatorIds),
          supabase.from('follows').select('following_id').in('following_id', creatorIds)
        ])

        const workMap = new Map()
        works?.forEach(w => workMap.set(w.creator_id, (workMap.get(w.creator_id) || 0) + 1))

        const followerMap = new Map()
        follows?.forEach(f => followerMap.set(f.following_id, (followerMap.get(f.following_id) || 0) + 1))

        const creatorsWithStats = creatorsData.map((creator: any) => ({
          ...creator,
          workCount: workMap.get(creator.user_id) || 0,
          followerCount: followerMap.get(creator.user_id) || 0
        }))
        
        setFeaturedCreators(creatorsWithStats.filter(c => c.workCount > 0).sort((a, b) => b.workCount - a.workCount).slice(0, 12))
      }

    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      console.timeEnd('データ取得時間')
      setLoading(false)
    }
  }

  function getCategoryLabel(category: string) {
    const categories: { [key: string]: string } = {
      illustration: 'イラスト',
      manga: '漫画',
      novel: '小説',
      music: '音楽',
      voice: 'ボイス',
      video: '動画'
    }
    return categories[category] || category
  }

  function getFilteredWorks(works: PortfolioItem[]) {
    if (!activeCategory) return works
    return works.filter(w => w.category === activeCategory)
  }

  const categories = [
    { id: 'illustration', label: 'イラスト' },
    { id: 'manga', label: 'マンガ' },
    { id: 'novel', label: '小説' },
    { id: 'music', label: '音楽' },
    { id: 'voice', label: 'ボイス' },
    { id: 'video', label: '動画' }
  ]

  function PortfolioCard({ item }: { item: PortfolioItem }) {
    return (
      <Link href={`/portfolio/${item.id}`} className="portfolio-card">
        <div className="portfolio-card-image">
          <img
            src={item.thumbnail_url || item.image_url}
            alt={item.title}
            loading="lazy"
          />
          <div className="category-badge">
            {getCategoryLabel(item.category)}
          </div>
        </div>

        <div className="portfolio-card-content">
          <h3 className="card-subtitle text-ellipsis mb-8">
            {item.title}
          </h3>

          <div
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              window.location.href = `/creators/${item.profiles?.username || ''}`
            }}
            className="creator-info mb-12"
          >
            <div className="avatar avatar-small">
              {item.profiles?.avatar_url ? (
                <Image 
                  src={item.profiles.avatar_url} 
                  alt="" 
                  width={24} 
                  height={24} 
                />
              ) : (
                <i className="fas fa-user"></i>
              )}
            </div>
            <span className="text-small text-secondary text-ellipsis">
              {item.profiles?.display_name || '名前未設定'}
            </span>
          </div>

          <div className="portfolio-stats">
            <span>
              <i className="far fa-heart"></i>
              <span>{item.likeCount}</span>
            </span>
            <span>
              <i className="far fa-comment"></i>
              <span>{item.commentCount}</span>
            </span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: '#F5F6F8',
      width: '100vw',
      overflowX: 'hidden'
    }}>
      <Header />
      
      <style dangerouslySetInnerHTML={{
        __html: `
          .portfolio-card {
            background-color: #FFFFFF;
            border: 1px solid #D0D5DA;
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
            cursor: pointer;
            text-decoration: none;
            display: block;
          }
          
          .portfolio-card:hover {
            border-color: #5B7C99;
            box-shadow: 0 2px 8px rgba(91, 124, 153, 0.15);
          }
          
          .portfolio-card-image {
            width: 100%;
            padding-top: 100%;
            position: relative;
            background-color: #EEF0F3;
          }
          
          .portfolio-card-image img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .category-badge {
            position: absolute;
            bottom: 8px;
            left: 8px;
            background-color: rgba(34, 34, 34, 0.85);
            color: #FFFFFF;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
          }
          
          .portfolio-card-content {
            padding: 16px;
          }
          
          .creator-info {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: opacity 0.2s ease;
          }
          
          .creator-info:hover {
            opacity: 0.7;
          }
          
          .portfolio-stats {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #888888;
          }
          
          .portfolio-stats span {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          
          .sidebar-nav-button {
            width: 100%;
            padding: 12px 16px;
            border: none;
            background: transparent;
            font-size: 14px;
            font-weight: 400;
            color: #222222;
            cursor: pointer;
            text-align: left;
            border-radius: 8px;
            transition: background-color 0.2s;
            text-decoration: none;
            display: block;
          }
          
          .sidebar-nav-button:hover {
            background-color: #EEF0F3;
          }
          
          .sidebar-nav-button.active {
            background-color: #EAF0F5;
            font-weight: 600;
            color: #5B7C99;
          }
          
          .sidebar-section-title {
            font-size: 12px;
            font-weight: 600;
            color: #888888;
            margin-bottom: 8px;
            padding: 0 16px;
          }
          
          .featured-creator-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background-color: transparent;
            border-radius: 8px;
            text-decoration: none;
            transition: background-color 0.2s;
          }
          
          .featured-creator-card:hover {
            background-color: #EEF0F3;
          }
          
          @media (max-width: 1024px) {
            .sidebar-desktop {
              display: none !important;
            }
          }
          
          @media (max-width: 768px) {
            .grid-portfolio {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 12px !important;
            }
          }
        `
      }} />
      
      <main style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', width: '100%' }}>
        {/* サイドバー */}
        <aside style={{
          width: '240px',
          flexShrink: 0,
          borderRight: '1px solid #D0D5DA',
          backgroundColor: '#FFFFFF',
          padding: '20px',
          minHeight: '100%'
        }}
        className="sidebar-desktop">
          {/* メインナビゲーション */}
          <nav className="mb-24">
            <button
              onClick={() => {
                setActiveTab('all')
                setActiveCategory(null)
              }}
              className={`sidebar-nav-button ${activeTab === 'all' && !activeCategory ? 'active' : ''}`}
            >
              すべて
            </button>
            {isLoggedIn && (
              <button
                onClick={() => {
                  setActiveTab('following')
                  setActiveCategory(null)
                }}
                className={`sidebar-nav-button ${activeTab === 'following' ? 'active' : ''}`}
              >
                フォロー中
              </button>
            )}
          </nav>

          <div className="separator"></div>

          {/* 仕事セクション */}
          <div className="mb-24">
            <div className="sidebar-section-title">仕事</div>
            <Link href="/requests" className="sidebar-nav-button">
              依頼を探す
            </Link>
            {isLoggedIn && (
              <Link href="/requests/create" className="sidebar-nav-button">
                依頼を投稿
              </Link>
            )}
          </div>

          <div className="separator"></div>

          {/* クリエイター */}
          <Link href="/creators" className="sidebar-nav-button mb-24">
            クリエイターを探す
          </Link>

          <div className="separator"></div>

          {/* カテゴリ */}
          <div className="mb-24">
            <div className="sidebar-section-title">カテゴリ</div>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveTab('all')
                  setActiveCategory(activeCategory === cat.id ? null : cat.id)
                }}
                className={`sidebar-nav-button ${activeCategory === cat.id ? 'active' : ''}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="separator"></div>

          {/* 注目のクリエイター */}
          <div>
            <div className="sidebar-section-title">注目のクリエイター</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {featuredCreators.slice(0, 8).map((creator) => (
                <Link 
                  key={creator.user_id}
                  href={`/creators/${creator.username}`}
                  className="featured-creator-card"
                >
                  <div className="avatar avatar-medium">
                    {creator.avatar_url ? (
                      <Image 
                        src={creator.avatar_url} 
                        alt="" 
                        width={48} 
                        height={48} 
                      />
                    ) : (
                      <i className="fas fa-user"></i>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-small text-primary text-ellipsis" style={{ fontWeight: 600 }}>
                      {creator.display_name}
                    </div>
                    <div className="text-tiny text-gray">
                      {creator.workCount} 作品
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <div style={{ flex: 1, minWidth: 0, backgroundColor: '#FFFFFF' }}>
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {/* カテゴリフィルター適用時 */}
              {activeCategory && (
                <>
                  <div className="p-24" style={{ borderBottom: '1px solid #EEF0F3' }}>
                    <div className="flex-between mb-16">
                      <h2 className="section-title">
                        {getCategoryLabel(activeCategory)}
                      </h2>
                      <button
                        onClick={() => setActiveCategory(null)}
                        className="btn-secondary btn-small"
                      >
                        <i className="fas fa-times"></i> フィルターを解除
                      </button>
                    </div>
                  </div>

                  <div className="p-24">
                    <Link href="/portfolio" className="flex gap-8 mb-16" style={{ 
                      alignItems: 'center',
                      textDecoration: 'none',
                      color: '#222222'
                    }}>
                      <h3 className="section-title">おすすめ作品</h3>
                      <i className="fas fa-chevron-right text-gray" style={{ fontSize: '14px' }}></i>
                    </Link>
                    <div className="grid-portfolio" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '20px'
                    }}>
                      {getFilteredWorks(featuredWorks).map((item) => (
                        <PortfolioCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>

                  <div className="p-24">
                    <Link href="/portfolio" className="flex gap-8 mb-16" style={{ 
                      alignItems: 'center',
                      textDecoration: 'none',
                      color: '#222222'
                    }}>
                      <h3 className="section-title">新着作品</h3>
                      <i className="fas fa-chevron-right text-gray" style={{ fontSize: '14px' }}></i>
                    </Link>
                    <div className="grid-portfolio" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '20px'
                    }}>
                      {getFilteredWorks(newWorks).map((item) => (
                        <PortfolioCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>

                  <div className="p-24">
                    <Link href="/portfolio" className="flex gap-8 mb-16" style={{ 
                      alignItems: 'center',
                      textDecoration: 'none',
                      color: '#222222'
                    }}>
                      <h3 className="section-title">人気作品</h3>
                      <i className="fas fa-chevron-right text-gray" style={{ fontSize: '14px' }}></i>
                    </Link>
                    <div className="grid-portfolio" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '20px'
                    }}>
                      {getFilteredWorks(popularWorks).map((item) => (
                        <PortfolioCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 通常表示 */}
              {!activeCategory && (
                <>
                  {/* フォロー中タブ */}
                  {isLoggedIn && activeTab === 'following' && (
                    <div className="p-24" style={{ borderBottom: '1px solid #EEF0F3' }}>
                      <Link href="/portfolio" className="flex gap-8 mb-16" style={{ 
                        alignItems: 'center',
                        textDecoration: 'none',
                        color: '#222222'
                      }}>
                        <h3 className="section-title">フォロー中の新着作品</h3>
                        <i className="fas fa-chevron-right text-gray" style={{ fontSize: '14px' }}></i>
                      </Link>
                      <div className="grid-portfolio" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '20px'
                      }}>
                        {newWorks.slice(0, 12).map((item) => (
                          <PortfolioCard key={item.id} item={item} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 注目作品 */}
                  <div className="p-24" style={{ borderBottom: '1px solid #EEF0F3' }}>
                    <Link href="/portfolio" className="flex gap-8 mb-16" style={{ 
                      alignItems: 'center',
                      textDecoration: 'none',
                      color: '#222222'
                    }}>
                      <h3 className="section-title">注目作品</h3>
                      <i className="fas fa-chevron-right text-gray" style={{ fontSize: '14px' }}></i>
                    </Link>
                    <div className="grid-portfolio" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '20px'
                    }}>
                      {featuredWorks.map((item) => (
                        <PortfolioCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>

                  {/* カテゴリ別セクション */}
                  {categories.map((cat) => {
                    const categoryWorks = newWorks.filter(w => w.category === cat.id).slice(0, 8)
                    if (categoryWorks.length === 0) return null
                    
                    return (
                      <div key={cat.id} className="p-24" style={{ borderBottom: '1px solid #EEF0F3' }}>
                        <Link 
                          href={`/portfolio?category=${cat.id}`}
                          className="flex gap-8 mb-16"
                          style={{ 
                            alignItems: 'center',
                            textDecoration: 'none',
                            color: '#222222'
                          }}
                        >
                          <h3 className="section-title">新着{cat.label}</h3>
                          <i className="fas fa-chevron-right text-gray" style={{ fontSize: '14px' }}></i>
                        </Link>
                        <div className="grid-portfolio" style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                          gap: '20px'
                        }}>
                          {categoryWorks.map((item) => (
                            <PortfolioCard key={item.id} item={item} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}