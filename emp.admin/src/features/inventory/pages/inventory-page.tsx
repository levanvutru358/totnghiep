import axios from 'axios'
import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Skeleton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react'
import {
  useInventoryAdjustment,
  useInventoryLogs,
  useInventoryTransactionMutations,
} from '../../products/hooks/use-inventory'
import type { InventoryLog } from '../../products/types/product.type'
import { useVariants } from '../../products/hooks/use-variants'
import type { InventoryLogFilters } from '../../products/types/product.type'
import type { InventoryVariantOption } from '../../products/services/products.api'
import {
  filterVariantGroups,
  groupVariantsByBrand,
  isLowStock,
} from '../lib/group-variants-by-brand'

const nhanThaoTacKho: Record<'import' | 'export' | 'adjust', string> = {
  import: 'Nhập kho',
  export: 'Xuất kho',
  adjust: 'Điều chỉnh',
}

const stockColor = (stock: number) => {
  if (stock <= 0) return 'red'
  if (isLowStock(stock)) return 'orange'
  return 'green'
}

const extractApiError = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string })?.message
    if (message) return message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export const InventoryPage: React.FC = () => {
  const { data: variantsData, isLoading: variantsLoading, refetch: refetchVariants } = useVariants()
  const adjustmentMutation = useInventoryAdjustment()
  const { updateTransaction, deleteTransaction } = useInventoryTransactionMutations()

  const [brandFilter, setBrandFilter] = useState('')
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const [logBrand, setLogBrand] = useState('')
  const [logSearch, setLogSearch] = useState('')
  const [logType, setLogType] = useState<InventoryLogFilters['type']>('')
  const [logDateFrom, setLogDateFrom] = useState('')
  const [logDateTo, setLogDateTo] = useState('')
  const [logVariantId, setLogVariantId] = useState('')
  const [logPage, setLogPage] = useState(1)

  const logFilters = useMemo(
    (): InventoryLogFilters => ({
      brand: logBrand || undefined,
      search: logSearch.trim() || undefined,
      type: logType || undefined,
      dateFrom: logDateFrom || undefined,
      dateTo: logDateTo || undefined,
      variantId: logVariantId || undefined,
      page: logPage,
      limit: 20,
    }),
    [logBrand, logSearch, logType, logDateFrom, logDateTo, logVariantId, logPage],
  )

  const { data: logsData, isLoading: logsLoading, isFetching: logsFetching } = useInventoryLogs(logFilters)
  const logRows = logsData?.items ?? []

  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [variantId, setVariantId] = useState('')
  const [type, setType] = useState<'import' | 'export' | 'adjust'>('import')
  const [quantity, setQuantity] = useState(0)
  const [note, setNote] = useState('')

  const [editingLog, setEditingLog] = useState<InventoryLog | null>(null)
  const [editType, setEditType] = useState<'import' | 'export' | 'adjust'>('import')
  const [editQuantity, setEditQuantity] = useState(0)
  const [editNote, setEditNote] = useState('')

  const [quickStockVariant, setQuickStockVariant] = useState<InventoryVariantOption | null>(null)
  const [quickStockQty, setQuickStockQty] = useState(0)

  const variants = variantsData ?? []

  const brandGroups = useMemo(() => groupVariantsByBrand(variants), [variants])
  const brandNames = useMemo(() => brandGroups.map((g) => g.brand), [brandGroups])

  const filteredGroups = useMemo(
    () =>
      filterVariantGroups(brandGroups, {
        brand: brandFilter || undefined,
        search,
        lowStockOnly,
      }),
    [brandGroups, brandFilter, search, lowStockOnly],
  )

  const productsInBrand = useMemo(() => {
    if (!selectedBrand) return []
    const group = brandGroups.find((g) => g.brand === selectedBrand)
    return group?.products ?? []
  }, [brandGroups, selectedBrand])

  const variantsInProduct = useMemo(() => {
    if (!selectedProductId) return []
    const product = productsInBrand.find((p) => p.productId === selectedProductId)
    return product?.variants ?? []
  }, [productsInBrand, selectedProductId])

  useEffect(() => {
    setSelectedProductId('')
    setVariantId('')
  }, [selectedBrand])

  useEffect(() => {
    setVariantId('')
  }, [selectedProductId])

  useEffect(() => {
    setLogPage(1)
  }, [logBrand, logSearch, logType, logDateFrom, logDateTo, logVariantId])

  const resetLogFilters = () => {
    setLogBrand('')
    setLogSearch('')
    setLogType('')
    setLogDateFrom('')
    setLogDateTo('')
    setLogVariantId('')
    setLogPage(1)
  }

  const pickVariant = (variant: InventoryVariantOption) => {
    setSelectedBrand(variant.brand)
    setSelectedProductId(variant.productId)
    setVariantId(variant.id)
  }

  const handleSubmit = async () => {
    if (!variantId) {
      toast.error('Vui lòng chọn biến thể')
      return
    }
    if (type !== 'adjust' && quantity <= 0) {
      toast.error('Số lượng nhập/xuất phải lớn hơn 0')
      return
    }
    if (type === 'adjust' && quantity < 0) {
      toast.error('Tồn sau điều chỉnh không được âm')
      return
    }
    try {
      await adjustmentMutation.mutateAsync({ variantId, type, quantity, note })
      toast.success('Đã ghi nhận thao tác tồn kho')
      setQuantity(0)
      setNote('')
      await refetchVariants()
    } catch (error) {
      toast.error(extractApiError(error, 'Không thể cập nhật tồn kho'))
    }
  }

  const openEditLog = (log: InventoryLog) => {
    setEditingLog(log)
    setEditType(log.type)
    setEditQuantity(log.quantity)
    setEditNote(log.note ?? '')
  }

  const closeEditLog = () => {
    setEditingLog(null)
    setEditNote('')
  }

  const handleSaveEditLog = async () => {
    if (!editingLog) return
    if (editType !== 'adjust' && editQuantity <= 0) {
      toast.error('Số lượng nhập/xuất phải lớn hơn 0')
      return
    }
    if (editType === 'adjust' && editQuantity < 0) {
      toast.error('Tồn sau điều chỉnh không được âm')
      return
    }
    try {
      await updateTransaction.mutateAsync({
        id: editingLog.id,
        payload: { type: editType, quantity: editQuantity, note: editNote },
      })
      toast.success('Đã cập nhật nhật ký tồn kho')
      closeEditLog()
      await refetchVariants()
    } catch (error) {
      toast.error(extractApiError(error, 'Không thể sửa nhật ký'))
    }
  }

  const handleDeleteLog = async (log: InventoryLog) => {
    if (!window.confirm(`Xóa giao dịch ${log.sku} (${nhanThaoTacKho[log.type]} ${log.quantity})?`)) return
    try {
      await deleteTransaction.mutateAsync(log.id)
      toast.success('Đã xóa nhật ký và cập nhật lại tồn')
      await refetchVariants()
    } catch (error) {
      toast.error(extractApiError(error, 'Không thể xóa nhật ký'))
    }
  }

  const openQuickStock = (variant: InventoryVariantOption) => {
    setQuickStockVariant(variant)
    setQuickStockQty(variant.stock)
  }

  const handleQuickStockSave = async () => {
    if (!quickStockVariant) return
    if (quickStockQty < 0) {
      toast.error('Tồn không được âm')
      return
    }
    try {
      await adjustmentMutation.mutateAsync({
        variantId: quickStockVariant.id,
        type: 'adjust',
        quantity: quickStockQty,
        note: 'Sửa tồn nhanh từ bảng',
      })
      toast.success('Đã cập nhật tồn')
      setQuickStockVariant(null)
      await refetchVariants()
    } catch (error) {
      toast.error(extractApiError(error, 'Không thể cập nhật tồn'))
    }
  }

  const totalVariants = filteredGroups.reduce((n, g) => n + g.variantCount, 0)

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg">Quản lý tồn kho</Heading>
        <Text color="text.secondary">
          Xem tồn theo thương hiệu và sản phẩm, nhập / xuất / điều chỉnh từng biến thể.
        </Text>
      </Box>

      <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={4} boxShadow="sm">
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }} gap={3} alignItems="end">
          <FormControl>
            <FormLabel fontSize="sm">Thương hiệu</FormLabel>
            <Select size="sm" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} bg="white">
              <option value="">Tất cả hãng</option>
              {brandNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl gridColumn={{ lg: 'span 2' }}>
            <FormLabel fontSize="sm">Tìm kiếm</FormLabel>
            <Input
              size="sm"
              bg="white"
              placeholder="SKU, tên sản phẩm, size, màu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <Checkbox
              size="sm"
              isChecked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              colorScheme="orange"
            >
              Chỉ sắp hết (&lt; 10)
            </Checkbox>
          </FormControl>
        </Grid>
        {!variantsLoading && (
          <Text fontSize="sm" color="text.secondary" mt={2}>
            {totalVariants} biến thể · {filteredGroups.length} thương hiệu
          </Text>
        )}
      </Box>

      <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={6} boxShadow="sm">
        <Heading size="sm" mb={4}>
          Tồn kho theo thương hiệu
        </Heading>
        {variantsLoading && (
          <VStack align="stretch" gap={3}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={`inv-sk-${i}`} height="80px" borderRadius="md" />
            ))}
          </VStack>
        )}
        {!variantsLoading && filteredGroups.length === 0 && (
          <Text color="text.secondary">Không có biến thể phù hợp bộ lọc.</Text>
        )}
        {!variantsLoading &&
          filteredGroups.map((group) => (
            <Box key={group.brand} mb={6} _last={{ mb: 0 }}>
              <HStack justify="space-between" flexWrap="wrap" gap={2} mb={3}>
                <HStack>
                  <Heading size="sm">{group.brand}</Heading>
                  <Badge>{group.variantCount} SKU</Badge>
                  {group.lowStockCount > 0 && (
                    <Badge colorScheme="orange">{group.lowStockCount} sắp hết</Badge>
                  )}
                </HStack>
                <Text fontSize="sm" color="text.secondary">
                  Tổng tồn: <strong>{group.totalStock}</strong>
                </Text>
              </HStack>
              {group.products.map((product) => (
                <Box key={product.productId} mb={4} pl={{ base: 0, md: 3 }}>
                  <HStack mb={2} flexWrap="wrap" gap={2}>
                    <Text fontWeight="600">{product.productName}</Text>
                    {product.category && (
                      <Badge variant="subtle" colorScheme="gray">
                        {product.category}
                      </Badge>
                    )}
                    <Text fontSize="xs" color="text.secondary">
                      {product.variants.length} biến thể · tồn {product.totalStock}
                    </Text>
                  </HStack>
                  <Box overflowX="auto" borderWidth="1px" borderRadius="lg" borderColor="gray.100">
                    <Table size="sm" variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>SKU</Th>
                          <Th>Size</Th>
                          <Th>Màu</Th>
                          <Th isNumeric>Tồn</Th>
                          <Th w="140px">Thao tác</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {product.variants.map((v) => (
                          <Tr key={v.id} _hover={{ bg: 'gray.50' }}>
                            <Td fontFamily="mono" fontSize="xs">
                              {v.sku}
                            </Td>
                            <Td>{v.size}</Td>
                            <Td>{v.color}</Td>
                            <Td isNumeric>
                              <Badge colorScheme={stockColor(v.stock)}>{v.stock}</Badge>
                            </Td>
                            <Td>
                              <HStack spacing={1}>
                                <Button size="xs" variant="outline" onClick={() => pickVariant(v)}>
                                  Chọn
                                </Button>
                                <Button size="xs" variant="ghost" onClick={() => openQuickStock(v)}>
                                  Sửa tồn
                                </Button>
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </Box>
              ))}
              <Divider />
            </Box>
          ))}
      </Box>

      <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={6} boxShadow="sm">
        <Heading size="sm" mb={4}>
          Thao tác tồn kho
        </Heading>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }} gap={4}>
          <FormControl>
            <FormLabel>Thương hiệu</FormLabel>
            <Select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              isDisabled={variantsLoading}
              bg="white"
            >
              <option value="">Chọn hãng</option>
              {brandNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Sản phẩm</FormLabel>
            <Select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              isDisabled={!selectedBrand || variantsLoading}
              bg="white"
            >
              <option value="">Chọn sản phẩm</option>
              {productsInBrand.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productName} ({p.variants.length} SKU)
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Biến thể (SKU)</FormLabel>
            <Select
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              isDisabled={!selectedProductId || variantsLoading}
              bg="white"
            >
              <option value="">Chọn biến thể</option>
              {variantsInProduct.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.sku} — {v.size}/{v.color} (tồn: {v.stock})
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Loại thao tác</FormLabel>
            <Select value={type} onChange={(e) => setType(e.target.value as typeof type)} bg="white">
              <option value="import">Nhập kho</option>
              <option value="export">Xuất kho</option>
              <option value="adjust">Điều chỉnh tồn</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Số lượng</FormLabel>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} bg="white" />
          </FormControl>
          <FormControl>
            <FormLabel>Ghi chú</FormLabel>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú (không bắt buộc)"
              bg="white"
            />
          </FormControl>
        </Grid>
        <HStack justify="flex-end" mt={4}>
          <Button onClick={handleSubmit} isLoading={adjustmentMutation.isPending} isDisabled={variantsLoading}>
            Cập nhật tồn kho
          </Button>
        </HStack>
      </Box>

      <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={6} overflowX="auto" boxShadow="sm">
        <HStack justify="space-between" flexWrap="wrap" gap={2} mb={4}>
          <Heading size="sm">Nhật ký tồn kho</Heading>
          {logsData && (
            <Text fontSize="sm" color="text.secondary">
              {logsData.total} bản ghi
              {logsFetching && !logsLoading ? ' · đang tải...' : ''}
            </Text>
          )}
        </HStack>

        <Grid
          templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }}
          gap={3}
          mb={4}
          alignItems="end"
        >
          <FormControl>
            <FormLabel fontSize="sm">Hãng</FormLabel>
            <Select size="sm" bg="white" value={logBrand} onChange={(e) => setLogBrand(e.target.value)}>
              <option value="">Tất cả</option>
              {brandNames.map((name) => (
                <option key={`log-brand-${name}`} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Tìm kiếm</FormLabel>
            <Input
              size="sm"
              bg="white"
              placeholder="SKU, sản phẩm, hãng..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Loại thao tác</FormLabel>
            <Select size="sm" bg="white" value={logType} onChange={(e) => setLogType(e.target.value as InventoryLogFilters['type'])}>
              <option value="">Tất cả</option>
              <option value="import">Nhập kho</option>
              <option value="export">Xuất kho</option>
              <option value="adjust">Điều chỉnh</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Biến thể (SKU)</FormLabel>
            <Select size="sm" bg="white" value={logVariantId} onChange={(e) => setLogVariantId(e.target.value)} isDisabled={variantsLoading}>
              <option value="">Tất cả</option>
              {brandGroups.map((group) => (
                <optgroup key={group.brand} label={group.brand}>
                  {group.products.flatMap((p) =>
                    p.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.sku} — {p.productName}
                      </option>
                    )),
                  )}
                </optgroup>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Từ ngày</FormLabel>
            <Input size="sm" bg="white" type="date" value={logDateFrom} onChange={(e) => setLogDateFrom(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Đến ngày</FormLabel>
            <Input size="sm" bg="white" type="date" value={logDateTo} onChange={(e) => setLogDateTo(e.target.value)} />
          </FormControl>
          <FormControl>
            <Button size="sm" variant="outline" onClick={resetLogFilters}>
              Xóa lọc
            </Button>
          </FormControl>
        </Grid>

        {logsData && logsData.totalPages > 1 && (
          <HStack justify="flex-end" mb={3} gap={2}>
            <Button
              size="sm"
              variant="outline"
              isDisabled={logPage <= 1 || logsLoading}
              onClick={() => setLogPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </Button>
            <Text fontSize="sm" color="text.secondary">
              Trang {logPage} / {logsData.totalPages}
            </Text>
            <Button
              size="sm"
              variant="outline"
              isDisabled={logPage >= logsData.totalPages || logsLoading}
              onClick={() => setLogPage((p) => p + 1)}
            >
              Sau
            </Button>
          </HStack>
        )}

        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Thời gian</Th>
              <Th>Hãng</Th>
              <Th>Sản phẩm</Th>
              <Th>SKU</Th>
              <Th>Thao tác</Th>
              <Th isNumeric>Số lượng</Th>
              <Th isNumeric>Tồn sau</Th>
              <Th>Ghi chú</Th>
              <Th w="120px">Thao tác</Th>
            </Tr>
          </Thead>
          <Tbody>
            {logsLoading &&
              [...Array(6)].map((_, index) => (
                <Tr key={`inventory-skeleton-${index}`}>
                  {[...Array(8)].map((__, col) => (
                    <Td key={col}>
                      <Skeleton height="16px" borderRadius="md" />
                    </Td>
                  ))}
                </Tr>
              ))}
            {!logsLoading && logRows.length === 0 && (
              <Tr>
                <Td colSpan={8}>
                  <Text color="text.secondary" py={4} textAlign="center">
                    Không có nhật ký phù hợp bộ lọc.
                  </Text>
                </Td>
              </Tr>
            )}
            {logRows.map((log) => (
              <Tr key={log.id}>
                <Td whiteSpace="nowrap">{new Date(log.createdAt).toLocaleString('vi-VN')}</Td>
                <Td>{log.brand || '—'}</Td>
                <Td>{log.productName}</Td>
                <Td fontFamily="mono" fontSize="xs">
                  {log.sku}
                </Td>
                <Td>
                  <Badge colorScheme={log.type === 'import' ? 'green' : log.type === 'export' ? 'red' : 'orange'}>
                    {nhanThaoTacKho[log.type]}
                  </Badge>
                </Td>
                <Td isNumeric>
                  <Text fontWeight="700">{log.quantity}</Text>
                </Td>
                <Td isNumeric>
                  <Badge colorScheme={stockColor(log.stockAfter)}>{log.stockAfter}</Badge>
                </Td>
                <Td fontSize="xs" color="text.secondary" maxW="160px" noOfLines={2}>
                  {log.note || '—'}
                </Td>
                <Td>
                  <HStack spacing={1}>
                    <Button size="xs" variant="outline" onClick={() => openEditLog(log)}>
                      Sửa
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="red"
                      onClick={() => void handleDeleteLog(log)}
                      isLoading={deleteTransaction.isPending}
                    >
                      Xóa
                    </Button>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Modal isOpen={!!editingLog} onClose={closeEditLog} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Sửa nhật ký tồn kho</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="text.secondary">
                {editingLog?.sku} · {editingLog?.productName}
              </Text>
              <FormControl>
                <FormLabel>Loại thao tác</FormLabel>
                <Select value={editType} onChange={(e) => setEditType(e.target.value as typeof editType)}>
                  <option value="import">Nhập kho</option>
                  <option value="export">Xuất kho</option>
                  <option value="adjust">Điều chỉnh tồn</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>{editType === 'adjust' ? 'Tồn sau điều chỉnh' : 'Số lượng'}</FormLabel>
                <Input
                  type="number"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(Number(e.target.value))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Ghi chú</FormLabel>
                <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={2} onClick={closeEditLog}>
              Hủy
            </Button>
            <Button onClick={() => void handleSaveEditLog()} isLoading={updateTransaction.isPending}>
              Lưu
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={!!quickStockVariant} onClose={() => setQuickStockVariant(null)} size="sm">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Sửa tồn nhanh</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" mb={2}>
              {quickStockVariant?.sku} — {quickStockVariant?.size}/{quickStockVariant?.color}
            </Text>
            <FormControl>
              <FormLabel>Tồn mới</FormLabel>
              <Input
                type="number"
                value={quickStockQty}
                onChange={(e) => setQuickStockQty(Number(e.target.value))}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={2} onClick={() => setQuickStockVariant(null)}>
              Hủy
            </Button>
            <Button onClick={() => void handleQuickStockSave()} isLoading={adjustmentMutation.isPending}>
              Lưu
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  )
}
