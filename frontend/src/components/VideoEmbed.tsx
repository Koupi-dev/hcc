import { useState, useEffect, memo } from 'react'

type EmbedInfo = {
  type: 'youtube' | 'twitch' | 'gif'
  url: string
  videoId?: string
}

interface VideoEmbedProps {
  embed: EmbedInfo
  messageId: string
  embedIndex: number
  embedMetaCache: Map<string, { title?: string; author?: string }>
}

const VideoEmbed = memo(({ embed, messageId, embedIndex, embedMetaCache }: VideoEmbedProps) => {
  const [meta, setMeta] = useState<{ title?: string; author?: string } | null>(() => {
    return embedMetaCache.get(embed.url) || null
  })
  const [isLoading, setIsLoading] = useState(!embedMetaCache.has(embed.url))

  useEffect(() => {
    if (embedMetaCache.has(embed.url)) {
      return
    }

    let isMounted = true

    const fetchMeta = async () => {
      try {
        const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(embed.url)}`)
        const data = await res.json()
        if (isMounted && data && !data.error) {
          const metaData = {
            title: data.title || undefined,
            author: data.author_name || undefined,
          }
          embedMetaCache.set(embed.url, metaData)
          setMeta(metaData)
        }
      } catch {
        // Silently fail
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    fetchMeta()

    return () => {
      isMounted = false
    }
  }, [embed.url, embedMetaCache])

  if (embed.type === 'gif') {
    return (
      <div className="gif-embed">
        <img src={embed.url} alt="GIF" className="gif-embed-image" />
      </div>
    )
  }

  const borderColor = embed.type === 'youtube' ? '#ff0000' : '#9146ff'
  const platformName = embed.type === 'youtube' ? 'YouTube' : 'Twitch'

  const thumbnailSrc = embed.type === 'youtube' && embed.videoId
    ? `https://img.youtube.com/vi/${embed.videoId}/mqdefault.jpg`
    : null

  return (
    <a
      href={embed.url}
      target="_blank"
      rel="noopener noreferrer"
      className="video-embed"
      style={{ borderLeftColor: borderColor }}
    >
      <div className="video-embed-body">
        <span className="video-embed-source">
          {platformName}
        </span>
        {isLoading ? (
          <>
            <span className="video-embed-loading">読み込み中...</span>
            {thumbnailSrc && (
              <div className="video-embed-thumb-wrapper">
                <div className="video-embed-thumbnail-placeholder" />
              </div>
            )}
          </>
        ) : (
          <>
            {meta?.author && (
              <span className="video-embed-author">{meta.author}</span>
            )}
            {meta?.title && (
              <span className="video-embed-title">{meta.title}</span>
            )}
            {thumbnailSrc && (
              <div className="video-embed-thumb-wrapper">
                <img
                  className="video-embed-thumbnail"
                  src={thumbnailSrc}
                  alt="Thumbnail"
                />
                <div className="video-embed-play">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="#fff">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </a>
  )
})

VideoEmbed.displayName = 'VideoEmbed'

export default VideoEmbed
