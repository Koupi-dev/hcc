import { useCallback, useEffect, useState } from 'react'
import { getSocket } from '@/lib/socket'

type VoiceUser = {
  socketId: string
  internalId: string
  displayName: string
  roomId: string
  isMuted: boolean
  isSpeaking: boolean
  isScreenSharing: boolean
}

type VCParticipantsByChannelId = Record<string, string[]>

export function useVCParticipants() {
  const [membersByChannelId, setMembersByChannelId] = useState<VCParticipantsByChannelId>({})

  // ミュート中のユーザーID セット（全チャンネル共通）
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set())
  // 発話中のユーザーID セット（全チャンネル共通）
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set())
  // 画面共有中のユーザー
  const [screenSharingUsers, setScreenSharingUsers] = useState<Set<string>>(new Set())
  // internalId to socketId mapping
  const [userSocketIds, setUserSocketIds] = useState<Record<string, string>>({})

  useEffect(() => {
    const socket = getSocket()

    const handleVoiceState = (users: VoiceUser[]) => {
      const byChannel: VCParticipantsByChannelId = {}
      const muted = new Set<string>()
      const speaking = new Set<string>()
      const sharing = new Set<string>()
      const socketIds: Record<string, string> = {}

      for (const u of users) {
        if (!byChannel[u.roomId]) byChannel[u.roomId] = []
        byChannel[u.roomId].push(u.internalId)
        if (u.isMuted) muted.add(u.internalId)
        if (u.isSpeaking) speaking.add(u.internalId)
        if (u.isScreenSharing) sharing.add(u.internalId)
        socketIds[u.internalId] = u.socketId
      }

      setMembersByChannelId(byChannel)
      setMutedUsers(muted)
      setSpeakingUsers(speaking)
      setScreenSharingUsers(sharing)
      setUserSocketIds(socketIds)
    }

    socket.on('voice_state_update', handleVoiceState)

    return () => {
      socket.off('voice_state_update', handleVoiceState)
    }
  }, [])

  const addMember = useCallback((_channelInternalId: string, _userInternalId: string) => {
    // No-op: managed by server voice_state_update
  }, [])

  const removeMember = useCallback((_channelInternalId: string, _userInternalId: string) => {
    // No-op: managed by server voice_state_update
  }, [])

  const muteUser = useCallback((_userInternalId: string) => {
    // No-op: managed by server
  }, [])

  const unmuteUser = useCallback((_userInternalId: string) => {
    // No-op: managed by server
  }, [])

  const setSpeaking = useCallback((_userInternalId: string, _speaking: boolean) => {
    // No-op: managed by server
  }, [])

  return {
    membersByChannelId,
    isLoadingVCParticipants: false,
    mutedUsers,
    speakingUsers,
    screenSharingUsers,
    addMember,
    removeMember,
    muteUser,
    unmuteUser,
    setSpeaking,
    userSocketIds,
  }
}
