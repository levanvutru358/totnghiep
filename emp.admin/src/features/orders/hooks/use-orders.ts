import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '../services/orders.api'
import type { OrderListFilters, PlacedPaidTargetStatus } from '../types/order.type'

export const useAdminOrders = (filters: OrderListFilters = {}) =>
  useQuery({
    queryKey: ['admin-orders', filters],
    queryFn: () => ordersApi.list(filters),
  })

export const useAdminOrderDetail = (orderId: string | undefined) =>
  useQuery({
    queryKey: ['admin-order', orderId],
    queryFn: () => ordersApi.detail(orderId!),
    enabled: Boolean(orderId),
  })

export const useAdminReturns = (filters: { page?: number; limit?: number; search?: string } = {}) =>
  useQuery({
    queryKey: ['admin-order-returns', filters],
    queryFn: () => ordersApi.listReturns(filters),
  })

export const useOrderMutations = (orderId: string) => {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] })
    void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    void queryClient.invalidateQueries({ queryKey: ['admin-order-returns'] })
  }

  const confirm = useMutation({
    mutationFn: (body?: { note?: string; adminNote?: string }) => ordersApi.confirm(orderId, body),
    onSuccess: invalidate,
  })

  const pack = useMutation({
    mutationFn: () => ordersApi.updateStatus(orderId, { status: 'PACKED' }),
    onSuccess: invalidate,
  })

  const ship = useMutation({
    mutationFn: (payload?: { shippingCarrier?: string; trackingNumber?: string; note?: string }) =>
      ordersApi.updateStatus(orderId, { status: 'SHIPPED', ...payload }),
    onSuccess: invalidate,
  })

  const deliver = useMutation({
    mutationFn: () => ordersApi.updateStatus(orderId, { status: 'DELIVERED' }),
    onSuccess: invalidate,
  })

  const cancel = useMutation({
    mutationFn: (payload?: { reason?: string; note?: string }) =>
      ordersApi.cancel(orderId, payload),
    onSuccess: invalidate,
  })

  const complete = useMutation({
    mutationFn: (payload?: { note?: string }) => ordersApi.complete(orderId, payload),
    onSuccess: invalidate,
  })

  const refund = useMutation({
    mutationFn: (payload?: { note?: string }) => ordersApi.refund(orderId, payload),
    onSuccess: invalidate,
  })

  const approveReturn = useMutation({
    mutationFn: (payload?: { note?: string }) => ordersApi.approveReturn(orderId, payload),
    onSuccess: invalidate,
  })

  const rejectReturn = useMutation({
    mutationFn: (payload?: { note?: string }) => ordersApi.rejectReturn(orderId, payload),
    onSuccess: invalidate,
  })

  const setPlacedStatus = useMutation({
    mutationFn: (payload: {
      status: PlacedPaidTargetStatus
      note?: string
      reason?: string
      shippingCarrier?: string
      trackingNumber?: string
    }) => ordersApi.updateStatus(orderId, payload),
    onSuccess: invalidate,
  })

  return {
    confirm,
    pack,
    ship,
    deliver,
    cancel,
    complete,
    refund,
    approveReturn,
    rejectReturn,
    setPlacedStatus,
  }
}
