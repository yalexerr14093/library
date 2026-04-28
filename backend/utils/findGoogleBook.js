// backend/utils/findGoogleBook.js
async function findGoogleBookId(title, author) {
  const query = encodeURIComponent(`intitle:${title} inauthor:${author}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5&langRestrict=ru`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();

    if (!data.items || data.items.length === 0) return null;

    // Ищем книгу с доступным preview (просмотром)
    for (const item of data.items) {
      const accessInfo = item.accessInfo;
      if (accessInfo?.viewability !== 'NO_PAGES' && accessInfo?.embeddable) {
        return item.id;
      }
    }

    // Если нет доступной для просмотра, берём первую попавшуюся
    return data.items[0]?.id || null;
  } catch (err) {
    console.error('Ошибка поиска в Google Books:', err);
    return null;
  }
}

module.exports = findGoogleBookId;