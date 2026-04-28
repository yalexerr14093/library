import { get, post } from './client.js'

export const wishlistApi = {
  list: (token) => get('/wishlist', token),

  toggle: (bookId, token) => post(`/wishlist/${bookId}/toggle`, {}, token),

  check: (bookId, token) => get(`/wishlist/${bookId}/check`, token),
}
