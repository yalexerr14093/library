// backend/scripts/fillCovers.js
const { pool } = require('../db');
const fetchCoverFromGoogle = require('../utils/fetchCover');

async function fillCovers() {
  console.log('Начинаем заполнение обложек...');
  const { rows } = await pool.query(
    'SELECT id, title, author FROM books WHERE cover_url IS NULL'
  );

  console.log(`Найдено книг без обложек: ${rows.length}`);

  for (let i = 0; i < rows.length; i++) {
    const book = rows[i];
    console.log(`[${i + 1}/${rows.length}] Обрабатываем: ${book.title} (${book.author})`);
    
    const coverUrl = await fetchCoverFromGoogle(book.title, book.author);
    if (coverUrl) {
      await pool.query(
        'UPDATE books SET cover_url = $1 WHERE id = $2',
        [coverUrl, book.id]
      );
      console.log(`✅ Обложка сохранена`);
    } else {
      console.log(`❌ Обложка не найдена`);
    }
    
    // Увеличиваем задержку до 2 секунд
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('Готово!');
  process.exit(0);
}

fillCovers().catch(err => {
  console.error('Ошибка:', err);
  process.exit(1);
});