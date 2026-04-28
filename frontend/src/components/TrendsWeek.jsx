import { useMemo, useState } from 'react'
import CoverThumb from './CoverThumb.jsx'
import styles from './TrendsWeek.module.css'

const TABS = [
  { id: 'views', label: 'Просмотры' },
  { id: 'discussed', label: 'Обсуждают' },
  { id: 'wishlisted', label: 'В избранное' },
]

function metricText(tabId, item) {
  if (tabId === 'views') return `${item.views ?? 0} просмотров`
  if (tabId === 'discussed') return `${item.unique_reviewers ?? 0} читателей`
  if (tabId === 'wishlisted') return `+${item.net_wishlisted ?? 0} в избранное`
  return ''
}

export default function TrendsWeek({ data, onPick }) {
  const [tab, setTab] = useState('views')

  const list = useMemo(() => {
    if (!data) return []
    return data[tab] ?? []
  }, [data, tab])

  return (
    <aside className={styles.wrap} aria-label="Тренды недели">
      <div className={styles.head}>
        <div className={styles.title}>Тренды недели</div>
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className={styles.empty}>Пока нет данных за эту неделю</div>
      ) : (
        <div className={styles.list}>
          {list.slice(0, 5).map((b, idx) => (
            <button
              key={b.id}
              type="button"
              className={styles.row}
              onClick={() => onPick?.(b)}
              title="Открыть книгу"
            >
              <div className={styles.rank}>{idx + 1}</div>
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
                <div className={styles.name}>{b.title}</div>
                <div className={styles.meta}>
                  {b.author} · {b.genre}{b.year ? ` · ${b.year}` : ''}
                </div>
                <div className={styles.metrics}>
                  <span className={styles.metricMain}>{metricText(tab, b)}</span>
                  <span className={styles.metricSep}>·</span>
                  <span className={styles.metricSub}>★ {b.avg_rating ?? '—'}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}

