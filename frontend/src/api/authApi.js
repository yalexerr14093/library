import { get, post } from './client.js'

export const authApi = {
  register: ({ name, email, password }) =>
    post('/auth/register', { name, email, password }),

  login: ({ email, password }) =>
    post('/auth/login', { email, password }),

  me: (token) =>
    get('/auth/me', token),
}
