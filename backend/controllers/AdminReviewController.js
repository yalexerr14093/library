const { pool } = require("../db");
const AuditLogModel = require("../models/AuditLogModel");

const AdminReviewController = {
  async list(req, res) {
    try {
      const { q = "", limit = 100, offset = 0 } = req.query;
      const lim = Math.min(parseInt(limit) || 100, 300);
      const off = Math.max(parseInt(offset) || 0, 0);

      const params = [];
      let where = "";
      if (q && String(q).trim()) {
        params.push(`%${String(q).trim()}%`);
        where = `WHERE (u.name ILIKE $1 OR b.title ILIKE $1 OR rv.comment ILIKE $1)`;
      }

      const sql = `
        SELECT
          rv.id,
          rv.user_id,
          rv.book_id,
          rv.rating,
          rv.comment,
          rv.created_at,
          u.name as user_name,
          u.created_at as user_created_at,
          b.title as book_title,
          b.author as book_author
        FROM reviews rv
        JOIN users u ON u.id = rv.user_id
        JOIN books b ON b.id = rv.book_id
        ${where}
        ORDER BY rv.created_at DESC
        LIMIT ${params.length ? "$2" : "$1"} OFFSET ${params.length ? "$3" : "$2"}
      `;

      if (params.length) params.push(lim, off);
      else params.push(lim, off);

      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения отзывов" });
    }
  },

  async delete(req, res) {
    try {
      const id = parseInt(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "Некорректный id" });

      const { rows: beforeRows } = await pool.query(
        `SELECT rv.id, rv.user_id, rv.book_id, rv.rating, rv.comment
         FROM reviews rv
         WHERE rv.id = $1`,
        [id]
      );
      const before = beforeRows[0] || null;

      const { rowCount } = await pool.query("DELETE FROM reviews WHERE id = $1", [id]);
      if (!rowCount) return res.status(404).json({ error: "Отзыв не найден" });

      await AuditLogModel.write({
        userId: req.user?.id ?? null,
        action: "delete",
        entity: "review",
        entityId: id,
        meta: before,
      });

      res.json({ message: "Отзыв удалён" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка удаления отзыва" });
    }
  },
};

module.exports = AdminReviewController;

