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
          マイク・スピーカーの設定を確認してから参加してください
        </p>
        <div className="vc-join-controls">
          <button
            className={`vc-join-control-button ${isMicOn ? 'active' : 'inactive'}`}
            onClick={onToggleMic}
            title={isMicOn ? 'ミュート' : 'ミュート解除'}
          >
            {isMicOn ? <Mic size={32} /> : <MicOff size={32} />}
          </button>
          <button
            className={`vc-join-control-button ${isSpeakerOn ? 'active' : 'inactive'}`}
            onClick={onToggleSpeaker}
            title={isSpeakerOn ? 'スピーカーをミュート' : 'スピーカーのミュート解除'}
          >
            {isSpeakerOn ? <Volume size={32} /> : <VolumeX size={32} />}
          </button>
        </div>
        <button className="vc-join-button" onClick={onJoin}>
          参加する
        </button>
      </div>
    )
  }

  return (
    <div className="vc-modal-overlay" onClick={onClose}>
      <div className="vc-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="vc-modal-title">{channelName}</h2>
        <p className="vc-modal-description">
          マイク・スピーカーの設定を確認してから参加してください
        </p>
        <div className="vc-modal-controls">
          <button
            className={`vc-modal-control-button ${isMicOn ? 'active' : 'inactive'}`}
            onClick={onToggleMic}
            title={isMicOn ? 'ミュート' : 'ミュート解除'}
          >
            {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          <button
            className={`vc-modal-control-button ${isSpeakerOn ? 'active' : 'inactive'}`}
            onClick={onToggleSpeaker}
            title={isSpeakerOn ? 'スピーカーをミュート' : 'スピーカーのミュート解除'}
          >
            {isSpeakerOn ? <Volume size={24} /> : <VolumeX size={24} />}
          </button>
        </div>
        <button className="vc-modal-join-button" onClick={onJoin}>
          参加する
        </button>
      </div>
    </div>
  )
}
