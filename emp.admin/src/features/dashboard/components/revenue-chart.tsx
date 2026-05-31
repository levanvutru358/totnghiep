import { ButtonGroup, Skeleton, Select } from '@chakra-ui/react'
import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SectionCard } from '../../../shared/components/cards/section-card'
import { useRevenueSeries } from '../hooks/use-dashboard'
import type { RevenueRange } from '../types/dashboard.type'

export const RevenueChart = () => {
  const [range, setRange] = useState<RevenueRange>('weekly')
  const { data, isLoading } = useRevenueSeries(range)

  return (
    <SectionCard
      title="Xu hướng doanh thu"
      actions={
        <ButtonGroup size="sm" isAttached>
          <Select value={range} onChange={(event) => setRange(event.target.value as RevenueRange)} aria-label="Chọn khoảng doanh thu">
            <option value="daily">Theo ngày</option>
            <option value="weekly">Theo tuần</option>
            <option value="monthly">Theo tháng</option>
          </Select>
        </ButtonGroup>
      }
    >
      {isLoading ? (
        <Skeleton height="280px" borderRadius="md" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, 'Doanh thu']} />
            <Area dataKey="value" type="monotone" stroke="#3182CE" fill="#90CDF4" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  )
}
