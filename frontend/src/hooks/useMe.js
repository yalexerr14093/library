import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { userApi } from '../api/userApi.js'

export function useMe() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setData(await userApi.me(token))
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { reload() }, [reload])

  return { data, loading, error, reload }
}

