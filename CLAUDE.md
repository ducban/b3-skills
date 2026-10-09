# CLAUDE.md — b3-skills

Guidance for AI coding agents working in this repository.

## Multi-machine rules

This repo is developed on more than one machine — macOS, Arch Linux, and in some cases a
Linode VPS — and more than one of them still commits. Before changing anything here, read
`POLICY.md` in the `memex-vault` repo, which sits under the same `Workspace/Projects/`
tree as this repo. Derive that path, never hardcode it: `/Users/…` is only correct on the
Mac and `/home/…` only on Arch, and the VPS has neither.

The three rules that bite most often:

- **Rule 10** — one directory per OS (`macos/`, `linux-arch/`). Compiled sources use the
  language's own per-OS mechanism instead (Go: `*_darwin.go` / `*_linux.go`).
- **Rule 5** — a commit's `user.name` says which *machine*, the `Co-Authored-By` trailer
  says which *AI*, and the SSH signature is anti-forgery. Three independent slots; a
  commit with no trailer was typed by hand.
- **Rule 9** — whichever machine owns a part is the machine that changes it. No exception
  for a two-minute fix.

### Commit log

Every pushed commit gets one line, written automatically by a local `pre-push` hook into
`DIARY/` — git-ignored, machine-local, one file per machine. **Do not hand-edit it and do
not commit it.** The cross-machine rollup lives in the vault; rule 11 has the shape.

Git does not carry hooks across clones, so a fresh clone starts with none. Check with
`memex-vault/tools/diary/install-hook.sh --check` rather than assuming.
