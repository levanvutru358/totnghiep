# Deploy EMP Shop lên DigitalOcean App Platform

**1 app DigitalOcean** = MySQL + API + chatbot + client + admin (giống Railway).

Chi phí tham khảo: **~$20–35/tháng** (2 web service + 2 static site + MySQL dev) — không có free tier đầy đủ như Railway trial.

Region gợi ý cho VN: **Singapore (`sgp`)**.

---

## Kiến trúc

```
DigitalOcean App Platform (emp-shop)
├── emp-db          Managed MySQL
├── emp-server      Node API      → https://emp-server-xxx.ondigitalocean.app
├── chatbot         Python        → https://chatbot-xxx.ondigitalocean.app
├── emp-client      Static (Vite) → https://emp-client-xxx.ondigitalocean.app
└── emp-admin       Static (Vite) → https://emp-admin-xxx.ondigitalocean.app
```

Frontend **Static Site** — không cần `serve`, DO host CDN trực tiếp.

---

## Bước 0 — Chuẩn bị

1. Tài khoản https://cloud.digitalocean.com (+ thẻ thanh toán)
2. Code trên GitHub (vd `levanvutru358/totnghiep`)
3. Push file `.do/app.yaml` (mẫu có sẵn — sửa tên repo nếu khác)

```powershell
cd d:\year4\totnghiep\demo\ecommerce-platform
git add .
git commit -m "DigitalOcean deploy config"
git push origin main
```

---

## Cách 1 — Dashboard (dễ, làm từng component)

### 1. Tạo App

1. **Create** → **Apps**
2. **GitHub** → chọn repo → branch `main`
3. DigitalOcean **quét monorepo** — nếu hỏi, chọn **Edit Plan** để thêm nhiều component

### 2. Component: `emp-server` (Web Service)

| Mục | Giá trị |
|-----|---------|
| Type | **Web Service** |
| Source Directory | `emp.server` |
| Environment | **Node.js** |
| Build Command | `npm install && npm run build` |
| Run Command | `npm run start:prod` |
| HTTP Port | `8080` (DO thường set `PORT=8080`) |

**Resources:** Basic / $5 tier (512MB–1GB).

### 3. Thêm MySQL

Trong cùng App → **Add Resource** → **Database** → **MySQL 8** → Dev hoặc Production.

Sau khi tạo DB → **Attach** vào component `emp-server` và `chatbot`.

DigitalOcean inject biến dạng `${emp-db.HOSTNAME}` — map sang app:

| App env | Lấy từ DB component |
|---------|---------------------|
| `DB_HOST` | HOSTNAME |
| `DB_PORT` | PORT |
| `DB_USER` | USERNAME |
| `DB_PASSWORD` | PASSWORD |
| `DB_NAME` | DATABASE |

Thêm tay trên UI **Environment Variables**:

```env
JWT_ACCESS_SECRET=<chuỗi-bí-mật-dài>
CORS_ORIGIN=https://PLACEHOLDER
APP_PUBLIC_URL=https://PLACEHOLDER
SERVER_PUBLIC_URL=${emp-server.PUBLIC_URL}
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

(PayOS, ZaloPay — copy từ `.env.example` nếu dùng.)

### 4. Component: `chatbot` (Web Service)

| Mục | Giá trị |
|-----|---------|
| Source Directory | `chatbot` |
| Environment | **Python** |
| Build | `pip install -r requirements.txt` |
| Run | `uvicorn main:app --host 0.0.0.0 --port 8080` |

```env
DB_*          # attach cùng MySQL
GEMINI_API_KEY=...
JWT_ACCESS_SECRET=   # GIỐNG emp-server
CHATBOT_REQUIRE_AUTH=true
CORS_ORIGINS=...
SHOP_URL=...
LOCAL_STORE_PATH=data/chatbot.db
```

> **SQLite:** App Platform **không giữ file** khi redeploy. Chatbot vẫn chạy nhưng **mất lịch sử chat** — chấp nhận cho demo hoặc sau này chuyển SQLite lên DB/volume.

### 5. Component: `emp-client` (Static Site)

| Mục | Giá trị |
|-----|---------|
| Type | **Static Site** |
| Source Directory | `emp.client` |
| Build | `npm install && npm run build` |
| Output Directory | `dist` |
| Catchall | `index.html` (SPA) |

**Build-time env** (bắt buộc scope BUILD):

```env
VITE_API_URL=https://<URL-emp-server>/api
VITE_CHATBOT_URL=https://<URL-chatbot>
```

Lấy URL từ tab **Live App** sau khi deploy server + chatbot lần đầu.

### 6. Component: `emp-admin` (Static Site)

| Mục | Giá trị |
|-----|---------|
| Source Directory | `emp.admin` |
| Build / Output | giống client |
| Env | `VITE_API_URL=https://<URL-emp-server>/api` |

### 7. Deploy

**Create Resources** → đợi build (5–15 phút).

Mỗi component có URL riêng trên `*.ondigitalocean.app`.

### 8. Nối CORS (sau khi có URL client/admin)

Sửa trên **emp-server**:

```env
CORS_ORIGIN=https://emp-client-xxxxx.ondigitalocean.app,https://emp-admin-xxxxx.ondigitalocean.app
APP_PUBLIC_URL=https://emp-client-xxxxx.ondigitalocean.app
```

**chatbot:**

```env
CORS_ORIGINS=https://emp-client-xxxxx.ondigitalocean.app,https://emp-admin-xxxxx.ondigitalocean.app
SHOP_URL=https://emp-client-xxxxx.ondigitalocean.app
```

Sửa **VITE_*** trên static sites → **Force Rebuild** (Deploy → Actions).

---

## Cách 2 — App Spec (`.do/app.yaml`)

1. Sửa file `.do/app.yaml`:
   - `github.repo` → repo của bạn
   - `JWT_ACCESS_SECRET`, `GEMINI_API_KEY`
   - Sau lần deploy đầu: thay `PLACEHOLDER-*` bằng URL thật
2. **Create App** → **Upload App Spec** hoặc dùng CLI:

```bash
# Cài doctl: https://docs.digitalocean.com/reference/doctl/
doctl auth init
doctl apps create --spec .do/app.yaml
```

3. Cập nhật spec:

```bash
doctl apps list
doctl apps update <APP_ID> --spec .do/app.yaml
```

---

## Kiểm tra

| URL | Kỳ vọng |
|-----|---------|
| `https://...emp-server.../` | JSON `Server is running` |
| `https://...emp-server.../api-docs` | Swagger |
| `https://...chatbot.../health` | OK |
| `https://...emp-client.../` | Trang shop |
| `https://...emp-admin.../` | Trang admin |

---

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|------------|
| Build fail root `./` | **Source Directory** phải là `emp.server`, `emp.client`, … |
| Client gọi `localhost` | `VITE_*` scope **BUILD_TIME** + rebuild static site |
| CORS | Sửa `CORS_ORIGIN` trên server |
| MySQL refused | DB **Trusted Sources** — App Platform thường auto; kiểm tra attach DB |
| `npm run build` TypeScript fail | Xem **Runtime Logs** → Build Logs |
| Chatbot 401 | `JWT_ACCESS_SECRET` khác server |
| Hết tiền / billing | DO không chạy khi hết credit |

---

## Cách 3 — Droplet VPS (rẻ, khó hơn)

Nếu App Platform đắt:

1. **Create Droplet** — Ubuntu 22.04, $6/tháng, region Singapore
2. Cài Docker + Docker Compose
3. Chạy MySQL + 4 container trên **1 máy**

(Cần thêm `docker-compose.yml` — chưa có trong repo; hỏi nếu muốn tạo.)

---

## So sánh với Railway

| | DigitalOcean | Railway |
|--|--------------|---------|
| Frontend static | CDN tích hợp, không cần `serve` | Cần `serve` hoặc web service |
| Giá | Trả phí rõ ràng | Trial credit |
| MySQL | Managed, attach dễ | Plugin MySQL |
| Độ khó | Trung bình | Dễ hơn |

---

## Tóm tắt thứ tự

```
1. Push GitHub
2. DO → Create App → GitHub
3. Web Service emp.server + MySQL + env
4. Web Service chatbot
5. Static emp.client + emp.admin (VITE_*)
6. Deploy → copy URL → CORS + VITE → rebuild
```

Mẫu spec: [`.do/app.yaml`](./.do/app.yaml)
