import type { ReviewStatus } from '../types/review.type'

export const reviewStatusLabel: Record<ReviewStatus, string> = {
  PENDING: 'Chờ hiển thị',
  APPROVED: 'Hiển thị',
  REJECTED: 'Từ chối',
  HIDDEN: 'Đã ẩn',
}

export const reviewStatusColor: Record<ReviewStatus, string> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
  HIDDEN: 'gray',
}

export const renderStars = (rating: number) => '★'.repeat(rating) + '☆'.repeat(5 - rating)
