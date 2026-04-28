// backend/scripts/deleteBadCoverBooks.js
const { pool } = require('../db');
const https = require('https');
const http = require('http');

const SIZE_THRESHOLD = 5000; // 5 КБ

async function checkImage(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { method: 'HEAD', timeout: 5000 }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const contentLength = parseInt(res.headers['content-length'], 10);
        if (!isNaN(contentLength) && contentLength > 0) {
          resolve({ ok: true, size: contentLength });
        } else {
          // Если нет Content-Length, считаем, что изображение есть (не удаляем)
          resolve({ ok: true, size: SIZE_THRESHOLD + 1 });
        }
      } else {
        resolve({ ok: false });
      }
    });
    req.on('error', () => resolve({ ok: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false });
    });
  });
}

async function main() {
  console.log('🔍 Проверка книг с обложками...');
  const { rows } = await pool.query(
    'SELECT id, title, author, cover_url FROM books WHERE cover_url IS NOT NULL'
  );
  console.log(`📚 Найдено книг: ${rows.length}`);

  const badBooks = [];

  for (const book of rows) {
    process.stdout.write(`Проверка ID ${book.id} – ${book.title}... `);
    const result = await checkImage(book.cover_url);
    if (!result.ok) {
      console.log('❌ НЕ ДОСТУПНА');
      badBooks.push(book);
    } else if (result.size < SIZE_THRESHOLD) {
      console.log(`⚠️ МАЛЕНЬКАЯ (${result.size} байт)`);
      badBooks.push(book);
    } else {
      console.log(`✅ OK (${result.size} байт)`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (badBooks.length === 0) {
    console.log('\n✅ Все обложки в порядке. Удаление не требуется.');
    await pool.end();
    process.exit(0);
  }

  console.log('\n📋 Книги с проблемными обложками:');
  badBooks.forEach((b, i) => {
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

  for (const book of badBooks) {
    await pool.query('DELETE FROM books WHERE id = $1', [book.id]);
    console.log(`🗑️ Удалена книга ID ${book.id} – ${book.title}`);
  }

  console.log(`\n✅ Удалено книг: ${badBooks.length}`);
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Ошибка выполнения скрипта:', err);
  process.exit(1);
});