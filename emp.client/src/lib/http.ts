import type { ApiResponse } from '../types/api.type'

const fallbackApiUrl = 'http://localhost:8000/api'
const baseUrl = import.meta.env.VITE_API_URL || fallbackApiUrl

interface HttpOptions {
  data?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined | null>
}

interface HttpResponse<T> {
  data: T
  status: number
}

const resolveUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

const resolveUrlWithParams = (path: string, params?: HttpOptions['params']) => {
  const url = resolveUrl(path)
  if (!params) return url

  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(key, String(value))
  })

  const query = search.toString()
  if (!query) return url
  return `${url}${url.includes('?') ? '&' : '?'}${query}`
}

const parseJsonSafely = async <T>(response: Response): Promise<T> => {
  const raw = await response.text()
  return raw ? (JSON.parse(raw) as T) : ({} as T)
}

const refreshAccessToken = async (): Promise<string | null> => {
  const response = await fetch(resolveUrl('/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{}',
  })

  if (!response.ok) return null

  const data = await parseJsonSafely<ApiResponse<{ accessToken: string }>>(response)
  const nextAccessToken = data.data?.accessToken ?? null

  if (nextAccessToken) {
    localStorage.setItem('access_token', nextAccessToken)
    localStorage.setItem('client_access_token', nextAccessToken)
  }

  return nextAccessToken
}

const request = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options?: HttpOptions,
  allowRefresh = true,
): Promise<HttpResponse<T>> => {
  const headers = new Headers(options?.headers)
  const accessToken = localStorage.getItem('access_token') ?? localStorage.getItem('client_access_token')

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const requestBody = typeof body === 'undefined' ? options?.data : body
  const hasBody = typeof requestBody !== 'undefined'

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(resolveUrlWithParams(path, options?.params), {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers,
    body: hasBody ? JSON.stringify(requestBody) : undefined,
  })

  if (response.status === 401 && allowRefresh && !path.includes('/auth/refresh')) {
    const nextAccessToken = await refreshAccessToken()

    if (nextAccessToken) {
      return request<T>(method, path, body, options, false)
    }

    localStorage.removeItem('access_token')
    localStorage.removeItem('client_access_token')
  }

  const data = await parseJsonSafely<T | ApiResponse<unknown>>(response)

  if (!response.ok) {
    const apiError = data as Partial<ApiResponse<unknown>>
    const message =
      (typeof apiError.message === 'string' && apiError.message) ||
      (typeof apiError.errorCode === 'string' && apiError.errorCode) ||
      `Request failed with status ${response.status}`

    throw new Error(message)
  }

  return {
    data: data as T,
    status: response.status,
  }
}

export const http = {
  get: <T>(path: string, options?: HttpOptions) =>
    request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: HttpOptions) =>
    request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: HttpOptions) =>
    request<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: HttpOptions) =>
    request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: HttpOptions) =>
    request<T>('DELETE', path, undefined, options),
}
