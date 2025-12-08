'use client'

import { use, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import '../../globals.css'
import { supabase } from '@/utils/supabase'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingScreen from '../../components/LoadingScreen'

// 作品情報の型定義（実際のDBスキーマに合わせる）
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

// 統計情報を含む作品データ
type PortfolioItemWithStats = PortfolioItem & {
  likeCount: number
  commentCount: number
  isLiked: boolean
}

// コメント情報の型定義
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

// 作者情報の型定義（実際のDBスキーマに合わせる）
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

// 現在のユーザーIDを取得
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

// 作品に統計情報を付与する共通関数（N+1解消）
async function attachStatsToWorks(
  works: PortfolioItem[],
  userId: string | null
): Promise<PortfolioItemWithStats[]> {
  const ids = works.map(w => w.id)
  if (ids.length === 0) return []

  // いいね、コメント、自分のいいねを一括取得
  const [{ data: likes }, { data: comments }, { data: userLikes }] = await Promise.all([
    supabase
      .from('portfolio_likes')
      .select('portfolio_item_id')
      .in('portfolio_item_id', ids),

    supabase
      .from('comments')
      .select('portfolio_item_id')
      .in('portfolio_item_id', ids),

    userId
      ? supabase
          .from('portfolio_likes')
          .select('portfolio_item_id')
          .eq('user_id', userId)
          .in('portfolio_item_id', ids)
      : Promise.resolve({ data: [] })
  ])

  // いいね数を集計
  const likeMap = new Map()
  likes?.forEach(l => {
    likeMap.set(l.portfolio_item_id, (likeMap.get(l.portfolio_item_id) || 0) + 1)
  })

  // コメント数を集計
  const commentMap = new Map()
  comments?.forEach(c => {
    commentMap.set(c.portfolio_item_id, (commentMap.get(c.portfolio_item_id) || 0) + 1)
  })

  // 自分がいいねした作品の集合
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

  // 初期データ読み込み
  useEffect(() => {
    loadData()
  }, [unwrappedParams.id])

  // 外側クリックで共有メニューを閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (isShareDropdownOpen && !target.closest('.share-dropdown-container')) {
        setIsShareDropdownOpen(false)
      }
    }

    if (isShareDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
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
      supabase
        .from('portfolio_likes')
        .select('*', { count: 'exact', head: true })
        .eq('portfolio_item_id', unwrappedParams.id),
      supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('portfolio_item_id', unwrappedParams.id),
      userId ? supabase
        .from('portfolio_likes')
        .select('*')
        .eq('portfolio_item_id', unwrappedParams.id)
        .eq('user_id', userId)
        .maybeSingle() : Promise.resolve({ data: null })
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
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', creatorId)
        .maybeSingle(),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', creatorId),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', creatorId),
      supabase
        .from('portfolio_items')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .eq('is_public', true),
      userId ? supabase
        .from('follows')
        .select('*')
        .eq('follower_id', userId)
        .eq('following_id', creatorId)
        .maybeSingle() : Promise.resolve({ data: null })
    ])

    if (profileError) {
      console.error('作者情報取得エラー:', profileError)
      return
    }

    if (!profileData) {
      console.error('作者のプロフィールが見つかりません:', creatorId)
      setCreator({
        id: creatorId,
        user_id: creatorId,
        username: 'unknown',
        display_name: '不明なクリエイター',
        account_type: null,
        job_title: null,
        can_receive_work: false,
        can_request_work: false,
        avatar_url: null,
        bio: null,
        website_url: null,
        twitter_url: null,
        pixiv_url: null,
        instagram_url: null,
        youtube_url: null,
        header_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        followerCount: 0,
        followingCount: 0,
        workCount: 0,
        isFollowing: false
      })
      return
    }

    const creatorWithStats: Creator = {
      ...profileData,
      followerCount: followerCount || 0,
      followingCount: followingCount || 0,
      workCount: workCount || 0,
      isFollowing: !!followData
    }

    setCreator(creatorWithStats)
  }

  async function loadComments(userId: string | null) {
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select(`
        *,
        user:profiles!comments_user_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('portfolio_item_id', unwrappedParams.id)
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('コメント取得エラー:', commentsError)
      return
    }

    const commentIds = (commentsData || []).map(c => c.id)

    if (commentIds.length === 0) {
      setComments([])
      return
    }

    const [{ data: likeRows }, { data: userLikes }] = await Promise.all([
      supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds),

      userId
        ? supabase
            .from('comment_likes')
            .select('comment_id')
            .eq('user_id', userId)
            .in('comment_id', commentIds)
        : Promise.resolve({ data: [] })
    ])

    const likeCountMap = new Map<string, number>()
    likeRows?.forEach(row => {
      likeCountMap.set(row.comment_id, (likeCountMap.get(row.comment_id) || 0) + 1)
    })

    const likedSet = new Set(userLikes?.map(l => l.comment_id) || [])

    const commentsWithStats = commentsData.map(comment => ({
      ...comment,
      likeCount: likeCountMap.get(comment.id) || 0,
      isLiked: likedSet.has(comment.id),
      replies: [] as Comment[]
    }))

    const commentsMap = new Map<string, Comment>()
    commentsWithStats.forEach(comment => {
      commentsMap.set(comment.id, comment)
    })

    const topLevelComments: Comment[] = []
    
    commentsWithStats.forEach(comment => {
      if (!comment.parent_comment_id) {
        topLevelComments.push(comment)
      } else {
        const parentComment = commentsMap.get(comment.parent_comment_id)
        if (parentComment) {
          if (!parentComment.replies) {
            parentComment.replies = []
          }
          parentComment.replies.push(comment)
        }
      }
    })

    topLevelComments.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    setComments(topLevelComments)
  }

  async function loadAuthorWorks(creatorId: string, userId: string | null) {
    const { data: worksData } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('is_public', true)
      .neq('id', unwrappedParams.id)
      .order('created_at', { ascending: false })
      .limit(6)

    if (!worksData) return

    const worksWithStats = await attachStatsToWorks(worksData, userId)
    setAuthorWorks(worksWithStats)
  }

  async function loadRelatedWorks(tags: string[] | null, currentCreatorId: string, userId: string | null) {
    if (!tags || tags.length === 0) {
      setRelatedWorks([])
      return
    }

    const { data: worksData } = await supabase
      .from('portfolio_items')
      .select('*')
      .neq('creator_id', currentCreatorId)
      .neq('id', unwrappedParams.id)
      .eq('is_public', true)
      .overlaps('tags', tags)
      .order('created_at', { ascending: false })
      .limit(6)

    if (!worksData) return

    const worksWithStats = await attachStatsToWorks(worksData, userId)
    setRelatedWorks(worksWithStats)
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
        await supabase
          .from('portfolio_likes')
          .delete()
          .eq('portfolio_item_id', work.id)
          .eq('user_id', currentUserId)

        setWork({
          ...work,
          isLiked: false,
          likeCount: work.likeCount - 1
        })
      } else {
        await supabase
          .from('portfolio_likes')
          .insert({ portfolio_item_id: work.id, user_id: currentUserId })

        setWork({
          ...work,
          isLiked: true,
          likeCount: work.likeCount + 1
        })
      }
    } catch (error) {
      console.error('いいね処理エラー:', error)
    }
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
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', creator.user_id)

        setCreator({
          ...creator,
          isFollowing: false,
          followerCount: creator.followerCount - 1
        })
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: creator.user_id })

        setCreator({
          ...creator,
          isFollowing: true,
          followerCount: creator.followerCount + 1
        })
      }
    } catch (error) {
      console.error('フォロー処理エラー:', error)
    }
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
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            alert('URLをコピーしました')
            setIsShareDropdownOpen(false)
          }).catch((err) => {
            console.error('URLのコピーに失敗しました:', err)
            fallbackCopyToClipboard(url)
          })
        } else {
          fallbackCopyToClipboard(url)
        }
        break
    }
    
    if (platform !== 'copy') {
      setIsShareDropdownOpen(false)
    }
  }

  function fallbackCopyToClipboard(text: string) {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      const successful = document.execCommand('copy')
      if (successful) {
        alert('URLをコピーしました')
        setIsShareDropdownOpen(false)
      } else {
        alert('URLのコピーに失敗しました')
      }
    } catch (err) {
      console.error('コピーエラー:', err)
      alert('URLのコピーに失敗しました')
    }
    document.body.removeChild(textArea)
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
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert({
          portfolio_item_id: work.id,
          user_id: currentUserId,
          content: commentText.trim(),
          parent_comment_id: replyingTo
        })
        .select(`
          *,
          user:profiles!comments_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      await loadComments(currentUserId)

      setWork({
        ...work,
        commentCount: work.commentCount + 1
      })

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

    const findComment = (comments: Comment[], id: string): Comment | null => {
      for (const comment of comments) {
        if (comment.id === id) return comment
        if (comment.replies) {
          const found = findComment(comment.replies, id)
          if (found) return found
        }
      }
      return null
    }

    const comment = findComment(comments, commentId)
    if (!comment) return

    try {
      if (comment.isLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUserId)
      } else {
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: currentUserId })
      }

      await loadComments(currentUserId)
    } catch (error) {
      console.error('コメントいいねエラー:', error)
      alert('いいねに失敗しました')
    }
  }

  async function handleCommentDelete(commentId: string) {
    if (!currentUserId) return

    if (!confirm('このコメントを削除しますか？\n（返信がある場合、返信も全て削除されます）\n\nこの操作は取り消せません。')) {
      return
    }

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUserId)

      if (error) throw error

      await loadComments(currentUserId)

      if (work) {
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('portfolio_item_id', work.id)

        setWork({
          ...work,
          commentCount: count || 0
        })
      }
    } catch (error) {
      console.error('コメント削除エラー:', error)
      alert('コメントの削除に失敗しました')
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60))
        return `${diffMinutes}分前`
      }
      return `${diffHours}時間前`
    } else if (diffDays < 7) {
      return `${diffDays}日前`
    } else {
      return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    }
  }

  function getDisplayImages(): string[] {
    if (!work) return []
    
    if (work.image_urls && work.image_urls.length > 0) {
      return work.image_urls
    }
    
    if (work.image_url) {
      return [work.image_url]
    }
    
    return []
  }

  if (loading) {
    return <LoadingScreen message="読み込み中..." />
  }

  if (!work || !creator) {
    return (
      <>
        <Header />
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>作品が見つかりません</h1>
            <Link href="/portfolio" className="btn-primary">
              作品一覧に戻る
            </Link>
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
      <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
      <div className="portfolio-detail-layout">
        {/* 左サイドバー：作者情報（PC only） */}
        <aside className="creator-sidebar">
          <div className="card-no-hover" style={{ padding: '24px', marginBottom: '24px', position: 'relative' }}>
            {/* アカウント種別バッジ - 右上 */}
            {creator.account_type && (
              <span style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: '4px 12px',
                fontSize: '11px',
                backgroundColor: '#000000',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontWeight: '500'
              }}>
                {creator.account_type === 'casual' ? '一般' : 'ビジネス'}
              </span>
            )}

            {/* アバター */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              margin: '0 auto 16px',
              overflow: 'hidden',
              backgroundColor: '#E5E5E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {creator.avatar_url ? (
                <Image
                  src={creator.avatar_url}
                  alt={creator.display_name}
                  width={120}
                  height={120}
                  loading="lazy"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <i className="fas fa-user" style={{ fontSize: '48px', color: '#9B9B9B' }}></i>
              )}
            </div>
            
            {/* 職業・肩書き */}
            {creator.job_title && (
              <p style={{
                fontSize: '13px',
                color: '#9B9B9B',
                fontWeight: '500',
                textAlign: 'center',
                marginBottom: '4px'
              }}>
                {creator.job_title}
              </p>
            )}
            
            {/* 名前 */}
            <h1 style={{ 
              fontSize: '20px',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '4px'
            }}>
              {creator.display_name}
            </h1>
            
            {/* Username */}
            <p style={{ 
              fontSize: '14px',
              color: '#6B6B6B',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              @{creator.username}
            </p>

            {/* メッセージボタン・フォローボタン */}
            {currentUserId !== creator.user_id && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '24px'
              }}>
                <button
                  onClick={() => router.push(`/messages/${creator.username}`)}
                  className="btn-secondary"
                  style={{ 
                    width: '100%',
                    fontSize: '13px',
                    padding: '10px 16px'
                  }}
                >
                  <i className="fas fa-envelope" style={{ fontSize: '12px' }}></i>
                  <span style={{ marginLeft: '6px' }}>メッセージ</span>
                </button>
                <button
                  onClick={() => {
                    if (creator.isFollowing) {
                      if (confirm(`${creator.display_name}のフォローを解除しますか？`)) {
                        handleFollow()
                      }
                    } else {
                      handleFollow()
                    }
                  }}
                  className={creator.isFollowing ? 'btn-secondary' : 'btn-primary'}
                  style={{ 
                    width: '100%',
                    fontSize: '13px',
                    padding: '10px 16px'
                  }}
                >
                  <i className={creator.isFollowing ? 'fas fa-check' : 'fas fa-plus'} style={{ fontSize: '12px' }}></i>
                  <span style={{ marginLeft: '6px' }}>
                    {creator.isFollowing ? 'フォロー中' : 'フォロー'}
                  </span>
                </button>
              </div>
            )}

            {/* 統計情報 - シンプルな横並び */}
            <div style={{ 
              display: 'flex',
              justifyContent: 'center',
              gap: '0',
              fontSize: '14px',
              color: '#1A1A1A',
              marginBottom: '24px',
              paddingBottom: '24px',
              borderBottom: '1px solid #E5E5E5',
              textAlign: 'center'
            }}>
              <div style={{ flex: '1 1 0', minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>
                  {creator.workCount}
                </div>
                <div style={{ fontSize: '12px', color: '#6B6B6B' }}>作品</div>
              </div>
              <div style={{ flex: '1 1 0', minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>
                  {creator.followingCount}
                </div>
                <div style={{ fontSize: '12px', color: '#6B6B6B' }}>フォロー</div>
              </div>
              <div style={{ flex: '1 1 0', minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>
                  {creator.followerCount}
                </div>
                <div style={{ fontSize: '12px', color: '#6B6B6B' }}>フォロワー</div>
              </div>
            </div>

            {/* 自己紹介 */}
            {creator.bio && (
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ 
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#1A1A1A'
                }}>
                  自己紹介
                </h2>
                <p style={{
                  fontSize: '13px',
                  lineHeight: '1.7',
                  whiteSpace: 'pre-wrap',
                  color: '#6B6B6B'
                }}>
                  {creator.bio}
                </p>
              </div>
            )}

            {/* SNSリンク */}
            {(creator.twitter_url || creator.pixiv_url || creator.instagram_url || creator.youtube_url || creator.website_url) && (
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'center', 
                marginBottom: '24px',
                flexWrap: 'wrap'
              }}>
                {creator.twitter_url && (
                  <a
                    href={creator.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#F5F5F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6B6B6B',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      fontSize: '16px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E5E5E5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F5F5F5'
                    }}
                  >
                    <i className="fab fa-twitter"></i>
                  </a>
                )}
                {creator.pixiv_url && (
                  <a
                    href={creator.pixiv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#F5F5F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6B6B6B',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      fontSize: '16px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E5E5E5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F5F5F5'
                    }}
                  >
                    <i className="fas fa-palette"></i>
                  </a>
                )}
                {creator.instagram_url && (
                  <a
                    href={creator.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#F5F5F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6B6B6B',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      fontSize: '16px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E5E5E5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F5F5F5'
                    }}
                  >
                    <i className="fab fa-instagram"></i>
                  </a>
                )}
                {creator.youtube_url && (
                  <a
                    href={creator.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#F5F5F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6B6B6B',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      fontSize: '16px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E5E5E5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F5F5F5'
                    }}
                  >
                    <i className="fab fa-youtube"></i>
                  </a>
                )}
                {creator.website_url && (
                  <a
                    href={creator.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#F5F5F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6B6B6B',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      fontSize: '16px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E5E5E5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F5F5F5'
                    }}
                  >
                    <i className="fas fa-link"></i>
                  </a>
                )}
              </div>
            )}

            <Link 
              href={`/creators/${creator.username}`}
              className="btn-secondary"
              style={{ width: '100%' }}
            >
              プロフィールを見る
            </Link>
          </div>
        </aside>

        {/* 右メインカラム：作品コンテンツ */}
        <main className="main-content">
          {/* 簡易プロフィール（モバイルのみ表示） */}
          <div className="mobile-creator-profile">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              backgroundColor: 'white',
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid #E5E5E5'
            }}>
              {/* アバター */}
              <Link href={`/creators/${creator.username}`}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: '#E5E5E5',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}>
                  {creator.avatar_url ? (
                    <Image
                      src={creator.avatar_url}
                      alt={creator.display_name}
                      width={48}
                      height={48}
                      loading="lazy"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <i className="fas fa-user" style={{ fontSize: '20px', color: '#9B9B9B' }}></i>
                  )}
                </div>
              </Link>
              
              {/* 名前 */}
              <Link 
                href={`/creators/${creator.username}`}
                style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {creator.display_name}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6B6B6B',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  @{creator.username}
                </div>
              </Link>

              {/* メッセージアイコンボタン・フォローボタン（自分以外に表示） */}
              {currentUserId !== creator.user_id && (
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => router.push(`/messages/${creator.username}`)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '1px solid #E5E5E5',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: '#1A1A1A',
                      padding: '0'
                    }}
                  >
                    <i className="fas fa-envelope"></i>
                  </button>
                  <button
                    onClick={() => {
                      if (creator.isFollowing) {
                        if (confirm(`${creator.display_name}のフォローを解除しますか？`)) {
                          handleFollow()
                        }
                      } else {
                        handleFollow()
                      }
                    }}
                    className={creator.isFollowing ? 'btn-secondary' : 'btn-primary'}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      borderRadius: '20px'
                    }}
                  >
                    {creator.isFollowing ? 'フォロー中' : 'フォロー'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 作品コンテンツ - 画像部分 */}
          <div style={{ marginBottom: '24px', overflow: 'hidden', borderRadius: '12px' }}>
            {work.category === 'manga' && displayImages.length > 0 ? (
              /* マンガ：縦スクロール形式 */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {displayImages.map((image, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setCurrentImageIndex(index)
                      setIsImageModalOpen(true)
                    }}
                    style={{
                      width: '100%',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <Image
                      src={image}
                      alt={`${work.title} - ${index + 1}`}
                      width={1000}
                      height={1414}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block'
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : work.category === 'illustration' && displayImages.length > 0 ? (
              /* イラスト：カルーセル形式 */
              <div>
                {/* サムネイル画像（クリックで拡大） */}
                <div 
                  onClick={() => setIsImageModalOpen(true)}
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxHeight: '500px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden'
                  }}
                >
                  <Image
                    src={displayImages[currentImageIndex]}
                    alt={work.title}
                    width={800}
                    height={600}
                    priority
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '500px',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                  
                  {/* 拡大アイコン */}
                  <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    pointerEvents: 'none'
                  }}>
                    <i className="fas fa-search-plus"></i>
                    <span>クリックで拡大</span>
                  </div>
                  
                  {/* ナビゲーションボタン */}
                  {displayImages.length > 1 && (
                    <>
                      {currentImageIndex > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentImageIndex(currentImageIndex - 1)
                          }}
                          style={{
                            position: 'absolute',
                            left: '20px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            zIndex: 10
                          }}
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>
                      )}
                      {currentImageIndex < displayImages.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentImageIndex(currentImageIndex + 1)
                          }}
                          style={{
                            position: 'absolute',
                            right: '20px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            zIndex: 10
                          }}
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>
                      )}
                    </>
                  )}

                  {/* ページインジケーター */}
                  {displayImages.length > 1 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '20px',
                      right: '20px',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: '#FFFFFF',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '14px'
                    }}>
                      {currentImageIndex + 1} / {displayImages.length}
                    </div>
                  )}
                </div>

                {/* サムネイル一覧 */}
                {displayImages.length > 1 && (
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '20px',
                    backgroundColor: '#F5F5F5',
                    overflowX: 'auto'
                  }}>
                    {displayImages.map((image, index) => (
                      <div
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        style={{
                          width: '100px',
                          height: '100px',
                          flexShrink: 0,
                          cursor: 'pointer',
                          border: currentImageIndex === index ? '3px solid #FF4444' : '3px solid transparent',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          opacity: currentImageIndex === index ? 1 : 0.6,
                          transition: 'all 0.2s'
                        }}
                      >
                        <Image
                          src={image}
                          alt={`${work.title} - ${index + 1}`}
                          width={100}
                          height={100}
                          loading="lazy"
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : work.category === 'novel' ? (
              <div style={{ padding: '0' }}>
                {/* 小説タイトル */}
                <div style={{
                  padding: '40px 40px 32px',
                  borderBottom: '1px solid #E5E5E5',
                  marginBottom: '24px'
                }}>
                  <h1 style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    lineHeight: '1.4',
                    fontFamily: '"Noto Serif JP", serif'
                  }}>
                    {work.title}
                  </h1>
                </div>

                {/* 本文 */}
                {work.text_content && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {work.text_content.split('───').map((page, index, array) => (
                      <div 
                        key={index}
                        style={{ 
                          fontSize: '16px', 
                          lineHeight: '2',
                          whiteSpace: 'pre-wrap',
                          fontFamily: '"Noto Serif JP", serif',
                          padding: '40px',
                          border: '1px solid #E5E5E5',
                          borderRadius: '12px',
                          backgroundColor: '#FFFFFF'
                        }}
                      >
                        {page.trim()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (work.category === 'music' || work.category === 'voice') && work.audio_url ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                {displayImages.length > 0 && (
                  <div style={{
                    width: '400px',
                    height: '400px',
                    margin: '0 auto 32px',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <Image
                      src={displayImages[0]}
                      alt={work.title}
                      width={400}
                      height={400}
                      loading="lazy"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                )}
                
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <audio controls style={{ width: '100%' }}>
                    <source src={work.audio_url} type="audio/mpeg" />
                    お使いのブラウザはオーディオ再生に対応していません。
                  </audio>
                </div>
              </div>
            ) : work.category === 'video' && work.video_url ? (
              <div style={{ padding: '0', backgroundColor: '#000000' }}>
                <video controls style={{ width: '100%', display: 'block' }}>
                  <source src={work.video_url} type="video/mp4" />
                  お使いのブラウザは動画再生に対応していません。
                </video>
              </div>
            ) : null}
          </div>

          {/* いいね・シェアボタン */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              width: '100%'
            }}>
              {/* いいねボタン */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <button
                  onClick={handleLike}
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    backgroundColor: work.isLiked ? '#FF4444' : 'transparent',
                    color: work.isLiked ? '#FFFFFF' : '#1A1A1A',
                    border: work.isLiked ? 'none' : '1px solid #E5E5E5'
                  }}
                >
                  <i className={work.isLiked ? 'fas fa-heart' : 'far fa-heart'}></i>
                  <span style={{ marginLeft: '8px' }}>いいね {work.likeCount.toLocaleString()}</span>
                </button>
              </div>
              
              {/* 共有ボタン */}
              <div style={{ 
                position: 'relative', 
                flex: 1, 
                minWidth: 0
              }}
              className="share-dropdown-container">
                <button 
                  className="btn-secondary" 
                  style={{ width: '100%' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsShareDropdownOpen(!isShareDropdownOpen)
                  }}
                >
                  <i className="fas fa-share-alt"></i>
                  <span style={{ marginLeft: '8px' }}>共有</span>
                </button>
                
                {isShareDropdownOpen && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E5E5',
                      borderRadius: '8px',
                      padding: '8px',
                      minWidth: '200px',
                      maxWidth: '100vw',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      zIndex: 10
                    }}
                  >
                    <button
                      onClick={() => handleShare('twitter')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <i className="fab fa-twitter" style={{ color: '#1DA1F2', fontSize: '18px' }}></i>
                      Twitter
                    </button>
                    <button
                      onClick={() => handleShare('facebook')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <i className="fab fa-facebook" style={{ color: '#1877F2', fontSize: '18px' }}></i>
                      Facebook
                    </button>
                    <button
                      onClick={() => handleShare('line')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <i className="fab fa-line" style={{ color: '#00B900', fontSize: '18px' }}></i>
                      LINE
                    </button>
                    <button
                      onClick={() => handleShare('copy')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <i className="fas fa-link" style={{ color: '#6B6B6B', fontSize: '18px' }}></i>
                      URLをコピー
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 作品情報 */}
          <div className="card-no-hover" style={{ padding: '32px', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>
              {work.title}
            </h1>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              fontSize: '14px',
              color: '#6B6B6B',
              marginBottom: '24px'
            }}>
              <span>
                <i className="far fa-eye" style={{ marginRight: '6px' }}></i>
                {work.view_count.toLocaleString()} 閲覧
              </span>
              <span>
                <i className="far fa-calendar" style={{ marginRight: '6px' }}></i>
                {formatDate(work.created_at)}
              </span>
            </div>

            {work.description && (
              <p style={{ 
                fontSize: '16px', 
                lineHeight: '1.8', 
                marginBottom: '24px',
                whiteSpace: 'pre-wrap'
              }}>
                {work.description}
              </p>
            )}

            {work.tags && work.tags.length > 0 && (
              <div>
                <h3 style={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  color: '#6B6B6B',
                  marginBottom: '12px'
                }}>
                  タグ
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {work.tags.map((tag, index) => (
                    <Link
                      key={index}
                      href={`/portfolio?tag=${encodeURIComponent(tag)}`}
                      className="badge badge-category"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* コメント欄 */}
          <div className="card-no-hover" style={{ padding: '32px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
              コメント ({work.commentCount})
            </h2>

            {/* コメント一覧 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '30px' }}>
              {comments.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6B6B6B', padding: '40px 0' }}>
                  まだコメントがありません
                </p>
              ) : (
                comments.map(comment => (
                  <CommentItem 
                    key={comment.id}
                    comment={comment}
                    onLike={handleCommentLike}
                    onDelete={handleCommentDelete}
                    onReply={(commentId, username) => {
                      setReplyingTo(commentId)
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

            {/* コメント投稿フォーム */}
            <div id="comment-form">
              {replyingTo && (
                <div style={{
                  backgroundColor: '#F5F5F5',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '14px', color: '#6B6B6B' }}>
                    <i className="fas fa-reply" style={{ marginRight: '8px' }}></i>
                    @{replyingToUsername} に返信中
                  </span>
                  <button
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyingToUsername('')
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#6B6B6B'
                    }}
                  >
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
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '16px',
                      border: '1px solid #E5E5E5',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical',
                      marginBottom: '12px'
                    }}
                  />
                  <button 
                    onClick={handleCommentSubmit}
                    className="btn-primary"
                    disabled={!commentText.trim()}
                  >
                    {replyingTo ? '返信する' : 'コメントする'}
                  </button>
                </>
              ) : (
                <div style={{ 
                  backgroundColor: '#F5F5F5', 
                  padding: '24px', 
                  textAlign: 'center',
                  borderRadius: '8px'
                }}>
                  <p style={{ marginBottom: '16px', color: '#6B6B6B' }}>
                    コメントするにはログインが必要です
                  </p>
                  <button 
                    onClick={() => router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}
                    className="btn-primary"
                  >
                    ログイン
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* この作者の他の作品 */}
          {authorWorks.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
                {creator.display_name}の他の作品
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                {authorWorks.map(authorWork => {
                  const workImages = authorWork.image_urls || (authorWork.image_url ? [authorWork.image_url] : [])
                  const categoryLabels: { [key: string]: string } = {
                    illustration: 'イラスト',
                    manga: 'マンガ',
                    novel: '小説',
                    music: '音楽',
                    voice: 'ボイス',
                    video: '動画'
                  }
                  return (
                    <Link
                      key={authorWork.id}
                      href={`/portfolio/${authorWork.id}`}
                      style={{ textDecoration: 'none', color: '#1A1A1A', display: 'block' }}
                    >
                      <div 
                        className="portfolio-work-card"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          border: '1px solid #E5E5E5'
                        }}>
                        <div style={{
                          position: 'relative',
                          paddingBottom: '100%',
                          backgroundColor: '#F5F5F5',
                          overflow: 'hidden'
                        }}>
                          {workImages[0] && (
                            <Image
                              src={workImages[0]}
                              alt={authorWork.title}
                              fill
                              loading="lazy"
                              style={{ objectFit: 'cover', transition: 'transform 0.3s ease' }}
                            />
                          )}
                          {/* カテゴリーバッジ */}
                          {authorWork.category && (
                            <span style={{
                              position: 'absolute',
                              top: '8px',
                              left: '8px',
                              padding: '4px 10px',
                              fontSize: '11px',
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              color: '#FFFFFF',
                              borderRadius: '6px',
                              fontWeight: '600',
                              backdropFilter: 'blur(4px)'
                            }}>
                              {categoryLabels[authorWork.category] || authorWork.category}
                            </span>
                          )}
                        </div>
                        <div style={{ padding: '14px' }}>
                          <h3 style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            marginBottom: '8px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            margin: 0,
                            lineHeight: '1.4',
                            color: '#1A1A1A'
                          }}>
                            {authorWork.title}
                          </h3>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            fontSize: '12px',
                            color: '#6B6B6B'
                          }}>
                            <span>
                              <i className="far fa-heart" style={{ marginRight: '4px' }}></i>
                              {authorWork.likeCount}
                            </span>
                            <span>
                              <i className="far fa-comment" style={{ marginRight: '4px' }}></i>
                              {authorWork.commentCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* 関連作品 */}
          {relatedWorks.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
                関連作品
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                {relatedWorks.map(relatedWork => {
                  const workImages = relatedWork.image_urls || (relatedWork.image_url ? [relatedWork.image_url] : [])
                  const categoryLabels: { [key: string]: string } = {
                    illustration: 'イラスト',
                    manga: 'マンガ',
                    novel: '小説',
                    music: '音楽',
                    voice: 'ボイス',
                    video: '動画'
                  }
                  return (
                    <Link
                      key={relatedWork.id}
                      href={`/portfolio/${relatedWork.id}`}
                      style={{ textDecoration: 'none', color: '#1A1A1A', display: 'block' }}
                    >
                      <div 
                        className="portfolio-work-card"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          border: '1px solid #E5E5E5'
                        }}>
                        <div style={{
                          position: 'relative',
                          paddingBottom: '100%',
                          backgroundColor: '#F5F5F5',
                          overflow: 'hidden'
                        }}>
                          {workImages[0] && (
                            <Image
                              src={workImages[0]}
                              alt={relatedWork.title}
                              fill
                              loading="lazy"
                              style={{ objectFit: 'cover', transition: 'transform 0.3s ease' }}
                            />
                          )}
                          {/* カテゴリーバッジ */}
                          {relatedWork.category && (
                            <span style={{
                              position: 'absolute',
                              top: '8px',
                              left: '8px',
                              padding: '4px 10px',
                              fontSize: '11px',
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              color: '#FFFFFF',
                              borderRadius: '6px',
                              fontWeight: '600',
                              backdropFilter: 'blur(4px)'
                            }}>
                              {categoryLabels[relatedWork.category] || relatedWork.category}
                            </span>
                          )}
                        </div>
                        <div style={{ padding: '14px' }}>
                          <h3 style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            marginBottom: '8px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            margin: 0,
                            lineHeight: '1.4',
                            color: '#1A1A1A'
                          }}>
                            {relatedWork.title}
                          </h3>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            fontSize: '12px',
                            color: '#6B6B6B'
                          }}>
                            <span>
                              <i className="far fa-heart" style={{ marginRight: '4px' }}></i>
                              {relatedWork.likeCount}
                            </span>
                            <span>
                              <i className="far fa-comment" style={{ marginRight: '4px' }}></i>
                              {relatedWork.commentCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 画像拡大モーダル */}
      {isImageModalOpen && (
        <div
          onClick={() => setIsImageModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            cursor: 'zoom-out'
          }}
        >
          <button
            onClick={() => setIsImageModalOpen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000
            }}
          >
            <i className="fas fa-times"></i>
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '95%',
              maxHeight: '95%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Image
              src={displayImages[currentImageIndex]}
              alt={work.title}
              width={1920}
              height={1080}
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>

          {displayImages.length > 1 && (
            <>
              {currentImageIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex(currentImageIndex - 1)
                  }}
                  style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    zIndex: 10000
                  }}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
              )}
              {currentImageIndex < displayImages.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex(currentImageIndex + 1)
                  }}
                  style={{
                    position: 'absolute',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    zIndex: 10000
                  }}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              )}

              <div style={{
                position: 'absolute',
                bottom: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#FFFFFF',
                padding: '10px 20px',
                borderRadius: '25px',
                fontSize: '16px',
                zIndex: 10000
              }}>
                {currentImageIndex + 1} / {displayImages.length}
              </div>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .portfolio-detail-layout {
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 20px;
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 32px;
        }

        .creator-sidebar {
        }

        .mobile-creator-profile {
          display: none;
        }

        .main-content {
          min-width: 0;
        }

        @media (max-width: 768px) {
          .portfolio-detail-layout {
            display: block !important;
            padding: 16px 12px;
            grid-template-columns: none !important;
          }

          .creator-sidebar {
            display: none !important;
          }

          .mobile-creator-profile {
            display: block !important;
          }

          .main-content {
            width: 100% !important;
          }

          .card-no-hover {
            border-radius: 8px !important;
            padding: 16px !important;
          }

          .main-content img {
            max-height: 400px !important;
          }
        }

        @media (max-width: 480px) {
          .portfolio-detail-layout {
            padding: 12px 8px;
          }

          .card-no-hover {
            padding: 12px !important;
          }
        }

        /* ホバーエフェクト */
        .portfolio-work-card:hover {
          transform: translateY(-4px);
          border-color: #D0D0D0;
        }

        .portfolio-work-card img {
          transition: transform 0.3s ease;
        }

        .portfolio-work-card:hover img {
          transform: scale(1.05);
        }
      `}</style>
    </div>
    <Footer />
  </>
  )
}

// コメントアイテムコンポーネント
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
  onLike: (commentId: string) => void
  onDelete: (commentId: string) => void
  onReply: (commentId: string, username: string) => void
  currentUserId: string | null
  formatDate: (dateString: string) => string
  depth?: number
  parentUsername?: string | null
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
}) {
  const marginLeft = depth === 1 ? '24px' : '0'
  const paddingLeft = depth === 1 ? '8px' : '0'
  const hasBorder = depth === 1
  const isMenuOpen = openMenuId === comment.id

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (isMenuOpen && !target.closest('.comment-menu-container')) {
        setOpenMenuId(null)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [isMenuOpen, setOpenMenuId])

  return (
    <div style={{ 
      marginLeft: marginLeft,
      borderLeft: hasBorder ? '2px solid #E5E5E5' : 'none',
      paddingLeft: paddingLeft
    }}>
      <div 
        style={{
          display: 'flex',
          gap: '8px',
          paddingBottom: depth === 0 ? '20px' : '12px',
          borderBottom: depth === 0 ? '1px solid #E5E5E5' : 'none',
          position: 'relative'
        }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: '#E5E5E5',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {comment.user.avatar_url ? (
            <Image
              src={comment.user.avatar_url}
              alt={comment.user.display_name}
              width={36}
              height={36}
              loading="lazy"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <i className="fas fa-user" style={{ color: '#9B9B9B', fontSize: '14px' }}></i>
          )}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            marginBottom: '6px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <Link
                href={`/creators/${comment.user.username}`}
                style={{
                  fontWeight: 'bold',
                  color: '#1A1A1A',
                  textDecoration: 'none',
                  fontSize: '12px'
                }}
              >
                {comment.user.display_name}
              </Link>
              <span style={{ fontSize: '11px', color: '#9B9B9B' }}>
                @{comment.user.username}
              </span>
            </div>
            <span style={{ fontSize: '10px', color: '#9B9B9B', marginLeft: '8px' }}>
              {formatDate(comment.created_at)}
            </span>
          </div>
          
          <p style={{ 
            fontSize: '13px', 
            lineHeight: '1.5',
            marginBottom: '8px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {parentUsername && (
              <Link
                href={`/creators/${parentUsername}`}
                style={{
                  color: '#1DA1F2',
                  textDecoration: 'none',
                  fontWeight: '500',
                  marginRight: '4px'
                }}
              >
                @{parentUsername}
              </Link>
            )}
            {comment.content}
          </p>
          
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => onLike(comment.id)}
              style={{
                border: '1px solid',
                borderColor: comment.isLiked ? '#FF4444' : '#E5E5E5',
                backgroundColor: comment.isLiked ? '#FFF5F5' : 'white',
                cursor: 'pointer',
                fontSize: '10px',
                color: comment.isLiked ? '#FF4444' : '#6B6B6B',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '3px 8px',
                borderRadius: '14px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = comment.isLiked ? '#FFE5E5' : '#F5F5F5'
                e.currentTarget.style.borderColor = comment.isLiked ? '#FF4444' : '#D0D0D0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = comment.isLiked ? '#FFF5F5' : 'white'
                e.currentTarget.style.borderColor = comment.isLiked ? '#FF4444' : '#E5E5E5'
              }}
            >
              <i className={comment.isLiked ? 'fas fa-heart' : 'far fa-heart'}></i>
              <span>{comment.likeCount}</span>
            </button>

            {currentUserId && (
              <button
                onClick={() => onReply(comment.id, comment.user.username)}
                style={{
                  border: '1px solid #E5E5E5',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '10px',
                  color: '#6B6B6B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '3px 8px',
                  borderRadius: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F5F5F5'
                  e.currentTarget.style.borderColor = '#D0D0D0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#E5E5E5'
                }}
              >
                <i className="fas fa-reply"></i>
                <span>返信</span>
              </button>
            )}
          </div>
        </div>

        {currentUserId === comment.user_id && (
          <div className="comment-menu-container" style={{ position: 'relative', alignSelf: 'flex-start' }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setOpenMenuId(isMenuOpen ? null : comment.id)
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#6B6B6B',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
                width: '28px',
                height: '28px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>

            {isMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '2px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E5E5',
                  borderRadius: '8px',
                  padding: '4px',
                  minWidth: '120px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 10
                }}
              >
                <button
                  onClick={() => {
                    onDelete(comment.id)
                    setOpenMenuId(null)
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#FF4444',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF5F5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <i className="fas fa-trash"></i>
                  削除する
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onLike={onLike}
              onDelete={onDelete}
              onReply={onReply}
              currentUserId={currentUserId}
              formatDate={formatDate}
              depth={depth === 0 ? 1 : 2}
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