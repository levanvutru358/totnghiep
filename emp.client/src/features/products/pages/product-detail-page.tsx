import { AddIcon, ChevronRightIcon, MinusIcon, StarIcon } from '@chakra-ui/icons'
import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  Grid,
  Flex,
  Heading,
  HStack,
  IconButton,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  SimpleGrid,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai'
import { FaFacebookF, FaFacebookMessenger, FaPinterestP } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { FiChevronLeft, FiShare2, FiShield, FiShoppingCart, FiTruck } from 'react-icons/fi'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { cartStore } from '../../cart/store/cart-store'
import { persistCheckoutVoucher, readCheckoutVoucher } from '../../commerce/lib/checkout-voucher'
import { isPromotionSelectable, promotionDisabledHint } from '../../commerce/lib/checkout-promotion'
import { catalogToFullVnd, promotionVndToCatalog } from '../../../lib/money-vnd'
import { saveBuyNowDraft } from '../../commerce/lib/buy-now-checkout'
import { promotionsApi, type ShopPromotion } from '../../promotions/services/promotions.api'
import { notifyServerCartUpdated } from '../../commerce/lib/cart-events'
import { useCommerce } from '../../commerce/context/commerce-context'
import { commerceApi } from '../../commerce/services/commerce.api'
import { useFavorites } from '../store/favorites-store'
import { buildProductPath } from '../utils/product-url'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { ProductReviewsPanel } from '../../reviews/components/product-reviews-panel'
import { ProductCommentsPanel } from '../../comments/components/product-comments-panel'
import { reviewsApi } from '../../reviews/services/reviews.api'
import { clientProductsApi } from '../services/products.api'
import type { ProductItem } from '../types/product.type'

import { formatProductPrice } from '../lib/product-price'

const formatMoney = formatProductPrice

type VoucherOption = {
  id: string
  title: string
  desc: string
}

const NONE_VOUCHER: VoucherOption = { id: 'none', title: 'Không dùng khuyến mãi', desc: '' }

function formatCountdown(totalSec: number) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getVariantStock(product: ProductItem, color: string, size: string): number {
  return product.variants.find((v) => v.color === color && v.size === size)?.stock ?? 0
}

function pickDefaultSize(product: ProductItem, color: string): string {
  const forColor = product.variants.filter((v) => v.color === color)
  const inStock = forColor.find((v) => v.stock > 0)
  return inStock?.size ?? forColor[0]?.size ?? ''
}

const resolveApiProductId = (id: string | undefined) => {
  if (!id) return 1
  const numeric = Number(id)
  if (Number.isFinite(numeric) && numeric > 0) return numeric
  const suffix = id.match(/\d+$/)?.[0]
  return suffix ? Number(suffix) : 1
}

export const ProductDetailPage = () => {
  const { pathKey } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const voucherModal = useDisclosure()
  const shareModal = useDisclosure()
  const cartSheet = useDisclosure()
  const [cartSheetAction, setCartSheetAction] = useState<'cart' | 'buy'>('cart')
  const { isFavorite, toggle: toggleFavorite } = useFavorites()
  const { beginBuyNow } = useCommerce()
  const [product, setProduct] = useState<ProductItem | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<ProductItem[]>([])
  const [productLoading, setProductLoading] = useState(true)
  const [shopPromotions, setShopPromotions] = useState<ShopPromotion[]>([])
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('none')
  const apiProductId = useMemo(() => resolveApiProductId(product?.id), [product?.id])
  useEffect(() => {
    let cancelled = false
    setProductLoading(true)
    void Promise.all([clientProductsApi.getByPathKey(pathKey), clientProductsApi.list()])
      .then(([detail, items]) => {
        if (cancelled) return
        setProduct(detail)
        if (detail) {
          setRelatedProducts(items.filter((item) => item.id !== detail.id).slice(0, 4))
        } else {
          setRelatedProducts([])
        }
      })
      .catch(() => {
        if (cancelled) return
        setProduct(null)
        setRelatedProducts([])
      })
      .finally(() => {
        if (!cancelled) setProductLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [pathKey])

  useEffect(() => {
    let cancelled = false
    void promotionsApi
      .listForShop(commerceApi.hasServerToken())
      .then((items) => {
        if (cancelled) return
        setShopPromotions(items)
        const saved = readCheckoutVoucher()
        const savedPromo = saved ? items.find((p) => p.code === saved) : null
        if (savedPromo && !savedPromo.alreadyUsed) {
          setSelectedVoucherId(saved)
        } else {
          setSelectedVoucherId('none')
          if (!items.length || savedPromo?.alreadyUsed) persistCheckoutVoucher(null)
        }
      })
      .catch(() => {
        if (!cancelled) setShopPromotions([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!voucherModal.isOpen) return
    let cancelled = false
    void promotionsApi
      .listForShop(commerceApi.hasServerToken())
      .then((items) => {
        if (!cancelled) setShopPromotions(items)
      })
      .catch(() => {
        if (!cancelled) setShopPromotions([])
      })
    return () => {
      cancelled = true
    }
  }, [voucherModal.isOpen])

  const voucherOptions = useMemo<VoucherOption[]>(() => {
    const fromApi = shopPromotions.map((p) => ({
      id: p.code,
      title: p.summaryTitle || p.name,
      desc: p.shortDesc,
    }))
    return [NONE_VOUCHER, ...fromApi]
  }, [shopPromotions])

  const selectedVoucher = useMemo(
    () => voucherOptions.find((v) => v.id === selectedVoucherId) ?? NONE_VOUCHER,
    [voucherOptions, selectedVoucherId],
  )

  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [flashSeconds, setFlashSeconds] = useState(3 * 3600 + 12 * 60 + 45)
  const [agreedTerms, setAgreedTerms] = useState(true)
  const [cartApiLoading, setCartApiLoading] = useState(false)
  const [rating, setRating] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)

  const colors = useMemo(() => [...new Set(product?.variants.map((item) => item.color) ?? [])], [product])
  const [selectedColor, setSelectedColor] = useState(colors[0] ?? '')

  const sizes = useMemo(
    () => (product?.variants.filter((item) => item.color === selectedColor).map((item) => item.size) ?? []),
    [product, selectedColor],
  )
  const [selectedSize, setSelectedSize] = useState(sizes[0] ?? '')
  const [quantity, setQuantity] = useState(1)

  const selectedVariant = useMemo(
    () => product?.variants.find((item) => item.color === selectedColor && item.size === selectedSize),
    [product, selectedColor, selectedSize],
  )

  useEffect(() => {
    if (!product) return
    document.title = `${product.name} | DTT Shop`
    return () => {
      document.title = 'DTT Shop'
    }
  }, [product])

  useEffect(() => {
    const t = window.setInterval(() => {
      setFlashSeconds((sec) => (sec > 0 ? sec - 1 : 0))
    }, 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    if (!product) return
    const c = [...new Set(product.variants.map((v) => v.color))]
    const firstColor = c[0] ?? ''
    setSelectedColor(firstColor)
    setSelectedSize(pickDefaultSize(product, firstColor))
    setQuantity(1)
    setActiveImage(null)
  }, [product?.id])

  useEffect(() => {
    if (!apiProductId) return
    let cancelled = false
    void reviewsApi
      .getStatistics(apiProductId)
      .then((data) => {
        if (!cancelled) {
          setRating(data.average)
          setReviewCount(data.total)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRating(0)
          setReviewCount(0)
        }
      })
    return () => {
      cancelled = true
    }
  }, [apiProductId])

  const galleryImages = useMemo(() => {
    const colorEntry = product?.colorImages?.find((entry) => entry.color === selectedColor)
    const fromColor = colorEntry?.images?.map((url) => url.trim()).filter(Boolean) ?? []
    if (fromColor.length > 0) return fromColor

    const fromList = product?.images?.map((url) => url.trim()).filter(Boolean) ?? []
    if (fromList.length > 0) return fromList
    const base = product?.image?.trim()
    if (!base) return [] as string[]
    return [base]
  }, [product?.colorImages, product?.image, product?.images, selectedColor])

  useEffect(() => {
    setActiveImage(null)
    if (!product) return
    if (getVariantStock(product, selectedColor, selectedSize) <= 0) {
      setSelectedSize(pickDefaultSize(product, selectedColor))
    }
  }, [selectedColor, product])

  const promotionOrderAmount = useMemo(() => {
    if (!product) return 0
    const unit = product.marketingOffer?.displayPrice ?? product.price
    const variant = product.variants.find(
      (item) => item.color === selectedColor && item.size === selectedSize,
    )
    const maxQty = Math.max(1, variant?.stock ?? 1)
    const qty = Math.min(Math.max(quantity, 1), maxQty)
    return unit * qty
  }, [product, selectedColor, selectedSize, quantity])

  useEffect(() => {
    if (!product || selectedVoucherId === 'none') return
    const promo = shopPromotions.find((p) => p.code === selectedVoucherId)
    if (promo && !isPromotionSelectable(promotionOrderAmount, promo)) {
      setSelectedVoucherId('none')
      persistCheckoutVoucher(null)
    }
  }, [product, promotionOrderAmount, selectedVoucherId, shopPromotions])

  if (productLoading) {
    return (
      <VStack py={16} spacing={4}>
        <Heading size="md">Đang tải sản phẩm...</Heading>
      </VStack>
    )
  }

  if (!product) {
    return (
      <VStack py={16} spacing={4}>
        <Heading size="md">Không tìm thấy sản phẩm</Heading>
        <Text color="text.secondary">Đường dẫn không hợp lệ hoặc sản phẩm đã ngừng bán.</Text>
        <Button as={Link} to={ROUTES.HOME} colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }}>
          Về trang chủ
        </Button>
      </VStack>
    )
  }

  const displayImage = activeImage ?? galleryImages[0] ?? product.image
  const soldCount = 7000
  const marketing = product.marketingOffer
  const catalogSellingPrice = product.price
  const price = marketing?.displayPrice ?? catalogSellingPrice
  const original = marketing
    ? marketing.catalogPrice
    : product.originalPrice ?? Math.round(catalogSellingPrice * 1.25)
  const showStrike = original > price
  const discountPct = marketing
    ? Math.round(marketing.discountPercent)
    : showStrike
      ? Math.round((1 - price / original) * 100)
      : 0
  const canBuy = Boolean(selectedVariant) && (selectedVariant?.stock ?? 0) > 0
  const maxQty = Math.max(1, selectedVariant?.stock ?? 1)
  const safeQty = Math.min(Math.max(quantity, 1), maxQty)

  const commitAddToCart = async () => {
    if (!selectedVariant || !canBuy) return false

    if (commerceApi.hasServerToken()) {
      try {
        setCartApiLoading(true)
        const cart = await commerceApi.addCartItemBySku(selectedVariant.sku, safeQty, true)
        cartStore.removeBySku(selectedVariant.sku)
        notifyServerCartUpdated(cart)
        return true
      } catch (error) {
        toast({
          title: error instanceof Error ? error.message : 'Không thể thêm vào giỏ hàng.',
          status: 'error',
          duration: 2500,
          position: 'top',
        })
        return false
      } finally {
        setCartApiLoading(false)
      }
    }

    cartStore.addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      price,
      sku: selectedVariant.sku,
      size: selectedVariant.size,
      color: selectedVariant.color,
      stock: selectedVariant.stock,
      quantity: safeQty,
    })
    return true
  }

  const openCartSheet = (action: 'cart' | 'buy') => {
    setCartSheetAction(action)
    cartSheet.onOpen()
  }

  const goToBuyNowCheckout = () => {
    if (!selectedVariant || !product) return

    saveBuyNowDraft({
      variantId: selectedVariant.id,
      quantity: safeQty,
      sku: selectedVariant.sku,
      unitPrice: price,
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      brand: product.brand,
      category: product.category,
      size: selectedVariant.size,
      color: selectedVariant.color,
      stock: selectedVariant.stock,
    })

    persistCheckoutVoucher(selectedVoucherId === 'none' ? null : selectedVoucherId)

    if (commerceApi.hasServerToken()) {
      const query = new URLSearchParams({
        mode: 'api',
        source: 'buy_now',
        variantId: selectedVariant.id,
        quantity: String(safeQty),
      })
      navigate(`${ROUTES.CHECKOUT}?${query.toString()}`)
      return
    }

    beginBuyNow({
      product,
      variant: selectedVariant,
      quantity: safeQty,
      selected: true,
    })
    navigate(`${ROUTES.CHECKOUT}?source=buy_now`)
  }

  const handleSheetConfirm = async () => {
    if (!selectedVariant) {
      toast({ title: 'Vui lòng chọn phân loại', status: 'warning', duration: 2000, position: 'top' })
      return
    }
    if (!canBuy) {
      toast({ title: 'Phân loại này đã hết hàng', status: 'warning', duration: 2000, position: 'top' })
      return
    }
    if (cartSheetAction === 'buy' && !agreedTerms) {
      toast({ title: 'Vui lòng đồng ý điều khoản', status: 'warning', duration: 2500, position: 'top' })
      return
    }

    if (cartSheetAction === 'buy') {
      cartSheet.onClose()
      goToBuyNowCheckout()
      return
    }

    if (!(await commitAddToCart())) return
    cartSheet.onClose()
    toast({ title: 'Đã thêm vào giỏ hàng', status: 'success', duration: 2000, position: 'top' })
  }

  const handleInlineAddToCart = async () => {
    if (!selectedVariant || !canBuy) {
      toast({ title: 'Vui lòng chọn phân loại còn hàng', status: 'warning', duration: 2000, position: 'top' })
      openCartSheet('cart')
      return
    }
    if (!(await commitAddToCart())) return
    toast({ title: 'Đã thêm vào giỏ hàng', status: 'success', duration: 2000, position: 'top' })
  }

  const handleInlineBuyNow = async () => {
    if (!selectedVariant || !canBuy) {
      toast({ title: 'Vui lòng chọn phân loại còn hàng', status: 'warning', duration: 2000, position: 'top' })
      openCartSheet('buy')
      return
    }
    if (!agreedTerms) {
      toast({ title: 'Vui lòng đồng ý điều khoản', status: 'warning', duration: 2500, position: 'top' })
      return
    }

    goToBuyNowCheckout()
  }

  const copyProductLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({ title: 'Đã sao chép liên kết sản phẩm', status: 'success', duration: 2000 })
    } catch {
      toast({ title: 'Không sao chép được', status: 'error', duration: 2000 })
    }
  }

  const handleNativeShare = async () => {
    const url = window.location.href
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `${product.name} — ${formatMoney(price)}`,
          url,
        })
        shareModal.onClose()
      } catch {
        /* user cancelled */
      }
    }
  }

  const handleToggleFavorite = () => {
    const added = toggleFavorite(product.id)
    toast({
      title: added ? 'Đã thêm vào Yêu thích' : 'Đã bỏ Yêu thích',
      status: 'success',
      duration: 2000,
      position: 'top',
    })
  }

  const liked = isFavorite(product.id)
  /** Số thích hiển thị kiểu Shopee (demo) */
  const likeSocialCount = '23,5k'

  const openSocialShare = (kind: 'messenger' | 'facebook' | 'pinterest' | 'x') => {
    const url = window.location.href
    const u = encodeURIComponent(url)
    const text = encodeURIComponent(product.name)
    const href =
      kind === 'messenger'
        ? `https://www.facebook.com/sharer/sharer.php?u=${u}`
        : kind === 'facebook'
          ? `https://www.facebook.com/sharer/sharer.php?u=${u}`
          : kind === 'pinterest'
            ? `https://pinterest.com/pin/create/button/?url=${u}&description=${text}`
            : `https://twitter.com/intent/tweet?url=${u}&text=${text}`
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  const categoryLabel = product.category.charAt(0).toUpperCase() + product.category.slice(1)
  const lineTotal = price * safeQty
  const selectedPromotion =
    selectedVoucherId === 'none'
      ? null
      : shopPromotions.find((p) => p.code === selectedVoucherId) ?? null
  const promotionDiscountAmount =
    selectedPromotion && isPromotionSelectable(lineTotal, selectedPromotion)
      ? selectedPromotion.discountType === 'FIXED'
        ? Math.min(lineTotal, promotionVndToCatalog(selectedPromotion.discountValue))
        : selectedPromotion.discountType === 'PERCENT'
          ? promotionVndToCatalog((catalogToFullVnd(lineTotal) * selectedPromotion.discountValue) / 100)
          : 0
      : 0
  const lineTotalAfterPromotion = Math.max(0, lineTotal - promotionDiscountAmount)

  const applyVoucherSelection = () => {
    if (selectedVoucherId !== 'none') {
      const promo = shopPromotions.find((p) => p.code === selectedVoucherId)
      if (promo && !isPromotionSelectable(promotionOrderAmount, promo)) {
        toast({
          title: promotionDisabledHint(promotionOrderAmount, promo) ?? 'Không thể áp dụng mã này',
          description: `Đơn hiện tại: ${formatMoney(promotionOrderAmount)}`,
          status: 'warning',
          duration: 2500,
          position: 'top',
        })
        return
      }
    }
    persistCheckoutVoucher(selectedVoucherId === 'none' ? null : selectedVoucherId)
    voucherModal.onClose()
    toast({
      title: selectedVoucherId === 'none' ? 'Đã bỏ khuyến mãi' : `Đã chọn ${selectedVoucherId}`,
      description: 'Mã sẽ được áp dụng khi thanh toán',
      status: 'success',
      duration: 2000,
      position: 'top',
    })
  }
  const priceRangeMin =
    marketing && marketing.catalogPrice > marketing.displayPrice
      ? marketing.displayPrice
      : Math.round(price * 0.96)
  const priceRangeMax =
    marketing && marketing.catalogPrice > marketing.displayPrice
      ? marketing.catalogPrice
      : original > price
        ? original
        : Math.round(price * 1.12)

  return (
    <Box pb={{ base: 8, md: 10 }} mx={{ base: -4, md: -6 }}>
      {/* Breadcrumb (desktop) */}
      <HStack
        mb={3}
        spacing={1}
        fontSize="xs"
        color="text.secondary"
        flexWrap="wrap"
        display={{ base: 'none', md: 'flex' }}
      >
        <Link to={ROUTES.HOME}>Trang chủ</Link>
        <Text as="span">/</Text>
        <Link to={`${ROUTES.CATEGORIES}?type=${encodeURIComponent(product.category)}`}>{categoryLabel}</Link>
        <Text as="span">/</Text>
        <Text noOfLines={1} color="text.primary" fontWeight="600" maxW={{ md: '40%', lg: '50%' }}>
          {product.name}
        </Text>
      </HStack>

      {/* Quay lại — kiểu app */}
      <HStack mb={3} px={{ base: 0, md: 0 }} justify="space-between" display={{ base: 'flex', md: 'none' }}>
        <Button
          as={Link}
          to={ROUTES.HOME}
          variant="ghost"
          size="sm"
          leftIcon={<FiChevronLeft />}
          pl={0}
          fontWeight="600"
          color="text.secondary"
        >
          Quay lại
        </Button>
        <IconButton as={Link} to={ROUTES.CART} aria-label="Giỏ hàng" icon={<FiShoppingCart />} variant="ghost" size="sm" />
      </HStack>

      <Grid templateColumns={{ base: '1fr', lg: 'minmax(0,480px) minmax(0,1fr)' }} gap={{ base: 0, lg: 4 }} alignItems="start">
        {/* Gallery — full bleed mobile */}
        <Box bg="white" borderRadius={{ base: 'none', lg: 'xl' }} overflow="hidden" borderWidth={{ base: 0, lg: '1px' }} borderColor="border.subtle">
          <Box display={{ base: 'block', md: 'none' }} position="relative">
            <Swiper modules={[Pagination]} pagination={{ clickable: true }} loop={galleryImages.length > 1}>
              {galleryImages.map((src) => (
                <SwiperSlide key={src}>
                  <AspectRatio ratio={1} bg="gray.50">
                    <Image
                      src={src}
                      alt={product.name}
                      objectFit="contain"
                      w="100%"
                      h="100%"
                      p={4}
                      fallbackSrc="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800"
                    />
                  </AspectRatio>
                </SwiperSlide>
              ))}
            </Swiper>
            <IconButton
              as={Link}
              to={ROUTES.CART}
              aria-label="Giỏ hàng"
              icon={<FiShoppingCart />}
              size="sm"
              borderRadius="full"
              position="absolute"
              top={2}
              right={2}
              zIndex={2}
              bg="blackAlpha.500"
              color="white"
              _hover={{ bg: 'blackAlpha.600' }}
            />
          </Box>
          <Box display={{ base: 'none', md: 'block' }} p={4}>
            <AspectRatio ratio={1} maxW="100%" bg="gray.50" borderRadius="lg">
              <Image
                src={displayImage}
                alt={product.name}
                objectFit="contain"
                w="100%"
                h="100%"
                p={6}
                borderRadius="lg"
                fallbackSrc="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800"
              />
            </AspectRatio>
            {galleryImages.length > 1 ? (
              <HStack mt={3} spacing={2} overflowX="auto">
                {galleryImages.map((src) => (
                  <Box
                    key={src}
                    borderWidth="2px"
                    borderColor={src === displayImage ? 'brand.600' : 'transparent'}
                    borderRadius="md"
                    p="1px"
                    flexShrink={0}
                    cursor="pointer"
                    onClick={() => setActiveImage(src)}
                    bg="gray.50"
                  >
                    <Image
                      src={src}
                      alt=""
                      boxSize="56px"
                      objectFit="contain"
                      borderRadius="md"
                      p={1}
                    />
                  </Box>
                ))}
              </HStack>
            ) : null}
          </Box>

          {/* Chia sẻ + Đã thích — ngay dưới ảnh (kiểu Shopee) */}
          <Flex
            align="center"
            justify="center"
            flexWrap="wrap"
            gap={{ base: 2, md: 4 }}
            px={{ base: 3, md: 4 }}
            py={3}
            borderTopWidth="1px"
            borderColor="blackAlpha.100"
            bg="white"
          >
            <HStack spacing={2} flexWrap="wrap" justify="center">
              <Text fontSize="sm" color="gray.800" fontWeight="500">
                Chia sẻ:
              </Text>
              <HStack spacing={2}>
                <IconButton
                  aria-label="Messenger"
                  icon={<FaFacebookMessenger size={18} />}
                  size="sm"
                  w="36px"
                  h="36px"
                  minW="36px"
                  borderRadius="full"
                  bg="#0084ff"
                  color="white"
                  _hover={{ bg: '#006edf' }}
                  onClick={() => openSocialShare('messenger')}
                />
                <IconButton
                  aria-label="Facebook"
                  icon={<FaFacebookF size={16} />}
                  size="sm"
                  w="36px"
                  h="36px"
                  minW="36px"
                  borderRadius="full"
                  bg="#1877f2"
                  color="white"
                  _hover={{ bg: '#166bda' }}
                  onClick={() => openSocialShare('facebook')}
                />
                <IconButton
                  aria-label="Pinterest"
                  icon={<FaPinterestP size={16} />}
                  size="sm"
                  w="36px"
                  h="36px"
                  minW="36px"
                  borderRadius="full"
                  bg="#e60023"
                  color="white"
                  _hover={{ bg: '#cc001f' }}
                  onClick={() => openSocialShare('pinterest')}
                />
                <IconButton
                  aria-label="X"
                  icon={<FaXTwitter size={16} />}
                  size="sm"
                  w="36px"
                  h="36px"
                  minW="36px"
                  borderRadius="full"
                  bg="#000"
                  color="white"
                  _hover={{ bg: 'gray.800' }}
                  onClick={() => openSocialShare('x')}
                />
              </HStack>
            </HStack>
            <Text color="gray.300" fontSize="lg" lineHeight="1" px={1} display={{ base: 'none', sm: 'block' }}>
              |
            </Text>
            <HStack
              spacing={2}
              cursor="pointer"
              onClick={handleToggleFavorite}
              userSelect="none"
              _hover={{ opacity: 0.85 }}
            >
              {liked ? <AiFillHeart color="#ee4d2d" size={22} /> : <AiOutlineHeart color="#ee4d2d" size={22} />}
              <Text fontSize="sm" color="gray.800" fontWeight="500">
                Đã thích ({likeSocialCount})
              </Text>
            </HStack>
          </Flex>
        </Box>

        {/* Nội dung phải: tiêu đề → giá → flash → vận chuyển → phân loại → SL → nút mua */}
        <VStack align="stretch" spacing={0}>
          <Box bg="white" px={{ base: 3, md: 5 }} pt={4} pb={3} borderBottomWidth="1px" borderColor="blackAlpha.50">
            <HStack spacing={2} mb={2} flexWrap="wrap">
              <Badge colorScheme="orange" variant="solid" borderRadius="sm" fontSize="10px">
                Mall
              </Badge>
              <Badge colorScheme="green" variant="subtle" borderRadius="sm" fontSize="10px">
                Freeship Xtra
              </Badge>
              <Badge colorScheme="purple" variant="subtle" borderRadius="sm" fontSize="10px">
                Hàng chính hãng
              </Badge>
            </HStack>
            <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="600" lineHeight="1.4">
              {product.name}
            </Text>
            <HStack mt={3} spacing={3} color="text.secondary" fontSize="sm" flexWrap="wrap">
              <HStack spacing={1}>
                {[...Array(5)].map((_, idx) => (
                  <StarIcon key={idx} color="yellow.400" boxSize={3.5} />
                ))}
                <Text fontWeight="700" color="text.primary">
                  {(rating > 0 ? rating : 0).toFixed(1)}
                </Text>
              </HStack>
              <Text>{reviewCount} đánh giá</Text>
              <Text>{soldCount.toLocaleString('vi-VN')} đã bán</Text>
            </HStack>
          </Box>

          <Box bg="#fafafa" px={{ base: 3, md: 5 }} py={4} borderBottomWidth="1px" borderColor="blackAlpha.50">
            <HStack align="flex-end" spacing={3} flexWrap="wrap">
              <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="900" color="#ee4d2d" lineHeight="1.1">
                {formatMoney(priceRangeMin)} - {formatMoney(priceRangeMax)}
              </Text>
              {showStrike && discountPct > 0 && (
                <>
                  <Text as="s" color="text.secondary" fontSize="md">
                    {formatMoney(original)}
                  </Text>
                  <Badge bg="#ffe8f0" color="#c41e3a" borderRadius="sm" fontSize="xs" fontWeight="800">
                    -{discountPct}%
                  </Badge>
                </>
              )}
            </HStack>
          </Box>

          <Box bg="linear-gradient(90deg, #ff5722 0%, #ff7043 100%)" color="white" px={3} py={2} borderRadius={{ base: 0, lg: 0 }}>
            <HStack justify="space-between">
              <HStack spacing={2}>
                <Text fontWeight="900" fontSize="sm" textTransform="uppercase">
                  Flash Sale
                </Text>
                <Text fontSize="xs" opacity={0.95}>
                  Kết thúc sau {formatCountdown(flashSeconds)}
                </Text>
              </HStack>
              <Badge bg="whiteAlpha.300" color="white" borderRadius="sm">
                Đã bán {Math.round(soldCount / 1000)}k
              </Badge>
            </HStack>
          </Box>

          <Box bg="white" px={{ base: 3, md: 5 }} py={3} borderBottomWidth="1px" borderColor="blackAlpha.50">
            <HStack align="flex-start" spacing={3}>
              <Box pt={0.5} color="brand.600">
                <FiTruck size={18} />
              </Box>
              <Box flex="1">
                <Text fontSize="sm" fontWeight="800">
                  Vận chuyển
                </Text>
                <Text fontSize="sm" color="text.secondary">
                  Miễn phí vận chuyển cho đơn từ ₫45.000 (tối đa ₫15.000)
                </Text>
                <Text fontSize="xs" color="text.secondary" mt={1}>
                  Nhận hàng từ 3–5 ngày · Giao hàng tận nơi
                </Text>
              </Box>
              <ChevronRightIcon color="gray.400" />
            </HStack>
          </Box>

          <Box bg="white" px={{ base: 3, md: 5 }} py={3} borderBottomWidth="1px" borderColor="blackAlpha.50">
            <HStack spacing={3} align="flex-start">
              <Box pt={0.5} color="green.500">
                <FiShield size={18} />
              </Box>
              <Text fontSize="sm" color="text.secondary">
                An tâm mua sắm: đổi ý 15 ngày · Hàng chính hãng · Hoàn tiền nếu hàng giả
              </Text>
            </HStack>
          </Box>

          <Box bg="white" px={{ base: 3, md: 5 }} py={4} borderBottomWidth="1px" borderColor="blackAlpha.50">
            <Text fontSize="sm" fontWeight="800" mb={2}>
              Phân Loại
            </Text>
            <HStack spacing={2} flexWrap="wrap" mb={4}>
              {colors.map((color) => {
                const active = color === selectedColor
                return (
                  <Button
                    key={color}
                    variant="unstyled"
                    p={0}
                    h="auto"
                    minW="unset"
                    onClick={() => {
                      setSelectedColor(color)
                      setSelectedSize(pickDefaultSize(product, color))
                      setQuantity(1)
                      setActiveImage(null)
                    }}
                  >
                    <HStack
                      spacing={2}
                      borderWidth="2px"
                      borderColor={active ? '#ee4d2d' : 'gray.200'}
                      borderRadius="md"
                      px={2}
                      py={1.5}
                      bg={active ? '#fff5f4' : 'white'}
                      _hover={{ borderColor: '#ee4d2d' }}
                    >
                      <Image
                        src={
                          product.colorImages?.find((entry) => entry.color === color)?.images?.[0] ??
                          product.image
                        }
                        alt=""
                        boxSize="36px"
                        borderRadius="sm"
                        objectFit="cover"
                        flexShrink={0}
                      />
                      <Text fontSize="sm" fontWeight="700" color="gray.800">
                        {color}
                      </Text>
                    </HStack>
                  </Button>
                )
              })}
            </HStack>

            <Text fontSize="sm" fontWeight="800" mb={2}>
              Kích cỡ
            </Text>
            <HStack spacing={2} flexWrap="wrap" mb={4}>
              {sizes.map((size) => {
                const active = size === selectedSize
                const outOfStock = getVariantStock(product, selectedColor, size) <= 0
                return (
                  <Button
                    key={size}
                    size="sm"
                    variant="outline"
                    borderRadius="md"
                    borderWidth="2px"
                    borderColor={outOfStock ? 'gray.100' : active ? '#ee4d2d' : 'gray.200'}
                    color={outOfStock ? 'gray.400' : active ? '#ee4d2d' : 'gray.700'}
                    bg={outOfStock ? 'gray.50' : active ? '#fff5f4' : 'white'}
                    fontWeight="700"
                    minW="44px"
                    opacity={outOfStock ? 0.5 : 1}
                    cursor={outOfStock ? 'not-allowed' : 'pointer'}
                    isDisabled={outOfStock}
                    _hover={outOfStock ? undefined : { borderColor: '#ee4d2d' }}
                    _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
                    onClick={() => {
                      if (outOfStock) return
                      setSelectedSize(size)
                      setQuantity(1)
                    }}
                  >
                    {size}
                  </Button>
                )
              })}
              {sizes.length === 0 && (
                <Text fontSize="sm" color="text.secondary">
                  Chọn màu để xem kích cỡ
                </Text>
              )}
            </HStack>

            <HStack justify="space-between" align="center" mb={4}>
              <Text fontSize="sm" fontWeight="800">
                Số lượng
              </Text>
              <HStack spacing={1} borderWidth="1px" borderColor="gray.200" borderRadius="md" px={1}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  isDisabled={!selectedVariant || safeQty <= 1}
                >
                  <MinusIcon />
                </Button>
                <Text w="40px" textAlign="center" fontWeight="800">
                  {safeQty}
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  isDisabled={!selectedVariant || safeQty >= maxQty}
                >
                  <AddIcon />
                </Button>
              </HStack>
            </HStack>

            <HStack justify="space-between" fontSize="sm" mb={selectedPromotion ? 1 : 2}>
              <Text color="text.secondary">
                Tạm tính ({safeQty} sản phẩm)
              </Text>
              <HStack spacing={2}>
                {promotionDiscountAmount > 0 ? (
                  <Text as="s" color="text.secondary" fontSize="xs">
                    {formatMoney(lineTotal)}
                  </Text>
                ) : null}
                <Text fontWeight="900" color="#ee4d2d">
                  {formatMoney(lineTotalAfterPromotion)}
                </Text>
              </HStack>
            </HStack>
            {promotionDiscountAmount > 0 ? (
              <HStack justify="space-between" fontSize="xs" color="green.600" mb={2}>
                <Text>Khuyến mãi ({selectedPromotion?.code})</Text>
                <Text fontWeight="700">-{formatMoney(promotionDiscountAmount)}</Text>
              </HStack>
            ) : null}
            <Checkbox
              size="sm"
              isChecked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              colorScheme="pink"
              mb={4}
            >
              <Text fontSize="11px" lineHeight="1.4" color="text.secondary">
                Tôi đồng ý với{' '}
                <Text as="span" color="brand.600" fontWeight="700">
                  Điều khoản DTT Shop
                </Text>{' '}
                và chính sách đổi trả.
              </Text>
            </Checkbox>

            <HStack spacing={3} w="100%" align="stretch">
              <Button
                flex={1}
                leftIcon={<FiShoppingCart size={20} />}
                variant="outline"
                borderWidth="2px"
                borderColor="#ee4d2d"
                color="#ee4d2d"
                fontWeight="800"
                bg="#fff5f4"
                h="48px"
                fontSize="sm"
                _hover={{ bg: '#ffe8e6' }}
                onClick={handleInlineAddToCart}
                isLoading={cartApiLoading}
              >
                Thêm Vào Giỏ Hàng
              </Button>
              <Button
                flex={1}
                fontWeight="900"
                color="white"
                h="48px"
                fontSize="sm"
                bg="linear-gradient(180deg, #f53d2d 0%, #e0182d 100%)"
                _hover={{ bg: 'linear-gradient(180deg, #e83525 0%, #c91528 100%)' }}
                boxShadow="0 2px 8px rgba(238,77,45,0.45)"
                onClick={handleInlineBuyNow}
                isLoading={cartApiLoading}
              >
                Mua Ngay
              </Button>
            </HStack>
          </Box>

          {shopPromotions.length > 0 ? (
          <>
          <Box bg="white" px={{ base: 3, md: 5 }} py={3} borderBottomWidth="1px" borderColor="blackAlpha.50">
            <Text fontSize="xs" fontWeight="800" color="text.secondary" mb={2} textTransform="uppercase">
              Khuyến mãi
            </Text>
            <Button
              variant="unstyled"
              w="100%"
              textAlign="left"
              onClick={voucherModal.onOpen}
              py={1}
              h="auto"
            >
              <HStack justify="space-between" w="100%" align="center">
                <HStack flex="1" minW={0} spacing={2}>
                  <Badge colorScheme="red" borderRadius="sm" fontSize="10px">
                    KM
                  </Badge>
                  <Text fontSize="sm" fontWeight="700" noOfLines={1}>
                    {selectedVoucher.title}
                  </Text>
                </HStack>
                <ChevronRightIcon color="gray.400" />
              </HStack>
            </Button>
            <HStack spacing={2} overflowX="auto" pb={1} pt={2} css={{ scrollbarWidth: 'thin' }}>
              {shopPromotions.map((p) => {
                const selectable = isPromotionSelectable(promotionOrderAmount, p)
                return (
                  <Badge
                    key={p.code}
                    flexShrink={0}
                    px={2}
                    py={1}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={
                      !selectable
                        ? 'gray.200'
                        : selectedVoucherId === p.code
                          ? 'brand.500'
                          : 'brand.200'
                    }
                    bg={
                      !selectable
                        ? 'gray.50'
                        : selectedVoucherId === p.code
                          ? 'brand.100'
                          : 'brand.50'
                    }
                    color={selectable ? 'brand.700' : 'gray.400'}
                    fontSize="10px"
                    fontWeight="700"
                    opacity={selectable ? 1 : 0.5}
                    cursor={selectable ? 'pointer' : 'not-allowed'}
                    onClick={() => {
                      if (!selectable) return
                      setSelectedVoucherId(p.code)
                      persistCheckoutVoucher(p.code)
                    }}
                  >
                    {p.alreadyUsed ? 'Đã dùng' : p.chipLabel}
                  </Badge>
                )
              })}
            </HStack>
          </Box>

          <Modal isOpen={voucherModal.isOpen} onClose={voucherModal.onClose} size="lg" motionPreset="slideInBottom">
            <ModalOverlay bg="blackAlpha.400" />
            <ModalContent mx={{ base: 2, md: 'auto' }} mb={{ base: 0, md: 'auto' }} borderRadius={{ base: 'xl xl 0 0', md: 'xl' }}>
              <ModalHeader fontSize="md" borderBottomWidth="1px" borderColor="blackAlpha.100">
                Chọn khuyến mãi
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody py={4}>
                <RadioGroup
                  value={selectedVoucherId}
                  onChange={(value) => {
                    if (value !== 'none') {
                      const promo = shopPromotions.find((p) => p.code === value)
                      if (promo && !isPromotionSelectable(promotionOrderAmount, promo)) return
                    }
                    setSelectedVoucherId(value)
                  }}
                >
                  <Stack spacing={3}>
                    {voucherOptions.map((v) => {
                      const promo =
                        v.id === 'none' ? null : shopPromotions.find((p) => p.code === v.id)
                      const eligible =
                        v.id === 'none' ||
                        (promo != null && isPromotionSelectable(promotionOrderAmount, promo))
                      return (
                        <Box
                          key={v.id}
                          borderWidth="1px"
                          borderColor={
                            !eligible
                              ? 'gray.100'
                              : selectedVoucherId === v.id
                                ? 'brand.500'
                                : 'border.muted'
                          }
                          borderRadius="lg"
                          p={3}
                          cursor={eligible ? 'pointer' : 'not-allowed'}
                          opacity={eligible ? 1 : 0.5}
                          onClick={() => {
                            if (!eligible) return
                            setSelectedVoucherId(v.id)
                          }}
                          bg={
                            !eligible
                              ? 'gray.50'
                              : selectedVoucherId === v.id
                                ? 'brand.50'
                                : 'white'
                          }
                        >
                          <HStack align="flex-start" spacing={3}>
                            <Radio
                              value={v.id}
                              mt={1}
                              colorScheme="pink"
                              isDisabled={!eligible}
                            />
                            <Box flex="1">
                              <Text
                                fontWeight="800"
                                fontSize="sm"
                                color={eligible ? 'inherit' : 'gray.500'}
                              >
                                {v.title}
                              </Text>
                              {v.desc ? (
                                <Text fontSize="xs" color="text.secondary" mt={1}>
                                  {v.desc}
                                </Text>
                              ) : null}
                              {promo && !eligible ? (
                                <Text
                                  fontSize="xs"
                                  color={promo.alreadyUsed ? 'gray.500' : 'orange.600'}
                                  mt={1}
                                >
                                  {promotionDisabledHint(promotionOrderAmount, promo)}
                                </Text>
                              ) : null}
                            </Box>
                          </HStack>
                        </Box>
                      )
                    })}
                  </Stack>
                </RadioGroup>
              </ModalBody>
              <ModalFooter borderTopWidth="1px" borderColor="blackAlpha.100" gap={2}>
                <Button variant="ghost" flex={1} onClick={voucherModal.onClose}>
                  Đóng
                </Button>
                <Button
                  flex={1}
                  bg="brand.600"
                  color="white"
                  _hover={{ bg: 'brand.700' }}
                  fontWeight="800"
                  onClick={applyVoucherSelection}
                >
                  Áp dụng
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
          </>
          ) : null}

          <Modal isOpen={shareModal.isOpen} onClose={shareModal.onClose} size="md" motionPreset="slideInBottom">
            <ModalOverlay bg="blackAlpha.400" />
            <ModalContent mx={{ base: 3, md: 'auto' }} borderRadius="xl">
              <ModalHeader fontSize="md" borderBottomWidth="1px" borderColor="blackAlpha.100">
                Chia sẻ sản phẩm
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody py={4}>
                <Text fontSize="sm" color="text.secondary" mb={4} noOfLines={2}>
                  {product.name}
                </Text>
                <VStack spacing={3} align="stretch">
                  <Button
                    w="100%"
                    justifyContent="flex-start"
                    leftIcon={<FiShare2 />}
                    variant="outline"
                    borderColor="border.muted"
                    fontWeight="700"
                    onClick={() => {
                      void copyProductLink()
                      shareModal.onClose()
                    }}
                  >
                    Sao chép liên kết
                  </Button>
                  {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
                    <Button
                      w="100%"
                      justifyContent="flex-start"
                      leftIcon={<FiShare2 />}
                      variant="outline"
                      borderColor="border.muted"
                      fontWeight="700"
                      onClick={() => void handleNativeShare()}
                    >
                      Chia sẻ nhanh (ứng dụng hệ thống)
                    </Button>
                  ) : null}
                </VStack>
              </ModalBody>
            </ModalContent>
          </Modal>

          {/* Tabs mô tả / đánh giá */}
          <Box bg="white" px={{ base: 0, md: 5 }} pb={6}>
            <Tabs colorScheme="pink" variant="line">
              <TabList px={{ base: 3, md: 0 }} borderColor="blackAlpha.100">
                <Tab fontWeight="800" _selected={{ color: 'brand.600', borderColor: 'brand.600' }}>
                  Mô tả sản phẩm
                </Tab>
                <Tab fontWeight="800" _selected={{ color: 'brand.600', borderColor: 'brand.600' }}>
                  Đánh giá ({reviewCount})
                </Tab>
                <Tab fontWeight="800" _selected={{ color: 'brand.600', borderColor: 'brand.600' }}>
                  Bình luận
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={{ base: 3, md: 0 }} pt={4}>
                  <Text color="text.secondary" lineHeight="1.85" fontSize="sm">
                    {product.description}
                  </Text>
                  <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3} mt={4}>
                    {[
                      { t: 'Thương hiệu', v: product.brand },
                      { t: 'Danh mục', v: product.category },
                      { t: 'SKU', v: selectedVariant?.sku ?? '—' },
                    ].map((row) => (
                      <Box key={row.t} borderWidth="1px" borderColor="border.subtle" borderRadius="md" p={3}>
                        <Text fontSize="xs" color="text.secondary">
                          {row.t}
                        </Text>
                        <Text fontWeight="700" fontSize="sm" mt={1} textTransform="capitalize">
                          {row.v}
                        </Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                </TabPanel>
                <TabPanel px={{ base: 3, md: 0 }} pt={4}>
                  <ProductReviewsPanel productId={apiProductId} />
                </TabPanel>
                <TabPanel px={{ base: 3, md: 0 }} pt={4}>
                  <ProductCommentsPanel productId={apiProductId} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>

          {/* Sản phẩm tương tự */}
          <Box bg="bg.canvas" pt={4}>
            <Container maxW="container.lg" px={0}>
              <Heading size="sm" mb={3} px={{ base: 1, md: 0 }}>
                Có thể bạn cũng thích
              </Heading>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                {relatedProducts.map((p) => (
                    <Link key={p.id} to={buildProductPath(p)}>
                      <Box bg="white" borderRadius="lg" overflow="hidden" borderWidth="1px" borderColor="border.subtle" _hover={{ shadow: 'md' }}>
                        <AspectRatio ratio={1}>
                          <Image src={p.image} alt={p.name} objectFit="cover" />
                        </AspectRatio>
                        <Box p={2}>
                          <Text fontWeight="700" fontSize="sm" noOfLines={2}>
                            {p.name}
                          </Text>
                          <Text fontSize="sm" color="brand.600" fontWeight="900" mt={1}>
                            {formatMoney(p.price)}
                          </Text>
                        </Box>
                      </Box>
                    </Link>
                  ))}
              </SimpleGrid>
            </Container>
          </Box>
        </VStack>
      </Grid>

      {/* Panel chọn phân loại — bottom sheet kiểu Shopee */}
      <Drawer isOpen={cartSheet.isOpen} onClose={cartSheet.onClose} placement="bottom" size="full">
        <DrawerOverlay bg="blackAlpha.400" />
        <DrawerContent borderTopRadius="2xl" maxH="88vh" display="flex" flexDirection="column">
          <DrawerCloseButton />
          <DrawerHeader pb={2} borderBottomWidth="1px" borderColor="blackAlpha.100" fontSize="md" fontWeight="800">
            Chọn phân loại hàng
          </DrawerHeader>
          <DrawerBody overflowY="auto" flex="1" px={4} pt={4}>
            <HStack align="flex-start" spacing={3} mb={4} pb={4} borderBottomWidth="1px" borderColor="blackAlpha.100">
              <Image src={product.image} alt="" boxSize="88px" borderRadius="md" objectFit="cover" borderWidth="1px" borderColor="blackAlpha.100" flexShrink={0} />
              <Box flex="1" minW={0}>
                <HStack spacing={2} flexWrap="wrap">
                  <Text fontSize="lg" fontWeight="900" color="#ee4d2d">
                    {formatMoney(price)}
                  </Text>
                  {showStrike && discountPct > 0 ? (
                    <>
                      <Text as="s" fontSize="sm" color="text.secondary">
                        {formatMoney(original)}
                      </Text>
                      <Badge bg="#ffe8f0" color="#c41e3a" fontSize="10px" fontWeight="800">
                        -{discountPct}%
                      </Badge>
                    </>
                  ) : null}
                </HStack>
                <Text fontSize="sm" color="text.secondary" mt={1} noOfLines={2}>
                  {product.name}
                </Text>
                <Text fontSize="xs" color="text.secondary" mt={2}>
                  {selectedVariant
                    ? canBuy
                      ? `Kho: ${selectedVariant.stock}`
                      : 'Hết hàng'
                    : 'Chọn phân loại'}
                </Text>
              </Box>
            </HStack>

            <Text fontSize="sm" fontWeight="800" mb={2}>
              Màu sắc
            </Text>
            <HStack spacing={2} flexWrap="wrap" mb={5}>
              {colors.map((color) => {
                const active = color === selectedColor
                return (
                  <Button
                    key={color}
                    size="sm"
                    variant="outline"
                    borderRadius="md"
                    borderWidth="2px"
                    borderColor={active ? '#ee4d2d' : 'gray.200'}
                    color={active ? '#ee4d2d' : 'gray.700'}
                    bg={active ? '#fff5f4' : 'white'}
                    fontWeight="700"
                    _hover={{ borderColor: '#ee4d2d' }}
                    onClick={() => {
                      setSelectedColor(color)
                      setSelectedSize(pickDefaultSize(product, color))
                      setQuantity(1)
                    }}
                  >
                    {color}
                  </Button>
                )
              })}
            </HStack>

            <Text fontSize="sm" fontWeight="800" mb={2}>
              Kích cỡ
            </Text>
            <HStack spacing={2} flexWrap="wrap" mb={5}>
              {sizes.map((size) => {
                const active = size === selectedSize
                const outOfStock = getVariantStock(product, selectedColor, size) <= 0
                return (
                  <Button
                    key={size}
                    size="sm"
                    variant="outline"
                    borderRadius="md"
                    borderWidth="2px"
                    borderColor={outOfStock ? 'gray.100' : active ? '#ee4d2d' : 'gray.200'}
                    color={outOfStock ? 'gray.400' : active ? '#ee4d2d' : 'gray.700'}
                    bg={outOfStock ? 'gray.50' : active ? '#fff5f4' : 'white'}
                    fontWeight="700"
                    opacity={outOfStock ? 0.5 : 1}
                    cursor={outOfStock ? 'not-allowed' : 'pointer'}
                    isDisabled={outOfStock}
                    _hover={outOfStock ? undefined : { borderColor: '#ee4d2d' }}
                    _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
                    onClick={() => {
                      if (outOfStock) return
                      setSelectedSize(size)
                      setQuantity(1)
                    }}
                  >
                    {size}
                  </Button>
                )
              })}
              {sizes.length === 0 && (
                <Text fontSize="sm" color="text.secondary">
                  Chọn màu để xem kích cỡ
                </Text>
              )}
            </HStack>

            <HStack justify="space-between" align="center" mb={2}>
              <Text fontSize="sm" fontWeight="800">
                Số lượng
              </Text>
              <HStack spacing={1} borderWidth="1px" borderColor="gray.200" borderRadius="md" px={1}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  isDisabled={!selectedVariant || safeQty <= 1}
                >
                  <MinusIcon />
                </Button>
                <Text w="40px" textAlign="center" fontWeight="800">
                  {safeQty}
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  isDisabled={!selectedVariant || safeQty >= maxQty}
                >
                  <AddIcon />
                </Button>
              </HStack>
            </HStack>
          </DrawerBody>
          <DrawerFooter borderTopWidth="1px" borderColor="blackAlpha.100" bg="white" py={4} px={4} flexShrink={0}>
            <Button
              w="100%"
              h="48px"
              fontWeight="900"
              fontSize="md"
              color="white"
              isDisabled={!canBuy}
              bg="linear-gradient(180deg, #f53d2d 0%, #e0182d 100%)"
              _hover={{ bg: 'linear-gradient(180deg, #e83525 0%, #c91528 100%)' }}
              _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
              boxShadow="0 2px 8px rgba(238,77,45,0.35)"
              onClick={handleSheetConfirm}
              isLoading={cartApiLoading}
            >
              {cartSheetAction === 'buy' ? 'Mua ngay' : 'Thêm vào giỏ hàng'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

    </Box>
  )
}
