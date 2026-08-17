/**
 * figlib — bộ vẽ hình cho báo cáo nghiên cứu.
 *
 * Phong cách lấy từ bốn hình của bài hội thảo AI4Econ&Biz: chữ có chân, không
 * một sắc màu nào, phân loại bằng độ đậm nhạt và gạch chéo, trục có vạch chia
 * thật, chú giải viết thành câu tiếng Việt dưới hình.
 *
 * Bảy khuôn, mỗi khuôn nhận nội dung và tự lo toàn bộ toạ độ:
 *
 *   compare()  hai hoặc ba cột đặt cạnh nhau, có thể kéo mũi tên giữa các cột
 *   flow()     chuỗi bước, hoặc vòng lặp khép kín khi bật `loop`
 *   bars()     cột ngang có trục, lưới, ngưỡng
 *   layers()   khung nhiều tầng, mỗi tầng chứa các ô con, có đường ranh giới
 *   plot()     đồ thị đường, có điểm đánh dấu và đường ngưỡng
 *   gap()      một đại lượng đo hai lần, chỗ đáng nhìn là khoảng chênh
 *   timeline() mốc và quãng đặt trên trục thời gian thật
 *
 * ## Hai cặp dễ chọn nhầm
 *
 * `flow` và `timeline` cùng vẽ thứ tự, nhưng `flow` KHÔNG có trục: các bước cách
 * đều nhau vì cái đáng nói là quan hệ trước sau, không phải khoảng cách. Có ngày
 * tháng thật, có độ dài quãng thật thì mới dùng `timeline`.
 *
 * `bars` và `gap` cùng so số, nhưng `bars` xếp hạng những đại lượng ĐỘC LẬP, còn
 * `gap` là MỘT đại lượng đo hai lần. Ba con số khác nhau thì dùng `bars`; một con
 * số mà nguồn nói khác kiểm chứng thì dùng `gap`.
 *
 * Dùng trong container tại `/workspace/agent/figures/figlib.mjs`:
 *
 *   import { bars, render } from '/workspace/agent/figures/figlib.mjs';
 *   render('/tmp/fig1-chi-phi.svg', bars({ ... }));
 *
 * ## Năm sắc độ, không phải sáu màu
 *
 * Bài báo không dùng màu vì bản in đen trắng vẫn phải đọc được, và vì màu làm
 * người đọc đi tìm ý nghĩa ở chỗ không có. Nên bảng ở đây là thang độ đậm chứ
 * không phải bảng màu:
 *
 *   ink    nền đậm đặc, chữ trắng — dùng cho thứ muốn nhấn
 *   mid    xám vừa
 *   pale   xám nhạt — mặc định
 *   open   chỉ có viền, ruột trong
 *   hatch  gạch chéo — nhóm thứ ba, khi ba sắc độ đã hết
 *
 * Quá bốn nhóm thì thang này hết chỗ. Lúc đó tách thành hai hình, đừng bịa thêm
 * sắc độ trung gian: hai ô xám gần nhau người đọc không phân biệt nổi.
 *
 * ## Nền sáng và nền tối
 *
 * Cả bảng khai bằng biến CSS ngay trong file SVG, có khối `prefers-color-scheme`
 * lật thang độ. Một file chạy được cả hai chế độ. Bài báo tô thẳng nền trắng vì
 * vẽ cho giấy in; web Research và Memex đều có nền tối nên ở đây phải khai biến.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const FONT = "Georgia, 'Times New Roman', 'DejaVu Serif', serif";

const TONES = ['ink', 'mid', 'pale', 'open', 'hatch'];

const LIGHT = {
  bg: '#FFFFFF', tx: '#1A1A1A', mu: '#555555', fa: '#777777',
  rule: '#CCCCCC', grid: '#EEEEEE', ar: '#666666', hatchLine: '#1A1A1A',
  ink:   ['#1A1A1A', '#1A1A1A', '#FFFFFF', '#D0D0D0'],
  mid:   ['#D9D9D9', '#1A1A1A', '#1A1A1A', '#555555'],
  pale:  ['#F2F2F2', '#1A1A1A', '#1A1A1A', '#555555'],
  open:  ['#FFFFFF', '#1A1A1A', '#1A1A1A', '#555555'],
  hatch: ['#FFFFFF', '#1A1A1A', '#1A1A1A', '#555555'],
};

const DARK = {
  bg: '#17181A', tx: '#E8EAED', mu: '#A8ACB1', fa: '#8A8F94',
  rule: '#4A4D51', grid: '#26282B', ar: '#8A8F94', hatchLine: '#C8CBCF',
  ink:   ['#E8EAED', '#E8EAED', '#17181A', '#3A3D41'],
  mid:   ['#4A4D51', '#C8CBCF', '#F0F1F3', '#C3C7CB'],
  pale:  ['#2A2C2F', '#C8CBCF', '#F0F1F3', '#B0B4B8'],
  open:  ['#17181A', '#C8CBCF', '#F0F1F3', '#A8ACB1'],
  hatch: ['#17181A', '#C8CBCF', '#F0F1F3', '#A8ACB1'],
};

function vars(p) {
  const out = [
    `--bg:${p.bg}`, `--tx:${p.tx}`, `--mu:${p.mu}`, `--fa:${p.fa}`,
    `--rule:${p.rule}`, `--grid:${p.grid}`, `--ar:${p.ar}`, `--hl:${p.hatchLine}`,
  ];
  for (const k of TONES) {
    const [f, s, t, u] = p[k];
    out.push(`--${k}-f:${f}`, `--${k}-s:${s}`, `--${k}-t:${t}`, `--${k}-u:${u}`);
  }
  return out.join(';');
}

const STYLE =
  `<style>svg{${vars(LIGHT)}}` +
  `@media (prefers-color-scheme:dark){svg{${vars(DARK)}}}` +
  `.bg{fill:var(--bg)}.tx{fill:var(--tx)}.mu{fill:var(--mu)}.fa{fill:var(--fa)}` +
  `</style>`;

const DEFS =
  `<defs>` +
  `<marker id='ah' viewBox='0 0 10 10' refX='8' refY='5' markerWidth='7' markerHeight='7' ` +
  `orient='auto-start-reverse'><path d='M0,0 L10,5 L0,10 z' fill='var(--ar)'/></marker>` +
  `<pattern id='hx' patternUnits='userSpaceOnUse' width='7' height='7' patternTransform='rotate(45)'>` +
  `<rect width='7' height='7' fill='var(--bg)'/>` +
  `<line x1='0' y1='0' x2='0' y2='7' stroke='var(--hl)' stroke-width='1.5'/>` +
  `</pattern>` +
  `</defs>`;

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const tone = (k) => (TONES.includes(k) ? k : 'pale');
const r = (n) => Math.round(n * 10) / 10;

/** Số theo lối Việt: dấu phẩy thập phân, không đuôi `.0` thừa. */
export function vnum(n, digits) {
  const d = digits ?? (Number.isInteger(n) ? 0 : String(n).split('.')[1]?.length ?? 1);
  return n.toFixed(Math.min(d, 4)).replace('.', ',');
}

/* ─────────────────────────── nguyên liệu chung ─────────────────────────── */

/** Cắt chuỗi thành các dòng không quá `max` ký tự. */
export function wrap(s, max) {
  const lines = [];
  let cur = '';
  for (const w of String(s).split(/\s+/)) {
    if (!w) continue;
    if (cur && (cur + ' ' + w).length > max) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

const charsFor = (w, size) => Math.max(6, Math.floor(w / (size * 0.5)));

function boxHeight(item, w, ts) {
  const t = wrap(item.title ?? item, charsFor(w - 20, ts)).length;
  const s = item.sub ? wrap(item.sub, charsFor(w - 20, 11.5)).length : 0;
  return Math.max(42, t * (ts + 5) + s * 15 + 20);
}

/**
 * Một dòng chữ.
 *
 * Khai màu bằng `fill` thì KHÔNG gắn class. Quy tắc CSS trong `<style>` thắng
 * thuộc tính `fill=` viết thẳng trên thẻ, nên gắn cả hai thì màu khai riêng bị
 * nuốt — chữ trắng trên ô đen hoá ra đen trên đen, mất hẳn.
 */
function text(x, y, s, o = {}) {
  const paint = o.fill ? ` fill='${o.fill}'` : ` class='${o.cls ?? 'tx'}'`;
  const st = o.style ? ` font-style='${o.style}'` : '';
  const a = o.anchor ?? 'middle';
  const tr = o.rotate ? ` transform='rotate(${o.rotate} ${r(x)} ${r(y)})'` : '';
  return (
    `<text x='${r(x)}' y='${r(y)}' text-anchor='${a}' font-size='${o.size ?? 13}' ` +
    `font-weight='${o.weight ?? 400}'${paint}${st}${tr}>${esc(s)}</text>`
  );
}

const fillOf = (k) => (k === 'hatch' ? 'url(#hx)' : `var(--${k}-f)`);

/** Ô chữ nhật bo góc: chữ chính căn giữa, chữ phụ nhạt hơn ở dưới. */
export function box(x, y, w, h, kind, title, sub, opts = {}) {
  const k = tone(kind);
  const ts = opts.titleSize ?? 14;
  const lines = wrap(title, charsFor(w - 20, ts));
  const subs = sub ? wrap(sub, charsFor(w - 20, 11.5)) : [];
  const blockH = lines.length * (ts + 5) + subs.length * 15;
  let ty = y + h / 2 - blockH / 2 + ts;
  let out =
    `<rect x='${r(x)}' y='${r(y)}' width='${r(w)}' height='${r(h)}' rx='${opts.rx ?? 8}' ` +
    `fill='${fillOf(k)}' stroke='var(--${k}-s)' stroke-width='${opts.sw ?? 1.4}'/>`;
  for (const ln of lines) {
    out += text(x + w / 2, ty, ln, { size: ts, weight: 700, fill: `var(--${k}-t)` });
    ty += ts + 5;
  }
  for (const ln of subs) {
    out += text(x + w / 2, ty, ln, { size: 11.5, fill: `var(--${k}-u)` });
    ty += 15;
  }
  return out;
}

export function arrow(x1, y1, x2, y2, dash = false) {
  return (
    `<line x1='${r(x1)}' y1='${r(y1)}' x2='${r(x2)}' y2='${r(y2)}' stroke='var(--ar)' ` +
    `stroke-width='1.8'${dash ? " stroke-dasharray='6 4'" : ''} marker-end='url(#ah)'/>`
  );
}

function edge(cx, cy, w, h, dx, dy) {
  if (!dx && !dy) return [cx, cy];
  const t = Math.min(dx ? w / 2 / Math.abs(dx) : Infinity, dy ? h / 2 / Math.abs(dy) : Infinity);
  return [cx + dx * t, cy + dy * t];
}

export function svg(w, h, body) {
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${r(w)} ${r(h)}' ` +
    `width='${r(w)}' height='${r(h)}' font-family="${FONT}">` +
    STYLE + DEFS +
    `<rect x='0' y='0' width='${r(w)}' height='${r(h)}' class='bg'/>` +
    body + `</svg>`
  );
}

/**
 * Chú giải viết thành câu, xếp dọc dưới hình.
 *
 * Bài báo không dùng ô ký hiệu bé tí bên phải: mỗi sắc độ được giải thích bằng
 * một câu, đặt dưới hình, đọc như đọc văn. Trả về `{ body, height }`.
 */
function legendBlock(items, W, y0) {
  if (!items?.length) return { body: '', height: 0 };
  let b = '';
  let y = y0;
  for (const it of items) {
    const k = tone(it.tone);
    b += `<rect x='${r(W / 2 - 190)}' y='${r(y - 11)}' width='16' height='13' rx='2' ` +
      `fill='${fillOf(k)}' stroke='var(--${k}-s)' stroke-width='1.3'/>`;
    b += text(W / 2 - 166, y, it.text, { size: 12.5, cls: 'mu', anchor: 'start' });
    y += 21;
  }
  return { body: b, height: items.length * 21 };
}

/** Tiêu đề trên, chú giải và ghi chú dưới — dùng chung cho cả năm khuôn. */
function frame(W, { title, note, legend }, bodyTop, body, bodyH) {
  let b = title ? text(W / 2, 38, title, { size: 18, weight: 700 }) : '';
  b += body;
  let H = bodyTop + bodyH + 20;
  const lg = legendBlock(legend, W, H + 4);
  if (lg.height) {
    b += lg.body;
    H += lg.height + 8;
  }
  if (note) {
    H += 24;
    b += text(W / 2, H - 14, note, { size: 12.5, cls: 'mu', style: 'italic' });
  }
  return svg(W, H, b);
}

/* ─────────────────────────── khuôn 1 — so sánh ─────────────────────────── */

/**
 * Hai hoặc ba cột đặt cạnh nhau.
 *
 *   compare({
 *     title: 'Bộ nhớ và kỹ năng',
 *     umbrella: 'Bộ nhớ do agent tự bảo trì',       // tuỳ chọn, ô trùm phía trên
 *     columns: [
 *       { head: 'BỘ NHỚ', tone: 'ink', items: [{ title: 'MEMORY.md', sub: '...' }] },
 *       { head: 'KỸ NĂNG', tone: 'pale', items: ['Tự lưu các bước'] },
 *     ],
 *     arrows: false,      // true = kéo mũi tên từ cột trái sang phải theo từng hàng
 *     note: 'Bộ nhớ giữ sự việc, kỹ năng giữ cách làm.',
 *   })
 *
 * `arrows: true` đòi các cột có số dòng bằng nhau. Lệch thì hàm ném lỗi ngay chứ
 * không lặng lẽ vẽ ra một hình sai.
 */
export function compare({ title, umbrella, columns, arrows = false, note, legend } = {}) {
  if (!Array.isArray(columns) || columns.length < 2 || columns.length > 3)
    throw new Error('compare: cần 2 hoặc 3 cột');
  const norm = columns.map((c) => ({
    head: c.head ?? '',
    tone: tone(c.tone),
    // Cột đầu đề thường là `ink` cho đậm, nhưng cả cột con cũng đen thì hình bí.
    // `itemTone` tách hai thứ ra; không khai thì ô con lùi một nấc.
    itemTone: c.itemTone ? tone(c.itemTone) : tone(c.tone) === 'ink' ? 'pale' : tone(c.tone),
    items: (c.items ?? []).map((it) => (typeof it === 'string' ? { title: it } : it)),
  }));
  if (arrows && new Set(norm.map((c) => c.items.length)).size > 1)
    throw new Error('compare: arrows cần các cột có số dòng bằng nhau');

  const n = norm.length;
  const colW = n === 2 ? 380 : 290;
  const gap = arrows ? 54 : 40;
  const pad = 30;
  const W = pad * 2 + colW * n + gap * (n - 1);
  const xs = norm.map((_, i) => pad + i * (colW + gap));

  let top = title ? 62 : 26;
  let b = '';

  if (umbrella) {
    const uw = Math.min(W - 120, 460);
    const uh = 46;
    b += box(W / 2 - uw / 2, top, uw, uh, 'open', umbrella, null, { titleSize: 13.5 });
    const from = top + uh;
    for (const x of xs) b += arrow(W / 2, from, x + colW / 2, from + 34);
    top = from + 40;
  }

  const headH = 50;
  for (let i = 0; i < n; i++)
    b += box(xs[i], top, colW, headH, norm[i].tone, norm[i].head, null, { titleSize: 15 });
  const rowsTop = top + headH + 16;

  const rows = Math.max(...norm.map((c) => c.items.length));
  const itemH = Math.max(42, ...norm.flatMap((c) => c.items.map((it) => boxHeight(it, colW, 13.5))));
  const pitch = itemH + 10;

  for (let i2 = 0; i2 < rows; i2++) {
    const y = rowsTop + i2 * pitch;
    for (let i = 0; i < n; i++) {
      const it = norm[i].items[i2];
      if (!it) continue;
      const k = it.tone ? tone(it.tone) : norm[i].itemTone;
      b += box(xs[i], y, colW, itemH, k, it.title, it.sub, { titleSize: 13.5 });
    }
    if (arrows)
      for (let i = 0; i < n - 1; i++)
        b += arrow(xs[i] + colW + 4, y + itemH / 2, xs[i + 1] - 4, y + itemH / 2);
  }

  return frame(W, { title, note, legend }, rowsTop, b, rows * pitch - 10);
}

/* ──────────────────── khuôn 2 — chuỗi bước hoặc vòng lặp ──────────────────── */

/**
 * Chuỗi bước, hoặc vòng lặp khép kín khi `loop: true`.
 *
 *   flow({
 *     title: 'Vòng học khép kín',
 *     steps: [{ title: 'Lượt của người dùng', sub: '...', tone: 'pale' }],
 *     loop: true,
 *   })
 *
 * Không có `loop` thì từ 4 bước trở xuống xếp ngang, nhiều hơn xếp dọc — nhãn
 * tiếng Việt dài, ép ngang bảy bước thì chữ nát.
 */
export function flow({ title, steps, loop = false, note, legend } = {}) {
  const ns = (steps ?? []).map((s) => (typeof s === 'string' ? { title: s } : s));
  if (ns.length < 2) throw new Error('flow: cần ít nhất 2 bước');
  const top = title ? 62 : 26;

  if (loop) {
    const bw = 220;
    const bh = Math.max(52, ...ns.map((s) => boxHeight(s, bw, 13.5)));
    const n = ns.length;
    const rx = Math.max(230, n * 46);
    const ry = Math.max(120, n * 26);
    const W = (rx + bw / 2) * 2 + 60;
    const H = (ry + bh / 2) * 2 + 60;
    const cx = W / 2;
    const cy = top + H / 2 - 20;

    const pts = ns.map((_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
    });

    let b = '';
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const dx = pts[j].x - pts[i].x;
      const dy = pts[j].y - pts[i].y;
      const [x1, y1] = edge(pts[i].x, pts[i].y, bw + 10, bh + 10, dx, dy);
      const [x2, y2] = edge(pts[j].x, pts[j].y, bw + 14, bh + 14, -dx, -dy);
      b += arrow(x1, y1, x2, y2);
    }
    for (let i = 0; i < n; i++)
      b += box(pts[i].x - bw / 2, pts[i].y - bh / 2, bw, bh, ns[i].tone ?? 'pale', ns[i].title, ns[i].sub, {
        titleSize: 13.5,
      });

    return frame(W, { title, note, legend }, top, b, H - 40);
  }

  if (ns.length <= 4) {
    const bw = 230;
    const gap = 46;
    const bh = Math.max(56, ...ns.map((s) => boxHeight(s, bw, 14)));
    const W = 60 + ns.length * bw + (ns.length - 1) * gap;
    let b = '';
    ns.forEach((s, i) => {
      const x = 30 + i * (bw + gap);
      b += box(x, top, bw, bh, s.tone ?? 'pale', s.title, s.sub, { titleSize: 14 });
      if (i) b += arrow(x - gap + 4, top + bh / 2, x - 4, top + bh / 2);
    });
    return frame(W, { title, note, legend }, top, b, bh);
  }

  const bw = 420;
  const gap = 40;
  const bh = Math.max(52, ...ns.map((s) => boxHeight(s, bw, 14)));
  const W = bw + 80;
  let b = '';
  ns.forEach((s, i) => {
    const y = top + i * (bh + gap);
    b += box(40, y, bw, bh, s.tone ?? 'pale', s.title, s.sub, { titleSize: 14 });
    if (i) b += arrow(W / 2, y - gap + 4, W / 2, y - 4);
  });
  return frame(W, { title, note, legend }, top, b, ns.length * (bh + gap) - gap);
}

/* ─────────────────────── khuôn 3 — cột ngang có trục ─────────────────────── */

/** Bước chia trục "đẹp": 1, 2, 2.5, 5 nhân luỹ thừa 10, nhắm khoảng 5 vạch. */
/** Số chữ số thập phân đủ để in bước chia mà không lòi đuôi dấu phẩy động. */
const stepDigits = (step) => {
  const s = String(step);
  return s.includes('e-') ? Number(s.split('e-')[1]) : (s.split('.')[1]?.length ?? 0);
};

/**
 * Dãy vạch chia từ `min` tới `max`.
 *
 * Cộng dồn `v += step` sinh ra 0.6000000000000001, in ra thành "0,6000". Nên
 * đi theo chỉ số rồi làm tròn về đúng số chữ số của bước.
 */
function ticks(min, max, step) {
  const d = stepDigits(step);
  const out = [];
  for (let i = 0; min + i * step <= max + 1e-9; i++) out.push(Number((min + i * step).toFixed(d + 2)));
  return out.map((v) => ({ v, label: vnum(v, d) }));
}

function niceStep(max) {
  const raw = max / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

/**
 * Cột ngang có trục thật, lưới mờ và đường ngưỡng.
 *
 *   bars({
 *     axisNote: 'Tỉ lệ lượt không phát ra nội dung (%)',
 *     unit: '%',
 *     series: [
 *       { label: 'Ghi chép nhanh', value: 98, tone: 'ink' },
 *       { label: 'Kho tri thức', value: 13, tone: 'hatch' },
 *     ],
 *     threshold: { value: 61.5, label: 'toàn bộ: 61,5%' },
 *     legend: [{ tone: 'ink', text: 'điều kiện tất định' }],
 *     note: 'Số liệu tháng 08/2026.',
 *   })
 *
 * Số in ngay cạnh cột, đậm khi sắc độ là `ink` hoặc `hatch` — hai nhóm được
 * nhấn. Trục có vạch chia nên so độ dài dễ hơn là đọc từng con số.
 */
export function bars({ title, axisNote, unit = '', series, threshold, note, legend, max: maxIn } = {}) {
  const rows = (series ?? []).map((s) => ({
    label: s.label ?? '',
    value: Number(s.value ?? 0),
    tone: tone(s.tone ?? 'pale'),
  }));
  if (!rows.length) throw new Error('bars: cần ít nhất 1 mục');

  const W = 900;
  const labelW = 250;
  const numW = 92;
  const x0 = 30 + labelW;
  const plotW = W - x0 - numW - 24;

  const dataMax = Math.max(...rows.map((s) => s.value), threshold?.value ?? 0, 1);
  const step = niceStep(maxIn ?? dataMax);
  const max = maxIn ?? Math.ceil(dataMax / step) * step;
  const px = (v) => x0 + (v / max) * plotW;

  const rowH = 44;
  const barH = 26;
  let top = title ? 62 : 26;
  let b = '';

  if (axisNote) {
    b += text(x0, top - 4, axisNote, { size: 13, cls: 'mu', anchor: 'start' });
    top += 16;
  }

  const plotH = rows.length * rowH;
  const axisY = top + plotH + 6;

  for (const t of ticks(0, max, step)) {
    const x = px(t.v);
    b += `<line x1='${r(x)}' y1='${r(top)}' x2='${r(x)}' y2='${r(axisY)}' ` +
      `stroke='var(--${t.v === 0 ? 'rule' : 'grid'})' stroke-width='1'/>`;
    b += text(x, axisY + 20, t.label, { size: 12, cls: 'mu' });
  }

  rows.forEach((s, i) => {
    const cy = top + i * rowH + rowH / 2;
    b += text(x0 - 14, cy + 5, s.label, { size: 13.5, anchor: 'end' });
    const w = Math.max(2, (Math.max(0, s.value) / max) * plotW);
    b += `<rect x='${r(x0)}' y='${r(cy - barH / 2)}' width='${r(w)}' height='${barH}' rx='3' ` +
      `fill='${fillOf(s.tone)}' stroke='var(--${s.tone}-s)' stroke-width='1.3'/>`;
    const strong = s.tone === 'ink' || s.tone === 'hatch';
    b += text(x0 + w + 10, cy + 5, `${vnum(s.value)}${unit}`, {
      size: 13,
      anchor: 'start',
      weight: strong ? 700 : 400,
      cls: strong ? 'tx' : 'mu',
    });
  });

  if (threshold) {
    const x = px(threshold.value);
    b += `<line x1='${r(x)}' y1='${r(top - 6)}' x2='${r(x)}' y2='${r(axisY + 4)}' ` +
      `stroke='var(--tx)' stroke-width='1.6' stroke-dasharray='7 5'/>`;
    if (threshold.label)
      b += text(x + 8, axisY + 2, threshold.label, { size: 12.5, cls: 'mu', anchor: 'start' });
  }

  b += `<line x1='${r(x0)}' y1='${r(axisY)}' x2='${r(px(max))}' y2='${r(axisY)}' stroke='var(--rule)' stroke-width='1'/>`;

  return frame(W, { title, note, legend }, top, b, plotH + 34);
}

/* ─────────────────────── khuôn 4 — khung nhiều tầng ─────────────────────── */

/**
 * Các tầng xếp chồng, mỗi tầng là một khung lớn chứa vài ô con.
 *
 *   layers({
 *     layers: [
 *       { head: 'TẦNG 3 · Điều phối ngắt', sub: 'phần điều khiển, không gọi mô hình',
 *         tone: 'pale', items: [{ title: 'Nguồn kích hoạt', sub: 'theo lịch · theo hạn' }] },
 *       { head: 'TẦNG 1 · Năng lực chuyên môn', items: ['Thu thập', 'Lập kế hoạch'] },
 *     ],
 *     boundary: { after: 0, label: 'RANH GIỚI SUY LUẬN', note: 'chỉ khi cổng cho qua' },
 *     note: '...',
 *   })
 *
 * `boundary.after` là chỉ số tầng mà đường ranh giới nằm ngay dưới. Đây là thứ
 * `compare` và `flow` không làm được: ô lồng trong ô, và một đường cắt ngang cả
 * hình mang nhãn riêng.
 */
export function layers({ title, layers: ls, boundary, note, legend } = {}) {
  const norm = (ls ?? []).map((l) => ({
    head: l.head ?? '',
    sub: l.sub ?? null,
    tone: tone(l.tone ?? 'open'),
    items: (l.items ?? []).map((it) => (typeof it === 'string' ? { title: it } : it)),
  }));
  if (!norm.length) throw new Error('layers: cần ít nhất 1 tầng');

  const W = 980;
  const pad = 30;
  const inner = W - pad * 2;
  const gapY = 44;
  const boundaryH = 62;

  let top = title ? 62 : 26;
  let b = '';
  let y = top;

  norm.forEach((l, i) => {
    const cols = Math.max(1, l.items.length);
    const iw = (inner - 36 - (cols - 1) * 16) / cols;
    const ih = l.items.length
      ? Math.max(58, ...l.items.map((it) => boxHeight(it, iw, 13.5)))
      : 0;
    const headH = 34 + (l.sub ? 22 : 0);
    const h = 20 + headH + (ih ? ih + 16 : 0);

    b += `<rect x='${pad}' y='${r(y)}' width='${inner}' height='${r(h)}' rx='12' ` +
      `fill='${fillOf(l.tone)}' stroke='var(--${l.tone}-s)' stroke-width='1.6'/>`;
    b += text(pad + 22, y + 40, l.head, { size: 19, weight: 700, anchor: 'start', fill: `var(--${l.tone}-t)` });
    if (l.sub)
      b += text(pad + 22, y + 62, l.sub, { size: 13, anchor: 'start', fill: `var(--${l.tone}-u)` });

    l.items.forEach((it, j) => {
      const x = pad + 18 + j * (iw + 16);
      b += box(x, y + 12 + headH, iw, ih, it.tone ?? 'open', it.title, it.sub, { titleSize: 13.5 });
    });

    y += h;

    const last = i === norm.length - 1;
    if (!last && boundary && boundary.after === i) {
      const my = y + boundaryH / 2;
      b += `<line x1='0' y1='${r(my)}' x2='${W}' y2='${r(my)}' stroke='var(--tx)' ` +
        `stroke-width='1.6' stroke-dasharray='9 7'/>`;
      const lw = 22 + String(boundary.label).length * 10.5;
      b += `<rect x='${r(W / 2 - lw / 2)}' y='${r(my - 17)}' width='${r(lw)}' height='34' rx='17' fill='var(--tx)'/>`;
      b += text(W / 2, my + 6, boundary.label, { size: 14, weight: 700, fill: 'var(--bg)' });
      b += arrow(W / 2 - lw / 2 - 90, y + 4, W / 2 - lw / 2 - 90, y + boundaryH - 4);
      if (boundary.note)
        b += text(W / 2 - lw / 2 - 82, y + boundaryH - 6, boundary.note, {
          size: 12, cls: 'mu', anchor: 'start',
        });
      y += boundaryH;
    } else if (!last) {
      b += arrow(W / 2, y + 6, W / 2, y + gapY - 6);
      y += gapY;
    }
  });

  return frame(W, { title, note, legend }, top, b, y - top);
}

/* ───────────────────────── khuôn 5 — đồ thị đường ───────────────────────── */

/**
 * Đồ thị đường, có điểm đánh dấu và đường ngưỡng.
 *
 *   plot({
 *     axisNote: 'Chi phí mỗi kỳ (đơn vị quy ước)',
 *     x: { min: 0, max: 1, label: 'Tỉ lệ cổng chặn p', step: 0.2 },
 *     y: { min: 0, max: 100, step: 25 },
 *     lines: [{ points: [[0, 95], [1, 5]], label: 'cổng dời lên trên', tone: 'mid' }],
 *     marks: [{ x: 0.8, y: 23, label: 'A (p = 0,8)' }],
 *     hlines: [{ y: 90, label: 'cổng dưới ranh giới: 90' }],
 *     vlines: [{ x: 0.056, label: 'ngưỡng hoà vốn', dash: true }],
 *   })
 *
 * `points` là danh sách toạ độ đã tính sẵn, không phải công thức — đồ thị đường
 * thẳng chỉ cần hai điểm, đường cong thì lấy mẫu chừng 20 điểm là đủ mượt.
 */
export function plot({ title, axisNote, x, y, lines = [], marks = [], hlines = [], vlines = [], note, legend } = {}) {
  const ax = { min: 0, max: 1, step: 0.2, label: '', ...(x ?? {}) };
  const ay = { min: 0, max: 100, step: 25, label: '', ...(y ?? {}) };

  const W = 940;
  const left = 78;
  const right = W - 40;
  const plotW = right - left;
  const plotH = 430;

  let top = title ? 62 : 26;
  let b = '';
  if (axisNote) {
    b += text(left, top - 2, axisNote, { size: 13.5, cls: 'mu', anchor: 'start' });
    top += 14;
  }
  const bottom = top + plotH;

  const X = (v) => left + ((v - ax.min) / (ax.max - ax.min)) * plotW;
  const Y = (v) => bottom - ((v - ay.min) / (ay.max - ay.min)) * plotH;

  b += `<rect x='${left}' y='${r(top)}' width='${plotW}' height='${plotH}' fill='var(--grid)' opacity='0.45'/>`;

  for (const t of ticks(ay.min, ay.max, ay.step)) {
    const yy = Y(t.v);
    b += `<line x1='${left}' y1='${r(yy)}' x2='${right}' y2='${r(yy)}' stroke='var(--bg)' stroke-width='1'/>`;
    b += text(left - 12, yy + 5, t.label, { size: 12.5, cls: 'mu', anchor: 'end' });
  }
  for (const t of ticks(ax.min, ax.max, ax.step))
    b += text(X(t.v), bottom + 24, t.label, { size: 12.5, cls: 'mu' });
  b += `<line x1='${left}' y1='${r(bottom)}' x2='${right}' y2='${r(bottom)}' stroke='var(--tx)' stroke-width='1.4'/>`;
  b += `<line x1='${left}' y1='${r(top)}' x2='${left}' y2='${r(bottom)}' stroke='var(--tx)' stroke-width='1.4'/>`;
  if (ax.label) b += text((left + right) / 2, bottom + 52, ax.label, { size: 13.5 });

  for (const h of hlines) {
    const yy = Y(h.y);
    b += `<line x1='${left}' y1='${r(yy)}' x2='${right}' y2='${r(yy)}' stroke='var(--tx)' ` +
      `stroke-width='1.8'${h.dash ? " stroke-dasharray='7 5'" : ''}/>`;
    if (h.label) b += text(right - 6, yy - 10, h.label, { size: 13, weight: 700, anchor: 'end' });
  }
  for (const v of vlines) {
    const xx = X(v.x);
    b += `<line x1='${r(xx)}' y1='${r(top)}' x2='${r(xx)}' y2='${r(bottom)}' stroke='var(--tx)' ` +
      `stroke-width='1.5' stroke-dasharray='7 5'/>`;
    if (v.label)
      String(v.label).split('\n').forEach((ln, i) =>
        b += text(xx + 10, top + (v.labelY ?? 96) + i * 19, ln, { size: 13, anchor: 'start' }));
  }

  for (const ln of lines) {
    const k = tone(ln.tone ?? 'mid');
    const d = ln.points.map((p, i) => `${i ? 'L' : 'M'}${r(X(p[0]))},${r(Y(p[1]))}`).join(' ');
    b += `<path d='${d}' fill='none' stroke='var(--${k}-s)' stroke-width='${ln.width ?? 2.6}'` +
      `${ln.dash ? " stroke-dasharray='8 5'" : ''}/>`;
    if (ln.label) {
      // Nhãn đặt ở giữa ĐƯỜNG, không phải ở phần tử giữa của mảng: đường thẳng
      // chỉ có hai điểm, lấy phần tử giữa là rơi đúng vào mút cuối và chữ chạy
      // ra ngoài khung.
      const at = ln.labelAt ?? 0.5;
      const pts = ln.points.map((p) => [X(p[0]), Y(p[1])]);
      const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
      const total = seg.reduce((a, c) => a + c, 0);
      let want = total * at;
      let i = 0;
      while (i < seg.length - 1 && want > seg[i]) want -= seg[i++];
      const t = seg[i] ? want / seg[i] : 0;
      const lx = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t;
      const ly = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
      const deg = (Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]) * 180) / Math.PI;
      b += text(lx, ly - 12, ln.label, { size: 13.5, weight: 700, rotate: r(deg) });
    }
  }

  for (const m of marks) {
    b += `<circle cx='${r(X(m.x))}' cy='${r(Y(m.y))}' r='6' fill='var(--tx)'/>`;
    if (m.label)
      b += text(X(m.x) + (m.side === 'left' ? -12 : 12), Y(m.y) - 14, m.label, {
        size: 13.5, weight: 700, anchor: m.side === 'left' ? 'end' : 'start',
      });
  }

  return frame(W, { title, note, legend }, top, b, plotH + 62);
}

/* ─────────────────── khuôn 6 — một số đo hai lần (tạ đôi) ─────────────────── */

/**
 * Cùng một đại lượng, hai lần đo, nối bằng một đoạn có mũi tên.
 *
 *   gap({
 *     axisNote: 'Số sao GitHub (nghìn)',
 *     unit: 'K',
 *     digits: 2,                                  // tuỳ chọn, ép số lẻ đều nhau
 *     ends: ['bài Kimi nói', 'kiểm chứng'],       // tuỳ chọn, mặc định lời/kiểm chứng
 *     rows: [
 *       { label: 'Sao OpenClaw', from: 180, to: 247, note: 'thiếu 67K' },
 *       { label: 'Kênh nhắn tin', from: 20, to: 24 },
 *     ],
 *     note: 'Mũi tên chỉ về phía số đã kiểm chứng.',
 *   })
 *
 * Vòng rỗng là lần đo thứ nhất, chấm đặc là lần thứ hai — nên không cần chú giải
 * riêng để biết bên nào là bên đáng tin. Số của lần thứ hai in đậm vì đó mới là
 * số người đọc nên mang đi.
 *
 * Hai đầu bằng nhau thì chỉ còn một chấm đặc và một con số: ca "nguồn nói đúng"
 * phải trông khác hẳn ca có chênh, không phải một đoạn dài bằng không.
 *
 * MỘT ĐƠN VỊ cho cả hình. Trục dùng chung nên trộn "247 nghìn sao" với "13 tuổi"
 * là biến mọi dòng còn lại thành một chấm dính vào lề trái. Khác đơn vị thì tách
 * hình, đừng đổi sang thang loga: thang loga làm khoảng chênh trông nhỏ đi, đúng
 * cái mà hình này sinh ra để cho thấy.
 *
 * Trục mặc định bắt đầu từ 0. Dòng nào chênh dưới khoảng 2% bề ngang trục thì hai
 * chấm sẽ chồng lên nhau thành một cục — đó là sự thật chứ không phải lỗi vẽ, và
 * hai con số ở trên dưới vẫn đọc được. Muốn phóng to phần chênh thì truyền `min`
 * để cắt trục, nhưng cắt trục là làm khoảng chênh trông to hơn thực; chỉ cắt khi
 * có lý do và nói rõ trong `note`.
 */
export function gap({ title, axisNote, unit = '', digits, ends, rows, note, legend, min: minIn, max: maxIn } = {}) {
  const cap = ends ?? ['lời tuyên bố', 'số kiểm chứng'];
  const data = (rows ?? []).map((d) => ({
    label: d.label ?? '',
    from: Number(d.from ?? 0),
    to: Number(d.to ?? 0),
    note: d.note ?? null,
  }));
  if (!data.length) throw new Error('gap: cần ít nhất 1 dòng');

  const W = 940;
  const x0 = 288;
  const plotW = W - x0 - 60;

  const vals = data.flatMap((d) => [d.from, d.to]);
  const lo = minIn ?? Math.min(0, ...vals);
  const step = niceStep(Math.max(...vals) - lo || 1);
  const hi = maxIn ?? lo + Math.max(1, Math.ceil((Math.max(...vals) - lo) / step)) * step;
  const px = (v) => x0 + ((v - lo) / (hi - lo)) * plotW;

  const rowH = 52;
  let top = title ? 62 : 26;
  let b = '';

  if (axisNote) {
    b += text(x0, top - 4, axisNote, { size: 13, cls: 'mu', anchor: 'start' });
    top += 16;
  }

  // Khoá ký hiệu ngay trên hình: rỗng là lần một, đặc là lần hai.
  b += `<circle cx='${r(x0 + 7)}' cy='${r(top + 4)}' r='5.5' fill='var(--bg)' stroke='var(--tx)' stroke-width='1.8'/>`;
  b += text(x0 + 19, top + 9, cap[0], { size: 12.5, cls: 'mu', anchor: 'start' });
  const kx = x0 + 19 + Math.max(60, cap[0].length * 6.9) + 24;
  b += `<circle cx='${r(kx)}' cy='${r(top + 4)}' r='5.5' fill='var(--tx)'/>`;
  b += text(kx + 12, top + 9, cap[1], { size: 12.5, cls: 'mu', anchor: 'start' });
  top += 28;

  const plotH = data.length * rowH;
  const axisY = top + plotH + 6;

  for (const t of ticks(lo, hi, step)) {
    const x = px(t.v);
    b += `<line x1='${r(x)}' y1='${r(top)}' x2='${r(x)}' y2='${r(axisY)}' ` +
      `stroke='var(--${t.v === lo ? 'rule' : 'grid'})' stroke-width='1'/>`;
    b += text(x, axisY + 20, t.label, { size: 12, cls: 'mu' });
  }

  data.forEach((d, i) => {
    const cy = top + i * rowH + rowH / 2;
    b += text(x0 - 14, cy + 4, d.label, { size: 13.5, anchor: 'end' });
    if (d.note) b += text(x0 - 14, cy + 21, d.note, { size: 11.5, cls: 'fa', anchor: 'end' });

    const xa = px(d.from);
    const xb = px(d.to);
    const same = Math.abs(d.to - d.from) < 1e-9;

    if (!same) {
      // Mũi tên ngắn hơn chính cái đầu mũi tên thì in ra một cục đen, trông như
      // lỗi vẽ chứ không như "chênh ít". Dưới 18px thì bỏ đầu mũi tên, để hai
      // chấm tự nói: vị trí vẫn thật, chỉ là khoảng cách vốn dĩ nhỏ.
      const far = Math.abs(xb - xa) >= 18;
      b += `<line x1='${r(xa)}' y1='${r(cy)}' x2='${r(far ? xb + (xb > xa ? -10 : 10) : xb)}' y2='${r(cy)}' ` +
        `stroke='var(--ar)' stroke-width='2'${far ? " marker-end='url(#ah)'" : ''}/>`;
      b += `<circle cx='${r(xa)}' cy='${r(cy)}' r='6' fill='var(--bg)' stroke='var(--tx)' stroke-width='1.8'/>`;
      b += text(xa, cy - 13, `${vnum(d.from, digits)}${unit}`, { size: 12.5, cls: 'mu' });
    }
    b += `<circle cx='${r(xb)}' cy='${r(cy)}' r='6.5' fill='var(--tx)'/>`;
    // Hai chấm sát nhau thì hai con số chồng lên nhau — hạ số thứ hai xuống dưới.
    const tight = !same && Math.abs(xb - xa) < 76;
    b += text(xb, tight ? cy + 23 : cy - 13, `${vnum(d.to, digits)}${unit}`, { size: 13, weight: 700 });
  });

  b += `<line x1='${r(x0)}' y1='${r(axisY)}' x2='${r(px(hi))}' y2='${r(axisY)}' stroke='var(--rule)' stroke-width='1'/>`;

  return frame(W, { title, note, legend }, top, b, plotH + 34);
}

/* ────────────────────── khuôn 7 — mốc trên trục thời gian ────────────────────── */

/**
 * Quãng và mốc đặt đúng vị trí trên một trục thời gian.
 *
 *   timeline({
 *     axisNote: 'Tuần kể từ lúc khởi động',
 *     x: { min: 0, max: 30, step: 5 },
 *     rows: [
 *       { label: 'Nhân sự', spans: [
 *           { from: 1, to: 14, label: '4 FTE', tone: 'pale' },
 *           { from: 15, to: 20, label: '6 FTE', tone: 'mid' },
 *       ]},
 *       { label: 'Cột mốc', events: [{ at: 30, label: 'Cloud private beta' }] },
 *     ],
 *     marks: [{ at: 22, label: 'chốt ngân sách' }],   // đường dọc cắt cả hình
 *     ticks: [{ at: 0, label: '04/2026' }],           // tuỳ chọn, đè nhãn tự sinh
 *   })
 *
 * Mỗi dòng là một mạch riêng: `spans` vẽ thành thanh, `events` vẽ thành chấm.
 * Trộn cả hai trong một dòng được.
 *
 * Trục là thứ phân biệt khuôn này với `flow`. Ba bước cách đều nhau thì `flow`
 * đúng hơn và rẻ hơn. Chỉ dùng `timeline` khi khoảng cách giữa các mốc MANG
 * NGHĨA — sáu năm im ắng rồi ba tháng dồn dập phải nhìn ra được đúng như vậy.
 *
 * Nhãn quãng nằm trong thanh khi thanh đủ rộng, không thì tự nhảy ra ngoài mép
 * phải. Nhãn mốc nằm bên phải chấm, trừ mốc ở gần cuối trục thì lật sang trái để
 * khỏi chạy khỏi khung.
 */
export function timeline({ title, axisNote, x, rows, marks = [], ticks: tickIn, note, legend } = {}) {
  const ax = { min: 0, max: 10, step: 1, ...(x ?? {}) };
  const data = (rows ?? []).map((row) => ({
    label: row.label ?? '',
    spans: (row.spans ?? []).map((s) => ({
      from: Number(s.from),
      to: Number(s.to),
      label: s.label ?? '',
      tone: tone(s.tone ?? 'pale'),
    })),
    events: (row.events ?? []).map((e) => ({ at: Number(e.at), label: e.label ?? '' })),
  }));
  if (!data.length) throw new Error('timeline: cần ít nhất 1 dòng');

  const W = 940;
  const x0 = 250;
  const right = W - 44;
  const plotW = right - x0;
  const px = (v) => x0 + ((v - ax.min) / (ax.max - ax.min)) * plotW;

  const rowH = 64;
  let top = title ? 62 : 26;
  let b = '';
  if (axisNote) {
    b += text(x0, top - 4, axisNote, { size: 13, cls: 'mu', anchor: 'start' });
    top += 20;
  }

  const plotH = data.length * rowH;
  const axisY = top + plotH + 8;

  const tk = tickIn ?? ticks(ax.min, ax.max, ax.step).map((t) => ({ at: t.v, label: t.label }));
  for (const t of tk) {
    const xx = px(t.at);
    b += `<line x1='${r(xx)}' y1='${r(top)}' x2='${r(xx)}' y2='${r(axisY)}' stroke='var(--grid)' stroke-width='1'/>`;
    b += text(xx, axisY + 20, t.label, { size: 12, cls: 'mu' });
  }

  for (const m of marks) {
    const xx = px(m.at);
    b += `<line x1='${r(xx)}' y1='${r(top - 6)}' x2='${r(xx)}' y2='${r(axisY)}' ` +
      `stroke='var(--tx)' stroke-width='1.5' stroke-dasharray='7 5'/>`;
    if (m.label) {
      const near = (m.at - ax.min) / (ax.max - ax.min) > 0.7;
      b += text(xx + (near ? -8 : 8), top + 10, m.label, {
        size: 12.5, weight: 700, anchor: near ? 'end' : 'start',
      });
    }
  }

  data.forEach((row, i) => {
    const cy = top + i * rowH + rowH / 2 + 6;
    b += text(x0 - 14, cy + 5, row.label, { size: 13.5, anchor: 'end' });
    b += `<line x1='${r(x0)}' y1='${r(cy)}' x2='${r(right)}' y2='${r(cy)}' stroke='var(--grid)' stroke-width='1'/>`;

    for (const s of row.spans) {
      const xa = px(s.from);
      const w = Math.max(3, px(s.to) - xa);
      b += `<rect x='${r(xa)}' y='${r(cy - 13)}' width='${r(w)}' height='26' rx='3' ` +
        `fill='${fillOf(s.tone)}' stroke='var(--${s.tone}-s)' stroke-width='1.3'/>`;
      if (s.label)
        b += w > s.label.length * 7.4
          ? text(xa + w / 2, cy + 5, s.label, { size: 12.5, weight: 700, fill: `var(--${s.tone}-t)` })
          : text(xa + w + 9, cy + 5, s.label, { size: 12.5, anchor: 'start' });
    }

    for (const e of row.events) {
      const xx = px(e.at);
      b += `<circle cx='${r(xx)}' cy='${r(cy)}' r='6' fill='var(--tx)'/>`;
      if (e.label) {
        const near = (e.at - ax.min) / (ax.max - ax.min) > 0.68;
        b += text(xx + (near ? -12 : 12), cy - 13, e.label, {
          size: 13, weight: 700, anchor: near ? 'end' : 'start',
        });
      }
    }
  });

  b += `<line x1='${r(x0)}' y1='${r(axisY)}' x2='${r(right)}' y2='${r(axisY)}' stroke='var(--tx)' stroke-width='1.4'/>`;

  return frame(W, { title, note, legend }, top, b, plotH + 40);
}

/* ──────────────────────────────── ghi file ──────────────────────────────── */

/** Ghi một hình ra đĩa, tự tạo thư mục cha nếu chưa có. */
export function render(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}
