'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

type Request = {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  category: string | null
  status: string
  created_at: string
  client_id: string
  profiles: {
    display_name: string | null
    avatar_url: string | null
  }
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'my'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      fetchRequests()
    }
  }, [filter, categoryFilter, currentUserId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      // profilesテーブルから profile.id を取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        setCurrentUserId(profile.id)
      }
    }
  }

  async function fetchRequests() {
    setLoading(true)

    let query = supabase
      .from('requests')
      .select('*, profiles!requests_client_id_fkey(display_name, avatar_url)')
      .order('created_at', { ascending: false })

    // フィルター適用
    if (filter === 'my') {
      query = query.eq('client_id', currentUserId)
    } else {
      // 公開中の依頼のみ表示（自分の依頼は全て表示）
      query = query.or(`status.eq.open,client_id.eq.${currentUserId}`)
    }

    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('依頼取得エラー:', error)
    } else {
      setRequests(data || [])
    }

    setLoading(false)
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

  function getStatusLabel(status: string) {
    const statuses: { [key: string]: string } = {
      open: '募集中',
      pending: '交渉中',
      accepted: '受付済み',
      rejected: '辞退',
      in_progress: '進行中',
      completed: '完了',
      cancelled: 'キャンセル'
    }
    return statuses[status] || status
  }

  function getStatusColor(status: string) {
    const colors: { [key: string]: string } = {
      open: '#4CAF50',
      pending: '#FF9800',
      accepted: '#2196F3',
      rejected: '#F44336',
      in_progress: '#9C27B0',
      completed: '#607D8B',
      cancelled: '#9E9E9E'
    }
    return colors[status] || '#9E9E9E'
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          {/* ヘッダー */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px'
          }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1A1A1A'
            }}>
              依頼一覧
            </h1>
            <Link
              href="/requests/create"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#1A1A1A',
                color: '#FFFFFF',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              + 新規依頼を作成
            </Link>
          </div>

          {/* フィルター */}
          <div style={{
            marginBottom: '32px',
            padding: '24px',
            border: '1px solid #E5E5E5',
            borderRadius: '8px'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: '#6B6B6B',
                marginBottom: '8px'
              }}>
                表示する依頼
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setFilter('all')}
                  style={{
                    padding: '8px 20px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '4px',
                    backgroundColor: filter === 'all' ? '#1A1A1A' : '#FFFFFF',
                    color: filter === 'all' ? '#FFFFFF' : '#1A1A1A',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  すべて
                </button>
                <button
                  onClick={() => setFilter('my')}
                  style={{
                    padding: '8px 20px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '4px',
                    backgroundColor: filter === 'my' ? '#1A1A1A' : '#FFFFFF',
                    color: filter === 'my' ? '#FFFFFF' : '#1A1A1A',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  自分の依頼
                </button>
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: '#6B6B6B',
                marginBottom: '8px'
              }}>
                カテゴリで絞り込み
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  color: '#1A1A1A'
                }}
              >
                <option value="all">すべて</option>
                <option value="illustration">イラスト</option>
                <option value="manga">漫画</option>
                <option value="novel">小説</option>
                <option value="music">音楽</option>
                <option value="voice">ボイス</option>
                <option value="video">動画</option>
                <option value="game">ゲーム</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>

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

          {/* 依頼一覧 */}
          {!loading && requests.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6B6B6B'
            }}>
              依頼が見つかりませんでした
            </div>
          )}

          {!loading && requests.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
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
                  {/* ステータスとカテゴリ */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: getStatusColor(request.status),
                      color: '#FFFFFF'
                    }}>
                      {getStatusLabel(request.status)}
                    </span>
                    {request.category && (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        border: '1px solid #E5E5E5',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#6B6B6B'
                      }}>
                        {getCategoryLabel(request.category)}
                      </span>
                    )}
                  </div>

                  {/* タイトル */}
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#1A1A1A',
                    marginBottom: '8px'
                  }}>
                    {request.title}
                  </h2>

                  {/* 説明 */}
                  <p style={{
                    fontSize: '14px',
                    color: '#6B6B6B',
                    lineHeight: '1.6',
                    marginBottom: '16px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {request.description}
                  </p>

                  {/* 詳細情報 */}
                  <div style={{
                    display: 'flex',
                    gap: '24px',
                    fontSize: '14px',
                    color: '#6B6B6B'
                  }}>
                    {(request.budget_min || request.budget_max) && (
                      <div>
                        <strong>予算:</strong> {request.budget_min?.toLocaleString() || '未設定'}円 〜 {request.budget_max?.toLocaleString() || '未設定'}円
                      </div>
                    )}
                    {request.deadline && (
                      <div>
                        <strong>納期:</strong> {formatDate(request.deadline)}
                      </div>
                    )}
                    <div>
                      <strong>依頼者:</strong> {request.profiles?.display_name || '名前未設定'}
                    </div>
                  </div>
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