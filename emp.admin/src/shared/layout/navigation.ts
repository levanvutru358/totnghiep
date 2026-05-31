import { ROUTES } from '../../app/router/route-names'
import type { IconType } from 'react-icons'
import { FiGrid, FiLayers, FiMessageCircle, FiMessageSquare, FiPackage, FiPercent, FiSettings, FiShoppingCart, FiTag, FiUsers, FiGift } from 'react-icons/fi'

export interface NavigationItem {
  label: string
  to: string
  icon: IconType
  permission?: string
}

export interface NavigationSection {
  title: string
  items: NavigationItem[]
}

export const navigationSections: NavigationSection[] = [
  {
    title: 'Tổng quan',
    items: [{ label: 'Bảng điều khiển', to: ROUTES.DASHBOARD, icon: FiGrid, permission: 'dashboard.view' }],
  },
  {
    title: 'Danh mục sản phẩm',
    items: [
      { label: 'Sản phẩm', to: ROUTES.PRODUCTS, icon: FiPackage, permission: 'products.view' },
      { label: 'Danh mục & Thương hiệu', to: ROUTES.CATEGORIES, icon: FiTag, permission: 'categories.view' },
      { label: 'Tồn kho', to: ROUTES.INVENTORY, icon: FiLayers, permission: 'inventory.view' },
    ],
  },
  {
    title: 'Vận hành bán hàng',
    items: [
      { label: 'Đơn hàng', to: ROUTES.ORDERS, icon: FiShoppingCart, permission: 'orders.view' },
      { label: 'Khách hàng', to: ROUTES.CUSTOMERS, icon: FiUsers, permission: 'customers.view' },
      { label: 'Tiếp thị', to: ROUTES.MARKETING, icon: FiPercent, permission: 'marketing.view' },
      { label: 'Khuyến mãi', to: ROUTES.PROMOTIONS, icon: FiGift, permission: 'promotions.view' },
      { label: 'Đánh giá', to: ROUTES.REVIEWS, icon: FiMessageSquare, permission: 'reviews.view' },
      { label: 'Bình luận', to: ROUTES.COMMENTS, icon: FiMessageCircle, permission: 'comments.view' },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { label: 'Cài đặt', to: ROUTES.SETTINGS, icon: FiSettings, permission: 'settings.view' },
      { label: 'Phân quyền', to: ROUTES.PERMISSIONS, icon: FiUsers, permission: 'permissions.manage' },
    ],
  },
]
