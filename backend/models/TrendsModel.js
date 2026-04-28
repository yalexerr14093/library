const { pool } = require("../db");

function thisWeekStartSql() {
  return `date_trunc('week', now())::date`;
}

const TrendsModel = {
  async weekOverview({ limit = 5 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit) || 5, 1), 20);

    const weekStartExpr = thisWeekStartSql();

    const [views, discussed, wishlisted] = await Promise.all([
      pool.query(
        `
        SELECT
          b.id, b.title, b.author, b.genre, b.year, b.cover_emoji, b.cover_url, b.google_books_id,
          ROUND(AVG(r.rating), 1) as avg_rating,
          COUNT(r.id) as review_count,
          COUNT(v.id)::int as views
        FROM book_views v
        JOIN books b ON b.id = v.book_id
        LEFT JOIN reviews r ON r.book_id = b.id
        WHERE v.week_start = ${weekStartExpr}
        GROUP BY b.id
        ORDER BY views DESC, b.title ASC
        LIMIT $1
        `,
        [lim]
      ),
      pool.query(
        `
        SELECT
          b.id, b.title, b.author, b.genre, b.year, b.cover_emoji, b.cover_url, b.google_books_id,
          ROUND(AVG(r_all.rating), 1) as avg_rating,
          COUNT(r_all.id) as review_count,
          COUNT(DISTINCT r_week.user_id)::int as unique_reviewers
        FROM reviews r_week
        JOIN books b ON b.id = r_week.book_id
        LEFT JOIN reviews r_all ON r_all.book_id = b.id
        WHERE r_week.created_at >= ${weekStartExpr}
          AND r_week.created_at < (${weekStartExpr} + interval '7 days')
        GROUP BY b.id
        ORDER BY unique_reviewers DESC, b.title ASC
        LIMIT $1
        `,
        [lim]
      ),
      pool.query(
        `
        SELECT
          b.id, b.title, b.author, b.genre, b.year, b.cover_emoji, b.cover_url, b.google_books_id,
          ROUND(AVG(r.rating), 1) as avg_rating,
          COUNT(r.id) as review_count,
          SUM(CASE WHEN e.action = 'add' THEN 1 ELSE -1 END)::int as net_wishlisted
        FROM wishlist_events e
        JOIN books b ON b.id = e.book_id
        LEFT JOIN reviews r ON r.book_id = b.id
        WHERE e.week_start = ${weekStartExpr}
        GROUP BY b.id
        HAVING SUM(CASE WHEN e.action = 'add' THEN 1 ELSE -1 END) > 0
        ORDER BY net_wishlisted DESC, b.title ASC
        LIMIT $1
        `,
        [lim]
      ),
    ]);

    return {
      weekStart: null, // frontend doesn't need exact date; can add later
      views: views.rows,
      discussed: discussed.rows,
      wishlisted: wishlisted.rows,
    };
  },

  async trackView({ userId, bookId }) {
    await pool.query(
      `
      INSERT INTO book_views (user_id, book_id, week_start)
      VALUES ($1, $2, ${thisWeekStartSql()})
      ON CONFLICT (user_id, book_id, week_start) DO NOTHING
      `,
      [userId, bookId]
    );
  },
};

module.exports = TrendsModel;

