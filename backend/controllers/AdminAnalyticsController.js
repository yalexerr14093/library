const { pool } = require("../db");

function daysBackRange(days) {
  const d = Math.max(parseInt(days) || 30, 1);
  return Math.min(d, 365);
}

const AdminAnalyticsController = {
  async overview(req, res) {
    try {
      const days = daysBackRange(req.query.days);

      const [
        usersTotal,
        booksTotal,
        reviewsTotal,
        usersDaily,
        reviewsDaily,
        topBooksByReviews,
        genreDistribution,
      ] = await Promise.all([
        pool.query("SELECT COUNT(*)::int as c FROM users"),
        pool.query("SELECT COUNT(*)::int as c FROM books"),
        pool.query("SELECT COUNT(*)::int as c FROM reviews"),

        pool.query(
          `SELECT to_char(d::date, 'YYYY-MM-DD') as date, COALESCE(x.c, 0)::int as count
           FROM generate_series(current_date - ($1::int - 1), current_date, interval '1 day') d
           LEFT JOIN (
             SELECT date_trunc('day', created_at)::date as day, COUNT(*) as c
             FROM users
             WHERE created_at >= current_date - ($1::int - 1)
             GROUP BY day
           ) x ON x.day = d::date
           ORDER BY date`,
          [days]
        ),

        pool.query(
          `SELECT to_char(d::date, 'YYYY-MM-DD') as date, COALESCE(x.c, 0)::int as count
           FROM generate_series(current_date - ($1::int - 1), current_date, interval '1 day') d
           LEFT JOIN (
             SELECT date_trunc('day', created_at)::date as day, COUNT(*) as c
             FROM reviews
             WHERE created_at >= current_date - ($1::int - 1)
             GROUP BY day
           ) x ON x.day = d::date
           ORDER BY date`,
          [days]
        ),

        pool.query(
          `SELECT
             b.id,
             b.title,
             b.author,
             COUNT(rv.id)::int as review_count,
             ROUND(AVG(rv.rating), 2) as avg_rating
           FROM books b
           JOIN reviews rv ON rv.book_id = b.id
           GROUP BY b.id
           ORDER BY review_count DESC, avg_rating DESC
           LIMIT 10`
        ),

        pool.query(
          `SELECT b.genre as genre, COUNT(*)::int as count
           FROM books b
           GROUP BY b.genre
           ORDER BY count DESC`
        ),
      ]);

      res.json({
        days,
        totals: {
          users: usersTotal.rows[0].c,
          books: booksTotal.rows[0].c,
          reviews: reviewsTotal.rows[0].c,
        },
        usersDaily: usersDaily.rows,
        reviewsDaily: reviewsDaily.rows,
        topBooksByReviews: topBooksByReviews.rows,
        genreDistribution: genreDistribution.rows,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения аналитики" });
    }
  },
};

module.exports = AdminAnalyticsController;

