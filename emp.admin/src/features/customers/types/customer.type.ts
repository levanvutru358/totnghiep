export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'TEMP_LOCKED'

export interface AdminCustomerSummary {
  id: number
  email: string
  fullName: string | null
  isActive: boolean
  accountStatus: AccountStatus
  lockReason: string | null
  lockedUntil: string | null
  lockedAt?: string | null
  orderCount: number
  totalSpent: number
  createdAt: string
  updatedAt: string
}

export interface AdminCustomerOrder {
  id: number
  orderCode: string
  status: string
  paymentStatus: string
  totalAmount: number
  currencyCode: string
  createdAt: string
}

export interface AdminCustomerAddress {
  recipientName: string
  recipientPhone: string
  line1: string
  line2: string | null
  ward: string | null
  district: string
  province: string
  postalCode: string | null
  usedCount: number
  lastUsedAt: string
}

export interface AdminCustomerReview {
  id: number
  productId: number
  productName: string
  rating: number
  title: string | null
  content: string
  status: string
  createdAt: string
}

export interface AdminCustomerComment {
  id: number
  productId: number
  productName: string
  content: string
  status: string
  parentId: number | null
  createdAt: string
}

export interface AdminCustomerLoginLog {
  id: number
  ipAddress: string | null
  userAgent: string | null
  deviceLabel: string | null
  isSuccess: boolean
  failureReason: string | null
  createdAt: string
}

export interface AdminCustomerDevice {
  id: number
  ipAddress: string | null
  deviceLabel: string | null
  expiresAt: string
  createdAt: string
}

export interface AdminCustomerDetail extends AdminCustomerSummary {
  recentOrders: AdminCustomerOrder[]
  addresses: AdminCustomerAddress[]
  reviews: AdminCustomerReview[]
  comments: AdminCustomerComment[]
  loginLogs: AdminCustomerLoginLog[]
  devices: AdminCustomerDevice[]
}

export interface CustomerListFilters {
  search?: string
  status?: 'all' | 'active' | 'locked' | 'temp_locked'
  page?: number
  limit?: number
}

export interface CustomersListResponse {
  items: AdminCustomerSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}
