export interface ApiResponse<T = any> {
  success: boolean
  statusCode: number
  message: string
  data: T
  meta?: Record<string, unknown>
  errorCode?: string
  errors?: Array<{
    field?: string
    message: string
  }>
}

export interface ApiError {
  message: string
  code?: string
  details?: Record<string, any>
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}