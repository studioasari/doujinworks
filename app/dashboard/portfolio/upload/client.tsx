'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { LoadingSpinner } from '@/app/components/Skeleton'
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

  useEffect(() => {
    loadAuth()
  }, [])

  async function loadAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('user_id', user.id)
      .single()
    
    if (profile) {
      setCurrentUserId(profile.id)
      setAccountType(profile.account_type)
    }

    setLoading(false)
  }

  const genres: Genre[] = [
    {
      id: 'illustration',
      name: 'イラスト',
      icon: 'fa-solid fa-image',
      description: '1枚絵のイラスト作品',
      path: '/dashboard/portfolio/upload/illustration',
      specs: 'JPEG / PNG / GIF'
    },
    {
      id: 'manga',
      name: 'マンガ',
      icon: 'fa-solid fa-book',
      description: '複数ページのマンガ作品',
      path: '/dashboard/portfolio/upload/manga',
      specs: 'JPEG / PNG / GIF'
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
      specs: 'MP3 / WAV'
    },
    {
      id: 'voice',
      name: '音声',
      icon: 'fa-solid fa-microphone',
      description: 'ASMR、ボイスドラマ、朗読など',
      path: '/dashboard/portfolio/upload/voice',
      specs: 'MP3 / WAV'
    },
    {
      id: 'video',
      name: '動画',
      icon: 'fa-solid fa-video',
      description: 'アニメーション、実写など',
      path: '/dashboard/portfolio/upload/video',
      specs: 'MP4 / MOV / AVI'
    }
  ]

  if (loading) {
    return <LoadingSpinner />
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
            <div className={styles.cardIcon}>
              <i className={genre.icon}></i>
            </div>
            <div className={styles.cardBody}>
              <h2 className={styles.cardTitle}>{genre.name}</h2>
              <p className={styles.cardDesc}>{genre.description}</p>
              <span className={styles.cardSpecs}>{genre.specs}</span>
            </div>
            <i className={`fa-solid fa-chevron-right ${styles.cardArrow}`}></i>
          </Link>
        ))}
      </div>

      {/* 補足情報 */}
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation alert-icon"></i>
        <span>
          対応形式: 画像（JPEG / PNG / GIF / 最大32MB）、音声（MP3 / WAV / 20MB）、動画（MP4 / MOV / 200MB）。公開設定は全体公開・フォロワー限定・非公開から選択できます。
        </span>
      </div>
    </div>
  )
}