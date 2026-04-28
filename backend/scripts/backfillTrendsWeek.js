// One-time backfill for weekly trends (wishlist net growth).
const { pool } = require("../db");

async function main() {
  // Ensure DB is initialized (tables exist)
  // eslint-disable-next-line no-unused-vars
  const { initDb } = require("../db");
  await initDb();

  const { rowCount } = await pool.query(`
    INSERT INTO wishlist_events (user_id, book_id, action, week_start, created_at)
    SELECT w.user_id, w.book_id, 'add', date_trunc('week', now())::date, now()
    FROM wishlist w
    WHERE NOT EXISTS (
      SELECT 1
      FROM wishlist_events e
      WHERE e.user_id = w.user_id
        AND e.book_id = w.book_id
        AND e.action = 'add'
        AND e.week_start = date_trunc('week', now())::date
    )
  `);

  console.log(`✅ Backfilled wishlist_events(add) for current week: ${rowCount}`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await pool.end(); } catch {}
  });

