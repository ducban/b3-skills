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

## Layout

- `skills/<name>/` holds one Agent Skill each, installed with `npx skills add ducban/b3-skills`
  (skills.sh). Keep each folder to what an agent reads at run time: `SKILL.md` plus the
  files it points to. The CLI copies the whole folder to every agent.
- `mods/<name>/` holds one Claude Code mod (hooks module) each, installed with `/plugin`
  from `.claude-plugin/marketplace.json`. Skills are not in the marketplace on purpose:
  installing a skill both ways loads two copies with the same name.
- `dev/<skill>/` holds maintainer tooling that agents never read: evals and Vale.
  `dev/b3-write-human/skills/b3-write-human` is a symlink so `claude plugin eval
  dev/b3-write-human` can load the skill.

## Versions

A skill's version is `metadata.version` in its `SKILL.md`. A mod's version is `version` in
its `.claude-plugin/plugin.json`, plus whatever constant the mod prints, kept equal.

## Figures in the docs

The SVGs under `docs/figures/` come from `docs/figures/draw.mjs`, which imports the repo's
own `figlib.mjs`. Change the script and run `node docs/figures/draw.mjs`. Never edit an
SVG by hand; the next redraw would erase the edit.
