import axios from 'axios'
import type { ApiResponse } from '../types/api.type'

const fallbackApiUrl = 'http://localhost:8000/api'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || fallbackApiUrl,
  timeout: 10000,
  withCredentials: true,
})

// request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// response
http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined
    const status = error.response?.status as number | undefined

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !String(originalRequest.url ?? '').includes('/auth/refresh')
    ) {
      originalRequest._retry = true
      try {
        const refreshRes = await axios.post<ApiResponse<{ accessToken: string }>>(
          `${http.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        const newAccessToken = refreshRes.data.data.accessToken
        localStorage.setItem('access_token', newAccessToken)
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return http(originalRequest)
      } catch {
        localStorage.removeItem('access_token')
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    if (status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)