import {
  Box,
  Skeleton,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  Button,
  VStack,
} from '@chakra-ui/react'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'

interface DataTableProps<TData> {
  data: TData[]
  columns: Array<ColumnDef<TData, any>>
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  emptyText?: string
}

export function DataTable<TData>({
  data,
  columns,
  isLoading,
  isError,
  onRetry,
  emptyText = 'Không có dữ liệu.',
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const hasRows = useMemo(() => table.getRowModel().rows.length > 0, [table])

  if (isLoading) {
    return (
      <VStack align="stretch" gap={3}>
        {[...Array(6)].map((_, index) => (
          <Skeleton key={index} height="32px" borderRadius="md" />
        ))}
      </VStack>
    )
  }

  if (isError) {
    return (
      <VStack gap={3} py={8}>
        <Text color="error">Không thể tải dữ liệu lúc này.</Text>
        <Button onClick={onRetry}>Thử lại</Button>
      </VStack>
    )
  }

  if (!hasRows) {
    return (
      <Box py={10} textAlign="center">
        <Text color="text.secondary">{emptyText}</Text>
      </Box>
    )
  }

  return (
    <TableContainer>
      <Table variant="simple" size="sm">
        <Thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <Tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Th key={header.id} onClick={header.column.getToggleSortingHandler()} cursor={header.column.getCanSort() ? 'pointer' : 'default'}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </Th>
              ))}
            </Tr>
          ))}
        </Thead>
        <Tbody>
          {table.getRowModel().rows.map((row) => (
            <Tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  )
}
