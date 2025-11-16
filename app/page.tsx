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
      <Link
        href={`/portfolio/${item.id}`}
        style={{
          display: 'block',
          border: '1px solid #E5E5E5',
          borderRadius: '8px',
          overflow: 'hidden',
          textDecoration: 'none',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#1A1A1A'
          e.currentTarget.style.boxShadow = '0 0 0 2px #1A1A1A'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#E5E5E5'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div style={{
          width: '100%',
          paddingTop: '100%',
          position: 'relative',
          backgroundColor: '#F9F9F9'
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
        </div>
        <div style={{ padding: '16px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1A1A1A',
            marginBottom: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {item.title}
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#E5E5E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#6B6B6B',
              overflow: 'hidden'
            }}>
              {item.profiles?.avatar_url ? (
                <img
                  src={item.profiles.avatar_url}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                item.profiles?.display_name?.charAt(0) || '?'
              )}
            </div>
            <span style={{ fontSize: '14px', color: '#6B6B6B' }}>
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
          
          <div style={{ 
            display: 'flex', 
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
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
        <section style={{
          padding: '60px 40px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E5E5E5'
        }}>
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
              <div style={{
                fontSize: '16px',
                color: '#6B6B6B'
              }}>
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
              <div style={{
                fontSize: '16px',
                color: '#6B6B6B'
              }}>
                募集中の依頼
              </div>
            </div>
          </div>
        </section>

        {/* 新着作品 */}
        <section style={{
          padding: '80px 40px',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px'
          }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1A1A1A'
            }}>
              新着作品
            </h2>
            <Link
              href="/portfolio"
              style={{
                fontSize: '16px',
                color: '#1A1A1A',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              すべて見る
            </Link>
          </div>

          {newPortfolioItems.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6B6B6B'
            }}>
              まだ作品が投稿されていません
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              {newPortfolioItems.map((item) => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* 人気作品 */}
        <section style={{
          padding: '80px 40px',
          backgroundColor: '#FAFAFA'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px'
          }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1A1A1A'
            }}>
              人気作品
            </h2>
            <Link
              href="/portfolio"
              style={{
                fontSize: '16px',
                color: '#1A1A1A',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              すべて見る
            </Link>
          </div>

          {popularPortfolioItems.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6B6B6B'
            }}>
              まだ作品が投稿されていません
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              {popularPortfolioItems.map((item) => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* 新着依頼 */}
        <section style={{
          padding: '80px 40px',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px'
          }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1A1A1A'
            }}>
              新着依頼
            </h2>
            <Link
              href="/requests"
              style={{
                fontSize: '16px',
                color: '#1A1A1A',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              すべて見る
            </Link>
          </div>

          {requests.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6B6B6B'
            }}>
              現在募集中の依頼はありません
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px'
            }}>
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  style={{
                    display: 'block',
                    padding: '24px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease',
                    height: '100%',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1A1A1A'
                    e.currentTarget.style.boxShadow = '0 0 0 2px #1A1A1A'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E5E5'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {request.category && (
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      border: '1px solid #E5E5E5',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#6B6B6B',
                      marginBottom: '12px'
                    }}>
                      {getCategoryLabel(request.category)}
                    </span>
                  )}
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#1A1A1A',
                    marginBottom: '12px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {request.title}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#6B6B6B',
                    lineHeight: '1.6',
                    marginBottom: '16px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {request.description}
                  </p>
                  {(request.budget_min || request.budget_max) && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#F9F9F9',
                      borderRadius: '4px'
                    }}>
                      <div style={{
                        fontSize: '12px',
                        color: '#6B6B6B',
                        marginBottom: '4px'
                      }}>
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