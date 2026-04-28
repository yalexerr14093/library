import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { del, get } from '../api/client.js'
import { fmtDate, starsStr } from '../utils/dateUtils.js'
import styles from './AdminReviewsPage.module.css'

export default function AdminReviewsPage() {
  const { token, user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const q = searchParams.get('q') ?? ''

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  const isAdmin = user?.role === 'admin'

  const load = async () => {
    setLoading(true)
    try {
      const data = await get(`/admin/reviews?q=${encodeURIComponent(q)}`, token)
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      showToast(e.message, 'e')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) return
    load()
  }, [isAdmin, q])

  const count = items.length

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот отзыв?')) return
    setDeletingId(id)
    try {
      await del(`/admin/reviews/${id}`, token)
      showToast('Отзыв удалён', 'i')
      setItems(prev => prev.filter(x => x.id !== id))
    } catch (e) {
      showToast(e.message, 'e')
    } finally {
      setDeletingId(null)
    }
  }

  const subtitle = useMemo(() => q ? `Найдено: ${count}` : `Всего: ${count}`, [q, count])

  if (!isAdmin) return <div className={styles.forbidden}>Доступ запрещён</div>

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Отзывы</h1>
          <div className={styles.sub}>{subtitle}</div>
        </div>
        <button className={styles.back} onClick={() => navigate('/admin')}>← В админку</button>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Поиск по пользователю / книге / тексту…"
          value={q}
          onChange={(e) => setSearchParams({ q: e.target.value })}
        />
        <button className={styles.refresh} onClick={load} disabled={loading}>Обновить</button>
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Ничего не найдено.</div>
      ) : (
        <div className={styles.list}>
          {items.map((rv) => (
            <div key={rv.id} className={styles.card}>
              <div className={styles.top}>
                <div className={styles.left}>
                  <button className={styles.userLink} onClick={() => navigate(`/users/${rv.user_id}`)}>
                    {rv.user_name}
                  </button>
                  <span className={styles.meta}>· зарегистрирован: {fmtDate(rv.user_created_at)}</span>
                </div>
                <div className={styles.right}>
                  <span className={styles.stars}>{starsStr(rv.rating)}</span>
                  <span className={styles.meta}>{fmtDate(rv.created_at)}</span>
                </div>
              </div>

              <div className={styles.book}>
                <span className={styles.bookTitle}>{rv.book_title}</span>
                <span className={styles.bookMeta}>· {rv.book_author}</span>
              </div>

              {rv.comment ? (
                <div className={styles.comment}>{rv.comment}</div>
              ) : (
                <div className={styles.noComment}>Без комментария</div>
              )}

              <div className={styles.actions}>
                <button
                  className={styles.danger}
                  onClick={() => handleDelete(rv.id)}
                  disabled={deletingId === rv.id}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

