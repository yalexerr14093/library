import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWishlist } from '../hooks/useWishlist.js'
import { useToast } from '../context/ToastContext.jsx'
import CoverThumb from '../components/CoverThumb.jsx'
import styles from './WishlistPage.module.css'

export default function WishlistPage() {
  const navigate      = useNavigate()
  const { showToast } = useToast()
  const { items, toggle } = useWishlist()

  const handleRemove = async (bookId, title) => {
    await toggle(bookId)
    showToast(`«${title}» удалена из избранного`, 'i')
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Избранное</h1>
        <span className={styles.count}>{items.length} книг</span>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <div>🔖</div>
          <h3>Избранное пусто</h3>
          <p>Нажимайте 🤍 на карточках книг, чтобы сохранить</p>
          <button className={styles.emptyBtn} onClick={() => navigate('/')}>В каталог</button>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((w, i) => (
            <div className={styles.row} key={w.id} style={{ animationDelay: `${i * .05}s` }}>
              <div className={styles.cover}>
                <CoverThumb
                  title={w.title}
                  cover_url={w.cover_url}
                  cover_emoji={w.cover_emoji}
                  imgClassName={styles.coverImg}
                  emojiClassName={styles.coverEmoji}
                />
              </div>
              <div className={styles.info}>
                <div className={styles.rTitle}>{w.title}</div>
                <div className={styles.rAuthor}>{w.author} · {w.year}</div>
                {w.avg_rating && (
                  <div className={styles.rating}>{'★'.repeat(Math.round(w.avg_rating))} {w.avg_rating}</div>
                )}
              </div>
              <button className={styles.trashBtn} onClick={() => handleRemove(w.book_id, w.title)} title="Удалить из избранного">🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
