'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { getOrCreateChatRoom } from '@/utils/chatUtils'

type Creator = {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  role: string
  created_at: string
}

export default function CreatorDetailPage() {
  const [creator, setCreator] = useState<Creator | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [sendingMessage, setSendingMessage] = useState(false)
  const router = useRouter()
  const params = useParams()
  const creatorId = params.id as string

  useEffect(() => {
    checkAuth()
    if (creatorId) {
      fetchCreator()
    }
  }, [creatorId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setCurrentUser(user)
    }
  }

  async function fetchCreator() {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', creatorId)
      .eq('is_creator', true)
      .single()

    if (error) {
      console.error('クリエイター取得エラー:', error)
    } else {
      setCreator(data)
    }
    
    setLoading(false)
  }

  async function handleSendMessage() {
    if (!currentUser || !creator) return

    setSendingMessage(true)

    const roomId = await getOrCreateChatRoom(currentUser.id, creator.id)

    if (roomId) {
      router.push(`/messages/${roomId}`)
    } else {
      alert('チャットルームの作成に失敗しました')
    }

    setSendingMessage(false)
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

  if (!creator) {
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
                クリエイターが見つかりませんでした
              </p>
              <Link
                href="/creators"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: '#1A1A1A',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  borderRadius: '4px'
                }}
              >
                クリエイター一覧に戻る
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
          {/* 戻るボタン */}
          <Link
            href="/creators"
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
            ← クリエイター一覧に戻る
          </Link>

          {/* プロフィールカード */}
          <div style={{
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            padding: '40px',
            marginBottom: '32px'
          }}>
            {/* アバターと基本情報 */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '32px',
              marginBottom: '32px'
            }}>
              {/* アバター */}
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: '#E5E5E5',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                color: '#6B6B6B'
              }}>
                {creator.avatar_url ? (
                  <img
                    src={creator.avatar_url}
                    alt={creator.display_name || ''}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  creator.display_name?.charAt(0) || '?'
                )}
              </div>

              {/* 名前と役割 */}
              <div style={{ flex: 1 }}>
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#1A1A1A',
                  marginBottom: '12px'
                }}>
                  {creator.display_name || '名前未設定'}
                </h1>

                {/* 役割バッジ */}
                <div style={{
                  display: 'inline-block',
                  padding: '6px 16px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#6B6B6B',
                  marginBottom: '20px'
                }}>
                  {creator.role === 'creator' && 'クリエイター'}
                  {creator.role === 'client' && 'クライアント'}
                  {creator.role === 'both' && 'クリエイター・クライアント'}
                </div>

                {/* メッセージボタン */}
                <div>
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: sendingMessage ? '#6B6B6B' : '#1A1A1A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: sendingMessage ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {sendingMessage ? '処理中...' : 'メッセージを送る'}
                  </button>
                </div>
              </div>
            </div>

            {/* 自己紹介 */}
            <div>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#1A1A1A',
                marginBottom: '12px'
              }}>
                自己紹介
              </h2>
              <p style={{
                fontSize: '16px',
                color: '#1A1A1A',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap'
              }}>
                {creator.bio || '自己紹介が登録されていません'}
              </p>
            </div>
          </div>

          {/* ポートフォリオセクション（将来の拡張用） */}
          <div style={{
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            padding: '40px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#1A1A1A',
              marginBottom: '20px'
            }}>
              ポートフォリオ
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#6B6B6B',
              textAlign: 'center',
              padding: '40px 20px'
            }}>
              ポートフォリオ機能は準備中です
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}