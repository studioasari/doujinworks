'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

type DashboardSidebarProps = {
  accountType?: string | null
  isAdmin?: boolean
}

export default function DashboardSidebar({ accountType = null, isAdmin = false }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(false)
  const [isToggleLoading, setIsToggleLoading] = useState(true)

  useEffect(() => {
    if (accountType === 'business') {
      fetchAcceptingStatus()
    } else {
      setIsToggleLoading(false)
    }
  }, [accountType])

  async function fetchAcceptingStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('is_accepting_orders')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setIsAcceptingOrders(data.is_accepting_orders ?? false)
      }
    } catch (error) {
      console.error('受付状態取得エラー:', error)
    } finally {
      setIsToggleLoading(false)
    }
  }

  async function toggleAcceptingOrders() {
    setIsToggleLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newStatus = !isAcceptingOrders

      const { error } = await supabase
        .from('profiles')
        .update({ is_accepting_orders: newStatus })
        .eq('user_id', user.id)

      if (error) throw error

      setIsAcceptingOrders(newStatus)
    } catch (error) {
      console.error('受付状態更新エラー:', error)
    } finally {
      setIsToggleLoading(false)
    }
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    if (href === '/portfolio/manage') {
      return pathname.startsWith('/portfolio/')
    }
    if (href.startsWith('/settings/')) {
      return pathname === href || pathname.startsWith(href + '/')
    }
    if (href === '/wallet/earnings') {
      return pathname.startsWith('/wallet/')
    }
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  const MenuItem = ({ href, children }: { href: string, children: React.ReactNode }) => {
    const active = isActive(href)
    return (
      <Link
        href={href}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: 'none',
          background: active ? '#F5F5F5' : 'transparent',
          fontSize: '15px',
          fontWeight: active ? '600' : '400',
          color: '#1A1A1A',
          cursor: 'pointer',
          textAlign: 'left',
          borderRadius: '6px',
          marginBottom: '4px',
          transition: 'background-color 0.2s',
          display: 'block',
          textDecoration: 'none'
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.backgroundColor = '#FAFAFA'
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        {children}
      </Link>
    )
  }

  return (
    <>
      <style jsx>{`
        .sidebar {
          width: 240px;
          border-right: 1px solid #E5E5E5;
          padding: 20px;
          flex-shrink: 0;
          position: sticky;
          top: 64px;
          height: calc(100vh - 64px);
          overflow-y: auto;
          align-self: flex-start;
          background-color: white;
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>

      <aside className="sidebar">
        <nav>
          {/* 受付中トグル（ビジネスユーザーのみ） */}
          {accountType === 'business' && (
            <>
              <div style={{
                padding: '16px',
                backgroundColor: isAcceptingOrders ? '#E8F5E9' : '#FFF3E0',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: isAcceptingOrders ? '#2E7D32' : '#E65100'
                  }}>
                    {isAcceptingOrders ? '🟢 受付中' : '🔴 受付停止中'}
                  </span>
                  
                  {/* トグルスイッチ */}
                  <button
                    onClick={toggleAcceptingOrders}
                    disabled={isToggleLoading}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: isAcceptingOrders ? '#4CAF50' : '#BDBDBD',
                      cursor: isToggleLoading ? 'wait' : 'pointer',
                      position: 'relative',
                      transition: 'background-color 0.2s',
                      opacity: isToggleLoading ? 0.6 : 1
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      position: 'absolute',
                      top: '2px',
                      left: isAcceptingOrders ? '22px' : '2px',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}></div>
                  </button>
                </div>
                
                <p style={{
                  fontSize: '11px',
                  color: '#666666',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {isAcceptingOrders 
                    ? '新規依頼を受け付けています' 
                    : '新規依頼を受け付けていません'}
                </p>
              </div>
            </>
          )}

          <MenuItem href="/dashboard">ダッシュボード</MenuItem>
          
          <MenuItem href="/settings/profile">プロフィール編集</MenuItem>

          <MenuItem href="/settings/pricing">料金表管理</MenuItem>

          <MenuItem href="/portfolio/manage">作品管理</MenuItem>

          <div style={{ height: '1px', backgroundColor: '#E5E5E5', margin: '16px 0' }}></div>

          <MenuItem href="/requests">依頼管理</MenuItem>

          <MenuItem href="/requests/manage">受注管理</MenuItem>

          <div style={{ height: '1px', backgroundColor: '#E5E5E5', margin: '16px 0' }}></div>

          <MenuItem href="/wallet/earnings">売上管理</MenuItem>

          <MenuItem href="/wallet/payments">支払い管理</MenuItem>

          <MenuItem href="/wallet/bank-account">振込先設定</MenuItem>

          <div style={{ height: '1px', backgroundColor: '#E5E5E5', margin: '16px 0' }}></div>

          <MenuItem href="/messages">メッセージ</MenuItem>

          {accountType === 'business' && (
            <MenuItem href="/settings/business">ビジネス情報</MenuItem>
          )}

          {isAdmin && (
            <>
              <div style={{ height: '1px', backgroundColor: '#E5E5E5', margin: '16px 0' }}></div>
              
              <MenuItem href="/admin">管理ダッシュボード</MenuItem>

              <MenuItem href="/admin/payments">振込管理</MenuItem>

              <MenuItem href="/admin/users">ユーザー管理</MenuItem>
            </>
          )}
        </nav>
      </aside>
    </>
  )
}