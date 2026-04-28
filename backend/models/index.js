// models/index.js
const { pool } = require("../db");

// ---------- ReviewModel ----------
const ReviewModel = {
  async findByBook(bookId) {
    const { rows } = await pool.query(
      `SELECT rv.*, u.name as user_name
      FROM reviews rv JOIN users u ON rv.user_id = u.id
      WHERE rv.book_id = $1
      ORDER BY rv.created_at DESC`,
      [bookId]
    );
    return rows;
  },

  async findByUserAndBook(userId, bookId) {
    const { rows } = await pool.query(
      "SELECT * FROM reviews WHERE user_id = $1 AND book_id = $2",
      [userId, bookId]
    );
    return rows[0];
  },

  async upsert(userId, bookId, rating, comment) {
    const existing = await this.findByUserAndBook(userId, bookId);
    if (existing) {
      await pool.query(
        "UPDATE reviews SET rating = $1, comment = $2 WHERE user_id = $3 AND book_id = $4",
        [rating, comment, userId, bookId]
      );
    } else {
      await pool.query(
        "INSERT INTO reviews (user_id, book_id, rating, comment) VALUES ($1, $2, $3, $4)",
        [userId, bookId, rating, comment]
      );
    }
    return this.findByUserAndBook(userId, bookId);
  },
};

// ---------- WishlistModel ----------
const WishlistModel = {
  async findByUser(userId) {
    const { rows } = await pool.query(
      `SELECT
        w.*,
        b.title,
        b.author,
        b.genre,
        b.year,
        b.cover_emoji,
        b.cover_url,
        b.google_books_id,
        b.available,
        ROUND(AVG(r.rating), 1) as avg_rating
      FROM wishlist w
      JOIN books b ON w.book_id = b.id
      LEFT JOIN reviews r ON r.book_id = b.id
      WHERE w.user_id = $1
      GROUP BY w.id, b.id
      ORDER BY w.added_at DESC`,
      [userId]
    );
    return rows;
  },

  async findEntry(userId, bookId) {
    const { rows } = await pool.query(
      "SELECT * FROM wishlist WHERE user_id = $1 AND book_id = $2",
      [userId, bookId]
    );
    return rows[0];
  },

  async add(userId, bookId) {
    try {
      await pool.query(
        "INSERT INTO wishlist (user_id, book_id) VALUES ($1, $2)",
        [userId, bookId]
      );
      return true;
    } catch {
      return false;
    }
  },

  async remove(userId, bookId) {
    await pool.query(
      "DELETE FROM wishlist WHERE user_id = $1 AND book_id = $2",
      [userId, bookId]
    );
  },
};

module.exports = { ReviewModel, WishlistModel };