import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { get } from '../api/client.js'
import Chart from '../components/Chart.jsx'
import styles from './AdminAnalyticsPage.module.css'

export default function AdminAnalyticsPage() {
  const { token, user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const isAdmin = user?.role === 'admin'
  const days = parseInt(searchParams.get('days') ?? '30') || 30

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const d = await get(`/admin/analytics/overview?days=${days}`, token)
      setData(d)
    } catch (e) {
      showToast(e.message, 'e')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) return
    load()
  }, [isAdmin, days])

  const usersLine = useMemo(() => {
    const labels = (data?.usersDaily ?? []).map(x => x.date)
    const values = (data?.usersDaily ?? []).map(x => x.count)
    return {
      labels,
      datasets: [{
        label: 'Регистрации',
        data: values,
        borderColor: '#7aa48b',
        backgroundColor: 'rgba(122,164,139,.2)',
        tension: 0.25,
      }],
    }
  }, [data])

  const reviewsLine = useMemo(() => {
    const labels = (data?.reviewsDaily ?? []).map(x => x.date)
    const values = (data?.reviewsDaily ?? []).map(x => x.count)
    return {
      labels,
      datasets: [{
        label: 'Отзывы',
        data: values,
        borderColor: '#c08a18',
        backgroundColor: 'rgba(192,138,24,.2)',
        tension: 0.25,
      }],
    }
  }, [data])

  const genresBar = useMemo(() => {
    const labels = (data?.genreDistribution ?? []).map(x => x.genre)
    const values = (data?.genreDistribution ?? []).map(x => x.count)
    return {
      labels,
      datasets: [{
        label: 'Книги по жанрам',
        data: values,
        backgroundColor: 'rgba(18,16,14,.75)',
      }],
    }
  }, [data])

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
    scales: { y: { beginAtZero: true } },
  }

  const genreCount = data?.genreDistribution?.length ?? 0
  const genreChartHeight = Math.max(260, Math.min(560, genreCount * 26))
  const genreOptions = {
    ...commonOptions,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true },
      y: { ticks: { autoSkip: false } },
    },
  }

  if (!isAdmin) return <div className={styles.forbidden}>Доступ запрещён</div>

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Аналитика</h1>
          <div className={styles.sub}>Период: последние {days} дней</div>
        </div>
        <div className={styles.headRight}>
          <select
            className={styles.select}
            value={String(days)}
            onChange={(e) => setSearchParams({ days: e.target.value })}
          >
            <option value="7">7 дней</option>
            <option value="30">30 дней</option>
            <option value="90">90 дней</option>
            <option value="180">180 дней</option>
          </select>
          <button className={styles.back} onClick={() => navigate('/admin')}>← В админку</button>
        </div>
      </div>

      {loading || !data ? (
        <div className={styles.loading}>Загрузка…</div>
      ) : (
        <>
          <div className={styles.kpis}>
            <div className={styles.kpi}><div className={styles.kpiN}>{data.totals.users}</div><div className={styles.kpiL}>Пользователи</div></div>
            <div className={styles.kpi}><div className={styles.kpiN}>{data.totals.books}</div><div className={styles.kpiL}>Книги</div></div>
            <div className={styles.kpi}><div className={styles.kpiN}>{data.totals.reviews}</div><div className={styles.kpiL}>Отзывы</div></div>
          </div>

          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Активность пользователей</div>
              <div className={styles.chartBox}>
                <Chart type="line" data={usersLine} options={commonOptions} />
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitle}>Отзывы по дням</div>
              <div className={styles.chartBox}>
                <Chart type="line" data={reviewsLine} options={commonOptions} />
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitle}>Выбор книг (жанры)</div>
              <div className={styles.genreScroll} style={{ height: genreChartHeight }}>
                <Chart type="bar" data={genresBar} options={genreOptions} />
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitle}>Топ книг по отзывам</div>
              <div className={styles.table}>
                {(data.topBooksByReviews ?? []).map((b) => (
                  <div key={b.id} className={styles.row}>
                    <div className={styles.rMain}>
                      <div className={styles.rTitle}>{b.title}</div>
                      <div className={styles.rSub}>{b.author}</div>
                    </div>
                    <div className={styles.rRight}>
                      <div className={styles.badge}>{b.review_count} отзывов</div>
                      <div className={styles.badgeGold}>★ {b.avg_rating}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

