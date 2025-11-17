'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

type Request = {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  category: string | null
  status: string
  created_at: string
  client_id: string
  creator_id: string | null
  profiles: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

export default function RequestDetailPage() {
  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const router = useRouter()
  const params = useParams()
  const requestId = params.id as string

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentUserId && requestId) {
      fetchRequest()
    }
  }, [currentUserId, requestId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      // profilesテーブルから profile.id を取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        setCurrentUserId(profile.id)
      }
    }
  }

  async function fetchRequest() {
    setLoading(true)

    const { data, error } = await supabase
      .from('requests')
      .select('*, profiles!requests_client_id_fkey(id, display_name, avatar_url)')
      .eq('id', requestId)
      .single()

    if (error) {
      console.error('依頼取得エラー:', error)
    } else {
      setRequest(data)
    }

    setLoading(false)
  }

  async function handleAccept() {
    if (!confirm('この依頼を受けますか？')) return

    setProcessing(true)

    const { error } = await supabase
      .from('requests')
      .update({
        creator_id: currentUserId,
        status: 'accepted'
      })
      .eq('id', requestId)

    if (error) {
      console.error('依頼受付エラー:', error)
      alert('依頼の受付に失敗しました')
    } else {
      alert('依頼を受け付けました！')
      fetchRequest()
    }

    setProcessing(false)
  }

  async function handleReject() {
    if (!confirm('この依頼を辞退しますか？')) return

    setProcessing(true)

    const { error } = await supabase
      .from('requests')
      .update({
        status: 'rejected'
      })
      .eq('id', requestId)

    if (error) {
      console.error('依頼辞退エラー:', error)
      alert('依頼の辞退に失敗しました')
    } else {
      alert('依頼を辞退しました')
      fetchRequest()
    }

    setProcessing(false)
  }

  async function handleCancel() {
    if (!confirm('この依頼をキャンセルしますか？')) return

    setProcessing(true)

    const { error } = await supabase
      .from('requests')
      .update({
        status: 'cancelled'
      })
      .eq('id', requestId)

    if (error) {
      console.error('依頼キャンセルエラー:', error)
      alert('依頼のキャンセルに失敗しました')
    } else {
      alert('依頼をキャンセルしました')
      router.push('/requests')
    }

    setProcessing(false)
  }

  function getCategoryLabel(category: string | null) {
    const categories: { [key: string]: string } = {
      illustration: 'イラスト',
      manga: '漫画',
      novel: '小説',
      music: '音楽',
      voice: 'ボイス',
      video: '動画',
      game: 'ゲーム',
      other: 'その他'
    }
    return category ? categories[category] || category : '未設定'
  }

  function getStatusLabel(status: string) {
    const statuses: { [key: string]: string } = {
      open: '募集中',
      pending: '交渉中',
      accepted: '受付済み',
      rejected: '辞退',
      in_progress: '進行中',
      completed: '完了',
      cancelled: 'キャンセル'
    }
    return statuses[status] || status
  }

  function getStatusColor(status: string) {
    const colors: { [key: string]: string } = {
      open: '#4CAF50',
      pending: '#FF9800',
      accepted: '#2196F3',
      rejected: '#F44336',
      in_progress: '#9C27B0',
      completed: '#607D8B',
      cancelled: '#9E9E9E'
    }
    return colors[status] || '#9E9E9E'
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
          <div className="loading-state">
            読み込み中...
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!request) {
    return (
      <>
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
          <div className="container-narrow">
            <div className="empty-state">
              <p className="text-gray mb-24">
                依頼が見つかりませんでした
              </p>
              <Link href="/requests" className="btn-primary">
                依頼一覧に戻る
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const isClient = request.client_id === currentUserId
  const isCreator = request.creator_id === currentUserId
  const canAccept = request.status === 'open' && !isClient

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow">
          {/* 戻るボタン */}
          <Link
            href="/requests"
            className="text-small text-gray"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              marginBottom: '32px'
            }}
          >
            ← 依頼一覧に戻る
          </Link>

          {/* 依頼詳細 */}
          <div className="card-no-hover p-40 mb-24">
            {/* ステータスとカテゴリ */}
            <div className="flex gap-8 mb-24">
              <span style={{
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: getStatusColor(request.status),
                color: '#FFFFFF'
              }}>
                {getStatusLabel(request.status)}
              </span>
              {request.category && (
                <span className="badge badge-category" style={{
                  padding: '6px 16px',
                  fontSize: '14px'
                }}>
                  {getCategoryLabel(request.category)}
                </span>
              )}
            </div>

            {/* タイトル */}
            <h1 className="section-title mb-24">
              {request.title}
            </h1>

            {/* 依頼者情報 */}
            <div className="flex gap-12 mb-32" style={{
              alignItems: 'center',
              paddingBottom: '24px',
              borderBottom: '1px solid #E5E5E5'
            }}>
              <div className="avatar avatar-medium">
                {request.profiles?.avatar_url ? (
                  <img
                    src={request.profiles.avatar_url}
                    alt={request.profiles.display_name || ''}
                  />
                ) : (
                  request.profiles?.display_name?.charAt(0) || '?'
                )}
              </div>
              <div>
                <div className="text-tiny text-gray">依頼者</div>
                <Link
                  href={`/creators/${request.profiles?.id}`}
                  className="card-subtitle"
                  style={{ textDecoration: 'none' }}
                >
                  {request.profiles?.display_name || '名前未設定'}
                </Link>
              </div>
            </div>

            {/* 依頼内容 */}
            <div className="mb-32">
              <h2 className="card-title mb-12">
                依頼内容
              </h2>
              <p className="text-small" style={{
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap'
              }}>
                {request.description}
              </p>
            </div>

            {/* 詳細情報 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '24px',
              padding: '24px',
              backgroundColor: '#F9F9F9',
              borderRadius: '8px'
            }}>
              {(request.budget_min || request.budget_max) && (
                <div>
                  <div className="text-tiny text-gray mb-8" style={{ marginBottom: '4px' }}>予算</div>
                  <div className="card-subtitle">
                    {request.budget_min?.toLocaleString() || '未設定'}円 〜 {request.budget_max?.toLocaleString() || '未設定'}円
                  </div>
                </div>
              )}
              {request.deadline && (
                <div>
                  <div className="text-tiny text-gray mb-8" style={{ marginBottom: '4px' }}>希望納期</div>
                  <div className="card-subtitle">
                    {formatDate(request.deadline)}
                  </div>
                </div>
              )}
              <div>
                <div className="text-tiny text-gray mb-8" style={{ marginBottom: '4px' }}>投稿日</div>
                <div className="card-subtitle">
                  {formatDate(request.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-16" style={{ justifyContent: 'flex-end' }}>
            {isClient && request.status === 'open' && (
              <button
                onClick={handleCancel}
                disabled={processing}
                className="btn-danger"
              >
                依頼をキャンセル
              </button>
            )}

            {canAccept && (
              <>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="btn-secondary"
                >
                  辞退する
                </button>
                <button
                  onClick={handleAccept}
                  disabled={processing}
                  className="btn-primary"
                >
                  {processing ? '処理中...' : '依頼を受ける'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}