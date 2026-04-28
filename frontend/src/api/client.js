import { apiJsonBase } from "./env.js"

const BASE = apiJsonBase()

async function request(path, { method = 'GET', body, token, isFormData = false } = {}) {
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  // Если это FormData, не устанавливаем Content-Type (браузер сделает сам)
  if (!isFormData && body) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data
}

export const get    = (path, token) => request(path, { token })
export const post   = (path, body, token, isFormData = false) => request(path, { method: 'POST', body, token, isFormData })
export const put    = (path, body, token, isFormData = false) => request(path, { method: 'PUT', body, token, isFormData })
export const patch  = (path, body, token) => request(path, { method: 'PATCH', body, token })
export const del    = (path, token) => request(path, { method: 'DELETE', token })