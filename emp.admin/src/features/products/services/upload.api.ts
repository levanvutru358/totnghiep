import { http } from '../../../lib/axios'
import { multipartConfig } from '../../../lib/multipart'
import type { ApiResponse } from '../../../types/api.type'

interface UploadFileResult {
  id: number
  url: string
}

export const uploadApi = {
  uploadImages: async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return []

    const formData = new FormData()
    files.forEach((file) => formData.append('images', file))

    const response = await http.post<ApiResponse<{ files: UploadFileResult[] }>>(
      '/upload',
      formData,
      { ...multipartConfig(), timeout: 60_000 },
    )

    return (response.data.data?.files ?? []).map((file) => file.url).filter(Boolean)
  },
}
