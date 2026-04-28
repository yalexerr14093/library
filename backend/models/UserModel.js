// models/UserModel.js
const { pool } = require("../db");

class UserModel {
  static async findByEmail(email) {
    const { rows } = await pool.query(
      "SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = $1",
      [email]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
      [id]
    );
    return rows[0];
  }

  static async findPublicById(id) {
    const { rows } = await pool.query(
      "SELECT id, name, role, created_at FROM users WHERE id = $1",
      [id]
    );
    return rows[0];
  }

  static async create({ name, email, passwordHash }) {
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'user') RETURNING id, name, email, role, created_at",
      [name, email, passwordHash]
    );
    return rows[0];
  }

  static async getStats(userId) {
    const [reviews, wishlisted] = await Promise.all([
      pool.query("SELECT COUNT(*) as c FROM reviews WHERE user_id = $1", [userId]),
      pool.query("SELECT COUNT(*) as c FROM wishlist WHERE user_id = $1", [userId]),
    ]);
    return {
      reviews: parseInt(reviews.rows[0].c),
      wishlisted: parseInt(wishlisted.rows[0].c),
      read: parseInt(reviews.rows[0].c),
    };
  }

  static async getReadBooks(userId) {
    const { rows } = await pool.query(
      `SELECT
        b.id,
        b.title,
        b.author,
        b.genre,
        b.year,
        b.cover_emoji,
        b.cover_url,
        b.google_books_id,
        rv.rating,
        rv.comment,
        rv.created_at as reviewed_at
      FROM reviews rv
      JOIN books b ON b.id = rv.book_id
      WHERE rv.user_id = $1
      ORDER BY rv.created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async getUserReviews(userId) {
    const { rows } = await pool.query(
      `SELECT
        rv.id,
        rv.book_id,
        rv.user_id,
        rv.rating,
        rv.comment,
        rv.created_at,
        b.title,
        b.author,
        b.genre,
        b.year,
        b.cover_emoji,
        b.cover_url,
        b.google_books_id
      FROM reviews rv
      JOIN books b ON b.id = rv.book_id
      WHERE rv.user_id = $1
      ORDER BY rv.created_at DESC`,
      [userId]
    );
    return rows;
  }
}

module.exports = UserModel;