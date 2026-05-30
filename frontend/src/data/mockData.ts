import type { Channel, User } from '@/types/chat'

// 固有の20桁数字IDを生成するヘルパー
// 事前に定義されたIDを使用して一意性を保証
export const channels: Channel[] = [
  { id: 'rule', internalId: '10000000000000000001', name: 'rule', displayName: 'ルール', category: 'text' },
  { id: 'jarujaru', internalId: '10000000000000000002', name: 'jarujaru', displayName: 'ジャルジャル', category: 'text' },
  { id: 'general', internalId: '10000000000000000003', name: 'general', displayName: '全般', category: 'text' },
  { id: 'vc1', internalId: '10000000000000000004', name: 'vc1', displayName: 'VC 1', category: 'vc', participants: ['20000000000000000002', '20000000000000000004'] },
  { id: 'vc2', internalId: '10000000000000000005', name: 'vc2', displayName: 'VC 2', category: 'vc', participants: [] },
  { id: 'vc3', internalId: '10000000000000000006', name: 'vc3', displayName: 'VC 3', category: 'vc', participants: ['20000000000000000003'] },
]

export const dmUsers: User[] = [
  { id: '5', internalId: '20000000000000000002', name: 'Friend1', status: 'online' },
  { id: '6', internalId: '20000000000000000003', name: 'Friend2', status: 'offline' },
  { id: '7', internalId: '20000000000000000004', name: 'Friend3', status: 'online' },
]

// 現在のユーザーのinternalId
export const CURRENT_USER_INTERNAL_ID = '20000000000000000001'

// --- ID参照ヘルパー ---

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
