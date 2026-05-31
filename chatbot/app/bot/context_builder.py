"""Build factual context from DB/FAQ for Gemini prompts."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

from app.bot.faq_data import lookup_faq_item
from app.bot.intents import Intent
from app.bot.order_lookup import (
    PAYMENT_VI,
    STATUS_VI,
    OrderAccess,
    extract_order_code,
    list_user_orders,
    resolve_order_access,
    wants_my_orders,
)
from app.bot.product_search import extract_product_keyword, search_products, stock_label
from app.bot.shop_settings import fetch_shop_settings, format_shop_settings_context
from app.chat_actor import ChatActor
from app.config import settings
from app.lib.money_vnd import format_catalog_vnd

if TYPE_CHECKING:
    from app.store import ChatStore


def _shop_policies_fallback() -> str:
    return (
        "Giao hàng: nội thành 2–3 ngày, tỉnh khác 3–7 ngày; phí ship tính khi checkout.\n"
        "Thanh toán: COD, PayOS (chuyển khoản/ví/thẻ).\n"
        "Đổi trả: đổi size/màu trong 7 ngày nếu còn tem; lỗi SX được hỗ trợ đổi/trả.\n"
        "Tra cứu đơn: khách phải đăng nhập; chỉ xem đơn thuộc tài khoản của mình (mã ORD-...)."
    )


def _products_context(message: str, intent: Intent) -> str:
    keyword = extract_product_keyword(message)
    if not keyword and intent != Intent.PRODUCT_SEARCH:
        return ""

    search_term = (keyword or message).strip()[:80]
    if len(search_term) < 2:
        return ""

    products = search_products(search_term, limit=8)
    shop = settings.shop_url.rstrip("/")
    lines = [f'Tìm kiếm: "{search_term}"']

    if not products:
        lines.append("Kết quả: không có sản phẩm phù hợp trong cửa hàng.")
        return "\n".join(lines)

    lines.append(f"Kết quả: {len(products)} sản phẩm:")
    for p in products:
        slug = p.get("slug") or str(p["id"])
        lines.append(
            f"- {p['name']} | {format_catalog_vnd(float(p['price']))} | "
            f"{p.get('brand_name', '')} / {p.get('category_name', '')} | "
            f"{stock_label(p)} | link: {shop}/product/{slug}"
        )
    return "\n".join(lines)


def _order_context(message: str, actor: ChatActor) -> str:
    parts: list[str] = []

    if wants_my_orders(message):
        if not actor.is_authenticated:
            parts.append("Đơn của tôi: khách chưa đăng nhập.")
        else:
            uid = actor.numeric_user_id()
            if uid is None:
                parts.append("Đơn của tôi: không xác định được tài khoản.")
            else:
                orders = list_user_orders(uid, limit=5)
                if not orders:
                    parts.append("Đơn của tôi: không có đơn nào.")
                else:
                    lines = ["Đơn gần đây của khách (dữ liệu thật):"]
                    for o in orders:
                        status = STATUS_VI.get(str(o["status"]), o["status"])
                        amount = int(float(o["total_amount"]))
                        lines.append(
                            f"- {o['order_code']} | {status} | "
                            f"{amount:,} {o.get('currency_code', 'VND')} | {o['created_at']}"
                        )
                    parts.append("\n".join(lines).replace(",", "."))

    code = extract_order_code(message)
    if code:
        access, row = resolve_order_access(message, actor)
        if access == OrderAccess.NEED_LOGIN:
            parts.append("Tra cứu đơn: khách chưa đăng nhập.")
        elif access == OrderAccess.NOT_FOUND:
            parts.append(f'Mã đơn "{code}": không thuộc tài khoản hoặc không tồn tại.')
        elif access == OrderAccess.FOUND and row:
            status = STATUS_VI.get(str(row["status"]), row["status"])
            payment = PAYMENT_VI.get(str(row["payment_status"]), row["payment_status"])
            amount = int(float(row["total_amount"]))
            facts: dict[str, Any] = {
                "order_code": row["order_code"],
                "status": status,
                "payment_status": payment,
                "total_amount": f"{amount:,} {row.get('currency_code', 'VND')}".replace(",", "."),
                "created_at": str(row.get("created_at", "")),
            }
            parts.append(
                "Chi tiết đơn (đã xác thực):\n"
                + json.dumps(facts, ensure_ascii=False, indent=2)
            )
    elif not wants_my_orders(message):
        parts.append(
            "Mã đơn: (chưa gửi — cần mã ORD-... hoặc hỏi 'đơn của tôi' khi đã đăng nhập)"
        )

    return "\n".join(parts) if parts else ""


def _knowledge_context(message: str, store: ChatStore | None) -> str:
    if store is None:
        return ""
    items = store.search_knowledge(message, limit=3)
    if not items:
        return ""
    lines = ["Tài liệu nội bộ (knowledge base):"]
    for item in items:
        snippet = str(item.get("content", "")).strip()[:600]
        lines.append(f"- [{item.get('title', 'KB')}] {snippet}")
    return "\n".join(lines)


def build_chat_context(
    message: str,
    intent: Intent,
    actor: ChatActor,
    store: ChatStore | None = None,
) -> str:
    shop_row = fetch_shop_settings()
    shop_ctx = format_shop_settings_context(shop_row) or _shop_policies_fallback()

    sections: list[str] = [
        f"Shop URL: {settings.shop_url.rstrip('/')}",
        f"Khách: {'đã đăng nhập' if actor.is_authenticated else 'chưa đăng nhập'}"
        + (f" (role={actor.role})" if actor.is_authenticated else ""),
        "--- Thông tin cửa hàng ---",
        shop_ctx,
    ]

    product_ctx = _products_context(message, intent)
    if product_ctx:
        sections.extend(["--- Sản phẩm ---", product_ctx])

    order_ctx = _order_context(message, actor)
    if order_ctx or intent in (Intent.ORDER_STATUS, Intent.FALLBACK) or extract_order_code(message):
        sections.extend(["--- Đơn hàng ---", order_ctx or "(không có dữ liệu đơn)"])

    kb = _knowledge_context(message, store)
    if kb:
        sections.extend(["--- Knowledge base ---", kb])

    faq = lookup_faq_item(message)
    if faq:
        sections.extend(["--- FAQ khớp từ khóa ---", faq.answer])

    return "\n".join(sections)
