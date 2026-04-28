export const GENRE_EMOJI = {
  'Роман':    '📗',
  'Классика': '📘',
  'Эпопея':   '🏛️',
  'Поэзия':   '🎶',
  'Сатира':   '😄',
  'Пьеса':    '🎭',
  'Поэма':    '📜',
  'default':  '📚',
}

export const bookEmoji = (genre) => GENRE_EMOJI[genre] ?? GENRE_EMOJI.default

export const GENRES = ['Все', 'Роман', 'Классика', 'Эпопея', 'Поэзия', 'Сатира', 'Пьеса', 'Поэма']