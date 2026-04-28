import { useNavigate } from 'react-router-dom'
import { useMe } from '../hooks/useMe.js'
import { fmtDate, starsStr } from '../utils/dateUtils.js'
import CoverThumb from '../components/CoverThumb.jsx'
import styles from './MyBooksPage.module.css'

export default function MyBooksPage() {
  const navigate          = useNavigate()
  const { data, loading } = useMe()
  const read = data?.read ?? []

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Прочитано</h1>
      </div>

      {loading ? (
        <div className={styles.empty}><div>⏳</div><h3>Загрузка…</h3></div>
      ) : read.length === 0 ? (
        <div className={styles.empty}>
          <div>📚</div><h3>Пока пусто</h3>
          <p>Оставьте отзыв на книгу — и она появится здесь</p>
          <button className={styles.emptyBtn} onClick={() => navigate('/')}>В каталог</button>
        </div>
      ) : (
        <div className={styles.list}>
          {read.map((b, i) => (
            <div className={styles.row} key={b.id} style={{ animationDelay: `${i * .05}s` }}>
              <div className={styles.cover}>
                <CoverThumb
                  title={b.title}
                  cover_url={b.cover_url}
                  cover_emoji={b.cover_emoji}
                  imgClassName={styles.coverImg}
                  emojiClassName={styles.coverEmoji}
                />
              </div>
              <div className={styles.info}>
                <div className={styles.rTitle}>{b.title}</div>
                <div className={styles.rAuthor}>{b.author}</div>
                <div className={styles.rDates}>
                  Оценка: <strong>{starsStr(b.rating)}</strong> · Отзыв: <strong>{fmtDate(b.reviewed_at)}</strong>
                </div>
              </div>
              <span className={`${styles.pill} ${styles.pillDone}`}>Прочитано ✓</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
