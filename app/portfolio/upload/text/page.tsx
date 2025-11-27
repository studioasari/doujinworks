'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import DashboardSidebar from '../../../components/DashboardSidebar'

export default function UploadTextPage() {
  const [title, setTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [wordCount, setWordCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    setWordCount(textContent.length)
  }, [textContent])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      alert('タイトルは必須です')
      return
    }

    if (!textContent.trim()) {
      alert('本文を入力してください')
      return
    }

    if (textContent.length > 100000) {
      alert('本文は100,000文字以内にしてください')
      return
    }

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('ログインが必要です')
        router.push('/login')
        return
      }

      const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []

      const { error: dbError } = await supabase
        .from('portfolio_items')
        .insert({
          creator_id: currentUserId,
          title: title.trim(),
          description: description.trim() || null,
          category: 'text',
          tags: tagsArray,
          text_content: textContent.trim(),
          word_count: textContent.length,
          is_public: isPublic
        })

      if (dbError) {
        throw dbError
      }

      alert('小説・テキストをアップロードしました！')
      router.push('/portfolio/manage')
    } catch (error) {
      console.error('アップロードエラー:', error)
      alert('アップロードに失敗しました')
    } finally {
      setUploading(false)
    }
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
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* 戻るボタン */}
            <Link
              href="/portfolio/upload"
              className="text-small text-gray"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                marginBottom: '24px'
              }}
            >
              ← ジャンル選択に戻る
            </Link>

            <h1 className="page-title mb-40">
              小説・テキストをアップロード
            </h1>

            <form onSubmit={handleSubmit} className="card-no-hover p-40">
              {/* タイトル */}
              <div className="mb-24">
                <label className="form-label">
                  タイトル <span className="form-required">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="小説・テキストのタイトル"
                  required
                  className="input-field"
                />
              </div>

              {/* 本文 */}
              <div className="mb-24">
                <div className="flex-between mb-8">
                  <label className="form-label">
                    本文 <span className="form-required">*</span>
                  </label>
                  <span className="text-small text-gray">
                    {wordCount.toLocaleString()} / 100,000 文字
                  </span>
                </div>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="本文を入力してください"
                  rows={20}
                  required
                  className="textarea-field"
                  style={{
                    fontFamily: "'游明朝', 'Yu Mincho', serif",
                    fontSize: '16px',
                    lineHeight: '2'
                  }}
                />
              </div>

              {/* あらすじ・説明 */}
              <div className="mb-24">
                <label className="form-label">あらすじ・説明</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="作品のあらすじや説明を入力してください"
                  rows={4}
                  className="textarea-field"
                />
              </div>

              {/* タグ */}
              <div className="mb-24">
                <label className="form-label">タグ</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="タグをカンマ区切りで入力 (例: ファンタジー, 恋愛, 短編)"
                  className="input-field"
                />
              </div>

              {/* 公開設定 */}
              <div className="mb-32">
                <label 
                  className="flex gap-12" 
                  style={{
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      accentColor: '#1A1A1A'
                    }}
                  />
                  <span className="text-small">
                    この作品を公開する
                  </span>
                </label>
              </div>

              {/* ボタン */}
              <div className="flex gap-16" style={{ justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => router.push('/portfolio/upload')}
                  disabled={uploading}
                  className="btn-secondary"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={uploading || wordCount > 100000}
                  className="btn-primary"
                >
                  {uploading ? 'アップロード中...' : 'アップロード'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}