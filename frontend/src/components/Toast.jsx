import { useToast } from '../context/ToastContext.jsx'
import styles from './Toast.module.css'

export default function Toast() {
  const { toast } = useToast()
  if (!toast) return null

  const icons = { s: '✓', e: '✕', i: 'ℹ' }
  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      <span className={styles.icon}>{icons[toast.type]}</span>
      {toast.msg}
    </div>
  )
}
