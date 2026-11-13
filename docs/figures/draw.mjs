// Vẽ lại mọi hình trong docs/figures/ bằng figlib.mjs của chính repo này.
//   node docs/figures/draw.mjs
// Sửa nội dung ở đây rồi chạy lại; đừng sửa tay tệp SVG.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const { compare, flow, layers, bars, render } = await import(
  join(here, '..', '..', 'skills', 'b3-figure-drawing', 'figlib.mjs'));
const out = here + '/';

// 1. Three ways the repo reaches a machine
render(out + 'fig1-three-channels.svg', compare({
  title: 'Ba đường đưa skill và mod từ kho tới máy',
  umbrella: 'Kho ducban/b3-skills là nguồn sự thật, sửa luật ở đây trước',
  columns: [
    { head: 'SKILLS CLI · skills/', tone: 'ink', items: [
      { title: 'Claude Code, Codex, OpenCode, Crush, pi đọc', sub: 'mọi agent skills.sh hỗ trợ' },
      { title: 'Nằm ở ~/.agents/skills/', sub: 'bản chép, Claude Code đọc qua link' },
      { title: 'Cập nhật sau mỗi lần push', sub: 'npx skills update' },
    ]},
    { head: 'PLUGIN CLAUDE CODE · mods/', tone: 'pale', items: [
      { title: 'Chỉ Claude Code chạy mod', sub: 'bgh, status-line' },
      { title: 'Nằm ở ~/.claude/plugins/', sub: 'marketplace kéo về' },
      { title: 'Cập nhật ngay trong session', sub: '/plugin marketplace update, rồi /reload-plugins' },
    ]},
    { head: 'BẢN CHÉP TRONG NANOCLAW', tone: 'open', items: [
      { title: 'Agent trong container đọc', sub: 'không thấy ~/.claude của host' },
      { title: 'Nằm ở container/skills/', sub: 'trong kho NanoClaw' },
      { title: 'Cập nhật bằng script bên NanoClaw', sub: 'sync-b3-write-human.py, hook chặn khi lệch' },
    ]},
  ],
  note: 'Skill chỉ đi đường skills CLI, mod chỉ đi đường plugin. Mac từng cài skill qua cả hai đường, Claude nạp hai bản cùng tên và bản plugin kẹt ở 1.1.0 suốt hai tháng.',
}));

// 2. Where each piece runs relative to the agent's context
render(out + 'fig2-what-the-agent-loads.svg', layers({
  title: 'Phần nào của b3-write-human vào ngữ cảnh của agent',
  layers: [
    { head: 'LUÔN NẠP · SKILL.md', sub: 'khoảng 1.800 chữ, đọc trước khi viết chữ đầu tiên', tone: 'ink',
      items: ['Cấm khoảng 60 từ business', 'Ép nhịp câu lệch nhau', 'Soi chữ trong hình bằng bốn luật', 'Tự hỏi ba câu trước khi giao'] },
    { head: 'NẠP KHI CẦN · năm tệp tra', sub: 'bảng trong SKILL.md chỉ tệp nào đọc cho việc nào', tone: 'pale',
      items: [
        { title: 'van-ngan-tieng-viet.md', sub: 'chuỗi UI, quảng cáo, email' },
        { title: 'tai-lieu-tieng-viet.md', sub: 'từ một trang trở lên' },
        { title: 'ba tệp thuật ngữ', sub: 'bang-tu, tcvn-13902, thuat-ngu: dịch hay giữ' },
      ] },
    { head: 'CHẠY NGOÀI · không vào ngữ cảnh', sub: 'người bảo trì chạy, agent không đọc', tone: 'open',
      items: [
        { title: 'evals/ · 18 case', sub: 'claude plugin eval, tốn tiền' },
        { title: 'do-luong/ · Vale', sub: 'soi bài đã viết, miễn phí' },
      ] },
  ],
  boundary: { after: 1, label: 'RANH GIỚI NGỮ CẢNH', note: 'phía trên tốn token' },
  note: 'Lượt viết ngắn chỉ trả tiền cho tầng trên cùng.',
}));

// 3. Writing pipeline
render(out + 'fig3-writing-pipeline.svg', flow({
  title: 'Một bài tiếng Việt đi qua bốn chặng',
  steps: [
    { title: 'b3-write-human dẫn tay lúc viết nháp', sub: 'cấm từ, nhịp câu, thuật ngữ', tone: 'ink' },
    { title: 'Cổng tự soi hỏi ba câu', sub: 'ngay trước khi giao bài', tone: 'pale' },
    { title: 'humanizer soi bản đã xong', sub: '33 dấu hiệu máy viết', tone: 'pale' },
    { title: 'Vale đếm lỗi trên 1.000 chữ', sub: 'bề mặt, không đo giọng', tone: 'open' },
  ],
  note: 'Ba chặng đầu không thay nhau: viết đúng, tự soi, rồi mới để bộ soi dọn. Chặng bốn chỉ cho ra một con số để so trước sau.',
}));

// 4. Vale baseline numbers (do-luong README)
render(out + 'fig4-vale-baseline.svg', bars({
  title: 'Số đo Vale ngày 02/11/2026 trên bốn tệp có sẵn',
  axisNote: 'Lỗi trên 1.000 chữ, kể cả báo oan',
  series: [
    { label: 'FINDINGS.md của nghiên cứu 29/10', value: 2.7, tone: 'hatch' },
    { label: 'Bài hội thảo AI4Econ&Biz, 7 vòng sửa', value: 0.3, tone: 'ink' },
    { label: 'POLICY.md của vault', value: 0.3, tone: 'pale' },
    { label: 'README.md kho này', value: 0.0, tone: 'pale' },
  ],
  legend: [
    { tone: 'ink', text: 'mốc chuẩn, một lỗi thật duy nhất' },
    { tone: 'hatch', text: 'toàn báo oan, tệp bàn về chính các từ cấm' },
  ],
  note: 'FINDINGS.md cao vì nó nhắc tới từ cấm làm ví dụ, Vale bắt từng ví dụ một.',
}));
console.log('ok');
