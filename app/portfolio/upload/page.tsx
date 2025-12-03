'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import DashboardSidebar from '../../components/DashboardSidebar'

type Genre = {
  id: string
  name: string
  icon: string
  description: string
  path: string
  specs: string
}

export default function UploadSelectPage() {
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        setCurrentUserId(profile.id)
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
      path: '/portfolio/upload/illustration',
      specs: 'JPEG / PNG / GIF / 32MB'
    },
    {
      id: 'manga',
      name: 'マンガ',
      icon: 'fas fa-book',
      description: '複数ページのマンガ作品',
      path: '/portfolio/upload/manga',
      specs: 'JPEG / PNG / GIF / 32MB × 最大50ページ'
    },
    {
      id: 'novel',
      name: '小説',
      icon: 'fas fa-file-alt',
      description: '小説、エッセイ、詩など',
      path: '/portfolio/upload/novel',
      specs: '最大100,000文字'
    },
    {
      id: 'music',
      name: '音楽',
      icon: 'fas fa-music',
      description: 'オリジナル楽曲やカバーなど',
      path: '/portfolio/upload/music',
      specs: 'MP3 / WAV / 20MB'
    },
    {
      id: 'voice',
      name: 'ボイス',
      icon: 'fas fa-microphone',
      description: 'ボイスドラマ、朗読など',
      path: '/portfolio/upload/voice',
      specs: 'MP3 / WAV / 20MB'
    },
    {
      id: 'video',
      name: '動画',
      icon: 'fas fa-video',
      description: 'アニメーション、実写など',
      path: '/portfolio/upload/video',
      specs: 'MP4 / MOV / AVI / 200MB'
    }
  ]

  if (!currentUserId) {
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

  return (
    <>
      <Header />
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'flex-start'
      }}>
        <DashboardSidebar />

        <main style={{ 
          flex: 1, 
          padding: '40px',
          width: '100%',
          maxWidth: '100%',
          minHeight: '100vh'
        }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* 戻るボタン */}
            <Link
              href="/dashboard"
              className="text-small text-gray"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                marginBottom: '24px'
              }}
            >
              ← ダッシュボードに戻る
            </Link>

            {/* ヘッダー */}
            <div className="mb-32">
              <h1 className="page-title mb-8">
                作品をアップロード
              </h1>
              <p className="text-small text-gray">
                アップロードするジャンルを選択してください
              </p>
            </div>

            {/* ジャンルカード */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '40px'
            }}>
              {genres.map((genre) => (
                <Link
                  key={genre.id}
                  href={genre.path}
                  className="card"
                  style={{
                    padding: '24px',
                    textDecoration: 'none'
                  }}
                >
                  {/* アイコン */}
                  <div style={{
                    fontSize: '28px',
                    color: '#1A1A1A',
                    marginBottom: '12px'
                  }}>
                    <i className={genre.icon}></i>
                  </div>

                  {/* ジャンル名 */}
                  <h2 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#1A1A1A',
                    marginBottom: '6px'
                  }}>
                    {genre.name}
                  </h2>

                  {/* 説明 */}
                  <p style={{
                    fontSize: '13px',
                    color: '#6B6B6B',
                    marginBottom: '12px'
                  }}>
                    {genre.description}
                  </p>

                  {/* スペック */}
                  <div style={{
                    fontSize: '11px',
                    color: '#999999'
                  }}>
                    {genre.specs}
                  </div>
                </Link>
              ))}
            </div>

            {/* 補足情報 */}
            <div className="card-no-hover" style={{ padding: '24px' }}>
              <h3 className="form-label mb-12">
                アップロードに関する注意事項
              </h3>
              <ul style={{
                fontSize: '14px',
                color: '#6B6B6B',
                lineHeight: '1.8',
                paddingLeft: '20px'
              }}>
                <li>画像ファイル: JPEG、PNG、GIF形式に対応（最大32MB）</li>
                <li>音声・動画: ファイルアップロードまたは外部リンクに対応</li>
                <li>公開設定: 全体公開、フォロワー限定、非公開から選択</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}