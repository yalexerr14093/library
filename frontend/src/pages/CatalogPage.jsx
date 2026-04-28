// frontend/src/pages/CatalogPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { booksApi } from '../api/booksApi.js'
import { reviewsApi } from '../api/reviewsApi.js'
import { wishlistApi } from '../api/wishlistApi.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import BookCard from '../components/BookCard.jsx'
import BookModal from '../components/BookModal.jsx'
import AuthModal from '../components/AuthModal.jsx'
import TrendsWeek from '../components/TrendsWeek.jsx'
import styles from './CatalogPage.module.css'

export default function CatalogPage() {
  const { user, token } = useAuth()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Состояния для фильтров и пагинации
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('Все')
  const [sort, setSort] = useState('title')
  const [order, setOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const limit = 12

  // Данные
  const [books, setBooks] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [reviews, setReviews] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [stats, setStats] = useState({ total: 0, donated: 0 })
  const [genres, setGenres] = useState(['Все'])
  const [trends, setTrends] = useState(null)

  // UI состояния
  const [loading, setLoading] = useState(true)
  const [selBook, setSelBook] = useState(null)
  const [showAuth, setShowAuth] = useState(null)

  // Загрузка общей статистики при монтировании
  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await booksApi.stats()
      setStats({ total: data.total ?? 0, donated: data.donated ?? 0 })
      } catch (err) {
        console.error('Ошибка загрузки статистики', err)
      }
    }
    loadStats()
  }, [])

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const gs = await booksApi.genres()
        const uniq = Array.from(new Set((gs ?? []).filter(Boolean)))
        setGenres(['Все', ...uniq])
      } catch (err) {
        console.error('Ошибка загрузки жанров', err)
      }
    }
    loadGenres()
  }, [])

  useEffect(() => {
    const loadTrends = async () => {
      try {
        const t = await booksApi.trendsWeek()
        setTrends(t)
      } catch (err) {
        // тренды не критичны
        console.warn('Тренды недоступны', err)
      }
    }
    loadTrends()
  }, [])

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setPage(1)
  }, [search, genre, sort, order])

  // Загрузка книг с учётом пагинации
  const loadBooks = useCallback(async () => {
    setLoading(true)
    try {
      const response = await booksApi.list({
        search,
        genre: genre === 'Все' ? '' : genre,
        sort,
        order,
        page,
        limit,
      })
      setBooks(response.data || [])
      setTotalPages(response.totalPages || 1)
    } catch (err) {
      console.error(err)
      showToast('Ошибка загрузки книг', 'e')
    } finally {
      setLoading(false)
    }
  }, [search, genre, sort, order, page, limit, showToast])

  // Загрузка пользовательских данных
  const loadUserData = useCallback(async () => {
    if (!token) return
    try {
      const w = await wishlistApi.list(token)
      setWishlist(w)
    } catch (err) {
      console.error(err)
    }
  }, [token])

  // Загрузка отзывов для видимых книг
  const loadReviewsForVisible = useCallback(async (bookList) => {
    if (!bookList.length) return
    try {
      const rvs = await Promise.all(
        bookList.slice(0, 12).map(b => reviewsApi.forBook(b.id).catch(() => []))
      )
      setReviews(rvs.flat())
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => { loadBooks() }, [loadBooks])
  useEffect(() => { loadUserData() }, [loadUserData])
  useEffect(() => { if (books.length) loadReviewsForVisible(books) }, [books, loadReviewsForVisible])

  // Обработка модальных параметров из URL
  useEffect(() => {
    const m = searchParams.get('modal')
    if (m === 'login' || m === 'register') {
      setShowAuth(m)
      navigate('/', { replace: true })
    }
  }, [searchParams, navigate])

  const refresh = () => { loadBooks(); loadUserData() }

  const handleToggleWish = async (bookId) => {
    if (!user) { setShowAuth('login'); return }
    try {
      const res = await wishlistApi.toggle(bookId, token)
      showToast(res.wishlisted ? 'Добавлено в избранное 🔖' : 'Удалено из избранного', 'i')
      loadUserData()
    } catch (e) { showToast(e.message, 'e') }
  }

  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div>
      {/* Hero секция */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroInner}>
            <div className={styles.pill}>✦ Городская библиотека</div>
            <h1 className={styles.h1}>Читайте больше,<br /><em>думайте глубже</em></h1>
            <p className={styles.lead}>Читайте онлайн, оставляйте отзывы и сохраняйте книги в избранное.</p>
            <div className={styles.stats}>
              <div><div className={styles.sn}>{stats.total}</div><div className={styles.sl}>Книг в фонде</div></div>
                <div><div className={styles.sn}>{stats.donated}</div><div className={styles.sl}>От читателей</div></div>
            </div>
          </div>

          <div className={styles.heroTrends}>
            <TrendsWeek
              data={trends}
              onPick={(b) => {
                setSelBook(b)
                if (token) {
                  booksApi.trackView(b.id, token).catch(() => {})
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.main}>
        {/* Фильтры */}
        <div className={styles.filters}>
          <div className={styles.searchWrap}>
            <span className={styles.sIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Поиск по названию или автору…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.genreSelectWrap}>
            <select
              className={styles.genreSelect}
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              aria-label="Жанр"
            >
              {genres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className={styles.genreSelectWrap}>
            <select
              className={styles.genreSelect}
              value={`${sort}:${order}`}
              onChange={(e) => {
                const [s, o] = String(e.target.value).split(':')
                setSort(s)
                setOrder(o)
              }}
              aria-label="Сортировка"
              title="Сортировка"
            >
              <option value="title:asc">Название (А→Я)</option>
              <option value="title:desc">Название (Я→А)</option>
              <option value="rating:desc">Рейтинг (сначала лучшие)</option>
              <option value="year:desc">Год (сначала новые)</option>
              <option value="year:asc">Год (сначала старые)</option>
              <option value="newest:desc">Добавлены недавно</option>
            </select>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.mainCol}>
            {loading ? (
              <div className={styles.loading}>Загрузка…</div>
            ) : books.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>📚</div>
                <h3>Книги не найдены</h3>
                <p>Попробуйте другой запрос</p>
              </div>
            ) : (
              <>
                <div className={styles.grid}>
                  {books.map((book, i) => (
                    <div key={book.id} style={{ animationDelay: `${i * 0.04}s` }}>
                      <BookCard
                        book={book}
                        reviews={reviews}
                        isWishlisted={wishlist.some(w => w.book_id === book.id)}
                        onOpen={async (b) => {
                          setSelBook(b)
                          if (token) {
                            try { await booksApi.trackView(b.id, token) } catch { /* ignore */ }
                          }
                        }}
                        onToggleWish={handleToggleWish}
                      />
                    </div>
                  ))}
                </div>

                {/* Пагинация */}
                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={styles.pageBtn}
                      onClick={() => goToPage(page - 1)}
                      disabled={page === 1}
                    >
                      ←
                    </button>
                    <span className={styles.pageInfo}>
                      Страница {page} из {totalPages}
                    </span>
                    <button
                      className={styles.pageBtn}
                      onClick={() => goToPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Модальные окна */}
      {selBook && (
        <BookModal
          book={selBook}
          reviews={reviews}
          wishlist={wishlist}
          onClose={() => setSelBook(null)}
          onRefresh={refresh}
          onAuthRequired={() => { setSelBook(null); setShowAuth('login') }}
        />
      )}
      {showAuth && <AuthModal initialMode={showAuth} onClose={() => setShowAuth(null)} />}
    </div>
  )
}