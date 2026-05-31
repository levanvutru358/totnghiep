import React from 'react'
import { useAuthStore } from '../../app/store/app.store'
import { AppBreadcrumb } from './app-breadcrumb'

export const AppHeader: React.FC = () => {
  const { user, logout } = useAuthStore()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <AppBreadcrumb />
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">Welcome, {user?.name}</span>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}