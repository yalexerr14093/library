import { useAuth } from '../context/AuthContext.jsx'
import { useMe } from '../hooks/useMe.js'
import { useWishlist } from '../hooks/useWishlist.js'
import { fmtDate, starsStr } from '../utils/dateUtils.js'
import styles from './ProfilePage.module.css'

function topNByCount(items, getKey, n = 3) {
  const map = new Map()
  for (const it of items) {
    const k = getKey(it)
    if (!k) continue
    map.set(k, (map.get(k) || 0) + 1)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, n)
    .map(([key, count]) => ({ key, count }))
}

export default function ProfilePage() {
  const { user }          = useAuth()
  const { data } = useMe()
  const { items: wishlist } = useWishlist()

  const stats = data?.stats ?? { read: 0, reviews: 0, wishlisted: wishlist.length }
  const read = data?.read ?? []

  const sourceBooks = [...read, ...wishlist]
  const favGenres = topNByCount(sourceBooks, (b) => b.genre, 3)
  const favAuthors = topNByCount(sourceBooks, (b) => b.author, 3)

  const lastReviews = read.slice(0, 3)

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Профиль</h1>

      {/* Profile Card */}
      <div className={styles.card}>
        <div className={styles.avatar}>{user.name[0].toUpperCase()}</div>
        <div className={styles.name}>{user.name}</div>
        <div className={styles.email}>{user.email}</div>

        <div className={styles.statsGrid}>
          <div className={styles.stat}><div className={styles.sn}>{stats.read ?? 0}</div><div className={styles.sl}>Прочитано</div></div>
          <div className={styles.stat}><div className={styles.sn}>{stats.reviews ?? 0}</div><div className={styles.sl}>Отзывы</div></div>
          <div className={styles.stat}><div className={styles.sn}>{wishlist.length}</div><div className={styles.sl}>В избранном</div></div>
        </div>

        <div className={styles.joined}>Читатель с {fmtDate(user.created_at ?? user.joinedAt ?? new Date())}</div>
      </div>

      {/* Favorites */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Любимое</h2>
          <span className={styles.sectionHint}>по избранному и прочитанному</span>
        </div>

        <div className={styles.favGrid}>
          <div className={styles.favCard}>
            <div className={styles.favTitle}>Жанры</div>
            {favGenres.length === 0 ? (
              <div className={styles.muted}>Пока нет данных</div>
            ) : (
              <div className={styles.chips}>
                {favGenres.map((g) => (
                  <div key={g.key} className={styles.chip}>
                    <span className={styles.chipLabel}>{g.key}</span>
                    <span className={styles.chipCount}>{g.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.favCard}>
            <div className={styles.favTitle}>Авторы</div>
            {favAuthors.length === 0 ? (
              <div className={styles.muted}>Пока нет данных</div>
            ) : (
              <div className={styles.chips}>
                {favAuthors.map((a) => (
                  <div key={a.key} className={styles.chip}>
                    <span className={styles.chipLabel}>{a.key}</span>
                    <span className={styles.chipCount}>{a.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Last reviews */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Последние отзывы</h2>
          <span className={styles.sectionHint}>последние 3</span>
        </div>

        {lastReviews.length === 0 ? (
          <div className={styles.empty}>Пока нет отзывов. Оставьте отзыв на книгу — и он появится здесь.</div>
        ) : (
          <div className={styles.reviewList}>
            {lastReviews.map((b) => (
              <div key={b.id} className={styles.reviewRow}>
                <div className={styles.reviewLeft}>
                  <div className={styles.reviewTitle}>{b.title}</div>
                  <div className={styles.reviewMeta}>{b.author} · {b.genre}{b.year ? ` · ${b.year}` : ''}</div>
                  {b.comment ? <div className={styles.reviewText}>{b.comment}</div> : null}
                </div>
                <div className={styles.reviewRight}>
                  <div className={styles.reviewStars}>{starsStr(b.rating)}</div>
                  <div className={styles.reviewDate}>{fmtDate(b.reviewed_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
