'use client'

import { use, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import '../../globals.css'
import { supabase } from '@/utils/supabase'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

// 型定義（実際のDBスキーマに合わせる）
type PortfolioItem = {
  id: string
  creator_id: string
  title: string
  description: string | null
  category: string | null
  tags: string[] | null
  image_url: string | null
  image_urls: string[] | null
  thumbnail_url: string | null
  external_url: string | null
  is_public: boolean
  view_count: number
  text_content: string | null
  word_count: number
  audio_url: string | null
  audio_duration: number | null
  video_url: string | null
  video_duration: number | null
  page_count: number | null
  rating: string
  is_original: boolean
  allow_comments: boolean
  created_at: string
  updated_at: string
}

type PortfolioItemWithStats = PortfolioItem & {
  likeCount: number
  commentCount: number
  isLiked: boolean
}

type Comment = {
  id: string
  portfolio_item_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  parent_comment_id: string | null
  user: {
    username: string
    display_name: string
    avatar_url: string | null
  }
  likeCount: number
  isLiked: boolean
  replies?: Comment[]
}

type Creator = {
  id: string
  user_id: string
  username: string
  display_name: string
  account_type: string | null
  job_title: string | null
  can_receive_work: boolean
  can_request_work: boolean
  avatar_url: string | null
  bio: string | null
  website_url: string | null
  twitter_url: string | null
  pixiv_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  header_url: string | null
  created_at: string
  updated_at: string
  followerCount: number
  followingCount: number
  workCount: number
  isFollowing: boolean
}

const CATEGORY_LABELS: { [key: string]: string } = {
  illustration: 'イラスト',
  manga: 'マンガ',
  novel: '小説',
  music: '音楽',
  voice: 'ボイス',
  video: '動画'
}

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

async function attachStatsToWorks(
  works: PortfolioItem[],
  userId: string | null
): Promise<PortfolioItemWithStats[]> {
  const ids = works.map(w => w.id)
  if (ids.length === 0) return []

  const [{ data: likes }, { data: comments }, { data: userLikes }] = await Promise.all([
    supabase.from('portfolio_likes').select('portfolio_item_id').in('portfolio_item_id', ids),
    supabase.from('comments').select('portfolio_item_id').in('portfolio_item_id', ids),
    userId
      ? supabase.from('portfolio_likes').select('portfolio_item_id').eq('user_id', userId).in('portfolio_item_id', ids)
      : Promise.resolve({ data: [] })
  ])

  const likeMap = new Map()
  likes?.forEach(l => likeMap.set(l.portfolio_item_id, (likeMap.get(l.portfolio_item_id) || 0) + 1))

  const commentMap = new Map()
  comments?.forEach(c => commentMap.set(c.portfolio_item_id, (commentMap.get(c.portfolio_item_id) || 0) + 1))

  const likedSet = new Set(userLikes?.map(l => l.portfolio_item_id) || [])

  return works.map(w => ({
    ...w,
    likeCount: likeMap.get(w.id) || 0,
    commentCount: commentMap.get(w.id) || 0,
    isLiked: likedSet.has(w.id)
  }))
}

export default function WorkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params)
  const router = useRouter()
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [work, setWork] = useState<PortfolioItemWithStats | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [authorWorks, setAuthorWorks] = useState<PortfolioItemWithStats[]>([])
  const [relatedWorks, setRelatedWorks] = useState<PortfolioItemWithStats[]>([])
  const [loading, setLoading] = useState(true)
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyingToUsername, setReplyingToUsername] = useState<string>('')
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false)
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [unwrappedParams.id])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (isShareDropdownOpen && !target.closest('.share-dropdown-container')) {
        setIsShareDropdownOpen(false)
      }
    }
    if (isShareDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isShareDropdownOpen])

  async function loadData() {
    setLoading(true)
    try {
      const userId = await getCurrentUserId()
      setCurrentUserId(userId)
      await loadWorkData(userId)
      await incrementViewCount()
    } catch (error) {
      console.error('データ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadWorkData(userId: string | null) {
    const { data: workData, error: workError } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('id', unwrappedParams.id)
      .single()

    if (workError || !workData) {
      console.error('作品取得エラー:', workError)
      return
    }

    const [
      { count: likeCount },
      { count: commentCount },
      { data: likeData }
    ] = await Promise.all([
      supabase.from('portfolio_likes').select('*', { count: 'exact', head: true }).eq('portfolio_item_id', unwrappedParams.id),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('portfolio_item_id', unwrappedParams.id),
      userId ? supabase.from('portfolio_likes').select('*').eq('portfolio_item_id', unwrappedParams.id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null })
    ])

    const workWithStats: PortfolioItemWithStats = {
      ...workData,
      likeCount: likeCount || 0,
      commentCount: commentCount || 0,
      isLiked: !!likeData
    }

    setWork(workWithStats)

    await Promise.all([
      loadCreatorData(workData.creator_id, userId),
      loadComments(userId),
      loadAuthorWorks(workData.creator_id, userId),
      loadRelatedWorks(workData.tags, workData.creator_id, userId)
    ])
  }

  async function loadCreatorData(creatorId: string, userId: string | null) {
    const [
      { data: profileData, error: profileError },
      { count: followerCount },
      { count: followingCount },
      { count: workCount },
      { data: followData }
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', creatorId).maybeSingle(),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', creatorId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', creatorId),
      supabase.from('portfolio_items').select('*', { count: 'exact', head: true }).eq('creator_id', creatorId).eq('is_public', true),
      userId ? supabase.from('follows').select('*').eq('follower_id', userId).eq('following_id', creatorId).maybeSingle() : Promise.resolve({ data: null })
    ])

    if (profileError) {
      console.error('作者情報取得エラー:', profileError)
      return
    }

    if (!profileData) {
      setCreator({
        id: creatorId, user_id: creatorId, username: 'unknown', display_name: '不明なクリエイター',
        account_type: null, job_title: null, can_receive_work: false, can_request_work: false,
        avatar_url: null, bio: null, website_url: null, twitter_url: null, pixiv_url: null,
        instagram_url: null, youtube_url: null, header_url: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        followerCount: 0, followingCount: 0, workCount: 0, isFollowing: false
      })
      return
    }

    setCreator({
      ...profileData,
      followerCount: followerCount || 0,
      followingCount: followingCount || 0,
      workCount: workCount || 0,
      isFollowing: !!followData
    })
  }

  async function loadComments(userId: string | null) {
    const { data: commentsData, error } = await supabase
      .from('comments')
      .select(`*, user:profiles!comments_user_id_fkey (username, display_name, avatar_url)`)
      .eq('portfolio_item_id', unwrappedParams.id)
      .order('created_at', { ascending: true })

    if (error) { console.error('コメント取得エラー:', error); return }

    const commentIds = (commentsData || []).map(c => c.id)
    if (commentIds.length === 0) { setComments([]); return }

    const [{ data: likeRows }, { data: userLikes }] = await Promise.all([
      supabase.from('comment_likes').select('comment_id').in('comment_id', commentIds),
      userId ? supabase.from('comment_likes').select('comment_id').eq('user_id', userId).in('comment_id', commentIds) : Promise.resolve({ data: [] })
    ])

    const likeCountMap = new Map<string, number>()
    likeRows?.forEach(row => likeCountMap.set(row.comment_id, (likeCountMap.get(row.comment_id) || 0) + 1))

    const likedSet = new Set(userLikes?.map(l => l.comment_id) || [])

    const commentsWithStats = commentsData.map(comment => ({
      ...comment,
      likeCount: likeCountMap.get(comment.id) || 0,
      isLiked: likedSet.has(comment.id),
      replies: [] as Comment[]
    }))

    const commentsMap = new Map<string, Comment>()
    commentsWithStats.forEach(comment => commentsMap.set(comment.id, comment))

    const topLevelComments: Comment[] = []
    commentsWithStats.forEach(comment => {
      if (!comment.parent_comment_id) {
        topLevelComments.push(comment)
      } else {
        const parent = commentsMap.get(comment.parent_comment_id)
        if (parent) {
          if (!parent.replies) parent.replies = []
          parent.replies.push(comment)
        }
      }
    })

    topLevelComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setComments(topLevelComments)
  }

  async function loadAuthorWorks(creatorId: string, userId: string | null) {
    const { data } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('is_public', true)
      .neq('id', unwrappedParams.id)
      .order('created_at', { ascending: false })
      .limit(6)

    if (data) setAuthorWorks(await attachStatsToWorks(data, userId))
  }

  async function loadRelatedWorks(tags: string[] | null, currentCreatorId: string, userId: string | null) {
    if (!tags || tags.length === 0) { setRelatedWorks([]); return }

    const { data } = await supabase
      .from('portfolio_items')
      .select('*')
      .neq('creator_id', currentCreatorId)
      .neq('id', unwrappedParams.id)
      .eq('is_public', true)
      .overlaps('tags', tags)
      .order('created_at', { ascending: false })
      .limit(6)

    if (data) setRelatedWorks(await attachStatsToWorks(data, userId))
  }

  async function incrementViewCount() {
    await supabase.rpc('increment_view_count', { item_id: unwrappedParams.id })
  }

  async function handleLike() {
    if (!currentUserId) {
      if (confirm('いいねするにはログインが必要です。ログインページに移動しますか？')) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      }
      return
    }
    if (!work) return

    try {
      if (work.isLiked) {
        await supabase.from('portfolio_likes').delete().eq('portfolio_item_id', work.id).eq('user_id', currentUserId)
        setWork({ ...work, isLiked: false, likeCount: work.likeCount - 1 })
      } else {
        await supabase.from('portfolio_likes').insert({ portfolio_item_id: work.id, user_id: currentUserId })
        setWork({ ...work, isLiked: true, likeCount: work.likeCount + 1 })
      }
    } catch (error) { console.error('いいね処理エラー:', error) }
  }

  async function handleFollow() {
    if (!currentUserId) {
      if (confirm('フォローするにはログインが必要です。ログインページに移動しますか？')) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      }
      return
    }
    if (!creator) return

    try {
      if (creator.isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', creator.user_id)
        setCreator({ ...creator, isFollowing: false, followerCount: creator.followerCount - 1 })
      } else {
        await supabase.from('follows').insert({ follower_id: currentUserId, following_id: creator.user_id })
        setCreator({ ...creator, isFollowing: true, followerCount: creator.followerCount + 1 })
      }
    } catch (error) { console.error('フォロー処理エラー:', error) }
  }

  function handleShare(platform: 'twitter' | 'facebook' | 'line' | 'copy') {
    const url = `${window.location.origin}/portfolio/${unwrappedParams.id}`
    const text = work?.title || ''

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
        break
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
        break
      case 'line':
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text + ' ' + url)}`, '_blank')
        break
      case 'copy':
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            alert('URLをコピーしました')
            setIsShareDropdownOpen(false)
          }).catch(() => fallbackCopy(url))
        } else {
          fallbackCopy(url)
        }
        break
    }
    if (platform !== 'copy') setIsShareDropdownOpen(false)
  }

  function fallbackCopy(text: string) {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      alert('URLをコピーしました')
      setIsShareDropdownOpen(false)
    } catch { alert('URLのコピーに失敗しました') }
    document.body.removeChild(ta)
  }

  async function handleCommentSubmit() {
    if (!currentUserId) {
      if (confirm('コメントするにはログインが必要です。ログインページに移動しますか？')) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      }
      return
    }
    if (!commentText.trim() || !work) return

    try {
      await supabase.from('comments').insert({
        portfolio_item_id: work.id,
        user_id: currentUserId,
        content: commentText.trim(),
        parent_comment_id: replyingTo
      })
      await loadComments(currentUserId)
      setWork({ ...work, commentCount: work.commentCount + 1 })
      setCommentText('')
      setReplyingTo(null)
      setReplyingToUsername('')
    } catch (error) {
      console.error('コメント投稿エラー:', error)
      alert('コメントの投稿に失敗しました')
    }
  }

  async function handleCommentLike(commentId: string) {
    if (!currentUserId) {
      if (confirm('いいねするにはログインが必要です。ログインページに移動しますか？')) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      }
      return
    }

    const findComment = (list: Comment[], id: string): Comment | null => {
      for (const c of list) {
        if (c.id === id) return c
        if (c.replies) {
          const found = findComment(c.replies, id)
          if (found) return found
        }
      }
      return null
    }

    const comment = findComment(comments, commentId)
    if (!comment) return

    try {
      if (comment.isLiked) {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUserId)
      } else {
        await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: currentUserId })
      }
      await loadComments(currentUserId)
    } catch (error) {
      console.error('コメントいいねエラー:', error)
      alert('いいねに失敗しました')
    }
  }

  async function handleCommentDelete(commentId: string) {
    if (!currentUserId) return
    if (!confirm('このコメントを削除しますか？\n（返信も全て削除されます）\n\nこの操作は取り消せません。')) return

    try {
      await supabase.from('comments').delete().eq('id', commentId).eq('user_id', currentUserId)
      await loadComments(currentUserId)
      if (work) {
        const { count } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('portfolio_item_id', work.id)
        setWork({ ...work, commentCount: count || 0 })
      }
    } catch (error) {
      console.error('コメント削除エラー:', error)
      alert('コメントの削除に失敗しました')
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.abs(now.getTime() - date.getTime())
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) return `${Math.floor(diff / (1000 * 60))}分前`
      return `${hours}時間前`
    } else if (days < 7) {
      return `${days}日前`
    }
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  function getDisplayImages(): string[] {
    if (!work) return []
    if (work.image_urls?.length) return work.image_urls
    if (work.image_url) return [work.image_url]
    return []
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#E8ECEF',
        color: '#888888'
      }}>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
        <p style={{ fontSize: '15px', margin: 0 }}>読み込み中...</p>
      </div>
    )
  }

  if (!work || !creator) {
    return (
      <>
        <Header />
        <div className="detail-error">
          <div className="detail-error-content">
            <h1>作品が見つかりません</h1>
            <Link href="/portfolio" className="btn-primary">作品一覧に戻る</Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const displayImages = getDisplayImages()

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Header />
      <div className="portfolio-detail-page">
        <div className="portfolio-detail-container">
          <div className="portfolio-detail-layout">
            {/* サイドバー */}
            <aside className="portfolio-sidebar">
              <div className="portfolio-sidebar-card">
                {creator.account_type && (
                  <span className="portfolio-sidebar-badge">
                    {creator.account_type === 'casual' ? '一般' : 'ビジネス'}
                  </span>
                )}

                <div className="portfolio-sidebar-avatar">
                  {creator.avatar_url ? (
                    <Image src={creator.avatar_url} alt={creator.display_name} width={100} height={100} />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </div>

                {creator.job_title && <p className="portfolio-sidebar-job">{creator.job_title}</p>}
                <h1 className="portfolio-sidebar-name">{creator.display_name}</h1>
                <p className="portfolio-sidebar-username">@{creator.username}</p>

                {currentUserId !== creator.user_id && (
                  <div className="portfolio-sidebar-actions">
                    <button onClick={() => router.push(`/messages/${creator.username}`)} className="btn-secondary" style={{ fontSize: '13px', padding: '10px 16px' }}>
                      <i className="fas fa-envelope" style={{ marginRight: '6px' }}></i>メッセージ
                    </button>
                    <button
                      onClick={() => {
                        if (creator.isFollowing) {
                          if (confirm(`${creator.display_name}のフォローを解除しますか？`)) handleFollow()
                        } else handleFollow()
                      }}
                      className={creator.isFollowing ? 'btn-secondary' : 'btn-primary'}
                      style={{ fontSize: '13px', padding: '10px 16px' }}
                    >
                      <i className={creator.isFollowing ? 'fas fa-check' : 'fas fa-plus'} style={{ marginRight: '6px' }}></i>
                      {creator.isFollowing ? 'フォロー中' : 'フォロー'}
                    </button>
                  </div>
                )}

                <div className="portfolio-sidebar-stats">
                  <div className="portfolio-sidebar-stat">
                    <div className="portfolio-sidebar-stat-value">{creator.workCount}</div>
                    <div className="portfolio-sidebar-stat-label">作品</div>
                  </div>
                  <div className="portfolio-sidebar-stat">
                    <div className="portfolio-sidebar-stat-value">{creator.followingCount}</div>
                    <div className="portfolio-sidebar-stat-label">フォロー</div>
                  </div>
                  <div className="portfolio-sidebar-stat">
                    <div className="portfolio-sidebar-stat-value">{creator.followerCount}</div>
                    <div className="portfolio-sidebar-stat-label">フォロワー</div>
                  </div>
                </div>

                {creator.bio && (
                  <div style={{ marginBottom: '24px' }}>
                    <h2 className="portfolio-sidebar-bio-title">自己紹介</h2>
                    <p className="portfolio-sidebar-bio">{creator.bio}</p>
                  </div>
                )}

                {(creator.twitter_url || creator.pixiv_url || creator.instagram_url || creator.youtube_url || creator.website_url) && (
                  <div className="portfolio-sidebar-social">
                    {creator.twitter_url && <a href={creator.twitter_url} target="_blank" rel="noopener noreferrer" className="portfolio-social-icon"><i className="fab fa-twitter"></i></a>}
                    {creator.pixiv_url && <a href={creator.pixiv_url} target="_blank" rel="noopener noreferrer" className="portfolio-social-icon"><i className="fas fa-palette"></i></a>}
                    {creator.instagram_url && <a href={creator.instagram_url} target="_blank" rel="noopener noreferrer" className="portfolio-social-icon"><i className="fab fa-instagram"></i></a>}
                    {creator.youtube_url && <a href={creator.youtube_url} target="_blank" rel="noopener noreferrer" className="portfolio-social-icon"><i className="fab fa-youtube"></i></a>}
                    {creator.website_url && <a href={creator.website_url} target="_blank" rel="noopener noreferrer" className="portfolio-social-icon"><i className="fas fa-link"></i></a>}
                  </div>
                )}

                <Link href={`/creators/${creator.username}`} className="detail-sidebar-btn">プロフィールを見る</Link>
              </div>
            </aside>

            {/* メイン */}
            <main className="portfolio-main">
              {/* モバイル用クリエイター */}
              <div className="portfolio-mobile-creator">
                <div className="portfolio-mobile-creator-card">
                  <Link href={`/creators/${creator.username}`}>
                    <div className="portfolio-mobile-avatar">
                      {creator.avatar_url ? (
                        <Image src={creator.avatar_url} alt={creator.display_name} width={48} height={48} />
                      ) : (
                        <i className="fas fa-user" style={{ fontSize: '20px', color: '#888' }}></i>
                      )}
                    </div>
                  </Link>
                  <Link href={`/creators/${creator.username}`} className="portfolio-mobile-info" style={{ textDecoration: 'none' }}>
                    <div className="portfolio-mobile-name">{creator.display_name}</div>
                    <div className="portfolio-mobile-username">@{creator.username}</div>
                  </Link>
                  {currentUserId !== creator.user_id && (
                    <div className="portfolio-mobile-actions">
                      <button onClick={() => router.push(`/messages/${creator.username}`)} className="portfolio-mobile-msg-btn">
                        <i className="fas fa-envelope"></i>
                      </button>
                      <button
                        onClick={() => {
                          if (creator.isFollowing) {
                            if (confirm(`${creator.display_name}のフォローを解除しますか？`)) handleFollow()
                          } else handleFollow()
                        }}
                        className={creator.isFollowing ? 'btn-secondary' : 'btn-primary'}
                        style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '20px' }}
                      >
                        {creator.isFollowing ? 'フォロー中' : 'フォロー'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 作品コンテンツ */}
              <div className="portfolio-image-container">
                {work.category === 'manga' && displayImages.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {displayImages.map((image, index) => (
                      <div key={index} onClick={() => { setCurrentImageIndex(index); setIsImageModalOpen(true) }} style={{ cursor: 'pointer' }}>
                        <Image src={image} alt={`${work.title} - ${index + 1}`} width={1000} height={1414} loading={index === 0 ? 'eager' : 'lazy'} style={{ width: '100%', height: 'auto', display: 'block' }} />
                      </div>
                    ))}
                  </div>
                ) : work.category === 'illustration' && displayImages.length > 0 ? (
                  <div>
                    <div onClick={() => setIsImageModalOpen(true)} style={{ position: 'relative', width: '100%', maxHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: '#EEF0F3' }}>
                      <Image src={displayImages[currentImageIndex]} alt={work.title} width={800} height={600} priority style={{ maxWidth: '100%', maxHeight: '500px', width: 'auto', height: 'auto', objectFit: 'contain' }} />
                      <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-search-plus"></i><span>クリックで拡大</span>
                      </div>
                      {displayImages.length > 1 && (
                        <>
                          {currentImageIndex > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(currentImageIndex - 1) }} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                              <i className="fas fa-chevron-left"></i>
                            </button>
                          )}
                          {currentImageIndex < displayImages.length - 1 && (
                            <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(currentImageIndex + 1) }} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                              <i className="fas fa-chevron-right"></i>
                            </button>
                          )}
                          <div style={{ position: 'absolute', bottom: '20px', right: '20px', background: 'rgba(0,0,0,0.7)', color: '#FFF', padding: '8px 16px', borderRadius: '20px', fontSize: '14px' }}>
                            {currentImageIndex + 1} / {displayImages.length}
                          </div>
                        </>
                      )}
                    </div>
                    {displayImages.length > 1 && (
                      <div style={{ display: 'flex', gap: '12px', padding: '20px', background: '#EEF0F3', overflowX: 'auto' }}>
                        {displayImages.map((image, index) => (
                          <div key={index} onClick={() => setCurrentImageIndex(index)} style={{ width: '100px', height: '100px', flexShrink: 0, cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', opacity: currentImageIndex === index ? 1 : 0.6, boxShadow: currentImageIndex === index ? '0 0 0 3px #5B7C99' : 'none', transition: 'all 0.2s' }}>
                            <Image src={image} alt={`${work.title} - ${index + 1}`} width={100} height={100} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : work.category === 'novel' ? (
                  <div style={{ padding: '0' }}>
                    <div style={{ padding: '40px 40px 32px', borderBottom: '1px solid #D0D5DA', marginBottom: '24px' }}>
                      <h1 style={{ fontSize: '28px', fontWeight: 'bold', lineHeight: '1.4', fontFamily: '"Noto Serif JP", serif' }}>{work.title}</h1>
                    </div>
                    {work.text_content && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '0 40px 40px' }}>
                        {work.text_content.split('───').map((page, index) => (
                          <div key={index} style={{ fontSize: '16px', lineHeight: '2', whiteSpace: 'pre-wrap', fontFamily: '"Noto Serif JP", serif', padding: '40px', border: '1px solid #D0D5DA', borderRadius: '12px', background: '#FFFFFF' }}>
                            {page.trim()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (work.category === 'music' || work.category === 'voice') && work.audio_url ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    {displayImages.length > 0 && (
                      <div style={{ width: '400px', height: '400px', margin: '0 auto 32px', borderRadius: '8px', overflow: 'hidden' }}>
                        <Image src={displayImages[0]} alt={work.title} width={400} height={400} style={{ objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                      <audio controls style={{ width: '100%' }}>
                        <source src={work.audio_url} type="audio/mpeg" />
                      </audio>
                    </div>
                  </div>
                ) : work.category === 'video' && work.video_url ? (
                  <div style={{ background: '#000' }}>
                    <video controls style={{ width: '100%', display: 'block' }}>
                      <source src={work.video_url} type="video/mp4" />
                    </video>
                  </div>
                ) : null}
              </div>

              {/* アクションバー */}
              <div className="portfolio-action-bar">
                <button onClick={handleLike} className={`portfolio-action-btn ${work.isLiked ? 'liked' : ''}`}>
                  <i className={work.isLiked ? 'fas fa-heart' : 'far fa-heart'}></i>
                  いいね {work.likeCount.toLocaleString()}
                </button>
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }} className="share-dropdown-container">
                  <button onClick={(e) => { e.stopPropagation(); setIsShareDropdownOpen(!isShareDropdownOpen) }} className="portfolio-action-btn" style={{ width: '100%' }}>
                    <i className="fas fa-share-alt"></i>共有
                  </button>
                  {isShareDropdownOpen && (
                    <div className="share-dropdown">
                      <button onClick={() => handleShare('twitter')} className="share-dropdown-item"><i className="fab fa-twitter" style={{ color: '#1DA1F2' }}></i>Twitter</button>
                      <button onClick={() => handleShare('facebook')} className="share-dropdown-item"><i className="fab fa-facebook" style={{ color: '#1877F2' }}></i>Facebook</button>
                      <button onClick={() => handleShare('line')} className="share-dropdown-item"><i className="fab fa-line" style={{ color: '#00B900' }}></i>LINE</button>
                      <button onClick={() => handleShare('copy')} className="share-dropdown-item"><i className="fas fa-link" style={{ color: '#888' }}></i>URLをコピー</button>
                    </div>
                  )}
                </div>
              </div>

              {/* 作品情報 */}
              <div className="portfolio-info-card">
                <h1 className="portfolio-info-title">{work.title}</h1>
                <div className="portfolio-info-meta">
                  <span><i className="far fa-eye" style={{ marginRight: '6px' }}></i>{work.view_count.toLocaleString()} 閲覧</span>
                  <span><i className="far fa-calendar" style={{ marginRight: '6px' }}></i>{formatDate(work.created_at)}</span>
                </div>
                {work.description && <p className="portfolio-info-description">{work.description}</p>}
                {work.tags && work.tags.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#888', marginBottom: '12px' }}>タグ</h3>
                    <div className="portfolio-tags">
                      {work.tags.map((tag, index) => (
                        <Link key={index} href={`/tags/${encodeURIComponent(tag)}`} className="portfolio-tag">#{tag}</Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* コメント */}
              <div className="portfolio-comments">
                <h2 className="portfolio-comments-title">コメント ({work.commentCount})</h2>
                <div className="portfolio-comment-list">
                  {comments.length === 0 ? (
                    <p className="portfolio-comment-empty">まだコメントがありません</p>
                  ) : (
                    comments.map(comment => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        onLike={handleCommentLike}
                        onDelete={handleCommentDelete}
                        onReply={(id, username) => { setReplyingTo(id); setReplyingToUsername(username); document.querySelector('#comment-form')?.scrollIntoView({ behavior: 'smooth' }) }}
                        currentUserId={currentUserId}
                        formatDate={formatDate}
                        depth={0}
                        openMenuId={openCommentMenuId}
                        setOpenMenuId={setOpenCommentMenuId}
                      />
                    ))
                  )}
                </div>
                <div id="comment-form">
                  {replyingTo && (
                    <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: '#888' }}><i className="fas fa-reply" style={{ marginRight: '8px' }}></i>@{replyingToUsername} に返信中</span>
                      <button onClick={() => { setReplyingTo(null); setReplyingToUsername('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><i className="fas fa-times"></i></button>
                    </div>
                  )}
                  {currentUserId ? (
                    <>
                      <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder={replyingTo ? `@${replyingToUsername} に返信...` : 'コメントを入力...'} style={{ width: '100%', minHeight: '100px', padding: '16px', border: 'none', borderRadius: '12px', fontSize: '14px', resize: 'vertical', marginBottom: '12px', background: '#E8ECEF', boxShadow: 'inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff', outline: 'none' }} />
                      <button onClick={handleCommentSubmit} className="btn-primary" disabled={!commentText.trim()}>{replyingTo ? '返信する' : 'コメントする'}</button>
                    </>
                  ) : (
                    <div className="portfolio-comment-form-login">
                      <p>コメントするにはログインが必要です</p>
                      <button onClick={() => router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)} className="btn-primary">ログイン</button>
                    </div>
                  )}
                </div>
              </div>

              {/* 作者の他の作品 */}
              {authorWorks.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                  <h2 className="portfolio-section-title">{creator.display_name}の他の作品</h2>
                  <div className="portfolio-works-grid">
                    {authorWorks.map(w => <WorkCard key={w.id} work={w} />)}
                  </div>
                </div>
              )}

              {/* 関連作品 */}
              {relatedWorks.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                  <h2 className="portfolio-section-title">関連作品</h2>
                  <div className="portfolio-works-grid">
                    {relatedWorks.map(w => <WorkCard key={w.id} work={w} />)}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* 画像モーダル */}
      {isImageModalOpen && (
        <div className="portfolio-modal" onClick={() => setIsImageModalOpen(false)}>
          <button className="portfolio-modal-close" onClick={() => setIsImageModalOpen(false)}><i className="fas fa-times"></i></button>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95%', maxHeight: '95%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image src={displayImages[currentImageIndex]} alt={work.title} width={1920} height={1080} style={{ maxWidth: '100%', maxHeight: '90vh', width: 'auto', height: 'auto', objectFit: 'contain' }} />
          </div>
          {displayImages.length > 1 && (
            <>
              {currentImageIndex > 0 && <button className="portfolio-modal-nav prev" onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(currentImageIndex - 1) }}><i className="fas fa-chevron-left"></i></button>}
              {currentImageIndex < displayImages.length - 1 && <button className="portfolio-modal-nav next" onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(currentImageIndex + 1) }}><i className="fas fa-chevron-right"></i></button>}
              <div className="portfolio-modal-counter">{currentImageIndex + 1} / {displayImages.length}</div>
            </>
          )}
        </div>
      )}

      <Footer />
    </>
  )
}

// 作品カード
function WorkCard({ work }: { work: PortfolioItemWithStats }) {
  const images = work.image_urls || (work.image_url ? [work.image_url] : [])
  return (
    <Link href={`/portfolio/${work.id}`} className="portfolio-work-card">
      <div className="portfolio-work-image">
        {images[0] && <Image src={images[0]} alt={work.title} fill loading="lazy" />}
        {work.category && <span className="portfolio-work-badge">{CATEGORY_LABELS[work.category] || work.category}</span>}
      </div>
      <div className="portfolio-work-content">
        <h3 className="portfolio-work-title">{work.title}</h3>
        <div className="portfolio-work-stats">
          <span><i className="far fa-heart" style={{ marginRight: '4px' }}></i>{work.likeCount}</span>
          <span><i className="far fa-comment" style={{ marginRight: '4px' }}></i>{work.commentCount}</span>
        </div>
      </div>
    </Link>
  )
}

// コメントアイテム
function CommentItem({ comment, onLike, onDelete, onReply, currentUserId, formatDate, depth = 0, parentUsername = null, openMenuId, setOpenMenuId }: {
  comment: Comment; onLike: (id: string) => void; onDelete: (id: string) => void; onReply: (id: string, username: string) => void;
  currentUserId: string | null; formatDate: (d: string) => string; depth?: number; parentUsername?: string | null;
  openMenuId: string | null; setOpenMenuId: (id: string | null) => void
}) {
  const isMenuOpen = openMenuId === comment.id

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isMenuOpen && !(event.target as HTMLElement).closest('.comment-menu-container')) {
        setOpenMenuId(null)
      }
    }
    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isMenuOpen, setOpenMenuId])

  return (
    <div style={{ marginLeft: depth === 1 ? '24px' : '0', borderLeft: depth === 1 ? '2px solid #D0D5DA' : 'none', paddingLeft: depth === 1 ? '16px' : '0' }}>
      <div style={{ display: 'flex', gap: '12px', paddingBottom: depth === 0 ? '20px' : '12px', borderBottom: depth === 0 ? '1px solid #D0D5DA' : 'none', position: 'relative' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EEF0F3', boxShadow: 'inset 2px 2px 4px #c5c9cc, inset -2px -2px 4px #ffffff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {comment.user.avatar_url ? <Image src={comment.user.avatar_url} alt="" width={36} height={36} style={{ objectFit: 'cover' }} /> : <i className="fas fa-user" style={{ color: '#888', fontSize: '14px' }}></i>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
            <Link href={`/creators/${comment.user.username}`} style={{ fontWeight: '700', color: '#222', textDecoration: 'none', fontSize: '13px' }}>{comment.user.display_name}</Link>
            <span style={{ fontSize: '12px', color: '#888' }}>@{comment.user.username}</span>
            <span style={{ fontSize: '11px', color: '#888' }}>{formatDate(comment.created_at)}</span>
          </div>
          <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#555' }}>
            {parentUsername && <Link href={`/creators/${parentUsername}`} style={{ color: '#5B7C99', fontWeight: '500', marginRight: '4px' }}>@{parentUsername}</Link>}
            {comment.content}
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => onLike(comment.id)} style={{ border: 'none', background: comment.isLiked ? '#FEE' : '#EEF0F3', cursor: 'pointer', fontSize: '11px', color: comment.isLiked ? '#C05656' : '#888', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '14px' }}>
              <i className={comment.isLiked ? 'fas fa-heart' : 'far fa-heart'}></i>{comment.likeCount}
            </button>
            {currentUserId && (
              <button onClick={() => onReply(comment.id, comment.user.username)} style={{ border: 'none', background: '#EEF0F3', cursor: 'pointer', fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '14px' }}>
                <i className="fas fa-reply"></i>返信
              </button>
            )}
          </div>
        </div>
        {currentUserId === comment.user_id && (
          <div className="comment-menu-container" style={{ position: 'relative' }}>
            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : comment.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#888', fontSize: '16px' }}><i className="fas fa-ellipsis-v"></i></button>
            {isMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#FFF', borderRadius: '8px', padding: '4px', minWidth: '120px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10 }}>
                <button onClick={() => { onDelete(comment.id); setOpenMenuId(null) }} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '4px', fontSize: '13px', color: '#C05656' }}>
                  <i className="fas fa-trash"></i>削除する
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} onLike={onLike} onDelete={onDelete} onReply={onReply} currentUserId={currentUserId} formatDate={formatDate} depth={depth === 0 ? 1 : 2} parentUsername={comment.user.username} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} />
          ))}
        </div>
      )}
    </div>
  )
}