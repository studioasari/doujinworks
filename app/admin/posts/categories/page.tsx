'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  post_count?: number
}

export default function AdminCategoriesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', slug: '', description: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', slug: '', description: '' })
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const fetchCategories = async () => {
    setLoading(true)
    
    // カテゴリーと記事数を取得
    const { data: cats, error } = await supabase
      .from('post_categories')
      .select('*')
      .order('sort_order')

    if (error) {
      console.error('Error fetching categories:', error)
      setLoading(false)
      return
    }

    // 各カテゴリーの記事数を取得
    const { data: posts } = await supabase
      .from('posts')
      .select('category_id')

    const countMap: Record<string, number> = {}
    posts?.forEach(p => {
      if (p.category_id) {
        countMap[p.category_id] = (countMap[p.category_id] || 0) + 1
      }
    })

    const categoriesWithCount = (cats || []).map(c => ({
      ...c,
      post_count: countMap[c.id] || 0
    }))

    setCategories(categoriesWithCount)
    setLoading(false)
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const startEdit = (category: Category) => {
    setEditingId(category.id)
    setEditForm({
      name: category.name,
      slug: category.slug,
      description: category.description || ''
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ name: '', slug: '', description: '' })
  }

  const saveEdit = async () => {
    if (!editingId || !editForm.name || !editForm.slug) return

    const { error } = await supabase
      .from('post_categories')
      .update({
        name: editForm.name,
        slug: editForm.slug,
        description: editForm.description || null
      })
      .eq('id', editingId)

    if (error) {
      alert('更新に失敗しました')
      return
    }

    setEditingId(null)
    fetchCategories()
  }

  const startAdd = () => {
    setIsAdding(true)
    setNewForm({ name: '', slug: '', description: '' })
  }

  const cancelAdd = () => {
    setIsAdding(false)
    setNewForm({ name: '', slug: '', description: '' })
  }

  const saveNew = async () => {
    if (!newForm.name || !newForm.slug) {
      alert('名前とスラッグは必須です')
      return
    }

    const maxOrder = categories.length > 0 
      ? Math.max(...categories.map(c => c.sort_order)) + 1 
      : 0

    const { error } = await supabase
      .from('post_categories')
      .insert({
        name: newForm.name,
        slug: newForm.slug,
        description: newForm.description || null,
        sort_order: maxOrder
      })

    if (error) {
      alert('作成に失敗しました')
      return
    }

    setIsAdding(false)
    setNewForm({ name: '', slug: '', description: '' })
    fetchCategories()
  }

  const handleDelete = async (id: string, name: string, postCount: number) => {
    if (postCount > 0) {
      alert(`「${name}」には${postCount}件の記事があります。\n先に記事のカテゴリーを変更してください。`)
      return
    }
    if (!confirm(`「${name}」を削除しますか？`)) return

    const { error } = await supabase
      .from('post_categories')
      .delete()
      .eq('id', id)

    if (error) {
      alert('削除に失敗しました')
    } else {
      fetchCategories()
    }
  }

  // ドラッグ&ドロップ
  const handleDragStart = (id: string) => {
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (id !== draggedId) {
      setDragOverId(id)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    const draggedIndex = categories.findIndex(c => c.id === draggedId)
    const targetIndex = categories.findIndex(c => c.id === targetId)

    const newCategories = [...categories]
    const [removed] = newCategories.splice(draggedIndex, 1)
    newCategories.splice(targetIndex, 0, removed)

    // sort_orderを更新
    const updates = newCategories.map((c, i) => ({
      id: c.id,
      sort_order: i
    }))

    setCategories(newCategories)
    setDraggedId(null)
    setDragOverId(null)

    // DBを更新
    for (const u of updates) {
      await supabase
        .from('post_categories')
        .update({ sort_order: u.sort_order })
        .eq('id', u.id)
    }
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin/posts" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-arrow-left"></i>
            <span>記事一覧</span>
          </Link>
          <div style={{ width: '1px', height: '16px', background: '#e5e7eb' }} />
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>カテゴリー管理</h1>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>ドラッグで並び替え</p>
          </div>
        </div>
        <button
          onClick={startAdd}
          disabled={isAdding}
          className="admin-action-btn primary"
          style={{ width: '100px', padding: '8px 0', fontSize: '0.8125rem' }}
        >
          <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>
          追加
        </button>
      </div>

      {/* リスト */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          {/* 新規追加フォーム */}
          {isAdding && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={newForm.name}
                  onChange={(e) => setNewForm(prev => ({ 
                    ...prev, 
                    name: e.target.value,
                    slug: prev.slug || generateSlug(e.target.value)
                  }))}
                  placeholder="カテゴリー名"
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.9375rem'
                  }}
                />
                <input
                  type="text"
                  value={newForm.slug}
                  onChange={(e) => setNewForm(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="slug"
                  style={{
                    width: '140px',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.9375rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              <input
                type="text"
                value={newForm.description}
                onChange={(e) => setNewForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="説明（任意）"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  marginBottom: '12px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={cancelAdd} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '0.8125rem' }}>
                  キャンセル
                </button>
                <button onClick={saveNew} className="admin-action-btn primary" style={{ padding: '8px 16px', fontSize: '0.8125rem' }}>
                  作成
                </button>
              </div>
            </div>
          )}

          {/* カテゴリーリスト */}
          {categories.length === 0 && !isAdding ? (
            <div style={{ 
              textAlign: 'center',
              padding: '60px 20px',
              color: '#9ca3af'
            }}>
              <i className="fas fa-folder-open" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
              <p style={{ fontSize: '1rem', marginBottom: '8px' }}>カテゴリーがありません</p>
              <button 
                onClick={startAdd}
                style={{ color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>
                最初のカテゴリーを作成
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categories.map((category, index) => {
                const isEditing = editingId === category.id
                const isDragging = draggedId === category.id
                const isDragOver = dragOverId === category.id

                return (
                  <div
                    key={category.id}
                    draggable={!isEditing}
                    onDragStart={() => handleDragStart(category.id)}
                    onDragOver={(e) => handleDragOver(e, category.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(category.id)}
                    onDragEnd={handleDragEnd}
                    style={{
                      background: isDragOver ? '#eef2ff' : 'white',
                      border: isDragOver ? '2px dashed #4f46e5' : '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: isEditing ? '16px' : '12px 16px',
                      opacity: isDragging ? 0.5 : 1,
                      cursor: isEditing ? 'default' : 'grab',
                      transition: 'all 0.15s'
                    }}
                  >
                    {isEditing ? (
                      // 編集モード
                      <div>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                          <input
                            ref={inputRef}
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="カテゴリー名"
                            style={{
                              flex: 1,
                              padding: '10px 14px',
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '0.9375rem'
                            }}
                          />
                          <input
                            type="text"
                            value={editForm.slug}
                            onChange={(e) => setEditForm(prev => ({ ...prev, slug: e.target.value }))}
                            placeholder="slug"
                            style={{
                              width: '140px',
                              padding: '10px 14px',
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '0.9375rem',
                              fontFamily: 'monospace'
                            }}
                          />
                        </div>
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="説明（任意）"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            marginBottom: '12px'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={cancelEdit} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '0.8125rem' }}>
                            キャンセル
                          </button>
                          <button onClick={saveEdit} className="admin-action-btn primary" style={{ padding: '8px 16px', fontSize: '0.8125rem' }}>
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 表示モード
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* ドラッグハンドル */}
                        <div style={{ color: '#d1d5db', cursor: 'grab' }}>
                          <i className="fas fa-grip-vertical"></i>
                        </div>
                        
                        {/* 順番 */}
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#6b7280'
                        }}>
                          {index + 1}
                        </div>

                        {/* 情報 */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '500', color: '#111827' }}>{category.name}</span>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>/{category.slug}</span>
                          </div>
                          {category.description && (
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '2px 0 0 0' }}>{category.description}</p>
                          )}
                        </div>

                        {/* 記事数 */}
                        <div style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          background: category.post_count ? '#dbeafe' : '#f3f4f6',
                          color: category.post_count ? '#1d4ed8' : '#9ca3af',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {category.post_count || 0}件
                        </div>

                        {/* アクション */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => startEdit(category)}
                            style={{
                              width: '32px',
                              height: '32px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              background: 'white',
                              color: '#6b7280',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <i className="fas fa-edit" style={{ fontSize: '0.75rem' }}></i>
                          </button>
                          <button
                            onClick={() => handleDelete(category.id, category.name, category.post_count || 0)}
                            style={{
                              width: '32px',
                              height: '32px',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              background: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <i className="fas fa-trash" style={{ fontSize: '0.75rem' }}></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}