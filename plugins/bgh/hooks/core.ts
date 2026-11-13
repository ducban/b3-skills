// Pure logic of bgh (B3 Grammar Helper): nothing here touches the engine, so `bun test` covers it.

export type Env = Record<string, string | undefined>

// One fix the box shows: replace [start, end) of the draft with `to`. Offsets are UTF-16 code
// units, the unit PromptBox `cursor` and PromptDecoration use.
export type Issue = {
  start: number
  end: number
  to: string
  source: 'harper' | 'llm'
  message: string
  // Who said so, for the band: 'harper', 'openrouter qwen3-235b', 'cache'.
  by?: string
}

export type Range = { start: number; end: number }
export type Sentence = Range & { text: string }

// ---------------------------------------------------------------------------
// What gets checked

const MIN_WORDS = 4

// Letters Vietnamese uses and English never does. A few of them in a draft mean it isn't English.
const VIETNAMESE =
  /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹĂÂĐÊÔƠƯ]/g

export function shouldCheck(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  // Slash commands, shell escapes and memory notes aren't prose.
  if (/^[/!#]/.test(trimmed)) return false
  if (wordCount(trimmed) < MIN_WORDS) return false
  const letters = trimmed.match(/\p{L}/gu)?.length ?? 0
  const viet = trimmed.match(VIETNAMESE)?.length ?? 0
  return letters > 0 && viet / letters < 0.02
}

export const wordCount = (text: string): number => text.match(/[\p{L}']+/gu)?.length ?? 0

// Spans no fix may touch: code, URLs, paths, flags, @mentions, {placeholders}.
const PROTECTED: RegExp[] = [
  /```[\s\S]*?(```|$)/g,
  /`[^`\n]*`/g,
  /\bhttps?:\/\/\S+/g,
  /[\w.~-]*\/[\w.\-/~]+/g, // paths, relative or not (also eats "and/or", which is fine)
  /\b[\w.-]+\.(?:ts|tsx|js|json|md|py|go|rs|sh|toml|ya?ml|css|html)\b/g,
  /(?:^|\s)--?[a-zA-Z][\w-]*/g,
  /@[\w./-]+/g,
  /\{\{?[^}\n]*\}?\}/g,
  /\b[a-z]+[A-Z]\w*\b/g, // camelCase identifiers
  /\b\w+_\w+\b/g, // snake_case identifiers
]

export function protectedRanges(text: string): Range[] {
  const out: Range[] = []
  for (const re of PROTECTED) {
    for (const m of text.matchAll(re)) out.push({ start: m.index, end: m.index + m[0].length })
  }
  return out
}

export const overlaps = (a: Range, b: Range): boolean =>
  a.start < b.end && b.start < a.end ||
  // An insertion point inside a protected span counts too.
  (a.start === a.end && a.start > b.start && a.start < b.end)

export function sentences(text: string): Sentence[] {
  const out: Sentence[] = []
  for (const m of text.matchAll(/[^.!?\n]+(?:[.!?]+|$)/gm)) {
    const raw = m[0]
    const lead = raw.length - raw.trimStart().length
    const body = raw.trim()
    if (!body) continue
    const start = m.index + lead
    out.push({ start, end: start + body.length, text: body })
  }
  return out
}

// ---------------------------------------------------------------------------
// Harper

type HarperLint = {
  rule: string
  kind: string
  span: { char_start: number; char_end: number }
  message: string
  suggestions: string[]
  matched_text: string
}

// Harper counts characters (code points); the box counts UTF-16 units.
export function codePointToUtf16(text: string, cp: number): number {
  let units = 0
  let seen = 0
  for (const ch of text) {
    if (seen === cp) return units
    units += ch.length
    seen += 1
  }
  return units
}

// What one Harper suggestion string asks for, as the text that goes over the matched span.
// Shapes seen in harper-cli JSON: `Replace with: “x”`, `Insert “x”`, `Remove error`.
export function harperReplacement(suggestion: string, matched: string): string | undefined {
  const quoted = suggestion.match(/[“"](.*)[”"]\s*$/s)?.[1]
  if (/^replace with/i.test(suggestion) && quoted !== undefined) return quoted
  if (/^insert/i.test(suggestion) && quoted !== undefined) return matched + quoted
  if (/^remove/i.test(suggestion)) return ''
  return undefined
}

// harper-cli prints one JSON array of file results, or one file result; accept either.
export function parseHarper(stdout: string, text: string): Issue[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout)
  } catch {
    return []
  }
  const files = (Array.isArray(parsed) ? parsed : [parsed]) as { lints?: HarperLint[] }[]
  const issues: Issue[] = []
  for (const file of files) {
    for (const lint of file.lints ?? []) {
      const first = lint.suggestions?.[0]
      if (first === undefined) continue
      const to = harperReplacement(first, lint.matched_text)
      if (to === undefined) continue
      const start = codePointToUtf16(text, lint.span.char_start)
      const end = codePointToUtf16(text, lint.span.char_end)
      if (text.slice(start, end) === to) continue
      issues.push({ start, end, to, source: 'harper', message: lint.message })
    }
  }
  return issues
}

// ---------------------------------------------------------------------------
// LLM routes, the way b3-dict picks them

export const ROUTES = ['openrouter', 'openai', 'fireworks'] as const
export type ApiRoute = (typeof ROUTES)[number]
export type Route = ApiRoute | 'claude'

export const DEFAULT_MODEL: Record<Route, string> = {
  openrouter: 'qwen/qwen3-235b-a22b-2507',
  openai: 'gpt-5-mini',
  fireworks: 'accounts/fireworks/models/minimax-m3',
  claude: 'haiku',
}

export const KEY_NAME: Record<ApiRoute, string> = {
  openrouter: 'OPENROUTER_API_KEY',
  openai: 'OPENAI_API_KEY',
  fireworks: 'FIREWORKS_API_KEY',
}

export type Hop = { route: Route; model: string; apiKey?: string }

const read = (env: Env, name: string): string | undefined => env[name]?.trim() || undefined

// What the settings pane keeps in `$.store`. Keys stay in the .env file, never here.
export type Prefs = {
  enabled: boolean
  llm: boolean
  langfuse: boolean
  // The route tried first; 'auto' keeps the .env order (B3_GRAMMAR_PROVIDER, then key order).
  first: Route | 'auto'
  // A model per route the person picked; a route left out runs its default.
  models: Partial<Record<Route, string>>
  llmDelayMs: number
}

export const DEFAULT_PREFS: Prefs = {
  enabled: true,
  llm: true,
  langfuse: true,
  first: 'auto',
  models: {},
  llmDelayMs: 1500,
}

// Whatever an older or hand-edited store holds, read back as a whole Prefs.
export function readPrefs(saved: unknown): Prefs {
  const o = (saved && typeof saved === 'object' ? saved : {}) as Partial<Prefs>
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
  const routes: (Route | 'auto')[] = ['auto', ...ROUTES, 'claude']
  const models: Partial<Record<Route, string>> = {}
  if (o.models && typeof o.models === 'object') {
    for (const [k, v] of Object.entries(o.models)) {
      if ((routes as string[]).includes(k) && typeof v === 'string' && v.trim()) models[k as Route] = v.trim()
    }
  }
  return {
    enabled: bool(o.enabled, DEFAULT_PREFS.enabled),
    llm: bool(o.llm, DEFAULT_PREFS.llm),
    langfuse: bool(o.langfuse, DEFAULT_PREFS.langfuse),
    first: routes.includes(o.first as Route) ? (o.first as Route | 'auto') : 'auto',
    models,
    llmDelayMs: LLM_DELAYS.includes(o.llmDelayMs as number) ? (o.llmDelayMs as number) : DEFAULT_PREFS.llmDelayMs,
  }
}

// The pane's pick lists. The first entry of each is the default.
export const MODEL_CHOICES: Record<Route, string[]> = {
  openrouter: ['qwen/qwen3-235b-a22b-2507', 'openai/gpt-5-mini', 'google/gemini-2.5-flash-lite'],
  openai: ['gpt-5-mini', 'gpt-5-nano'],
  fireworks: ['accounts/fireworks/models/minimax-m3'],
  claude: ['haiku', 'sonnet'],
}
export const LLM_DELAYS = [800, 1500, 3000]

// The next entry after `current`, wrapping; an unknown current starts the list over.
export function cycle<T>(list: readonly T[], current: T): T {
  const i = list.indexOf(current)
  return list[(i + 1) % list.length] as T
}

// The chain the LLM stage walks: the first route (the pane's pick, else B3_GRAMMAR_PROVIDER), then
// every route with a key (OpenRouter, OpenAI, Fireworks), then Haiku through the session. Each hop
// runs the pane's model for its route, else B3_GRAMMAR_MODEL on the first hop, else the default.
export function chain(env: Env, prefs: Prefs = DEFAULT_PREFS): Hop[] {
  if (read(env, 'B3_GRAMMAR_LLM') === 'off' || !prefs.llm) return []
  const forced = prefs.first !== 'auto' ? prefs.first : (read(env, 'B3_GRAMMAR_PROVIDER') as Route | undefined)
  const order: Route[] = [...ROUTES, 'claude']
  const routes = forced && order.includes(forced) ? [forced, ...order.filter((r) => r !== forced)] : order
  const hops: Hop[] = []
  for (const route of routes) {
    if (route === 'claude') {
      hops.push({ route, model: DEFAULT_MODEL.claude })
      continue
    }
    const apiKey = read(env, KEY_NAME[route])
    if (apiKey) hops.push({ route, model: DEFAULT_MODEL[route], apiKey })
  }
  const model = read(env, 'B3_GRAMMAR_MODEL')
  if (model && hops[0]) hops[0] = { ...hops[0], model }
  return hops.map((h) => (prefs.models[h.route] ? { ...h, model: prefs.models[h.route]! } : h))
}

// Routes that can run here: each with a key, and the session's own model.
export const availableRoutes = (env: Env): Route[] => [
  ...ROUTES.filter((r) => read(env, KEY_NAME[r])),
  'claude',
]

// ---------------------------------------------------------------------------
// Where files go, on Linux, macOS and Windows

// Windows has no HOME (USERPROFILE instead) and keeps settings under APPDATA, caches under
// LOCALAPPDATA. Elsewhere the XDG names win, then ~/.config and ~/.cache, macOS included.
export function dirsFor(env: Env): { config: string; cache: string; sep: string } {
  const windows = !read(env, 'HOME') && !!(read(env, 'APPDATA') || read(env, 'USERPROFILE'))
  if (windows) {
    const home = read(env, 'USERPROFILE') ?? 'C:\\'
    const config = read(env, 'APPDATA') ?? `${home}\\AppData\\Roaming`
    const cache = read(env, 'LOCALAPPDATA') ?? `${home}\\AppData\\Local`
    return { config: `${config}\\bgh`, cache: `${cache}\\bgh`, sep: '\\' }
  }
  const home = read(env, 'HOME') ?? '.'
  const config = read(env, 'XDG_CONFIG_HOME') ?? `${home}/.config`
  const cache = read(env, 'XDG_CACHE_HOME') ?? `${home}/.cache`
  return { config: `${config}/bgh`, cache: `${cache}/bgh`, sep: '/' }
}

export const SYSTEM_PROMPT = [
  'You are a copy editor for English prompts a developer types to an AI coding assistant.',
  'For each numbered sentence, propose the smallest edits that fix grammar, spelling, word choice,',
  'or clearly awkward phrasing so it reads as natural English.',
  'Never change meaning, tone, technical terms, code, file paths, commands, names, or placeholders.',
  'Do not add politeness or filler. If a sentence is fine, propose nothing for it.',
  'Reply with JSON only, no prose:',
  '{"edits":[{"i":<sentence number>,"from":"<exact substring of that sentence>","to":"<replacement>"}]}',
].join(' ')

export const userPrompt = (batch: string[]): string => batch.map((s, i) => `${i}: ${s}`).join('\n')

export type HttpRequest = { url: string; headers: Record<string, string>; body: string }

const ENDPOINT: Record<ApiRoute, string> = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  fireworks: 'https://api.fireworks.ai/inference/v1/chat/completions',
}

export function chatRequest(hop: Hop & { route: ApiRoute }, user: string): HttpRequest {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ]
  let body: Record<string, unknown>
  if (hop.route === 'openai') {
    // gpt-5 models reason by default and count it against the cap; keep it minimal.
    body = { model: hop.model, messages, max_completion_tokens: 800 }
    if (hop.model.startsWith('gpt-5')) body.reasoning_effort = 'minimal'
  } else if (hop.route === 'openrouter') {
    body = { model: hop.model, messages, max_tokens: 400, temperature: 0, usage: { include: true } }
    // OpenAI's endpoints on OpenRouter refuse reasoning off (b3-dict found this out).
    if (!hop.model.startsWith('openai/')) body.reasoning = { enabled: false }
  } else {
    body = { model: hop.model, messages, max_tokens: 400, temperature: 0 }
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${hop.apiKey}`,
  }
  if (hop.route === 'openrouter') headers['X-Title'] = 'B3 Grammar Helper'
  return { url: ENDPOINT[hop.route], headers, body: JSON.stringify(body) }
}

export type Usage = { input: number; output: number; cost?: number }

export function parseChat(text: string): { content: string; usage: Usage } | { error: string } {
  try {
    const json = JSON.parse(text) as {
      choices?: { message?: { content?: string } }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number }
      error?: { message?: string }
    }
    if (json.error) return { error: json.error.message ?? 'provider error' }
    const content = json.choices?.[0]?.message?.content
    if (typeof content !== 'string') return { error: 'no content' }
    const usage: Usage = { input: json.usage?.prompt_tokens ?? 0, output: json.usage?.completion_tokens ?? 0 }
    if (typeof json.usage?.cost === 'number') usage.cost = json.usage.cost
    return { content, usage }
  } catch {
    return { error: 'response was not JSON' }
  }
}

export type Edit = { i: number; from: string; to: string }

// The model's reply as edits. Reasoning blocks and code fences around the JSON are dropped.
export function parseEdits(content: string): Edit[] | undefined {
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '')
  const json = cleaned.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return undefined
  try {
    const parsed = JSON.parse(json) as { edits?: unknown }
    if (!Array.isArray(parsed.edits)) return undefined
    return parsed.edits.filter(
      (e): e is Edit =>
        typeof e === 'object' && e !== null &&
        typeof (e as Edit).i === 'number' && typeof (e as Edit).from === 'string' &&
        typeof (e as Edit).to === 'string' && (e as Edit).from !== (e as Edit).to && (e as Edit).from !== '',
    )
  } catch {
    return undefined
  }
}

// Edits of one sentence, placed in the draft.
export function placeEdits(sentence: Sentence, edits: Omit<Edit, 'i'>[]): Issue[] {
  const issues: Issue[] = []
  for (const edit of edits) {
    const at = sentence.text.indexOf(edit.from)
    if (at < 0) continue
    const start = sentence.start + at
    issues.push({ start, end: start + edit.from.length, to: edit.to, source: 'llm', message: 'style' })
  }
  return issues
}

// ---------------------------------------------------------------------------
// Merging, painting, applying

// The LLM wins a clash (Harper is the instant preview it refines); nothing lands on a protected
// span; no two issues overlap.
export function merge(harper: Issue[], llm: Issue[], guard: Range[]): Issue[] {
  const out: Issue[] = []
  for (const issue of [...llm, ...harper]) {
    if (guard.some((g) => overlaps(issue, g))) continue
    if (out.some((o) => overlaps(issue, o) || overlaps(o, issue) || (o.start === issue.start && o.end === issue.end))) continue
    out.push(issue)
  }
  return out.sort((a, b) => a.start - b.start)
}

// The person's "leave this word alone" list, matched case-insensitively on the flagged text.
export const normalizeWord = (word: string): string => word.trim().toLowerCase()

export function dropIgnored(text: string, issues: Issue[], ignore: ReadonlySet<string>): Issue[] {
  return issues.filter((i) => i.end === i.start || !ignore.has(normalizeWord(text.slice(i.start, i.end))))
}

export const fixesOf = (text: string, issues: Issue[]): { from: string; to: string; by: string }[] =>
  issues.map((i) => ({ from: text.slice(i.start, i.end), to: i.to, by: i.by ?? i.source }))

// The band's header: every source that has a fix showing, in order of first appearance.
export const sourcesOf = (fixes: { by: string }[]): string => [...new Set(fixes.map((f) => f.by))].join(' + ')

// A model id short enough for one line: 'accounts/fireworks/models/minimax-m3' → 'minimax-m3'.
export const shortModel = (model: string): string => model.split('/').pop() ?? model

export type Decoration = {
  start: number
  end: number
  virtualText?: string
  color?: string
  dimColor?: boolean
  underline?: boolean
  strikethrough?: boolean
}

export function decorations(issues: Issue[]): Decoration[] {
  const out: Decoration[] = []
  for (const issue of issues) {
    if (issue.end > issue.start) {
      out.push({ start: issue.start, end: issue.end, color: 'warning', underline: true, strikethrough: issue.to === '' })
    }
    if (issue.to !== '') {
      out.push({ start: issue.end, end: issue.end, virtualText: ` →${issue.to}`, dimColor: true })
    }
  }
  return out
}

export function applyIssues(text: string, cursor: number, issues: Issue[]): { text: string; cursor: number } {
  let out = text
  let caret = cursor
  for (const issue of [...issues].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, issue.start) + issue.to + out.slice(issue.end)
    const delta = issue.to.length - (issue.end - issue.start)
    if (caret >= issue.end) caret += delta
    else if (caret > issue.start) caret = issue.start + issue.to.length
  }
  return { text: out, cursor: caret }
}

// ---------------------------------------------------------------------------
// Settings file and Langfuse

export function parseDotenv(text: string): Env {
  const env: Env = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    const name = m?.[1]
    if (!m || !name) continue
    let value = m[2] ?? ''
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1)
    else value = value.replace(/\s+#.*$/, '')
    env[name] = value
  }
  return env
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function base64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += B64.charAt((n >> 18) & 63) + B64.charAt((n >> 12) & 63)
    out += i + 1 < bytes.length ? B64.charAt((n >> 6) & 63) : '='
    out += i + 2 < bytes.length ? B64.charAt(n & 63) : '='
  }
  return out
}

export function hexId(bytes: number): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export type LangfuseKeys = { publicKey: string; secretKey: string; baseUrl: string }

export function langfuseKeys(env: Env): LangfuseKeys | undefined {
  const publicKey = read(env, 'LANGFUSE_PUBLIC_KEY')
  const secretKey = read(env, 'LANGFUSE_SECRET_KEY')
  if (!publicKey || !secretKey) return undefined
  const baseUrl = (read(env, 'LANGFUSE_BASE_URL') ?? 'https://cloud.langfuse.com').replace(/\/+$/, '')
  return { publicKey, secretKey, baseUrl }
}

export type SpanRecord = {
  name: string
  startMs: number
  endMs: number
  attrs: Record<string, string | number | boolean | string[] | undefined>
}

type OtlpValue =
  | { stringValue: string }
  | { intValue: string }
  | { doubleValue: number }
  | { boolValue: boolean }
  | { arrayValue: { values: { stringValue: string }[] } }

function otlpValue(v: string | number | boolean | string[]): OtlpValue {
  if (Array.isArray(v)) return { arrayValue: { values: v.map((s) => ({ stringValue: s })) } }
  if (typeof v === 'boolean') return { boolValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { intValue: String(v) } : { doubleValue: v }
  return { stringValue: v }
}

const ns = (ms: number): string => `${Math.round(ms)}000000`

// One OTLP/HTTP JSON body: a root span carrying the trace attributes and its children.
export function otlpTrace(traceId: string, root: SpanRecord, children: SpanRecord[], release: string): string {
  const rootId = hexId(8)
  const span = (s: SpanRecord, spanId: string, parentSpanId?: string) => ({
    traceId,
    spanId,
    ...(parentSpanId ? { parentSpanId } : {}),
    name: s.name,
    kind: 1,
    startTimeUnixNano: ns(s.startMs),
    endTimeUnixNano: ns(s.endMs),
    attributes: Object.entries(s.attrs)
      .filter((kv): kv is [string, string | number | boolean | string[]] => kv[1] !== undefined)
      .map(([key, value]) => ({ key, value: otlpValue(value) })),
  })
  return JSON.stringify({
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'bgh' } },
            { key: 'service.version', value: { stringValue: release } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: 'bgh', version: release },
            spans: [span(root, rootId), ...children.map((c) => span(c, hexId(8), rootId))],
          },
        ],
      },
    ],
  })
}

// ---------------------------------------------------------------------------
// The keys file a new machine starts with: every name, every value blank.

export const ENV_TEMPLATE = `# B3 Grammar Helper (bgh) keys. Fill in what you have, then run: /bgh reload
# Variables already in the environment win over this file. Leave a line blank to skip it.

# LLM routes, tried in this order when set. With none, Haiku runs through your Claude login.
OPENROUTER_API_KEY=
OPENAI_API_KEY=
FIREWORKS_API_KEY=

# Optional: put one route first (openrouter | openai | fireworks | claude) and pick its model.
# The settings pane (/bgh, keys f and m) does the same and wins over these.
#B3_GRAMMAR_PROVIDER=
#B3_GRAMMAR_MODEL=
# Harper only, no LLM:
#B3_GRAMMAR_LLM=off

# Langfuse tracing, on only when both keys are set. The draft text is sent.
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
#LANGFUSE_BASE_URL=https://cloud.langfuse.com
`

// A file that holds nothing but blanks and comments needs the template; one with a value doesn't.
export const needsTemplate = (text: string | undefined): boolean =>
  text === undefined || !text.split(/\r?\n/).some((l) => l.trim() && !l.trim().startsWith('#'))

// Where harper-cli comes from, per machine. Release builds need no Rust.
export const HARPER_RELEASES = 'https://github.com/Automattic/harper/releases/latest'
