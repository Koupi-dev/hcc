import { useState } from 'react'
import type { Channel } from '@/types/chat'

export function useVoiceChannel() {
  const [isConnectedToVC, setIsConnectedToVC] = useState(false)
  const [connectedVCChannel, setConnectedVCChannel] = useState<Channel | null>(null)
  const [showVCModal, setShowVCModal] = useState(false)
  const [pendingVCChannel, setPendingVCChannel] = useState<Channel | null>(null)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)

  // VC参加のリクエスト（モーダルを表示）
  const requestJoinVC = (channel: Channel) => {
    setPendingVCChannel(channel)
    setShowVCModal(true)
  }

  // VC参加を確定
  const joinVC = () => {
    if (pendingVCChannel) {
      setIsConnectedToVC(true)
      setConnectedVCChannel(pendingVCChannel)
      setShowVCModal(false)
      setPendingVCChannel(null)
    }
  }

  // VCチャンネルを切り替え（接続は継続）
  const switchVCChannel = (channel: Channel) => {
    setConnectedVCChannel(channel)
    setShowVCModal(false)
    setPendingVCChannel(null)
  }

  // VC接続を切断
  const disconnectVC = () => {
    setIsConnectedToVC(false)
    setConnectedVCChannel(null)
  }

  // モーダルを閉じる
  const closeVCModal = () => {
    setShowVCModal(false)
    setPendingVCChannel(null)
  }

  // マイク/スピーカーのトグル
  const toggleMic = () => setIsMicOn(prev => !prev)
  const toggleSpeaker = () => setIsSpeakerOn(prev => !prev)

  return {
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
  }
}
