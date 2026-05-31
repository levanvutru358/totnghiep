import type { CommentStatus } from '../types/comment.type'

export const commentStatusLabel: Record<CommentStatus, string> = {
  VISIBLE: 'Hiển thị',
  HIDDEN: 'Đã ẩn',
  PENDING: 'Chờ duyệt',
}

export const commentStatusColor: Record<CommentStatus, string> = {
  VISIBLE: 'green',
  HIDDEN: 'gray',
  PENDING: 'yellow',
}
