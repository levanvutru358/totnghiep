import { useQuery } from '@tanstack/react-query'
import {
  getDashboardMetrics,
  getLowStockProducts,
  getOrderStatusDistribution,
  getRecentOrders,
  getRevenueSeries,
  getTopCustomers,
  getTopSellingCategories,
} from '../services/dashboard.api'
import type { RecentOrdersQuery, RevenueRange } from '../types/dashboard.type'

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: getDashboardMetrics,
  })
}

export const useRevenueSeries = (range: RevenueRange) =>
  useQuery({
    queryKey: ['dashboard-revenue-series', range],
    queryFn: () => getRevenueSeries(range),
  })

export const useRecentOrders = (params?: RecentOrdersQuery) =>
  useQuery({
    queryKey: ['dashboard-recent-orders', params],
    queryFn: () => getRecentOrders(params),
  })

export const useLowStockProducts = () =>
  useQuery({
    queryKey: ['dashboard-low-stock'],
    queryFn: getLowStockProducts,
  })

export const useTopCustomers = () =>
  useQuery({
    queryKey: ['dashboard-top-customers'],
    queryFn: getTopCustomers,
  })

export const useTopSellingCategories = () =>
  useQuery({
    queryKey: ['dashboard-top-categories'],
    queryFn: getTopSellingCategories,
  })

export const useOrderStatusDistribution = () =>
  useQuery({
    queryKey: ['dashboard-order-status-distribution'],
    queryFn: getOrderStatusDistribution,
  })