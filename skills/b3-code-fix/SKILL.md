---
name: b3-code-fix
description: Fix the open findings in CODE-REVIEW.md and append a CF- entry to CODE-FIXED.md saying what changed, what was deferred, and what the checks printed. Use when the user asks to fix review findings, fix "#N", fix the high ones, or types /b3-code-fix. Takes an optional selection - finding numbers (`#1 #8`), a severity (`high`), or a part of the repo (`status-line`).
metadata:
  version: "1.1.1"
---

# b3 Code Fix

Fix findings from a prior code review cycle. Fix only; `b3-code-review` reviews.

## Arguments

| Argument | Fixes |
|---|---|
| none | Every open finding. |
| `#1 #8` | Those findings only. |
| `high`, `medium`, `low` | Open findings of that severity. |
| a path or part name (`status-line`, `mods/bgh`) | Open findings whose evidence is in that part. |

Arguments combine: `high status-line` means the High findings in status-line.

## Procedure

1. **Locate the source review.** `grep -n '^## CR-' CODE-REVIEW.md` and read only the last entry, plus the `## Carried Findings` section if the file has one. Its Validation Matrix lists every open finding.
2. **Read** the CF entries in `CODE-FIXED.md` whose `Source Review` is that CR entry (`grep -n '^## CF-'`). Those findings may already be fixed or deferred.
3. **Select** the open findings (`New`, `Still Open`, `Regressed`) that match the arguments and are not already fixed by those CF entries. When a finding's full text is not in what you read, `grep -n '^\*\*N\. '` for it in `CODE-REVIEW.md`, then in `CODE-REVIEW.archive.md`.
4. **Ask before** any fix that deletes files, changes behaviour the user can see, changes a public interface, or needs a decision the review left open. Do the other fixes first and list these in one question. A finding the user decides not to fix is `Accepted`; record their reason.
5. **Fix** the selected findings.
   - For any finding whose root cause is not obvious from the review evidence, invoke the `diagnosing-bugs` skill first. Fix the diagnosed cause, not the symptom.
   - For behavioural findings, invoke the `tdd` skill: write a failing test that reproduces the finding, then fix to green.
6. **Verify** with the Build & Test commands from `CLAUDE.md`, only for the parts you touched. Record each command and its result.
7. **Append** a new entry to `CODE-FIXED.md`.

## Rules

- **Never perform a code review** during a fix process. Note anything new you notice under `Residual notes` for the next review.
- **Never modify** `CODE-REVIEW.md`. That file is owned by the review process.
- **Append-only**: never edit or delete previous entries in `CODE-FIXED.md`. Only `scripts/archive-reviews.sh` moves them.
- **Never commit or push** unless the user asks.
- If `CODE-FIXED.md` does not exist, create it from the template (see File Generation below).

## Companion Skills

Invoke these skills at the steps noted in the Procedure when they are installed (install once per machine with `npx skills add mattpocock/skills -s diagnosing-bugs -s tdd -a claude-code -g -y`):

- `diagnosing-bugs` - diagnosis loop for findings with a non-obvious root cause.
- `tdd` - red-green slice: failing test reproducing the finding, then the fix.

If a companion skill is unavailable, continue with the inline procedure. The log format and rules don't change.

## Entry Format

```
## CF-YYYYMMDD-###

- **Entry ID**: CF-YYYYMMDD-###
- **Source Review**: <CR id>
- **Selection**: <arguments, or "all open">
- **Commit**: <short sha the fixes start from>

### Fixes Applied

**Finding #N (Severity)**: Fixed | Partial. <what changed>, `path:line` for every change.

### Accepted

**Finding #N (Severity)**: <the user's reason for not fixing it, and when they said it>

### Deferred

**Finding #N (Severity)**: <why it waits, and the trigger that brings it back>

### Verification Notes

| Command | Folder | Result |
|---|---|---|
```

- `Partial` says what is left; the finding stays open for the next review.
- Leave out a section that has nothing in it.
- Reference findings by number and severity. Don't re-describe them; the reader consults the CR entry.

## Writing Standard

- Language: English only.
- Tone: Technical, concise, action-focused.

## Archive Trigger

If `CODE-REVIEW.md` or `CODE-FIXED.md` exceeds **500 lines**:
- Suggest running `scripts/archive-reviews.sh` from the project root. It keeps the last CR entry, copies the full text of every finding still open into `## Carried Findings`, keeps the CF entries for the last CR entry, and appends everything else to the `.archive.md` files. `--dry-run` shows what it would move. Run the copy that ships next to this SKILL.md, never one inside the project: an installer may have left an older version there, and the 1.0.0 script archives the last entry too.
- Do NOT run the script automatically. Wait for the user's confirmation.

## File Generation

If `CODE-FIXED.md` does not exist in the project root, create it with this header:

```
# Code Fix Log

## Writing Standard
- Each entry documents fixes applied for a specific `CODE-REVIEW.md` entry.
- Reference the source review by its Entry ID (e.g., `CR-20260221-001`). Do NOT re-describe findings — only document actions taken.
- For finding details, the reader should consult the referenced `CODE-REVIEW.md` entry.
- Each finding is referenced as `Finding #N (Severity)` matching the review's numbering.
- Fixed findings must include `file:line` for every change made.
- Accepted findings record the user's reason; deferred findings record the rationale and a revisit trigger.
- Verification section must confirm the project's Build & Test commands (see `CLAUDE.md`) pass for the parts the fix touched.
- Language: English only. Tone: Technical, concise, action-focused.

### Entry ID Convention
- Required field for every entry: `Entry ID`.
- Format: `CF-YYYYMMDD-###`
- Example: `CF-20260222-001`
- `###` is a zero-padded sequence number for that day.

---
```

Then append your first fix entry below the `---`.
