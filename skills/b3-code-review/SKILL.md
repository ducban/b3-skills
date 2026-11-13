---
name: b3-code-review
description: Run a structured code review cycle — reads existing review/fix logs, scans codebase, appends findings to CODE-REVIEW.md
metadata:
  version: "1.0.0"
---

# b3 Code Review

Run a structured, append-only code review cycle.

## Procedure

1. **Read** `CODE-REVIEW.md` (if it exists) — understand prior findings and their statuses.
2. **Read** `CODE-FIXED.md` (if it exists) — understand which findings have been addressed.
3. **Reconcile** — build a mental model of what is `New`, `Still Open`, `Fixed`, `Regressed`, or `Not Reproducible`.
4. **Read the codebase** — inspect source files relevant to the project's current state.
   - When the review targets a change set (a branch, a PR, or the diff since the last `CR-` entry), invoke the `code-review` skill for a two-axis review (Standards + Spec) of that diff, then fold its findings into the entry below.
   - When judging structural findings (module boundaries, interfaces, coupling), invoke the `codebase-design` skill and use its vocabulary (deep module, interface, seam) in the finding text.
5. **Append** a new entry to `CODE-REVIEW.md` with your findings.

## Rules

- **Never fix code** during a review. Review only.
- **Never modify** `CODE-FIXED.md`. That file is owned by the fix process.
- **Append-only**: never edit or delete previous entries in `CODE-REVIEW.md`.
- If `CODE-REVIEW.md` does not exist, create it from the template (see File Generation below).

## Companion Skills

Invoke these skills at the steps noted in the Procedure when they are installed (install once per machine with `npx skills add mattpocock/skills -s code-review -s codebase-design -a claude-code -g -y`):

- `code-review` — two-axis (Standards + Spec) review of a diff since a fixed point.
- `codebase-design` — shared vocabulary for structural findings.

If a companion skill is unavailable, continue with the inline procedure — the log format and rules are unchanged.

## Entry Format

Each entry must include:

- **Entry ID**: `CR-YYYYMMDD-###` (zero-padded sequence per day)
- **Supersedes**: reference the previous entry ID if this is a follow-up review
- **Scope**: what was reviewed
- **Validation Matrix**: table reconciling previous findings against current code
- **Findings**: ordered by severity (`High`, `Medium`, `Low`), each with:
  - `file:line` evidence
  - Clear recommendation
  - `Status`: `New`, `Still Open`, `Fixed`, `Regressed`, or `Not Reproducible`
- **Verification Notes**: status of the project's typecheck / build commands (see the Build & Test section in `CLAUDE.md`)
- **Residual Risks / Testing Gaps**: known untested areas

## Writing Standard

- Language: English only.
- Tone: Technical, concise, objective, evidence-based.
- Every finding includes at least one concrete `file:line` reference.
- Every finding includes a clear, actionable recommendation.

## Archive Trigger

If `CODE-REVIEW.md` exceeds **500 lines** AND the latest review entry has **0 open findings**:
- Suggest running `scripts/archive-reviews.sh` from the project root to compact resolved entries. The script ships next to this SKILL.md; when the project has no copy of its own, run that bundled one.
- Do NOT run the script automatically — wait for user confirmation.

## File Generation

If `CODE-REVIEW.md` does not exist in the project root, create it with this header:

```
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
```

Then append your first review entry below the `---`.
