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
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6B6B6B'
          }}>
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
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{
              textAlign: 'center',
              padding: '60px 20px'
            }}>
              <p style={{ color: '#6B6B6B', marginBottom: '24px' }}>
                依頼が見つかりませんでした
              </p>
              <Link
                href="/requests"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: '#1A1A1A',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  borderRadius: '4px'
                }}
              >
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
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
          {/* 戻るボタン */}
          <Link
            href="/requests"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#6B6B6B',
              textDecoration: 'none',
              fontSize: '14px',
              marginBottom: '32px'
            }}
          >
            ← 依頼一覧に戻る
          </Link>

          {/* 依頼詳細 */}
          <div style={{
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            padding: '40px',
            marginBottom: '24px'
          }}>
            {/* ステータスとカテゴリ */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '20px'
            }}>
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
                <span style={{
                  display: 'inline-block',
                  padding: '6px 16px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#6B6B6B'
                }}>
                  {getCategoryLabel(request.category)}
                </span>
              )}
            </div>

            {/* タイトル */}
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#1A1A1A',
              marginBottom: '24px'
            }}>
              {request.title}
            </h1>

            {/* 依頼者情報 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '32px',
              paddingBottom: '24px',
              borderBottom: '1px solid #E5E5E5'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#E5E5E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: '#6B6B6B'
              }}>
                {request.profiles?.avatar_url ? (
                  <img
                    src={request.profiles.avatar_url}
                    alt={request.profiles.display_name || ''}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  request.profiles?.display_name?.charAt(0) || '?'
                )}
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B6B6B' }}>依頼者</div>
                <Link
                  href={`/creators/${request.profiles?.id}`}
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1A1A1A',
                    textDecoration: 'none'
                  }}
                >
                  {request.profiles?.display_name || '名前未設定'}
                </Link>
              </div>
            </div>

            {/* 依頼内容 */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#1A1A1A',
                marginBottom: '12px'
              }}>
                依頼内容
              </h2>
              <p style={{
                fontSize: '16px',
                color: '#1A1A1A',
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
                  <div style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '4px' }}>予算</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A' }}>
                    {request.budget_min?.toLocaleString() || '未設定'}円 〜 {request.budget_max?.toLocaleString() || '未設定'}円
                  </div>
                </div>
              )}
              {request.deadline && (
                <div>
                  <div style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '4px' }}>希望納期</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A' }}>
                    {formatDate(request.deadline)}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '4px' }}>投稿日</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A' }}>
                  {formatDate(request.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
            {isClient && request.status === 'open' && (
              <button
                onClick={handleCancel}
                disabled={processing}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #F44336',
                  borderRadius: '4px',
                  backgroundColor: '#FFFFFF',
                  color: '#F44336',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: processing ? 'not-allowed' : 'pointer'
                }}
              >
                依頼をキャンセル
              </button>
            )}

            {canAccept && (
              <>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF',
                    color: '#1A1A1A',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: processing ? 'not-allowed' : 'pointer'
                  }}
                >
                  辞退する
                </button>
                <button
                  onClick={handleAccept}
                  disabled={processing}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: processing ? '#6B6B6B' : '#1A1A1A',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: processing ? 'not-allowed' : 'pointer'
                  }}
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