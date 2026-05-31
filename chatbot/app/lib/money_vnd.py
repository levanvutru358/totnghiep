"""Định dạng tiền giống emp.client (product-price.ts / money-vnd.ts)."""

from __future__ import annotations

CATALOG_VND_THRESHOLD = 100_000


def to_display_vnd(catalog_amount: float) -> int:
    """Giá catalog < 100_000 → nhân 1000 (129 → 129_000 VND)."""
    if not isinstance(catalog_amount, (int, float)) or catalog_amount != catalog_amount:
        return 0
    value = float(catalog_amount)
    if value >= CATALOG_VND_THRESHOLD:
        return round(value)
    return round(value * 1000)


def format_catalog_vnd(catalog_amount: float) -> str:
    """Hiển thị giống formatProductPrice trên client: 129.000đ"""
    vnd = to_display_vnd(catalog_amount)
    return f"{vnd:,}".replace(",", ".") + "đ"
