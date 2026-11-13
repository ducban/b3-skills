import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'

import type { Fix } from '../types'
import {
  applyIssues,
  availableRoutes,
  cycle,
  dirsFor,
  ENV_TEMPLATE,
  HARPER_RELEASES,
  needsTemplate,
  LLM_DELAYS,
  MODEL_CHOICES,
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

const RELEASE = '0.5.0'
const HARPER_DELAY_MS = 300
const HOP_TIMEOUT_MS = 6000
const CACHE_KEY = 'llm-cache-v1'
const IGNORE_KEY = 'ignore-v1'
const PREFS_KEY = 'prefs-v1'
const PANE = 'bgh-settings'
const CACHE_MAX = 400

// Engine keybinding actions that have no handler while the chat is up. The band's Buttons take
// them, so the chords the person binds to them (alt+a, alt+i) press the Buttons from the prompt.
const APPLY_ACTION = 'app:cycleDiffBase'
const IGNORE_ACTION = 'app:toggleDiffNoiseFilter'

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
  shown: boolean
}

type HopResult = { content: string; usage: Usage } | { error: string }

// One sentence's LLM edits as kept across sessions, with the route and model that made them.
type CachedEdit = Omit<Edit, 'i'> & { by?: string }

const authHeader = (k: LangfuseKeys) => `Basic ${base64(`${k.publicKey}:${k.secretKey}`)}`
const scoreBody = (traceId: string, value: 0 | 1) =>
  JSON.stringify({ traceId, name: 'accepted', value, dataType: 'NUMERIC' })

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
  let harperProbedAt = 0
  let prefs: Prefs = readPrefs(undefined)
  let draftPath = ''

  let gen = 0
  let check: Check | undefined
  let bandShown = false
  let timers: Timer[] = []
  let cache = new Map<string, CachedEdit[]>()
  let ignore = new Set<string>()
  let spent = 0

  const stale = (c: Check) => c.gen !== gen

  function cancelTimers() {
    for (const t of timers) t.cancel()
    timers = []
  }

  // Merge the .env file under the process environment, then derive the routes from it.
  function applyEnv(fileText: string | undefined) {
    env = { ...(fileText ? parseDotenv(fileText) : {}) }
    for (const [k, v] of Object.entries(processEnv)) if (v?.trim()) env[k] = v
    hops = chain(env, prefs)
    langfuse = prefs.langfuse ? langfuseKeys(env) : undefined
  }

  const modelName = (m: string) => m.replace(/^accounts\/fireworks\/models\//, '')

  // The settings view: one fact per line, for `/bgh` and `settings`.
  function settings(): string {
    const llm = hops.map((h) => `${h.route} ${modelName(h.model)}`)
    return [
      `B3 Grammar Helper (bgh) ${RELEASE}  ${prefs.enabled ? 'on' : 'OFF'}`,
      `harper    ${harperOk ? 'on' : `missing: install harper-cli from ${HARPER_RELEASES}`}`,
      `llm       ${llm.length ? llm.join(' → ') : 'off'}`,
      `langfuse  ${langfuse ? `on (${langfuse.baseUrl})` : langfuseKeys(env) ? 'off (switched off)' : 'off (no keys)'}`,
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
          await $.fs.write(envFile, old)
          await $.process.run(['chmod', '600', envFile], { timeoutMs: 2000 }).catch(() => undefined)
          fileText = old
          $.ui.toast(`Grammar: keys moved from ${legacy} to ${envFile}`)
        }
      } catch {
        // no old file either
      }
    }
    // A new machine gets the template, so there's a file with every key name to fill in. Never
    // over a file that already holds a value.
    if (needsTemplate(fileText)) {
      try {
        await $.fs.write(envFile, ENV_TEMPLATE)
        // Keys are secrets: owner-only where chmod exists (not on Windows, hence the catch).
        await $.process.run(['chmod', '600', envFile], { timeoutMs: 2000 }).catch(() => undefined)
        if (fileText === undefined) $.ui.toast(`Grammar: key template written to ${envFile}`)
      } catch {
        // read-only home: the environment alone
      }
    }
    lastEnvFile = fileText
    applyEnv(fileText)

    // $.fs.write makes the folder on first write, so no mkdir (which Windows lacks).
    draftPath = `${dirs.cache}${dirs.sep}draft.md`
    try {
      harperProbedAt = Date.now()
      harperOk = (await $.process.run(['harper-cli', '--version'], { timeoutMs: 5000 })).exitCode === 0
    } catch {
      harperOk = false
    }
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
      description: 'Grammar ghost text. No args opens the settings pane. Args: status | on | off | reload | ignore <word> | unignore <word>',
    })
    // Clears the line earlier versions pinned under the prompt.
    $.ui.status(undefined)
    return started
  })

  // ---- the command ---------------------------------------------------------

  // Settings changes shared by the command and the pane. It touches no $, so each caller saves
  // and redraws with its own.
  let lastEnvFile: string | undefined
  function setPrefs(change: Partial<Prefs>) {
    prefs = { ...prefs, ...change }
    applyEnv(lastEnvFile)
    gen += 1
    cancelTimers()
    check = undefined
  }

  on('command.run', { command: 'bgh' }, async ($, e) => {
    const [verb = '', ...rest] = e.args.trim().split(/\s+/)
    const word = normalizeWord(rest.join(' '))
    const save = async () => {
      await $.store.set(PREFS_KEY, prefs)
      await update($, revAtom, (n) => n + 1)
    }
    switch (verb.toLowerCase()) {
      case 'on':
      case 'off':
        setPrefs({ enabled: verb.toLowerCase() === 'on' })
        await save()
        if (!prefs.enabled) {
          void $.prompt.paint({ decorations: [] })
          await update($, fixesAtom, () => [])
        }
        break
      case 'reload': {
        try {
          lastEnvFile = String(await $.fs.read(envFile))
        } catch {
          lastEnvFile = undefined
        }
        applyEnv(lastEnvFile)
        await update($, revAtom, (n) => n + 1)
        return { text: `${lastEnvFile === undefined ? `No file at ${envFile}` : 'Reloaded.'}\n${settings()}` }
      }
      case 'ignore':
        if (!word) return { text: 'Usage: /bgh ignore <word>' }
        ignore.add(word)
        await $.store.set(IGNORE_KEY, [...ignore])
        await update($, revAtom, (n) => n + 1)
        return { text: `Ignoring “${word}”. ${ignore.size} word(s) on the list.` }
      case 'unignore':
        if (!word) return { text: 'Usage: /bgh unignore <word>' }
        ignore.delete(word)
        await $.store.set(IGNORE_KEY, [...ignore])
        await update($, revAtom, (n) => n + 1)
        return { text: `“${word}” is checked again.` }
      case 'ignored':
        return { text: ignore.size ? [...ignore].sort().join(', ') : 'Nothing ignored yet.' }
      case '':
      case 'settings': {
        const opened = await $.ui.open({ id: PANE, title: 'B3 Grammar Helper', focus: true, closeOnEscape: true })
        // A surface that can't seat the pane gets the text view instead.
        if (opened.isPlaced) return { text: 'Grammar settings open. Esc closes them.' }
        break
      }
      case 'status':
        break
      default:
        return { text: `Unknown: ${verb}. Try: settings | status | on | off | reload | ignore <word> | unignore <word>` }
    }
    return { text: settings() }
  })

  // ---- the settings pane: one key per setting, as /sl-settings does ---------

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    await read($, revAtom)
    const { Box, Text, Button } = $.ui.resolve(e)
    const narrow = e.props.bodyColumns < 70
    const redraw = () => void update($, revAtom, (n) => n + 1)
    const save = () => {
      void $.store.set(PREFS_KEY, prefs)
      redraw()
    }

    const routes = availableRoutes(env)
    const firstRoute: Route = prefs.first !== 'auto' ? prefs.first : (hops[0]?.route ?? 'claude')
    const choices = MODEL_CHOICES[firstRoute]
    const firstModel = prefs.models[firstRoute] ?? hops.find((h) => h.route === firstRoute)?.model ?? choices[0] ?? ''
    const onOff = (b: boolean) => (b ? 'on' : 'off')

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

    const words = [...ignore].sort().slice(0, 9)
    const llmLine = hops.length ? hops.map((h) => `${h.route} ${modelName(h.model)}`).join(' → ') : 'off'

    return (
      <Box flexDirection="column">
        <Text dimColor wrap="wrap">
          A key changes its setting, kept across sessions. API keys stay in the .env file.
        </Text>
        <Text bold>Checking</Text>
        {row('g', 'grammar', onOff(prefs.enabled), prefs.enabled, 'check the prompt as you type', () => {
          setPrefs({ enabled: !prefs.enabled })
          if (!prefs.enabled) {
            void $.prompt.paint({ decorations: [] })
            void update($, fixesAtom, () => [])
          }
          save()
        })}
        {row('h', 'harper', harperOk ? 'found' : 'missing', harperOk, harperOk ? 'offline first pass · press to look again' : `install harper-cli (${HARPER_RELEASES}), then press h`, () => {
          void $.process
            .run(['harper-cli', '--version'], { timeoutMs: 5000 })
            .then((r) => {
              harperOk = r.exitCode === 0
            })
            .catch(() => {
              harperOk = false
            })
            .finally(redraw)
        })}
        {row('l', 'llm', onOff(prefs.llm), prefs.llm, 'second pass: word choice and phrasing', () => {
          setPrefs({ llm: !prefs.llm })
          save()
        })}
        {row('f', 'first', prefs.first, prefs.first !== 'auto', `route tried first · can run: ${routes.join(', ')}`, () => {
          setPrefs({ first: cycle<Route | 'auto'>(['auto', ...routes], prefs.first) })
          save()
        })}
        {row('m', 'model', modelName(firstModel), !!prefs.models[firstRoute], `${firstRoute}: ${choices.map(modelName).join(', ')}`, () => {
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
        <Text bold>Tracing and cost</Text>
        {row('t', 'langfuse', langfuseKeys(env) ? onOff(prefs.langfuse) : 'no keys', !!langfuse, langfuse ? langfuse.baseUrl : 'LANGFUSE_* keys go in the .env file', () => {
          setPrefs({ langfuse: !prefs.langfuse })
          save()
        })}
        {row('c', 'cache', `${cache.size} kept`, cache.size > 0, `press to forget the LLM answers · spent ${spent ? `$${spent.toFixed(4)}` : '$0'} this session`, () => {
          cache.clear()
          void $.store.set(CACHE_KEY, [])
          redraw()
        })}
        {row('r', 'reload', 'keys', true, envFile, () => {
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
        })}
        <Text bold>{ignore.size > 9 ? `Ignored words (first 9 of ${ignore.size})` : 'Ignored words'}</Text>
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
                  void $.store.set(IGNORE_KEY, [...ignore])
                  redraw()
                  $.ui.toast(`Grammar: “${w}” is checked again`)
                }}
              />
            ))}
          </Box>
        ) : (
          <Text dimColor>none yet: alt+i on the band ignores a word</Text>
        )}
        {words.length ? <Text dimColor>a number puts that word back in the check</Text> : null}
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
      if (langfuse) {
        void $.http
          .fetch(`${langfuse.baseUrl}/api/public/scores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: authHeader(langfuse) },
            body: scoreBody(check.traceId, 1),
          })
          .catch(() => undefined)
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
      ignore.add(normalizeWord(first.from))
      await $.store.set(IGNORE_KEY, [...ignore])
      check.issues = dropIgnored(check.text, check.issues, ignore)
      await $.prompt.paint({ text: check.text, decorations: decorations(check.issues) })
      const left = fixesOf(check.text, check.issues)
      await update($, fixesAtom, () => left)
      bandShown = left.length > 0
      $.ui.toast(`Grammar: ignoring “${normalizeWord(first.from)}” from now on`)
    }

    return (
      <Box>
        <Text dimColor>grammar · {sourcesOf(fixes)} </Text>
        <Text>{fixes.map((f) => `${f.from || '·'}→${f.to || '∅'}`).join('  ')} </Text>
        <Button key="apply" label="apply (alt+a)" action={APPLY_ACTION} onPress={apply} />
        {first?.from ? (
          <Button key="ignore" label={`ignore “${first.from}” (alt+i)`} action={IGNORE_ACTION} onPress={ignoreFirst} />
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
          draftPath.replace(/draft\.md$/, 'last-paint.json'),
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

    function timeout(ms: number): Promise<never> {
      // The module has no setTimeout; the engine's clock stands in.
      return new Promise((_, reject) => {
        timers.push($.clock.after(ms, () => reject(new Error(`timeout after ${ms}ms`))))
      })
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
      const res = await Promise.race([
        $.http.fetch(req.url, { method: 'POST', headers: req.headers, body: req.body }),
        timeout(HOP_TIMEOUT_MS),
      ])
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
          'langfuse.trace.tags': [c.route ?? 'harper-only'],
          'langfuse.release': RELEASE,
          'langfuse.trace.metadata.host': host,
          'langfuse.observation.input': c.text,
          'langfuse.observation.output': JSON.stringify(c.issues),
        },
      }
      try {
        const res = await $.http.fetch(`${langfuse.baseUrl}/api/public/otel/v1/traces`, {
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
      } catch (err) {
        const problem = `Langfuse unreachable: ${String(err).slice(0, 60)}`
        if (problem !== lastLangfuseError) $.ui.toast(problem)
        lastLangfuseError = problem
      }
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
          todo.forEach((s, i) => {
            const mine = edits.filter((x) => x.i === i).map(({ from, to }) => ({ from, to, by }))
            cache.set(s.text, mine)
            c.llm.push(...placeEdits(s, mine).map((issue) => ({ ...issue, by })))
          })
          while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string)
          void $.store.set(CACHE_KEY, [...cache.entries()])
          break
        }
      }
      await repaint()
      void sendTrace()
    }

    let harperDone: Promise<void> = Promise.resolve()
    timers.push(
      $.clock.after(HARPER_DELAY_MS, () => {
        harperDone = runHarper()
      }),
      $.clock.after(prefs.llmDelayMs, () => {
        void harperDone.then(runLlm)
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
    if (passed && langfuse) {
      void $.http
        .fetch(`${langfuse.baseUrl}/api/public/scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader(langfuse) },
          body: scoreBody(passed.traceId, 0),
        })
        .catch(() => undefined)
    }
    return next(e)
  })
}
