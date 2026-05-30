import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Hash, Volume2, Mic, MicOff, Volume, VolumeX, Settings, Smile, Reply, ArrowDown, BookOpen, Plus, Upload, Pencil, Check, X, Trash2 } from 'lucide-react'
import EmojiPicker from '@/components/EmojiPicker'
import UserProfile from '@/components/UserProfile'
import VCJoinModal from '@/components/VCJoinModal'
import VCConnectionInfo from '@/components/VCConnectionInfo'
import VCView from '@/components/VCView'
import MessageContent from '@/components/MessageContent'
import { useVoiceChannel } from '@/hooks/useVoiceChannel'
import { useVCParticipants } from '@/hooks/useVCParticipants'
import { getUserAvatar, getInitials } from '@/lib/avatars'
import { channels, dmUsers, CURRENT_USER_INTERNAL_ID, findChannelByInternalId, findUserByInternalId } from '@/data/mockData'
import type { Message } from '@/types/chat'
import jaruImage from '@/assets/jaru.webp'
import './Chat.css'

// API response cache to prevent duplicate requests
const embedMetaCache = new Map<string, { title?: string; author?: string }>()

// SE 生成関数 (以前のシンプルなピュアサイン音のよさを活かしつつ、間の音を追加して滑らかにしたバージョン)
const playSound = (type: 'toggle' | 'connect' | 'disconnect' | 'screenShareOn' | 'screenShareOff' | 'micOn' | 'micOff' | 'speakerOn' | 'speakerOff' | 'mention') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const now = audioContext.currentTime

    // 以前のシンプルな「サイン波ピープ音」の質感を維持しつつ、
    // クリック音（ポップノイズ）を完全に無くし、スムーズに聴こえるように最適化した再生ヘルパー
    const playBeep = (freq: number, startTime: number, duration: number = 0.08) => {
      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()
      osc.type = 'sine'
      osc.connect(gain)
      gain.connect(audioContext.destination)
      osc.frequency.value = freq

      const targetStartTime = now + startTime
      // アタックとリリースを僅かに入れることでプツプツ感を解消
      gain.gain.setValueAtTime(0, targetStartTime)
      gain.gain.linearRampToValueAtTime(0.20, targetStartTime + 0.008)
      gain.gain.setValueAtTime(0.20, targetStartTime + duration - 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, targetStartTime + duration)

      osc.start(targetStartTime)
      // ゲインが完全に0になった直後にオシレーターを停止
      osc.stop(targetStartTime + duration + 0.02)
    }

    if (type === 'micOn') {
      // マイクON: F4 (349.23) から A4 (440.00) の「間」の音として G4 (392.00) を追加してスムーズに
      const frequencies = [349.23, 392.00, 440.00]
      const startTimes = [0, 0.05, 0.10]
      frequencies.forEach((freq, index) => {
        playBeep(freq, startTimes[index], 0.06)
      })
    } else if (type === 'micOff') {
      // マイクOFF: A4 (440.00) から F4 (349.23) の「間」の音として G4 (392.00) を追加してスムーズに
      const frequencies = [440.00, 392.00, 349.23]
      const startTimes = [0, 0.05, 0.10]
      frequencies.forEach((freq, index) => {
        playBeep(freq, startTimes[index], 0.06)
      })
    } else if (type === 'speakerOn') {
      // スピーカーON: A4 (440.00) から C5 (523.25) の「間」の音として B4 (493.88) を追加
      const frequencies = [440.00, 493.88, 523.25]
      const startTimes = [0, 0.05, 0.10]
      frequencies.forEach((freq, index) => {
        playBeep(freq, startTimes[index], 0.06)
      })
    } else if (type === 'speakerOff') {
      // スピーカーOFF: C5 (523.25) から A4 (440.00) の「間」の音として B4 (493.88) を追加
      const frequencies = [523.25, 493.88, 440.00]
      const startTimes = [0, 0.05, 0.10]
      frequencies.forEach((freq, index) => {
        playBeep(freq, startTimes[index], 0.06)
      })
    } else if (type === 'connect') {
      // 接続音: F4➔A4➔C5 の「間」の音として G4 と B4 を追加して5つの階梯で美しく駆け上がる
      const frequencies = [349.23, 392.00, 440.00, 493.88, 523.25]
      const startTimes = [0, 0.06, 0.12, 0.18, 0.24]
      frequencies.forEach((freq, index) => {
        playBeep(freq, startTimes[index], 0.08)
      })
    } else if (type === 'disconnect') {
      // 切断音: C5➔A4➔F4 の「間」の音として B4 と G4 を追加して5つの階梯で美しく降りる
      const frequencies = [523.25, 493.88, 440.00, 392.00, 349.23]
      const startTimes = [0, 0.06, 0.12, 0.18, 0.24]
      frequencies.forEach((freq, index) => {
        playBeep(freq, startTimes[index], 0.08)
      })
    } else if (type === 'screenShareOn') {
      // 画面共有ON: ピュアサイン波の軽快な上昇
      const frequencies = [523.25, 587.33, 659.25, 783.99, 987.77]
      const startTimes = [0, 0.06, 0.12, 0.18, 0.24]
      frequencies.forEach((freq, index) => {
        playBeep(freq, startTimes[index], 0.08)
      })
    } else if (type === 'screenShareOff') {
      // 画面共有OFF: ピュアサイン波の軽快な下降
      const frequencies = [987.77, 783.99, 659.25, 587.33, 523.25]
      const startTimes = [0, 0.06, 0.12, 0.18, 0.24]
      frequencies.forEach((freq, index) => {
        playBeep(freq, startTimes[index], 0.08)
      })
    } else if (type === 'toggle') {
      // 汎用トグル音: シンプルな2音のピュアサイン波
      const frequencies = [349.23, 440.00]
      const startTimes = [0, 0.05]
      frequencies.forEach((freq, index) => {
        playBeep(freq, startTimes[index], 0.06)
      })
    } else if (type === 'mention') {
      // メンション音: 軽快で少し高音の二連チャイム音
      const frequencies = [587.33, 880.00]
      const startTimes = [0, 0.08]
      frequencies.forEach((freq, index) => {
        playBeep(freq, startTimes[index], 0.12)
      })
    }
  } catch (error) {
    console.error('SE 再生エラー:', error)
  }
}

export default function Chat() {
  const { internalChannelId, internalUserId } = useParams<{ internalChannelId?: string; internalUserId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const plusMenuRef = useRef<HTMLDivElement>(null)
  
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
  const { membersByChannelId, addMember, removeMember, mutedUsers, speakingUsers, muteUser, unmuteUser, setSpeaking } = useVCParticipants()
  
  // VC channel rename state
  const [channelNames, setChannelNames] = useState<Record<string, string>>({})
  const [renamingChannelId, setRenamingChannelId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // UI State
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [participantScreenSharing, setParticipantScreenSharing] = useState<Record<string, boolean>>({})

  // User Profile State
  const [userDisplayName, setUserDisplayName] = useState('aiueo aiueioo')
  const [userStatusMessage, setUserStatusMessage] = useState('あーほ')
  const [userBio, setUserBio] = useState('Mingle hamatiii')

  const currentUser = useMemo(() => ({
    id: 'current-user',
    internalId: CURRENT_USER_INTERNAL_ID,
    name: userDisplayName,
    status: 'online' as const
  }), [userDisplayName])

  // Channel-specific messages mapping state (each channel / DM has its own independent history)
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>(() => {
    const now = new Date()
    return {
      '10000000000000000001': [
        {
          id: 'init-r1',
          userId: 'system',
          userName: 'System',
          content: 'はまちりんぐちゃっとへようこそ！このチャンネルはサーバーのルールです。',
          timestamp: new Date(now.getTime() - 86400000),
          reactions: {} as Record<string, string[]>,
        },
        {
          id: 'init-r2',
          userId: '20000000000000000002',
          userName: 'Friend1',
          content: 'みんなで仲良く、マナーを守って使いましょう！🤝',
          timestamp: new Date(now.getTime() - 86000000),
          reactions: { '👍': ['20000000000000000003'] } as Record<string, string[]>,
        }
      ],
      '10000000000000000002': [
        {
          id: 'init-j1',
          userId: '20000000000000000003',
          userName: 'Friend2',
          content: '昨日のジャルジャルの新しいコント動画、マジで腹ちぎれるほど笑ったわｗｗｗ',
          timestamp: new Date(now.getTime() - 3600000),
          reactions: { '😂': ['20000000000000000004', 'current-user'] } as Record<string, string[]>,
        },
        {
          id: 'init-j2',
          userId: '20000000000000000004',
          userName: 'Friend3',
          content: 'それな！あの独特のシュールな世界観が最高だよね。',
          timestamp: new Date(now.getTime() - 1800000),
          reactions: { '🔥': ['20000000000000000003'] } as Record<string, string[]>,
        }
      ],
      '10000000000000000003': [
        {
          id: 'init-g1',
          userId: '20000000000000000002',
          userName: 'Friend1',
          content: '新しくはまちりんぐちゃっとのサーバーを立ち上げてみました！雑談など自由にどうぞ！🌟',
          timestamp: new Date(now.getTime() - 7200000),
          reactions: { '🎉': ['20000000000000000003', '20000000000000000004'] } as Record<string, string[]>,
        }
      ],
      '20000000000000000002': [
        {
          id: 'init-d1',
          userId: '20000000000000000002',
          userName: 'Friend1',
          content: 'お疲れ様！今日もし夜暇だったら、後で一緒にVCでゲームでもしない？🎮',
          timestamp: new Date(now.getTime() - 4000000),
          reactions: {} as Record<string, string[]>,
        }
      ],
      '20000000000000000003': [
        {
          id: 'init-d2',
          userId: '20000000000000000003',
          userName: 'Friend2',
          content: 'この前の開発用のデザイン資料、共有ありがとう！めちゃくちゃ参考になった！',
          timestamp: new Date(now.getTime() - 10000000),
          reactions: { '👍': ['current-user'] } as Record<string, string[]>,
        }
      ],
      '20000000000000000004': [
        {
          id: 'init-d3',
          userId: '20000000000000000004',
          userName: 'Friend3',
          content: '了解です！頼まれてた資料の件、明日の午前中までにまとめ直しておきますね〜！✨',
          timestamp: new Date(now.getTime() - 5000000),
          reactions: {} as Record<string, string[]>,
        }
      ],
    }
  })

  const [inputValue, setInputValue] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{ top: number; left: number } | null>(null)
  const [emojiPickerMode, setEmojiPickerMode] = useState<'input' | 'reaction'>('input')
  const [reactionTargetMessageId, setReactionTargetMessageId] = useState<string | null>(null)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'account' | 'voice' | 'notifications'>('profile')

  // Input ref and mention suggestions ref
  const inputRef = useRef<HTMLInputElement>(null)
  const mentionSuggestionsRef = useRef<HTMLDivElement>(null)

  // Channel Notifications State (unread or mention + count)
  const [channelNotifications, setChannelNotifications] = useState<Record<string, { type: 'none' | 'unread' | 'mention'; count: number }>>({
    '10000000000000000002': { type: 'unread', count: 0 },
    '10000000000000000003': { type: 'mention', count: 1 },
  })

  // Mention suggestions UI state
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionSearchText, setMentionSearchText] = useState('')
  const [activeMentionIndex, setActiveMentionIndex] = useState(0)

  // Notification preferences
  const [enableDesktopNotifications, setEnableDesktopNotifications] = useState(false)
  const [enableSoundNotifications, setEnableSoundNotifications] = useState(true)

  useEffect(() => {
    if (enableDesktopNotifications && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [enableDesktopNotifications])

  // Sort DM users by recency of messages
  const sortedDmUsers = useMemo(() => {
    return [...dmUsers].sort((a, b) => {
      const aMsgs = messagesByChannel[a.internalId] ?? []
      const bMsgs = messagesByChannel[b.internalId] ?? []
      const aLast = aMsgs.length > 0 ? new Date(aMsgs[aMsgs.length - 1].timestamp).getTime() : 0
      const bLast = bMsgs.length > 0 ? new Date(bMsgs[bMsgs.length - 1].timestamp).getTime() : 0
      
      if (aLast === 0 && bLast === 0) {
        return dmUsers.indexOf(a) - dmUsers.indexOf(b)
      }
      return bLast - aLast
    })
  }, [messagesByChannel, dmUsers])

  const getUserStatusMessage = useCallback((userId: string) => {
    if (userId === 'current-user' || userId === CURRENT_USER_INTERNAL_ID) {
      return userStatusMessage
    }
    if (userId === '20000000000000000002') return '今日はいい天気ですね！'
    if (userId === '20000000000000000003') return 'よろしくお願いします！'
    if (userId === '20000000000000000004') return 'ミーティング中'
    return 'ステータスメッセージはありません'
  }, [userStatusMessage])

  // Clean up screen sharing for users who left VC
  useEffect(() => {
    const allInAnyVC = Object.values(membersByChannelId).flat()
    setParticipantScreenSharing(prev => {
      let changed = false
      const next = { ...prev }
      Object.keys(prev).forEach(uid => {
        if (!allInAnyVC.includes(uid) && prev[uid]) {
          delete next[uid]
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [membersByChannelId])

  // Keep track of previous VC states to detect actions and play sounds for other users
  const prevVCStateRef = useRef<{
    channelId: string | null;
    members: string[];
    muted: Record<string, boolean>;
    sharing: Record<string, boolean>;
  }>({
    channelId: null,
    members: [],
    muted: {},
    sharing: {}
  })

  useEffect(() => {
    const channelId = connectedVCChannel?.internalId || null
    const currentMembers = channelId ? (membersByChannelId[channelId] ?? []) : []
    
    const currentMuted: Record<string, boolean> = {}
    const currentSharing: Record<string, boolean> = {}
    
    currentMembers.forEach(uid => {
      if (uid !== currentUser.internalId) {
        currentMuted[uid] = mutedUsers.has(uid)
        currentSharing[uid] = !!participantScreenSharing[uid]
      }
    })

    const prev = prevVCStateRef.current

    if (prev.channelId !== channelId) {
      prevVCStateRef.current = {
        channelId,
        members: currentMembers,
        muted: currentMuted,
        sharing: currentSharing
      }
      return
    }

    if (channelId) {
      // 1. Detect joins (excluding current user)
      currentMembers.forEach(uid => {
        if (uid !== currentUser.internalId && !prev.members.includes(uid)) {
          playSound('connect')
        }
      })

      // 2. Detect leaves (excluding current user)
      prev.members.forEach(uid => {
        if (uid !== currentUser.internalId && !currentMembers.includes(uid)) {
          playSound('disconnect')
        }
      })

      // 3. Detect mute/unmute changes (excluding current user)
      Object.keys(currentMuted).forEach(uid => {
        const wasMuted = prev.muted[uid] ?? false
        const isMuted = currentMuted[uid]
        if (wasMuted !== isMuted) {
          playSound(isMuted ? 'micOff' : 'micOn')
        }
      })

      // 4. Detect screen share changes (excluding current user)
      Object.keys(currentSharing).forEach(uid => {
        const wasSharing = prev.sharing[uid] ?? false
        const isSharing = currentSharing[uid]
        if (wasSharing !== isSharing) {
          playSound(isSharing ? 'screenShareOn' : 'screenShareOff')
        }
      })
    }

    prevVCStateRef.current = {
      channelId,
      members: currentMembers,
      muted: currentMuted,
      sharing: currentSharing
    }
  }, [connectedVCChannel, membersByChannelId, mutedUsers, participantScreenSharing, currentUser.internalId])

  // Mentionable users list
  const mentionableUsers = useMemo(() => [currentUser, ...dmUsers], [currentUser, dmUsers])

  // Filter mentionable users based on query
  const filteredUsers = useMemo(() => {
    if (!showMentionSuggestions) return []
    return mentionableUsers.filter(u => 
      u.name.toLowerCase().includes(mentionSearchText.toLowerCase()) ||
      u.internalId.includes(mentionSearchText)
    )
  }, [showMentionSuggestions, mentionSearchText, mentionableUsers])

  // Handles selecting a user from the mention suggestions
  const handleSelectMention = (user: { internalId: string; name: string }) => {
    setInputValue(prev => {
      const mentionMatch = prev.match(/(?:^|\s)@(\S*)$/)
      if (!mentionMatch) return prev + `<@${user.internalId}> `
      const matchIndex = prev.lastIndexOf(mentionMatch[0])
      const prefix = prev.slice(0, matchIndex)
      const leadingSpace = mentionMatch[0].startsWith(' ') ? ' ' : ''
      return `${prefix}${leadingSpace}<@${user.internalId}> `
    })
    setShowMentionSuggestions(false)
    setMentionSearchText('')
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  // Handles text input changes to trigger mention suggestions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)

    const mentionMatch = val.match(/(?:^|\s)@(\S*)$/)
    if (mentionMatch) {
      const query = mentionMatch[1]
      setMentionSearchText(query)
      setShowMentionSuggestions(true)
      setActiveMentionIndex(0)
    } else {
      setShowMentionSuggestions(false)
      setMentionSearchText('')
    }
  }

  // Keyboard navigation for mention suggestions list
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionSuggestions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveMentionIndex(prev => (prev + 1) % filteredUsers.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveMentionIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSelectMention(filteredUsers[activeMentionIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentionSuggestions(false)
      }
    }
  }

  // ルートの種別を判定
  const isDMRoute = location.pathname.startsWith('/channels/@me/')
  const isVCRoute = location.pathname.startsWith('/channels/vc/')
  const isChatRoute = location.pathname.startsWith('/channels/chat/')

  // DMの相手ユーザーを特定
  const dmUser = isDMRoute && internalUserId ? findUserByInternalId(internalUserId) : null
  const dmDisplayName = dmUser ? `# ${dmUser.name}` : '# dm-name'

  // 選択中のチャンネルを特定
  const selectedChannel = (isChatRoute || isVCRoute) && internalChannelId
    ? findChannelByInternalId(internalChannelId) || channels[0]
    : channels[0]

  // チャンネルの表示名を取得するヘルパー（リネーム対応）
  const getChannelDisplayName = (channelInternalId: string, defaultName: string) => {
    return channelNames[channelInternalId] || defaultName
  }

  // Memoized current chat ID — depends on isDMRoute & selectedChannel (declared above)
  const currentChatId = useMemo(() => {
    return isDMRoute ? (internalUserId || '') : (selectedChannel?.internalId || '')
  }, [isDMRoute, internalUserId, selectedChannel?.internalId])

  // Select only the current channel's messages (avoids cross-channel leakage)
  const messages = useMemo(() => {
    return currentChatId ? (messagesByChannel[currentChatId] ?? []) : []
  }, [messagesByChannel, currentChatId])

  useEffect(() => {
    // パスが /channels だけの場合はデフォルトチャンネルへリダイレクト
    if (!internalChannelId && !internalUserId) {
      navigate(`/channels/chat/${channels[0].internalId}`)
    }
  }, [internalChannelId, internalUserId, navigate])

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

  // Close plus menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false)
      }
    }

    if (showPlusMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPlusMenu])

  // Close mention suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionSuggestionsRef.current && !mentionSuggestionsRef.current.contains(event.target as Node)) {
        setShowMentionSuggestions(false)
      }
    }

    if (showMentionSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMentionSuggestions])

  // Clear notification for selected channel or DM user
  useEffect(() => {
    const activeId = isDMRoute ? internalUserId : selectedChannel?.internalId
    if (activeId) {
      setChannelNotifications(prev => {
        const current = prev[activeId]
        if (current && current.type !== 'none') {
          return { ...prev, [activeId]: { type: 'none', count: 0 } }
        }
        return prev
      })
    }
  }, [isDMRoute, internalUserId, selectedChannel?.internalId])

  // ── Notification helper ──────────────────────────────────────────────────
  // Fires a desktop notification (if enabled + window unfocused) and/or
  // plays a sound (if enabled), only for mention-type events.
  const fireIncomingNotification = useCallback(
    (isMention: boolean, senderName: string, channelLabel: string, bodyText: string) => {
      if (enableSoundNotifications) {
        playSound(isMention ? 'mention' : 'toggle')
      }
      if (
        isMention &&
        enableDesktopNotifications &&
        Notification.permission === 'granted'
      ) {
        new Notification(`${senderName} があなたをメンションしました`, {
          body: `#${channelLabel}: ${bodyText.replace(/<@\d+>/g, '@...')}`,
          icon: '/favicon.ico',
        })
      }
    },
    [enableSoundNotifications, enableDesktopNotifications]
  )

  // ── Rich mock activity engine ─────────────────────────────────────────────
  // Runs continuously; simulates chat messages (with mentions & emoji),
  // reactions on recent messages, and VC join / leave / mute events.
  useEffect(() => {
    // ---- conversation pools ------------------------------------------------
    const CONVO: string[] = [
      // casual
      `最近どう？`,
      `ちょっと聞いてもいい？`,
      `今日めっちゃ眠い 😴`,
      `それな〜`,
      `マジ？知らんかった笑`,
      `草`,
      `えー！マジで？`,
      `おつかれ〜！`,
      `ありがとう！助かった`,
      `なるほどね〜`,
      `うける 笑笑`,
      `待って、それどういう意味？`,
      `わかる、めっちゃわかる`,
      `今夜空いてる？`,
      `昨日の飯めちゃ美味かった 🍜`,
      `このゲーム面白すぎる`,
      `ちょっと待って今見てる`,
      `了解〜`,
      `そうなんだ〜`,
      `うまく言えないけど、なんかいい感じ`,
      `www`,
      `あ、そっか`,
      `まじかよ`,
      `それはやばいな`,
      `ゆっくりしてね 🙌`,
    ]

    // Build a message with a random self-mention or normal conversation
    const buildMentionMsg = (): { content: string; isMentionSelf: boolean } => {
      const r = Math.random()
      if (r < 0.35) {
        // mention current user (ONLY target me!)
        return {
          content: `<@${CURRENT_USER_INTERNAL_ID}> ${pick([`ちょっといい？`, `見てる？`, `これ知ってた？`, `後で来て！`, `意見聞かせて`])}`,
          isMentionSelf: true,
        }
      } else {
        return { content: pick(CONVO), isMentionSelf: false }
      }
    }

    // ---- emoji pool for reactions ------------------------------------------
    const REACTION_EMOJIS = [`👍`, `😂`, `❤️`, `🔥`, `😮`, `✅`, `🎉`, `👀`, `😭`, `💯`]

    // ---- helpers -----------------------------------------------------------
    function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

    // ---- fire a notification dot + OS/sound if needed ----------------------
    const fire = (isMention: boolean, senderName: string, label: string, body: string) => {
      fireIncomingNotification(isMention, senderName, label, body)
    }

    // ---- post a message to the active channel view -------------------------
    const postToActive = (sender: typeof dmUsers[0], content: string, isMentionSelf: boolean) => {
      const msg: Message = {
        id: `mock-${Date.now()}-${Math.random()}`,
        userId: sender.internalId,
        userName: sender.name,
        content,
        timestamp: new Date(),
        reactions: {},
      }
      setMessagesByChannel(prev => ({
        ...prev,
        [currentChatId]: [...(prev[currentChatId] ?? []), msg]
      }))
      if (isMentionSelf || isDMRoute) {
        fire(true, sender.name, isDMRoute ? `DM: ${sender.name}` : getChannelDisplayName(selectedChannel.internalId, selectedChannel.displayName), content)
      }
    }

    // ---- add a reaction to a recent message --------------------------------
    const addReactionToRecent = () => {
      const emoji = pick(REACTION_EMOJIS)
      const reactor = pick(dmUsers)
      setMessagesByChannel(prev => {
        const pool = prev[currentChatId] ?? []
        if (pool.length === 0) return prev
        // pick one of the last 5 messages
        const recent = pool.slice(-5)
        const target = pick(recent)
        
        const updatedPool = pool.map(m => {
          if (m.id !== target.id) return m
          const reactions = { ...(m.reactions ?? {}) }
          const existing = reactions[emoji] ?? []
          if (existing.includes(reactor.internalId)) return m // already reacted
          reactions[emoji] = [...existing, reactor.internalId]
          return { ...m, reactions }
        })
        
        return {
          ...prev,
          [currentChatId]: updatedPool
        }
      })
    }

    // ---- VC mock events ----------------------------------------------------
    const vcChannels = channels.filter(c => c.category === 'vc')

    const doVCEvent = () => {
      if (vcChannels.length === 0) return
      const r = Math.random()

      if (r < 0.22) {
        // ── Join a random VC channel ────────────────────────────────────────
        const chan = pick(vcChannels)
        const user = pick(dmUsers)
        addMember(chan.internalId, user.internalId)
        unmuteUser(user.internalId)

      } else if (r < 0.38) {
        // ── Leave (from whichever channel they are in) ──────────────────────
        const user = pick(dmUsers)
        for (const chan of vcChannels) {
          const members = membersByChannelId[chan.internalId] ?? []
          if (members.includes(user.internalId)) {
            removeMember(chan.internalId, user.internalId)
            break
          }
        }

      } else if (r < 0.52) {
        // ── Mute ──────────────────────────────────────────────────────────
        // Pick a user that is currently in ANY vc channel
        const allInVC = vcChannels.flatMap(c => membersByChannelId[c.internalId] ?? [])
        const candidates = dmUsers.filter(u => allInVC.includes(u.internalId) && !mutedUsers.has(u.internalId))
        if (candidates.length > 0) muteUser(pick(candidates).internalId)

      } else if (r < 0.64) {
        // ── Unmute ─────────────────────────────────────────────────────────
        const mutedInVC = Array.from(mutedUsers).filter(uid =>
          vcChannels.some(c => (membersByChannelId[c.internalId] ?? []).includes(uid))
        )
        if (mutedInVC.length > 0) unmuteUser(pick(mutedInVC))

      } else if (r < 0.78) {
        // ── Speaking burst (unmuted user starts speaking for ~2 s) ────────
        const allInVC = vcChannels.flatMap(c => membersByChannelId[c.internalId] ?? [])
        const speakers = dmUsers.filter(u => allInVC.includes(u.internalId) && !mutedUsers.has(u.internalId))
        if (speakers.length > 0) {
          const spk = pick(speakers)
          setSpeaking(spk.internalId, true)
          setTimeout(() => setSpeaking(spk.internalId, false), 1500 + Math.random() * 2000)
        }

      } else if (r < 0.88) {
        // ── Channel switch (user leaves one VC and immediately joins another)
        const user = pick(dmUsers)
        for (const chan of vcChannels) {
          const members = membersByChannelId[chan.internalId] ?? []
          if (members.includes(user.internalId)) {
            removeMember(chan.internalId, user.internalId)
            const others = vcChannels.filter(c => c.internalId !== chan.internalId)
            if (others.length > 0) {
              const dest = pick(others)
              setTimeout(() => addMember(dest.internalId, user.internalId), 600)
            }
            break
          }
        }

      } else if (r < 0.94) {
        // ── Everyone leaves a random VC (channel goes empty) ───────────────
        const chan = pick(vcChannels)
        const members = [...(membersByChannelId[chan.internalId] ?? [])]
        members.forEach(uid => removeMember(chan.internalId, uid))
      } else {
        // ── Screen Share Toggle ──────────────────────────────────────────
        const allInVC = vcChannels.flatMap(c => membersByChannelId[c.internalId] ?? [])
        const candidates = dmUsers.filter(u => allInVC.includes(u.internalId))
        if (candidates.length > 0) {
          const targetUser = pick(candidates)
          setParticipantScreenSharing(prev => {
            const currentlySharing = !!prev[targetUser.internalId]
            const nextSharing = !currentlySharing
            return {
              ...prev,
              [targetUser.internalId]: nextSharing
            }
          })
        }
      }
    }

    // ---- main tick ---------------------------------------------------------
    const tick = () => {
      const action = Math.random()

      if (action < 0.30) {
        // ── Chat in the currently visible channel/DM ──────────────────────
        if (!isDMRoute) {
          const sender = pick(dmUsers)
          const { content, isMentionSelf } = buildMentionMsg()
          postToActive(sender, content, isMentionSelf)
        } else {
          // DM: only send if the mock user matches the open DM user
          const sender = dmUsers.find(u => u.internalId === internalUserId)
          if (sender) {
            const { content, isMentionSelf } = buildMentionMsg()
            postToActive(sender, content, isMentionSelf)
          }
        }

      } else if (action < 0.50) {
        // ── Chat in a background channel (dot indicator / count badge) ─────
        const bgChans = channels.filter(c =>
          c.category === 'text' &&
          (!isDMRoute ? c.internalId !== selectedChannel?.internalId : true)
        )
        if (bgChans.length > 0) {
          const chan = pick(bgChans)
          const sender = pick(dmUsers)
          const { content, isMentionSelf } = buildMentionMsg()
          
          const msg: Message = {
            id: `mock-${Date.now()}-${Math.random()}`,
            userId: sender.internalId,
            userName: sender.name,
            content,
            timestamp: new Date(),
            reactions: {},
          }
          
          setMessagesByChannel(prev => ({
            ...prev,
            [chan.internalId]: [...(prev[chan.internalId] ?? []), msg]
          }))

          setChannelNotifications(prev => {
            const current = prev[chan.internalId] || { type: 'none', count: 0 }
            if (isMentionSelf) {
              return {
                ...prev,
                [chan.internalId]: { type: 'mention', count: current.count + 1 }
              }
            } else {
              return {
                ...prev,
                [chan.internalId]: {
                  type: current.type === 'mention' ? 'mention' : 'unread',
                  count: current.count
                }
              }
            }
          })
          fire(isMentionSelf, sender.name, getChannelDisplayName(chan.internalId, chan.displayName), content)
        }

      } else if (action < 0.62) {
        // ── DM in a background DM ─────────────────────────────────────────
        const bgUsers = dmUsers.filter(u => !isDMRoute || u.internalId !== internalUserId)
        if (bgUsers.length > 0) {
          const bgUser = pick(bgUsers)
          const { content } = buildMentionMsg()

          const msg: Message = {
            id: `mock-${Date.now()}-${Math.random()}`,
            userId: bgUser.internalId,
            userName: bgUser.name,
            content,
            timestamp: new Date(),
            reactions: {},
          }

          setMessagesByChannel(prev => ({
            ...prev,
            [bgUser.internalId]: [...(prev[bgUser.internalId] ?? []), msg]
          }))

          setChannelNotifications(prev => {
            const current = prev[bgUser.internalId] || { type: 'none', count: 0 }
            return {
              ...prev,
              [bgUser.internalId]: { type: 'mention', count: current.count + 1 }
            }
          })
          fire(true, bgUser.name, `DM: ${bgUser.name}`, content)
        }

      } else if (action < 0.72) {
        // ── Reaction on a recent message ──────────────────────────────────
        addReactionToRecent()

      } else {
        // ── VC event (38% of ticks → very active VC) ─────────────────────
        doVCEvent()
      }
    }

    // Stagger first tick so it doesn't fire immediately on mount
    const initialDelay = setTimeout(tick, 800 + Math.random() * 800)

    // Subsequent ticks every 1.5–3 seconds
    let intervalId: ReturnType<typeof setInterval>
    const startInterval = () => {
      intervalId = setInterval(() => {
        tick()
      }, 1500 + Math.random() * 1500)
    }
    const delayStart = setTimeout(startInterval, 800)

    return () => {
      clearTimeout(initialDelay)
      clearTimeout(delayStart)
      clearInterval(intervalId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDMRoute, internalUserId, selectedChannel?.internalId, fireIncomingNotification, addMember, removeMember])

  const handleDeleteMessage = useCallback((messageId: string) => {
    setMessagesByChannel(prev => {
      const pool = prev[currentChatId] ?? []
      const updatedPool = pool.filter(m => m.id !== messageId)
      return {
        ...prev,
        [currentChatId]: updatedPool
      }
    })
  }, [currentChatId])

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

    setMessagesByChannel(prev => ({
      ...prev,
      [currentChatId]: [...(prev[currentChatId] ?? []), newMessage]
    }))
    setInputValue('')
    setReplyingToMessage(null)
    setShowMentionSuggestions(false)
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

  const handleChannelClick = (channelInternalId: string) => {
    const channel = findChannelByInternalId(channelInternalId)
    if (!channel) return
    if (channel.category === 'vc') {
      if (isConnectedToVC) {
        if (connectedVCChannel?.internalId === channelInternalId) {
          // すでに接続済みのVCに戻った場合は、保留中の確認モーダルを閉じる
          closeVCModal()
          navigate(`/channels/vc/${channelInternalId}`)
          return
        }

        // 接続中に別VCへ移る場合も確認画面を出す
        requestJoinVC(channel)
        navigate(`/channels/vc/${channelInternalId}`)
        return
      }

      requestJoinVC(channel)
      navigate(`/channels/vc/${channelInternalId}`)
    } else {
      // テキストチャンネルをクリックした場合、VCモーダルを閉じる
      closeVCModal()
      navigate(`/channels/chat/${channelInternalId}`)
    }
  }

  const handleJoinVC = () => {
    if (pendingVCChannel) {
      if (connectedVCChannel && connectedVCChannel.internalId !== pendingVCChannel.internalId) {
        removeMember(connectedVCChannel.internalId, currentUser.internalId)
      }
      addMember(pendingVCChannel.internalId, currentUser.internalId)
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
    const previousVCChannel = connectedVCChannel
    if (connectedVCChannel) {
      removeMember(connectedVCChannel.internalId, currentUser.internalId)
    }
    playSound('disconnect')
    disconnectVC()
    setIsScreenSharing(false)
    if (previousVCChannel) {
      requestJoinVC(previousVCChannel)
      navigate(`/channels/vc/${previousVCChannel.internalId}`)
    } else {
      navigate(`/channels/chat/${channels[0].internalId}`)
    }
  }

  const handleCloseVCModal = () => {
    closeVCModal()
    navigate(`/channels/chat/${channels[0].internalId}`)
  }

  // VC名前変更ハンドラー
  const handleStartRenameVC = (channelInternalId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRenamingChannelId(channelInternalId)
    setRenameValue(currentName)
  }

  const handleConfirmRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (renamingChannelId && renameValue.trim()) {
      setChannelNames(prev => ({
        ...prev,
        [renamingChannelId]: renameValue.trim()
      }))
    }
    setRenamingChannelId(null)
    setRenameValue('')
  }

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRenamingChannelId(null)
    setRenameValue('')
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (renamingChannelId && renameValue.trim()) {
        setChannelNames(prev => ({
          ...prev,
          [renamingChannelId]: renameValue.trim()
        }))
      }
      setRenamingChannelId(null)
      setRenameValue('')
    } else if (e.key === 'Escape') {
      setRenamingChannelId(null)
      setRenameValue('')
    }
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

  const handleDMUserClick = (userInternalId: string) => {
    // DMは /channels/@me/<相手のinternalId> へ遷移
    navigate(`/channels/@me/${userInternalId}`)
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

    setMessagesByChannel(prev => {
      const pool = prev[currentChatId] ?? []
      const updatedPool = pool.map(message => {
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
      })

      return {
        ...prev,
        [currentChatId]: updatedPool
      }
    })

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

    setMessagesByChannel(prev => ({
      ...prev,
      [currentChatId]: [...(prev[currentChatId] ?? []), newMessage]
    }))
    setShowEmojiPicker(false)
    setEmojiPickerPosition(null)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      // Check if file type is allowed
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/zip', 'video/mp4', 'audio/mpeg']
      if (!allowedTypes.includes(file.type)) {
        console.warn(`File type not supported: ${file.type}`)
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        const newMessage: Message = {
          id: Date.now().toString(),
          userId: 'current-user',
          userName: 'aiueo aiueioo',
          content: '',
          timestamp: new Date(),
          reactions: {},
          file: {
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: dataUrl,
          },
        }
        setMessagesByChannel(prev => ({
          ...prev,
          [currentChatId]: [...(prev[currentChatId] ?? []), newMessage]
        }))
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setShowPlusMenu(false)
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
  const viewingMemberIds = viewingVCChannel ? (membersByChannelId[viewingVCChannel.internalId] ?? []) : []
  const currentUserInViewingVC = viewingMemberIds.includes(currentUser.internalId)
  const viewingOtherParticipants = dmUsers.filter(user => viewingMemberIds.includes(user.internalId))

  return (
    <div className={`chat-container ${(showUserProfile || (isDMRoute && internalUserId)) ? 'profile-open' : ''}`}>
      {/* DM Column */}
      <aside className="dm-sidebar">
        <div className="sidebar-header">
          <h2>DM</h2>
        </div>
        <ScrollArea className="sidebar-content">
          <div className="user-list">
             {sortedDmUsers.map((user) => (
              <button 
                key={user.internalId} 
                className={`user-item ${isDMRoute && internalUserId === user.internalId ? 'active' : ''} ${channelNotifications[user.internalId]?.type || ''}`}
                onClick={() => handleDMUserClick(user.internalId)}
                style={{ position: 'relative' }}
              >
                <Avatar className="user-avatar">
                  <AvatarImage src={getUserAvatar(user.internalId)} alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="user-details">
                  <span className="user-name">{user.name}</span>
                  <span className="user-status-sub">
                    {getUserStatusMessage(user.internalId)}
                  </span>
                </div>
                {channelNotifications[user.internalId]?.type === 'unread' && (
                  <span className="channel-notification-unread" />
                )}
                {channelNotifications[user.internalId]?.type === 'mention' && (
                  <span className="channel-notification-mention">
                    {channelNotifications[user.internalId]?.count || 0}
                  </span>
                )}
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
                  key={channel.internalId}
                  className={`channel-item ${(!isDMRoute && selectedChannel.internalId === channel.internalId) ? 'active' : ''} ${channelNotifications[channel.internalId]?.type || ''}`}
                  onClick={() => handleChannelClick(channel.internalId)}
                  style={{ position: 'relative' }}
                >
                  {channel.id === 'rule' ? (
                    <BookOpen size={16} className="channel-icon" />
                  ) : channel.id === 'jarujaru' ? (
                    <img src={jaruImage} alt="jaru" className="channel-icon-image" />
                  ) : (
                    <Hash size={16} className="channel-icon" />
                  )}
                  <span className="channel-path">{channel.displayName}</span>
                  {channelNotifications[channel.internalId]?.type === 'unread' && (
                    <span className="channel-notification-unread" />
                  )}
                  {channelNotifications[channel.internalId]?.type === 'mention' && (
                    <span className="channel-notification-mention">
                      {channelNotifications[channel.internalId]?.count || 0}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="channel-section">
            <h3 className="channel-category-title">ボイスチャンネル</h3>
            <nav className="channel-list">
              {vcChannels.map((channel) => (
                <div key={channel.internalId} className="vc-channel-wrapper">
                  <div className="vc-channel-header-row" style={{ position: 'relative' }}>
                    <button
                      className={`channel-item ${(!isDMRoute && selectedChannel.internalId === channel.internalId) ? 'active' : ''} ${channelNotifications[channel.internalId]?.type || ''}`}
                      onClick={() => handleChannelClick(channel.internalId)}
                    >
                      <Volume2 size={16} className="channel-icon" />
                      {renamingChannelId === channel.internalId ? (
                        <input
                          type="text"
                          className="vc-rename-input"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={handleRenameKeyDown}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      ) : (
                        <span className="channel-path">{getChannelDisplayName(channel.internalId, channel.displayName)}</span>
                      )}
                    </button>
                    {channelNotifications[channel.internalId]?.type === 'unread' && (
                      <span className="channel-notification-unread" style={{ right: renamingChannelId === channel.internalId ? '50px' : '30px' }} />
                    )}
                    {channelNotifications[channel.internalId]?.type === 'mention' && (
                      <span className="channel-notification-mention" style={{ right: renamingChannelId === channel.internalId ? '58px' : '38px' }}>
                        {channelNotifications[channel.internalId]?.count || 0}
                      </span>
                    )}
                    {renamingChannelId === channel.internalId ? (
                      <div className="vc-rename-actions">
                        <button className="vc-rename-action-btn vc-rename-confirm" onClick={handleConfirmRename} title="確定">
                          <Check size={14} />
                        </button>
                        <button className="vc-rename-action-btn vc-rename-cancel" onClick={handleCancelRename} title="キャンセル">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        className="vc-rename-btn"
                        onClick={(e) => handleStartRenameVC(channel.internalId, getChannelDisplayName(channel.internalId, channel.displayName), e)}
                        title="名前を変える"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                  {(membersByChannelId[channel.internalId] ?? []).length > 0 && (
                    <div className="vc-participants">
                      {(membersByChannelId[channel.internalId] ?? []).map((userInternalId) => {
                        const user = dmUsers.find(u => u.internalId === userInternalId) || (userInternalId === currentUser.internalId ? currentUser : null)
                        return user ? (
                          <div key={userInternalId} className="vc-participant">
                            <Avatar className="vc-participant-avatar">
                              <AvatarImage src={getUserAvatar(userInternalId)} alt={user.name} />
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
                <h1>{getChannelDisplayName(selectedChannel.internalId, selectedChannel.displayName)}</h1>
              </>
            )}
          </div>
        </header>

        {!isDMRoute && showVCModal && pendingVCChannel ? (
          <div className="vc-join-container">
            <VCJoinModal
              channelName={getChannelDisplayName(pendingVCChannel.internalId, pendingVCChannel.displayName)}
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
              channelName={getChannelDisplayName(viewingVCChannel.internalId, viewingVCChannel.displayName)}
              participants={viewingOtherParticipants}
              currentUser={currentUser}
              currentUserInChannel={currentUserInViewingVC}
              isMicOn={isMicOn}
              isSpeakerOn={isSpeakerOn}
              isScreenSharing={isScreenSharing}
              isParticipantScreenSharing={participantScreenSharing}
              mutedUsers={mutedUsers}
              speakingUsers={speakingUsers}
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
                    const isMentioned = message.content.includes(`<@${CURRENT_USER_INTERNAL_ID}>`);

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
                          className={`message ${isConsecutive ? 'consecutive' : ''} ${isMentioned ? 'mentioned' : ''}`}
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
                                file={message.file}
                                onImageClick={setSelectedImageUrl}
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
                                        setMessagesByChannel(prev => {
                                          const pool = prev[currentChatId] ?? []
                                          const updatedPool = pool.map(m => {
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
                                          })
                                          return {
                                            ...prev,
                                            [currentChatId]: updatedPool
                                          }
                                        })
                                      }}
                                      title={hasReacted ? 'リアクションを削除' : 'リアクションを追加'}
                                    >
                                      <span className="reaction-emoji">{emoji}</span>
                                      <span className="reaction-count">{safeUserIds.length}</span>
                                    </button>
                                  )
                                })}
                                {/* +マークのボタン */}
                                <button
                                  type="button"
                                  className="reaction-pill reaction-add-pill"
                                  onClick={(e) => handleMessageEmojiClick(message.id, e)}
                                  title="リアクションを追加"
                                >
                                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#5865f2' }}>+</span>
                                </button>
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
                            {/* 削除ボタン（「その他」の代わりに一番右に配置） */}
                            {(message.userId === 'current-user' || message.userId === CURRENT_USER_INTERNAL_ID) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="message-action-button message-action-delete"
                                title="メッセージを削除"
                                onClick={() => handleDeleteMessage(message.id)}
                              >
                                <Trash2 size={18} />
                              </Button>
                            )}
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
            <div className="input-wrapper" style={{ position: 'relative' }}>
              {showMentionSuggestions && filteredUsers.length > 0 && (
                <div className="mention-suggestions" ref={mentionSuggestionsRef}>
                  {filteredUsers.map((user, idx) => (
                    <button
                      key={user.internalId}
                      type="button"
                      className={`mention-suggestion-item ${idx === activeMentionIndex ? 'selected' : ''}`}
                      onClick={() => handleSelectMention(user)}
                    >
                      <Avatar className="mention-suggestion-avatar">
                        <AvatarImage src={getUserAvatar(user.internalId)} alt={user.name} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <span className="mention-suggestion-name">{user.name}</span>
                      <span className="mention-suggestion-id">{user.internalId}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="plus-menu-container" ref={plusMenuRef}>
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
                    <button 
                      className="plus-menu-item"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={16} />
                      <span>ファイルをアップロード</span>
                    </button>
                    <button className="plus-menu-item plus-menu-item--disabled">
                      <span>📊</span>
                      <span>投票の作成</span>
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.zip,video/mp4,audio/mpeg"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
              <Input
                ref={inputRef}
                type="text"
                className="message-input"
                placeholder={`${isDMRoute ? dmDisplayName : selectedChannel.displayName} にメッセージを送信`}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
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
            channelName={getChannelDisplayName(connectedVCChannel.internalId, connectedVCChannel.displayName)}
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
              onClick={() => setShowSettingsModal(true)}
              title="Settings"
            >
              <Settings size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* User Profile Panel */}
      {showUserProfile && selectedUserId ? (
        <UserProfile
          userId={selectedUserId}
          userName={selectedUserId === 'current-user' ? userDisplayName : dmUsers.find(u => u.internalId === selectedUserId)?.name || 'User'}
          status={getUserStatusMessage(selectedUserId)}
          bio={selectedUserId === 'current-user' ? userBio : 'よろしくお願いします！'}
          onClose={handleCloseProfile}
          isCurrentUser={selectedUserId === 'current-user'}
          avatarSrc={getUserAvatar(selectedUserId)}
        />
      ) : isDMRoute && internalUserId ? (
        <UserProfile
          userId={internalUserId}
          userName={dmUser?.name || 'User'}
          status={getUserStatusMessage(internalUserId)}
          bio={internalUserId === currentUser.internalId ? userBio : 'よろしくお願いします！'}
          onClose={handleCloseProfile}
          isCurrentUser={internalUserId === currentUser.internalId}
          avatarSrc={getUserAvatar(internalUserId)}
          hideCloseButton={true}
        />
      ) : null}

      {/* Image Modal */}
      {selectedImageUrl && (
        <div 
          className="image-modal-overlay"
          onClick={() => setSelectedImageUrl(null)}
        >
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="image-modal-close"
              onClick={() => setSelectedImageUrl(null)}
            >
              ✕
            </button>
            <img src={selectedImageUrl} alt="Expanded view" className="image-modal-image" />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div 
          className="settings-modal-overlay"
          onClick={() => setShowSettingsModal(false)}
        >
          <div className="settings-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="settings-sidebar">
              <h2 className="settings-sidebar-title">設定</h2>
              <div className="settings-nav">
                <button 
                  className={`settings-nav-item ${settingsTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('profile')}
                >
                  プロフィール
                </button>
                <button 
                  className={`settings-nav-item ${settingsTab === 'account' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('account')}
                >
                  アカウント
                </button>
                <button 
                  className={`settings-nav-item ${settingsTab === 'voice' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('voice')}
                >
                  音声とビデオ
                </button>
                <button 
                  className={`settings-nav-item ${settingsTab === 'notifications' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('notifications')}
                >
                  通知
                </button>
              </div>
            </div>

            <div className="settings-main">
              <button 
                className="settings-modal-close"
                onClick={() => setShowSettingsModal(false)}
              >
                ✕
              </button>

              {settingsTab === 'profile' && (
                <div className="settings-content">
                  <div className="settings-profile-header">
                    <div className="settings-profile-banner">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="settings-file-input"
                        id="banner-upload"
                      />
                      <label htmlFor="banner-upload" className="settings-banner-upload">
                        <div className="settings-banner-overlay">
                          <span>クリックで画像を選択</span>
                        </div>
                      </label>
                    </div>

                    <div className="settings-profile-avatar-wrapper">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="settings-file-input"
                        id="avatar-upload"
                      />
                      <label htmlFor="avatar-upload" className="settings-avatar-upload">
                        <img 
                          src={getUserAvatar(currentUser.id)} 
                          alt="Profile" 
                          className="settings-avatar-image"
                        />
                        <div className="settings-avatar-overlay">
                          <span>変更</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="settings-form">
                    <div className="settings-item">
                      <label className="settings-label">表示名</label>
                      <input 
                        type="text" 
                        className="settings-input" 
                        value={userDisplayName}
                        onChange={(e) => setUserDisplayName(e.target.value)}
                        placeholder="表示名を入力"
                      />
                    </div>

                    <div className="settings-item">
                      <label className="settings-label">ステータス</label>
                      <input 
                        type="text" 
                        className="settings-input" 
                        value={userStatusMessage}
                        onChange={(e) => setUserStatusMessage(e.target.value)}
                        placeholder="ステータスメッセージ"
                      />
                    </div>

                    <div className="settings-item">
                      <label className="settings-label">自己紹介</label>
                      <textarea 
                        className="settings-textarea" 
                        rows={4}
                        value={userBio}
                        onChange={(e) => setUserBio(e.target.value)}
                        placeholder="自己紹介を入力してください"
                      />
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'account' && (
                <div className="settings-content">
                  <h2 className="settings-content-title">アカウント設定</h2>
                  
                  <div className="settings-form">
                    <div className="settings-item">
                      <label className="settings-label">ユーザーID <span className="settings-label-hint">変更不可</span></label>
                      <input 
                        type="text" 
                        className="settings-input" 
                        defaultValue="user_4cd9001d"
                        disabled
                      />
                    </div>

                    <div className="settings-item">
                      <label className="settings-label">パスワード</label>
                      <button className="settings-button-secondary">
                        パスワードを変更
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'voice' && (
                <div className="settings-content">
                  <h2 className="settings-content-title">音声とビデオ</h2>
                  
                  <div className="settings-form">
                    <div className="settings-item">
                      <label className="settings-label">入力デバイス</label>
                      <select className="settings-select">
                        <option>デフォルト</option>
                        <option>マイク 1</option>
                        <option>マイク 2</option>
                      </select>
                    </div>

                    <div className="settings-item">
                      <label className="settings-label">出力デバイス</label>
                      <select className="settings-select">
                        <option>デフォルト</option>
                        <option>スピーカー 1</option>
                        <option>スピーカー 2</option>
                      </select>
                    </div>

                    <div className="settings-item">
                      <label className="settings-label">入力音量</label>
                      <input 
                        type="range" 
                        className="settings-slider" 
                        min="0" 
                        max="100" 
                        defaultValue="80"
                      />
                    </div>

                    <div className="settings-item">
                      <label className="settings-label">出力音量</label>
                      <input 
                        type="range" 
                        className="settings-slider" 
                        min="0" 
                        max="100" 
                        defaultValue="80"
                      />
                    </div>

                    <div className="settings-item">
                      <button className="settings-button-primary">
                        申請リクエストを送信
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'notifications' && (
                <div className="settings-content">
                  <h2 className="settings-content-title">通知設定</h2>

                  <div className="settings-form">
                    <p className="settings-section-hint">ブラウザがバックグラウンドのときに通知を受け取る設定です。</p>

                    <div className="settings-item settings-toggle-item">
                      <div className="settings-toggle-info">
                        <span className="settings-toggle-title">デスクトップ通知を有効にする</span>
                        <span className="settings-toggle-desc">メンションされたときのみ、ブラウザ通知が届きます</span>
                      </div>
                      <button
                        id="toggle-desktop-notif"
                        className={`settings-toggle-switch ${enableDesktopNotifications ? 'on' : ''}`}
                        onClick={() => {
                          const next = !enableDesktopNotifications
                          setEnableDesktopNotifications(next)
                          if (next && Notification.permission === 'denied') {
                            alert('ブラウザの設定で通知がブロックされています。ブラウザの設定から通知を許可してください。')
                          } else if (next && Notification.permission === 'default') {
                            Notification.requestPermission()
                          }
                        }}
                        aria-checked={enableDesktopNotifications}
                        role="switch"
                      >
                        <span className="settings-toggle-knob" />
                      </button>
                    </div>

                    <div className="settings-item settings-toggle-item">
                      <div className="settings-toggle-info">
                        <span className="settings-toggle-title">音通知を有効にする</span>
                        <span className="settings-toggle-desc">メッセージを受け取ったときに通知音が鳴ります</span>
                      </div>
                      <button
                        id="toggle-sound-notif"
                        className={`settings-toggle-switch ${enableSoundNotifications ? 'on' : ''}`}
                        onClick={() => setEnableSoundNotifications(prev => !prev)}
                        aria-checked={enableSoundNotifications}
                        role="switch"
                      >
                        <span className="settings-toggle-knob" />
                      </button>
                    </div>

                    {enableDesktopNotifications && Notification.permission === 'granted' && (
                      <div className="settings-notif-status ok">
                        ✓ デスクトップ通知が有効になっています
                      </div>
                    )}
                    {enableDesktopNotifications && Notification.permission === 'denied' && (
                      <div className="settings-notif-status error">
                        ✕ 通知がブロックされています。ブラウザの設定を確認してください。
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="settings-footer">
                <button 
                  className="settings-cancel-button"
                  onClick={() => setShowSettingsModal(false)}
                >
                  キャンセル
                </button>
                <button 
                  className="settings-save-button"
                  onClick={() => setShowSettingsModal(false)}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

