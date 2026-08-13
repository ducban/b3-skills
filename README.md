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

## Giấy phép

MIT.
