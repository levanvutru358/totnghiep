# Câu hỏi & câu trả lời — Chatbot shop giày dép

Đồng bộ với `app/bot/faq_data.py` (**61 nhóm FAQ** + tìm/tra đơn từ database).

## A. Chào hỏi & chung

| Câu hỏi khách | Câu trả lời (tóm tắt) |
|---------------|-------------------------|
| Xin chào | Giới thiệu trợ lý; tìm giày, tra ORD, ship, thanh toán, đổi trả |
| Cảm ơn | Chúc mua sắm vui vẻ |
| Giúp gì / hỗ trợ gì | Danh sách chủ đề có thể hỏi |
| Bot làm được gì | Tìm giày, tra đơn, FAQ — không đặt hàng trong chat |
| Địa chỉ / giờ shop | Bán online trên website; liên hệ trên trang |

## B. Tìm & mua giày

| Câu hỏi khách | Câu trả lời (tóm tắt) |
|---------------|-------------------------|
| Tìm giày / shop bán gì | Gửi loại, hãng, size → tra kho |
| Cách mua / giỏ hàng / mua ngay | Chọn size → giỏ hoặc mua ngay trên web |
| Mua ngay (buy now) | Thẳng checkout, vẫn chọn size |
| Còn size 42? | Gửi tên giày + size → báo tồn |
| Chọn size / bảng size | Đo chân, xem bảng trên trang SP |
| Bàn chân rộng / hẹp | Wide fit hoặc nửa size lớn hơn |
| So sánh 2 đôi giày | Nhắn tên 2 mẫu → so giá, tồn |
| Gợi ý / tư vấn giày | Nêu mục đích, size, ngân sách |
| Bán chạy / hàng mới | Trang chủ hoặc hỏi loại giày |
| Mua tặng | Biết size người nhận; ghi chú đơn |
| Giày nam / nữ / trẻ em | Nhắn loại + size → tìm catalog |
| Đổi màu | Chọn trên trang SP; đổi trả trong 7 ngày |
| Giá / sale / khuyến mãi | Xem trên trang SP; nhắn tên mẫu |
| Mã giảm giá / voucher | Nhập lúc thanh toán |
| Chính hãng / hàng thật | Mua trên website, giữ hóa đơn |
| Đánh giá sản phẩm | Review trên trang chi tiết |
| Flash sale | Trang chủ / marketing |

## C. Danh mục & thương hiệu

| Câu hỏi khách | Câu trả lời (tóm tắt) |
|---------------|-------------------------|
| Loại giày / danh mục | Chạy bộ, sneaker, bóng rổ, training, sandal, boots, outdoor, phụ kiện |
| Giày chạy bộ / trail | Road, trail, daily… |
| Sneaker / lifestyle | Street, đi phố… |
| Giày bóng rổ | Indoor/outdoor |
| Sandal / dép | Mùa hè, trong nhà |
| Giày gym / training | HIIT, nâng tạ, cross-training |
| Boots / mùa đông | Chelsea, combat… |
| Outdoor / leo núi | Trekking, đế gai |
| Phụ kiện | Vớ, dây giày, lót… |
| Nike / Adidas / Asics / Puma | Nhắn hãng + loại/size → tra kho |
| Giày mưa / chống nước | Outdoor, trail |

## D. Đơn hàng

| Câu hỏi khách | Câu trả lời (tóm tắt) |
|---------------|-------------------------|
| Đơn của tôi | Đăng nhập → tối đa 5 đơn |
| Tra cứu ORD-... | Mã đơn + đăng nhập |
| Chờ thanh toán | Thanh toán trong hạn |
| Đang giao / mã vận đơn | ORD hoặc chi tiết đơn |
| Hủy đơn / đổi địa chỉ | Sớm + mã ORD |
| Nhận sai / hàng lỗi | Ảnh + ORD + CSKH |
| Email xác nhận / hóa đơn | Spam + mục Đơn hàng; VAT qua CSKH |
| Thanh toán thất bại | Giữ biên lai + ORD |

## E. Giao hàng & thanh toán

| Câu hỏi khách | Câu trả lời (tóm tắt) |
|---------------|-------------------------|
| Giao bao lâu? | Nội thành 2–3 ngày; tỉnh 3–7 ngày |
| Phí ship / giao tỉnh / freeship | Checkout theo địa chỉ & KM |
| Thanh toán / COD / PayOS | Liệt kê hình thức |
| COD hay PayOS? | So sánh ưu nhược |
| Trả góp | COD/online; trả góp nếu có ở checkout |
| Phí ship khi đổi trả | Tùy lý do — hỏi CSKH |

## F. Đổi trả & tài khoản

| Câu hỏi khách | Câu trả lời (tóm tắt) |
|---------------|-------------------------|
| Đổi trả / bảo hành | 7 ngày, còn tem |
| Đổi size | Trong 7 ngày + mã đơn |
| Đăng nhập / quên MK | Trang tài khoản |
| Liên hệ CSKH | Kênh trên website |

## G. Từ database (không nằm FAQ tĩnh)

| Câu hỏi khách | Câu trả lời |
|---------------|-------------|
| Giày chạy bộ / Hoops Max / Nike size 42 | Danh sách SP: giá **.000đ**, tồn size, link |
| Tôi muốn mua [tên giày] | Danh sách + hướng dẫn đặt mua |
| Không tìm thấy | Chưa tìm thấy giày phù hợp… |

---

**Cập nhật FAQ:** restart `python main.py` — tự thêm mục mới vào knowledge (theo `faq_id`).
