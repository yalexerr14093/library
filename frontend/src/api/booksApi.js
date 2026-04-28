// frontend/src/api/booksApi.js
import { get, post } from './client.js'

export const booksApi = {
  list: ({ search = '', genre = '', sort = 'title', order = 'asc', page = 1, limit = 12 } = {}) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (genre)  params.set('genre', genre)
    if (sort) params.set('sort', sort)
    if (order) params.set('order', order)
    params.set('page', page)
    params.set('limit', limit)
    const qs = params.toString()
    return get(`/books${qs ? '?' + qs : ''}`)
  },

  detail: (id) => get(`/books/${id}`),

  genres: () => get('/books/genres'),

  stats: () => get('/books/stats'), // новый метод

  trendsWeek: () => get('/books/trends/week'),

  trackView: (id, token) => post(`/books/${id}/view`, {}, token),
}