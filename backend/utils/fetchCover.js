// backend/utils/fetchCover.js
async function fetchCoverFromGoogle(title, author, retryCount = 0) {
  const query = encodeURIComponent(`"${title}" ${author}`).replace(/%20/g, '+');
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5&langRestrict=ru`;

  console.log(`📡 Запрос к Google Books: ${url}`);

  try {
    const response = await fetch(url);
    
    if (response.status === 429) {
      if (retryCount < 3) {
        const waitTime = (retryCount + 1) * 5000; // 5с, 10с, 15с
        console.log(`⏳ Too many requests, waiting ${waitTime/1000}s and retry (${retryCount+1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return fetchCoverFromGoogle(title, author, retryCount + 1);
      } else {
        console.log('❌ Превышено количество попыток, пропускаем.');
        return null;
      }
    }
    
    if (!response.ok) {
      console.log(`❌ HTTP ошибка: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log('📭 Нет результатов');
      return null;
    }

    // Перебираем результаты, ищем совпадение по автору
    for (const item of data.items) {
      const info = item.volumeInfo;
      if (!info.imageLinks || !info.imageLinks.thumbnail) continue;

      // Проверяем совпадение автора (хотя бы частичное)
      const authorMatch = info.authors && info.authors.some(a => 
        author.toLowerCase().includes(a.toLowerCase()) || 
        a.toLowerCase().includes(author.toLowerCase())
      );

      if (authorMatch) {
        let coverUrl = info.imageLinks.thumbnail;
        coverUrl = coverUrl.replace('http://', 'https://');
        coverUrl = coverUrl.replace('&zoom=1', '&zoom=2'); // улучшаем качество
        console.log(`✅ Найдена обложка: ${coverUrl}`);
        return coverUrl;
      }
    }

    // Если не нашли по автору, берём первую попавшуюся
    if (data.items[0].volumeInfo.imageLinks?.thumbnail) {
      let coverUrl = data.items[0].volumeInfo.imageLinks.thumbnail;
      coverUrl = coverUrl.replace('http://', 'https://');
      coverUrl = coverUrl.replace('&zoom=1', '&zoom=2');
      console.log(`⚠️ Найдена обложка (первая попавшаяся): ${coverUrl}`);
      return coverUrl;
    }

    return null;
  } catch (err) {
    console.error('🔥 Ошибка при запросе к Google Books:', err);
    return null;
  }
}

module.exports = fetchCoverFromGoogle;