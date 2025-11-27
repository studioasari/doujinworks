'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
  file_url: string | null
  file_type: string | null
  file_name: string | null
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
  other_user: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  last_message: {
    content: string
    created_at: string
  } | null
  unread_count: number
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
      fetchMessages()
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
    }
  }, [loading, messages.length])

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      const newHeight = textarea.scrollHeight
      
      const maxHeight = 144
      
      if (newHeight > maxHeight) {
        textarea.style.height = maxHeight + 'px'
        textarea.style.overflowY = 'auto'
      } else {
        textarea.style.height = newHeight + 'px'
        textarea.style.overflowY = 'hidden'
      }
    }
  }, [newMessage])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
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

  async function fetchChatRooms(profileId: string) {
    const { data: participations, error: participationsError } = await supabase
      .from('chat_room_participants')
      .select('chat_room_id, last_read_at')
      .eq('profile_id', profileId)

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
        .select('content, created_at')
        .eq('chat_room_id', roomIdTemp)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_room_id', roomIdTemp)
        .neq('sender_id', profileId)
        .gt('created_at', participation.last_read_at || '1970-01-01')

      const { data: roomData } = await supabase
        .from('chat_rooms')
        .select('updated_at')
        .eq('id', roomIdTemp)
        .single()

      if (otherParticipants && otherParticipants.length > 0) {
        const otherUserData = otherParticipants[0].profiles as any

        roomsData.push({
          id: roomIdTemp,
          updated_at: roomData?.updated_at || '',
          other_user: {
            id: otherUserData.id,
            display_name: otherUserData.display_name,
            avatar_url: otherUserData.avatar_url
          },
          last_message: lastMessage || null,
          unread_count: unreadCount || 0
        })
      }
    }

    roomsData.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

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

  async function fetchMessages() {
    setLoading(true)

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', roomId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('メッセージ取得エラー:', error)
    } else {
      setMessages(data || [])
    }

    setLoading(false)
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
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${roomId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath)

      const fileType = getFileType(file)

      return { url: publicUrl, type: fileType }
    } catch (error) {
      console.error('ファイルアップロードエラー:', error)
      return null
    }
  }

  async function sendMessage() {
    if ((!newMessage.trim() && !selectedFile) || sending) return

    setSending(true)
    setUploading(true)

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
      file_name: fileName
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
      setMessages(prev => [...prev, data as Message])
      setNewMessage('')
      handleRemoveFile()
      
      setTimeout(() => scrollToBottom(true), 50)
      
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
          
          if (newMsg.sender_id !== currentProfileId) {
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

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl)
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

  return (
    <>
      <Header />
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 64px)',
        backgroundColor: '#FFFFFF'
      }}>
        {/* 左サイドバー */}
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
                  className="flex gap-12"
                  style={{
                    alignItems: 'center',
                    padding: '16px 20px',
                    textDecoration: 'none',
                    borderBottom: '1px solid #E5E5E5',
                    backgroundColor: room.id === roomId ? '#F9F9F9' : '#FFFFFF',
                    transition: 'background-color 0.2s',
                    display: 'flex'
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
                      {room.last_message?.content || 'メッセージがありません'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>

        {/* チャットエリア */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF'
        }}>
          {/* ヘッダー(モバイルのみ) */}
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

          {/* メッセージエリア */}
          <div 
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              backgroundColor: '#F9F9F9'
            }}
          >
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

                  <div style={{
                    display: 'flex',
                    justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                    marginBottom: '12px',
                    gap: '8px',
                    alignItems: 'flex-start'
                  }}>
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
                      alignItems: isCurrentUser ? 'flex-end' : 'flex-start'
                    }}>
                      <div style={{
                        backgroundColor: isCurrentUser ? '#1A1A1A' : '#FFFFFF',
                        color: isCurrentUser ? '#FFFFFF' : '#1A1A1A',
                        padding: message.file_url ? '8px' : '12px 16px',
                        borderRadius: '16px',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        border: isCurrentUser ? 'none' : '1px solid #E5E5E5'
                      }}>
                        {message.file_type === 'image' && message.file_url && (
                          <div>
                            <img
                              src={message.file_url}
                              alt={message.file_name || '画像'}
                              onClick={() => setEnlargedMedia({ url: message.file_url!, type: 'image' })}
                              style={{
                                maxWidth: '300px',
                                width: '100%',
                                borderRadius: '12px',
                                display: 'block',
                                cursor: 'pointer',
                                marginBottom: message.content ? '8px' : '4px'
                              }}
                            />
                            <button
                              onClick={() => handleDownload(message.file_url!, message.file_name || '画像.jpg')}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.1)' : '#F9F9F9',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'inherit',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                marginTop: '4px',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <i className="fas fa-download" style={{ fontSize: '12px' }}></i>
                              保存
                            </button>
                          </div>
                        )}
                        
                        {message.file_type === 'video' && message.file_url && (
                          <div>
                            <video
                              src={message.file_url}
                              controls
                              onClick={() => setEnlargedMedia({ url: message.file_url!, type: 'video' })}
                              style={{
                                maxWidth: '300px',
                                width: '100%',
                                borderRadius: '12px',
                                display: 'block',
                                cursor: 'pointer',
                                marginBottom: message.content ? '8px' : '4px'
                              }}
                            />
                            <button
                              onClick={() => handleDownload(message.file_url!, message.file_name || '動画.mp4')}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.1)' : '#F9F9F9',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'inherit',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                marginTop: '4px',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <i className="fas fa-download" style={{ fontSize: '12px' }}></i>
                              保存
                            </button>
                          </div>
                        )}
                        
                        {(message.file_type === 'pdf' || message.file_type === 'zip' || message.file_type === 'file') && message.file_url && (
                          <a
                            href={message.file_url}
                            download={message.file_name || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px',
                              backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.1)' : '#F9F9F9',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              color: 'inherit',
                              marginBottom: message.content ? '8px' : '0'
                            }}
                          >
                            <i className={`fas ${getFileIcon(message.file_type)}`} style={{ fontSize: '24px' }}></i>
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
                              <div style={{ fontSize: '12px', opacity: 0.7 }}>
                                {message.file_type?.toUpperCase()}
                              </div>
                            </div>
                            <i className="fas fa-download" style={{ fontSize: '16px' }}></i>
                          </a>
                        )}
                        
                        {message.content && (
                          <div style={{
                            padding: message.file_url ? '4px 8px' : '0'
                          }}>
                            {message.content}
                          </div>
                        )}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '4px'
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

          {/* 入力エリア */}
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
                    padding: '12px 16px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '24px',
                    fontSize: '16px',
                    color: '#1A1A1A',
                    resize: 'none',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    overflowY: 'hidden',
                    maxHeight: '144px'
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && !selectedFile) || sending}
                  className="btn-primary"
                  style={{
                    borderRadius: '24px',
                    padding: '12px 24px',
                    opacity: (!newMessage.trim() && !selectedFile) || sending ? 0.5 : 1,
                    flexShrink: 0
                  }}
                >
                  {uploading ? 'アップロード中...' : '送信'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 画像・動画拡大表示モーダル */}
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

      {/* プロフィールモーダル */}
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

      <Footer />
    </>
  )
}