'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingScreen from '../../components/LoadingScreen'

type User = {
  id: string
  user_id: string
  username: string | null
  display_name: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  is_admin: boolean
  request_count: number
  work_count: number
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = users.filter(user => 
        user.display_name?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      )
      setFilteredUsers(filtered)
    }
  }, [searchQuery, users])

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/admin/users'))
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()
    
    if (!profile?.is_admin) {
      alert('管理者権限がありません')
      router.push('/')
      return
    }

    setIsAdmin(true)
    await loadUsers()
    setLoading(false)
  }

  async function loadUsers() {
    try {
      // プロフィール情報を取得
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (!profiles) return

      // 各ユーザーの統計情報を取得
      const usersWithStats = await Promise.all(
        profiles.map(async (profile) => {
          // メールアドレスを取得（auth.usersから）
          const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id)

          // 依頼数
          const { count: requestCount } = await supabase
            .from('work_requests')
            .select('*', { count: 'exact', head: true })
            .eq('requester_id', profile.id)

          // 受注数
          const { data: applications } = await supabase
            .from('work_request_applications')
            .select('work_request_id')
            .eq('applicant_id', profile.id)
            .eq('status', 'accepted')

          const workCount = applications?.length || 0

          return {
            id: profile.id,
            user_id: profile.user_id,
            username: profile.username,
            display_name: profile.display_name,
            email: user?.email || null,
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            is_admin: profile.is_admin || false,
            request_count: requestCount || 0,
            work_count: workCount
          }
        })
      )

      setUsers(usersWithStats)
      setFilteredUsers(usersWithStats)
    } catch (error) {
      console.error('ユーザー取得エラー:', error)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (!isAdmin) {
    return null
  }

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow" style={{ padding: '40px 20px' }}>
          <h1 className="section-title mb-32">ユーザー管理</h1>

          {/* ナビゲーション */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <Link href="/admin" className="btn-secondary">
              ダッシュボード
            </Link>
            <Link href="/admin/payments" className="btn-secondary">
              振込管理
            </Link>
            <Link href="/admin/users" className="btn-primary">
              ユーザー管理
            </Link>
          </div>

          {/* 検索 */}
          <div style={{ marginBottom: '24px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="ユーザー名、メールアドレスで検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* 統計 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '16px', 
            marginBottom: '32px' 
          }}>
            <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>
                {users.length}
              </div>
              <div className="text-small text-gray">総ユーザー数</div>
            </div>
            <div className="card-no-hover p-24" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>
                {filteredUsers.length}
              </div>
              <div className="text-small text-gray">検索結果</div>
            </div>
          </div>

          {/* ユーザー一覧 */}
          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <p className="text-gray">ユーザーが見つかりませんでした</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredUsers.map((user, index) => (
                <div
                  key={user.id}
                  className="card-no-hover p-24"
                  style={{
                    borderBottom: index < filteredUsers.length - 1 ? '1px solid #E5E5E5' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    {/* アバター */}
                    <div style={{ 
                      width: '60px', 
                      height: '60px', 
                      borderRadius: '50%', 
                      backgroundColor: '#E5E5E5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.display_name || ''} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '24px', color: '#6B6B6B' }}>
                          {user.display_name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>

                    {/* ユーザー情報 */}
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: '8px' }}>
                        <Link
                          href={`/creators/${user.username}`}
                          style={{ 
                            fontSize: '16px', 
                            fontWeight: '600', 
                            color: '#1A1A1A',
                            textDecoration: 'none',
                            marginRight: '8px'
                          }}
                        >
                          {user.display_name || '名前未設定'}
                        </Link>
                        {user.is_admin && (
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: '#1A1A1A',
                            color: '#FFFFFF',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            管理者
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                        {user.username && (
                          <div className="text-small text-gray">
                            @{user.username}
                          </div>
                        )}
                        {user.email && (
                          <div className="text-small text-gray">
                            {user.email}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div className="text-small text-gray">
                          依頼: {user.request_count}件
                        </div>
                        <div className="text-small text-gray">
                          受注: {user.work_count}件
                        </div>
                        <div className="text-small text-gray">
                          登録日: {formatDate(user.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}