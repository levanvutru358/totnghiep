export type RevenueRange = 'daily' | 'weekly' | 'monthly'
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled'

export interface DashboardMetrics {
  totalRevenue: number
  totalOrders: number
  conversionRate: number
  averageOrderValue: number
}

export interface Order {
  id: string
  customer: string
  amount: number
  status: OrderStatus
  createdAt: string
}

export interface Product {
  id: string
  name: string
  sku: string
  stock: number
  threshold: number
  category: string
}

export interface Customer {
  id: string
  name: string
  email: string
  totalSpent: number
  orderCount: number
}

export interface RevenuePoint {
  label: string
  value: number
}

export interface CategorySales {
  category: string
  sales: number
}

export interface OrderStatusDistribution {
  status: OrderStatus
  value: number
}

export interface RecentOrdersQuery {
  status?: OrderStatus | 'all'
}