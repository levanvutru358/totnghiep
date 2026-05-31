import { useEffect, useRef } from 'react'
import { http } from '../../../lib/http'
import type { ApiResponse } from '../../../types/api.type'

const POLL_INTERVAL_MS = 2000
const REVISION_STORAGE_KEY = 'emp_public_content_revision'

/**
 * Khi admin thay đổi sản phẩm / tiếp thị / danh mục, server tăng revision.
 * Client poll và reload trang để đồng bộ nội dung shop.
 */
export const usePublicContentSync = () => {
  const knownRevisionRef = useRef<number | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(REVISION_STORAGE_KEY)
    if (stored && Number.isFinite(Number(stored))) {
      knownRevisionRef.current = Number(stored)
    }

    let cancelled = false

    const poll = async () => {
      try {
        const response = await http.get<ApiResponse<{ revision: number }>>('/public/revision')
        const revision = Number(response.data.data?.revision ?? 0)
        if (cancelled || !Number.isFinite(revision)) return

        if (knownRevisionRef.current === null) {
          knownRevisionRef.current = revision
          sessionStorage.setItem(REVISION_STORAGE_KEY, String(revision))
          return
        }

        if (revision !== knownRevisionRef.current) {
          sessionStorage.setItem(REVISION_STORAGE_KEY, String(revision))
          window.location.reload()
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời
      }
    }

    void poll()
    const timerId = window.setInterval(() => void poll(), POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timerId)
    }
  }, [])
}
