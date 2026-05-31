export const ROUTES = {
  // Auth routes
  LOGIN: '/login',

  // Dashboard
  DASHBOARD: '/dashboard',

  // Products
  PRODUCTS: '/products',
  PRODUCT_CREATE: '/products/create',
  PRODUCT_EDIT: '/products/:id/edit',
  PRODUCT_DETAIL: '/products/:id',

  // Orders
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:id',

  // Customers
  CUSTOMERS: '/customers',
  CUSTOMER_DETAIL: '/customers/:id',

  // Inventory
  INVENTORY: '/inventory',

  // Marketing
  MARKETING: '/marketing',
  CATEGORIES: '/categories',
  PROMOTIONS: '/promotions',
  REVIEWS: '/reviews',
  COMMENTS: '/comments',

  // Settings
  SETTINGS: '/settings',
  PERMISSIONS: '/permissions',
} as const