/**
 * Удаляет книги без реальной обложки (в каталоге виден только смайлик).
 * Запуск: из папки backend — node scripts/purgeBooksNoCover.js
 */
require("dotenv").config();
const { pool } = require("../db");
const { runDeleteBooksWithoutCover } = require("../services/dedupeBooks");

async function main() {
  try {
    await runDeleteBooksWithoutCover(pool);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
