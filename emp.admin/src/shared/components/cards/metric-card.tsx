import { Card, CardBody, HStack, Progress, Stat, StatHelpText, StatLabel, StatNumber, Text } from '@chakra-ui/react'

interface MetricCardProps {
  label: string
  value: string
  trendLabel?: string
  progress?: number
}

export const MetricCard = ({ label, value, trendLabel, progress }: MetricCardProps) => {
  return (
    <Card>
      <CardBody>
        <Stat>
          <StatLabel color="text.secondary">{label}</StatLabel>
          <StatNumber fontSize="2xl">{value}</StatNumber>
          {trendLabel && <StatHelpText>{trendLabel}</StatHelpText>}
        </Stat>
        {typeof progress === 'number' && (
          <HStack mt={2} justify="space-between">
            <Progress value={progress} size="sm" w="full" borderRadius="full" colorScheme="blue" />
            <Text fontSize="xs" color="text.secondary">{progress}%</Text>
          </HStack>
        )}
      </CardBody>
    </Card>
  )
}
