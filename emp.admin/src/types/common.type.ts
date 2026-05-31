export type Status = 'active' | 'inactive' | 'draft' | 'pending' | 'completed'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SearchParams {
  query?: string
  filters?: Record<string, any>
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}