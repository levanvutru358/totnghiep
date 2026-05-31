import swaggerJsdoc from 'swagger-jsdoc';
import {
  swaggerExtensionPaths,
  swaggerExtensionSchemas,
  swaggerExtensionTags,
} from './swagger-extensions';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ecommerce Server API',
      version: '1.0.0',
      description: 'Tài liệu API cho backend ecommerce',
    },
    tags: [
      { name: 'Auth', description: 'Đăng ký, đăng nhập, JWT & RBAC (role trong access token)' },
      { name: 'Products', description: 'API quản lý sản phẩm' },
      { name: 'Categories', description: 'API quản lý danh mục' },
      { name: 'Brands', description: 'API quản lý thương hiệu' },
      { name: 'Sizes', description: 'API quản lý kích cỡ' },
      { name: 'Colors', description: 'API quản lý màu sắc' },
      { name: 'Variants', description: 'API quản lý biến thể sản phẩm' },
      { name: 'Inventory', description: 'API quản lý tồn kho' },
      { name: 'Cart', description: 'API giỏ hàng' },
      { name: 'Orders', description: 'API đơn hàng' },
      { name: 'Payments', description: 'API thanh toán' },
      { name: 'Reviews', description: 'Đánh giá sản phẩm (1–5 sao, ảnh, like)' },
      { name: 'Comments', description: 'Bình luận / hỏi đáp sản phẩm (reply, mention)' },
      { name: 'Notifications', description: 'Thông báo người dùng' },
      { name: 'Upload', description: 'Upload ảnh (review, chung)' },
      { name: 'Public', description: 'API công khai cho shop client (không cần đăng nhập)' },
      { name: 'Settings', description: 'Cài đặt cửa hàng (admin)' },
      ...swaggerExtensionTags,
    ],
    // Mặc định mọi operation dùng Bearer (Swagger UI mới gửi token sau Authorize).
    // Các route public ghi đè bằng security: [].
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token JWT (payload gồm sub, email, role)',
        },
      },
      schemas: {
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            statusCode: { type: 'integer' },
            message: { type: 'string' },
            errorCode: { type: 'string', nullable: true },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            slug: { type: 'string' },
            short_description: { type: 'string', nullable: true },
            base_price: { type: 'number' },
            sale_price: { type: 'number', nullable: true },
            thumbnail_url: { type: 'string', nullable: true },
          },
        },
        ShopSettings: {
          type: 'object',
          description:
            'Cài đặt cửa hàng. Phí ship / ngưỡng freeship dùng đơn vị giá catalog (vd. 12 = 12.000đ, 200 = 200.000đ).',
          properties: {
            shopName: { type: 'string', example: 'DTT Shop' },
            logoUrl: { type: 'string', example: '/logo-dtt.png' },
            supportPhone: { type: 'string', nullable: true, example: '1900-6035' },
            supportEmail: { type: 'string', nullable: true, example: 'hotro@dttshop.vn' },
            defaultShippingFee: { type: 'number', example: 12 },
            freeShippingMinSubtotal: { type: 'number', example: 200 },
            paymentPayosEnabled: { type: 'boolean', example: true },
            paymentZalopayEnabled: { type: 'boolean', example: true },
            defaultPaymentProvider: {
              type: 'string',
              enum: ['PAYOS', 'ZALOPAY'],
              example: 'PAYOS',
            },
            returnPolicyText: { type: 'string', nullable: true },
            shippingPolicyText: { type: 'string', nullable: true },
            chatbotEnabled: { type: 'boolean', example: true },
            registrationEnabled: { type: 'boolean', example: true },
            updatedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        ShopSettingsInput: {
          type: 'object',
          required: ['shopName', 'logoUrl'],
          properties: {
            shopName: { type: 'string', example: 'DTT Shop' },
            logoUrl: { type: 'string', example: '/logo-dtt.png' },
            supportPhone: { type: 'string', nullable: true, example: '1900-6035' },
            supportEmail: { type: 'string', format: 'email', nullable: true, example: 'hotro@dttshop.vn' },
            defaultShippingFee: { type: 'number', minimum: 0, example: 12 },
            freeShippingMinSubtotal: { type: 'number', minimum: 0, example: 200 },
            paymentPayosEnabled: { type: 'boolean', example: true },
            paymentZalopayEnabled: { type: 'boolean', example: true },
            defaultPaymentProvider: {
              type: 'string',
              enum: ['PAYOS', 'ZALOPAY'],
              example: 'PAYOS',
            },
            returnPolicyText: { type: 'string', nullable: true },
            shippingPolicyText: { type: 'string', nullable: true },
            chatbotEnabled: { type: 'boolean', example: true },
            registrationEnabled: { type: 'boolean', example: true },
          },
        },
        ...swaggerExtensionSchemas,
      },
    },
    paths: {
      '/': {
        get: {
          security: [],
          tags: ['Public'],
          summary: 'Health check',
          responses: { '200': { description: 'Server is running' } },
        },
      },
      '/api/auth/register': {
        post: {
          security: [],
          tags: ['Auth'],
          summary: 'Đăng ký (mặc định role CUSTOMER)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    fullName: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Tạo tài khoản thành công' },
            '403': { description: 'Đăng ký đang tắt (REGISTRATION_DISABLED)' },
            '409': { description: 'Email đã tồn tại' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          security: [],
          tags: ['Auth'],
          summary: 'Đăng nhập (access token chứa role)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Thành công' },
            '401': { description: 'Sai thông tin' },
          },
        },
      },
      '/api/auth/refresh': {
        post: {
          security: [],
          tags: ['Auth'],
          summary: 'Làm mới access token (rotation refresh token)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: { '200': { description: 'Thành công' }, '401': { description: 'Refresh không hợp lệ' } },
        },
      },
      '/api/auth/logout': {
        post: {
          security: [],
          tags: ['Auth'],
          summary: 'Đăng xuất (thu hồi refresh token)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: { '200': { description: 'Thành công' } },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Thông tin user hiện tại',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Thành công' }, '401': { description: 'Chưa đăng nhập' } },
        },
      },
      '/api/users/me': {
        patch: {
          tags: ['Users'],
          summary: 'Cập nhật profile (tên hiển thị)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    fullName: { type: 'string', maxLength: 120, nullable: true },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Thành công' }, '401': { description: 'Chưa đăng nhập' } },
        },
        put: {
          tags: ['Users'],
          summary: 'Cập nhật profile (alias PATCH)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    fullName: { type: 'string', maxLength: 120, nullable: true },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Thành công' }, '401': { description: 'Chưa đăng nhập' } },
        },
      },
      '/api/auth/change-password': {
        post: {
          tags: ['Auth'],
          summary: 'Đổi mật khẩu (xóa mọi refresh token đang hoạt động)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currentPassword', 'newPassword'],
                  properties: {
                    currentPassword: { type: 'string' },
                    newPassword: { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Thành công' }, '401': { description: 'Sai mật khẩu hiện tại' } },
        },
      },
      '/api/auth/forgot-password': {
        post: {
          security: [],
          tags: ['Auth'],
          summary: 'Quên mật khẩu (gửi link reset nếu có SMTP)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: { email: { type: 'string', format: 'email' } },
                },
              },
            },
          },
          responses: { '200': { description: 'Luôn trả về thông điệp chung (không lộ user tồn tại)' } },
        },
      },
      '/api/auth/reset-password': {
        post: {
          security: [],
          tags: ['Auth'],
          summary: 'Đặt lại mật khẩu bằng token từ email',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'newPassword'],
                  properties: {
                    token: { type: 'string' },
                    newPassword: { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Thành công' }, '400': { description: 'Token không hợp lệ' } },
        },
      },
      '/api/products': {
        get: {
          security: [],
          tags: ['Products'],
          summary: 'Lấy danh sách sản phẩm',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'categoryId', in: 'query', schema: { type: 'integer' } },
            { name: 'brandId', in: 'query', schema: { type: 'integer' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: {
            '200': {
              description: 'Thành công',
            },
          },
        },
        post: {
          security: [{ bearerAuth: [] }],
          tags: ['Products'],
          summary: 'Tạo sản phẩm',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'slug', 'categoryId', 'brandId', 'basePrice'],
                  properties: {
                    name: { type: 'string', example: 'Áo thun test' },
                    slug: { type: 'string', example: 'ao-thun-test' },
                    categoryId: { type: 'integer', minimum: 1, example: 1 },
                    brandId: { type: 'integer', minimum: 1, example: 1 },
                    basePrice: { type: 'number', minimum: 0, example: 199000 },
                    salePrice: { type: 'number', nullable: true, example: null },
                    shortDescription: { type: 'string', nullable: true },
                    description: { type: 'string', nullable: true },
                    thumbnailUrl: { type: 'string', nullable: true },
                    isFeatured: { type: 'boolean', example: false },
                  },
                },
                example: {
                  name: 'Áo thun test',
                  slug: 'ao-thun-test',
                  categoryId: 1,
                  brandId: 1,
                  basePrice: 199000,
                  salePrice: null,
                  shortDescription: null,
                  description: null,
                  thumbnailUrl: null,
                  isFeatured: false,
                },
              },
            },
          },
          responses: {
            '201': { description: 'Tạo mới thành công' },
            '400': { description: 'Dữ liệu không hợp lệ (categoryId/brandId/basePrice, v.v.)' },
            '409': { description: 'Trùng slug sản phẩm' },
          },
        },
      },
      '/api/products/{idOrSlug}': {
        get: {
          security: [],
          tags: ['Products'],
          summary: 'Lấy chi tiết sản phẩm theo id hoặc slug',
          parameters: [
            {
              name: 'idOrSlug',
              in: 'path',
              required: true,
              description: 'Số id (vd. 10) hoặc slug (vd. ao-thun-test)',
              schema: { type: 'string', example: 'ao-thun-test' },
            },
          ],
          responses: {
            '200': { description: 'Thành công' },
            '404': { description: 'Không tìm thấy' },
          },
        },
        put: {
          security: [{ bearerAuth: [] }],
          tags: ['Products'],
          summary: 'Cập nhật sản phẩm theo id hoặc slug',
          parameters: [
            {
              name: 'idOrSlug',
              in: 'path',
              required: true,
              description: 'Số id hoặc slug sản phẩm',
              schema: { type: 'string', example: 'ao-thun-test' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Chỉ gửi các field cần đổi. Không dùng categoryId/brandId = 0.',
                  properties: {
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    categoryId: { type: 'integer', minimum: 1 },
                    brandId: { type: 'integer', minimum: 1 },
                    basePrice: { type: 'number', minimum: 0 },
                    salePrice: { type: 'number', nullable: true },
                    shortDescription: { type: 'string', nullable: true },
                    description: { type: 'string', nullable: true },
                    thumbnailUrl: { type: 'string', nullable: true },
                    isFeatured: { type: 'boolean' },
                    isActive: { type: 'boolean' },
                  },
                },
                example: {
                  name: 'Áo thun test (đã sửa)',
                  basePrice: 210000,
                },
              },
            },
          },
          responses: {
            '200': { description: 'Cập nhật thành công' },
            '400': { description: 'Dữ liệu không hợp lệ (categoryId/brandId/basePrice)' },
            '401': { description: 'Token không hợp lệ / hết hạn' },
            '403': { description: 'Thiếu quyền products.update' },
            '404': { description: 'Không tìm thấy' },
            '409': { description: 'Trùng slug' },
          },
        },
        delete: {
          security: [{ bearerAuth: [] }],
          tags: ['Products'],
          summary: 'Xóa mềm sản phẩm theo id hoặc slug',
          parameters: [
            {
              name: 'idOrSlug',
              in: 'path',
              required: true,
              description: 'Số id hoặc slug sản phẩm',
              schema: { type: 'string', example: 'ao-thun-test' },
            },
          ],
          responses: {
            '200': { description: 'Xóa thành công' },
            '404': { description: 'Không tìm thấy' },
          },
        },
      },
      '/api/categories': {
        get: {
          security: [],
          tags: ['Categories'],
          summary: 'Lấy danh sách danh mục',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: {
            '200': { description: 'Thành công' },
          },
        },
        post: {
          security: [{ bearerAuth: [] }],
          tags: ['Categories'],
          summary: 'Tạo danh mục',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'slug'],
                  properties: {
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    description: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Tạo mới thành công' },
          },
        },
      },
      '/api/categories/{idOrSlug}': {
        get: {
          security: [],
          tags: ['Categories'],
          summary: 'Lấy chi tiết danh mục theo id hoặc slug',
          parameters: [{ name: 'idOrSlug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Thành công' },
            '404': { description: 'Không tìm thấy' },
          },
        },
        put: {
          security: [{ bearerAuth: [] }],
          tags: ['Categories'],
          summary: 'Cập nhật danh mục theo id hoặc slug',
          parameters: [
            {
              name: 'idOrSlug',
              in: 'path',
              required: true,
              description: 'Id số (vd. 1) hoặc slug (vd. shoes)',
              schema: { type: 'string', example: '1' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Chỉ gửi các field cần đổi',
                  properties: {
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    isActive: { type: 'boolean' },
                  },
                },
                example: {
                  name: 'Shoes (updated)',
                  description: 'Optional new description',
                },
              },
            },
          },
          responses: {
            '200': { description: 'Cập nhật thành công' },
            '400': { description: 'Dữ liệu không hợp lệ' },
            '401': { description: 'Token không hợp lệ / hết hạn' },
            '403': { description: 'Thiếu quyền categories.update' },
            '404': { description: 'Không tìm thấy' },
          },
        },
        delete: {
          security: [{ bearerAuth: [] }],
          tags: ['Categories'],
          summary: 'Xóa mềm danh mục theo id hoặc slug',
          parameters: [{ name: 'idOrSlug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Xóa thành công' },
            '404': { description: 'Không tìm thấy' },
          },
        },
      },
      '/api/brands': {
        get: {
          security: [],
          tags: ['Brands'],
          summary: 'Lấy danh sách thương hiệu',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: {
            '200': { description: 'Thành công' },
          },
        },
        post: {
          security: [{ bearerAuth: [] }],
          tags: ['Brands'],
          summary: 'Tạo thương hiệu',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'slug'],
                  properties: {
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    description: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Tạo mới thành công' },
          },
        },
      },
      '/api/brands/{idOrSlug}': {
        get: {
          security: [],
          tags: ['Brands'],
          summary: 'Lấy chi tiết thương hiệu theo id hoặc slug',
          parameters: [{ name: 'idOrSlug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Thành công' },
            '404': { description: 'Không tìm thấy' },
          },
        },
        put: {
          security: [{ bearerAuth: [] }],
          tags: ['Brands'],
          summary: 'Cập nhật thương hiệu theo id hoặc slug',
          parameters: [
            {
              name: 'idOrSlug',
              in: 'path',
              required: true,
              description: 'Id số (vd. 1) hoặc slug (vd. nike)',
              schema: { type: 'string', example: '1' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Chỉ gửi các field cần đổi',
                  properties: {
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    isActive: { type: 'boolean' },
                  },
                },
                example: {
                  name: 'Nike (updated)',
                  description: 'Optional new description',
                },
              },
            },
          },
          responses: {
            '200': { description: 'Cập nhật thành công' },
            '400': { description: 'Dữ liệu không hợp lệ' },
            '401': { description: 'Token không hợp lệ / hết hạn' },
            '403': { description: 'Thiếu quyền categories.update (brands dùng chung quyền CRUD với categories)' },
            '404': { description: 'Không tìm thấy' },
          },
        },
        delete: {
          security: [{ bearerAuth: [] }],
          tags: ['Brands'],
          summary: 'Xóa mềm thương hiệu theo id hoặc slug',
          parameters: [{ name: 'idOrSlug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Xóa thành công' },
            '404': { description: 'Không tìm thấy' },
          },
        },
      },
      '/api/sizes': {
        get: {
          security: [],
          tags: ['Sizes'],
          summary: 'Lấy danh sách kích cỡ',
          responses: { '200': { description: 'Thành công' } },
        },
        post: {
          security: [{ bearerAuth: [] }],
          tags: ['Sizes'],
          summary: 'Tạo kích cỡ',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['label'],
                  properties: {
                    label: { type: 'string', maxLength: 20, example: 'XXL' },
                    sortOrder: { type: 'integer', example: 100 },
                  },
                },
                example: { label: 'XXL', sortOrder: 100 },
              },
            },
          },
          responses: {
            '201': { description: 'Tạo mới thành công' },
            '400': { description: 'Thiếu label hoặc sortOrder không hợp lệ' },
            '401': { description: 'Chưa đăng nhập / token hết hạn' },
            '403': { description: 'Thiếu quyền categories.create' },
            '409': { description: 'Trùng label kích cỡ' },
          },
        },
      },
      '/api/sizes/{id}': {
        get: {
          security: [],
          tags: ['Sizes'],
          summary: 'Lấy chi tiết kích cỡ',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Id số trong DB (vd. 1). Không để nguyên chữ {id}.',
              schema: { type: 'integer', minimum: 1, example: 1 },
            },
          ],
          responses: {
            '200': { description: 'Thành công' },
            '400': { description: 'id không hợp lệ' },
            '404': { description: 'Không tìm thấy' },
          },
        },
        put: {
          security: [{ bearerAuth: [] }],
          tags: ['Sizes'],
          summary: 'Cập nhật kích cỡ',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Id kích cỡ',
              schema: { type: 'integer', minimum: 1, example: 1 },
            },
          ],
          responses: {
            '200': { description: 'Cập nhật thành công' },
            '400': { description: 'id không hợp lệ' },
            '404': { description: 'Không tìm thấy' },
          },
        },
        delete: {
          security: [{ bearerAuth: [] }],
          tags: ['Sizes'],
          summary: 'Xóa kích cỡ',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Id kích cỡ',
              schema: { type: 'integer', minimum: 1, example: 1 },
            },
          ],
          responses: {
            '200': { description: 'Xóa thành công' },
            '400': { description: 'id không hợp lệ' },
            '404': { description: 'Không tìm thấy' },
          },
        },
      },
      '/api/colors': {
        get: {
          security: [],
          tags: ['Colors'],
          summary: 'Lấy danh sách màu sắc',
          responses: { '200': { description: 'Thành công' } },
        },
        post: {
          security: [{ bearerAuth: [] }],
          tags: ['Colors'],
          summary: 'Tạo màu sắc',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', example: 'Navy' },
                    hexCode: { type: 'string', nullable: true, example: '#001F3F' },
                    sortOrder: { type: 'integer', example: 15 },
                  },
                },
                example: { name: 'Navy', hexCode: '#001F3F', sortOrder: 15 },
              },
            },
          },
          responses: {
            '201': { description: 'Tạo mới thành công' },
            '400': {
              description: 'Thiếu name (errorCode MISSING_NAME) hoặc sortOrder không hợp lệ (INVALID_SORTORDER)',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiError' },
                  example: {
                    success: false,
                    statusCode: 400,
                    message: 'Missing NAME',
                    errorCode: 'MISSING_NAME',
                  },
                },
              },
            },
            '401': {
              description: 'Chưa đăng nhập / token hết hạn',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '403': {
              description: 'Thiếu quyền categories.create',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '409': {
              description: 'Trùng tên màu (DUPLICATE_COLOR_NAME)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
          },
        },
      },
      '/api/colors/{id}': {
        get: {
          security: [],
          tags: ['Colors'],
          summary: 'Lấy chi tiết màu sắc',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Id số (vd. 1). Không để nguyên chữ {id}.',
              schema: { type: 'integer', minimum: 1, example: 1 },
            },
          ],
          responses: {
            '200': { description: 'Thành công' },
            '400': { description: 'id không hợp lệ' },
            '404': { description: 'Không tìm thấy' },
          },
        },
        put: {
          security: [{ bearerAuth: [] }],
          tags: ['Colors'],
          summary: 'Cập nhật màu sắc',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Id màu',
              schema: { type: 'integer', minimum: 1, example: 1 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Chỉ gửi các field cần đổi',
                  properties: {
                    name: { type: 'string' },
                    hexCode: { type: 'string', nullable: true },
                    sortOrder: { type: 'integer' },
                    isActive: { type: 'boolean' },
                  },
                },
                example: { name: 'Black', hexCode: '#111827' },
              },
            },
          },
          responses: {
            '200': { description: 'Cập nhật thành công' },
            '400': { description: 'id không hợp lệ' },
            '401': { description: 'Token' },
            '403': { description: 'Thiếu quyền categories.update' },
            '404': { description: 'Không tìm thấy' },
            '409': { description: 'Trùng tên màu' },
          },
        },
        delete: {
          security: [{ bearerAuth: [] }],
          tags: ['Colors'],
          summary: 'Xóa màu sắc',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Id màu',
              schema: { type: 'integer', minimum: 1, example: 1 },
            },
          ],
          responses: {
            '200': { description: 'Xóa thành công' },
            '400': { description: 'id không hợp lệ' },
            '401': { description: 'Token' },
            '403': { description: 'Thiếu quyền categories.delete' },
            '404': { description: 'Không tìm thấy' },
          },
        },
      },
      '/api/variants': {
        get: {
          security: [],
          tags: ['Variants'],
          summary: 'Lấy danh sách biến thể',
          parameters: [
            { name: 'productId', in: 'query', schema: { type: 'integer' }, description: 'Lọc theo sản phẩm' },
            { name: 'sizeId', in: 'query', schema: { type: 'integer' } },
            { name: 'colorId', in: 'query', schema: { type: 'integer' } },
            { name: 'sku', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: { '200': { description: 'Thành công' } },
        },
        post: {
          security: [{ bearerAuth: [] }],
          tags: ['Variants'],
          summary: 'Tạo biến thể',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['productId', 'sizeId', 'colorId', 'sku'],
                  properties: {
                    productId: { type: 'integer', minimum: 1, example: 1 },
                    sizeId: { type: 'integer', minimum: 1, example: 1 },
                    colorId: { type: 'integer', minimum: 1, example: 1 },
                    sku: { type: 'string', example: 'SKU-DEMO-001' },
                    barcode: { type: 'string', nullable: true },
                    price: { type: 'number', nullable: true, example: 199000 },
                    stockQuantity: { type: 'integer', example: 0 },
                    minStockThreshold: { type: 'integer', example: 0 },
                  },
                },
                example: {
                  productId: 1,
                  sizeId: 1,
                  colorId: 1,
                  sku: 'SKU-DEMO-001',
                  barcode: null,
                  price: 199000,
                  stockQuantity: 10,
                  minStockThreshold: 2,
                },
              },
            },
          },
          responses: {
            '201': { description: 'Tạo mới thành công' },
            '400': {
              description: 'Thiếu field, id không hợp lệ, giá/tồn không hợp lệ (xem errorCode)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '401': {
              description: 'Token',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '403': {
              description: 'Thiếu quyền products.create',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '409': {
              description: 'Trùng SKU hoặc cặp product/size/color (VARIANT_ALREADY_EXISTS)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
          },
        },
      },
      '/api/variants/{id}': {
        get: {
          security: [],
          tags: ['Variants'],
          summary: 'Lấy chi tiết biến thể',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Id biến thể (số). Không để nguyên chữ {id}.',
              schema: { type: 'integer', minimum: 1, example: 1 },
            },
          ],
          responses: {
            '200': { description: 'Thành công' },
            '400': {
              description: 'id không hợp lệ',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '404': {
              description: 'Không tìm thấy',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
          },
        },
        put: {
          security: [{ bearerAuth: [] }],
          tags: ['Variants'],
          summary: 'Cập nhật biến thể',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Id biến thể',
              schema: { type: 'integer', minimum: 1, example: 1 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Chỉ gửi field cần đổi',
                  properties: {
                    sizeId: { type: 'integer', minimum: 1 },
                    colorId: { type: 'integer', minimum: 1 },
                    sku: { type: 'string' },
                    barcode: { type: 'string', nullable: true },
                    price: { type: 'number', nullable: true },
                    stockQuantity: { type: 'integer' },
                    minStockThreshold: { type: 'integer' },
                    isActive: { type: 'boolean' },
                  },
                },
                example: { price: 189000, stockQuantity: 20 },
              },
            },
          },
          responses: {
            '200': { description: 'Cập nhật thành công' },
            '400': {
              description: 'id/body không hợp lệ',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '401': {
              description: 'Token',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '403': {
              description: 'Thiếu quyền products.update',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '404': {
              description: 'Không tìm thấy',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '409': {
              description: 'Trùng SKU hoặc combination',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
          },
        },
        delete: {
          security: [{ bearerAuth: [] }],
          tags: ['Variants'],
          summary: 'Xóa biến thể',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Id biến thể',
              schema: { type: 'integer', minimum: 1, example: 1 },
            },
          ],
          responses: {
            '200': { description: 'Xóa thành công' },
            '400': {
              description: 'id không hợp lệ',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '401': {
              description: 'Token',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '403': {
              description: 'Thiếu quyền products.delete',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '404': {
              description: 'Không tìm thấy',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
          },
        },
      },
      '/api/variants/{id}/stock': {
        get: {
          security: [],
          tags: ['Variants'],
          summary: 'Lấy tồn kho realtime',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Id biến thể',
              schema: { type: 'integer', minimum: 1, example: 1 },
            },
          ],
          responses: {
            '200': { description: 'Thành công' },
            '400': {
              description: 'id không hợp lệ',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '404': {
              description: 'Không tìm thấy',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
          },
        },
      },
      '/api/inventory': {
        get: {
          security: [],
          tags: ['Inventory'],
          summary: 'Lấy danh sách giao dịch kho (alias cùng handler với /transactions)',
          parameters: [
            { name: 'variantId', in: 'query', schema: { type: 'integer' }, description: 'Lọc theo biến thể' },
            {
              name: 'transactionType',
              in: 'query',
              schema: { type: 'string', enum: ['IN', 'OUT', 'ADJUSTMENT'] },
            },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: { '200': { description: 'Thành công' } },
        },
        post: {
          security: [{ bearerAuth: [] }],
          tags: ['Inventory'],
          summary: 'Tạo giao dịch kho — cập nhật tồn biến thể',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['variantId', 'transactionType', 'quantity'],
                  properties: {
                    variantId: { type: 'integer', minimum: 1, example: 1 },
                    transactionType: { type: 'string', enum: ['IN', 'OUT', 'ADJUSTMENT'], example: 'IN' },
                    quantity: {
                      type: 'integer',
                      description: 'IN/OUT: số dương (số lượng thay đổi). ADJUSTMENT: tồn mục tiêu (≥ 0).',
                      example: 5,
                    },
                    note: { type: 'string', nullable: true },
                    referenceCode: { type: 'string', nullable: true },
                    createdBy: { type: 'string', nullable: true },
                  },
                },
                example: {
                  variantId: 1,
                  transactionType: 'IN',
                  quantity: 5,
                  note: 'Nhập kho demo',
                  referenceCode: null,
                  createdBy: null,
                },
              },
            },
          },
          responses: {
            '201': { description: 'Tạo giao dịch thành công' },
            '400': {
              description: 'Thiếu field, variantId/quantity/type không hợp lệ, hoặc tồn không đủ (INSUFFICIENT_STOCK)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '401': {
              description: 'Token',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '403': {
              description: 'Thiếu quyền inventory.adjust',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '404': {
              description: 'Không tìm thấy biến thể',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
          },
        },
      },
      '/api/inventory/transactions': {
        get: {
          security: [],
          tags: ['Inventory'],
          summary: 'Lấy danh sách giao dịch kho',
          parameters: [
            { name: 'variantId', in: 'query', schema: { type: 'integer' }, description: 'Lọc theo biến thể' },
            {
              name: 'transactionType',
              in: 'query',
              schema: { type: 'string', enum: ['IN', 'OUT', 'ADJUSTMENT'] },
            },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: { '200': { description: 'Thành công' } },
        },
        post: {
          security: [{ bearerAuth: [] }],
          tags: ['Inventory'],
          summary: 'Tạo giao dịch kho (IN/OUT/ADJUSTMENT)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['variantId', 'transactionType', 'quantity'],
                  properties: {
                    variantId: { type: 'integer', minimum: 1, example: 1 },
                    transactionType: { type: 'string', enum: ['IN', 'OUT', 'ADJUSTMENT'], example: 'IN' },
                    quantity: {
                      type: 'integer',
                      description: 'IN/OUT: số dương. ADJUSTMENT: tồn mục tiêu (≥ 0).',
                      example: 5,
                    },
                    note: { type: 'string', nullable: true },
                    referenceCode: { type: 'string', nullable: true },
                    createdBy: { type: 'string', nullable: true },
                  },
                },
                example: {
                  variantId: 1,
                  transactionType: 'IN',
                  quantity: 5,
                  note: null,
                  referenceCode: null,
                  createdBy: null,
                },
              },
            },
          },
          responses: {
            '201': { description: 'Tạo giao dịch thành công' },
            '400': {
              description: 'Thiếu field / không hợp lệ / tồn không đủ',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '401': {
              description: 'Token',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '403': {
              description: 'Thiếu quyền inventory.adjust',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
            '404': {
              description: 'Không tìm thấy biến thể',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
            },
          },
        },
      },
      '/api/products/{idOrSlug}/related': {
        get: {
          security: [],
          tags: ['Products'],
          summary: 'Lấy danh sách sản phẩm liên quan',
          parameters: [
            {
              name: 'idOrSlug',
              in: 'path',
              required: true,
              description: 'Sản phẩm gốc (id hoặc slug)',
              schema: { type: 'string', example: '10' },
            },
          ],
          responses: { '200': { description: 'Thành công' }, '404': { description: 'Không tìm thấy sản phẩm gốc' } },
        },
        post: {
          security: [{ bearerAuth: [] }],
          tags: ['Products'],
          summary: 'Thêm sản phẩm liên quan',
          parameters: [
            {
              name: 'idOrSlug',
              in: 'path',
              required: true,
              description: 'Sản phẩm gốc (id hoặc slug)',
              schema: { type: 'string', example: '10' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['relatedProductId'],
                  properties: {
                    relatedProductId: { type: 'integer', example: 1 },
                    relationType: {
                      type: 'string',
                      enum: ['RELATED', 'CROSS_SELL', 'UP_SELL'],
                      description: 'Mặc định RELATED nếu bỏ trống',
                    },
                    sortOrder: { type: 'integer', example: 0 },
                  },
                },
                example: { relatedProductId: 1, relationType: 'RELATED', sortOrder: 0 },
              },
            },
          },
          responses: {
            '200': { description: 'Thành công' },
            '400': { description: 'Thiếu relatedProductId' },
            '401': { description: 'Chưa đăng nhập / token hết hạn' },
            '403': { description: 'Thiếu quyền products.update' },
            '404': { description: 'Không tìm thấy sản phẩm gốc' },
          },
        },
        delete: {
          security: [{ bearerAuth: [] }],
          tags: ['Products'],
          summary: 'Xóa sản phẩm liên quan',
          parameters: [
            {
              name: 'idOrSlug',
              in: 'path',
              required: true,
              description: 'Sản phẩm gốc (id hoặc slug)',
              schema: { type: 'string', example: '10' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['relatedProductId'],
                  properties: {
                    relatedProductId: { type: 'integer', example: 1 },
                    relationType: {
                      type: 'string',
                      enum: ['RELATED', 'CROSS_SELL', 'UP_SELL'],
                      description: 'Bỏ trống = xóa mọi loại quan hệ với relatedProductId',
                    },
                  },
                },
                example: { relatedProductId: 1, relationType: 'RELATED' },
              },
            },
          },
          responses: {
            '200': { description: 'Thành công' },
            '400': { description: 'Thiếu relatedProductId' },
            '401': { description: 'Chưa đăng nhập / token hết hạn' },
            '403': { description: 'Thiếu quyền products.update' },
            '404': { description: 'Không tìm thấy sản phẩm gốc' },
          },
        },
      },
      '/api/cart': {
        get: {
          tags: ['Cart'],
          summary: 'Lấy giỏ hàng của người dùng hiện tại',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Thành công' },
            '401': { description: 'Chưa đăng nhập' },
          },
        },
        delete: {
          tags: ['Cart'],
          summary: 'Xóa item trong giỏ hàng',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    selectedOnly: { type: 'boolean', example: true },
                    itemIds: {
                      type: 'array',
                      items: { type: 'integer' },
                      example: [12, 15],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Xóa thành công' },
            '401': { description: 'Chưa đăng nhập' },
          },
        },
      },
      '/api/cart/items': {
        post: {
          tags: ['Cart'],
          summary: 'Thêm sản phẩm vào giỏ hàng',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['variantId', 'quantity'],
                  properties: {
                    variantId: { type: 'integer', example: 3 },
                    quantity: { type: 'integer', minimum: 1, example: 1 },
                    selected: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Thêm thành công' },
            '400': { description: 'Dữ liệu không hợp lệ hoặc không đủ tồn kho' },
            '401': { description: 'Chưa đăng nhập' },
          },
        },
      },
      '/api/cart/items/{itemId}': {
        patch: {
          tags: ['Cart'],
          summary: 'Cập nhật item trong giỏ hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    quantity: { type: 'integer', minimum: 1, example: 2 },
                    selected: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Cập nhật thành công' },
            '404': { description: 'Không tìm thấy cart item' },
          },
        },
        delete: {
          tags: ['Cart'],
          summary: 'Xóa một item khỏi giỏ hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Xóa thành công' },
            '404': { description: 'Không tìm thấy cart item' },
          },
        },
      },
      '/api/cart/select-all': {
        post: {
          tags: ['Cart'],
          summary: 'Chọn hoặc bỏ chọn toàn bộ item trong giỏ hàng',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    selected: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Cập nhật lựa chọn thành công' },
          },
        },
      },
      '/api/cart/select': {
        post: {
          tags: ['Cart'],
          summary: 'Chọn hoặc bỏ chọn một nhóm item trong giỏ hàng',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['itemIds', 'selected'],
                  properties: {
                    itemIds: {
                      type: 'array',
                      items: { type: 'integer' },
                      example: [12, 15],
                    },
                    selected: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Cập nhật lựa chọn thành công' },
            '400': { description: 'Thiếu itemIds' },
          },
        },
      },
      '/api/cart/validate': {
        post: {
          tags: ['Cart'],
          summary: 'Kiểm tra giỏ hàng trước khi checkout',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    itemIds: {
                      type: 'array',
                      items: { type: 'integer' },
                      example: [12, 15],
                    },
                    selectedOnly: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Kiểm tra thành công' },
            '400': { description: 'Giỏ hàng trống hoặc item không hợp lệ' },
          },
        },
      },
      '/api/cart/merge': {
        post: {
          tags: ['Cart'],
          summary: 'Gộp giỏ hàng guest vào giỏ hàng tài khoản sau đăng nhập',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items'],
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['variantId', 'quantity'],
                        properties: {
                          variantId: { type: 'integer', example: 3 },
                          quantity: { type: 'integer', minimum: 1, example: 2 },
                          selected: { type: 'boolean', example: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Gộp giỏ hàng thành công' },
            '400': { description: 'Dữ liệu giỏ hàng guest không hợp lệ' },
          },
        },
      },
      '/api/cart/checkout/preview': {
        post: {
          tags: ['Cart'],
          summary: 'Xem trước checkout từ giỏ hàng',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    itemIds: {
                      type: 'array',
                      items: { type: 'integer' },
                      description: 'Cart item ids. Nếu bỏ trống sẽ dùng các item đang selected = true.',
                      example: [12, 15],
                    },
                    paymentMethod: { type: 'string', example: 'E_WALLET' },
                    shippingFee: { type: 'number', example: 30000 },
                    discountAmount: { type: 'number', example: 10000 },
                    currencyCode: { type: 'string', example: 'VND' },
                  },
                },
                example: {
                  paymentMethod: 'E_WALLET',
                  shippingFee: 30000,
                  discountAmount: 10000,
                  currencyCode: 'VND',
                },
              },
            },
          },
          responses: {
            '200': { description: 'Tạo preview thành công' },
            '400': { description: 'Giỏ hàng trống' },
          },
        },
      },
      '/api/cart/checkout': {
        post: {
          tags: ['Cart'],
          summary: 'Checkout từ giỏ hàng, tạo order và payment nếu cần',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['paymentMethod', 'recipientName', 'recipientPhone', 'shippingAddress'],
                  properties: {
                    itemIds: {
                      type: 'array',
                      items: { type: 'integer' },
                      description: 'Cart item ids. Nếu bỏ trống sẽ dùng các item đang selected = true.',
                      example: [12, 15],
                    },
                    paymentMethod: { type: 'string', example: 'E_WALLET' },
                    recipientName: { type: 'string', example: 'Nguyễn Văn A' },
                    recipientPhone: { type: 'string', example: '0909123456' },
                    recipientEmail: { type: 'string', format: 'email', example: 'customer@example.com' },
                    shippingFee: { type: 'number', example: 30000 },
                    discountAmount: { type: 'number', example: 10000 },
                    shippingMethod: { type: 'string', example: 'Standard' },
                    customerNote: { type: 'string', example: 'Giao giờ hành chính' },
                    shippingAddress: {
                      type: 'object',
                      required: ['line1', 'district', 'province'],
                      properties: {
                        line1: { type: 'string', example: '123 Nguyễn Trãi' },
                        line2: { type: 'string', nullable: true, example: null },
                        ward: { type: 'string', example: 'Bến Thành' },
                        district: { type: 'string', example: 'Quận 1' },
                        province: { type: 'string', example: 'Hồ Chí Minh' },
                        postalCode: { type: 'string', example: '700000' },
                        country: { type: 'string', example: 'VN' },
                      },
                    },
                  },
                },
                example: {
                  paymentMethod: 'E_WALLET',
                  recipientName: 'Nguyễn Văn A',
                  recipientPhone: '0909123456',
                  recipientEmail: 'customer@example.com',
                  shippingFee: 30000,
                  discountAmount: 10000,
                  shippingMethod: 'Standard',
                  customerNote: 'Giao giờ hành chính',
                  shippingAddress: {
                    line1: '123 Nguyễn Trãi',
                    ward: 'Bến Thành',
                    district: 'Quận 1',
                    province: 'Hồ Chí Minh',
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Checkout thành công' },
            '400': { description: 'Dữ liệu không hợp lệ hoặc giỏ hàng trống' },
            '502': { description: 'Lỗi cổng thanh toán' },
          },
        },
      },
      '/api/admin/carts': {
        get: {
          tags: ['Cart'],
          summary: 'Danh sách giỏ hàng cho admin',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', example: 1 } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', example: 10 } },
            { name: 'search', in: 'query', required: false, schema: { type: 'string', example: 'customer@emp.local' } },
          ],
          responses: {
            '200': { description: 'Thành công' },
            '403': { description: 'Không có quyền' },
          },
        },
      },
      '/api/admin/carts/users/{userId}': {
        get: {
          tags: ['Cart'],
          summary: 'Chi tiết giỏ hàng của một user cho admin',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer', example: 5 } }],
          responses: {
            '200': { description: 'Thành công' },
            '404': { description: 'Không tìm thấy giỏ hàng' },
          },
        },
      },
      '/api/orders/my': {
        get: {
          tags: ['Orders'],
          summary: 'Danh sách đơn hàng của người dùng hiện tại',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', example: 1 } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', example: 10 } },
            { name: 'status', in: 'query', required: false, schema: { type: 'string', example: 'PENDING_PAYMENT' } },
            { name: 'search', in: 'query', required: false, schema: { type: 'string', example: 'ORD-20260407' } },
          ],
          responses: {
            '200': { description: 'Thành công' },
            '401': { description: 'Chưa đăng nhập' },
          },
        },
      },
      '/api/orders': {
        post: {
          tags: ['Orders'],
          summary: 'Tạo đơn hàng mới cho admin hoặc staff',
          security: [{ bearerAuth: [] }],
          description: 'Customer không tạo đơn trực tiếp ở đây. Customer dùng /api/cart/checkout.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items', 'paymentMethod', 'recipientName', 'recipientPhone', 'shippingAddress'],
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['variantId', 'quantity'],
                        properties: {
                          variantId: { type: 'integer', example: 3 },
                          quantity: { type: 'integer', example: 2 },
                        },
                      },
                    },
                    paymentMethod: { type: 'string', example: 'E_WALLET' },
                    recipientName: { type: 'string', example: 'Nguyễn Văn A' },
                    recipientPhone: { type: 'string', example: '0909123456' },
                    recipientEmail: { type: 'string', format: 'email', example: 'customer@example.com' },
                    shippingFee: { type: 'number', example: 30000 },
                    discountAmount: { type: 'number', example: 10000 },
                    shippingMethod: { type: 'string', example: 'Standard' },
                    note: { type: 'string', example: 'Tạo đơn tại quầy' },
                    customerNote: { type: 'string', example: 'Giao giờ hành chính' },
                    adminNote: { type: 'string', example: 'Đơn do admin tạo' },
                    shippingCarrier: { type: 'string', nullable: true, example: null },
                    trackingNumber: { type: 'string', nullable: true, example: null },
                    shippingAddress: {
                      type: 'object',
                      required: ['line1', 'district', 'province'],
                      properties: {
                        line1: { type: 'string', example: '123 Nguyễn Trãi' },
                        line2: { type: 'string', nullable: true, example: null },
                        ward: { type: 'string', example: 'Bến Thành' },
                        district: { type: 'string', example: 'Quận 1' },
                        province: { type: 'string', example: 'Hồ Chí Minh' },
                        postalCode: { type: 'string', example: '700000' },
                        country: { type: 'string', example: 'VN' },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Tạo đơn thành công' },
            '403': { description: 'Customer phải dùng cart checkout' },
          },
        },
      },
      '/api/orders/{idOrCode}': {
        get: {
          tags: ['Orders'],
          summary: 'Chi tiết đơn hàng theo id hoặc order code',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'idOrCode', in: 'path', required: true, schema: { type: 'string', example: 'ORD-20260407-151000-923497' } }],
          responses: {
            '200': { description: 'Thành công' },
            '404': { description: 'Không tìm thấy đơn hàng' },
          },
        },
      },
      '/api/orders/{idOrCode}/status': {
        get: {
          tags: ['Orders'],
          summary: 'Xem trạng thái đơn hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'idOrCode', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Thành công' },
          },
        },
      },
      '/api/orders/{idOrCode}/timeline': {
        get: {
          tags: ['Orders'],
          summary: 'Xem timeline lịch sử đơn hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'idOrCode', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Thành công' },
          },
        },
      },
      '/api/orders/{idOrCode}/invoice': {
        get: {
          tags: ['Orders'],
          summary: 'Lấy hóa đơn của đơn hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'idOrCode', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Thành công' },
          },
        },
      },
      '/api/orders/{idOrCode}/reorder': {
        post: {
          tags: ['Orders'],
          summary: 'Mua lại đơn hàng, thêm lại sản phẩm vào giỏ hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'idOrCode', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Thêm lại vào giỏ hàng thành công' },
            '400': { description: 'Có item không thể mua lại' },
          },
        },
      },
      '/api/orders/{idOrCode}/cancel': {
        post: {
          tags: ['Orders'],
          summary: 'Hủy đơn hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'idOrCode', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reasonCode: { type: 'string', example: 'CHANGE_MIND' },
                    reason: { type: 'string', example: 'Không muốn mua nữa' },
                    detail: { type: 'string', example: 'Đặt nhầm size' },
                    note: { type: 'string', example: 'Hủy sớm giúp' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Hủy đơn thành công' },
            '403': { description: 'Không được phép hủy đơn ở trạng thái hiện tại' },
          },
        },
      },
      '/api/orders/{idOrCode}/complete': {
        post: {
          tags: ['Orders'],
          summary: 'Hoàn tất đơn hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'idOrCode', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    note: { type: 'string', example: 'Đã nhận hàng đầy đủ' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Hoàn tất đơn thành công' },
            '400': { description: 'Đơn chưa ở trạng thái DELIVERED' },
          },
        },
      },
      '/api/orders/{idOrCode}/returns/request': {
        post: {
          tags: ['Orders'],
          summary: 'Gửi yêu cầu trả hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'idOrCode', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reasonCode: { type: 'string', example: 'DAMAGED' },
                    reason: { type: 'string', example: 'Sản phẩm lỗi' },
                    detail: { type: 'string', example: 'Bị rách đường may' },
                    note: { type: 'string', example: 'Cần đổi trả' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Gửi yêu cầu trả hàng thành công' },
            '400': { description: 'Đơn không thể trả hàng' },
          },
        },
      },
      '/api/admin/orders/export': {
        get: {
          tags: ['Orders'],
          summary: 'Admin export danh sách đơn hàng CSV',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'search', in: 'query', required: false, schema: { type: 'string', example: 'ORD-20260407' } },
            { name: 'status', in: 'query', required: false, schema: { type: 'string', example: 'PENDING_PAYMENT' } },
            { name: 'paymentStatus', in: 'query', required: false, schema: { type: 'string', example: 'UNPAID' } },
            { name: 'fulfillmentStatus', in: 'query', required: false, schema: { type: 'string', example: 'UNFULFILLED' } },
            { name: 'paymentMethod', in: 'query', required: false, schema: { type: 'string', example: 'E_WALLET' } },
            { name: 'userId', in: 'query', required: false, schema: { type: 'integer', example: 5 } },
            { name: 'createdFrom', in: 'query', required: false, schema: { type: 'string', example: '2026-04-01' } },
            { name: 'createdTo', in: 'query', required: false, schema: { type: 'string', example: '2026-04-07' } },
          ],
          responses: {
            '200': { description: 'Export thành công' },
          },
        },
      },
      '/api/admin/orders': {
        get: {
          tags: ['Orders'],
          summary: 'Danh sách đơn hàng cho admin',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', example: 1 } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', example: 10 } },
            { name: 'search', in: 'query', required: false, schema: { type: 'string', example: 'customer@emp.local' } },
            { name: 'status', in: 'query', required: false, schema: { type: 'string', example: 'PENDING_PAYMENT' } },
            { name: 'paymentStatus', in: 'query', required: false, schema: { type: 'string', example: 'UNPAID' } },
            { name: 'fulfillmentStatus', in: 'query', required: false, schema: { type: 'string', example: 'UNFULFILLED' } },
            { name: 'paymentMethod', in: 'query', required: false, schema: { type: 'string', example: 'E_WALLET' } },
            { name: 'userId', in: 'query', required: false, schema: { type: 'integer', example: 5 } },
          ],
          responses: {
            '200': { description: 'Thành công' },
            '403': { description: 'Không có quyền' },
          },
        },
      },
      '/api/admin/orders/returns': {
        get: {
          tags: ['Orders'],
          summary: 'Danh sách yêu cầu trả hàng cho admin',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', example: 1 } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', example: 10 } },
            { name: 'search', in: 'query', required: false, schema: { type: 'string', example: 'ORD-20260407' } },
          ],
          responses: {
            '200': { description: 'Thành công' },
          },
        },
      },
      '/api/admin/orders/returns/{returnId}': {
        get: {
          tags: ['Orders'],
          summary: 'Chi tiết yêu cầu trả hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'returnId', in: 'path', required: true, schema: { type: 'integer', example: 3 } }],
          responses: {
            '200': { description: 'Thành công' },
            '404': { description: 'Không tìm thấy yêu cầu trả hàng' },
          },
        },
      },
      '/api/admin/orders/{orderId}': {
        get: {
          tags: ['Orders'],
          summary: 'Xem chi tiết bất kỳ đơn hàng nào',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string', example: 'ORD-20260407-151000-923497' } }],
          responses: {
            '200': { description: 'Thành công' },
            '404': { description: 'Không tìm thấy đơn hàng' },
          },
        },
      },
      '/api/admin/orders/{orderId}/status': {
        patch: {
          tags: ['Orders'],
          summary: 'Cập nhật trạng thái đơn hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: { type: 'string', example: 'PACKED' },
                    note: { type: 'string', example: 'Đã đóng gói xong' },
                    adminNote: { type: 'string', example: 'Ưu tiên giao nhanh' },
                    shippingCarrier: { type: 'string', example: 'GHN' },
                    trackingNumber: { type: 'string', example: 'TRACK123456' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Cập nhật trạng thái thành công' },
            '400': { description: 'Trạng thái không hợp lệ hoặc chuyển trạng thái sai' },
          },
        },
      },
      '/api/admin/orders/{orderId}/confirm': {
        post: {
          tags: ['Orders'],
          summary: 'Xác nhận đơn hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    note: { type: 'string', example: 'Đơn đã được xác nhận' },
                    adminNote: { type: 'string', example: 'Gọi khách trước khi giao' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Xác nhận đơn thành công' },
          },
        },
      },
      '/api/admin/orders/{orderId}/complete': {
        post: {
          tags: ['Orders'],
          summary: 'Admin hoàn tất đơn hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    note: { type: 'string', example: 'Admin xác nhận hoàn tất' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Hoàn tất đơn thành công' },
          },
        },
      },
      '/api/admin/orders/{orderId}/cancel': {
        post: {
          tags: ['Orders'],
          summary: 'Admin hủy đơn hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reason: { type: 'string', example: 'Khách yêu cầu hủy' },
                    note: { type: 'string', example: 'Đã xác nhận với khách' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Hủy đơn thành công' },
          },
        },
      },
      '/api/admin/orders/{orderId}/refund': {
        post: {
          tags: ['Orders'],
          summary: 'Xử lý hoàn tiền đơn hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    note: { type: 'string', example: 'Hoàn tiền thủ công' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Hoàn tiền thành công' },
            '400': { description: 'Đơn không thể hoàn tiền' },
          },
        },
      },
      '/api/admin/orders/{orderId}/return/approve': {
        post: {
          tags: ['Orders'],
          summary: 'Duyệt yêu cầu trả hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    note: { type: 'string', example: 'Đồng ý nhận trả hàng' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Duyệt trả hàng thành công' },
          },
        },
      },
      '/api/admin/orders/{orderId}/return/reject': {
        post: {
          tags: ['Orders'],
          summary: 'Từ chối yêu cầu trả hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    note: { type: 'string', example: 'Không đủ điều kiện trả hàng' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Từ chối trả hàng thành công' },
          },
        },
      },
      '/api/payments': {
        get: {
          tags: ['Payments'],
          summary: 'Danh sách thanh toán cho admin',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', example: 1 } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', example: 10 } },
            { name: 'search', in: 'query', required: false, schema: { type: 'string', example: 'PAY-20260407' } },
            { name: 'status', in: 'query', required: false, schema: { type: 'string', example: 'PENDING' } },
            { name: 'provider', in: 'query', required: false, schema: { type: 'string', example: 'PAYOS' } },
            { name: 'paymentMethod', in: 'query', required: false, schema: { type: 'string', example: 'E_WALLET' } },
          ],
          responses: {
            '200': { description: 'Thành công' },
            '403': { description: 'Không có quyền' },
          },
        },
      },
      '/api/payments/methods': {
        get: {
          tags: ['Payments'],
          summary: 'Danh sách phương thức thanh toán khả dụng',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Thành công' },
          },
        },
      },
      '/api/payments/orders/{idOrCode}': {
        get: {
          tags: ['Payments'],
          summary: 'Lấy các lần thanh toán theo đơn hàng',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'idOrCode', in: 'path', required: true, schema: { type: 'string', example: 'ORD-20260407-151000-923497' } }],
          responses: {
            '200': { description: 'Thành công' },
            '404': { description: 'Không tìm thấy đơn hàng' },
          },
        },
      },
      '/api/payments/orders/{idOrCode}/checkout': {
        post: {
          tags: ['Payments'],
          summary: 'Tạo link thanh toán cho đơn hàng có sẵn',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'idOrCode', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    recipientName: { type: 'string', example: 'Nguyễn Văn A' },
                    recipientPhone: { type: 'string', example: '0909123456' },
                    recipientEmail: { type: 'string', format: 'email', example: 'customer@example.com' },
                    returnUrl: { type: 'string', example: 'http://localhost:8000/api/payments/return' },
                    cancelUrl: { type: 'string', example: 'http://localhost:5173/checkout/cancel' },
                    shippingAddress: {
                      type: 'object',
                      properties: {
                        line1: { type: 'string', example: '123 Nguyễn Trãi' },
                        ward: { type: 'string', example: 'Bến Thành' },
                        district: { type: 'string', example: 'Quận 1' },
                        province: { type: 'string', example: 'Hồ Chí Minh' },
                      },
                    },
                  },
                },
                example: {
                  returnUrl: 'http://localhost:8000/api/payments/return',
                  cancelUrl: 'http://localhost:5173/checkout/cancel',
                },
              },
            },
          },
          responses: {
            '201': { description: 'Tạo checkout thành công' },
            '400': { description: 'Đơn không thể tạo thanh toán' },
            '502': { description: 'Lỗi cổng thanh toán' },
          },
        },
      },
      '/api/payments/orders/{idOrCode}/retry': {
        post: {
          tags: ['Payments'],
          summary: 'Tạo lại link thanh toán cho đơn hàng cũ',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'idOrCode', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    recipientName: { type: 'string', example: 'Nguyễn Văn A' },
                    recipientPhone: { type: 'string', example: '0909123456' },
                    recipientEmail: { type: 'string', format: 'email', example: 'customer@example.com' },
                    returnUrl: { type: 'string', example: 'http://localhost:8000/api/payments/return' },
                    cancelUrl: { type: 'string', example: 'http://localhost:5173/checkout/cancel' },
                    shippingAddress: {
                      type: 'object',
                      properties: {
                        line1: { type: 'string', example: '123 Nguyễn Trãi' },
                        ward: { type: 'string', example: 'Bến Thành' },
                        district: { type: 'string', example: 'Quận 1' },
                        province: { type: 'string', example: 'Hồ Chí Minh' },
                      },
                    },
                  },
                },
                example: {
                  returnUrl: 'http://localhost:8000/api/payments/return',
                  cancelUrl: 'http://localhost:5173/checkout/cancel',
                },
              },
            },
          },
          responses: {
            '200': { description: 'Tạo lại checkout thành công' },
            '400': { description: 'Đơn không thể retry thanh toán' },
            '502': { description: 'Lỗi cổng thanh toán' },
          },
        },
      },
      '/api/payments/callbacks/payos': {
        post: {
          tags: ['Payments'],
          summary: 'Webhook callback từ PayOS',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: '00' },
                    desc: { type: 'string', example: 'success' },
                    success: { type: 'boolean', example: true },
                    data: { type: 'object', additionalProperties: true },
                    signature: { type: 'string', example: 'abc123' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Đã nhận callback' },
          },
        },
      },
      '/api/payments/return': {
        get: {
          tags: ['Payments'],
          summary: 'Xử lý return URL từ PayOS sau khi người dùng thanh toán',
          description: 'Các query param ở đây là dữ liệu PayOS trả về. code không phải payment_code nội bộ, id là paymentLinkId hoặc gateway_transaction_id, còn orderCode là PayOS orderCode hoặc gateway_reference.',
          parameters: [
            { name: 'code', in: 'query', required: false, schema: { type: 'string', example: '00' }, description: 'Mã kết quả do PayOS trả về' },
            { name: 'id', in: 'query', required: false, schema: { type: 'string', example: '082056c5dc8846dd8ea78e2f7d5b2d6c' }, description: 'PayOS paymentLinkId, map với gateway_transaction_id' },
            { name: 'cancel', in: 'query', required: false, schema: { type: 'boolean', example: false } },
            { name: 'status', in: 'query', required: false, schema: { type: 'string', example: 'PENDING' }, description: 'Trạng thái do PayOS trả về như PENDING hoặc PAID' },
            { name: 'orderCode', in: 'query', required: false, schema: { type: 'string', example: '1775549400585010' }, description: 'PayOS orderCode, map với gateway_reference' },
            { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json'], example: 'json' }, description: 'Gửi format=json nếu muốn API trả JSON thay vì redirect frontend result' },
          ],
          responses: {
            '200': { description: 'Xử lý return thành công' },
            '400': { description: 'Query return không hợp lệ' },
          },
        },
      },
      '/api/payments/{paymentCode}': {
        get: {
          tags: ['Payments'],
          summary: 'Chi tiết một giao dịch thanh toán',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'paymentCode', in: 'path', required: true, schema: { type: 'string', example: 'PAY-20260407-151000-521373' } }],
          responses: {
            '200': { description: 'Thành công' },
            '404': { description: 'Không tìm thấy payment' },
          },
        },
      },
      '/api/payments/{paymentCode}/sync': {
        post: {
          tags: ['Payments'],
          summary: 'Đồng bộ trạng thái thanh toán từ PayOS',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'paymentCode', in: 'path', required: true, schema: { type: 'string', example: 'PAY-20260407-151000-521373' } }],
          responses: {
            '200': { description: 'Đồng bộ thành công' },
            '404': { description: 'Không tìm thấy payment' },
          },
        },
      },
      '/api/payments/{paymentCode}/cancel': {
        post: {
          tags: ['Payments'],
          summary: 'Hủy giao dịch thanh toán',
          description: 'Hủy payment đang PENDING/PROCESSING. Với PayOS, server gọi API cancel payment link rồi cập nhật payment sang CANCELLED.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'paymentCode', in: 'path', required: true, schema: { type: 'string', example: 'PAY-20260407-151000-521373' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cancelReason: { type: 'string', example: 'Khách hàng đổi ý không thanh toán nữa' },
                    cancellationReason: { type: 'string', example: 'Customer cancelled payment' },
                    note: { type: 'string', example: 'Customer cancelled payment from payment page' },
                  },
                },
                example: {
                  cancelReason: 'Khách hàng đổi ý không thanh toán nữa',
                  note: 'Customer cancelled payment from payment page',
                },
              },
            },
          },
          responses: {
            '200': { description: 'Hủy giao dịch thành công' },
            '400': { description: 'Giao dịch không thể hủy hoặc PayOS không cho hủy' },
            '401': { description: 'Chưa đăng nhập hoặc token không hợp lệ' },
            '404': { description: 'Không tìm thấy payment' },
            '502': { description: 'Lỗi cổng thanh toán PayOS' },
          },
        },
      },
      '/api/reviews': {
        post: {
          tags: ['Reviews'],
          summary: '1. Tạo đánh giá',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['productId', 'rating', 'content'],
                  properties: {
                    productId: { type: 'integer', example: 1 },
                    rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                    title: { type: 'string', example: 'Rất tốt' },
                    content: { type: 'string', example: 'Đi rất êm' },
                    images: { type: 'array', items: { oneOf: [{ type: 'integer' }, { type: 'string' }] }, example: [] },
                    orderId: { type: 'integer', nullable: true },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'PENDING — chờ duyệt' }, '401': { description: 'Unauthorized' }, '409': { description: 'Đã đánh giá' } },
        },
      },
      '/api/reviews/upload': {
        post: {
          tags: ['Reviews', 'Upload'],
          summary: '9. Upload ảnh review (trước khi tạo review)',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    images: { type: 'array', items: { type: 'string', format: 'binary' } },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Trả về danh sách { id, url }' } },
        },
      },
      '/api/reviews/{reviewId}': {
        get: {
          security: [],
          tags: ['Reviews'],
          summary: '3. Chi tiết review',
          parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
        },
        put: {
          tags: ['Reviews'],
          summary: '4. Cập nhật review',
          parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rating: { type: 'integer', minimum: 1, maximum: 5 },
                    title: { type: 'string' },
                    content: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'OK — chuyển PENDING' } },
        },
        delete: {
          tags: ['Reviews'],
          summary: '5. Xóa review',
          parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/reviews/{reviewId}/like': {
        post: {
          tags: ['Reviews'],
          summary: '6. Like review',
          parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' } },
        },
        delete: {
          tags: ['Reviews'],
          summary: '7. Bỏ like review',
          parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/reviews/{reviewId}/images/{imageId}': {
        delete: {
          tags: ['Reviews'],
          summary: '10. Xóa ảnh review',
          parameters: [
            { name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'imageId', in: 'path', required: true, schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/products/{productId}/reviews': {
        get: {
          security: [],
          tags: ['Reviews'],
          summary: '2. Danh sách review sản phẩm',
          parameters: [
            { name: 'productId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest', 'rating_high', 'rating_low'] } },
            { name: 'rating', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 5 } },
            { name: 'hasImage', in: 'query', schema: { type: 'boolean' } },
            { name: 'verified', in: 'query', schema: { type: 'boolean' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/products/{productId}/reviews/statistics': {
        get: {
          security: [],
          tags: ['Reviews'],
          summary: '12. Thống kê review sản phẩm',
          parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      average: { type: 'number', example: 4.8 },
                      total: { type: 'integer', example: 100 },
                      star: {
                        type: 'object',
                        properties: {
                          '1': { type: 'integer' },
                          '2': { type: 'integer' },
                          '3': { type: 'integer' },
                          '4': { type: 'integer' },
                          '5': { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/users/me/reviews': {
        get: {
          tags: ['Reviews'],
          summary: '11. Review của user đăng nhập',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/admin/reviews/statistics': {
        get: {
          tags: ['Reviews'],
          summary: '29. Admin — thống kê review',
          responses: { '200': { description: 'total, pending, approved, rejected, hidden' } },
        },
      },
      '/api/admin/reviews': {
        get: {
          tags: ['Reviews'],
          summary: '24. Admin — danh sách review',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'hidden', 'PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'] } },
            { name: 'productId', in: 'query', schema: { type: 'integer' } },
            { name: 'rating', in: 'query', schema: { type: 'integer' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/admin/reviews/{reviewId}': {
        get: {
          tags: ['Reviews'],
          summary: 'Admin — chi tiết review',
          parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' } },
        },
        delete: {
          tags: ['Reviews'],
          summary: '28. Admin — xóa review',
          parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/admin/reviews/{reviewId}/hide': {
        patch: {
          tags: ['Reviews'],
          summary: '27. Admin — ẩn review',
          parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { adminNote: { type: 'string' } } },
              },
            },
          },
          responses: { '200': { description: 'HIDDEN' } },
        },
      },
      '/api/comments': {
        post: {
          tags: ['Comments'],
          summary: '13. Tạo comment',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['productId', 'content'],
                  properties: {
                    productId: { type: 'integer', example: 1 },
                    content: { type: 'string', example: 'Còn hàng không?' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'OK' } },
        },
      },
      '/api/comments/reply': {
        post: {
          tags: ['Comments'],
          summary: '14. Reply comment',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['parentId', 'content'],
                  properties: {
                    parentId: { type: 'integer', example: 10 },
                    content: { type: 'string', example: 'Có nhé' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'OK' } },
        },
      },
      '/api/comments/mention': {
        post: {
          tags: ['Comments'],
          summary: '23. Mention user trong comment',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['commentId', 'userId'],
                  properties: {
                    commentId: { type: 'integer', example: 10 },
                    userId: { type: 'integer', example: 20 },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/products/{productId}/comments': {
        get: {
          security: [],
          tags: ['Comments'],
          summary: '15. Danh sách comment sản phẩm',
          parameters: [
            { name: 'productId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest'] } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/comments/{commentId}': {
        get: {
          security: [],
          tags: ['Comments'],
          summary: '16. Chi tiết comment',
          parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' } },
        },
        put: {
          tags: ['Comments'],
          summary: '18. Sửa comment',
          parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: { content: { type: 'string' } },
                },
              },
            },
          },
          responses: { '200': { description: 'OK' } },
        },
        delete: {
          tags: ['Comments'],
          summary: '19. Xóa comment',
          parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/comments/{commentId}/replies': {
        get: {
          security: [],
          tags: ['Comments'],
          summary: '17. Danh sách reply',
          parameters: [
            { name: 'commentId', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/comments/{commentId}/like': {
        post: {
          tags: ['Comments'],
          summary: '20. Like comment',
          parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' } },
        },
        delete: {
          tags: ['Comments'],
          summary: '21. Bỏ like comment',
          parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/admin/comments': {
        get: {
          tags: ['Comments'],
          summary: '30. Admin — danh sách comment',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/admin/comments/{commentId}/hide': {
        patch: {
          tags: ['Comments'],
          summary: '31. Admin — ẩn comment',
          parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'HIDDEN' } },
        },
      },
      '/api/admin/comments/{commentId}/show': {
        patch: {
          tags: ['Comments'],
          summary: '32. Admin — hiện comment',
          parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'VISIBLE' } },
        },
      },
      '/api/admin/comments/{commentId}': {
        delete: {
          tags: ['Comments'],
          summary: '33. Admin — xóa comment',
          parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/notifications': {
        get: {
          tags: ['Notifications'],
          summary: '36. Danh sách thông báo',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/notifications/read-all': {
        patch: {
          tags: ['Notifications'],
          summary: '38. Đọc tất cả thông báo',
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/notifications/{id}/read': {
        patch: {
          tags: ['Notifications'],
          summary: '37. Đọc một thông báo',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/public/revision': {
        get: {
          security: [],
          tags: ['Public'],
          summary: 'Revision nội dung shop (client poll để reload)',
          description:
            'Số revision tăng khi admin thay đổi sản phẩm, marketing, khuyến mãi, cài đặt shop, v.v.',
          responses: {
            '200': {
              description: 'Thành công',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          revision: { type: 'integer', example: 42 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/public/shop-settings': {
        get: {
          security: [],
          tags: ['Public'],
          summary: 'Cài đặt cửa hàng (public)',
          description:
            'Trả về cấu hình hiển thị trên shop: tên, logo, hotline, phí ship, cổng thanh toán bật/tắt, chính sách, feature flags.',
          responses: {
            '200': {
              description: 'Thành công',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Shop settings fetched' },
                      data: { $ref: '#/components/schemas/ShopSettings' },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Lỗi server',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ApiError' } },
              },
            },
          },
        },
      },
      '/api/admin/settings': {
        get: {
          tags: ['Settings'],
          summary: 'Xem cài đặt cửa hàng (admin)',
          description: 'Yêu cầu role ADMIN/SUPER_ADMIN và quyền `settings.view`.',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Thành công',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Shop settings fetched' },
                      data: { $ref: '#/components/schemas/ShopSettings' },
                    },
                  },
                },
              },
            },
            '401': { description: 'Chưa đăng nhập' },
            '403': { description: 'Không có quyền settings.view' },
          },
        },
        patch: {
          tags: ['Settings'],
          summary: 'Cập nhật cài đặt cửa hàng (admin)',
          description:
            'Yêu cầu quyền `settings.manage`. Phải bật ít nhất một cổng thanh toán (PayOS hoặc ZaloPay). Sau khi lưu, public revision tăng để client shop reload.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ShopSettingsInput' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Cập nhật thành công',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Shop settings updated' },
                      data: { $ref: '#/components/schemas/ShopSettings' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Dữ liệu không hợp lệ (thiếu tên shop, logo, hoặc tắt hết cổng thanh toán)',
            },
            '401': { description: 'Chưa đăng nhập' },
            '403': { description: 'Không có quyền settings.manage' },
          },
        },
      },
      '/api/upload': {
        post: {
          tags: ['Upload'],
          summary: '39. Upload ảnh (chung)',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    images: { type: 'array', items: { type: 'string', format: 'binary' } },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'files: [{ id, url }]' } },
        },
      },
      '/api/upload/{id}': {
        delete: {
          tags: ['Upload'],
          summary: '40. Xóa ảnh đã upload',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' } },
        },
      },
      ...swaggerExtensionPaths,
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);

