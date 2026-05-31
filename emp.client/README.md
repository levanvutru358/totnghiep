# EMP Client (Website)

Giao diện người dùng (frontend) cho EMP Ecommerce, UI theo phong cách Tiki.

## Công nghệ sử dụng

- **React + TypeScript**
- **Vite**
- **Chakra UI v2** + **Chakra Icons**
- **Tailwind CSS**
- **React Router**
- **Framer Motion**
- **Swiper** (carousel)
- **Google OAuth**: `@react-oauth/google`
- **Facebook JS SDK** (đăng nhập Facebook)

## Yêu cầu môi trường

- **Node.js**: khuyến nghị >= 18
- **pnpm** (khuyến nghị) hoặc npm

## Cấu hình môi trường

Tạo file `.env` (copy từ `.env.example`):

```bash
cp .env.example .env
```

Các biến thường dùng:

- **VITE_GOOGLE_CLIENT_ID**: Google OAuth client id
- **VITE_FACEBOOK_APP_ID**: Facebook App ID

## Cài đặt & chạy dự án

Từ thư mục `emp.client`:

```bash
pnpm install
pnpm dev
```

## Build / Preview

```bash
pnpm build
pnpm preview
```

## Lưu ý khi làm việc nhóm

- **Không commit** `.env` thật. Chỉ update `.env.example` khi thêm biến mới.
- Nếu social login không hoạt động:
  - kiểm tra `.env` đã set `VITE_GOOGLE_CLIENT_ID` / `VITE_FACEBOOK_APP_ID`
  - kiểm tra cấu hình callback URL/authorized origin trong Google/Facebook console

