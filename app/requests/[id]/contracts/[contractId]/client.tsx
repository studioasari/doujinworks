'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'
import { createNotification } from '@/utils/notifications'
import styles from './page.module.css'

const MESSAGES_PER_PAGE = 30

type Contract = {
  id: string
  work_request_id: string
  contractor_id: string
  application_id: string | null
  final_price: number
  deadline: string | null
  status: string
  contracted_at: string | null
  paid_at: string | null
  delivered_at: string | null
  completed_at: string | null
  payment_intent_id: string | null
  delivery_file_urls: string[] | null
  work_request: {
    id: string
    title: string
    description: string
    category: string
    requester_id: string
    requester: {
      id: string
      username: string | null
      display_name: string | null
      avatar_url: string | null
    }
  }
  contractor: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
}

type Delivery = {
  id: string
  message: string
  delivery_url: string | null
  created_at: string
  status: string
  feedback: string | null
}

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
  // 楽観的UI用
  _optimistic?: boolean
  _failed?: boolean
}

type CancellationRequest = {
  id: string
  work_contract_id: string
  requester_id: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  resolved_at: string | null
  requester: {
    id: string
    display_name: string | null
  }
}

// ローディングドット（8個の円形）
function LoadingDots() {
  return (
    <div className={styles.loadingDots}>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  )
}

// メッセージスケルトン
function MessagesSkeleton() {
  return (
    <div className={styles.messagesSkeleton}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`${styles.skeletonRow} ${i % 2 === 0 ? styles.sent : ''}`}>
          {i % 2 !== 0 && <div className={styles.skeletonAvatar} />}
          <div className={styles.skeletonBubble} style={{ width: `${100 + (i * 30)}px` }} />
        </div>
      ))}
    </div>
  )
}

export default function ContractDetailPage() {
  const [contract, setContract] = useState<Contract | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [isRequester, setIsRequester] = useState(false)
  const [isContractor, setIsContractor] = useState(false)
  
  const [debugInfo, setDebugInfo] = useState<string>('')
  
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [deliveryMessage, setDeliveryMessage] = useState('')
  const [deliveryUrl, setDeliveryUrl] = useState('')

  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [reviewFeedback, setReviewFeedback] = useState('')

  // レビュー済みかどうか
  const [hasReviewed, setHasReviewed] = useState(false)

  const [chatRoomId, setChatRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [chatLoading, setChatLoading] = useState(true)
  const [otherUser, setOtherUser] = useState<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null>(null)
  const [otherUserLastReadAt, setOtherUserLastReadAt] = useState<string | null>(null)
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({})

  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // コンテキストメニュー用
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null)

  // メディア拡大モーダル用
  const [enlargedMedia, setEnlargedMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null)

  // スマホ用タブ
  const [activeTab, setActiveTab] = useState<'status' | 'chat'>('status')

  // 初期ロード中フラグ（画像読み込み時のスクロール用）
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // 新機能用state
  const [isDragging, setIsDragging] = useState(false)
  const [showNewMessageButton, setShowNewMessageButton] = useState(false)
  const [newMessageCount, setNewMessageCount] = useState(0)

  // キャンセル関連
  const [cancellationRequest, setCancellationRequest] = useState<CancellationRequest | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelType, setCancelType] = useState<'free' | 'overdue'>('free')
  const [showCancellationResponseModal, setShowCancellationResponseModal] = useState(false)
  const [cancellationResponseAction, setCancellationResponseAction] = useState<'approve' | 'reject'>('approve')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isInitialLoadRef = useRef(true)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const activeTabRef = useRef(activeTab)
  const processedMsgIdsRef = useRef<Set<string>>(new Set())

  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string
  const contractId = params.contractId as string

  useEffect(() => {
    checkAuth()
  }, [])

  // activeTabRefを同期
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  // モーダル表示時に背景スクロール固定
  useEffect(() => {
    if (showDeliveryModal || showReviewModal || enlargedMedia || showCancelModal || showCancellationResponseModal) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => document.body.classList.remove('modal-open')
  }, [showDeliveryModal, showReviewModal, enlargedMedia, showCancelModal, showCancellationResponseModal])

  useEffect(() => {
    if (contractId && currentProfileId) {
      fetchContract()
      fetchDeliveries()
      checkReviewStatus()
      
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('payment') === 'success') {
        handlePaymentSuccessFallback()
        window.history.replaceState({}, '', `/requests/${requestId}/contracts/${contractId}`)
      }
    }
  }, [contractId, currentProfileId])

  // キャンセル申請取得
  useEffect(() => {
    if (contractId && currentProfileId && contract) {
      fetchCancellationRequest()
    }
  }, [contractId, currentProfileId, contract?.status])

  useEffect(() => {
    if (contract && currentProfileId) {
      initializeChatRoom()
    }
  }, [contract, currentProfileId])

  useEffect(() => {
    if (chatRoomId && currentProfileId) {
      fetchMessages()
      const unsubscribe = subscribeToMessages()
      updateLastReadAt()
      return () => unsubscribe()
    }
  }, [chatRoomId, currentProfileId])

  useEffect(() => {
    if (otherUser && chatRoomId && currentProfileId) {
      fetchOtherUserLastReadAt()
    }
  }, [otherUser, chatRoomId, currentProfileId])

  useEffect(() => {
    if (messages.length > 0) {
      generateSignedUrlsBatch()
    }
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      if (newMessage === '') {
        textarea.style.height = '40px'
        textarea.style.overflowY = 'hidden'
      } else {
        textarea.style.height = '40px'
        const newHeight = Math.min(textarea.scrollHeight, 120)
        textarea.style.height = newHeight + 'px'
        textarea.style.overflowY = newHeight >= 120 ? 'auto' : 'hidden'
      }
    }
  }, [newMessage])

  // タブ切り替え時のスクロール対応
  useEffect(() => {
    if (activeTab === 'chat' && messages.length > 0 && !chatLoading) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = messagesContainerRef.current
          if (container) {
            container.scrollTop = container.scrollHeight
          }
        })
      })
    }
  }, [activeTab])

  // 無限スクロール用 + 新着ボタン制御
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || chatLoading) return

    const handleScroll = () => {
      if (container.scrollTop < 100 && hasMoreMessages && !loadingMore) {
        loadMoreMessages()
      }
      
      // 新着メッセージボタンの表示制御
      if (isNearBottom()) {
        setShowNewMessageButton(false)
        setNewMessageCount(0)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMoreMessages, loadingMore, chatLoading, activeTab])

  // コンテキストメニューを閉じる
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  // メディアモーダル表示時のスクロール無効化
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

  // ========== Helper Functions ==========

  function isNearBottom() {
    const container = messagesContainerRef.current
    if (!container) return false
    return container.scrollHeight - container.scrollTop - container.clientHeight < 100
  }

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

  async function fetchContract() {
    const { data, error } = await supabase
      .from('work_contracts')
      .select(`
        *,
        work_request:work_requests!work_contracts_work_request_id_fkey(
          id,
          title,
          description,
          category,
          requester_id,
          requester:profiles!work_requests_requester_id_fkey(id, username, display_name, avatar_url)
        ),
        contractor:profiles!work_contracts_contractor_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('id', contractId)
      .single()

    if (error) {
      setDebugInfo(`データ取得エラー: ${JSON.stringify(error)}`)
      setLoading(false)
      return
    }

    if (!data) {
      setDebugInfo('データが取得できませんでした')
      setLoading(false)
      return
    }

    const requesterId = (data.work_request as any)?.requester_id
    const contractorId = data.contractor_id

    const isReq = requesterId === currentProfileId
    const isCon = contractorId === currentProfileId

    if (!isReq && !isCon) {
      setDebugInfo(`権限エラー`)
      setLoading(false)
      return
    }

    setIsRequester(isReq)
    setIsContractor(isCon)
    setContract(data as any)
    setLoading(false)
  }

  async function fetchDeliveries() {
    const { data, error } = await supabase
      .from('work_deliveries')
      .select('*')
      .eq('work_contract_id', contractId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('納品履歴取得エラー:', error)
    } else {
      setDeliveries(data || [])
    }
  }

  async function fetchCancellationRequest() {
    if (contract?.status === 'cancelled') {
      setCancellationRequest(null)
      return
    }

    const { data, error } = await supabase
      .from('cancellation_requests')
      .select(`
        *,
        requester:profiles!cancellation_requests_requester_id_fkey(id, display_name)
      `)
      .eq('work_contract_id', contractId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('キャンセル申請取得エラー:', error)
    } else if (data) {
      setCancellationRequest(data as CancellationRequest)
    } else {
      setCancellationRequest(null)
    }
  }

  // レビュー済みかチェック
  async function checkReviewStatus() {
    if (!currentProfileId || !contractId) return

    const { data } = await supabase
      .from('reviews')
      .select('id')
      .eq('work_contract_id', contractId)
      .eq('reviewer_id', currentProfileId)
      .single()

    setHasReviewed(!!data)
  }

  async function initializeChatRoom() {
    if (!contract) return

    const workRequest = contract.work_request as any
    const requesterId = workRequest?.requester_id
    const contractorId = contract.contractor_id
    const otherUserId = currentProfileId === requesterId ? contractorId : requesterId

    if (currentProfileId === requesterId) {
      setOtherUser({
        id: contract.contractor.id,
        username: contract.contractor.username,
        display_name: contract.contractor.display_name,
        avatar_url: contract.contractor.avatar_url
      })
    } else {
      setOtherUser({
        id: workRequest?.requester?.id,
        username: workRequest?.requester?.username,
        display_name: workRequest?.requester?.display_name,
        avatar_url: workRequest?.requester?.avatar_url
      })
    }

    const { data: myRooms } = await supabase
      .from('chat_room_participants')
      .select('chat_room_id')
      .eq('profile_id', currentProfileId)

    if (myRooms && myRooms.length > 0) {
      for (const room of myRooms) {
        const { data: participants } = await supabase
          .from('chat_room_participants')
          .select('profile_id')
          .eq('chat_room_id', room.chat_room_id)

        const profileIds = participants?.map(p => p.profile_id) || []
        if (profileIds.length === 2 && profileIds.includes(otherUserId)) {
          setChatRoomId(room.chat_room_id)
          return
        }
      }
    }

    const { data: newRoom, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({
        related_request_id: contract.work_request_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (roomError) {
      console.error('チャットルーム作成エラー:', roomError)
      setChatLoading(false)
      return
    }

    await supabase.from('chat_room_participants').insert([
      { chat_room_id: newRoom.id, profile_id: currentProfileId, last_read_at: new Date().toISOString(), pinned: false, hidden: false },
      { chat_room_id: newRoom.id, profile_id: otherUserId, last_read_at: new Date().toISOString(), pinned: false, hidden: false }
    ])

    setChatRoomId(newRoom.id)
  }

  async function fetchMessages() {
    if (!chatRoomId) return

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', chatRoomId)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PER_PAGE)

    if (error) {
      console.error('メッセージ取得エラー:', error)
      setChatLoading(false)
      return
    }
    
    if (data) {
      const reversed = data.reverse()
      setMessages(reversed)
      setHasMoreMessages(data.length === MESSAGES_PER_PAGE)
    }
    
    setChatLoading(false)
    
    // 初期読み込み時のスクロール
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      setIsInitialLoad(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = messagesContainerRef.current
          if (container) {
            container.scrollTop = container.scrollHeight
          }
        })
      })
      
      // 2秒後に初期ロード終了
      setTimeout(() => setIsInitialLoad(false), 2000)
    }
  }

  async function loadMoreMessages() {
    if (!chatRoomId || loadingMore || !hasMoreMessages || messages.length === 0) return
    
    const oldestMessage = messages[0]
    setLoadingMore(true)

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', chatRoomId)
      .eq('deleted', false)
      .lt('created_at', oldestMessage.created_at)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PER_PAGE)

    if (data && data.length > 0) {
      const container = messagesContainerRef.current
      const oldScrollHeight = container?.scrollHeight || 0

      const reversed = data.reverse()
      
      // 重複チェックを追加
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMessages = reversed.filter(m => !existingIds.has(m.id))
        return [...newMessages, ...prev]
      })
      
      setHasMoreMessages(data.length === MESSAGES_PER_PAGE)

      // 2重のrequestAnimationFrameでDOM更新を確実に待つ
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight
            container.scrollTop = newScrollHeight - oldScrollHeight
          }
        })
      })
    } else {
      setHasMoreMessages(false)
    }

    setLoadingMore(false)
  }

  async function fetchOtherUserLastReadAt() {
    if (!chatRoomId || !currentProfileId) return
    
    const { data } = await supabase
      .from('chat_room_participants')
      .select('last_read_at')
      .eq('chat_room_id', chatRoomId)
      .neq('profile_id', currentProfileId)
      .single()

    if (data) setOtherUserLastReadAt(data.last_read_at)
  }

  // 一括署名付きURL取得（改善版）
  async function generateSignedUrlsBatch() {
    const keysToGenerate = messages
      .filter(m => m.file_url && !signedUrls[m.file_url] && !m.file_url.startsWith('blob:'))
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

  function subscribeToMessages() {
    if (!chatRoomId) return () => {}

    const channel = supabase
      .channel(`chat_${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`
        },
        (payload) => {
          const newMsg = payload.new as Message
          if (!newMsg.deleted) {
            // 既に処理済みならスキップ
            if (processedMsgIdsRef.current.has(newMsg.id)) {
              return
            }
            processedMsgIdsRef.current.add(newMsg.id)
            
            const nearBottom = isNearBottom()
            const isOnChatTab = activeTabRef.current === 'chat'
            
            // 楽観的UIで既に追加済みの場合は、_optimisticフラグを外すだけ
            setMessages(prev => {
              const existingIndex = prev.findIndex(m => m.id === newMsg.id)
              if (existingIndex >= 0) {
                const updated = [...prev]
                updated[existingIndex] = { ...newMsg, _optimistic: false }
                return updated
              }
              // 自分が送ったメッセージでない場合のみ追加
              if (newMsg.sender_id !== currentProfileId) {
                return [...prev, newMsg]
              }
              return prev
            })
            
            // カウント更新（相手からのメッセージのみ）
            if (newMsg.sender_id !== currentProfileId) {
              if (!isOnChatTab || !nearBottom) {
                setShowNewMessageButton(true)
                setNewMessageCount(prev => prev + 1)
              }
              updateLastReadAt()
            }
            
            if (isOnChatTab && nearBottom) {
              requestAnimationFrame(() => {
                const container = messagesContainerRef.current
                if (container) {
                  container.scrollTop = container.scrollHeight
                }
              })
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`
        },
        (payload) => {
          const updated = payload.new as Message
          if (updated.deleted) {
            setMessages(prev => prev.filter(m => m.id !== updated.id))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_room_participants',
          filter: `chat_room_id=eq.${chatRoomId}`
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
    if (!chatRoomId) return
    await supabase
      .from('chat_room_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_room_id', chatRoomId)
      .eq('profile_id', currentProfileId)
  }

  async function deleteMessage(messageId: string) {
    if (!confirm('このメッセージを削除しますか？')) { 
      setContextMenu(null)
      return 
    }
    await supabase.from('messages').update({ deleted: true }).eq('id', messageId)
    setMessages(prev => prev.filter(m => m.id !== messageId))
    setContextMenu(null)
  }

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

  // 画像/動画読み込み完了時のハンドラー
  const handleMediaLoad = () => {
    if (isInitialLoad) {
      const container = messagesContainerRef.current
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    }
  }

  function isMessageRead(message: Message): boolean {
    if (message.sender_id !== currentProfileId) return false
    if (!otherUserLastReadAt) return false
    return new Date(otherUserLastReadAt) >= new Date(message.created_at)
  }

  const getFileType = (file: File): string => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type === 'application/pdf') return 'pdf'
    if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed') return 'zip'
    return 'file'
  }

  // ファイル選択の共通処理
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

  // ドラッグ&ドロップ
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

  // ペースト（Ctrl+V）で画像送信
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

  // 長押しメニュー（モバイル）
  const handleTouchStart = (e: React.TouchEvent, message: Message) => {
    if (message.sender_id !== currentProfileId || message._optimistic) return
    
    touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    
    longPressTimerRef.current = setTimeout(() => {
      const touch = e.touches[0]
      let x = touch.clientX
      let y = touch.clientY
      if (x + 180 > window.innerWidth) x = window.innerWidth - 190
      if (y + 60 > window.innerHeight) y = window.innerHeight - 70
      setContextMenu({ x, y, messageId: message.id })
      
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
      formData.append('category', chatRoomId || '')
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

  const getFileIcon = (fileType: string | null) => {
    const icons: { [key: string]: string } = { pdf: 'fa-file-pdf', zip: 'fa-file-zipper' }
    return icons[fileType || ''] || 'fa-file'
  }

  const getSignedUrl = (fileUrl: string | null) => fileUrl ? signedUrls[fileUrl] || null : null

  // 新着メッセージボタンクリック
  const handleNewMessageButtonClick = () => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
    setShowNewMessageButton(false)
    setNewMessageCount(0)
  }

  // 楽観的UI更新を使ったメッセージ送信
  async function sendMessage() {
    if ((!newMessage.trim() && !selectedFile) || sendingMessage || !chatRoomId) return

    const messageContent = newMessage.trim()
    const fileToUpload = selectedFile
    const localPreviewUrl = previewUrl

    // 楽観的UIメッセージを作成
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMessage: Message = {
      id: optimisticId,
      chat_room_id: chatRoomId,
      sender_id: currentProfileId,
      content: messageContent,
      created_at: new Date().toISOString(),
      file_url: localPreviewUrl,
      file_type: fileToUpload ? getFileType(fileToUpload) : null,
      file_name: fileToUpload?.name || null,
      deleted: false,
      _optimistic: true
    }

    // 即座にUIに反映
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    handleRemoveFile()
    
    // 送信後スクロール
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    })

    setSendingMessage(true)
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
        setSendingMessage(false)
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
        chat_room_id: chatRoomId,
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
        // 新しいファイルの署名付きURLを取得
        generateSignedUrlsBatch()
      }
      
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatRoomId)
    }

    setSendingMessage(false)
    setUploading(false)
  }

  // 失敗したメッセージの再送信
  async function retryMessage(failedMessage: Message) {
    if (!chatRoomId) return
    
    // 失敗フラグを外して再送信を試みる
    setMessages(prev => prev.map(m => 
      m.id === failedMessage.id ? { ...m, _failed: false, _optimistic: true } : m
    ))
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_room_id: chatRoomId,
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
      await supabase.from('chat_rooms').update({ updated_at: new Date().toISOString() }).eq('id', chatRoomId)
    }
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  function formatChatDate(dateString: string) {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return '今日'
    if (date.toDateString() === yesterday.toDateString()) return '昨日'
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  }

  function navigateToProfile() {
    if (otherUser?.username) {
      router.push(`/creators/${otherUser.username}`)
    }
  }

  async function handlePayment() {
    if (!confirm('仮払いを実行しますか？\n※Stripeの決済ページに移動します。')) return

    setProcessing(true)

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '決済処理に失敗しました')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      console.error('仮払いエラー:', error)
      alert(error.message || '仮払いに失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  async function handlePaymentSuccessFallback() {
      try {
        const { data: currentContract } = await supabase
          .from('work_contracts')
          .select('status, paid_at, work_request_id')
          .eq('id', contractId)
          .single()

        if (currentContract?.status === 'paid' && currentContract?.paid_at) {
          alert('仮払いが完了しました！クリエイターが作業を開始できます。')
          await fetchContract()
          return
        }

        const paidAt = new Date().toISOString()

        // work_contracts を更新
        await supabase
          .from('work_contracts')
          .update({
            status: 'paid',
            paid_at: paidAt
          })
          .eq('id', contractId)
          .eq('status', 'contracted')

        // work_requests も更新
        if (currentContract?.work_request_id) {
          await supabase
            .from('work_requests')
            .update({
              status: 'paid',
              paid_at: paidAt
            })
            .eq('id', currentContract.work_request_id)
        }

        if (contract?.contractor_id) {
          await createNotification(
            contract.contractor_id,
            'paid',
            '仮払いが完了しました',
            `「${(contract.work_request as any)?.title}」の仮払いが完了しました。作業を開始してください。`,
            `/requests/${requestId}/contracts/${contractId}`
          )
        }

        alert('仮払いが完了しました！クリエイターが作業を開始できます。')
        await fetchContract()
      } catch (error) {
        console.error('仮払い完了処理エラー:', error)
      }
    }

  async function handleSubmitDelivery(e: React.FormEvent) {
    e.preventDefault()

    if (!deliveryMessage.trim()) {
      alert('納品メッセージを入力してください')
      return
    }

    setProcessing(true)

    try {
      const { error: deliveryError } = await supabase
        .from('work_deliveries')
        .insert({
          work_request_id: contract!.work_request_id,
          work_contract_id: contractId,
          contractor_id: currentProfileId,
          message: deliveryMessage.trim(),
          delivery_url: deliveryUrl.trim() || null,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (deliveryError) throw new Error('納品の登録に失敗しました')

      await supabase
        .from('work_contracts')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', contractId)

      const requesterId = (contract?.work_request as any)?.requester_id
      if (requesterId) {
        await createNotification(
          requesterId,
          'delivered',
          '納品されました',
          `「${(contract?.work_request as any)?.title}」が納品されました。検収をお願いします。`,
          `/requests/${requestId}/contracts/${contractId}`
        )
      }

      alert('納品しました！検収をお待ちください。')
      setShowDeliveryModal(false)
      setDeliveryMessage('')
      setDeliveryUrl('')
      fetchContract()
      fetchDeliveries()
    } catch (error) {
      console.error('納品エラー:', error)
      alert('納品に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  function openReviewModal(deliveryId: string, action: 'approve' | 'reject') {
    setSelectedDeliveryId(deliveryId)
    setReviewAction(action)
    setReviewFeedback('')
    setShowReviewModal(true)
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedDeliveryId) return

    if (reviewAction === 'reject' && !reviewFeedback.trim()) {
      alert('差戻し理由を入力してください')
      return
    }

    setProcessing(true)

    try {
      await supabase
        .from('work_deliveries')
        .update({
          status: reviewAction === 'approve' ? 'approved' : 'rejected',
          feedback: reviewFeedback.trim() || null
        })
        .eq('id', selectedDeliveryId)

        if (reviewAction === 'approve') {
          await supabase
            .from('work_contracts')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', contractId)

          // paymentsレコードを作成（振込管理用）
          if (contract) {
            const finalPrice = contract.final_price
            const platformFee = Math.floor(finalPrice * 0.12)
            const creatorAmount = finalPrice - platformFee
            const completedMonth = new Date().toISOString().slice(0, 7)

            await supabase
              .from('payments')
              .insert({
                work_request_id: contract.work_request_id,
                creator_id: contract.contractor_id,
                amount: creatorAmount,
                status: 'pending',
                completed_month: completedMonth,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
          }

          if (contract?.contractor_id) {
            await createNotification(
            contract.contractor_id,
            'completed',
            '検収が完了しました',
            `「${(contract.work_request as any)?.title}」の検収が完了しました。お疲れ様でした！`,
            `/requests/${requestId}/contracts/${contractId}`
          )
        }

        alert('検収が完了しました！')
      } else {
        await supabase
          .from('work_contracts')
          .update({ status: 'paid' })
          .eq('id', contractId)

        if (contract?.contractor_id) {
          await createNotification(
            contract.contractor_id,
            'review',
            '納品が差し戻されました',
            `「${(contract.work_request as any)?.title}」の納品が差し戻されました。`,
            `/requests/${requestId}/contracts/${contractId}`
          )
        }

        alert('納品を差し戻しました。')
      }

      setShowReviewModal(false)
      fetchContract()
      fetchDeliveries()
    } catch (error) {
      console.error('検収エラー:', error)
      alert('検収に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  // キャンセル関連
  function isOverdue(): boolean {
    if (!contract?.deadline) return false
    const deadline = new Date(contract.deadline)
    const sevenDaysAfter = new Date(deadline)
    sevenDaysAfter.setDate(sevenDaysAfter.getDate() + 7)
    return new Date() > sevenDaysAfter
  }

  function openCancelModal(type: 'free' | 'overdue') {
    setCancelType(type)
    setCancelReason('')
    setShowCancelModal(true)
  }

  async function handleSubmitCancel(e: React.FormEvent) {
    e.preventDefault()

    if (!cancelReason.trim()) {
      alert('キャンセル理由を入力してください')
      return
    }

    setProcessing(true)

    try {
      const { error: cancelError } = await supabase
        .from('cancellation_requests')
        .insert({
          work_contract_id: contractId,
          requester_id: currentProfileId,
          reason: cancelReason.trim(),
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (cancelError) {
        console.error('キャンセル申請エラー:', cancelError)
        throw new Error('キャンセル申請に失敗しました')
      }

      const recipientId = isRequester ? contract?.contractor_id : contract?.work_request?.requester_id
      if (recipientId && contract) {
        const notificationMessage = cancelType === 'free' 
          ? `「${(contract.work_request as any)?.title}」についてキャンセル申請がありました。7日以内に同意または拒否してください。応答がない場合は自動的にキャンセルされます。`
          : `「${(contract.work_request as any)?.title}」について納期超過によるキャンセル申請がありました。`
        
        await createNotification(
          recipientId,
          'cancellation_request',
          'キャンセル申請がありました',
          notificationMessage,
          `/requests/${requestId}/contracts/${contractId}`
        )
      }

      const successMessage = cancelType === 'free'
        ? 'キャンセル申請を送信しました。相手が7日以内に応答しない場合、自動的にキャンセルされます。'
        : 'キャンセル申請を送信しました。運営が確認し、対応いたします。'

      alert(successMessage)
      setShowCancelModal(false)
      setCancelReason('')
      fetchContract()
      fetchCancellationRequest()

    } catch (error) {
      console.error('キャンセル申請エラー:', error)
      alert(error instanceof Error ? error.message : 'キャンセル申請に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  function openCancellationResponseModal(action: 'approve' | 'reject') {
    setCancellationResponseAction(action)
    setShowCancellationResponseModal(true)
  }

  async function handleCancellationResponse(e: React.FormEvent) {
    e.preventDefault()

    if (!cancellationRequest) return

    const isApproval = cancellationResponseAction === 'approve'

    if (!confirm(
      isApproval 
        ? 'キャンセル申請に同意しますか？\n※契約が解除され、仮払い済みの場合は返金されます。'
        : 'キャンセル申請を拒否しますか？'
    )) return

    setProcessing(true)

    try {
      const { error: updateError } = await supabase
        .from('cancellation_requests')
        .update({
          status: isApproval ? 'approved' : 'rejected',
          resolved_at: new Date().toISOString()
        })
        .eq('id', cancellationRequest.id)

      if (updateError) {
        throw new Error('応答処理に失敗しました')
      }

      if (isApproval) {
        await supabase
          .from('work_contracts')
          .update({
            status: 'cancelled'
          })
          .eq('id', contractId)

        // 仮払い済みの場合は返金処理
        if (contract?.payment_intent_id) {
          try {
            const refundResponse = await fetch('/api/refund', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                workContractId: contractId,
                reason: 'キャンセル申請の承認による返金'
              })
            })

            if (!refundResponse.ok) {
              console.error('返金処理に失敗しました')
              // 返金失敗しても契約解除は完了させる
            }
          } catch (refundError) {
            console.error('返金APIエラー:', refundError)
          }
        }

        await createNotification(
          cancellationRequest.requester_id,
          'cancelled',
          'キャンセルが承認されました',
          `「${(contract?.work_request as any)?.title}」のキャンセル申請が承認されました。契約が解除されました。`,
          `/requests/${requestId}/contracts/${contractId}`
        )

        alert('キャンセル申請を承認しました。契約が解除されました。')
        router.push('/requests/manage')
      } else {
        await createNotification(
          cancellationRequest.requester_id,
          'cancelled',
          'キャンセル申請が拒否されました',
          `「${(contract?.work_request as any)?.title}」のキャンセル申請が拒否されました。`,
          `/requests/${requestId}/contracts/${contractId}`
        )

        alert('キャンセル申請を拒否しました。契約は継続されます。')
      }

      setShowCancellationResponseModal(false)
      fetchContract()
      fetchCancellationRequest()

    } catch (error) {
      console.error('キャンセル応答エラー:', error)
      alert(error instanceof Error ? error.message : '処理に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  function getStatusLabel(status: string) {
    const statuses: { [key: string]: string } = {
      contracted: '仮払い待ち',
      paid: '作業中',
      delivered: '納品済み',
      completed: '完了',
      cancelled: 'キャンセル'
    }
    return statuses[status] || status
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  function formatShortDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function getProgressSteps() {
    return [
      { key: 'contracted', label: '契約', done: true, date: contract?.contracted_at },
      { key: 'paid', label: '仮払い', done: !!contract?.paid_at, active: contract?.status === 'contracted', date: contract?.paid_at },
      { key: 'working', label: '作業中', done: !!contract?.delivered_at, active: contract?.status === 'paid' },
      { key: 'delivered', label: '納品', done: !!contract?.completed_at, active: contract?.status === 'delivered', date: contract?.delivered_at },
      { key: 'completed', label: '完了', done: !!contract?.completed_at, date: contract?.completed_at },
    ]
  }

  function getProgressLineWidth() {
    const steps = getProgressSteps()
    const doneCount = steps.filter(s => s.done).length
    if (doneCount <= 1) return 0
    return ((doneCount - 1) / 4) * 100
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.loading}>
            <LoadingDots />
            <span>読み込み中...</span>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (debugInfo || !contract) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.error}>
            <i className="fas fa-exclamation-circle"></i>
            <h1>契約が見つかりませんでした</h1>
            <Link href="/requests/manage" className={`${styles.btn} ${styles.primary}`}>依頼管理に戻る</Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const workRequest = contract.work_request as any
  const pendingDeliveries = deliveries.filter(d => d.status === 'pending')
  const progressSteps = getProgressSteps()

  const renderActionBar = () => {
    if (contract.status === 'contracted' && isRequester) {
      return (
        <div className={styles.actionBar}>
          <div className={styles.actionBarContent}>
            <div className={`${styles.actionBarIcon} ${styles.warning}`}>
              <i className="fas fa-credit-card"></i>
            </div>
            <div className={styles.actionBarText}>
              <h3>仮払いを行ってください</h3>
              <p>仮払いを行うと、クリエイターが作業を開始できます。</p>
            </div>
          </div>
          <button onClick={handlePayment} disabled={processing} className={styles.actionBarBtn}>
            {processing ? '処理中...' : '仮払いする'}
          </button>
        </div>
      )
    }

    if (contract.status === 'contracted' && isContractor) {
      return (
        <div className={styles.actionBar}>
          <div className={styles.actionBarContent}>
            <div className={`${styles.actionBarIcon} ${styles.info}`}>
              <i className="fas fa-clock"></i>
            </div>
            <div className={styles.actionBarText}>
              <h3>仮払いをお待ちください</h3>
              <p>依頼者が仮払いを完了すると、作業を開始できます。</p>
            </div>
          </div>
        </div>
      )
    }

    if (contract.status === 'paid' && isContractor) {
      return (
        <div className={styles.actionBar}>
          <div className={styles.actionBarContent}>
            <div className={`${styles.actionBarIcon} ${styles.info}`}>
              <i className="fas fa-upload"></i>
            </div>
            <div className={styles.actionBarText}>
              <h3>作業を進めてください</h3>
              <p>作業が完了したら、成果物を納品してください。</p>
            </div>
          </div>
          <button onClick={() => setShowDeliveryModal(true)} className={styles.actionBarBtn}>
            納品する
          </button>
        </div>
      )
    }

    if (contract.status === 'paid' && isRequester) {
      return (
        <div className={styles.actionBar}>
          <div className={styles.actionBarContent}>
            <div className={`${styles.actionBarIcon} ${styles.info}`}>
              <LoadingDots />
            </div>
            <div className={styles.actionBarText}>
              <h3>作業中です</h3>
              <p>クリエイターが作業を進めています。納品をお待ちください。</p>
            </div>
          </div>
        </div>
      )
    }

    if (contract.status === 'delivered' && isRequester && pendingDeliveries.length > 0) {
      return (
        <div className={styles.actionBar}>
          <div className={styles.actionBarContent}>
            <div className={`${styles.actionBarIcon} ${styles.info}`}>
              <i className="fas fa-box-open"></i>
            </div>
            <div className={styles.actionBarText}>
              <h3>納品物を確認してください</h3>
              <p>クリエイターから納品物が提出されました。下記から検収を行ってください。</p>
            </div>
          </div>
        </div>
      )
    }

    if (contract.status === 'delivered' && isContractor) {
      return (
        <div className={styles.actionBar}>
          <div className={styles.actionBarContent}>
            <div className={`${styles.actionBarIcon} ${styles.info}`}>
              <i className="fas fa-hourglass-half"></i>
            </div>
            <div className={styles.actionBarText}>
              <h3>検収をお待ちください</h3>
              <p>依頼者が検収を行っています。しばらくお待ちください。</p>
            </div>
          </div>
        </div>
      )
    }

    if (contract.status === 'completed') {
      return (
        <div className={styles.actionBar}>
          <div className={styles.actionBarContent}>
            <div className={`${styles.actionBarIcon} ${styles.success}`}>
              <i className="fas fa-check-circle"></i>
            </div>
            <div className={styles.actionBarText}>
              <h3>取引が完了しました</h3>
              <p>お疲れ様でした！</p>
            </div>
          </div>
          {!hasReviewed && (
            <Link href={`/requests/${requestId}/contracts/${contractId}/review`} className={`${styles.actionBarBtn} ${styles.review}`}>
              <i className="fas fa-star"></i>
              レビューを書く
            </Link>
          )}
          {hasReviewed && (
            <Link href={`/requests/${requestId}/contracts/${contractId}/review`} className={`${styles.actionBarBtn} ${styles.secondary}`}>
              <i className="fas fa-check"></i>
              レビュー済み
            </Link>
          )}
        </div>
      )
    }

    return null
  }

  const renderMainContent = () => (
    <>
      <div className={styles.mainCard}>
      {/* タイトル */}
      <div className={styles.mainSection}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{workRequest?.title}</h1>
          <span className={`${styles.badge} ${styles[contract.status]}`}>{getStatusLabel(contract.status)}</span>
        </div>
      </div>

      {/* 進捗ステップ */}
      <div className={styles.mainSection}>
        <div className={styles.stepsBar}>
          <div className={styles.stepsLine}>
            <div className={styles.stepsLineFill} style={{ width: `${getProgressLineWidth()}%` }}></div>
          </div>
          {progressSteps.map((step, index) => (
            <div key={step.key} className={`${styles.step} ${step.done ? styles.done : ''} ${step.active ? styles.active : ''}`}>
              <div className={styles.stepIcon}>
                {step.done ? (
                  <i className="fas fa-check"></i>
                ) : step.active ? (
                  <i className="fas fa-circle" style={{ fontSize: '8px' }}></i>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className={styles.stepLabel}>{step.label}</div>
              {step.date && <div className={styles.stepDate}>{formatShortDate(step.date)}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* 契約情報 */}
      <div className={styles.mainSection}>
        <h2 className={styles.sectionTitle}>契約情報</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <div className={styles.infoItemLabel}>契約金額</div>
            <div className={`${styles.infoItemValue} ${styles.price}`}>{contract.final_price?.toLocaleString()}円</div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoItemLabel}>納期</div>
            <div className={styles.infoItemValue}>
              {contract.deadline ? formatDate(contract.deadline) : '未設定'}
            </div>
          </div>
        </div>
      </div>

      {/* 仕事詳細 */}
      <div className={styles.mainSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>依頼内容</h2>
          <Link href={`/requests/${requestId}`} className={styles.detailLink}>
            依頼詳細を見る
            <i className="fas fa-chevron-right"></i>
          </Link>
        </div>
        <p className={styles.description}>{workRequest?.description}</p>
      </div>

      {/* 納品履歴 */}
      {deliveries.length > 0 && (
        <div className={styles.mainSection}>
          <h2 className={styles.sectionTitle}>納品履歴 ({deliveries.length}件)</h2>
          <div className={styles.deliveriesList}>
            {deliveries.map((delivery) => (
              <div key={delivery.id} className={styles.deliveryCard}>
                <div className={styles.deliveryHeader}>
                  <div className={styles.deliveryDate}>{formatDateTime(delivery.created_at)}</div>
                  <span className={`${styles.deliveryBadge} ${styles[delivery.status]}`}>
                    {delivery.status === 'pending' && '検収待ち'}
                    {delivery.status === 'approved' && '承認済み'}
                    {delivery.status === 'rejected' && '差戻し'}
                  </span>
                </div>
                <p className={styles.deliveryMessage}>{delivery.message}</p>
                {delivery.delivery_url && (
                  <a href={delivery.delivery_url} target="_blank" rel="noopener noreferrer" className={styles.deliveryUrl}>
                    <i className="fas fa-external-link-alt"></i>納品物を確認
                  </a>
                )}
                {delivery.feedback && (
                  <div className={`${styles.deliveryFeedback} ${delivery.status === 'rejected' ? styles.rejected : ''}`}>
                    <div className={styles.deliveryFeedbackLabel}><i className="fas fa-comment"></i>フィードバック</div>
                    <p className={styles.deliveryFeedbackText}>{delivery.feedback}</p>
                  </div>
                )}
                {isRequester && delivery.status === 'pending' && (
                  <div className={styles.deliveryActions}>
                    <button onClick={() => openReviewModal(delivery.id, 'reject')} disabled={processing} className={`${styles.btn} ${styles.secondary} ${styles.flex1}`}>差し戻す</button>
                    <button onClick={() => openReviewModal(delivery.id, 'approve')} disabled={processing} className={`${styles.btn} ${styles.primary} ${styles.flex1}`}>承認して完了</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

      {/* キャンセル申請（相手から）*/}
      {cancellationRequest && cancellationRequest.requester_id !== currentProfileId && (
        <div className={styles.cancelRequestCard}>
          <h3 className={styles.cancelRequestTitle}>
            <i className="fas fa-exclamation-circle"></i>
            キャンセル申請があります
          </h3>
          <div className={styles.cancelRequestContent}>
            <div className={styles.cancelRequestMeta}>
              申請者: {cancellationRequest.requester.display_name || '名前未設定'}<br />
              申請日: {formatDateTime(cancellationRequest.created_at)}
            </div>
            <div className={styles.cancelRequestLabel}>理由:</div>
            <p className={styles.cancelRequestReason}>{cancellationRequest.reason}</p>
          </div>
          <div className={styles.cancelRequestWarning}>
            <i className="fas fa-info-circle"></i>
            7日以内に応答しない場合、自動的に同意したものとみなされます。
          </div>
          <div className={styles.cancelRequestActions}>
            <button onClick={() => openCancellationResponseModal('reject')} disabled={processing} className={`${styles.btn} ${styles.secondary} ${styles.flex1}`}>拒否する</button>
            <button onClick={() => openCancellationResponseModal('approve')} disabled={processing} className={`${styles.btn} ${styles.danger} ${styles.flex1}`}>同意する</button>
          </div>
        </div>
      )}

      {/* 自分のキャンセル申請 */}
      {cancellationRequest && cancellationRequest.requester_id === currentProfileId && (
        <div className={styles.cancelPendingCard}>
          <i className="fas fa-clock"></i>
          <h3>キャンセル申請中</h3>
          <p>相手の応答を待っています。7日以内に応答がない場合、自動的に承認されます。</p>
          <span className={styles.cancelPendingDate}>申請日: {formatDateTime(cancellationRequest.created_at)}</span>
        </div>
      )}

      {/* キャンセルボタン（キャンセル申請がない場合のみ） */}
      {!cancellationRequest && contract.status !== 'completed' && contract.status !== 'cancelled' && contract.status !== 'delivered' && (
        <div className={styles.cancelSection}>
          <h3 className={styles.cancelSectionTitle}>
            {contract.status === 'paid' && isRequester && isOverdue() ? 'キャンセルについて' : '契約のキャンセル'}
          </h3>
          <p className={styles.cancelSectionDesc}>
            {contract.status === 'paid' && isRequester && isOverdue() 
              ? '納期から7日以上経過しています。キャンセル申請を行うと、運営が確認後に返金処理を行います。'
              : 'キャンセル申請を送信すると、相手に通知されます。相手が同意するか、7日以内に応答がない場合に契約が解除されます。'
            }
          </p>
          {contract.status === 'paid' && isRequester && isOverdue() ? (
            <button onClick={() => openCancelModal('overdue')} disabled={processing} className={styles.cancelSectionBtn}>
              <i className="fas fa-exclamation-triangle"></i>
              納期超過のためキャンセル申請
            </button>
          ) : (
            <button onClick={() => openCancelModal('free')} disabled={processing} className={styles.cancelSectionBtn}>
              キャンセル申請
            </button>
          )}
        </div>
      )}
    </>
  )

  const renderChatContent = () => (
    <div 
      className={styles.chat}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ドラッグオーバーレイ */}
      {isDragging && (
        <div className={styles.chatDragOverlay}>
          <div className={styles.chatDragContent}>
            <i className="fas fa-cloud-upload-alt"></i>
            <p>ファイルをドロップして送信</p>
          </div>
        </div>
      )}

      <div className={styles.chatHeader} onClick={navigateToProfile} style={{ cursor: otherUser?.username ? 'pointer' : 'default' }}>
        <div className={styles.chatHeaderAvatar}>
          {otherUser?.avatar_url ? (
            <img src={otherUser.avatar_url} alt="" loading="lazy" />
          ) : (
            <span>{otherUser?.display_name?.charAt(0) || '?'}</span>
          )}
        </div>
        <div className={styles.chatHeaderInfo}>
          <div className={styles.chatHeaderName}>{otherUser?.display_name || '名前未設定'}</div>
          <div className={styles.chatHeaderStatus}>{isRequester ? 'クリエイター' : '依頼者'}</div>
        </div>
        {otherUser?.username && <i className={`fas fa-chevron-right ${styles.chatHeaderArrow}`}></i>}
      </div>

      <div className={styles.chatMessages} ref={messagesContainerRef}>
        {loadingMore && (
          <div className={styles.chatLoadingMore}>
            <LoadingDots />
            <span>読み込み中...</span>
          </div>
        )}
        {chatLoading ? (
          <MessagesSkeleton />
        ) : messages.length === 0 ? (
          <div className={styles.chatEmpty}>
            <i className="far fa-comments"></i>
            <p>メッセージはまだありません</p>
            <p className={styles.chatEmptyHint}>気軽にメッセージを送ってみましょう</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isCurrentUser = message.sender_id === currentProfileId
              const showDate = index === 0 || 
                new Date(messages[index - 1].created_at).toDateString() !== 
                new Date(message.created_at).toDateString()
              // 楽観的UIの場合はローカルプレビューURLを使用、それ以外は署名付きURL
              const signedUrl = message._optimistic && message.file_url?.startsWith('blob:') 
                ? message.file_url 
                : getSignedUrl(message.file_url)

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className={styles.chatDateDivider}>
                      <span>{formatChatDate(message.created_at)}</span>
                    </div>
                  )}
                  <div 
                    className={`${styles.chatMessage} ${isCurrentUser ? styles.sent : styles.received} ${message._optimistic ? styles.optimistic : ''} ${message._failed ? styles.failed : ''}`}
                    onContextMenu={(e) => {
                      if (isCurrentUser && !message._optimistic) {
                        e.preventDefault()
                        setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id })
                      }
                    }}
                    onTouchStart={(e) => handleTouchStart(e, message)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {!isCurrentUser && (
                      <div className={styles.chatMessageAvatar} onClick={navigateToProfile} style={{ cursor: otherUser?.username ? 'pointer' : 'default' }}>
                        {otherUser?.avatar_url ? (
                          <img src={otherUser.avatar_url} alt="" loading="lazy" />
                        ) : (
                          <span>{otherUser?.display_name?.charAt(0) || '?'}</span>
                        )}
                      </div>
                    )}
                    <div className={styles.chatMessageContent}>
                      {(message.file_type === 'image' || message.file_type === 'video') && signedUrl && (
                        <div className={styles.chatMedia}>
                          {message.file_type === 'image' ? (
                            <img 
                              src={signedUrl} 
                              alt="" 
                              loading="lazy"
                              onClick={() => !message._optimistic && setEnlargedMedia({ url: signedUrl, type: 'image' })}
                              onLoad={handleMediaLoad}
                              style={{ cursor: message._optimistic ? 'default' : 'pointer' }}
                            />
                          ) : (
                            <video 
                              src={signedUrl} 
                              controls 
                              preload="metadata"
                              onLoadedData={handleMediaLoad}
                            />
                          )}
                          {!message._optimistic && (
                            <button 
                              className={styles.chatMediaDownload} 
                              onClick={() => handleDownload(message.file_url!, message.file_name || (message.file_type === 'image' ? '画像.jpg' : '動画.mp4'))}
                            >
                              <i className="fas fa-download"></i> 保存
                            </button>
                          )}
                        </div>
                      )}
                      {(message.file_type === 'pdf' || message.file_type === 'zip' || message.file_type === 'file') && signedUrl && (
                        <a href={signedUrl} download={message.file_name} target="_blank" rel="noopener noreferrer" className={styles.chatFile}>
                          <i className={`fas ${getFileIcon(message.file_type)} ${styles.chatFileIcon}`}></i>
                          <div className={styles.chatFileInfo}>
                            <div className={styles.chatFileName}>{message.file_name}</div>
                            <div className={styles.chatFileType}>{message.file_type?.toUpperCase()}</div>
                          </div>
                        </a>
                      )}
                      {message.content && (
                        <div className={styles.chatMessageBubble}>{message.content}</div>
                      )}
                      <div className={styles.chatMessageTime}>
                        {message._optimistic && !message._failed && (
                          <span className={styles.chatMessageSending}>送信中...</span>
                        )}
                        {message._failed && (
                          <button className={styles.chatMessageRetry} onClick={() => retryMessage(message)}>
                            <i className="fas fa-exclamation-circle"></i> 再送信
                          </button>
                        )}
                        {!message._optimistic && !message._failed && (
                          <>
                            {formatTime(message.created_at)}
                            {isCurrentUser && isMessageRead(message) && (
                              <span className={styles.chatMessageRead}> 既読</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* 新着メッセージボタン */}
        {showNewMessageButton && (
          <button className={styles.chatNewMessageBtn} onClick={handleNewMessageButtonClick}>
            <i className="fas fa-arrow-down"></i>
            {newMessageCount > 0 && <span>{newMessageCount}件の新着メッセージ</span>}
          </button>
        )}
      </div>

      {selectedFile && (
        <div className={styles.chatFilePreview}>
          <div className={styles.chatFilePreviewInner}>
            {selectedFile.type.startsWith('image/') && previewUrl && <img src={previewUrl} alt="プレビュー" />}
            {selectedFile.type.startsWith('video/') && previewUrl && <video src={previewUrl} controls />}
            {!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/') && (
              <div className={styles.chatFilePreviewInfo}>
                <i className={`fas ${getFileIcon(getFileType(selectedFile))}`}></i>
                <span>{selectedFile.name}</span>
              </div>
            )}
            <button className={styles.chatFilePreviewRemove} onClick={handleRemoveFile}><i className="fas fa-times"></i></button>
          </div>
        </div>
      )}

      <div className={styles.chatInputContainer}>
        <input
          id="chat-file-input"
          name="chat-file-input"
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf,application/zip"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <button className={styles.chatAttachBtn} onClick={() => fileInputRef.current?.click()} disabled={sendingMessage || uploading}>
          <i className="fas fa-paperclip"></i>
        </button>
        <textarea
          id="chat-message-input"
          name="chat-message-input"
          ref={textareaRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
            if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          onPaste={handlePaste}
          placeholder="メッセージを入力..."
          disabled={sendingMessage || chatLoading}
          rows={1}
          className={styles.chatInput}
        />
        <button
          onClick={sendMessage}
          disabled={sendingMessage || chatLoading || (!newMessage.trim() && !selectedFile)}
          className={styles.chatSendBtn}
        >
          {uploading ? 'アップロード中...' : '送信'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          {/* スマホ用タブ */}
          <div className={styles.mobileTabs}>
            <button 
              className={`${styles.mobileTab} ${activeTab === 'status' ? styles.active : ''}`}
              onClick={() => setActiveTab('status')}
            >
              <i className="fas fa-clipboard-list"></i>
              <span>進捗</span>
            </button>
            <button 
              className={`${styles.mobileTab} ${activeTab === 'chat' ? styles.active : ''}`}
              onClick={() => {
                setActiveTab('chat')
                setNewMessageCount(0)
                setShowNewMessageButton(false)
                // 少し遅延させてスクロール
                setTimeout(() => {
                  const container = messagesContainerRef.current
                  if (container) {
                    container.scrollTop = container.scrollHeight
                  }
                }, 100)
              }}
            >
              <i className="fas fa-comments"></i>
              <span>チャット</span>
              {activeTab !== 'chat' && newMessageCount > 0 && (
                <span className={styles.tabBadge}>{newMessageCount}</span>
              )}
            </button>
          </div>

          {/* PC用2カラムレイアウト */}
          <div className={styles.layout}>
            <div className={styles.main}>
              {renderActionBar()}
              {renderMainContent()}
            </div>
            <div className={styles.chatWrapper}>
              {renderChatContent()}
            </div>
          </div>

          {/* スマホ用タブコンテンツ */}
          <div className={styles.mobileContent}>
            {activeTab === 'status' ? (
              <div className={styles.mobileMain}>
                {renderActionBar()}
                {renderMainContent()}
              </div>
            ) : (
              <div className={styles.mobileChat}>
                {renderChatContent()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 納品モーダル */}
      {showDeliveryModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeliveryModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>納品する</h2>
            <form onSubmit={handleSubmitDelivery}>
              <div className={styles.modalGroup}>
                <label htmlFor="delivery-url" className={styles.modalLabel}>納品物のURL</label>
                <input id="delivery-url" name="delivery-url" type="url" value={deliveryUrl} onChange={(e) => setDeliveryUrl(e.target.value)} placeholder="https://..." className={styles.modalInput} />
                <div className={styles.modalHint}>ギガファイル便、Google Driveなどの共有URLを入力</div>
              </div>
              <div className={styles.modalGroup}>
                <label htmlFor="delivery-message" className={styles.modalLabel}>納品メッセージ <span className={styles.required}>*</span></label>
                <textarea id="delivery-message" name="delivery-message" value={deliveryMessage} onChange={(e) => setDeliveryMessage(e.target.value)} placeholder="納品物の説明を記入してください" required rows={5} className={styles.modalTextarea} />
              </div>
              <div className={styles.modalButtons}>
                <button type="button" onClick={() => setShowDeliveryModal(false)} disabled={processing} className={`${styles.btn} ${styles.secondary}`}>キャンセル</button>
                <button type="submit" disabled={processing} className={`${styles.btn} ${styles.primary}`}>{processing ? '送信中...' : '納品する'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 検収モーダル */}
      {showReviewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowReviewModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{reviewAction === 'approve' ? '納品を承認' : '納品を差し戻す'}</h2>
            <form onSubmit={handleSubmitReview}>
              <div className={styles.modalGroup}>
                <label htmlFor="review-feedback" className={styles.modalLabel}>フィードバック {reviewAction === 'reject' && <span className={styles.required}>*</span>}</label>
                <textarea id="review-feedback" name="review-feedback" value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} placeholder={reviewAction === 'approve' ? '任意' : '修正が必要な点を記入してください'} required={reviewAction === 'reject'} rows={5} className={styles.modalTextarea} />
              </div>
              <div className={styles.modalButtons}>
                <button type="button" onClick={() => setShowReviewModal(false)} disabled={processing} className={`${styles.btn} ${styles.secondary}`}>キャンセル</button>
                <button type="submit" disabled={processing} className={`${styles.btn} ${styles.primary}`}>{processing ? '処理中...' : reviewAction === 'approve' ? '承認する' : '差し戻す'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* キャンセル申請モーダル */}
      {showCancelModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCancelModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{cancelType === 'free' ? 'キャンセル申請' : 'キャンセル申請（納期超過）'}</h2>
            <form onSubmit={handleSubmitCancel}>
              <div className={styles.modalGroup}>
                <label htmlFor="cancel-reason" className={styles.modalLabel}>キャンセル理由 <span className={styles.required}>*</span></label>
                <textarea id="cancel-reason" name="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="キャンセル理由を入力してください" required rows={5} className={styles.modalTextarea} />
              </div>
              {cancelType === 'free' && (
                <div className={styles.modalInfo}>
                  <i className="fas fa-info-circle"></i>
                  キャンセル申請を送信します。相手が同意すると契約が解除されます。<br />
                  ※相手が7日以内に応答しない場合、自動的にキャンセルされます。
                </div>
              )}
              {cancelType === 'overdue' && (
                <div className={`${styles.modalInfo} ${styles.warning}`}>
                  <i className="fas fa-exclamation-triangle"></i>
                  納期超過のためキャンセル申請を行います。運営が内容を確認し、承認された場合は返金処理が行われます。
                </div>
              )}
              <div className={styles.modalButtons}>
                <button type="button" onClick={() => setShowCancelModal(false)} disabled={processing} className={`${styles.btn} ${styles.secondary}`}>戻る</button>
                <button type="submit" disabled={processing} className={`${styles.btn} ${styles.danger}`}>{processing ? '送信中...' : '申請する'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* キャンセル申請応答モーダル */}
      {showCancellationResponseModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCancellationResponseModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{cancellationResponseAction === 'approve' ? 'キャンセルに同意' : 'キャンセルを拒否'}</h2>
            <form onSubmit={handleCancellationResponse}>
              {cancellationResponseAction === 'approve' && (
                <div className={`${styles.modalInfo} ${styles.warning}`}>
                  <i className="fas fa-exclamation-triangle"></i>
                  同意すると契約が解除されます。仮払い済みの場合は返金処理が行われます。
                </div>
              )}
              {cancellationResponseAction === 'reject' && (
                <div className={styles.modalInfo}>
                  <i className="fas fa-info-circle"></i>
                  拒否すると、契約は継続されます。
                </div>
              )}
              <div className={styles.modalButtons}>
                <button type="button" onClick={() => setShowCancellationResponseModal(false)} disabled={processing} className={`${styles.btn} ${styles.secondary}`}>戻る</button>
                <button type="submit" disabled={processing} className={cancellationResponseAction === 'approve' ? `${styles.btn} ${styles.danger}` : `${styles.btn} ${styles.primary}`}>{processing ? '処理中...' : cancellationResponseAction === 'approve' ? '同意する' : '拒否する'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* コンテキストメニュー */}
      {contextMenu && (
        <div 
          className={styles.contextMenu}
          style={{ 
            position: 'fixed', 
            top: contextMenu.y, 
            left: contextMenu.x,
            zIndex: 9999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className={`${styles.contextMenuItem} ${styles.delete}`}
            onClick={() => deleteMessage(contextMenu.messageId)}
          >
            <i className="fas fa-trash"></i>
            削除
          </button>
        </div>
      )}

      {/* メディア拡大モーダル */}
      {enlargedMedia && (
        <div className={styles.mediaModal} onClick={() => setEnlargedMedia(null)}>
          <button className={styles.mediaClose} onClick={() => setEnlargedMedia(null)}>
            <i className="fas fa-times"></i>
          </button>
          {enlargedMedia.type === 'image' ? (
            <img src={enlargedMedia.url} alt="" onClick={(e) => e.stopPropagation()} />
          ) : (
            <video src={enlargedMedia.url} controls autoPlay onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}

      <Footer />
    </>
  )
}