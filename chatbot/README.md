# EMP Shop Chatbot (Python)

Chatbot hỗ trợ khách hàng cho nền tảng ecommerce EMP — chạy độc lập bằng **FastAPI** (cổng **8090**).

## Tính năng

- Trả lời tiếng Việt theo **intent** (rule-based) + **Google Gemini** khi có `GEMINI_API_KEY`
- **Tìm sản phẩm** — MySQL (cùng DB `emp.server`), kèm tồn kho theo size (`sizes.label`)
- **Tra cứu đơn** — mã `ORD-YYYYMMDD-HHMMSS-XXXXXX`
- FAQ + chính sách từ `shop_settings`
- Lưu hội thoại trong **SQLite** (`data/chatbot.db`)
- Widget `emp.client` gọi `POST /chat/messages`

## Cài đặt

```bash
cd chatbot
python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
copy .env.example .env
```

Trong `.env`:

- `DB_*` — giống `emp.server`
- `GEMINI_API_KEY` — https://aistudio.google.com/apikey
- `JWT_ACCESS_SECRET` — **phải giống** `emp.server` nếu dùng token đăng nhập
- `CHATBOT_REQUIRE_AUTH=false` — dev (khách không cần token API)
- `CHATBOT_REQUIRE_AUTH=true` — production

## Chạy

**Terminal 1** (giữ mở):

```bash
python main.py
```

API: http://127.0.0.1:8090 — `GET /health`, docs tại `/docs`.

**Terminal 2** — kiểm tra nhanh:

```bash
python scripts\smoke_test.py
```

### Lỗi thường gặp (Windows)

| Lỗi | Nguyên nhân | Cách xử lý |
|-----|-------------|------------|
| `WinError 10061` | Server chưa chạy | `python main.py` trước |
| `WinError 10013` | Cổng 8090 đã bị chiếm | `netstat -ano \| findstr :8090` → `taskkill /PID <pid> /F` |
| `WinError 10049` (smoke test) | Gọi `http://0.0.0.0` | Script dùng `127.0.0.1` tự động |

## API chính (widget client)

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/health` | MySQL + SQLite + Gemini |
| POST | `/chat/messages` | Gửi tin (`content`, `conversation_id` tùy chọn) |
| GET | `/chat/messages?conversation_id=` | Lịch sử tin (ẩn tin `revoked`) |

**Ví dụ gửi tin (khách / dev):**

```bash
curl -X POST http://127.0.0.1:8090/chat/messages ^
  -H "Content-Type: application/json" ^
  -d "{\"content\": \"Shop co giay the thao khong?\"}"
```

**Response (rút gọn):**

```json
{
  "conversation_id": "conv_...",
  "messages": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }],
  "intent": "product_search",
  "suggestions": ["..."]
}
```

`POST /chat` (legacy, `message` + `session_id`) vẫn có nhưng **widget không dùng**.

## Bảo mật tra cứu đơn

- Khách cần **đăng nhập** (JWT) để xem đơn của mình (logic trong engine).
- `orders.user_id` phải khớp `sub` trong token.
- `STAFF` / `ADMIN` / `SUPER_ADMIN` tra được mọi mã ORD.

## Hội thoại khách → đăng nhập

Hội thoại tạo khi chưa login có `user_id = NULL`. Sau khi đăng nhập, tin nhắn tiếp theo **gán** hội thoại đó cho tài khoản (`claim_conversation`) để không mất lịch sử.

## Tích hợp `emp.client`

`emp.client/.env`:

```env
VITE_CHATBOT_URL=http://localhost:8090
```

Widget: `src/features/chatbot/` — bật/tắt bởi **Cài đặt cửa hàng** → `chatbotEnabled` (admin).

`CORS_ORIGINS` trong `chatbot/.env` phải có origin client (vd. `http://localhost:5173`).

## API mở rộng (admin / staff)

| Nhóm | Path |
|------|------|
| Hội thoại | `/chat/conversations`, PATCH, DELETE |
| AI | `/ai/generate`, `/ai/summarize`, `/ai/classify` |
| KB | `/knowledge/*` (STAFF+) |
| Tools | `/tools/*` (stub) |
| Handoff | `/chat/handoff`, `/agents/assign` |

Streaming `GET /chat/messages/stream` — mô phỏng SSE (chưa stream Gemini thật).

## Cấu trúc

```
chatbot/
  main.py
  scripts/smoke_test.py
  app/
    api.py
    store.py          # SQLite
    db.py             # MySQL
    bot/
      engine.py
      gemini_client.py
      context_builder.py
      product_search.py
      order_lookup.py
      shop_settings.py
```

## Health

`GET /health` trả:

- `database` — MySQL
- `localStore` — SQLite hội thoại
- `llmEnabled`, `geminiReachable`, `geminiModel`
- `authRequired`, `jwtConfigured`
