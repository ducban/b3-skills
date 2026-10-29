# b3-skills

Marketplace skill riêng của Ban cho Claude Code. Một repo, nhiều skill.

## Cài cho Claude Code

```
/plugin marketplace add ducban/b3-skills
/plugin install b3-write-human@b3-skills
/plugin install b3-figure-drawing@b3-skills
```

Sau đó `/plugin` để bật tắt. Skill nạp theo description, không phải slash command.

**Mỗi máy một cơ chế.** Máy chỉ chạy Claude Code thì cài plugin như trên. Máy còn
chạy Codex, pi, Crush thì dùng `skills` CLI ở mục dưới và **không cài plugin**: CLI
có `claude-code` trong danh sách agent nên tự link vào `~/.claude/skills/`, cài
thêm plugin là Claude nạp hai bản cùng tên và không chắc bản nào thắng. Mac vấp
đúng chỗ này từ 21/08 tới 29/10/2026, bản plugin kẹt ở 1.1.0 trong khi bản link
đã lên 1.5.0. Đã gỡ plugin, giữ CLI.

## Có gì

| Skill | Làm gì |
|---|---|
| `b3-write-human` | Chặn văn AI ngay lúc viết bản nháp đầu. Cấm ~60 từ business, ép nhịp câu lệch, hai tệp tra tiếng Việt cho văn ngắn và tài liệu dài, giữ nguyên lệnh và placeholder, bắt tự soi trước khi xuất. Bổ trợ cho [`humanizer`](https://github.com/blader/humanizer), vốn chỉ dọn text đã có. |
| `b3-figure-drawing` | Tám khuôn vẽ hình cho tài liệu bằng `figlib.mjs`: so sánh, quy trình, dãy số, kiến trúc nhiều tầng, đồ thị hai biến, chênh lệch lời khai với số kiểm chứng, mốc thời gian, ma trận kiểu SWOT. SVG thang xám, trục thật, tự đổi theo nền sáng tối. Chữ trong hình theo luật của `b3-write-human`. |

`b3-write-human` mang thêm hai tệp tra tiếng Việt, chỉ đọc khi cần nên không đội chi phí cho lượt viết ngắn.

`van-ngan-tieng-viet.md` lo **văn ngắn có người đọc cụ thể**: chuỗi giao diện và thông báo lỗi, quảng cáo và bài đăng, email việc. Có bảng chọn ngôi xưng, luật cho nút và trạng thái trống, khi nào khuôn PAS hay AIDA hợp và khi nào không cần khuôn, rào bằng chứng cho quảng cáo (không bịa số, không khan hiếm giả), và cách giữ nguyên placeholder kiểu `{name}` hay `{{count}}`. Gộp từ skill `vietnamese-writing` ngày 28/10/2026, chỉ giữ phần skill này chưa có.

`tai-lieu-tieng-viet.md` lo **tài liệu dài bằng tiếng Việt** (từ khoảng một trang trở lên). Luật số một là viết thẳng bằng tiếng Việt chứ không dịch từ bản Anh; kèm 19 luật kiểm bằng mắt, bảng tiêu đề mục Anh sang Việt, một đoạn mẫu, và vòng tự đọc lại tám câu. Chuẩn rút từ một bài báo hội thảo đã qua bảy vòng sửa và một vòng phản biện.

## Eval

`plugins/b3-write-human/evals/` có 12 case cho `claude plugin eval`: giữ lệnh và mã lỗi, giữ placeholder, không bịa số trong quảng cáo, không bỏ từ rào khi sửa câu. Case nào có literal thì chấm bằng regex làm sàn, chất lượng văn chấm bằng LLM.

```bash
claude plugin eval plugins/b3-write-human --threshold 0.8 --no-publish
```

Một lượt đủ là 12 case × 3 lần × 2 nhánh, đo 29/10/2026 hết 6 USD và 7 phút với `-j 3`. Thử một case trước bằng `--case '06-*' --ablation none`. Kết quả vào `evals/results/`, đã ignore.

## Dùng ngoài Claude Code

Skill viết theo chuẩn Agent Skills nên Codex, OpenCode, Crush, pi đọc được. Cài
bằng `skills` CLI, cờ `-g` để cài cho cả máy:

```bash
npx skills add ducban/b3-skills -g
```

CLI tìm thấy cả hai skill trong repo, **chép** chúng về `~/.agents/skills/`, rồi
tùy agent mà đọc thẳng hay link vào:

```
~/.agents/skills/b3-write-human/        ← bản chép, không phải symlink vào repo
   đọc thẳng:  Codex, OpenCode, Cursor và các agent đọc .agents/skills
   link tới:   ~/.claude/skills/   ~/.config/crush/skills/   ~/.pi/agent/skills/
~/.agents/.skill-lock.json              ← CLI nhớ nguồn và hash ở đây
```

Vì là bản chép nên nó không tự theo repo. Sau mỗi lần push:

```bash
npx skills update
```

Hai chỗ dễ vấp:

- **Chạy từ bên trong một session Claude Code mà quên `-g`**, CLI tự nhận ra đang
  có agent và cài im lặng vào thư mục hiện tại: `.agents/skills/`, `.claude/skills/`
  và `skills-lock.json` mọc ngay trong repo. Xóa ba thứ đó đi rồi chạy lại với
  `-g`. Ngày 29/10/2026 vấp đúng chỗ này.
- Đừng symlink `~/.agents/skills/b3-write-human` thẳng vào thư mục repo. Lock của
  CLI đang quản nhiều skill khác, một mục bị đổi thành symlink là `skills update`
  báo lệch từ đó về sau. Một cơ chế thôi, `skills update` là đủ.

## Cập nhật cho Claude Code

Trong session:

```
/plugin marketplace update b3-skills
```

Hoặc từ terminal, nhớ mở session mới sau đó thì bản mới mới được nạp:

```bash
claude plugin marketplace update b3-skills
claude plugin update b3-write-human@b3-skills
claude plugin update b3-figure-drawing@b3-skills
```

## Bản chép trong NanoClaw

Các agent chạy trong container của NanoClaw không đọc được `~/.claude/plugins/`
của host, nên repo NanoClaw giữ một bản chép ở `container/skills/b3-write-human/`.
**Kho này là nguồn sự thật.** Sửa luật thì sửa ở đây trước, push, rồi chạy bên
NanoClaw:

```
python3 scripts/sync-b3-write-human.py
```

Bên đó có hook pre-commit chặn commit khi hai bản lệch nhau, nên quên bước chép
sẽ bị bắt chứ không trôi im lặng.

## Giấy phép

MIT.
