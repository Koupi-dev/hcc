import { Button } from "@/components/ui/button"
import { Mic, MicOff, Volume, VolumeX } from 'lucide-react'

interface VCJoinModalProps {
  channelName: string
  isMicOn: boolean
  isSpeakerOn: boolean
  onToggleMic: () => void
  onToggleSpeaker: () => void
  onJoin: () => void
  onClose: () => void
  isInline?: boolean
}

export default function VCJoinModal({
  channelName,
  isMicOn,
  isSpeakerOn,
  onToggleMic,
  onToggleSpeaker,
  onJoin,
  onClose,
  isInline = false
}: VCJoinModalProps) {
  if (isInline) {
    return (
      <div className="vc-join-inline">
        <h2 className="vc-join-title">{channelName}</h2>
        <p className="vc-join-description">
          マイク・スピーカーが正しく設定されているかを確認してから参加しましょう。マイクが無い場合も自由に参加できます。
        </p>
        <div className="vc-join-controls">
          <Button
            size="icon"
            variant="ghost"
            className={`vc-join-control-button ${!isMicOn ? 'muted' : ''}`}
            onClick={onToggleMic}
            title={isMicOn ? 'Mute' : 'Unmute'}
          >
            {isMicOn ? <Mic size={32} /> : <MicOff size={32} />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={`vc-join-control-button ${!isSpeakerOn ? 'muted' : ''}`}
            onClick={onToggleSpeaker}
            title={isSpeakerOn ? 'Deafen' : 'Undeafen'}
          >
            {isSpeakerOn ? <Volume size={32} /> : <VolumeX size={32} />}
          </Button>
        </div>
        <Button className="vc-join-button" onClick={onJoin}>
          準備OK!
        </Button>
      </div>
    )
  }

  return (
    <div className="vc-modal-overlay" onClick={onClose}>
      <div className="vc-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="vc-modal-title">{channelName}</h2>
        <p className="vc-modal-description">
          マイク・スピーカーが正しく設定されているかを確認してから参加しましょう。マイクが無い場合も自由に参加できます。
        </p>
        <div className="vc-modal-controls">
          <Button
            size="icon"
            variant="ghost"
            className={`vc-modal-control-button ${!isMicOn ? 'muted' : ''}`}
            onClick={onToggleMic}
            title={isMicOn ? 'Mute' : 'Unmute'}
          >
            {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={`vc-modal-control-button ${!isSpeakerOn ? 'muted' : ''}`}
            onClick={onToggleSpeaker}
            title={isSpeakerOn ? 'Deafen' : 'Undeafen'}
          >
            {isSpeakerOn ? <Volume size={24} /> : <VolumeX size={24} />}
          </Button>
        </div>
        <Button className="vc-modal-join-button" onClick={onJoin}>
          準備OK!
        </Button>
      </div>
    </div>
  )
}
