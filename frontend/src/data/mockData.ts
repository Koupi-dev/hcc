import type { Channel, User } from '@/types/chat'

export const channels: Channel[] = [
  { id: 'rule', name: 'rule', displayName: 'ルール', category: 'text' },
  { id: 'jarujaru', name: 'jarujaru', displayName: 'ジャルジャル', category: 'text' },
  { id: 'general', name: 'general', displayName: '全般', category: 'text' },
  { id: 'vc1', name: 'vc1', displayName: 'VC 1', category: 'vc', participants: ['5', '7'] },
  { id: 'vc2', name: 'vc2', displayName: 'VC 2', category: 'vc', participants: [] },
  { id: 'vc3', name: 'vc3', displayName: 'VC 3', category: 'vc', participants: ['6'] },
]

export const dmUsers: User[] = [
  { id: '5', name: 'Friend1', status: 'online' },
  { id: '6', name: 'Friend2', status: 'offline' },
  { id: '7', name: 'Friend3', status: 'online' },
]
