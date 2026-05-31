import { http } from '../../../lib/axios'
import type { ApiResponse } from '../../../types/api.type'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
}

export interface MeResponse {
  id: number
  email: string
  fullName: string | null
  role: string
  permissions: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface RolePermissionsPayload {
  allPermissions: string[]
  roles: Array<{ role: string; permissions: string[] }>
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await http.post<ApiResponse<LoginResponse>>('/auth/login', data)
    return response.data.data
  },

  logout: async (): Promise<void> => {
    await http.post<ApiResponse<null>>('/auth/logout')
  },

  refreshToken: async (): Promise<{ accessToken: string }> => {
    const response = await http.post<ApiResponse<{ accessToken: string }>>('/auth/refresh')
    return response.data.data
  },

  me: async (): Promise<MeResponse> => {
    const response = await http.get<ApiResponse<MeResponse>>('/auth/me')
    return response.data.data
  },

  getRolePermissions: async (): Promise<RolePermissionsPayload> => {
    const response = await http.get<ApiResponse<RolePermissionsPayload>>('/auth/rbac/roles')
    return response.data.data
  },

  updateRolePermissions: async (roleCode: string, permissionCodes: string[]): Promise<void> => {
    await http.put(`/auth/rbac/roles/${roleCode}`, { permissionCodes })
  },
}