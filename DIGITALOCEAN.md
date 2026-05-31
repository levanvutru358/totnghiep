# Hướng dẫn deploy EMP Shop lên DigitalOcean App Platform (đầy đủ)

Tài liệu này hướng dẫn **từng bước trên Dashboard** — phù hợp repo monorepo `levanvutru358/totnghiep`.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Chuẩn bị](#2-chuẩn-bị)
3. [Tạo App — màn Connect repository](#3-tạo-app--màn-connect-repository)
4. [Cấu hình từng component (QUAN TRỌNG)](#4-cấu-hình-từng-component-quan-trọng)
5. [MySQL — tạo và gắn DB](#5-mysql--tạo-và-gắn-db)
6. [Biến môi trường đầy đủ](#6-biến-môi-trường-đầy-đủ)
7. [Deploy lần 1 → lấy URL → Deploy lần 2](#7-deploy-lần-1--lấy-url--deploy-lần-2)
8. [Kiểm tra sau deploy](#8-kiểm-trả-sau-deploy)
9. [Sửa lỗi cấu hình hay gặp](#9-sửa-lỗi-cấu-hình-hay-gặp)
10. [Chi phí & lưu ý](#10-chi-phí--lưu-ý)

---

## 1. Tổng quan

### Kiến trúc trên DigitalOcean

```
App: totnghiep (App Platform)
│
├── dev-db-994302     [Database]     MySQL 8 — dữ liệu shop
│
├── emp-server        [Web Service]  Node.js Express — API /api/*
├── chatbot           [Web Service]  Python FastAPI — chatbot
│
├── emp-client        [Static Site]  Vite React — website khách
└── emp-admin         [Static Site]  Vite React — trang quản trị
```

Mỗi component có URL riêng dạng:

```
https://totnghiep-emp-server-xxxxx.ondigitalocean.app
https://totnghiep-emp-client-xxxxx.ondigitalocean.app
...
```

### Bảng loại component — **đọc kỹ trước khi Create**

| Thư mục code | Loại trên DO | Vì sao |
|--------------|--------------|--------|
| `emp.server` | **Web Service** | API chạy liên tục, kết nối MySQL |
| `chatbot` | **Web Service** | FastAPI chạy liên tục |
| `emp.client` | **Static Site** | Chỉ build HTML/JS ra `dist` |
| `emp.admin` | **Static Site** | Giống client |

**Lỗi thường gặp (bạn đã gặp):**

- `emp.server` để **Static Site** → API không chạy → **SAI**
- `emp.admin` để **Web Service** + `DATABASE_URL` → **SAI**
- Frontend cần `VITE_API_URL`, **không** cần `DATABASE_URL`

---

## 2. Chuẩn bị

### 2.1. Tài khoản & công cụ

- Tài khoản https://cloud.digitalocean.com (cần thẻ thanh toán)
- Repo GitHub: `https://github.com/levanvutru358/totnghiep`, branch `main`
- (Tùy chọn) Cloudinary — upload ảnh sản phẩm
- (Tùy chọn) Gemini API key — chatbot AI: https://aistudio.google.com/apikey
- (Tùy chọn) PayOS — thanh toán online

### 2.2. Push code lên GitHub

Trên máy dev:

```powershell
cd d:\year4\totnghiep\demo\ecommerce-platform
git status
git add .
git commit -m "Prepare DigitalOcean deploy"
git push origin main
```

**Không commit:** file `.env`, API key thật, `chatbot/data/chatbot.db`.

### 2.3. Chuẩn bị secret

Tạo sẵn một chuỗi JWT (≥ 32 ký tự), ví dụ:

```
JWT_ACCESS_SECRET=EmpShop2026_SuperSecret_Key_ChangeMe_32chars
```

Dùng **cùng một giá trị** cho `emp-server` và `chatbot`.

---

## 3. Tạo App — màn Connect repository

1. DigitalOcean → **Create** → **Apps**
2. Tab **GitHub** → **Authorize** nếu chưa
3. Điền form **Connect and select a repository**:

| Trường | Giá trị |
|--------|---------|
| Git provider | GitHub |
| Repository | `levanvutru358/totnghiep` |
| Branch | `main` |
| **Source directories** | Xem bên dưới |
| Autodeploy | ✅ Bật |

**Source directories** — nhập 4 dòng (mỗi dòng một thư mục):

```
emp.server
chatbot
emp.client
emp.admin
```

Nếu ô chỉ cho 1 dòng, thử phân cách bằng dấu phẩy hoặc thêm component thủ công ở bước sau.

4. Bấm **Next**

---

## 4. Cấu hình từng component (QUAN TRỌNG)

Màn **Review / Edit Plan** — DigitalOcean tự detect 4 folder. **Sửa từng component** trước khi Create.

Nhấn **Edit** (bút chì) từng component hoặc **Component Settings**.

---

### 4.1. Component: `emp-server`

#### Info

| Mục | Giá trị |
|-----|---------|
| Name | `totnghiep-emp-server` (tùy chọn) |
| **Type** | **Web Service** ← không phải Static Site |

#### Source

| Mục | Giá trị |
|-----|---------|
| Repository | `levanvutru358/totnghiep` |
| Branch | `main` |
| **Source Directory** | `emp.server` |
| Autodeploy | On |

#### Size (Resource)

| Mục | Gợi ý |
|-----|--------|
| Instance | Basic — 512 MB / 1 vCPU (~$5/tháng) |
| Containers | **1** |

#### Deploy / Commands

| Mục | Giá trị |
|-----|---------|
| Build Command | `npm install && npm run build` |
| **Run Command** | `npm run start:prod` |
| HTTP Port | **8080** |

> DigitalOcean set biến `PORT=8080`. Code server đọc `process.env.PORT` — OK.

#### Environment Variables

Xem [mục 6.1](#61-emp-server) — **không dùng `DATABASE_URL`**, dùng `DB_HOST`, `DB_PORT`, …

#### Routing

- Route: `/` → component này (mặc định)

---

### 4.2. Component: `chatbot`

#### Info

| Mục | Giá trị |
|-----|---------|
| **Type** | **Web Service** |

#### Source

| Mục | Giá trị |
|-----|---------|
| Source Directory | `chatbot` |

#### Commands

| Mục | Giá trị |
|-----|---------|
| Build Command | `pip install -r requirements.txt` |
| Run Command | `uvicorn main:app --host 0.0.0.0 --port 8080` |
| HTTP Port | **8080** |

Repo đã có `chatbot/.python-version` = **3.12** (tránh DO mặc định Python 3.14 — `pydantic-core` build lỗi).

#### Environment Variables

Xem [mục 6.2](#62-chatbot).

---

### 4.3. Component: `emp-client`

#### Info

| Mục | Giá trị |
|-----|---------|
| **Type** | **Static Site** ← không phải Web Service |

#### Source

| Mục | Giá trị |
|-----|---------|
| Source Directory | `emp.client` |

#### Commands

| Mục | Giá trị |
|-----|---------|
| Build Command | `npm install && npm run build` |
| **Output Directory** | `dist` |
| Catchall document | `index.html` |

(Không có Run Command — static site không chạy server.)

#### Environment Variables

Scope **BUILD TIME** (quan trọng):

```
VITE_API_URL=https://PLACEHOLDER-SERVER.ondigitalocean.app/api
VITE_CHATBOT_URL=https://PLACEHOLDER-CHATBOT.ondigitalocean.app
```

`PLACEHOLDER` thay sau [Bước 7](#7-deploy-lần-1--lấy-url--deploy-lần-2).

**Không thêm** `DATABASE_URL` cho client.

---

### 4.4. Component: `emp-admin`

Giống `emp-client`:

| Mục | Giá trị |
|-----|---------|
| **Type** | **Static Site** |
| Source Directory | `emp.admin` |
| Build | `npm install && npm run build` |
| Output | `dist` |
| Catchall | `index.html` |

Env **BUILD TIME**:

```
VITE_API_URL=https://PLACEHOLDER-SERVER.ondigitalocean.app/api
```

**Không** `DATABASE_URL`.

---

## 5. MySQL — tạo và gắn DB

### 5.1. Thêm database

Trong App (Edit Plan hoặc sau khi tạo app):

1. **Add Resource** → **Database**
2. Chọn **MySQL 8**
3. Plan: **Dev** (~$7/tháng) hoặc Production
4. Name: vd `dev-db-994302`

### 5.2. Attach DB vào service

Database phải **gắn** vào:

- ✅ `emp-server`
- ✅ `chatbot`
- ❌ **Không** gắn `emp-client`, `emp-admin`

Cách attach: Component Settings → **Database** → chọn DB dev.

### 5.3. Map biến — KHÔNG dùng DATABASE_URL

App code dùng:

```
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
```

Trên UI Environment Variables của **emp-server** và **chatbot**, thêm:

| Key | Value (DigitalOcean reference) |
|-----|--------------------------------|
| `DB_HOST` | `${dev-db-994302.HOSTNAME}` |
| `DB_PORT` | `${dev-db-994302.PORT}` |
| `DB_USER` | `${dev-db-994302.USERNAME}` |
| `DB_PASSWORD` | `${dev-db-994302.PASSWORD}` (Encrypt ✅) |
| `DB_NAME` | `${dev-db-994302.DATABASE}` |

> Tên `dev-db-994302` thay bằng **tên DB component thật** trên dashboard.

Hoặc copy tay từ tab **Connection Details** của database.

### 5.4. Migration & dữ liệu

Lần đầu `emp-server` start → tự chạy `runMigrations()`.

Import data dev (tùy chọn): dùng DBeaver/TablePlus kết nối MySQL public connection string từ DO.

---

## 6. Biến môi trường đầy đủ

### 6.1. emp-server

**Runtime** (scope RUN_TIME):

   ```env
   # --- Database (từ MySQL attach) ---
   DB_HOST=${dev-db-994302.HOSTNAME}
   DB_PORT=${dev-db-994302.PORT}
   DB_USER=${dev-db-994302.USERNAME}
   DB_PASSWORD=${dev-db-994302.PASSWORD}
   DB_NAME=${dev-db-994302.DATABASE}

   # --- JWT ---
   JWT_ACCESS_SECRET=<chuỗi-bí-mật-dài-cùng-chatbot>
   JWT_ACCESS_EXPIRES_IN=1h
   JWT_REFRESH_EXPIRES_IN=7d
   BCRYPT_ROUNDS=10
   REFRESH_COOKIE_NAME=refreshToken
   REFRESH_COOKIE_PATH=/api/auth
   REFRESH_COOKIE_SECURE=true
   REFRESH_COOKIE_SAMESITE=lax

   # --- URL (sửa sau khi có domain) ---
   APP_PUBLIC_URL=https://totnghiep-emp-client-xxxxx.ondigitalocean.app
   SERVER_PUBLIC_URL=https://totnghiep-emp-server-xxxxx.ondigitalocean.app
   CORS_ORIGIN=https://totnghiep-emp-client-xxxxx.ondigitalocean.app,https://totnghiep-emp-admin-xxxxx.ondigitalocean.app

   # --- Cloudinary (bắt buộc nếu upload ảnh admin) ---
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=

   # --- PayOS (nếu dùng) — URL = domain emp-server ---
   PAYOS_CLIENT_ID=
   PAYOS_API_KEY=
   PAYOS_CHECKSUM_KEY=
   PAYOS_BASE_URL=https://api-merchant.payos.vn
   PAYOS_WEBHOOK_URL=https://totnghiep-emp-server-xxxxx.ondigitalocean.app/api/payments/callbacks/payos
   PAYOS_RETURN_URL=https://totnghiep-emp-server-xxxxx.ondigitalocean.app/api/payments/return
   PAYOS_RESULT_URL=https://totnghiep-emp-client-xxxxx.ondigitalocean.app/checkout/result
   PAYOS_CANCEL_URL=https://totnghiep-emp-client-xxxxx.ondigitalocean.app/checkout/cancel
   PAYOS_EXPIRE_DURATION_SECONDS=900

   # --- ZaloPay (nếu dùng) ---
   ZALOPAY_APP_ID=
   ZALOPAY_KEY1=
   ZALOPAY_KEY2=
   ZALOPAY_ENV=sandbox
   ZALOPAY_WEBHOOK_URL=https://totnghiep-emp-server-xxxxx.ondigitalocean.app/api/payments/callbacks/zalopay
   ZALOPAY_RETURN_URL=https://totnghiep-emp-server-xxxxx.ondigitalocean.app/api/payments/return/zalopay
   ZALOPAY_RESULT_URL=https://totnghiep-emp-client-xxxxx.ondigitalocean.app/checkout/result
   ZALOPAY_CANCEL_URL=https://totnghiep-emp-client-xxxxx.ondigitalocean.app/checkout/cancel
   ```

---

### 6.2. chatbot

**Runtime**:

```env
DB_HOST=${dev-db-994302.HOSTNAME}
DB_PORT=${dev-db-994302.PORT}
DB_USER=${dev-db-994302.USERNAME}
DB_PASSWORD=${dev-db-994302.PASSWORD}
DB_NAME=${dev-db-994302.DATABASE}

JWT_ACCESS_SECRET=<GIỐNG-HỆT-emp-server>
CHATBOT_REQUIRE_AUTH=true

GEMINI_API_KEY=<key-google-ai>
GEMINI_MODEL=gemini-2.0-flash

CORS_ORIGINS=https://totnghiep-emp-client-xxxxx.ondigitalocean.app,https://totnghiep-emp-admin-xxxxx.ondigitalocean.app
SHOP_URL=https://totnghiep-emp-client-xxxxx.ondigitalocean.app

LOCAL_STORE_PATH=data/chatbot.db
```

> Lịch sử chat (SQLite) có thể mất khi redeploy — chấp nhận cho demo đồ án.

---

### 6.3. emp-client

**BUILD TIME only:**

```env
VITE_API_URL=https://totnghiep-emp-server-xxxxx.ondigitalocean.app/api
VITE_CHATBOT_URL=https://totnghiep-chatbot-xxxxx.ondigitalocean.app
VITE_GOOGLE_CLIENT_ID=
VITE_FACEBOOK_APP_ID=
```

---

### 6.4. emp-admin

**BUILD TIME only:**

```env
VITE_API_URL=https://totnghiep-emp-server-xxxxx.ondigitalocean.app/api
```

---

## 7. Deploy lần 1 → lấy URL → Deploy lần 2

Do frontend cần URL API **trước khi build**, làm **2 vòng**:

### Vòng 1 — Chỉ backend (khuyến nghị)

1. Edit Plan: **tạm tắt** hoặc xóa `emp-client`, `emp-admin` (hoặc để placeholder URL)
2. Chỉ deploy: **MySQL + emp-server + chatbot**
3. Bấm **Create Resources** / **Deploy**
4. Đợi build xanh (5–15 phút)
5. Vào **App → Settings → Domains** hoặc từng component → copy URL:

```
SERVER_URL  = https://totnghiep-emp-server-xxxxx.ondigitalocean.app
CHATBOT_URL = https://totnghiep-chatbot-xxxxx.ondigitalocean.app
```

6. Kiểm tra:
   - `{SERVER_URL}/` → `{"message":"Server is running 🚀"}`
   - `{SERVER_URL}/api-docs` → Swagger
   - `{CHATBOT_URL}/health` → OK

### Vòng 2 — Frontend + CORS

1. **Add Resource** hoặc bật lại `emp-client`, `emp-admin` (Static Site)
2. Điền `VITE_*` với URL thật từ vòng 1
3. Sửa `CORS_ORIGIN`, `APP_PUBLIC_URL`, `CORS_ORIGINS`, `SHOP_URL`, PayOS URL
4. **Deploy** / **Force Build and Deploy** cho static sites

### Vòng 3 — Xác nhận

- Mở URL client → sản phẩm load
- Mở admin → đăng nhập
- Chatbot widget → gửi tin thử

---

## 8. Kiểm tra sau deploy

| # | Việc cần làm | Kết quả mong đợi |
|---|---------------|------------------|
| 1 | Mở `{SERVER_URL}/api-docs` | Swagger hiện |
| 2 | Mở `{CHATBOT_URL}/health` | `mysql`, `localStore` OK |
| 3 | Mở client URL | Trang chủ shop |
| 4 | F5 trang `/product/...` trên client | Không 404 (catchall `index.html`) |
| 5 | Đăng nhập client | Token OK |
| 6 | Admin upload ảnh | Cloudinary hoạt động |
| 7 | Chatbot "tìm giày" | Trả danh sách SP |
| 8 | Đặt hàng / PayOS | (nếu đã cấu hình) |

### Xem log khi lỗi

App → chọn component → **Runtime Logs** (runtime) hoặc **Build Logs** (build fail).

---

## 9. Sửa lỗi cấu hình hay gặp

### ❌ emp-server là Static Site

**Triệu chứng:** Không có API, không Swagger.

**Sửa:** Component Settings → đổi **Static Site → Web Service** (hoặc xóa tạo lại Web Service, source `emp.server`).

---

### ❌ emp-admin / emp-client là Web Service

**Triệu chứng:** Build OK nhưng không serve được SPA, tốn tiền container.

**Sửa:** Đổi **Web Service → Static Site**, output `dist`, catchall `index.html`.

---

### ❌ Dùng DATABASE_URL thay vì DB_*

**Triệu chứng:** Server log `MySQL connection failed`.

**Sửa:** Xóa `DATABASE_URL`, thêm `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

---

### ❌ Client gọi localhost:8000

**Triệu chứng:** Network tab browser → request tới localhost.

**Sửa:** `VITE_API_URL` trên **emp-client** (BUILD TIME) → **Force Rebuild**.

---

### ❌ CORS error trên browser

**Triệu chứng:** Console: `blocked by CORS policy`.

**Sửa:** `CORS_ORIGIN` trên emp-server = URL client + admin (không dấu `/` cuối) → redeploy server.

---

### ❌ Chatbot "cần đăng nhập" khi đã login

**Sửa:** `JWT_ACCESS_SECRET` chatbot **=** emp-server.

---

### ❌ Chatbot: `pydantic-core` / Python 3.14

**Triệu chứng:** `Python interpreter version (3.14) is newer than PyO3's maximum supported version (3.13)`.

**Sửa:** Đảm bảo có file `chatbot/.python-version` chứa `3.12`, push GitHub, redeploy. Hoặc trên DO → chatbot → Env: `PYTHON_VERSION` = `3.12.0`.

### ❌ Build fail TypeScript (emp.client)

**Sửa:** Xem Build Logs → sửa lỗi code → push GitHub → autodeploy.

---

### ❌ DigitalOcean detect sai loại component

**Sửa:** Luôn vào **Edit Plan** và chỉnh tay theo [bảng mục 1](#1-tổng-quan).

---

## 10. Chi phí & lưu ý

| Resource | Ước tính/tháng |
|----------|----------------|
| MySQL Dev | ~$7 |
| Web Service × 2 (server + chatbot) | ~$10–12 |
| Static Site × 2 | ~$0–6 (thường rẻ hơn web service) |
| **Tổng** | **~$20–35** |

- Region: **Singapore** gần VN
- Autodeploy: mỗi `git push main` → build lại
- Đổi `VITE_*` → phải **rebuild** static site, không chỉ restart

---

## Checklist nhanh

```
□ Push code GitHub
□ Create App → repo totnghiep → source dirs: emp.server, chatbot, emp.client, emp.admin
□ emp-server  = Web Service, build npm, run start:prod, port 8080
□ chatbot     = Web Service, pip + uvicorn, port 8080
□ emp-client  = Static Site, output dist, catchall index.html
□ emp-admin   = Static Site, output dist
□ Add MySQL → attach server + chatbot
□ DB_HOST/PORT/USER/PASSWORD/NAME (không DATABASE_URL)
□ JWT_ACCESS_SECRET (server = chatbot)
□ Deploy vòng 1 → lấy URL server + chatbot
□ VITE_* + CORS + SHOP_URL
□ Deploy vòng 2 → test shop + admin + chatbot
```
