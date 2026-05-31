const AUTH_ERROR_VI: Record<string, string> = {
  WEAK_PASSWORD: 'Mật khẩu tối thiểu 8 ký tự.',
  INVALID_CREDENTIALS: 'Mật khẩu hiện tại không đúng.',
  INVALID_EMAIL: 'Email không hợp lệ.',
  INVALID_FULL_NAME: 'Tên hiển thị không hợp lệ (tối đa 120 ký tự).',
  NO_UPDATABLE_FIELDS: 'Chưa có thông tin để cập nhật.',
  MISSING_RESET_TOKEN: 'Thiếu mã đặt lại mật khẩu.',
  INVALID_RESET_TOKEN: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  REQUEST_FAILED: 'Không thể xử lý yêu cầu. Vui lòng thử lại.',
}

export const mapAuthErrorMessage = (error: unknown): string => {
  const code = error instanceof Error ? error.message : ''
  if (AUTH_ERROR_VI[code]) return AUTH_ERROR_VI[code]
  if (code) return code
  return AUTH_ERROR_VI.REQUEST_FAILED
}

export const clearClientAuthSession = (): void => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('client_access_token')
  localStorage.removeItem('client_user')
}
