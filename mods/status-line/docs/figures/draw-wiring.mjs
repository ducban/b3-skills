// Redraws this mod's figures with the repo's own figlib.mjs.
//   node mods/status-line/docs/figures/draw-wiring.mjs
// Edit here and rerun; never edit an SVG by hand.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const { layers, render } = await import(join(here, '..', '..', '..', '..', 'skills', 'b3-figure-drawing', 'figlib.mjs'));
const out = here;
render(`${out}/wiring.svg`, layers({
  title: 'What the engine hands the mod, what it keeps, what it draws',
  layers: [
    { head: 'WHAT THE ENGINE HANDS IT', sub: 'events the mod listens to, and two timers of its own', tone: 'mid', items: [
      { title: 'turn.step', sub: 'every request, with its message count and usage' },
      { title: 'session.measure, session.compact', sub: 'and the classic hooks as backstop' },
      { title: 'agent.spawn, turn.complete', sub: 'a subagent starting and ending' },
      { title: 'Two ticks', sub: 'ten seconds for the gauge; a minute for the theme and the reset countdown' },
    ] },
    { head: 'WHAT THE MOD KEEPS', sub: 'in memory, and the layout in $.store so it outlives the session', tone: 'open', items: [
      { title: 'The context gauge', sub: 'and which hook last wrote it' },
      { title: 'One quota reading a machine', sub: 'shared through $.store, fetched every three minutes' },
      { title: 'The cache hour', sub: 'counted from the last main-loop request' },
      { title: 'The agents ledger', sub: 'thirty rows, one a subagent' },
    ] },
    { head: 'WHAT YOU SEE', sub: 'drawn from memory, nothing read on the draw path', tone: 'pale', items: [
      { title: 'The band', sub: 'up to four lines above the prompt' },
      { title: 'Three tabs', sub: '/sl help, /sl settings, /sl agents' },
      { title: '/sl debug', sub: 'plain text, with the note behind every empty cell' },
    ] },
  ],
  boundary: { after: 0, label: 'A BUNDLED MODULE MAY SIT IN FRONT', note: 'on a managed machine session.compact never arrives' },
  note: 'The hooks write state as events land; a redraw only reads it. The ticks and turn.step pass the boundary.',
}));
render(`${out}/vi/wiring.svg`, layers({
  title: 'Engine đưa gì, mod giữ gì, bạn thấy gì',
  layers: [
    { head: 'ENGINE ĐƯA GÌ', sub: 'mod nghe các sự kiện này, cộng hai bộ hẹn giờ riêng', tone: 'mid', items: [
      { title: 'turn.step', sub: 'mỗi yêu cầu, kèm số tin nhắn và mức dùng' },
      { title: 'session.measure, session.compact', sub: 'hook classic đứng đỡ phía sau' },
      { title: 'agent.spawn, turn.complete', sub: 'tác tử con bắt đầu và kết thúc' },
      { title: 'Hai nhịp', sub: 'mười giây cho đồng hồ; mỗi phút cho theme và đếm ngược reset' },
    ] },
    { head: 'MOD GIỮ GÌ', sub: 'trong bộ nhớ; riêng bố cục để ở $.store nên qua phiên vẫn còn', tone: 'open', items: [
      { title: 'Đồng hồ ngữ cảnh', sub: 'và hook nào ghi lần cuối' },
      { title: 'Một lần đọc hạn mức cho cả máy', sub: 'để ở $.store, ba phút gọi một lần' },
      { title: 'Giờ cache', sub: 'đếm từ yêu cầu gần nhất của vòng chính' },
      { title: 'Sổ tác tử con', sub: 'ba mươi hàng, mỗi hàng một tác tử con' },
    ] },
    { head: 'BẠN THẤY GÌ', sub: 'vẽ từ bộ nhớ, lúc vẽ không đọc gì thêm', tone: 'pale', items: [
      { title: 'Dải', sub: 'tối đa bốn dòng, trên ô gõ' },
      { title: 'Ba tab', sub: '/sl help, /sl settings, /sl agents' },
      { title: '/sl debug', sub: 'chữ thuần, kèm lý do mỗi ô trống' },
    ] },
  ],
  boundary: { after: 0, label: 'MỘT MODULE CÀI SẴN CÓ THỂ CHẮN Ở ĐÂY', note: 'máy có quản trị: session.compact không tới mod' },
  note: 'Hook ghi số khi sự kiện tới, lúc vẽ chỉ đọc. Hai nhịp và turn.step vẫn qua được chỗ chắn.',
}));
console.log('drawn');
