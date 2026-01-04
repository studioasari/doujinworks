'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingScreen from '../../components/LoadingScreen'
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
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        setCurrentUserId(profile.id)
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

  if (loading) {
    return <LoadingScreen message="読み込み中..." />
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
          minHeight: '100vh',
          backgroundColor: '#F5F6F8'
        }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* ヘッダー */}
            <div className="mb-40">
              <h1 className="page-title mb-8">
                作品をアップロード
              </h1>
              <p style={{
                fontSize: '14px',
                color: '#555555'
              }}>
                アップロードするジャンルを選択してください
              </p>
            </div>

            {/* ジャンルカード */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
              marginBottom: '40px'
            }}>
              {genres.map((genre) => (
                <Link
                  key={genre.id}
                  href={genre.path}
                  className="card"
                  style={{
                    padding: '32px',
                    textDecoration: 'none'
                  }}
                >
                  {/* アイコン */}
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: '#EAF0F5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px'
                  }}>
                    <i 
                      className={genre.icon}
                      style={{
                        fontSize: '24px',
                        color: '#5B7C99'
                      }}
                    ></i>
                  </div>

                  {/* ジャンル名 */}
                  <h2 className="card-title mb-8">
                    {genre.name}
                  </h2>

                  {/* 説明 */}
                  <p style={{
                    fontSize: '14px',
                    color: '#555555',
                    marginBottom: '16px',
                    lineHeight: '1.6'
                  }}>
                    {genre.description}
                  </p>

                  {/* スペック */}
                  <div style={{
                    fontSize: '12px',
                    color: '#888888',
                    paddingTop: '12px',
                    borderTop: '1px solid #EEF0F3'
                  }}>
                    {genre.specs}
                  </div>
                </Link>
              ))}
            </div>

            {/* 補足情報 */}
            <div className="card-no-hover" style={{ padding: '32px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#EAF0F5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <i className="fas fa-info-circle" style={{
                    fontSize: '18px',
                    color: '#5B7C99'
                  }}></i>
                </div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#222222',
                  margin: 0
                }}>
                  アップロードに関する注意事項
                </h3>
              </div>
              <ul style={{
                fontSize: '14px',
                color: '#555555',
                lineHeight: '1.8',
                paddingLeft: '52px',
                margin: 0,
                listStyleType: 'disc'
              }}>
                <li style={{ marginBottom: '8px' }}>
                  画像ファイル: JPEG、PNG、GIF形式に対応（最大32MB）
                </li>
                <li style={{ marginBottom: '8px' }}>
                  音声・動画: ファイルアップロードまたは外部リンクに対応
                </li>
                <li>
                  公開設定: 全体公開、フォロワー限定、非公開から選択
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>
      <Footer />
      
      <style jsx global>{`
        @media (max-width: 768px) {
          main[style*="padding: 40px"] {
            padding: 24px 16px !important;
          }
          
          .page-title {
            font-size: 24px !important;
          }
          
          .mb-40 {
            margin-bottom: 24px !important;
          }
          
          div[style*="gridTemplateColumns: repeat(auto-fit, minmax(300px, 1fr))"] {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            margin-bottom: 24px !important;
          }
          
          .card[style*="padding: 32px"] {
            padding: 24px !important;
          }
          
          .card div[style*="width: 56px"] {
            width: 48px !important;
            height: 48px !important;
            margin-bottom: 16px !important;
          }
          
          .card div[style*="width: 56px"] i {
            font-size: 20px !important;
          }
          
          .card-no-hover[style*="padding: 32px"] {
            padding: 24px !important;
          }
          
          .card-no-hover div[style*="width: 40px"] {
            width: 36px !important;
            height: 36px !important;
          }
          
          .card-no-hover ul {
            padding-left: 48px !important;
          }
        }
      `}</style>
    </>
  )
}