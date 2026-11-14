# Code Review Log

## Writing Standard
- Language: English only.
- Tone: Technical, concise, objective, and evidence-based.
- Ordering: Findings listed by severity (`High`, `Medium`, `Low`).
- Evidence: Every finding includes at least one concrete file reference (`path:line`).
- Actionability: Every finding includes a clear recommendation.
- Validation: Verification notes must be based on actual checks (inspection and/or command output).
- Lifecycle: Each finding includes `Status`: `New`, `Still Open`, `Fixed`, `Regressed`, or `Not Reproducible`.

### Entry ID Convention
- Required field for every entry: `Entry ID`
- Format: `CR-YYYYMMDD-###`
- Example: `CR-20260221-001`

---

## CR-20261114-001

- **Entry ID**: CR-20261114-001
- **Supersedes**: none (first review)
- **Scope**: Whole repository at `d91eb8b`: `mods/bgh` (0.9.0), `mods/status-line` (0.3.1), `skills/b3-code-review` and `skills/b3-code-fix` (scripts), `dev/b3-write-human/do-luong` (Python tooling), `.gitignore`. Skill prose (`SKILL.md` and reference `.md` files) and `figlib.mjs` were not reviewed.

### Validation Matrix

No prior entries. All findings below are `New`.

### Findings

#### High

**1. status-line: the 0.3.0 migration marker blocks the 0.3.1 migration fix**
- Evidence: `mods/status-line/hooks/register.ts:1636-1640`. Any string in `migratedFrom` returns early. Version 0.3.0 (`134547d`) wrote the name of the newest `sl-mod_*` store, which held only the usage cache.
- Impact: Every machine that ran 0.3.0 keeps default layout, guard and coldGate settings permanently; 0.3.1's "newest store that has any settings" scan never runs there.
- Recommendation: Re-run the scan when the marked file holds none of `CARRIED_KEYS`, or rename the marker key (e.g. `migratedFrom2`). Add a test that starts with a 0.3.0-style marker.
- Status: New

#### Medium

**2. bgh: shared Harper draft file across sessions**
- Evidence: `mods/bgh/hooks/register.tsx:393` sets a fixed `<cache>/draft.md`; `:1201-1202` writes then lints it.
- Impact: Two sessions typing at once overwrite each other's draft between write and lint; session A paints session B's lint offsets onto its own prompt. `stale(c)` only compares the in-session `gen`.
- Recommendation: Use a per-check file name (e.g. `draft-<random>.md`) or pass text via stdin if `harper-cli` supports it.
- Status: New

**3. bgh: model tally credits the LLM hop even when only Harper fixes were shown**
- Evidence: `mods/bgh/hooks/register.tsx:256` (`whoOf` prefers `c.by`); `:1349-1350` set `c.by` whenever a hop returns, including `{"edits":[]}`. Same skew in Langfuse metadata at `:1268`.
- Impact: README:114 calls the tally "the number to pick a model by", but accepts/pass-ups of Harper-only fixes are counted for whichever model answered last.
- Recommendation: Attribute to the model only when `c.issues` contains an `llm`-sourced issue from it; otherwise `'harper'`.
- Status: New

**4. bgh: store read once per session, then overwritten whole (lost updates)**
- Evidence: `mods/bgh/hooks/register.tsx:373` (load at `session.start`); whole-object writes at `:542`, `:1091`, `:1358`, `:1415`.
- Impact: The `$.store` file is per machine, not per session. With two sessions open, the later writer erases the other's tally deltas and ignore-list additions.
- Recommendation: Re-read before write and merge (add tally deltas, union ignore sets).
- Status: New

**5. bgh: unhandled rejections on fire-and-forget paths**
- Evidence: `mods/bgh/hooks/register.tsx:1362` and `:1385` call `await repaint()` outside try inside `runLlm`, which runs as `void harperDone.then(runLlm)` with no `.catch`. Also `:566`, `:383-389`, `:847`, `:908`.
- Impact: A throw from `$.prompt.read`/`paint` or `$.store.set` becomes an unhandled rejection; `lastRun` and `sendTrace` are skipped silently. `runHarper` already wraps `repaint` in try, so the two paths disagree.
- Recommendation: Add `.catch` to every `void` promise chain, or wrap `repaint()` in `runLlm` in try.
- Status: New

**6. bgh: HTTP calls other than the chat LLM have no timeout (Plausible)**
- Evidence: `mods/bgh/hooks/register.tsx:179`, `:632`, `:1094`, `:1276`, `:1419` call `$.http.fetch` without the `Promise.race` timer used for the chat hop.
- Impact: `/bgh test` awaits Langfuse inside `command.run`; a blackholed `LANGFUSE_BASE_URL` can hang the command and leave the debug tab on `testing…`, unless `$.http.fetch` has an engine default timeout (not verified).
- Recommendation: Add a top-level `fetchWithTimeout($, …)` helper and use it for every fetch.
- Status: New

**7. bgh and status-line: raw non-ASCII in source, against the `\u{…}` rule**
- Evidence: `mods/bgh/hooks/register.tsx:544`, `:711`, `:741`, `:982`, `:1124` (45 code lines in total); `mods/bgh/hooks/core.ts:27`, `:109`, `:344`, `:512`; `mods/status-line/hooks/register.ts:2415` (`▰▱▱▱▱` in a string literal).
- Impact: CLAUDE.md "Writing mods" requires escapes because a rewrite or encoding change can drop these bytes unnoticed (the ICON incident).
- Recommendation: Convert string and regex literals to `\u{…}` escapes; comments may stay.
- Status: New

**8. status-line guard: shell variables reported as "delete nothing"**
- Evidence: `mods/status-line/hooks/register.ts:1152` (`shellWords` keeps `$VAR`/`$(…)` literally), `:1186` (`RM_SCRIPT` tests `-e` on the literal).
- Impact: `rm -rf "$TMPDIR/build"` is shown as "delete nothing: no file matches $TMPDIR/build"; the user approves believing it harmless.
- Recommendation: When a target contains `$` or a backtick, report "can't measure: expands at run time".
- Status: New

**9. status-line guard: `git reset --hard <ref>` measures only uncommitted changes**
- Evidence: `mods/status-line/hooks/register.ts:1260-1266` ignores `rest` (the target ref).
- Impact: `git reset --hard HEAD~3` on a clean tree shows "discard nothing", while three commits leave the branch.
- Recommendation: With a ref, also list `git log --oneline <ref>..HEAD`.
- Status: New

**10. status-line guard: classifier over- and under-matches**
- Evidence: `mods/status-line/hooks/register.ts:1081-1086` splits on `;|&\n` before handling quotes; `:1124` matches force push only as `-f`; `sudo` strips flags but not flag values.
- Impact: A commit message or heredoc containing `rm -rf build` is held (false positive); `sudo -u root rm -rf /x` and `git push -uf origin main` pass (false negatives).
- Recommendation: Quote-aware splitting, skip sudo flag values, match push flags with `/^-[^-]*f/`. Add a table-driven classifier test.
- Status: New

**11. Tooling: `do.py` reports 0 alerts when Vale fails**
- Evidence: `dev/b3-write-human/do-luong/do.py:12-13` ignores the return code and parses only stdout (`out or "{}"`). Vale writes config errors to stderr with exit 2 (checked: `vale --config /nonexistent.ini` → `E100`, exit 2, empty stdout).
- Impact: A broken `.vale.ini` or missing style yields "0 lỗi · 0.0/1.000 chữ", which reads as a perfect score in a before/after measurement.
- Recommendation: Check `returncode` (Vale exits 1 for alerts, 2 for errors) and exit non-zero with stderr on 2; fail clearly if `vale` is not on PATH.
- Status: New

**12. Repo: CLAUDE.md has no Build & Test section, which both review skills require**
- Evidence: `skills/b3-code-review/SKILL.md` "Verification Notes" and `skills/b3-code-fix/SKILL.md:49` point to "the Build & Test section in `CLAUDE.md`"; `CLAUDE.md` has none (only test pitfalls at `CLAUDE.md:75-78`).
- Impact: Fix entries cannot state which commands must pass; this review had to infer them.
- Recommendation: Add a Build & Test section listing, per mod: `claude plugin validate .`, `claude plugin test .` (status-line), `bun test tests/` (bgh), type-check; and for the skill tooling `python3 dev/b3-write-human/do-luong/sinh-tu-sao.py --check`.
- Status: New

#### Low

**13. status-line: migration writes a permanent `'none'` on any error**
- Evidence: `mods/status-line/hooks/register.ts:1657` reads `saved[key]` outside the per-file try; a store containing JSON `null` throws into the outer catch, which records `'none'`.
- Impact: Older usable stores are skipped forever; a transient `fs.list` error also pins `'none'`.
- Recommendation: Require `saved` to be a non-null object; do not write the marker after an error.
- Status: New

**14. status-line: cold gate and effort override edge cases (Plausible)**
- Evidence: `mods/status-line/hooks/register.ts:2092-2107` and `:1755-1773` (no reset of `cacheWarmAt`/`coldAskedAt`/`mainMessages` on `classic.SessionStart`); `:1865` (effort override sent for every request, including subagents and `e.effort === undefined`).
- Impact: After `/clear` the first prompt can be dropped as "re-reads the whole transcript" on an empty transcript; `/sl effort max` may send effort to a subagent model that rejects it.
- Recommendation: Reset the three variables on SessionStart; override only when `typeof e.effort === 'string'`, and consider main loop only.
- Status: New

**15. status-line: `cost` and `turn` cells show dollars**
- Evidence: `mods/status-line/hooks/register.ts:303`, `:1454-1471` render `$ 1.23`; the help pane at `:2458` says tokens, not dollars.
- Impact: Conflicts with the standing decision "Tokens, never dollars". No price table is involved (engine-supplied value).
- Recommendation: Ban confirms an intended exception (and records it in CLAUDE.md) or the cells are removed.
- Status: New

**16. bgh: key file briefly world-readable during migration**
- Evidence: `mods/bgh/hooks/register.tsx:347` writes `.env` with default umask, `:362` then runs `chmod 600` and swallows its failure.
- Impact: The API key file stays 644 if chmod fails, and is 644 for a short window regardless.
- Recommendation: Pass mode 0o600 to the write if `$.fs.write` supports it; otherwise toast when chmod fails.
- Status: New

**17. Docs and help text disagree with code**
- Evidence: `mods/bgh/hooks/register.tsx:98` (HELP says `/bgh status` is a text summary; `:513` opens the debug tab); `:751` hardcodes `~/.config/bgh/.env` (wrong with `B3_GRAMMAR_ENV_FILE` or on Windows); `:480` comment says three panes, there are four. `mods/status-line/hooks/register.ts:1681` `/sl` description lists 7 verbs and omits `restore`.
- Impact: Typeahead and help mislead.
- Recommendation: Align HELP, the env-file sentence (use `envFile`) and the `/sl` description with the code.
- Status: New

**18. bgh: per-session counters never reset (Plausible)**
- Evidence: `mods/bgh/hooks/register.tsx:202-203`, `:217` (`spent`, `lastProbe`, `lastRun` at `register` scope); labelled "this session" at `:298`, `:906`.
- Impact: If the module survives `/clear`, spend accumulates under a "this session" label.
- Recommendation: Reset in `session.start`.
- Status: New

**19. Tooling: `sinh-tu-sao.py` emits phrases as unescaped regex inside single-quoted YAML**
- Evidence: `dev/b3-write-human/do-luong/sinh-tu-sao.py:36` (`'{t}'`), `:28-31` (only `…` is converted; `.`, `(`, `?` pass through as regex).
- Impact: A future phrase with `'` breaks the YAML; one with `.` or `(` matches more or fails in Vale. Current 28 phrases are fine (`--check` passes).
- Recommendation: `re.escape` literal parts and double any `'`.
- Status: New

**20. Repo: project-scoped `npx skills add` left untracked installer files**
- Evidence: `git status` shows `?? .agents/`, `?? .claude/`, `?? .crush/`, `?? skills-lock.json`; `.gitignore` covers none of them. `.claude/skills/b3-code-review` points at `../../.agents/skills/b3-code-review`, a copy of `skills/b3-code-review` from GitHub.
- Impact: Easy to commit by accident with `git add -A`; inside this repo the agent loads the GitHub copy, not the working-tree skill being edited.
- Recommendation: Install globally (`npx skills add ducban/b3-skills -g`), delete the four paths, and add them to `.gitignore`.
- Status: New

### Verification Notes

| Check | Result |
|---|---|
| `bun test tests/` in `mods/bgh` | Pass: 40 pass, 0 fail, 104 expect |
| `claude plugin validate .` in `mods/bgh` | Pass, 1 warning `ICON_MISSING` |
| `claude plugin test .` in `mods/bgh` | No tests found (bgh uses `*.spec.ts` under `tests/`, not `*.test.ts`) |
| `claude plugin validate .` in `mods/status-line` | Pass, 1 warning `ICON_MISSING`; lists 9 gating hooks without `.catch`, none calls a bare `$.process.run` |
| `claude plugin test .` in `mods/status-line` | Pass, 41/41 |
| `python3 dev/b3-write-human/do-luong/sinh-tu-sao.py --check` | Pass: 28 phrases in sync |
| `diff` of the two `archive-reviews.sh` copies | Identical |
| Version check | bgh `plugin.json` 0.9.0 = `RELEASE` (`register.tsx:72`); status-line `plugin.json` 0.3.1 = README/README.vi |
| `tsc` | Not run (would write `.js` into the tree without engine types) |

### Residual Risks / Testing Gaps

- `mods/bgh/hooks/register.tsx` (1,428 lines) has no engine tests; only `core.ts` is covered. Untested: `gen`/`stale` with typing during an LLM call, tally attribution, retired-model fallback, keys migration, `/bgh test` with Langfuse down, `parseHarper` against real current `harper-cli` output.
- status-line: migration from a 0.3.0 marker or a corrupt store, classifier table cases, `git clean` / `git reset --hard <ref>` measurement, `/sl restore`, cold gate after `/clear`, `refreshUsage` `$.store.set` from a `void` timer (`:710`, `:762`), agent list truncated to 30 lines (`:1953`).
- `archive-reviews.sh` archives every entry including the latest one; the next review has no `Supersedes` target in the active file. Acceptable by design, noted only.
