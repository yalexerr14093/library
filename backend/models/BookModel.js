// models/BookModel.js
const { pool } = require("../db");
const { MIN_BOOKS_PER_GENRE } = require("../services/genreBalance");

class BookModel {
  static #orderBy(sort, order) {
    const ord = String(order || '').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const s = String(sort || '').toLowerCase();
    switch (s) {
      case 'year':
        return `b.year ${ord} NULLS LAST, b.title ASC`;
      case 'rating':
        return `avg_rating ${ord} NULLS LAST, review_count DESC, b.title ASC`;
      case 'new':
      case 'newest':
        return `b.id ${ord}, b.title ASC`;
      case 'title':
      default:
        return `b.title ${ord}, b.id ASC`;
    }
  }

  static async findAllWithPagination({ search = "", genre = "", sort = "title", order = "asc", limit = 12, offset = 0 } = {}) {
    let sql = `
      SELECT
        b.id,
        b.title,
        b.author,
        b.genre,
        b.year,
        b.cover_emoji,
        b.description,
        b.donated_by,
        b.is_donation,
        b.created_at,
        b.cover_url,
        b.google_books_id,
        ROUND(AVG(r.rating), 1) as avg_rating,
        COUNT(r.id) as review_count
      FROM books b
      LEFT JOIN reviews r ON r.book_id = b.id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      sql += ` AND (b.title ILIKE $${params.length + 1} OR b.author ILIKE $${params.length + 2})`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (genre && genre !== 'Все') {
      sql += ` AND b.genre = $${params.length + 1}`;
      params.push(genre);
    }

    sql += ` GROUP BY b.id ORDER BY ${this.#orderBy(sort, order)}`;
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  static async count({ search = "", genre = "" } = {}) {
    let sql = `SELECT COUNT(*) as total FROM books b WHERE 1=1`;
    const params = [];
    if (search) {
      sql += ` AND (b.title ILIKE $${params.length + 1} OR b.author ILIKE $${params.length + 2})`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (genre && genre !== 'Все') {
      sql += ` AND b.genre = $${params.length + 1}`;
      params.push(genre);
    }
    const { rows } = await pool.query(sql, params);
    return parseInt(rows[0].total);
  }

  static async findDuplicateId(title, author, excludeId = null) {
    const params = [title, author];
    let sql = `
      SELECT id FROM books
      WHERE lower(btrim(title)) = lower(btrim($1)) AND lower(btrim(author)) = lower(btrim($2))`;
    if (excludeId != null) {
      sql += ` AND id <> $3`;
      params.push(excludeId);
    }
    sql += ` LIMIT 1`;
    const { rows } = await pool.query(sql, params);
    return rows[0]?.id ?? null;
  }

  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT
        b.id,
        b.title,
        b.author,
        b.genre,
        b.year,
        b.cover_emoji,
        b.description,
        b.donated_by,
        b.is_donation,
        b.created_at,
        b.cover_url,
        b.google_books_id,
        ROUND(AVG(r.rating), 1) as avg_rating,
        COUNT(r.id) as review_count
      FROM books b
      LEFT JOIN reviews r ON r.book_id = b.id
      WHERE b.id = $1
      GROUP BY b.id`,
      [id]
    );
    return rows[0] || null;
  }

  static async create({ title, author, genre, year, coverEmoji = "📖", description = "", donatedBy = null, isDonation = 0, coverUrl = null, googleBooksId = null }) {
    const { rows } = await pool.query(
      `INSERT INTO books (title, author, genre, year, cover_emoji, description, donated_by, is_donation, cover_url, google_books_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [title, author, genre, year, coverEmoji, description, donatedBy, isDonation, coverUrl, googleBooksId]
    );
    return rows[0];
  }

  static async getGenres() {
    const { rows } = await pool.query(
      `SELECT genre FROM books
       GROUP BY genre
       HAVING COUNT(*) >= $1
       ORDER BY genre`,
      [MIN_BOOKS_PER_GENRE]
    );
    return rows.map(r => r.genre);
  }
}

module.exports = BookModel;