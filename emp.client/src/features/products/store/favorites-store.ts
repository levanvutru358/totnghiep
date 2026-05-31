import { useEffect, useMemo, useState } from 'react'

const FAV_STORAGE_KEY = 'client_favorites'
const FAV_UPDATED_EVENT = 'client-favorites-updated'

const readIds = (): string[] => {
  try {
    const raw = localStorage.getItem(FAV_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

const writeIds = (ids: string[]) => {
  localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(ids))
  window.dispatchEvent(new CustomEvent(FAV_UPDATED_EVENT))
}

export const favoritesStore = {
  getIds: (): string[] => readIds(),

  has: (productId: string): boolean => readIds().includes(productId),

  toggle: (productId: string): boolean => {
    const cur = readIds()
    const next = cur.includes(productId) ? cur.filter((id) => id !== productId) : [...cur, productId]
    writeIds(next)
    return next.includes(productId)
  },
}

export const useFavorites = () => {
  const [ids, setIds] = useState<string[]>(() => favoritesStore.getIds())

  useEffect(() => {
    const onUpdate = () => setIds(favoritesStore.getIds())
    window.addEventListener(FAV_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(FAV_UPDATED_EVENT, onUpdate)
  }, [])

  const set = useMemo(() => new Set(ids), [ids])

  return {
    ids,
    count: ids.length,
    isFavorite: (productId: string) => set.has(productId),
    toggle: favoritesStore.toggle,
  }
}
