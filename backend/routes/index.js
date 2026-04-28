// routes/index.js — all route definitions
const router = require("express").Router();
const auth   = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

// Для проверки «сервер поднялся» (CI, скрипты, ручной дымовой тест)
router.get("/health", (req, res) => {
  res.json({ ok: true, service: "biblioteka-api" });
});

const AuthController    = require("../controllers/AuthController");
const BookController    = require("../controllers/BookController");
const AdminBookController = require("../controllers/AdminBookController");
const AdminReviewController = require("../controllers/AdminReviewController");
const AdminAnalyticsController = require("../controllers/AdminAnalyticsController");
const { ReviewController, WishlistController, UserController } = require("../controllers/index");

// ── Auth ─────────────────────────────────────────────────────────────────────
router.post  ("/auth/register",    AuthController.register);
router.post  ("/auth/login",       AuthController.login);
router.get   ("/auth/me",    auth, AuthController.me);

// ── Books ────────────────────────────────────────────────────────────────────
router.get   ("/books",            BookController.list);
router.get   ("/books/genres",     BookController.genres);
router.get   ("/books/stats",      BookController.stats);
router.get   ("/books/trends/week", BookController.trendsWeek);
router.get   ("/books/:id",        BookController.detail);
router.post  ("/books/:id/view",   auth, BookController.trackView);

// ── Reviews ──────────────────────────────────────────────────────────────────
router.get   ("/reviews/:bookId",       BookController.detail);
router.post  ("/reviews/:bookId", auth, ReviewController.upsert);
router.get   ("/reviews/book/:bookId",  ReviewController.forBook);

// ── Wishlist ─────────────────────────────────────────────────────────────────
router.get   ("/wishlist",              auth, WishlistController.list);
router.post  ("/wishlist/:bookId/toggle", auth, WishlistController.toggle);
router.get   ("/wishlist/:bookId/check",  auth, WishlistController.check);

// ── Users/Profile ────────────────────────────────────────────────────────────
router.get   ("/users/me", auth, UserController.me);
router.get   ("/users/:id", UserController.publicProfile);

// ── Admin (только для администраторов) ──────────────────────────────────────
router.get   ("/admin/books",        auth, requireRole(["admin"]), AdminBookController.getAll);
router.get   ("/admin/books/:id",    auth, requireRole(["admin"]), AdminBookController.getOne);
router.post  ("/admin/books",        auth, requireRole(["admin"]), AdminBookController.create);
router.put   ("/admin/books/:id",    auth, requireRole(["admin"]), AdminBookController.update);
router.delete("/admin/books/:id",    auth, requireRole(["admin"]), AdminBookController.delete);

router.get   ("/admin/reviews",      auth, requireRole(["admin"]), AdminReviewController.list);
router.delete("/admin/reviews/:id",  auth, requireRole(["admin"]), AdminReviewController.delete);

router.get   ("/admin/analytics/overview", auth, requireRole(["admin"]), AdminAnalyticsController.overview);

module.exports = router;