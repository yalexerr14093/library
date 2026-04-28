import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { userApi } from '../api/userApi.js'
import { fmtDate, starsStr } from '../utils/dateUtils.js'
import styles from './UserProfilePage.module.css'

export default function UserProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    userApi.profile(id)
      .then(d => { if (alive) setData(d) })
      .catch(e => { if (alive) setError(e) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  if (loading) return <div className={styles.page}><div className={styles.loading}>Загрузка…</div></div>
  if (error) return <div className={styles.page}><div className={styles.loading}>Ошибка: {error.message}</div></div>
  if (!data) return null

  const read = data.read ?? []
  const reviews = data.reviews ?? []

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>← Назад</button>

      <div className={styles.card}>
        <div className={styles.avatar}>{data.name?.[0]?.toUpperCase() ?? 'U'}</div>
        <div className={styles.name}>{data.name}</div>
        <div className={styles.meta}>
          Читатель с {fmtDate(data.created_at)} {data.role === 'admin' ? '· администратор' : ''}
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}><div className={styles.sn}>{data.stats?.read ?? 0}</div><div className={styles.sl}>Прочитано</div></div>
          <div className={styles.stat}><div className={styles.sn}>{data.stats?.reviews ?? 0}</div><div className={styles.sl}>Отзывы</div></div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Что читал</div>
        {read.length === 0 ? (
          <div className={styles.empty}>Пока нет отмеченных книг.</div>
        ) : (
          <div className={styles.list}>
            {read.slice(0, 12).map(b => (
              <div key={b.id} className={styles.row}>
                <div className={styles.emoji}>{b.cover_emoji}</div>
                <div className={styles.info}>
                  <div className={styles.rTitle}>{b.title}</div>
                  <div className={styles.rAuthor}>{b.author} · {b.year}</div>
                </div>
                <div className={styles.rRight}>
                  <div className={styles.stars}>{starsStr(b.rating)}</div>
                  <div className={styles.date}>{fmtDate(b.reviewed_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Отзывы</div>
        {reviews.length === 0 ? (
          <div className={styles.empty}>Пока нет отзывов.</div>
        ) : (
          <div className={styles.reviewList}>
            {reviews.slice(0, 20).map(rv => (
              <div key={rv.id} className={styles.reviewCard}>
                <div className={styles.rvTop}>
                  <button className={styles.bookLink} onClick={() => navigate('/')}>
                    {rv.title}
                  </button>
                  <span className={styles.rvStars}>{starsStr(rv.rating)}</span>
                </div>
                {rv.comment && <div className={styles.rvText}>{rv.comment}</div>}
                <div className={styles.rvMeta}>{fmtDate(rv.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

