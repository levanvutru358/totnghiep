import { Skeleton } from '@chakra-ui/react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SectionCard } from '../../../shared/components/cards/section-card'
import { useOrderStatusDistribution } from '../hooks/use-dashboard'

export const OrderStatusChart = () => {
  const { data, isLoading } = useOrderStatusDistribution()

  return (
    <SectionCard title="Phân bổ trạng thái đơn hàng">
      {isLoading ? (
        <Skeleton height="260px" borderRadius="md" />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis />
            <Tooltip formatter={(value) => [`${Number(value ?? 0)}%`, 'Tỷ trọng']} />
            <Bar dataKey="value" fill="#2B6CB0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  )
}
