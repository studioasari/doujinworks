'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

export default function UploadPortfolioPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [isPublic, setIsPublic] = useState(true)
  const [uploading, setUploading] = useState(false)
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

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB制限
        alert('ファイルサイズは5MB以下にしてください')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください')
        return
      }

      setImageFile(file)
      
      // プレビュー生成
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      alert('タイトルは必須です')
      return
    }

    if (!imageFile) {
      alert('画像を選択してください')
      return
    }

    setUploading(true)

    try {
      // 認証ユーザーのUIDを取得
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('ログインが必要です')
        router.push('/login')
        return
      }

      // 1. 画像をStorageにアップロード（auth.uid()を使用）
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('portfolio-images')
        .upload(fileName, imageFile)

      if (uploadError) {
        throw uploadError
      }

      // 2. 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-images')
        .getPublicUrl(fileName)

      // 3. データベースに保存
      const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []

      const { error: dbError } = await supabase
        .from('portfolio_items')
        .insert({
          creator_id: currentUserId,
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          tags: tagsArray,
          image_url: publicUrl,
          thumbnail_url: publicUrl,
          external_url: externalUrl.trim() || null,
          is_public: isPublic
        })

      if (dbError) {
        throw dbError
      }

      alert('作品をアップロードしました！')
      router.push('/portfolio')
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
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow">
          <h1 className="page-title mb-40">
            作品をアップロード
          </h1>

          <form onSubmit={handleSubmit} className="card-no-hover p-40">
            {/* 画像アップロード */}
            <div className="mb-32">
              <label className="form-label">
                作品画像 <span className="form-required">*</span>
              </label>
              
              {imagePreview ? (
                <div className="mb-16">
                  <img
                    src={imagePreview}
                    alt="プレビュー"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '400px',
                      borderRadius: '8px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  border: '2px dashed #E5E5E5',
                  borderRadius: '8px',
                  padding: '60px 20px',
                  textAlign: 'center',
                  marginBottom: '16px',
                  backgroundColor: '#F9F9F9'
                }}>
                  <p className="text-gray mb-8">
                    画像をドラッグ&ドロップ または クリックして選択
                  </p>
                  <p className="text-tiny" style={{ color: '#9E9E9E' }}>
                    JPG, PNG, GIF (最大5MB)
                  </p>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="input-field"
                style={{ fontSize: '14px' }}
              />
            </div>

            {/* タイトル */}
            <div className="mb-24">
              <label className="form-label">
                タイトル <span className="form-required">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="作品のタイトル"
                required
                className="input-field"
              />
            </div>

            {/* カテゴリ */}
            <div className="mb-24">
              <label className="form-label">カテゴリ</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="select-field"
              >
                <option value="">選択してください</option>
                <option value="illustration">イラスト</option>
                <option value="manga">漫画</option>
                <option value="novel">小説</option>
                <option value="music">音楽</option>
                <option value="voice">ボイス</option>
                <option value="video">動画</option>
                <option value="game">ゲーム</option>
                <option value="3d">3Dモデル</option>
                <option value="other">その他</option>
              </select>
            </div>

            {/* 説明 */}
            <div className="mb-24">
              <label className="form-label">説明</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="作品の説明を入力してください"
                rows={6}
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
                placeholder="タグをカンマ区切りで入力 (例: オリジナル, ファンタジー, 女の子)"
                className="input-field"
              />
            </div>

            {/* 外部URL */}
            <div className="mb-24">
              <label className="form-label">外部リンク</label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://pixiv.net/..."
                className="input-field"
              />
            </div>

            {/* 公開設定 */}
            <div className="mb-32">
              <label className="flex gap-8" style={{
                alignItems: 'center',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
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
                onClick={() => router.back()}
                disabled={uploading}
                className="btn-secondary"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="btn-primary"
              >
                {uploading ? 'アップロード中...' : 'アップロード'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  )
}