import { get, post } from './client.js'

export const reviewsApi = {
  forBook: (bookId) => get(`/reviews/book/${bookId}`),

  upsert: (bookId, { rating, comment }, token) =>
    post(`/reviews/${bookId}`, { rating, comment }, token),
}
