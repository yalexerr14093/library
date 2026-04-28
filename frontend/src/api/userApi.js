import { get } from './client.js'

export const userApi = {
  me: (token) => get('/users/me', token),
  profile: (id) => get(`/users/${id}`),
}

