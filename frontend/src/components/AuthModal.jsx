import { useState } from 'react'
import Modal from './Modal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import styles from './AuthModal.module.css'

export default function AuthModal({ initialMode = 'login', onClose }) {
  const { login, register } = useAuth()
  const { showToast }       = useToast()
  const [mode, setMode]     = useState(initialMode)
  const [form, setForm]     = useState({ name: '', email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        if (!form.name.trim())       return setError('Введите имя')
        if (!form.email.includes('@')) return setError('Некорректный email')
        if (form.password.length < 6) return setError('Пароль минимум 6 символов')
        const u = await register(form)
        showToast(`Добро пожаловать, ${u.name}! 📚`)
      } else {
        const u = await login(form)
        showToast(`С возвращением, ${u.name}!`)
      }
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => e.key === 'Enter' && handleSubmit()

  return (
    <Modal onClose={onClose} maxWidth={460}>
      <h2 className={styles.title}>{mode === 'login' ? 'Добро пожаловать' : 'Регистрация'}</h2>
      <p className={styles.sub}>{mode === 'login' ? 'Войдите в аккаунт' : 'Создайте аккаунт читателя'}</p>

      {mode === 'register' && (
        <div className={styles.fg}>
          <label className={styles.label}>Имя</label>
          <input className={styles.input} placeholder="Ваше имя" value={form.name} onChange={set('name')} onKeyDown={onKey} />
        </div>
      )}
      <div className={styles.fg}>
        <label className={styles.label}>Email</label>
        <input className={styles.input} type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} onKeyDown={onKey} />
      </div>
      <div className={styles.fg}>
        <label className={styles.label}>Пароль</label>
        <input className={styles.input} type="password" placeholder={mode === 'register' ? 'Минимум 6 символов' : 'Ваш пароль'} value={form.password} onChange={set('password')} onKeyDown={onKey} />
      </div>

      {error && <div className={styles.error}>⚠ {error}</div>}

      <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSubmit} disabled={loading}>
        {loading ? 'Загрузка…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
      </button>

      <div className={styles.switch}>
        {mode === 'login'
          ? <>Нет аккаунта? <button onClick={() => { setMode('register'); setError('') }}>Зарегистрироваться</button></>
          : <>Уже есть аккаунт? <button onClick={() => { setMode('login'); setError('') }}>Войти</button></>
        }
      </div>
    </Modal>
  )
}
