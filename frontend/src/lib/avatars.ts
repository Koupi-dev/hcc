export const getUserAvatar = (userId: string): string => {
  const avatarMap: Record<string, string> = {
    'current-user': '/avatar-current.png',
    '5': '/avatar-1.png',
    '6': '/avatar-2.png',
    '7': '/avatar-3.png',
  }
  return avatarMap[userId] || '/default-avatar.png'
}

export const getInitials = (name: string): string => {
  return name.slice(0, 2).toUpperCase()
}
