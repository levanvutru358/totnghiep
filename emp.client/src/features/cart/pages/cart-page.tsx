import {
  AddIcon,
  ArrowForwardIcon,
  DeleteIcon,
  MinusIcon,
  RepeatIcon,
} from '@chakra-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Grid,
  Heading,
  HStack,
  IconButton,
  Image,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { buildProductDetailHref } from '../../products/utils/product-url'
import { LoginRequiredPrompt } from '../../auth/components/login-required-prompt'
import { formatProductPrice } from '../../products/lib/product-price'
import { notifyServerCartUpdated } from '../../commerce/lib/cart-events'
import { formatCartValidationIssues } from '../../commerce/lib/cart-validate'
import { mergeLocalGuestCart } from '../../commerce/lib/merge-guest-cart'
import { commerceApi, type CommerceCartResponse } from '../../commerce/services/commerce.api'
import { useCart, type CartItem as LocalCartItem } from '../store/cart-store'

const formatLocalCurrency = (value: number) => `$${value.toFixed(2)}`

const getLocalLineTotal = (item: LocalCartItem) => item.price * item.quantity

export const CartPage = () => {
  const navigate = useNavigate()
  const {
    items: localItems,
    subtotal: localSubtotal,
    totalQty: localTotalQty,
    updateQuantity,
    removeItem,
    clear,
  } = useCart()
  const [serverEnabled, setServerEnabled] = useState(() => commerceApi.hasServerToken())
  const [serverCart, setServerCart] = useState<CommerceCartResponse | null>(null)
  const [serverLoading, setServerLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const [syncingLocal, setSyncingLocal] = useState(false)
  const [validatingCheckout, setValidatingCheckout] = useState(false)

  const selectedServerItems = useMemo(
    () => serverCart?.items.filter((item) => item.selected) ?? [],
    [serverCart],
  )
  const serverItems = serverCart?.items ?? []
  const serverSummary = serverCart?.summary
  const allServerItemsSelected =
    serverItems.length > 0 && selectedServerItems.length === serverItems.length
  const hasPartialServerSelection =
    selectedServerItems.length > 0 && selectedServerItems.length < serverItems.length

  const loadServerCart = useCallback(async (forceServerEnabled = commerceApi.hasServerToken()) => {
    if (!forceServerEnabled) {
      setServerCart(null)
      setServerError('')
      return
    }

    try {
      setServerLoading(true)
      setServerError('')
      const cart = await commerceApi.getCart()
      setServerCart(cart)
      notifyServerCartUpdated(cart)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Không thể tải giỏ hàng. Vui lòng thử lại.')
    } finally {
      setServerLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadServerCart(serverEnabled)
  }, [loadServerCart, serverEnabled])

  const applyServerCart = (cart: CommerceCartResponse) => {
    setServerCart(cart)
    notifyServerCartUpdated(cart)
  }

  const runServerMutation = async (
    id: string,
    action: () => Promise<CommerceCartResponse>,
  ) => {
    try {
      setMutatingId(id)
      setServerError('')
      const cart = await action()
      applyServerCart(cart)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Cập nhật giỏ hàng thất bại.')
      await loadServerCart(true)
    } finally {
      setMutatingId(null)
    }
  }

  const syncLocalCartToServer = async (clearAfterSuccess = true) => {
    try {
      setSyncingLocal(true)
      setServerError('')

      const result = await mergeLocalGuestCart({ clearLocal: clearAfterSuccess })

      if (result.skipped.length > 0) {
        setServerError(`Một số sản phẩm chưa gộp được vào giỏ: ${result.skipped.join('; ')}`)
      }

      applyServerCart(result.cart)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Gộp giỏ hàng thất bại.')
      await loadServerCart(true)
    } finally {
      setSyncingLocal(false)
    }
  }

  const handleServerCheckout = async () => {
    if (selectedServerItems.length === 0) {
      setServerError('Vui lòng chọn ít nhất một sản phẩm để thanh toán.')
      return
    }

    const itemIds = selectedServerItems.map((item) => item.cartItemId)

    try {
      setValidatingCheckout(true)
      setServerError('')

      const validation = await commerceApi.validateCart({ itemIds })

      applyServerCart(validation.cart)

      if (!validation.summary.checkoutReady) {
        setServerError(formatCartValidationIssues(validation.items))
        return
      }

      const query = new URLSearchParams({
        mode: 'api',
        itemIds: itemIds.join(','),
      })

      navigate(`${ROUTES.CHECKOUT}?${query.toString()}`)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Không thể kiểm tra giỏ hàng. Vui lòng thử lại.')
    } finally {
      setValidatingCheckout(false)
    }
  }

  const handleServerLoginSuccess = async () => {
    const token = localStorage.getItem('access_token')
    if (token && !localStorage.getItem('client_access_token')) {
      localStorage.setItem('client_access_token', token)
    }
    setServerEnabled(true)
    await syncLocalCartToServer(true)
  }

  return (
    <VStack align="stretch" spacing={5}>
      {!serverEnabled ? (
        <LoginRequiredPrompt
          description="Đăng nhập để đồng bộ giỏ hàng và thanh toán trên tài khoản của bạn."
          onSuccess={handleServerLoginSuccess}
        />
      ) : null}

      {serverEnabled && localItems.length > 0 ? (
        <Box bg="orange.50" borderWidth="1px" borderColor="orange.100" borderRadius="xl" p={4}>
          <HStack justify="space-between" align="start" gap={3} flexWrap="wrap">
            <Box>
              <Text fontWeight="900">Bạn có {localItems.length} sản phẩm trong giỏ tạm</Text>
              <Text fontSize="sm" color="text.secondary" mt={1}>
                Đồng bộ vào tài khoản để thanh toán và theo dõi đơn hàng dễ dàng hơn.
              </Text>
            </Box>
            <Button
              leftIcon={<RepeatIcon />}
              colorScheme="orange"
              onClick={() => void syncLocalCartToServer(true)}
              isLoading={syncingLocal}
            >
              Đồng bộ giỏ hàng
            </Button>
          </HStack>
        </Box>
      ) : null}

      {serverEnabled ? (
        <Grid templateColumns={{ base: '1fr', xl: '1fr 360px' }} gap={5} alignItems="start">
          <VStack align="stretch" spacing={4}>
            {serverLoading && !serverCart ? (
              <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={6}>
                <Text>Đang tải giỏ hàng...</Text>
              </Box>
            ) : null}

            {serverError ? (
              <Box bg="orange.50" borderWidth="1px" borderColor="orange.100" borderRadius="xl" p={5}>
                <Heading size="sm">Chưa tải được giỏ hàng</Heading>
                <Text fontSize="sm" color="text.secondary" mt={1} whiteSpace="pre-wrap">
                  {serverError}
                </Text>
              </Box>
            ) : null}

            {!serverLoading && !serverError && serverItems.length === 0 ? (
              <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={8}>
                <VStack spacing={3} textAlign="center">
                  <Heading size="md">Giỏ hàng đang trống</Heading>
                  <Text color="text.secondary" maxW="560px">
                    Hãy chọn giày yêu thích và thêm vào giỏ. Nếu bạn vừa mua khi chưa đăng nhập, dùng nút đồng bộ phía trên.
                  </Text>
                  <Button as={Link} to={ROUTES.CATEGORIES} colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }}>
                    Mua sắm ngay
                  </Button>
                </VStack>
              </Box>
            ) : null}

            {serverItems.length > 0 ? (
              <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={5}>
                <HStack justify="space-between" mb={4} flexWrap="wrap" gap={3}>
                  <Checkbox
                    isChecked={allServerItemsSelected}
                    isIndeterminate={hasPartialServerSelection}
                    onChange={(event) =>
                      void runServerMutation('select-all', () =>
                        commerceApi.selectAllCartItems(event.target.checked),
                      )
                    }
                  >
                    Chọn tất cả ({serverItems.length})
                  </Checkbox>
                  <HStack>
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="red.200"
                      color="red.500"
                      onClick={() =>
                        void runServerMutation('clear-selected', () =>
                          commerceApi.clearCart({
                            itemIds: selectedServerItems.map((item) => item.cartItemId),
                          }),
                        )
                      }
                      isDisabled={selectedServerItems.length === 0}
                      isLoading={mutatingId === 'clear-selected'}
                    >
                      Xóa đã chọn
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="border.muted"
                      onClick={() => void runServerMutation('clear-all', () => commerceApi.clearCart())}
                      isLoading={mutatingId === 'clear-all'}
                    >
                      Xóa tất cả
                    </Button>
                  </HStack>
                </HStack>

                <VStack align="stretch" spacing={4}>
                  {serverItems.map((item) => {
                    const productHref = buildProductDetailHref(
                      item.productId,
                      item.productName,
                      item.productSlug,
                    )
                    return (
                    <Box key={item.cartItemId} borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
                      <Grid templateColumns={{ base: '1fr', md: '36px 86px 1fr auto' }} gap={4} alignItems="center">
                        <Checkbox
                          isChecked={item.selected}
                          onChange={(event) =>
                            void runServerMutation(item.cartItemId, () =>
                              commerceApi.updateCartItem(item.cartItemId, {
                                selected: event.target.checked,
                              }),
                            )
                          }
                        />
                        <Box
                          as={Link}
                          to={productHref}
                          flexShrink={0}
                          _hover={{ opacity: 0.85 }}
                          transition="opacity 0.15s"
                        >
                          <Image
                            src={item.productImage}
                            alt={item.productName}
                            boxSize="86px"
                            objectFit="cover"
                            borderRadius="lg"
                            bg="gray.50"
                          />
                        </Box>
                        <Box>
                          <Text
                            as={Link}
                            to={productHref}
                            fontWeight="900"
                            noOfLines={2}
                            display="block"
                            _hover={{ color: 'brand.600', textDecoration: 'underline' }}
                          >
                            {item.productName}
                          </Text>
                          <Text fontSize="sm" color="text.secondary" mt={1}>
                            {item.productBrand} - {item.productCategory}
                          </Text>
                          <Text fontSize="sm" color="text.secondary">
                            SKU {item.sku} - {item.color} - {item.size}
                          </Text>
                          <HStack mt={3} spacing={2}>
                            <IconButton
                              aria-label="Giam so luong"
                              icon={<MinusIcon />}
                              size="sm"
                              variant="outline"
                              isDisabled={item.quantity <= 1}
                              onClick={() =>
                                void runServerMutation(item.cartItemId, () =>
                                  commerceApi.updateCartItem(item.cartItemId, {
                                    quantity: item.quantity - 1,
                                  }),
                                )
                              }
                            />
                            <Text minW="34px" textAlign="center" fontWeight="900">
                              {item.quantity}
                            </Text>
                            <IconButton
                              aria-label="Tang so luong"
                              icon={<AddIcon />}
                              size="sm"
                              variant="outline"
                              isDisabled={item.quantity >= item.stock}
                              onClick={() =>
                                void runServerMutation(item.cartItemId, () =>
                                  commerceApi.updateCartItem(item.cartItemId, {
                                    quantity: item.quantity + 1,
                                  }),
                                )
                              }
                            />
                            <Text fontSize="sm" color="text.secondary">
                              Còn {item.stock} đôi
                            </Text>
                          </HStack>
                        </Box>
                        <VStack align={{ base: 'stretch', md: 'end' }} spacing={2}>
                          <Text fontWeight="900" color="brand.700">
                            {formatProductPrice(item.unitPrice * item.quantity)}
                          </Text>
                          <Text fontSize="sm" color="text.secondary">
                            {formatProductPrice(item.unitPrice)} / sp
                          </Text>
                          <IconButton
                            aria-label="Xoa san pham"
                            icon={<DeleteIcon />}
                            variant="ghost"
                            colorScheme="red"
                            onClick={() =>
                              void runServerMutation(item.cartItemId, () =>
                                commerceApi.removeCartItem(item.cartItemId),
                              )
                            }
                            isLoading={mutatingId === item.cartItemId}
                          />
                        </VStack>
                      </Grid>
                    </Box>
                    )
                  })}
                </VStack>
              </Box>
            ) : null}
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
            <Heading size="md">Tóm tắt đơn hàng</Heading>
            <VStack align="stretch" spacing={3} mt={4}>
              <HStack justify="space-between">
                <Text color="text.secondary">Số mặt hàng</Text>
                <Text fontWeight="800">{serverSummary?.itemCount ?? 0}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="text.secondary">Tổng số lượng</Text>
                <Text fontWeight="800">{serverSummary?.totalQuantity ?? 0}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="text.secondary">Đã chọn</Text>
                <Text fontWeight="800">{serverSummary?.selectedQuantity ?? 0}</Text>
              </HStack>
              <Divider />
              <HStack justify="space-between">
                <Text color="text.secondary">Tạm tính (đã chọn)</Text>
                <Text fontWeight="900" color="brand.700">
                  {formatProductPrice(serverSummary?.selectedSubtotal ?? 0)}
                </Text>
              </HStack>
              <Text fontSize="sm" color="text.secondary">
                Chúng tôi sẽ kiểm tra tồn kho và size trước khi chuyển sang bước thanh toán.
              </Text>
              <Button
                colorScheme="pink"
                bg="brand.600"
                _hover={{ bg: 'brand.700' }}
                size="lg"
                rightIcon={<ArrowForwardIcon />}
                onClick={() => void handleServerCheckout()}
                isDisabled={selectedServerItems.length === 0}
                isLoading={validatingCheckout}
                loadingText="Đang kiểm tra..."
              >
                Tiếp tục thanh toán
              </Button>
            </VStack>
          </Box>
        </Grid>
      ) : (
        <Grid templateColumns={{ base: '1fr', xl: '1fr 340px' }} gap={5} alignItems="start">
          <VStack align="stretch" spacing={4}>
            <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={5}>
              <Heading size="lg">Giỏ hàng tạm</Heading>
              <Text color="text.secondary" mt={1}>
                Giỏ đang lưu trên thiết bị này. Đăng nhập để đồng bộ và thanh toán an toàn.
              </Text>
            </Box>

            {localItems.length === 0 ? (
              <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={8}>
                <VStack spacing={3}>
                  <Text fontWeight="800">Giỏ hàng của bạn đang trống</Text>
                  <Button as={Link} to={ROUTES.CATEGORIES} colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }}>
                    Mua sắm ngay
                  </Button>
                </VStack>
              </Box>
            ) : (
              <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={5}>
                <HStack justify="space-between" mb={4}>
                  <Text fontWeight="900">{localItems.length} sản phẩm trong giỏ tạm</Text>
                  <Button variant="outline" size="sm" onClick={clear}>
                    Xoa tat ca
                  </Button>
                </HStack>
                <VStack align="stretch" spacing={4}>
                  {localItems.map((item) => {
                    const productHref = buildProductDetailHref(item.productId, item.name)
                    return (
                    <Box key={item.id} borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
                      <Grid templateColumns={{ base: '1fr', md: '86px 1fr auto' }} gap={4} alignItems="center">
                        <Box
                          as={Link}
                          to={productHref}
                          flexShrink={0}
                          _hover={{ opacity: 0.85 }}
                          transition="opacity 0.15s"
                        >
                          <Image
                            src={item.image}
                            alt={item.name}
                            boxSize="86px"
                            borderRadius="lg"
                            objectFit="cover"
                          />
                        </Box>
                        <Box>
                          <Text
                            as={Link}
                            to={productHref}
                            fontWeight="900"
                            noOfLines={2}
                            display="block"
                            _hover={{ color: 'brand.600', textDecoration: 'underline' }}
                          >
                            {item.name}
                          </Text>
                          <Text fontSize="sm" color="text.secondary">
                            SKU {item.sku} - {item.color} - {item.size}
                          </Text>
                          <HStack mt={3} spacing={2}>
                            <IconButton
                              aria-label="Giam so luong"
                              icon={<MinusIcon />}
                              size="sm"
                              variant="outline"
                              isDisabled={item.quantity <= 1}
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            />
                            <Text minW="34px" textAlign="center" fontWeight="900">
                              {item.quantity}
                            </Text>
                            <IconButton
                              aria-label="Tang so luong"
                              icon={<AddIcon />}
                              size="sm"
                              variant="outline"
                              isDisabled={item.quantity >= item.stock}
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            />
                          </HStack>
                        </Box>
                        <VStack align={{ base: 'stretch', md: 'end' }} spacing={2}>
                          <Text fontWeight="900" color="brand.700">
                            {formatLocalCurrency(getLocalLineTotal(item))}
                          </Text>
                          <IconButton
                            aria-label="Xoa san pham"
                            icon={<DeleteIcon />}
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => removeItem(item.id)}
                          />
                        </VStack>
                      </Grid>
                    </Box>
                    )
                  })}
                </VStack>
              </Box>
            )}
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
            <Heading size="md">Thanh toán</Heading>
            <VStack align="stretch" spacing={3} mt={4}>
              <HStack justify="space-between">
                <Text color="text.secondary">Tổng số lượng</Text>
                <Text fontWeight="800">{localTotalQty}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="text.secondary">Tạm tính</Text>
                <Text fontWeight="900" color="brand.700">
                  {formatLocalCurrency(localSubtotal)}
                </Text>
              </HStack>
              <Text fontSize="sm" color="text.secondary">
                Đăng nhập để đồng bộ giỏ và hoàn tất đặt hàng.
              </Text>
              <Button colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }} isDisabled>
                Đăng nhập để thanh toán
              </Button>
            </VStack>
          </Box>
        </Grid>
      )}
    </VStack>
  )
}
