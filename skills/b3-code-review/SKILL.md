---
name: b3-code-review
description: Run a structured, append-only code review cycle that appends a CR- entry to CODE-REVIEW.md, carrying every open finding forward. Use when the user asks to review the code, a branch, a mod or the changes since the last review, or types /b3-code-review. Takes an optional scope - `full` for the whole repo, or a git ref to review the diff since it.
metadata:
  version: "1.1.1"
---

# b3 Code Review

Run a structured, append-only code review cycle. Review only; `b3-code-fix` fixes.

## Arguments

| Argument | Scope |
|---|---|
| none | The diff from the previous entry's `Commit` to `HEAD`, plus a status re-check of every open finding. With no previous entry, the whole repo. |
| `full` | The whole repo at `HEAD`. |
| a git ref (`abc123`, `main`, `v1.2`) | The diff from that ref to `HEAD`, plus the status re-check. |

## Procedure

1. **Locate the baseline.** `grep -n '^## CR-' CODE-REVIEW.md` and read only the last entry, plus the `## Carried Findings` section if the file has one. The last entry's Validation Matrix lists every finding still open, so older entries are not needed. Then `grep -n '^## CF-' CODE-FIXED.md` and read only the CF entries whose `Source Review` is that last CR entry.
2. **Look up history only on demand.** When an open finding's full text is not in what you read, `grep -n '^\*\*N\. '` for it in `CODE-REVIEW.md`, then in `CODE-REVIEW.archive.md`.
3. **Set the scope** from the arguments, and record the commit you review as `git rev-parse --short HEAD`. Note uncommitted changes in Scope if `git status --short` shows any.
4. **Reconcile** each open finding against the current code and the CF entries: `Still Open`, `Fixed`, `Regressed`, `Not Reproducible`, or `Accepted` when a CF entry records the user's decision not to fix it.
5. **Review the scope.**
   - For a diff, invoke the `code-review` skill for a two-axis review (Standards + Spec), then fold its findings into the entry.
   - For structural findings (module boundaries, interfaces, coupling), invoke the `codebase-design` skill and use its vocabulary (deep module, interface, seam) in the finding text.
6. **Number** new findings from the highest number used anywhere in `CODE-REVIEW.md` or its archive, plus one. Numbers are global and never reused.
7. **Run** the Build & Test commands from `CLAUDE.md` for the parts in scope, and record the results.
8. **Append** the new entry to `CODE-REVIEW.md`.

## Rules

- **Never fix code** during a review.
- **Never modify** `CODE-FIXED.md`. That file is owned by the fix process.
- **Append-only**: never edit or delete previous entries in `CODE-REVIEW.md`. Only `scripts/archive-reviews.sh` moves them.
- If `CODE-REVIEW.md` does not exist, create it from the template (see File Generation below).

## Severity

| Severity | Meaning |
|---|---|
| High | Data loss, a security hole, a crash, or a wrong result in normal use. |
| Medium | Wrong behaviour in a specific case, a missing safeguard, or a test gap around risky code. |
| Low | Docs or help text out of step with the code, style, naming, or a rare edge case. |

## Companion Skills

Invoke these skills at the steps noted in the Procedure when they are installed (install once per machine with `npx skills add mattpocock/skills -s code-review -s codebase-design -a claude-code -g -y`):

- `code-review` - two-axis (Standards + Spec) review of a diff since a fixed point.
- `codebase-design` - shared vocabulary for structural findings.

If a companion skill is unavailable, continue with the inline procedure. The log format and rules don't change.

## Entry Format

```
## CR-YYYYMMDD-###

- **Entry ID**: CR-YYYYMMDD-###
- **Supersedes**: <previous CR id, or "none (first review)">
- **Commit**: <short sha reviewed>
- **Scope**: <diff range or "full", and what it covers>

### Validation Matrix

| # | Finding | Status | Evidence |
|---|---|---|---|
| 4 | <title> | Fixed | <file:line or CF id> |
| 8-10, 13 | unchanged | Still Open | files unchanged since <sha> |

### Findings

#### High

**N. <title>**
- Evidence: `path:line` ...
- Recommendation: ...
- Status: New

#### Medium
#### Low

### Verification Notes
### Residual Risks / Testing Gaps
```

Validation Matrix rules:

- The `#` column holds one number, or a list with ranges (`8-10, 13`). The Status column is the third.
- Every open finding (`New`, `Still Open`, `Regressed`) appears in the matrix, so the next cycle can read this entry alone.
- Give a row of its own to any finding whose status changed or whose evidence moved. Merge the open findings whose files did not change into one `unchanged` row.
- A finding that closes (`Fixed`, `Not Reproducible`, `Accepted`) appears once, in the entry where it closes, then drops out of later matrices.
- In the first entry, write "No prior entries" instead of the table.

## Writing Standard

- Language: English only.
- Tone: Technical, concise, objective, evidence-based.
- Every finding includes at least one concrete `file:line` reference.
- Every finding includes a clear, actionable recommendation.

## Archive Trigger

If `CODE-REVIEW.md` or `CODE-FIXED.md` exceeds **500 lines**:
- Suggest running `scripts/archive-reviews.sh` from the project root. It keeps the last CR entry, copies the full text of every finding still open into `## Carried Findings`, keeps the CF entries for the last CR entry, and appends everything else to the `.archive.md` files. `--dry-run` shows what it would move. Run the copy that ships next to this SKILL.md, never one inside the project: an installer may have left an older version there, and the 1.0.0 script archives the last entry too.
- Do NOT run the script automatically. Wait for the user's confirmation.

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
- Lifecycle: Each finding includes `Status`: `New`, `Still Open`, `Fixed`, `Regressed`, `Not Reproducible`, or `Accepted`.
- Numbering: Finding numbers are global across entries and never reused.

### Entry ID Convention
- Required field for every entry: `Entry ID`
- Format: `CR-YYYYMMDD-###`
- Example: `CR-20260221-001`

---
```

Then append your first review entry below the `---`.
