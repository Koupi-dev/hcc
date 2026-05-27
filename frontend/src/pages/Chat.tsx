import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Hash, Volume2, Mic, MicOff, Volume, VolumeX, Settings, Smile, Reply, MoreHorizontal, ArrowDown, BookOpen } from 'lucide-react'
import EmojiPicker from '@/components/EmojiPicker'
import UserProfile from '@/components/UserProfile'
import VCJoinModal from '@/components/VCJoinModal'
import VCParticipantList from '@/components/VCParticipantList'
import VCConnectionInfo from '@/components/VCConnectionInfo'
import VCView from '@/components/VCView'
import MessageContent from '@/components/MessageContent'
import jaruImage from '@/assets/jaru.webp'
import './Chat.css'

// API response cache to prevent duplicate requests
const embedMetaCache = new Map<string, { title?: string; author?: string }>()

type Channel = {
  id: string
  name: string
  displayName: string
  category: 'text' | 'vc'
  participants?: string[] // VC参加者のユーザーID
}

const channels: Channel[] = [
  { id: 'rule', name: 'rule', displayName: 'ルール', category: 'text' },
  { id: 'jarujaru', name: 'jarujaru', displayName: 'ジャルジャル', category: 'text' },
  { id: 'general', name: 'general', displayName: '全般', category: 'text' },
  { id: 'vc1', name: 'vc1', displayName: 'VC 1', category: 'vc', participants: ['5', '7'] },
  { id: 'vc2', name: 'vc2', displayName: 'VC 2', category: 'vc', participants: [] },
  { id: 'vc3', name: 'vc3', displayName: 'VC 3', category: 'vc', participants: ['6'] },
]

type User = {
  id: string
  name: string
  status: 'online' | 'offline'
}

const dmUsers: User[] = [
  { id: '5', name: 'Friend1', status: 'online' },
  { id: '6', name: 'Friend2', status: 'offline' },
  { id: '7', name: 'Friend3', status: 'online' },
]

type Message = {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: Date
}

export default function Chat() {
  const { channelId } = useParams<{ channelId: string }>()
  const navigate = useNavigate()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isMicOn, setIsMicOn] = useState(true)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{ top: number; left: number } | null>(null)
  const [emojiPickerMode, setEmojiPickerMode] = useState<'input' | 'reaction'>('input')
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showVCModal, setShowVCModal] = useState(false)
  const [pendingVCChannel, setPendingVCChannel] = useState<Channel | null>(null)
  const [isConnectedToVC, setIsConnectedToVC] = useState(false)
  const [connectedVCChannel, setConnectedVCChannel] = useState<Channel | null>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  const selectedChannel = channels.find(c => c.id === channelId) || channels[0]

  // ユーザーIDに基づいてアバター画像を返す関数
  const getUserAvatar = (userId: string) => {
    const avatarMap: { [key: string]: string } = {
      'current-user': '/avatar-current.png',
      '5': '/avatar-1.png',
      '6': '/avatar-2.png',
      '7': '/avatar-3.png',
    }
    return avatarMap[userId] || '/default-avatar.png'
  }

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
      userName: 'You',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages([...messages, newMessage])
    setInputValue('')
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

  const handleChannelClick = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId)
    if (channel?.category === 'vc') {
      // VCチャンネルの場合
      if (isConnectedToVC && connectedVCChannel?.id === channelId) {
        // 既に接続中のVCチャンネルをクリックした場合は何もしない
        navigate(`/chat/${channelId}`)
      } else if (isConnectedToVC) {
        // 別のVCチャンネルに接続しようとした場合は確認画面を表示
        setPendingVCChannel(channel)
        setShowVCModal(true)
        navigate(`/chat/${channelId}`)
      } else {
        // 未接続の場合は確認画面を表示
        setPendingVCChannel(channel)
        setShowVCModal(true)
        navigate(`/chat/${channelId}`)
      }
    } else {
      // テキストチャンネルの場合は通常通り遷移
      navigate(`/chat/${channelId}`)
    }
  }

  const handleJoinVC = () => {
    if (pendingVCChannel) {
      setIsConnectedToVC(true)
      setConnectedVCChannel(pendingVCChannel)
      setShowVCModal(false)
      setPendingVCChannel(null)
    }
  }

  const handleDisconnectVC = () => {
    setIsConnectedToVC(false)
    setConnectedVCChannel(null)
    // テキストチャンネルに戻る
    navigate(`/chat/${channels[0].id}`)
  }

  const handleCloseVCModal = () => {
    setShowVCModal(false)
    setPendingVCChannel(null)
    // テキストチャンネルに戻る
    navigate(`/chat/${channels[0].id}`)
  }

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase()
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

  const handleUserClick = (userId: string, userName: string) => {
    setSelectedUserId(userId)
    setShowUserProfile(true)
  }

  const handleCloseProfile = () => {
    setShowUserProfile(false)
    setSelectedUserId(null)
  }

  const handleDMUserClick = (userId: string) => {
    setSelectedUserId(userId)
    setShowUserProfile(true)
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
    // For message reactions, close after selection
    console.log('Selected emoji for reaction:', emoji)
    // TODO: Add reaction to message
    setShowEmojiPicker(false)
    setEmojiPickerPosition(null)
  }

  const handleGifSelect = (gifUrl: string) => {
    // Send GIF as a message
    const newMessage: Message = {
      id: Date.now().toString(),
      userId: 'current-user',
      userName: 'You',
      content: gifUrl,
      timestamp: new Date(),
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
    const viewportHeight = window.innerHeight
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

  const handleMessageEmojiClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (showEmojiPicker && emojiPickerMode === 'reaction') {
      // Already open for reaction, close it
      setShowEmojiPicker(false)
      setEmojiPickerPosition(null)
      return
    }
    
    const rect = event.currentTarget.getBoundingClientRect()
    const viewportHeight = window.innerHeight
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
                  <VCParticipantList 
                    participants={channel.participants || []}
                    users={dmUsers}
                    getInitials={getInitials}
                    getUserAvatar={getUserAvatar}
                  />
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
            {selectedChannel.category === 'vc' ? (
              <Volume2 size={20} className="header-icon" />
            ) : (
              <Hash size={20} className="header-icon" />
            )}
            <h1>{selectedChannel.displayName}</h1>
          </div>
        </header>

        {showVCModal && pendingVCChannel ? (
          <div className="vc-join-container">
            <VCJoinModal
              channelName={pendingVCChannel.displayName}
              isMicOn={isMicOn}
              isSpeakerOn={isSpeakerOn}
              onToggleMic={() => setIsMicOn(!isMicOn)}
              onToggleSpeaker={() => setIsSpeakerOn(!isSpeakerOn)}
              onJoin={handleJoinVC}
              onClose={handleCloseVCModal}
              isInline={true}
            />
          </div>
        ) : isConnectedToVC && connectedVCChannel ? (
          <VCView
            channelName={connectedVCChannel.displayName}
            participants={dmUsers.filter(user => 
              connectedVCChannel.participants?.includes(user.id)
            )}
            currentUser={{ id: 'current-user', name: 'You', status: 'online' }}
            isMicOn={isMicOn}
            isSpeakerOn={isSpeakerOn}
            onToggleMic={() => setIsMicOn(!isMicOn)}
            onToggleSpeaker={() => setIsSpeakerOn(!isSpeakerOn)}
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
                                  onClick={() => handleUserClick(message.userId, message.userName)}
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
                              <MessageContent 
                                content={message.content}
                                messageId={message.id}
                                embedMetaCache={embedMetaCache}
                              />
                            </div>
                          </div>
                          <div className="message-actions">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="message-action-button"
                              title="リアクション"
                              onClick={handleMessageEmojiClick}
                            >
                              <Smile size={18} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="message-action-button"
                              title="返信"
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
              <form className="message-input-form" onSubmit={handleSendMessage}>
            <div className="input-wrapper">
              <Input
                type="text"
                className="message-input"
                placeholder={`${selectedChannel.displayName} にメッセージを送信`}
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
              <AvatarImage src={getUserAvatar('current-user')} alt="You" />
              <AvatarFallback>YO</AvatarFallback>
            </Avatar>
            <div className="profile-info">
              <span className="profile-name">You</span>
            </div>
          </div>
          <div className="control-buttons">
            <Button
              size="icon"
              variant="ghost"
              className={`control-button ${!isMicOn ? 'muted' : ''}`}
              onClick={() => setIsMicOn(!isMicOn)}
              title={isMicOn ? 'Mute' : 'Unmute'}
            >
              {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={`control-button ${!isSpeakerOn ? 'muted' : ''}`}
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
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

      {/* VC Connection Info - Above User Profile */}
      {isConnectedToVC && connectedVCChannel && (
        <div className="vc-connection-info-panel">
          <VCConnectionInfo
            channelName={connectedVCChannel.displayName}
            onDisconnect={handleDisconnectVC}
          />
        </div>
      )}

      {/* VC Connection Info - Above User Profile */}
      {isConnectedToVC && connectedVCChannel && (
        <div className="vc-connection-info-panel">
          <VCConnectionInfo
            channelName={connectedVCChannel.displayName}
            onDisconnect={handleDisconnectVC}
          />
        </div>
      )}

      {/* User Profile Panel */}
      {showUserProfile && selectedUserId && (
        <UserProfile
          userId={selectedUserId}
          userName={selectedUserId === 'current-user' ? 'You' : dmUsers.find(u => u.id === selectedUserId)?.name || 'User'}
          status={selectedUserId === 'current-user' ? 'コーディング中...' : '今日はいい天気ですね！'}
          bio={selectedUserId === 'current-user' ? 'フロントエンド開発者です。\nReactとTypeScriptが好きです。' : 'よろしくお願いします！'}
          onClose={handleCloseProfile}
          isCurrentUser={selectedUserId === 'current-user'}
          avatarSrc={getUserAvatar(selectedUserId)}
        />
      )}
    </div>
  )
}

