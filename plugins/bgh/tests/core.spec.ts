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
  dirsFor,
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
