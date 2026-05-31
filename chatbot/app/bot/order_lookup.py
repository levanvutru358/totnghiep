import re
from enum import Enum
from typing import Any

from app.chat_actor import ChatActor
from app.db import db_cursor
from app.lib.money_vnd import format_catalog_vnd

ORDER_CODE_RE = re.compile(r"ORD-\d{8}-\d{6}-\d{6}", re.IGNORECASE)

STATUS_VI = {
    "PENDING_PAYMENT": "Chờ thanh toán",
    "PLACED": "Đã đặt",
    "CONFIRMED": "Đã xác nhận",
    "PACKED": "Đã đóng gói",
    "SHIPPED": "Đang giao",
    "DELIVERED": "Đã giao",
    "COMPLETED": "Hoàn tất",
    "CANCELLED": "Đã hủy",
    "RETURN_REQUESTED": "Yêu cầu trả hàng",
    "RETURNED": "Đã trả",
    "REFUNDED": "Đã hoàn tiền",
}

PAYMENT_VI = {
    "UNPAID": "Chưa thanh toán",
    "PAID": "Đã thanh toán",
    "PARTIALLY_REFUNDED": "Hoàn một phần",
    "REFUNDED": "Đã hoàn",
    "FAILED": "Thất bại",
}

FULFILLMENT_VI = {
    "UNFULFILLED": "Chưa xử lý",
    "PARTIAL": "Một phần",
    "FULFILLED": "Đã xử lý",
    "RESTOCKED": "Đã nhập kho",
}


class OrderAccess(str, Enum):
    NEED_CODE = "need_code"
    NEED_LOGIN = "need_login"
    NOT_FOUND = "not_found"
    FOUND = "found"


def extract_order_code(message: str) -> str | None:
    match = ORDER_CODE_RE.search(message.upper())
    return match.group(0).upper() if match else None


def lookup_order(order_code: str, *, user_id: int | None = None) -> dict[str, Any] | None:
    sql = """
        SELECT order_code, status, payment_status, fulfillment_status,
               total_amount, currency_code, recipient_name, created_at, user_id
        FROM orders
        WHERE order_code = %s
    """
    params: list[Any] = [order_code]
    if user_id is not None:
        sql += " AND user_id = %s"
        params.append(user_id)
    sql += " LIMIT 1"

    with db_cursor() as cur:
        cur.execute(sql, tuple(params))
        return cur.fetchone()


def resolve_order_access(message: str, actor: ChatActor) -> tuple[OrderAccess, dict[str, Any] | None]:
    code = extract_order_code(message)
    if not code:
        return OrderAccess.NEED_CODE, None

    if not actor.is_authenticated:
        return OrderAccess.NEED_LOGIN, None

    if actor.is_staff:
        row = lookup_order(code)
    else:
        uid = actor.numeric_user_id()
        if uid is None:
            return OrderAccess.NEED_LOGIN, None
        row = lookup_order(code, user_id=uid)

    if not row:
        return OrderAccess.NOT_FOUND, None
    return OrderAccess.FOUND, row


def format_order(row: dict[str, Any]) -> str:
    status = STATUS_VI.get(str(row["status"]), row["status"])
    payment = PAYMENT_VI.get(str(row["payment_status"]), row["payment_status"])
    fulfillment = FULFILLMENT_VI.get(
        str(row.get("fulfillment_status") or ""),
        row.get("fulfillment_status") or "—",
    )
    total = format_catalog_vnd(float(row["total_amount"]))
    return (
        f"Đơn **{row['order_code']}**:\n"
        f"- Trạng thái: {status}\n"
        f"- Thanh toán: {payment}\n"
        f"- Giao hàng: {fulfillment}\n"
        f"- Tổng: {total}\n"
        f"- Người nhận: {row.get('recipient_name', '—')}\n"
        f"- Ngày đặt: {row['created_at']}"
    )


def wants_my_orders(message: str) -> bool:
    text = message.lower()
    patterns = (
        r"\b(đơn của tôi|don cua toi|các đơn|cac don|đơn gần đây|don gan day|"
        r"lịch sử đơn|lich su don|xem đơn|xem don)\b",
    )
    return any(re.search(p, text) for p in patterns)


def list_user_orders(user_id: int, limit: int = 5) -> list[dict[str, Any]]:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT order_code, status, payment_status, total_amount,
                   currency_code, created_at
            FROM orders
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (user_id, limit),
        )
        return list(cur.fetchall())


def format_user_orders(orders: list[dict[str, Any]]) -> str:
    if not orders:
        return "Bạn chưa có đơn hàng nào trong hệ thống."
    lines = [f"Các đơn gần đây ({len(orders)}):"]
    for o in orders:
        status = STATUS_VI.get(str(o["status"]), o["status"])
        total = format_catalog_vnd(float(o["total_amount"]))
        lines.append(
            f"- **{o['order_code']}** — {status} — {total} — {o['created_at']}"
        )
    return "\n".join(lines)


def order_reply_for_access(access: OrderAccess, code: str | None = None) -> str:
    shop = "trang web"
    if access == OrderAccess.NEED_CODE:
        return (
            "Để tra cứu đơn, bạn gửi **mã đơn** (ví dụ: `ORD-20260527-160325-285917`).\n"
            "Mã xem trong email xác nhận hoặc mục **Đơn hàng** khi đã đăng nhập."
        )
    if access == OrderAccess.NEED_LOGIN:
        return (
            "Để tra cứu đơn hàng, bạn cần **đăng nhập** tài khoản đã đặt hàng.\n"
            "Sau khi đăng nhập, gửi mã đơn ORD-... hoặc xem trong mục **Đơn hàng**."
        )
    if access == OrderAccess.NOT_FOUND:
        label = f"**{code}**" if code else "mã đơn này"
        return (
            f"Không tìm thấy đơn {label} trong tài khoản của bạn.\n"
            "Kiểm tra lại mã hoặc đảm bảo bạn đã đăng nhập đúng tài khoản."
        )
    return ""
