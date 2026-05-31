import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import { ROUTES } from '../../app/router/route-names'

const routeLabels: Record<string, string> = {
  [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.PRODUCTS]: 'Products',
  [ROUTES.PRODUCT_CREATE]: 'Create Product',
  [ROUTES.PRODUCT_EDIT.replace(':id', '')]: 'Edit Product',
  [ROUTES.PRODUCT_DETAIL.replace(':id', '')]: 'Product Details',
  [ROUTES.ORDERS]: 'Orders',
  [ROUTES.CUSTOMERS]: 'Khách hàng',
  [ROUTES.CATEGORIES]: 'Categories',
  [ROUTES.INVENTORY]: 'Inventory',
  [ROUTES.PROMOTIONS]: 'Promotions',
  [ROUTES.REVIEWS]: 'Reviews',
  [ROUTES.SETTINGS]: 'Settings',
}

export const AppBreadcrumb: React.FC = () => {
  const location = useLocation()
  const pathnames = location.pathname.split('/').filter((x) => x)

  const breadcrumbs = pathnames.map((pathname, index) => {
    const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`
    const isLast = index === pathnames.length - 1

    // Try to match exact route or pattern
    let label = routeLabels[routeTo] || routeLabels[`/${pathname}`] || pathname

    // Handle dynamic routes
    if (label.includes(':id')) {
      label = label.replace(':id', pathnames[index])
    }

    return {
      label,
      to: routeTo,
      isLast,
    }
  })

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link
            to={ROUTES.DASHBOARD}
            className="text-gray-400 hover:text-gray-500"
          >
            Home
          </Link>
        </li>
        {breadcrumbs.map((breadcrumb) => (
          <li key={breadcrumb.to} className="flex items-center">
            <span className="text-gray-400 mx-2">/</span>
            {breadcrumb.isLast ? (
              <span className="text-gray-900 font-medium">{breadcrumb.label}</span>
            ) : (
              <Link
                to={breadcrumb.to}
                className="text-gray-600 hover:text-gray-900"
              >
                {breadcrumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}