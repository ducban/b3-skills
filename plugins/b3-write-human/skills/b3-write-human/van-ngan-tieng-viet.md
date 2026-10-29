# Văn ngắn tiếng Việt: chuỗi giao diện, quảng cáo, thư việc

Đọc tệp này **trước khi viết** thứ gì dưới một trang mà không phải tin chat:
chuỗi trên giao diện (UI string), thông báo lỗi, bài đăng mạng xã hội, quảng
cáo, trang giới thiệu sản phẩm, email và thông báo nội bộ. Ba tệp chia việc:
`SKILL.md` cạnh đây là luật chung cho mọi văn xuôi, năm gạch đầu dòng ở mục
"Vietnamese output" của nó đủ cho tin nhắn và đoạn ngắn; tệp này lo phần văn
ngắn có người đọc cụ thể và mục đích cụ thể; `tai-lieu-tieng-viet.md` lo tài
liệu dài từ khoảng một trang trở lên. Nội dung gộp từ skill `vietnamese-writing`
(bản 28/10/2026), chỉ giữ phần hai tệp kia chưa có.

## Xưng hô và giọng

Chọn ngôi xưng theo kênh, rồi giữ nguyên suốt bài.

| Ngôi | Dùng khi |
|---|---|
| `bạn` | hướng dẫn sản phẩm, chuỗi giao diện, bài đăng nói với người đọc |
| `người dùng` | tài liệu nói về họ ở ngôi thứ ba |
| `chúng tôi` | chỉ khi đang nói thay một tổ chức và được phép nói thay |
| `mình` | chỉ khi giọng trò chuyện hợp với kênh |

Không bịa danh tính người nói. Không đoán tuổi, giới, quan hệ hay vùng miền
của người đọc để chọn từ. Không chêm "ạ", "nha", "ace", "mình ơi" vào tài liệu
doanh nghiệp khi không ai yêu cầu. Trang trọng không phải quan liêu, thân mật
không phải suồng sã.

Câu lịch sự rỗng cắt thẳng. "Chúng tôi vô cùng hân hạnh được đồng hành cùng
quý khách hàng" không nói được gì. Thay bằng điều sắp làm cho họ: "Đơn của bạn
đang được đóng gói, dự kiến giao thứ Năm."

## Chuỗi giao diện

Mục tiêu là người đọc hiểu, làm được, và gỡ được khi hỏng. Không phải văn hay.

- **Nút**: động từ cộng đối tượng khi đủ chỗ. "Lưu thay đổi", "Thử lại", "Xóa
  dự án". Không dùng "OK" cho hành động không đảo lại được.
- **Lỗi**: nói chuyện gì xảy ra và làm gì tiếp. Không đổ cho người dùng, không
  hứa thứ mình không chắc sửa được, không "Oops!" hay "Rất tiếc!".
- **Trạng thái trống**: thiếu gì và bước kế tiếp là gì. Không vui vẻ giả.
- **Xác nhận**: nói cái gì vừa đổi. Hành động đảo được và không đảo được phải
  đọc khác nhau.
- **Xin quyền**: lý do đứng trước câu hỏi.
- **Một hành động một tên** suốt luồng. Đã gọi "đăng nhập" thì không đổi sang
  "truy cập tài khoản" ở màn sau.
- **Giữ nguyên** placeholder `{name}`, `{{count}}`, `%s`, thẻ HTML, cú pháp
  ICU, khóa bản địa hóa (localization key), nhãn trợ năng, luật số nhiều, và
  giới hạn ký tự của chuỗi gốc. Đếm ký tự trước khi nộp.

Trước và sau:

> Oops! Đã có lỗi không mong muốn xảy ra!
> → Không tải được danh sách đơn hàng. Thử lại sau ít phút.

> Bạn chưa có bất kỳ dữ liệu nào ở đây cả!
> → Chưa có dự án nào. Chọn "Tạo dự án" để bắt đầu.

> Rất tiếc! Có vẻ như một điều gì đó đã xảy ra.
> → Không lưu được thay đổi. Kiểm tra kết nối rồi thử lại.

## Quảng cáo, bài giới thiệu, bài đăng

**Chọn khuôn, đừng ép khuôn.** Khuôn chỉ là thứ tự sắp ý, và nhiều bài không
cần khuôn nào.

| Khuôn | Khi nào hợp |
|---|---|
| PAS (vấn đề, khoét sâu, giải pháp) | điểm đau có thật và có bằng chứng |
| AIDA (chú ý, quan tâm, muốn, hành động) | chiến dịch hoặc trang đích có tiến trình |
| BAB (trước, sau, cầu nối) | chuyện thay đổi mà kết quả bảo vệ được |
| FAB (tính năng, lợi thế, lợi ích) | mô tả sản phẩm khi tính năng đã biết rõ |
| Không khuôn | mô tả sự thật, chủ đề nhạy cảm, tin nhỏ |

**Rào bằng chứng.** Không bịa số liệu, kết quả lâm sàng, chứng nhận, lời
khách hàng, tồn kho, mức giảm giá, hạn chót, hay câu kiểu "chỉ cần dùng một
lần là đủ cả ngày". Thiếu bằng chứng thì viết trung tính, hoặc chừa chỗ trống
có đánh dấu để chủ sản phẩm điền: `[số liệu chờ chủ sản phẩm cung cấp]`.
Không hù dọa, không tạo khan hiếm giả, không viết hoa cả câu để giục. Tiêu đề
chỉ khi kênh cần tiêu đề.

Thứ tự nghĩ trước khi viết: người đọc là ai, họ cần xong việc gì, chỗ nào đang
đau, mình có bằng chứng gì, đề nghị là gì, kênh nào, rồi mới tới lời gọi hành
động.

Mảng y tế, tài chính, pháp lý: chữ chính xác có rào thắng chữ sinh động. Một
câu quảng cáo kem chống nắng khi chỉ biết SPF 50+ và chưa có tài liệu về UVA:

> Ngồi văn phòng cả ngày vẫn có lúc ra nắng, lúc đi ăn trưa hay ngồi cạnh cửa
> sổ. Nếu bạn cần kem chống nắng dùng hằng ngày, xem chỉ số SPF và hướng dẫn
> thoa lại trên nhãn. XYZ có SPF 50+. Xem thông tin sản phẩm để chọn loại hợp
> với da bạn.

Câu đó nói đúng thứ đã biết và không nói thêm.

## Thư và thông báo công việc

- Quyết định, yêu cầu hoặc kết quả nằm trên cùng. Lý do xuống dưới.
- Ai làm, làm gì, hạn nào, đang chờ ai. Chỉ ghi cái có trong nguồn; không có
  hạn thì hỏi, không tự đặt.
- Tách bốn thứ cho người đọc nhìn thấy: sự thật, rủi ro, đề xuất, giả định.
- Bảng cho trạng thái nhiều mục. Email vài dòng thì không cần tiêu đề mục.
- Không bịa trạng thái dự án, kết luận cuộc họp, con số tài chính, cam kết.

> Nhằm mục đích tối ưu hóa hiệu suất phối hợp liên phòng ban, chúng tôi xin
> phép đề xuất…
> → Đề xuất gom việc duyệt yêu cầu về một đầu mối để giảm thời gian chờ giữa
> các nhóm.

> Chúng tôi đã và đang nỗ lực hết sức để đảm bảo tiến độ.
> → Phần API đã xong. UI còn chờ xác nhận thiết kế nên chưa chốt ngày bàn giao.

## Cụm máy viết hay gặp trong văn ngắn

Bổ sung cho danh sách cấm ở `SKILL.md` và luật 10 của `tai-lieu-tieng-viet.md`.

| Tránh | Thay bằng | Vì sao |
|---|---|---|
| Hãy cùng khám phá… | vào thẳng nội dung | móc câu giả |
| Đừng bỏ lỡ cơ hội… | hạn thật, nếu có hạn thật | giục giả |
| Chắc chắn 100% | mức chắc đúng bằng bằng chứng | khẳng định quá tay |
| Điều quan trọng cần lưu ý là… | nói thẳng điều cần lưu ý | đệm |
| Mang đến trải nghiệm tuyệt vời | tên tính năng hoặc kết quả | khen không có gì đỡ |
| Được thực hiện bởi đội ngũ | đội ngũ làm | bị động dịch từ tiếng Anh |

Đừng cấm máy móc. Trong trích dẫn, hay khi người viết cố ý dùng giọng đó, cụm
này vẫn được đứng. Xét chức năng của câu, không đếm chữ.

## Trước khi gửi

Sửa theo thứ tự này, mỗi lượt một việc: cắt đệm, trả chủ ngữ và động từ về
chỗ, gỡ vế lồng, soát từng khẳng định có nguồn chưa, soát literal (lệnh, mã
lỗi, placeholder, số, đơn vị, từ rào như "có thể" hay "tối đa"), rồi đọc
thành tiếng một lần. Xong thì chạy cổng tự soi ba câu ở `SKILL.md`.
