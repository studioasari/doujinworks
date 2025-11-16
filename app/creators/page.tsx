'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase' 
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import Footer from '../components/Footer'

type Creator = {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  role: string
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'creator' | 'both'>('all')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchCreators()
  }, [roleFilter])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  async function fetchCreators() {
    setLoading(true)
    
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('is_creator', true)
      .order('created_at', { ascending: false })

    if (roleFilter === 'creator') {
      query = query.eq('role', 'creator')
    } else if (roleFilter === 'both') {
      query = query.eq('role', 'both')
    }

    const { data, error } = await query

    if (error) {
      console.error('クリエイター取得エラー:', error)
    } else {
      setCreators(data || [])
    }
    
    setLoading(false)
  }

  const filteredCreators = creators.filter(creator => {
    if (!searchQuery) return true
    const displayName = creator.display_name || ''
    const bio = creator.bio || ''
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           bio.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          {/* タイトル */}
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#1A1A1A',
            marginBottom: '40px'
          }}>
            クリエイター一覧
          </h1>

          {/* 検索・フィルターエリア */}
          <div style={{
            marginBottom: '40px',
            padding: '24px',
            border: '1px solid #E5E5E5',
            borderRadius: '8px'
          }}>
            {/* 検索ボックス */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: '#6B6B6B',
                marginBottom: '8px'
              }}>
                キーワード検索
              </label>
              <input
                type="text"
                placeholder="クリエイター名や自己紹介で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '4px',
                  fontSize: '16px',
                  color: '#1A1A1A'
                }}
              />
            </div>

            {/* 役割フィルター */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: '#6B6B6B',
                marginBottom: '8px'
              }}>
                役割で絞り込み
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setRoleFilter('all')}
                  style={{
                    padding: '8px 20px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '4px',
                    backgroundColor: roleFilter === 'all' ? '#1A1A1A' : '#FFFFFF',
                    color: roleFilter === 'all' ? '#FFFFFF' : '#1A1A1A',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  すべて
                </button>
                <button
                  onClick={() => setRoleFilter('creator')}
                  style={{
                    padding: '8px 20px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '4px',
                    backgroundColor: roleFilter === 'creator' ? '#1A1A1A' : '#FFFFFF',
                    color: roleFilter === 'creator' ? '#FFFFFF' : '#1A1A1A',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  クリエイターのみ
                </button>
                <button
                  onClick={() => setRoleFilter('both')}
                  style={{
                    padding: '8px 20px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '4px',
                    backgroundColor: roleFilter === 'both' ? '#1A1A1A' : '#FFFFFF',
                    color: roleFilter === 'both' ? '#FFFFFF' : '#1A1A1A',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  両方
                </button>
              </div>
            </div>
          </div>

          {/* 検索結果件数 */}
          <p style={{
            fontSize: '14px',
            color: '#6B6B6B',
            marginBottom: '24px'
          }}>
            {filteredCreators.length}件のクリエイター
          </p>

          {/* ローディング */}
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6B6B6B'
            }}>
              読み込み中...
            </div>
          )}

          {/* クリエイターカード一覧 */}
          {!loading && filteredCreators.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6B6B6B'
            }}>
              クリエイターが見つかりませんでした
            </div>
          )}

          {!loading && filteredCreators.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {filteredCreators.map((creator) => (
                <Link
                  key={creator.id}
                  href={`/creators/${creator.id}`}
                  style={{
                    display: 'block',
                    border: '1px solid #E5E5E5',
                    borderRadius: '8px',
                    padding: '24px',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1A1A1A'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E5E5'
                  }}
                >
                  {/* アバター */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E5E5',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    color: '#6B6B6B'
                  }}>
                    {creator.avatar_url ? (
                      <img
                        src={creator.avatar_url}
                        alt={creator.display_name || ''}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      creator.display_name?.charAt(0) || '?'
                    )}
                  </div>

                  {/* 表示名 */}
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#1A1A1A',
                    marginBottom: '8px'
                  }}>
                    {creator.display_name || '名前未設定'}
                  </h2>

                  {/* 役割バッジ */}
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#6B6B6B',
                    marginBottom: '12px'
                  }}>
                    {creator.role === 'creator' && 'クリエイター'}
                    {creator.role === 'client' && 'クライアント'}
                    {creator.role === 'both' && 'クリエイター・クライアント'}
                  </div>

                  {/* 自己紹介 */}
                  <p style={{
                    fontSize: '14px',
                    color: '#6B6B6B',
                    lineHeight: '1.6',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {creator.bio || '自己紹介が登録されていません'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}