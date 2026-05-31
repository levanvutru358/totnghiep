export const ROUTES = {
  HOME: '/',
  CATEGORIES: '/categories',
  /** Segment kiểu Shopee: ...-i.{shopId}.{listingId} hoặc id cũ */
  PRODUCT_DETAIL: '/product/:pathKey',
  CART: '/cart',
  CHECKOUT: '/checkout',
  PAYMENT: '/payment/:orderCode',
  CHECKOUT_RESULT: '/checkout/result',
  CHECKOUT_CANCEL: '/checkout/cancel',
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:orderCode',
  ACCOUNT_PROFILE: '/account/profile',
  ACCOUNT_ORDERS: '/account/orders',
  ACCOUNT_REVIEWS: '/account/reviews',
  ACCOUNT_NOTIFICATIONS: '/account/notifications',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
} as const

