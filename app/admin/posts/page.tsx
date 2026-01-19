'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Category = {
  id: string
  name: string
  slug: string
}

type Post = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  thumbnail_url: string | null
  status: string
  published_at: string | null
  created_at: string
  updated_at: string
  category_id: string | null
  post_categories: Category | null
}

export default function AdminPostsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    fetchCategories()
    fetchPosts()
  }, [])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('post_categories')
      .select('*')
      .order('sort_order')
    if (data) setCategories(data)
  }

  const fetchPosts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        post_categories (
          id,
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts:', error)
    } else {
      setPosts(data || [])
    }
    setLoading(false)
  }

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`「${title}」を削除しますか？`)) return

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) {
      alert('削除に失敗しました')
    } else {
      fetchPosts()
    }
  }

  const handleToggleStatus = async (post: Post, e: React.MouseEvent) => {
    e.stopPropagation()
    const newStatus = post.status === 'published' ? 'draft' : 'published'
    const updates: Record<string, unknown> = { status: newStatus }
    
    if (newStatus === 'published' && !post.published_at) {
      updates.published_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', post.id)

    if (error) {
      alert('更新に失敗しました')
    } else {
      fetchPosts()
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !filterCategory || post.category_id === filterCategory
    const matchesStatus = !filterStatus || post.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: '#6b7280' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginRight: '12px' }}></i>
        読み込み中...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* ヘッダー */}
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid #e5e7eb', 
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>記事管理</h1>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>{posts.length}件の記事</p>
        </div>
        <Link 
          href="/admin/posts/new" 
          className="admin-action-btn primary" 
          style={{ padding: '10px 20px', fontSize: '0.875rem', textDecoration: 'none' }}
        >
          <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
          新規作成
        </Link>
      </div>

      {/* フィルターバー */}
      <div style={{ 
        padding: '12px 24px',
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '300px' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.875rem' }}></i>
          <input
            type="text"
            placeholder="タイトルで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              background: 'white'
            }}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            background: 'white',
            color: filterCategory ? '#374151' : '#9ca3af'
          }}
        >
          <option value="">すべてのカテゴリー</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            background: 'white',
            color: filterStatus ? '#374151' : '#9ca3af'
          }}
        >
          <option value="">すべてのステータス</option>
          <option value="draft">下書き</option>
          <option value="published">公開中</option>
        </select>
        <div style={{ flex: 1 }} />
        <Link 
          href="/admin/posts/images" 
          style={{ 
            width: '100px',
            padding: '8px 0', 
            fontSize: '0.8125rem', 
            color: '#6b7280',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            background: 'white'
          }}
        >
          <i className="fas fa-images"></i>
          画像
        </Link>
        <Link 
          href="/admin/posts/categories" 
          style={{ 
            width: '100px',
            padding: '8px 0', 
            fontSize: '0.8125rem', 
            color: '#6b7280',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            background: 'white'
          }}
        >
          <i className="fas fa-folder"></i>
          カテゴリー
        </Link>
      </div>

      {/* 記事リスト */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        {filteredPosts.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            color: '#9ca3af'
          }}>
            <i className="fas fa-newspaper" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <p style={{ fontSize: '1rem', marginBottom: '8px' }}>記事がありません</p>
            <Link href="/admin/posts/new" style={{ color: '#4f46e5', textDecoration: 'none', fontSize: '0.875rem' }}>
              <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>
              新規作成する
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredPosts.map(post => (
              <div
                key={post.id}
                onClick={() => router.push(`/admin/posts/${post.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#c7d2fe'
                  e.currentTarget.style.background = '#fafafa'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.background = 'white'
                }}
              >
                {/* サムネイル + ステータス */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    background: '#f3f4f6',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {post.thumbnail_url ? (
                      <img src={post.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <i className="fas fa-image" style={{ color: '#d1d5db', fontSize: '20px' }}></i>
                    )}
                  </div>
                  {/* ステータスバッジ */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.625rem',
                    fontWeight: '600',
                    background: post.status === 'published' ? '#22c55e' : '#6b7280',
                    color: 'white',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    {post.status === 'published' ? '公開' : '下書'}
                  </div>
                </div>

                {/* 情報 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ 
                      fontSize: '0.9375rem', 
                      fontWeight: '500', 
                      color: '#111827',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block'
                    }}>
                      {post.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: '#6b7280' }}>
                    <span style={{ fontFamily: 'monospace' }}>/{post.slug}</span>
                    {post.post_categories && (
                      <>
                        <span>•</span>
                        <span>{post.post_categories.name}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{formatDate(post.published_at || post.created_at)}</span>
                  </div>
                </div>

                {/* アクション */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleToggleStatus(post, e)}
                    style={{
                      width: '72px',
                      padding: '6px 0',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      background: 'white',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}
                  >
                    {post.status === 'published' ? '非公開' : '公開'}
                  </button>
                  <button
                    onClick={(e) => handleDelete(post.id, post.title, e)}
                    style={{
                      width: '36px',
                      padding: '6px 0',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      background: '#fef2f2',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}