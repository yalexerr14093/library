// controllers/BookController.js
const BookModel = require("../models/BookModel");
const { ReviewModel } = require("../models/index");
const { pool } = require("../db");
const TrendsModel = require("../models/TrendsModel");

const BookController = {
  async list(req, res) {
    try {
      const {
        search = "",
        genre = "",
        sort = "title",
        order = "asc",
        page = 1,
        limit = 12,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(60, Math.max(1, parseInt(limit) || 12));
      const offset = (pageNum - 1) * limitNum;

      const books = await BookModel.findAllWithPagination({
        search,
        genre,
        sort,
        order,
        limit: limitNum,
        offset,
      });
      const total = await BookModel.count({ search, genre });
      res.json({
        data: books,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения списка книг" });
    }
  },

  async detail(req, res) {
    try {
      const book = await BookModel.findById(req.params.id);
      if (!book) return res.status(404).json({ error: "Книга не найдена" });
      const reviews = await ReviewModel.findByBook(book.id);
      res.json({ ...book, reviews });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения книги" });
    }
  },

  async genres(req, res) {
    try {
      const genres = await BookModel.getGenres();
      res.json(genres);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения жанров" });
    }
  },

  async stats(req, res) {
    try {
      const totalResult = await pool.query('SELECT COUNT(*) as total FROM books');
      const donatedResult = await pool.query('SELECT COUNT(*) as donated FROM books WHERE is_donation = true');
      res.json({
        total: parseInt(totalResult.rows[0].total),
        donated: parseInt(donatedResult.rows[0].donated),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения статистики" });
    }
  },

  async trendsWeek(req, res) {
    try {
      const data = await TrendsModel.weekOverview({ limit: 5 });
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения трендов" });
    }
  },

  async trackView(req, res) {
    try {
      const bookId = parseInt(req.params.id);
      if (!Number.isFinite(bookId)) return res.status(400).json({ error: "Некорректный id" });
      await TrendsModel.trackView({ userId: req.user.id, bookId });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка записи просмотра" });
    }
  },
};

module.exports = BookController;