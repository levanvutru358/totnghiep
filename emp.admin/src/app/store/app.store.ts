import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  role: string
  permissions: string[]
}

interface AppState {
  user: User | null
  isAuthenticated: boolean
  hasPermission: (code: string) => boolean
  login: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      hasPermission: (code: string) => Boolean(get().user?.permissions?.includes(code)),
      login: (user: User) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
)