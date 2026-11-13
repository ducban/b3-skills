// Redraws this mod's figures with the repo's own figlib.mjs.
//   node mods/status-line/docs/figures/draw.mjs
// Edit here and rerun; never edit an SVG by hand.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const { compare, flow, render } = await import(join(here, '..', '..', '..', '..', 'skills', 'b3-figure-drawing', 'figlib.mjs'));
const out = here;

render(`${out}/statusline-vs-mod.svg`, compare({
  title: 'A statusLine command and a mod, on each redraw',
  columns: [
    { head: 'STATUSLINE COMMAND', tone: 'pale', items: [
      { title: 'The engine forks a command', sub: 'on every redraw of the screen' },
      { title: 'About 57 ms a render', sub: 'almost all of it is Node starting up' },
      { title: 'It reads 127 MB of transcripts', sub: 'to total the tokens, each time' },
      { title: 'It draws under the prompt', sub: 'and stays where it was put' },
    ] },
    { head: 'STATUS-LINE', tone: 'ink', items: [
      { title: 'The engine loads a module once', sub: 'a redraw is a function call' },
      { title: 'The draw path reads memory', sub: 'the figures were kept as events landed' },
      { title: 'The expensive reads sit on a timer', sub: 'one quota fetch a machine, every three minutes' },
      { title: 'It draws in the band above the prompt', sub: 'and moves with it' },
    ] },
  ],
  arrows: true,
  note: 'The figures are from this machine; the trade is the band moving with the prompt.',
}));

// wiring.svg: draw-wiring.mjs draws it, English and Vietnamese.

render(`${out}/cache-hour.svg`, flow({
  title: 'The hour the prompt cache lives, and the gate at its end',
  loop: true,
  steps: [
    { title: 'A main-loop request goes out', sub: 'turn.step sees it leave and return', tone: 'mid' },
    { title: 'cache ▰▰▰▰▰ 1h00m', sub: 'the bar drains from the last request' },
    { title: 'Amber inside twenty minutes, red inside ten', sub: 'running out is the trouble, so the colours are the gauge’s own' },
    { title: 'cache cold', sub: 'the hour has gone; the next request re-reads the whole transcript' },
    { title: 'The gate drops the first prompt typed', sub: 'once, with the re-read in tokens; the draft stays in the box', tone: 'ink' },
    { title: 'Enter again sends it', sub: 'the request re-warms the cache, and the hour starts over' },
  ],
  note: 'A slash command, a prompt typed mid-turn, an unattended prompt or a window under 50k tokens is never asked.',
}));

render(`${out}/guard.svg`, flow({
  title: 'A risky Bash call, held until you answer',
  steps: [
    { title: 'Claude calls Bash with rm -rf, git reset --hard, git clean or a force push', sub: 'the guard reads the command text; it does not parse shell' },
    { title: 'The call is held before it runs', sub: 'a loop of quarter-second sleeps, up to ten minutes, inside a $ call so the hook keeps its time' },
    { title: 'What it would destroy is measured', sub: 'files and size for rm, changed files for reset, git clean -n for clean, the commits a force push drops' },
    { title: 'The report takes row one of the band', sub: '1 runs it as written; 2, Esc, silence or an error in the guard refuse', tone: 'ink' },
    { title: 'Claude reads the answer', sub: 'a refusal says what it would have destroyed, so the same line is not tried again' },
  ],
  note: 'Off by default; guard (a) in /sl settings turns it on, and the choice is stored like the layout.',
}));
console.log('drawn en');
