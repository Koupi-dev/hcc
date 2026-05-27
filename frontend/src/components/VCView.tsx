import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Volume, VolumeX } from 'lucide-react'

type User = {
  id: string
  name: string
  status: 'online' | 'offline'
}

interface VCViewProps {
  channelName: string
  participants: User[]
  currentUser: User
  isMicOn: boolean
  isSpeakerOn: boolean
  onToggleMic: () => void
  onToggleSpeaker: () => void
  getInitials: (name: string) => string
  getUserAvatar: (userId: string) => string
}

export default function VCView({
  channelName,
  participants,
  currentUser,
  isMicOn,
  isSpeakerOn,
  onToggleMic,
  onToggleSpeaker,
  getInitials,
  getUserAvatar
}: VCViewProps) {
  // 現在のユーザーを含む全参加者
  const allParticipants = [currentUser, ...participants]

  return (
    <div className="vc-view">
      <div className="vc-view-content">
        {/* 参加者グリッド */}
        <div className="vc-participants-grid">
          {allParticipants.map((user) => (
            <div key={user.id} className="vc-participant-card">
              <div className="vc-participant-video">
                <Avatar className="vc-participant-large-avatar">
                  <AvatarImage src={getUserAvatar(user.id)} alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                {/* マイクミュート表示 */}
                {user.id === currentUser.id && !isMicOn && (
                  <div className="vc-mute-indicator">
                    <MicOff size={16} />
                  </div>
                )}
              </div>
              <div className="vc-participant-name">{user.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 下部コントロール */}
      <div className="vc-controls">
        <div className="vc-controls-left">
          <span className="vc-channel-name">{channelName}</span>
        </div>
        <div className="vc-controls-center">
          <Button
            size="icon"
            variant="ghost"
            className={`vc-control-button ${!isMicOn ? 'muted' : ''}`}
            onClick={onToggleMic}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={`vc-control-button ${!isSpeakerOn ? 'muted' : ''}`}
            onClick={onToggleSpeaker}
          >
            {isSpeakerOn ? <Volume size={20} /> : <VolumeX size={20} />}
          </Button>
        </div>
        <div className="vc-controls-right">
          {/* 空のスペース */}
        </div>
      </div>
    </div>
  )
}