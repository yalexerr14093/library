import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal.jsx'
import StarPicker from './StarPicker.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { reviewsApi } from '../api/reviewsApi.js'
import { wishlistApi } from '../api/wishlistApi.js'
import { starsStr, avgRating } from '../utils/dateUtils.js'
import styles from './BookModal.module.css'

import { apiStaticOrigin } from '../api/env.js'

const API_URL = apiStaticOrigin()

export default function BookModal({ book, reviews, wishlist, onClose, onRefresh, onAuthRequired }) {
  const { user, token } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [showReader, setShowReader] = useState(false)

  const bookReviews = useMemo(() => reviews.filter(r => r.book_id === book.id), [reviews, book.id])
  const isWishlisted = useMemo(() => wishlist.some(w => w.book_id === book.id), [wishlist, book.id])
  const myReview = useMemo(
    () => bookReviews.find(r => r.user_id === user?.id),
    [bookReviews, user?.id]
  )
  const avg = useMemo(() => avgRating(bookReviews), [bookReviews])

  const getCoverUrl = () => {
    if (!book.cover_url) return null;
    if (book.cover_url.startsWith('/uploads/')) {
      return `${API_URL}${book.cover_url}`;
    }
    return book.cover_url;
  };

  const coverUrl = getCoverUrl();

  // Pre-fill existing review
  useEffect(() => {
    if (!myReview) { setRating(0); setComment(''); return }
    setRating(myReview.rating)
    setComment(myReview.comment || '')
  }, [myReview])

  const withAuth = (fn) => () => user ? fn() : onAuthRequired()

  const handleToggleWish = withAuth(async () => {
    try {
      const res = await wishlistApi.toggle(book.id, token)
      showToast(res.wishlisted ? 'Добавлено в избранное 🔖' : 'Удалено из избранного', 'i')
      onRefresh()
    } catch (e) { showToast(e.message, 'e') }
  })

  const handleReview = async () => {
    if (!rating) return showToast('Выберите оценку', 'e')
    try {
      await reviewsApi.upsert(book.id, { rating, comment }, token)
      showToast('Отзыв сохранён ⭐')
      onRefresh()
    } catch (e) { showToast(e.message, 'e') }
  }

  return (
    <Modal onClose={onClose} maxWidth={showReader ? 800 : 560}>
      {!showReader ? (
        <>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.cover}>
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={book.title}
                  className={styles.modalCoverImg}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    const parent = e.target.parentNode;
                    const emoji = document.createElement('span');
                    emoji.textContent = book.cover_emoji || '📖';
                    parent.appendChild(emoji);
                  }}
                />
              ) : (
                <span>{book.cover_emoji || '📖'}</span>
              )}
            </div>
            <div className={styles.info}>
              <h2 className={styles.title}>{book.title}</h2>
              <div className={styles.author}>{book.author} · {book.year}</div>
              <div className={styles.tags}>
                <span className={styles.tag}>{book.genre}</span>
                {book.is_donation && <span className={`${styles.tag} ${styles.donTag}`}>📦 Буккроссинг</span>}
                {avg && <span className={`${styles.tag} ${styles.ratingTag}`}>★ {avg}</span>}
              </div>
              <button className={styles.wishInline} onClick={handleToggleWish}>
                {isWishlisted ? '❤️ В избранном' : '🤍 В избранное'}
              </button>
            </div>
          </div>

          <p className={styles.desc}>{book.description}</p>

          {/* Google Books Reader Button */}
          {book.google_books_id && (
            <button
              className={`${styles.btn} ${styles.btnGold}`}
              onClick={() => setShowReader(true)}
            >
              📖 Читать онлайн
            </button>
          )}

          {/* Reviews list */}
          {bookReviews.length > 0 && (
            <div className={styles.reviewsSection}>
              <div className={styles.divider} />
              <div className={styles.reviewsTitle}>
                Отзывы читателей {avg && <span className={styles.avgBadge}>★ {avg} ({bookReviews.length})</span>}
              </div>
              {bookReviews.slice(0, 3).map(rv => (
                <div key={rv.id} className={styles.reviewCard}>
                  <div className={styles.rvHead}>
                    <button
                      type="button"
                      className={styles.rvNameBtn}
                      onClick={() => { onClose(); navigate(`/users/${rv.user_id}`) }}
                      title="Открыть профиль"
                    >
                      {rv.user_name}
                    </button>
                    <span className={styles.rvStars}>{starsStr(rv.rating)}</span>
                  </div>
                  {rv.comment && <div className={styles.rvText}>{rv.comment}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Leave review */}
          {user && (
            <>
              <div className={styles.divider} />
              <div className={styles.reviewFormTitle}>{myReview ? 'Ваш отзыв' : 'Оставить отзыв'}</div>
              <StarPicker value={rating} onChange={setRating} />
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Ваши впечатления (необязательно)…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button className={`${styles.btn} ${styles.btnGold}`} onClick={handleReview}>
                {myReview ? 'Обновить отзыв' : 'Опубликовать отзыв'}
              </button>
            </>
          )}
        </>
      ) : (
        // Google Books Reader
        <div className={styles.readerContainer}>
          <div className={styles.readerHeader}>
            <span>{book.title} – чтение</span>
            <button onClick={() => setShowReader(false)} className={styles.closeReader}>✕</button>
          </div>
          <iframe
            src={`https://books.google.com/books?id=${book.google_books_id}&pg=PA1&output=embed`}
            width="100%"
            height="600"
            frameBorder="0"
            allowFullScreen
            title={book.title}
          />
        </div>
      )}
    </Modal>
  )
}