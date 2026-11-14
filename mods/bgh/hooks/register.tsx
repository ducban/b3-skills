import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Fix } from '../types'
import {
  applyIssues,
  availableRoutes,
  cycle,
  dirsFor,
  harperInstallAll,
  commentedOnly,
  langfuse401,
  platformOf,
  traceLine,
  type Platform,
  type TraceResult,
  ENV_TEMPLATE,
  HARPER_RELEASES,
  needsTemplate,
  addKeys,
  keyLabel,
  keyName,
  keyLines,
  keysFor,
  type KeyWant,
  type KeyLine,
  LLM_DELAYS,
  MODEL_CHOICES,
  KEY_NAME,
  ROUTES,
  MODELS_TTL_MS,
  MODELS_URL,
  addTally,
  creditOf,
  mergeCache,
  mergeTally,
  mergeWords,
  liveModel,
  newerSibling,
  parseModelList,
  readTally,
  tallyLine,
  type ListedModel,
  type Tally,
  readPrefs,
  base64,
  chain,
  chatRequest,
  decorations,
  dropIgnored,
  fixesOf,
  hexId,
  langfuseKeys,
  merge,
  normalizeWord,
  otlpTrace,
  parseChat,
  parseDotenv,
  parseEdits,
  parseHarper,
  placeEdits,
  protectedRanges,
  sentences,
  shortModel,
  shouldCheck,
  sourcesOf,
  SYSTEM_PROMPT,
  userPrompt,
  wordCount,
  type ApiRoute,
  type Edit,
  type Env,
  type Hop,
  type Issue,
  type LangfuseKeys,
  type Prefs,
  type Route,
  type SpanRecord,
  type Usage,
} from './core'

const RELEASE = '0.10.3'
const HARPER_DELAY_MS = 300
const HOP_TIMEOUT_MS = 6000
// Model lists, Langfuse scores and traces: none should hold a command or a tab open for long.
const HTTP_TIMEOUT_MS = 8000
const CACHE_KEY = 'llm-cache-v1'
const IGNORE_KEY = 'ignore-v1'
const PREFS_KEY = 'prefs-v1'
const MODELS_KEY = 'models-v1'
const TALLY_KEY = 'tally-v1'
const SETUP_PANE = 'bgh-setup'
const SETTINGS_PANE = 'bgh-settings'
const DEBUG_PANE = 'bgh-debug'
const HELP_PANE = 'bgh-help'
const PANES = [
  { id: SETUP_PANE, title: 'bgh setup' },
  { id: SETTINGS_PANE, title: 'bgh settings' },
  { id: DEBUG_PANE, title: 'bgh debug' },
  { id: HELP_PANE, title: 'bgh help' },
]

// Key names follow the OS: alt + a on Linux and Windows, Option + a on a Mac.
const helpText = (os: string): string => [
  'B3 Grammar Helper (bgh)',
  '  /bgh                 setup guide while something is missing, else settings',
  '  /bgh setup-guide     what this machine still needs (macOS and Linux)',
  '  /bgh settings        grammar, LLM route and model, delay, Langfuse, cache, ignored words',
  '  /bgh debug           versions, keys set, routes, models, accepted %, last trace, last check',
  '  /bgh test            run every route and Langfuse on a sample sentence; refetch model lists',
  '  /bgh status          opens bgh debug; a text summary where no tab fits',
  '  /bgh on | off        switch checking on or off',
  '  /bgh reload          read the keys file again',
  `  /bgh keys            bind apply and ignore: ${keyName('alt+a', os)} and ${keyName('alt+i', os)}, else ${keyName('alt+shift+a', os)} and ${keyName('alt+shift+i', os)} (setup key k)`,
  '  /bgh ignore <word>   never flag this word; unignore <word> undoes it; ignored lists them',
  '  /bgh clear-cache     forget the remembered LLM answers',
  '  /bgh help            this list',
].join('\n')

// The variables the mod reads, for the debug view: names only, never values.
const KNOWN_ENV = [
  'OPENROUTER_API_KEY',
  'OPENAI_API_KEY',
  'FIREWORKS_API_KEY',
  'LANGFUSE_PUBLIC_KEY',
  'LANGFUSE_SECRET_KEY',
  'LANGFUSE_BASE_URL',
  'B3_GRAMMAR_PROVIDER',
  'B3_GRAMMAR_MODEL',
  'B3_GRAMMAR_LLM',
  'B3_GRAMMAR_ENV_FILE',
]

// Keys a # in front of is surely a slip; the B3_GRAMMAR_* switches are commented on purpose.
const MUST_BE_LIVE = KNOWN_ENV.filter((n) => !n.startsWith('B3_GRAMMAR_'))

type ProbeResult = { name: string; ok: boolean; ms: number; detail: string; pending?: boolean }
type LastRun = {
  at: number
  text: string
  harper: number
  llm: number
  route?: string
  spans: { name: string; ms: number; error?: string }[]
}
const CACHE_MAX = 400

// Engine keybinding actions that have no handler while the chat is up. The band's Buttons take
// them, so the keys the person binds to them (alt+a, alt+i) press the Buttons from the prompt.
const APPLY_ACTION = 'app:cycleDiffBase'
const IGNORE_ACTION = 'app:toggleDiffNoiseFilter'
// The keys setup key k tries for each, in order. Single ctrl+letters stay out: the prompt uses
// them for editing, and a ctrl+x chord never reached these actions when tried.
const KEY_WANTS: KeyWant[] = [
  { label: 'apply', action: APPLY_ACTION, keys: ['alt+a', 'alt+shift+a'] },
  { label: 'ignore', action: IGNORE_ACTION, keys: ['alt+i', 'alt+shift+i'] },
]

// The shape tag declines what 0.2.0 stored (fixes without `by`), which outlives a reload.
const fixesAtom = atom({ plugin: 'bgh', key: 'fixes' } as const, [] as Fix[], { shape: 'fixes-2' })
// Bumped on every settings change, so the settings pane (which reads it) draws again.
const revAtom = atom({ plugin: 'bgh', key: 'rev' } as const, 0)

// What one check of one draft found, and what it cost.
type Check = {
  gen: number
  text: string
  traceId: string
  startedAt: number
  harper: Issue[]
  llm: Issue[]
  issues: Issue[]
  spans: SpanRecord[]
  route?: string
  // 'openrouter qwen3-…' for the hop that answered; unset when the cache or nobody did.
  by?: string
  shown: boolean
}

type HopResult = { content: string; usage: Usage } | { error: string }

// One sentence's LLM edits as kept across sessions, with the route and model that made them.
type CachedEdit = Omit<Edit, 'i'> & { by?: string }

const authHeader = (k: LangfuseKeys) => `Basic ${base64(`${k.publicKey}:${k.secretKey}`)}`
const scoreBody = (traceId: string, value: 0 | 1) =>
  JSON.stringify({ traceId, name: 'accepted', value, dataType: 'NUMERIC' })

// Writes a file of API keys owner-only: an empty file is made and locked first, so the keys never
// sit in a world-readable file. False when chmod failed where it should work (not on Windows).
async function writeSecret($: EngineInterface, path: string, text: string, windows: boolean): Promise<boolean> {
  await $.fs.write(path, '')
  const locked = await $.process
    .run(['chmod', '600', path], { timeoutMs: 2000 })
    .then((r) => r.exitCode === 0)
    .catch(() => false)
  await $.fs.write(path, text)
  return locked || windows
}

type FetchInit = Parameters<EngineInterface['http']['fetch']>[1]

// $.http.fetch has no timeout of its own; the engine's clock stands in for setTimeout.
async function fetchWithin($: EngineInterface, url: string, init: FetchInit, ms = HTTP_TIMEOUT_MS) {
  let timer: Timer | undefined
  try {
    return await Promise.race([
      $.http.fetch(url, init),
      new Promise<never>((_, reject) => {
        timer = $.clock.after(ms, () => reject(new Error(`timeout after ${ms}ms`)))
      }),
    ])
  } finally {
    timer?.cancel()
  }
}

// Each provider's model list: OpenRouter always (it needs no key), the others where a key is set.
// Declared at the top level because it takes `$`.
async function fetchModels($: EngineInterface, env: Env): Promise<{ lists: Partial<Record<ApiRoute, ListedModel[]>>; errors: Partial<Record<ApiRoute, string>> }> {
  const lists: Partial<Record<ApiRoute, ListedModel[]>> = {}
  const errors: Partial<Record<ApiRoute, string>> = {}
  await Promise.all(
    ROUTES.map(async (route) => {
      const key = env[KEY_NAME[route]]?.trim()
      if (route !== 'openrouter' && !key) return
      try {
        const res = await fetchWithin($, MODELS_URL[route], { headers: key ? { Authorization: `Bearer ${key}` } : {} })
        const parsed = res.ok ? parseModelList(res.text) : undefined
        if (parsed) lists[route] = parsed
        else errors[route] = res.ok ? 'the list was not the JSON expected' : `HTTP ${res.status}`
      } catch (err) {
        errors[route] = String(err).slice(0, 80)
      }
    }),
  )
  return { lists, errors }
}

// ---- store writes that another session may race ------------------------------------------------
// Declared at the top level because each takes `$`. Each re-reads the store and merges.

async function saveTally($: EngineInterface, base: Tally, local: Tally): Promise<Tally> {
  const merged = mergeTally(readTally(await $.store.get(TALLY_KEY)), base, local)
  await $.store.set(TALLY_KEY, merged)
  return merged
}

async function saveWords($: EngineInterface, add: string[], remove: string[]): Promise<string[]> {
  const merged = mergeWords(await $.store.get(IGNORE_KEY), add, remove)
  await $.store.set(IGNORE_KEY, merged)
  return merged
}

async function saveCache($: EngineInterface, ours: [string, CachedEdit[]][]): Promise<[string, CachedEdit[]][]> {
  const merged = mergeCache<CachedEdit[]>(await $.store.get(CACHE_KEY), ours, CACHE_MAX)
  await $.store.set(CACHE_KEY, merged)
  return merged
}

// ---- setup key k: the band's keys --------------------------------------------------------------
// Declared at the top level because each takes `$`.

type KeysPlace = {
  os: Platform['os']
  // where the backup goes
  cache: string
  sep: string
  keybindingsPath: string
  wants: KeyWant[]
}

async function readText($: EngineInterface, path: string) {
  try {
    return String(await $.fs.read(path))
  } catch {
    return undefined
  }
}

// What setup key k and /bgh keys do: bind the keys in keybindings.json, the old file copied to
// the cache folder first. Terminal settings stay as they are.
// Returns the report and the file as it now stands, for the band's labels.
async function setUpKeys($: EngineInterface, p: KeysPlace): Promise<{ lines: KeyLine[]; text: string | undefined }> {
  // Empty until session.start has run, which a managed machine's plugin can swallow.
  if (!p.keybindingsPath || !p.cache) {
    return { lines: [{ name: 'keybindings', status: 'manual', note: 'bgh has not started in this session yet: send one prompt, then press k again' }], text: undefined }
  }
  const before = await readText($, p.keybindingsPath)
  const edit = addKeys(before, p.wants)
  const out: KeyLine[] = []
  if (edit.text === undefined) {
    out.push({ name: 'keybindings', status: edit.status, note: edit.note })
  } else {
    try {
      if (before !== undefined) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        const backup = `${p.cache}${p.sep}keybindings-${stamp}.json`
        await $.fs.write(backup, before)
        out.push({ name: 'keybindings', status: edit.status, note: `${edit.note} \u{b7} old file in ${backup}` })
      } else {
        out.push({ name: 'keybindings', status: edit.status, note: `${edit.note} \u{b7} new file` })
      }
      await $.fs.write(p.keybindingsPath, edit.text)
    } catch (err) {
      return { lines: [{ name: 'keybindings', status: 'failed', note: `could not write ${p.keybindingsPath}: ${String(err).slice(0, 80)}` }], text: before }
    }
  }
  const after = edit.text ?? before
  for (const w of p.wants) {
    const keys = keysFor(after, w.action)
    out.push({ name: w.label, status: keys.length ? 'ok' : 'manual', note: keys.length ? keyLabel(keys, '', p.os) : 'no key' })
  }
  if (p.os === 'darwin') {
    out.push({ name: 'macOS', status: 'ok', note: 'Option keys need the terminal to send Option as Alt: Orca and Ghostty can; in Terminal turn on Use Option as Meta key' })
  }
  return { lines: out, text: after }
}

// "Grammar keys: bound" for the toast.
function keysSummary(lines: KeyLine[]): string {
  if (lines.some((l) => l.status === 'failed')) return 'Grammar keys: could not write keybindings.json'
  if (lines.some((l) => l.status === 'manual')) return 'Grammar keys: one needs a hand, see the setup guide'
  return lines.some((l) => l.status === 'set') ? 'Grammar keys: bound' : 'Grammar keys: bound already'
}

// The engine's `$` is spelled at each call site, never kept; so every piece of work that calls it
// lives inside the hook that starts it. Timers set in a hook keep running after it returns.
export const register: Register = (on) => {
  let processEnv: Env = {}
  let envFile = ''
  let env: Env = {}
  let hops: Hop[] = []
  let langfuse: LangfuseKeys | undefined
  let host = 'unknown'
  let harperOk = false
  let harperVersion = ''
  let lastProbe: { at: number; results: ProbeResult[] } | undefined
  let lastRun: LastRun | undefined
  let platform: Platform = { os: 'unknown', distro: '', arch: 'x86_64' }
  let keybindingsPath = ''
  // Where setup key k reads and writes: set at session start.
  let keysCache = ''
  let keysSep = '/'
  // The keys the band's buttons and the help name, from keybindings.json.
  let applyKeys = 'alt+a'
  let ignoreKeys = 'alt+i'
  // What setup key k or /bgh keys did last, one line per program.
  let keysReport: string[] = []
  let lastTrace: TraceResult | undefined
  let harperProbedAt = 0
  let prefs: Prefs = readPrefs(undefined)
  let draftPath = ''
  let paintPath = ''

  let gen = 0
  let check: Check | undefined
  let bandShown = false
  let timers: Timer[] = []
  let cache = new Map<string, CachedEdit[]>()
  let ignore = new Set<string>()
  let spent = 0
  // What each provider listed, fetched at most every MODELS_TTL_MS; an error says why not.
  let listed: Partial<Record<ApiRoute, ListedModel[]>> = {}
  let listErrors: Partial<Record<ApiRoute, string>> = {}
  let listedAt = 0
  // Models asked for that the provider no longer lists, as 'route model → stand-in'.
  let goneNotes: string[] = []
  let tally: Tally = {}
  // The tally as last read from or written to the store; what this session added is the difference.
  let tallyBase: Tally = {}

  const stale = (c: Check) => c.gen !== gen

  function cancelTimers() {
    for (const t of timers) t.cancel()
    timers = []
  }

  // Merge the .env file under the process environment, then derive the routes from it.
  function applyEnv(fileText: string | undefined) {
    env = { ...(fileText ? parseDotenv(fileText) : {}) }
    for (const [k, v] of Object.entries(processEnv)) if (v?.trim()) env[k] = v
    goneNotes = []
    hops = chain(env, prefs).map((h) => {
      if (h.route === 'claude') return h
      const live = liveModel(h.route, h.model, listed[h.route])
      if (live.gone) goneNotes.push(`${h.route} ${modelName(h.model)} \u{2192} ${modelName(live.model)}`)
      return { ...h, model: live.model }
    })
    langfuse = prefs.langfuse ? langfuseKeys(env) : undefined
  }

  // A fresh fetch replaces the lists it got; a route that failed keeps its last good list.
  function applyModels(got: { lists: Partial<Record<ApiRoute, ListedModel[]>>; errors: Partial<Record<ApiRoute, string>> }) {
    listed = { ...listed, ...got.lists }
    listErrors = got.errors
    listedAt = Date.now()
    applyEnv(lastEnvFile)
  }

  // Whose fixes a check showed, for the tally and the trace.
  const whoOf = (c: Check): string => creditOf(c.issues)

  function count(who: string, accepted: boolean) {
    tally = addTally(tally, who, accepted)
  }

  // After saveTally: keep any count made while the write was in flight, and remember what the
  // store now holds.
  function tallySaved(sent: Tally, merged: Tally) {
    tally = mergeTally(merged, sent, tally)
    tallyBase = merged
  }

  const modelName = (m: string) => m.replace(/^accounts\/fireworks\/models\//, '')

  // One line per provider list: how many it lists, what is gone, and a newer sibling if any.
  function modelLines(): string[] {
    const out: string[] = []
    for (const route of ROUTES) {
      const list = listed[route]
      const err = listErrors[route]
      if (!list && !err) continue
      const hop = hops.find((h) => h.route === route)
      const gone = MODEL_CHOICES[route].filter((m) => list && !list.some((l) => l.id === m)).map(modelName)
      const newer = hop && route === 'openrouter' ? newerSibling(hop.model, list) : undefined
      out.push(
        [
          `${route.padEnd(10)} ${list ? `${list.length} listed` : 'no list'}`,
          err ? `last fetch failed: ${err}` : '',
          gone.length ? `gone: ${gone.join(', ')}` : '',
          newer ? `newer, same price or less: ${newer}` : '',
        ].filter(Boolean).join(' \u{b7} '),
      )
    }
    return out
  }
  const listedLine = () => (listedAt ? `fetched ${new Date(listedAt).toLocaleString()}` : 'not fetched yet')

  // The settings view: one fact per line, for `/bgh` and `settings`.
  function settings(): string {
    const llm = hops.map((h) => `${h.route} ${modelName(h.model)}`)
    return [
      `B3 Grammar Helper (bgh) ${RELEASE}  ${prefs.enabled ? 'on' : 'OFF'}`,
      `harper    ${harperOk ? 'on' : `missing: install harper-cli from ${HARPER_RELEASES}`}`,
      `llm       ${llm.length ? llm.join(' \u{2192} ') : 'off'}`,
      `langfuse  ${langfuse ? `on (${langfuse.baseUrl})` : langfuseKeys(env) ? 'off (switched off)' : 'off (no keys)'}`,
      `accepted  ${tallyLine(tally)}`,
      `cache     ${cache.size} sentences`,
      `ignored   ${ignore.size ? [...ignore].sort().join(', ') : 'none'}`,
      `spent     ${spent ? `$${spent.toFixed(4)} this session` : 'nothing reported'}`,
      `keys      ${envFile}`,
    ].join('\n')
  }

  // Langfuse trouble pops up once per kind of failure, not on every keystroke.
  let lastLangfuseError = ''

  // ---- setup ---------------------------------------------------------------

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    // A /clear keeps this module alive: what the panes call "this session" starts over here.
    spent = 0
    lastProbe = undefined
    lastRun = undefined
    processEnv = {
      HOME: await $.env.get('HOME'),
      XDG_CONFIG_HOME: await $.env.get('XDG_CONFIG_HOME'),
      XDG_CACHE_HOME: await $.env.get('XDG_CACHE_HOME'),
      USERPROFILE: await $.env.get('USERPROFILE'),
      APPDATA: await $.env.get('APPDATA'),
      LOCALAPPDATA: await $.env.get('LOCALAPPDATA'),
      COMPUTERNAME: await $.env.get('COMPUTERNAME'),
      HOSTNAME: await $.env.get('HOSTNAME'),
      B3_GRAMMAR_ENV_FILE: await $.env.get('B3_GRAMMAR_ENV_FILE'),
      B3_GRAMMAR_PROVIDER: await $.env.get('B3_GRAMMAR_PROVIDER'),
      B3_GRAMMAR_MODEL: await $.env.get('B3_GRAMMAR_MODEL'),
      B3_GRAMMAR_LLM: await $.env.get('B3_GRAMMAR_LLM'),
      OPENROUTER_API_KEY: await $.env.get('OPENROUTER_API_KEY'),
      OPENAI_API_KEY: await $.env.get('OPENAI_API_KEY'),
      FIREWORKS_API_KEY: await $.env.get('FIREWORKS_API_KEY'),
      LANGFUSE_PUBLIC_KEY: await $.env.get('LANGFUSE_PUBLIC_KEY'),
      LANGFUSE_SECRET_KEY: await $.env.get('LANGFUSE_SECRET_KEY'),
      LANGFUSE_BASE_URL: await $.env.get('LANGFUSE_BASE_URL'),
    }
    prefs = readPrefs(await $.store.get(PREFS_KEY))
    // Linux, macOS and Windows each put config and cache somewhere else; dirsFor knows where.
    const dirs = dirsFor(processEnv)
    envFile = processEnv.B3_GRAMMAR_ENV_FILE || `${dirs.config}${dirs.sep}.env`
    let fileText: string | undefined
    try {
      fileText = String(await $.fs.read(envFile))
    } catch {
      // No file: the process environment alone.
    }
    // Until 0.5.0 the mod was b3-grammar-helper and kept its keys under that folder name. A
    // machine upgrading carries them over once; the old file stays where it was.
    if (needsTemplate(fileText) && !processEnv.B3_GRAMMAR_ENV_FILE) {
      const legacy = `${dirs.config.replace(/bgh$/, 'b3-grammar-helper')}${dirs.sep}.env`
      try {
        const old = String(await $.fs.read(legacy))
        if (!needsTemplate(old)) {
          const locked = await writeSecret($, envFile, old, dirs.sep === '\\')
          fileText = old
          $.ui.toast(`Grammar: keys moved from ${legacy} to ${envFile}${locked ? '' : '; chmod 600 failed, run it by hand'}`)
        }
      } catch {
        // no old file either
      }
    }
    // A new machine gets the template, so there's a file with every key name to fill in. Never
    // over a file that already holds a value.
    if (needsTemplate(fileText)) {
      try {
        // Keys are secrets: owner-only where chmod exists (not on Windows).
        const locked = await writeSecret($, envFile, ENV_TEMPLATE, dirs.sep === '\\')
        if (!locked) $.ui.toast(`Grammar: ${envFile} could not be made owner-only; run chmod 600 on it`)
        else if (fileText === undefined) $.ui.toast(`Grammar: key template written to ${envFile}`)
      } catch {
        // read-only home: the environment alone
      }
    }
    const savedModels = (await $.store.get(MODELS_KEY)) as { at?: unknown; lists?: unknown } | undefined
    if (savedModels && typeof savedModels.at === 'number' && savedModels.lists && typeof savedModels.lists === 'object') {
      listed = savedModels.lists as Partial<Record<ApiRoute, ListedModel[]>>
      listedAt = savedModels.at
    }
    tally = readTally(await $.store.get(TALLY_KEY))
    tallyBase = tally
    lastEnvFile = fileText
    applyEnv(fileText)
    // A model a provider dropped: the hop runs a listed pick instead, said once here.
    const sayGone = () => {
      if (goneNotes.length) $.ui.toast(`Grammar: no longer listed, standing in: ${goneNotes.join(', ')}`)
    }
    sayGone()
    // The lists are fetched off the start path, and only when the stored ones are old.
    if (Date.now() - listedAt > MODELS_TTL_MS) {
      $.clock.after(1500, async () => {
        const before = goneNotes.join()
        applyModels(await fetchModels($, env))
        await $.store.set(MODELS_KEY, { at: listedAt, lists: listed })
        if (goneNotes.join() !== before) sayGone()
        await update($, revAtom, (n) => n + 1)
      })
    }

    // $.fs.write makes the folder on first write, so no mkdir (which Windows lacks).
    // One draft file per session: two sessions linting at once would lint each other's text.
    // The engine has no delete, so each session leaves one small file behind in the cache folder.
    draftPath = `${dirs.cache}${dirs.sep}draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.md`
    paintPath = `${dirs.cache}${dirs.sep}last-paint.json`
    try {
      harperProbedAt = Date.now()
      const r = await $.process.run(['harper-cli', '--version'], { timeoutMs: 5000 })
      harperOk = r.exitCode === 0
      harperVersion = harperOk ? r.stdout.trim() : ''
    } catch {
      harperOk = false
    }
    // What the setup guide needs to name the right install command and keybindings file.
    const run = async (argv: string[]) => {
      try {
        return (await $.process.run(argv, { timeoutMs: 2000 })).stdout
      } catch {
        return undefined
      }
    }
    let osRelease: string | undefined
    try {
      osRelease = String(await $.fs.read('/etc/os-release'))
    } catch {
      // macOS and Windows have none
    }
    platform = platformOf(await run(['uname', '-s']), await run(['uname', '-m']), osRelease, dirs.sep === '\\')
    const claudeDir =
      (await $.env.get('CLAUDE_CONFIG_DIR')) ||
      `${processEnv.HOME || processEnv.USERPROFILE || '.'}${dirs.sep}.claude`
    keybindingsPath = `${claudeDir}${dirs.sep}keybindings.json`
    keysCache = dirs.cache
    keysSep = dirs.sep
    // No file yet still names the defaults the way this OS does.
    learnKeys(await readText($, keybindingsPath))

    // The machine's name tags each Langfuse trace. Windows sets COMPUTERNAME; elsewhere the
    // shell keeps HOSTNAME to itself, so ask uname, then hostname.
    host = processEnv.COMPUTERNAME || processEnv.HOSTNAME || host
    for (const argv of [['uname', '-n'], ['hostname']]) {
      if (host !== 'unknown') break
      try {
        host = (await $.process.run(argv, { timeoutMs: 2000 })).stdout.trim() || host
      } catch {
        // not on this system: try the next
      }
    }
    const saved = (await $.store.get(CACHE_KEY)) as [string, CachedEdit[]][] | undefined
    cache = new Map(Array.isArray(saved) ? saved : [])
    const words = (await $.store.get(IGNORE_KEY)) as string[] | undefined
    ignore = new Set(Array.isArray(words) ? words : [])

    await $.command.register({
      name: 'bgh',
      description: 'B3 Grammar Helper: grammar ghost text in the prompt. /bgh help lists every command',
      argumentHint: 'setup-guide | settings | debug | test | status | on | off | reload | keys | ignore <word> | help',
      immediate: true,
    })
    // Clears the line earlier versions pinned under the prompt.
    $.ui.status(undefined)
    return started
  })

  // ---- the command ---------------------------------------------------------

  // Settings changes shared by the command and the panes. It touches no $, so each caller saves
  // and redraws with its own.
  let lastEnvFile: string | undefined
  function setPrefs(change: Partial<Prefs>) {
    prefs = { ...prefs, ...change }
    applyEnv(lastEnvFile)
    gen += 1
    cancelTimers()
    check = undefined
  }

  const keysPlace = (): KeysPlace => ({
    os: platform.os,
    cache: keysCache,
    sep: keysSep,
    keybindingsPath,
    wants: KEY_WANTS,
  })

  // Reads which keys run the two actions, for the labels.
  const learnKeys = (keybindings: string | undefined) => {
    applyKeys = keyLabel(keysFor(keybindings, APPLY_ACTION), 'alt+a', platform.os)
    ignoreKeys = keyLabel(keysFor(keybindings, IGNORE_ACTION), 'alt+i', platform.os)
  }

  // What setup key k and /bgh keys share after binding: the report and the band's labels.
  const keysBound = (r: { lines: KeyLine[]; text: string | undefined }): string => {
    keysReport = keyLines(r.lines)
    learnKeys(r.text)
    return keysSummary(r.lines)
  }

  // Each setup step, true when done. The setup-guide pane draws them; a bare /bgh opens the
  // guide while any is still false, the settings once all are.
  async function setupSteps(keybindings: string | undefined) {
    return {
      harper: harperOk,
      keys: availableRoutes(env).some((r) => r !== 'claude'),
      bound: KEY_WANTS.every((w) => keysFor(keybindings, w.action).length > 0),
    }
  }

  on('command.run', { command: 'bgh' }, async ($, e) => {
    const [verb = '', ...rest] = e.args.trim().split(/\s+/)
    const word = normalizeWord(rest.join(' '))
    const redraw = () => update($, revAtom, (n) => n + 1)
    const save = async () => {
      await $.store.set(PREFS_KEY, prefs)
      await redraw()
    }
    // The four panes open together as tabs, as /sl-settings does; the one asked for opens last
    // with the focus, which raises it.
    const show = async (id: string) => {
      for (const p of PANES) if (p.id !== id) await $.ui.open({ id: p.id, title: p.title, closeOnEscape: true })
      const front = PANES.find((p) => p.id === id)!
      const opened = await $.ui.open({ id: front.id, title: front.title, focus: true, closeOnEscape: true })
      return opened.isPlaced
    }

    switch (verb.toLowerCase()) {
      case '': {
        let keybindings: string | undefined
        try {
          keybindings = String(await $.fs.read(keybindingsPath))
        } catch {
          // none yet
        }
        const steps = await setupSteps(keybindings)
        const id = Object.values(steps).every(Boolean) ? SETTINGS_PANE : SETUP_PANE
        if (await show(id)) return { text: 'B3 Grammar Helper open. Esc closes it.' }
        return { text: settings() }
      }
      case 'setup-guide':
      case 'setup':
        if (await show(SETUP_PANE)) return { text: 'Setup guide open. Esc closes it.' }
        return { text: settings() }
      case 'settings':
        if (await show(SETTINGS_PANE)) return { text: 'Settings open. Esc closes them.' }
        return { text: settings() }
      case 'debug':
        if (await show(DEBUG_PANE)) return { text: 'Debug open. Esc closes it.' }
        return { text: debugText() }
      case 'status':
        if (await show(DEBUG_PANE)) return { text: 'Status is the bgh debug tab. Esc closes it.' }
        return { text: settings() }
      case 'help':
        if (await show(HELP_PANE)) return { text: 'Help open. Esc closes it.' }
        return { text: helpText(platform.os) }
      case 'on':
      case 'off':
        setPrefs({ enabled: verb.toLowerCase() === 'on' })
        await save()
        if (!prefs.enabled) {
          void $.prompt.paint({ decorations: [] }).catch(() => undefined)
          await update($, fixesAtom, () => [])
        }
        $.ui.toast(`B3 Grammar Helper is ${prefs.enabled ? 'on' : 'off'}`)
        return { text: `B3 Grammar Helper is ${prefs.enabled ? 'on' : 'off'}.` }
      case 'reload': {
        try {
          lastEnvFile = String(await $.fs.read(envFile))
        } catch {
          lastEnvFile = undefined
        }
        applyEnv(lastEnvFile)
        await redraw()
        $.ui.toast(lastEnvFile === undefined ? `Grammar: no file at ${envFile}` : 'Grammar: keys reloaded')
        return { text: `${lastEnvFile === undefined ? `No file at ${envFile}` : 'Reloaded.'}\n${settings()}` }
      }
      case 'ignore':
        if (!word) return { text: 'Usage: /bgh ignore <word>' }
        ignore = new Set(await saveWords($, [word], []))
        await redraw()
        $.ui.toast(`Grammar: ignoring \u{201c}${word}\u{201d}`)
        return { text: `Ignoring \u{201c}${word}\u{201d}. ${ignore.size} word(s) on the list.` }
      case 'unignore':
        if (!word) return { text: 'Usage: /bgh unignore <word>' }
        ignore = new Set(await saveWords($, [], [word]))
        await redraw()
        $.ui.toast(`Grammar: \u{201c}${word}\u{201d} is checked again`)
        return { text: `\u{201c}${word}\u{201d} is checked again.` }
      case 'ignored':
        if (await show(SETTINGS_PANE)) return { text: 'Ignored words are at the bottom of bgh settings; 1\u{2013}9 takes one off.' }
        return { text: ignore.size ? [...ignore].sort().join(', ') : 'Nothing ignored yet.' }
      case 'keys': {
        $.ui.toast(keysBound(await setUpKeys($, keysPlace())))
        await redraw()
        return { text: keysReport.join('\n') }
      }
      case 'clear-cache':
        cache.clear()
        await $.store.set(CACHE_KEY, [])
        await redraw()
        $.ui.toast('Grammar: LLM answers forgotten')
        return { text: 'LLM answers forgotten. The next check asks again.' }
      case 'test': {
        // Every route on a sentence with known mistakes, then Langfuse's auth, so a broken key
        // shows here instead of as silence while typing.
        // The model lists too, beside the routes, so a dropped model shows in the same tab.
        void fetchModels($, env)
          .then(async (got) => {
            applyModels(got)
            await $.store.set(MODELS_KEY, { at: listedAt, lists: listed })
            await redraw()
          })
          .catch(() => undefined)
        const sample = 'I has a apple and it are red.'
        const lines: string[] = [`Testing with: ${sample}`]
        const keys = langfuseKeys(env)
        // Every row shows `testing…` first and turns ✓ or ✗ in place, in the debug tab.
        const results: ProbeResult[] = [
          ...hops.map((h) => ({ name: `${h.route} ${modelName(h.model)}`, ok: false, ms: 0, detail: 'testing\u{2026}', pending: true })),
          ...(hops.length ? [] : [{ name: 'llm', ok: false, ms: 0, detail: 'off (settings l, or B3_GRAMMAR_LLM=off)' }]),
          keys
            ? { name: 'langfuse', ok: false, ms: 0, detail: 'testing\u{2026}', pending: true }
            : { name: 'langfuse', ok: false, ms: 0, detail: `no keys in ${envFile} (optional)` },
        ]
        lastProbe = { at: Date.now(), results }
        const shown = await show(DEBUG_PANE)
        await redraw()
        const settle = async (i: number, r: ProbeResult) => {
          results[i] = r
          await redraw()
        }
        for (const [i, hop] of hops.entries()) {
          const t0 = Date.now()
          let out: { content: string } | { error: string }
          try {
            if (hop.route === 'claude') {
              const r = await $.model.complete({
                model: hop.model,
                system: SYSTEM_PROMPT,
                prompt: userPrompt([sample]),
                maxTokens: 400,
                timeoutMs: HOP_TIMEOUT_MS,
              })
              out = r.isAnswered ? { content: r.text } : { error: String(r.reason) }
            } else {
              const req = chatRequest(hop as Hop & { route: ApiRoute }, userPrompt([sample]))
              const res = await fetchWithin($, req.url, { method: 'POST', headers: req.headers, body: req.body }, HOP_TIMEOUT_MS)
              out = res.ok ? parseChat(res.text) : { error: `HTTP ${res.status}: ${res.text.slice(0, 120)}` }
            }
          } catch (err) {
            out = { error: String(err).slice(0, 160) }
          }
          const edits = 'content' in out ? parseEdits(out.content) : undefined
          const ok = edits !== undefined
          const detail = ok
            ? edits.length
              ? edits.map((x) => `${x.from}\u{2192}${x.to}`).join(', ')
              : 'no edits (the model missed the mistakes)'
            : 'error' in out
              ? out.error
              : 'reply was not the JSON asked for'
          await settle(i, { name: `${hop.route} ${modelName(hop.model)}`, ok, ms: Date.now() - t0, detail })
        }
        const lf = results.length - 1
        if (keys) {
          const t0 = Date.now()
          try {
            const res = await fetchWithin($, `${keys.baseUrl}/api/public/projects`, { headers: { Authorization: authHeader(keys) } })
            let project = ''
            try {
              project = (JSON.parse(res.text) as { data?: { name?: string }[] }).data?.[0]?.name ?? ''
            } catch {
              // not JSON
            }
            await settle(lf, {
              name: 'langfuse',
              ok: res.ok,
              ms: Date.now() - t0,
              detail: res.ok
                ? `project ${project || '(unnamed)'} at ${keys.baseUrl}${prefs.langfuse ? '' : ' \u{b7} tracing is switched off (settings t)'}`
                : res.status === 401
                  ? langfuse401(keys.baseUrl)
                  : `HTTP ${res.status}`,
            })
          } catch (err) {
            await settle(lf, { name: 'langfuse', ok: false, ms: Date.now() - t0, detail: `unreachable: ${String(err).slice(0, 100)}` })
          }
        }
        if (shown) {
          const good = results.filter((r) => r.ok).length
          return { text: `Test: ${good} of ${results.length} \u{2713}. Details in the bgh debug tab.` }
        }
        for (const r of results) lines.push(`${r.ok ? '\u{2713}' : '\u{2717}'} ${r.name.padEnd(28)} ${String(r.ms).padStart(5)} ms  ${r.detail}`)
        return { text: lines.join('\n') }
      }
      default:
        return { text: `Unknown: ${verb}\n\n${helpText(platform.os)}` }
    }
  })

  // The debug view as text: for a surface with no panes, and for pasting into a bug report.
  function debugText(): string {
    const set = KNOWN_ENV.map((k) => `${k}${env[k]?.trim() ? '' : ' (unset)'}`)
    return [
      `B3 Grammar Helper (bgh) ${RELEASE} on ${host} \u{b7} ${platform.os} ${platform.distro} ${platform.arch}`.trim(),
      `harper     ${harperOk ? harperVersion || 'found' : 'missing'}`,
      `keys file  ${envFile}`,
      `env        ${set.join(', ')}`,
      `chain      ${hops.map((h) => `${h.route} ${modelName(h.model)}`).join(' \u{2192} ') || 'off'}`,
      ...(goneNotes.length ? [`standing in ${goneNotes.join(', ')}`] : []),
      `accepted   ${tallyLine(tally)}`,
      `models     ${listedLine()}`,
      ...modelLines().map((l) => `  ${l}`),
      `langfuse   ${langfuse ? langfuse.baseUrl : 'off'} \u{b7} last trace ${traceLine(lastTrace, Date.now())}`,
      `last error ${lastLangfuseError || 'none'}`,
      `cache      ${cache.size} sentences \u{b7} ignored ${ignore.size} \u{b7} spent $${spent.toFixed(4)}`,
      `files      ${draftPath} \u{b7} ${paintPath}`,
      `keybinds   ${keybindingsPath}`,
      ...(lastRun
        ? [
            `last check ${new Date(lastRun.at).toLocaleTimeString()} \u{b7} harper ${lastRun.harper} \u{b7} llm ${lastRun.llm} \u{b7} ${lastRun.route ?? 'no LLM answer'}`,
            ...lastRun.spans.map((s) => `  ${s.name.padEnd(16)} ${String(s.ms).padStart(5)} ms ${s.error ?? 'ok'}`),
          ]
        : ['last check none yet']),
    ].join('\n')
  }

  // ---- the four panes -------------------------------------------------------

  on('ui.render', { component: 'Pane', requestId: SETUP_PANE }, async ($, e) => {
    await read($, revAtom)
    const { Box, Text, Button } = $.ui.resolve(e)
    let keybindings: string | undefined
    try {
      keybindings = String(await $.fs.read(keybindingsPath))
    } catch {
      // no file yet
    }
    learnKeys(keybindings)
    const steps = await setupSteps(keybindings)
    const keyed = availableRoutes(env).filter((r) => r !== 'claude')
    const now = Date.now()
    const redraw = () => void update($, revAtom, (n) => n + 1)

    const step = (n: number, done: boolean, name: string, state: string, how: string[]) => (
      <Box key={`setup-${name}`} flexDirection="column" marginTop={1}>
        <Box flexDirection="row" columnGap={1}>
          <Text color={done ? 'success' : 'warning'}>{done ? ` \u{2713} ${n}.` : ` \u{2717} ${n}.`}</Text>
          <Text bold={!done}>{name.padEnd(12)}</Text>
          <Text dimColor={done} wrap="truncate-end">
            {state}
          </Text>
        </Box>
        {done
          ? null
          : how.map((line, i) => (
              <Text key={`how-${name}-${i}`} dimColor wrap="wrap">
                {`       ${line}`}
              </Text>
            ))}
      </Box>
    )

    const allDone = Object.values(steps).every(Boolean)
    return (
      <Box flexDirection="column">
        <Text dimColor wrap="wrap">
          {allDone
            ? 'All set on this machine. /bgh settings to tune it, /bgh test to try every route.'
            : 'What this machine still needs, in order. Each line turns \u{2713} by itself once done.'}
        </Text>
        {commentedOnly(lastEnvFile, MUST_BE_LIVE).map((n) => (
          <Text key={`commented-${n}`} color="warning" wrap="wrap">
            {` ! ${n} is commented out in ${envFile} (a # in front), so it isn't used. Remove the # and press r.`}
          </Text>
        ))}
        {step(1, steps.harper, 'Harper', steps.harper ? `${harperVersion || 'found'}` : 'missing: only the LLM pass runs', [
          ...harperInstallAll(platform).map((o) => `${o.here ? '\u{25b8}' : ' '} ${o.label.padEnd(12)} ${o.cmd}${o.here ? '   \u{2190} this machine' : ''}`),
          'then press h here to look again',
        ])}
        {step(
          2,
          steps.keys,
          'API keys',
          steps.keys ? `${keyed.join(', ')} \u{b7} ${envFile}` : 'none: Haiku on your Claude login runs meanwhile',
          [
            `open ${envFile} and fill in OPENROUTER_API_KEY, OPENAI_API_KEY or FIREWORKS_API_KEY`,
            `this machine reads ${envFile} (B3_GRAMMAR_ENV_FILE or XDG_CONFIG_HOME move it)`,
            'then press r here to reload it',
          ],
        )}
        {step(
          3,
          steps.bound,
          'keys',
          steps.bound ? `apply ${applyKeys} \u{b7} ignore ${ignoreKeys}` : 'not bound: the band shows fixes, the keys do nothing',
          [
            `press k: binds apply and ignore in ${keybindingsPath}, ${keyName('alt+a', platform.os)} and ${keyName('alt+i', platform.os)} first`,
            `a key another action holds stays with it, and the next one is tried (${keyName('alt+shift+a', platform.os)}, ${keyName('alt+shift+i', platform.os)})`,
            'macOS: Option types \u{e5} unless the terminal sends it as Alt; bgh leaves terminal settings to you (Terminal: Use Option as Meta key)',
          ],
        )}
        {step(
          4,
          !langfuseKeys(env) || !!lastTrace?.ok,
          'Langfuse',
          !langfuseKeys(env)
            ? 'optional, no keys'
            : !prefs.langfuse
              ? 'keys set, tracing switched off (settings t)'
              : `last trace ${traceLine(lastTrace, now)}`,
          lastTrace && !lastTrace.ok
            ? lastTrace.detail === 'HTTP 401'
              ? [langfuse401(langfuse?.baseUrl ?? langfuseKeys(env)?.baseUrl ?? 'https://cloud.langfuse.com')]
              : ['check LANGFUSE_BASE_URL and the network, then /bgh test']
            : ['type an English sentence and wait, or run /bgh test'],
        )}
        <Box flexDirection="row" columnGap={2} marginTop={1}>
          <Button
            key="h"
            label="look for harper"
            hotkey="h"
            plain
            onPress={() => {
              void $.process
                .run(['harper-cli', '--version'], { timeoutMs: 5000 })
                .then((r) => {
                  harperOk = r.exitCode === 0
                  harperVersion = harperOk ? r.stdout.trim() : ''
                })
                .catch(() => {
                  harperOk = false
                })
                .finally(redraw)
            }}
          />
          <Button
            key="r"
            label="reload keys"
            hotkey="r"
            plain
            onPress={() => {
              void $.fs
                .read(envFile)
                .then((t) => {
                  lastEnvFile = String(t)
                })
                .catch(() => {
                  lastEnvFile = undefined
                })
                .finally(() => {
                  applyEnv(lastEnvFile)
                  redraw()
                  $.ui.toast(lastEnvFile === undefined ? `Grammar: no file at ${envFile}` : 'Grammar: keys reloaded')
                })
            }}
          />
          <Button
            key="k"
            label="bind keys"
            hotkey="k"
            plain
            onPress={() => {
              void setUpKeys($, keysPlace())
                .then((r) => $.ui.toast(keysBound(r)))
                .catch((err) => {
                  keysReport = [`\u{2717} ${String(err).slice(0, 120)}`]
                })
                .finally(redraw)
            }}
          />
          <Button key="x" label="test every route" hotkey="x" plain onPress={() => void $.command.run({ command: 'bgh', args: 'test' }).catch(() => undefined)} />
        </Box>
        {keysReport.map((line, i) => (
          <Text key={`keys-${i}`} dimColor={line.startsWith('\u{2713}')} color={line.startsWith('!') || line.startsWith('\u{2717}') ? 'warning' : undefined} wrap="wrap">
            {` ${line}`}
          </Text>
        ))}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: SETTINGS_PANE }, async ($, e) => {
    await read($, revAtom)
    const { Box, Text, Button } = $.ui.resolve(e)
    const narrow = e.props.bodyColumns < 70
    const row = (hotkey: string, label: string, state: string, isOn: boolean, tail: string, onPress: () => void) => (
      <Box key={`row-${hotkey}`} flexDirection="row" columnGap={1}>
        <Button key={`b-${hotkey}`} label={label.padEnd(9)} hotkey={hotkey} plain onPress={onPress} />
        <Text color={isOn ? 'suggestion' : undefined} dimColor={!isOn}>
          {state.padEnd(16)}
        </Text>
        {narrow ? null : (
          <Text dimColor wrap="truncate-end">
            {tail}
          </Text>
        )}
      </Box>
    )
    const redraw = () => void update($, revAtom, (n) => n + 1)
    const save = () => {
      void $.store.set(PREFS_KEY, prefs).catch(() => undefined)
      redraw()
    }

    const routes = availableRoutes(env)
    const firstRoute: Route = prefs.first !== 'auto' ? prefs.first : (hops[0]?.route ?? 'claude')
    const firstList = firstRoute === 'claude' ? undefined : listed[firstRoute]
    const isGone = (m: string) => !!firstList && !firstList.some((l) => l.id === m)
    const allChoices = MODEL_CHOICES[firstRoute]
    const choices = allChoices.filter((m) => !isGone(m))
    const newer = firstRoute === 'openrouter' ? newerSibling(hops.find((h) => h.route === firstRoute)?.model ?? '', firstList) : undefined
    const firstModel = prefs.models[firstRoute] ?? hops.find((h) => h.route === firstRoute)?.model ?? choices[0] ?? ''
    const onOff = (b: boolean) => (b ? 'on' : 'off')
    const words = [...ignore].sort().slice(0, 9)
    const llmLine = hops.length ? hops.map((h) => `${h.route} ${modelName(h.model)}`).join(' \u{2192} ') : 'off'

    return (
      <Box flexDirection="column">
        <Text dimColor wrap="wrap">
          A key changes its setting, kept across sessions. API keys stay in the .env file.
        </Text>
        <Box marginTop={1}>
          <Text bold>Checking</Text>
        </Box>
        {row('g', 'grammar', onOff(prefs.enabled), prefs.enabled, 'check the prompt as you type', () => {
          setPrefs({ enabled: !prefs.enabled })
          if (!prefs.enabled) {
            void $.prompt.paint({ decorations: [] }).catch(() => undefined)
            void update($, fixesAtom, () => [])
          }
          save()
        })}
        {row('l', 'llm', onOff(prefs.llm), prefs.llm, 'second pass: word choice and phrasing', () => {
          setPrefs({ llm: !prefs.llm })
          save()
        })}
        {row('f', 'first', prefs.first, prefs.first !== 'auto', `route tried first \u{b7} can run: ${routes.join(', ')}`, () => {
          setPrefs({ first: cycle<Route | 'auto'>(['auto', ...routes], prefs.first) })
          save()
        })}
        {row('m', 'model', modelName(firstModel), !!prefs.models[firstRoute], `${firstRoute}: ${allChoices.map((m) => `${modelName(m)}${isGone(m) ? ' (gone)' : ''}`).join(', ')}${newer ? ` \u{b7} newer: ${modelName(newer)}` : ''}`, () => {
          if (!choices.length) return
          setPrefs({ models: { ...prefs.models, [firstRoute]: cycle(choices, firstModel) } })
          save()
        })}
        {row('d', 'delay', `${prefs.llmDelayMs} ms`, true, 'pause after typing before the LLM is asked', () => {
          setPrefs({ llmDelayMs: cycle(LLM_DELAYS, prefs.llmDelayMs) })
          save()
        })}
        <Text dimColor wrap="truncate-end">
          {`  chain   ${llmLine}`}
        </Text>
        <Box marginTop={1}>
          <Text bold>Tracing and cost</Text>
        </Box>
        {row('t', 'langfuse', langfuseKeys(env) ? onOff(prefs.langfuse) : 'no keys', !!langfuse, langfuse ? langfuse.baseUrl : 'LANGFUSE_* keys go in the .env file', () => {
          setPrefs({ langfuse: !prefs.langfuse })
          save()
        })}
        {row('c', 'cache', `${cache.size} kept`, cache.size > 0, `press to forget the LLM answers \u{b7} spent ${spent ? `$${spent.toFixed(4)}` : '$0'} this session`, () => {
          cache.clear()
          void $.store.set(CACHE_KEY, []).catch(() => undefined)
          redraw()
        })}
        <Box marginTop={1}>
          <Text bold>{ignore.size > 9 ? `Ignored words (first 9 of ${ignore.size})` : 'Ignored words'}</Text>
        </Box>
        {words.length ? (
          <Box flexDirection="row" columnGap={2} flexWrap="wrap">
            {words.map((w, i) => (
              <Button
                key={`ign-${w}`}
                label={w}
                hotkey={String(i + 1)}
                plain
                onPress={() => {
                  ignore.delete(w)
                  void saveWords($, [], [w])
                    .then((words) => {
                      ignore = new Set(words)
                    })
                    .catch(() => undefined)
                  redraw()
                  $.ui.toast(`Grammar: \u{201c}${w}\u{201d} is checked again`)
                }}
              />
            ))}
          </Box>
        ) : (
          <Text dimColor>{`none yet: ${ignoreKeys} on the band ignores a word`}</Text>
        )}
        {words.length ? <Text dimColor>a number puts that word back in the check</Text> : null}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: DEBUG_PANE }, async ($, e) => {
    await read($, revAtom)
    const { Box, Text, Button } = $.ui.resolve(e)
    const redraw = () => void update($, revAtom, (n) => n + 1)
    const kv = (k: string, v: string, bad = false) => (
      <Box key={`kv-${k}`} flexDirection="row" columnGap={1}>
        <Text dimColor>{k.padEnd(11)}</Text>
        <Text color={bad ? 'warning' : undefined} wrap="truncate-end">
          {v}
        </Text>
      </Box>
    )
    const keysSet = KNOWN_ENV.filter((k) => env[k]?.trim())
    return (
      <Box flexDirection="column">
        <Text bold>This machine</Text>
        {kv('version', `${RELEASE} on ${host} \u{b7} ${platform.os} ${platform.distro} ${platform.arch}`)}
        {kv('harper', harperOk ? harperVersion || 'found' : 'missing', !harperOk)}
        {kv('keys file', envFile)}
        {kv('set', keysSet.length ? keysSet.join(', ') : 'nothing', !keysSet.length)}
        {commentedOnly(lastEnvFile, MUST_BE_LIVE).length
          ? kv('commented', `${commentedOnly(lastEnvFile, MUST_BE_LIVE).join(', ')}: a # in front, not used`, true)
          : null}
        {kv('keybinds', keybindingsPath)}
        {kv('files', `${draftPath} \u{b7} last-paint.json beside it`)}
        <Box marginTop={1}>
          <Text bold>Routes</Text>
        </Box>
        {kv('chain', hops.map((h) => `${h.route} ${modelName(h.model)}`).join(' \u{2192} ') || 'off', !hops.length)}
        {goneNotes.length ? kv('standing in', goneNotes.join(', '), true) : null}
        {kv('accepted', tallyLine(tally))}
        {kv('model lists', listedLine())}
        {modelLines().map((l, i) => (
          <Text key={`ml-${i}`} dimColor wrap="truncate-end">
            {`  ${l}`}
          </Text>
        ))}
        {lastProbe ? (
          <Box flexDirection="column">
            <Text dimColor>{`test at ${new Date(lastProbe.at).toLocaleTimeString()}`}</Text>
            {lastProbe.results.map((r) => (
              <Box key={`probe-${r.name}`} flexDirection="row" columnGap={1}>
                <Text color={r.pending ? undefined : r.ok ? 'success' : 'warning'} dimColor={r.pending}>
                  {r.pending ? '\u{2026}' : r.ok ? '\u{2713}' : '\u{2717}'}
                </Text>
                <Text>{r.name.padEnd(26)}</Text>
                <Text dimColor>{`${String(r.ms).padStart(5)} ms`}</Text>
                <Text dimColor wrap="truncate-end">
                  {r.detail}
                </Text>
              </Box>
            ))}
          </Box>
        ) : (
          <Text dimColor>not tested yet: press x</Text>
        )}
        <Box marginTop={1}>
          <Text bold>Langfuse</Text>
        </Box>
        {kv('endpoint', langfuse ? langfuse.baseUrl : langfuseKeys(env) ? 'switched off' : 'no keys')}
        {kv('last trace', traceLine(lastTrace, Date.now()), !!lastTrace && !lastTrace.ok)}
        {kv('last error', lastLangfuseError || 'none', !!lastLangfuseError)}
        <Box marginTop={1}>
          <Text bold>Last check</Text>
        </Box>
        {lastRun ? (
          <Box flexDirection="column">
            {kv('at', `${new Date(lastRun.at).toLocaleTimeString()} \u{b7} \u{201c}${lastRun.text.slice(0, 60)}${lastRun.text.length > 60 ? '\u{2026}' : ''}\u{201d}`)}
            {kv('found', `harper ${lastRun.harper} \u{b7} llm ${lastRun.llm} \u{b7} answered by ${lastRun.route ?? 'cache or nobody'}`)}
            {lastRun.spans.map((s, i) => (
              <Box key={`span-${i}`} flexDirection="row" columnGap={1}>
                <Text dimColor>{`  ${s.name.padEnd(16)}`}</Text>
                <Text dimColor>{`${String(s.ms).padStart(5)} ms`}</Text>
                <Text color={s.error ? 'warning' : 'success'} wrap="truncate-end">
                  {s.error ?? 'ok'}
                </Text>
              </Box>
            ))}
          </Box>
        ) : (
          <Text dimColor>none yet: type an English sentence of four words or more</Text>
        )}
        <Box marginTop={1} />
        {kv('session', `cache ${cache.size} \u{b7} ignored ${ignore.size} \u{b7} spent $${spent.toFixed(4)}`)}
        <Box flexDirection="row" columnGap={2} marginTop={1}>
          <Button key="x" label="test every route" hotkey="x" plain onPress={() => void $.command.run({ command: 'bgh', args: 'test' }).catch(() => undefined)} />
          <Button key="u" label="refresh" hotkey="u" plain onPress={redraw} />
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: HELP_PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const narrow = e.props.bodyColumns < 70
    const line = (left: string, right: string) => (
      <Box key={`help-${left}`} flexDirection={narrow ? 'column' : 'row'} columnGap={1}>
        <Text color="suggestion">{left.padEnd(24)}</Text>
        <Text dimColor wrap="wrap">
          {right}
        </Text>
      </Box>
    )
    return (
      <Box flexDirection="column">
        <Text bold>Commands</Text>
        {line('/bgh', 'setup guide while something is missing, else settings')}
        {line('/bgh setup-guide', 'what this machine still needs, macOS and Linux side by side')}
        {line('/bgh settings', 'grammar, LLM route and model, delay, Langfuse, cache, ignored words')}
        {line('/bgh debug', 'versions, keys set (names only), routes, models, accepted %, last trace, last check')}
        {line('/bgh test', 'every route and Langfuse on a sample sentence, model lists refetched, live in bgh debug')}
        {line('/bgh status', 'opens bgh debug')}
        {line('/bgh help', 'this tab')}
        {line('/bgh on | off', 'switch checking on or off')}
        {line('/bgh reload', 'read the keys file again')}
        {line('/bgh ignore <word>', 'never flag this word (unignore <word> undoes it)')}
        {line('/bgh ignored', 'opens bgh settings, where the list is')}
        {line('/bgh clear-cache', 'forget the remembered LLM answers')}
        <Box marginTop={1}>
          <Text bold>In the prompt</Text>
        </Box>
        {line(applyKeys, 'apply every fix the band above the prompt shows')}
        {line(ignoreKeys, 'ignore the first flagged word from now on')}
        <Box marginTop={1}>
          <Text bold>In the tabs</Text>
        </Box>
        {line('bgh setup', 'h look for harper \u{b7} r reload keys \u{b7} x test every route')}
        {line('bgh settings', 'g grammar \u{b7} l llm \u{b7} f first route \u{b7} m model \u{b7} d delay \u{b7} t langfuse \u{b7} c cache \u{b7} 1\u{2013}9 un-ignore')}
        {line('bgh debug', 'x test every route \u{b7} u refresh')}
        {line('Tab, Esc', 'Tab walks the buttons; Esc closes the tabs')}
        <Box marginTop={1}>
          <Text dimColor wrap="wrap">
            {`B3 Grammar Helper ${RELEASE} \u{b7} keys in ${envFile}`}
          </Text>
        </Box>
      </Box>
    )
  })

  // ---- the band above the prompt: what was found, apply, ignore ------------

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const fixes = await read($, fixesAtom)
    if (e.props.hasSurvey || !fixes.length) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const first = fixes[0]

    async function apply() {
      const box = await $.prompt.read()
      if (!check || check.text !== box.text) return
      const fixed = applyIssues(box.text, box.cursor, check.issues)
      count(whoOf(check), true)
      const sent = tally
      void saveTally($, tallyBase, sent)
        .then((merged) => tallySaved(sent, merged))
        .catch(() => undefined)
      if (langfuse) {
        void fetchWithin($, `${langfuse.baseUrl}/api/public/scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader(langfuse) },
          body: scoreBody(check.traceId, 1),
        }).catch(() => undefined)
      }
      check = undefined
      gen += 1
      cancelTimers()
      await $.prompt.fill({ text: fixed.text, cursor: fixed.cursor })
      await update($, fixesAtom, () => [])
      bandShown = false
    }

    async function ignoreFirst() {
      if (!check || !first?.from) return
      ignore = new Set(await saveWords($, [normalizeWord(first.from)], []))
      check.issues = dropIgnored(check.text, check.issues, ignore)
      await $.prompt.paint({ text: check.text, decorations: decorations(check.issues) })
      const left = fixesOf(check.text, check.issues)
      await update($, fixesAtom, () => left)
      bandShown = left.length > 0
      $.ui.toast(`Grammar: ignoring \u{201c}${normalizeWord(first.from)}\u{201d} from now on`)
    }

    return (
      <Box>
        <Text dimColor>grammar {'\u{b7}'} {sourcesOf(fixes)} </Text>
        <Text>{fixes.map((f) => `${f.from || '\u{b7}'}\u{2192}${f.to || '\u{2205}'}`).join('  ')} </Text>
        <Button key="apply" label={`apply (${applyKeys})`} action={APPLY_ACTION} onPress={apply} />
        {first?.from ? (
          <Button key="ignore" label={`ignore \u{201c}${first.from}\u{201d} (${ignoreKeys})`} action={IGNORE_ACTION} onPress={ignoreFirst} />
        ) : null}
      </Box>
    )
  })

  // ---- the check, started by each edit -------------------------------------

  on('prompt.edit', async ($, e, next) => {
    const box = await next(e)
    const text = box.text

    // Harper installed after the session started: look again, at most every 30 s.
    if (!harperOk && Date.now() - harperProbedAt > 30_000) {
      harperProbedAt = Date.now()
      void $.process
        .run(['harper-cli', '--version'], { timeoutMs: 5000 })
        .then((r) => {
          harperOk = r.exitCode === 0
          harperVersion = harperOk ? r.stdout.trim() : ''
          if (harperOk) $.ui.toast('Grammar: Harper found')
        })
        .catch(() => undefined)
    }

    gen += 1
    cancelTimers()
    if (check && check.text !== text) check = undefined
    if (bandShown) {
      bandShown = false
      void update($, fixesAtom, () => [])
    }
    if (!prefs.enabled || !shouldCheck(text)) return box

    const c: Check = {
      gen,
      text,
      traceId: hexId(16),
      startedAt: Date.now(),
      harper: [],
      llm: [],
      issues: [],
      spans: [],
      shown: false,
    }

    async function repaint() {
      if (stale(c)) return
      c.issues = dropIgnored(c.text, merge(c.harper, c.llm, protectedRanges(c.text)), ignore)
      check = c
      const decos = decorations(c.issues)
      // A module that never calls $.prompt.read is handed the empty box, and paint then
      // never matches. Reading first also catches a draft that moved on since the check.
      const before = await $.prompt.read()
      if (before.text !== c.text || stale(c)) return
      const painted = await $.prompt.paint({ text: c.text, decorations: decos })
      void $.fs
        .write(
          paintPath,
          JSON.stringify({ at: new Date().toISOString(), text: c.text, issues: c.issues, painted }, null, 2),
        )
        .catch(() => undefined)
      if (!painted.isPainted || stale(c)) return
      const fixes = fixesOf(c.text, c.issues)
      await update($, fixesAtom, () => fixes)
      bandShown = fixes.length > 0
      if (fixes.length) c.shown = true
    }

    // Stage 1: Harper, offline.
    async function runHarper() {
      if (!harperOk || stale(c)) return
      const t0 = Date.now()
      try {
        await $.fs.write(draftPath, c.text)
        const out = await $.process.run(['harper-cli', 'lint', '--format', 'json', draftPath], { timeoutMs: 5000 })
        if (stale(c)) return
        c.harper = parseHarper(out.stdout, c.text)
        c.spans.push({
          name: 'harper',
          startMs: t0,
          endMs: Date.now(),
          attrs: {
            'langfuse.observation.type': 'span',
            'langfuse.observation.output': JSON.stringify(c.harper),
            'langfuse.observation.metadata.lints': c.harper.length,
          },
        })
        await repaint()
      } catch (err) {
        c.spans.push({
          name: 'harper',
          startMs: t0,
          endMs: Date.now(),
          attrs: {
            'langfuse.observation.type': 'span',
            'langfuse.observation.level': 'ERROR',
            'langfuse.observation.status_message': String(err),
          },
        })
      }
    }

    async function callHop(hop: Hop, user: string): Promise<HopResult> {
      if (hop.route === 'claude') {
        const r = await $.model.complete({
          model: hop.model,
          system: SYSTEM_PROMPT,
          prompt: user,
          maxTokens: 400,
          timeoutMs: HOP_TIMEOUT_MS,
        })
        if (!r.isAnswered) return { error: String(r.reason) }
        // Haiku through the session bills the session's plan: no per-call cost to add.
        return { content: r.text, usage: { input: r.usage.input_tokens, output: r.usage.output_tokens } }
      }
      const req = chatRequest(hop as Hop & { route: ApiRoute }, user)
      const res = await fetchWithin($, req.url, { method: 'POST', headers: req.headers, body: req.body }, HOP_TIMEOUT_MS)
      if (!res.ok) return { error: `HTTP ${res.status}: ${res.text.slice(0, 200)}` }
      return parseChat(res.text)
    }

    async function sendTrace() {
      if (!langfuse || !c.spans.length) return
      const root: SpanRecord = {
        name: 'prompt-check',
        startMs: c.startedAt,
        endMs: Date.now(),
        attrs: {
          'langfuse.trace.name': 'prompt-check',
          'langfuse.trace.tags': [c.route ?? 'harper-only', ...(c.by ? [shortModel(c.by.split(' ').pop() ?? c.by)] : [])],
          'langfuse.trace.metadata.model': whoOf(c),
          'langfuse.release': RELEASE,
          'langfuse.trace.metadata.host': host,
          'langfuse.observation.input': c.text,
          'langfuse.observation.output': JSON.stringify(c.issues),
        },
      }
      try {
        const res = await fetchWithin($, `${langfuse.baseUrl}/api/public/otel/v1/traces`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader(langfuse),
            'x-langfuse-ingestion-version': '4',
          },
          body: otlpTrace(c.traceId, root, c.spans, RELEASE),
        })
        const problem = res.ok ? '' : `Langfuse refused the trace (HTTP ${res.status})`
        if (problem && problem !== lastLangfuseError) $.ui.toast(problem)
        lastLangfuseError = problem
        lastTrace = { at: Date.now(), ok: res.ok, detail: res.ok ? 'ok' : `HTTP ${res.status}` }
      } catch (err) {
        const problem = `Langfuse unreachable: ${String(err).slice(0, 60)}`
        if (problem !== lastLangfuseError) $.ui.toast(problem)
        lastLangfuseError = problem
        lastTrace = { at: Date.now(), ok: false, detail: 'unreachable' }
      }
      // The settings pane shows this; a write to rev draws it again if it's open.
      void update($, revAtom, (n) => n + 1)
    }

    // Stage 2: the LLM chain, on every sentence the cache hasn't seen. Harper's fixes were the
    // instant preview; where the LLM's touch the same words, the LLM's win (merge).
    async function runLlm() {
      if (stale(c)) return
      const all = sentences(c.text).filter((s) => wordCount(s.text) >= 3)
      const todo = all.filter((s) => !cache.has(s.text))
      for (const s of all) {
        const hit = cache.get(s.text)
        if (!hit) continue
        for (const issue of placeEdits(s, hit)) {
          const by = hit.find((h) => h.from === c.text.slice(issue.start, issue.end))?.by
          c.llm.push({ ...issue, by: by ? `${by} (cached)` : 'cache' })
        }
      }
      if (todo.length && hops.length) {
        const user = userPrompt(todo.map((s) => s.text))
        for (const hop of hops) {
          if (stale(c)) return
          const t0 = Date.now()
          let result: HopResult
          try {
            result = await callHop(hop, user)
          } catch (err) {
            result = { error: String(err) }
          }
          const edits = 'content' in result ? parseEdits(result.content) : undefined
          const failed =
            'error' in result ? result.error : edits === undefined ? 'reply was not the JSON asked for' : undefined
          c.spans.push({
            name: `llm:${hop.route}`,
            startMs: t0,
            endMs: Date.now(),
            attrs: {
              'langfuse.observation.type': 'generation',
              'langfuse.observation.model.name': hop.model,
              'langfuse.observation.input': user,
              'langfuse.observation.output': 'content' in result ? result.content : undefined,
              'langfuse.observation.usage_details':
                'usage' in result ? JSON.stringify({ input: result.usage.input, output: result.usage.output }) : undefined,
              'langfuse.observation.cost_details':
                'usage' in result && result.usage.cost !== undefined
                  ? JSON.stringify({ total: result.usage.cost })
                  : undefined,
              'langfuse.observation.level': failed ? 'ERROR' : undefined,
              'langfuse.observation.status_message': failed,
              'langfuse.observation.metadata.route': hop.route,
            },
          })
          if (failed || !edits) continue
          if ('usage' in result && result.usage.cost) spent += result.usage.cost
          c.route = hop.route
          const by = `${hop.route} ${shortModel(hop.model)}`
          c.by = by
          const ours: [string, CachedEdit[]][] = []
          todo.forEach((s, i) => {
            const mine = edits.filter((x) => x.i === i).map(({ from, to }) => ({ from, to, by }))
            cache.set(s.text, mine)
            ours.push([s.text, mine])
            c.llm.push(...placeEdits(s, mine).map((issue) => ({ ...issue, by })))
          })
          while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string)
          void saveCache($, ours)
            .then((merged) => {
              cache = new Map(merged)
            })
            .catch(() => undefined)
          break
        }
      }
      try {
        await repaint()
      } catch {
        // the prompt moved on or the engine refused the paint: the record and trace still go out
      }
      // What /bgh debug shows as the last check: counts, who answered, each stage's time and error.
      lastRun = {
        at: Date.now(),
        text: c.text,
        harper: c.harper.length,
        llm: c.llm.length,
        route: c.route,
        spans: c.spans.map((sp) => {
          const err = sp.attrs['langfuse.observation.status_message']
          return { name: sp.name, ms: sp.endMs - sp.startMs, error: typeof err === 'string' ? err.slice(0, 120) : undefined }
        }),
      }
      void update($, revAtom, (n) => n + 1)
      void sendTrace().catch(() => undefined)
    }

    let harperDone: Promise<void> = Promise.resolve()
    timers.push(
      $.clock.after(HARPER_DELAY_MS, () => {
        harperDone = runHarper()
      }),
      $.clock.after(prefs.llmDelayMs, () => {
        void harperDone.then(runLlm).catch(() => undefined)
      }),
    )
    return box
  })

  // History recall, a clear, a fill (ours included): whatever showed no longer fits.
  on('prompt.change', async ($, e, next) => {
    gen += 1
    cancelTimers()
    check = undefined
    if (bandShown) {
      bandShown = false
      void update($, fixesAtom, () => [])
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    // Sent with fixes still showing: the person passed them up.
    const passed = check?.shown && check.issues.length ? check : undefined
    check = undefined
    gen += 1
    cancelTimers()
    if (bandShown) {
      bandShown = false
      void update($, fixesAtom, () => [])
    }
    if (passed) {
      count(whoOf(passed), false)
      const sent = tally
      void saveTally($, tallyBase, sent)
        .then((merged) => tallySaved(sent, merged))
        .catch(() => undefined)
    }
    if (passed && langfuse) {
      void fetchWithin($, `${langfuse.baseUrl}/api/public/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader(langfuse) },
        body: scoreBody(passed.traceId, 0),
      }).catch(() => undefined)
    }
    return next(e)
  })
}
