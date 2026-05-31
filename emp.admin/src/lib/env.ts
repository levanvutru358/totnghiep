export const env = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Ecommerce Admin',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
} as const