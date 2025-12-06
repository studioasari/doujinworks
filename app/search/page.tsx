'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/utils/supabase'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

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
  workCount: number
}

// SearchParamsを読み取るコンポーネント
function SearchParamsReader({ onQueryChange }: { onQueryChange: (query: string) => void }) {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const query = searchParams.get('q') || ''
    onQueryChange(query)
  }, [searchParams, onQueryChange])

  return null
}

function SearchPageContent() {
  const [query, setQuery] = useState('')
  const [works, setWorks] = useState<PortfolioItem[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'works' | 'creators'>('works')

  useEffect(() => {
    if (query) {
      searchContent()
    }
  }, [query])

  const searchContent = async () => {
    setLoading(true)

    try {
      // 作品検索
      const { data: worksData, error: worksError } = await supabase
        .from('portfolio_items')
        .select('id, title, description, image_url, thumbnail_url, creator_id, category, created_at')
        .eq('is_public', true)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (worksError) {
        console.error('作品検索エラー:', worksError)
      }

      if (worksData && worksData.length > 0) {
        // クリエイター情報を一括取得
        const creatorIds = [...new Set(worksData.map(w => w.creator_id))]
        const { data: creatorsData } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', creatorIds)

        const creatorMap = new Map()
        creatorsData?.forEach(c => creatorMap.set(c.user_id, c))

        // いいね数とコメント数を取得
        const ids = worksData.map(w => w.id)
        const [{ data: likes }, { data: comments }] = await Promise.all([
          supabase.from('portfolio_likes').select('portfolio_item_id').in('portfolio_item_id', ids),
          supabase.from('comments').select('portfolio_item_id').in('portfolio_item_id', ids)
        ])

        const likeMap = new Map()
        likes?.forEach(l => likeMap.set(l.portfolio_item_id, (likeMap.get(l.portfolio_item_id) || 0) + 1))
        
        const commentMap = new Map()
        comments?.forEach(c => commentMap.set(c.portfolio_item_id, (commentMap.get(c.portfolio_item_id) || 0) + 1))

        const worksWithStats = worksData.map((work: any) => ({
          ...work,
          profiles: creatorMap.get(work.creator_id),
          likeCount: likeMap.get(work.id) || 0,
          commentCount: commentMap.get(work.id) || 0
        }))
        
        setWorks(worksWithStats)
      } else {
        setWorks([])
      }

      // クリエイター検索
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, bio')
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%`)
        .limit(20)

      if (creatorsError) {
        console.error('クリエイター検索エラー:', creatorsError)
      }

      if (creatorsData && creatorsData.length > 0) {
        // 各クリエイターの作品数を取得
        const creatorsWithCount = await Promise.all(
          creatorsData.map(async (creator) => {
            const { count } = await supabase
              .from('portfolio_items')
              .select('*', { count: 'exact', head: true })
              .eq('creator_id', creator.user_id)
              .eq('is_public', true)

            return {
              ...creator,
              workCount: count || 0
            }
          })
        )
        
        setCreators(creatorsWithCount)
      } else {
        setCreators([])
      }
    } catch (error) {
      console.error('検索エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const PortfolioCard = ({ item }: { item: PortfolioItem }) => (
    <Link
      href={`/portfolio/${item.id}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit'
      }}
    >
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
      }}>
        <div style={{
          width: '100%',
          paddingBottom: '100%',
          position: 'relative',
          backgroundColor: '#F5F5F5',
          overflow: 'hidden'
        }}>
          {item.thumbnail_url && (
            <Image
              src={item.thumbnail_url}
              alt={item.title}
              fill
              style={{ objectFit: 'cover' }}
            />
          )}
        </div>
        
        <div style={{ padding: '12px' }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#1A1A1A',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {item.title}
          </h3>
          
          {item.profiles && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#E5E5E5',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {item.profiles.avatar_url ? (
                  <Image src={item.profiles.avatar_url} alt="" width={20} height={20} style={{ objectFit: 'cover' }} />
                ) : (
                  <i className="fas fa-user" style={{ fontSize: '10px', color: '#9B9B9B' }}></i>
                )}
              </div>
              <span style={{
                fontSize: '12px',
                color: '#6B6B6B',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {item.profiles.display_name}
              </span>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '12px',
            fontSize: '12px',
            color: '#9B9B9B'
          }}>
            <span>
              <i className="far fa-heart" style={{ marginRight: '4px' }}></i>
              {item.likeCount}
            </span>
            <span>
              <i className="far fa-comment" style={{ marginRight: '4px' }}></i>
              {item.commentCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )

  const CreatorCard = ({ creator }: { creator: Creator }) => (
    <Link
      href={`/creators/${creator.username}`}
      style={{
        display: 'block',
        padding: '16px',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        textDecoration: 'none',
        color: 'inherit',
        border: '1px solid #E5E5E5',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#1A1A1A'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E5E5E5'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#E5E5E5',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {creator.avatar_url ? (
            <Image src={creator.avatar_url} alt="" width={60} height={60} style={{ objectFit: 'cover' }} />
          ) : (
            <i className="fas fa-user" style={{ fontSize: '24px', color: '#9B9B9B' }}></i>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1A1A1A',
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {creator.display_name}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#6B6B6B',
            marginBottom: '8px'
          }}>
            {creator.workCount} 作品
          </div>
          {creator.bio && (
            <div style={{
              fontSize: '13px',
              color: '#6B6B6B',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {creator.bio}
            </div>
          )}
        </div>
      </div>
    </Link>
  )

  return (
    <>
      <Header />
      
      {/* SearchParamsを読み取るコンポーネント */}
      <Suspense fallback={null}>
        <SearchParamsReader onQueryChange={setQuery} />
      </Suspense>
      
      <div style={{ minHeight: 'calc(100vh - 64px)', backgroundColor: '#FAFAFA' }}>
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* 検索ヘッダー */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1A1A1A', marginBottom: '8px' }}>
            「{query}」の検索結果
          </h1>
          <div style={{ fontSize: '14px', color: '#6B6B6B' }}>
            作品 {works.length}件 · クリエイター {creators.length}件
          </div>
        </div>

        {/* タブ */}
        <div style={{
          display: 'flex',
          gap: '24px',
          borderBottom: '1px solid #E5E5E5',
          marginBottom: '32px'
        }}>
          <button
            onClick={() => setActiveTab('works')}
            style={{
              padding: '12px 0',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === 'works' ? '#1A1A1A' : 'transparent'}`,
              color: activeTab === 'works' ? '#1A1A1A' : '#6B6B6B',
              fontWeight: activeTab === 'works' ? '600' : '400',
              fontSize: '15px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            作品 ({works.length})
          </button>
          <button
            onClick={() => setActiveTab('creators')}
            style={{
              padding: '12px 0',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === 'creators' ? '#1A1A1A' : 'transparent'}`,
              color: activeTab === 'creators' ? '#1A1A1A' : '#6B6B6B',
              fontWeight: activeTab === 'creators' ? '600' : '400',
              fontSize: '15px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            クリエイター ({creators.length})
          </button>
        </div>

        {/* ローディング */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '16px', color: '#6B6B6B' }}>検索中...</div>
          </div>
        )}

        {/* 検索結果なし */}
        {!loading && activeTab === 'works' && works.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1A1A1A', marginBottom: '8px' }}>
              作品が見つかりませんでした
            </h2>
            <p style={{ fontSize: '14px', color: '#6B6B6B' }}>
              別のキーワードで検索してみてください
            </p>
          </div>
        )}

        {!loading && activeTab === 'creators' && creators.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1A1A1A', marginBottom: '8px' }}>
              クリエイターが見つかりませんでした
            </h2>
            <p style={{ fontSize: '14px', color: '#6B6B6B' }}>
              別のキーワードで検索してみてください
            </p>
          </div>
        )}

        {/* 作品検索結果 */}
        {!loading && activeTab === 'works' && works.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            {works.map((item) => (
              <PortfolioCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* クリエイター検索結果 */}
        {!loading && activeTab === 'creators' && creators.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {creators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        )}
      </main>
    </div>
    <Footer />
  </>
  )
}

// デフォルトエクスポート
export default function SearchPage() {
  return <SearchPageContent />
}