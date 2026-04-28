export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

export const daysLeft = (due) =>
  Math.ceil((new Date(due) - new Date()) / 86_400_000)

export const starsStr = (n) => '★'.repeat(n) + '☆'.repeat(5 - n)

export const avgRating = (reviews = []) => {
  if (!reviews.length) return null
  return (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
}
