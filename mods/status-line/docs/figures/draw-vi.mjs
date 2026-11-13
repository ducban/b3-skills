// Redraws this mod's figures with the repo's own figlib.mjs.
//   node mods/status-line/docs/figures/draw-vi.mjs
// Edit here and rerun; never edit an SVG by hand.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const { compare, flow, render } = await import(join(here, '..', '..', '..', '..', 'skills', 'b3-figure-drawing', 'figlib.mjs'));
const out = join(here, 'vi');

render(`${out}/statusline-vs-mod.svg`, compare({
  title: 'Lệnh statusLine so với mod, mỗi lần vẽ lại màn hình',
  columns: [
    { head: 'LỆNH STATUSLINE', tone: 'pale', items: [
      { title: 'Engine chạy một lệnh ngoài', sub: 'mỗi khi vẽ lại màn hình' },
      { title: 'Mỗi lần vẽ mất khoảng 57 ms', sub: 'gần hết là Node khởi động' },
      { title: 'Lệnh đọc 127 MB bản ghi hội thoại', sub: 'để cộng token, lần nào cũng đọc lại' },
      { title: 'Lệnh vẽ dưới ô gõ', sub: 'và nằm yên chỗ đó' },
    ] },
    { head: 'SL-MOD', tone: 'ink', items: [
      { title: 'Engine nạp module một lần duy nhất', sub: 'vẽ lại chỉ là gọi một hàm' },
      { title: 'Lúc vẽ chỉ đọc bộ nhớ', sub: 'số đã ghi sẵn khi sự kiện tới' },
      { title: 'Việc đọc nặng chạy theo bộ hẹn giờ', sub: 'mỗi máy gọi hạn mức một lần, ba phút một' },
      { title: 'Mod vẽ vào dải trên ô gõ', sub: 'dải đi theo ô gõ' },
    ] },
  ],
  arrows: true,
  note: 'Số đo trên máy này. Cái phải chịu là dải đi theo ô gõ.',
}));

// wiring.svg: draw-wiring.mjs draws it, English and Vietnamese.

render(`${out}/cache-hour.svg`, flow({
  title: 'Một giờ cache sống và cái cổng ở cuối',
  loop: true,
  steps: [
    { title: 'Vòng chính gửi một yêu cầu', sub: 'turn.step thấy nó đi và về', tone: 'mid' },
    { title: 'cache ▰▰▰▰▰ 1h00m', sub: 'thanh vơi dần từ yêu cầu gần nhất' },
    { title: 'Còn dưới hai mươi phút thì vàng, dưới mười thì đỏ', sub: 'hết giờ là mất tiền, nên dùng màu của đồng hồ' },
    { title: 'cache cold', sub: 'hết giờ; yêu cầu kế phải đọc lại cả bản ghi' },
    { title: 'Cổng chặn prompt đầu tiên bạn gõ', sub: 'một lần thôi, báo số token phải đọc lại; nháp còn nguyên trong ô', tone: 'ink' },
    { title: 'Enter lần nữa là gửi', sub: 'yêu cầu đó làm ấm cache, giờ đếm lại từ đầu' },
  ],
  note: 'Lệnh gạch chéo, prompt gõ giữa lượt, prompt không có người gõ, hay cửa sổ dưới 50k token thì không hỏi.',
}));

render(`${out}/guard.svg`, flow({
  title: 'Lệnh Bash nguy hiểm bị giữ tới khi bạn trả lời',
  steps: [
    { title: 'Claude gọi Bash có rm -rf, git reset --hard, git clean hay force push', sub: 'guard đọc chuỗi lệnh, không phân tích cú pháp shell' },
    { title: 'Lệnh bị giữ trước khi chạy', sub: 'vòng ngủ từng phần tư giây, tối đa mười phút, nằm trong lời gọi $ nên hook không hết giờ' },
    { title: 'Mod đo lệnh đó sẽ phá gì', sub: 'rm: số file và dung lượng; reset: file đã sửa; clean: git clean -n; force push: commit sẽ mất' },
    { title: 'Báo cáo chiếm dòng một của dải', sub: 'bấm 1 là chạy; 2, Esc, im lặng, hay guard lỗi là từ chối', tone: 'ink' },
    { title: 'Claude đọc câu trả lời', sub: 'lời từ chối nói lệnh sẽ phá gì, nên Claude không thử lại dòng đó' },
  ],
  note: 'Mặc định tắt. Bật bằng guard (a) trong /sl settings, lưu như bố cục.',
}));
console.log('drawn vi');
