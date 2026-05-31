"""Load shop settings from MySQL (same DB as emp.server)."""

from __future__ import annotations

from typing import Any

from app.db import db_cursor
from app.lib.money_vnd import format_catalog_vnd


def fetch_shop_settings() -> dict[str, Any] | None:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT shop_name, support_phone, support_email,
                   default_shipping_fee, free_shipping_min_subtotal,
                   payment_payos_enabled, payment_zalopay_enabled,
                   return_policy_text, shipping_policy_text
            FROM shop_settings
            WHERE id = 1
            LIMIT 1
            """
        )
        row = cur.fetchone()
    return row


def format_shop_settings_context(row: dict[str, Any] | None) -> str:
    if not row:
        return ""
    lines = [f"Cửa hàng: {row.get('shop_name', 'EMP Shop')}"]
    if row.get("support_phone"):
        lines.append(f"Hotline: {row['support_phone']}")
    if row.get("support_email"):
        lines.append(f"Email CSKH: {row['support_email']}")
    ship_fee = format_catalog_vnd(float(row.get("default_shipping_fee") or 0))
    free_min = format_catalog_vnd(float(row.get("free_shipping_min_subtotal") or 0))
    lines.append(f"Phí ship mặc định: {ship_fee} — miễn phí từ {free_min}")
    pay = []
    if int(row.get("payment_payos_enabled") or 0):
        pay.append("PayOS")
    if int(row.get("payment_zalopay_enabled") or 0):
        pay.append("ZaloPay")
    pay.append("COD")
    lines.append("Thanh toán: " + ", ".join(pay))
    if row.get("shipping_policy_text"):
        lines.append(f"Chính sách giao hàng (DB): {str(row['shipping_policy_text'])[:500]}")
    if row.get("return_policy_text"):
        lines.append(f"Chính sách đổi trả (DB): {str(row['return_policy_text'])[:500]}")
    return "\n".join(lines)
