export interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginationControls {
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
}