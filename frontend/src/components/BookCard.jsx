import { useAuth } from '../context/AuthContext.jsx'
import { avgRating } from '../utils/dateUtils.js'
import { apiStaticOrigin } from '../api/env.js'
import styles from './BookCard.module.css'

const API_URL = apiStaticOrigin()

export default function BookCard({ book, reviews = [], isWishlisted, onOpen, onToggleWish }) {
  const { user } = useAuth()
  const avg = avgRating(reviews.filter(r => r.book_id === book.id))

  const statusLabel = 'Онлайн'
  const statusClass = styles.bbOk

  // Формируем правильный URL для обложки
  const getCoverUrl = () => {
    if (!book.cover_url) return null;
    if (book.cover_url.startsWith('/uploads/')) {
      return `${API_URL}${book.cover_url}`;
    }
    return book.cover_url; // для внешних ссылок (Google Books и т.д.)
  };

  const coverUrl = getCoverUrl();

  return (
    <div className={styles.card} onClick={() => onOpen(book)}>
      <div className={styles.cover}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={book.title}
            className={styles.coverImg}
            onError={(e) => {
              e.target.onerror = null
              e.target.style.display = 'none'
              const parent = e.target.parentNode
              const emoji = document.createElement('span')
              emoji.className = styles.coverEmoji
              emoji.textContent = book.cover_emoji || '📖'
              parent.appendChild(emoji)
            }}
          />
        ) : (
          <span className={styles.coverEmoji}>{book.cover_emoji || '📖'}</span>
        )}
      </div>

      {/* Бейджи (поверх обложки) */}
      <span className={`${styles.badge} ${statusClass}`}>{statusLabel}</span>
      {book.is_donation && <span className={styles.donationBadge}>📦 дар читателя</span>}

      {/* Кнопка избранного и год (поверх обложки) */}
      <div className={styles.topActions}>
        <span className={styles.year}>{book.year}</span>
        {user && (
          <button
            className={`${styles.wishBtn} ${isWishlisted ? styles.wishlisted : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleWish(book.id) }}
            title={isWishlisted ? 'Убрать из избранного' : 'В избранное'}
          >
            {isWishlisted ? '❤️' : '🤍'}
          </button>
        )}
      </div>

      {/* Нижняя панель с информацией (выезжает при наведении) */}
      <div className={styles.infoPanel}>
        <div className={styles.title}>{book.title}</div>
        <div className={styles.moreInfo}>
          <div className={styles.author}>{book.author}</div>
          <div className={styles.genre}>{book.genre}</div>
          {avg && (
            <div className={styles.rating}>
              <span className={styles.stars}>{'★'.repeat(Math.round(avg))}</span>
              <span className={styles.ratingCount}>({reviews.filter(r => r.book_id === book.id).length})</span>
            </div>
          )}
          <div className={styles.description}>{book.description}</div>
        </div>
      </div>
    </div>
  )
}