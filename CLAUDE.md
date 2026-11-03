# CLAUDE.md — b3-skills

Guidance for AI coding agents working in this repository.

## Multi-machine rules

This repo is developed on more than one machine: macOS, Arch Linux, and sometimes a Linode
VPS. More than one of them still commits. Before changing anything here, read `POLICY.md`
in the `memex-vault` repo, which sits under the same `Workspace/Projects/` tree as this
one. Derive that path, never hardcode it. `/Users/…` is only correct on the Mac, `/home/…`
only on Arch, and the VPS has neither.

The three rules that bite most often:

- **Rule 10.** One directory per OS (`macos/`, `linux-arch/`). Compiled sources use the
  language's own per-OS mechanism instead (Go: `*_darwin.go` / `*_linux.go`).
- **Rule 5.** A commit's `user.name` says which *machine*, the `Co-Authored-By` trailer
  says which *AI*, and the SSH signature is anti-forgery. Three independent slots. A
  commit with no trailer was typed by hand.
- **Rule 9.** Whichever machine owns a part is the machine that changes it. No exception
  for a two-minute fix.

### Commit log

Every pushed commit gets one line, written automatically by a local `pre-push` hook into
`DIARY/`. That directory is git-ignored and machine-local, one file per machine. **Don't
hand-edit it and don't commit it.** The cross-machine rollup lives in the vault; rule 11
has the shape.

Git doesn't carry hooks across clones, so a fresh clone starts with none. Check with
`memex-vault/tools/diary/install-hook.sh --check` rather than assuming.

## Versions move in pairs

Each plugin carries its version twice: `metadata.version` in `skills/<name>/SKILL.md` and
`version` in `.claude-plugin/plugin.json`. Bump both in the same commit. The `skills` CLI
and the marketplace each read a different one.

## Figures in the docs

The SVGs under `docs/figures/` come from `docs/figures/draw.mjs`, which imports the repo's
own `figlib.mjs`. Change the script and run `node docs/figures/draw.mjs`. Never edit an
SVG by hand; the next redraw would erase the edit.
