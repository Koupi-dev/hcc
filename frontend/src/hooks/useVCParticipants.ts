import { useCallback, useEffect, useState } from 'react'
import { channels } from '@/data/mockData'

type VCParticipantsByChannelId = Record<string, string[]>

export function useVCParticipants() {
  const [membersByChannelId, setMembersByChannelId] = useState<VCParticipantsByChannelId>({})
  const [isLoadingVCParticipants, setIsLoadingVCParticipants] = useState(true)

  // ミュート中のユーザーID セット（全チャンネル共通）
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set())
  // 発話中のユーザーID セット（全チャンネル共通）
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    const timer = window.setTimeout(() => {
      if (cancelled) return

      // internalIdをキーにして参加者を管理
      const initial: VCParticipantsByChannelId = {}
      for (const c of channels) {
        if (c.category !== 'vc') continue
        initial[c.internalId] = [...(c.participants ?? [])]
      }

      // 初期ロード完了前に join/switch した変更を上書きしない
      setMembersByChannelId(prev => {
        const next: VCParticipantsByChannelId = { ...initial }
        for (const [channelId, memberIds] of Object.entries(prev)) {
          const base = next[channelId] ?? []
          next[channelId] = Array.from(new Set([...base, ...memberIds]))
        }
        return next
      })
      setIsLoadingVCParticipants(false)
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  const addMember = useCallback((channelInternalId: string, userInternalId: string) => {
    setMembersByChannelId(prev => {
      const existing = prev[channelInternalId] ?? []
      if (existing.includes(userInternalId)) return prev
      return {
        ...prev,
        [channelInternalId]: [...existing, userInternalId],
      }
    })
  }, [])

  const removeMember = useCallback((channelInternalId: string, userInternalId: string) => {
    setMembersByChannelId(prev => {
      const existing = prev[channelInternalId] ?? []
      if (!existing.includes(userInternalId)) return prev
      return {
        ...prev,
        [channelInternalId]: existing.filter(id => id !== userInternalId),
      }
    })
    // チャンネルから抜けたらミュート・発話状態もクリア
    setMutedUsers(prev => { const s = new Set(prev); s.delete(userInternalId); return s })
    setSpeakingUsers(prev => { const s = new Set(prev); s.delete(userInternalId); return s })
  }, [])

  const muteUser = useCallback((userInternalId: string) => {
    setMutedUsers(prev => new Set([...prev, userInternalId]))
    setSpeakingUsers(prev => { const s = new Set(prev); s.delete(userInternalId); return s })
  }, [])

  const unmuteUser = useCallback((userInternalId: string) => {
    setMutedUsers(prev => { const s = new Set(prev); s.delete(userInternalId); return s })
  }, [])

  const setSpeaking = useCallback((userInternalId: string, speaking: boolean) => {
    setSpeakingUsers(prev => {
      const s = new Set(prev)
      if (speaking) s.add(userInternalId)
      else s.delete(userInternalId)
      return s
    })
  }, [])

  return {
    membersByChannelId,
    isLoadingVCParticipants,
    mutedUsers,
    speakingUsers,
    addMember,
    removeMember,
    muteUser,
    unmuteUser,
    setSpeaking,
  }
}
