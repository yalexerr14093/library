import { useState, useEffect, useCallback } from 'react'
import { wishlistApi } from '../api/wishlistApi.js'
import { useAuth } from '../context/AuthContext.jsx'

export function useWishlist() {
  const { token } = useAuth()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try { setItems(await wishlistApi.list(token)) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const toggle = async (bookId) => {
    const res = await wishlistApi.toggle(bookId, token)
    await load()
    return res.wishlisted
  }

  const isWishlisted = (bookId) => items.some(w => w.book_id === bookId)

  return { items, loading, toggle, isWishlisted, reload: load }
}
