/**
 * OpenAPI paths/schemas bổ sung — gộp vào swagger.ts.
 * Các nhóm: RBAC, Users/Addresses, Promotions, Marketing, Customers, Dashboard, Payments (ZaloPay).
 */

export const swaggerExtensionTags = [
  { name: 'Users', description: 'Hồ sơ & sổ địa chỉ giao hàng' },
  { name: 'Promotions', description: 'Mã khuyến mãi / voucher' },
  { name: 'Marketing', description: 'Banner, flash sale, section trang chủ' },
  { name: 'Customers', description: 'Quản lý khách hàng (admin)' },
  { name: 'Dashboard', description: 'Thống kê admin' },
] as const;

export const swaggerExtensionSchemas = {
  PromotionCode: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      code: { type: 'string', example: 'SALE10' },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      discountType: { type: 'string', enum: ['FIXED', 'PERCENT', 'FREE_SHIPPING'] },
      discountValue: { type: 'number' },
      maxDiscountAmount: { type: 'number', nullable: true },
      minOrderAmount: { type: 'number' },
      usageLimit: { type: 'integer', nullable: true },
      usageLimitPerUser: { type: 'integer', nullable: true },
      usedCount: { type: 'integer' },
      startsAt: { type: 'string', format: 'date-time', nullable: true },
      endsAt: { type: 'string', format: 'date-time', nullable: true },
      isActive: { type: 'boolean' },
      alreadyUsed: { type: 'boolean', description: 'Chỉ có trên API shop /available/me' },
    },
  },
  PromotionInput: {
    type: 'object',
    required: ['code', 'name', 'discountType', 'discountValue'],
    properties: {
      code: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      discountType: { type: 'string', enum: ['FIXED', 'PERCENT', 'FREE_SHIPPING'] },
      discountValue: { type: 'number' },
      maxDiscountAmount: { type: 'number', nullable: true },
      minOrderAmount: { type: 'number', example: 0 },
      usageLimit: { type: 'integer', nullable: true },
      usageLimitPerUser: { type: 'integer', nullable: true },
      startsAt: { type: 'string', format: 'date-time', nullable: true },
      endsAt: { type: 'string', format: 'date-time', nullable: true },
      isActive: { type: 'boolean', example: true },
    },
  },
  UserAddress: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      label: { type: 'string', nullable: true },
      recipientName: { type: 'string' },
      recipientPhone: { type: 'string' },
      addressLine1: { type: 'string' },
      addressLine2: { type: 'string', nullable: true },
      ward: { type: 'string', nullable: true },
      district: { type: 'string' },
      province: { type: 'string' },
      postalCode: { type: 'string', nullable: true },
      country: { type: 'string', example: 'VN' },
      isDefault: { type: 'boolean' },
    },
  },
  UserAddressInput: {
    type: 'object',
    required: ['recipientName', 'recipientPhone', 'addressLine1', 'district', 'province'],
    properties: {
      label: { type: 'string', nullable: true },
      recipientName: { type: 'string' },
      recipientPhone: { type: 'string' },
      addressLine1: { type: 'string' },
      addressLine2: { type: 'string', nullable: true },
      ward: { type: 'string', nullable: true },
      district: { type: 'string' },
      province: { type: 'string' },
      postalCode: { type: 'string', nullable: true },
      country: { type: 'string', example: 'VN' },
      isDefault: { type: 'boolean' },
    },
  },
  MarketingBanner: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      placement: { type: 'string', example: 'HOME_HERO' },
      title: { type: 'string' },
      description: { type: 'string', nullable: true },
      imageUrl: { type: 'string' },
      linkUrl: { type: 'string' },
      ctaLabel: { type: 'string', nullable: true },
      sortOrder: { type: 'integer' },
      isActive: { type: 'boolean' },
      startsAt: { type: 'string', format: 'date-time', nullable: true },
      endsAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  MarketingBannerInput: {
    type: 'object',
    required: ['title', 'imageUrl'],
    properties: {
      placement: { type: 'string', example: 'HOME_HERO' },
      title: { type: 'string' },
      description: { type: 'string', nullable: true },
      imageUrl: { type: 'string' },
      linkUrl: { type: 'string' },
      ctaLabel: { type: 'string', nullable: true },
      sortOrder: { type: 'integer' },
      isActive: { type: 'boolean' },
      startsAt: { type: 'string', format: 'date-time', nullable: true },
      endsAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
};

const ok = { '200': { description: 'Thành công' } };
const authErr = { '401': { description: 'Chưa đăng nhập' }, '403': { description: 'Không có quyền' } };

export const swaggerExtensionPaths: Record<string, Record<string, unknown>> = {
  '/api/auth/rbac/roles': {
    get: {
      tags: ['Auth'],
      summary: 'Danh sách role và quyền (SUPER_ADMIN)',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: '{ allPermissions, roles: [{ role, permissionCodes }] }',
        },
        ...authErr,
      },
    },
  },
  '/api/auth/rbac/roles/{roleCode}': {
    put: {
      tags: ['Auth'],
      summary: 'Gán quyền cho role (SUPER_ADMIN)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'roleCode',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['permissionCodes'],
              properties: {
                permissionCodes: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: { ...ok, '400': { description: 'Role hoặc permission không hợp lệ' }, ...authErr },
    },
  },

  '/api/users/me/addresses': {
    get: {
      tags: ['Users'],
      summary: 'Danh sách địa chỉ giao hàng',
      security: [{ bearerAuth: [] }],
      responses: { ...ok, '401': { description: 'Chưa đăng nhập' } },
    },
    post: {
      tags: ['Users'],
      summary: 'Thêm địa chỉ giao hàng',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UserAddressInput' } },
        },
      },
      responses: { '201': { description: 'Đã tạo' }, '400': { description: 'Thiếu trường bắt buộc' } },
    },
  },
  '/api/users/me/addresses/{addressId}': {
    patch: {
      tags: ['Users'],
      summary: 'Cập nhật địa chỉ',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'addressId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UserAddressInput' } },
        },
      },
      responses: { ...ok, '404': { description: 'Không tìm thấy địa chỉ' } },
    },
    put: {
      tags: ['Users'],
      summary: 'Cập nhật địa chỉ (alias PATCH)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'addressId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UserAddressInput' } },
        },
      },
      responses: { ...ok, '404': { description: 'Không tìm thấy địa chỉ' } },
    },
    delete: {
      tags: ['Users'],
      summary: 'Xóa địa chỉ',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'addressId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { ...ok, '404': { description: 'Không tìm thấy địa chỉ' } },
    },
  },

  '/api/promotions/available': {
    get: {
      security: [],
      tags: ['Promotions'],
      summary: 'Mã khuyến mãi đang active (shop, không đăng nhập)',
      responses: { '200': { description: 'Danh sách mã + chipLabel, shortDesc' } },
    },
  },
  '/api/promotions/available/me': {
    get: {
      tags: ['Promotions'],
      summary: 'Mã khuyến mãi cho user đăng nhập (có alreadyUsed)',
      security: [{ bearerAuth: [] }],
      responses: { ...ok, '401': { description: 'Chưa đăng nhập' } },
    },
  },
  '/api/promotions/validate': {
    post: {
      tags: ['Promotions'],
      summary: 'Kiểm tra & tính giảm giá mã (checkout)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['code', 'subtotal'],
              properties: {
                code: { type: 'string' },
                voucherCode: { type: 'string', description: 'Alias của code' },
                subtotal: { type: 'number', description: 'Tổng tiền hàng (catalog)' },
                shippingFee: { type: 'number', example: 12 },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: '{ code, discountAmount, shippingFee, totalAmount }' },
        '400': { description: 'Mã không hợp lệ / hết hạn / chưa đủ đơn tối thiểu' },
      },
    },
  },
  '/api/admin/promotions': {
    get: {
      tags: ['Promotions'],
      summary: 'Admin — danh sách mã khuyến mãi',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
        { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
      ],
      responses: { ...ok, ...authErr },
    },
    post: {
      tags: ['Promotions'],
      summary: 'Admin — tạo mã khuyến mãi',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/PromotionInput' } },
        },
      },
      responses: { '201': { description: 'Đã tạo' }, '409': { description: 'Mã đã tồn tại' }, ...authErr },
    },
  },
  '/api/admin/promotions/{promotionId}': {
    get: {
      tags: ['Promotions'],
      summary: 'Admin — chi tiết mã',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'promotionId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { ...ok, '404': { description: 'Không tìm thấy' }, ...authErr },
    },
    patch: {
      tags: ['Promotions'],
      summary: 'Admin — cập nhật mã',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'promotionId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/PromotionInput' } },
        },
      },
      responses: { ...ok, ...authErr },
    },
    delete: {
      tags: ['Promotions'],
      summary: 'Admin — xóa mã',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'promotionId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { ...ok, ...authErr },
    },
  },

  '/api/marketing/home': {
    get: {
      security: [],
      tags: ['Marketing', 'Public'],
      summary: 'Nội dung trang chủ (banner, sections, flash sale, sản phẩm)',
      responses: {
        '200': {
          description: 'heroSlides, sections, flashSale, bestSellers, ...',
        },
      },
    },
  },
  '/api/admin/marketing/banners': {
    get: {
      tags: ['Marketing'],
      summary: 'Admin — danh sách banner',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'placement', in: 'query', schema: { type: 'string' } },
        { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
      ],
      responses: { ...ok, ...authErr },
    },
    post: {
      tags: ['Marketing'],
      summary: 'Admin — tạo banner',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/MarketingBannerInput' } },
        },
      },
      responses: { '201': { description: 'Đã tạo' }, ...authErr },
    },
  },
  '/api/admin/marketing/banners/{bannerId}': {
    patch: {
      tags: ['Marketing'],
      summary: 'Admin — cập nhật banner',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'bannerId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/MarketingBannerInput' } },
        },
      },
      responses: { ...ok, '404': { description: 'Không tìm thấy' }, ...authErr },
    },
    delete: {
      tags: ['Marketing'],
      summary: 'Admin — xóa banner',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'bannerId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { ...ok, ...authErr },
    },
  },
  '/api/admin/marketing/home-sections': {
    get: {
      tags: ['Marketing'],
      summary: 'Admin — cấu hình section trang chủ',
      security: [{ bearerAuth: [] }],
      responses: { ...ok, ...authErr },
    },
  },
  '/api/admin/marketing/home-sections/{sectionCode}': {
    patch: {
      tags: ['Marketing'],
      summary: 'Admin — cập nhật section (BEST_SELLERS, NEW_ARRIVALS, ...)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'sectionCode',
          in: 'path',
          required: true,
          schema: { type: 'string', example: 'BEST_SELLERS' },
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                subtitle: { type: 'string', nullable: true },
                badgeLabel: { type: 'string', nullable: true },
                linkUrl: { type: 'string' },
                isActive: { type: 'boolean' },
                sortOrder: { type: 'integer' },
              },
            },
          },
        },
      },
      responses: { ...ok, ...authErr },
    },
  },
  '/api/admin/marketing/sections/{sectionCode}/products': {
    get: {
      tags: ['Marketing'],
      summary: 'Admin — sản phẩm trong section',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'sectionCode', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { ...ok, ...authErr },
    },
    post: {
      tags: ['Marketing'],
      summary: 'Admin — thêm sản phẩm vào section',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'sectionCode', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['productId'],
              properties: {
                productId: { type: 'integer' },
                badgeLabel: { type: 'string', nullable: true },
                discountPercent: { type: 'number', nullable: true },
                sortOrder: { type: 'integer' },
                isActive: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: { '201': { description: 'Đã thêm' }, '409': { description: 'Sản phẩm đã có trong section' } },
    },
  },
  '/api/admin/marketing/section-products/{itemId}': {
    patch: {
      tags: ['Marketing'],
      summary: 'Admin — cập nhật item section',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                badgeLabel: { type: 'string', nullable: true },
                discountPercent: { type: 'number', nullable: true },
                sortOrder: { type: 'integer' },
                isActive: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: { ...ok, ...authErr },
    },
    delete: {
      tags: ['Marketing'],
      summary: 'Admin — gỡ sản phẩm khỏi section',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { ...ok, ...authErr },
    },
  },
  '/api/admin/marketing/flash-sale': {
    get: {
      tags: ['Marketing'],
      summary: 'Admin — danh sách flash sale',
      security: [{ bearerAuth: [] }],
      responses: { ...ok, ...authErr },
    },
    post: {
      tags: ['Marketing'],
      summary: 'Admin — thêm sản phẩm flash sale',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['productId'],
              properties: {
                productId: { type: 'integer' },
                badgeLabel: { type: 'string', nullable: true },
                discountPercent: { type: 'number', nullable: true },
                sortOrder: { type: 'integer' },
                isActive: { type: 'boolean' },
                endsAt: { type: 'string', format: 'date-time', nullable: true },
              },
            },
          },
        },
      },
      responses: { '201': { description: 'Đã tạo' }, ...authErr },
    },
  },
  '/api/admin/marketing/flash-sale/{itemId}': {
    patch: {
      tags: ['Marketing'],
      summary: 'Admin — cập nhật flash sale item',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                badgeLabel: { type: 'string', nullable: true },
                discountPercent: { type: 'number', nullable: true },
                sortOrder: { type: 'integer' },
                isActive: { type: 'boolean' },
                endsAt: { type: 'string', format: 'date-time', nullable: true },
              },
            },
          },
        },
      },
      responses: { ...ok, ...authErr },
    },
    delete: {
      tags: ['Marketing'],
      summary: 'Admin — xóa flash sale item',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { ...ok, ...authErr },
    },
  },

  '/api/admin/customers': {
    get: {
      tags: ['Customers'],
      summary: 'Admin — danh sách khách hàng',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' } },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['all', 'active', 'locked', 'temp_locked'] },
        },
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
      ],
      responses: { ...ok, ...authErr },
    },
  },
  '/api/admin/customers/{customerId}': {
    get: {
      tags: ['Customers'],
      summary: 'Admin — chi tiết khách (đơn, địa chỉ, review, thiết bị đăng nhập)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'customerId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { ...ok, '404': { description: 'Không tìm thấy' }, ...authErr },
    },
    patch: {
      tags: ['Customers'],
      summary: 'Admin — cập nhật khách (họ tên, active)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'customerId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                fullName: { type: 'string', nullable: true },
                isActive: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: { ...ok, ...authErr },
    },
  },
  '/api/admin/customers/{customerId}/lock': {
    post: {
      tags: ['Customers'],
      summary: 'Admin — khóa vĩnh viễn tài khoản',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'customerId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: { reason: { type: 'string', minLength: 3 } },
            },
          },
        },
      },
      responses: { ...ok, ...authErr },
    },
  },
  '/api/admin/customers/{customerId}/temp-lock': {
    post: {
      tags: ['Customers'],
      summary: 'Admin — khóa tạm thời',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'customerId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason', 'durationMinutes'],
              properties: {
                reason: { type: 'string', minLength: 3 },
                durationMinutes: { type: 'integer', example: 60 },
              },
            },
          },
        },
      },
      responses: { ...ok, ...authErr },
    },
  },
  '/api/admin/customers/{customerId}/unlock': {
    post: {
      tags: ['Customers'],
      summary: 'Admin — mở khóa tài khoản',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'customerId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { ...ok, ...authErr },
    },
  },

  '/api/dashboard/metrics': {
    get: {
      tags: ['Dashboard'],
      summary: 'Chỉ số tổng quan (doanh thu, đơn, khách, ...)',
      security: [{ bearerAuth: [] }],
      responses: { ...ok, ...authErr },
    },
  },
  '/api/dashboard/revenue-series': {
    get: {
      tags: ['Dashboard'],
      summary: 'Biểu đồ doanh thu theo khoảng thời gian',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'range', in: 'query', schema: { type: 'string', example: '7d' } },
      ],
      responses: { ...ok, ...authErr },
    },
  },
  '/api/dashboard/recent-orders': {
    get: {
      tags: ['Dashboard'],
      summary: 'Đơn hàng gần đây',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }],
      responses: { ...ok, ...authErr },
    },
  },
  '/api/dashboard/low-stock': {
    get: {
      tags: ['Dashboard'],
      summary: 'Sản phẩm sắp hết hàng',
      security: [{ bearerAuth: [] }],
      responses: { ...ok, ...authErr },
    },
  },
  '/api/dashboard/top-customers': {
    get: {
      tags: ['Dashboard'],
      summary: 'Khách mua nhiều nhất',
      security: [{ bearerAuth: [] }],
      responses: { ...ok, ...authErr },
    },
  },
  '/api/dashboard/top-categories': {
    get: {
      tags: ['Dashboard'],
      summary: 'Danh mục bán chạy',
      security: [{ bearerAuth: [] }],
      responses: { ...ok, ...authErr },
    },
  },
  '/api/dashboard/order-status-distribution': {
    get: {
      tags: ['Dashboard'],
      summary: 'Phân bố trạng thái đơn hàng',
      security: [{ bearerAuth: [] }],
      responses: { ...ok, ...authErr },
    },
  },

  '/api/payments/callbacks/zalopay': {
    post: {
      security: [],
      tags: ['Payments'],
      summary: 'Webhook callback ZaloPay',
      description: 'Gọi từ ZaloPay server. Không cần Bearer token.',
      requestBody: {
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '200': { description: 'Đã xử lý' } },
    },
  },
  '/api/payments/return/zalopay': {
    get: {
      security: [],
      tags: ['Payments'],
      summary: 'Return URL sau thanh toán ZaloPay',
      parameters: [
        { name: 'apptransid', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
      ],
      responses: { '302': { description: 'Redirect về trang kết quả client' } },
    },
  },
  '/api/payments/return/resolve': {
    get: {
      tags: ['Payments'],
      summary: 'Resolve trạng thái thanh toán sau redirect (đã đăng nhập)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'orderCode', in: 'query', schema: { type: 'string' } },
        { name: 'paymentCode', in: 'query', schema: { type: 'string' } },
      ],
      responses: { ...ok, '404': { description: 'Không tìm thấy' } },
    },
  },
};
