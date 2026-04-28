/**
 * Слияние дубликатов книг: одна пара (название + автор) с учётом регистра и пробелов — одна запись.
 */
async function enrichKeeperFromDuplicate(client, keeperId, dupId) {
  await client.query(
    `UPDATE books AS k
     SET
       cover_url = COALESCE(NULLIF(TRIM(k.cover_url), ''), NULLIF(TRIM(d.cover_url), '')),
       google_books_id = COALESCE(k.google_books_id, d.google_books_id),
       description = CASE
         WHEN LENGTH(TRIM(COALESCE(d.description, ''))) > LENGTH(TRIM(COALESCE(k.description, '')))
         THEN d.description
         ELSE k.description
       END
     FROM books AS d
     WHERE k.id = $1 AND d.id = $2`,
    [keeperId, dupId]
  );
}

async function mergeDuplicateIntoKeeper(client, keeperId, dupId) {
  await enrichKeeperFromDuplicate(client, keeperId, dupId);

  await client.query(
    `DELETE FROM reviews
     WHERE book_id = $1
       AND user_id IN (SELECT user_id FROM reviews WHERE book_id = $2)`,
    [dupId, keeperId]
  );
  await client.query(`UPDATE reviews SET book_id = $1 WHERE book_id = $2`, [keeperId, dupId]);

  await client.query(
    `DELETE FROM wishlist
     WHERE book_id = $1
       AND user_id IN (SELECT user_id FROM wishlist WHERE book_id = $2)`,
    [dupId, keeperId]
  );
  await client.query(`UPDATE wishlist SET book_id = $1 WHERE book_id = $2`, [keeperId, dupId]);

  await client.query(
    `DELETE FROM reservations
     WHERE book_id = $1
       AND user_id IN (SELECT user_id FROM reservations WHERE book_id = $2)`,
    [dupId, keeperId]
  );
  await client.query(`UPDATE reservations SET book_id = $1 WHERE book_id = $2`, [keeperId, dupId]);

  await client.query(
    `DELETE FROM rentals
     WHERE book_id = $1
       AND user_id IN (SELECT user_id FROM rentals WHERE book_id = $2)`,
    [dupId, keeperId]
  );
  await client.query(`UPDATE rentals SET book_id = $1 WHERE book_id = $2`, [keeperId, dupId]);

  await client.query(`DELETE FROM books WHERE id = $1`, [dupId]);
}

/**
 * Находит группы с одинаковым lower(btrim(title)), lower(btrim(author)).
 * Оставляет запись с обложкой, иначе с меньшим id.
 */
async function dedupeBooksOnce(client) {
  const { rows: groups } = await client.query(`
    SELECT array_agg(id ORDER BY
      CASE WHEN cover_url IS NOT NULL AND TRIM(cover_url) <> '' THEN 0 ELSE 1 END,
      id
    ) AS ids
    FROM books
    GROUP BY lower(btrim(title)), lower(btrim(author))
    HAVING COUNT(*) > 1
  `);

  let removed = 0;
  for (const g of groups) {
    const ids = g.ids;
    const keeper = ids[0];
    for (let i = 1; i < ids.length; i++) {
      await mergeDuplicateIntoKeeper(client, keeper, ids[i]);
      removed++;
    }
  }
  return removed;
}

async function ensureUniqueTitleAuthorIndex(client) {
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_books_title_author_normalized
    ON books (lower(btrim(title)), lower(btrim(author)))
  `);
}

async function runDedupeBooks(pool) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    let total = 0;
    let round;
    do {
      round = await dedupeBooksOnce(c);
      total += round;
    } while (round > 0);

    if (total > 0) {
      console.log(`📌 Объединено дубликатов книг (лишних записей): ${total}`);
    }

    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    console.error("dedupeBooks: ошибка:", e?.message || e);
    throw e;
  } finally {
    c.release();
  }

  const c2 = await pool.connect();
  try {
    await ensureUniqueTitleAuthorIndex(c2);
  } catch (e) {
    console.warn("dedupeBooks: уникальный индекс не создан:", e?.message || e);
  } finally {
    c2.release();
  }
}

async function runDeleteBooksWithoutCover(pool) {
  const c = await pool.connect();
  try {
    const r = await c.query(`
      DELETE FROM books
      WHERE cover_url IS NULL OR trim(cover_url) = ''
    `);
    if (r.rowCount > 0) {
      console.log(`🗑️ Удалены книги без обложки (только смайлик): ${r.rowCount}`);
    }
  } finally {
    c.release();
  }
}

module.exports = {
  runDedupeBooks,
  dedupeBooksOnce,
  mergeDuplicateIntoKeeper,
  runDeleteBooksWithoutCover,
};
