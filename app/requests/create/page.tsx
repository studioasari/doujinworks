'use client'

import { useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

export default function CreateRequestPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [deadline, setDeadline] = useState('')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
    } else {
      // profilesテーブルから profile.id を取得
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

    if (!title.trim() || !description.trim()) {
      alert('タイトルと説明は必須です')
      return
    }

    setSubmitting(true)

    const { data, error } = await supabase
      .from('requests')
      .insert({
        client_id: currentUserId,
        title: title.trim(),
        description: description.trim(),
        budget_min: budgetMin ? parseInt(budgetMin) : null,
        budget_max: budgetMax ? parseInt(budgetMax) : null,
        deadline: deadline || null,
        category: category || null,
        status: 'open'
      })
      .select()
      .single()

    if (error) {
      console.error('依頼作成エラー:', error)
      alert('依頼の作成に失敗しました')
      setSubmitting(false)
    } else {
      alert('依頼を作成しました！')
      router.push('/requests')
    }
  }

  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <div className="container-narrow">
          <h1 className="page-title mb-40">
            新規依頼を作成
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
                placeholder="例: イラスト制作の依頼"
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
                <option value="other">その他</option>
              </select>
            </div>

            {/* 説明 */}
            <div className="mb-24">
              <label className="form-label">
                依頼内容 <span className="form-required">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="依頼内容を詳しく記載してください"
                required
                rows={8}
                className="textarea-field"
              />
            </div>

            {/* 予算 */}
            <div className="mb-24">
              <label className="form-label">予算</label>
              <div className="flex gap-16" style={{ alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="最低金額"
                    min="0"
                    className="input-field"
                  />
                </div>
                <span className="text-gray">〜</span>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="最高金額"
                    min="0"
                    className="input-field"
                  />
                </div>
                <span className="text-gray">円</span>
              </div>
            </div>

            {/* 納期 */}
            <div className="mb-32">
              <label className="form-label">希望納期</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input-field"
              />
            </div>

            {/* ボタン */}
            <div className="flex gap-16" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => router.back()}
                disabled={submitting}
                className="btn-secondary"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? '作成中...' : '依頼を作成'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  )
}