'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import styles from './Breadcrumb.module.css'

type BreadcrumbItem = {
  label: string
  href: string
}

const CATEGORY_LABELS: { [key: string]: string } = {
  'illustration': 'イラスト',
  'manga': 'マンガ',
  'novel': '小説',
  'music': '音楽',
  'voice': 'ボイス',
  'video': '動画',
  'other': 'その他',
}

export default function Breadcrumb() {
  const pathname = usePathname()
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [dynamicData, setDynamicData] = useState<{
    creatorName?: string
    pricingPlan?: { name: string; category: string }
    portfolioItem?: { name: string; category: string }
  }>({})

  const excludePaths = ['/', '/login', '/signup', '/auth']

  useEffect(() => {
    const paths = pathname.split('/').filter(Boolean)
    
    if (paths[0] === 'creators' && paths[1]) {
      fetchCreatorName(paths[1])
    } else if (paths[0] === 'pricing' && paths[1] && isUUID(paths[1])) {
      fetchPricingPlan(paths[1])
    } else if (paths[0] === 'portfolio' && paths[1] && isUUID(paths[1])) {
      fetchPortfolioItem(paths[1])
    } else {
      setDynamicData({})
    }
  }, [pathname])

  function isUUID(str: string) {
    return str.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  }

  async function fetchCreatorName(username: string) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('username', username)
      .single()
    
    if (data?.display_name) {
      setDynamicData({ creatorName: data.display_name })
    }
  }

  async function fetchPricingPlan(id: string) {
    const { data } = await supabase
      .from('pricing_plans')
      .select('plan_name, category')
      .eq('id', id)
      .single()
    
    if (data) {
      setDynamicData({ 
        pricingPlan: { name: data.plan_name, category: data.category } 
      })
    }
  }

  async function fetchPortfolioItem(id: string) {
    const { data } = await supabase
      .from('portfolio_items')
      .select('title, category')
      .eq('id', id)
      .single()
    
    if (data) {
      setDynamicData({ 
        portfolioItem: { name: data.title, category: data.category } 
      })
    }
  }
  
  useEffect(() => {
    generateBreadcrumbs()
  }, [pathname, dynamicData])

  function generateBreadcrumbs() {
    const paths = pathname.split('/').filter(Boolean)
    const items: BreadcrumbItem[] = [{ label: 'ホーム', href: '/' }]

    // 料金表詳細ページ（公開ページ）
    if (paths[0] === 'pricing' && paths[1] && isUUID(paths[1])) {
      items.push({ label: '料金表一覧', href: '/pricing' })
      if (dynamicData.pricingPlan) {
        const categoryLabel = CATEGORY_LABELS[dynamicData.pricingPlan.category] || dynamicData.pricingPlan.category
        items.push({ label: categoryLabel, href: `/pricing/${dynamicData.pricingPlan.category}` })
        items.push({ label: dynamicData.pricingPlan.name, href: pathname })
      } else {
        items.push({ label: '詳細', href: pathname })
      }
      setBreadcrumbs(items)
      return
    }

    // 作品詳細ページ
    if (paths[0] === 'portfolio' && paths[1] && isUUID(paths[1])) {
      items.push({ label: '作品一覧', href: '/portfolio' })
      if (dynamicData.portfolioItem) {
        const categoryLabel = CATEGORY_LABELS[dynamicData.portfolioItem.category] || dynamicData.portfolioItem.category
        items.push({ label: categoryLabel, href: `/portfolio/${dynamicData.portfolioItem.category}` })
        items.push({ label: dynamicData.portfolioItem.name, href: pathname })
      } else {
        items.push({ label: '詳細', href: pathname })
      }
      setBreadcrumbs(items)
      return
    }

    // 通常のパス生成
    let currentPath = ''
    paths.forEach((path, index) => {
      currentPath += `/${path}`
      if (isUUID(path)) return
      const label = getPathLabel(path, index === paths.length - 1, paths, index)
      items.push({ label, href: currentPath })
    })

    setBreadcrumbs(items)
  }

  function getPathLabel(path: string, isLast: boolean, paths: string[], index: number): string {
    // ダッシュボード配下の特別なラベル
    const dashboardLabels: { [key: string]: string } = {
      'profile': 'プロフィール編集',
      'pricing': '料金表管理',
      'business': 'ビジネス情報',
      'portfolio': '作品管理',
      'earnings': '売上管理',
      'payments': '支払い管理',
      'bank-account': '振込先設定',
    }

    // ダッシュボード > 作品管理 配下の特別なラベル
    const portfolioManageLabels: { [key: string]: string } = {
      'upload': 'アップロード',
      'drafts': '下書き',
    }

    // 親パスがdashboardの場合、専用ラベルを使用
    if (index > 0 && paths[index - 1] === 'dashboard' && dashboardLabels[path]) {
      return dashboardLabels[path]
    }

    // dashboard/portfolio配下の場合
    if (index > 1 && paths[0] === 'dashboard' && paths[1] === 'portfolio' && portfolioManageLabels[path]) {
      return portfolioManageLabels[path]
    }

    const pathLabels: { [key: string]: string } = {
      'pricing': '料金表一覧',
      'portfolio': '作品一覧',
      'requests': '依頼一覧',
      'creators': 'クリエイター',
      'messages': 'メッセージ',
      'notifications': '通知',
      'settings': '設定',
      'dashboard': 'ダッシュボード',
      'create': '新規作成',
      'edit': '編集',
      'profile': 'プロフィール',
      'account': 'アカウント',
      'billing': '請求',
      'privacy': 'プライバシー',
      'security': 'セキュリティ',
      'manage': '管理',
      'upload': 'アップロード',
      'drafts': '下書き',
      'wallet': 'ウォレット',
      'earnings': '売上管理',
      'payments': '支払い管理',
      'bank-account': '振込先設定',
      'admin': '管理者',
      'users': 'ユーザー管理',
      ...CATEGORY_LABELS,
    }

    if (index > 0 && paths[index - 1] === 'creators' && !pathLabels[path]) {
      return dynamicData.creatorName || path
    }

    return pathLabels[path] || (isLast ? '詳細' : path)
  }

  if (excludePaths.includes(pathname) || breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav className={styles.breadcrumb} aria-label="パンくずリスト">
      <div className={styles.breadcrumbInner}>
        <ol className={styles.breadcrumbList}>
          {breadcrumbs.map((item, index) => (
            <li key={index} className={styles.breadcrumbItem}>
              {index > 0 && (
                <i className={`fas fa-chevron-right ${styles.breadcrumbSeparator}`} aria-hidden="true"></i>
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className={styles.breadcrumbCurrent} aria-current="page">{item.label}</span>
              ) : (
                <Link href={item.href} className={styles.breadcrumbLink}>
                  {index === 0 && <i className={`fas fa-house ${styles.homeIcon}`} aria-hidden="true"></i>}
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}