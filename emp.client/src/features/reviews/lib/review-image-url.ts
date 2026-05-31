const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const uploadOrigin = apiBase.replace(/\/api\/?$/i, '')

/** Chuẩn hóa URL ảnh đánh giá (hỗ trợ đường dẫn tương đối /uploads/...). */
export const resolveReviewImageUrl = (url: string): string => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${uploadOrigin}${url}`
  return `${uploadOrigin}/${url}`
}
