# Deploy EMP Shop lên Railway (all-in-one)

Hướng dẫn từng bước — **1 project Railway** chạy cả shop.

```
Railway Project
├── MySQL
├── emp-server    → API
├── chatbot       → Chatbot
├── emp-client    → Website khách
└── emp-admin     → Trang quản trị
```

---

## Bước 0 — Chuẩn bị trên máy

### 0.1. Code trên GitHub

```powershell
cd d:\year4\totnghiep\demo\ecommerce-platform
git add .
git commit -m "Railway deploy config"
git push origin main
```

**Không push:** `.env`, `chatbot/data/chatbot.db`, key bí mật.

### 0.2. Tài khoản Railway

1. Vào https://railway.app
2. **Login with GitHub**
3. Có thể cần thêm thẻ (trial credit) — đủ demo đồ án

---

## Bước 1 — Tạo Project + MySQL

1. Railway Dashboard → **+ New Project**
2. Chọn **Deploy from GitHub repo** → chọn repo `ecommerce-platform`
3. Railway tạo 1 service đầu tiên — **đổi tên** thành `emp-server` (click tên service → Settings → name)
4. Trong project → **+ New** → **Database** → **MySQL**
5. Đợi MySQL **Active** (màu xanh)

### Lấy thông tin MySQL

Click service **MySQL** → tab **Variables** (hoặc Connect):

| Railway variable | Map sang app |
|------------------|--------------|
| `MYSQLHOST` | `DB_HOST` |
| `MYSQLPORT` | `DB_PORT` |
| `MYSQLUSER` | `DB_USER` |
| `MYSQLPASSWORD` | `DB_PASSWORD` |
| `MYSQLDATABASE` | `DB_NAME` |

---

## Bước 2 — Deploy API (`emp.server`)

### 2.1. Cấu hình service `emp-server`

Click service **emp-server** (service deploy từ GitHub):

**Settings → Source:**

| Mục | Giá trị |
|-----|---------|
| Root Directory | `emp.server` |
| Branch | `main` |

**Settings → Deploy:** (hoặc dùng file `emp.server/railway.toml` đã có sẵn)

| Mục | Giá trị |
|-----|---------|
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start:prod` |

### 2.2. Biến môi trường

Tab **Variables** → **Raw Editor** — dán (sửa giá trị `change-me`):

```env
# Database — tham chiếu service MySQL (tên service phải đúng, thường là "MySQL")
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}

# JWT — tự đặt chuỗi dài random, GIỮ BÍ MẬT
JWT_ACCESS_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=10

# CORS — sửa lại sau khi có URL client/admin (bước 6)
CORS_ORIGIN=http://localhost:5173
APP_PUBLIC_URL=http://localhost:5173

# URL public của chính API này — sửa sau Generate Domain
SERVER_PUBLIC_URL=https://PLACEHOLDER.up.railway.app

# Cloudinary (upload ảnh) — lấy từ cloudinary.com
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# PayOS (nếu dùng thanh toán) — URL trỏ domain API Railway
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
PAYOS_WEBHOOK_URL=https://PLACEHOLDER.up.railway.app/api/payments/callbacks/payos
PAYOS_RETURN_URL=https://PLACEHOLDER.up.railway.app/api/payments/return
```

> **Tip:** `${{MySQL.MYSQLHOST}}` — Railway tự nối biến từ service MySQL. Nếu tên service MySQL khác, đổi `MySQL` cho khớp.

### 2.3. Public URL

1. Service **emp-server** → **Settings** → **Networking**
2. **Generate Domain** → copy URL, vd: `https://emp-server-production-a1b2.up.railway.app`
3. Sửa lại `SERVER_PUBLIC_URL`, `PAYOS_*` nếu có
4. **Deploy** lại (Deployments → Redeploy)

### 2.4. Kiểm tra

Mở trình duyệt:

```
https://<URL-emp-server>/api-docs
```

Hoặc log deploy có dòng `MySQL connected`, `Server running`.

---

## Bước 3 — Deploy Chatbot (`chatbot`)

1. Trong cùng project → **+ New** → **GitHub Repo** → chọn **cùng repo**
2. Đổi tên service → `chatbot`
3. **Settings → Source** → Root Directory: `chatbot`

File `chatbot/railway.toml` đã cấu hình build/start.

### Variables

```env
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}

GEMINI_API_KEY=<key từ https://aistudio.google.com/apikey>
GEMINI_MODEL=gemini-2.0-flash

# PHẢI GIỐNG emp-server
JWT_ACCESS_SECRET=<cùng giá trị JWT_ACCESS_SECRET của emp-server>
CHATBOT_REQUIRE_AUTH=true

CORS_ORIGINS=https://PLACEHOLDER-client.up.railway.app
SHOP_URL=https://PLACEHOLDER-client.up.railway.app

LOCAL_STORE_PATH=data/chatbot.db
```

### Volume (khuyến nghị)

Settings → **Volumes** → Add Volume:

| Mount path | Mục đích |
|------------|----------|
| `/app/data` | Giữ file SQLite `chatbot.db` |

Đặt `LOCAL_STORE_PATH=/app/data/chatbot.db`

### Public URL

**Networking → Generate Domain** → vd `https://chatbot-production.up.railway.app`

Kiểm tra: `https://<url>/health`

---

## Bước 4 — Deploy Website khách (`emp.client`)

1. **+ New** → GitHub repo (cùng repo)
2. Tên service: `emp-client`
3. Root Directory: `emp.client`

### Variables (quan trọng — Vite đọc lúc BUILD)

```env
VITE_API_URL=https://<URL-emp-server>/api
VITE_CHATBOT_URL=https://<URL-chatbot>
VITE_GOOGLE_CLIENT_ID=
VITE_FACEBOOK_APP_ID=
```

Thay URL thật từ bước 2 và 3.

### Deploy + Domain

**Generate Domain** → vd `https://emp-client-production.up.railway.app`

Mở URL — phải thấy trang shop (cần DB đã có dữ liệu).

---

## Bước 5 — Deploy Admin (`emp.admin`)

1. **+ New** → cùng repo
2. Tên: `emp-admin`
3. Root Directory: `emp.admin`

### Variables

```env
VITE_API_URL=https://<URL-emp-server>/api
```

**Generate Domain** → vd `https://emp-admin-production.up.railway.app`

---

## Bước 6 — Nối CORS & redeploy (bắt buộc)

Sau khi có URL client + admin, sửa biến:

### Service `emp-server`

```env
CORS_ORIGIN=https://emp-client-production.up.railway.app,https://emp-admin-production.up.railway.app
APP_PUBLIC_URL=https://emp-client-production.up.railway.app
```

→ **Redeploy** emp-server

### Service `chatbot`

```env
CORS_ORIGINS=https://emp-client-production.up.railway.app,https://emp-admin-production.up.railway.app
SHOP_URL=https://emp-client-production.up.railway.app
```

→ **Redeploy** chatbot

### Service `emp-client` / `emp-admin`

Nếu đổi `VITE_*` → **Redeploy** (build lại mới nhúng URL vào frontend).

---

## Bước 7 — Import dữ liệu (tùy chọn)

Server tự chạy migration lần đầu. Nếu cần data dev:

1. Export MySQL local → file `.sql`
2. Railway MySQL → **Connect** → dùng client (TablePlus, DBeaver) hoặc CLI:

```bash
mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> <MYSQLDATABASE> < backup.sql
```

---

## Checklist hoàn thành

- [ ] `https://...emp-server.../api-docs` mở được
- [ ] `https://...chatbot.../health` OK
- [ ] Client hiện sản phẩm
- [ ] Đăng nhập / giỏ hàng
- [ ] Admin đăng nhập
- [ ] Widget chatbot trả lời
- [ ] Upload ảnh (Cloudinary đã điền)

---

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|------------|
| Build failed `tsc` | Xem log; thường do thiếu env `VITE_*` không gây fail — xem lỗi TypeScript cụ thể |
| `MySQL connection failed` | Kiểm tra `${{MySQL.*}}` — tên service MySQL đúng chưa |
| Client gọi API CORS | Sửa `CORS_ORIGIN` trên server, redeploy |
| Client API `localhost` | `VITE_API_URL` sai → sửa Variables → **Redeploy client** |
| Chatbot 401 khi login | `JWT_ACCESS_SECRET` khác server |
| Chatbot mất lịch sử chat | Thêm Volume cho `/app/data` |
| Hết credit Railway | Nâng plan hoặc tạm dừng service không cần |

---

## Chi phí & tối ưu

- **5 service + MySQL** tốn credit — demo có thể tắt `emp-admin` khi không bảo vệ.
- **Không deploy** service thừa trong project.
- Log: mỗi service → tab **Deployments** → **View logs**.

---

## Tóm tắt thứ tự

```
1. GitHub push
2. Railway: MySQL
3. emp-server (+ domain + DB vars)
4. chatbot (+ domain + volume)
5. emp-client (+ VITE_* + domain)
6. emp-admin (+ VITE_* + domain)
7. Sửa CORS / SHOP_URL → redeploy all
```

File cấu hình trong repo: `*/railway.toml`, `npm run start:prod` trên frontend.
