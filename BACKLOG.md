# Backlog

Ideas approved for later, not scheduled. Each item names its owner machine (POLICY.md rule 9).

## Shipped

- bgh 0.11.0, an `amd` route for AMD Token Lab: done on Arch 17/11/2026 with Ban's go-ahead for this
  item (bgh is otherwise Mac's). As designed, plus one thing found live: the route sends
  `reasoning_effort: 'none'`, because MiniCPM5-2B otherwise spends the 400-token cap reasoning and
  answers `null`. Both model ids were checked against `GET /models`. Older `.env` files get the new key
  names appended, commented. See `mods/bgh/README.md`.
- status-line 0.5.0, guard asks only on a threat: done on Arch 16/11/2026. The two items that were here
  (the approved design and the earlier "backs up instead of asking" it superseded) are in
  `mods/status-line/README.md`, "Asking only when something is at risk". One change from the design:
  `rm` and `git clean` targets are copied to the trash, not moved, so the command runs exactly as
  written (an `rm -r` whose target had gone would fail).
