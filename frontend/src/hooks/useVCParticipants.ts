import { useCallback, useEffect, useState } from 'react'
import { channels } from '@/data/mockData'

type VCParticipantsByChannelId = Record<string, string[]>

export function useVCParticipants() {
  const [membersByChannelId, setMembersByChannelId] = useState<VCParticipantsByChannelId>({})
  const [isLoadingVCParticipants, setIsLoadingVCParticipants] = useState(true)

  useEffect(() => {
    let cancelled = false

    const timer = window.setTimeout(() => {
      if (cancelled) return

      const initial: VCParticipantsByChannelId = {}
      for (const c of channels) {
        if (c.category !== 'vc') continue
        initial[c.id] = [...(c.participants ?? [])]
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

  const addMember = useCallback((channelId: string, userId: string) => {
    setMembersByChannelId(prev => {
      const existing = prev[channelId] ?? []
      if (existing.includes(userId)) return prev
      return {
        ...prev,
        [channelId]: [...existing, userId],
      }
    })
  }, [])

  const removeMember = useCallback((channelId: string, userId: string) => {
    setMembersByChannelId(prev => {
      const existing = prev[channelId] ?? []
      if (!existing.includes(userId)) return prev
      return {
        ...prev,
        [channelId]: existing.filter(id => id !== userId),
      }
    })
  }, [])

  return {
    membersByChannelId,
    isLoadingVCParticipants,
    addMember,
    removeMember,
  }
}

