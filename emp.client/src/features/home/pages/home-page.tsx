import { CheckCircleIcon, ChevronRightIcon, LockIcon, RepeatIcon, StarIcon, TimeIcon } from '@chakra-ui/icons'
import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { clientCategoriesApi } from '../../categories/services/categories.api'
import { buildShoeCategoryMenu } from '../../categories/lib/shoe-category-tree'
import { clientProductsApi } from '../../products/services/products.api'
import { formatProductCategoryLine } from '../../products/lib/category-labels'
import type { ProductItem } from '../../products/types/product.type'
import {
  marketingApi,
  type MarketingHeroSlide,
  type MarketingHomeContent,
  type MarketingHomeProduct,
} from '../../marketing/services/marketing.api'
import { HomeProductSection } from '../components/home-product-section'
import { HomeProductCard } from '../components/home-product-card'
import { buildProductDetailHref } from '../../products/utils/product-url'
import { formatProductPrice } from '../../products/lib/product-price'
import { useShopSettings } from '../../settings/context/shop-settings-context'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

export const HomePage = () => {
  const { settings } = useShopSettings()
  const toast = useToast()

  const quickPolicies = useMemo(
    () => [
      {
        title: 'Freeship',
        desc:
          settings.freeShippingMinSubtotal > 0
            ? `Đơn từ ${formatProductPrice(settings.freeShippingMinSubtotal)}`
            : 'Theo chương trình',
        color: 'blue',
        Icon: StarIcon,
      },
      { title: 'Đổi trả', desc: '30 ngày', color: 'orange', Icon: RepeatIcon },
      { title: 'Hàng chuẩn', desc: '100% chính hãng', color: 'green', Icon: CheckCircleIcon },
      { title: 'Giao nhanh', desc: 'Nhận trong 2h*', color: 'purple', Icon: TimeIcon },
      { title: 'Hoàn tiền', desc: '200% nếu hàng giả', color: 'teal', Icon: LockIcon },
    ],
    [settings.freeShippingMinSubtotal],
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const [hoveredParentSlug, setHoveredParentSlug] = useState<string | null>(null)
  const [paymentSuccessOrderCode, setPaymentSuccessOrderCode] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('payment') !== 'success') return

    const orderCode = searchParams.get('orderCode')?.trim()
    if (orderCode) setPaymentSuccessOrderCode(orderCode)
    toast({
      title: orderCode
        ? `Thanh toán thành công! Mã đơn: ${orderCode}`
        : 'Thanh toán thành công! Cảm ơn bạn đã mua hàng.',
      status: 'success',
      duration: 4000,
      isClosable: true,
      position: 'top',
    })

    const next = new URLSearchParams(searchParams)
    next.delete('payment')
    next.delete('orderCode')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, toast])
  const [activeHeroSlide, setActiveHeroSlide] = useState(0)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [categoryMenu, setCategoryMenu] = useState<ReturnType<typeof buildShoeCategoryMenu>>([])
  const [homeContent, setHomeContent] = useState<MarketingHomeContent | null>(null)

  useEffect(() => {
    let cancelled = false
    void clientProductsApi
      .list()
      .then((items) => {
        if (!cancelled) setProducts(items)
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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
    void marketingApi
      .getHome()
      .then((content) => {
        if (!cancelled) setHomeContent(content)
      })
      .catch(() => {
        if (!cancelled) setHomeContent(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const repeatedProducts = useMemo(() => products.concat(products, products), [])
  const brands = useMemo(() => Array.from(new Set(repeatedProducts.map((p) => p.brand))), [repeatedProducts])

  const hoveredGroup = useMemo(
    () => categoryMenu.find((group) => group.slug === hoveredParentSlug) ?? null,
    [categoryMenu, hoveredParentSlug],
  )

  const defaultHeroSlides = useMemo<MarketingHeroSlide[]>(
    () => [
      {
        id: 1,
        src: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600',
        alt: 'DTT Shop - Flash Sale',
        title: 'Flash Sale mỗi ngày – Săn deal sốc, chốt đơn siêu nhanh',
        desc: 'Giảm sâu theo khung giờ, số lượng giới hạn. Ưu đãi nổi bật cho giày chạy bộ, sneaker, sandal và nhiều mẫu giày thể thao khác.',
        ctaLabel: 'Săn Flash Sale ngay',
        to: ROUTES.CATEGORIES,
      },
      {
        id: 2,
        src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1600',
        alt: 'DTT Shop - Top Deal',
        title: 'Top Deal hôm nay – Giá tốt mỗi ngày, chất lượng đảm bảo',
        desc: 'Chọn lọc sản phẩm bán chạy và được yêu thích. So sánh nhanh, mua sắm an tâm với chính sách đổi trả rõ ràng và hỗ trợ tận tình.',
        ctaLabel: 'Xem Top Deal',
        to: ROUTES.CATEGORIES,
      },
      {
        id: 3,
        src: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1600',
        alt: 'DTT Shop - Hàng mới mỗi ngày',
        title: 'Hàng mới về – Cập nhật xu hướng, lựa chọn đa dạng',
        desc: 'Khám phá sản phẩm mới về mỗi ngày: giày chạy bộ, sneaker lifestyle, giày bóng rổ, sandal và phụ kiện giày dép.',
        ctaLabel: 'Khám phá hàng mới',
        to: ROUTES.CATEGORIES,
      },
    ],
    [],
  )

  const heroSlides = homeContent?.heroSlides ?? []

  const pickSectionProducts = useCallback(
    (code: string): MarketingHomeProduct[] => homeContent?.sections[code]?.products ?? [],
    [homeContent],
  )

  const topDealProducts = useMemo(() => pickSectionProducts('TOP_DEAL'), [pickSectionProducts])
  const flashSaleProducts = useMemo(() => pickSectionProducts('FLASH_SALE'), [pickSectionProducts])
  const bestSellerProducts = useMemo(() => pickSectionProducts('BEST_SELLER'), [pickSectionProducts])
  const suggestedProducts = useMemo(() => pickSectionProducts('SUGGESTED'), [pickSectionProducts])

  const topCategories = useMemo(() => {
    if (categoryMenu.length > 0) {
      return categoryMenu
        .map((group) => {
          const productCount = products.filter(
            (product) =>
              product.parentCategorySlug === group.slug ||
              group.children.some((child) => child.slug === product.categorySlug),
          ).length
          return {
            key: group.slug,
            label: group.label,
            to: `${ROUTES.CATEGORIES}?parent=${encodeURIComponent(group.slug)}`,
            badge: productCount > 0 ? `${productCount}` : `${group.children.length}`,
            badgeHint: productCount > 0 ? 'SP' : 'loại',
          }
        })
        .sort((a, b) => Number(b.badge) - Number(a.badge))
        .slice(0, 8)
    }

    const labels = Array.from(
      new Set(
        [
          ...products.map((product) => formatProductCategoryLine(product)),
          ...bestSellerProducts.map((product) => product.category),
        ].filter((line) => line.trim().length > 0),
      ),
    )

    return labels.slice(0, 8).map((label, index) => ({
      key: `cat-${label}`,
      label,
      to: ROUTES.CATEGORIES,
      badge: String(index + 1),
      badgeHint: '',
    }))
  }, [categoryMenu, products, bestSellerProducts])

  const hasCatalog = products.length > 0

  const activeSlide =
    heroSlides.length > 0
      ? heroSlides[activeHeroSlide % heroSlides.length]
      : defaultHeroSlides[0]
  const heroCardH = { base: 'auto', lg: '425px' as const }
  const heroMediaH = { base: '210px', lg: '260px' as const }

  return (
    <VStack align="stretch" spacing={6}>
      {paymentSuccessOrderCode ? (
        <Box
          bg="green.50"
          borderWidth="1px"
          borderColor="green.200"
          borderRadius="xl"
          p={4}
        >
          <HStack justify="space-between" flexWrap="wrap" gap={3}>
            <Box>
              <Text fontWeight="800" color="green.800">
                Thanh toán thành công
              </Text>
              <Text fontSize="sm" color="green.700" mt={1}>
                Đơn hàng {paymentSuccessOrderCode} đã được ghi nhận. Bạn có thể theo dõi trạng thái giao hàng bên dưới.
              </Text>
            </Box>
            <Button
              as={Link}
              to={
                paymentSuccessOrderCode
                  ? ROUTES.ORDER_DETAIL.replace(':orderCode', paymentSuccessOrderCode)
                  : ROUTES.ACCOUNT_ORDERS
              }
              colorScheme="pink"
              bg="brand.600"
              _hover={{ bg: 'brand.700' }}
              flexShrink={0}
            >
              Theo dõi đơn hàng
            </Button>
          </HStack>
        </Box>
      ) : null}

      {/* Hero row */}
      <Box position="relative" onMouseLeave={() => setHoveredParentSlug(null)}>
        <Grid templateColumns={{ base: '1fr', lg: '260px 1fr 280px' }} gap={4} alignItems="stretch">
          <Box
            bg="surface.card"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="xl"
            p={3}
            zIndex={3}
            h={heroCardH}
            display="flex"
            flexDir="column"
            overflow="hidden"
          >
            <Heading size="sm" mb={3}>
              Danh mục
            </Heading>
            <VStack align="stretch" spacing={1} flex="1" overflowY="auto" pr={1}>
              {categoryMenu.map((group) => (
                <HStack
                  key={group.slug}
                  justify="space-between"
                  px={2}
                  py={1.5}
                  borderRadius="md"
                  bg={hoveredParentSlug === group.slug ? 'gray.50' : undefined}
                  className="cursor-pointer hover:bg-gray-50"
                  onMouseEnter={() => setHoveredParentSlug(group.slug)}
                >
                  <Text fontSize="sm">{group.label}</Text>
                  <ChevronRightIcon color="gray.400" />
                </HStack>
              ))}
            </VStack>
          </Box>

          <Box
            bg="surface.card"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="xl"
            h={heroCardH}
            display="flex"
            flexDir="column"
            overflow="hidden"
          >
            <Box overflow="hidden" h={heroMediaH}>
              {heroSlides.length > 0 ? (
                <Swiper
                  modules={[Autoplay, Pagination]}
                  autoplay={{ delay: 3500, disableOnInteraction: false }}
                  loop
                  pagination={{ clickable: true }}
                  onSlideChange={(swiper) => setActiveHeroSlide(swiper.realIndex)}
                  style={{ width: '100%', height: '100%' }}
                >
                  {heroSlides.map((item) => (
                    <SwiperSlide key={item.id}>
                      <Image src={item.src} alt={item.alt} objectFit="cover" w="full" h="full" />
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <Box
                  h="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bg="gray.50"
                  px={4}
                >
                  <Text fontSize="sm" color="text.secondary" textAlign="center">
                    Chưa có banner. Cấu hình tại Admin → Tiếp thị → Carousel.
                  </Text>
                </Box>
              )}
            </Box>

            <Box p={4} flex="1" display="flex" flexDir="column" justifyContent="space-between">
              <HStack justify="space-between" align="start" spacing={3}>
                <Box>
                  <Heading as="h1" size="md">
                    {activeSlide.title}
                  </Heading>
                  <Text as="p" color="text.secondary" fontSize="md" mt={1} noOfLines={3}>
                    {activeSlide.desc}
                  </Text>
                </Box>
                <Button
                  as={Link}
                  to={activeSlide.to}
                  colorScheme="pink"
                  bg="brand.600"
                  _hover={{ bg: 'brand.700' }}
                  flexShrink={0}
                >
                  {activeSlide.ctaLabel}
                </Button>
              </HStack>
            </Box>
          </Box>

          <Box
            bg="surface.card"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="xl"
            p={4}
            h={heroCardH}
            display="flex"
            flexDir="column"
            overflow="hidden"
          >
            <Heading size="sm" mb={3}>
              Cam kết
            </Heading>
            <VStack align="stretch" spacing={2} flex="1" overflow="hidden">
              {quickPolicies.map((item) => (
                <Box key={item.title} borderWidth="1px" borderColor="border.subtle" borderRadius="lg" p={2.5}>
                  <HStack align="start" spacing={3}>
                    <Box
                      w="34px"
                      h="34px"
                      borderRadius="lg"
                      bg={`${item.color}.50`}
                      color={`${item.color}.600`}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <item.Icon />
                    </Box>
                    <Box>
                      <Text fontWeight="900" lineHeight="1.2">
                        {item.title}
                      </Text>
                      <Text fontSize="sm" color="text.secondary" mt={0.5} noOfLines={1}>
                        {item.desc}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </Box>
        </Grid>

        {/* Mega menu overlay (covers hero + commitments) */}
        {hoveredGroup && (
          <Box
            position="absolute"
            top="0"
            left={{ base: 0, lg: '260px' }}
            right="0"
            bottom="0"
            bg="white"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="xl"
            p={5}
            zIndex={4}
            className="animate-in fade-in duration-150"
          >
            <HStack justify="space-between" mb={3}>
              <Heading size="sm">{hoveredGroup.label}</Heading>
              <Text fontSize="sm" color="text.secondary">
                Gợi ý theo loại giày
              </Text>
            </HStack>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={3}>
              {hoveredGroup.children.map((item) => (
                <Box
                  key={item.slug}
                  as={Link}
                  to={`${ROUTES.CATEGORIES}?category=${encodeURIComponent(item.slug)}`}
                  borderWidth="1px"
                  borderColor="border.subtle"
                  borderRadius="lg"
                  p={3}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <Text fontWeight="700" fontSize="sm">
                    {item.label}
                  </Text>
                  <Text fontSize="xs" color="text.secondary">
                    Xem sản phẩm nổi bật
                  </Text>
                </Box>
              ))}
            </Grid>
          </Box>
        )}
      </Box>

      {productsLoading ? (
        <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={6}>
          <Text color="text.secondary" fontSize="sm">
            Đang tải sản phẩm...
          </Text>
        </Box>
      ) : null}

      <HomeProductSection
        block={homeContent?.sections.TOP_DEAL}
        fallbackTitle="Top Deal"
        fallbackBadge="SIÊU RẺ"
        fallbackLink={ROUTES.CATEGORIES}
        products={topDealProducts}
        columns={{ base: 2, md: 3, lg: 6 }}
        showDiscountBadge
      />

      {/* Featured categories tiles */}
      <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
        <HStack justify="space-between" mb={3}>
          <Heading size="md">Danh mục nổi bật</Heading>
          <Text fontSize="sm" color="text.secondary">
            Khám phá nhanh
          </Text>
        </HStack>
        <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={3}>
          {categoryMenu.slice(0, 6).map((group) => (
            <Box
              key={`tile-${group.slug}`}
              as={Link}
              to={`${ROUTES.CATEGORIES}?parent=${encodeURIComponent(group.slug)}`}
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="xl"
              p={3}
              className="cursor-pointer hover:bg-gray-50"
            >
              <Text fontWeight="900" fontSize="sm" noOfLines={2}>
                {group.label}
              </Text>
              <Text fontSize="xs" color="text.secondary" mt={1}>
                Xem ưu đãi hôm nay
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      <HomeProductSection
        block={homeContent?.sections.FLASH_SALE}
        fallbackTitle="Flash Sale"
        fallbackLink={ROUTES.CATEGORIES}
        products={flashSaleProducts}
        columns={{ base: 2, md: 3, lg: 6 }}
      />

      {hasCatalog && brands.length > 0 ? (
      <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
        <HStack justify="space-between" mb={3}>
          <Heading size="md">Thương hiệu nổi bật</Heading>
          <Text fontSize="sm" color="text.secondary" className="cursor-pointer hover:text-gray-900">
            Xem tất cả
          </Text>
        </HStack>
        <HStack spacing={3} overflowX="auto" pb={1}>
          {brands.map((brand) => (
            <Box
              key={brand}
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="xl"
              px={4}
              py={3}
              minW="180px"
              bg="white"
              className="cursor-pointer hover:shadow-sm transition"
            >
              <Text fontWeight="900">{brand}</Text>
              <Text fontSize="xs" color="text.secondary">
                Thương hiệu
              </Text>
            </Box>
          ))}
        </HStack>
      </Box>
      ) : null}

      {bestSellerProducts.length > 0 ? (
      <Grid templateColumns={{ base: '1fr', lg: '1fr 320px' }} gap={4}>
        <Box>
          <HStack justify="space-between" mb={3}>
            <Box>
              <Heading size="md">{homeContent?.sections.BEST_SELLER?.title ?? 'Top bán chạy'}</Heading>
              {homeContent?.sections.BEST_SELLER?.subtitle ? (
                <Text fontSize="sm" color="text.secondary" mt={1}>
                  {homeContent.sections.BEST_SELLER.subtitle}
                </Text>
              ) : (
                <Text fontSize="sm" color="text.secondary" mt={1}>
                  Theo danh mục phổ biến
                </Text>
              )}
            </Box>
          </HStack>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={4}>
            {bestSellerProducts.map((product, idx) => (
              <HomeProductCard
                key={`${product.id}-best-${idx}`}
                product={product}
                href={buildProductDetailHref(product.id, product.name, product.slug)}
                rank={idx + 1}
              />
            ))}
          </SimpleGrid>
        </Box>

        <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
          <Heading size="sm" mb={3}>
            Top danh mục
          </Heading>
          <VStack align="stretch" spacing={2}>
            {topCategories.length > 0 ? (
              topCategories.map((cat) => (
                <Box
                  key={cat.key}
                  as={Link}
                  to={cat.to}
                  display="block"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  borderRadius="lg"
                  px={3}
                  py={2}
                  className="hover:bg-gray-50 transition"
                >
                  <HStack justify="space-between" spacing={2}>
                    <Text fontWeight="700" fontSize="sm" noOfLines={2} flex={1}>
                      {cat.label}
                    </Text>
                    <Badge colorScheme="pink" variant="subtle" borderRadius="full" flexShrink={0}>
                      {cat.badge}
                      {cat.badgeHint ? ` ${cat.badgeHint}` : ''}
                    </Badge>
                  </HStack>
                </Box>
              ))
            ) : (
              <Text fontSize="sm" color="text.secondary">
                Đang tải danh mục…
              </Text>
            )}
          </VStack>
        </Box>
      </Grid>
      ) : null}

      {suggestedProducts.length > 0 ? (
      <Box>
        <HStack justify="space-between" mb={3}>
          <Box>
            <Heading size="md">{homeContent?.sections.SUGGESTED?.title ?? 'Gợi ý hôm nay'}</Heading>
            <Text fontSize="sm" color="text.secondary" mt={1}>
              {homeContent?.sections.SUGGESTED?.subtitle ?? 'Hàng chọn lọc theo sở thích'}
            </Text>
          </Box>
        </HStack>
        <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
          {suggestedProducts.map((product, idx) => (
            <HomeProductCard
              key={`${product.id}-suggest-${idx}`}
              product={product}
              href={buildProductDetailHref(product.id, product.name, product.slug)}
              extraBadge="Freeship"
            />
          ))}
        </SimpleGrid>
      </Box>
      ) : null}

      {/* Trending searches */}
      <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
        <HStack justify="space-between" mb={3}>
          <Heading size="md">Từ khóa được quan tâm</Heading>
          <Text fontSize="sm" color="text.secondary">
            Cập nhật mỗi ngày
          </Text>
        </HStack>
        <HStack spacing={2} flexWrap="wrap">
          {[
            'giày chạy bộ',
            'sneaker nam',
            'giày bóng rổ',
            'sandal trekking',
            'boots cổ cao',
            'giày trail',
            'dép quai ngang',
            'vớ chạy bộ',
            'dây giày phản quang',
          ].map((kw) => (
            <Badge
              key={kw}
              as={Link}
              to={`${ROUTES.CATEGORIES}?q=${encodeURIComponent(kw)}`}
              variant="subtle"
              colorScheme="gray"
              borderRadius="full"
              px={3}
              py={1}
              className="cursor-pointer hover:bg-gray-100"
            >
              {kw}
            </Badge>
          ))}
        </HStack>
      </Box>

    </VStack>
  )
}

