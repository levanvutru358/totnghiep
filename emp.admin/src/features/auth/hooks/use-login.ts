import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { authApi, type LoginRequest } from '../services/auth.api'
import { useAuthStore } from '../../../app/store/app.store'
import { isAdminPanelRole } from '../lib/admin-roles'

export const useLogin = () => {
  const { login } = useAuthStore()

  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = await authApi.login(data)
      return response
    },
    onSuccess: async (data) => {
      localStorage.setItem('access_token', data.accessToken)
      const me = await authApi.me()

      if (!isAdminPanelRole(me.role)) {
        localStorage.removeItem('access_token')
        await authApi.logout().catch(() => undefined)
        toast.error('Tài khoản không có quyền truy cập trang quản trị.')
        throw new Error('NOT_ADMIN')
      }

      login({
        id: String(me.id),
        email: me.email,
        name: me.fullName ?? me.email,
        role: me.role,
        permissions: me.permissions ?? [],
      })
    },
  })
}