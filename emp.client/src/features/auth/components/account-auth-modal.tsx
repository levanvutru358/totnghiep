import { CloseIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { clientAuthApi, type ClientMe } from '../services/client-auth.api'
import { EmailAuthPanel } from './email-auth-panel'
import { BrandLogo } from '../../../shared/components/brand-logo'
import { useShopSettings } from '../../settings/context/shop-settings-context'

export interface AccountAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess?: (user: ClientMe) => void | Promise<void>
}

export const AccountAuthModal = ({ isOpen, onClose, onLoginSuccess }: AccountAuthModalProps) => {
  const { settings } = useShopSettings()
  const registrationEnabled = settings.registrationEnabled
  const [emailMode, setEmailMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  useEffect(() => {
    if (!registrationEnabled && emailMode === 'register') {
      setEmailMode('login')
    }
  }, [registrationEnabled, emailMode])

  const handleEmailLogin = async () => {
    setEmailError(null)
    if (!email.trim() || !password.trim()) {
      setEmailError('Vui lòng nhập email và mật khẩu')
      return
    }
    try {
      setEmailLoading(true)
      const loginRes = await clientAuthApi.login(email.trim(), password)
      localStorage.setItem('access_token', loginRes.accessToken)
      localStorage.setItem('client_access_token', loginRes.accessToken)
      const me = await clientAuthApi.me(loginRes.accessToken)
      localStorage.setItem('client_user', JSON.stringify(me))
      await onLoginSuccess?.(me)
      setEmail('')
      setPassword('')
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleEmailRegister = async () => {
    setEmailError(null)
    if (!email.trim() || !password.trim()) {
      setEmailError('Vui lòng nhập đầy đủ thông tin')
      return
    }
    if (password.length < 8) {
      setEmailError('Mật khẩu tối thiểu 8 ký tự')
      return
    }
    if (password !== confirmPassword) {
      setEmailError('Mật khẩu xác nhận không khớp')
      return
    }
    try {
      setEmailLoading(true)
      await clientAuthApi.register(email.trim(), password, fullName.trim() || undefined)
      setEmailMode('login')
      setPassword('')
      setConfirmPassword('')
      setEmailError('Đăng ký thành công, vui lòng đăng nhập.')
    } catch {
      setEmailError('Đăng ký thất bại. Email có thể đã tồn tại.')
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: '3xl' }} isCentered>
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(2px)" />
      <ModalContent borderRadius={{ base: '0', md: '2xl' }} overflow="hidden" maxW={{ base: 'full', md: '920px' }}>
        <ModalBody p={0}>
          <Box position="absolute" top="10px" right="10px" zIndex={2}>
            <IconButton aria-label="Close" icon={<CloseIcon />} variant="ghost" onClick={onClose} />
          </Box>

          <HStack spacing={0} align="stretch" minH={{ base: '100vh', md: '540px' }}>
            <Box flex="1" p={{ base: 6, md: 8 }} bg="white">
              <VStack align="stretch" spacing={4}>
                <Box>
                  <HStack justify="space-between" align="center" mb={2}>
                    <Text fontSize="2xl" fontWeight="900">
                      {emailMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                    </Text>
                    <BrandLogo h="28px" maxW="100px" />
                  </HStack>
                  <Text color="text.secondary" fontSize="sm">
                    {emailMode === 'login'
                      ? 'Đăng nhập để theo dõi đơn hàng và nhận ưu đãi riêng.'
                      : 'Tạo tài khoản để mua sắm nhanh hơn và lưu thông tin giao hàng.'}
                  </Text>
                </Box>

                <HStack spacing={2}>
                  <Button
                    size="sm"
                    variant={emailMode === 'login' ? 'solid' : 'ghost'}
                    bg={emailMode === 'login' ? 'red.600' : 'transparent'}
                    color={emailMode === 'login' ? 'white' : 'gray.700'}
                    _hover={{ bg: emailMode === 'login' ? 'red.700' : 'gray.100' }}
                    onClick={() => {
                      setEmailMode('login')
                      setEmailError(null)
                    }}
                  >
                    Đăng nhập
                  </Button>
                  {registrationEnabled ? (
                    <Button
                      size="sm"
                      variant={emailMode === 'register' ? 'solid' : 'ghost'}
                      bg={emailMode === 'register' ? 'red.600' : 'transparent'}
                      color={emailMode === 'register' ? 'white' : 'gray.700'}
                      _hover={{ bg: emailMode === 'register' ? 'red.700' : 'gray.100' }}
                      onClick={() => {
                        setEmailMode('register')
                        setEmailError(null)
                      }}
                    >
                      Đăng ký
                    </Button>
                  ) : null}
                </HStack>

                <EmailAuthPanel
                  mode={emailMode}
                  fullName={fullName}
                  onFullNameChange={setFullName}
                  email={email}
                  onEmailChange={setEmail}
                  password={password}
                  onPasswordChange={setPassword}
                  confirmPassword={confirmPassword}
                  onConfirmPasswordChange={setConfirmPassword}
                  loading={emailLoading}
                  error={emailError}
                  onSubmit={emailMode === 'login' ? handleEmailLogin : handleEmailRegister}
                />

                {emailMode === 'login' ? (
                  <Button
                    as={Link}
                    to={ROUTES.FORGOT_PASSWORD}
                    variant="link"
                    color="blue.600"
                    fontWeight="700"
                    alignSelf="flex-start"
                    onClick={onClose}
                  >
                    Quên mật khẩu?
                  </Button>
                ) : null}
              </VStack>
            </Box>

            <Box w={{ base: '0', md: '380px' }} display={{ base: 'none', md: 'block' }} bg="red.50" p={7}>
              <VStack align="center" spacing={3} justify="center" h="full">
                <Box
                  w="260px"
                  h="260px"
                  bg="white"
                  borderRadius="2xl"
                  borderWidth="1px"
                  borderColor="red.100"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <BrandLogo maxH="210px" maxW="210px" w="full" h="full" />
                </Box>
                <Text fontWeight="900" color="red.700">
                  Chào mừng bạn!
                </Text>
                <Text fontSize="sm" color="gray.600" textAlign="center" maxW="280px">
                  Đăng nhập để theo dõi đơn hàng, nhận ưu đãi và lưu địa chỉ giao hàng nhanh chóng.
                </Text>
              </VStack>
            </Box>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
