import { ArrowBackIcon, ArrowForwardIcon, CheckCircleIcon } from '@chakra-ui/icons'
import {
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
  Radio,
  RadioGroup,
  Stack,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { LoginRequiredPrompt } from '../../auth/components/login-required-prompt'
import { useCommerce } from '../../commerce/context/commerce-context'
import {
  buildCheckoutPaymentUrls,
  getCheckoutPaymentDescription,
  isZaloPayPaymentMethod,
  pickDefaultCheckoutProvider,
} from '../../commerce/lib/commerce.utils'
import { formatProductPrice } from '../../products/lib/product-price'
import type { PaymentMethodOption } from '../../commerce/types/commerce.type'
import { PayOsIcon } from '../../../shared/components/payos-icon'
import { ZaloPayIcon } from '../../../shared/components/zalopay-icon'
import {
  buildBuyNowPreview,
  clearBuyNowDraft,
  readBuyNowDraft,
} from '../../commerce/lib/buy-now-checkout'
import { persistCheckoutVoucher, readCheckoutVoucher } from '../../commerce/lib/checkout-voucher'
import {
  formatCheckoutSubtotal,
  isPromotionSelectable,
  mapPromotionApplyError,
  promotionDisabledHint,
} from '../../commerce/lib/checkout-promotion'
import { assertCartCheckoutReady } from '../../commerce/lib/cart-validate'
import { computeShippingFee } from '../../../lib/shipping-fee'
import { useShopSettings } from '../../settings/context/shop-settings-context'
import { promotionsApi, type ShopPromotion } from '../../promotions/services/promotions.api'
import { applyAddressToCheckout } from '../../account/components/address-book-card'
import { addressesApi } from '../../account/services/addresses.api'
import { formatAddressLine, type UserAddress } from '../../account/types/address.type'
import { clientAuthApi } from '../../auth/services/client-auth.api'
import { commerceApi, type CheckoutPreviewResponse } from '../../commerce/services/commerce.api'

const getDefaultEmail = () => {
  if (typeof window === 'undefined') return ''

  try {
    const raw = window.localStorage.getItem('email_auth_demo')
    if (!raw) return ''
    const parsed = JSON.parse(raw) as { email?: string }
    return parsed.email ?? ''
  } catch {
    return ''
  }
}

export const CheckoutPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { shippingConfig } = useShopSettings()
  const { checkoutDraft, clearCheckoutDraft, paymentMethods, placeOrder } = useCommerce()
  const localPaymentMethod = checkoutDraft?.paymentMethod ?? 'E_WALLET'
  const apiMode = searchParams.get('mode') === 'api'
  const buyNowMode = searchParams.get('source') === 'buy_now'
  const buyNowVariantId = searchParams.get('variantId') ?? ''
  const buyNowQuantity = Math.max(1, Number(searchParams.get('quantity') ?? '1') || 1)
  const apiItemIds = (searchParams.get('itemIds') ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const [serverEnabled, setServerEnabled] = useState(() => commerceApi.hasServerToken())
  const [remotePreview, setRemotePreview] = useState<CheckoutPreviewResponse | null>(null)
  const [remotePaymentMethods, setRemotePaymentMethods] = useState(paymentMethods)
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState('')

  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientEmail, setRecipientEmail] = useState(getDefaultEmail)
  const [shippingMethod, setShippingMethod] = useState('Express')
  const [shippingAddressLine1, setShippingAddressLine1] = useState('')
  const [shippingAddressLine2, setShippingAddressLine2] = useState('')
  const [shippingWard, setShippingWard] = useState('')
  const [shippingDistrict, setShippingDistrict] = useState('')
  const [shippingProvince, setShippingProvince] = useState('')
  const [shippingPostalCode, setShippingPostalCode] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [formError, setFormError] = useState('')
  const [shopPromotions, setShopPromotions] = useState<ShopPromotion[]>([])
  const [selectedPromotionCode, setSelectedPromotionCode] = useState<string | null>(null)
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new')
  const [saveAddress, setSaveAddress] = useState(true)
  const activeApiMode = apiMode && serverEnabled

  const addressSetters = {
    setRecipientName,
    setRecipientPhone,
    setShippingAddressLine1,
    setShippingAddressLine2,
    setShippingWard,
    setShippingDistrict,
    setShippingProvince,
    setShippingPostalCode,
  }

  const loadSavedAddresses = async () => {
    if (!commerceApi.hasServerToken()) return
    try {
      const list = await addressesApi.list()
      setSavedAddresses(list)
      const defaultAddr = list.find((a) => a.isDefault) ?? list[0]
      if (defaultAddr) {
        setSelectedAddressId(String(defaultAddr.id))
        applyAddressToCheckout(defaultAddr, addressSetters)
        setSaveAddress(false)
      } else {
        setSelectedAddressId('new')
        setSaveAddress(true)
        try {
          const me = await clientAuthApi.meCurrent()
          if (me.fullName && !recipientName) setRecipientName(me.fullName)
        } catch {
          /* ignore */
        }
      }
    } catch {
      setSavedAddresses([])
      setSaveAddress(true)
    }
  }

  const loadRemotePreview = async (
    forceApiMode = apiMode && commerceApi.hasServerToken(),
    promotionCode?: string | null,
  ) => {
    if (!forceApiMode) {
      setRemotePreview(null)
      setRemotePaymentMethods(paymentMethods)
      setRemoteError('')
      return
    }

    try {
      setRemoteLoading(true)
      setRemoteError('')

      if (buyNowMode) {
        const draft = readBuyNowDraft()
        if (!draft) {
          throw new Error('Không tìm thấy thông tin mua ngay. Hãy quay lại trang sản phẩm và thử lại.')
        }

        const variant = buyNowVariantId
          ? await commerceApi.getVariantById(buyNowVariantId).catch(() => null)
          : null

        const preview = buildBuyNowPreview(
          {
            ...draft,
            stock: variant?.stockQuantity ?? draft.stock,
            quantity: buyNowQuantity || draft.quantity,
          },
          buyNowQuantity || draft.quantity,
        )

        if (preview.hasUnavailableItems) {
          throw new Error('Bien the nay da het hang.')
        }

        const methods = await commerceApi.getPaymentMethods().catch(() => paymentMethods)
        const code = promotionCode !== undefined ? promotionCode : selectedPromotionCode
        if (code) {
          try {
            const applied = await commerceApi.validatePromotion({
              code,
              subtotal: preview.subtotal,
              shippingFee: preview.shippingFee,
            })
            setRemotePreview({
              ...preview,
              discountAmount: applied.discountAmount,
              shippingFee: applied.shippingFee,
              totalAmount: applied.totalAmount,
              voucherCode: applied.code,
              promotionNotice: null,
            })
          } catch (error) {
            const promo = shopPromotions.find((p) => p.code === code)
            const hint = promo ? promotionDisabledHint(preview.subtotal, promo) : null
            setRemotePreview({
              ...preview,
              promotionNotice: hint
                ? `${hint}. Tạm tính: ${formatCheckoutSubtotal(preview.subtotal)}.`
                : mapPromotionApplyError(error),
              voucherCode: null,
            })
          }
        } else {
          setRemotePreview(preview)
        }
        setRemotePaymentMethods(methods.length > 0 ? methods : paymentMethods)
        return
      }

      const validation = await commerceApi.validateCart(
        apiItemIds.length > 0 ? { itemIds: apiItemIds } : { selectedOnly: true },
      )
      assertCartCheckoutReady(validation)

      const code =
        promotionCode !== undefined ? promotionCode : selectedPromotionCode ?? undefined
      const voucherCode = code == null || code === '' ? undefined : code
      const [preview, methods] = await Promise.all([
        commerceApi.previewCheckout({
          itemIds: apiItemIds.length > 0 ? apiItemIds : undefined,
          paymentMethod: 'E_WALLET',
          voucherCode,
          currencyCode: 'VND',
        }),
        commerceApi.getPaymentMethods().catch(() => paymentMethods),
      ])
      setRemotePreview(preview)
      setRemotePaymentMethods(methods.length > 0 ? methods : paymentMethods)
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : 'Không thể tải thông tin thanh toán. Vui lòng thử lại.')
    } finally {
      setRemoteLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void promotionsApi
      .listForShop(serverEnabled)
      .then((items) => {
        if (cancelled) return
        setShopPromotions(items)
        const saved = readCheckoutVoucher()
        const savedPromo = saved ? items.find((p) => p.code === saved) : null
        if (savedPromo && !savedPromo.alreadyUsed) {
          setSelectedPromotionCode(saved)
        } else if (saved && savedPromo?.alreadyUsed) {
          setSelectedPromotionCode(null)
          persistCheckoutVoucher(null)
        } else if (!items.length) {
          setSelectedPromotionCode(null)
          persistCheckoutVoucher(null)
        }
      })
      .catch(() => {
        if (!cancelled) setShopPromotions([])
      })
    return () => {
      cancelled = true
    }
  }, [serverEnabled])

  useEffect(() => {
    void loadRemotePreview(activeApiMode)
  }, [activeApiMode, apiItemIds.join(','), buyNowVariantId, buyNowQuantity, paymentMethods, selectedPromotionCode])

  useEffect(() => {
    if (activeApiMode) {
      void loadSavedAddresses()
    }
  }, [activeApiMode])

  const localBuyNowDraft = buyNowMode ? readBuyNowDraft() : null
  const localBuyNowPreview = localBuyNowDraft
    ? buildBuyNowPreview(localBuyNowDraft, localBuyNowDraft.quantity, shippingConfig)
    : null

  const subtotal = useMemo(
    () =>
      activeApiMode
        ? Number(remotePreview?.subtotal ?? 0)
        : checkoutDraft
          ? Number(
              checkoutDraft.items
                .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
                .toFixed(2),
            )
          : Number(localBuyNowPreview?.subtotal ?? 0),
    [activeApiMode, checkoutDraft, localBuyNowPreview, remotePreview],
  )
  const shippingFee = activeApiMode
    ? Number(remotePreview?.shippingFee ?? 0)
    : computeShippingFee(subtotal, shippingConfig)
  const discountAmount = activeApiMode ? Number(remotePreview?.discountAmount ?? 0) : 0
  const totalAmount = activeApiMode
    ? Number(remotePreview?.totalAmount ?? 0)
    : subtotal + shippingFee
  const activeItems = activeApiMode
    ? remotePreview?.items ?? []
    : checkoutDraft?.items ?? localBuyNowPreview?.items ?? []
  const promotionNotice = remotePreview?.promotionNotice?.trim() || null
  const appliedVoucherCode = remotePreview?.voucherCode ?? null

  useEffect(() => {
    // Đợi có preview/subtotal rồi mới auto-clear, tránh race lúc mới load (subtotal=0)
    if (!selectedPromotionCode || !activeApiMode || shopPromotions.length === 0 || subtotal <= 0) return
    const promo = shopPromotions.find((p) => p.code === selectedPromotionCode)
    if (promo && !isPromotionSelectable(subtotal, promo)) {
      setSelectedPromotionCode(null)
      persistCheckoutVoucher(null)
      void loadRemotePreview(true, null)
    }
  }, [subtotal, selectedPromotionCode, shopPromotions, activeApiMode])

  // Nếu server đã áp mã thành công (voucherCode), đồng bộ lại radio đang chọn.
  useEffect(() => {
    if (!activeApiMode) return
    if (!appliedVoucherCode) return
    if (selectedPromotionCode === appliedVoucherCode) return
    setSelectedPromotionCode(appliedVoucherCode)
  }, [activeApiMode, appliedVoucherCode, selectedPromotionCode])

  const activePaymentMethods = activeApiMode ? remotePaymentMethods : paymentMethods
  const [selectedProvider, setSelectedProvider] = useState<'ZALOPAY' | 'PAYOS'>('ZALOPAY')
  const checkoutPaymentUrls = useMemo(() => buildCheckoutPaymentUrls(), [])

  useEffect(() => {
    setSelectedProvider(pickDefaultCheckoutProvider(activePaymentMethods))
  }, [activePaymentMethods])

  const handleInputChange =
    (setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(event.target.value)
    }

  const handlePlaceOrder = () => {
    if (!activeApiMode && !hasLocalCheckout) return

    const hasMissingFields =
      !recipientName.trim() ||
      !recipientPhone.trim() ||
      !recipientEmail.trim() ||
      !shippingAddressLine1.trim() ||
      !shippingDistrict.trim() ||
      !shippingProvince.trim()

    if (hasMissingFields) {
      setFormError('Vui long nhap day du thong tin nguoi nhan va dia chi giao hang.')
      return
    }

    if (activeApiMode) {
      void (async () => {
        try {
          setFormError('')
          if (!buyNowMode) {
            const validation = await commerceApi.validateCart(
              apiItemIds.length > 0 ? { itemIds: apiItemIds } : { selectedOnly: true },
            )
            assertCartCheckoutReady(validation)
          }

          const checkoutBody = {
            recipientName,
            recipientPhone,
            recipientEmail,
            shippingMethod,
            shippingAddress: {
              line1: shippingAddressLine1,
              line2: shippingAddressLine2,
              ward: shippingWard,
              district: shippingDistrict,
              province: shippingProvince,
              postalCode: shippingPostalCode,
              country: 'VN',
            },
            customerNote,
            note: 'Đặt hàng từ website DTT Shop',
            shippingFee,
            subtotal: remotePreview?.subtotal,
            discountAmount: remotePreview?.discountAmount ?? 0,
            voucherCode: appliedVoucherCode ?? undefined,
            paymentMethod: 'E_WALLET' as const,
            provider: selectedProvider,
            returnUrl: checkoutPaymentUrls.returnUrl,
            cancelUrl: checkoutPaymentUrls.cancelUrl,
            currencyCode: 'VND',
            saveAddress: saveAddress || savedAddresses.length === 0,
          }

          const buyNowItems =
            remotePreview?.items.map((item) => ({
              variantId: Number(item.variantId),
              quantity: item.quantity,
            })) ?? []

          const result =
            buyNowMode && buyNowItems.length > 0
              ? await commerceApi.createOrder({
                  source: 'BUY_NOW',
                  items: buyNowItems,
                  ...checkoutBody,
                })
              : await commerceApi.checkoutFromCart({
                  itemIds: apiItemIds.length > 0 ? apiItemIds : undefined,
                  body: checkoutBody,
                })

          clearBuyNowDraft()
          navigate(`${ROUTES.PAYMENT.replace(':orderCode', result.order.orderCode)}?mode=api`)
        } catch (error) {
          setFormError(error instanceof Error ? error.message : 'Đặt hàng thất bại. Vui lòng thử lại.')
        }
      })()
      return
    }

    const order = placeOrder({
      recipientName,
      recipientPhone,
      recipientEmail,
      shippingMethod,
      shippingAddress: {
        line1: shippingAddressLine1,
        line2: shippingAddressLine2,
        ward: shippingWard,
        district: shippingDistrict,
        province: shippingProvince,
        postalCode: shippingPostalCode,
        country: 'VN',
      },
      customerNote,
      note: 'Đặt hàng từ website DTT Shop',
      shippingFee,
      discountAmount: 0,
      paymentMethod: localPaymentMethod,
      returnUrl: ROUTES.CHECKOUT_RESULT,
      cancelUrl: ROUTES.CHECKOUT_CANCEL,
    })

    if (!order) return
    clearBuyNowDraft()
    navigate(ROUTES.PAYMENT.replace(':orderCode', order.orderCode))
  }

  if (apiMode && !serverEnabled) {
    return (
      <LoginRequiredPrompt
        description="Đăng nhập để xem giỏ hàng và tiếp tục thanh toán."
        onSuccess={async () => {
          setServerEnabled(true)
          await loadRemotePreview(true)
        }}
      />
    )
  }

  if (activeApiMode && remoteLoading && !remotePreview) {
    return (
      <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 6, md: 10 }}>
        <Text>Đang kiểm tra giỏ hàng và chuẩn bị đơn hàng...</Text>
      </Box>
    )
  }

  if (activeApiMode && remoteError && !remotePreview) {
    return (
      <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 6, md: 10 }}>
        <VStack align="stretch" spacing={4}>
          <Heading size="md">Giỏ hàng chưa sẵn sàng thanh toán</Heading>
          <Text color="text.secondary" whiteSpace="pre-wrap">
            {remoteError}
          </Text>
          <Button as={Link} to={ROUTES.CART} colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }} alignSelf="start">
            Quay lại giỏ hàng
          </Button>
        </VStack>
      </Box>
    )
  }

  const hasLocalCheckout = Boolean(checkoutDraft) || (buyNowMode && readBuyNowDraft())

  if (!activeApiMode && !hasLocalCheckout) {
    return (
      <Box
        bg="surface.card"
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="2xl"
        p={{ base: 6, md: 10 }}
      >
        <VStack spacing={4} textAlign="center">
          <Heading size="md">Chưa có sản phẩm để thanh toán</Heading>
          <Text color="text.secondary" maxW="560px">
            Hãy thêm giày vào giỏ hàng hoặc chọn Mua ngay tại trang sản phẩm để tiếp tục đặt hàng.
          </Text>
          <HStack spacing={3}>
            <Button as={Link} to={ROUTES.CART} variant="outline" borderColor="border.muted">
              Mở giỏ hàng
            </Button>
            <Button as={Link} to={ROUTES.HOME} colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }}>
              Về trang chủ
            </Button>
          </HStack>
        </VStack>
      </Box>
    )
  }

  return (
    <VStack align="stretch" spacing={5}>
      {remoteError ? (
        <Box bg="red.50" borderWidth="1px" borderColor="red.100" borderRadius="xl" p={4}>
          <Text color="red.500">{remoteError}</Text>
        </Box>
      ) : null}

      {buyNowMode && activeApiMode ? (
        <Box bg="blue.50" borderWidth="1px" borderColor="blue.100" borderRadius="xl" p={4}>
          <Text fontWeight="800">Mua ngay</Text>
          <Text fontSize="sm" color="text.secondary" mt={1}>
            Bạn đang đặt trực tiếp sản phẩm này, không qua giỏ hàng.
          </Text>
        </Box>
      ) : null}

      <HStack spacing={2} fontSize="sm" color="text.secondary" flexWrap="wrap">
        <Link to={ROUTES.CART} className="hover:text-gray-900">
          Giỏ hàng
        </Link>
        <Text>/</Text>
        <Text color="text.primary" fontWeight="700">
          Thanh toán
        </Text>
      </HStack>

      <Grid templateColumns={{ base: '1fr', xl: '1fr 380px' }} gap={5} alignItems="start">
        <VStack align="stretch" spacing={4}>
          <Box
            bg="surface.card"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="xl"
            p={5}
          >
            <HStack justify="space-between" mb={4} flexWrap="wrap" gap={3}>
              <Box>
                <Heading size="md">Thông tin giao hàng</Heading>
                <Text color="text.secondary" mt={1}>
                  {activeApiMode
                    ? buyNowMode
                      ? 'Đặt hàng: Mua ngay'
                      : 'Đặt hàng từ giỏ hàng'
                    : checkoutDraft?.source === 'cart'
                      ? 'Đặt hàng từ giỏ hàng'
                      : 'Đặt hàng: Mua ngay'}
                </Text>
              </Box>
              <Button
                leftIcon={<ArrowBackIcon />}
                variant="ghost"
                onClick={() => {
                  if (!activeApiMode) {
                    clearCheckoutDraft()
                  }
                  navigate(ROUTES.CART)
                }}
              >
                Quay lại
              </Button>
            </HStack>

            {activeApiMode && savedAddresses.length > 0 ? (
              <Box mb={4} p={4} bg="gray.50" borderRadius="lg" borderWidth="1px" borderColor="border.subtle">
                <Text fontWeight="700" fontSize="sm" mb={3}>
                  Địa chỉ đã lưu
                </Text>
                <RadioGroup
                  value={selectedAddressId}
                  onChange={(value) => {
                    setSelectedAddressId(value)
                    if (value === 'new') {
                      setSaveAddress(true)
                      return
                    }
                    const picked = savedAddresses.find((a) => String(a.id) === value)
                    if (picked) {
                      applyAddressToCheckout(picked, addressSetters)
                      setSaveAddress(false)
                    }
                  }}
                >
                  <Stack spacing={2}>
                    {savedAddresses.map((addr) => (
                      <Box
                        key={addr.id}
                        as="label"
                        borderWidth="1px"
                        borderColor={selectedAddressId === String(addr.id) ? 'brand.400' : 'border.muted'}
                        bg={selectedAddressId === String(addr.id) ? 'brand.50' : 'white'}
                        borderRadius="md"
                        px={3}
                        py={2}
                        cursor="pointer"
                      >
                        <Radio value={String(addr.id)} alignSelf="start" mt={1}>
                          <Box ml={2}>
                            <Text fontWeight="700" fontSize="sm">
                              {addr.recipientName} · {addr.recipientPhone}
                              {addr.isDefault ? ' (Mặc định)' : ''}
                            </Text>
                            <Text fontSize="xs" color="text.secondary">
                              {formatAddressLine(addr)}
                            </Text>
                          </Box>
                        </Radio>
                      </Box>
                    ))}
                    <Box
                      as="label"
                      borderWidth="1px"
                      borderColor={selectedAddressId === 'new' ? 'brand.400' : 'border.muted'}
                      bg={selectedAddressId === 'new' ? 'brand.50' : 'white'}
                      borderRadius="md"
                      px={3}
                      py={2}
                      cursor="pointer"
                    >
                      <Radio value="new">Nhập địa chỉ mới</Radio>
                    </Box>
                  </Stack>
                </RadioGroup>
              </Box>
            ) : null}

            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
              <FormControl isRequired>
                <FormLabel>Nguoi nhan</FormLabel>
                <Input value={recipientName} onChange={handleInputChange(setRecipientName)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>So dien thoai</FormLabel>
                <Input value={recipientPhone} onChange={handleInputChange(setRecipientPhone)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input value={recipientEmail} onChange={handleInputChange(setRecipientEmail)} type="email" />
              </FormControl>
              <FormControl>
                <FormLabel>Phuong thuc giao</FormLabel>
                <RadioGroup value={shippingMethod} onChange={setShippingMethod}>
                  <HStack spacing={4}>
                    <Radio value="Express">Express</Radio>
                    <Radio value="Standard">Standard</Radio>
                  </HStack>
                </RadioGroup>
              </FormControl>
              <FormControl isRequired gridColumn={{ md: 'span 2' }}>
                <FormLabel>Dia chi</FormLabel>
                <Input
                  value={shippingAddressLine1}
                  onChange={handleInputChange(setShippingAddressLine1)}
                  placeholder="So nha, ten duong"
                />
              </FormControl>
              <FormControl gridColumn={{ md: 'span 2' }}>
                <FormLabel>Dia chi bo sung</FormLabel>
                <Input
                  value={shippingAddressLine2}
                  onChange={handleInputChange(setShippingAddressLine2)}
                  placeholder="Toa nha, can ho, ghi chu giao hang"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Phuong / Xa</FormLabel>
                <Input value={shippingWard} onChange={handleInputChange(setShippingWard)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Quan / Huyen</FormLabel>
                <Input value={shippingDistrict} onChange={handleInputChange(setShippingDistrict)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Tinh / Thanh pho</FormLabel>
                <Input value={shippingProvince} onChange={handleInputChange(setShippingProvince)} />
              </FormControl>
              <FormControl>
                <FormLabel>Ma buu chinh</FormLabel>
                <Input value={shippingPostalCode} onChange={handleInputChange(setShippingPostalCode)} />
              </FormControl>
              <FormControl gridColumn={{ md: 'span 2' }}>
                <FormLabel>Ghi chú đơn hàng (tuỳ chọn)</FormLabel>
                <Textarea
                  value={customerNote}
                  onChange={handleInputChange(setCustomerNote)}
                  rows={4}
                  placeholder="Vi du: goi truoc khi giao, giao gio hanh chinh..."
                />
              </FormControl>
            </Grid>

            {activeApiMode && (selectedAddressId === 'new' || savedAddresses.length === 0) ? (
              <Checkbox
                mt={3}
                isChecked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
                colorScheme="pink"
              >
                <Text fontSize="sm">
                  {savedAddresses.length === 0
                    ? 'Lưu địa chỉ này vào tài khoản (tự động với đơn đầu tiên)'
                    : 'Lưu địa chỉ này vào sổ địa chỉ'}
                </Text>
              </Checkbox>
            ) : null}

            {formError ? (
              <Text color="red.500" fontSize="sm" mt={3}>
                {formError}
              </Text>
            ) : null}
          </Box>

          <Box
            bg="surface.card"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="xl"
            p={5}
          >
            <Heading size="md">Phương thức thanh toán</Heading>
            <Text fontSize="sm" color="text.secondary" mt={1}>
              Chọn cổng thanh toán để tiếp tục đặt hàng.
            </Text>
            <VStack align="stretch" spacing={3} mt={4}>
              {activePaymentMethods.map((method: PaymentMethodOption) => {
                const isSelected = method.defaultProvider === selectedProvider
                const isZaloPay = isZaloPayPaymentMethod(method)

                return (
                  <Box
                    key={`${method.code}-${method.defaultProvider}`}
                    as="button"
                    type="button"
                    w="full"
                    textAlign="left"
                    borderWidth="2px"
                    borderColor={isSelected ? 'brand.500' : 'border.subtle'}
                    bg={isSelected ? 'brand.50' : 'surface.card'}
                    borderRadius="xl"
                    p={4}
                    cursor="pointer"
                    transition="border-color 0.15s ease, background 0.15s ease"
                    onClick={() => setSelectedProvider(method.defaultProvider)}
                    _hover={{
                      borderColor: isSelected ? 'brand.500' : 'brand.200',
                      bg: isSelected ? 'brand.50' : 'gray.50',
                    }}
                  >
                    <HStack align="start" spacing={3}>
                      {isZaloPay ? <ZaloPayIcon /> : <PayOsIcon />}
                      <Box flex="1">
                        <HStack justify="space-between" align="start" gap={2}>
                          <Text fontWeight="900">{method.label}</Text>
                          {isSelected ? (
                            <CheckCircleIcon color="brand.500" boxSize={5} flexShrink={0} />
                          ) : null}
                        </HStack>
                        <Text fontSize="sm" color="text.secondary" mt={1}>
                          {getCheckoutPaymentDescription(method)}
                        </Text>
                        {method.supportsCheckout ? (
                          <HStack spacing={1} mt={3}>
                            <CheckCircleIcon color="green.500" />
                            <Text fontSize="sm">Sẵn sàng thanh toán</Text>
                          </HStack>
                        ) : null}
                      </Box>
                    </HStack>
                  </Box>
                )
              })}
            </VStack>
          </Box>
        </VStack>

        <Box
          bg="surface.card"
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="xl"
          p={5}
          position={{ xl: 'sticky' }}
          top={{ xl: '112px' }}
        >
            <Heading size="md">Đơn hàng của bạn</Heading>
          <VStack align="stretch" spacing={3} mt={4}>
            {activeItems.map((item) => (
              <Box key={item.cartItemId}>
                <HStack justify="space-between" align="start" gap={3}>
                  <Box>
                    <Text fontWeight="700" noOfLines={2}>
                      {item.productName}
                    </Text>
                    <Text fontSize="sm" color="text.secondary">
                      {item.color} • {item.size} • x{item.quantity}
                    </Text>
                  </Box>
                  <Text fontWeight="800">
                    {formatProductPrice(item.unitPrice * item.quantity)}
                  </Text>
                </HStack>
              </Box>
            ))}
            <Divider />
            <HStack justify="space-between">
              <Text color="text.secondary">Tạm tính</Text>
              <Text fontWeight="700">{formatProductPrice(subtotal)}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="text.secondary">Phí giao hàng</Text>
              <Text fontWeight="700">{formatProductPrice(shippingFee)}</Text>
            </HStack>
            {activeApiMode && shopPromotions.length > 0 ? (
              <Box borderWidth="1px" borderColor="border.subtle" borderRadius="lg" p={3}>
                <Text fontSize="sm" fontWeight="700" mb={2}>
                  Khuyến mãi
                </Text>
                {promotionNotice ? (
                  <Text fontSize="xs" color="orange.600" mb={2}>
                    {promotionNotice}
                  </Text>
                ) : null}
                <RadioGroup
                  value={selectedPromotionCode ?? 'none'}
                  onChange={(value) => {
                    const code = value === 'none' ? null : value
                    if (code) {
                      const promo = shopPromotions.find((p) => p.code === code)
                      if (promo && !isPromotionSelectable(subtotal, promo)) {
                        const hint = promotionDisabledHint(subtotal, promo)
                        setFormError(
                          hint
                            ? `${hint}. Tạm tính: ${formatCheckoutSubtotal(subtotal)}.`
                            : 'Không thể áp dụng mã khuyến mãi này.',
                        )
                        return
                      }
                    }
                    setFormError('')
                    setSelectedPromotionCode(code)
                    persistCheckoutVoucher(code)
                    void loadRemotePreview(true, code)
                  }}
                >
                  <Stack spacing={2}>
                    <Radio value="none" size="sm">
                      Không dùng khuyến mãi
                    </Radio>
                    {shopPromotions.map((p) => {
                      const selectable = isPromotionSelectable(subtotal, p)
                      const disabledHint = promotionDisabledHint(subtotal, p)
                      return (
                        <Box key={p.code}>
                          <Radio value={p.code} size="sm" isDisabled={!selectable}>
                            <Text as="span" fontSize="sm" opacity={selectable ? 1 : 0.55}>
                              <Text as="span" fontWeight="700">
                                {p.summaryTitle || p.name}
                              </Text>
                              {p.chipLabel ? (
                                <Text as="span" color="text.secondary">
                                  {' '}
                                  — {p.chipLabel}
                                </Text>
                              ) : null}
                              {p.alreadyUsed ? (
                                <Text as="span" color="gray.500" fontWeight="600">
                                  {' '}
                                  (Đã dùng)
                                </Text>
                              ) : null}
                            </Text>
                          </Radio>
                          {disabledHint ? (
                            <Text
                              fontSize="xs"
                              color={p.alreadyUsed ? 'gray.500' : 'orange.600'}
                              ml={6}
                              mt={0.5}
                            >
                              {disabledHint}
                            </Text>
                          ) : null}
                        </Box>
                      )
                    })}
                  </Stack>
                </RadioGroup>
              </Box>
            ) : null}
            <HStack justify="space-between">
              <Text color="text.secondary">Giảm giá</Text>
              <Text fontWeight="700" color={discountAmount > 0 ? 'green.600' : undefined}>
                -{formatProductPrice(discountAmount)}
              </Text>
            </HStack>
            <Divider />
            <HStack justify="space-between">
              <Text fontSize="lg" fontWeight="900">
                Tổng cộng
              </Text>
              <Text fontSize="xl" fontWeight="900" color="brand.700">
                {formatProductPrice(totalAmount)}
              </Text>
            </HStack>
            <Text fontSize="sm" color="text.secondary">
              Sau khi xác nhận, bạn sẽ được chuyển sang bước thanh toán để hoàn tất đơn hàng.
            </Text>
            <Button
              colorScheme="pink"
              bg="brand.600"
              _hover={{ bg: 'brand.700' }}
              size="lg"
              rightIcon={<ArrowForwardIcon />}
              onClick={handlePlaceOrder}
            >
              Đặt hàng và thanh toán
            </Button>
          </VStack>
        </Box>
      </Grid>
    </VStack>
  )
}
