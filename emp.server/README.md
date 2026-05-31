# EMP Server (Backend)

Backend API cho hệ thống EMP Ecommerce.

## Công nghệ sử dụng

- **Node.js + TypeScript**
- **Express**
- **MySQL** (`mysql2/promise`)
- **Swagger**: tài liệu & thử API trên trình duyệt — [Swagger UI (dev)](http://localhost:8000/api-docs) (đường dẫn: `/api-docs`; nếu đổi `PORT` trong `.env` thì thay `8000` bằng port đó)
- **Migrations (SQL)**: chạy tự động khi start server (`src/db/migrate.ts`)

## Yêu cầu môi trường

- **Node.js**: khuyến nghị >= 18
- **pnpm** (khuyến nghị) hoặc npm
- **MySQL**: khuyến nghị 8.x

## Cấu hình môi trường

Tạo file `.env` (copy từ `.env.example`):

```bash
cp .env.example .env
```

Các biến quan trọng:

- **PORT**: port chạy server (mặc định `8000` nếu không set)
- **DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME**: cấu hình MySQL
- **CLOUDINARY_***: (tuỳ chọn) upload ảnh

## Cài đặt & chạy dự án

Từ thư mục `emp.server`:

```bash
pnpm install
pnpm dev
```

Server sẽ chạy tại (mặc định port `8000`):
- **Swagger** (mở để test): [http://localhost:8000/api-docs](http://localhost:8000/api-docs)

## Migrations / Seed data

- Khi chạy `pnpm dev`/`pnpm start`, server sẽ **tự chạy migrations** (xem `index.ts` gọi `runMigrations()`).
- File migrations đặt tại `src/db/migrations/*.up.sql`.
- Seed dev data hiện có trong `src/db/migrations/002_seed_dev_data.up.sql`.

Lưu ý:

- **Không sửa** nội dung các migration đã apply (hệ thống có kiểm tra checksum).
- Viết migration mới theo format `NNN_ten_mo_ta.up.sql` và đảm bảo idempotent nếu cần chạy lại.

## Troubleshooting nhanh

- **Không kết nối DB**: kiểm tra `.env` và MySQL đang chạy, đúng `DB_PORT` (MySQL thường `3306`).
- **Admin gọi sai base URL**: đảm bảo `emp.admin/.env` set `VITE_API_URL=http://localhost:8000/api`.

