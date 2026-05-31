import { Card, CardBody, CardHeader, HStack, Heading } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  actions?: ReactNode
  children: ReactNode
}

export const SectionCard = ({ title, actions, children }: SectionCardProps) => {
  return (
    <Card>
      <CardHeader pb={2}>
        <HStack justify="space-between" align="center">
          <Heading as="h3" size="sm">{title}</Heading>
          {actions}
        </HStack>
      </CardHeader>
      <CardBody pt={2}>{children}</CardBody>
    </Card>
  )
}
