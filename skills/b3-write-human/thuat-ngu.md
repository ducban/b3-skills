# Thuật ngữ: dịch hay giữ nguyên

Đọc tệp này khi sắp viết tiếng Việt mà gặp một từ nghề chưa biết nên dịch hay
để nguyên tiếng Anh. Nó không bàn văn phong, hai tệp kia lo phần đó. Nó trả
lời đúng một câu: từ này viết thế nào trong bài tiếng Việt. Kèm bảng tra
`bang-tu.md` cho những từ đã chốt, tra bảng trước, chỉ chạy chuỗi dưới đây
khi bảng chưa có.

Chuẩn rút từ nghiên cứu 29/10/2026 trong vault (`research/projects/2026-10-29-skill-viet-tieng-viet/`),
dựng trên ISO 704, phép thử định danh của nghề dịch tài liệu phần mềm, ba mức
khó dịch của ngôn ngữ học, và TCVN 13902:2023 cho thuật ngữ AI.

## Năm cửa ải

Hỏi theo đúng thứ tự. Qua được một cửa là xong, không xét tiếp. Im lặng ở
mọi cửa thì giữ nguyên tiếng Anh, không dịch thử.

| # | Câu hỏi | Trả lời "có" thì |
|---|---|---|
| 1 | Có ai gõ, tra hay đối chiếu đúng chuỗi này không? | Giữ nguyên. Tên lệnh, nhãn nút, tham số, API endpoint, tên định dạng, tên vị trí tuyển dụng. |
| 2 | Tiêu chuẩn quốc gia đã có bản tiếng Việt chưa? | Theo tiêu chuẩn, không tự nghĩ bản khác. Thuật ngữ AI tra `tcvn-13902.md`, 104 mục của TCVN 13902:2023. Cửa này hỏng theo ba kiểu, xem mục "Khi cửa 2 hụt". |
| 3 | Nghề tiếng Việt đã dùng sẵn một từ chưa? | Dùng từ đó: máy chủ, đường dẫn, con trỏ, cơ sở dữ liệu. |
| 4 | Dịch được bằng từ sẵn có, hay bằng liên tưởng người đọc nhận ra ngay? | Dịch, chú tiếng Anh trong ngoặc ở lần đầu mỗi mục. |
| 5 | Phải dựng một từ mới mà chưa ai trong nghề dùng? | Giữ nguyên tiếng Anh. |

Cửa 1 đứng đầu vì nó là cửa duy nhất chặn được một bản dịch hay mà sai việc.
"Mặt tiền" nghe gọn hơn "front-end", và nếu được nghĩ tới chuyện dịch cho hay
trước khi hỏi "có ai tra chuỗi này không" thì ai cũng chọn "mặt tiền". Cửa 2
đứng trên cửa 3 vì tiêu chuẩn quốc gia có thẩm quyền mà một bài trong nghề
không có. Cửa 5 là cửa mặc định: tới đây tức là tiếng Việt chưa có chỗ đứng
cho từ này.

Bốn trường hợp đã chạy qua chuỗi:

| Từ | Dừng ở | Viết là |
|---|---|---|
| agent | cửa 2, TCVN 13902:2023 mục 3.1.1 | tác tử (agent) |
| sandbox | cửa 5, dịch là phải dựng mới | sandbox |
| front-end | cửa 1, là nhãn người ta tra và đối chiếu | front-end |
| compaction | cửa 5 | compaction |

## Phép thử tra ngược

Chuỗi cửa ải không bắt được một lỗi: bản dịch gọi sang một khái niệm khác.
"Bền qua sập" không phải bản dịch dở của compaction, nó là một khái niệm khác
hẳn. Nghĩa gốc là co gọn lại, nghĩa bản dịch là chịu được sự cố.

Nên mọi bản dịch phải qua thêm một phép thử, kể cả bản lấy từ tiêu chuẩn ở
cửa 2 chứ không riêng bản vừa nghĩ ra ở cửa 4: đưa bản dịch cho một người
trong nghề và hỏi nó dịch từ gì. Họ không nói ra được từ gốc thì bỏ bản dịch
đó. Tự kiểm thì hỏi mình câu đó thật, đừng gật cho qua.

## Khi cửa 2 hụt

Cửa 2 có thẩm quyền nhưng không vô điều kiện. Đọc hết 104 mục của TCVN
13902:2023 thì thấy nó hụt theo ba kiểu. Gặp kiểu nào thì rơi xuống cửa 3 và
đi tiếp chuỗi như thường, trừ kiểu thứ ba có luật riêng.

| Kiểu hụt | Dấu hiệu | Ví dụ | Làm gì |
|---|---|---|---|
| Nguồn im lặng | `tcvn-13902.md` không có mục nào cho từ đó | prompt, mô hình ngôn ngữ lớn (large language model), cơ sở tri thức (knowledge base), sandbox | Xuống cửa 3. Phần lớn từ nghề gặp hằng ngày nằm ở đây: ISO/IEC 22989 chốt năm 2022, trước đợt từ vựng mô hình ngôn ngữ lớn |
| Bản dịch trượt phép thử tra ngược | Người trong nghề đọc bản dịch sẽ đoán ra một từ gốc khác | "Dị thường" cho heteronomy (mục 3.1.16) tra ngược về anomaly; "Áp đặt" cho imputation (mục 3.2.8) tra ngược về impose | Không theo tiêu chuẩn ở mục đó, xuống cửa 3. Dạng của tiêu chuẩn ghi vào `bang-tu.md` mục "Chỗ còn tranh", kèm lý do, chứ không lặng lẽ bỏ |
| Nguồn tự nói ngược | Một văn bản gọi một khái niệm bằng hai tên | Mục 3.1.1 gọi "Tác tử AI", thân tiêu chuẩn từ chương 5 viết "tác nhân" 21 lần | Theo luật con ngay dưới |

**Mục định nghĩa thắng câu chạy.** Trong cùng một nguồn, chỗ định nghĩa thuật
ngữ thắng chỗ dùng thuật ngữ trong câu chạy, dù câu chạy dùng nhiều hơn. Chương
3 của tiêu chuẩn là chương thuật ngữ, có mặt để chốt tên gọi; chương 5 trở đi
là phần diễn giải, người dịch viết theo mạch văn. Nên viết "tác tử". Đừng lẫn
luật này với quy ước dạng dài, dạng ngắn: "hệ thống trí tuệ nhân tạo" ở mục
3.1.4 và "hệ thống AI" trong thân bài là một tên viết hai độ dài, dùng được cả
hai. "Tác tử" với "tác nhân" là hai tên, nên chỉ một tên được dùng.

## Trật tự từ: danh từ trung tâm đứng đầu

Tiếng Anh đặt danh từ trung tâm ở cuối cụm, tiếng Việt đặt ở đầu. Dịch một cụm
thì tìm danh từ trung tâm trong cụm tiếng Anh, đặt bản tiếng Việt của nó lên
đầu, phần bổ nghĩa theo sau. TCVN 13902:2023 theo đúng luật này ở cả sáu mục có
chữ AI trong tên, sáu trên sáu:

| Tiếng Anh | Trung tâm | Tiếng Việt | Mục |
|---|---|---|---|
| AI agent | agent | Tác tử AI | 3.1.1 |
| AI component | component | Phần tử AI | 3.1.2 |
| general AI | AI | AI tổng quát | 3.1.14 |
| narrow AI | AI | AI hẹp | 3.1.24 |
| symbolic AI | AI | AI biểu trưng | 3.1.33 |
| subsymbolic AI | AI | AI biểu trưng phụ | 3.1.34 |

Hai lối đặt trong bảng là một luật nhìn từ hai phía. "AI tác thể" vì thế ngược
trật tự: đặt AI lên đầu tức là nói đây là một loại AI, trong khi AI agent là một
tác tử.

## Vị trí: tiếng Việt trước, tiếng Anh trong ngoặc

Từ đã dịch thì viết tiếng Việt đứng trước, tiếng Anh trong ngoặc ngay sau:
"tác tử (agent)", "việc nền (background jobs)". Không viết ngược "agent (tác
tử)". TCVN 13902:2023 đặt như vậy nhất quán suốt tiêu chuẩn, còn bài trong
nghề thì lệch ngay trong một bài, đúng ở thuật ngữ trung tâm. Luật phải viết
ra vì người viết nghiêm túc vẫn lệch ở chính từ khoá của mình.

Chú ở đâu và mấy lần thì theo luật 4 của `tai-lieu-tieng-viet.md`: lần đầu
trong bài, lần đầu trong mỗi mục lớn, và mọi tiêu đề chứa nó. Một khái niệm
một tên từ đầu tới cuối (luật 7 của tệp đó): đã gọi "tác tử" thì không đổi
sang "agent" ở đoạn sau.

Từ giữ nguyên tiếng Anh thì chen thẳng vào câu như từ tiếng Việt, không chú,
không in nghiêng, không ngoặc kép: "chạy mã trong sandbox trước". Viết thường
trừ khi nó là tên riêng hay viết tắt (API, SDK).

## Chặn cụm, đừng chặn từ

Khi tự soát hay dựng luật soát máy: bản dịch sai chỉ sai trong ngữ cảnh kỹ
thuật. "Mặt tiền căn nhà" là tiếng Việt bình thường, "lập trình viên mặt tiền"
mới là lỗi. "Hậu trường" cũng vậy. Soát theo cả cụm, không soát từng từ,
không thì báo lỗi oan.
