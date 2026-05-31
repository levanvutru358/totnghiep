# EMP Admin (Dashboard quản trị)

Giao diện quản trị cho EMP Ecommerce (quản lý sản phẩm, danh mục, tồn kho, dashboard...).

## Công nghệ sử dụng

- **React + TypeScript**
- **Vite**
- **Chakra UI v2** + **Chakra Icons**
- **Tailwind CSS**
- **React Router**
- **React Query**
- **Axios**
- **Framer Motion**
- **Recharts** (dashboard charts)

## Yêu cầu môi trường

- **Node.js**: khuyến nghị >= 18
- **pnpm** (khuyến nghị) hoặc npm

## Cấu hình môi trường

Tạo file `.env` (copy từ `.env.example`):

```bash
cp .env.example .env
```

Biến quan trọng:

- **VITE_API_URL**: base URL của backend, ví dụ: `http://localhost:8000/api`

## Cài đặt & chạy dự án

Từ thư mục `emp.admin`:

```bash
pnpm install
pnpm dev
```

Mặc định Vite sẽ chạy ở một port local (thường `5173`).

## Build / Preview

```bash
pnpm build
pnpm preview
```

## Lưu ý khi làm việc nhóm

- **Không commit** file `.env` thật. Chỉ update `.env.example` khi có biến môi trường mới.
- Nếu gặp lỗi gọi API:
  - kiểm tra `VITE_API_URL`
  - kiểm tra backend (`emp.server`) đang chạy đúng port (`8000`)
