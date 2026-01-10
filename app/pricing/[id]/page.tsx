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
        <div className="detail-loading">
          <div className="detail-loading-content">
            <i className="fas fa-spinner fa-spin"></i>
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
        <div className="detail-error">
          <div className="detail-error-content">
            <h1>料金プランが見つかりません</h1>
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
      
      <div className="detail-page">
        <div className="detail-container">
          <div className="detail-layout">
            {/* 左カラム: クリエイター情報 */}
            <aside className="detail-sidebar">
              {/* アバター */}
              <div className="detail-sidebar-avatar">
                {creator.avatar_url ? (
                  <Image
                    src={creator.avatar_url}
                    alt={creator.display_name || ''}
                    width={80}
                    height={80}
                  />
                ) : (
                  <i className="fas fa-user"></i>
                )}
              </div>

              {/* 名前 */}
              <h2 className="detail-sidebar-name">
                {creator.display_name || '名前未設定'}
              </h2>

              {/* ユーザー名 */}
              {creator.username && (
                <p className="detail-sidebar-username">
                  @{creator.username}
                </p>
              )}

              {/* 統計情報 */}
              <div className="detail-sidebar-stats">
                <div className="detail-sidebar-stat">
                  <div className="detail-sidebar-stat-value">{portfolioCount}</div>
                  <div className="detail-sidebar-stat-label">作品</div>
                </div>
                <div className="detail-sidebar-stat">
                  <div className="detail-sidebar-stat-value">{followerCount}</div>
                  <div className="detail-sidebar-stat-label">フォロワー</div>
                </div>
              </div>

              {/* 自己紹介 */}
              {creator.bio && (
                <p className="detail-sidebar-bio">{creator.bio}</p>
              )}

              {/* プロフィールを見るボタン */}
              <Link href={`/creators/${creator.username}`} className="detail-sidebar-btn">
                プロフィールを見る
              </Link>
            </aside>

            {/* 右カラム: 料金プラン詳細 */}
            <main className="detail-main">
              {/* プラン名 */}
              <h1 className="detail-title">{plan.plan_name}</h1>

              {/* カテゴリバッジ */}
              <Link href={`/pricing/${plan.category}`} className="detail-badge">
                {getCategoryLabel(plan.category)}
              </Link>

              {/* メイン画像 */}
              <div className="detail-gallery-main">
                {allImages.length > 0 && (
                  <Image
                    src={allImages[currentImageIndex].url}
                    alt={plan.plan_name}
                    fill
                    priority
                  />
                )}
              </div>

              {/* サンプル画像グリッド */}
              {allImages.length > 1 && (
                <div className="detail-gallery-thumbs">
                  {allImages.map((img, index) => (
                    <div
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`detail-gallery-thumb ${currentImageIndex === index ? 'active' : ''}`}
                    >
                      <Image
                        src={img.url}
                        alt={`サンプル ${index + 1}`}
                        fill
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 料金 */}
              <div className="detail-section">
                <div className="detail-price-label">料金</div>
                <div className="detail-price">
                  ¥{plan.minimum_price.toLocaleString()}〜
                </div>
              </div>

              {/* プラン詳細 */}
              <div className="detail-section">
                <div className="detail-section-title">プランの詳細</div>
                <p className="detail-section-content">{plan.description}</p>
              </div>

              {/* 依頼を送るボタン */}
              <Link
                href={`/requests/create?to=${creator.username}&plan=${plan.id}`}
                className="detail-cta"
              >
                <i className="fas fa-paper-plane"></i>
                このプランで依頼を送る
              </Link>
            </main>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}