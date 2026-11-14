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

---

## CR-20261114-002

- **Entry ID**: CR-20261114-002
- **Supersedes**: CR-20261114-001
- **Scope**: Changes since `d91eb8b` up to `cc8569e`, which are all in `mods/bgh`: 0.10.0 (`1ff253c`, setup key `k` and `/bgh keys`), 0.10.1 (`8e579fb`, OS key names), 0.10.2 (`cc8569e`, ctrl+x chords dropped). The diff was reviewed on two axes, Standards (CLAUDE.md "Writing mods" plus a code-smell baseline) and Spec (Ban's requests for automatic key binding, no override of native Option shortcuts, single-stroke fallbacks, OS-specific key names). Nothing else in the repo changed (`git diff --stat d91eb8b HEAD -- mods/status-line dev skills .gitignore CLAUDE.md` is empty), so findings outside bgh were re-checked only for status. No `CODE-FIXED.md` exists.

### Validation Matrix

| # | Finding (CR-20261114-001) | Status | Current evidence |
|---|---|---|---|
| 1 | status-line 0.3.0 marker blocks 0.3.1 migration | Still Open | file unchanged, `mods/status-line/hooks/register.ts:1636-1640` |
| 2 | bgh shared Harper draft file | Still Open | `mods/bgh/hooks/register.tsx:474` |
| 3 | bgh tally credits the LLM hop for Harper-only fixes | Still Open | `mods/bgh/hooks/register.tsx:337`, `:1487` |
| 4 | bgh store read once, overwritten whole | Still Open | loads `:411`, `:454`, `:523`; whole writes `:579`, `:644`, `:651`, `:672` |
| 5 | bgh unhandled rejections | Still Open | `mods/bgh/hooks/register.tsx:1521` (`void harperDone.then(runLlm)`) |
| 6 | bgh fetch without timeout | Still Open | `mods/bgh/hooks/register.tsx:191`, `:746`, `:1412` |
| 7 | raw non-ASCII in mod source | Still Open | 49 non-comment lines across bgh `register.tsx` and `core.ts`; `register.tsx:1263` was rewritten by this diff and kept its raw `“ ”` |
| 8 | guard: shell variables reported as "delete nothing" | Still Open | file unchanged |
| 9 | guard: `git reset --hard <ref>` | Still Open | file unchanged |
| 10 | guard classifier over/under-matches | Still Open | file unchanged |
| 11 | `do.py` reports 0 alerts when Vale fails | Still Open | file unchanged |
| 12 | CLAUDE.md lacks Build & Test | Still Open | file unchanged |
| 13 | status-line migration writes permanent `'none'` | Still Open | file unchanged |
| 14 | status-line cold gate / effort override edge cases | Still Open | file unchanged |
| 15 | status-line `cost`/`turn` cells show dollars | Still Open | file unchanged |
| 16 | bgh key file briefly world-readable | Still Open | `mods/bgh/hooks/register.tsx:429`, `:443` |
| 17 | docs and help text disagree with code | Still Open | `mods/bgh/hooks/register.tsx:103` vs `:1186`; `:866`; `:582` and `:806` still say "three panes" |
| 18 | bgh per-session counters never reset | Still Open | `mods/bgh/hooks/register.tsx:275-276`, `:298` |
| 19 | `sinh-tu-sao.py` unescaped regex | Still Open | file unchanged |
| 20 | untracked installer files | Still Open | `git status` still shows `.agents/`, `.claude/`, `.crush/`, `skills-lock.json` |

### Findings

#### Medium

**21. bgh: pressing `k` does not refresh the key labels**
- Evidence: the `k` button at `mods/bgh/hooks/register.tsx:941-950` runs `setUpKeys` and redraws but never calls `learnKeys`. The `/bgh keys` verb at `:658-663` does call it.
- Impact: When `k` binds the fallback (alt+shift+a/i), the band and help pane keep showing the old label until the setup pane renders again (`:817`). The user is told a key that does nothing.
- Recommendation: Move the "run setUpKeys, set keysReport, learnKeys, toast, redraw" sequence into one top-level function and call it from both the verb and the button.
- Status: New

**22. bgh: the "key is taken" check ignores modifier aliases and order**
- Evidence: `mods/bgh/hooks/core.ts:766` keys the `held` map by `k.toLowerCase()` only; `:775` tests the candidate the same way. `keyName` in the same file treats `alt`, `opt`, `option` and `meta` as one key.
- Impact: With `"meta+a": "chat:x"` or `"shift+alt+a": …` in keybindings.json, `alt+a` / `alt+shift+a` count as free, and `k` adds a second binding for the same physical key. That overrides a binding the user already has, which is what the spec ruled out ("don't override the native Option shortcuts").
- Recommendation: Normalise each key before comparing: split on `+`, map `opt`/`option`/`meta` to `alt`, sort the modifiers, join. Add tests for `meta+a` and `shift+alt+a`.
- Status: New

#### Low

**23. bgh: some key names still ignore the OS**
- Evidence: HELP text `mods/bgh/hooks/register.tsx:106` and setup hints `:876-877` hardcode `alt+a` / `alt+shift+a`. Default labels `:283-284` stay `alt+a` when no keybindings.json exists (`:505-507` skips `learnKeys`). On darwin `keyName` yields `Option + shift + a`, mixing cases (`mods/bgh/tests/core.spec.ts:420`).
- Impact: A Mac user sees `alt+a` in help and setup, `Option + a` on the band, which is the inconsistency 0.10.1 set out to remove.
- Recommendation: Build all of these strings with `chordLabel(…, platform.os)`, set the default labels after `platform` is known, and capitalise modifiers consistently (`Option + Shift + a`).
- Status: New

**24. bgh: `null` unbinds count as taken keys**
- Evidence: `mods/bgh/hooks/core.ts:766` stores every entry, including `null`; `:778` then reports `alt+a runs null`.
- Impact: A key the user deliberately freed is skipped, and the note reads as nonsense.
- Recommendation: Skip `null` values when building `held`, or report them as "unbound by you" if keeping them taken is intended.
- Status: New

**25. bgh: `setUpKeys` runs with empty paths when `session.start` did not fire**
- Evidence: `mods/bgh/hooks/register.tsx:280-281` start `keysCache`/`keybindingsPath` as `''`; `:235` and `:241` use them unguarded. CLAUDE.md notes that `cc-plugin-sec-default@builtin` can swallow `SessionStart` on managed machines.
- Impact: The result is `could not write : …` with no cause given.
- Recommendation: Return a `manual` line ("session not started; run /bgh keys after a prompt") when `keybindingsPath` is empty.
- Status: New

**26. bgh: keys module shape (dead code, leftover names, positional labels)**
- Evidence: `boundActions` (`mods/bgh/hooks/core.ts:697`) has no caller left outside its test. The chord names survive the chord removal: `ChordWant`, `addChords`, `chordLabel`, `CHORD_WANTS`, `steps.chords`. `setUpKeys` names a row by list position (`register.tsx:249`, `w.action === p.wants[0]!.action ? 'apply' : 'ignore'`). `setupSteps` runs the whole `addChords` edit, `JSON.stringify` included, on every render to get a yes/no (`register.tsx:570`). `keysFor` and `addChords` repeat the same block-walk guard (`core.ts:716`, `:764`).
- Impact: The interface says "chords" while the module binds single keys, and the caller has to know list order. Both make the next change to this seam easy to get wrong.
- Recommendation: Delete `boundActions` and its test, rename to `KeyWant`/`addKeys`/`keyLabel`, add a `label` field to each want, use `keysFor(…).length` in `setupSteps`, and share one block iterator.
- Status: New

**27. bgh: `k` cannot tell whether the terminal sends Option as Alt (Plausible)**
- Evidence: `mods/bgh/hooks/register.tsx:251-253` adds a fixed darwin note; nothing detects the terminal. Spec request 2 asked `k` to "check all the Terminal apps"; request 3 later ruled out changing terminal settings, but did not drop the check.
- Impact: In a terminal where Option types `å`, `k` reports the keys as bound and the band shows `Option + a`, which does nothing.
- Recommendation: Ban decides whether a read-only check is wanted (e.g. `TERM_PROGRAM` plus the known per-terminal setting). If not, record in the README that the check was dropped on purpose.
- Status: New

**28. bgh: the cache row shows dollars (Plausible)**
- Evidence: `mods/bgh/hooks/register.tsx:1042` renders `spent $0.0000 this session`. The code predates this diff and was missed by CR-20261114-001.
- Impact: CLAUDE.md "Ban's standing decisions for mods" says "Tokens, never dollars". The sentence goes on to name status-line, so whether it covers bgh is unclear.
- Recommendation: Ban confirms the scope. If it covers every mod, show tokens.
- Status: New

### Verification Notes

| Check | Result |
|---|---|
| `bun test tests/` in `mods/bgh` | Pass: 47 pass, 0 fail, 122 expect |
| `claude plugin validate .` in `mods/bgh` | Pass with warnings (`ICON_MISSING`, as before) |
| Version check | bgh `plugin.json` 0.10.2 = `RELEASE` (`register.tsx:77`) |
| `$` passed only to top-level functions in the diff | Pass (`readText`, `setUpKeys`) |
| New `$.process.run` in the diff | None |
| `tsc` | Not run for this entry; passed (exit 0) during 0.10.2 development with the engine types |
| status-line, tooling | Not re-run: no files changed since CR-20261114-001 |
| Build & Test section in CLAUDE.md | Still absent (#12); commands above were inferred |

### Residual Risks / Testing Gaps

- `setUpKeys` and the `k` button have no engine test. Untested: backup write failure, the label refresh after `k` (#21), an empty `keybindingsPath` (#25).
- `addChords` tests cover taken keys in Global and Chat, both keys taken, and invalid JSON. Missing: alias forms (#22), `null` unbinds (#24), a `bindings` block whose `bindings` is not an object.
- Whether the engine resolves `meta+a` and `alt+a` as the same key was not verified against Claude Code; #22 assumes it does, as `keyName` does.
- Live check of single-stroke `alt+shift+a` in Orca and Ghostty has not been done. Only `alt+a` was confirmed by Ban.
