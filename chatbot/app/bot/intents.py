import re
from enum import Enum

from app.bot.order_lookup import wants_my_orders


class Intent(str, Enum):
    GREETING = "greeting"
    PRODUCT_SEARCH = "product_search"
    ORDER_STATUS = "order_status"
    SHIPPING = "shipping"
    PAYMENT = "payment"
    RETURN_POLICY = "return_policy"
    ACCOUNT = "account"
    THANKS = "thanks"
    FALLBACK = "fallback"


GREETING_PATTERNS = [
    r"\b(xin chào|chào|hello|hi|hey|chao)\b",
    r"\b(good morning|good afternoon)\b",
]

PRODUCT_PATTERNS = [
    r"\b(tìm|tim|search|sản phẩm|san pham|mua|có bán|co ban|giày|giay|giầy)\b",
    r"\b(cần|can|muốn|muon)\s+.*\b(giày|giay|giầy|sneaker|dép|dep)\b",
    r"\b(giày thể thao|giay the thao|thể thao|the thao)\b",
    r"\b(sneaker|dép|dep|sandal|boots?|giày chạy|giay chay|bóng rổ|bong ro|training|outdoor)\b",
    r"\b(nike|adidas|asics|puma|new balance|converse|vans)\b",
    r"\b(giá|gia|bao nhiêu|bao nhieu)\b.*\b(giày|giay|sản phẩm|san pham)?",
]

ORDER_PATTERNS = [
    r"\b(đơn hàng|don hang|order|mã đơn|ma don|tra cứu|tra cuu|theo dõi|theo doi)\b",
    r"\b(đơn của tôi|don cua toi|đơn của mình|don cua minh|các đơn|cac don|"
    r"đơn gần đây|don gan day|lịch sử đơn|lich su don|xem đơn|xem don|đơn của)\b",
    r"\bORD-\d",
]

SHIPPING_PATTERNS = [r"\b(giao hàng|giao hang|ship|vận chuyển|van chuyen|phí ship|phi ship)\b"]

PAYMENT_PATTERNS = [
    r"\b(thanh toán|thanh toan|payos|cod|chuyển khoản|chuyen khoan|trả tiền|tra tien)\b",
]

RETURN_PATTERNS = [r"\b(đổi trả|doi tra|hoàn|hoan|trả hàng|tra hang|bảo hành|bao hanh)\b"]

ACCOUNT_PATTERNS = [r"\b(đăng nhập|dang nhap|tài khoản|tai khoan|mật khẩu|mat khau|đăng ký|dang ky)\b"]

THANKS_PATTERNS = [r"\b(cảm ơn|cam on|thanks|thank you|tạm biệt|tam biet)\b"]


def detect_intent(message: str) -> Intent:
    text = message.lower().strip()
    if any(re.search(p, text) for p in GREETING_PATTERNS) and len(text) < 40:
        return Intent.GREETING
    if wants_my_orders(message) or any(
        re.search(p, text, re.IGNORECASE) for p in ORDER_PATTERNS
    ):
        return Intent.ORDER_STATUS
    if any(re.search(p, text) for p in PRODUCT_PATTERNS):
        return Intent.PRODUCT_SEARCH
    if any(re.search(p, text) for p in SHIPPING_PATTERNS):
        return Intent.SHIPPING
    if any(re.search(p, text) for p in PAYMENT_PATTERNS):
        return Intent.PAYMENT
    if any(re.search(p, text) for p in RETURN_PATTERNS):
        return Intent.RETURN_POLICY
    if any(re.search(p, text) for p in ACCOUNT_PATTERNS):
        return Intent.ACCOUNT
    if any(re.search(p, text) for p in THANKS_PATTERNS):
        return Intent.THANKS
    return Intent.FALLBACK
