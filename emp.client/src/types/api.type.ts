export interface ApiResponse<T> {
  success: boolean
  statusCode: number
  message: string
  data: T
  meta?: Record<string, unknown>
  errorCode?: string
  errors?: Array<{ field?: string; message: string }>
}
