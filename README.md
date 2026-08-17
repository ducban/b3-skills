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
| `b3-write-human` | Chặn văn AI ngay lúc viết bản nháp đầu. Cấm ~60 từ business, ép nhịp câu lệch, có mục tiếng Việt, bắt tự soi trước khi xuất. Bổ trợ cho [`humanizer`](https://github.com/blader/humanizer), vốn chỉ dọn text đã có. |

`b3-write-human` mang thêm một tệp tra riêng: `tai-lieu-tieng-viet.md`, chuẩn viết cho **tài liệu dài bằng tiếng Việt** (từ khoảng một trang trở lên). Luật số một là viết thẳng bằng tiếng Việt chứ không dịch từ bản Anh; kèm 19 luật kiểm bằng mắt, bảng tiêu đề mục Anh sang Việt, một đoạn mẫu, và vòng tự đọc lại tám câu. Chuẩn rút từ một bài báo hội thảo đã qua bảy vòng sửa và một vòng phản biện. Tệp chỉ được đọc khi sắp viết tài liệu, nên không đội chi phí cho những lượt viết ngắn.

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
