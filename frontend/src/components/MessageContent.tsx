import { useMemo } from 'react'
import VideoEmbed from './VideoEmbed'
import CustomVideoPlayer from './CustomVideoPlayer'
import CustomAudioPlayer from './CustomAudioPlayer'
import type { Message } from '@/types/chat'
import { dmUsers } from '@/data/mockData'

type EmbedInfo = {
  type: 'youtube' | 'twitch' | 'gif'
  url: string
  videoId?: string
}

interface MessageContentProps {
  content: string
  messageId: string
  embedMetaCache: Map<string, { title?: string; author?: string }>
  file?: Message['file']
  onImageClick?: (imageUrl: string) => void
}

const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

const isTwitchUrl = (url: string): boolean => {
  return /^https?:\/\/(www\.)?(twitch\.tv|clips\.twitch\.tv)/.test(url)
}

const isGifUrl = (url: string): boolean => {
  return /\.(gif|gifv)$/i.test(url) || url.includes('tenor.com') || url.includes('giphy.com')
}

const detectEmbed = (url: string): EmbedInfo | null => {
  const ytId = extractYouTubeId(url)
  if (ytId) return { type: 'youtube', url, videoId: ytId }
  if (isTwitchUrl(url)) return { type: 'twitch', url }
  if (isGifUrl(url)) return { type: 'gif', url }
  return null
}

const getTwemojiUrl = (emoji: string) => {
  if (!emoji) return ''
  const codePoints = []
  for (let i = 0; i < emoji.length; i++) {
    const codePoint = emoji.codePointAt(i)
    if (codePoint) {
      codePoints.push(codePoint.toString(16))
      if (codePoint > 0xffff) i++
    }
  }
  const filtered = codePoints.filter(cp => cp !== 'fe0f')
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/${filtered.join('-')}.png`
}

export default function MessageContent({ content, messageId, embedMetaCache, file, onImageClick }: MessageContentProps) {
  const rendered = useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = content.split(urlRegex)

    const embeds: EmbedInfo[] = []

    const textContent = parts.map((part, i) => {
      if (part.match(/^https?:\/\//)) {
        const embedInfo = detectEmbed(part)
        if (embedInfo) {
          embeds.push(embedInfo)
        }
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="message-link">
            {part}
          </a>
        )
      }
      
      const mentionRegex = /(<@\d{20}>)/g
      const subParts = part.split(mentionRegex)

      return (
        <span key={i}>
          {subParts.map((subPart, idx) => {
            const mentionMatch = subPart.match(/^<@(\d{20})>$/)
            if (mentionMatch) {
              const userId = mentionMatch[1]
              const currentUserId = localStorage.getItem('internalId') || ''
              const currentDisplayName = localStorage.getItem('displayName') || 'あなた'
              const user = dmUsers.find(u => u.internalId === userId) || (userId === currentUserId ? { name: currentDisplayName } : null)
              const userName = user ? user.name : userId
              return (
                <span key={idx} className="mention-badge">
                  @{userName}
                </span>
              )
            }

            const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu
            if (emojiRegex.test(subPart)) {
              const segments = subPart.split(emojiRegex)
              return (
                <span key={idx}>
                  {segments.map((segment, j) => {
                    if (segment && segment.match(emojiRegex)) {
                      return (
                        <img
                          key={j}
                          src={getTwemojiUrl(segment)}
                          alt={segment}
                          className="emoji"
                          draggable="false"
                        />
                      )
                    }
                    return segment
                  })}
                </span>
              )
            }
            return subPart
          })}
        </span>
      )
    })

    return { textContent, embeds }
  }, [content])

  return (
    <>
      <span>{rendered.textContent}</span>
      {rendered.embeds.map((embed, i) => (
        <VideoEmbed 
          key={`${messageId}-embed-${i}-${embed.url}`} 
          embed={embed}
          messageId={messageId}
          embedIndex={i}
          embedMetaCache={embedMetaCache}
        />
      ))}
      {file && (
        <div className="file-embed">
          {file.type.startsWith('image/') && (
            <img 
              src={file.dataUrl} 
              alt={file.name} 
              className="file-embed-image"
              onClick={() => onImageClick?.(file.dataUrl)}
            />
          )}
          {file.type === 'video/mp4' && (
            <CustomVideoPlayer src={file.dataUrl} />
          )}
          {file.type === 'audio/mpeg' && (
            <CustomAudioPlayer src={file.dataUrl} fileName={file.name} />
          )}
          {file.type === 'application/zip' && (
            <div className="file-embed-zip">
              <div className="file-embed-icon">📦</div>
              <div className="file-embed-info">
                <div className="file-embed-name">{file.name}</div>
                <div className="file-embed-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              <a href={file.dataUrl} download={file.name} className="file-embed-download">
                ダウンロード
              </a>
            </div>
          )}
        </div>
      )}
    </>
  )
}
