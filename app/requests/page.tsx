'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

type WorkRequest = {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  category: string
  status: string
  request_type: string
  created_at: string
  requester_id: string
  profiles: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<WorkRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'my'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      fetchRequests()
    }
  }, [filter, categoryFilter, currentProfileId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentProfileId(profile.id)
    }
  }

  async function fetchRequests() {
    setLoading(true)

    let query = supabase
      .from('work_requests')
      .select('*, profiles!work_requests_requester_id_fkey(id, display_name, avatar_url)')
      .eq('request_type', 'public')
      .order('created_at', { ascending: false })

    // フィルター適用
    if (filter === 'my') {
      query = query.eq('requester_id', currentProfileId)
    } else {
      // 公開中の依頼のみ表示
      query = query.eq('status', 'open')
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

  function getCategoryLabel(category: string) {
    const categories: { [key: string]: string } = {
      illustration: 'イラスト',
      manga: 'マンガ',
      novel: '小説',
      music: '音楽',
      voice: 'ボイス',
      video: '動画',
      logo: 'ロゴ',
      design: 'デザイン',
      other: 'その他'
    }
    return categories[category] || category
  }

  function getStatusLabel(status: string) {
    const statuses: { [key: string]: string } = {
      open: '募集中',
      in_progress: '進行中',
      completed: '完了',
      cancelled: 'キャンセル'
    }
    return statuses[status] || status
  }

  function getStatusColor(status: string) {
    const colors: { [key: string]: string } = {
      open: '#4CAF50',
      in_progress: '#2196F3',
      completed: '#607D8B',
      cancelled: '#9E9E9E'
    }
    return colors[status] || '#9E9E9E'
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今日'
    if (days === 1) return '昨日'
    if (days < 7) return `${days}日前`
    
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  }

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          {/* ヘッダー */}
          <div className="flex-between mb-40" style={{ 
            flexWrap: 'wrap', 
            gap: '16px' 
          }}>
            <h1 className="page-title">依頼一覧</h1>
            <Link href="/requests/create" className="btn-primary">
              <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
              新規依頼を作成
            </Link>
          </div>

          {/* フィルター */}
          <div className="filter-box mb-32">
            <div className="mb-24">
              <label className="text-small text-gray mb-8" style={{ display: 'block' }}>
                表示する依頼
              </label>
              <div className="flex gap-12">
                <button
                  onClick={() => setFilter('all')}
                  style={{
                    padding: '8px 20px',
                    border: filter === 'all' ? 'none' : '1px solid #E5E5E5',
                    borderRadius: '20px',
                    backgroundColor: filter === 'all' ? '#1A1A1A' : '#FFFFFF',
                    color: filter === 'all' ? '#FFFFFF' : '#6B6B6B',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  すべての公開依頼
                </button>
                <button
                  onClick={() => setFilter('my')}
                  style={{
                    padding: '8px 20px',
                    border: filter === 'my' ? 'none' : '1px solid #E5E5E5',
                    borderRadius: '20px',
                    backgroundColor: filter === 'my' ? '#1A1A1A' : '#FFFFFF',
                    color: filter === 'my' ? '#FFFFFF' : '#6B6B6B',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  自分の依頼
                </button>
              </div>
            </div>

            <div>
              <label className="text-small text-gray mb-8" style={{ display: 'block' }}>
                カテゴリで絞り込み
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="select-field"
                style={{ width: 'auto', minWidth: '200px' }}
              >
                <option value="all">すべて</option>
                <option value="illustration">イラスト</option>
                <option value="manga">マンガ</option>
                <option value="novel">小説</option>
                <option value="music">音楽</option>
                <option value="voice">ボイス</option>
                <option value="video">動画</option>
                <option value="logo">ロゴ</option>
                <option value="design">デザイン</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>

          {/* ローディング */}
          {loading && (
            <div className="loading-state">
              読み込み中...
            </div>
          )}

          {/* 空の状態 */}
          {!loading && requests.length === 0 && (
            <div className="empty-state">
              <i className="fas fa-inbox" style={{ fontSize: '48px', color: '#E5E5E5', marginBottom: '16px' }}></i>
              <p className="text-gray mb-24">
                {filter === 'my' ? '依頼を作成していません' : '依頼が見つかりませんでした'}
              </p>
              {filter === 'my' && (
                <Link href="/requests/create" className="btn-primary">
                  最初の依頼を作成
                </Link>
              )}
            </div>
          )}

          {/* 依頼一覧 */}
          {!loading && requests.length > 0 && (
            <div className="flex flex-col gap-20">
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className="card p-24"
                  style={{ textDecoration: 'none' }}
                >
                  {/* ステータスとカテゴリ */}
                  <div className="flex gap-8 mb-12" style={{ flexWrap: 'wrap' }}>
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
                    <span className="badge badge-category">
                      {getCategoryLabel(request.category)}
                    </span>
                  </div>

                  {/* タイトル */}
                  <h2 className="card-title mb-8">
                    {request.title}
                  </h2>

                  {/* 説明 */}
                  <p className="text-small text-gray mb-16" style={{ 
                    lineHeight: '1.6',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {request.description}
                  </p>

                  {/* 詳細情報 */}
                  <div className="flex gap-20 text-small text-gray" style={{ 
                    flexWrap: 'wrap',
                    paddingTop: '12px',
                    borderTop: '1px solid #F5F5F5'
                  }}>
                    {(request.budget_min || request.budget_max) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-yen-sign" style={{ fontSize: '12px' }}></i>
                        <span>
                          {request.budget_min?.toLocaleString() || '未設定'}円 〜 {request.budget_max?.toLocaleString() || '未設定'}円
                        </span>
                      </div>
                    )}
                    {request.deadline && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-calendar" style={{ fontSize: '12px' }}></i>
                        <span>
                          {new Date(request.deadline).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-user" style={{ fontSize: '12px' }}></i>
                      <span>
                        {request.profiles?.display_name || '名前未設定'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-clock" style={{ fontSize: '12px' }}></i>
                      <span>
                        {formatDate(request.created_at)}
                      </span>
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