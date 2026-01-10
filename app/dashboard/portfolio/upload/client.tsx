'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import DashboardSidebar from '@/app/components/DashboardSidebar'

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
        alert('プロフィールが見つかりません')
        router.push('/profile')
      }
    }
  }

  const genres: Genre[] = [
    {
      id: 'illustration',
      name: 'イラスト',
      icon: 'fas fa-image',
      description: '1枚絵のイラスト作品',
      path: '/dashboard/portfolio/upload/illustration',
      specs: 'JPEG / PNG / GIF / 32MB'
    },
    {
      id: 'manga',
      name: 'マンガ',
      icon: 'fas fa-book',
      description: '複数ページのマンガ作品',
      path: '/dashboard/portfolio/upload/manga',
      specs: 'JPEG / PNG / GIF / 32MB × 最大50ページ'
    },
    {
      id: 'novel',
      name: '小説',
      icon: 'fas fa-file-alt',
      description: '小説、エッセイ、詩など',
      path: '/dashboard/portfolio/upload/novel',
      specs: '最大100,000文字'
    },
    {
      id: 'music',
      name: '音楽',
      icon: 'fas fa-music',
      description: 'オリジナル楽曲やカバーなど',
      path: '/dashboard/portfolio/upload/music',
      specs: 'MP3 / WAV / 20MB'
    },
    {
      id: 'voice',
      name: 'ボイス',
      icon: 'fas fa-microphone',
      description: 'ボイスドラマ、朗読など',
      path: '/dashboard/portfolio/upload/voice',
      specs: 'MP3 / WAV / 20MB'
    },
    {
      id: 'video',
      name: '動画',
      icon: 'fas fa-video',
      description: 'アニメーション、実写など',
      path: '/dashboard/portfolio/upload/video',
      specs: 'MP4 / MOV / AVI / 200MB'
    }
  ]

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      
      <div className="upload-select-page">
        <DashboardSidebar accountType={accountType} />

        {loading ? (
          <div className="upload-select-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <span>読み込み中...</span>
          </div>
        ) : (
          <main className="upload-select-main">
            <div className="upload-select-container">
              {/* ヘッダー */}
              <div className="upload-select-header">
                <h1 className="upload-select-title">作品をアップロード</h1>
                <p className="upload-select-subtitle">
                  アップロードするジャンルを選択してください
                </p>
              </div>

              {/* ジャンルカード */}
              <div className="upload-select-grid">
                {genres.map((genre) => (
                  <Link
                    key={genre.id}
                    href={genre.path}
                    className="upload-select-card"
                  >
                    {/* アイコン */}
                    <div className="upload-select-icon">
                      <i className={genre.icon}></i>
                    </div>

                    {/* ジャンル名 */}
                    <h2 className="upload-select-card-title">
                      {genre.name}
                    </h2>

                    {/* 説明 */}
                    <p className="upload-select-card-desc">
                      {genre.description}
                    </p>

                    {/* スペック */}
                    <div className="upload-select-card-specs">
                      {genre.specs}
                    </div>
                  </Link>
                ))}
              </div>

              {/* 補足情報 */}
              <div className="upload-select-info">
                <div className="upload-select-info-header">
                  <div className="upload-select-info-icon">
                    <i className="fas fa-info-circle"></i>
                  </div>
                  <h3 className="upload-select-info-title">
                    アップロードに関する注意事項
                  </h3>
                </div>
                <ul className="upload-select-info-list">
                  <li>画像ファイル: JPEG、PNG、GIF形式に対応（最大32MB）</li>
                  <li>音声・動画: ファイルアップロードまたは外部リンクに対応</li>
                  <li>公開設定: 全体公開、フォロワー限定、非公開から選択</li>
                </ul>
              </div>
            </div>
          </main>
        )}
      </div>

      <Footer />
    </>
  )
}