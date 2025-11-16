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
      router.push('/login')
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
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#1A1A1A',
            marginBottom: '40px'
          }}>
            新規依頼を作成
          </h1>

          <form onSubmit={handleSubmit} style={{
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            padding: '40px'
          }}>
            {/* タイトル */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1A1A1A',
                marginBottom: '8px'
              }}>
                タイトル <span style={{ color: '#FF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: イラスト制作の依頼"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '4px',
                  fontSize: '16px',
                  color: '#1A1A1A'
                }}
              />
            </div>

            {/* カテゴリ */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1A1A1A',
                marginBottom: '8px'
              }}>
                カテゴリ
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '4px',
                  fontSize: '16px',
                  color: '#1A1A1A',
                  backgroundColor: '#FFFFFF'
                }}
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
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1A1A1A',
                marginBottom: '8px'
              }}>
                依頼内容 <span style={{ color: '#FF4444' }}>*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="依頼内容を詳しく記載してください"
                required
                rows={8}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '4px',
                  fontSize: '16px',
                  color: '#1A1A1A',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* 予算 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1A1A1A',
                marginBottom: '8px'
              }}>
                予算
              </label>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="最低金額"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #E5E5E5',
                      borderRadius: '4px',
                      fontSize: '16px',
                      color: '#1A1A1A'
                    }}
                  />
                </div>
                <span style={{ color: '#6B6B6B' }}>〜</span>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="最高金額"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #E5E5E5',
                      borderRadius: '4px',
                      fontSize: '16px',
                      color: '#1A1A1A'
                    }}
                  />
                </div>
                <span style={{ color: '#6B6B6B' }}>円</span>
              </div>
            </div>

            {/* 納期 */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1A1A1A',
                marginBottom: '8px'
              }}>
                希望納期
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '4px',
                  fontSize: '16px',
                  color: '#1A1A1A'
                }}
              />
            </div>

            {/* ボタン */}
            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => router.back()}
                disabled={submitting}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #E5E5E5',
                  borderRadius: '4px',
                  backgroundColor: '#FFFFFF',
                  color: '#1A1A1A',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: submitting ? '#6B6B6B' : '#1A1A1A',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
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