import { useMemo, useState } from 'react'
import { apiStaticOrigin } from '../api/env.js'

const API_URL = apiStaticOrigin()

function resolveCoverUrl(coverUrl) {
  if (!coverUrl) return null
  if (coverUrl.startsWith('/uploads/')) return `${API_URL}${coverUrl}`
  return coverUrl
}

export default function CoverThumb({ title, cover_url, cover_emoji, className, imgClassName, emojiClassName }) {
  const [broken, setBroken] = useState(false)

  const url = useMemo(() => resolveCoverUrl(cover_url), [cover_url])
  const emoji = cover_emoji || '📖'

  if (!url || broken) {
    return <span className={className ? `${className} ${emojiClassName}` : emojiClassName}>{emoji}</span>
  }

  return (
    <img
      className={className ? `${className} ${imgClassName}` : imgClassName}
      src={url}
      alt={title}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}

