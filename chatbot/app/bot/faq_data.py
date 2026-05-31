"""FAQ cửa hàng giày dép — khớp từ khóa trong tin nhắn khách."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class FaqItem:
    id: str
    keywords: tuple[str, ...]
    answer: str
    suggestions: tuple[str, ...] = ()


FAQ_ITEMS: tuple[FaqItem, ...] = (
    # --- Chào hỏi / kết thúc ---
    FaqItem(
        id="greeting_short",
        keywords=("xin chào", "chào shop", "hello", "hi", "hey", "chao ban"),
        answer=(
            "Xin chào! Mình là trợ lý EMP Shop — có thể giúp bạn:\n"
            "• Tìm giày (loại, thương hiệu, size)\n"
            "• Tra cứu đơn ORD-...\n"
            "• Hỏi giao hàng, thanh toán, đổi trả\n\n"
            "Bạn cần hỗ trợ gì ạ?"
        ),
        suggestions=("Giày chạy bộ size 42", "Đơn của tôi", "Phí giao hàng"),
    ),
    FaqItem(
        id="thanks",
        keywords=("cảm ơn", "cam on", "thanks", "thank you", "tạm biệt", "tam biet"),
        answer="Không có gì ạ! Chúc bạn mua sắm vui vẻ. Cần gì cứ nhắn mình nhé.",
        suggestions=("Giày sneaker", "Tra cứu đơn", "Phí giao hàng"),
    ),
    # --- Tìm / mua giày ---
    FaqItem(
        id="find_shoes_help",
        keywords=(
            "tìm giày",
            "tim giay",
            "kiếm giày",
            "kiem giay",
            "có bán giày",
            "co ban giay",
            "shop bán gì",
            "ban gi gi",
        ),
        answer=(
            "Bạn gửi loại giày hoặc thương hiệu (vd: *giày chạy bộ*, *sneaker Nike*, *size 42*). "
            "Mình sẽ tìm trong kho và gửi giá, tồn size và link sản phẩm."
        ),
        suggestions=("Giày chạy bộ size 42", "Sneaker Nike", "Giày bóng rổ"),
    ),
    FaqItem(
        id="purchase_guide",
        keywords=(
            "cách mua",
            "cach mua",
            "hướng dẫn mua",
            "huong dan mua",
            "đặt hàng",
            "dat hang",
            "mua như thế nào",
            "mua nhu the nao",
            "thêm vào giỏ",
            "them vao gio",
            "mua ngay",
        ),
        answer=(
            "**Cách đặt mua:**\n"
            "1. Tìm giày (hoặc mở link sản phẩm bot gửi)\n"
            "2. Chọn **size** còn hàng\n"
            "3. **Thêm vào giỏ** hoặc **Mua ngay** → thanh toán trên website\n\n"
            "Đơn hàng không đặt trực tiếp trong khung chat."
        ),
        suggestions=("Giày chạy bộ", "Tra cứu đơn", "Thanh toán COD"),
    ),
    FaqItem(
        id="size_stock",
        keywords=(
            "còn size",
            "con size",
            "size 42",
            "size 41",
            "còn hàng",
            "con hang",
            "hết size",
            "het size",
            "tồn kho",
            "ton kho",
        ),
        answer=(
            "Bạn gửi tên giày hoặc loại giày + size (vd: *giày chạy bộ size 42*). "
            "Mình kiểm tra tồn kho thật từ cửa hàng và báo size còn bao nhiêu đôi."
        ),
        suggestions=("Giày chạy bộ size 42", "Hoops Max", "Tra cứu đơn"),
    ),
    # --- Đơn hàng ---
    FaqItem(
        id="order_my_list",
        keywords=(
            "đơn của tôi",
            "don cua toi",
            "các đơn",
            "cac don",
            "đơn gần đây",
            "don gan day",
            "lịch sử đơn",
            "lich su don",
            "xem đơn",
            "xem don",
        ),
        answer=(
            "Để xem **đơn của bạn**, hãy **đăng nhập** trên website rồi nhắn *Đơn của tôi* "
            "(hoặc xem mục **Đơn hàng** trong tài khoản). "
            "Mình liệt kê tối đa 5 đơn gần nhất."
        ),
        suggestions=("Đơn của tôi", "Tra cứu đơn ORD-...", "Phí giao hàng"),
    ),
    FaqItem(
        id="order_track_code",
        keywords=(
            "tra cứu đơn",
            "tra cuu don",
            "mã đơn",
            "ma don",
            "theo dõi đơn",
            "theo doi don",
            "kiểm tra đơn",
            "kiem tra don",
        ),
        answer=(
            "Gửi **mã đơn** dạng `ORD-YYYYMMDD-HHMMSS-XXXXXX` "
            "(vd: ORD-20260527-160325-285917). "
            "Cần **đăng nhập** đúng tài khoản đã đặt hàng. "
            "Mã có trong email xác nhận hoặc mục **Đơn hàng**."
        ),
        suggestions=("Đơn của tôi", "Phí giao hàng", "Thanh toán PayOS"),
    ),
    # --- Giao hàng ---
    FaqItem(
        id="shipping_time",
        keywords=("bao lau giao", "mấy ngày giao", "ship bao lâu", "giao bao lau", "giao hàng bao lâu"),
        answer=(
            "Thời gian giao hàng dự kiến:\n"
            "- Nội thành: 2-3 ngày làm việc\n"
            "- Tỉnh/thành khác: 3-7 ngày\n"
            "Bạn có thể gửi mã đơn ORD-... để mình kiểm tra chi tiết."
        ),
        suggestions=("Tra cứu đơn ORD-...", "Phí giao hàng", "Chính sách đổi trả"),
    ),
    FaqItem(
        id="shipping_fee",
        keywords=("phi ship", "phí ship", "tiền ship", "phí giao", "mien phi ship", "miễn phí ship"),
        answer=(
            "Phí giao hàng phụ thuộc địa chỉ nhận và giá trị đơn. "
            "Bạn thêm sản phẩm vào giỏ và tới bước thanh toán để xem phí chính xác."
        ),
        suggestions=("Giày chạy bộ", "Thanh toán thế nào", "Tra cứu đơn"),
    ),
    # --- Thanh toán ---
    FaqItem(
        id="payment_methods",
        keywords=("thanh toán", "thanh toan", "cod", "chuyển khoản", "payos", "zalopay", "trả tiền"),
        answer=(
            "Hiện shop hỗ trợ:\n"
            "- COD (thanh toán khi nhận hàng)\n"
            "- PayOS (chuyển khoản/ví/thẻ tùy cổng)\n"
            "- ZaloPay (nếu shop bật trong cài đặt)\n\n"
            "Đơn **Chờ thanh toán** cần thanh toán trong thời hạn trên trang thanh toán."
        ),
        suggestions=("Giày chạy bộ", "Tra cứu đơn", "Đổi trả"),
    ),
    # --- Đổi trả ---
    FaqItem(
        id="return_policy",
        keywords=("đổi trả", "doi tra", "trả hàng", "tra hang", "hoàn tiền", "bao hanh", "bảo hành"),
        answer=(
            "Chính sách đổi trả cơ bản:\n"
            "- Hỗ trợ đổi size/màu trong 7 ngày (hàng còn tem, chưa qua sử dụng)\n"
            "- Lỗi sản xuất: hỗ trợ đổi/trả theo chính sách\n"
            "Bạn có thể gửi mã đơn để mình hướng dẫn nhanh hơn."
        ),
        suggestions=("Tra cứu đơn", "Liên hệ CSKH", "Phí giao hàng"),
    ),
    # --- Tài khoản ---
    FaqItem(
        id="account_help",
        keywords=("quên mật khẩu", "quen mat khau", "đăng nhập", "dang nhap", "đăng ký", "dang ky", "tài khoản"),
        answer=(
            "Bạn có thể đăng nhập/đăng ký ở trang tài khoản. "
            "Nếu quên mật khẩu, chọn 'Quên mật khẩu' để nhận email đặt lại. "
            "Sau khi đăng nhập, xem đơn trong mục **Đơn hàng**."
        ),
        suggestions=("Đổi trả", "Tra cứu đơn", "Giày sneaker"),
    ),
    # --- CSKH / hủy đơn ---
    FaqItem(
        id="contact_support",
        keywords=("liên hệ", "lien he", "nhân viên", "nhan vien", "cskh", "tư vấn", "tu van", "hotline"),
        answer=(
            "Bạn có thể liên hệ CSKH qua kênh hỗ trợ trên website. "
            "Nếu cần, mình có thể chuyển yêu cầu sang nhân viên tư vấn."
        ),
        suggestions=("Tra cứu đơn", "Giày chạy bộ", "Phí giao hàng"),
    ),
    FaqItem(
        id="order_cancel",
        keywords=("hủy đơn", "huy don", "hủy đơn hàng", "doi dia chi", "đổi địa chỉ", "sửa đơn"),
        answer=(
            "Bạn có thể yêu cầu hủy/sửa đơn sớm trước khi đơn chuyển sang trạng thái giao hàng. "
            "Gửi mã đơn ORD-... để mình hỗ trợ hướng dẫn phù hợp."
        ),
        suggestions=("Tra cứu đơn", "Đổi trả", "Liên hệ CSKH"),
    ),
    # --- Loại giày / danh mục ---
    FaqItem(
        id="shoe_categories",
        keywords=(
            "loại giày",
            "loai giay",
            "danh mục giày",
            "danh muc giay",
            "bán những loại",
            "ban nhung loai",
            "có những dòng",
            "co nhung dong",
        ),
        answer=(
            "Shop có các nhóm giày chính:\n"
            "• **Giày chạy bộ** (road, trail, daily trainer)\n"
            "• **Sneaker & lifestyle**\n"
            "• **Giày bóng rổ**\n"
            "• **Giày training – gym**\n"
            "• **Sandal & dép**\n"
            "• **Boots – cổ cao**\n"
            "• **Giày outdoor / leo núi**\n"
            "• **Phụ kiện giày dép** (vớ, dây giày…)\n\n"
            "Bạn nhắn loại cụ thể (vd: *giày chạy bộ size 42*) để mình tìm sản phẩm."
        ),
        suggestions=("Giày chạy bộ", "Sneaker Nike", "Sandal & dép"),
    ),
    FaqItem(
        id="running_category",
        keywords=("giày chạy", "giay chay", "chạy bộ", "chay bo", "marathon", "jogging"),
        answer=(
            "**Giày chạy bộ** phù hợp tập luyện đường phố, trail hoặc tập hằng ngày. "
            "Bạn có thể hỏi *giày chạy bộ size …* hoặc *giày chạy Nike/Asics* — mình tìm theo kho thực tế."
        ),
        suggestions=("Giày chạy bộ size 42", "Giày trail", "Runner Nova"),
    ),
    FaqItem(
        id="sneaker_category",
        keywords=("sneaker", "lifestyle", "giày thời trang", "giay thoi trang", "streetwear"),
        answer=(
            "**Sneaker & lifestyle** dùng đi học, đi chơi, phối đồ street. "
            "Gửi thương hiệu hoặc tên mẫu (vd: *sneaker Adidas*, *Court Flex*) để xem giá và tồn."
        ),
        suggestions=("Sneaker Nike", "Giày Adidas", "Giày lifestyle"),
    ),
    FaqItem(
        id="basketball_category",
        keywords=("giày bóng rổ", "giay bong ro", "bóng rổ", "bong ro", "hoops"),
        answer=(
            "**Giày bóng rổ** hỗ trợ bật nhảy, di chuyển sân indoor/outdoor. "
            "Thử tìm *giày bóng rổ* hoặc *Hoops Max* nếu shop đang có hàng."
        ),
        suggestions=("Hoops Max", "Giày bóng rổ size 42", "Giày training"),
    ),
    FaqItem(
        id="sandals_category",
        keywords=("sandal", "dép", "dep", "xăng đan", "xang dan", "tông", "tong"),
        answer=(
            "**Sandal & dép** cho mùa hè, đi trong nhà hoặc trekking nhẹ. "
            "Nhắn *sandal* hoặc *dép* để mình gợi ý mẫu còn hàng."
        ),
        suggestions=("Sandal", "Dép quai ngang", "Giày chạy bộ"),
    ),
    # --- Size / chọn giày ---
    FaqItem(
        id="size_guide",
        keywords=(
            "chọn size",
            "chon size",
            "size nào",
            "size nao",
            "bảng size",
            "bang size",
            "đo chân",
            "do chan",
            "rộng chân",
            "rong chan",
            "chật",
            "chat",
        ),
        answer=(
            "**Chọn size giày:**\n"
            "1. Đo chiều dài chân (cm) buổi chiều\n"
            "2. Đối chiếu bảng size trên **trang chi tiết sản phẩm**\n"
            "3. Giữa hai size thì thường chọn size lớn hơn nếu bàn chân rộng\n\n"
            "Nhắn *tên giày + size* (vd: Hoops Max size 42) — mình báo tồn thực tế."
        ),
        suggestions=("Giày chạy bộ size 42", "Hoops Max", "Cách mua"),
    ),
    FaqItem(
        id="exchange_size",
        keywords=("đổi size", "doi size", "đổi cỡ", "doi co", "size không vừa", "size khong vua"),
        answer=(
            "Nếu size không vừa, bạn có thể **đổi size/màu trong 7 ngày** (hàng còn tem, chưa qua sử dụng). "
            "Gửi **mã đơn ORD-...** hoặc liên hệ CSKH kèm ảnh sản phẩm."
        ),
        suggestions=("Chính sách đổi trả", "Tra cứu đơn", "Liên hệ CSKH"),
    ),
    # --- Giá / khuyến mãi ---
    FaqItem(
        id="price_info",
        keywords=(
            "giá bao nhiêu",
            "gia bao nhieu",
            "giá giày",
            "gia giay",
            "bao nhiêu tiền",
            "bao nhieu tien",
            "có sale",
            "co sale",
            "giảm giá",
            "giam gia",
            "khuyến mãi",
            "khuyen mai",
        ),
        answer=(
            "Giá từng mẫu xem trên trang sản phẩm (hiển thị dạng **xxx.000đ**). "
            "Bạn gửi tên giày hoặc loại giày — mình tra giá và tồn trong kho. "
            "Chương trình khuyến mãi (nếu có) áp dụng khi **thanh toán** trên website."
        ),
        suggestions=("Giày chạy bộ", "Hoops Max", "Thanh toán PayOS"),
    ),
    FaqItem(
        id="voucher_code",
        keywords=("mã giảm", "ma giam", "voucher", "coupon", "mã khuyến mãi", "ma khuyen mai", "mã gg"),
        answer=(
            "Nếu có **mã giảm giá**, nhập ở bước **Thanh toán / Giỏ hàng** trên website. "
            "Mã có điều kiện đơn tối thiểu hoặc thời hạn — xem chi tiết trong mục khuyến mãi shop."
        ),
        suggestions=("Cách mua", "Thanh toán", "Giày chạy bộ"),
    ),
    FaqItem(
        id="authentic_product",
        keywords=("chính hãng", "chinh hang", "hàng thật", "hang that", "fake", "hàng giả", "hang gia"),
        answer=(
            "Shop kinh doanh giày dép qua kênh ecommerce chính thức. "
            "Bạn nên mua trên website, giữ hóa đơn và tem mác để được hỗ trợ bảo hành/đổi trả theo chính sách."
        ),
        suggestions=("Giày chạy bộ", "Chính sách đổi trả", "Liên hệ CSKH"),
    ),
    # --- Đơn hàng (trạng thái) ---
    FaqItem(
        id="order_pending_payment",
        keywords=("chờ thanh toán", "cho thanh toan", "chưa thanh toán", "chua thanh toan", "thanh toán lại"),
        answer=(
            "Đơn **Chờ thanh toán** cần hoàn tất trên trang **Thanh toán** trong thời hạn hiển thị. "
            "Nếu đã trừ tiền mà đơn chưa cập nhật, gửi mã **ORD-...** để được kiểm tra."
        ),
        suggestions=("Tra cứu đơn ORD-...", "Thanh toán PayOS", "Đơn của tôi"),
    ),
    FaqItem(
        id="order_shipping_status",
        keywords=(
            "đang giao",
            "dang giao",
            "đã ship",
            "da ship",
            "chưa nhận hàng",
            "chua nhan hang",
            "giao tới đâu",
            "giao toi dau",
        ),
        answer=(
            "Để biết đơn đang ở bước nào, gửi mã **ORD-...** (đã đăng nhập) hoặc xem **Đơn hàng** trong tài khoản. "
            "Trạng thái thường gặp: đã đặt → đóng gói → đang giao → đã giao."
        ),
        suggestions=("Đơn của tôi", "Tra cứu đơn", "Giao bao lâu"),
    ),
    FaqItem(
        id="receive_issue",
        keywords=(
            "nhận sai",
            "nhan sai",
            "thiếu hàng",
            "thieu hang",
            "hàng lỗi",
            "hang loi",
            "trả hàng",
            "doi hang sai",
        ),
        answer=(
            "Rất tiếc nếu bạn gặp sự cố. Vui lòng:\n"
            "1. Chụp ảnh sản phẩm + tem mác + vận đơn\n"
            "2. Gửi mã đơn **ORD-...**\n"
            "3. Liên hệ CSKH hoặc yêu cầu đổi/trả trong chi tiết đơn\n\n"
            "Lỗi sản xuất được ưu tiên hỗ trợ đổi/trả."
        ),
        suggestions=("Chính sách đổi trả", "Liên hệ CSKH", "Tra cứu đơn"),
    ),
    # --- Thanh toán chi tiết ---
    FaqItem(
        id="cod_vs_online",
        keywords=("cod hay", "cod hay payos", "nên chọn cod", "nen chon cod", "trả khi nhận"),
        answer=(
            "**COD:** trả tiền mặt khi nhận — tiện nếu chưa chuyển khoản.\n"
            "**PayOS/ZaloPay:** thanh toán online ngay — đơn xử lý nhanh hơn.\n"
            "Chọn cách phù hợp ở bước thanh toán trên website."
        ),
        suggestions=("Thanh toán COD", "Tra cứu đơn", "Cách mua"),
    ),
    # --- Giỏ hàng / website ---
    FaqItem(
        id="cart_help",
        keywords=("giỏ hàng", "gio hang", "cart", "xóa giỏ", "xoa gio", "sửa số lượng"),
        answer=(
            "Vào **Giỏ hàng** trên website để đổi size/số lượng hoặc xóa sản phẩm. "
            "Cần **đăng nhập** để đồng bộ giỏ giữa các thiết bị. "
            "Sau đó chọn **Thanh toán** để đặt hàng."
        ),
        suggestions=("Cách mua", "Giày chạy bộ", "Thanh toán"),
    ),
    FaqItem(
        id="compare_products",
        keywords=("so sánh", "so sanh", "khác nhau", "khac nhau", "nên mua đôi nào"),
        answer=(
            "Bạn có thể nhắn hai tên giày (vd: *Runner Nova* và *Hoops Max*) — "
            "mình so sánh giá, thương hiệu và tồn size từ dữ liệu shop. "
            "Hoặc xem từng trang sản phẩm trên website."
        ),
        suggestions=("Runner Nova", "Hoops Max", "Giày chạy bộ"),
    ),
    FaqItem(
        id="shoe_care",
        keywords=("bảo quản", "bao quan", "giặt giày", "giat giay", "vệ sinh", "ve sinh", "mùi giày"),
        answer=(
            "**Bảo quản giày:**\n"
            "• Lau khô sau khi dùng, không phơi nắng gắt\n"
            "• Dùng túi riêng, chống ẩm\n"
            "• Vệ sinh theo chất liệu (da/vải/mesh) — tránh ngâm nước lâu\n"
            "• Luân phiên 2 đôi nếu chạy bộ thường xuyên"
        ),
        suggestions=("Giày chạy bộ", "Giày sneaker", "Phụ kiện giày"),
    ),
    FaqItem(
        id="product_reviews",
        keywords=("đánh giá", "danh gia", "review", "sao", "rating", "có tốt không"),
        answer=(
            "Bạn xem **đánh giá & bình luận** trên trang chi tiết từng sản phẩm. "
            "Sau khi mua và nhận hàng, bạn có thể đánh giá trong mục **Tài khoản** (nếu đã đăng nhập)."
        ),
        suggestions=("Giày chạy bộ", "Hoops Max", "Cách mua"),
    ),
    FaqItem(
        id="flash_sale_info",
        keywords=("flash sale", "flashsale", "sale sốc", "giờ vàng", "gio vang"),
        answer=(
            "Chương trình **Flash sale / khuyến mãi** (nếu có) hiển thị trên trang chủ hoặc mục marketing. "
            "Số lượng có hạn — thêm giỏ và thanh toán sớm khi còn tồn size."
        ),
        suggestions=("Giày chạy bộ", "Sneaker", "Cách mua"),
    ),
    FaqItem(
        id="ship_regions",
        keywords=("giao tỉnh", "giao tinh", "giao xa", "nội thành", "noi thanh", "hcm", "hà nội", "ha noi"),
        answer=(
            "Shop giao **toàn quốc** (phí và thời gian tùy địa chỉ).\n"
            "• Nội thành: khoảng 2–3 ngày làm việc\n"
            "• Tỉnh/thành khác: khoảng 3–7 ngày\n"
            "Phí ship hiển thị khi bạn nhập địa chỉ lúc checkout."
        ),
        suggestions=("Phí giao hàng", "Giao bao lâu", "Cách mua"),
    ),
    # --- Danh mục bổ sung ---
    FaqItem(
        id="training_category",
        keywords=("giày gym", "giay gym", "tập gym", "tap gym", "training", "hiit", "nâng tạ", "nang ta", "cross-training"),
        answer=(
            "**Giày training – gym** dùng cho HIIT, nâng tạ, cross-training, aerobic. "
            "Nhắn *giày training* hoặc *giày gym size …* để mình tìm mẫu còn hàng."
        ),
        suggestions=("Giày training", "Giày bóng rổ", "Giày chạy bộ"),
    ),
    FaqItem(
        id="boots_category",
        keywords=("boots", "cổ cao", "co cao", "chelsea", "combat", "giày mùa đông", "giay mua dong"),
        answer=(
            "**Boots – cổ cao** (Chelsea, combat, cổ lửng…) phù hợp mùa lạnh hoặc phối street. "
            "Gửi *boots* hoặc tên mẫu để xem giá và size."
        ),
        suggestions=("Boots", "Giày sneaker", "Giày outdoor"),
    ),
    FaqItem(
        id="outdoor_category",
        keywords=("leo núi", "leo nui", "trekking", "outdoor", "đế gai", "de gai", "giày trail", "giay trail"),
        answer=(
            "**Giày outdoor / trail** hỗ trợ trekking, địa hình gồ ghề, chống trượt. "
            "Thử *giày trail* hoặc *giày outdoor size …*."
        ),
        suggestions=("Giày trail", "Giày chạy bộ", "Giày outdoor"),
    ),
    FaqItem(
        id="accessories_category",
        keywords=("phụ kiện", "phu kien", "vớ giày", "vo giay", "dây giày", "day giay", "tất", "tat", "lót giày"),
        answer=(
            "Shop có **phụ kiện giày dép**: vớ/tất, dây giày, lót… "
            "Nhắn *phụ kiện* hoặc tên sản phẩm để mình tra kho."
        ),
        suggestions=("Phụ kiện giày", "Giày chạy bộ", "Sneaker"),
    ),
    # --- Thương hiệu ---
    FaqItem(
        id="brand_nike",
        keywords=("nike", "air max", "jordan", "giày nike", "giay nike"),
        answer=(
            "Bạn có thể tìm **Nike** bằng cách nhắn *giày Nike*, *sneaker Nike* hoặc tên mẫu cụ thể. "
            "Mình hiển thị giá, tồn size và link từ kho shop."
        ),
        suggestions=("Sneaker Nike", "Giày chạy bộ Nike", "Giày bóng rổ"),
    ),
    FaqItem(
        id="brand_adidas",
        keywords=("adidas", "ultraboost", "stan smith", "giày adidas", "giay adidas"),
        answer=(
            "Để xem **Adidas**, nhắn *giày Adidas* hoặc loại giày + size (vd: *Adidas size 42*). "
            "Mình lọc theo thương hiệu trong catalog."
        ),
        suggestions=("Giày Adidas", "Sneaker Adidas", "Giày chạy bộ"),
    ),
    FaqItem(
        id="brand_asics",
        keywords=("asics", "gel", "giày asics", "giay asics"),
        answer=(
            "**Asics** thường có dòng chạy bộ ổn định. "
            "Thử *giày Asics* hoặc *giày chạy Asics size …*."
        ),
        suggestions=("Giày chạy bộ", "Giày Asics", "Runner Nova"),
    ),
    FaqItem(
        id="brand_puma",
        keywords=("puma", "giày puma", "giay puma"),
        answer=(
            "Nhắn *giày Puma* hoặc *sneaker Puma* — mình tìm các mẫu Puma đang bán trên shop."
        ),
        suggestions=("Sneaker", "Giày chạy bộ", "Giày lifestyle"),
    ),
    # --- Gợi ý / mua hàng ---
    FaqItem(
        id="shoe_recommendation",
        keywords=(
            "gợi ý giày",
            "goi y giay",
            "nên mua giày gì",
            "nen mua giay gi",
            "giày nào tốt",
            "giay nao tot",
            "tư vấn giày",
            "tu van giay",
        ),
        answer=(
            "Để gợi ý phù hợp, bạn cho mình biết:\n"
            "• Mục đích (chạy bộ / đi phố / bóng rổ / gym…)\n"
            "• Size và ngân sách (nếu có)\n"
            "• Thương hiệu ưa thích\n\n"
            "Hoặc nhắn loại giày — mình liệt kê sản phẩm đang có."
        ),
        suggestions=("Giày chạy bộ size 42", "Sneaker Nike", "Giày bóng rổ"),
    ),
    FaqItem(
        id="best_seller",
        keywords=("bán chạy", "ban chay", "hot", "xu hướng", "xu huong", "nhiều người mua"),
        answer=(
            "Mẫu **bán chạy** thường nằm ở trang chủ hoặc mục nổi bật. "
            "Bạn cũng có thể hỏi loại giày (vd: *giày chạy bộ*) — mình sắp theo tồn và giá trong shop."
        ),
        suggestions=("Giày chạy bộ", "Hoops Max", "Runner Nova"),
    ),
    FaqItem(
        id="new_arrivals",
        keywords=("hàng mới", "hang moi", "mới về", "moi ve", "sản phẩm mới", "san pham moi"),
        answer=(
            "Sản phẩm **mới** cập nhật trên website theo từng đợt nhập. "
            "Bạn xem trang chủ hoặc nhắn loại giày để mình tìm trong danh mục hiện có."
        ),
        suggestions=("Giày chạy bộ", "Sneaker", "Giày training"),
    ),
    FaqItem(
        id="gift_shoes",
        keywords=("mua tặng", "mua tang", "tặng giày", "tang giay", "quà sinh nhật", "qua sinh nhat"),
        answer=(
            "Khi **tặng giày**, nên biết size người nhận (đo chân hoặc hỏi size giày đang đi). "
            "Bạn đặt hàng trên website, ghi **ghi chú đơn** nếu cần gói quà (tùy shop hỗ trợ)."
        ),
        suggestions=("Chọn size", "Cách mua", "Giày sneaker"),
    ),
    FaqItem(
        id="buy_now_help",
        keywords=("mua ngay", "buy now", "không qua giỏ", "khong qua gio"),
        answer=(
            "Nút **Mua ngay** trên trang sản phẩm đưa bạn thẳng tới **Thanh toán** "
            "(không cần thêm giỏ trước). Vẫn phải chọn **size** còn hàng."
        ),
        suggestions=("Cách mua", "Giày chạy bộ", "Thanh toán"),
    ),
    FaqItem(
        id="men_women_shoes",
        keywords=("giày nam", "giay nam", "giày nữ", "giay nu", "unisex", "giày trẻ em", "giay tre em"),
        answer=(
            "Bạn nhắn *giày nam*, *giày nữ* hoặc kèm loại giày + size — "
            "mình tìm theo tên/mô tả sản phẩm trong catalog shop."
        ),
        suggestions=("Giày chạy bộ", "Sneaker", "Giày sneaker nữ"),
    ),
    FaqItem(
        id="color_variant",
        keywords=("đổi màu", "doi mau", "màu khác", "mau khac", "còn màu", "con mau"),
        answer=(
            "Mỗi màu thường là **biến thể riêng** trên trang sản phẩm. "
            "Bạn mở link sản phẩm bot gửi để chọn màu/size. "
            "Đổi màu sau mua: xem **chính sách đổi trả** (trong 7 ngày, còn tem)."
        ),
        suggestions=("Chính sách đổi trả", "Giày chạy bộ", "Cách mua"),
    ),
    FaqItem(
        id="wide_narrow_feet",
        keywords=("bàn chân rộng", "ban chan rong", "chân bè", "chan be", "bàn chân hẹp", "ban chan hep", "2e", "4e"),
        answer=(
            "Nếu bàn chân **rộng**, ưu tiên mẫu có fit *wide* hoặc chọn **nửa size lớn hơn**. "
            "Xem mô tả sản phẩm và đánh giá khách trước đó. "
            "Nhắn tên giày + size để mình báo tồn."
        ),
        suggestions=("Chọn size", "Giày chạy bộ", "Đổi size"),
    ),
    # --- Đơn / thanh toán / vận chuyển chi tiết ---
    FaqItem(
        id="tracking_number",
        keywords=("mã vận đơn", "ma van don", "tracking", "shipper", "đơn vị vận chuyển"),
        answer=(
            "Khi đơn **đang giao**, mã vận đơn (nếu có) hiển thị trong **chi tiết đơn** trên website. "
            "Gửi mã **ORD-...** sau khi đăng nhập để mình tra trạng thái."
        ),
        suggestions=("Tra cứu đơn", "Đơn của tôi", "Giao bao lâu"),
    ),
    FaqItem(
        id="payment_failed",
        keywords=("thanh toán thất bại", "thanh toan that bai", "trừ tiền", "tru tien", "lỗi payos", "loi payos"),
        answer=(
            "Nếu **thanh toán lỗi** nhưng đã trừ tiền: giữ biên lai, gửi mã **ORD-...** cho CSKH. "
            "Nếu chưa trừ: thử lại trên trang thanh toán hoặc chọn **COD**."
        ),
        suggestions=("Tra cứu đơn", "Thanh toán PayOS", "Liên hệ CSKH"),
    ),
    FaqItem(
        id="free_shipping",
        keywords=("freeship", "free ship", "miễn phí vận chuyển", "mien phi van chuyen", "đơn bao nhiêu freeship"),
        answer=(
            "Chương trình **miễn phí ship** (nếu shop bật) áp dụng theo giá trị đơn hoặc mã KM — "
            "xem ở bước **checkout** sau khi nhập địa chỉ. "
            "Phí ship mặc định vẫn tính theo khu vực."
        ),
        suggestions=("Phí giao hàng", "Mã giảm giá", "Cách mua"),
    ),
    FaqItem(
        id="return_shipping_fee",
        keywords=("ship đổi trả", "ship doi tra", "ai trả phí đổi", "phi doi hang"),
        answer=(
            "Phí **gửi trả hàng** tùy lý do (đổi size vs lỗi sản phẩm) và chính sách từng thời điểm. "
            "Liên hệ CSKH kèm mã **ORD-...** để được hướng dẫn cụ thể."
        ),
        suggestions=("Chính sách đổi trả", "Liên hệ CSKH", "Đổi size"),
    ),
    FaqItem(
        id="order_email",
        keywords=("email xác nhận", "email xac nhan", "không nhận mail", "khong nhan mail", "hóa đơn", "hoa don"),
        answer=(
            "Email **xác nhận đơn** gửi sau khi đặt hàng thành công (kiểm tra cả **Spam**). "
            "Mã đơn **ORD-...** cũng có trong mục **Đơn hàng** khi đã đăng nhập."
        ),
        suggestions=("Tra cứu đơn", "Đơn của tôi", "Liên hệ CSKH"),
    ),
    FaqItem(
        id="invoice_vat",
        keywords=("xuất hóa đơn", "xuat hoa don", "vat", "công ty", "cong ty"),
        answer=(
            "Nếu cần **hóa đơn VAT**, ghi thông tin xuất HĐ ở bước **ghi chú đơn** hoặc liên hệ CSKH "
            "ngay sau khi đặt, kèm mã **ORD-...**."
        ),
        suggestions=("Liên hệ CSKH", "Tra cứu đơn", "Cách mua"),
    ),
    FaqItem(
        id="installment",
        keywords=("trả góp", "tra gop", "góp tháng", "gop thang", "0%", "tín dụng"),
        answer=(
            "Hiện shop ưu tiên **COD** và **thanh toán online** (PayOS/ZaloPay). "
            "Trả góp (nếu có) sẽ được thông báo trên trang thanh toán — bạn kiểm tra khi checkout."
        ),
        suggestions=("Thanh toán", "COD hay PayOS", "Cách mua"),
    ),
    FaqItem(
        id="chatbot_limits",
        keywords=("bot làm gì", "bot lam gi", "đặt hàng qua chat", "dat hang qua chat", "chat đặt"),
        answer=(
            "Mình **không đặt hàng trực tiếp** trong chat. Mình có thể:\n"
            "• Tìm giày, báo giá & tồn size\n"
            "• Tra đơn (khi đã đăng nhập)\n"
            "• Trả lời FAQ ship, thanh toán, đổi trả\n\n"
            "Đặt mua trên **website** (giỏ hàng / mua ngay)."
        ),
        suggestions=("Cách mua", "Giày chạy bộ", "Đơn của tôi"),
    ),
    FaqItem(
        id="shop_info",
        keywords=("địa chỉ shop", "dia chi shop", "cửa hàng", "cua hang", "mở cửa", "mo cua", "giờ làm việc"),
        answer=(
            "EMP Shop bán **giày dép online** trên website. "
            "Thông tin liên hệ / giờ hỗ trợ xem mục **Cài đặt** hoặc **Liên hệ** trên trang. "
            "Mua hàng và tra đơn chủ yếu qua web + chatbot."
        ),
        suggestions=("Liên hệ CSKH", "Cách mua", "Tìm giày"),
    ),
    FaqItem(
        id="rainy_shoes",
        keywords=("giày mưa", "giay mua", "đi mưa", "di mua", "chống nước", "chong nuoc"),
        answer=(
            "Giày **chống nước** thường nằm nhóm outdoor/trail hoặc mô tả *water resistant*. "
            "Nhắn *giày outdoor* hoặc *giày trail* để mình gợi ý mẫu phù hợp."
        ),
        suggestions=("Giày outdoor", "Giày trail", "Sandal"),
    ),
    # --- Gợi ý khi bot chưa hiểu ---
    FaqItem(
        id="help_topics",
        keywords=(
            "giúp gì",
            "giup gi",
            "hỗ trợ gì",
            "ho tro gi",
            "làm được gì",
            "lam duoc gi",
            "hỏi gì",
            "hoi gi",
        ),
        answer=(
            "Bạn có thể hỏi:\n"
            "• *Tìm giày* (Nike, chạy bộ, sneaker, size 42…)\n"
            "• *Gợi ý giày* / *hàng mới* / *bán chạy*\n"
            "• *Đơn của tôi* hoặc mã **ORD-...**\n"
            "• *Phí ship*, *Thanh toán*, *Đổi trả*, *Mã giảm*\n"
            "• *Cách mua* — đặt trên website, không qua chat"
        ),
        suggestions=("Giày chạy bộ size 42", "Đơn của tôi", "Phí giao hàng"),
    ),
)


def _normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower().strip())


def lookup_faq_item(message: str) -> FaqItem | None:
    text = _normalize_text(message)
    best: FaqItem | None = None
    best_score = 0
    for item in FAQ_ITEMS:
        score = sum(len(kw) for kw in item.keywords if kw in text)
        if score > best_score:
            best_score = score
            best = item
    return best if best_score > 0 else None


def iter_faq_entries() -> list[tuple[str, str]]:
    """(title, content) cho knowledge base / tài liệu."""
    return [(item.id, f"Q: {item.keywords[0]}\n\n{item.answer}") for item in FAQ_ITEMS]
