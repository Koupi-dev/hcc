export const getUserAvatar = (userId: string): string => {
  // Generate a consistent avatar URL from userId (use DiceBear or similar)
  // For now, use a hash-based color avatar
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userId)}&backgroundColor=4f46e5,9333ea,6366f1,8b5cf6`
}

export const getInitials = (name: string): string => {
  return name.slice(0, 2).toUpperCase()
}
