# Backlog

Ideas approved for later, not scheduled. Each item names its owner machine (POLICY.md rule 9).

## status-line 0.5.0: guard asks only on a threat (approved 16/11/2026, next)

- Owner: Arch. Designed on the Mac, approved by Ban 16/11/2026.
- After the measure, a held command takes one of two paths:
  - No threat: the band shows the report with `auto-run in 3s · 2: refuse`. The command runs when the count ends, and `2` refuses it.
  - Threat: hold and ask as today. `1: run`, `2: refuse`, and Enter refuses.
- No threat means:
  - `rm -r`/`-f`/`-rf`: matches nothing; only git-tracked files with no changes; known build folders (`node_modules`, `dist`, `.next`, `target`, ...); targets under `/tmp`, `$TMPDIR` or a Claude scratchpad.
  - `git reset --hard`: clean tree and no commit dropped.
  - `git clean`: `git clean -n` lists nothing.
  - Force push: drops no remote commit.
- Threat means:
  - Untracked, modified or gitignored files (`.env` is gitignored).
  - A `$VAR` or backtick in a path.
  - A target of `/`, `~` or the repo root.
  - Dropped commits.
  - A fetch too old to say what the remote holds.
- On a threat, `1` keeps what the command would destroy before it runs:
  - `rm` and `git clean` move their targets to `<status-line cache>/trash/<time>/`, with the command rewritten through `next({...e, input})`.
  - `git reset --hard` keeps `git stash create` and the old HEAD under `refs/status-line/guard/<time>`.
  - A force push keeps the old remote head under `refs/status-line/pushed-over/<time>`.
  - Over 500 MB: nothing is kept, and the report says "won't be kept".
  - The band shows `undo: /sl undo · 10m` after it runs.
- `/sl undo` moves the last trash back, or prints the git command that restores the ref.
- Trash folders and refs older than 7 days are removed at `session.start` through `$.process.run`.
- Log: the last 50 decisions go in `$.store`. Each entry has the time, the decision (`auto`, `run`, `refuse`, `timeout`, `interrupted`, `error`), the command, the measure, and the trash path if any. `/sl debug` prints the newest 5; `/sl guard log` prints all of them.
- Tests in `hooks/band.test.ts`:
  - auto-run after 3 s, and `2` during the count
  - a threat that still holds
  - `1` on a threat moves to trash, and `/sl undo` brings it back
  - the log entries
- README and README.vi guard sections, plus ACKNOWLEDGEMENTS if anything is borrowed.
- Estimate: about 3 hours with tests.

## status-line: guard backs up instead of asking (superseded by the item above)

- Owner: Arch. Proposed 15/11/2026 on the Mac, parked by Ban the same day.
- Problem: the guard holds every risky command it matches, and the answer is almost always `1: run`, so the question trains a reflex instead of protecting anything.
- Proposal: three outcomes after the measure.
  - Nothing lost: run with no hold.
  - Something lost that can be kept: keep it, run, and show an undo row in the band for 10 minutes.
    - `rm` and `git clean` move their targets to a status-line trash folder instead of deleting them. The command is rewritten through `next({...e, input})`.
    - `git reset --hard` keeps `git stash create` and any dropped commits under `refs/status-line/guard/<time>`.
    - A force push keeps the old remote head under `refs/status-line/pushed-over/<time>`.
  - Can't keep it: hold and ask as today, with Enter refusing. This covers a `$VAR` or backtick in a path, more than 500 MB, a target of `/`, `~` or the repo root, and a fetch too old to say what the remote holds.
- New verb: `/sl undo` restores from trash, or prints the git command that does.
- Trash and refs expire after 7 days.
- Gitignored is not "nothing lost", because `.env` is gitignored. Only known build folders count (`node_modules`, `dist`, `.next`, `target`, ...).
- Unchanged: the guard still reads command text only. `$(...)`, `xargs rm` and `find -delete` still pass.
- Estimate: half a day including tests in `hooks/band.test.ts`. Bumps status-line's minor version.
