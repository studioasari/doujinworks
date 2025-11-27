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
      description: '1枚のイラスト作品',
      path: '/portfolio/upload/illustration'
    },
    {
      id: 'manga',
      name: 'マンガ',
      icon: 'fas fa-book',
      description: '複数ページの漫画作品',
      path: '/portfolio/upload/manga'
    },
    {
      id: 'text',
      name: '小説・テキスト',
      icon: 'fas fa-file-alt',
      description: '小説、エッセイ、詩など',
      path: '/portfolio/upload/text'
    },
    {
      id: 'music',
      name: '音楽',
      icon: 'fas fa-music',
      description: 'オリジナル楽曲、BGMなど',
      path: '/portfolio/upload/music'
    },
    {
      id: 'voice',
      name: 'ボイス',
      icon: 'fas fa-microphone',
      description: 'ボイスドラマ、ナレーションなど',
      path: '/portfolio/upload/voice'
    },
    {
      id: 'video',
      name: '動画',
      icon: 'fas fa-video',
      description: 'アニメーション、MV、実写など',
      path: '/portfolio/upload/video'
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
            <div className="mb-40">
              <h1 className="page-title mb-12">
                ポートフォリオをアップロード
              </h1>
              <p className="text-small text-gray">
                どのジャンルの作品をアップロードしますか？
              </p>
            </div>

            {/* ジャンルカード */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px'
            }}>
              {genres.map((genre) => (
                <Link
                  key={genre.id}
                  href={genre.path}
                  className="card"
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    textDecoration: 'none'
                  }}
                >
                  {/* アイコン */}
                  <div style={{
                    fontSize: '48px',
                    color: '#1A1A1A',
                    marginBottom: '16px'
                  }}>
                    <i className={genre.icon}></i>
                  </div>

                  {/* ジャンル名 */}
                  <h2 className="card-title mb-8">
                    {genre.name}
                  </h2>

                  {/* 説明 */}
                  <p className="text-small text-gray">
                    {genre.description}
                  </p>
                </Link>
              ))}
            </div>

            {/* 補足情報 */}
            <div className="info-box" style={{ marginTop: '40px' }}>
              <h3 className="form-label mb-12">
                <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                アップロードに関する注意事項
              </h3>
              <ul style={{
                fontSize: '14px',
                color: '#6B6B6B',
                lineHeight: '1.8',
                paddingLeft: '20px'
              }}>
                <li>イラスト・マンガ: 1枚あたり最大5MB</li>
                <li>小説・テキスト: 最大100,000文字</li>
                <li>音楽: 最大20MB（約7〜10分）</li>
                <li>ボイス: 最大10MB（約3〜5分）</li>
                <li>動画: 最大100MB（約2〜3分）</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}aa