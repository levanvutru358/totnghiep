import React from 'react'
import { StatusBadge } from '../../../components/common/status-badge'

interface ProductStatusBadgeProps {
  status: string
}

export const ProductStatusBadge: React.FC<ProductStatusBadgeProps> = ({ status }) => {
  const getVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success'
      case 'inactive':
        return 'error'
      case 'draft':
        return 'warning'
      default:
        return 'default'
    }
  }

  return <StatusBadge status={status} variant={getVariant(status)} />
}