# Đo lường: Vale cho văn tiếng Việt

Vale soi một tệp `.md` theo luật của skill, chạy trong một giây và không tốn
tiền. Nó đếm chỗ vi phạm luật bề mặt: từ sáo, cấu trúc dịch, bản dịch thuật ngữ
đã loại, từ tiếng Anh đứng trơn khi đã có tiếng Việt. Giọng máy thì nó không đo
được. Eval ở `../evals/` đo skill có làm agent viết đúng không; thư mục này đo
một bài đã có.

```bash
brew install vale                                     # một lần
python3 plugins/b3-write-human/do-luong/do.py bai.md  # số lỗi trên 1.000 chữ, 8 lỗi gặp nhiều nhất
vale --config plugins/b3-write-human/do-luong/.vale.ini bai.md   # từng dòng
python3 plugins/b3-write-human/do-luong/sinh-tu-sao.py --check  # TuSao.yml còn khớp nguồn không
```

## Bốn luật

| Tệp | Mức | Bắt gì | Nguồn thật |
|---|---|---|---|
| `styles/B3/TuSao.yml` | error | 22 từ sáo của luật 10 cộng 6 cụm rỗng. **Sinh tự động** bởi `sinh-tu-sao.py` | `tai-lieu-tieng-viet.md` luật 10, `SKILL.md` mục Vietnamese output |
| `styles/B3/DichMay.yml` | warning | "được thực hiện bởi", "tiến hành kiểm tra"… | `SKILL.md` mục Vietnamese output |
| `styles/B3/ThuatNgu.yml` | error | "lập trình viên mặt tiền", "hộp cát", "tác nhân AI", "agent (tác tử)" | `bang-tu.md` mục Bản dịch đã loại |
| `styles/B3/ChuaDich.yml` | warning | server, database, account… đứng trơn, bỏ qua khi ngay sau `(` | `bang-tu.md` mục Dịch |

Danh sách từ sáo có một nguồn duy nhất: luật 10 của `tai-lieu-tieng-viet.md` và
gạch "Cụm rỗng" trong `SKILL.md`. `TuSao.yml` là tệp sinh ra từ đó bằng
`sinh-tu-sao.py`, đừng sửa tay. `do.py` tự sinh lại trước mỗi lần đo, còn
`--check` thoát 1 khi tệp đã commit lệch nguồn.

`ThuatNgu.yml` khớp cả cụm, không khớp từ đơn, vì "mặt tiền căn nhà" là tiếng
Việt bình thường.

## Số đo ngày 02/11/2026

| Tệp | Chữ | Lỗi/1.000 | Thật | Oan |
|---|---|---|---|---|
| Bài hội thảo AI4Econ&Biz, bản đã qua 7 vòng sửa | 10.990 | 0,3 | 1 | 2 |
| FINDINGS.md của nghiên cứu 29/10 | 4.840 | 2,7 | 0 | 13 |
| POLICY.md của vault | 7.004 | 0,3 | 0 | 2 |
| README.md kho này, bản viết lại 02/11 | 1.356 | 0,0 | 0 | 0 |

![Số đo Vale ngày 02/11/2026 trên bốn tệp có sẵn, lỗi trên 1.000 chữ kể cả báo oan](../../../docs/figures/fig4-vale-baseline.svg)

Bài hội thảo là mốc chuẩn: một lỗi thật duy nhất, "được thực hiện bởi các tác tử"
ở dòng 148. Số "sau" chưa có vì chưa ai sửa bài theo kết quả này.

### Cặp trước sau đầu tiên

Chạy ngày 02/11/2026 trên máy Mac, Vale 3.26.0, luật của kho ở bản 1.8.0. So bản
nháp đầu của bài hội thảo với bản đã qua bảy vòng sửa:

| Bản | Chữ | Lỗi/1.000 | Thật | Oan |
|---|---|---|---|---|
| Bản 1, nháp 09/08/2026 (`versions/PAPER-vi-v1-10300tu-2026-08-09.md`) | 11.470 | 0,2 | 1 | 1 |
| Bản cuối (`PAPER-vi-final.md`) | 10.990 | 0,3 | 1 | 2 |

Lỗi thật của bản 1 là "không chỉ áp dụng công nghệ mà còn" ở dòng 77, nằm trong
danh sách từ sáo. Các vòng sửa gỡ được nó nhưng lại sinh ra "được thực hiện bởi
các tác tử". Lỗi oan của bản 1 là một tên bài tiếng Anh trong danh mục tham khảo.
Hai bản cùng nằm ở mức sàn, nên cặp số này không cho thấy bảy vòng sửa đã làm gì:
chỗ các vòng ấy sửa nằm ngoài tầm của luật bề mặt. Muốn lớp này tách được trước
với sau thì phải đo trên một bài nháp chưa viết theo skill.

Cột "Chữ" là số mảnh `do.py` tách theo khoảng trắng, tính cả cú pháp Markdown, nên
không khớp với số chữ ghi ở nơi khác cho cùng bài.

## Ba kiểu báo oan đã biết

- **Nhắc tới chứ không dùng.** Tệp nào bàn về từ cấm thì bị bắt chính từ đó:
  `tai-lieu-tieng-viet.md` 29 lỗi, FINDINGS.md 13 lỗi, toàn là ví dụ trong bài.
  Soi tài liệu về luật viết thì bỏ qua số này.
- **Tiếng Anh trong ngoặc không đứng ngay sau `(`.** "(Evolution of enterprise AI
  systems)" bị bắt "AI systems". Regex không đếm được ngoặc.
- **Danh mục tham khảo.** Tên bài tiếng Anh in nghiêng bị bắt như văn tiếng Việt.

"Cursor" viết hoa từng bị bắt là "con trỏ" ở POLICY.md và OPERATIONS.md. Đã đổi
`ChuaDich.yml` sang phân biệt hoa thường, POLICY.md về 0. OPERATIONS.md còn một
lỗi oan: "cursor" viết thường trong danh sách tên agent của skills CLI.
