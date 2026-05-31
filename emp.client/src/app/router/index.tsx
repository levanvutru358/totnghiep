import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTES } from './route-names'
import { ClientLayout } from '../../shared/layout/client-layout'
import { HomePage } from '../../features/home/pages/home-page'
import { CategoryPage } from '../../features/categories/pages/category-page'
import { ProductDetailPage } from '../../features/products/pages/product-detail-page'
import { CartPage } from '../../features/cart/pages/cart-page'
import { AccountProfilePage } from '../../features/account/pages/account-profile-page'
import { AccountOrdersPage } from '../../features/account/pages/account-orders-page'
import { useScrollToTop } from '../../shared/hooks/use-scroll-to-top'
import { CheckoutPage } from '../../features/checkout/pages/checkout-page'
import { PaymentPage } from '../../features/payments/pages/payment-page'
import { PaymentResultPage } from '../../features/payments/pages/payment-result-page'
import { PaymentCancelPage } from '../../features/payments/pages/payment-cancel-page'
import { OrdersPage } from '../../features/orders/pages/orders-page'
import { OrderDetailPage } from '../../features/orders/pages/order-detail-page'
import { ForgotPasswordPage } from '../../features/auth/pages/forgot-password-page'
import { ResetPasswordPage } from '../../features/auth/pages/reset-password-page'
import { AccountReviewsPage } from '../../features/account/pages/account-reviews-page'
import { NotificationsPage } from '../../features/notifications/pages/notifications-page'

export const AppRouter = () => {
  useScrollToTop()

  return (
    <Routes>
      <Route element={<ClientLayout />}>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.CATEGORIES} element={<CategoryPage />} />
        <Route path={ROUTES.PRODUCT_DETAIL} element={<ProductDetailPage />} />
        <Route path={ROUTES.CART} element={<CartPage />} />
        <Route path={ROUTES.CHECKOUT} element={<CheckoutPage />} />
        <Route path={ROUTES.PAYMENT} element={<PaymentPage />} />
        <Route path={ROUTES.CHECKOUT_RESULT} element={<PaymentResultPage />} />
        <Route path={ROUTES.CHECKOUT_CANCEL} element={<PaymentCancelPage />} />
        <Route path={ROUTES.ORDERS} element={<OrdersPage />} />
        <Route path={ROUTES.ORDER_DETAIL} element={<OrderDetailPage />} />
        <Route path={ROUTES.ACCOUNT_PROFILE} element={<AccountProfilePage />} />
        <Route path={ROUTES.ACCOUNT_ORDERS} element={<AccountOrdersPage />} />
        <Route path={ROUTES.ACCOUNT_REVIEWS} element={<AccountReviewsPage />} />
        <Route path={ROUTES.ACCOUNT_NOTIFICATIONS} element={<NotificationsPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Route>
    </Routes>
  )
}

