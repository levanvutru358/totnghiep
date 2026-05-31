from __future__ import annotations

import re
import uuid
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.store import ChatStore

from app.bot.context_builder import build_chat_context
from app.bot.faq_data import lookup_faq_item
from app.bot.gemini_client import ChatTurn, GeminiError, ask_gemini, is_gemini_enabled
from app.bot.intents import Intent, detect_intent
from app.bot.order_lookup import (
    OrderAccess,
    extract_order_code,
    format_order,
    format_user_orders,
    list_user_orders,
    order_reply_for_access,
    resolve_order_access,
    wants_my_orders,
)
from app.chat_actor import ChatActor
from app.bot.product_search import (
    extract_product_keyword,
    format_product_list,
    search_products,
)
from app.bot.shop_settings import fetch_shop_settings
from app.bot.suggestions import (
    SHOE_SUGGESTIONS_DEFAULT,
    SHOE_SUGGESTIONS_ORDER,
    SHOE_SUGGESTIONS_PRODUCT,
    filter_suggestions,
)
from app.config import settings


def _session_id(session_id: str | None) -> str:
    return session_id or str(uuid.uuid4())


def _reply_greeting() -> str:
    return (
        "Xin chào! Mình là trợ lý EMP Shop — có thể giúp bạn:\n"
        "• Tìm sản phẩm\n"
        "• Tra cứu đơn hàng (gửi mã đơn dạng ORD-...)\n"
        "• Hỏi giao hàng, thanh toán, đổi trả\n\n"
        "Bạn cần hỗ trợ gì ạ?"
    )


def _reply_shipping() -> str:
    return (
        "**Giao hàng:**\n"
        "- Nội thành: 2–3 ngày làm việc\n"
        "- Tỉnh/thành khác: 3–7 ngày\n"
        "- Phí ship tính khi checkout theo địa chỉ\n\n"
        "Sau khi đặt, bạn theo dõi trạng thái trong mục **Đơn hàng** hoặc gửi mã đơn cho mình."
    )


def _reply_payment() -> str:
    try:
        row = fetch_shop_settings()
    except Exception:
        row = None
    methods = ["**COD** — thanh toán khi nhận hàng"]
    if row:
        if int(row.get("payment_payos_enabled") or 0):
            methods.append("**PayOS** — chuyển khoản / ví / thẻ")
        if int(row.get("payment_zalopay_enabled") or 0):
            methods.append("**ZaloPay**")
    else:
        methods.append("**PayOS** — chuyển khoản / ví / thẻ")
    lines = "\n".join(f"- {m}" for m in methods)
    return (
        f"**Thanh toán:**\n{lines}\n\n"
        "Đơn **Chờ thanh toán** cần thanh toán trong thời hạn hiển thị trên trang thanh toán."
    )


def _reply_return() -> str:
    return (
        "**Đổi trả:**\n"
        "- Đổi size/màu trong **7 ngày** nếu còn tem, chưa qua sử dụng\n"
        "- Lỗi sản xuất: miễn phí đổi trả\n"
        "- Gửi yêu cầu trả trong chi tiết đơn hoặc liên hệ CSKH\n\n"
        "Cần hỗ trợ đơn cụ thể, gửi mã đơn ORD-... cho mình."
    )


def _reply_account() -> str:
    shop = settings.shop_url.rstrip("/")
    return (
        f"**Tài khoản:**\n"
        f"- Đăng ký / đăng nhập tại {shop}\n"
        f"- Quên mật khẩu: dùng **Quên mật khẩu** trên trang đăng nhập\n"
        f"- Xem đơn, đánh giá, bình luận trong mục **Tài khoản** sau khi đăng nhập"
    )


def _reply_thanks() -> str:
    return "Không có gì ạ! Chúc bạn mua sắm vui vẻ. Cần gì cứ nhắn mình nhé."


_WANTS_PURCHASE = re.compile(
    r"\b(muốn mua|muon mua|đặt mua|dat mua|mua ngay|mua luôn|mua giúp|chốt đơn|chot don)\b",
    re.IGNORECASE,
)


def _purchase_guide(products: list[dict[str, Any]], shop_url: str) -> str:
    if not products:
        return ""
    base = shop_url.rstrip("/")
    if len(products) == 1:
        slug = products[0].get("slug") or products[0]["id"]
        return (
            f"\n\n**Đặt mua:** vào link trên hoặc {base}/product/{slug} "
            f"→ chọn **size** còn hàng → **Thêm vào giỏ** hoặc **Mua ngay**."
        )
    return (
        "\n\n**Đặt mua:** mở link sản phẩm → chọn **size** → **Thêm vào giỏ** hoặc **Mua ngay**."
    )


def _handle_product_search(message: str) -> str:
    keyword = extract_product_keyword(message)
    if not keyword:
        return (
            "Bạn muốn tìm giày gì? Ví dụ: *giày chạy bộ*, *sneaker*, *sandal & dép*, *giày bóng rổ*."
        )
    products = search_products(keyword)
    if not products:
        return (
            f'Chưa tìm thấy giày phù hợp với "{keyword}". '
            f"Thử từ khóa khác (thương hiệu, loại giày, size) hoặc xem trang chủ {settings.shop_url}."
        )
    listing = format_product_list(products, settings.shop_url)
    if _WANTS_PURCHASE.search(message):
        listing += _purchase_guide(products, settings.shop_url)
    return listing


def _handle_my_orders(actor: ChatActor) -> str:
    if not actor.is_authenticated:
        return "Bạn cần **đăng nhập** để xem các đơn của mình."
    uid = actor.numeric_user_id()
    if uid is None:
        return "Không xác định được tài khoản. Vui lòng đăng nhập lại."
    return format_user_orders(list_user_orders(uid, limit=5))


def _handle_order_status(message: str, actor: ChatActor) -> str:
    if wants_my_orders(message):
        return _handle_my_orders(actor)
    access, row = resolve_order_access(message, actor)
    if access == OrderAccess.FOUND and row:
        return format_order(row)
    return order_reply_for_access(access, extract_order_code(message))


def _ask_llm(
    message: str,
    intent: Intent,
    actor: ChatActor,
    history: list[ChatTurn] | None = None,
    store: ChatStore | None = None,
) -> str | None:
    if not is_gemini_enabled():
        return None
    context = build_chat_context(message, intent, actor, store)
    try:
        return ask_gemini(
            message,
            intent_hint=intent.value,
            context_block=context,
            history=history,
        )
    except GeminiError:
        return None


def _rule_based_reply(text: str, intent: Intent, actor: ChatActor) -> tuple[str, Intent]:
    if intent not in (Intent.PRODUCT_SEARCH, Intent.ORDER_STATUS):
        faq = lookup_faq_item(text)
        if faq:
            return faq.answer, intent

    handlers = {
        Intent.GREETING: _reply_greeting,
        Intent.SHIPPING: _reply_shipping,
        Intent.PAYMENT: _reply_payment,
        Intent.RETURN_POLICY: _reply_return,
        Intent.ACCOUNT: _reply_account,
        Intent.THANKS: _reply_thanks,
        Intent.PRODUCT_SEARCH: lambda: _handle_product_search(text),
        Intent.ORDER_STATUS: lambda: _handle_order_status(text, actor),
    }

    if intent in handlers:
        return handlers[intent](), intent

    return (
        "Mình chưa hiểu rõ câu hỏi. Bạn có thể hỏi:\n"
        "• *Tìm giày [loại / thương hiệu / size]*\n"
        "• *Tra cứu đơn ORD-...*\n"
        "• *Phí giao hàng* / *Thanh toán* / *Đổi trả*",
        Intent.FALLBACK,
    )


def chat(
    message: str,
    session_id: str | None = None,
    actor: ChatActor | None = None,
    history: list[ChatTurn] | None = None,
    store: ChatStore | None = None,
) -> dict[str, Any]:
    text = message.strip()
    intent = detect_intent(text)
    faq_hit = lookup_faq_item(text)
    who = actor or ChatActor.anonymous()

    reply: str | None = None

    if settings.llm_enabled:
        reply = _ask_llm(text, intent, who, history, store)

    if reply is None:
        reply, intent = _rule_based_reply(text, intent, who)

    if intent == Intent.PRODUCT_SEARCH:
        pool = SHOE_SUGGESTIONS_PRODUCT
    elif intent == Intent.ORDER_STATUS:
        pool = SHOE_SUGGESTIONS_ORDER
    elif faq_hit and faq_hit.suggestions:
        pool = faq_hit.suggestions
    else:
        pool = SHOE_SUGGESTIONS_DEFAULT

    suggestions = filter_suggestions(pool, fallback=SHOE_SUGGESTIONS_DEFAULT)

    return {
        "reply": reply,
        "intent": intent.value,
        "session_id": _session_id(session_id),
        "suggestions": suggestions,
    }
