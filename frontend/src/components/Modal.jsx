import styles from './Modal.module.css'

export default function Modal({ children, onClose, maxWidth = 500 }) {
  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} style={{ maxWidth }}>
        <button className={styles.close} onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  )
}
