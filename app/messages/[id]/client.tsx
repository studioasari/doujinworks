'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/app/components/Header'
import styles from './page.module.css'

type Message = {
  id: string
  chat_room_id: string
  sender_id: string
  content: string
  created_at: string
  file_url: string | null
  file_type: string | null
  file_name: string | null
  deleted: boolean
  request_card_id: string | null
  // 楽観的UI用
  _optimistic?: boolean
  _failed?: boolean
}

type WorkRequest = {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  category: string
  status: string
  created_at: string
}

type OtherUser = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
}

type ChatRoom = {
  id: string
  updated_at: string
  related_request_id: string | null
  other_user: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  last_message: {
    content: string
    created_at: string
    file_type: string | null
  } | null
  unread_count: number
  pinned: boolean
}

type ContextMenu = {
  x: number
  y: number
  type: 'room' | 'message'
  roomId?: string
  messageId?: string
  isPinned?: boolean
} | null

const MESSAGES_PER_PAGE = 30

function SidebarSkeleton() {
  return (
    <div className={styles.sidebarSkeleton}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={styles.skeletonRoom}>
          <div className={`${styles.skeletonAvatar} ${styles.skeleton}`} />
          <div className={styles.skeletonContent}>
            <div className={`${styles.skeletonText} ${styles.skeleton}`} style={{ width: '80px' }} />
            <div className={`${styles.skeletonText} ${styles.skeletonTextShort} ${styles.skeleton}`} />
          </div>
        </div>
      ))}
    </div>
  )
}

// メッセージスケルトン
function MessagesSkeleton() {
  return (
    <div className={styles.messagesSkeleton}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`${styles.skeletonRow} ${i % 2 === 0 ? styles.sent : ''}`}>
          {i % 2 !== 0 && <div className={`${styles.skeletonAvatar} ${styles.skeleton}`} />}
          <div className={`${styles.skeletonBubble} ${styles.skeleton}`} style={{ width: `${100 + (i * 30)}px` }} />
        </div>
      ))}
    </div>
  )
}

function RequestCardComponent({ request }: { request: WorkRequest }) {
  return (
    <div className={styles.requestCard}>
      <div className={styles.requestCardHeader}>
        <i className="fas fa-clipboard-list"></i>
        <span>お仕事の依頼</span>
      </div>
      <h3 className={styles.requestCardTitle}>{request.title}</h3>
      <div className={styles.requestCardMeta}>
        {(request.budget_min || request.budget_max) && (
          <div>予算: {request.budget_min?.toLocaleString() || '未設定'}〜{request.budget_max?.toLocaleString() || '未設定'}円</div>
        )}
        {request.deadline && (
          <div>納期: {new Date(request.deadline).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</div>
        )}
      </div>
      <p className={styles.requestCardDesc}>{request.description}</p>
      <Link href={`/requests/${request.id}`} className={styles.requestCardLink}>
        依頼詳細を見る <i className="fas fa-arrow-right"></i>
      </Link>
    </div>
  )
}

export default function ChatRoomPage() {
  const params = useParams()
  const initialRoomId = params.id as string
  const router = useRouter()
  
  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialRoomId)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sidebarLoading, setSidebarLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [otherUserLastReadAt, setOtherUserLastReadAt] = useState<string | null>(null)
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [enlargedMedia, setEnlargedMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({})
  const [justSentMessageId, setJustSentMessageId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [relatedRequests, setRelatedRequests] = useState<WorkRequest[]>([])
  const [requestCards, setRequestCards] = useState<{ [key: string]: WorkRequest }>({})
  
  // 新機能用state
  const [isDragging, setIsDragging] = useState(false)
  const [showNewMessageButton, setShowNewMessageButton] = useState(false)
  const [newMessageCount, setNewMessageCount] = useState(0)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<any>(null)
  const readStatusChannelRef = useRef<any>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)

  // ルーム切り替え
  const switchRoom = useCallback((newRoomId: string) => {
    if (newRoomId === selectedRoomId) return
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (readStatusChannelRef.current) {
      supabase.removeChannel(readStatusChannelRef.current)
      readStatusChannelRef.current = null
    }
    
    setMessages([])
    setOtherUser(null)
    setOtherUserLastReadAt(null)
    setRelatedRequests([])
    setRequestCards({})
    setHasMoreMessages(true)
    setOldestMessageId(null)
    setNewMessage('')
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setShowNewMessageButton(false)
    setNewMessageCount(0)
    
    setSelectedRoomId(newRoomId)
    window.history.pushState(null, '', `/messages/${newRoomId}`)
  }, [selectedRoomId, previewUrl])

  // ブラウザの戻る/進む対応
  useEffect(() => {
    const handlePopState = () => {
      const pathParts = window.location.pathname.split('/')
      const roomIdFromUrl = pathParts[pathParts.length - 1]
      if (roomIdFromUrl && roomIdFromUrl !== selectedRoomId) {
        switchRoom(roomIdFromUrl)
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [selectedRoomId, switchRoom])

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      fetchChatRooms(currentProfileId)
    }
  }, [currentProfileId])

  useEffect(() => {
    if (currentProfileId && selectedRoomId) {
      setMessagesLoading(true)
      setIsInitialLoad(true)
      fetchMessages()
      fetchOtherUser()
      
      const msgChannel = supabase
        .channel(`chat_room_${selectedRoomId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${selectedRoomId}`
        }, handleNewMessage)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${selectedRoomId}`
        }, handleMessageUpdate)
        .subscribe()
      
      const readChannel = supabase
        .channel(`read_status_${selectedRoomId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_room_participants',
          filter: `chat_room_id=eq.${selectedRoomId}`
        }, handleReadStatusUpdate)
        .subscribe()
      
      channelRef.current = msgChannel
      readStatusChannelRef.current = readChannel
      
      updateLastReadAt()
    }
    
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (readStatusChannelRef.current) supabase.removeChannel(readStatusChannelRef.current)
    }
  }, [currentProfileId, selectedRoomId])

  useEffect(() => {
    if (otherUser && currentProfileId && selectedRoomId) {
      fetchOtherUserLastReadAt()
    }
  }, [otherUser, currentProfileId, selectedRoomId])

  useEffect(() => {
    if (!currentProfileId || !selectedRoomId) return

    const handleVisibilityChange = () => {
      if (!document.hidden && document.hasFocus()) updateLastReadAt()
    }
    const handleFocus = () => {
      if (!document.hidden) updateLastReadAt()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [currentProfileId, selectedRoomId])

  useEffect(() => {
    if (messages.length > 0 && !messagesLoading) {
      if (isInitialLoad) {
        scrollToBottom(true)
      }
      generateSignedUrlsBatch()
      fetchRequestCards()
      
      const timer = setTimeout(() => setIsInitialLoad(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [messagesLoading, messages.length])

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      if (newMessage === '') {
        textarea.style.height = '44px'
        textarea.style.overflowY = 'hidden'
      } else {
        textarea.style.height = '44px'
        const newHeight = Math.min(textarea.scrollHeight, 144)
        textarea.style.height = newHeight + 'px'
        textarea.style.overflowY = newHeight >= 144 ? 'auto' : 'hidden'
      }
    }
  }, [newMessage])

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      if (container.scrollTop < 100 && hasMoreMessages && !loadingMore && !messagesLoading) {
        loadMoreMessages()
      }
      
      if (isNearBottom()) {
        setShowNewMessageButton(false)
        setNewMessageCount(0)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMoreMessages, loadingMore, messagesLoading, oldestMessageId])

  useEffect(() => {
    if (enlargedMedia) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [enlargedMedia])

  // ========== Handler Functions ==========
  
  function handleNewMessage(payload: any) {
    const newMsg = payload.new as Message
    // 楽観的UIで既に追加済みの場合は、_optimisticフラグを外すだけ
    setMessages(prev => {
      const existingIndex = prev.findIndex(m => m.id === newMsg.id)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = { ...newMsg, _optimistic: false }
        return updated
      }
      // 自分が送ったメッセージでない場合のみ追加
      if (newMsg.sender_id !== currentProfileId && !newMsg.deleted) {
        const nearBottom = isNearBottom()
        if (!nearBottom) {
          setShowNewMessageButton(true)
          setNewMessageCount(prev => prev + 1)
        }
        updateLastReadAt()
        if (nearBottom) {
          setTimeout(() => scrollToBottom(true), 50)
        }
        return [...prev, newMsg]
      }
      return prev
    })
    updateSidebarLastMessage(newMsg)
  }

  function handleMessageUpdate(payload: any) {
    const updatedMsg = payload.new as Message
    if (updatedMsg.deleted) {
      setMessages(prev => prev.filter(m => m.id !== updatedMsg.id))
    }
  }

  function handleReadStatusUpdate(payload: any) {
    const updated = payload.new as any
    if (updated.profile_id !== currentProfileId) {
      setOtherUserLastReadAt(updated.last_read_at)
    }
  }

  function updateSidebarLastMessage(msg: Message) {
    setChatRooms(prev => {
      const updated = prev.map(room => {
        if (room.id === selectedRoomId) {
          return {
            ...room,
            updated_at: new Date().toISOString(),
            last_message: { content: msg.content, created_at: msg.created_at, file_type: msg.file_type }
          }
        }
        return room
      })
      return sortRooms(updated)
    })
  }

  function sortRooms(rooms: ChatRoom[]) {
    return rooms.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }

  // ========== API Functions ==========

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
    if (profile) setCurrentProfileId(profile.id)
  }

  async function fetchChatRooms(profileId: string) {
    setSidebarLoading(true)

    const { data: participations } = await supabase
      .from('chat_room_participants')
      .select('chat_room_id, last_read_at, pinned, hidden')
      .eq('profile_id', profileId)
      .eq('hidden', false)

    if (!participations || participations.length === 0) {
      setSidebarLoading(false)
      return
    }

    const roomsData: ChatRoom[] = []

    for (const participation of participations) {
      const roomIdTemp = participation.chat_room_id

      const { data: otherParticipants } = await supabase
        .from('chat_room_participants')
        .select('profile_id, profiles!chat_room_participants_profile_id_fkey(id, display_name, avatar_url)')
        .eq('chat_room_id', roomIdTemp)
        .neq('profile_id', profileId)

      const { data: lastMessage } = await supabase
        .from('messages')
        .select('content, created_at, file_type')
        .eq('chat_room_id', roomIdTemp)
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_room_id', roomIdTemp)
        .eq('deleted', false)
        .neq('sender_id', profileId)
        .gt('created_at', participation.last_read_at || '1970-01-01')

      const { data: roomData } = await supabase
        .from('chat_rooms')
        .select('updated_at, related_request_id')
        .eq('id', roomIdTemp)
        .single()

      if (otherParticipants && otherParticipants.length > 0) {
        const otherUserData = otherParticipants[0].profiles as any
        roomsData.push({
          id: roomIdTemp,
          updated_at: roomData?.updated_at || '',
          related_request_id: roomData?.related_request_id || null,
          other_user: {
            id: otherUserData.id,
            display_name: otherUserData.display_name,
            avatar_url: otherUserData.avatar_url
          },
          last_message: lastMessage || null,
          unread_count: unreadCount || 0,
          pinned: participation.pinned || false
        })
      }
    }

    setChatRooms(sortRooms(roomsData))
    setSidebarLoading(false)
  }

  async function fetchOtherUser() {
    const { data } = await supabase
      .from('chat_room_participants')
      .select('profile_id, profiles!chat_room_participants_profile_id_fkey(id, username, display_name, avatar_url, bio)')
      .eq('chat_room_id', selectedRoomId)
      .neq('profile_id', currentProfileId)
      .single()

    if (data) {
      const profile = data.profiles as any
      setOtherUser({
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio
      })
    }
  }

  async function fetchOtherUserLastReadAt() {
    const { data } = await supabase
      .from('chat_room_participants')
      .select('last_read_at')
      .eq('chat_room_id', selectedRoomId)
      .neq('profile_id', currentProfileId)
      .single()

    if (data) setOtherUserLastReadAt(data.last_read_at)
  }

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', selectedRoomId)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PER_PAGE)

    if (!error && data) {
      setMessages(data.reverse())
      if (data.length > 0) {
        setOldestMessageId(data[0].id)
        setHasMoreMessages(data.length === MESSAGES_PER_PAGE)
      } else {
        setHasMoreMessages(false)
      }
    }
    setMessagesLoading(false)
  }

  async function loadMoreMessages() {
    if (!oldestMessageId || loadingMore || !hasMoreMessages) return
    setLoadingMore(true)

    const oldestMessage = messages[0]
    if (!oldestMessage) { setLoadingMore(false); return }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', selectedRoomId)
      .eq('deleted', false)
      .lt('created_at', oldestMessage.created_at)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PER_PAGE)

    if (data && data.length > 0) {
      const container = messagesContainerRef.current
      const oldScrollHeight = container?.scrollHeight || 0
      
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMessages = data.reverse().filter(m => !existingIds.has(m.id))
        return [...newMessages, ...prev]
      })
      
      setOldestMessageId(data[data.length - 1].id)
      setHasMoreMessages(data.length === MESSAGES_PER_PAGE)
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container) container.scrollTop = container.scrollHeight - oldScrollHeight
        })
      })
    } else {
      setHasMoreMessages(false)
    }
    setLoadingMore(false)
  }

  async function fetchRequestCards() {
    const requestCardIds = messages.filter(m => m.request_card_id).map(m => m.request_card_id!)
    if (requestCardIds.length === 0) return

    const { data } = await supabase.from('work_requests').select('*').in('id', requestCardIds)
    if (data) {
      const cardsMap: { [key: string]: WorkRequest } = {}
      data.forEach(req => { cardsMap[req.id] = req })
      setRequestCards(cardsMap)
      setRelatedRequests(data)
    }
  }

  // 一括署名付きURL取得（改善版）
  async function generateSignedUrlsBatch() {
    const keysToGenerate = messages
      .filter(m => m.file_url && !signedUrls[m.file_url])
      .map(m => m.file_url!)
    
    if (keysToGenerate.length === 0) return

    try {
      const response = await fetch('/api/r2-signed-url-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'chats', keys: keysToGenerate })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.urls) {
          setSignedUrls(prev => ({ ...prev, ...data.urls }))
        }
      }
    } catch (error) {
      console.error('一括署名付きURL生成エラー:', error)
    }
  }

  async function updateLastReadAt() {
    if (document.hidden || !document.hasFocus()) return

    await supabase
      .from('chat_room_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_room_id', selectedRoomId)
      .eq('profile_id', currentProfileId)

    setChatRooms(prev => prev.map(room => 
      room.id === selectedRoomId ? { ...room, unread_count: 0 } : room
    ))
  }

  // ========== UI Helper Functions ==========

  function isNearBottom() {
    const container = messagesContainerRef.current
    if (!container) return true
    return container.scrollHeight - container.scrollTop - container.clientHeight < 100
  }

  function scrollToBottom(force = false) {
    const container = messagesContainerRef.current
    if (container && (force || isNearBottom())) {
      container.scrollTop = container.scrollHeight
    }
  }

  const handleMediaLoad = (messageId: string) => {
    if (isInitialLoad || messageId === justSentMessageId) {
      scrollToBottom(true)
      if (messageId === justSentMessageId) setJustSentMessageId(null)
    }
  }

  const getFileType = (file: File): string => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type === 'application/pdf') return 'pdf'
    if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed') return 'zip'
    return 'file'
  }

  const processFile = (file: File) => {
    if (file.size > 50 * 1024 * 1024) { 
      alert('ファイルサイズは50MB以下にしてください')
      return false
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf', 'application/zip', 'application/x-zip-compressed']
    if (!validTypes.includes(file.type)) { 
      alert('対応ファイル形式: JPG, PNG, GIF, WebP, MP4, MOV, WebM, PDF, ZIP')
      return false
    }

    setSelectedFile(file)
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
    return true
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) {
          const fileName = `pasted-image-${Date.now()}.png`
          const renamedFile = new File([file], fileName, { type: file.type })
          processFile(renamedFile)
        }
        break
      }
    }
  }

  const handleTouchStart = (e: React.TouchEvent, message: Message) => {
    if (message.sender_id !== currentProfileId) return
    
    touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    
    longPressTimerRef.current = setTimeout(() => {
      const touch = e.touches[0]
      let x = touch.clientX
      let y = touch.clientY
      if (x + 180 > window.innerWidth) x = window.innerWidth - 190
      if (y + 60 > window.innerHeight) y = window.innerHeight - 70
      setContextMenu({ x, y, type: 'message', messageId: message.id })
      
      if (navigator.vibrate) navigator.vibrate(50)
    }, 500)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return
    
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x)
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y)
    
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    touchStartPosRef.current = null
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadFile = async (file: File): Promise<{ url: string; type: string } | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'chats')
      formData.append('category', selectedRoomId)
      formData.append('userId', currentProfileId)

      const response = await fetch('/api/upload-chat', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('アップロードに失敗しました')
      const data = await response.json()
      return { url: data.key, type: getFileType(file) }
    } catch (error) {
      console.error('ファイルアップロードエラー:', error)
      return null
    }
  }

  // 楽観的UI更新を使ったメッセージ送信
  async function sendMessage() {
    if ((!newMessage.trim() && !selectedFile) || sending) return
    
    const messageContent = newMessage.trim()
    const fileToUpload = selectedFile
    const localPreviewUrl = previewUrl
    
    // 楽観的UIメッセージを作成
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMessage: Message = {
      id: optimisticId,
      chat_room_id: selectedRoomId,
      sender_id: currentProfileId,
      content: messageContent,
      created_at: new Date().toISOString(),
      file_url: localPreviewUrl, // ローカルプレビューURL
      file_type: fileToUpload ? getFileType(fileToUpload) : null,
      file_name: fileToUpload?.name || null,
      deleted: false,
      request_card_id: null,
      _optimistic: true
    }
    
    // 即座にUIに反映
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    handleRemoveFile()
    setTimeout(() => scrollToBottom(true), 50)
    
    setSending(true)
    if (fileToUpload) setUploading(true)

    let fileUrl: string | null = null
    let fileType: string | null = null
    let fileName: string | null = null

    if (fileToUpload) {
      const uploadResult = await uploadFile(fileToUpload)
      if (!uploadResult) {
        // 失敗した場合、楽観的メッセージに失敗フラグを付ける
        setMessages(prev => prev.map(m => 
          m.id === optimisticId ? { ...m, _failed: true } : m
        ))
        alert('ファイルのアップロードに失敗しました')
        setSending(false)
        setUploading(false)
        return
      }
      fileUrl = uploadResult.url
      fileType = uploadResult.type
      fileName = fileToUpload.name
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_room_id: selectedRoomId,
        sender_id: currentProfileId,
        content: messageContent || '',
        file_url: fileUrl,
        file_type: fileType,
        file_name: fileName,
        deleted: false
      })
      .select()
      .single()

    if (error) {
      console.error('メッセージ送信エラー:', error)
      // 失敗した場合、楽観的メッセージに失敗フラグを付ける
      setMessages(prev => prev.map(m => 
        m.id === optimisticId ? { ...m, _failed: true } : m
      ))
      alert('メッセージの送信に失敗しました')
    } else {
      // 成功した場合、楽観的メッセージを実際のメッセージで置き換え
      setMessages(prev => prev.map(m => 
        m.id === optimisticId ? { ...data as Message, _optimistic: false } : m
      ))
      
      if (fileUrl && (fileType === 'image' || fileType === 'video')) {
        setJustSentMessageId(data.id)
        // 新しいファイルの署名付きURLを取得
        generateSignedUrlsBatch()
      }
      
      await supabase.from('chat_rooms').update({ updated_at: new Date().toISOString() }).eq('id', selectedRoomId)
      updateSidebarLastMessage(data as Message)
    }

    setSending(false)
    setUploading(false)
  }

  // 失敗したメッセージの再送信
  async function retryMessage(failedMessage: Message) {
    // 失敗フラグを外して再送信を試みる
    setMessages(prev => prev.map(m => 
      m.id === failedMessage.id ? { ...m, _failed: false, _optimistic: true } : m
    ))
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_room_id: selectedRoomId,
        sender_id: currentProfileId,
        content: failedMessage.content || '',
        file_url: null,
        file_type: null,
        file_name: null,
        deleted: false
      })
      .select()
      .single()

    if (error) {
      setMessages(prev => prev.map(m => 
        m.id === failedMessage.id ? { ...m, _failed: true } : m
      ))
    } else {
      setMessages(prev => prev.map(m => 
        m.id === failedMessage.id ? { ...data as Message, _optimistic: false } : m
      ))
      await supabase.from('chat_rooms').update({ updated_at: new Date().toISOString() }).eq('id', selectedRoomId)
      updateSidebarLastMessage(data as Message)
    }
  }

  function isMessageRead(message: Message): boolean {
    if (message.sender_id !== currentProfileId) return false
    if (!otherUserLastReadAt) return false
    return new Date(otherUserLastReadAt) >= new Date(message.created_at)
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return '今日'
    if (date.toDateString() === yesterday.toDateString()) return '昨日'
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  }

  function formatMessageTime(dateString: string) {
    const diff = Date.now() - new Date(dateString).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}日前`
    if (hours > 0) return `${hours}時間前`
    return '今'
  }

  function getLastMessageText(message: ChatRoom['last_message']): string {
    if (!message) return 'メッセージがありません'
    if (message.content?.trim()) return message.content
    if (message.file_type) {
      const types: { [key: string]: string } = { image: '画像', video: '動画', pdf: 'PDF', zip: 'ZIP' }
      return `${types[message.file_type] || 'ファイル'}を送信しました`
    }
    return 'メッセージ'
  }

  const getFileIcon = (fileType: string | null) => {
    const icons: { [key: string]: string } = { pdf: 'fa-file-pdf', zip: 'fa-file-zipper' }
    return icons[fileType || ''] || 'fa-file'
  }

  const getSignedUrl = (fileUrl: string | null) => fileUrl ? signedUrls[fileUrl] || null : null

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch('/api/r2-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bucket: 'chats', 
          key: fileUrl, 
          download: true, 
          fileName 
        })
      })
      
      if (!response.ok) throw new Error('URL生成失敗')
      
      const data = await response.json()
      window.location.href = data.signedUrl
    } catch (error) {
      console.error('ダウンロードエラー:', error)
      alert('ダウンロードに失敗しました')
    }
  }

  const handleNewMessageButtonClick = () => {
    scrollToBottom(true)
    setShowNewMessageButton(false)
    setNewMessageCount(0)
  }

  // ========== Context Menu ==========

  const handleRoomContextMenu = (e: React.MouseEvent, room: ChatRoom) => {
    e.preventDefault()
    let x = e.clientX, y = e.clientY
    if (x + 180 > window.innerWidth) x = window.innerWidth - 190
    if (y + 100 > window.innerHeight) y = window.innerHeight - 110
    setContextMenu({ x, y, type: 'room', roomId: room.id, isPinned: room.pinned })
  }

  const handleMessageContextMenu = (e: React.MouseEvent, message: Message) => {
    if (message.sender_id !== currentProfileId || message._optimistic) return
    e.preventDefault()
    let x = e.clientX, y = e.clientY
    if (x + 180 > window.innerWidth) x = window.innerWidth - 190
    if (y + 60 > window.innerHeight) y = window.innerHeight - 70
    setContextMenu({ x, y, type: 'message', messageId: message.id })
  }

  const handleTogglePin = async (roomId: string, isPinned: boolean) => {
    await supabase.from('chat_room_participants').update({ pinned: !isPinned }).eq('chat_room_id', roomId).eq('profile_id', currentProfileId)
    setChatRooms(prev => sortRooms(prev.map(room => room.id === roomId ? { ...room, pinned: !isPinned } : room)))
    setContextMenu(null)
  }

  const handleHideRoom = async (targetRoomId: string) => {
    if (!confirm('このトークを削除しますか？')) { setContextMenu(null); return }
    await supabase.from('chat_room_participants').update({ hidden: true }).eq('chat_room_id', targetRoomId).eq('profile_id', currentProfileId)
    setChatRooms(prev => prev.filter(room => room.id !== targetRoomId))
    if (targetRoomId === selectedRoomId) router.push('/messages')
    setContextMenu(null)
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('このメッセージを削除しますか？')) { setContextMenu(null); return }
    await supabase.from('messages').update({ deleted: true }).eq('id', messageId)
    setMessages(prev => prev.filter(m => m.id !== messageId))
    setContextMenu(null)
  }

  // ========== Render ==========

  return (
    <>
      <Header />
      <div className={styles.chatContainer}>
        {/* サイドバー */}
        <aside className={styles.sidebar}>
          {sidebarLoading ? (
            <SidebarSkeleton />
          ) : chatRooms.length === 0 ? (
            <div className={styles.emptyState}>
              <p>メッセージがありません</p>
            </div>
          ) : (
            <div className={styles.sidebarList}>
              {chatRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => switchRoom(room.id)}
                  onContextMenu={(e) => handleRoomContextMenu(e, room)}
                  className={`${styles.roomItem} ${room.id === selectedRoomId ? styles.active : ''}`}
                >
                  {room.pinned && <i className={`fas fa-thumbtack ${styles.roomPinIcon}`}></i>}
                  
                  <div className={styles.roomAvatar}>
                    {room.other_user.avatar_url ? (
                      <Image src={room.other_user.avatar_url} alt={room.other_user.display_name || ''} width={44} height={44} sizes="44px" />
                    ) : (
                      room.other_user.display_name?.charAt(0) || '?'
                    )}
                    {room.unread_count > 0 && (
                      <span className={styles.roomUnreadBadge}>{room.unread_count > 99 ? '99+' : room.unread_count}</span>
                    )}
                  </div>

                  <div className={styles.roomContent}>
                    <div className={styles.roomHeader}>
                      <h3 className={`${styles.roomName} ${room.unread_count > 0 ? styles.unread : ''}`}>
                        {room.other_user.display_name || '名前未設定'}
                      </h3>
                      <span className={styles.roomTime}>{room.last_message && formatMessageTime(room.last_message.created_at)}</span>
                    </div>
                    <p className={`${styles.roomLastMessage} ${room.unread_count > 0 ? styles.unread : ''}`}>
                      {getLastMessageText(room.last_message)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* メインエリア */}
        <div 
          className={styles.main}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className={styles.dropZone}>
              <i className="fas fa-cloud-upload-alt"></i>
              <p>ファイルをドロップして送信</p>
            </div>
          )}

          {/* モバイルヘッダー */}
          {otherUser && (
            <div className={styles.mobileHeader}>
              <div className={styles.mobileAvatar} onClick={() => setShowProfileModal(true)}>
                {otherUser.avatar_url ? <Image src={otherUser.avatar_url} alt="" width={36} height={36} sizes="36px" /> : otherUser.display_name?.charAt(0) || '?'}
              </div>
              <span className={styles.mobileName} onClick={() => setShowProfileModal(true)}>{otherUser.display_name || '名前未設定'}</span>
            </div>
          )}

          {/* 関連依頼バー */}
          {relatedRequests.length > 0 && (
            <div className={styles.requestBar}>
              {relatedRequests.map((req) => (
                <Link key={req.id} href={`/requests/${req.id}`} className={styles.requestBarItem}>
                  <i className={`fas fa-clipboard-list ${styles.requestBarIcon}`}></i>
                  <div className={styles.requestBarContent}>
                    <div className={styles.requestBarLabel}>お仕事の依頼</div>
                    <div className={styles.requestBarTitle}>{req.title}</div>
                  </div>
                  <div className={styles.requestBarMeta}>
                    {(req.budget_min || req.budget_max) && (
                      <div>{req.budget_min?.toLocaleString()}〜{req.budget_max?.toLocaleString()}円</div>
                    )}
                    {req.deadline && (
                      <div>{new Date(req.deadline).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</div>
                    )}
                  </div>
                  <i className="fas fa-chevron-right"></i>
                </Link>
              ))}
            </div>
          )}

          {/* メッセージエリア */}
          <div className={styles.messagesArea} ref={messagesContainerRef}>
            {loadingMore && (
              <div className={styles.loadingMore}>
                <i className="fas fa-spinner fa-spin"></i> 読み込み中...
              </div>
            )}

            {messagesLoading ? (
              <MessagesSkeleton />
            ) : messages.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="far fa-comments"></i>
                <p>メッセージがありません</p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  const isCurrentUser = message.sender_id === currentProfileId
                  const showDate = index === 0 || new Date(messages[index - 1].created_at).toDateString() !== new Date(message.created_at).toDateString()
                  // 楽観的UIの場合はローカルプレビューURLを使用、それ以外は署名付きURL
                  const signedUrl = message._optimistic && message.file_url?.startsWith('blob:') 
                    ? message.file_url 
                    : getSignedUrl(message.file_url)

                  return (
                    <div key={message.id}>
                      {showDate && <div className={styles.dateDivider}><span className={styles.dateDividerText}>{formatDate(message.created_at)}</span></div>}

                      <div 
                        className={`${styles.messageRow} ${isCurrentUser ? styles.sent : styles.received} ${message._optimistic ? styles.optimistic : ''} ${message._failed ? styles.failed : ''}`}
                        onTouchStart={(e) => handleTouchStart(e, message)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <div className={styles.messageBubbleArea}>
                          {!isCurrentUser && otherUser && (
                            <div className={styles.messageAvatar} onClick={() => setShowProfileModal(true)}>
                              {otherUser.avatar_url ? <Image src={otherUser.avatar_url} alt="" width={32} height={32} sizes="32px" /> : otherUser.display_name?.charAt(0) || '?'}
                            </div>
                          )}

                          <div className={styles.messageContent}>
                            {message.request_card_id && requestCards[message.request_card_id] && (
                              <RequestCardComponent request={requestCards[message.request_card_id]} />
                            )}

                            {(message.file_type === 'image' || message.file_type === 'video') && signedUrl && (
                              <div className={styles.mediaWrapper} onContextMenu={(e) => handleMessageContextMenu(e, message)}>
                                {message.file_type === 'image' ? (
                                  <img 
                                    src={signedUrl} 
                                    alt="" 
                                    loading="lazy"
                                    onLoad={() => handleMediaLoad(message.id)} 
                                    onClick={() => !message._optimistic && setEnlargedMedia({ url: signedUrl, type: 'image' })} 
                                  />
                                ) : (
                                  <video 
                                    src={signedUrl} 
                                    controls 
                                    preload="metadata"
                                    onLoadedData={() => handleMediaLoad(message.id)} 
                                    onClick={() => !message._optimistic && setEnlargedMedia({ url: signedUrl, type: 'video' })} 
                                  />
                                )}
                                {!message._optimistic && (
                                  <button className={styles.mediaDownload} onClick={() => handleDownload(message.file_url!, message.file_name || (message.file_type === 'image' ? '画像.jpg' : '動画.mp4'))}>
                                    <i className="fas fa-download"></i> 保存
                                  </button>
                                )}
                              </div>
                            )}

                            {(message.file_type === 'pdf' || message.file_type === 'zip' || message.file_type === 'file') && signedUrl && (
                              <a href={signedUrl} download={message.file_name} target="_blank" rel="noopener noreferrer" className={styles.fileMessage} onContextMenu={(e) => handleMessageContextMenu(e, message)}>
                                <i className={`fas ${getFileIcon(message.file_type)} ${styles.fileIcon}`}></i>
                                <div className={styles.fileInfo}>
                                  <div className={styles.fileName}>{message.file_name}</div>
                                  <div className={styles.fileType}>{message.file_type?.toUpperCase()}</div>
                                </div>
                                <i className={`fas fa-download ${styles.fileDownloadIcon}`}></i>
                              </a>
                            )}

                            {message.content && (
                              <div className={`${styles.bubble} ${isCurrentUser ? styles.sent : styles.received}`} onContextMenu={(e) => handleMessageContextMenu(e, message)}>
                                {message.content}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={styles.messageMeta}>
                          {message._optimistic && !message._failed && (
                            <span className={styles.messageSending}>送信中...</span>
                          )}
                          {message._failed && (
                            <button className={styles.messageRetry} onClick={() => retryMessage(message)}>
                              <i className="fas fa-exclamation-circle"></i> 再送信
                            </button>
                          )}
                          {!message._optimistic && !message._failed && (
                            <>
                              <span>{formatTime(message.created_at)}</span>
                              {isCurrentUser && isMessageRead(message) && <span className={styles.messageRead}>既読</span>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </>
            )}

            {showNewMessageButton && (
              <button className={styles.newMessageBtn} onClick={handleNewMessageButtonClick}>
                <i className="fas fa-arrow-down"></i>
                {newMessageCount > 0 && <span>{newMessageCount}件の新着メッセージ</span>}
              </button>
            )}
          </div>

          {/* 入力エリア */}
          <div className={styles.inputArea}>
            {selectedFile && (
              <div className={styles.filePreview}>
                <div className={styles.filePreviewInner}>
                  {selectedFile.type.startsWith('image/') && previewUrl && <img src={previewUrl} alt="プレビュー" />}
                  {selectedFile.type.startsWith('video/') && previewUrl && <video src={previewUrl} controls />}
                  {!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/') && (
                    <div className={styles.filePreviewInfo}>
                      <i className={`fas ${getFileIcon(getFileType(selectedFile))} ${styles.fileIcon}`}></i>
                      <div>
                        <div className={styles.filePreviewName}>{selectedFile.name}</div>
                        <div className={styles.filePreviewType}>{getFileType(selectedFile).toUpperCase()}</div>
                      </div>
                    </div>
                  )}
                  <button className={styles.filePreviewRemove} onClick={handleRemoveFile}><i className="fas fa-times"></i></button>
                </div>
              </div>
            )}

            <div className={styles.inputRow}>
              <input ref={fileInputRef} type="file" accept="image/*,video/*,application/pdf,application/zip" onChange={handleFileSelect} style={{ display: 'none' }} />
              <button className={styles.attachBtn} onClick={() => fileInputRef.current?.click()} disabled={sending || uploading}>
                <i className="fas fa-paperclip"></i>
              </button>
              <textarea
                ref={textareaRef}
                className={styles.inputField}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return
                  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                }}
                onPaste={handlePaste}
                placeholder="メッセージを入力..."
                disabled={sending}
                rows={1}
              />
              <button className={styles.sendBtn} onClick={sendMessage} disabled={(!newMessage.trim() && !selectedFile) || sending}>
                {uploading ? 'アップロード中...' : '送信'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* コンテキストメニュー */}
      {contextMenu && (
        <div className={styles.contextMenu} style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          {contextMenu.type === 'room' && (
            <>
              <button className={styles.contextItem} onClick={() => handleTogglePin(contextMenu.roomId!, contextMenu.isPinned!)}>
                <i className={`fas fa-thumbtack ${styles.contextIcon}`}></i>
                {contextMenu.isPinned ? 'ピン止めを外す' : 'ピン止め'}
              </button>
              <button className={`${styles.contextItem} ${styles.danger}`} onClick={() => handleHideRoom(contextMenu.roomId!)}>
                <i className={`fas fa-trash ${styles.contextIcon}`}></i>トークを削除
              </button>
            </>
          )}
          {contextMenu.type === 'message' && (
            <button className={`${styles.contextItem} ${styles.danger}`} onClick={() => handleDeleteMessage(contextMenu.messageId!)}>
              <i className={`fas fa-trash ${styles.contextIcon}`}></i>メッセージを削除
            </button>
          )}
        </div>
      )}

      {/* メディア拡大モーダル */}
      {enlargedMedia && (
        <div className={styles.mediaModal} onClick={() => setEnlargedMedia(null)}>
          <button className={styles.mediaModalClose} onClick={() => setEnlargedMedia(null)}><i className="fas fa-times"></i></button>
          {enlargedMedia.type === 'image' ? (
            <img src={enlargedMedia.url} alt="" onClick={(e) => e.stopPropagation()} />
          ) : (
            <video src={enlargedMedia.url} controls autoPlay onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}

      {/* プロフィールモーダル */}
      {showProfileModal && otherUser && (
        <div className={styles.profileModal} onClick={() => setShowProfileModal(false)}>
          <div className={styles.profileCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.profileAvatar}>
              {otherUser.avatar_url ? <Image src={otherUser.avatar_url} alt="" width={80} height={80} sizes="80px" /> : <i className="fas fa-user"></i>}
            </div>
            <h2 className={styles.profileName}>{otherUser.display_name || '名前未設定'}</h2>
            {otherUser.username && <p className={styles.profileUsername}>@{otherUser.username}</p>}
            {otherUser.bio && <p className={styles.profileBio}>{otherUser.bio}</p>}
            <div className={styles.profileActions}>
              {otherUser.username && (
                <Link href={`/creators/${otherUser.username}`} className="btn btn-primary">プロフィールを見る</Link>
              )}
              <button className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}