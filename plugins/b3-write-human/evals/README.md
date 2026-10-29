# Eval cho b3-write-human

Mười sáu case. Mười hai case đầu gốc từ bộ eval của skill `vietnamese-writing`
(28/10/2026), chuyển sang khuôn `claude plugin eval`. Bốn case 13 tới 16 kiểm
chuỗi cửa ải thuật ngữ trong `thuat-ngu.md`, mỗi case một từ đã chạy qua chuỗi:
agent phải thành "tác tử (agent)", còn sandbox, front-end, compaction phải giữ
tiếng Anh. Mỗi case một thư mục: `prompt.md` là đề,
`graders/` là cách chấm. Case nào có literal (lệnh, mã lỗi, placeholder, số)
thì có grader `regex` làm sàn; chất lượng văn chấm bằng grader `llm`.
`skill-fired.md` chỉ báo skill có nạp hay không, không tính điểm khi chạy
hai nhánh có và không plugin.

Chạy từ gốc repo:

```bash
claude plugin eval plugins/b3-write-human --threshold 0.8 --no-publish
```

Mặc định mỗi case chạy ba lượt, hai nhánh (có và không có plugin), nên một
lượt đủ là 96 lần gọi agent. Đo ngày 29/10/2026: cả bộ hai nhánh với `-j 3`
hết 5,96 USD và 7 phút. Muốn rẻ hơn:

```bash
claude plugin eval plugins/b3-write-human --ablation none --case '06-*' --no-publish
```

Kết quả rơi vào `evals/results/<timestamp>/`, đã git-ignore. Lỗi tự động
(trượt thẳng, không cần chấm): bịa số liệu hay claim y tế; sửa lệnh, mã lỗi,
placeholder; đổi nghĩa hay bỏ từ rào của câu gốc.

Hai chỗ vấp khi viết grader, gặp ngày 29/10/2026: `--case` không nhận ngoặc vuông
kiểu `1[3-6]-*`, chạy từng glob một; grader `regex` không nhận cờ `(?i)`, viết
`[Ff]ront-?[Ee]nd` thay vào. Bốn case thuật ngữ chạy nhánh có plugin, 2 lượt mỗi
case, đạt 4/4, hết 0,72 USD.
