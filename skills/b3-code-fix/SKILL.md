---
name: b3-code-fix
description: Fix findings from CODE-REVIEW.md — reads review/fix logs, applies fixes, appends results to CODE-FIXED.md
metadata:
  version: "1.0.0"
---

# b3 Code Fix

Fix findings from a prior code review cycle.

## Procedure

1. **Read** `CODE-REVIEW.md` — understand all findings and their current statuses.
2. **Read** `CODE-FIXED.md` (if it exists) — understand which findings have already been addressed.
3. **Identify** unfixed findings — any finding with status `New` or `Still Open` in the latest review entry.
4. **Fix** the identified findings in the codebase.
   - For any finding whose root cause is not obvious from the review evidence, invoke the `diagnosing-bugs` skill first — fix the diagnosed cause, not the symptom.
   - For behavioural findings, invoke the `tdd` skill: write a failing test that reproduces the finding, then fix to green.
5. **Append** a new entry to `CODE-FIXED.md` documenting actions taken.

## Rules

- **Never perform a code review** during a fix process. Fix only.
- **Never modify** `CODE-REVIEW.md`. That file is owned by the review process.
- **Append-only**: never edit or delete previous entries in `CODE-FIXED.md`.
- If `CODE-FIXED.md` does not exist, create it from the template (see File Generation below).

## Companion Skills

Invoke these skills at the steps noted in the Procedure when they are installed (install once per machine with `npx skills add mattpocock/skills -s diagnosing-bugs -s tdd -a claude-code -g -y`):

- `diagnosing-bugs` — diagnosis loop for findings with a non-obvious root cause.
- `tdd` — red-green slice: failing test reproducing the finding, then the fix.

If a companion skill is unavailable, continue with the inline procedure — the log format and rules are unchanged.

## Entry Format

Each entry must include:

- **Entry ID**: `CF-YYYYMMDD-###` (zero-padded sequence per day)
- **Source Review**: reference the `CR-` entry ID being addressed
- **Fixes Applied**: for each finding:
  - Reference as `Finding #N (Severity)`
  - `file:line` for every change made
  - Brief description of the fix
- **Deferred**: findings not fixed, with rationale and revisit trigger
- **Verification Notes**: must confirm the project's typecheck + build commands (see the Build & Test section in `CLAUDE.md`) pass after fixes

## Writing Standard

- Language: English only.
- Tone: Technical, concise, action-focused.
- Reference findings by number and severity — do NOT re-describe them.
- For finding details, the reader should consult the referenced `CODE-REVIEW.md` entry.

## Archive Trigger

If `CODE-FIXED.md` exceeds **500 lines** AND the latest review entry in `CODE-REVIEW.md` has **0 open findings**:
- Suggest running `scripts/archive-reviews.sh` from the project root to compact resolved entries. The script ships next to this SKILL.md; when the project has no copy of its own, run that bundled one.
- Do NOT run the script automatically — wait for user confirmation.

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
- Deferred findings must include rationale and a revisit trigger.
- Verification section must confirm the project's typecheck + build commands (see Build & Test in `CLAUDE.md`) pass after fixes.
- Language: English only. Tone: Technical, concise, action-focused.

### Entry ID Convention
- Required field for every entry: `Entry ID`.
- Format: `CF-YYYYMMDD-###`
- Example: `CF-20260222-001`
- `###` is a zero-padded sequence number for that day.

---
```

Then append your first fix entry below the `---`.
