import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Hash, Volume2, Mic, MicOff, Volume, VolumeX, Settings, Smile, Reply, MoreHorizontal, ArrowDown, BookOpen, Plus } from 'lucide-react'
import EmojiPicker from '@/components/EmojiPicker'
import UserProfile from '@/components/UserProfile'
import VCJoinModal from '@/components/VCJoinModal'
import VCConnectionInfo from '@/components/VCConnectionInfo'
import VCView from '@/components/VCView'
import MessageContent from '@/components/MessageContent'
import { useVoiceChannel } from '@/hooks/useVoiceChannel'
import { useVCParticipants } from '@/hooks/useVCParticipants'
import { getUserAvatar, getInitials } from '@/lib/avatars'
import { channels, dmUsers } from '@/data/mockData'
import type { Message } from '@/types/chat'
import jaruImage from '@/assets/jaru.webp'
import './Chat.css'

// API response cache to prevent duplicate requests
const embedMetaCache = new Map<string, { title?: string; author?: string }>()

// SE 生成関数 (Discord風)
const playSound = (type: 'toggle' | 'connect' | 'disconnect' | 'screenShareOn' | 'screenShareOff' | 'micOn' | 'micOff' | 'speakerOn' | 'speakerOff') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const now = audioContext.currentTime

    if (type === 'micOn') {
      // マイクON: 上昇する2音 (低い周波数)
      const frequencies = [349.23, 440] // F4, A4
      const startTimes = [0, 0.08]

      frequencies.forEach((freq, index) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.type = 'sine'
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.frequency.value = freq
        
        const startTime = now + startTimes[index]
        gain.gain.setValueAtTime(0.25, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08)
        osc.start(startTime)
        osc.stop(startTime + 0.08)
      })
    } else if (type === 'micOff') {
      // マイクOFF: 下降する2音 (低い周波数)
      const frequencies = [440, 349.23] // A4, F4
      const startTimes = [0, 0.08]

      frequencies.forEach((freq, index) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.type = 'sine'
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.frequency.value = freq
        
        const startTime = now + startTimes[index]
        gain.gain.setValueAtTime(0.25, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08)
        osc.start(startTime)
        osc.stop(startTime + 0.08)
      })
    } else if (type === 'speakerOn') {
      // スピーカーON: 上昇する2音 (低い周波数)
      const frequencies = [440, 523.25] // A4, C5
      const startTimes = [0, 0.08]

      frequencies.forEach((freq, index) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.type = 'sine'
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.frequency.value = freq
        
        const startTime = now + startTimes[index]
        gain.gain.setValueAtTime(0.25, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08)
        osc.start(startTime)
        osc.stop(startTime + 0.08)
      })
    } else if (type === 'speakerOff') {
      // スピーカーOFF: 下降する2音 (低い周波数)
      const frequencies = [523.25, 440] // C5, A4
      const startTimes = [0, 0.08]

      frequencies.forEach((freq, index) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.type = 'sine'
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.frequency.value = freq
        
        const startTime = now + startTimes[index]
        gain.gain.setValueAtTime(0.25, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08)
        osc.start(startTime)
        osc.stop(startTime + 0.08)
      })
    } else if (type === 'screenShareOn') {
      // 画面共有ON: てれれれれれん (上昇する5音、低い周波数)
      const frequencies = [349.23, 392, 440, 523.25, 659.25] // F4, G4, A4, C5, E5
      const startTimes = [0, 0.08, 0.16, 0.24, 0.32]

      frequencies.forEach((freq, index) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.type = 'sine'
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.frequency.value = freq
        
        const startTime = now + startTimes[index]
        gain.gain.setValueAtTime(0.25, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08)
        osc.start(startTime)
        osc.stop(startTime + 0.08)
      })
    } else if (type === 'screenShareOff') {
      // 画面共有OFF: てれれれれれん (下降する5音、低い周波数)
      const frequencies = [659.25, 523.25, 440, 392, 349.23] // E5, C5, A4, G4, F4
      const startTimes = [0, 0.08, 0.16, 0.24, 0.32]

      frequencies.forEach((freq, index) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.type = 'sine'
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.frequency.value = freq
        
        const startTime = now + startTimes[index]
        gain.gain.setValueAtTime(0.25, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08)
        osc.start(startTime)
        osc.stop(startTime + 0.08)
      })
    } else if (type === 'toggle') {
      // 汎用トグル音: 2つの周波数が連続する気持ちいい音 (低い周波数)
      const osc1 = audioContext.createOscillator()
      const gain1 = audioContext.createGain()
      osc1.type = 'sine'
      osc1.connect(gain1)
      gain1.connect(audioContext.destination)
      osc1.frequency.value = 349.23 // F4
      gain1.gain.setValueAtTime(0.25, now)
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08)
      osc1.start(now)
      osc1.stop(now + 0.08)

      const osc2 = audioContext.createOscillator()
      const gain2 = audioContext.createGain()
      osc2.type = 'sine'
      osc2.connect(gain2)
      gain2.connect(audioContext.destination)
      osc2.frequency.value = 440 // A4
      gain2.gain.setValueAtTime(0.25, now + 0.05)
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.13)
      osc2.start(now + 0.05)
      osc2.stop(now + 0.13)
    } else if (type === 'connect') {
      // 接続音: 上昇する3音の連続 (低い周波数)
      const frequencies = [349.23, 440, 523.25] // F4, A4, C5
      const startTimes = [0, 0.1, 0.2]

      frequencies.forEach((freq, index) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.type = 'sine'
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.frequency.value = freq
        
        const startTime = now + startTimes[index]
        gain.gain.setValueAtTime(0.25, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12)
        osc.start(startTime)
        osc.stop(startTime + 0.12)
      })
    } else if (type === 'disconnect') {
      // 切断音: 下降する3音の連続 (低い周波数)
      const frequencies = [523.25, 440, 349.23] // C5, A4, F4
      const startTimes = [0, 0.1, 0.2]

      frequencies.forEach((freq, index) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.type = 'sine'
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.frequency.value = freq
        
        const startTime = now + startTimes[index]
        gain.gain.setValueAtTime(0.25, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12)
        osc.start(startTime)
        osc.stop(startTime + 0.12)
      })
    }
  } catch (error) {
    console.error('SE 再生エラー:', error)
  }
}

export default function Chat() {
  const { channelId } = useParams<{ channelId: string }>()
  const navigate = useNavigate()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  const currentUser = { id: 'current-user', name: 'aiueo aiueioo', status: 'online' as const }
  
  // Voice Channel State
  const {
    isConnectedToVC,
    connectedVCChannel,
    showVCModal,
    pendingVCChannel,
    isMicOn,
    isSpeakerOn,
    requestJoinVC,
    joinVC,
    switchVCChannel,
    disconnectVC,
    closeVCModal,
    toggleMic,
    toggleSpeaker,
  } = useVoiceChannel()

  // VC participants (single async-managed state)
  const { membersByChannelId, addMember, removeMember } = useVCParticipants()
  
  // UI State
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{ top: number; left: number } | null>(null)
  const [emojiPickerMode, setEmojiPickerMode] = useState<'input' | 'reaction'>('input')
  const [reactionTargetMessageId, setReactionTargetMessageId] = useState<string | null>(null)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null)
  const [showPlusMenu, setShowPlusMenu] = useState(false)

  const isDMRoute = channelId?.startsWith('dm-') ?? false
  const dmUserId = isDMRoute && channelId ? channelId.slice('dm-'.length) : null
  const dmUser =
    (dmUserId ? dmUsers.find(u => u.id === dmUserId) : null) ??
    (dmUserId === currentUser.id ? currentUser : null)
  const dmDisplayName = dmUser ? `# ${dmUser.name}` : '# dm-name'
  const selectedChannel = !isDMRoute
    ? channels.find(c => c.id === channelId) || channels[0]
    : channels[0]

  useEffect(() => {
    if (!channelId) {
      navigate(`/chat/${channels[0].id}`)
    }
  }, [channelId, navigate])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
        setEmojiPickerPosition(null)
        setReactionTargetMessageId(null)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      userId: 'current-user',
      userName: 'aiueo aiueioo',
      content: inputValue,
      timestamp: new Date(),
      reactions: {},
      replyTo: replyingToMessage ? {
        id: replyingToMessage.id,
        userId: replyingToMessage.userId,
        userName: replyingToMessage.userName,
        content: replyingToMessage.content,
      } : undefined,
    }

    setMessages([...messages, newMessage])
    setInputValue('')
    setReplyingToMessage(null)
  }

  const getViewport = () => {
    if (!scrollAreaRef.current) return null
    return scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null
  }

  const scrollToBottom = () => {
    const viewport = getViewport()
    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  // Detect scroll to show/hide scroll-to-bottom button
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const viewport = e.target as HTMLDivElement
      if (!viewport) return
      
      const distanceFromBottom = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop
      setShowScrollButton(distanceFromBottom > 150)
    }

    const timer = setTimeout(() => {
      const viewport = getViewport()
      if (viewport) {
        viewport.addEventListener('scroll', handleScroll)
        // Initial check in case it's already scrolled
        const distanceFromBottom = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop
        setShowScrollButton(distanceFromBottom > 150)
      }
    }, 100)

    return () => {
      const viewport = getViewport()
      if (viewport) {
        viewport.removeEventListener('scroll', handleScroll)
      }
      clearTimeout(timer)
    }
  }, [messages]) // Re-run scroll listener when messages list updates to catch layout height shifts

  // Scroll to bottom only if last message was sent by the current user
  useEffect(() => {
    if (messages.length === 0) return
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.userId === 'current-user') {
      // Small timeout to let React finish rendering the new DOM nodes
      setTimeout(scrollToBottom, 50)
    }
  }, [messages])

  const handleToggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing)
  }

  const handleChannelClick = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId)
    if (channel?.category === 'vc') {
      if (isConnectedToVC) {
        if (connectedVCChannel?.id === channelId) {
          // すでに接続済みのVCに戻った場合は、保留中の確認モーダルを閉じる
          closeVCModal()
          navigate(`/chat/${channelId}`)
          return
        }

        // 接続中に別VCへ移る場合も確認画面を出す
        requestJoinVC(channel)
        navigate(`/chat/${channelId}`)
        return
      }

      requestJoinVC(channel)
      navigate(`/chat/${channelId}`)
    } else {
      // テキストチャンネルをクリックした場合、VCモーダルを閉じる
      closeVCModal()
      navigate(`/chat/${channelId}`)
    }
  }

  const handleJoinVC = () => {
    if (pendingVCChannel) {
      if (connectedVCChannel && connectedVCChannel.id !== pendingVCChannel.id) {
        removeMember(connectedVCChannel.id, currentUser.id)
      }
      addMember(pendingVCChannel.id, currentUser.id)
      if (isConnectedToVC) {
        switchVCChannel(pendingVCChannel)
        playSound('connect')
        return
      }
    }
    playSound('connect')
    joinVC()
  }

  const handleDisconnectVC = () => {
    if (connectedVCChannel) {
      removeMember(connectedVCChannel.id, currentUser.id)
    }
    playSound('disconnect')
    disconnectVC()
    navigate(`/chat/${channels[0].id}`)
  }

  const handleCloseVCModal = () => {
    closeVCModal()
    navigate(`/chat/${channels[0].id}`)
  }

  const formatFullTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    // Check if today
    const today = new Date()
    const isToday = date.getFullYear() === today.getFullYear() &&
                    date.getMonth() === today.getMonth() &&
                    date.getDate() === today.getDate()

    if (isToday) {
      return `${hours}:${minutes}`
    } else {
      const yyyy = date.getFullYear()
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      return `${yyyy}/${mm}/${dd} ${hours}:${minutes}`
    }
  }

  const formatHoverTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const isDifferentDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() !== d2.getFullYear() ||
           d1.getMonth() !== d2.getMonth() ||
           d1.getDate() !== d2.getDate();
  }

  const formatSeparatorDate = (date: Date) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}/${mm}/${dd}`
  }

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId)
    setShowUserProfile(true)
  }

  const handleCloseProfile = () => {
    setShowUserProfile(false)
    setSelectedUserId(null)
  }

  const handleDMUserClick = (userId: string) => {
    // DMは「チャンネル欄」ではなく個別のDMスレッドへ遷移させる
    navigate(`/chat/dm-${userId}`)
  }

  const handleOwnProfileClick = () => {
    setSelectedUserId('current-user')
    setShowUserProfile(true)
  }

  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => prev + emoji)
    // Don't close the picker for input field emoji selection
    // setShowEmojiPicker(false)
    // setEmojiPickerPosition(null)
  }

  const handleMessageEmojiSelect = (emoji: string) => {
    if (!reactionTargetMessageId) {
      setShowEmojiPicker(false)
      setEmojiPickerPosition(null)
      return
    }

    const currentUserId = 'current-user'

    setMessages(prev =>
      prev.map(message => {
        if (message.id !== reactionTargetMessageId) return message

        const currentReactions = message.reactions ?? {}
        const existingUserIds = currentReactions[emoji] ?? []
        const hasReacted = existingUserIds.includes(currentUserId)

        const nextUserIds = hasReacted
          ? existingUserIds.filter(id => id !== currentUserId)
          : [...existingUserIds, currentUserId]

        const nextReactions: Record<string, string[]> = { ...currentReactions }
        if (nextUserIds.length === 0) {
          delete nextReactions[emoji]
        } else {
          nextReactions[emoji] = nextUserIds
        }

        return { ...message, reactions: nextReactions }
      }),
    )

    setReactionTargetMessageId(null)
    setShowEmojiPicker(false)
    setEmojiPickerPosition(null)
  }

  const handleGifSelect = (gifUrl: string) => {
    // Send GIF as a message
    const newMessage: Message = {
      id: Date.now().toString(),
      userId: 'current-user',
      userName: 'aiueo aiueioo',
      content: gifUrl,
      timestamp: new Date(),
      reactions: {},
    }

    setMessages([...messages, newMessage])
    setShowEmojiPicker(false)
    setEmojiPickerPosition(null)
  }

  const handleEmojiButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (showEmojiPicker && emojiPickerMode === 'input') {
      // Already open for input, close it
      setShowEmojiPicker(false)
      setEmojiPickerPosition(null)
      return
    }
    
    const rect = event.currentTarget.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    
    // Calculate position to keep picker in viewport
    let top = rect.top - 460 // 450px picker height + 10px margin
    let left = rect.left - 390 // Position to the left of button
    
    // If picker would go above viewport, show below button
    if (top < 10) {
      top = rect.bottom + 10
    }
    
    // If picker would go off left edge, align to right of button
    if (left < 10) {
      left = rect.right - 440 // 440px picker width
    }
    
    // If picker would go off right edge, align to left edge
    if (left + 440 > viewportWidth - 10) {
      left = viewportWidth - 450
    }
    
    setEmojiPickerPosition({ top, left })
    setEmojiPickerMode('input')
    setShowEmojiPicker(true)
  }

  const handleMessageEmojiClick = (messageId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const isSameTarget = showEmojiPicker && emojiPickerMode === 'reaction' && reactionTargetMessageId === messageId
    setReactionTargetMessageId(messageId)

    if (isSameTarget) {
      // Toggle off when clicking same target reaction button again
      setShowEmojiPicker(false)
      setEmojiPickerPosition(null)
      setReactionTargetMessageId(null)
      return
    }
    
    const rect = event.currentTarget.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    
    // Calculate position
    let top = rect.top - 460 // Show above the button
    let left = rect.left - 200
    
    // Keep in viewport
    if (top < 10) {
      top = rect.bottom + 10
    }
    
    if (left < 10) {
      left = 10
    }
    
    if (left + 440 > viewportWidth - 10) {
      left = viewportWidth - 450
    }
    
    setEmojiPickerPosition({ top, left })
    setEmojiPickerMode('reaction')
    setShowEmojiPicker(true)
  }

  const textChannels = channels.filter(c => c.category === 'text')
  const vcChannels = channels.filter(c => c.category === 'vc')

  const viewingVCChannel = selectedChannel.category === 'vc' ? selectedChannel : null
  const viewingMemberIds = viewingVCChannel ? (membersByChannelId[viewingVCChannel.id] ?? []) : []
  const currentUserInViewingVC = viewingMemberIds.includes(currentUser.id)
  const viewingOtherParticipants = dmUsers.filter(user => viewingMemberIds.includes(user.id))

  return (
    <div className={`chat-container ${showUserProfile ? 'profile-open' : ''}`}>
      {/* DM Column */}
      <aside className="dm-sidebar">
        <div className="sidebar-header">
          <h2>DM</h2>
        </div>
        <ScrollArea className="sidebar-content">
          <div className="user-list">
            {dmUsers.map((user) => (
              <button 
                key={user.id} 
                className="user-item"
                onClick={() => handleDMUserClick(user.id)}
              >
                <Avatar className="user-avatar">
                  <AvatarImage src={getUserAvatar(user.id)} alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <span className="user-name">{user.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Channel Column */}
      <aside className="channel-sidebar">
        <div className="sidebar-header">
          <h2>はまちりんぐちゃっと</h2>
        </div>
        <ScrollArea className="sidebar-content">
          <div className="channel-section">
            <h3 className="channel-category-title">テキストチャンネル</h3>
            <nav className="channel-list">
              {textChannels.map((channel) => (
                <button
                  key={channel.id}
                  className={`channel-item ${selectedChannel.id === channel.id ? 'active' : ''}`}
                  onClick={() => handleChannelClick(channel.id)}
                >
                  {channel.id === 'rule' ? (
                    <BookOpen size={16} className="channel-icon" />
                  ) : channel.id === 'jarujaru' ? (
                    <img src={jaruImage} alt="jaru" className="channel-icon-image" />
                  ) : (
                    <Hash size={16} className="channel-icon" />
                  )}
                  <span className="channel-path">{channel.displayName}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="channel-section">
            <h3 className="channel-category-title">ボイスチャンネル</h3>
            <nav className="channel-list">
              {vcChannels.map((channel) => (
                <div key={channel.id} className="vc-channel-wrapper">
                  <button
                    className={`channel-item ${selectedChannel.id === channel.id ? 'active' : ''}`}
                    onClick={() => handleChannelClick(channel.id)}
                  >
                    <Volume2 size={16} className="channel-icon" />
                    <span className="channel-path">{channel.displayName}</span>
                  </button>
                  {(membersByChannelId[channel.id] ?? []).length > 0 && (
                    <div className="vc-participants">
                      {(membersByChannelId[channel.id] ?? []).map((userId) => {
                        const user = dmUsers.find(u => u.id === userId) || (userId === currentUser.id ? currentUser : null)
                        return user ? (
                          <div key={userId} className="vc-participant">
                            <Avatar className="vc-participant-avatar">
                              <AvatarImage src={getUserAvatar(userId)} alt={user.name} />
                              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <span className="vc-participant-name">{user.name}</span>
                          </div>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </ScrollArea>
      </aside>

      {/* Messages Column */}
      <main className="main-content">
        <header className="chat-header">
          <div className="chat-header-content">
            {isDMRoute ? (
              <>
                <Hash size={20} className="header-icon" />
                <h1>{dmDisplayName}</h1>
              </>
            ) : (
              <>
                {selectedChannel.category === 'vc' ? (
                  <Volume2 size={20} className="header-icon" />
                ) : (
                  <Hash size={20} className="header-icon" />
                )}
                <h1>{selectedChannel.displayName}</h1>
              </>
            )}
          </div>
        </header>

        {!isDMRoute && showVCModal && pendingVCChannel ? (
          <div className="vc-join-container">
            <VCJoinModal
              channelName={pendingVCChannel.displayName}
              isMicOn={isMicOn}
              isSpeakerOn={isSpeakerOn}
              onToggleMic={toggleMic}
              onToggleSpeaker={toggleSpeaker}
              onJoin={handleJoinVC}
              onClose={handleCloseVCModal}
              isInline={true}
            />
          </div>
        ) : !isDMRoute && isConnectedToVC && selectedChannel.category === 'vc' && viewingVCChannel ? (
          <VCView
              channelName={viewingVCChannel.displayName}
              participants={viewingOtherParticipants}
              currentUser={currentUser}
              currentUserInChannel={currentUserInViewingVC}
              isMicOn={isMicOn}
              isSpeakerOn={isSpeakerOn}
              isScreenSharing={isScreenSharing}
              isParticipantScreenSharing={{}}
              onToggleMic={toggleMic}
              onToggleSpeaker={toggleSpeaker}
              onToggleScreenShare={handleToggleScreenShare}
              onDisconnect={handleDisconnectVC}
              getInitials={getInitials}
              getUserAvatar={getUserAvatar}
          />
        ) : (
          <>
            <ScrollArea className="messages-area" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <div className="empty-state"></div>
              ) : (
                <div className="messages-list">
                  {messages.map((message, index) => {
                    const dateChanged = index > 0 && isDifferentDay(message.timestamp, messages[index - 1].timestamp);
                    const isConsecutive = index > 0 && !dateChanged &&
                      message.userId === messages[index - 1].userId &&
                      (message.timestamp.getTime() - messages[index - 1].timestamp.getTime()) <= 60000;

                    const showDateSeparator = index === 0 || dateChanged;

                    return (
                      <div key={message.id} className="message-item-wrapper">
                        {showDateSeparator && (
                          <div className="date-separator">
                            <span className="date-separator-text">
                              {formatSeparatorDate(message.timestamp)}
                            </span>
                          </div>
                        )}
                        <div 
                          className={`message ${isConsecutive ? 'consecutive' : ''}`}
                        >
                          {isConsecutive && (
                            <div className="message-time-gutter">
                              <span className="message-hover-time">
                                {formatHoverTime(message.timestamp)}
                              </span>
                            </div>
                          )}
                          <div className="message-body">
                            {!isConsecutive && (
                          <div className="message-header">
                                <div 
                                  className="message-author-group"
                                  onClick={() => handleUserClick(message.userId)}
                                >
                                  <Avatar className="message-avatar clickable-avatar">
                                    <AvatarImage src={getUserAvatar(message.userId)} alt={message.userName} />
                                    <AvatarFallback>{getInitials(message.userName)}</AvatarFallback>
                                  </Avatar>
                                  <span className="message-user">{message.userName}</span>
                                </div>
                                <span className="message-time">
                                  {formatFullTime(message.timestamp)}
                                </span>
                              </div>
                            )}
                            <div className={`message-content ${!isConsecutive ? 'indented-content' : ''}`}>
                              {message.replyTo && (
                                <div className="message-reply-quote">
                                  <div className="reply-quote-user">{message.replyTo.userName}</div>
                                  <div className="reply-quote-text">{message.replyTo.content}</div>
                                </div>
                              )}
                              <MessageContent 
                                content={message.content}
                                messageId={message.id}
                                embedMetaCache={embedMetaCache}
                              />
                            </div>

                            {message.reactions && Object.keys(message.reactions).length > 0 && (
                              <div className="message-reactions">
                                {Object.entries(message.reactions).map(([emoji, userIds]) => {
                                  const safeUserIds = userIds ?? []
                                  const hasReacted = safeUserIds.includes('current-user')

                                  return (
                                    <button
                                      key={emoji}
                                      type="button"
                                      className={`reaction-pill ${hasReacted ? 'reacted' : ''}`}
                                      onClick={() => {
                                        setReactionTargetMessageId(message.id)
                                        setMessages(prev =>
                                          prev.map(m => {
                                            if (m.id !== message.id) return m

                                            const currentReactions = m.reactions ?? {}
                                            const existingUserIds = currentReactions[emoji] ?? []
                                            const already = existingUserIds.includes('current-user')

                                            const nextUserIds = already
                                              ? existingUserIds.filter(id => id !== 'current-user')
                                              : [...existingUserIds, 'current-user']

                                            const nextReactions: Record<string, string[]> = { ...currentReactions }
                                            if (nextUserIds.length === 0) {
                                              delete nextReactions[emoji]
                                            } else {
                                              nextReactions[emoji] = nextUserIds
                                            }

                                            return { ...m, reactions: nextReactions }
                                          }),
                                        )
                                      }}
                                      title={hasReacted ? 'リアクションを削除' : 'リアクションを追加'}
                                    >
                                      <span className="reaction-emoji">{emoji}</span>
                                      <span className="reaction-count">{safeUserIds.length}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                          <div className="message-actions">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="message-action-button"
                              title="リアクション"
                              onClick={(e) => handleMessageEmojiClick(message.id, e)}
                            >
                              <Smile size={18} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="message-action-button"
                              title="返信"
                              onClick={() => setReplyingToMessage(message)}
                            >
                              <Reply size={18} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="message-action-button"
                              title="その他"
                            >
                              <MoreHorizontal size={18} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Floating scroll to bottom button */}
            <button 
              className={`scroll-to-bottom-btn ${showScrollButton ? 'show' : ''}`}
              onClick={scrollToBottom}
            >
              <ArrowDown size={14} />
              <span>最新のメッセージへ</span>
            </button>

            <div className="message-input-container">
              {replyingToMessage && (
                <div className="reply-preview">
                  <div className="reply-preview-content">
                    <span className="reply-preview-label">返信中:</span>
                    <span className="reply-preview-user">{replyingToMessage.userName}</span>
                    <span className="reply-preview-text">{replyingToMessage.content}</span>
                  </div>
                  <button
                    className="reply-preview-close"
                    onClick={() => setReplyingToMessage(null)}
                    title="キャンセル"
                  >
                    ✕
                  </button>
                </div>
              )}
              <form className="message-input-form" onSubmit={handleSendMessage}>
            <div className="input-wrapper">
              <div className="plus-menu-container">
                <Button 
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="plus-button"
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                >
                  <Plus size={20} />
                </Button>
                {showPlusMenu && (
                  <div className="plus-menu">
                    <button className="plus-menu-item plus-menu-item--disabled">
                      <span>ファイルをアップロード</span>
                    </button>
                    <button className="plus-menu-item plus-menu-item--disabled">
                      <span>投票の作成</span>
                    </button>
                  </div>
                )}
              </div>
              <Input
                type="text"
                className="message-input"
                placeholder={`${isDMRoute ? dmDisplayName : selectedChannel.displayName} にメッセージを送信`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Button 
                type="button"
                size="icon"
                variant="ghost"
                className="emoji-button-inline"
                onClick={handleEmojiButtonClick}
              >
                <Smile size={20} />
              </Button>
              <Button 
                type="submit" 
                size="icon"
                className="send-button-inline"
                disabled={!inputValue.trim()}
              >
                <Send size={18} />
              </Button>
            </div>
          </form>
        </div>

        {/* Emoji Picker Popup */}
        {showEmojiPicker && emojiPickerPosition && (
          <div
            ref={emojiPickerRef}
            style={{
              position: 'fixed',
              top: `${emojiPickerPosition.top}px`,
              left: `${emojiPickerPosition.left}px`,
              zIndex: 1000
            }}
          >
            <EmojiPicker 
              onSelect={emojiPickerMode === 'input' ? handleEmojiSelect : handleMessageEmojiSelect}
              keepOpenOnSelect={emojiPickerMode === 'input'}
              onGifSelect={handleGifSelect}
              showGifTab={emojiPickerMode === 'input'}
            />
          </div>
        )}
          </>
        )}
      </main>

      {/* User Controls - Fixed at bottom left */}
      <div className="user-controls-fixed">
        {/* VC Connection Info - Above User Controls */}
        {isConnectedToVC && connectedVCChannel && (
          <VCConnectionInfo
            channelName={connectedVCChannel.displayName}
            onDisconnect={handleDisconnectVC}
          />
        )}
        
        <div className="user-controls-content">
          <div 
            className="user-profile"
            onClick={handleOwnProfileClick}
          >
            <Avatar className="profile-avatar">
              <AvatarImage src={getUserAvatar('current-user')} alt="aiueo aiueioo" />
              <AvatarFallback>AA</AvatarFallback>
            </Avatar>
            <div className="profile-info">
              <span className="profile-name">aiueo aiueioo</span>
            </div>
          </div>
          <div className="control-buttons">
            <Button
              size="icon"
              variant="ghost"
              className={`control-button ${!isMicOn ? 'muted' : ''}`}
              onClick={toggleMic}
              title={isMicOn ? 'Mute' : 'Unmute'}
            >
              {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={`control-button ${!isSpeakerOn ? 'muted' : ''}`}
              onClick={toggleSpeaker}
              title={isSpeakerOn ? 'Deafen' : 'Undeafen'}
            >
              {isSpeakerOn ? <Volume size={18} /> : <VolumeX size={18} />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="control-button"
              title="Settings"
            >
              <Settings size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* User Profile Panel */}
      {showUserProfile && selectedUserId && (
        <UserProfile
          userId={selectedUserId}
          userName={selectedUserId === 'current-user' ? 'aiueo aiueioo' : dmUsers.find(u => u.id === selectedUserId)?.name || 'User'}
          status={selectedUserId === 'current-user' ? 'あーほ' : '今日はいい天気ですね！'}
          bio={selectedUserId === 'current-user' ? 'Mingle hamatiii' : 'よろしくお願いします！'}
          onClose={handleCloseProfile}
          isCurrentUser={selectedUserId === 'current-user'}
          avatarSrc={getUserAvatar(selectedUserId)}
        />
      )}
    </div>
  )
}

