import { useDisclosure } from '@chakra-ui/react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { AccountAuthModal } from '../components/account-auth-modal'
import type { ClientMe } from '../services/client-auth.api'
import { clearClientAuthSession } from '../lib/auth-password-messages'
import { clientAuthApi } from '../services/client-auth.api'
import { mergeLocalGuestCart } from '../../commerce/lib/merge-guest-cart'
import { commerceApi } from '../../commerce/services/commerce.api'

type AuthSuccessCallback = () => void | Promise<void>

interface OpenAuthModalOptions {
  onSuccess?: AuthSuccessCallback
}

interface AuthModalContextValue {
  currentUser: ClientMe | null
  setCurrentUser: (user: ClientMe | null) => void
  openAuthModal: (options?: OpenAuthModalOptions) => void
  logout: () => Promise<void>
  refreshServerCartQty: () => Promise<void>
  serverCartQty: number
  setServerCartQty: (qty: number) => void
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

const getStoredClientUser = (): ClientMe | null => {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem('client_user')
  if (!raw) return null

  try {
    return JSON.parse(raw) as ClientMe
  } catch {
    localStorage.removeItem('client_user')
    return null
  }
}

export const AuthModalProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate()
  const accountModal = useDisclosure()
  const pendingOnSuccessRef = useRef<AuthSuccessCallback | null>(null)
  const [currentUser, setCurrentUser] = useState<ClientMe | null>(getStoredClientUser)
  const [serverCartQty, setServerCartQty] = useState(0)

  const refreshServerCartQty = useCallback(async () => {
    if (!commerceApi.hasServerToken()) {
      setServerCartQty(0)
      return
    }

    try {
      const cart = await commerceApi.getCart()
      setServerCartQty(cart.summary.totalQuantity)
    } catch {
      setServerCartQty(0)
    }
  }, [])

  const openAuthModal = useCallback(
    (options?: OpenAuthModalOptions) => {
      pendingOnSuccessRef.current = options?.onSuccess ?? null
      accountModal.onOpen()
    },
    [accountModal.onOpen],
  )

  const handleModalClose = useCallback(() => {
    pendingOnSuccessRef.current = null
    accountModal.onClose()
  }, [accountModal.onClose])

  const handleLoginSuccess = useCallback(
    async (user: ClientMe) => {
      setCurrentUser(user)

      if (commerceApi.hasServerToken()) {
        try {
          const result = await mergeLocalGuestCart({ clearLocal: true })
          setServerCartQty(result.cart.summary.totalQuantity)
        } catch (error) {
          console.warn('Guest cart merge after login failed:', error)
          await refreshServerCartQty()
        }
      }

      pendingOnSuccessRef.current = null
      accountModal.onClose()
      navigate(ROUTES.HOME, { replace: true })
    },
    [accountModal.onClose, navigate, refreshServerCartQty],
  )

  const logout = useCallback(async () => {
    try {
      await clientAuthApi.logout()
    } catch {
      // Still clear local session if cookie/token already expired
    }
    clearClientAuthSession()
    setCurrentUser(null)
    setServerCartQty(0)
    navigate(ROUTES.HOME, { replace: true })
  }, [navigate])

  useEffect(() => {
    void refreshServerCartQty()
  }, [refreshServerCartQty, currentUser])

  useEffect(() => {
    const onServerCartUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ totalQuantity?: number }>).detail
      if (typeof detail?.totalQuantity === 'number') {
        setServerCartQty(detail.totalQuantity)
        return
      }

      void refreshServerCartQty()
    }

    window.addEventListener('server-cart-updated', onServerCartUpdated)
    return () => window.removeEventListener('server-cart-updated', onServerCartUpdated)
  }, [refreshServerCartQty])

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      openAuthModal,
      logout,
      refreshServerCartQty,
      serverCartQty,
      setServerCartQty,
    }),
    [currentUser, openAuthModal, logout, refreshServerCartQty, serverCartQty],
  )

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AccountAuthModal
        isOpen={accountModal.isOpen}
        onClose={handleModalClose}
        onLoginSuccess={handleLoginSuccess}
      />
    </AuthModalContext.Provider>
  )
}

export const useAuthModal = (): AuthModalContextValue => {
  const ctx = useContext(AuthModalContext)
  if (!ctx) {
    throw new Error('useAuthModal must be used within AuthModalProvider')
  }
  return ctx
}
