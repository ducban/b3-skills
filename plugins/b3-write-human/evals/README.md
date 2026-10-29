# Eval cho b3-write-human

Mười hai case, gốc từ bộ eval của skill `vietnamese-writing` (28/10/2026), chuyển
sang khuôn `claude plugin eval`. Mỗi case một thư mục: `prompt.md` là đề,
`graders/` là cách chấm. Case nào có literal (lệnh, mã lỗi, placeholder, số)
thì có grader `regex` làm sàn; chất lượng văn chấm bằng grader `llm`.
`skill-fired.md` chỉ báo skill có nạp hay không, không tính điểm khi chạy
hai nhánh có và không plugin.

Chạy từ gốc repo:

```bash
claude plugin eval plugins/b3-write-human --threshold 0.8 --no-publish
```

Mặc định mỗi case chạy ba lượt, hai nhánh (có và không có plugin), nên một
lượt đủ là 72 lần gọi agent. Đo ngày 29/10/2026: case 06 một nhánh hết
0,36 USD và 63 giây, nên cả bộ hai nhánh ước 9 USD. Muốn rẻ hơn:

```bash
claude plugin eval plugins/b3-write-human --ablation none --case '06-*' --no-publish
```

Kết quả rơi vào `evals/results/<timestamp>/`, đã git-ignore. Lỗi tự động
(trượt thẳng, không cần chấm): bịa số liệu hay claim y tế; sửa lệnh, mã lỗi,
placeholder; đổi nghĩa hay bỏ từ rào của câu gốc.
