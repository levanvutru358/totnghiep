import React from 'react'
import { NavLink } from 'react-router-dom'
import { ROUTES } from '../../app/router/route-names'

const navigation = [
  { name: 'Dashboard', href: ROUTES.DASHBOARD, icon: '📊' },
  { name: 'Products', href: ROUTES.PRODUCTS, icon: '📦' },
  { name: 'Orders', href: ROUTES.ORDERS, icon: '🛒' },
  { name: 'Customers', href: ROUTES.CUSTOMERS, icon: '👥' },
  { name: 'Categories', href: ROUTES.CATEGORIES, icon: '🏷️' },
  { name: 'Inventory', href: ROUTES.INVENTORY, icon: '📋' },
  { name: 'Promotions', href: ROUTES.PROMOTIONS, icon: '🎯' },
  { name: 'Reviews', href: ROUTES.REVIEWS, icon: '⭐' },
  { name: 'Settings', href: ROUTES.SETTINGS, icon: '⚙️' },
]

export const AppSidebar: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">{item.icon}</span>
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}