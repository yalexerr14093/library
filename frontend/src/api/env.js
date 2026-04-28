/**
 * VITE_API_URL — полный origin бэкенда, например http://localhost:3847
 * (без /api; мы сами добавляем /api для JSON-запросов).
 * Если не задан — используется относительный префикс /api (прокси Vite).
 */

export function apiJsonBase() {
  const raw = import.meta.env.VITE_API_URL
  if (!raw) return "/api"
  const t = String(raw).replace(/\/+$/, "")
  if (/\/api$/i.test(t)) return t
  return `${t}/api`
}

/** Origin без /api — для /uploads и внешних обложек с тем же хостом */
export function apiStaticOrigin() {
  const raw = import.meta.env.VITE_API_URL
  if (!raw) return "http://localhost:3001"
  return String(raw).replace(/\/+$/, "").replace(/\/api\/?$/i, "")
}
