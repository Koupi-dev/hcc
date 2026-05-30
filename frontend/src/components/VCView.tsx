import { useState, useEffect, useRef, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import './VCView.css'
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Volume, VolumeX, PhoneOff, Monitor, MonitorOff, Maximize, Minimize, Users, ChevronLeft, ChevronRight } from 'lucide-react'

type User = {
  id: string
  name: string
  status: 'online' | 'offline'
  internalId?: string
}

interface VCViewProps {
  channelName: string
  participants: User[]
  currentUser: User
  currentUserInChannel: boolean
  isMicOn: boolean
  isSpeakerOn: boolean
  isScreenSharing: boolean
  isParticipantScreenSharing?: Record<string, boolean>
  mutedUsers?: Set<string>
  speakingUsers?: Set<string>
  remoteStreams?: Record<string, MediaStream>
  localScreenStream?: MediaStream | null
  userSocketIds?: Record<string, string>
  onToggleMic: () => void
  onToggleSpeaker: () => void
  onToggleScreenShare: () => void
  onDisconnect: () => void
  getInitials: (name: string) => string
  getUserAvatar: (userId: string) => string
}

// SE 生成関数 (以前のシンプルなピュアサイン音のよさを活かしつつ、間の音を追加して滑らかにしたバージョン)
const playSound = (type: 'toggle' | 'connect' | 'disconnect' | 'screenShareOn' | 'screenShareOff' | 'micOn' | 'micOff' | 'speakerOn' | 'speakerOff') => {
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
    }
  } catch (error) {
    console.error('SE 再生エラー:', error)
  }
}

export default function VCView({
  channelName,
  participants,
  currentUser,
  currentUserInChannel,
  isMicOn,
  isSpeakerOn,
  isScreenSharing,
  isParticipantScreenSharing = {},
  mutedUsers = new Set(),
  speakingUsers = new Set(),
  remoteStreams = {},
  localScreenStream = null,
  userSocketIds = {},
  onToggleMic,
  onToggleSpeaker,
  onToggleScreenShare,
  onDisconnect,
  getInitials,
  getUserAvatar
}: VCViewProps) {

  const [selectedScreenShareUserIndex, setSelectedScreenShareUserIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showParticipantList, setShowParticipantList] = useState(true)
  const [contextMenu, setContextMenu] = useState<{ userId: string; x: number; y: number } | null>(null)
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>({})
  const videoRef = useRef<HTMLVideoElement>(null)
  const screenShareContainerRef = useRef<HTMLDivElement>(null)


  // 参加者リスト（自分を含む）
  const allParticipants = currentUserInChannel ? [currentUser, ...participants] : participants
  const participantCount = allParticipants.length

  // 画面共有ユーザーの取得
  const screenSharingUsers = Object.entries(isParticipantScreenSharing)
    .filter(([, isSharing]) => isSharing)
    .map(([userId]) => userId)
  
  const allSharingUsers = isScreenSharing 
    ? [currentUser.id, ...screenSharingUsers.filter(id => id !== currentUser.id)]
    : screenSharingUsers

  // 画面共有ユーザーが変わったらインデックスをリセット
  useEffect(() => {
    setSelectedScreenShareUserIndex(0)
  }, [allSharingUsers.join(',')])

  // 現在表示する画面共有ユーザーを決定
  const activeScreenShareUserId = allSharingUsers[selectedScreenShareUserIndex] || null
  const screenSharingUserData = activeScreenShareUserId === currentUser.id 
    ? currentUser 
    : participants.find(p => p.id === activeScreenShareUserId) || null

  const hasScreenShare = allSharingUsers.length > 0 && screenSharingUserData

  // 画面共有の開始
  // Local screen share video stream assignment
  useEffect(() => {
    if (activeScreenShareUserId === currentUser.id && isScreenSharing && localScreenStream && videoRef.current) {
      if (videoRef.current.srcObject !== localScreenStream) {
        videoRef.current.srcObject = localScreenStream
      }
    }
  }, [activeScreenShareUserId, currentUser.id, isScreenSharing, localScreenStream])

  // フルスクリーン切替
  const toggleFullscreen = useCallback(() => {
    if (!screenShareContainerRef.current) return
    
    if (!document.fullscreenElement) {
      screenShareContainerRef.current.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  // フルスクリーン状態の監視
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // コンテキストメニューを閉じる
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    const handleScroll = () => setContextMenu(null)
    
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      document.addEventListener('scroll', handleScroll, true)
      return () => {
        document.removeEventListener('click', handleClick)
        document.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [contextMenu])

  // 右クリックハンドラー
  const handleContextMenu = (e: React.MouseEvent, userId: string) => {
    e.preventDefault()
    const menuWidth = 220 // コンテキストメニューの幅
    const menuHeight = 120 // コンテキストメニューの高さ（概算）
    
    // 左側に表示（画面左端に近い場合は右側に）
    let x = e.clientX - menuWidth - 10
    if (x < 10) {
      x = e.clientX + 10
    }
    
    // 画面下端を超える場合は上に調整
    let y = e.clientY
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10
    }
    
    setContextMenu({
      userId,
      x,
      y
    })
  }

  // 音量変更ハンドラー
  const handleVolumeChange = (userId: string, volume: number) => {
    setUserVolumes(prev => ({
      ...prev,
      [userId]: volume
    }))
    // ここで実際の音量調整処理を行う
    // 例: WebRTC の audio track の volume を調整
  }

  // ユーザーの音量を取得（デフォルトは100%）
  const getUserVolume = (userId: string) => {
    return userVolumes[userId] ?? 100
  }

  // 参加人数に応じてサイズクラスを決定
  const getSizeClass = () => {
    if (participantCount === 1) return 'vc-size-1'
    if (participantCount === 2) return 'vc-size-2'
    if (participantCount <= 4) return 'vc-size-3-4'
    if (participantCount <= 6) return 'vc-size-5-6'
    if (participantCount <= 9) return 'vc-size-7-9'
    return 'vc-size-many'
  }

  // 参加者タイルの描画
  const renderParticipantTile = (user: User, variant: 'grid' | 'list') => {
    const isSelf = user.id === currentUser.id
    const isMuted = isSelf ? !isMicOn : mutedUsers.has(user.internalId || user.id)
    const isSpeaking = isSelf ? isMicOn && !mutedUsers.has(user.internalId || user.id) && Math.random() < 0.3 : speakingUsers.has(user.internalId || user.id)
    const isUserScreenSharing = allSharingUsers.includes(user.internalId || user.id)

    return (
      <div 
        key={user.id} 
        className={`vc-tile vc-tile--${variant} ${isSelf ? 'vc-tile--self' : ''} ${isSpeaking ? 'vc-tile--speaking' : ''}`}
        onContextMenu={(e) => handleContextMenu(e, user.id)}
      >
        <div className="vc-tile__video-area">
          <Avatar className="vc-tile__avatar">
            <AvatarImage src={getUserAvatar(user.internalId || user.id)} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </div>

        <div className="vc-tile__info">
          <span className="vc-tile__name">{user.name}{isSelf && ' (自分)'}</span>
          <div className="vc-tile__badges">
            {isMuted && (
              <span className="vc-tile__badge vc-tile__badge--muted" title="ミュート中">
                <MicOff size={12} />
              </span>
            )}
            {!isMuted && isSpeaking && (
              <span className="vc-tile__badge vc-tile__badge--speaking" title="発話中">
                <Mic size={12} />
              </span>
            )}
            {isUserScreenSharing && (
              <span className="vc-tile__badge vc-tile__badge--sharing" title="画面共有中">
                <Monitor size={12} />
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 画面共有タブの前後ボタン
  const handlePrevScreenShare = () => {
    setSelectedScreenShareUserIndex(prev => 
      prev === 0 ? allSharingUsers.length - 1 : prev - 1
    )
  }

  const handleNextScreenShare = () => {
    setSelectedScreenShareUserIndex(prev => 
      prev === allSharingUsers.length - 1 ? 0 : prev + 1
    )
  }

  return (
    <div className={`vc-view ${hasScreenShare ? 'vc-view--screen-share-mode' : ''}`}>
      <div className="vc-view__main">
        {hasScreenShare ? (
          /* ────── 画面共有モード ────── */
          <div className="vc-screenshare-layout">
            {/* メイン画面共有エリア */}
            <div className="vc-screenshare__content" ref={screenShareContainerRef}>
              {/* 複数の画面共有者がいる場合のナビゲーション */}
              {allSharingUsers.length > 1 && (
                <div className="vc-screenshare__nav">
                  <button
                    className="vc-screenshare__nav-btn"
                    onClick={handlePrevScreenShare}
                    title="前の画面共有"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="vc-screenshare__nav-info">
                    <span className="vc-screenshare__nav-name">{screenSharingUserData?.name}</span>
                    <span className="vc-screenshare__nav-count">
                      {selectedScreenShareUserIndex + 1} / {allSharingUsers.length}
                    </span>
                  </div>
                  <button
                    className="vc-screenshare__nav-btn"
                    onClick={handleNextScreenShare}
                    title="次の画面共有"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {/* 画面共有映像 */}
              <div className="vc-screenshare__video-container">
                {activeScreenShareUserId === currentUser.id && isScreenSharing ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="vc-screenshare__video"
                  />
                ) : activeScreenShareUserId && userSocketIds[activeScreenShareUserId] && remoteStreams[userSocketIds[activeScreenShareUserId]] ? (
                  <video
                    autoPlay
                    playsInline
                    className="vc-screenshare__video"
                    ref={(el) => {
                      if (el && el.srcObject !== remoteStreams[userSocketIds[activeScreenShareUserId]]) {
                        el.srcObject = remoteStreams[userSocketIds[activeScreenShareUserId]]
                      }
                    }}
                  />
                ) : (
                  <div className="vc-screenshare__placeholder">
                    <div className="vc-screenshare__placeholder-icon">
                      <Monitor size={64} />
                    </div>
                    <div className="vc-screenshare__placeholder-label">
                      {screenSharingUserData?.name}の画面
                    </div>
                    <div className="vc-screenshare__placeholder-sub">
                      画面共有を視聴中...
                    </div>
                  </div>
                )}

                {/* オーバーレイコントロール */}
                <div className="vc-screenshare__overlay">
                  <div className="vc-screenshare__overlay-actions">
                    <button
                      className="vc-screenshare__overlay-btn"
                      onClick={() => setShowParticipantList(!showParticipantList)}
                      title={showParticipantList ? '参加者パネルを非表示' : '参加者パネルを表示'}
                    >
                      <Users size={16} />
                    </button>
                    <button
                      className="vc-screenshare__overlay-btn"
                      onClick={toggleFullscreen}
                      title={isFullscreen ? '全画面解除' : '全画面表示'}
                    >
                      {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* サイドパネル：参加者リスト */}
            {showParticipantList && (
              <div className="vc-screenshare__sidebar">
                <div className="vc-screenshare__sidebar-header">
                  <Users size={14} />
                  <span>参加者 ({participantCount})</span>
                </div>
                <div className="vc-screenshare__sidebar-tiles">
                  {allParticipants.map(user => renderParticipantTile(user, 'list'))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ────── 通常のタイルグリッド ────── */
          <div className={`vc-grid ${getSizeClass()}`}>
            {allParticipants.map(user => renderParticipantTile(user, 'grid'))}
          </div>
        )}
      </div>

      {/* ────── 下部コントロールバー ────── */}
      <div className="vc-controlbar">
        <div className="vc-controlbar__left">
          <span className="vc-controlbar__channel-name">{channelName}</span>
          <span className="vc-controlbar__participant-count">
            <Users size={14} />
            {participantCount}
          </span>
        </div>

        <div className="vc-controlbar__center">
          <Button
            size="icon"
            variant="ghost"
            className={`vc-controlbar__btn ${!isMicOn ? 'vc-controlbar__btn--danger' : ''}`}
            onClick={() => {
              playSound(isMicOn ? 'micOff' : 'micOn')
              onToggleMic()
            }}
            title={isMicOn ? 'ミュート' : 'ミュート解除'}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className={`vc-controlbar__btn ${!isSpeakerOn ? 'vc-controlbar__btn--danger' : ''}`}
            onClick={() => {
              playSound(isSpeakerOn ? 'speakerOff' : 'speakerOn')
              onToggleSpeaker()
            }}
            title={isSpeakerOn ? 'スピーカーをミュート' : 'スピーカーのミュート解除'}
          >
            {isSpeakerOn ? <Volume size={20} /> : <VolumeX size={20} />}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className={`vc-controlbar__btn ${isScreenSharing ? 'vc-controlbar__btn--active' : ''}`}
            onClick={() => {
              onToggleScreenShare()
            }}
            title={isScreenSharing ? '画面共有を停止' : '画面を共有'}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </Button>
        </div>

        <div className="vc-controlbar__right">
          <Button
            size="icon"
            variant="ghost"
            className="vc-controlbar__btn vc-controlbar__btn--disconnect"
            onClick={() => {
              playSound('disconnect')
              onDisconnect()
            }}
            title="切断"
          >
            <PhoneOff size={20} />
          </Button>
        </div>
      </div>

      {/* ────── コンテキストメニュー（音量調節） ────── */}
      {contextMenu && (
        <div
          className="vc-context-menu"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="vc-context-menu__header">
            {allParticipants.find(u => u.id === contextMenu.userId)?.name}
          </div>
          <div className="vc-context-menu__content">
            <div className="vc-context-menu__label">
              <Volume size={14} />
              <span>音量</span>
              <span className="vc-context-menu__value">{getUserVolume(contextMenu.userId)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={getUserVolume(contextMenu.userId)}
              onChange={(e) => handleVolumeChange(contextMenu.userId, Number(e.target.value))}
              className="vc-context-menu__slider"
            />
          </div>
        </div>
      )}
    </div>
  )
}
