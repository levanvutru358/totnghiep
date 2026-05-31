import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/app.store'
import { ROUTES } from './route-names'

interface PermissionRouteProps {
  permission: string
  children: ReactNode
}

export const PermissionRoute = ({ permission, children }: PermissionRouteProps) => {
  const { isAuthenticated, hasPermission } = useAuthStore()

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  if (!hasPermission(permission)) return <Navigate to={ROUTES.DASHBOARD} replace />
  return <>{children}</>
}
