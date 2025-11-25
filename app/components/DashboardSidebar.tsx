'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

export default function DashboardSidebar() {
  const pathname = usePathname()
  const [accountType, setAccountType] = useState<string | null>(null)

  useEffect(() => {
    checkAccountType()
  }, [])

  const checkAccountType = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      setAccountType(profile.account_type)
    }
  }

  const menuItems = [
    { href: '/dashboard', label: 'ダッシュボード', icon: 'fa-th-large' },
    { href: '/profile', label: 'プロフィール編集', icon: 'fa-user-edit' },
    { href: '/portfolio/manage', label: '作品管理', icon: 'fa-folder-open' },
    { href: '/requests', label: '依頼管理', icon: 'fa-clipboard-list' },
    { href: '/messages', label: 'メッセージ', icon: 'fa-comments' },
  ]

  // ビジネスアカウントの場合のみ追加
  if (accountType === 'business') {
    menuItems.push({ href: '/settings', label: 'ビジネス情報', icon: 'fa-briefcase' })
  }

  return (
    <>
      <style jsx>{`
        .sidebar {
          width: 240px;
          border-right: 1px solid #E5E5E5;
          padding: 40px 0;
          flex-shrink: 0;
          position: sticky;
          top: 64px;
          height: calc(100vh - 64px);
          overflow-y: auto;
          align-self: flex-start;
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>

      <aside className="sidebar">
        <nav style={{ padding: '0 20px' }}>
          {menuItems.map((item) => {
            // /portfolio/manage と /portfolio/upload の両方で作品管理をアクティブに
            let isActive = pathname === item.href
            if (item.href === '/portfolio/manage' && pathname.startsWith('/portfolio/')) {
              isActive = true
            } else if (item.href !== '/portfolio/manage') {
              isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 20px',
                  marginBottom: '4px',
                  backgroundColor: isActive ? '#1A1A1A' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#6B6B6B',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: isActive ? '600' : '400',
                  textDecoration: 'none',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#F9F9F9'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <i className={`fas ${item.icon}`} style={{ 
                  width: '16px',
                  fontSize: '14px',
                  textAlign: 'center'
                }}></i>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}