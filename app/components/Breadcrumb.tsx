'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type BreadcrumbItem = {
  label: string
  href: string
}

export default function Breadcrumb() {
  const pathname = usePathname()
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])

  // パンくずを表示しないパス
  const excludePaths = ['/', '/login', '/signup', '/auth']
  
  useEffect(() => {
    generateBreadcrumbs()
  }, [pathname])

  function generateBreadcrumbs() {
    const paths = pathname.split('/').filter(Boolean)
    
    const items: BreadcrumbItem[] = [
      { label: 'ホーム', href: '/' }
    ]

    let currentPath = ''
    
    paths.forEach((path, index) => {
      currentPath += `/${path}`
      
      // UUIDっぽいパス（詳細ページなど）は除外
      if (path.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return
      }
      
      const label = getPathLabel(path, index === paths.length - 1)
      
      items.push({
        label,
        href: currentPath
      })
    })

    setBreadcrumbs(items)
  }

  function getPathLabel(path: string, isLast: boolean): string {
    // パスに対応するラベルのマッピング
    const pathLabels: { [key: string]: string } = {
      // メインページ
      'requests': '依頼一覧',
      'portfolio': 'ポートフォリオ',
      'creators': 'クリエイター',
      'messages': 'メッセージ',
      'notifications': '通知',
      'settings': '設定',
      'dashboard': 'ダッシュボード',
      
      // サブページ
      'create': '新規作成',
      'edit': '編集',
      'profile': 'プロフィール',
      'account': 'アカウント',
      'billing': '請求',
      'privacy': 'プライバシー',
      'security': 'セキュリティ',
      
      // カテゴリ
      'illustration': 'イラスト',
      'manga': 'マンガ',
      'novel': '小説',
      'music': '音楽',
      'voice': 'ボイス',
      'video': '動画',
      'design': 'デザイン',
      'logo': 'ロゴ',
      'other': 'その他',
    }

    return pathLabels[path] || (isLast ? '詳細' : path)
  }

  // 除外パスまたはパンくずが1つ以下の場合は表示しない
  if (excludePaths.includes(pathname) || breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav style={{
      backgroundColor: '#FFFFFF',
      borderTop: '1px solid #D0D5DA'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '12px 40px'
      }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        flexWrap: 'wrap'
      }}>
        {breadcrumbs.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {index > 0 && (
              <i className="fas fa-chevron-right" style={{ 
                fontSize: '9px', 
                color: '#D0D5DA' 
              }}></i>
            )}
            {index === breadcrumbs.length - 1 ? (
              <span style={{ color: '#888888', fontWeight: 400 }}>
                {item.label}
              </span>
            ) : (
              <Link 
                href={item.href}
                style={{
                  color: '#888888',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#5B7C99'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#888888'}
              >
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </div>
      </div>
    </nav>
  )
}