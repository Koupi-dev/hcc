import type { Channel, User } from '@/types/chat'

// These will be populated from the server at runtime
export let channels: Channel[] = []
export let dmUsers: User[] = []
export let CURRENT_USER_INTERNAL_ID = ''
export let currentAccountId = ''

export function setChannels(chs: Channel[]) {
  channels = chs
}

export function setDmUsers(users: User[]) {
  dmUsers = users
}

export function setCurrentUser(internalId: string, accountId: string) {
  CURRENT_USER_INTERNAL_ID = internalId
  currentAccountId = accountId
}

// internalId からチャンネルを検索
export function findChannelByInternalId(internalId: string): Channel | undefined {
  return channels.find(c => c.internalId === internalId)
}

// internalId からユーザーを検索
export function findUserByInternalId(internalId: string): User | undefined {
  return dmUsers.find(u => u.internalId === internalId)
}

// 旧id からチャンネルを検索（後方互換）
export function findChannelById(id: string): Channel | undefined {
  return channels.find(c => c.id === id)
}

// 旧id からユーザーを検索（後方互換）
export function findUserById(id: string): User | undefined {
  return dmUsers.find(u => u.id === id)
}
