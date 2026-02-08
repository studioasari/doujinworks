'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { LoadingSpinner } from '@/app/components/Skeleton'
import styles from './page.module.css'

type Profile = {
  id: string
  user_id: string
  account_type: 'personal' | 'business' | null
  display_name: string | null
  avatar_url: string | null
}

type WorkItem = {
  id: string
  workRequestId: string
  contractId: string | null
  title: string
  description: string | null
  type: 'requester' | 'applicant' | 'contractor'
  status: string
  deadline: string | null
  contractedAt: string | null
  updatedAt: string | null
  price: number | null
  otherPartyName: string | null
  otherPartyAvatar: string | null
}

const STALE_DAYS = 30

const STATUS_LABELS: Record<string, string> = {
  pending: '応募中',
  contracted: '仮払い待ち',
  paid: '作業中',
  delivered: '納品済み',
  open: '応募選定中',
}

function getGreeting(): string {
  const now = new Date()
  const jstHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getHours()
  
  if (jstHour >= 5 && jstHour < 12) {
    return 'おはようございます'
  } else if (jstHour >= 12 && jstHour < 18) {
    return 'こんにちは'
  } else {
    return 'こんばんは'
  }
}

export default function DashboardClient() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [workItems, setWorkItems] = useState<WorkItem[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, user_id, account_type, display_name, avatar_url')
      .eq('user_id', user.id)
      .single()

    if (!profileData) return

    setProfile(profileData)

    if (profileData.account_type === 'business') {
      await loadWorkItems(profileData.id)
    }

    setLoading(false)
  }

  function isStale(updatedAt: string | null): boolean {
    if (!updatedAt) return false
    const updated = new Date(updatedAt)
    const now = new Date()
    const diffDays = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays > STALE_DAYS
  }

  async function loadWorkItems(profileId: string) {
    const items: WorkItem[] = []

    const { data: myRequests } = await supabase
      .from('work_requests')
      .select(`
        id, title, description, status, updated_at, budget_min, budget_max,
        work_contracts ( id, status, deadline, contracted_at, updated_at, final_price, contractor_id )
      `)
      .eq('requester_id', profileId)
      .in('status', ['open', 'contracted'])

    if (myRequests) {
      for (const request of myRequests) {
        const contracts = request.work_contracts as any[]
        
        if (contracts && contracts.length > 0) {
          for (const contract of contracts) {
            if (['contracted', 'paid', 'delivered'].includes(contract.status)) {
              if (isStale(contract.updated_at)) continue

              const { data: contractor } = await supabase
                .from('profiles')
                .select('display_name, avatar_url')
                .eq('id', contract.contractor_id)
                .single()

              items.push({
                id: contract.id,
                workRequestId: request.id,
                contractId: contract.id,
                title: request.title,
                description: request.description,
                type: 'requester',
                status: contract.status,
                deadline: contract.deadline,
                contractedAt: contract.contracted_at,
                updatedAt: contract.updated_at,
                price: contract.final_price || request.budget_max || request.budget_min,
                otherPartyName: contractor?.display_name || null,
                otherPartyAvatar: contractor?.avatar_url || null,
              })
            }
          }
        } else if (request.status === 'open') {
          if (isStale(request.updated_at)) continue

          items.push({
            id: request.id,
            workRequestId: request.id,
            contractId: null,
            title: request.title,
            description: request.description,
            type: 'requester',
            status: 'open',
            deadline: null,
            contractedAt: null,
            updatedAt: request.updated_at,
            price: request.budget_max || request.budget_min,
            otherPartyName: null,
            otherPartyAvatar: null,
          })
        }
      }
    }

    const { data: myApplications } = await supabase
      .from('work_request_applications')
      .select(`
        id, status, proposed_price, created_at,
        work_requests ( id, title, description, requester_id, budget_min, budget_max )
      `)
      .eq('applicant_id', profileId)
      .eq('status', 'pending')

    if (myApplications) {
      for (const app of myApplications) {
        const request = app.work_requests as any
        if (request) {
          const { data: requester } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', request.requester_id)
            .single()

          items.push({
            id: app.id,
            workRequestId: request.id,
            contractId: null,
            title: request.title,
            description: request.description,
            type: 'applicant',
            status: 'pending',
            deadline: null,
            contractedAt: null,
            updatedAt: app.created_at,
            price: app.proposed_price || request.budget_max || request.budget_min,
            otherPartyName: requester?.display_name || null,
            otherPartyAvatar: requester?.avatar_url || null,
          })
        }
      }
    }

    const { data: myContracts } = await supabase
      .from('work_contracts')
      .select(`
        id, status, deadline, contracted_at, updated_at, final_price,
        work_requests ( id, title, description, requester_id, budget_min, budget_max )
      `)
      .eq('contractor_id', profileId)
      .in('status', ['contracted', 'paid', 'delivered'])

    if (myContracts) {
      for (const contract of myContracts) {
        if (isStale(contract.updated_at)) continue

        const request = contract.work_requests as any
        if (request) {
          const { data: requester } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', request.requester_id)
            .single()

          items.push({
            id: contract.id,
            workRequestId: request.id,
            contractId: contract.id,
            title: request.title,
            description: request.description,
            type: 'contractor',
            status: contract.status,
            deadline: contract.deadline,
            contractedAt: contract.contracted_at,
            updatedAt: contract.updated_at,
            price: contract.final_price || request.budget_max || request.budget_min,
            otherPartyName: requester?.display_name || null,
            otherPartyAvatar: requester?.avatar_url || null,
          })
        }
      }
    }

    items.sort((a, b) => {
      const dateA = a.contractedAt || a.updatedAt || ''
      const dateB = b.contractedAt || b.updatedAt || ''
      return dateB.localeCompare(dateA)
    })

    setWorkItems(items)
  }

  function getDaysUntilDeadline(deadline: string | null): number | null {
    if (!deadline) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(deadline)
    deadlineDate.setHours(0, 0, 0, 0)
    const diff = deadlineDate.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  function formatPrice(price: number | null): string {
    if (!price) return ''
    return `¥${price.toLocaleString()}`
  }

  function getWorkItemLink(item: WorkItem): string {
    if (item.contractId) {
      return `/requests/${item.workRequestId}/contracts/${item.contractId}`
    }
    return `/requests/${item.workRequestId}`
  }

  if (loading) {
    return <LoadingSpinner />
  }

  const displayName = profile?.display_name || 'ゲスト'
  const greeting = getGreeting()

  if (profile?.account_type !== 'business') {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.welcome}>
          <h1 className={styles.welcomeTitle}>{greeting}、{displayName}さん！</h1>
          <p className={styles.welcomeText}>お仕事機能を使ってみよう</p>
        </div>
        <div className={styles.emptyCenter}>
          <img src="/illustrations/dashboard-upgrade.png" alt="" className={styles.emptyImage} />
          <p className={styles.emptyDescription}>
            依頼を受けたり、出したり。<br />
            ビジネスアカウントで始めよう。
          </p>
          <Link href="/settings/account" className={styles.primaryButton}>
            ビジネスアカウントに切り替える
          </Link>
        </div>
      </div>
    )
  }

  if (workItems.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.welcome}>
          <h1 className={styles.welcomeTitle}>{greeting}、{displayName}さん！</h1>
          <p className={styles.welcomeText}>新しいお仕事を始めましょう</p>
        </div>
        <div className={styles.emptyCenter}>
          <img src="/illustrations/dashboard-empty.png" alt="" className={styles.emptyImage} />
          <div className={styles.emptyActions}>
            <Link href="/requests" className={styles.secondaryButton}>依頼を探す</Link>
            <Link href="/requests/create" className={styles.primaryButton}>依頼を作成</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.welcome}>
        <h1 className={styles.welcomeTitle}>{greeting}、{displayName}さん！</h1>
        <p className={styles.welcomeText}>進行中のお仕事をチェックしましょう</p>
      </div>

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>進行中のお仕事</h2>
        <Link href="/requests/manage" className={styles.manageLink}>
          依頼管理 <i className="fas fa-arrow-right"></i>
        </Link>
      </div>

      <div className={styles.workGrid}>
        {workItems.map((item) => {
          const daysLeft = getDaysUntilDeadline(item.deadline)
          const canShowDeadline = ['paid', 'delivered'].includes(item.status)
          const isOverdue = canShowDeadline && daysLeft !== null && daysLeft < 0

          let displayStatus = STATUS_LABELS[item.status] || item.status
          let statusClass = styles.statusNeutral

          if (isOverdue) {
            displayStatus = '納期遅れ'
            statusClass = styles.statusError
          } else if (item.status === 'contracted') {
            statusClass = styles.statusWarning
          } else if (item.status === 'paid') {
            statusClass = styles.statusInfo
          } else if (item.status === 'delivered') {
            statusClass = styles.statusSuccess
          }

          return (
            <Link key={`${item.type}-${item.id}`} href={getWorkItemLink(item)} className={styles.card}>
              <span className={`${styles.badge} ${statusClass}`}>{displayStatus}</span>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              {item.description && <p className={styles.cardDesc}>{item.description}</p>}
              <div className={styles.cardFooter}>
                <div className={styles.cardPerson}>
                  <div className={styles.avatar}>
                    {item.otherPartyAvatar ? (
                      <Image src={item.otherPartyAvatar} alt="" width={28} height={28} />
                    ) : (
                      <i className="fas fa-user"></i>
                    )}
                  </div>
                  <span className={styles.personName}>{item.otherPartyName || '未定'}</span>
                </div>
                <div className={styles.cardMeta}>
                  {item.price && <span className={styles.price}>{formatPrice(item.price)}</span>}
                  {canShowDeadline && daysLeft !== null && !isOverdue && (
                    <span className={daysLeft <= 3 ? styles.deadlineUrgent : styles.deadline}>
                      <i className="fas fa-clock"></i>
                      {daysLeft === 0 ? '今日まで' : `あと${daysLeft}日`}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <p className={styles.note}>※ 30日以上更新のないお仕事は表示されません</p>
    </div>
  )
}