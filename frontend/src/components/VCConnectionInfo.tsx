import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { PhoneOff, Volume2 } from 'lucide-react'

interface VCConnectionInfoProps {
  channelName: string
  onDisconnect: () => void
}

export default function VCConnectionInfo({ channelName, onDisconnect }: VCConnectionInfoProps) {
  const [connectionTime, setConnectionTime] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="vc-connection-info">
      <div className="vc-connection-header">
        <Volume2 size={16} className="vc-connection-icon" />
        <div className="vc-connection-details">
          <span className="vc-connection-label">ボイスチャンネル接続中</span>
          <span className="vc-connection-channel">{channelName}</span>
        </div>
      </div>
      <div className="vc-connection-time">{formatTime(connectionTime)}</div>
      <Button
        size="icon"
        variant="ghost"
        className="vc-disconnect-button"
        onClick={onDisconnect}
        title="切断"
      >
        <PhoneOff size={18} />
      </Button>
    </div>
  )
}
