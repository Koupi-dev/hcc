import { CURRENT_USER_INTERNAL_ID } from '@/data/mockData'

export const getUserAvatar = (userId: string): string => {
  // 旧IDとinternalID両方に対応
  const avatarMap: Record<string, string> = {
    'current-user': '/avatar-current.png',
    [CURRENT_USER_INTERNAL_ID]: '/avatar-current.png',
    '5': '/avatar-1.png',
    '20000000000000000002': '/avatar-1.png',
    '6': '/avatar-2.png',
    '20000000000000000003': '/avatar-2.png',
    '7': '/avatar-3.png',
    '20000000000000000004': '/avatar-3.png',
  }
  return avatarMap[userId] || '/default-avatar.png'
}

export const getInitials = (name: string): string => {
  return name.slice(0, 2).toUpperCase()
}
