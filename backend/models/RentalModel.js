// models/RentalModel.js
const { pool } = require("../db");

class RentalModel {
  static async findActiveByUser(userId) {
    const { rows } = await pool.query(
      `SELECT r.*, b.title, b.author, b.genre, b.cover_emoji, b.year
      FROM rentals r JOIN books b ON r.book_id = b.id
      WHERE r.user_id = $1 AND r.returned = FALSE
      ORDER BY r.rented_at DESC`,
      [userId]
    );
    return rows;
  }

  static async findAllByUser(userId) {
    const { rows } = await pool.query(
      `SELECT r.*, b.title, b.author, b.genre, b.cover_emoji, b.year
      FROM rentals r JOIN books b ON r.book_id = b.id
      WHERE r.user_id = $1
      ORDER BY r.rented_at DESC`,
      [userId]
    );
    return rows;
  }

  static async findActiveByUserAndBook(userId, bookId) {
    const { rows } = await pool.query(
      "SELECT * FROM rentals WHERE user_id = $1 AND book_id = $2 AND returned = FALSE",
      [userId, bookId]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await pool.query("SELECT * FROM rentals WHERE id = $1", [id]);
    return rows[0];
  }

  static async create(userId, bookId, dueDate) {
    const { rows } = await pool.query(
      "INSERT INTO rentals (user_id, book_id, due_date) VALUES ($1, $2, $3) RETURNING id",
      [userId, bookId, dueDate]
    );
    return rows[0].id;
  }

  static async markReturned(id) {
    await pool.query(
      "UPDATE rentals SET returned = TRUE, returned_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );
  }

  static async hasReturned(userId, bookId) {
    const { rows } = await pool.query(
      "SELECT id FROM rentals WHERE user_id = $1 AND book_id = $2 AND returned = TRUE",
      [userId, bookId]
    );
    return rows.length > 0;
  }
}

module.exports = RentalModel;