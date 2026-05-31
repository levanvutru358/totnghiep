import { Skeleton } from '@chakra-ui/react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { SectionCard } from '../../../shared/components/cards/section-card'
import { useTopSellingCategories } from '../hooks/use-dashboard'

const chartColors = ['#3182CE', '#38A169', '#D69E2E', '#DD6B20', '#805AD5']

export const TopCategoriesChart = () => {
  const { data, isLoading } = useTopSellingCategories()

  return (
    <SectionCard title="Danh mục bán chạy">
      {isLoading ? (
        <Skeleton height="260px" borderRadius="md" />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="sales" nameKey="category" innerRadius={55} outerRadius={95} paddingAngle={4}>
              {(data ?? []).map((entry, index) => (
                <Cell key={entry.category} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  )
}
