import axios from 'axios'
import { getToken } from './auth'

const api = axios.create({
  baseURL: 'http://localhost:5253/api',
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hb_user')
      // Only redirect to staff login if NOT on the patient portal
      if (!window.location.pathname.startsWith('/patient')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
