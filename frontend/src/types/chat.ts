export type Channel = {
  id: string
  name: string
  displayName: string
  category: 'text' | 'vc'
  participants?: string[]
}

export type User = {
  id: string
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
}
