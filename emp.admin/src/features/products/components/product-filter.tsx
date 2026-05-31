import React from 'react'
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Text,
  VStack,
} from '@chakra-ui/react'
import { SearchIcon } from '@chakra-ui/icons'
import type { CategorySelectGroup } from '../../categories/utils/category-brand.util'
import { getCategoryDisplayLabel } from '../../categories/utils/category-brand.util'

interface ProductFilters {
  search?: string
  category?: string
  brand?: string
  status?: string
  minPrice?: number
  maxPrice?: number
}

interface ProductFilterProps {
  filters: ProductFilters
  onFiltersChange: (filters: ProductFilters) => void
  onReset: () => void
  categoryGroups: CategorySelectGroup[]
  brandOptions: Array<{ value: string; label: string }>
}

export const ProductFilter: React.FC<ProductFilterProps> = ({
  filters,
  onFiltersChange,
  onReset,
  categoryGroups,
  brandOptions,
}) => {
  const handleChange = (key: keyof ProductFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Đang bán' },
    { value: 'inactive', label: 'Ngưng bán' },
  ]

  return (
    <Box
      bg="surface.card"
      p={5}
      borderRadius="xl"
      borderWidth="1px"
      borderColor="border.subtle"
      boxShadow="0 10px 28px rgba(15, 23, 42, 0.06)"
    >
      <VStack align="stretch" gap={4}>
        <HStack justify="space-between">
          <Box>
            <Text fontWeight="700" fontSize="md">Bộ lọc nâng cao</Text>
            <Text fontSize="sm" color="text.secondary">Lọc theo danh mục, trạng thái, thương hiệu và khoảng giá.</Text>
          </Box>
          <Button size="sm" variant="outline" onClick={onReset}>Xóa bộ lọc</Button>
        </HStack>

        <Divider />

        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: '2fr 1fr 1fr 1fr 1fr' }} gap={4}>
          <FormControl>
            <FormLabel mb={1.5}>Tìm kiếm</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                value={filters.search || ''}
                onChange={(e) => handleChange('search', e.target.value)}
                placeholder="Tìm theo sản phẩm, SKU, thương hiệu..."
                borderRadius="lg"
                bg="surface.input"
                borderColor="border.muted"
              />
            </InputGroup>
          </FormControl>

          <FormControl>
            <FormLabel mb={1.5}>Danh mục</FormLabel>
            <Select
              value={filters.category || ''}
              onChange={(e) => handleChange('category', e.target.value)}
              borderRadius="lg"
              bg="surface.input"
              borderColor="border.muted"
            >
              <option value="">Tất cả danh mục</option>
              {categoryGroups.map((group) => (
                <optgroup key={group.parent.id} label={getCategoryDisplayLabel(group.parent)}>
                  <option value={`parent:${group.parent.slug}`}>Tất cả {getCategoryDisplayLabel(group.parent)}</option>
                  {group.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel mb={1.5}>Trạng thái</FormLabel>
            <Select value={filters.status || ''} onChange={(e) => handleChange('status', e.target.value)} borderRadius="lg" bg="surface.input" borderColor="border.muted">
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel mb={1.5}>Thương hiệu</FormLabel>
            <Select value={filters.brand || ''} onChange={(e) => handleChange('brand', e.target.value)} borderRadius="lg" bg="surface.input" borderColor="border.muted">
              {brandOptions.map((option) => (
                <option key={option.value || 'all-brands'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel mb={1.5}>Khoảng giá</FormLabel>
            <HStack>
              <Input
                type="number"
                value={filters.minPrice || ''}
                onChange={(e) => handleChange('minPrice', parseFloat(e.target.value) || undefined)}
                placeholder="Từ"
                borderRadius="lg"
                bg="surface.input"
                borderColor="border.muted"
              />
              <Text color="text.secondary">-</Text>
              <Input
                type="number"
                value={filters.maxPrice || ''}
                onChange={(e) => handleChange('maxPrice', parseFloat(e.target.value) || undefined)}
                placeholder="Đến"
                borderRadius="lg"
                bg="surface.input"
                borderColor="border.muted"
              />
            </HStack>
          </FormControl>
        </Grid>

        <HStack justify="flex-end">
          <Text fontSize="xs" color="text.secondary">Bộ lọc được áp dụng tự động theo thời gian thực.</Text>
        </HStack>
      </VStack>
    </Box>
  )
}