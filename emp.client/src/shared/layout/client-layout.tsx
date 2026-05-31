import { ChevronDownIcon, HamburgerIcon, SearchIcon } from '@chakra-ui/icons'
import { FiShoppingCart } from 'react-icons/fi'
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Grid,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { usePublicContentSync } from '../../features/commerce/hooks/use-public-content-sync'
import { AuthModalProvider, useAuthModal } from '../../features/auth/context/auth-modal-context'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../app/router/route-names'
import { commerceApi } from '../../features/commerce/services/commerce.api'
import { useCart } from '../../features/cart/store/cart-store'
import { NotificationBell } from '../../features/notifications/components/notification-bell'
import { ChatbotWidget } from '../../features/chatbot/components/chatbot-widget'
import { PolicyTextModal } from '../../features/settings/components/policy-text-modal'
import { useShopSettings } from '../../features/settings/context/shop-settings-context'
import { BrandLogo } from '../components/brand-logo'

const HEADER_CATEGORY_LINKS: { label: string; slug: string }[] = [
  { label: 'Giày chạy bộ', slug: 'running' },
  { label: 'Sneaker & lifestyle', slug: 'lifestyle' },
  { label: 'Giày bóng rổ', slug: 'basketball' },
  { label: 'Giày training – gym', slug: 'training' },
  { label: 'Sandal & dép', slug: 'sandals' },
  { label: 'Boots – cổ cao', slug: 'boots' },
  { label: 'Giày leo núi – outdoor', slug: 'outdoor' },
  { label: 'Phụ kiện giày dép', slug: 'shoe-accessories' },
]

const MotionBox = motion(Box)

const ClientLayoutShell = () => {
  usePublicContentSync()
  const { settings, loaded: settingsLoaded } = useShopSettings()
  const navigate = useNavigate()
  const location = useLocation()

  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [policyModal, setPolicyModal] = useState<'return' | 'shipping' | null>(null)
  const { currentUser, openAuthModal, logout, serverCartQty } = useAuthModal()
  const { totalQty: localCartQty } = useCart()
  const cartBadgeQty = commerceApi.hasServerToken() ? serverCartQty : localCartQty

  useEffect(() => {
    if (location.pathname !== ROUTES.CATEGORIES) return
    const params = new URLSearchParams(location.search)
    setSearchText(params.get('q') ?? '')
  }, [location.pathname, location.search])

  const submitSearch = () => {
    const keyword = searchText.trim()
    if (!keyword) {
      navigate(ROUTES.CATEGORIES)
      return
    }
    navigate(`${ROUTES.CATEGORIES}?q=${encodeURIComponent(keyword)}`)
  }

  const hotlineLabel = settings.supportPhone?.trim()
    ? `Hotline: ${settings.supportPhone}`
    : 'Hotline: Liên hệ shop'
  const emailLabel = settings.supportEmail?.trim()
    ? `Email: ${settings.supportEmail}`
    : 'Email: Liên hệ shop'

  return (
    <Box minH="100vh" bg="bg.canvas">
      <Box position="sticky" top="0" zIndex={10}>
        <Box bg="surface.topbar" borderBottomWidth="1px" borderColor="border.subtle">
          <Container maxW="7xl" py={3}>
            <Flex gap={3} align="center">
              <HStack spacing={3} minW={{ base: 'auto', md: '260px' }}>
                <Link to={ROUTES.HOME}>
                  <Flex align="center" justify="center" h={{ base: '32px', md: '38px' }}>
                    <BrandLogo
                      h="full"
                      maxH={{ base: '32px', md: '38px' }}
                      maxW={{ base: '125px', md: '155px' }}
                      w="auto"
                      mx="auto"
                      display="block"
                    />
                  </Flex>
                </Link>

                <Box
                  position="relative"
                  display={{ base: 'none', lg: 'inline-block' }}
                  onMouseEnter={() => setIsCategoryOpen(true)}
                  onMouseLeave={() => setIsCategoryOpen(false)}
                >
                  <Button
                    leftIcon={<HamburgerIcon />}
                    rightIcon={<ChevronDownIcon />}
                    size="sm"
                    variant="outline"
                    borderColor="border.muted"
                  >
                    Danh mục
                  </Button>

                  <AnimatePresence>
                    {isCategoryOpen && (
                      <MotionBox
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        position="absolute"
                        top="calc(100% + 10px)"
                        left="0"
                        w="320px"
                        bg="white"
                        borderWidth="1px"
                        borderColor="border.subtle"
                        borderRadius="xl"
                        boxShadow="lg"
                        overflow="hidden"
                        zIndex={20}
                      >
                        <Box px={4} py={3} borderBottomWidth="1px" borderColor="border.subtle">
                          <Text fontWeight="900">Danh mục</Text>
                          <Text fontSize="xs" color="text.secondary">
                            Giày dép & phụ kiện
                          </Text>
                        </Box>
                        <Box maxH="360px" overflowY="auto" py={2}>
                          {HEADER_CATEGORY_LINKS.map((item) => (
                            <Link
                              key={item.slug}
                              to={`${ROUTES.CATEGORIES}?parent=${encodeURIComponent(item.slug)}`}
                              onClick={() => setIsCategoryOpen(false)}
                            >
                              <HStack
                                px={4}
                                py={2}
                                className="cursor-pointer hover:bg-gray-50"
                                justify="space-between"
                              >
                                <Text fontSize="sm" fontWeight="600">
                                  {item.label}
                                </Text>
                                <ChevronDownIcon color="gray.400" transform="rotate(-90deg)" />
                              </HStack>
                            </Link>
                          ))}
                        </Box>
                      </MotionBox>
                    )}
                  </AnimatePresence>
                </Box>
              </HStack>

              <Box
                flex="1"
                display={{ base: 'none', md: 'block' }}
                as="form"
                onSubmit={(event) => {
                  event.preventDefault()
                  submitSearch()
                }}
              >
                <InputGroup>
                  <Input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        submitSearch()
                      }
                    }}
                    placeholder="Bạn tìm gì hôm nay?"
                    bg="white"
                    borderColor="border.muted"
                    pr="110px"
                    _placeholder={{ color: 'gray.500' }}
                    aria-label="Tìm kiếm sản phẩm"
                  />
                  <InputRightElement
                    width="110px"
                    h="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-end"
                    pr="4px"
                    zIndex={1}
                  >
                    <Button
                      type="button"
                      color="white"
                      bg="brand.600"
                      leftIcon={<SearchIcon />}
                      rounded="lg"
                      size="sm"
                      _hover={{ bg: 'brand.700' }}
                      onClick={() => submitSearch()}
                    >
                      Tìm kiếm
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </Box>

              <HStack spacing={1}>
                {currentUser ? (
                  <Menu>
                    <MenuButton as={Button} size="sm" variant="ghost" rightIcon={<ChevronDownIcon />}>
                      {currentUser.fullName ?? currentUser.email}
                    </MenuButton>
                    <MenuList>
                      <MenuItem isDisabled>{currentUser.email}</MenuItem>
                      <MenuItem as={Link} to={ROUTES.ACCOUNT_PROFILE}>
                        Thông tin cá nhân
                      </MenuItem>
                      <MenuItem onClick={() => void logout()}>Đăng xuất</MenuItem>
                    </MenuList>
                  </Menu>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => openAuthModal()}>
                    Tài khoản
                  </Button>
                )}
                <Button
                  as={Link}
                  to={ROUTES.CART}
                  size="sm"
                  variant="ghost"
                  leftIcon={<Icon as={FiShoppingCart} boxSize={4} />}
                >
                  Giỏ hàng
                  {cartBadgeQty > 0 && (
                    <Badge ml={2} colorScheme="red" borderRadius="full">
                      {cartBadgeQty}
                    </Badge>
                  )}
                </Button>
                <NotificationBell />

                <IconButton
                  aria-label="Open menu"
                  icon={<HamburgerIcon />}
                  variant="outline"
                  borderColor="border.muted"
                  size="sm"
                  display={{ base: 'inline-flex', md: 'none' }}
                />
              </HStack>
            </Flex>
          </Container>
        </Box>
      </Box>

      <Container maxW="7xl" py={6}>
        <VStack align="stretch" spacing={6}>
          <Outlet />
        </VStack>
      </Container>

      <Box bg="white" borderTopWidth="1px" borderColor="border.subtle" mt={8}>
        <Container maxW="7xl" py={10}>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={8}>
            <Stack spacing={2}>
              <Text fontWeight="900">Hỗ trợ khách hàng</Text>
              <Text fontSize="sm" color="text.secondary">
                {hotlineLabel}
              </Text>
              <Text fontSize="sm" color="text.secondary" className="cursor-pointer hover:text-gray-900">
                Các câu hỏi thường gặp
              </Text>
              <Text fontSize="sm" color="text.secondary" className="cursor-pointer hover:text-gray-900">
                Gửi yêu cầu hỗ trợ
              </Text>
              <Text
                as="button"
                type="button"
                fontSize="sm"
                color="text.secondary"
                textAlign="left"
                className="cursor-pointer hover:text-gray-900"
                onClick={() => setPolicyModal('return')}
              >
                Chính sách đổi trả
              </Text>
              <Text
                as="button"
                type="button"
                fontSize="sm"
                color="text.secondary"
                textAlign="left"
                className="cursor-pointer hover:text-gray-900"
                onClick={() => setPolicyModal('shipping')}
              >
                Chính sách vận chuyển
              </Text>
            </Stack>

            <Stack spacing={2}>
              <Text fontWeight="900">Về {settings.shopName}</Text>
              <Text fontSize="sm" color="text.secondary" className="cursor-pointer hover:text-gray-900">Giới thiệu</Text>
              <Text fontSize="sm" color="text.secondary" className="cursor-pointer hover:text-gray-900">Tuyển dụng</Text>
              <Text fontSize="sm" color="text.secondary" className="cursor-pointer hover:text-gray-900">Chính sách bảo mật</Text>
              <Text fontSize="sm" color="text.secondary" className="cursor-pointer hover:text-gray-900">Điều khoản sử dụng</Text>
            </Stack>

            <Stack spacing={2}>
              <Text fontWeight="900">Hợp tác & liên kết</Text>
              <Text fontSize="sm" color="text.secondary" className="cursor-pointer hover:text-gray-900">Bán hàng cùng DTT</Text>
              <Text fontSize="sm" color="text.secondary" className="cursor-pointer hover:text-gray-900">Tiếp thị liên kết</Text>
              <Text fontSize="sm" color="text.secondary" className="cursor-pointer hover:text-gray-900">Doanh nghiệp</Text>
            </Stack>

            <Stack spacing={2}>
              <Text fontWeight="900">Kết nối với chúng tôi</Text>
              <Text fontSize="sm" color="text.secondary">
                {emailLabel}
              </Text>
              <Text fontSize="sm" color="text.secondary">Địa chỉ: Việt Nam</Text>
              <HStack spacing={2} pt={1}>
                <Badge colorScheme="facebook" borderRadius="md" px={3} py={1}>Facebook</Badge>
                <Badge colorScheme="twitter" borderRadius="md" px={3} py={1}>Twitter</Badge>
                <Badge colorScheme="purple" borderRadius="md" px={3} py={1}>YouTube</Badge>
              </HStack>
            </Stack>
          </Grid>

          <Box mt={10} pt={6} borderTopWidth="1px" borderColor="border.subtle">
            <HStack justify="space-between" flexWrap="wrap" spacing={3}>
              <Text fontSize="sm" color="text.secondary">
                © {new Date().getFullYear()} {settings.shopName}. Giày dép chính hãng.
              </Text>
            </HStack>
          </Box>
        </Container>
      </Box>

      {settingsLoaded && settings.chatbotEnabled ? <ChatbotWidget /> : null}

      <PolicyTextModal
        isOpen={policyModal === 'return'}
        onClose={() => setPolicyModal(null)}
        title="Chính sách đổi trả"
        body={settings.returnPolicyText}
      />
      <PolicyTextModal
        isOpen={policyModal === 'shipping'}
        onClose={() => setPolicyModal(null)}
        title="Chính sách vận chuyển"
        body={settings.shippingPolicyText}
      />
    </Box>
  )
}

export const ClientLayout = () => (
  <AuthModalProvider>
    <ClientLayoutShell />
  </AuthModalProvider>
)
