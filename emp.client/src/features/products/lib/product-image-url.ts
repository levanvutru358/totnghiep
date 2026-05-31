const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const uploadOrigin = apiBase.replace(/\/api\/?$/i, '')

/** Ảnh do server upload (thư mục /uploads trên API). */
const isServerUploadPath = (path: string): boolean =>
  path.startsWith('/uploads/') || path.startsWith('uploads/')

/**
 * Chuẩn hóa URL ảnh.
 * - `/uploads/...` → gốc API (emp.server)
 * - `/logo-dtt.png` và file trong `public/` client → giữ path tương đối (Vite)
 * - URL tuyệt đối → giữ nguyên
 */
export const resolveProductImageUrl = (url: string | null | undefined): string => {
  if (!url?.trim()) return ''
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('blob:')) return trimmed
  if (isServerUploadPath(trimmed)) {
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    return `${uploadOrigin}${path}`
  }
  if (trimmed.startsWith('/')) return trimmed
  return `${uploadOrigin}/${trimmed}`
}

/** Logo shop: static public hoặc /uploads từ admin. */
export const resolveShopLogoUrl = (url: string | null | undefined): string =>
  resolveProductImageUrl(url || '/logo-dtt.png')
