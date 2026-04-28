import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { showToast }    = useToast()
  const navigate         = useNavigate()
  const { pathname }     = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
    showToast('Вы вышли из аккаунта', 'i')
  }

  const link = (to) => ({
    className: `${styles.nb} ${pathname === to ? styles.act : ''}`,
    onClick: () => navigate(to),
  })

  return (
    <nav className={styles.nav}>
      <div className={styles.logo} onClick={() => navigate('/')}>
        Biblio<em>тека</em>
      </div>

      <div className={styles.links}>
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
    </nav>
  )
}