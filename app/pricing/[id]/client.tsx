'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import styles from './page.module.css'

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

const CATEGORIES = [
  { value: 'illustration', label: 'イラスト', icon: 'fas fa-image' },
  { value: 'manga', label: 'マンガ', icon: 'fas fa-book' },
  { value: 'novel', label: '小説', icon: 'fas fa-file-alt' },
  { value: 'music', label: '音楽', icon: 'fas fa-music' },
  { value: 'voice', label: 'ボイス', icon: 'fas fa-microphone' },
  { value: 'video', label: '動画', icon: 'fas fa-video' },
  { value: 'other', label: 'その他', icon: 'fas fa-ellipsis-h' }
]

function getCategoryInfo(category: string | null) {
  if (!category) return { label: 'その他', icon: 'fas fa-ellipsis-h' }
  return CATEGORIES.find(c => c.value === category) || { label: category, icon: 'fas fa-ellipsis-h' }
}

export default function PricingDetailClient() {
  const params = useParams()
  const planId = params.id as string

  const [plan, setPlan] = useState<PricingPlan | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // ページタイトルを動的に設定
  useEffect(() => {
    if (plan && creator) {
      document.title = `${plan.plan_name} - ${creator.display_name || creator.username} | 同人ワークス`
    }
  }, [plan, creator])

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

    // クリエイター情報取得
    const { data: creatorData, error: creatorError } = await supabase
      .from('profiles')
      .select('id, user_id, username, display_name, bio, avatar_url')
      .eq('id', planData.creator_id)
      .single()

    if (creatorError || !creatorData) {
      console.error('クリエイター取得エラー:', creatorError)
      setCreator(null)
    } else {
      setCreator(creatorData)
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
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <span>読み込み中...</span>
        </div>
        <Footer />
      </>
    )
  }

  if (!plan || !creator) {
    return (
      <>
        <Header />
        <div className={styles.error}>
          <div className={styles.errorContent}>
            <i className="fas fa-exclamation-circle"></i>
            <h1>料金プランが見つかりません</h1>
            <p>このプランは存在しないか、非公開になっています。</p>
            <Link href="/" className="btn btn-primary">
              トップページに戻る
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const categoryInfo = getCategoryInfo(plan.category)

  return (
    <>
      <Header />
      
      <div className={styles.container}>
        {/* ヘッダー（2カラムの外） */}
        <div className={styles.header}>
          <span className="badge badge-accent">
            <i className={categoryInfo.icon}></i> {categoryInfo.label}
          </span>
          <h1 className={styles.title}>{plan.plan_name}</h1>
        </div>

        <div className={styles.layout}>
          {/* 左カラム: 画像 + 詳細 + クリエイター */}
          <div className={styles.leftColumn}>
            {/* 画像ギャラリー */}
            <div className={styles.gallery}>
              <div className={styles.mainImage}>
                {allImages.length > 0 && (
                  <Image
                    src={allImages[currentImageIndex].url}
                    alt={plan.plan_name}
                    fill
                    priority
                  />
                )}
              </div>

              {allImages.length > 1 && (
                <div className={styles.thumbs}>
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`${styles.thumb} ${currentImageIndex === index ? styles.active : ''}`}
                    >
                      <Image
                        src={img.url}
                        alt={`サンプル ${index + 1}`}
                        fill
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* プラン詳細 */}
            <div className={styles.detailSection}>
              <h2 className={styles.sectionTitle}>プランの詳細</h2>
              <div className={styles.description}>
                {plan.description.split('\n').map((line, i) => (
                  <p key={i}>{line || <br />}</p>
                ))}
              </div>
            </div>

            {/* クリエイター情報 */}
            <Link href={`/creators/${creator.username}`} className={styles.creatorSection}>
              <div className={styles.avatar}>
                {creator.avatar_url ? (
                  <Image
                    src={creator.avatar_url}
                    alt={creator.display_name || ''}
                    width={48}
                    height={48}
                  />
                ) : (
                  <i className="fas fa-user"></i>
                )}
              </div>
              <div className={styles.creatorInfo}>
                <span className={styles.creatorName}>
                  {creator.display_name || '名前未設定'}
                </span>
                <span className={styles.creatorMeta}>
                  @{creator.username}
                </span>
              </div>
              <i className="fas fa-chevron-right" style={{ color: 'var(--text-tertiary)' }}></i>
            </Link>
          </div>

          {/* 右カラム: 料金・CTA */}
          <div className={styles.rightColumn}>
            <div className={styles.infoCard}>
              {/* 料金 */}
              <div className={styles.priceSection}>
                <div className={styles.priceLabel}>料金</div>
                <div className={styles.price}>
                  ¥{plan.minimum_price.toLocaleString()}<span className={styles.priceSuffix}>〜</span>
                </div>
              </div>

              {/* 依頼を送るボタン */}
              <Link
                href={`/requests/create?to=${creator.username}&plan=${plan.id}`}
                className={`btn btn-primary ${styles.ctaButton}`}
              >
                <i className="fas fa-paper-plane"></i>
                このプランで依頼を送る
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}