'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type DashboardSidebarProps = {
  accountType?: string | null
  isAdmin?: boolean
}

export default function DashboardSidebar({ accountType = null, isAdmin = false }: DashboardSidebarProps) {
  const pathname = usePathname()

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