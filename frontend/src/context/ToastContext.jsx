import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null) // { msg, type: 's'|'e'|'i' }
  const timerRef = useRef(null)

  const showToast = useCallback((msg, type = 's') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ msg, type })
    timerRef.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const hideToast = useCallback(() => setToast(null), [])

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
