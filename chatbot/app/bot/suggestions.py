"""Gợi ý nhanh — chỉ giày dép (không quần áo / phụ kiện khác)."""

from __future__ import annotations

import re

# Từ khóa không thuộc cửa hàng giày dép
_NON_SHOE_RE = re.compile(
    r"\b("
    r"áo|ao|thun|quần|quan|váy|vay|đầm|dam|"
    r"túi xách|tui xach|balo|"
    r"đồng hồ|dong ho|"
    r"mỹ phẩm|my pham|nước hoa|nuoc hoa|"
    r"điện thoại|dien thoai|laptop|tai nghe|"
    r"apparel|clothing|shirt|pants|dress"
    r")\b",
    re.IGNORECASE,
)

SHOE_SUGGESTIONS_DEFAULT: tuple[str, ...] = (
    "Giày chạy bộ size 42",
    "Tra cứu đơn hàng",
    "Sneaker Nike",
)

SHOE_SUGGESTIONS_PRODUCT: tuple[str, ...] = (
    "Giày chạy bộ size 42",
    "Giày bóng rổ",
    "Sandal & dép",
)

SHOE_SUGGESTIONS_ORDER: tuple[str, ...] = (
    "Đơn của tôi",
    "Giày Adidas",
    "Phí giao hàng",
)


def is_shoe_related(text: str) -> bool:
    return not _NON_SHOE_RE.search(text.strip())


def filter_suggestions(items: list[str] | tuple[str, ...], *, fallback: tuple[str, ...]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for raw in items:
        s = raw.strip()
        if len(s) < 2 or s in seen:
            continue
        if not is_shoe_related(s):
            continue
        seen.add(s)
        out.append(s)
        if len(out) >= 3:
            return out
    for candidate in fallback:
        if candidate not in seen:
            seen.add(candidate)
            out.append(candidate)
        if len(out) >= 3:
            break
    return out
