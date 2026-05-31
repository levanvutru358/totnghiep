import { ChevronDownIcon, ChevronRightIcon, StarIcon } from '@chakra-ui/icons'
import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  IconButton,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Image,
  Input,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { buildShoeCategoryMenu } from '../lib/shoe-category-tree'
import { clientCategoriesApi } from '../services/categories.api'
import { ProductGridCard } from '../../products/components/product-grid-card'
import { formatProductCategoryLine } from '../../products/lib/category-labels'
import { getProductCardPricing } from '../../products/lib/product-card-pricing'
import { clientProductsApi } from '../../products/services/products.api'
import type { ProductItem } from '../../products/types/product.type'
import { buildProductPath } from '../../products/utils/product-url'
import {
  findActivePricePreset,
  formatPriceFilterSummary,
  parsePriceParam,
  PRICE_FILTER_PRESETS,
} from '../lib/price-filter-presets'

export const CategoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryMenu, setCategoryMenu] = useState<ReturnType<typeof buildShoeCategoryMenu>>([])
  const [customMin, setCustomMin] = useState('')
  const [customMax, setCustomMax] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const parentSlug = searchParams.get('parent') ?? ''
  const categorySlug = searchParams.get('category') ?? ''
  const searchQuery = (searchParams.get('q') ?? '').trim()
  const minPrice = parsePriceParam(searchParams.get('minPrice'))
  const maxPrice = parsePriceParam(searchParams.get('maxPrice'))
  const activePricePreset = findActivePricePreset(minPrice, maxPrice)
  const priceFilterSummary = formatPriceFilterSummary(minPrice, maxPrice)

  const activeFilterSlug = categorySlug || parentSlug || ''

  const patchSearchParams = (patch: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next)
  }

  useEffect(() => {
    let cancelled = false
    void clientCategoriesApi
      .list()
      .then((items) => {
        if (!cancelled) setCategoryMenu(buildShoeCategoryMenu(items))
      })
      .catch(() => {
        if (!cancelled) setCategoryMenu([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void clientProductsApi
      .list({
        categorySlug: activeFilterSlug || undefined,
        search: searchQuery || undefined,
        minPrice,
        maxPrice,
      })
      .then((items) => {
        if (!cancelled) {
          setProducts(items)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([])
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [activeFilterSlug, searchQuery, minPrice, maxPrice])

  const filteredProducts = useMemo(() => {
    if (minPrice == null && maxPrice == null) return products
    return products.filter((product) => {
      const price = getProductCardPricing(product).displayPrice
      if (minPrice != null && price < minPrice) return false
      if (maxPrice != null && price > maxPrice) return false
      return true
    })
  }, [products, minPrice, maxPrice])

  useEffect(() => {
    setCustomMin(minPrice != null ? String(minPrice) : '')
    setCustomMax(maxPrice != null ? String(maxPrice) : '')
  }, [minPrice, maxPrice])

  useEffect(() => {
    if (categoryMenu.length === 0) return
    setExpandedGroups((prev) => {
      const next = { ...prev }
      for (const group of categoryMenu) {
        const isActive =
          parentSlug === group.slug || group.children.some((child) => child.slug === categorySlug)
        if (isActive) next[group.slug] = true
      }
      return next
    })
  }, [categoryMenu, parentSlug, categorySlug])

  const toggleGroupExpanded = (slug: string) => {
    setExpandedGroups((prev) => ({ ...prev, [slug]: !prev[slug] }))
  }

  const activeGroup = useMemo(() => {
    if (categorySlug) {
      return categoryMenu.find((group) => group.children.some((child) => child.slug === categorySlug)) ?? null
    }
    if (parentSlug) {
      return categoryMenu.find((group) => group.slug === parentSlug) ?? null
    }
    return null
  }, [categoryMenu, categorySlug, parentSlug])

  const activeChild = useMemo(() => {
    if (!categorySlug || !activeGroup) return null
    return activeGroup.children.find((child) => child.slug === categorySlug) ?? null
  }, [activeGroup, categorySlug])

  const title = useMemo(() => {
    if (searchQuery) return `Kết quả tìm kiếm: “${searchQuery}”`
    if (activeChild && activeGroup) return `${activeGroup.label} · ${activeChild.label}`
    if (activeGroup) return activeGroup.label
    return 'Danh mục sản phẩm'
  }, [activeChild, activeGroup, searchQuery])

  const selectParent = (slug: string) => {
    patchSearchParams({ parent: slug, category: null })
  }

  const selectChild = (slug: string, parent: string) => {
    patchSearchParams({ category: slug, parent })
    setExpandedGroups((prev) => ({ ...prev, [parent]: true }))
  }

  const selectParentAndExpand = (slug: string) => {
    setExpandedGroups((prev) => ({ ...prev, [slug]: true }))
    selectParent(slug)
  }

  const clearFilter = () => setSearchParams({})

  const clearSearch = () => {
    patchSearchParams({ q: null })
  }

  const applyPricePreset = (presetId: string) => {
    const preset = PRICE_FILTER_PRESETS.find((item) => item.id === presetId)
    if (!preset) return
    patchSearchParams({
      minPrice: preset.min != null ? String(preset.min) : null,
      maxPrice: preset.max != null ? String(preset.max) : null,
    })
  }

  const applyCustomPrice = () => {
    const min = customMin.trim() ? Number(customMin) : null
    const max = customMax.trim() ? Number(customMax) : null
    if (min != null && (!Number.isFinite(min) || min < 0)) return
    if (max != null && (!Number.isFinite(max) || max < 0)) return
    if (min != null && max != null && min > max) return
    patchSearchParams({
      minPrice: min != null ? String(min) : null,
      maxPrice: max != null ? String(max) : null,
    })
  }

  const clearPriceFilter = () => {
    patchSearchParams({ minPrice: null, maxPrice: null })
  }

  return (
    <VStack align="stretch" spacing={5}>
      <HStack spacing={2} fontSize="sm" color="text.secondary" flexWrap="wrap">
        <Link to={ROUTES.HOME} className="hover:text-gray-900">
          Trang chủ
        </Link>
        <ChevronRightIcon />
        <Text color="text.primary" fontWeight="600">
          {title}
        </Text>
      </HStack>

      <Grid templateColumns={{ base: '1fr', lg: '260px 1fr' }} gap={4}>
        <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
          <Heading size="sm" mb={3}>
            Khám phá theo danh mục
          </Heading>
          <VStack align="stretch" spacing={2}>
            <Button
              justifyContent="flex-start"
              variant={!activeFilterSlug ? 'solid' : 'ghost'}
              colorScheme={!activeFilterSlug ? 'pink' : undefined}
              bg={!activeFilterSlug ? 'brand.600' : 'transparent'}
              _hover={{ bg: !activeFilterSlug ? 'brand.700' : 'gray.50' }}
              onClick={clearFilter}
            >
              Tất cả
            </Button>
            {categoryMenu.map((group) => {
              const parentActive = parentSlug === group.slug && !categorySlug
              const hasActiveChild = group.children.some((child) => child.slug === categorySlug)
              const isExpanded = Boolean(expandedGroups[group.slug])
              return (
                <Box key={group.slug} borderWidth="1px" borderColor="border.subtle" borderRadius="lg" overflow="hidden">
                  <HStack spacing={0} align="stretch">
                    <IconButton
                      aria-label={isExpanded ? 'Thu gọn danh mục' : 'Mở rộng danh mục'}
                      icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                      size="sm"
                      variant="ghost"
                      borderRadius={0}
                      minW="36px"
                      onClick={() => toggleGroupExpanded(group.slug)}
                    />
                    <Button
                      flex={1}
                      justifyContent="flex-start"
                      variant={parentActive || hasActiveChild ? 'solid' : 'ghost'}
                      colorScheme={parentActive || hasActiveChild ? 'pink' : undefined}
                      bg={parentActive || hasActiveChild ? 'brand.600' : 'transparent'}
                      color={parentActive || hasActiveChild ? 'white' : undefined}
                      borderRadius={0}
                      fontWeight="700"
                      _hover={{ bg: parentActive || hasActiveChild ? 'brand.700' : 'gray.50' }}
                      onClick={() => selectParentAndExpand(group.slug)}
                    >
                      {group.label}
                    </Button>
                  </HStack>
                  <Collapse in={isExpanded} animateOpacity>
                    <VStack align="stretch" spacing={0} pl={2} pb={1} bg="gray.50">
                      {group.children.map((child) => {
                        const childActive = categorySlug === child.slug
                        return (
                          <Button
                            key={child.slug}
                            size="sm"
                            justifyContent="flex-start"
                            variant={childActive ? 'solid' : 'ghost'}
                            colorScheme={childActive ? 'pink' : undefined}
                            bg={childActive ? 'brand.600' : 'transparent'}
                            color={childActive ? 'white' : undefined}
                            _hover={{ bg: childActive ? 'brand.700' : 'gray.50' }}
                            onClick={() => selectChild(child.slug, group.slug)}
                          >
                            {child.label}
                          </Button>
                        )
                      })}
                    </VStack>
                  </Collapse>
                </Box>
              )
            })}
          </VStack>

          <Divider my={4} />

          <Heading size="xs" color="text.secondary" mb={2} textTransform="uppercase">
            Lọc theo giá
          </Heading>
          <VStack align="stretch" spacing={1} mb={3}>
            {PRICE_FILTER_PRESETS.map((preset) => {
              const active = activePricePreset === preset.id
              return (
                <Button
                  key={preset.id}
                  size="sm"
                  justifyContent="flex-start"
                  variant={active ? 'solid' : 'ghost'}
                  colorScheme={active ? 'pink' : undefined}
                  bg={active ? 'brand.600' : 'transparent'}
                  _hover={{ bg: active ? 'brand.700' : 'gray.50' }}
                  onClick={() => applyPricePreset(preset.id)}
                >
                  {preset.label}
                </Button>
              )
            })}
          </VStack>
          <VStack align="stretch" spacing={2}>
            <Text fontSize="xs" color="text.secondary">
              Tùy chỉnh (đơn vị nghìn đồng: 129 → 129.000đ)
            </Text>
            <HStack spacing={2}>
              <FormControl>
                <FormLabel fontSize="xs" mb={1}>
                  Từ
                </FormLabel>
                <Input
                  size="sm"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={customMin}
                  onChange={(event) => setCustomMin(event.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" mb={1}>
                  Đến
                </FormLabel>
                <Input
                  size="sm"
                  type="number"
                  min={0}
                  placeholder="∞"
                  value={customMax}
                  onChange={(event) => setCustomMax(event.target.value)}
                />
              </FormControl>
            </HStack>
            <HStack spacing={2}>
              <Button size="sm" flex={1} colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }} onClick={applyCustomPrice}>
                Áp dụng
              </Button>
              {priceFilterSummary ? (
                <Button size="sm" flex={1} variant="outline" onClick={clearPriceFilter}>
                  Xóa lọc giá
                </Button>
              ) : null}
            </HStack>
          </VStack>
        </Box>

        <VStack align="stretch" spacing={4}>
          <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" overflow="hidden">
            <AspectRatio ratio={16 / 4}>
              <Image
                src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1600"
                alt="Category banner"
                objectFit="cover"
              />
            </AspectRatio>
            <Box p={4}>
              <Heading size="md">{title}</Heading>
              <Text color="text.secondary" fontSize="sm" mt={1}>
                {activeGroup
                  ? 'Chọn loại giày cụ thể ở cột trái hoặc dùng thẻ bên dưới để lọc sản phẩm.'
                  : 'Tất cả sản phẩm đang bán — lọc theo nhóm danh mục giày dép.'}
              </Text>
            </Box>
          </Box>

          {activeGroup && (
            <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
              <HStack justify="space-between" mb={3}>
                <Heading size="sm">{activeGroup.label}</Heading>
                <Text fontSize="sm" color="text.secondary">
                  Gợi ý theo loại giày
                </Text>
              </HStack>
              <HStack spacing={2} overflowX="auto" pb={1}>
                <Button
                  size="sm"
                  variant={!categorySlug && parentSlug === activeGroup.slug ? 'solid' : 'outline'}
                  colorScheme="pink"
                  onClick={() => selectParent(activeGroup.slug)}
                  flexShrink={0}
                >
                  Tất cả {activeGroup.label}
                </Button>
                {activeGroup.children.map((child) => (
                  <Button
                    key={child.slug}
                    size="sm"
                    variant={categorySlug === child.slug ? 'solid' : 'outline'}
                    colorScheme={categorySlug === child.slug ? 'pink' : undefined}
                    borderColor="border.muted"
                    onClick={() => selectChild(child.slug, activeGroup.slug)}
                    flexShrink={0}
                  >
                    {child.label}
                  </Button>
                ))}
              </HStack>
            </Box>
          )}

          <Box>
            <HStack justify="space-between" mb={3} flexWrap="wrap" gap={2}>
              <HStack spacing={2}>
                <Heading size="sm">Sản phẩm</Heading>
                <Badge borderRadius="full" colorScheme="gray">
                  {loading ? '…' : filteredProducts.length}
                </Badge>
              </HStack>
              <HStack spacing={2} flexWrap="wrap">
                {searchQuery ? (
                  <>
                    <Badge colorScheme="blue" variant="subtle" borderRadius="full" px={3}>
                      Từ khóa: {searchQuery}
                    </Badge>
                    <Button size="xs" variant="ghost" onClick={clearSearch}>
                      Xóa tìm kiếm
                    </Button>
                  </>
                ) : null}
                {priceFilterSummary ? (
                  <>
                    <Badge colorScheme="pink" variant="subtle" borderRadius="full" px={3}>
                      {priceFilterSummary}
                    </Badge>
                    <Button size="xs" variant="ghost" onClick={clearPriceFilter}>
                      Bỏ lọc giá
                    </Button>
                  </>
                ) : null}
              </HStack>
            </HStack>

            {!loading && filteredProducts.length === 0 && (
              <Text color="text.secondary" fontSize="sm">
                {searchQuery
                  ? `Không tìm thấy sản phẩm phù hợp với “${searchQuery}”.`
                  : products.length > 0
                    ? 'Không có sản phẩm trong khoảng giá đã chọn.'
                    : 'Chưa có sản phẩm trong danh mục này.'}
              </Text>
            )}

            <SimpleGrid columns={{ base: 2, md: 3, xl: 4 }} spacing={4}>
              {filteredProducts.map((product) => {
                const pricing = getProductCardPricing(product)

                return (
                  <ProductGridCard
                    key={product.id}
                    href={buildProductPath(product)}
                    name={product.name}
                    image={product.image}
                    displayPrice={pricing.displayPrice}
                    compareAtPrice={pricing.compareAtPrice}
                    discountPercent={pricing.discountPercent}
                    imageBadge={pricing.imageBadge}
                    borderRadius="xl"
                    footer={
                      <HStack spacing={1} color="text.secondary">
                        <StarIcon color="yellow.400" boxSize={3.5} />
                        <Text fontSize="xs">5.0</Text>
                        <Text fontSize="xs">•</Text>
                        <Text fontSize="xs" noOfLines={1}>
                          {formatProductCategoryLine(product)}
                        </Text>
                      </HStack>
                    }
                  />
                )
              })}
            </SimpleGrid>
          </Box>
        </VStack>
      </Grid>
    </VStack>
  )
}
