// controllers/index.js
const { pool } = require("../db");
const { ReviewModel, WishlistModel } = require("../models/index");
const BookModel = require("../models/BookModel");
const fetchCoverFromGoogle = require('../utils/fetchCover');
const UserModel = require("../models/UserModel");

const ReviewController = {
  async forBook(req, res) {
    try {
      const reviews = await ReviewModel.findByBook(req.params.bookId);
      res.json(reviews);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения отзывов" });
    }
  },

  async upsert(req, res) {
    try {
      const { rating, comment = "" } = req.body;
      const bookId = parseInt(req.params.bookId);
      if (!rating || rating < 1 || rating > 5)
        return res.status(400).json({ error: "Оценка от 1 до 5" });

      const review = await ReviewModel.upsert(req.user.id, bookId, rating, comment.trim());
      res.status(201).json(review);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка сохранения отзыва" });
    }
  },
};

const WishlistController = {
  async list(req, res) {
    try {
      const items = await WishlistModel.findByUser(req.user.id);
      res.json(items);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения избранного" });
    }
  },

  async toggle(req, res) {
    try {
      const bookId = parseInt(req.params.bookId);
      const existing = await WishlistModel.findEntry(req.user.id, bookId);
      if (existing) {
        await WishlistModel.remove(req.user.id, bookId);
        await pool.query(
          `INSERT INTO wishlist_events (user_id, book_id, action, week_start)
           VALUES ($1, $2, 'remove', date_trunc('week', now())::date)`,
          [req.user.id, bookId]
        );
        res.json({ wishlisted: false });
      } else {
        await WishlistModel.add(req.user.id, bookId);
        await pool.query(
          `INSERT INTO wishlist_events (user_id, book_id, action, week_start)
           VALUES ($1, $2, 'add', date_trunc('week', now())::date)`,
          [req.user.id, bookId]
        );
        res.json({ wishlisted: true });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка изменения избранного" });
    }
  },

  async check(req, res) {
    try {
      const entry = await WishlistModel.findEntry(req.user.id, parseInt(req.params.bookId));
      res.json({ wishlisted: !!entry });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка проверки избранного" });
    }
  },
};

const UserController = {
  async me(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "Не найден" });
      const [stats, read] = await Promise.all([
        UserModel.getStats(req.user.id),
        UserModel.getReadBooks(req.user.id),
      ]);
      res.json({ ...user, stats, read });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения профиля" });
    }
  },

  async publicProfile(req, res) {
    try {
      const userId = parseInt(req.params.id);
      if (!Number.isFinite(userId)) return res.status(400).json({ error: "Некорректный id" });

      const user = await UserModel.findPublicById(userId);
      if (!user) return res.status(404).json({ error: "Пользователь не найден" });

      const [stats, read, reviews] = await Promise.all([
        UserModel.getStats(userId),
        UserModel.getReadBooks(userId),
        UserModel.getUserReviews(userId),
      ]);

      res.json({ ...user, stats, read, reviews });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения профиля" });
    }
  },
};

module.exports = { ReviewController, WishlistController, UserController };