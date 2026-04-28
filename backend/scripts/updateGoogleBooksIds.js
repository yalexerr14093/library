// backend/scripts/updateGoogleBooksIds.js
const { pool } = require('../db');
const findGoogleBookId = require('../utils/findGoogleBook');

async function updateGoogleBooksIds() {
  console.log('🔍 Поиск Google Books ID для книг...');
  
  const { rows } = await pool.query(
    'SELECT id, title, author FROM books WHERE google_books_id IS NULL'
  );
  console.log(`📚 Найдено книг без Google ID: ${rows.length}`);

  let updated = 0;
  for (const book of rows) {
    process.stdout.write(`Поиск для ID ${book.id} – ${book.title}... `);
    const googleId = await findGoogleBookId(book.title, book.author);
    
    if (googleId) {
      await pool.query(
        'UPDATE books SET google_books_id = $1 WHERE id = $2',
        [googleId, book.id]
      );
      console.log(`✅ Найден: ${googleId}`);
      updated++;
    } else {
      console.log('❌ Не найден');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ Обновлено книг: ${updated}`);
  process.exit(0);
}

updateGoogleBooksIds().catch(err => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});