# b3-skills

Marketplace skill riêng của Ban cho Claude Code. Một repo, nhiều skill.

## Cài

```
/plugin marketplace add ducban/b3-skills
/plugin install b3-write-human@b3-skills
```

Sau đó `/plugin` để bật tắt. Skill nạp theo description, không phải slash command.

## Có gì

| Skill | Làm gì |
|---|---|
| `b3-write-human` | Chặn văn AI ngay lúc viết bản nháp đầu. Cấm ~60 từ business, ép nhịp câu lệch, hai tệp tra tiếng Việt cho văn ngắn và tài liệu dài, giữ nguyên lệnh và placeholder, bắt tự soi trước khi xuất. Bổ trợ cho [`humanizer`](https://github.com/blader/humanizer), vốn chỉ dọn text đã có. |

`b3-write-human` mang thêm hai tệp tra tiếng Việt, chỉ đọc khi cần nên không đội chi phí cho lượt viết ngắn.

`van-ngan-tieng-viet.md` lo **văn ngắn có người đọc cụ thể**: chuỗi giao diện và thông báo lỗi, quảng cáo và bài đăng, email việc. Có bảng chọn ngôi xưng, luật cho nút và trạng thái trống, khi nào khuôn PAS hay AIDA hợp và khi nào không cần khuôn, rào bằng chứng cho quảng cáo (không bịa số, không khan hiếm giả), và cách giữ nguyên placeholder kiểu `{name}` hay `{{count}}`. Gộp từ skill `vietnamese-writing` ngày 28/10/2026, chỉ giữ phần skill này chưa có.

`tai-lieu-tieng-viet.md` lo **tài liệu dài bằng tiếng Việt** (từ khoảng một trang trở lên). Luật số một là viết thẳng bằng tiếng Việt chứ không dịch từ bản Anh; kèm 19 luật kiểm bằng mắt, bảng tiêu đề mục Anh sang Việt, một đoạn mẫu, và vòng tự đọc lại tám câu. Chuẩn rút từ một bài báo hội thảo đã qua bảy vòng sửa và một vòng phản biện.

## Eval

`plugins/b3-write-human/evals/` có 12 case cho `claude plugin eval`: giữ lệnh và mã lỗi, giữ placeholder, không bịa số trong quảng cáo, không bỏ từ rào khi sửa câu. Case nào có literal thì chấm bằng regex làm sàn, chất lượng văn chấm bằng LLM.

```bash
claude plugin eval plugins/b3-write-human --threshold 0.8 --no-publish
```

Một lượt đủ là 12 case × 3 lần × 2 nhánh, ước 9 USD (đo 29/10/2026: một case một nhánh hết 0,36 USD). Thử một case trước bằng `--case '06-*' --ablation none`. Kết quả vào `evals/results/`, đã ignore.

## Dùng ngoài Claude Code

Skill viết theo chuẩn Agent Skills nên Codex, OpenCode, Crush đọc được. Clone rồi symlink vào hub chung:

```bash
git clone https://github.com/ducban/b3-skills ~/Workspace/Projects/b3-skills
ln -s ~/Workspace/Projects/b3-skills/plugins/b3-write-human/skills/b3-write-human \
      ~/.agents/skills/b3-write-human
```

Codex và OpenCode đọc thẳng `~/.agents/skills/`. Crush và pi cần link tiếp vào `~/.config/crush/skills/` và `~/.pi/agent/skills/`.

## Cập nhật

```
/plugin marketplace update b3-skills
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
