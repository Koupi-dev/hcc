import { io, Socket } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket(token: string): Socket {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
  s.emit('authenticate', { token })
  return s
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const API_URL = SERVER_URL

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}
