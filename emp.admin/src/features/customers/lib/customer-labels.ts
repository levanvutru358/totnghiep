import type { AccountStatus } from '../types/customer.type'

export const accountStatusLabel: Record<AccountStatus, string> = {
  ACTIVE: 'Hoạt động',
  LOCKED: 'Đã khóa',
  TEMP_LOCKED: 'Tạm khóa',
}

export const accountStatusColor: Record<AccountStatus, string> = {
  ACTIVE: 'green',
  LOCKED: 'red',
  TEMP_LOCKED: 'orange',
}
