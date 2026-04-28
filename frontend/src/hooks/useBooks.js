// frontend/src/hooks/useBooks.js
import { useState, useEffect, useCallback } from 'react'
import { booksApi } from '../api/booksApi.js'

export function useBooks({ search = '', genre = '', page = 1, limit = 12 } = {}) {
  const [books, setBooks] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await booksApi.list({ search, genre, page, limit })
      // ожидаем { data, total, page, limit, totalPages }
      setBooks(response.data || [])
      setTotal(response.total || 0)
      setTotalPages(response.totalPages || 1)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, genre, page, limit])

  useEffect(() => { load() }, [load])

  return { books, total, totalPages, loading, error, reload: load }
}