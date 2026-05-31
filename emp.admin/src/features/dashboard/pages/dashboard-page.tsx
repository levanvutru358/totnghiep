import { Grid, GridItem, Heading, SimpleGrid, Skeleton, Text, VStack } from '@chakra-ui/react'
import { MetricCard } from '../../../shared/components/cards/metric-card'
import {
  LowStockAlerts,
  OrderStatusChart,
  RecentOrdersTable,
  RevenueChart,
  TopCategoriesChart,
  TopCustomers,
} from '../components'
import { useDashboardMetrics } from '../hooks/use-dashboard'

export const DashboardPage = () => {
  const metricsQuery = useDashboardMetrics()

  return (
    <VStack align="stretch" gap={6}>
      <VStack align="start" gap={1}>
        <Heading size="lg">Bảng điều khiển Ecommerce</Heading>
        <Text color="text.secondary">Theo dõi doanh thu, vận hành, tồn kho và hành vi khách hàng.</Text>
      </VStack>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4}>
        {metricsQuery.isLoading ? (
          [...Array(4)].map((_, index) => <Skeleton key={index} height="128px" borderRadius="lg" />)
        ) : (
          <>
            <MetricCard label="Tổng doanh thu" value={`$${(metricsQuery.data?.totalRevenue ?? 0).toLocaleString()}`} trendLabel="Tăng 12.4% so với tháng trước" />
            <MetricCard label="Tổng đơn hàng" value={`${metricsQuery.data?.totalOrders ?? 0}`} trendLabel="Sản lượng đơn ổn định" />
            <MetricCard label="Tỷ lệ chuyển đổi" value={`${metricsQuery.data?.conversionRate ?? 0}%`} progress={Math.round(metricsQuery.data?.conversionRate ?? 0)} />
            <MetricCard label="Giá trị đơn trung bình" value={`$${(metricsQuery.data?.averageOrderValue ?? 0).toFixed(2)}`} trendLabel="Giỏ hàng cải thiện" />
          </>
        )}
      </SimpleGrid>

      <Grid templateColumns={{ base: '1fr', xl: '2fr 1fr' }} gap={4}>
        <GridItem><RevenueChart /></GridItem>
        <GridItem><OrderStatusChart /></GridItem>
      </Grid>

      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={4}>
        <GridItem><TopCategoriesChart /></GridItem>
        <GridItem><LowStockAlerts /></GridItem>
      </Grid>

      <Grid templateColumns={{ base: '1fr', xl: '1.7fr 1fr' }} gap={4}>
        <GridItem><RecentOrdersTable /></GridItem>
        <GridItem><TopCustomers /></GridItem>
      </Grid>
    </VStack>
  )
}