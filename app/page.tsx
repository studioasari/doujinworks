'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import Header from './components/Header'
import Footer from './components/Footer'
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

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    setIsLoggedIn(!!user)
  }

  async function fetchData() {
    // 注目の作品（いいね数が多い最新作品、6件）
    const { data: featuredData, error: featuredError } = await supabase
      .from('portfolio_items')
      .select('id, title, image_url, thumbnail_url, creator_id, category, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20)

    if (featuredError) {
      console.error('注目作品取得エラー:', featuredError)
    }

    if (featuredData && featuredData.length > 0) {
      // クリエイター情報を一括取得
      const creatorIds = [...new Set(featuredData.map(w => w.creator_id))]
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', creatorIds)

      const creatorMap = new Map()
      creatorsData?.forEach(c => creatorMap.set(c.user_id, c))

      // いいね数とコメント数を並列取得（N+1解消）
      const ids = featuredData.map(w => w.id).slice(0, 8)
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from('portfolio_likes').select('portfolio_item_id').in('portfolio_item_id', ids),
        supabase.from('comments').select('portfolio_item_id').in('portfolio_item_id', ids)
      ])

      const likeMap = new Map()
      likes?.forEach(l => likeMap.set(l.portfolio_item_id, (likeMap.get(l.portfolio_item_id) || 0) + 1))
      
      const commentMap = new Map()
      comments?.forEach(c => commentMap.set(c.portfolio_item_id, (commentMap.get(c.portfolio_item_id) || 0) + 1))

      const worksWithStats = featuredData.slice(0, 8).map((work: any) => ({
        ...work,
        profiles: creatorMap.get(work.creator_id),
        likeCount: likeMap.get(work.id) || 0,
        commentCount: commentMap.get(work.id) || 0
      }))
      
      setFeaturedWorks(worksWithStats.sort((a, b) => b.likeCount - a.likeCount))
    }

    // 新着作品（最新30件）
    const { data: newData, error: newError } = await supabase
      .from('portfolio_items')
      .select('id, title, image_url, thumbnail_url, creator_id, category, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(30)

    if (newError) {
      console.error('新着作品取得エラー:', newError)
    }

    if (newData && newData.length > 0) {
      // クリエイター情報を一括取得
      const creatorIds = [...new Set(newData.map(w => w.creator_id))]
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', creatorIds)

      const creatorMap = new Map()
      creatorsData?.forEach(c => creatorMap.set(c.user_id, c))

      const ids = newData.map(w => w.id)
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from('portfolio_likes').select('portfolio_item_id').in('portfolio_item_id', ids),
        supabase.from('comments').select('portfolio_item_id').in('portfolio_item_id', ids)
      ])

      const likeMap = new Map()
      likes?.forEach(l => likeMap.set(l.portfolio_item_id, (likeMap.get(l.portfolio_item_id) || 0) + 1))
      
      const commentMap = new Map()
      comments?.forEach(c => commentMap.set(c.portfolio_item_id, (commentMap.get(c.portfolio_item_id) || 0) + 1))

      const worksWithStats = newData.map((work: any) => ({
        ...work,
        profiles: creatorMap.get(work.creator_id),
        likeCount: likeMap.get(work.id) || 0,
        commentCount: commentMap.get(work.id) || 0
      }))
      
      setNewWorks(worksWithStats)
    }

    // 人気作品（いいね数順、12件）
    const { data: allWorks, error: popularError } = await supabase
      .from('portfolio_items')
      .select('id, title, image_url, thumbnail_url, creator_id, category, created_at')
      .eq('is_public', true)
      .limit(50)

    if (popularError) {
      console.error('人気作品取得エラー:', popularError)
    }

    if (allWorks && allWorks.length > 0) {
      // クリエイター情報を一括取得
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
      
      setPopularWorks(worksWithStats.sort((a, b) => b.likeCount - a.likeCount).slice(0, 18))
    }

    // 注目クリエイター（作品数が多い順、8人）
    const { data: creatorsData, error: creatorsError } = await supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url, bio')
      .limit(30)

    if (creatorsError) {
      console.error('クリエイター取得エラー:', creatorsError)
    }

    if (creatorsData) {
      const ids = creatorsData.map(c => c.user_id)
      const [{ data: works }, { data: follows }] = await Promise.all([
        supabase.from('portfolio_items').select('creator_id').eq('is_public', true).in('creator_id', ids),
        supabase.from('follows').select('following_id').in('following_id', ids)
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

  // カテゴリでフィルタリング
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

  function PortfolioCard({ item, size = 'normal' }: { item: PortfolioItem, size?: 'normal' | 'large' }) {
    const isLarge = size === 'large'
    
    return (
      <Link href={`/portfolio/${item.id}`} style={{ display: 'block', textDecoration: 'none' }}>
        {/* 画像部分 */}
        <div style={{ 
          position: 'relative',
          width: '100%',
          paddingTop: '100%',
          backgroundColor: '#F5F5F5',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '8px'
        }}>
          <img
            src={item.thumbnail_url || item.image_url}
            alt={item.title}
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }}
          />
          {/* カテゴリバッジ */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600'
          }}>
            {getCategoryLabel(item.category)}
          </div>
        </div>

        {/* タイトル */}
        <h3 style={{ 
          fontSize: '14px',
          fontWeight: '500',
          color: '#1A1A1A',
          marginBottom: '6px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {item.title}
        </h3>

        {/* クリエイター情報 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: '#E5E5E5',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {item.profiles?.avatar_url ? (
              <Image src={item.profiles.avatar_url} alt="" width={20} height={20} style={{ objectFit: 'cover' }} />
            ) : (
              <i className="fas fa-user" style={{ fontSize: '8px', color: '#9B9B9B' }}></i>
            )}
          </div>
          <span style={{ 
            fontSize: '12px', 
            color: '#6B6B6B',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}>
            {item.profiles?.display_name || '名前未設定'}
          </span>
        </div>

        {/* いいね・コメント数 */}
        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#9B9B9B' }}>
          <span><i className="far fa-heart"></i> {item.likeCount}</span>
          <span><i className="far fa-comment"></i> {item.commentCount}</span>
        </div>
      </Link>
    )
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      width: '100vw',
      overflowX: 'hidden'
    }}>
      <Header />
      
      {/* レスポンシブ対応スタイル */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (max-width: 1024px) {
            .sidebar-desktop {
              display: none !important;
            }
          }
        `
      }} />
      
      <main style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', width: '100%' }}>
        {/* 左サイドバー */}
        <aside style={{
          width: '240px',
          flexShrink: 0,
          borderRight: '1px solid #E5E5E5',
          backgroundColor: 'white',
          padding: '20px',
          minHeight: '100%'
        }}
        className="sidebar-desktop">
          {/* メニュー */}
          <nav style={{ marginBottom: '20px' }}>
            <button
              onClick={() => {
                setActiveTab('all')
                setActiveCategory(null)
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: activeTab === 'all' && !activeCategory ? '#F5F5F5' : 'transparent',
                fontSize: '15px',
                fontWeight: activeTab === 'all' && !activeCategory ? '600' : '400',
                color: '#1A1A1A',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: '6px',
                marginBottom: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'all' || activeCategory) e.currentTarget.style.backgroundColor = '#FAFAFA'
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'all' || activeCategory) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              すべて
            </button>
            {isLoggedIn && (
              <button
                onClick={() => {
                  setActiveTab('following')
                  setActiveCategory(null)
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: activeTab === 'following' ? '#F5F5F5' : 'transparent',
                  fontSize: '15px',
                  fontWeight: activeTab === 'following' ? '600' : '400',
                  color: '#1A1A1A',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: '6px',
                  marginBottom: '4px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'following') e.currentTarget.style.backgroundColor = '#FAFAFA'
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'following') e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                フォロー中
              </button>
            )}
          </nav>

          {/* 区切り線 */}
          <div style={{ height: '1px', backgroundColor: '#E5E5E5', margin: '0 0 20px 0' }}></div>

          {/* 依頼機能 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#9B9B9B', marginBottom: '12px', padding: '0 16px' }}>
              仕事
            </div>
            <Link
              href="/requests"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                fontSize: '15px',
                fontWeight: '400',
                color: '#1A1A1A',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: '6px',
                transition: 'background-color 0.2s',
                display: 'block',
                textDecoration: 'none',
                marginBottom: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              依頼を探す
            </Link>
            {isLoggedIn && (
              <Link
                href="/requests/create"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '15px',
                  fontWeight: '400',
                  color: '#1A1A1A',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s',
                  display: 'block',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                依頼を投稿
              </Link>
            )}
          </div>

          {/* 区切り線 */}
          <div style={{ height: '1px', backgroundColor: '#E5E5E5', margin: '0 0 20px 0' }}></div>

          {/* クリエイター検索 */}
          <Link
            href="/creators"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '15px',
              fontWeight: '400',
              color: '#1A1A1A',
              cursor: 'pointer',
              textAlign: 'left',
              borderRadius: '6px',
              transition: 'background-color 0.2s',
              display: 'block',
              textDecoration: 'none',
              marginBottom: '20px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            クリエイターを探す
          </Link>

          {/* 区切り線 */}
          <div style={{ height: '1px', backgroundColor: '#E5E5E5', margin: '0 0 20px 0' }}></div>

          {/* カテゴリメニュー */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#9B9B9B', marginBottom: '12px', padding: '0 16px' }}>
              カテゴリ
            </div>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveTab('all')
                  setActiveCategory(activeCategory === cat.id ? null : cat.id)
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  background: activeCategory === cat.id ? '#F5F5F5' : 'transparent',
                  fontSize: '14px',
                  fontWeight: activeCategory === cat.id ? '600' : '400',
                  color: '#1A1A1A',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: '6px',
                  marginBottom: '2px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (activeCategory !== cat.id) e.currentTarget.style.backgroundColor = '#FAFAFA'
                }}
                onMouseLeave={(e) => {
                  if (activeCategory !== cat.id) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 区切り線 */}
          <div style={{ height: '1px', backgroundColor: '#E5E5E5', margin: '0 0 20px 0' }}></div>

          {/* 注目のクリエイター */}
          {featuredCreators.length > 0 && (
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                marginBottom: '12px', 
                color: '#9B9B9B', 
                padding: '0 16px'
              }}>
                注目のクリエイター
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {featuredCreators.slice(0, 8).map((creator) => (
                  <Link 
                    key={creator.user_id}
                    href={`/creators/${creator.username}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px',
                      backgroundColor: 'transparent',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: '#E5E5E5',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {creator.avatar_url ? (
                        <Image src={creator.avatar_url} alt="" width={40} height={40} style={{ objectFit: 'cover' }} />
                      ) : (
                        <i className="fas fa-user" style={{ fontSize: '16px', color: '#9B9B9B' }}></i>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {creator.display_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9B9B9B' }}>
                        {creator.workCount} 作品
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* メインコンテンツ */}
        <div style={{ flex: 1, minWidth: 0, backgroundColor: 'white' }}>
          {/* 作品が0件の場合 */}
          {newWorks.length === 0 && (
            <div style={{ padding: '80px 20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '12px', color: '#1A1A1A' }}>
                まだ作品が投稿されていません
              </h2>
              <p style={{ fontSize: '15px', color: '#6B6B6B', marginBottom: '24px' }}>
                最初の作品を投稿してみませんか？
              </p>
              {isLoggedIn && (
                <Link href="/portfolio/new" className="btn-primary">
                  作品を投稿する
                </Link>
              )}
            </div>
          )}

          {/* カテゴリごとのセクション（フィルター時） */}
          {activeCategory && newWorks.length > 0 && (
            <>
              <div style={{ padding: '24px 20px', borderBottom: '1px solid #F5F5F5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1A1A1A' }}>
                    {getCategoryLabel(activeCategory)}
                  </h2>
                  <button
                    onClick={() => setActiveCategory(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9B9B9B',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#1A1A1A'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9B9B9B'}
                  >
                    <i className="fas fa-times"></i> フィルターを解除
                  </button>
                </div>
              </div>

              {/* おすすめ */}
              {getFilteredWorks(featuredWorks).length > 0 && (
                <div style={{ padding: '24px 20px 20px' }}>
                  <Link href="/portfolio" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    marginBottom: '16px', 
                    color: '#1A1A1A', 
                    textDecoration: 'none' 
                  }}>
                    <span>おすすめ作品</span>
                    <i className="fas fa-chevron-right" style={{ fontSize: '14px', color: '#9B9B9B' }}></i>
                  </Link>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '16px'
                  }}>
                    {getFilteredWorks(featuredWorks).map((item) => (
                      <PortfolioCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* 新着作品 */}
              {getFilteredWorks(newWorks).length > 0 && (
                <div style={{ padding: '20px 20px' }}>
                  <Link href="/portfolio" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    marginBottom: '16px', 
                    color: '#1A1A1A', 
                    textDecoration: 'none' 
                  }}>
                    <span>新着作品</span>
                    <i className="fas fa-chevron-right" style={{ fontSize: '14px', color: '#9B9B9B' }}></i>
                  </Link>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '16px'
                  }}>
                    {getFilteredWorks(newWorks).map((item) => (
                      <PortfolioCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* 人気作品 */}
              {getFilteredWorks(popularWorks).length > 0 && (
                <div style={{ padding: '20px' }}>
                  <Link href="/portfolio" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    marginBottom: '16px', 
                    color: '#1A1A1A', 
                    textDecoration: 'none' 
                  }}>
                    <span>人気作品</span>
                    <i className="fas fa-chevron-right" style={{ fontSize: '14px', color: '#9B9B9B' }}></i>
                  </Link>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '16px'
                  }}>
                    {getFilteredWorks(popularWorks).map((item) => (
                      <PortfolioCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 通常表示（フィルターなし） */}
          {!activeCategory && newWorks.length > 0 && (
            <>
              {/* フォロー中の作品（ログイン時のみ） */}
              {isLoggedIn && activeTab === 'following' && (
                <div style={{ padding: '24px 20px', borderBottom: '1px solid #F5F5F5' }}>
                  <Link href="/portfolio" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    marginBottom: '16px', 
                    color: '#1A1A1A', 
                    textDecoration: 'none' 
                  }}>
                    <span>フォロー中の新着作品</span>
                    <i className="fas fa-chevron-right" style={{ fontSize: '14px', color: '#9B9B9B' }}></i>
                  </Link>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '16px'
                  }}>
                    {newWorks.slice(0, 12).map((item) => (
                      <PortfolioCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* 注目作品 */}
              {featuredWorks.length > 0 && (
                <div style={{ padding: '24px 20px', borderBottom: '1px solid #F5F5F5' }}>
                  <Link href="/portfolio" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    marginBottom: '16px', 
                    color: '#1A1A1A', 
                    textDecoration: 'none' 
                  }}>
                    <span>注目作品</span>
                    <i className="fas fa-chevron-right" style={{ fontSize: '14px', color: '#9B9B9B' }}></i>
                  </Link>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '16px'
                  }}>
                    {featuredWorks.map((item) => (
                      <PortfolioCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* カテゴリ別の新着作品 */}
              {categories.map((cat) => {
                const categoryWorks = newWorks.filter(w => w.category === cat.id).slice(0, 8)
                if (categoryWorks.length === 0) return null
                
                return (
                  <div key={cat.id} style={{ padding: '24px 20px', borderBottom: '1px solid #F5F5F5' }}>
                    <Link 
                      href={`/portfolio?category=${cat.id}`}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        marginBottom: '16px', 
                        color: '#1A1A1A', 
                        textDecoration: 'none' 
                      }}
                    >
                      <span>新着{cat.label}</span>
                      <i className="fas fa-chevron-right" style={{ fontSize: '14px', color: '#9B9B9B' }}></i>
                    </Link>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '16px'
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

          {/* CTAセクション */}
          {!isLoggedIn && newWorks.length > 0 && (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: '#FAFAFA',
              marginTop: '40px'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#1A1A1A' }}>
                クリエイターと繋がろう
              </h2>
              <p style={{ fontSize: '15px', marginBottom: '20px', color: '#6B6B6B' }}>
                作品を投稿してフォロワーを増やそう
              </p>
              <Link href="/login" className="btn-primary" style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', display: 'inline-block', padding: '12px 32px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: '600' }}>
                無料で始める
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}