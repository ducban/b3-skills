// Pure-logic tests: `bun test tests/` from the mod folder. Engine-level behaviour is checked live.
import { describe, expect, test } from 'bun:test'

import {
  applyIssues,
  base64,
  chain,
  chatRequest,
  codePointToUtf16,
  cycle,
  DEFAULT_PREFS,
  boundActions,
  addChords,
  chordLabel,
  keyName,
  keyLines,
  keysFor,
  dirsFor,
  harperInstall,
  harperInstallAll,
  commentedOnly,
  langfuse401,
  platformOf,
  traceLine,
  ENV_TEMPLATE,
  needsTemplate,
  readPrefs,
  decorations,
  harperReplacement,
  merge,
  otlpTrace,
  parseDotenv,
  parseEdits,
  parseHarper,
  placeEdits,
  protectedRanges,
  sentences,
  shortModel,
  shouldCheck,
  sourcesOf,
  addTally,
  liveModel,
  newerSibling,
  parseModelList,
  readTally,
  tallyLine,
  type Issue,
} from '../hooks/core'

describe('shouldCheck', () => {
  test('English prose of four words or more', () => {
    expect(shouldCheck('Please fix the failing test')).toBe(true)
    expect(shouldCheck('fix it now')).toBe(false)
  })
  test('commands, shell escapes and Vietnamese are skipped', () => {
    expect(shouldCheck('/commit the staged files please')).toBe(false)
    expect(shouldCheck('! git status in this repo')).toBe(false)
    expect(shouldCheck('Sửa giúp tôi cái test đang lỗi nhé')).toBe(false)
  })
})

describe('sentences', () => {
  test('splits with offsets into the draft', () => {
    const text = 'I has a bug.  It break the build!\nPlease look'
    const got = sentences(text)
    expect(got.map((s) => s.text)).toEqual(['I has a bug.', 'It break the build!', 'Please look'])
    for (const s of got) expect(text.slice(s.start, s.end)).toBe(s.text)
  })
})

describe('Harper', () => {
  test('suggestion strings become replacement text', () => {
    expect(harperReplacement('Replace with: “an”', 'a')).toBe('an')
    expect(harperReplacement('Insert “,”', 'However')).toBe('However,')
    expect(harperReplacement('Remove error', 'the')).toBe('')
    expect(harperReplacement('Something new', 'x')).toBeUndefined()
  })
  test('code-point spans become UTF-16 offsets', () => {
    const text = '🙂 teh cat'
    expect(codePointToUtf16(text, 2)).toBe(3)
  })
  test('parses harper-cli JSON (array or single file)', () => {
    const text = '🙂 teh cat'
    const lint = {
      rule: 'SpellCheck',
      kind: 'Spelling',
      span: { char_start: 2, char_end: 5 },
      line: 1,
      column: 3,
      message: 'Did you mean “the”?',
      priority: 63,
      suggestions: ['Replace with: “the”'],
      matched_text: 'teh',
    }
    const one = parseHarper(JSON.stringify({ file: 'd.md', lint_count: 1, lints: [lint] }), text)
    const many = parseHarper(JSON.stringify([{ file: 'd.md', lint_count: 1, lints: [lint] }]), text)
    expect(one).toEqual(many)
    expect(one[0]).toMatchObject({ start: 3, end: 6, to: 'the', source: 'harper' })
    expect(parseHarper('not json', text)).toEqual([])
  })
})

describe('chain', () => {
  test('OpenRouter, OpenAI, Fireworks by key, then Haiku', () => {
    const hops = chain({ OPENAI_API_KEY: 'o', FIREWORKS_API_KEY: 'f', OPENROUTER_API_KEY: 'r' })
    expect(hops.map((h) => h.route)).toEqual(['openrouter', 'openai', 'fireworks', 'claude'])
  })
  test('no keys: Haiku alone; LLM off: nothing', () => {
    expect(chain({}).map((h) => h.route)).toEqual(['claude'])
    expect(chain({ B3_GRAMMAR_LLM: 'off', OPENAI_API_KEY: 'o' })).toEqual([])
  })
  test('forced provider goes first and takes B3_GRAMMAR_MODEL', () => {
    const hops = chain({ OPENROUTER_API_KEY: 'r', OPENAI_API_KEY: 'o', B3_GRAMMAR_PROVIDER: 'openai', B3_GRAMMAR_MODEL: 'gpt-5-nano' })
    expect(hops[0]).toEqual({ route: 'openai', model: 'gpt-5-nano', apiKey: 'o' })
    expect(hops[1]?.route).toBe('openrouter')
  })
  test('blank keys count as none', () => {
    expect(chain({ OPENROUTER_API_KEY: '  ' }).map((h) => h.route)).toEqual(['claude'])
  })
})

describe('chatRequest', () => {
  test('OpenRouter turns reasoning off except for openai/ models', () => {
    const qwen = JSON.parse(chatRequest({ route: 'openrouter', model: 'qwen/x', apiKey: 'k' }, 'u').body)
    const oai = JSON.parse(chatRequest({ route: 'openrouter', model: 'openai/gpt-5-mini', apiKey: 'k' }, 'u').body)
    expect(qwen.reasoning).toEqual({ enabled: false })
    expect(oai.reasoning).toBeUndefined()
  })
  test('OpenAI gpt-5 gets minimal reasoning and max_completion_tokens', () => {
    const req = chatRequest({ route: 'openai', model: 'gpt-5-mini', apiKey: 'k' }, 'u')
    const body = JSON.parse(req.body)
    expect(req.url).toBe('https://api.openai.com/v1/chat/completions')
    expect(body.reasoning_effort).toBe('minimal')
    expect(body.max_completion_tokens).toBeGreaterThan(0)
    expect(req.headers.Authorization).toBe('Bearer k')
  })
  test('Fireworks endpoint', () => {
    expect(chatRequest({ route: 'fireworks', model: 'm', apiKey: 'k' }, 'u').url).toBe(
      'https://api.fireworks.ai/inference/v1/chat/completions',
    )
  })
})

describe('LLM edits', () => {
  test('parses JSON wrapped in think blocks and fences', () => {
    const reply = '<think>hmm</think>\n```json\n{"edits":[{"i":0,"from":"has","to":"have"},{"i":0,"from":"x","to":"x"}]}\n```'
    expect(parseEdits(reply)).toEqual([{ i: 0, from: 'has', to: 'have' }])
    expect(parseEdits('no json here')).toBeUndefined()
  })
  test('places edits inside their sentence', () => {
    const [s] = sentences('Ok. I has a bug.').slice(1)
    const got = placeEdits(s!, [{ from: 'has', to: 'have' }, { from: 'missing', to: 'x' }])
    expect(got).toEqual([{ start: 6, end: 9, to: 'have', source: 'llm', message: 'style' }])
  })
})

describe('merge, decorations, apply', () => {
  const issue = (start: number, end: number, to: string, source: Issue['source'] = 'harper'): Issue => ({
    start,
    end,
    to,
    source,
    message: '',
  })

  test('the LLM wins a clash and protected spans are left alone', () => {
    const text = 'run `npm tset` and teh tests now'
    const guard = protectedRanges(text)
    const got = merge(
      [issue(19, 22, 'the'), issue(9, 13, 'test'), issue(29, 32, 'today')],
      [issue(19, 28, 'the test', 'llm')],
      guard,
    )
    expect(got).toEqual([issue(19, 28, 'the test', 'llm'), issue(29, 32, 'today')])
  })

  test('the band names every source that has a fix showing', () => {
    expect(sourcesOf([{ by: 'harper' }, { by: 'openrouter qwen3' }, { by: 'harper' }])).toBe('harper + openrouter qwen3')
    expect(shortModel('accounts/fireworks/models/minimax-m3')).toBe('minimax-m3')
    expect(shortModel('gpt-5-mini')).toBe('gpt-5-mini')
  })

  test('paths and identifiers are protected', () => {
    const text = 'open src/lib/confg.ts and fix myVar'
    const guard = protectedRanges(text)
    expect(guard.some((g) => g.start <= 5 && g.end >= 21)).toBe(true)
    expect(guard.some((g) => text.slice(g.start, g.end) === 'myVar')).toBe(true)
  })

  test('a fix paints the span and shows the replacement as ghost text', () => {
    expect(decorations([issue(2, 5, 'the')])).toEqual([
      { start: 2, end: 5, color: 'warning', underline: true, strikethrough: false },
      { start: 5, end: 5, virtualText: ' →the', dimColor: true },
    ])
    expect(decorations([issue(2, 5, '')])[0]?.strikethrough).toBe(true)
  })

  test('applying keeps the caret where the person was typing', () => {
    const text = 'I has teh bug now'
    const out = applyIssues(text, text.length, [issue(2, 5, 'have'), issue(6, 9, 'the')])
    expect(out.text).toBe('I have the bug now')
    expect(out.cursor).toBe(out.text.length)
    expect(applyIssues(text, 0, [issue(2, 5, 'have')]).cursor).toBe(0)
  })
})

describe('settings and Langfuse', () => {
  test('dotenv: comments, quotes, export', () => {
    const env = parseDotenv('# c\nA=1\nexport B="two words"\nC=x # note\n#D=4\n')
    expect(env).toEqual({ A: '1', B: 'two words', C: 'x' })
  })
  test('base64 matches the standard encoding', () => {
    for (const s of ['pk-lf-1:sk-lf-2', 'a', 'ab', 'abc', 'héllo']) {
      expect(base64(s)).toBe(Buffer.from(s).toString('base64'))
    }
  })
  test('OTLP body: root plus children under one trace', () => {
    const body = JSON.parse(
      otlpTrace(
        'a'.repeat(32),
        { name: 'prompt-check', startMs: 1000, endMs: 2000, attrs: { 'langfuse.trace.tags': ['openai'], skip: undefined } },
        [{ name: 'llm:openai', startMs: 1100, endMs: 1900, attrs: { 'langfuse.observation.type': 'generation', n: 3 } }],
        '0.1.0',
      ),
    )
    const spans = body.resourceSpans[0].scopeSpans[0].spans
    expect(spans).toHaveLength(2)
    expect(spans[1].parentSpanId).toBe(spans[0].spanId)
    expect(spans[0].startTimeUnixNano).toBe('1000000000')
    expect(spans[0].attributes).toEqual([
      { key: 'langfuse.trace.tags', value: { arrayValue: { values: [{ stringValue: 'openai' }] } } },
    ])
    expect(spans[1].attributes[1]).toEqual({ key: 'n', value: { intValue: '3' } })
  })
})

describe('settings pane prefs', () => {
  test('a store from an older version reads back whole', () => {
    expect(readPrefs(undefined)).toEqual(DEFAULT_PREFS)
    expect(readPrefs({ llm: false, first: 'nope', llmDelayMs: 7, models: { openai: 'gpt-5-nano', bogus: 'x' } })).toEqual({
      ...DEFAULT_PREFS,
      llm: false,
      models: { openai: 'gpt-5-nano' },
    })
  })
  test('the pane picks of first route and model beat the .env ones', () => {
    const env = { OPENROUTER_API_KEY: 'r', OPENAI_API_KEY: 'o', B3_GRAMMAR_PROVIDER: 'openrouter' }
    const hops = chain(env, { ...DEFAULT_PREFS, first: 'openai', models: { openai: 'gpt-5-nano' } })
    expect(hops.map((h) => h.route)).toEqual(['openai', 'openrouter', 'claude'])
    expect(hops[0]?.model).toBe('gpt-5-nano')
    expect(chain(env, { ...DEFAULT_PREFS, llm: false })).toEqual([])
  })
  test('cycle wraps and restarts on an unknown value', () => {
    expect(cycle([1, 2, 3], 3)).toBe(1)
    expect(cycle(['a', 'b'], 'z')).toBe('a')
  })
})

describe('folders per OS', () => {
  test('Linux and macOS: XDG first, then ~/.config and ~/.cache', () => {
    expect(dirsFor({ HOME: '/Users/b' })).toEqual({
      config: '/Users/b/.config/bgh',
      cache: '/Users/b/.cache/bgh',
      sep: '/',
    })
    expect(dirsFor({ HOME: '/home/b', XDG_CONFIG_HOME: '/x' }).config).toBe('/x/bgh')
  })
  test('Windows: APPDATA and LOCALAPPDATA', () => {
    const d = dirsFor({ USERPROFILE: 'C:\\Users\\b', APPDATA: 'C:\\Users\\b\\AppData\\Roaming', LOCALAPPDATA: 'C:\\L' })
    expect(d).toEqual({
      config: 'C:\\Users\\b\\AppData\\Roaming\\bgh',
      cache: 'C:\\L\\bgh',
      sep: '\\',
    })
  })
})

describe('keys template', () => {
  test('missing, empty or comment-only files get it; a file with a value keeps its own', () => {
    expect(needsTemplate(undefined)).toBe(true)
    expect(needsTemplate('')).toBe(true)
    expect(needsTemplate('# only a note\n\n')).toBe(true)
    expect(needsTemplate('OPENAI_API_KEY=x\n')).toBe(false)
  })
  test('the template itself parses to blanks, so it adds no route', () => {
    expect(chain(parseDotenv(ENV_TEMPLATE)).map((h) => h.route)).toEqual(['claude'])
    expect(needsTemplate(ENV_TEMPLATE)).toBe(false)
  })
})

describe('setup guide', () => {
  test('the install command fits the machine', () => {
    const arch = platformOf('Linux\n', 'x86_64', 'NAME="CachyOS"\nID=cachyos\n', false)
    expect(harperInstall(arch)).toBe('sudo pacman -S harper')
    expect(harperInstall(platformOf('Darwin', 'arm64', undefined, false))).toBe('brew install harper')
    const vps = platformOf('Linux', 'aarch64', 'ID=ubuntu\n', false)
    expect(harperInstall(vps)).toContain('harper-cli-aarch64-unknown-linux-gnu.tar.gz')
    expect(platformOf(undefined, undefined, undefined, true).os).toBe('windows')
    expect(harperInstall(platformOf(undefined, undefined, undefined, true))).toContain('windows-msvc.zip')
  })
  test('keybindings: which of the two chords are bound', () => {
    const kb = '{"bindings":[{"context":"Global","bindings":{"alt+a":"app:cycleDiffBase"}}]}'
    expect(boundActions(kb, ['app:cycleDiffBase', 'app:toggleDiffNoiseFilter'])).toEqual(['app:cycleDiffBase'])
    expect(boundActions(undefined, ['x'])).toEqual([])
  })
  test('last trace line', () => {
    const at = new Date(2026, 10, 13, 14, 2).getTime()
    expect(traceLine(undefined, at)).toContain('none sent yet')
    expect(traceLine({ at, ok: true, detail: 'ok' }, at + 10_000)).toBe('ok 14:02 (just now)')
    expect(traceLine({ at, ok: false, detail: 'HTTP 401' }, at + 5 * 60_000)).toBe('HTTP 401 14:02 (5 min ago)')
  })
})

describe('setup guide for every OS, and config mistakes', () => {
  test('the guide lists macOS and both Linux ways, this machine marked', () => {
    const all = harperInstallAll(platformOf('Linux', 'x86_64', 'ID=cachyos', false))
    expect(all.map((o) => o.label)).toEqual(['macOS', 'Arch Linux', 'other Linux'])
    expect(all.filter((o) => o.here).map((o) => o.label)).toEqual(['Arch Linux'])
    expect(harperInstallAll(platformOf('Darwin', 'arm64', undefined, false)).find((o) => o.here)?.cmd).toBe('brew install harper')
    expect(harperInstallAll(platformOf('Linux', 'aarch64', 'ID=ubuntu', false)).find((o) => o.here)?.cmd).toContain('aarch64')
  })
  test('a value left behind a # is reported, a set one is not', () => {
    const text = 'LANGFUSE_PUBLIC_KEY=pk\n#LANGFUSE_BASE_URL=https://jp.cloud.langfuse.com\n#B3_GRAMMAR_MODEL=\n'
    expect(commentedOnly(text, ['LANGFUSE_BASE_URL', 'LANGFUSE_PUBLIC_KEY', 'B3_GRAMMAR_MODEL'])).toEqual(['LANGFUSE_BASE_URL'])
    expect(commentedOnly(ENV_TEMPLATE, ['LANGFUSE_BASE_URL', 'OPENAI_API_KEY'])).toEqual([])
  })
  test('a 401 names the URL in use, not a guess', () => {
    expect(langfuse401('https://cloud.langfuse.com')).toContain("don't belong to https://cloud.langfuse.com")
    expect(langfuse401('https://cloud.langfuse.com')).toContain('jp.cloud.langfuse.com')
  })
})

describe('model lists', () => {
  const openrouter = JSON.stringify({
    data: [
      { id: 'qwen/qwen3-235b-a22b-2507', created: 100, pricing: { prompt: '0.0000001', completion: '0.0000004' } },
      { id: 'qwen/qwen3-next-80b-a3b', created: 200, pricing: { prompt: '0.0000001', completion: '0.0000003' } },
      { id: 'qwen/qwen3-coder-next', created: 300, pricing: { prompt: '0.00000005', completion: '0.0000001' } },
      { id: 'qwen/qwen3-max', created: 250, pricing: { prompt: '0.000001', completion: '0.000004' } },
      { id: 'qwen/qwen3-next-80b-a3b:free', created: 260, pricing: { prompt: '0', completion: '0' } },
      { id: 'openai/gpt-5-mini', created: 90 },
      { nope: true },
    ],
  })
  test('parses ids, dates and prices, and skips junk', () => {
    const list = parseModelList(openrouter)!
    expect(list.map((m) => m.id)).toContain('openai/gpt-5-mini')
    expect(list).toHaveLength(6)
    expect(list[0]!.price).toBeCloseTo(0.0000005)
    expect(parseModelList('<html>')).toBeUndefined()
    expect(parseModelList('{"data":[]}')).toBeUndefined()
  })
  test('a listed model stays; a dropped one gives way to the first listed pick', () => {
    const list = parseModelList(openrouter)
    expect(liveModel('openrouter', 'qwen/qwen3-235b-a22b-2507', list)).toEqual({ model: 'qwen/qwen3-235b-a22b-2507', gone: false })
    expect(liveModel('openrouter', 'mistral/old-one', list)).toEqual({ model: 'qwen/qwen3-235b-a22b-2507', gone: true })
    expect(liveModel('openrouter', 'mistral/old-one', undefined)).toEqual({ model: 'mistral/old-one', gone: false })
    expect(liveModel('openai', 'gpt-5-mini', [{ id: 'gpt-9' }])).toEqual({ model: 'gpt-5-mini', gone: true })
  })
  test('a newer sibling is the same family and kind, no dearer, never a :variant', () => {
    const list = parseModelList(openrouter)
    expect(newerSibling('qwen/qwen3-235b-a22b-2507', list)).toBe('qwen/qwen3-next-80b-a3b')
    expect(newerSibling('openai/gpt-5-mini', list)).toBeUndefined()
    expect(newerSibling('qwen/qwen3-next-80b-a3b', list)).toBeUndefined()
  })
})

describe('tally', () => {
  test('counts per model and prints busiest first', () => {
    let t = readTally({ 'claude haiku': { yes: 1, no: 1 }, junk: 3 })
    expect(Object.keys(t)).toEqual(['claude haiku'])
    t = addTally(t, 'openrouter qwen3-235b-a22b-2507', true)
    t = addTally(t, 'openrouter qwen3-235b-a22b-2507', true)
    t = addTally(t, 'openrouter qwen3-235b-a22b-2507', false)
    expect(tallyLine(t)).toBe('qwen3-235b-a22b-2507 67% (3) · haiku 50% (2)')
    expect(tallyLine({})).toBe('nothing yet')
  })
})

describe('setup key k', () => {
  const wants = [
    { action: 'app:cycleDiffBase', keys: ['alt+a', 'ctrl+x a'] },
    { action: 'app:toggleDiffNoiseFilter', keys: ['alt+i', 'ctrl+x i'] },
  ]
  const globalOf = (text: string | undefined) => JSON.parse(text!).bindings.find((b: { context: string }) => b.context === 'Global').bindings

  test('Linux and Windows: alt+a and alt+i in the Global block, the rest kept', () => {
    const kb = JSON.stringify({ bindings: [{ context: 'Global', bindings: { 'ctrl+t': 'app:toggleTodos' } }, { context: 'Chat', bindings: {} }] })
    const r = addChords(kb, wants, false)
    expect(r.status).toBe('set')
    expect(globalOf(r.text)).toEqual({ 'ctrl+t': 'app:toggleTodos', 'alt+a': 'app:cycleDiffBase', 'alt+i': 'app:toggleDiffNoiseFilter' })
    expect(addChords(r.text, wants, false)).toEqual({ status: 'ok', note: 'keys bound already' })
  })
  test('a chord another action holds stays with it; the next one is taken', () => {
    const kb = JSON.stringify({ bindings: [{ context: 'Chat', bindings: { 'alt+i': 'chat:stash' } }] })
    const r = addChords(kb, wants, false)
    expect(r.status).toBe('set')
    expect(globalOf(r.text)).toEqual({ 'alt+a': 'app:cycleDiffBase', 'ctrl+x i': 'app:toggleDiffNoiseFilter' })
    expect(r.note).toContain('skipped alt+i runs chat:stash')
  })
  test('macOS: the alt chord and a ctrl+x one beside it, terminal settings untouched', () => {
    const r = addChords(undefined, wants, true)
    expect(globalOf(r.text)).toEqual({
      'alt+a': 'app:cycleDiffBase',
      'ctrl+x a': 'app:cycleDiffBase',
      'alt+i': 'app:toggleDiffNoiseFilter',
      'ctrl+x i': 'app:toggleDiffNoiseFilter',
    })
    // alt+a alone, as bound by hand, still needs the ctrl+x one on a Mac but not elsewhere.
    const handMade = JSON.stringify({ bindings: [{ context: 'Global', bindings: { 'alt+a': 'app:cycleDiffBase', 'alt+i': 'app:toggleDiffNoiseFilter' } }] })
    expect(addChords(handMade, wants, false).status).toBe('ok')
    expect(globalOf(addChords(handMade, wants, true).text)['ctrl+x a']).toBe('app:cycleDiffBase')
  })
  test('nothing free means a hand is needed; broken files are left alone', () => {
    const kb = JSON.stringify({ bindings: [{ context: 'Global', bindings: { 'alt+i': 'chat:stash', 'ctrl+x i': 'chat:undo' } }] })
    const r = addChords(kb, wants, false)
    expect(r.status).toBe('manual')
    expect(r.note).toContain('no free key left for app:toggleDiffNoiseFilter')
    expect(addChords('{ not json', wants, false).status).toBe('manual')
    expect(addChords('{"bindings":{}}', wants, false).status).toBe('manual')
  })
  test('labels name every key bound to an action', () => {
    const kb = JSON.stringify({ bindings: [{ context: 'Global', bindings: { 'alt+a': 'app:cycleDiffBase', 'ctrl+x a': 'app:cycleDiffBase' } }] })
    expect(chordLabel(keysFor(kb, 'app:cycleDiffBase'), 'alt+a', 'linux')).toBe('alt + a / ctrl + x a')
    expect(chordLabel(keysFor(kb, 'app:cycleDiffBase'), 'alt+a', 'darwin')).toBe('Option + a / ctrl + x a')
    expect(chordLabel(keysFor(undefined, 'app:toggleDiffNoiseFilter'), 'alt+i', 'darwin')).toBe('Option + i')
    expect(keyName('meta+shift+p', 'linux')).toBe('alt + shift + p')
  })
  test('report lines line up', () => {
    expect(keyLines([{ name: 'apply', status: 'set', note: 'a' }, { name: 'keybindings', status: 'manual', note: 'b' }])).toEqual(['+ apply        a', '! keybindings  b'])
  })
})
