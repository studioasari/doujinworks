'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import Header from './components/Header'
import Footer from './components/Footer'
import Link from 'next/link'

type PortfolioItem = {
  id: string
  title: string
  image_url: string
  thumbnail_url: string | null
  creator_id: string
  view_count: number
  profiles: {
    display_name: string | null
    avatar_url: string | null
  }
}

type Request = {
  id: string
  title: string
  description: string
  category: string | null
  budget_min: number | null
  budget_max: number | null
  created_at: string
  profiles: {
    display_name: string | null
  }
}

export default function Home() {
  const [newPortfolioItems, setNewPortfolioItems] = useState<PortfolioItem[]>([])
  const [popularPortfolioItems, setPopularPortfolioItems] = useState<PortfolioItem[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [stats, setStats] = useState({ creators: 0, requests: 0 })
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    setIsLoggedIn(!!user)
  }

  async function fetchData() {
    // 新着ポートフォリオ作品を取得（最新12件）
    const { data: newPortfolioData } = await supabase
      .from('portfolio_items')
      .select('id, title, image_url, thumbnail_url, creator_id, view_count, profiles!portfolio_items_creator_id_fkey(display_name, avatar_url)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(12)

    if (newPortfolioData) {
      setNewPortfolioItems(newPortfolioData as any)
    }

    // 今日の人気作品を取得（閲覧数順、最新8件）
    const { data: popularPortfolioData } = await supabase
      .from('portfolio_items')
      .select('id, title, image_url, thumbnail_url, creator_id, view_count, profiles!portfolio_items_creator_id_fkey(display_name, avatar_url)')
      .eq('is_public', true)
      .order('view_count', { ascending: false })
      .limit(8)

    if (popularPortfolioData) {
      setPopularPortfolioItems(popularPortfolioData as any)
    }

    // 新着依頼を取得（最新6件）
    const { data: requestsData } = await supabase
      .from('requests')
      .select('id, title, description, category, budget_min, budget_max, created_at, profiles!requests_client_id_fkey(display_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(6)

    if (requestsData) {
      setRequests(requestsData as any)
    }

    // 統計情報を取得
    const { count: creatorsCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_creator', true)

    const { count: requestsCount } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')

    setStats({
      creators: creatorsCount || 0,
      requests: requestsCount || 0
    })
  }

  function getCategoryLabel(category: string | null) {
    const categories: { [key: string]: string } = {
      illustration: 'イラスト',
      manga: '漫画',
      novel: '小説',
      music: '音楽',
      voice: 'ボイス',
      video: '動画',
      game: 'ゲーム',
      other: 'その他'
    }
    return category ? categories[category] || category : '未設定'
  }

  function PortfolioCard({ item }: { item: PortfolioItem }) {
    return (
      <Link href={`/portfolio/${item.id}`} className="portfolio-card">
        <div className="portfolio-card-image">
          <img
            src={item.thumbnail_url || item.image_url}
            alt={item.title}
          />
        </div>
        <div className="portfolio-card-content">
          <h3 className="card-subtitle text-ellipsis mb-8">
            {item.title}
          </h3>
          <div className="flex gap-8" style={{ alignItems: 'center' }}>
            <div className="avatar avatar-small">
              {item.profiles?.avatar_url ? (
                <img src={item.profiles.avatar_url} alt="" />
              ) : (
                item.profiles?.display_name?.charAt(0) || '?'
              )}
            </div>
            <span className="text-small text-gray">
              {item.profiles?.display_name || '名前未設定'}
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
      backgroundColor: '#FFFFFF'
    }}>
      <Header />
      
      <main>
        {/* ヒーローセクション */}
        <section style={{
          padding: '100px 40px',
          textAlign: 'center',
          backgroundColor: '#FAFAFA',
          borderBottom: '1px solid #E5E5E5'
        }}>
          <h1 style={{ 
            fontSize: '56px', 
            fontWeight: '700',
            color: '#1A1A1A',
            letterSpacing: '-1.5px',
            lineHeight: '1.2',
            marginBottom: '24px'
          }}>
            同人ワークス
          </h1>
          
          <p style={{ 
            fontSize: '20px', 
            color: '#6B6B6B',
            lineHeight: '1.8',
            marginBottom: '40px'
          }}>
            クリエイターと依頼者を繋ぐ<br />
            マッチングプラットフォーム
          </p>
          
          <div className="flex gap-16" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/portfolio"
              style={{
                padding: '14px 32px',
                fontSize: '16px',
                backgroundColor: '#1A1A1A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '24px',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'inline-block'
              }}
            >
              ポートフォリオを見る
            </Link>
            
            <Link
              href="/requests"
              style={{
                padding: '14px 32px',
                fontSize: '16px',
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
                border: '2px solid #E5E5E5',
                borderRadius: '24px',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'inline-block'
              }}
            >
              依頼を探す
            </Link>
          </div>
        </section>

        {/* 統計情報 */}
        <section className="section section-white" style={{ borderBottom: '1px solid #E5E5E5' }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '40px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#1A1A1A',
                marginBottom: '8px'
              }}>
                {stats.creators}
              </div>
              <div className="text-gray" style={{ fontSize: '16px' }}>
                登録クリエイター
              </div>
            </div>
            
            <div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#1A1A1A',
                marginBottom: '8px'
              }}>
                {stats.requests}
              </div>
              <div className="text-gray" style={{ fontSize: '16px' }}>
                募集中の依頼
              </div>
            </div>
          </div>
        </section>

        {/* 新着作品 */}
        <section className="section section-white">
          <div className="flex-between mb-40">
            <h2 className="page-title">新着作品</h2>
            <Link href="/portfolio" style={{
              fontSize: '16px',
              color: '#1A1A1A',
              textDecoration: 'none',
              fontWeight: '600'
            }}>
              すべて見る
            </Link>
          </div>

          {newPortfolioItems.length === 0 ? (
            <div className="empty-state">
              まだ作品が投稿されていません
            </div>
          ) : (
            <div className="grid-portfolio">
              {newPortfolioItems.map((item) => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* 人気作品 */}
        <section className="section section-gray">
          <div className="flex-between mb-40">
            <h2 className="page-title">人気作品</h2>
            <Link href="/portfolio" style={{
              fontSize: '16px',
              color: '#1A1A1A',
              textDecoration: 'none',
              fontWeight: '600'
            }}>
              すべて見る
            </Link>
          </div>

          {popularPortfolioItems.length === 0 ? (
            <div className="empty-state">
              まだ作品が投稿されていません
            </div>
          ) : (
            <div className="grid-portfolio">
              {popularPortfolioItems.map((item) => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* 新着依頼 */}
        <section className="section section-white">
          <div className="flex-between mb-40">
            <h2 className="page-title">新着依頼</h2>
            <Link href="/requests" style={{
              fontSize: '16px',
              color: '#1A1A1A',
              textDecoration: 'none',
              fontWeight: '600'
            }}>
              すべて見る
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="empty-state">
              現在募集中の依頼はありません
            </div>
          ) : (
            <div className="grid-requests">
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className="card"
                  style={{ padding: '24px', height: '100%' }}
                >
                  {request.category && (
                    <span className="badge badge-category mb-12" style={{ display: 'inline-block' }}>
                      {getCategoryLabel(request.category)}
                    </span>
                  )}
                  <h3 className="card-title text-ellipsis mb-12">
                    {request.title}
                  </h3>
                  <p className="text-small text-gray text-clamp-2 mb-16" style={{ lineHeight: '1.6' }}>
                    {request.description}
                  </p>
                  {(request.budget_min || request.budget_max) && (
                    <div className="info-box">
                      <div className="text-tiny text-gray mb-8" style={{ marginBottom: '4px' }}>
                        予算
                      </div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#1A1A1A'
                      }}>
                        {request.budget_min?.toLocaleString() || '未設定'}円 〜
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* CTAセクション - ログインしていない場合のみ表示 */}
        {!isLoggedIn && (
          <section style={{
            padding: '100px 40px',
            textAlign: 'center',
            backgroundColor: '#1A1A1A',
            color: '#FFFFFF'
          }}>
            <h2 style={{
              fontSize: '40px',
              fontWeight: 'bold',
              marginBottom: '24px'
            }}>
              今すぐ始めよう
            </h2>
            <p style={{
              fontSize: '18px',
              marginBottom: '40px',
              color: '#E5E5E5'
            }}>
              クリエイターとして登録、または依頼を投稿
            </p>
            <Link
              href="/login"
              style={{
                padding: '16px 40px',
                fontSize: '18px',
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
                border: 'none',
                borderRadius: '24px',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'inline-block'
              }}
            >
              無料で始める
            </Link>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}