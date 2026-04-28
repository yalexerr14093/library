import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--muted)' }}>Загрузка…</div>
  if (!user)   return <Navigate to={`/?modal=login&next=${location.pathname}`} replace />

  return children
}
