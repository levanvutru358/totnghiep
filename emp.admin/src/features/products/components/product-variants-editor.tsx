import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  IconButton,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon } from '@chakra-ui/icons'
import type { ProductColorImages, ProductVariant } from '../types/product.type'
import { ProductImagesUpload, type ProductImageItem } from './product-image-upload'
import {
  buildVariantSku,
  colorGroupsToColorImages,
  colorGroupsToVariants,
  createEmptyColorGroup,
  mergeColorImagesIntoGroups,
  parseSizeList,
  type VariantColorGroup,
  variantsToColorGroups,
} from '../lib/product-variants.lib'

const urlsToImageItems = (urls: string[]): ProductImageItem[] =>
  urls.filter(Boolean).map((value) => ({ kind: 'url' as const, value }))

interface ProductVariantsEditorProps {
  value: ProductVariant[]
  onChange: (variants: ProductVariant[]) => void
  onColorImagesChange?: (colorImages: ProductColorImages[]) => void
  productName?: string
  colorImages?: ProductColorImages[]
  errorMessage?: string
  /** Đổi khi load sản phẩm khác — tránh reset khi đang gõ */
  resetKey?: string
}

export const ProductVariantsEditor: React.FC<ProductVariantsEditorProps> = ({
  value,
  onChange,
  onColorImagesChange,
  productName = '',
  colorImages = [],
  errorMessage,
  resetKey = 'new',
}) => {
  const [groups, setGroups] = useState<VariantColorGroup[]>(() =>
    mergeColorImagesIntoGroups(variantsToColorGroups(value), colorImages),
  )
  const [imageDrafts, setImageDrafts] = useState<Record<string, ProductImageItem[]>>({})
  const [bulkSizeDraftByColor, setBulkSizeDraftByColor] = useState<Record<number, string>>({})
  const hydratedResetKeyRef = useRef<string | null>(null)

  useEffect(() => {
    hydratedResetKeyRef.current = null
  }, [resetKey])

  useEffect(() => {
    if (!resetKey || resetKey.startsWith('loading-')) return
    if (hydratedResetKeyRef.current === resetKey) return

    const hasVariants =
      value.length > 0 && value.some((variant) => variant.color.trim() || variant.size.trim())
    const hasColorImages = colorImages.some((entry) => entry.imageUrls.length > 0)
    if (!hasVariants && !hasColorImages) return

    hydratedResetKeyRef.current = resetKey

    const nextGroups = mergeColorImagesIntoGroups(variantsToColorGroups(value), colorImages)
    setGroups(nextGroups.length > 0 ? nextGroups : [createEmptyColorGroup()])
    const drafts: Record<string, ProductImageItem[]> = {}
    for (const group of nextGroups) {
      drafts[group.clientId] = urlsToImageItems(group.imageUrls)
    }
    setImageDrafts(drafts)
    setBulkSizeDraftByColor({})
  }, [resetKey, value, colorImages])

  useEffect(() => {
    if (groups.length === 0) {
      setGroups([createEmptyColorGroup()])
    }
  }, [groups.length])

  const skuPrefix = useMemo(() => {
    const words = productName.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return ''
    if (words.length === 1) return words[0].slice(0, 6)
    return words.map((word) => word[0]).join('').toUpperCase()
  }, [productName])

  const emitGroups = (normalized: VariantColorGroup[]) => {
    onChange(colorGroupsToVariants(normalized))
    onColorImagesChange?.(colorGroupsToColorImages(normalized))
  }

  const syncGroups = (next: VariantColorGroup[]) => {
    const normalized = next.length > 0 ? next : [createEmptyColorGroup()]
    setGroups(normalized)
    emitGroups(normalized)
  }

  const updateColorImages = (clientId: string, next: React.SetStateAction<ProductImageItem[]>) => {
    const group = groups.find((item) => item.clientId === clientId)
    if (!group) return

    const previousItems = imageDrafts[clientId] ?? urlsToImageItems(group.imageUrls)
    const items = typeof next === 'function' ? next(previousItems) : next
    const imageUrls = items.filter((item) => item.kind === 'url').map((item) => item.value)

    setImageDrafts((drafts) => ({ ...drafts, [clientId]: items }))
    syncGroups(groups.map((item) => (item.clientId === clientId ? { ...item, imageUrls } : item)))
  }

  const updateColor = (colorIndex: number, color: string) => {
    syncGroups(
      groups.map((group, index) => (index === colorIndex ? { ...group, color } : group)),
    )
  }

  const updateSizeRow = (
    colorIndex: number,
    sizeIndex: number,
    patch: Partial<VariantColorGroup['sizes'][number]>,
  ) => {
    syncGroups(
      groups.map((group, index) => {
        if (index !== colorIndex) return group
        return {
          ...group,
          sizes: group.sizes.map((row, rowIndex) =>
            rowIndex === sizeIndex ? { ...row, ...patch } : row,
          ),
        }
      }),
    )
  }

  const addColor = () => {
    syncGroups([...groups, createEmptyColorGroup()])
  }

  const removeColor = (colorIndex: number) => {
    if (groups.length <= 1) {
      syncGroups([createEmptyColorGroup()])
      return
    }
    syncGroups(groups.filter((_, index) => index !== colorIndex))
  }

  const removeSizeRow = (colorIndex: number, sizeIndex: number) => {
    syncGroups(
      groups.map((group, index) => {
        if (index !== colorIndex) return group
        return {
          ...group,
          sizes: group.sizes.filter((_, rowIndex) => rowIndex !== sizeIndex),
        }
      }),
    )
  }

  const addBulkSizes = (colorIndex: number) => {
    const draft = bulkSizeDraftByColor[colorIndex] ?? ''
    const parsed = parseSizeList(draft)
    if (parsed.length === 0) return

    syncGroups(
      groups.map((group, index) => {
        if (index !== colorIndex) return group

        const existing = new Set(group.sizes.map((row) => row.size.trim().toLowerCase()))
        const appended = parsed
          .filter((size) => !existing.has(size.toLowerCase()))
          .map((size) => ({
            size,
            sku: buildVariantSku(group.color, size, skuPrefix),
            stock: 0,
          }))

        return {
          ...group,
          sizes: [...group.sizes, ...appended],
        }
      }),
    )

    setBulkSizeDraftByColor((prev) => ({ ...prev, [colorIndex]: '' }))
  }

  const fillMissingSkus = (colorIndex: number) => {
    syncGroups(
      groups.map((group, index) => {
        if (index !== colorIndex) return group
        return {
          ...group,
          sizes: group.sizes.map((row) => ({
            ...row,
            sku:
              row.sku.trim() ||
              buildVariantSku(group.color, row.size, skuPrefix),
          })),
        }
      }),
    )
  }

  const totalVariants = useMemo(
    () =>
      groups.reduce(
        (count, group) =>
          count + group.sizes.filter((row) => row.size.trim() && group.color.trim()).length,
        0,
      ),
    [groups],
  )
  const totalStock = useMemo(
    () => groups.reduce((sum, group) => sum + group.sizes.reduce((s, row) => s + (Number(row.stock) || 0), 0), 0),
    [groups],
  )

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Text fontWeight="600">Màu sắc & kích cỡ</Text>
          <Text fontSize="sm" color="text.secondary">
            Mỗi màu có nhiều size (VD: Đen — 40, 41, 42 · Trắng — 40, 41).
          </Text>
        </Box>
        <HStack spacing={2}>
          <Badge colorScheme="purple">{groups.length} màu</Badge>
          <Badge colorScheme="blue">{totalVariants} biến thể</Badge>
          <Badge colorScheme="green">Tồn: {totalStock}</Badge>
          <Button type="button" size="sm" variant="outline" leftIcon={<AddIcon />} onClick={addColor}>
            Thêm màu
          </Button>
        </HStack>
      </HStack>

      {groups.map((group, colorIndex) => (
        <Box
          key={group.clientId}
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="lg"
          p={4}
          bg="gray.50"
        >
          <Grid templateColumns={{ base: '1fr', md: '1fr auto' }} gap={3} alignItems="end" mb={3}>
            <FormControl>
              <FormLabel>Màu sắc</FormLabel>
              <Input
                value={group.color}
                onChange={(event) => updateColor(colorIndex, event.target.value)}
                placeholder="VD: Đen, Trắng, Xanh navy"
              />
            </FormControl>
            <HStack>
              <Button type="button" size="sm" variant="outline" onClick={() => fillMissingSkus(colorIndex)}>
                Gợi ý SKU
              </Button>
              <IconButton
                type="button"
                aria-label="Xóa màu"
                icon={<DeleteIcon />}
                size="sm"
                colorScheme="red"
                variant="outline"
                onClick={() => removeColor(colorIndex)}
              />
            </HStack>
          </Grid>

          <Box bg="white" borderWidth="1px" borderRadius="md" p={3} mb={3}>
            <Text fontSize="sm" fontWeight="600" mb={2}>
              Thêm nhiều kích cỡ cùng lúc
            </Text>
            <HStack align="end" flexWrap="wrap" gap={2}>
              <FormControl flex="1" minW="200px">
                <FormLabel fontSize="xs">Danh sách size</FormLabel>
                <Input
                  size="sm"
                  placeholder="40, 41, 42, 43"
                  value={bulkSizeDraftByColor[colorIndex] ?? ''}
                  onChange={(event) =>
                    setBulkSizeDraftByColor((prev) => ({
                      ...prev,
                      [colorIndex]: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addBulkSizes(colorIndex)
                    }
                  }}
                />
              </FormControl>
              <Button type="button" size="sm" onClick={() => addBulkSizes(colorIndex)}>
                Thêm các size
              </Button>
            </HStack>
          </Box>

          <VStack align="stretch" spacing={2}>
            {group.sizes.length === 0 ? (
              <Text fontSize="sm" color="text.secondary" py={1}>
                Chưa có kích cỡ. Nhập danh sách size phía trên rồi bấm «Thêm các size».
              </Text>
            ) : (
              <>
            <Grid
              templateColumns={{ base: '1fr', md: '120px 1fr 100px 40px' }}
              gap={2}
              display={{ base: 'none', md: 'grid' }}
            >
              <Text fontSize="xs" fontWeight="700" color="text.secondary">
                KÍCH CỠ
              </Text>
              <Text fontSize="xs" fontWeight="700" color="text.secondary">
                SKU
              </Text>
              <Text fontSize="xs" fontWeight="700" color="text.secondary">
                TỒN KHO
              </Text>
              <Text />
            </Grid>

            {group.sizes.map((row, sizeIndex) => (
              <Grid
                key={`${group.clientId}-${row.id ?? sizeIndex}`}
                templateColumns={{ base: '1fr', md: '120px 1fr 100px 40px' }}
                gap={2}
                alignItems="end"
              >
                <FormControl>
                  <FormLabel display={{ base: 'block', md: 'none' }} fontSize="xs">
                    Kích cỡ
                  </FormLabel>
                  <Input
                    size="sm"
                    value={row.size}
                    onChange={(event) =>
                      updateSizeRow(colorIndex, sizeIndex, { size: event.target.value })
                    }
                    placeholder="VD: 41"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel display={{ base: 'block', md: 'none' }} fontSize="xs">
                    SKU
                  </FormLabel>
                  <Input
                    size="sm"
                    value={row.sku}
                    onChange={(event) =>
                      updateSizeRow(colorIndex, sizeIndex, { sku: event.target.value })
                    }
                    placeholder={
                      group.color.trim() && row.size.trim()
                        ? buildVariantSku(group.color, row.size, skuPrefix)
                        : 'SKU'
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel display={{ base: 'block', md: 'none' }} fontSize="xs">
                    Tồn kho
                  </FormLabel>
                  <Input
                    size="sm"
                    type="number"
                    min={0}
                    value={row.stock}
                    onChange={(event) =>
                      updateSizeRow(colorIndex, sizeIndex, {
                        stock: Number(event.target.value) || 0,
                      })
                    }
                  />
                </FormControl>
                <IconButton
                  type="button"
                  aria-label="Xóa size"
                  icon={<DeleteIcon />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={() => removeSizeRow(colorIndex, sizeIndex)}
                />
              </Grid>
            ))}
              </>
            )}
          </VStack>

          <Divider my={3} />

          <Box bg="white" borderWidth="1px" borderRadius="md" p={3}>
            <Text fontSize="sm" fontWeight="600" mb={2}>
              Ảnh sản phẩm
              {group.color.trim() ? ` — ${group.color.trim()}` : ''}
            </Text>
            <Text fontSize="xs" color="text.secondary" mb={3}>
              Ảnh riêng cho màu này. Ảnh đầu tiên là ảnh bìa khi khách chọn màu trên shop.
            </Text>
            <ProductImagesUpload
              items={imageDrafts[group.clientId] ?? urlsToImageItems(group.imageUrls)}
              onChange={(next) => updateColorImages(group.clientId, next)}
            />
          </Box>
        </Box>
      ))}

      {errorMessage ? (
        <Text color="red.500" fontSize="sm">
          {errorMessage}
        </Text>
      ) : null}
    </VStack>
  )
}
