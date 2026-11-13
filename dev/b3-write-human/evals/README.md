# Eval cho b3-write-human

Mười tám case cho `claude plugin eval`. Mỗi case một thư mục: `prompt.md` là đề,
`graders/` là cách chấm.

| Case | Kiểm gì | Gốc |
|---|---|---|
| 01 tới 12 | Giữ lệnh và mã lỗi, giữ placeholder, không bịa số trong quảng cáo, không bỏ từ rào khi sửa câu, giọng và khuôn cho từng loại văn | Bộ eval của skill `vietnamese-writing`, 28/10/2026, chuyển sang khuôn `claude plugin eval` |
| 13 tới 16 | Chuỗi cửa ải thuật ngữ trong `thuat-ngu.md`, mỗi case một từ: agent phải thành "tác tử (agent)"; sandbox, front-end, compaction phải giữ tiếng Anh | Nghiên cứu 29/10/2026 |
| 17 | Bốn luật cho chữ trong hình: ô SWOT là câu có chủ ngữ, tiêu đề không mang "nháp" hay ngày dù đề nói đó là bản nháp gửi 05/11, ô được bỏ "(agent)" vì đoạn cạnh hình đã chú | FINDINGS phần 3, 02/11/2026 |
| 18 | Bản dịch của chính tiêu chuẩn trượt phép thử tra ngược: heteronomy phải giữ tiếng Anh, không theo "dị thường" của TCVN 13902:2023 mục 3.1.16 | FINDINGS phần 1, 02/11/2026 |

Có ba kiểu grader. Case nào có literal (lệnh, mã lỗi, placeholder, số) thì có grader
`regex` làm sàn. Chất lượng văn chấm bằng grader `llm`. `skill-fired.md` chỉ báo
skill có nạp hay không, không tính điểm khi chạy hai nhánh có và không plugin.

Lỗi tự động, trượt thẳng không cần chấm: bịa số liệu hay claim y tế; sửa lệnh, mã
lỗi, placeholder; đổi nghĩa hay bỏ từ rào của câu gốc.

## Chạy

Từ gốc repo:

```bash
claude plugin eval dev/b3-write-human --threshold 0.8 --no-publish
```

Mặc định mỗi case chạy ba lượt, hai nhánh (có và không có plugin), nên một lượt
đủ là 108 lần gọi agent. Đo ngày 29/10/2026 với 12 case: cả bộ hai nhánh, `-j 3`,
hết 5,96 USD và 7 phút. Muốn rẻ hơn thì chạy một nhánh, một case:

```bash
claude plugin eval dev/b3-write-human --ablation none --case '06-*' --no-publish
```

Kết quả rơi vào `evals/results/<timestamp>/`, đã git-ignore.

Chạy trên máy cài skill qua `skills` CLI thì dời `~/.claude/skills/b3-write-human`
đi chỗ khác trước, chạy xong trả lại. Không dời thì agent con có thể nạp bản cũ
trong `~/.agents/skills/` thay vì plugin đang thử.

## Bốn chỗ vấp khi viết case

- `--case` không nhận ngoặc vuông kiểu `1[3-6]-*`. Chạy từng glob một. (29/10/2026)
- Grader `regex` không nhận cờ `(?i)`. Viết `[Ff]ront-?[Ee]nd` thay vào. (29/10/2026)
- Đề bắt viết nội dung mà không cho dữ kiện thì skill làm đúng luật "không bịa" và
  từ chối điền. Case 17 bản đầu bắt viết bốn ô SWOT tay không; agent để trống bốn ô
  và hỏi lại. Đề nào cần nội dung thì phải kèm ghi chú thô. (02/11/2026)
- Grader đòi "câu có chủ ngữ" theo nghĩa đen thì judge trượt cả câu ẩn chủ ngữ rất
  Việt, kiểu "Mỗi kỳ đối soát xong trong 1 ngày". Phải ghi rõ chủ ngữ ẩn được chấp
  nhận. (02/11/2026)

## Lần chạy trọn bộ gần nhất

Ngày 06/11/2026, bản 1.9.0, 18 case, 2 lượt mỗi case, một nhánh, `-j 4`: 16/18 đạt,
158 giây, 4,13 USD. Hai case rớt chỉ ra hai lỗ trong luật, không phải trong grader:

- Case 12 rớt 0/2. Agent gập "có thể hỗ trợ" thành "xử lý được", xem như từ rào
  vẫn còn. Luật giữ từ rào trong `SKILL.md` giờ nói thẳng: giữ nguyên chữ, "được"
  không thay "có thể".
- Case 09 rớt 1/2, rồi 2/3 sau lần sửa đầu. Lượt rớt viết tính năng đoán như sự
  thật, hoặc chèn số vào cảnh minh hoạ ("buổi họp mười lăm phút", "ba nhóm chat").
  `van-ngan-tieng-viet.md` thêm hai câu ở mục rào bằng chứng cho cả hai.

Bản 1.10.0 chạy lại mỗi case 3 lượt: 12 đạt 3/3, 09 đạt 3/3, tổng 1,22 USD.

Các lần chạy lẻ trước đó: bốn case thuật ngữ 2 lượt mỗi case đạt 4/4, 0,72 USD.
Case 17 sau hai lần sửa đề và grader đạt 2/2, ba lần chạy hết 0,71 USD.
