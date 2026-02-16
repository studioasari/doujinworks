'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import styles from './DashboardSidebar.module.css'

type DashboardSidebarProps = {
  accountType?: string | null
  isAdmin?: boolean
}

type MenuItem = {
  href: string
  icon: string
  label: string
  isAdmin?: boolean
}

type TooltipState = {
  visible: boolean
  text: string
  top: number
}

export default function DashboardSidebar({ accountType = null, isAdmin = false }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [resolvedAccountType, setResolvedAccountType] = useState<string | null>(accountType)
  const [resolvedIsAdmin, setResolvedIsAdmin] = useState(isAdmin)
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(false)
  const [isToggleLoading, setIsToggleLoading] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: '', top: 0 })
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (accountType !== null) setResolvedAccountType(accountType)
  }, [accountType])

  useEffect(() => {
    if (isAdmin) setResolvedIsAdmin(isAdmin)
  }, [isAdmin])

  useEffect(() => {
    if (accountType !== null) return
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type, is_admin')
        .eq('user_id', user.id)
        .single()
      if (profile) {
        setResolvedAccountType(profile.account_type)
        setResolvedIsAdmin(profile.is_admin ?? false)
      }
    }
    fetchProfile()
  }, [accountType])

  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  useEffect(() => {
    if (isMoreSheetOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMoreSheetOpen])

  const showTooltip = useCallback((text: string, element: HTMLElement) => {
    if (!isCollapsed || !sidebarRef.current) return
    const sidebarRect = sidebarRef.current.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const top = elementRect.top - sidebarRect.top + elementRect.height / 2
    setTooltip({ visible: true, text, top })
  }, [isCollapsed])

  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }))
  }, [])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const newState = !prev
      localStorage.setItem('sidebar-collapsed', String(newState))
      return newState
    })
  }, [])

  useEffect(() => {
    if (resolvedAccountType === 'business') {
      fetchAcceptingStatus()
    } else {
      setIsToggleLoading(false)
    }
  }, [resolvedAccountType])

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
      window.dispatchEvent(new CustomEvent('accepting-orders-changed', { detail: newStatus }))
    } catch (error) {
      console.error('受付状態更新エラー:', error)
    } finally {
      setIsToggleLoading(false)
    }
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const status = (e as CustomEvent).detail
      setIsAcceptingOrders(status)
    }
    window.addEventListener('accepting-orders-changed', handler)
    return () => window.removeEventListener('accepting-orders-changed', handler)
  }, [])

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

  // メインメニュー（頻度順）
  const menuItems: MenuItem[] = [
    { href: '/dashboard', icon: 'fa-solid fa-house', label: 'ダッシュボード' },
    { href: '/dashboard/portfolio', icon: 'fa-solid fa-images', label: '作品管理' },
    { href: '/dashboard/pricing', icon: 'fa-solid fa-tags', label: '料金表管理' },
    { href: '/dashboard/profile', icon: 'fa-solid fa-user-pen', label: 'プロフィール編集' },
  ]

  // 依頼関連（メッセージ含む）
  const requestItems: MenuItem[] = [
    { href: '/requests/manage', icon: 'fa-solid fa-clipboard-list', label: '依頼管理' },
    { href: '/requests/create', icon: 'fa-solid fa-circle-plus', label: '依頼を作成' },
    { href: '/messages', icon: 'fa-solid fa-envelope', label: 'メッセージ' },
  ]

  // 収支管理
  const financeItems: MenuItem[] = [
    { href: '/dashboard/earnings', icon: 'fa-solid fa-chart-line', label: '売上管理' },
    { href: '/dashboard/payments', icon: 'fa-solid fa-credit-card', label: '支払い管理' },
    { href: '/dashboard/bank-account', icon: 'fa-solid fa-building-columns', label: '振込先設定' },
  ]

  // 設定
  const settingsItems: MenuItem[] = [
    { href: '/dashboard/account', icon: 'fa-solid fa-id-card', label: 'アカウント情報' },
    { href: '/dashboard/settings', icon: 'fa-solid fa-gear', label: 'アカウント設定' },
  ]

  // 管理者
  const adminItems: MenuItem[] = resolvedIsAdmin ? [
    { href: '/admin', icon: 'fa-solid fa-gauge-high', label: '管理ダッシュボード', isAdmin: true },
    { href: '/admin/payments', icon: 'fa-solid fa-money-check-dollar', label: '振込管理', isAdmin: true },
    { href: '/admin/users', icon: 'fa-solid fa-users-gear', label: 'ユーザー管理', isAdmin: true },
  ] : []

  // モバイル固定フッター（主要4項目）
  const footerItems: MenuItem[] = [
    { href: '/dashboard', icon: 'fa-solid fa-house', label: 'ホーム' },
    { href: '/dashboard/portfolio', icon: 'fa-solid fa-images', label: '作品' },
    { href: '/requests/manage', icon: 'fa-solid fa-clipboard-list', label: '依頼' },
    { href: '/dashboard/earnings', icon: 'fa-solid fa-chart-line', label: '収支' },
  ]

  // 「もっと」ボトムシート内
  const moreItems: MenuItem[] = [
    { href: '/dashboard/pricing', icon: 'fa-solid fa-tags', label: '料金表管理' },
    { href: '/dashboard/profile', icon: 'fa-solid fa-user-pen', label: 'プロフィール編集' },
    { href: '/requests/create', icon: 'fa-solid fa-circle-plus', label: '依頼を作成' },
    { href: '/messages', icon: 'fa-solid fa-envelope', label: 'メッセージ' },
    { href: '/dashboard/payments', icon: 'fa-solid fa-credit-card', label: '支払い管理' },
    { href: '/dashboard/bank-account', icon: 'fa-solid fa-building-columns', label: '振込先設定' },
    { href: '/dashboard/account', icon: 'fa-solid fa-id-card', label: 'アカウント情報' },
    { href: '/dashboard/settings', icon: 'fa-solid fa-gear', label: 'アカウント設定' },
  ]

  const isMoreActive = () => {
    return moreItems.some(item => isActive(item.href)) ||
           (resolvedIsAdmin && adminItems.some(item => isActive(item.href)))
  }

  const renderSidebarItem = (item: MenuItem) => (
    <Link
      key={item.href}
      href={item.href}
      className={`${styles.sidebarItem} ${isActive(item.href) ? styles.active : ''} ${item.isAdmin ? styles.admin : ''}`}
      onMouseEnter={(e) => showTooltip(item.label, e.currentTarget)}
      onMouseLeave={hideTooltip}
    >
      <i className={item.icon}></i>
      <span className={styles.label}>{item.label}</span>
    </Link>
  )

  if (!isMounted) {
    return null
  }

  return (
    <>
      {/* モバイル: 固定フッターナビ */}
      <nav className={styles.mobileFooter}>
        {footerItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.footerItem} ${isActive(item.href) ? styles.active : ''}`}
          >
            <i className={item.icon}></i>
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          className={`${styles.footerItem} ${isMoreActive() ? styles.active : ''}`}
          onClick={() => setIsMoreSheetOpen(true)}
        >
          <i className="fa-solid fa-ellipsis"></i>
          <span>もっと</span>
        </button>
      </nav>

      {/* モバイル: ボトムシート */}
      <div
        className={`${styles.sheetOverlay} ${isMoreSheetOpen ? styles.active : ''}`}
        onClick={() => setIsMoreSheetOpen(false)}
      />
      <div className={`${styles.bottomSheet} ${isMoreSheetOpen ? styles.active : ''}`}>
        <div className={styles.sheetHandle} onClick={() => setIsMoreSheetOpen(false)}>
          <span></span>
        </div>

        {resolvedAccountType === 'business' && (
          <div className={styles.sheetStatusBar}>
            <div className={`${styles.sheetStatusIndicator} ${isAcceptingOrders ? styles.accepting : ''}`}>
              <span className={styles.sheetStatusDot}></span>
              <span>{isAcceptingOrders ? '受付中' : '停止中'}</span>
            </div>
            <button
              onClick={toggleAcceptingOrders}
              disabled={isToggleLoading}
              className={`${styles.toggleSwitch} ${styles.toggleSwitchSm} ${isAcceptingOrders ? styles.on : ''} ${isToggleLoading ? styles.loading : ''}`}
              aria-label={isAcceptingOrders ? '受付を停止する' : '受付を開始する'}
            >
              <span className={styles.toggleKnob}></span>
            </button>
          </div>
        )}

        <div className={styles.sheetContent}>
          {moreItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.sheetItem} ${isActive(item.href) ? styles.active : ''}`}
              onClick={() => setIsMoreSheetOpen(false)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </Link>
          ))}

          {resolvedIsAdmin && (
            <>
              <div className={styles.sheetDivider}></div>
              <div className={styles.sheetLabel}>管理者</div>
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.sheetItem} ${styles.admin} ${isActive(item.href) ? styles.active : ''}`}
                  onClick={() => setIsMoreSheetOpen(false)}
                >
                  <i className={item.icon}></i>
                  <span>{item.label}</span>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>

      {/* PC: 左サイドバー */}
      <aside
        ref={sidebarRef}
        className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}
      >
        {isCollapsed && tooltip.visible && (
          <div
            className={styles.tooltip}
            style={{ top: tooltip.top }}
          >
            {tooltip.text}
          </div>
        )}

        <button
          className={styles.collapseBtn}
          onClick={toggleCollapse}
          onMouseEnter={(e) => showTooltip(isCollapsed ? 'メニューを展開' : 'メニューを折りたたむ', e.currentTarget)}
          onMouseLeave={hideTooltip}
          aria-label={isCollapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
        >
          <i className={`fa-solid ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
        </button>

        <nav className={styles.sidebarNav}>
          {/* 受付状態（ビジネスユーザーのみ） */}
          {resolvedAccountType === 'business' && (
            <div className={`${styles.statusCard} ${isAcceptingOrders ? styles.accepting : styles.paused}`}>
              {isCollapsed ? (
                <button
                  onClick={toggleAcceptingOrders}
                  disabled={isToggleLoading}
                  className={`${styles.statusIconOnly} ${isAcceptingOrders ? styles.accepting : ''}`}
                  onMouseEnter={(e) => showTooltip(isAcceptingOrders ? '受付中 - クリックで停止' : '停止中 - クリックで開始', e.currentTarget)}
                  onMouseLeave={hideTooltip}
                  aria-label={isAcceptingOrders ? '受付を停止する' : '受付を開始する'}
                >
                  <i className={`fa-solid ${isAcceptingOrders ? 'fa-circle-check' : 'fa-circle-pause'}`}></i>
                </button>
              ) : (
                <>
                  <div className={styles.statusHeader}>
                    <div className={`${styles.statusIndicator} ${isAcceptingOrders ? styles.accepting : styles.paused}`}>
                      <span className={styles.statusDot}></span>
                      <span className={styles.statusLabel}>
                        {isAcceptingOrders ? '受付中' : '停止中'}
                      </span>
                    </div>
                    <button
                      onClick={toggleAcceptingOrders}
                      disabled={isToggleLoading}
                      className={`${styles.toggleSwitch} ${isAcceptingOrders ? styles.on : ''} ${isToggleLoading ? styles.loading : ''}`}
                      aria-label={isAcceptingOrders ? '受付を停止する' : '受付を開始する'}
                    >
                      <span className={styles.toggleKnob}></span>
                    </button>
                  </div>
                  <p className={styles.statusText}>
                    {isAcceptingOrders
                      ? '新規依頼を受け付けています'
                      : '新規依頼の受付を停止しています'}
                  </p>
                </>
              )}
            </div>
          )}

          {/* メインメニュー */}
          <div className={styles.menuGroup}>
            {menuItems.map(renderSidebarItem)}
          </div>

          <div className={styles.divider}></div>

          {/* 依頼関連 */}
          <div className={styles.menuGroup}>
            {!isCollapsed && <span className={styles.groupLabel}>依頼</span>}
            {requestItems.map(renderSidebarItem)}
          </div>

          <div className={styles.divider}></div>

          {/* 収支管理 */}
          <div className={styles.menuGroup}>
            {!isCollapsed && <span className={styles.groupLabel}>収支</span>}
            {financeItems.map(renderSidebarItem)}
          </div>

          <div className={styles.divider}></div>

          {/* 設定 */}
          <div className={styles.menuGroup}>
            {!isCollapsed && <span className={styles.groupLabel}>設定</span>}
            {settingsItems.map(renderSidebarItem)}
          </div>

          {/* 管理者メニュー */}
          {resolvedIsAdmin && (
            <>
              <div className={styles.divider}></div>
              <div className={styles.menuGroup}>
                {!isCollapsed && <span className={`${styles.groupLabel} ${styles.adminLabel}`}>管理者</span>}
                {adminItems.map(renderSidebarItem)}
              </div>
            </>
          )}
        </nav>
      </aside>
    </>
  )
}