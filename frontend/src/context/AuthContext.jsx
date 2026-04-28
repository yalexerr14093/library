import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/authApi.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    if (!token) { setLoading(false); return }
    authApi.me(token)
      .then(u  => setUser(u))
      .catch(() => { setToken(null); localStorage.removeItem('token') })
      .finally(() => setLoading(false))
  }, [token])

  const login = useCallback(async ({ email, password }) => {
    const { token: t, user: u } = await authApi.login({ email, password })
    localStorage.setItem('token', t)
    setToken(t); setUser(u)
    return u
  }, [])

  const register = useCallback(async ({ name, email, password }) => {
    const { token: t, user: u } = await authApi.register({ name, email, password })
    localStorage.setItem('token', t)
    setToken(t); setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null); setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}