import { http } from '../../../lib/axios'
import type { ApiResponse } from '../../../types/api.type'
import type {
  CategorySales,
  Customer,
  DashboardMetrics,
  Order,
  OrderStatusDistribution,
  Product,
  RecentOrdersQuery,
  RevenuePoint,
  RevenueRange,
} from '../types/dashboard.type'

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await http.get<ApiResponse<DashboardMetrics>>('/dashboard/metrics')
  return response.data.data
}

export async function getRevenueSeries(range: RevenueRange): Promise<RevenuePoint[]> {
  const response = await http.get<ApiResponse<RevenuePoint[]>>('/dashboard/revenue-series', {
    params: { range },
  })
  return response.data.data
}

export async function getRecentOrders(params?: RecentOrdersQuery): Promise<Order[]> {
  const response = await http.get<ApiResponse<Order[]>>('/dashboard/recent-orders', {
    params: { status: params?.status ?? 'all' },
  })
  return response.data.data
}

export async function getLowStockProducts(): Promise<Product[]> {
  const response = await http.get<ApiResponse<Product[]>>('/dashboard/low-stock')
  return response.data.data
}

export async function getTopCustomers(): Promise<Customer[]> {
  const response = await http.get<ApiResponse<Customer[]>>('/dashboard/top-customers')
  return response.data.data
}

export async function getTopSellingCategories(): Promise<CategorySales[]> {
  const response = await http.get<ApiResponse<CategorySales[]>>('/dashboard/top-categories')
  return response.data.data
}

export async function getOrderStatusDistribution(): Promise<OrderStatusDistribution[]> {
  const response = await http.get<ApiResponse<OrderStatusDistribution[]>>('/dashboard/order-status-distribution')
  return response.data.data
}