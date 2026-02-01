'use client'

import { use, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import styles from './page.module.css'

// 型定義
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
  isBookmarked: boolean
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
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) return null
    return data.user.id
  } catch {
    return null
  }
}

async function attachStatsToWorks(
  works: PortfolioItem[],
  userId: string | null
): Promise<PortfolioItemWithStats[]> {
  const ids = works.map(w => w.id)
  if (ids.length === 0) return []

  const [{ data: likes }, { data: comments }, { data: userLikes }, { data: userBookmarks }] = await Promise.all([
    supabase.from('portfolio_likes').select('portfolio_item_id').in('portfolio_item_id', ids),
    supabase.from('comments').select('portfolio_item_id').in('portfolio_item_id', ids),
    userId
      ? supabase.from('portfolio_likes').select('portfolio_item_id').eq('user_id', userId).in('portfolio_item_id', ids)
      : Promise.resolve({ data: [] }),
    userId
      ? supabase.from('bookmarks').select('portfolio_item_id').eq('user_id', userId).in('portfolio_item_id', ids)
      : Promise.resolve({ data: [] })
  ])

  const likeMap = new Map()
  likes?.forEach(l => likeMap.set(l.portfolio_item_id, (likeMap.get(l.portfolio_item_id) || 0) + 1))

  const commentMap = new Map()
  comments?.forEach(c => commentMap.set(c.portfolio_item_id, (commentMap.get(c.portfolio_item_id) || 0) + 1))

  const likedSet = new Set(userLikes?.map(l => l.portfolio_item_id) || [])
  const bookmarkedSet = new Set(userBookmarks?.map(b => b.portfolio_item_id) || [])

  return works.map(w => ({
    ...w,
    likeCount: likeMap.get(w.id) || 0,
    commentCount: commentMap.get(w.id) || 0,
    isLiked: likedSet.has(w.id),
    isBookmarked: bookmarkedSet.has(w.id)
  }))
}

// スケルトンコンポーネント
function PageSkeleton() {
  return (
    <>
      <Header />
      <div className={styles.skeletonPage}>
        <div className={styles.skeletonContainer}>
          <div className={styles.skeletonLayout}>
            {/* サイドバースケルトン */}
            <div className={styles.skeletonSidebar}>
              <div className="skeleton skeleton-avatar" style={{ width: 100, height: 100, margin: '0 auto 16px' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '60%', height: 20, margin: '0 auto 8px' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '40%', height: 14, margin: '0 auto 20px' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div className="skeleton" style={{ height: 36, borderRadius: 8 }}></div>
                <div className="skeleton" style={{ height: 36, borderRadius: 8 }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', padding: '16px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 20 }}>
                <div className="skeleton skeleton-text" style={{ width: 40, height: 40 }}></div>
                <div className="skeleton skeleton-text" style={{ width: 40, height: 40 }}></div>
                <div className="skeleton skeleton-text" style={{ width: 40, height: 40 }}></div>
              </div>
              <div className="skeleton skeleton-text" style={{ width: '100%', height: 60, marginBottom: 20 }}></div>
              <div className="skeleton" style={{ height: 40, borderRadius: 8 }}></div>
            </div>

            {/* メインスケルトン */}
            <div className={styles.skeletonMain}>
              {/* モバイル用クリエイタースケルトン */}
              <div className={styles.skeletonMobileCreator}>
                <div className="skeleton" style={{ height: 48, borderRadius: 12 }}></div>
              </div>
              {/* コンテンツスケルトン */}
              <div className={styles.skeletonContent}>
                <div className={`skeleton ${styles.skeletonImage}`}></div>
              </div>
              {/* アクションバースケルトン */}
              <div className={styles.skeletonActions}>
                <div className="skeleton" style={{ width: 60, height: 32, borderRadius: 8 }}></div>
                <div className="skeleton" style={{ width: 60, height: 32, borderRadius: 8 }}></div>
                <div className="skeleton" style={{ width: 40, height: 32, borderRadius: 8 }}></div>
              </div>
              {/* 作品情報スケルトン */}
              <div className={styles.skeletonInfo}>
                <div className="skeleton skeleton-text" style={{ width: '70%', height: 28, marginBottom: 12 }}></div>
                <div className="skeleton skeleton-text" style={{ width: '40%', height: 16, marginBottom: 16 }}></div>
                <div className="skeleton skeleton-text" style={{ width: '100%', height: 80 }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default function PortfolioDetailClient({ params }: { params: Promise<{ id: string }> }) {
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
      { data: likeData },
      { data: bookmarkData }
    ] = await Promise.all([
      supabase.from('portfolio_likes').select('*', { count: 'exact', head: true }).eq('portfolio_item_id', unwrappedParams.id),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('portfolio_item_id', unwrappedParams.id),
      userId ? supabase.from('portfolio_likes').select('*').eq('portfolio_item_id', unwrappedParams.id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
      userId ? supabase.from('bookmarks').select('*').eq('portfolio_item_id', unwrappedParams.id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null })
    ])

    const workWithStats: PortfolioItemWithStats = {
      ...workData,
      likeCount: likeCount || 0,
      commentCount: commentCount || 0,
      isLiked: !!likeData,
      isBookmarked: !!bookmarkData
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

  async function handleBookmark() {
    if (!currentUserId) {
      if (confirm('保存するにはログインが必要です。ログインページに移動しますか？')) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      }
      return
    }
    if (!work) return

    try {
      if (work.isBookmarked) {
        await supabase.from('bookmarks').delete().eq('portfolio_item_id', work.id).eq('user_id', currentUserId)
        setWork({ ...work, isBookmarked: false })
      } else {
        await supabase.from('bookmarks').insert({ portfolio_item_id: work.id, user_id: currentUserId })
        setWork({ ...work, isBookmarked: true })
      }
    } catch (error) { console.error('ブックマーク処理エラー:', error) }
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

  // ローディング状態
  if (loading) {
    return <PageSkeleton />
  }

  // エラー状態
  if (!work || !creator) {
    return (
      <>
        <Header />
        <div className={styles.errorContainer}>
          <div className="empty-state">
            <i className="fa-regular fa-folder-open"></i>
            <p>作品が見つかりません</p>
            <Link href="/portfolio" className="btn btn-primary">作品一覧に戻る</Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const displayImages = getDisplayImages()

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.layout}>
            {/* サイドバー */}
            <aside className={styles.sidebar}>
              <div className={`card ${styles.sidebarCard}`}>
                {creator.account_type && (
                  <span className={`badge ${styles.accountBadge}`}>
                    {creator.account_type === 'casual' ? '一般' : 'ビジネス'}
                  </span>
                )}

                <Link href={`/creators/${creator.username}`} className={`avatar avatar-xl ${styles.creatorAvatar}`}>
                  {creator.avatar_url ? (
                    <Image 
                      src={creator.avatar_url} 
                      alt={creator.display_name} 
                      width={120} 
                      height={120}
                      sizes="120px"
                      
                    />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </Link>

                {creator.job_title && <p className={styles.jobTitle}>{creator.job_title}</p>}
                <h2 className={styles.creatorName}>{creator.display_name}</h2>
                <p className={styles.creatorUsername}>@{creator.username}</p>

                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{creator.workCount}</span>
                    <span className={styles.statLabel}>作品</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{creator.followingCount}</span>
                    <span className={styles.statLabel}>フォロー</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{creator.followerCount}</span>
                    <span className={styles.statLabel}>フォロワー</span>
                  </div>
                </div>

                {creator.bio && (
                  <div className={styles.bioSection}>
                    <h3 className={styles.bioTitle}>自己紹介</h3>
                    <p className={styles.bioText}>{creator.bio}</p>
                  </div>
                )}

                {(creator.twitter_url || creator.pixiv_url || creator.instagram_url || creator.youtube_url || creator.website_url) && (
                  <div className={styles.socialLinks}>
                    {creator.twitter_url && (
                      <a href={creator.twitter_url} target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>
                        <i className="fab fa-twitter"></i>
                      </a>
                    )}
                    {creator.pixiv_url && (
                      <a href={creator.pixiv_url} target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>
                        <i className="fas fa-palette"></i>
                      </a>
                    )}
                    {creator.instagram_url && (
                      <a href={creator.instagram_url} target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>
                        <i className="fab fa-instagram"></i>
                      </a>
                    )}
                    {creator.youtube_url && (
                      <a href={creator.youtube_url} target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>
                        <i className="fab fa-youtube"></i>
                      </a>
                    )}
                    {creator.website_url && (
                      <a href={creator.website_url} target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>
                        <i className="fas fa-link"></i>
                      </a>
                    )}
                  </div>
                )}

                {currentUserId !== creator.user_id ? (
                  <div className={styles.sidebarActions}>
                    <button
                      onClick={() => {
                        if (!currentUserId) {
                          if (confirm('フォローするにはログインが必要です。ログインページに移動しますか？')) {
                            router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
                          }
                          return
                        }
                        if (creator.isFollowing) {
                          if (confirm(`${creator.display_name}のフォローを解除しますか？`)) handleFollow()
                        } else handleFollow()
                      }}
                      className={`btn ${styles.sidebarBtn} ${creator.isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                    >
                      <i className={creator.isFollowing ? 'fas fa-check' : 'fas fa-plus'}></i>
                      {creator.isFollowing ? 'フォロー中' : 'フォロー'}
                    </button>
                    <button
                      onClick={() => router.push(`/requests/new?to=${creator.username}`)}
                      className={`btn btn-accent ${styles.sidebarBtn}`}
                    >
                      <i className="fas fa-briefcase"></i>
                      仕事を依頼
                    </button>
                  </div>
                ) : (
                  <Link href={`/creators/${creator.username}/edit`} className={`btn btn-secondary ${styles.followBtn}`}>
                    プロフィールを編集
                  </Link>
                )}
              </div>
            </aside>

            {/* メインコンテンツ */}
            <main className={styles.main}>
              {/* モバイル用クリエイター情報（コンパクト版） */}
              <div className={styles.mobileCreator}>
                <div className={styles.mobileCreatorBar}>
                  <Link href={`/creators/${creator.username}`} className={styles.mobileCreatorLink}>
                    <div className={`avatar avatar-xs ${styles.mobileAvatar}`}>
                      {creator.avatar_url ? (
                        <Image 
                          src={creator.avatar_url} 
                          alt={creator.display_name} 
                          width={32} 
                          height={32}
                          sizes="32px"
                        />
                      ) : (
                        <i className="fas fa-user"></i>
                      )}
                    </div>
                    <span className={styles.mobileCreatorName}>{creator.display_name}</span>
                  </Link>
                  <div className={styles.mobileActions}>
                    {currentUserId !== creator.user_id ? (
                      <>
                        <button
                          onClick={() => {
                            if (!currentUserId) {
                              if (confirm('フォローするにはログインが必要です。ログインページに移動しますか？')) {
                                router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
                              }
                              return
                            }
                            if (creator.isFollowing) {
                              if (confirm(`${creator.display_name}のフォローを解除しますか？`)) handleFollow()
                            } else handleFollow()
                          }}
                          className={`btn btn-sm ${creator.isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                        >
                          {creator.isFollowing ? 'フォロー中' : 'フォロー'}
                        </button>
                        <button
                          onClick={() => router.push(`/requests/new?to=${creator.username}`)}
                          className="btn btn-accent btn-sm"
                        >
                          依頼
                        </button>
                      </>
                    ) : (
                      <Link 
                        href={`/creators/${creator.username}/edit`} 
                        className="btn btn-secondary btn-sm"
                      >
                        編集
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* 作品コンテンツ */}
              <div className={`card ${styles.contentCard}`}>
                {work.category === 'manga' && displayImages.length > 0 ? (
                  <div className={styles.mangaContainer}>
                    {displayImages.map((image, index) => (
                      <div 
                        key={index} 
                        onClick={() => { setCurrentImageIndex(index); setIsImageModalOpen(true) }} 
                        className={styles.mangaPage}
                      >
                        <Image 
                          src={image} 
                          alt={`${work.title} - ${index + 1}`} 
                          width={1000} 
                          height={1414}
                          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 80vw, 700px"
                          
                          loading={index === 0 ? 'eager' : 'lazy'} 
                        />
                      </div>
                    ))}
                  </div>
                ) : work.category === 'illustration' && displayImages.length > 0 ? (
                  <div className={styles.illustrationContainer}>
                    <div 
                      className={styles.mainImage}
                      onClick={() => setIsImageModalOpen(true)}
                    >
                      <Image 
                        src={displayImages[currentImageIndex]} 
                        alt={work.title} 
                        width={800} 
                        height={600}
                        sizes="(max-width: 767px) 100vw, (max-width: 1023px) 80vw, 600px"
                        
                        priority 
                      />
                      <div className={styles.zoomHint}>
                        <i className="fas fa-search-plus"></i>
                        <span>クリックで拡大</span>
                      </div>
                      {displayImages.length > 1 && (
                        <>
                          {currentImageIndex > 0 && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(currentImageIndex - 1) }} 
                              className={`${styles.navBtn} ${styles.prevBtn}`}
                            >
                              <i className="fas fa-chevron-left"></i>
                            </button>
                          )}
                          {currentImageIndex < displayImages.length - 1 && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(currentImageIndex + 1) }} 
                              className={`${styles.navBtn} ${styles.nextBtn}`}
                            >
                              <i className="fas fa-chevron-right"></i>
                            </button>
                          )}
                          <div className={styles.imageCounter}>
                            {currentImageIndex + 1} / {displayImages.length}
                          </div>
                        </>
                      )}
                    </div>
                    {displayImages.length > 1 && (
                      <div className={styles.thumbnailStrip}>
                        {displayImages.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`${styles.thumbnail} ${currentImageIndex === index ? styles.active : ''}`}
                          >
                            <Image 
                              src={image} 
                              alt={`${work.title} - ${index + 1}`} 
                              width={100} 
                              height={100}
                              sizes="100px"
                              
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : work.category === 'novel' ? (
                  <div className={styles.novelContainer}>
                    <div className={styles.novelHeader}>
                      <h1 className={styles.novelTitle}>{work.title}</h1>
                    </div>
                    {work.text_content && (
                      <div className={styles.novelContent}>
                        {work.text_content.split('───').map((page, index) => (
                          <div key={index} className={styles.novelPage}>
                            {page.trim()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (work.category === 'music' || work.category === 'voice') && work.audio_url ? (
                  <div className={styles.audioContainer}>
                    {displayImages.length > 0 && (
                      <div className={styles.audioCover}>
                        <Image 
                          src={displayImages[0]} 
                          alt={work.title} 
                          width={400} 
                          height={400}
                          sizes="(max-width: 767px) 200px, 300px"
                          
                        />
                      </div>
                    )}
                    <div className={styles.audioPlayer}>
                      <audio controls>
                        <source src={work.audio_url} type="audio/mpeg" />
                      </audio>
                    </div>
                  </div>
                ) : work.category === 'video' && work.video_url ? (
                  <div className={styles.videoContainer}>
                    <video controls>
                      <source src={work.video_url} type="video/mp4" />
                    </video>
                  </div>
                ) : null}
              </div>

              {/* アクションバー */}
              <div className={styles.actionBar}>
                <div className={styles.actionLeft}>
                  <button 
                    onClick={handleLike} 
                    className={`${styles.actionBtn} ${work.isLiked ? styles.liked : ''}`}
                  >
                    <i className={work.isLiked ? 'fas fa-heart' : 'far fa-heart'}></i>
                    <span>{work.likeCount.toLocaleString()}</span>
                  </button>
                  
                  <button 
                    onClick={() => document.querySelector('#comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className={styles.actionBtn}
                  >
                    <i className="far fa-comment"></i>
                    <span>{work.commentCount.toLocaleString()}</span>
                  </button>
                  
                  <div className={`${styles.shareContainer} share-dropdown-container`}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsShareDropdownOpen(!isShareDropdownOpen) }} 
                      className={styles.actionBtn}
                    >
                      <i className="fas fa-arrow-up-from-bracket"></i>
                    </button>
                    {isShareDropdownOpen && (
                      <div className={styles.shareDropdown}>
                        <button onClick={() => handleShare('twitter')} className={styles.shareItem}>
                          <i className="fab fa-twitter" style={{ color: '#1DA1F2' }}></i>
                          Twitter
                        </button>
                        <button onClick={() => handleShare('facebook')} className={styles.shareItem}>
                          <i className="fab fa-facebook" style={{ color: '#1877F2' }}></i>
                          Facebook
                        </button>
                        <button onClick={() => handleShare('line')} className={styles.shareItem}>
                          <i className="fab fa-line" style={{ color: '#00B900' }}></i>
                          LINE
                        </button>
                        <button onClick={() => handleShare('copy')} className={styles.shareItem}>
                          <i className="fas fa-link"></i>
                          URLをコピー
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className={styles.actionRight}>
                  <button 
                    onClick={handleBookmark} 
                    className={`${styles.actionBtn} ${work.isBookmarked ? styles.bookmarked : ''}`}
                  >
                    <i className={work.isBookmarked ? 'fas fa-bookmark' : 'far fa-bookmark'}></i>
                  </button>
                </div>
              </div>

              {/* 作品情報 */}
              <div className={`card ${styles.infoCard}`}>
                <h1 className={styles.workTitle}>{work.title}</h1>
                <div className={styles.workMeta}>
                  <span><i className="far fa-eye"></i> {work.view_count.toLocaleString()} 閲覧</span>
                  <span><i className="far fa-calendar"></i> {formatDate(work.created_at)}</span>
                </div>
                {work.description && (
                  <p className={styles.workDescription}>{work.description}</p>
                )}
                {work.tags && work.tags.length > 0 && (
                  <div className={styles.tagsSection}>
                    <h3 className={styles.tagsTitle}>タグ</h3>
                    <div className={styles.tagsList}>
                      {work.tags.map((tag, index) => (
                        <Link key={index} href={`/tags/${encodeURIComponent(tag)}`} className="tag">
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* コメントセクション */}
              <div id="comments-section" className={`card ${styles.commentsCard}`}>
                <h2 className={styles.commentsTitle}>
                  <i className="far fa-comment"></i>
                  コメント ({work.commentCount})
                </h2>
                
                <div className={styles.commentsList}>
                  {comments.length === 0 ? (
                    <p className={styles.noComments}>まだコメントがありません</p>
                  ) : (
                    comments.map(comment => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        onLike={handleCommentLike}
                        onDelete={handleCommentDelete}
                        onReply={(id, username) => { 
                          setReplyingTo(id)
                          setReplyingToUsername(username)
                          document.querySelector('#comment-form')?.scrollIntoView({ behavior: 'smooth' }) 
                        }}
                        currentUserId={currentUserId}
                        formatDate={formatDate}
                        depth={0}
                        openMenuId={openCommentMenuId}
                        setOpenMenuId={setOpenCommentMenuId}
                      />
                    ))
                  )}
                </div>

                <div id="comment-form" className={styles.commentForm}>
                  {replyingTo && (
                    <div className={styles.replyingTo}>
                      <span>
                        <i className="fas fa-reply"></i>
                        @{replyingToUsername} に返信中
                      </span>
                      <button onClick={() => { setReplyingTo(null); setReplyingToUsername('') }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                  {currentUserId ? (
                    <>
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={replyingTo ? `@${replyingToUsername} に返信...` : 'コメントを入力...'}
                        className="form-input"
                      />
                      <button 
                        onClick={handleCommentSubmit} 
                        className="btn btn-primary"
                        disabled={!commentText.trim()}
                      >
                        {replyingTo ? '返信する' : 'コメントする'}
                      </button>
                    </>
                  ) : (
                    <div className={styles.loginPrompt}>
                      <p>コメントするにはログインが必要です</p>
                      <button 
                        onClick={() => router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)} 
                        className="btn btn-primary"
                      >
                        ログイン
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 作者の他の作品 */}
              {authorWorks.length > 0 && (
                <section className={styles.worksSection}>
                  <h2 className={styles.sectionTitle}>{creator.display_name}の他の作品</h2>
                  <div className={styles.worksGrid}>
                    {authorWorks.map(w => <WorkCard key={w.id} work={w} />)}
                  </div>
                </section>
              )}

              {/* 関連作品 */}
              {relatedWorks.length > 0 && (
                <section className={styles.worksSection}>
                  <h2 className={styles.sectionTitle}>関連作品</h2>
                  <div className={styles.worksGrid}>
                    {relatedWorks.map(w => <WorkCard key={w.id} work={w} />)}
                  </div>
                </section>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* 画像モーダル */}
      {isImageModalOpen && (
        <div className={styles.modal} onClick={() => setIsImageModalOpen(false)}>
          <button className={styles.modalClose} onClick={() => setIsImageModalOpen(false)}>
            <i className="fas fa-times"></i>
          </button>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Image 
              src={displayImages[currentImageIndex]} 
              alt={work.title} 
              width={1920} 
              height={1080}
              sizes="100vw"
              
            />
          </div>
          {displayImages.length > 1 && (
            <>
              {currentImageIndex > 0 && (
                <button 
                  className={`${styles.modalNav} ${styles.modalPrev}`}
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(currentImageIndex - 1) }}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
              )}
              {currentImageIndex < displayImages.length - 1 && (
                <button 
                  className={`${styles.modalNav} ${styles.modalNext}`}
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(currentImageIndex + 1) }}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              )}
              <div className={styles.modalCounter}>
                {currentImageIndex + 1} / {displayImages.length}
              </div>
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
    <Link href={`/portfolio/${work.id}`} className="card">
      <div className="card-image">
        {images[0] ? (
          <Image 
            src={images[0]} 
            alt={work.title} 
            fill
            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 200px"
            
          />
        ) : (
          <i className="fa-regular fa-image"></i>
        )}
        {work.category && (
          <span className="overlay-badge overlay-badge-top-left">
            {CATEGORY_LABELS[work.category] || work.category}
          </span>
        )}
      </div>
      <div className="card-body">
        <h3 className="card-title">{work.title}</h3>
        <div className="card-stats">
          <span><i className="far fa-heart icon-like"></i> {work.likeCount}</span>
          <span><i className="far fa-comment"></i> {work.commentCount}</span>
        </div>
      </div>
    </Link>
  )
}

// コメントアイテム
function CommentItem({ 
  comment, 
  onLike, 
  onDelete, 
  onReply, 
  currentUserId, 
  formatDate, 
  depth = 0, 
  parentUsername = null, 
  openMenuId, 
  setOpenMenuId 
}: {
  comment: Comment
  onLike: (id: string) => void
  onDelete: (id: string) => void
  onReply: (id: string, username: string) => void
  currentUserId: string | null
  formatDate: (d: string) => string
  depth?: number
  parentUsername?: string | null
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
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
    <div className={`${styles.commentItem} ${depth > 0 ? styles.reply : ''}`}>
      <div className={styles.commentMain}>
        <div className={`avatar avatar-sm ${styles.commentAvatar}`}>
          {comment.user.avatar_url ? (
            <Image 
              src={comment.user.avatar_url} 
              alt="" 
              width={36} 
              height={36}
              sizes="36px"
            />
          ) : (
            <i className="fas fa-user"></i>
          )}
        </div>
        <div className={styles.commentContent}>
          <div className={styles.commentHeader}>
            <Link href={`/creators/${comment.user.username}`} className={styles.commentAuthor}>
              {comment.user.display_name}
            </Link>
            <span className={styles.commentUsername}>@{comment.user.username}</span>
            <span className={styles.commentDate}>{formatDate(comment.created_at)}</span>
          </div>
          <p className={styles.commentText}>
            {parentUsername && (
              <Link href={`/creators/${parentUsername}`} className={styles.mentionLink}>
                @{parentUsername}
              </Link>
            )}
            {comment.content}
          </p>
          <div className={styles.commentActions}>
            <button 
              onClick={() => onLike(comment.id)} 
              className={`${styles.commentActionBtn} ${comment.isLiked ? styles.liked : ''}`}
            >
              <i className={comment.isLiked ? 'fas fa-heart' : 'far fa-heart'}></i>
              {comment.likeCount}
            </button>
            {currentUserId && (
              <button onClick={() => onReply(comment.id, comment.user.username)} className={styles.commentActionBtn}>
                <i className="fas fa-reply"></i>
                返信
              </button>
            )}
          </div>
        </div>
        {currentUserId === comment.user_id && (
          <div className={`${styles.commentMenu} comment-menu-container`}>
            <button 
              onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : comment.id) }}
              className={styles.menuTrigger}
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
            {isMenuOpen && (
              <div className={styles.menuDropdown}>
                <button onClick={() => { onDelete(comment.id); setOpenMenuId(null) }} className={styles.deleteBtn}>
                  <i className="fas fa-trash"></i>
                  削除する
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className={styles.replies}>
          {comment.replies.map(reply => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              onLike={onLike} 
              onDelete={onDelete} 
              onReply={onReply} 
              currentUserId={currentUserId} 
              formatDate={formatDate} 
              depth={depth + 1} 
              parentUsername={comment.user.username} 
              openMenuId={openMenuId} 
              setOpenMenuId={setOpenMenuId} 
            />
          ))}
        </div>
      )}
    </div>
  )
}