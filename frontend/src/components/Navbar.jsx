import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import styles from './Navbar.module.css'

function scheduleMicrotask(fn) {
  const q = globalThis.queueMicrotask
  if (typeof q === 'function') q(fn)
  else setTimeout(fn, 0)
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { showToast }    = useToast()
  const navigate         = useNavigate()
  const { pathname }     = useLocation()
  const [open, setOpen] = useState(false)
  const drawerId = useId()
  const closeBtnRef = useRef(null)
  const burgerRef = useRef(null)
  const prevOpenRef = useRef(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    showToast('Вы вышли из аккаунта', 'i')
    setOpen(false)
  }

  const link = (to) => ({
    className: `${styles.nb} ${pathname === to ? styles.act : ''}`,
    onClick: () => {
      navigate(to)
      setOpen(false)
    },
  })

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open

    if (!open) {
      if (wasOpen) scheduleMicrotask(() => burgerRef.current?.focus())
      return
    }

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)

    // focus first interactive in drawer
    scheduleMicrotask(() => closeBtnRef.current?.focus())

    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <nav className={styles.nav} aria-label="Основная навигация">
      <div className={styles.logo} onClick={() => navigate('/')}>
        Книжная <em>полка</em>
      </div>

      <div className={styles.linksDesktop}>
        <button {...link('/')}>Каталог</button>

        {user && (
          <>
            <button {...link('/my-books')}>Прочитано</button>
            <button {...link('/wishlist')}>Избранное</button>
            <button {...link('/profile')}>Профиль</button>
            {user.role === 'admin' && (
              <button {...link('/admin')}>Админ-панель</button>
            )}
          </>
        )}

        {user ? (
          <div className={styles.userArea}>
            <div className={styles.avatar}>{user.name[0].toUpperCase()}</div>
            <button className={styles.nb} onClick={handleLogout}>Выйти</button>
          </div>
        ) : (
          <>
            <button className={styles.nb} onClick={() => navigate('/?modal=login')}>Войти</button>
            <button className={`${styles.nb} ${styles.cta}`} onClick={() => navigate('/?modal=register')}>
              Регистрация
            </button>
          </>
        )}
      </div>

      <button
        ref={burgerRef}
        type="button"
        className={`${styles.burger} ${open ? styles.burgerOpen : ''}`}
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
        aria-expanded={open}
        aria-controls={drawerId}
        onClick={() => setOpen(v => !v)}
      >
        <span className={styles.burgerLine} /><span className={styles.burgerLine} /><span className={styles.burgerLine} />
      </button>

      {open && (
        <div className={styles.mobileRoot} role="presentation">
          <button type="button" className={styles.scrim} aria-label="Закрыть меню" onClick={() => setOpen(false)} />
          <div
            id={drawerId}
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Меню"
          >
            <div className={styles.drawerHead}>
              <div className={styles.drawerTitle}>Меню</div>
              <button ref={closeBtnRef} type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Закрыть">
                ✕
              </button>
            </div>

            <div className={styles.drawerBody}>
              <button {...link('/')}>Каталог</button>

              {user && (
                <>
                  <button {...link('/my-books')}>Прочитано</button>
                  <button {...link('/wishlist')}>Избранное</button>
                  <button {...link('/profile')}>Профиль</button>
                  {user.role === 'admin' && (
                    <button {...link('/admin')}>Админ-панель</button>
                  )}
                </>
              )}

              <div className={styles.drawerDivider} />

              {user ? (
                <>
                  <div className={styles.drawerUser}>
                    <div className={styles.avatar}>{user.name[0].toUpperCase()}</div>
                    <div className={styles.drawerUserName}>{user.name}</div>
                  </div>
                  <button className={`${styles.nb} ${styles.nbWide}`} onClick={handleLogout}>Выйти</button>
                </>
              ) : (
                <>
                  <button className={`${styles.nb} ${styles.nbWide}`} onClick={() => { setOpen(false); navigate('/?modal=login') }}>
                    Войти
                  </button>
                  <button className={`${styles.nb} ${styles.cta} ${styles.nbWide}`} onClick={() => { setOpen(false); navigate('/?modal=register') }}>
                    Регистрация
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}