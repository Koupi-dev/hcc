import { useState, useEffect, useRef, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import './VCView.css'
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Volume, VolumeX, PhoneOff, Monitor, MonitorOff, Maximize, Minimize, Users, ChevronLeft, ChevronRight } from 'lucide-react'

type User = {
  id: string
  name: string
  status: 'online' | 'offline'
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
  onToggleMic: () => void
  onToggleSpeaker: () => void
  onToggleScreenShare: () => void
  onDisconnect: () => void
  getInitials: (name: string) => string
  getUserAvatar: (userId: string) => string
}

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
      // 画面共有ON: てれれれれれん (上昇する5音)
      const frequencies = [523.25, 587.33, 659.25, 783.99, 987.77] // C5, D5, E5, G5, B5
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
      // 画面共有OFF: てれれれれれん (下降する5音)
      const frequencies = [987.77, 783.99, 659.25, 587.33, 523.25] // B5, G5, E5, D5, C5
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

export default function VCView({
  channelName,
  participants,
  currentUser,
  currentUserInChannel,
  isMicOn,
  isSpeakerOn,
  isScreenSharing,
  isParticipantScreenSharing = {},
  onToggleMic,
  onToggleSpeaker,
  onToggleScreenShare,
  onDisconnect,
  getInitials,
  getUserAvatar
}: VCViewProps) {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [selectedScreenShareUserIndex, setSelectedScreenShareUserIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showParticipantList, setShowParticipantList] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const screenShareContainerRef = useRef<HTMLDivElement>(null)
  const isRequestingScreenShare = useRef(false)

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
  useEffect(() => {
    if (!isScreenSharing) {
      return
    }

    if (screenStream) {
      // すでに画面共有中
      return
    }

    if (isRequestingScreenShare.current) {
      // リクエスト中
      return
    }

    isRequestingScreenShare.current = true

    const startScreenShare = async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as MediaTrackConstraints,
          audio: false,
        })

        setScreenStream(stream)

        // ビデオトラック終了時の処理
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          const handleTrackEnded = () => {
            setScreenStream(null)
            onToggleScreenShare()
          }
          videoTrack.addEventListener('ended', handleTrackEnded)
        }
      } catch (error) {
        console.error('画面共有に失敗しました:', error)
        isRequestingScreenShare.current = false
        onToggleScreenShare()
      }
    }

    startScreenShare()
  }, [isScreenSharing, screenStream, onToggleScreenShare])

  // ビデオ要素にストリームを設定
  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream
      // 画面共有が実際に開始されたときに音を再生
      playSound('screenShareOn')
    }
  }, [screenStream])

  // 画面共有の停止
  useEffect(() => {
    if (isScreenSharing || !screenStream) {
      return
    }

    // 画面共有を停止
    playSound('screenShareOff')
    screenStream.getTracks().forEach(track => track.stop())
    setScreenStream(null)
    isRequestingScreenShare.current = false
  }, [isScreenSharing, screenStream])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

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
    const isMuted = isSelf ? !isMicOn : false
    const isUserScreenSharing = allSharingUsers.includes(user.id)

    return (
      <div 
        key={user.id} 
        className={`vc-tile vc-tile--${variant} ${isSelf ? 'vc-tile--self' : ''}`}
      >
        <div className="vc-tile__video-area">
          <Avatar className="vc-tile__avatar">
            <AvatarImage src={getUserAvatar(user.id)} alt={user.name} />
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
    </div>
  )
}
