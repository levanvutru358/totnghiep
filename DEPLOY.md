# Hướng dẫn deploy EMP Shop

Có **2 cách**:

| Cách | Nền tảng | Phù hợp |
|------|----------|---------|
| **A. Một cloud** | **Railway** hoặc **DigitalOcean App Platform** | Đơn giản, một tài khoản |
| **B. Tách cloud** | Vercel + Railway + Render | Frontend CDN nhanh, miễn phí nhiều tier |

---

# Cách A — Tất cả trên Railway (khuyến nghị “1 cloud”)

**Hướng dẫn chi tiết từng click:** xem **[RAILWAY.md](./RAILWAY.md)** hoặc **[DIGITALOCEAN.md](./DIGITALOCEAN.md)**.

**Được.** Railway chạy cùng lúc: MySQL + API Node + chatbot Python + 2 frontend Vite.

```
GitHub repo
└── Railway Project
    ├── MySQL          (database)
    ├── emp-server     (Node API, port $PORT)
    ├── chatbot        (Python FastAPI)
    ├── emp-client     (Vite build → serve static)
    └── emp-admin      (Vite build → serve static)
```

## A1. Tạo project

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Thêm **MySQL** (Add Service → Database → MySQL)

## A2. Service `emp.server`

| Setting | Giá trị |
|---------|---------|
| Root Directory | `emp.server` |
| Build | `npm install && npm run build` |
| Start | `npm run start:prod` |

Biến môi trường: `DB_*` (link MySQL), `JWT_ACCESS_SECRET`, `CLOUDINARY_*`, `PAYOS_*`, …

Sau deploy → copy URL, vd `https://emp-server-production.up.railway.app`

```
SERVER_PUBLIC_URL=https://emp-server-production.up.railway.app
CORS_ORIGIN=https://emp-client-production.up.railway.app,https://emp-admin-production.up.railway.app
```

(Cập nhật `CORS_ORIGIN` sau khi có URL client/admin.)

## A3. Service `chatbot`

| Setting | Giá trị |
|---------|---------|
| Root Directory | `chatbot` |
| Build | `pip install -r requirements.txt` |
| Start | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Biến: `DB_*`, `GEMINI_API_KEY`, `JWT_ACCESS_SECRET` (giống server), `CHATBOT_REQUIRE_AUTH=true`, `CORS_ORIGINS`, `SHOP_URL`.

**Volume:** gắn disk vào `/app/data` (hoặc path chứa `chatbot.db`) để SQLite không mất.

## A4. Service `emp.client` (static)

| Setting | Giá trị |
|---------|---------|
| Root Directory | `emp.client` |
| Build | `npm install && npm run build` |
| Start | `npx serve -s dist -l $PORT` |

Thêm `serve` vào dependencies hoặc dùng `npx serve` (tải lúc chạy).

**Environment (build time):**

```
VITE_API_URL=https://<URL-emp-server>/api
VITE_CHATBOT_URL=https://<URL-chatbot>
```

## A5. Service `emp.admin` (static)

Giống client, Root = `emp.admin`, chỉ cần:

```
VITE_API_URL=https://<URL-emp-server>/api
```

## A6. Nối URL lần cuối

1. Lấy 4 URL Railway (server, chatbot, client, admin)
2. Sửa `CORS_ORIGIN`, `CORS_ORIGINS`, `SHOP_URL`, `APP_PUBLIC_URL`
3. Sửa `VITE_*` trên client/admin → **Redeploy** 2 service frontend

## A7. Giới hạn Railway

- Gói free/credit có hạn — đủ demo đồ án.
- 5 service + MySQL tốn credit nhanh hơn 1 service.
- Không bắt buộc domain riêng — subdomain `*.up.railway.app` dùng được.

### Thay Railway bằng 1 VPS (cũng “1 cloud”)

Thuê **DigitalOcean / Hetzner** (~$5–6/tháng), cài Docker, chạy MySQL + 4 container — một máy, một nhà cung cấp. Cần thêm `docker-compose.yml` (chưa có trong repo).

---

# Cách B — Tách nhiều cloud (Vercel + Railway + Render)

Monorepo gồm 4 phần — deploy **theo thứ tự** dưới đây.

| Phần | Nền tảng | Vai trò |
|------|----------|---------|
| `emp.server` | **Railway** (hoặc Render) | API + MySQL |
| `chatbot` | **Render** | Chatbot FastAPI |
| `emp.client` | **Vercel** | Website khách |
| `emp.admin` | **Vercel** (project riêng) | Trang quản trị |

**Vercel một mình không đủ** — không chạy được Express + MySQL + Python FastAPI lâu dài.

---

## Chuẩn bị

### 1. Tài khoản (miễn phí gói hobby)

- [GitHub](https://github.com)
- [Vercel](https://vercel.com)
- [Railway](https://railway.app) — backend + MySQL
- [Render](https://render.com) — chatbot Python

### 2. MySQL trên cloud

Trên Railway: **New → Database → MySQL** → copy `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`.

Import dữ liệu dev (tùy chọn):

```bash
# Từ máy local (đã có file dump)
mysql -h <host> -P <port> -u <user> -p <database> < backup.sql
```

Hoặc để server chạy migration lần đầu (Railway start `emp.server` sẽ gọi `runMigrations()`).

### 3. Đẩy code lên GitHub

```powershell
cd d:\year4\totnghiep\demo\ecommerce-platform
git init   # nếu chưa có
git add .
git commit -m "Initial deploy setup"
git branch -M main
git remote add origin https://github.com/<TEN_BAN>/<TEN_REPO>.git
git push -u origin main
```

**Không commit:** `.env`, `chatbot/data/chatbot.db`, API key thật.

---

## Bước 1 — Deploy API (`emp.server`) trên Railway

1. Railway → **New Project** → **Deploy from GitHub repo** → chọn repo.
2. **Settings → Root Directory:** `emp.server`
3. **Settings → Deploy:**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`
4. **Variables** (tham chiếu `emp.server/.env.example`):

| Biến | Ghi chú |
|------|---------|
| `PORT` | Railway tự gán — có thể bỏ qua |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Từ MySQL Railway |
| `JWT_ACCESS_SECRET` | Chuỗi dài, random (giữ bí mật) |
| `CORS_ORIGIN` | URL Vercel sau (tạm: `https://xxx.vercel.app`) |
| `APP_PUBLIC_URL` | URL client Vercel |
| `SERVER_PUBLIC_URL` | URL Railway API, vd `https://xxx.up.railway.app` |
| `CLOUDINARY_*` | Upload ảnh |
| `PAYOS_*` | Thanh toán (URL webhook/return = domain API) |

5. **Deploy** → copy **Public URL** (vd `https://emp-server-production.up.railway.app`).
6. API prefix: `https://<URL>/api` (client dùng `VITE_API_URL`).

**Kiểm tra:** mở `https://<URL>/api/health` hoặc Swagger `https://<URL>/api-docs` (nếu bật).

---

## Bước 2 — Deploy chatbot (`chatbot`) trên Render

1. Render → **New +** → **Web Service** → connect GitHub.
2. **Root Directory:** `chatbot`
3. **Runtime:** Python 3
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. **Health Check Path:** `/health`
7. **Environment Variables** (`chatbot/.env.example`):

| Biến | Giá trị |
|------|---------|
| `DB_*` | Giống Railway MySQL |
| `GEMINI_API_KEY` | Key từ Google AI Studio |
| `JWT_ACCESS_SECRET` | **Giống hệt** `emp.server` |
| `CHATBOT_REQUIRE_AUTH` | `true` (production) |
| `CORS_ORIGINS` | URL client + admin Vercel |
| `SHOP_URL` | URL client Vercel |
| `LOCAL_STORE_PATH` | `data/chatbot.db` |

8. **Disk (khuyến nghị):** Render → mount volume `data` để SQLite không mất khi redeploy.
9. Copy URL service (vd `https://emp-chatbot.onrender.com`).

Hoặc dùng file `chatbot/render.yaml` (Blueprint).

---

## Bước 3 — Deploy website khách (`emp.client`) trên Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import GitHub repo.
2. **Root Directory:** `emp.client`
3. Framework: **Vite** (tự nhận).
4. **Environment Variables** (Production):

```
VITE_API_URL=https://<RAILWAY-API>/api
VITE_CHATBOT_URL=https://<RENDER-CHATBOT>
VITE_GOOGLE_CLIENT_ID=...
VITE_FACEBOOK_APP_ID=...
```

5. **Deploy** → lấy URL, vd `https://emp-client.vercel.app`.

File `emp.client/vercel.json` đã cấu hình SPA rewrite (F5 không 404).

### CLI (tùy chọn)

```powershell
npm i -g vercel
cd emp.client
vercel
vercel --prod
```

---

## Bước 4 — Deploy admin (`emp.admin`) trên Vercel

1. Vercel → **Add New Project** (project **mới**, cùng repo).
2. **Root Directory:** `emp.admin`
3. Biến môi trường:

```
VITE_API_URL=https://<RAILWAY-API>/api
```

4. **Deploy** → vd `https://emp-admin.vercel.app`.

---

## Bước 5 — Nối lại CORS & URL (quan trọng)

Sau khi có URL Vercel thật, **sửa và redeploy**:

### Railway (`emp.server`)

```
CORS_ORIGIN=https://emp-client.vercel.app,https://emp-admin.vercel.app
APP_PUBLIC_URL=https://emp-client.vercel.app
```

PayOS: cập nhật `PAYOS_WEBHOOK_URL`, `PAYOS_RETURN_URL` trỏ domain API Railway.

### Render (`chatbot`)

```
CORS_ORIGINS=https://emp-client.vercel.app,https://emp-admin.vercel.app
SHOP_URL=https://emp-client.vercel.app
```

### Vercel (`emp.client`)

Đổi `VITE_*` nếu sai → **Deployments → Redeploy** (biến `VITE_` gắn lúc **build**).

---

## Checklist sau deploy

- [ ] Client mở được, sản phẩm load (API + DB)
- [ ] Đăng nhập / giỏ hàng / đặt hàng
- [ ] Admin đăng nhập, quản lý SP
- [ ] Chatbot widget trả lời, tìm giày
- [ ] Ảnh SP hiển thị (Cloudinary)
- [ ] PayOS (nếu dùng) webhook trỏ đúng API production

---

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| Client trắng / lỗi API | `VITE_API_URL` sai | Sửa env Vercel → Redeploy |
| CORS blocked | `CORS_ORIGIN` thiếu domain Vercel | Sửa Railway → redeploy server |
| Chatbot không gọi được | `VITE_CHATBOT_URL` sai hoặc Render sleep | Kiểm tra `/health`, bật plan không sleep |
| 401 chatbot khi đã login | `JWT_ACCESS_SECRET` khác server | Đồng bộ secret |
| MySQL connection refused | `DB_HOST` localhost | Dùng host cloud Railway |
| F5 trang client 404 | Thiếu rewrite | Đã có `vercel.json` |

---

## Chi phí & giới hạn (tham khảo)

- **Vercel:** frontend free tier đủ demo đồ án.
- **Railway:** có credit free/tháng.
- **Render:** free tier chatbot có thể **sleep** sau vài phút — lần đầu mở chậm ~30s.

---

## Tóm tắt thứ tự

```
MySQL (Railway) → emp.server (Railway) → chatbot (Render)
       → emp.client (Vercel) → emp.admin (Vercel) → sửa CORS → redeploy tất cả
```

Nếu chỉ cần **demo frontend** trên Vercel: deploy `emp.client` với `VITE_API_URL` trỏ API đang chạy local qua **ngrok** (tạm thời, không khuyến nghị production).
