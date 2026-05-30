export type Channel = {
  id: string
  internalId: string  // 20桁の数字のみの固有ID（内部操作用）
  name: string
  displayName: string
  category: 'text' | 'vc'
  participants?: string[]
}

export type User = {
  id: string
  internalId: string  // 20桁の数字のみの固有ID（内部操作用）
  name: string
  status: 'online' | 'offline'
}

export type Message = {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: Date
  reactions?: Record<string, string[]>
  replyTo?: {
    id: string
    userId: string
    userName: string
    content: string
  }
  file?: {
    name: string
    type: string
    size: number
    dataUrl: string
  }
}
