'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
  file_url: string | null
  file_type: string | null
  file_name: string | null
  deleted: boolean
  request_card_id: string | null
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

function RequestCardComponent({ request }: { request: WorkRequest }) {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E5E5E5',
      borderRadius: '12px',
      padding: '20px',
      maxWidth: '400px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <i className="fas fa-clipboard-list" style={{ color: '#6B6B6B', fontSize: '16px' }}></i>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#6B6B6B' }}>
          お仕事の依頼
        </span>
      </div>

      <h3 style={{
        fontSize: '15px',
        fontWeight: '600',
        marginBottom: '8px',
        color: '#1A1A1A'
      }}>
        {request.title}
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '13px',
        color: '#6B6B6B',
        marginBottom: '12px'
      }}>
        {(request.budget_min || request.budget_max) && (
          <div>
            予算: {request.budget_min?.toLocaleString() || '未設定'}〜{request.budget_max?.toLocaleString() || '未設定'}円
          </div>
        )}
        {request.deadline && (
          <div>
            納期: {new Date(request.deadline).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>

      <p style={{
        fontSize: '13px',
        color: '#6B6B6B',
        lineHeight: '1.6',
        marginBottom: '12px',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {request.description}
      </p>

      <Link
        href={`/requests/${request.id}`}
        style={{
          display: 'inline-block',
          padding: '8px 16px',
          backgroundColor: '#F5F5F5',
          color: '#1A1A1A',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '600',
          textDecoration: 'none',
          transition: 'background-color 0.2s'
        }}
      >
        依頼詳細を見る <i className="fas fa-arrow-right" style={{ fontSize: '11px', marginLeft: '4px' }}></i>
      </Link>
    </div>
  )
}

export default function ChatRoomPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentProfileId) {
      fetchChatRooms(currentProfileId)
    }
  }, [currentProfileId])

  useEffect(() => {
    if (currentProfileId && roomId) {
      setIsInitialLoad(false)
      fetchMessages(true)
      fetchOtherUser(currentProfileId)
      const unsubscribeMessages = subscribeToMessages()
      const unsubscribeReadStatus = subscribeToReadStatus()
      updateLastReadAt()
      
      return () => {
        unsubscribeMessages()
        unsubscribeReadStatus()
      }
    }
  }, [currentProfileId, roomId])

  useEffect(() => {
    if (otherUser && currentProfileId && roomId) {
      fetchOtherUserLastReadAt()
    }
  }, [otherUser, currentProfileId, roomId])

  useEffect(() => {
    if (!currentProfileId || !roomId) return

    const handleVisibilityChange = () => {
      if (!document.hidden && document.hasFocus()) {
        updateLastReadAt()
      }
    }

    const handleFocus = () => {
      if (!document.hidden) {
        updateLastReadAt()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [currentProfileId, roomId])

  useEffect(() => {
    if (messages.length > 0 && !loading) {
      scrollToBottom(true)
      generateSignedUrls()
      fetchRequestCards()
      setIsInitialLoad(true)
      
      const timer = setTimeout(() => {
        setIsInitialLoad(false)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [loading, messages.length])

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      
      if (newMessage === '') {
        textarea.style.height = '44px'
        textarea.style.overflowY = 'hidden'
      } else {
        textarea.style.height = '44px'
        const newHeight = textarea.scrollHeight
        
        const maxHeight = 144
        
        if (newHeight > maxHeight) {
          textarea.style.height = maxHeight + 'px'
          textarea.style.overflowY = 'auto'
        } else if (newHeight > 44) {
          textarea.style.height = newHeight + 'px'
          textarea.style.overflowY = 'hidden'
        }
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
      if (container.scrollTop < 100 && hasMoreMessages && !loadingMore && !loading) {
        loadMoreMessages()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMoreMessages, loadingMore, loading, oldestMessageId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      setCurrentProfileId(profile.id)
    }
  }

  async function fetchRequestCards() {
    const requestCardIds = messages
      .filter(m => m.request_card_id)
      .map(m => m.request_card_id!)
      .filter((id, index, self) => self.indexOf(id) === index)

    if (requestCardIds.length === 0) return

    const { data } = await supabase
      .from('work_requests')
      .select('*')
      .in('id', requestCardIds)

    if (data) {
      const cardsMap: { [key: string]: WorkRequest } = {}
      data.forEach(req => {
        cardsMap[req.id] = req
      })
      setRequestCards(cardsMap)
      setRelatedRequests(data)
    }
  }

  async function generateSignedUrls() {
    const urlsToGenerate: { [key: string]: string } = {}
    
    for (const message of messages) {
      if (message.file_url && !signedUrls[message.file_url]) {
        try {
          // R2署名付きURL生成（APIルート経由）
          const response = await fetch('/api/r2-signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bucket: 'chats',
              key: message.file_url
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.signedUrl) {
              urlsToGenerate[message.file_url] = data.signedUrl
            }
          }
        } catch (error) {
          console.error('署名付きURL生成エラー:', error)
        }
      }
    }
    
    if (Object.keys(urlsToGenerate).length > 0) {
      setSignedUrls(prev => ({ ...prev, ...urlsToGenerate }))
    }
  }

  async function fetchChatRooms(profileId: string) {
    const { data: participations, error: participationsError } = await supabase
      .from('chat_room_participants')
      .select('chat_room_id, last_read_at, pinned, hidden')
      .eq('profile_id', profileId)
      .eq('hidden', false)

    if (participationsError || !participations || participations.length === 0) {
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

    roomsData.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

    setChatRooms(roomsData)
  }

  async function fetchOtherUser(profileId: string) {
    const { data } = await supabase
      .from('chat_room_participants')
      .select('profile_id, profiles!chat_room_participants_profile_id_fkey(id, username, display_name, avatar_url, bio)')
      .eq('chat_room_id', roomId)
      .neq('profile_id', profileId)
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
      .eq('chat_room_id', roomId)
      .neq('profile_id', currentProfileId)
      .single()

    if (data) {
      setOtherUserLastReadAt(data.last_read_at)
    }
  }

  async function fetchMessages(isInitial = false) {
    if (isInitial) {
      setLoading(true)
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', roomId)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PER_PAGE)

    if (error) {
      console.error('メッセージ取得エラー:', error)
    } else {
      const reversedData = (data || []).reverse()
      setMessages(reversedData)
      
      if (data && data.length > 0) {
        setOldestMessageId(data[data.length - 1].id)
        setHasMoreMessages(data.length === MESSAGES_PER_PAGE)
      } else {
        setHasMoreMessages(false)
      }
    }

    if (isInitial) {
      setLoading(false)
    }
  }

  async function loadMoreMessages() {
    if (!oldestMessageId || loadingMore || !hasMoreMessages) return

    setLoadingMore(true)

    const oldestMessage = messages[0]
    if (!oldestMessage) {
      setLoadingMore(false)
      return
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', roomId)
      .eq('deleted', false)
      .lt('created_at', oldestMessage.created_at)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PER_PAGE)

    if (error) {
      console.error('追加メッセージ取得エラー:', error)
    } else {
      if (data && data.length > 0) {
        const reversedData = data.reverse()
        
        const container = messagesContainerRef.current
        const oldScrollHeight = container?.scrollHeight || 0
        
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const newMessages = reversedData.filter(m => !existingIds.has(m.id))
          return [...newMessages, ...prev]
        })
        
        setOldestMessageId(data[data.length - 1].id)
        setHasMoreMessages(data.length === MESSAGES_PER_PAGE)
        
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight
            container.scrollTop = newScrollHeight - oldScrollHeight
          }
        }, 0)
      } else {
        setHasMoreMessages(false)
      }
    }

    setLoadingMore(false)
  }

  function isNearBottom() {
    const container = messagesContainerRef.current
    if (!container) return true
    const threshold = 100
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }

  function scrollToBottom(force = false) {
    const container = messagesContainerRef.current
    if (!container) return
    
    if (force || isNearBottom()) {
      container.scrollTop = container.scrollHeight
    }
  }

  const handleMediaLoad = (messageId: string) => {
    if (isInitialLoad || messageId === justSentMessageId) {
      scrollToBottom(true)
      
      if (messageId === justSentMessageId) {
        setJustSentMessageId(null)
      }
    }
  }

  const getFileType = (file: File): string => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type === 'application/pdf') return 'pdf'
    if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed') return 'zip'
    return 'file'
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      alert('ファイルサイズは50MB以下にしてください')
      return
    }

    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm',
      'application/pdf',
      'application/zip', 'application/x-zip-compressed'
    ]
    
    if (!validTypes.includes(file.type)) {
      alert('対応ファイル形式: JPG, PNG, GIF, WebP, MP4, MOV, WebM, PDF, ZIP')
      return
    }

    setSelectedFile(file)
    
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (file: File): Promise<{ url: string; type: string } | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'chats')
      formData.append('category', roomId)
      formData.append('userId', currentProfileId)

      const response = await fetch('/api/upload-chat', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('アップロードに失敗しました')
      }

      const data = await response.json()
      const fileType = getFileType(file)

      return { url: data.key, type: fileType }
    } catch (error) {
      console.error('ファイルアップロードエラー:', error)
      return null
    }
  }

  async function sendMessage() {
    if ((!newMessage.trim() && !selectedFile) || sending) return

    setSending(true)
    const hasFile = !!selectedFile
    if (selectedFile) {
      setUploading(true)
    }

    let fileUrl: string | null = null
    let fileType: string | null = null
    let fileName: string | null = null

    if (selectedFile) {
      const uploadResult = await uploadFile(selectedFile)
      if (!uploadResult) {
        alert('ファイルのアップロードに失敗しました')
        setSending(false)
        setUploading(false)
        return
      }
      fileUrl = uploadResult.url
      fileType = uploadResult.type
      fileName = selectedFile.name
    }

    const messageData = {
      chat_room_id: roomId,
      sender_id: currentProfileId,
      content: newMessage.trim() || '',
      file_url: fileUrl,
      file_type: fileType,
      file_name: fileName,
      deleted: false
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      console.error('メッセージ送信エラー:', error)
      alert('メッセージの送信に失敗しました')
    } else {
      setMessages(prev => {
        if (prev.find(m => m.id === data.id)) {
          return prev
        }
        return [...prev, data as Message]
      })
      
      setNewMessage('')
      handleRemoveFile()
      
      if (hasFile && (data.file_type === 'image' || data.file_type === 'video')) {
        setJustSentMessageId(data.id)
      } else {
        setTimeout(() => scrollToBottom(true), 50)
      }
      
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', roomId)
      
      if (currentProfileId) {
        fetchChatRooms(currentProfileId)
      }
    }

    setSending(false)
    setUploading(false)
  }

  function subscribeToMessages() {
    const channel = supabase
      .channel(`chat_room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${roomId}`
        },
        (payload) => {
          const newMsg = payload.new as Message
          
          if (newMsg.sender_id !== currentProfileId && !newMsg.deleted) {
            const shouldScroll = isNearBottom()
            
            setMessages(prev => {
              if (prev.find(m => m.id === newMsg.id)) {
                return prev
              }
              return [...prev, newMsg]
            })
            
            if (shouldScroll) {
              setTimeout(() => scrollToBottom(true), 50)
            }
            
            updateLastReadAt()
          }
          
          if (currentProfileId) {
            fetchChatRooms(currentProfileId)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${roomId}`
        },
        (payload) => {
          const updatedMsg = payload.new as Message
          
          if (updatedMsg.deleted) {
            setMessages(prev => prev.filter(m => m.id !== updatedMsg.id))
            if (currentProfileId) {
              fetchChatRooms(currentProfileId)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  function subscribeToReadStatus() {
    const channel = supabase
      .channel(`read_status_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_room_participants',
          filter: `chat_room_id=eq.${roomId}`
        },
        (payload) => {
          const updated = payload.new as any
          if (updated.profile_id !== currentProfileId) {
            setOtherUserLastReadAt(updated.last_read_at)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  async function updateLastReadAt() {
    if (document.hidden || !document.hasFocus()) {
      return
    }

    await supabase
      .from('chat_room_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_room_id', roomId)
      .eq('profile_id', currentProfileId)

    if (currentProfileId) {
      fetchChatRooms(currentProfileId)
    }
  }

  function isMessageRead(message: Message): boolean {
    if (message.sender_id !== currentProfileId) return false
    if (!otherUserLastReadAt) return false
    return new Date(otherUserLastReadAt) >= new Date(message.created_at)
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return '今日'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨日'
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
    }
  }

  function formatMessageTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}日前`
    } else if (hours > 0) {
      return `${hours}時間前`
    } else {
      return '今'
    }
  }

  function getLastMessageText(message: ChatRoom['last_message']): string {
    if (!message) return 'メッセージがありません'
    
    if (message.content && message.content.trim() !== '') {
      return message.content
    }
    
    if (message.file_type) {
      switch (message.file_type) {
        case 'image':
          return '画像を送信しました'
        case 'video':
          return '動画を送信しました'
        case 'pdf':
          return 'PDFを送信しました'
        case 'zip':
          return 'ZIPファイルを送信しました'
        default:
          return 'ファイルを送信しました'
      }
    }
    
    return 'メッセージ'
  }

  const getFileIcon = (fileType: string | null) => {
    switch (fileType) {
      case 'pdf':
        return 'fa-file-pdf'
      case 'zip':
        return 'fa-file-zipper'
      case 'file':
        return 'fa-file'
      default:
        return 'fa-file'
    }
  }

  const getSignedUrl = (fileUrl: string | null): string | null => {
    if (!fileUrl) return null
    return signedUrls[fileUrl] || null
  }

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const signedUrl = getSignedUrl(fileUrl)
      if (!signedUrl) {
        alert('ファイルURLの生成に失敗しました')
        return
      }
      
      const response = await fetch(signedUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('ダウンロードエラー:', error)
      alert('ダウンロードに失敗しました')
    }
  }

  const handleRoomContextMenu = (e: React.MouseEvent, room: ChatRoom) => {
    e.preventDefault()
    
    const menuWidth = 180
    const menuHeight = 100
    let x = e.clientX
    let y = e.clientY
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10
    }
    
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10
    }
    
    setContextMenu({
      x,
      y,
      type: 'room',
      roomId: room.id,
      isPinned: room.pinned
    })
  }

  const handleMessageContextMenu = (e: React.MouseEvent, message: Message) => {
    if (message.sender_id !== currentProfileId) {
      return
    }
    
    e.preventDefault()
    
    const menuWidth = 180
    const menuHeight = 60
    let x = e.clientX
    let y = e.clientY
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10
    }
    
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10
    }
    
    setContextMenu({
      x,
      y,
      type: 'message',
      messageId: message.id
    })
  }

  const handleTogglePin = async (roomId: string, isPinned: boolean) => {
    await supabase
      .from('chat_room_participants')
      .update({ pinned: !isPinned })
      .eq('chat_room_id', roomId)
      .eq('profile_id', currentProfileId)

    if (currentProfileId) {
      fetchChatRooms(currentProfileId)
    }
    setContextMenu(null)
  }

  const handleHideRoom = async (roomId: string) => {
    if (!confirm('このトークを削除しますか？（相手からは引き続き見えます）')) {
      setContextMenu(null)
      return
    }

    await supabase
      .from('chat_room_participants')
      .update({ hidden: true })
      .eq('chat_room_id', roomId)
      .eq('profile_id', currentProfileId)

    if (currentProfileId) {
      fetchChatRooms(currentProfileId)
    }
    
    if (roomId === params.id) {
      router.push('/messages')
    }
    
    setContextMenu(null)
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('このメッセージを削除しますか？（お互いに見えなくなります）')) {
      setContextMenu(null)
      return
    }

    await supabase
      .from('messages')
      .update({ deleted: true })
      .eq('id', messageId)

    setMessages(prev => prev.filter(m => m.id !== messageId))
    
    if (currentProfileId) {
      fetchChatRooms(currentProfileId)
    }
    
    setContextMenu(null)
  }

  return (
    <>
      <Header />
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 64px)',
        backgroundColor: '#FFFFFF'
      }}>
        <aside 
          className="hidden-mobile"
          style={{
            width: '320px',
            borderRight: '1px solid #E5E5E5',
            backgroundColor: '#FFFFFF',
            overflowY: 'auto',
            flexShrink: 0
          }}
        >
          {chatRooms.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p className="text-gray text-small">メッセージがありません</p>
            </div>
          ) : (
            <div>
              {chatRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/messages/${room.id}`}
                  onContextMenu={(e) => handleRoomContextMenu(e, room)}
                  className="flex gap-12"
                  style={{
                    alignItems: 'center',
                    padding: '16px 20px',
                    textDecoration: 'none',
                    borderBottom: '1px solid #E5E5E5',
                    backgroundColor: room.id === roomId ? '#F9F9F9' : '#FFFFFF',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (room.id !== roomId) {
                      e.currentTarget.style.backgroundColor = '#F5F5F5'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = room.id === roomId ? '#F9F9F9' : '#FFFFFF'
                  }}
                >
                  {room.pinned && (
                    <i className="fas fa-thumbtack" style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      fontSize: '12px',
                      color: '#6B6B6B'
                    }}></i>
                  )}
                  
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E5E5',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: '#6B6B6B',
                    position: 'relative'
                  }}>
                    {room.other_user.avatar_url ? (
                      <img
                        src={room.other_user.avatar_url}
                        alt={room.other_user.display_name || ''}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '50%'
                        }}
                      />
                    ) : (
                      room.other_user.display_name?.charAt(0) || '?'
                    )}
                    {room.unread_count > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        backgroundColor: '#FF4444',
                        color: '#FFFFFF',
                        borderRadius: '12px',
                        minWidth: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '0 6px',
                        zIndex: 10
                      }}>
                        {room.unread_count}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex-between mb-4" style={{ alignItems: 'baseline' }}>
                      <h3 className="text-small" style={{
                        fontWeight: room.unread_count > 0 ? 'bold' : '600',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {room.other_user.display_name || '名前未設定'}
                      </h3>
                      <span className="text-tiny text-gray" style={{ flexShrink: 0, marginLeft: '8px' }}>
                        {room.last_message && formatMessageTime(room.last_message.created_at)}
                      </span>
                    </div>
                    <p className="text-small text-gray text-ellipsis" style={{
                      fontWeight: room.unread_count > 0 ? '600' : 'normal'
                    }}>
                      {getLastMessageText(room.last_message)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF'
        }}>
          <div 
            className="hidden-desktop"
            style={{
              borderBottom: '1px solid #E5E5E5',
              padding: '12px 20px',
              backgroundColor: '#FFFFFF'
            }}
          >
            {otherUser && (
              <div className="flex gap-12" style={{ alignItems: 'center' }}>
                <Link
                  href="/messages"
                  style={{
                    fontSize: '18px',
                    color: '#6B6B6B',
                    textDecoration: 'none'
                  }}
                >
                  ←
                </Link>
                <div 
                  onClick={() => setShowProfileModal(true)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E5E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    color: '#6B6B6B',
                    overflow: 'hidden',
                    flexShrink: 0,
                    cursor: 'pointer'
                  }}
                >
                  {otherUser.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt={otherUser.display_name || ''}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    otherUser.display_name?.charAt(0) || '?'
                  )}
                </div>
                <div
                  onClick={() => setShowProfileModal(true)}
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    color: '#1A1A1A'
                  }}
                >
                  {otherUser.display_name || '名前未設定'}
                </div>
              </div>
            )}
          </div>

          {relatedRequests.length > 0 && (
            <div style={{
              position: 'sticky',
              top: '60px',
              zIndex: 10,
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #E5E5E5',
              overflow: 'hidden'
            }}>
              {relatedRequests.map((req, index) => (
                <Link
                  key={req.id}
                  href={`/requests/${req.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 20px',
                    textDecoration: 'none',
                    color: '#1A1A1A',
                    borderBottom: index < relatedRequests.length - 1 ? '1px solid #E5E5E5' : 'none',
                    backgroundColor: '#FFFFFF',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9F9F9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <i className="fas fa-clipboard-list" style={{ color: '#6B6B6B', fontSize: '13px', flexShrink: 0 }}></i>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', color: '#6B6B6B', marginBottom: '2px' }}>
                      お仕事の依頼
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.title}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {(req.budget_min || req.budget_max) && (
                      <div style={{ fontSize: '12px', color: '#6B6B6B', marginBottom: '2px' }}>
                        {req.budget_min?.toLocaleString()}〜{req.budget_max?.toLocaleString()}円
                      </div>
                    )}
                    {req.deadline && (
                      <div style={{ fontSize: '11px', color: '#9E9E9E' }}>
                        {new Date(req.deadline).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <i className="fas fa-chevron-right" style={{ color: '#CCCCCC', fontSize: '10px', flexShrink: 0 }}></i>
                </Link>
              ))}
            </div>
          )}

          <div 
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              backgroundColor: '#F9F9F9'
            }}
          >
            {loadingMore && (
              <div style={{
                textAlign: 'center',
                padding: '12px',
                fontSize: '14px',
                color: '#6B6B6B'
              }}>
                読み込み中...
              </div>
            )}

            {loading && (
              <div className="loading-state">
                読み込み中...
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div className="empty-state">
                メッセージがありません
              </div>
            )}

            {!loading && messages.map((message, index) => {
              const isCurrentUser = message.sender_id === currentProfileId
              const showDate = index === 0 || 
                new Date(messages[index - 1].created_at).toDateString() !== 
                new Date(message.created_at).toDateString()
              const signedUrl = getSignedUrl(message.file_url)

              return (
                <div key={message.id}>
                  {showDate && (
                    <div style={{
                      textAlign: 'center',
                      margin: '20px 0'
                    }}>
                      <span className="text-tiny text-gray">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                  )}

                  <div 
                    style={{
                      display: 'flex',
                      justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                      marginBottom: '12px',
                      gap: '8px',
                      alignItems: 'flex-start'
                    }}
                  >
                    {!isCurrentUser && otherUser && (
                      <div 
                        onClick={() => setShowProfileModal(true)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#E5E5E5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          color: '#6B6B6B',
                          overflow: 'hidden',
                          flexShrink: 0,
                          cursor: 'pointer'
                        }}
                      >
                        {otherUser.avatar_url ? (
                          <img
                            src={otherUser.avatar_url}
                            alt={otherUser.display_name || ''}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          otherUser.display_name?.charAt(0) || '?'
                        )}
                      </div>
                    )}

                    <div style={{
                      maxWidth: '70%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                      gap: '4px'
                    }}>
                      {message.request_card_id && requestCards[message.request_card_id] && (
                        <RequestCardComponent request={requestCards[message.request_card_id]} />
                      )}

                      {(message.file_type === 'image' || message.file_type === 'video') && signedUrl && (
                        <div 
                          onContextMenu={(e) => handleMessageContextMenu(e, message)}
                          style={{ position: 'relative' }}
                        >
                          {message.file_type === 'image' ? (
                            <img
                              src={signedUrl}
                              alt={message.file_name || '画像'}
                              onLoad={() => handleMediaLoad(message.id)}
                              onClick={() => setEnlargedMedia({ url: signedUrl, type: 'image' })}
                              style={{
                                maxWidth: '300px',
                                width: '100%',
                                borderRadius: '12px',
                                display: 'block',
                                cursor: 'pointer'
                              }}
                            />
                          ) : (
                            <video
                              src={signedUrl}
                              controls
                              onLoadedData={() => handleMediaLoad(message.id)}
                              onClick={() => setEnlargedMedia({ url: signedUrl, type: 'video' })}
                              style={{
                                maxWidth: '300px',
                                width: '100%',
                                borderRadius: '12px',
                                display: 'block',
                                cursor: 'pointer'
                              }}
                            />
                          )}
                          <button
                            onClick={() => handleDownload(message.file_url!, message.file_name || (message.file_type === 'image' ? '画像.jpg' : '動画.mp4'))}
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              padding: '4px 8px',
                              backgroundColor: 'rgba(0, 0, 0, 0.6)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <i className="fas fa-download" style={{ fontSize: '10px' }}></i>
                            保存
                          </button>
                        </div>
                      )}

                      {(message.file_type === 'pdf' || message.file_type === 'zip' || message.file_type === 'file') && signedUrl && (
                        <div 
                          onContextMenu={(e) => handleMessageContextMenu(e, message)}
                          style={{ position: 'relative' }}
                        >
                          <a
                            href={signedUrl}
                            download={message.file_name || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px 16px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E5E5E5',
                              borderRadius: '12px',
                              textDecoration: 'none',
                              color: '#1A1A1A',
                              minWidth: '200px'
                            }}
                          >
                            <i className={`fas ${getFileIcon(message.file_type)}`} style={{ fontSize: '24px', color: '#6B6B6B' }}></i>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {message.file_name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6B6B6B' }}>
                                {message.file_type?.toUpperCase()}
                              </div>
                            </div>
                            <i className="fas fa-download" style={{ fontSize: '16px', color: '#6B6B6B' }}></i>
                          </a>
                        </div>
                      )}

                      {message.content && (
                        <div 
                          onContextMenu={(e) => handleMessageContextMenu(e, message)}
                          style={{
                            backgroundColor: isCurrentUser ? '#1A1A1A' : '#FFFFFF',
                            color: isCurrentUser ? '#FFFFFF' : '#1A1A1A',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            border: isCurrentUser ? 'none' : '1px solid #E5E5E5'
                          }}
                        >
                          {message.content}
                        </div>
                      )}

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span className="text-tiny text-gray">
                          {formatTime(message.created_at)}
                        </span>
                        {isCurrentUser && isMessageRead(message) && (
                          <span className="text-tiny" style={{ color: '#B0B0B0' }}>
                            既読
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div style={{
            borderTop: '1px solid #E5E5E5',
            backgroundColor: '#FFFFFF'
          }}>
            {selectedFile && (
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E5E5E5',
                position: 'relative'
              }}>
                <div style={{
                  position: 'relative',
                  display: 'inline-block',
                  maxWidth: '200px'
                }}>
                  {selectedFile.type.startsWith('image/') && previewUrl && (
                    <img
                      src={previewUrl}
                      alt="プレビュー"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '150px',
                        borderRadius: '8px',
                        display: 'block'
                      }}
                    />
                  )}
                  
                  {selectedFile.type.startsWith('video/') && previewUrl && (
                    <video
                      src={previewUrl}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '150px',
                        borderRadius: '8px',
                        display: 'block'
                      }}
                      controls
                    />
                  )}
                  
                  {!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/') && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      backgroundColor: '#F9F9F9',
                      borderRadius: '8px',
                      border: '1px solid #E5E5E5'
                    }}>
                      <i className={`fas ${getFileIcon(getFileType(selectedFile))}`} style={{ fontSize: '32px', color: '#6B6B6B' }}></i>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>
                          {selectedFile.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B6B6B' }}>
                          {getFileType(selectedFile).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleRemoveFile}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#1A1A1A',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div style={{ padding: '16px 20px' }}>
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'flex-end'
              }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,application/pdf,application/zip,application/x-zip-compressed"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending || uploading}
                  style={{
                    width: '44px',
                    height: '44px',
                    boxSizing: 'border-box',
                    borderRadius: '50%',
                    border: '1px solid #E5E5E5',
                    backgroundColor: '#FFFFFF',
                    color: '#6B6B6B',
                    fontSize: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'border-color 0.2s',
                    opacity: (sending || uploading) ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!sending && !uploading) {
                      e.currentTarget.style.borderColor = '#1A1A1A'
                    }
                  }}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                >
                  <i className="fas fa-paperclip"></i>
                </button>

                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                    if (isMobile) return
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="メッセージを入力..."
                  disabled={sending}
                  rows={1}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    boxSizing: 'border-box',
                    border: '1px solid #E5E5E5',
                    borderRadius: '24px',
                    fontSize: '16px',
                    color: '#1A1A1A',
                    resize: 'none',
                    fontFamily: 'inherit',
                    lineHeight: '20px',
                    overflowY: 'hidden',
                    minHeight: '44px',
                    height: '44px'
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && !selectedFile) || sending}
                  className="btn-primary"
                  style={{
                    height: '44px',
                    boxSizing: 'border-box',
                    borderRadius: '24px',
                    padding: '0 24px',
                    opacity: (!newMessage.trim() && !selectedFile) || sending ? 0.5 : 1,
                    flexShrink: 0
                  }}
                >
                  {uploading ? 'アップロード中...' : sending ? '送信中...' : '送信'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 3000,
            minWidth: '180px',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'room' && (
            <>
              <button
                onClick={() => handleTogglePin(contextMenu.roomId!, contextMenu.isPinned!)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#1A1A1A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9F9F9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <i className={`fas fa-thumbtack`} style={{ width: '16px', color: '#6B6B6B' }}></i>
                {contextMenu.isPinned ? 'ピン止めを外す' : 'ピン止め'}
              </button>
              <button
                onClick={() => handleHideRoom(contextMenu.roomId!)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#FF4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background-color 0.2s',
                  borderTop: '1px solid #E5E5E5'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF5F5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <i className="fas fa-trash" style={{ width: '16px' }}></i>
                トークを削除
              </button>
            </>
          )}
          
          {contextMenu.type === 'message' && (
            <button
              onClick={() => handleDeleteMessage(contextMenu.messageId!)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#FF4444',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF5F5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <i className="fas fa-trash" style={{ width: '16px' }}></i>
              メッセージを削除
            </button>
          )}
        </div>
      )}

      {enlargedMedia && (
        <div
          onClick={() => setEnlargedMedia(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
            cursor: 'pointer'
          }}
        >
          <button
            onClick={() => setEnlargedMedia(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#1A1A1A',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2001
            }}
          >
            ✕
          </button>
          
          {enlargedMedia.type === 'image' ? (
            <img
              src={enlargedMedia.url}
              alt="拡大画像"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain',
                borderRadius: '8px',
                cursor: 'default'
              }}
            />
          ) : (
            <video
              src={enlargedMedia.url}
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                borderRadius: '8px',
                cursor: 'default'
              }}
            />
          )}
        </div>
      )}

      {showProfileModal && otherUser && (
        <div
          onClick={() => setShowProfileModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '40px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}
          >
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: '#E5E5E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              color: '#6B6B6B',
              overflow: 'hidden',
              margin: '0 auto 24px',
              border: '1px solid #E5E5E5'
            }}>
              {otherUser.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.display_name || ''}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <i className="fas fa-user"></i>
              )}
            </div>

            <h2 className="card-title mb-8" style={{ textAlign: 'center' }}>
              {otherUser.display_name || '名前未設定'}
            </h2>

            {otherUser.username && (
              <p className="text-small text-gray mb-24" style={{ textAlign: 'center' }}>
                @{otherUser.username}
              </p>
            )}

            {otherUser.bio && (
              <div className="mb-32">
                <p className="text-small" style={{
                  lineHeight: '1.7',
                  whiteSpace: 'pre-wrap',
                  color: '#6B6B6B',
                  textAlign: 'center'
                }}>
                  {otherUser.bio}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-16">
              {otherUser.username && (
                <Link
                  href={`/creators/${otherUser.username}`}
                  className="btn-primary"
                  style={{ width: '100%', textAlign: 'center' }}
                >
                  プロフィールを見る
                </Link>
              )}
              <button
                onClick={() => setShowProfileModal(false)}
                className="btn-secondary"
                style={{ width: '100%' }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}