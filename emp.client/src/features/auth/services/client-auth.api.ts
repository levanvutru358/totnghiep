import { http } from '../../../lib/http'
import type { ApiResponse } from '../../../types/api.type'

const fallbackApiUrl = 'http://localhost:8000/api'
const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || fallbackApiUrl

interface ApiBody<T> {
  success: boolean
  statusCode: number
  message: string
  data: T
  errorCode?: string
}

const postPublic = async <T>(path: string, body: unknown): Promise<T> => {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => ({}))) as ApiBody<T>
  if (!res.ok) {
    throw new Error(json.errorCode || json.message || 'REQUEST_FAILED')
  }
  return json.data
}

export interface ClientMe {
  id: number
  email: string
  fullName: string | null
  role: string
}

const unwrapMe = (data: ClientMe & { permissions?: string[] }): ClientMe => {
  const { permissions: _permissions, ...user } = data
  return user
}

export const clientAuthApi = {
  async register(email: string, password: string, fullName?: string): Promise<void> {
    const res = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, fullName }),
    })
    if (!res.ok) throw new Error('REGISTER_FAILED')
  },

  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    const body = (await res.json().catch(() => ({}))) as ApiBody<{ accessToken: string }> & {
      details?: { lockReason?: string | null; lockedUntil?: string | null }
    }
    if (!res.ok) {
      const lockReason = body.details?.lockReason?.trim()
      if (lockReason) throw new Error(lockReason)
      if (body.message) throw new Error(body.message)
      throw new Error(body.errorCode || 'LOGIN_FAILED')
    }
    return body.data
  },

  async me(accessToken: string): Promise<ClientMe> {
    const res = await fetch(`${apiBase}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
    })
    if (!res.ok) throw new Error('ME_FAILED')
    const body = (await res.json()) as ApiBody<ClientMe & { permissions?: string[] }>
    return unwrapMe(body.data)
  },

  async meCurrent(): Promise<ClientMe> {
    const response = await http.get<ApiResponse<ClientMe & { permissions?: string[] }>>('/auth/me')
    return unwrapMe(response.data.data)
  },

  async updateProfile(payload: { fullName: string | null }): Promise<ClientMe> {
    const response = await http.patch<ApiResponse<ClientMe & { permissions?: string[] }>>('/users/me', payload)
    return unwrapMe(response.data.data)
  },

  async logout(): Promise<void> {
    await http.post<ApiResponse<{ ok: boolean }>>('/auth/logout', {})
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await http.post<ApiResponse<{ ok: boolean }>>('/auth/change-password', {
      currentPassword,
      newPassword,
    })
  },

  async forgotPassword(email: string): Promise<string> {
    const data = await postPublic<{ message: string }>('/auth/forgot-password', { email })
    return data.message
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await postPublic<{ ok: boolean }>('/auth/reset-password', { token, newPassword })
  },
}
