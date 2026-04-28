// backend/db.js
const { Pool } = require('pg');
const { runGenreBalance } = require('./services/genreBalance');
const { runDedupeBooks, runDeleteBooksWithoutCover } = require('./services/dedupeBooks');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

pool.on('connect', () => console.log('✅ PostgreSQL connected'));
pool.on('error', (err) => console.error('Unexpected PostgreSQL error', err));

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table with role
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          TEXT DEFAULT 'user',
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Books table
    await client.query(`
      CREATE TABLE IF NOT EXISTS books (
        id            SERIAL PRIMARY KEY,
        title         TEXT NOT NULL,
        author        TEXT NOT NULL,
        genre         TEXT NOT NULL,
        year          INTEGER,
        cover_emoji   TEXT DEFAULT '📖',
        description   TEXT,
        available     BOOLEAN DEFAULT TRUE,
        donated_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_donation   BOOLEAN DEFAULT FALSE,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add cover_url column if not exists
    await client.query(`
      ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT;
    `);

    // Add google_books_id column if not exists
    await client.query(`
      ALTER TABLE books ADD COLUMN IF NOT EXISTS google_books_id TEXT;
    `);

    // Constraints / indexes to keep data sane (idempotent).
    // Use NOT VALID to avoid failing on old bad rows; then try to validate.
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_title_not_blank') THEN
          ALTER TABLE books
            ADD CONSTRAINT books_title_not_blank
            CHECK (btrim(title) <> '') NOT VALID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_author_not_blank') THEN
          ALTER TABLE books
            ADD CONSTRAINT books_author_not_blank
            CHECK (btrim(author) <> '') NOT VALID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_genre_not_blank') THEN
          ALTER TABLE books
            ADD CONSTRAINT books_genre_not_blank
            CHECK (btrim(genre) <> '') NOT VALID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_year_reasonable') THEN
          ALTER TABLE books
            ADD CONSTRAINT books_year_reasonable
            CHECK (year IS NULL OR (year BETWEEN -3000 AND 2100)) NOT VALID;
        END IF;
      END$$;
    `);

    // Helpful index for fast "same title+author" checks (dedupe / admin).
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_books_norm_title_author
      ON books (lower(btrim(title)), lower(btrim(author)));
    `);

    // Rentals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rentals (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        rented_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        due_date    TIMESTAMP NOT NULL,
        returned    BOOLEAN DEFAULT FALSE,
        returned_at TIMESTAMP
      );
    `);

    // Reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        comment     TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id)
      );
    `);

    // Wishlist table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        added_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id)
      );
    `);

    // Reservations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notified    BOOLEAN DEFAULT FALSE,
        cancelled   BOOLEAN DEFAULT FALSE,
        UNIQUE(user_id, book_id)
      );
    `);

    // Weekly trends event tables (calendar week starts Monday in Postgres date_trunc('week', ...)).
    await client.query(`
      CREATE TABLE IF NOT EXISTS book_views (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        week_start DATE    NOT NULL,
        viewed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id, week_start)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_book_views_week_start ON book_views (week_start);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS wishlist_events (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        action     TEXT    NOT NULL CHECK (action IN ('add', 'remove')),
        week_start DATE    NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_wishlist_events_week_start ON wishlist_events (week_start);
    `);

    // Audit log (admin actions etc.)
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action     TEXT NOT NULL,
        entity     TEXT NOT NULL,
        entity_id  INTEGER,
        meta       JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
    `);

    // Удаляем таблицу donations, если она существует (опционально)
    await client.query(`
      DROP TABLE IF EXISTS donations;
    `);

    const delPlaceholders = await client.query(`
      DELETE FROM books
      WHERE author = 'Сборник'
        AND (
          title ~ '^Сатира [0-9]+$'
          OR title ~ '^Пьеса [0-9]+$'
          OR title ~ '^Поэма [0-9]+$'
          OR title = 'Искупление'
        )
    `);
    if (delPlaceholders.rowCount > 0) {
      console.log(`🗑️ Удалены фиктивные книги (Сборник + нумерация): ${delPlaceholders.rowCount}`);
    }

    // Начальный сид без cover_url отключён — в каталоге только книги с обложкой
    // (genreBalance при старте, coverBackfill, админка; без обложек — удаление при init).

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }

  // Validate constraints if possible (won't block startup if old rows are bad).
  try {
    await pool.query(`ALTER TABLE books VALIDATE CONSTRAINT books_title_not_blank`);
    await pool.query(`ALTER TABLE books VALIDATE CONSTRAINT books_author_not_blank`);
    await pool.query(`ALTER TABLE books VALIDATE CONSTRAINT books_genre_not_blank`);
    await pool.query(`ALTER TABLE books VALIDATE CONSTRAINT books_year_reasonable`);
  } catch (e) {
    console.warn('Constraint validation warning:', e?.message || e);
  }

  try {
    await runGenreBalance(pool);
  } catch {
    // лог уже в runGenreBalance
  }

  try {
    await runDedupeBooks(pool);
  } catch (e) {
    console.warn('dedupeBooks:', e?.message || e);
  }

  try {
    await runGenreBalance(pool);
  } catch {
    // повторная балансировка после слияния дубликатов
  }

  try {
    await runDeleteBooksWithoutCover(pool);
  } catch (e) {
    console.warn('deleteBooksWithoutCover:', e?.message || e);
  }

  // Enforce uniqueness of normalized title+author (after dedupe).
  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_books_norm_title_author
      ON books (lower(btrim(title)), lower(btrim(author)));
    `);
  } catch (e) {
    console.warn('Unique index warning (duplicates remain?):', e?.message || e);
  }
}

module.exports = { pool, initDb };