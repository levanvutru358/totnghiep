import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAdminPanelRole } from '../../features/auth/lib/admin-roles'
import { useAuthStore } from '../store/app.store'
import { ROUTES } from './route-names'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (user && !isAdminPanelRole(user.role)) {
    logout()
    localStorage.removeItem('access_token')
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return <>{children}</>
}