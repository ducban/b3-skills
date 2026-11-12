# b3-skills

Hai skill Ban tự viết cho Claude Code và các agent đọc được chuẩn Agent Skills. Một repo, một nguồn sự thật.

| Skill | Làm gì |
|---|---|
| `b3-write-human` | Chặn văn AI ngay lúc viết bản nháp đầu. Cấm khoảng 60 từ business, ép nhịp câu lệch, giữ nguyên lệnh và placeholder, bắt tự soi trước khi xuất. Tiếng Việt có năm tệp tra riêng. Bổ trợ cho [`humanizer`](https://github.com/blader/humanizer), vốn chỉ dọn text đã có. |
| `b3-figure-drawing` | Tám khuôn vẽ hình cho tài liệu bằng `figlib.mjs`: so sánh, quy trình, dãy số, kiến trúc nhiều tầng, đồ thị hai biến, chênh lệch lời khai với số kiểm chứng, mốc thời gian, ma trận kiểu SWOT. SVG thang xám, trục thật, tự đổi theo nền sáng tối. Chữ trong hình theo luật của `b3-write-human`. |
| `b3-grammar-helper` | Mod, không phải skill: gạch chân lỗi ngữ pháp ngay trong ô prompt khi gõ tiếng Anh, gợi ý hiện mờ ngay sau chữ sai. Harper chạy offline trước, rồi chuỗi OpenRouter → OpenAI → Fireworks → Haiku sửa cách dùng từ. `/b3-grammar-helper` mở pane settings. Chạy trên Linux, macOS, Windows; khác biệt từng máy ở [README riêng](plugins/b3-grammar-helper/README.md). |

Hai skill này đứng ở hai chặng đầu của một bài viết. `humanizer` và Vale đứng sau.

![Một bài tiếng Việt đi qua bốn chặng: b3-write-human dẫn tay lúc viết nháp, cổng tự soi hỏi ba câu, humanizer soi bản đã xong, Vale đếm lỗi trên 1.000 chữ](docs/figures/fig3-writing-pipeline.svg)

## b3-write-human đọc gì, lúc nào

`SKILL.md` luôn vào ngữ cảnh. Năm tệp tra bên cạnh chỉ đọc khi việc đang viết cần tới, nên lượt viết ngắn không phải trả tiền cho chúng. Eval và Vale chạy ngoài, agent không bao giờ đọc.

![Phần nào của b3-write-human vào ngữ cảnh của agent: SKILL.md luôn nạp, năm tệp tra nạp khi cần, evals và do-luong chạy ngoài ranh giới ngữ cảnh](docs/figures/fig2-what-the-agent-loads.svg)

`van-ngan-tieng-viet.md` lo **văn ngắn có người đọc cụ thể**: chuỗi giao diện và thông báo lỗi, quảng cáo và bài đăng, email việc. Có bảng chọn ngôi xưng, luật cho nút và trạng thái trống, khi nào khuôn PAS hay AIDA hợp và khi nào không cần khuôn, rào bằng chứng cho quảng cáo (không bịa số, không khan hiếm giả), và cách giữ nguyên placeholder kiểu `{name}` hay `{{count}}`. Gộp từ skill `vietnamese-writing` ngày 28/10/2026, chỉ giữ phần skill này chưa có.

`tai-lieu-tieng-viet.md` lo **tài liệu dài bằng tiếng Việt**, từ khoảng một trang trở lên. Luật số một là viết thẳng bằng tiếng Việt chứ không dịch từ bản Anh. Kèm theo là 19 luật kiểm bằng mắt, bảng tiêu đề mục Anh sang Việt, một đoạn mẫu, và vòng tự đọc lại tám câu. Chuẩn rút từ một bài báo hội thảo đã qua bảy vòng sửa và một vòng phản biện.

`thuat-ngu.md` và `bang-tu.md` lo **thuật ngữ nghề: dịch hay giữ nguyên**. Năm cửa ải hỏi theo thứ tự cố định: có ai gõ hay tra đúng chuỗi này không; tiêu chuẩn quốc gia có bản tiếng Việt chưa; nghề đã dùng từ nào chưa; dịch được bằng từ sẵn có không; phải dựng từ mới không. Thêm một phép thử tra ngược cho mọi bản dịch, kể cả bản của tiêu chuẩn, và luật vị trí tiếng Việt trước, tiếng Anh trong ngoặc. Bảng tra ghi từ đã chốt kèm cửa nó dừng: `agent` là "tác tử (agent)" theo TCVN 13902:2023, còn `sandbox`, `compaction`, `front-end` giữ tiếng Anh. Có thêm ba kiểu cửa 2 hụt, kèm luật con mục định nghĩa thắng câu chạy, và luật trật tự từ: danh từ trung tâm đứng đầu. Rút từ nghiên cứu 29/10/2026 trong vault.

`tcvn-13902.md` là bảng 104 cặp thuật ngữ AI Việt - Anh của TCVN 13902:2023 (ISO/IEC 22989:2022), kèm số mục, không chép định nghĩa. Đây là cửa 2 của chuỗi: từ AI nào có trong đó thì viết theo đó, không tự nghĩ bản khác. Đọc từ bản chép chính văn ngày 02/11/2026, thiếu khoảng 19 mục bị cắt.

Chữ trong hình, slide và ô bảng có bốn luật ngắn nằm ngay trong `SKILL.md`: câu có chủ ngữ, đủ dấu, tiêu đề không ghi nháp hay ngày, được bỏ chú tiếng Anh khi đoạn cạnh hình đã chú. `b3-figure-drawing` trỏ sang đó cho mọi nhãn nó vẽ, không giữ bản chép riêng.

## Cài đặt: mỗi máy một đường

Skill đi từ kho tới máy bằng một trong ba đường. Chọn một, đừng cài hai.

![Ba đường đưa skill từ kho tới máy: plugin Claude Code, skills CLI, bản chép trong NanoClaw](docs/figures/fig1-three-channels.svg)

Máy chỉ chạy Claude Code thì cài plugin. Máy còn chạy Codex, pi, Crush thì dùng `skills` CLI và **không cài plugin**: CLI có `claude-code` trong danh sách agent nên tự link vào `~/.claude/skills/`, cài thêm plugin là Claude nạp hai bản cùng tên và không chắc bản nào thắng. Mac vấp đúng chỗ này từ 21/08 tới 29/10/2026, bản plugin kẹt ở 1.1.0 trong khi bản link đã lên 1.5.0. Đã gỡ plugin, giữ CLI.

### Đường 1: plugin cho Claude Code

```
/plugin marketplace add ducban/b3-skills
/plugin install b3-write-human@b3-skills
/plugin install b3-figure-drawing@b3-skills
/plugin install b3-grammar-helper@b3-skills
```

Sau đó `/plugin` để bật tắt. Skill nạp theo description, không phải slash command.

Cập nhật trong session:

```
/plugin marketplace update b3-skills
```

Hoặc từ terminal, nhớ mở session mới sau đó thì bản mới mới được nạp:

```bash
claude plugin marketplace update b3-skills
claude plugin update b3-write-human@b3-skills
claude plugin update b3-figure-drawing@b3-skills
claude plugin update b3-grammar-helper@b3-skills
```

### Đường 2: skills CLI cho máy chạy nhiều agent

Skill viết theo chuẩn Agent Skills nên Codex, OpenCode, Crush, pi đọc được. Cờ `-g` cài cho cả máy:

```bash
npx skills add ducban/b3-skills -g
```

CLI tìm thấy cả hai skill trong repo, **chép** chúng về `~/.agents/skills/`, rồi tùy agent mà đọc thẳng hay link vào:

```
~/.agents/skills/b3-write-human/        ← bản chép, không phải symlink vào repo
   đọc thẳng:  Codex, OpenCode, Cursor và các agent đọc .agents/skills
   link tới:   ~/.claude/skills/   ~/.config/crush/skills/   ~/.pi/agent/skills/
~/.agents/.skill-lock.json              ← CLI nhớ nguồn và hash ở đây
```

Bản chép không tự theo repo. Sau mỗi lần push:

```bash
npx skills update
```

Hai chỗ dễ vấp:

- **Chạy từ bên trong một session Claude Code mà quên `-g`.** CLI tự nhận ra đang có agent và cài im lặng vào thư mục hiện tại: `.agents/skills/`, `.claude/skills/` và `skills-lock.json` mọc ngay trong repo. Xóa ba thứ đó đi rồi chạy lại với `-g`. Ngày 29/10/2026 vấp đúng chỗ này.
- **Symlink `~/.agents/skills/b3-write-human` thẳng vào thư mục repo.** Lock của CLI đang quản nhiều skill khác, một mục bị đổi thành symlink là `skills update` báo lệch từ đó về sau. Một cơ chế thôi, `skills update` là đủ.

### Đường 3: bản chép trong NanoClaw

Agent chạy trong container của NanoClaw không đọc được `~/.claude/plugins/` của host, nên repo NanoClaw giữ một bản chép ở `container/skills/b3-write-human/`. **Kho này là nguồn sự thật.** Sửa luật thì sửa ở đây trước, push, rồi chạy bên NanoClaw:

```
python3 scripts/sync-b3-write-human.py
```

Bên đó có hook pre-commit chặn commit khi hai bản lệch nhau, nên quên bước chép là hook bắt ngay.

## Eval

`plugins/b3-write-human/evals/` có 18 case cho `claude plugin eval`: giữ lệnh và mã lỗi, giữ placeholder, không bịa số trong quảng cáo, không bỏ từ rào khi sửa câu, bốn case thuật ngữ (agent, sandbox, front-end, compaction), một case chữ trong hình SWOT, và một case bản dịch của chính TCVN 13902:2023 trượt phép thử tra ngược (heteronomy). Case nào có literal thì chấm bằng regex làm sàn. Chất lượng văn chấm bằng LLM.

```bash
claude plugin eval plugins/b3-write-human --threshold 0.8 --no-publish
```

Một lượt đủ là 18 case × 3 lần × 2 nhánh. Bộ 12 case đo 29/10/2026 hết 6 USD và 7 phút với `-j 3`. Thử một case trước bằng `--case '06-*' --ablation none`. Kết quả vào `evals/results/`, đã ignore. Chi tiết và các chỗ vấp khi viết grader nằm trong `plugins/b3-write-human/evals/README.md`.

## Đo lường

`plugins/b3-write-human/do-luong/` là cấu hình Vale soi một tệp `.md` tiếng Việt có sẵn theo đúng luật của skill: từ sáo, cấu trúc dịch, bản dịch thuật ngữ đã loại, từ tiếng Anh đứng trơn. Nó trả về số lỗi trên 1.000 chữ. Khác eval ở chỗ nó chạy trên bài đã viết, không tốn tiền, và chỉ bắt được bề mặt. Bài hội thảo làm mốc chuẩn đo 02/11/2026 được 0,3 lỗi/1.000 chữ, trong đó một lỗi thật.

```bash
brew install vale
python3 plugins/b3-write-human/do-luong/do.py bai.md
```

## Hình trong tài liệu này

Ba hình ở trên và một hình trong `do-luong/README.md` do `b3-figure-drawing` vẽ từ script `docs/figures/draw.mjs`, import `figlib.mjs` ngay trong repo. Sửa nội dung thì sửa script rồi vẽ lại, đừng sửa SVG:

```bash
node docs/figures/draw.mjs
```

## Giấy phép

MIT.
