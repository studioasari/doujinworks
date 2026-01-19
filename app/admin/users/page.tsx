'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../utils/supabase/client'

type Profile = {
  id: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  account_type: string
  is_admin: boolean
  is_locked: boolean
  locked_at: string | null
  lock_until: string | null
  is_banned: boolean
  ban_reason: string | null
  banned_at: string | null
  created_at: string
}

const PER_PAGE = 20

export default function AdminUsers() {
  const supabase = createClient()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'locked' | 'banned'>('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  // モーダル用
  const [modalUser, setModalUser] = useState<Profile | null>(null)
  const [modalAction, setModalAction] = useState<'lock' | 'unlock' | 'ban' | 'unban' | null>(null)
  const [banReason, setBanReason] = useState('')
  const [lockDays, setLockDays] = useState(7)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [search, filter, page])

  async function loadUsers() {
    setLoading(true)
    
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // 検索
    if (search) {
      query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
    }

    // フィルター
    if (filter === 'active') {
      query = query.eq('is_locked', false).eq('is_banned', false)
    } else if (filter === 'locked') {
      query = query.eq('is_locked', true)
    } else if (filter === 'banned') {
      query = query.eq('is_banned', true)
    }

    // ページネーション
    const from = (page - 1) * PER_PAGE
    const to = from + PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Error loading users:', error)
    } else {
      setUsers(data || [])
      setTotalCount(count || 0)
    }
    
    setLoading(false)
  }

  function openModal(user: Profile, action: 'lock' | 'unlock' | 'ban' | 'unban') {
    setModalUser(user)
    setModalAction(action)
    setBanReason('')
  }

  function closeModal() {
    setModalUser(null)
    setModalAction(null)
    setBanReason('')
    setLockDays(7)
  }

  async function executeAction() {
    if (!modalUser || !modalAction) return
    
    setActionLoading(true)

    let updateData: Partial<Profile> = {}

    switch (modalAction) {
      case 'lock':
        const lockUntil = new Date()
        lockUntil.setDate(lockUntil.getDate() + lockDays)
        updateData = { 
          is_locked: true,
          locked_at: new Date().toISOString(),
          lock_until: lockUntil.toISOString()
        }
        break
      case 'unlock':
        updateData = { 
          is_locked: false,
          locked_at: null,
          lock_until: null
        }
        break
      case 'ban':
        updateData = { 
          is_banned: true, 
          banned_at: new Date().toISOString(),
          ban_reason: banReason || null
        }
        break
      case 'unban':
        updateData = { 
          is_banned: false, 
          banned_at: null,
          ban_reason: null
        }
        break
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', modalUser.id)

    if (error) {
      console.error('Error updating user:', error)
      alert('エラーが発生しました')
    } else {
      await loadUsers()
      closeModal()
    }

    setActionLoading(false)
  }

  const totalPages = Math.ceil(totalCount / PER_PAGE)

  return (
    <div>
      {/* ヘッダー */}
      <div className="admin-header">
        <h1>ユーザー管理</h1>
        <p>登録ユーザーの管理・制限</p>
      </div>

      {/* 検索・フィルター */}
      <div className="admin-search-bar">
        <input
          type="text"
          className="admin-search-input"
          placeholder="ユーザー名・表示名で検索..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <select
          className="admin-filter-select"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as typeof filter)
            setPage(1)
          }}
        >
          <option value="all">すべて</option>
          <option value="active">アクティブ</option>
          <option value="locked">ロック中</option>
          <option value="banned">BAN済み</option>
        </select>
      </div>

      {/* テーブル */}
      <div className="admin-table-container">
        {loading ? (
          <div className="admin-empty">
            <i className="fas fa-spinner fa-spin"></i>
            <p>読み込み中...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty">
            <i className="fas fa-users"></i>
            <p>ユーザーが見つかりません</p>
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ユーザー</th>
                  <th>タイプ</th>
                  <th>ステータス</th>
                  <th>登録日</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-user-avatar">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" />
                          ) : (
                            <i className="fas fa-user"></i>
                          )}
                        </div>
                        <div className="admin-user-info">
                          <span className="admin-user-name">{user.display_name || '未設定'}</span>
                          <a 
                            href={`/creators/${user.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-user-username-link"
                          >
                            @{user.username}
                            <i className="fas fa-external-link-alt"></i>
                          </a>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge ${user.is_admin ? 'blue' : 'gray'}`}>
                        {user.is_admin ? '管理者' : user.account_type === 'business' ? 'ビジネス' : '一般'}
                      </span>
                    </td>
                    <td>
                      {user.is_banned ? (
                        <span className="admin-badge red">BAN</span>
                      ) : user.is_locked ? (
                        <span className="admin-badge yellow">ロック</span>
                      ) : (
                        <span className="admin-badge green">アクティブ</span>
                      )}
                    </td>
                    <td>
                      {new Date(user.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td>
                      <div className="admin-actions">
                        {!user.is_admin && (
                          <>
                            {user.is_banned ? (
                              <button
                                className="admin-action-btn secondary"
                                onClick={() => openModal(user, 'unban')}
                              >
                                BAN解除
                              </button>
                            ) : (
                              <>
                                {user.is_locked ? (
                                  <button
                                    className="admin-action-btn secondary"
                                    onClick={() => openModal(user, 'unlock')}
                                  >
                                    ロック解除
                                  </button>
                                ) : (
                                  <button
                                    className="admin-action-btn warning"
                                    onClick={() => openModal(user, 'lock')}
                                  >
                                    ロック
                                  </button>
                                )}
                                <button
                                  className="admin-action-btn danger"
                                  onClick={() => openModal(user, 'ban')}
                                >
                                  BAN
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ページネーション */}
            <div className="admin-pagination">
              <span className="admin-pagination-info">
                {totalCount}件中 {(page - 1) * PER_PAGE + 1}〜{Math.min(page * PER_PAGE, totalCount)}件
              </span>
              <div className="admin-pagination-btns">
                <button
                  className="admin-pagination-btn"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  前へ
                </button>
                <button
                  className="admin-pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  次へ
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* モーダル */}
      {modalUser && modalAction && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>
                {modalAction === 'lock' && 'アカウントをロック'}
                {modalAction === 'unlock' && 'ロックを解除'}
                {modalAction === 'ban' && 'アカウントをBAN'}
                {modalAction === 'unban' && 'BANを解除'}
              </h3>
              <button className="admin-modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="admin-modal-body">
              <p style={{ marginBottom: 16 }}>
                <strong>@{modalUser.username}</strong>（{modalUser.display_name || '未設定'}）
              </p>
              
              {modalAction === 'lock' && (
                <div className="admin-form-group">
                  <label className="admin-form-label">ロック期間（日数）</label>
                  <input
                    type="number"
                    className="admin-search-input"
                    value={lockDays}
                    onChange={(e) => setLockDays(Number(e.target.value))}
                    min={1}
                    max={365}
                    style={{ width: '100%' }}
                  />
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: 8 }}>
                    ロック中はログインできなくなります。
                  </p>
                </div>
              )}
              
              {modalAction === 'unlock' && (
                <>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    このアカウントのロックを解除します。
                  </p>
                  {modalUser.lock_until && (
                    <p style={{ fontSize: '0.875rem', marginTop: 8 }}>
                      <strong>ロック期限:</strong> {new Date(modalUser.lock_until).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </>
              )}
              
              {modalAction === 'ban' && (
                <div className="admin-form-group">
                  <label className="admin-form-label">BAN理由（任意）</label>
                  <textarea
                    className="admin-form-textarea"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="BAN理由を入力..."
                  />
                </div>
              )}
              
              {modalAction === 'unban' && (
                <>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 12 }}>
                    このアカウントのBANを解除します。
                  </p>
                  {modalUser.ban_reason && (
                    <p style={{ fontSize: '0.875rem' }}>
                      <strong>BAN理由:</strong> {modalUser.ban_reason}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="admin-modal-footer">
              <button
                className="admin-action-btn secondary"
                onClick={closeModal}
                disabled={actionLoading}
              >
                キャンセル
              </button>
              <button
                className={`admin-action-btn ${modalAction === 'ban' ? 'danger' : modalAction === 'lock' ? 'warning' : 'primary'}`}
                onClick={executeAction}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <>
                    {modalAction === 'lock' && 'ロックする'}
                    {modalAction === 'unlock' && '解除する'}
                    {modalAction === 'ban' && 'BANする'}
                    {modalAction === 'unban' && '解除する'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}