# Code Fix Log

## Writing Standard
- Each entry documents fixes applied for a specific `CODE-REVIEW.md` entry.
- Reference the source review by its Entry ID (e.g., `CR-20260221-001`). Do NOT re-describe findings — only document actions taken.
- For finding details, the reader should consult the referenced `CODE-REVIEW.md` entry.
- Each finding is referenced as `Finding #N (Severity)` matching the review's numbering.
- Fixed findings must include `file:line` for every change made.
- Deferred findings must include rationale and a revisit trigger.
- Verification section must confirm the project's typecheck + build commands (see Build & Test in `CLAUDE.md`) pass after fixes.
- Language: English only. Tone: Technical, concise, action-focused.

### Entry ID Convention
- Required field for every entry: `Entry ID`.
- Format: `CF-YYYYMMDD-###`
- Example: `CF-20260222-001`
- `###` is a zero-padded sequence number for that day.

---

## CF-20261114-001

- **Entry ID**: CF-20261114-001
- **Source Review**: CR-20261114-002 (which carries CR-20261114-001's findings #1–#20 as Still Open)
- **Machine**: macOS. Only bgh, the Vale tooling, `CLAUDE.md` and `.gitignore` were changed. Ban lifted rule 9 for bgh only, so status-line findings are deferred to the machine that owns status-line.
- **Version**: bgh 0.10.2 → 0.10.3 (`mods/bgh/.claude-plugin/plugin.json:3`, `mods/bgh/hooks/register.tsx:82`)

### Fixes Applied

**Finding #21 (Medium)**: `k` and `/bgh keys` now share `keysBound`, which sets the report and calls `learnKeys`. `mods/bgh/hooks/register.tsx:642` (helper), `:741` (verb), `:1013` (button). `setUpKeys` returns the file text it left (`:284`).

**Finding #22 (Medium)**: Keys are compared through `sameKey`, which maps meta/opt/option to alt and sorts modifiers. `mods/bgh/hooks/core.ts:758`, used in `addKeys` at `:804`. Tests at `mods/bgh/tests/core.spec.ts:452`. README note at `mods/bgh/README.md:61`.

**Finding #23 (Low)**: HELP is now `helpText(os)`, which builds key names with `keyName` (`mods/bgh/hooks/register.tsx:104`). Setup hints use `keyName` (`:946`). The default labels follow the OS once `session.start` runs (`:585`). `keyName` capitalises modifiers on darwin (`mods/bgh/hooks/core.ts:783`). Test expectation updated in `mods/bgh/tests/core.spec.ts`.

**Finding #24 (Low)**: `null` bindings are skipped when collecting held keys (`mods/bgh/hooks/core.ts:823`). Test at `mods/bgh/tests/core.spec.ts:460`.

**Finding #25 (Low)**: `setUpKeys` returns a `manual` line when the path or cache is empty (`mods/bgh/hooks/register.tsx:286`).

**Finding #26 (Low)**:
- `boundActions` and its test were removed.
- Renames: `ChordWant` → `KeyWant` (with `label`), `addChords` → `addKeys`, `chordLabel` → `keyLabel`, `CHORD_WANTS` → `KEY_WANTS`, `steps.chords` → `steps.bound`. See `mods/bgh/hooks/core.ts:744`, `:801`, `:804` and `mods/bgh/hooks/register.tsx:154`, `:312`.
- `setupSteps` uses `keysFor` (`:654`).
- Both block walks share `bindingEntries` (`mods/bgh/hooks/core.ts:750`).

**Finding #2 (Medium)**: The draft file is per session, `draft-<time>-<random>.md` (`mods/bgh/hooks/register.tsx:553`). `paintPath` is separate.

**Finding #3 (Medium)**: `whoOf` delegates to the new `creditOf` (`mods/bgh/hooks/register.tsx:403`, `mods/bgh/hooks/core.ts:339`). It credits a model only for LLM-sourced issues; otherwise it credits `harper`. Test at `mods/bgh/tests/core.spec.ts:378`.

**Finding #4 (Medium)**: Store writes now re-read the store and merge (`mods/bgh/hooks/core.ts:348`, `:359`, `:367`, with tests at `mods/bgh/tests/core.spec.ts:388`):
- Tally: `saveTally` with `tallyBase`/`tallySaved` (`mods/bgh/hooks/register.tsx:243`, `:371`, `:411`, `:1299`, `:1623`).
- Ignore list: `saveWords` (`:249`, `:727`, `:733`, `:1127`, `:1319`).
- LLM cache: `saveCache` (`:255`, `:1557`).
- Prefs stay whole-object; see Deferred.

**Finding #5 (Medium)**:
- `runLlm`'s `repaint` is wrapped in try (`mods/bgh/hooks/register.tsx:1566`).
- `.catch` added to `harperDone.then(runLlm)` (`:1592`), `sendTrace()` (`:1583`), the `/bgh test` model refresh (`:755`), the `prompt.paint` clears, the prefs and cache-clear store writes, and both `command.run` buttons.

**Finding #6 (Medium)**: Every `$.http.fetch` now goes through the top-level `fetchWithin`, which races the engine clock and cancels the timer (`mods/bgh/hooks/register.tsx:204`). `HTTP_TIMEOUT_MS` (`:86`) applies to Langfuse and the model lists; the chat hops keep `HOP_TIMEOUT_MS`. Call sites are `:228`, `:795`, `:816`, `:1303`, `:1451`, `:1473`, `:1628`. The nested `timeout()` helper was removed.

**Finding #7 (Medium)**: Every non-comment non-ASCII character in `mods/bgh/hooks/register.tsx` (44 lines) and `mods/bgh/hooks/core.ts` (5 lines) is now an escape.
- String and template literals use `\u{…}`.
- The two regexes without a `u` flag (`core.ts:27`, `:109`) use `\uXXXX`, because `\u{…}` there would not mean the character.
- One JSX text node became `{'\u{b7}'}` (`register.tsx:1330`).

**Finding #16 (Low)**: The new `writeSecret` creates an empty file, runs `chmod 600`, then writes the keys, and reports whether the chmod took (`mods/bgh/hooks/register.tsx:191`). Both callers toast when it failed off Windows.

**Finding #17 (Low)**:
- HELP `/bgh status` line rewritten (`mods/bgh/hooks/register.tsx:111`).
- The setup hint names the real `envFile` (`:936`).
- The pane-count comments now say "four" (`:666`, and the section header).
- The `/sl` description half belongs to status-line; see Deferred.

**Finding #18 (Low)**: `spent`, `lastProbe` and `lastRun` are reset in `session.start` (`mods/bgh/hooks/register.tsx:465-467`).

**Finding #11 (Medium)**: `do.py` exits when `vale` is not on PATH (`dev/b3-write-human/do-luong/do.py:9`). It also exits with Vale's stderr when the exit code is not 0 or 1 (`:18`).

**Finding #19 (Low)**: `sinh-tu-sao.py` escapes Go-regex metacharacters with `lit()` (`dev/b3-write-human/do-luong/sinh-tu-sao.py:26`) and doubles `'` for single-quoted YAML. The current 28 phrases contain neither, so `TuSao.yml` is unchanged.

**Finding #12 (Medium)**: Added a Build & Test section (`CLAUDE.md:50`).

**Finding #20 (Low)**: The four installer paths were added to `.gitignore` (`.gitignore:3-8`). The files themselves were left on disk; see Deferred.

### Deferred

| Finding | Rationale | Revisit trigger |
|---|---|---|
| #1 (High), #8, #9, #10 (Medium), #13, #14 (Low) | status-line is owned by the Arch machine (every status-line commit is `ducban.arch`). POLICY.md rule 9; Ban's override covers bgh only. | A session on Arch, or Ban extending the override to status-line |
| #15 (Low), #28 (Low) | Need Ban's decision: does "Tokens, never dollars" cover `cost`/`turn` cells and bgh's `spent $` row? | Ban answers |
| #17 (Low), `/sl` description part | status-line file, same rule-9 reason | With #1 |
| #20 (Low), deleting the files | Deletion needs Ban's go-ahead; this repo's skill copies would also need a global `npx skills add ducban/b3-skills -g` first | Ban says "dọn" |
| #27 (Low) | Product decision: a read-only terminal check, or a README note that it was dropped | Ban answers |
| #4, prefs part | Prefs change one field at a time from the settings pane, and a merge would need per-field change tracking. Last writer wins is left as is | A report of a lost setting |

### Residual notes

- #2: the engine has no file delete, so each session leaves one small `draft-*.md` in the bgh cache folder.
- #16: the window is closed, but a `chmod` failure off Windows still leaves the file at the default mode; it is now reported, not silent.

### Verification Notes

| Check | Result |
|---|---|
| `bun test tests/` in `mods/bgh` | Pass: 52 pass, 0 fail, 135 expect |
| `claude plugin validate .` in `mods/bgh` | Pass with warnings (`ICON_MISSING`; `prompt.submit` gating hook without `.catch`, which HEAD has too) |
| Type-check, bgh (`tsc` with engine `claude-code.d.ts`, strict) | Pass, exit 0 |
| `python3 dev/b3-write-human/do-luong/sinh-tu-sao.py --check` | Pass: 28 phrases in sync |
| `do.py` on a real file | Pass: same report shape as before |
| `do.py` with a missing `.vale.ini` (scratch copy) | Exits 1 with Vale's `E100` instead of printing "0 lỗi" |
| status-line checks | Not run: no status-line file changed |
| Live check in Claude Code | Not done: bgh 0.10.3 was not reloaded in a session |

---

## CF-20261114-002

- **Entry ID**: CF-20261114-002
- **Source Review**: CR-20261114-002 (status-line findings carried from CR-20261114-001, deferred by CF-20261114-001)
- **Machine**: Arch Linux, which owns status-line (POLICY.md rule 9). Only `mods/status-line` changed.
- **Version**: status-line 0.3.1 → 0.4.0 (`mods/status-line/.claude-plugin/plugin.json:3`). Minor bump because the `cost` cell was removed.

### Fixes Applied

**Finding #1 (High)**: The migration has a new marker, `migratedFrom2` (`mods/status-line/hooks/register.ts:1746`, read at `:1748`, written at `:1786`). A 0.3.0 `migratedFrom` value no longer stops the scan. A re-run fills only keys the store doesn't hold yet. Test: `mods/status-line/hooks/band.test.ts:1469`.

**Finding #13 (Low)**: A store whose JSON is not an object is skipped (`mods/status-line/hooks/register.ts:1767`). When the store folder can't be listed, no marker is written. `/sl debug` reports `not yet: <reason>`, and the next start tries again (`:1783`). Test: `mods/status-line/hooks/band.test.ts:1481`.

**Finding #8 (Medium)**:
- An `rm` target holding `$` or a backtick reports `can't measure: … expands at run time`, and nothing is run to measure it (`mods/status-line/hooks/register.ts:1268`).
- A `cd` target with an expansion gets the same report (`:2150`).
- Test: `mods/status-line/hooks/band.test.ts:1527`.

**Finding #9 (Medium)**:
- `git reset --hard <ref>` keeps the ref in the risk (`mods/status-line/hooks/register.ts:1201`).
- The measurement lists `git log <ref>..HEAD` as the commits that leave the branch, beside the uncommitted files (`:1359`, summary at `:1372`).
- An unknown or expanding ref is said in the note.
- Test: `mods/status-line/hooks/band.test.ts:1541`.

**Finding #10 (Medium)**:
- `splitCommands` cuts at `;`, `|`, `&`, `&&`, `||` and newlines outside quotes only, and skips heredoc bodies. `2>&1` and `&>` are left whole (`mods/status-line/hooks/register.ts:1083`, used at `:1157`).
- sudo/doas flags that take a value are skipped together with their value (`:1074`, `:1165`).
- Force push matches any short-flag group containing `f` (`:1207`).
- Tests at `mods/status-line/hooks/band.test.ts:1494` (not held: quoted message, heredoc, redirection) and `:1507` (held: `sudo -u root`, `-uf`, background `&`, quoted `;`).

**Finding #14 (Low)**:
- `classic.SessionStart` with `source: 'clear'` resets `cacheWarmAt`, `coldAskedAt` and `mainMessages` (`mods/status-line/hooks/register.ts:1875`).
- The effort override applies only to a main-loop request that already carries a string effort (`:1989`).

**Finding #15 (Low)**: Resolved under the 14/11/2026 decision in `CLAUDE.md` ("Tokens, never dollars" is status-line's rule).
- The `cost` cell and its `ItemKey` were removed (`mods/status-line/hooks/register.ts:303`, group renamed `Tokens` at `:312`).
- `turn` now shows the main loop's output tokens for the turn, summed in `turn.step` (`:1998`), stored at `:2044` and drawn at `:1579`.
- The `cost:` line was dropped from `/sl debug`.
- Test updated: `mods/status-line/hooks/band.test.ts:725`.
- README.md, README.vi.md and ACKNOWLEDGEMENTS.md updated to match.

**Finding #17 (Low)**, `/sl` part: The command description now lists `restore` (`mods/status-line/hooks/register.ts:1799`).

Docs: README.md and README.vi.md updated for the version (0.4.0), the test count (50), the guard table and splitting rules, and the `turn` cell.

### Deferred

| Finding | Rationale | Revisit trigger |
|---|---|---|
| #20 (Low), deleting the files | Unchanged from CF-20261114-001: deletion needs Ban's go-ahead | Ban says "dọn" |
| #4 (Medium), prefs part | Unchanged from CF-20261114-001 | A report of a lost setting |

### Verification Notes

| Check | Result |
|---|---|
| `claude plugin test .` in `mods/status-line` | Pass: 50 pass, 0 fail (41 before, 9 new) |
| `claude plugin validate .` in `mods/status-line` | Pass |
| Type-check (`bun x tsc -p .` with engine types) | Pass, no errors |
| bgh, Vale tooling | Not run: no file changed |
| #14 | No new test. The `/clear` reset and the effort guard were checked by reading the code only |
| Live check in Claude Code | Not done: 0.4.0 is not installed until it is pushed and updated. During the fix, the installed 0.3.1 guard held a scratch command whose quoted text contained an `rm -rf`, which is the #10 false positive |
