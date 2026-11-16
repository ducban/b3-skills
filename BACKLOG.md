# Backlog

Ideas approved for later, not scheduled. Each item names its owner machine (POLICY.md rule 9).

## Shipped

- status-line 0.5.0, guard asks only on a threat: done on Arch 16/11/2026. The two items that were here
  (the approved design and the earlier "backs up instead of asking" it superseded) are in
  `mods/status-line/README.md`, "Asking only when something is at risk". One change from the design:
  `rm` and `git clean` targets are copied to the trash, not moved, so the command runs exactly as
  written (an `rm -r` whose target had gone would fail).
