'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

type Genre = {
  id: string
  name: string
  icon: string
  description: string
  path: string
  specs: string
}

export default function UploadSelectClient() {
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [accountType, setAccountType] = useState<'casual' | 'business' | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, account_type')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        setCurrentUserId(profile.id)
        setAccountType(profile.account_type)
        setLoading(false)
      } else {
        router.push('/profile')
      }
    }
  }

  const genres: Genre[] = [
    {
      id: 'illustration',
      name: 'イラスト',
      icon: 'fa-solid fa-image',
      description: '1枚絵のイラスト作品',
      path: '/dashboard/portfolio/upload/illustration',
      specs: 'JPEG / PNG / GIF / 32MB'
    },
    {
      id: 'manga',
      name: 'マンガ',
      icon: 'fa-solid fa-book',
      description: '複数ページのマンガ作品',
      path: '/dashboard/portfolio/upload/manga',
      specs: 'JPEG / PNG / GIF / 32MB × 最大50ページ'
    },
    {
      id: 'novel',
      name: '小説',
      icon: 'fa-solid fa-file-lines',
      description: '小説、エッセイ、詩など',
      path: '/dashboard/portfolio/upload/novel',
      specs: '最大100,000文字'
    },
    {
      id: 'music',
      name: '音楽',
      icon: 'fa-solid fa-music',
      description: 'オリジナル楽曲やカバーなど',
      path: '/dashboard/portfolio/upload/music',
      specs: 'MP3 / WAV / 20MB'
    },
    {
      id: 'voice',
      name: 'ボイス',
      icon: 'fa-solid fa-microphone',
      description: 'ボイスドラマ、朗読など',
      path: '/dashboard/portfolio/upload/voice',
      specs: 'MP3 / WAV / 20MB'
    },
    {
      id: 'video',
      name: '動画',
      icon: 'fa-solid fa-video',
      description: 'アニメーション、実写など',
      path: '/dashboard/portfolio/upload/video',
      specs: 'MP4 / MOV / AVI / 200MB'
    }
  ]

  if (loading) {
    return (
      <div className={styles.loading}>
        <i className="fa-solid fa-spinner fa-spin"></i>
        <span>読み込み中...</span>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* ヘッダー */}
      <div className={styles.header}>
        <h1 className={styles.title}>作品をアップロード</h1>
        <p className={styles.subtitle}>
          アップロードするジャンルを選択してください
        </p>
      </div>

      {/* ジャンルカード */}
      <div className={styles.grid}>
        {genres.map((genre) => (
          <Link
            key={genre.id}
            href={genre.path}
            className={styles.card}
          >
            {/* アイコン */}
            <div className={styles.cardIcon}>
              <i className={genre.icon}></i>
            </div>

            {/* ジャンル名 */}
            <h2 className={styles.cardTitle}>
              {genre.name}
            </h2>

            {/* 説明 */}
            <p className={styles.cardDesc}>
              {genre.description}
            </p>

            {/* スペック */}
            <div className={styles.cardSpecs}>
              {genre.specs}
            </div>
          </Link>
        ))}
      </div>

      {/* 補足情報 */}
      <div className={styles.infoBox}>
        <i className="fa-solid fa-circle-info"></i>
        <div className={styles.infoContent}>
          <h3 className={styles.infoTitle}>アップロードに関する注意事項</h3>
          <ul className={styles.infoList}>
            <li>画像ファイル: JPEG、PNG、GIF形式に対応（最大32MB）</li>
            <li>音声・動画: ファイルアップロードまたは外部リンクに対応</li>
            <li>公開設定: 全体公開、フォロワー限定、非公開から選択</li>
          </ul>
        </div>
      </div>
    </div>
  )
}