'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '../../utils/supabase/client'
import { useRouter } from 'next/navigation'
import './admin.css'

const menuItems = [
  { href: '/admin', icon: 'fa-chart-line', label: 'ダッシュボード' },
  { href: '/admin/users', icon: 'fa-users', label: 'ユーザー管理' },
  { href: '/admin/portfolio', icon: 'fa-palette', label: '作品管理' },
  { href: '/admin/requests', icon: 'fa-file-contract', label: '依頼管理' },
  { href: '/admin/reports', icon: 'fa-flag', label: '通報管理' },
  { href: '/admin/payments', icon: 'fa-yen-sign', label: '振込管理' },
  { href: '/admin/posts', icon: 'fa-newspaper', label: '記事管理' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/')
        return
      }

      setIsAdmin(true)
    }

    checkAdmin()
  }, [supabase, router])

  if (isAdmin === null) {
    return (
      <div className="admin-loading">
        <div>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
          読み込み中...
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      {/* モバイル用ハンバーガーボタン */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="admin-mobile-btn"
      >
        <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'}`} style={{ color: '#4b5563' }}></i>
      </button>

      {/* オーバーレイ（モバイル） */}
      {sidebarOpen && (
        <div
          className="admin-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* サイドバー */}
      <aside className={`admin-sidebar ${sidebarOpen ? '' : 'closed'}`}>
        {/* ロゴ */}
        <div className="admin-sidebar-header">
          <h1 className="admin-sidebar-title">
            <i className="fas fa-cog"></i>
            管理画面
          </h1>
          <p className="admin-sidebar-subtitle">同人ワークス</p>
        </div>

        {/* メニュー */}
        <nav className="admin-nav">
          <ul className="admin-nav-list">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`admin-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <i className={`fas ${item.icon} admin-nav-icon`}></i>
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* 下部リンク */}
        <div className="admin-sidebar-footer">
          <Link href="/" className="admin-back-link">
            <i className="fas fa-arrow-left admin-nav-icon"></i>
            <span>サイトに戻る</span>
          </Link>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  )
}