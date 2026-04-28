// backend/scripts/deleteExactSize.js
const { pool } = require('../db');
const https = require('https');
const http = require('http');

// Точный размер, который нужно найти (15567 байт)
const TARGET_SIZE = 15567;

async function getImageSize(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { method: 'HEAD', timeout: 5000 }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const contentLength = parseInt(res.headers['content-length'], 10);
        if (!isNaN(contentLength) && contentLength > 0) {
          resolve(contentLength);
        } else {
          resolve(null); // Нет информации о размере
        }
      } else {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function main() {
  console.log('🔍 Поиск книг с обложками размером ровно 15567 байт...');
  
  const { rows } = await pool.query(
    'SELECT id, title, author, cover_url FROM books WHERE cover_url IS NOT NULL'
  );
  console.log(`📚 Найдено книг с обложками: ${rows.length}`);

  const candidates = [];

  for (const book of rows) {
    process.stdout.write(`Проверка ID ${book.id} – ${book.title}... `);
    const size = await getImageSize(book.cover_url);
    if (size === null) {
      console.log('⚠️ Не удалось определить размер');
    } else if (size === TARGET_SIZE) {
      console.log(`❌ ТОЧНОЕ СОВПАДЕНИЕ: ${size} байт`);
      candidates.push(book);
    } else {
      console.log(`✅ ${size} байт`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (candidates.length === 0) {
    console.log('\n✅ Нет книг с размером 15567 байт.');
    await pool.end();
    process.exit(0);
  }

  console.log('\n📋 Книги, которые будут УДАЛЕНЫ:');
  candidates.forEach((b, i) => {
    console.log(`${i + 1}. [ID ${b.id}] ${b.title} – ${b.author}`);
    console.log(`   URL: ${b.cover_url}`);
  });

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve => {
    readline.question('\n❗ Введите "DELETE" для удаления этих книг: ', resolve);
  });
  readline.close();

  if (answer !== 'DELETE') {
    console.log('❌ Операция отменена.');
    await pool.end();
    process.exit(0);
  }

  for (const book of candidates) {
    await pool.query('DELETE FROM books WHERE id = $1', [book.id]);
    console.log(`🗑️ Удалена книга ID ${book.id} – ${book.title}`);
  }

  console.log(`\n✅ Удалено книг: ${candidates.length}`);
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Ошибка выполнения скрипта:', err);
  process.exit(1);
});