const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const uploadOrigin = apiBase.replace(/\/api\/?$/i, '')

export const resolveMediaUrl = (url: string): string => {
  if (!url?.trim()) return ''
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('blob:')) return trimmed
  if (trimmed.startsWith('/')) return `${uploadOrigin}${trimmed}`
  return `${uploadOrigin}/${trimmed}`
}
