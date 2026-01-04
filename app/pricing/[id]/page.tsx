'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import '../../globals.css'

// 型定義
type Creator = {
  id: string
  user_id: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
}

type PricingPlan = {
  id: string
  creator_id: string
  category: string
  plan_name: string
  thumbnail_url: string
  sample_images: { url: string; order: number }[]
  minimum_price: number
  description: string
  is_public: boolean
  display_order: number
  created_at: string
}

// カテゴリラベルのマッピング
const CATEGORY_LABELS: { [key: string]: string } = {
  'illustration': 'イラスト',
  'manga': 'マンガ',
  'novel': '小説',
  'music': '音楽',
  'voice': 'ボイス',
  'video': '動画',
  'logo': 'ロゴ',
  'thumbnail': 'サムネイル',
  'profile': '自己紹介画像',
  'other': 'その他'
}

function getCategoryLabel(category: string | null): string {
  if (!category) return 'その他'
  return CATEGORY_LABELS[category] || category
}

export default function PricingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const planId = params.id as string

  const [plan, setPlan] = useState<PricingPlan | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [loading, setLoading] = useState(true)
  const [portfolioCount, setPortfolioCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    if (planId) {
      fetchPlanAndCreator()
    }
  }, [planId])

  async function fetchPlanAndCreator() {
    setLoading(true)

    // 料金プラン取得
    const { data: planData, error: planError } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_public', true)
      .single()

    if (planError || !planData) {
      console.error('料金プラン取得エラー:', planError)
      setPlan(null)
      setLoading(false)
      return
    }

    setPlan(planData)

    console.log('料金プランデータ:', planData)
    console.log('creator_id:', planData.creator_id)

    // クリエイター情報取得
    const { data: creatorData, error: creatorError } = await supabase
      .from('profiles')
      .select('id, user_id, username, display_name, bio, avatar_url')
      .eq('id', planData.creator_id)
      .single()

    console.log('クリエイターデータ:', creatorData)
    console.log('クリエイターエラー:', creatorError)
    console.log('エラー詳細:', JSON.stringify(creatorError, null, 2))

    if (creatorError || !creatorData) {
      console.error('クリエイター取得エラー:', creatorError)
      console.error('エラーメッセージ:', creatorError?.message)
      console.error('エラーコード:', creatorError?.code)
      setCreator(null)
    } else {
      setCreator(creatorData)
      
      // 作品数とフォロワー数を取得
      const [
        { count: portfolioCnt },
        { count: followerCnt }
      ] = await Promise.all([
        supabase
          .from('portfolio_items')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creatorData.user_id)
          .eq('is_public', true),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', creatorData.user_id)
      ])

      setPortfolioCount(portfolioCnt || 0)
      setFollowerCount(followerCnt || 0)
    }

    setLoading(false)
  }

  // サンプル画像の配列（サムネイル + サンプル画像）
  const allImages = plan ? [
    { url: plan.thumbnail_url, order: 0 },
    ...(plan.sample_images || [])
  ].sort((a, b) => a.order - b.order) : []

  if (loading) {
    return (
      <>
        <Header />
        <div className="loading-state">
          <div style={{ textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>読み込み中...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!plan || !creator) {
    return (
      <>
        <Header />
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#F5F6F8'
        }}>
          <div style={{ 
            textAlign: 'center', 
            backgroundColor: 'white', 
            padding: '40px', 
            borderRadius: '16px',
            border: '1px solid #D0D5DA'
          }}>
            <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#222222' }}>
              料金プランが見つかりません
            </h1>
            <Link href="/" className="btn-primary">
              トップページに戻る
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F5F6F8'
      }}>
        <div className="container">
          <div className="pricing-detail-layout">
            {/* 左カラム: クリエイター情報（PC）/ 下部（スマホ） */}
            <aside className="creator-info-sidebar">
              <div className="card-no-hover p-24">
                {/* アバター */}
                <div style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 12px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: '#EEF0F3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #D0D5DA'
                }}>
                  {creator.avatar_url ? (
                    <Image
                      src={creator.avatar_url}
                      alt={creator.display_name || ''}
                      width={80}
                      height={80}
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <i className="fas fa-user" style={{ fontSize: '32px', color: '#888888' }}></i>
                  )}
                </div>

                {/* 名前 */}
                <h2 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#222222',
                  textAlign: 'center',
                  marginBottom: '4px'
                }}>
                  {creator.display_name || '名前未設定'}
                </h2>

                {/* ユーザー名 */}
                {creator.username && (
                  <p className="text-gray" style={{
                    fontSize: '13px',
                    textAlign: 'center',
                    marginBottom: '16px'
                  }}>
                    @{creator.username}
                  </p>
                )}

                {/* 統計情報 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '16px',
                  fontSize: '12px',
                  color: '#555555',
                  marginBottom: '16px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#222222', fontSize: '16px' }}>
                      {portfolioCount}
                    </div>
                    <div>作品</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#222222', fontSize: '16px' }}>
                      {followerCount}
                    </div>
                    <div>フォロワー</div>
                  </div>
                </div>

                {/* 自己紹介 */}
                {creator.bio && (
                  <p className="text-secondary" style={{
                    fontSize: '13px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    marginBottom: '16px'
                  }}>
                    {creator.bio}
                  </p>
                )}

                {/* プロフィールを見るボタン */}
                <Link
                  href={`/creators/${creator.username}`}
                  className="btn-secondary btn-small"
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    display: 'block',
                    textDecoration: 'none'
                  }}
                >
                  プロフィールを見る
                </Link>
              </div>
            </aside>

            {/* 右カラム: 料金プラン詳細 */}
            <main className="pricing-detail-main">
              <div className="card-no-hover p-32">
                {/* プラン名 */}
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#222222',
                  marginBottom: '8px'
                }}>
                  {plan.plan_name}
                </h1>

                {/* カテゴリバッジ */}
                <div style={{ marginBottom: '24px' }}>
                  <span className="badge badge-category">
                    {getCategoryLabel(plan.category)}
                  </span>
                </div>

                {/* メイン画像（1200x630想定 = 1.9:1） */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: '52.63%', // 1.9:1のアスペクト比
                  backgroundColor: '#EEF0F3',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '16px'
                }}>
                  {allImages.length > 0 && (
                    <Image
                      src={allImages[currentImageIndex].url}
                      alt={plan.plan_name}
                      fill
                      style={{ objectFit: 'contain' }}
                      priority
                    />
                  )}
                </div>

                {/* サンプル画像グリッド */}
                {allImages.length > 1 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '8px',
                    marginBottom: '32px'
                  }}>
                    {allImages.map((img, index) => (
                      <div
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        style={{
                          position: 'relative',
                          paddingBottom: '100%',
                          cursor: 'pointer',
                          border: currentImageIndex === index ? '2px solid #5B7C99' : '1px solid #D0D5DA',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          opacity: currentImageIndex === index ? 1 : 0.6,
                          transition: 'all 0.2s',
                          backgroundColor: '#EEF0F3'
                        }}
                      >
                        <Image
                          src={img.url}
                          alt={`サンプル ${index + 1}`}
                          fill
                          style={{ objectFit: 'contain' }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* 料金 */}
                <div style={{ marginBottom: '32px' }}>
                  <div className="text-gray" style={{
                    fontSize: '13px',
                    marginBottom: '4px'
                  }}>
                    料金
                  </div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#5B7C99'
                  }}>
                    ¥{plan.minimum_price.toLocaleString()}〜
                  </div>
                </div>

                {/* プラン詳細 */}
                <div style={{ marginBottom: '32px' }}>
                  <div className="text-gray" style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '12px'
                  }}>
                    プランの詳細
                  </div>
                  <p className="text-secondary" style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.8',
                    fontSize: '14px'
                  }}>
                    {plan.description}
                  </p>
                </div>

                {/* 依頼を送るボタン */}
                <Link
                  href={`/requests/create?to=${creator.username}&plan=${plan.id}`}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textDecoration: 'none',
                    fontSize: '16px',
                    padding: '16px 24px'
                  }}
                >
                  <i className="fas fa-paper-plane"></i>
                  このプランで依頼を送る
                </Link>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* レスポンシブ対応 */}
      <style jsx global>{`
        .pricing-detail-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .pricing-detail-layout {
            grid-template-columns: 240px 1fr;
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          .pricing-detail-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .creator-info-sidebar {
            order: 2;
          }

          .pricing-detail-main {
            order: 1;
          }
        }
      `}</style>

      <Footer />
    </>
  )
}