import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { AdminLayout } from '../../shared/layout/admin-layout'
import { LoginPage } from '../../features/auth/pages/login-page'
import { DashboardPage } from '../../features/dashboard/pages/dashboard-page'
import { ProductListPage } from '../../features/products/pages/product-list-page'
import { ProductCreatePage } from '../../features/products/pages/product-create-page'
import { ProductEditPage } from '../../features/products/pages/product-edit-page'
import { ProductDetailPage } from '../../features/products/pages/product-detail-page'
import { InventoryPage } from '../../features/inventory/pages/inventory-page'
import { CategoryBrandPage } from '../../features/categories/pages/category-brand-page'
import { OrderListPage } from '../../features/orders/pages/order-list-page'
import { OrderDetailPage } from '../../features/orders/pages/order-detail-page'
import { ReviewsPage } from '../../features/reviews/pages/reviews-page'
import { CommentsPage } from '../../features/comments/pages/comments-page'
import { CustomerListPage } from '../../features/customers/pages/customer-list-page'
import { CustomerDetailPage } from '../../features/customers/pages/customer-detail-page'
import { PermissionsPage } from '../../features/settings/pages/permissions-page'
import { SettingsPage } from '../../features/settings/pages/settings-page'
import { PromotionsPage } from '../../features/promotions/pages/promotions-page'
import { MarketingPage } from '../../features/marketing/pages/marketing-page'
import { ProtectedRoute } from './protected-route'
import { PermissionRoute } from './permission-route'
import { ROUTES } from './route-names'

const PlaceholderPage = ({ title }: { title: string }) => (
  <Box bg="surface.card" borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={6}>
    <VStack align="start">
      <Heading size="md">{title}</Heading>
      <Text color="text.secondary">Phân hệ này đã được tạo khung và sẵn sàng triển khai.</Text>
    </VStack>
  </Box>
)

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path="/register" element={<Navigate to={ROUTES.LOGIN} replace />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route
          path={ROUTES.DASHBOARD.slice(1)}
          element={
            <PermissionRoute permission="dashboard.view">
              <DashboardPage />
            </PermissionRoute>
          }
        />

        <Route
          path={ROUTES.PRODUCTS.slice(1)}
          element={
            <PermissionRoute permission="products.view">
              <ProductListPage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.PRODUCT_CREATE.slice(1)}
          element={
            <PermissionRoute permission="products.create">
              <ProductCreatePage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.PRODUCT_EDIT.slice(1)}
          element={
            <PermissionRoute permission="products.update">
              <ProductEditPage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.PRODUCT_DETAIL.slice(1)}
          element={
            <PermissionRoute permission="products.view">
              <ProductDetailPage />
            </PermissionRoute>
          }
        />

        <Route
          path={ROUTES.ORDERS.slice(1)}
          element={
            <PermissionRoute permission="orders.view">
              <OrderListPage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.ORDER_DETAIL.slice(1)}
          element={
            <PermissionRoute permission="orders.view">
              <OrderDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.CUSTOMERS.slice(1)}
          element={
            <PermissionRoute permission="customers.view">
              <CustomerListPage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.CUSTOMER_DETAIL.slice(1)}
          element={
            <PermissionRoute permission="customers.view">
              <CustomerDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.INVENTORY.slice(1)}
          element={
            <PermissionRoute permission="inventory.view">
              <InventoryPage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.MARKETING.slice(1)}
          element={
            <PermissionRoute permission="marketing.view">
              <MarketingPage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.CATEGORIES.slice(1)}
          element={
            <PermissionRoute permission="categories.view">
              <CategoryBrandPage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.PROMOTIONS.slice(1)}
          element={
            <PermissionRoute permission="promotions.view">
              <PromotionsPage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.REVIEWS.slice(1)}
          element={
            <PermissionRoute permission="reviews.view">
              <ReviewsPage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.COMMENTS.slice(1)}
          element={
            <PermissionRoute permission="comments.view">
              <CommentsPage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.SETTINGS.slice(1)}
          element={
            <PermissionRoute permission="settings.view">
              <SettingsPage />
            </PermissionRoute>
          }
        />
        <Route
          path={ROUTES.PERMISSIONS.slice(1)}
          element={
            <PermissionRoute permission="permissions.manage">
              <PermissionsPage />
            </PermissionRoute>
          }
        />
      </Route>
    </Routes>
  )
}