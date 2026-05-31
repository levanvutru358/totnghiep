import re
import unicodedata
from typing import Any

from app.db import db_cursor
from app.lib.money_vnd import format_catalog_vnd

# Từ khóa tiếng Việt → thêm biến thể tìm trong tên SP / mô tả (EN) / danh mục
_SHOE_QUERY_ALIASES: dict[str, tuple[str, ...]] = {
    "giay the thao": (
        "thể thao",
        "the thao",
        "sport",
        "sneaker",
        "lifestyle",
        "running",
        "training",
        "basketball",
        "athletic",
    ),
    "the thao": ("thể thao", "sport", "sneaker", "lifestyle", "running", "training"),
    "giay chay bo": ("chạy bộ", "chay bo", "running", "runner", "daily trainer", "road running", "trail"),
    "chay bo": ("chạy bộ", "running", "runner", "daily trainer"),
    "giay chay": ("chạy bộ", "running", "runner"),
    "giay bong ro": ("bóng rổ", "bong ro", "basketball", "hoops"),
    "bong ro": ("bóng rổ", "basketball", "hoops"),
    "sneaker": ("sneaker", "lifestyle", "court"),
    "giay training": ("training", "gym", "hiit"),
    "giay tap gym": ("training", "gym"),
    "sandal": ("sandal", "dép", "dep", "sandals"),
    "dep": ("dép", "dep", "sandal", "sandals"),
    "giay leo nui": ("outdoor", "trekking", "leo núi"),
    "boots": ("boots", "chelsea", "combat"),
    "giay adidas": ("adidas",),
    "giay nike": ("nike",),
    "giay asics": ("asics",),
}

# Cụm “cần/muốn …” → bỏ trước khi tìm (lặp trong _strip_search_fillers)
_SUBJECT_PREFIX = re.compile(
    r"^(?:tôi|toi|mình|minh|em|anh|chị|chi|bạn|ban)\s+",
    re.IGNORECASE,
)
_INTENT_PREFIX = re.compile(
    r"^(?:đang\s+)?(?:cần|can|muốn|muon|tìm|tim|mua|xem|đặt|dat)\s+",
    re.IGNORECASE,
)

_SHOE_HEAD = re.compile(
    r"(giày|giay|giầy|sneaker|dép|dep|sandal|boots?)\b",
    re.IGNORECASE,
)

_SEARCH_SQL = """
    SELECT p.id, p.name, p.slug,
           COALESCE(p.sale_price, p.base_price) AS price,
           c.name AS category_name,
           b.name AS brand_name,
           COALESCE(SUM(
             CASE WHEN pv.is_active = 1 THEN pv.stock_quantity ELSE 0 END
           ), 0) AS total_stock,
           (
             SELECT GROUP_CONCAT(
               DISTINCT CONCAT(s.label, ':', pv2.stock_quantity)
               ORDER BY s.label SEPARATOR ', '
             )
             FROM product_variants pv2
             INNER JOIN sizes s ON s.id = pv2.size_id
             WHERE pv2.product_id = p.id
               AND pv2.is_active = 1
               AND pv2.stock_quantity > 0
             LIMIT 12
           ) AS size_stock
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories pc ON pc.id = c.parent_id
    INNER JOIN brands b ON b.id = p.brand_id
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.is_active = 1
      AND ({match_clause})
    GROUP BY p.id, p.name, p.slug, p.sale_price, p.base_price, c.name, b.name,
             p.is_featured, p.created_at
    ORDER BY p.is_featured DESC, p.created_at DESC
    LIMIT %s
"""

_MATCH_FIELDS = """
      p.name LIKE %s OR p.short_description LIKE %s OR p.description LIKE %s
      OR c.name LIKE %s OR c.description LIKE %s OR c.slug LIKE %s
      OR pc.name LIKE %s OR pc.description LIKE %s OR pc.slug LIKE %s
      OR b.name LIKE %s
"""


def _normalize_vi(text: str) -> str:
    folded = unicodedata.normalize("NFD", text.lower().strip())
    without_marks = "".join(ch for ch in folded if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", without_marks)


def expand_search_terms(keyword: str) -> list[str]:
    raw = keyword.strip()
    if len(raw) < 2:
        return []
    terms: set[str] = {raw}
    norm = _normalize_vi(raw)
    terms.add(norm)

    alias = _SHOE_QUERY_ALIASES.get(norm)
    if alias:
        terms.update(alias)

    for key, extras in _SHOE_QUERY_ALIASES.items():
        if key in norm or norm in key:
            terms.add(key)
            terms.update(extras)

    return [t for t in terms if len(t) >= 2][:12]


def search_products(keyword: str, limit: int = 5) -> list[dict[str, Any]]:
    terms = expand_search_terms(keyword)
    if not terms:
        return []

    term_clauses: list[str] = []
    params: list[Any] = []
    for term in terms:
        q = f"%{term}%"
        term_clauses.append(f"({_MATCH_FIELDS.strip()})")
        params.extend([q] * 10)

    match_clause = " OR ".join(term_clauses)
    params.append(limit)

    try:
        with db_cursor() as cur:
            cur.execute(_SEARCH_SQL.format(match_clause=match_clause), tuple(params))
            return list(cur.fetchall())
    except Exception:
        return []


def stock_label(product: dict[str, Any]) -> str:
    total = int(product.get("total_stock") or 0)
    sizes = (product.get("size_stock") or "").strip()
    if total <= 0:
        return "Hết hàng"
    if sizes:
        return f"Còn {total} sp — size: {sizes}"
    return f"Còn {total} sp"


def _strip_search_fillers(text: str) -> str:
    """Bỏ lời nói đệm: «tôi cần», «cho mình», «muốn mua»… giữ phần mô tả giày."""
    cleaned = text.strip()
    for _ in range(5):
        next_cleaned = _SUBJECT_PREFIX.sub("", cleaned).strip()
        next_cleaned = _INTENT_PREFIX.sub("", next_cleaned).strip()
        next_cleaned = re.sub(
            r"^(tôi muốn|toi muon|cho tôi|cho toi|giúp|giup)\s+",
            "",
            next_cleaned,
            flags=re.IGNORECASE,
        ).strip()
        if next_cleaned == cleaned:
            break
        cleaned = next_cleaned
    return cleaned


def extract_product_keyword(message: str) -> str | None:
    text = message.strip()
    if len(text) < 2:
        return None

    norm = _normalize_vi(text)
    if norm in _SHOE_QUERY_ALIASES or any(k in norm for k in _SHOE_QUERY_ALIASES):
        return _strip_search_fillers(text) or text

    lowered = text.lower()
    patterns = [
        r"(?:tìm|tim|search|mua|sản phẩm|san pham|có|cần|can|muốn|muon)\s+(.+)",
        r"^(giày|giay|giầy|sneaker|dép|dep|sandal|boots?)\s+(.+)$",
    ]
    for pattern in patterns:
        match = re.search(pattern, lowered, re.IGNORECASE)
        if match:
            if match.lastindex and match.lastindex >= 2:
                kw = f"{(match.group(1) or '').strip()} {(match.group(2) or '').strip()}".strip()
            else:
                kw = (match.group(1) or match.group(0) or "").strip()
            kw = re.sub(
                r"\b(không|khong|nào|nao|gì|gi|bao nhiêu|bn|giá|gia|shop|cửa hàng|cu hang)\b",
                "",
                kw,
                flags=re.IGNORECASE,
            ).strip()
            if len(kw) >= 2:
                return kw

    head = _SHOE_HEAD.search(text)
    if head:
        kw = text[head.start() :].strip()
        kw = re.sub(r"[?.!]+$", "", kw).strip()
        if len(kw) >= 2:
            return kw

    cleaned = _strip_search_fillers(text)
    return cleaned if len(cleaned) >= 2 else text


def format_product_list(products: list[dict[str, Any]], shop_url: str) -> str:
    if not products:
        return ""
    lines = ["Mình tìm thấy các sản phẩm sau:"]
    for i, p in enumerate(products, 1):
        slug = p.get("slug") or p["id"]
        url = f"{shop_url.rstrip('/')}/product/{slug}"
        lines.append(
            f"{i}. **{p['name']}** — {format_catalog_vnd(float(p['price']))} "
            f"({p.get('brand_name', '')}) — {stock_label(p)}\n   → {url}"
        )
    return "\n".join(lines)
