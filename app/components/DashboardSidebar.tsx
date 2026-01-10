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
    if (href === '/dashboard/portfolio') {
      return pathname.startsWith('/dashboard/portfolio')
    }
    if (href === '/requests/manage') {
      return pathname === '/requests/manage'
    }
    if (href === '/requests/create') {
      return pathname === '/requests/create'
    }
    if (href.startsWith('/dashboard/')) {
      return pathname === href || pathname.startsWith(href + '/')
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  // モバイル用メニュー項目（アイコン+短いラベル）
  const mobileMenuItems = [
    { href: '/dashboard', icon: 'home', label: 'ホーム' },
    { href: '/dashboard/profile', icon: 'user-edit', label: 'プロフィール' },
    { href: '/dashboard/pricing', icon: 'tags', label: '料金表' },
    { href: '/dashboard/portfolio', icon: 'images', label: '作品' },
    { href: '/requests/manage', icon: 'clipboard-list', label: '依頼管理' },
    { href: '/requests/create', icon: 'plus-circle', label: '依頼作成' },
    { href: '/dashboard/earnings', icon: 'chart-line', label: '売上' },
    { href: '/dashboard/payments', icon: 'credit-card', label: '支払い' },
    { href: '/dashboard/bank-account', icon: 'university', label: '振込先' },
    { href: '/messages', icon: 'envelope', label: 'メッセージ' },
  ]

  // ビジネスユーザー用
  if (accountType === 'business') {
    mobileMenuItems.push({ href: '/dashboard/business', icon: 'briefcase', label: 'ビジネス' })
  }

  // 管理者用メニュー
  const adminMobileItems = isAdmin ? [
    { href: '/admin', icon: 'cog', label: '管理' },
    { href: '/admin/payments', icon: 'money-check', label: '振込管理' },
    { href: '/admin/users', icon: 'users', label: 'ユーザー' },
  ] : []

  return (
    <>
      {/* モバイル: 上部横スクロールナビ */}
      <nav className="dashboard-mobile-nav">
        <div className="dashboard-mobile-nav-scroll">
          {mobileMenuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`dashboard-mobile-nav-item ${isActive(item.href) ? 'active' : ''}`}
            >
              <i className={`fas fa-${item.icon}`}></i>
              <span>{item.label}</span>
            </Link>
          ))}
          {adminMobileItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`dashboard-mobile-nav-item admin ${isActive(item.href) ? 'active' : ''}`}
            >
              <i className={`fas fa-${item.icon}`}></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* PC: 左サイドバー */}
      <aside className="dashboard-sidebar">
        <nav className="dashboard-sidebar-nav">
          {/* 受付中トグル（ビジネスユーザーのみ） */}
          {accountType === 'business' && (
            <div className={`dashboard-status-card ${isAcceptingOrders ? 'accepting' : 'paused'}`}>
              <div className="dashboard-status-header">
                <span className={`dashboard-status-label ${isAcceptingOrders ? 'accepting' : 'paused'}`}>
                  <i className="fas fa-circle"></i>
                  {isAcceptingOrders ? '受付中' : '受付停止中'}
                </span>
                
                <button
                  onClick={toggleAcceptingOrders}
                  disabled={isToggleLoading}
                  className={`dashboard-toggle ${isAcceptingOrders ? 'on' : 'off'} ${isToggleLoading ? 'loading' : ''}`}
                >
                  <div className="dashboard-toggle-knob"></div>
                </button>
              </div>
              
              <p className="dashboard-status-text">
                {isAcceptingOrders 
                  ? '新規依頼を受け付けています' 
                  : '新規依頼を受け付けていません'}
              </p>
            </div>
          )}

          <Link href="/dashboard" className={`dashboard-sidebar-item ${isActive('/dashboard') ? 'active' : ''}`}>
            ダッシュボード
          </Link>
          
          <Link href="/dashboard/profile" className={`dashboard-sidebar-item ${isActive('/dashboard/profile') ? 'active' : ''}`}>
            プロフィール編集
          </Link>

          <Link href="/dashboard/pricing" className={`dashboard-sidebar-item ${isActive('/dashboard/pricing') ? 'active' : ''}`}>
            料金表管理
          </Link>

          <Link href="/dashboard/portfolio" className={`dashboard-sidebar-item ${isActive('/dashboard/portfolio') ? 'active' : ''}`}>
            作品管理
          </Link>

          <div className="dashboard-sidebar-divider"></div>

          <Link href="/requests/manage" className={`dashboard-sidebar-item ${isActive('/requests/manage') ? 'active' : ''}`}>
            依頼管理
          </Link>

          <Link href="/requests/create" className={`dashboard-sidebar-item ${isActive('/requests/create') ? 'active' : ''}`}>
            依頼を作成
          </Link>

          <div className="dashboard-sidebar-divider"></div>

          <Link href="/dashboard/earnings" className={`dashboard-sidebar-item ${isActive('/dashboard/earnings') ? 'active' : ''}`}>
            売上管理
          </Link>

          <Link href="/dashboard/payments" className={`dashboard-sidebar-item ${isActive('/dashboard/payments') ? 'active' : ''}`}>
            支払い管理
          </Link>

          <Link href="/dashboard/bank-account" className={`dashboard-sidebar-item ${isActive('/dashboard/bank-account') ? 'active' : ''}`}>
            振込先設定
          </Link>

          <div className="dashboard-sidebar-divider"></div>

          <Link href="/messages" className={`dashboard-sidebar-item ${isActive('/messages') ? 'active' : ''}`}>
            メッセージ
          </Link>

          {accountType === 'business' && (
            <Link href="/dashboard/business" className={`dashboard-sidebar-item ${isActive('/dashboard/business') ? 'active' : ''}`}>
              ビジネス情報
            </Link>
          )}

          {isAdmin && (
            <>
              <div className="dashboard-sidebar-divider"></div>
              
              <Link href="/admin" className={`dashboard-sidebar-item ${isActive('/admin') ? 'active' : ''}`}>
                管理ダッシュボード
              </Link>

              <Link href="/admin/payments" className={`dashboard-sidebar-item ${isActive('/admin/payments') ? 'active' : ''}`}>
                振込管理
              </Link>

              <Link href="/admin/users" className={`dashboard-sidebar-item ${isActive('/admin/users') ? 'active' : ''}`}>
                ユーザー管理
              </Link>
            </>
          )}
        </nav>
      </aside>
    </>
  )
}