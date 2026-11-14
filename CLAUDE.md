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

## Build & Test

Nothing here builds; these are the checks a change must pass. Run each from the folder named.

| Part | Folder | Commands |
|---|---|---|
| bgh | `mods/bgh` | `bun test tests/` · `claude plugin validate .` · type-check (below) |
| status-line | `mods/status-line` | `claude plugin test .` · `claude plugin validate .` · type-check (below) |
| Vale tooling | repo root | `python3 dev/b3-write-human/do-luong/sinh-tu-sao.py --check` |
| Figures | repo root | `node docs/figures/draw.mjs`, then `git diff --stat docs/figures` shows only the SVGs you meant to change |

Type-check a mod with `bun x -p typescript tsc -p .` from its folder, once the engine has
written `.claude-plugin/types/` (see "Writing mods"). `ICON_MISSING` is the one expected
`validate` warning.

## Figures in the docs

The SVGs under `docs/figures/` come from `docs/figures/draw.mjs`, which imports the repo's
own `figlib.mjs`. Change the script and run `node docs/figures/draw.mjs`. Never edit an
SVG by hand; the next redraw would erase the edit.

## Writing mods

Learned the hard way on sl-mod/status-line and bgh. Read before touching `mods/`.

- `$` may only be passed to functions declared at the top level of the module; the
  loader refuses `$` handed to anything nested inside `register`.
- A mod's `$.store` file is `~/.claude/plugins/store/<plugin>_<marketplace>-<hash>.json`.
  Renaming a mod or moving it to another marketplace starts it on an empty store; ship a
  one-time migration (status-line's `migrateStore` is the pattern).
- `prompt.submit` returning `{ drop }`: the engine puts the draft back in the box itself.
  Filling the box from the hook doubles the text. Esc after a drop loses it for good,
  hence `/sl restore`.
- `usage.context.percent` disappears after a compaction until the next response.
- On managed machines `cc-plugin-sec-default@builtin` swallows `session.compact`,
  `classic.PostCompact`, `SessionStart` and `PostToolUse`; status-line's 10 s tick and
  the turn.step halving test exist for that.
- The hook budget is 10 s, but time spent inside `$` calls doesn't count.
- Guard every `$.process.run` in a gating hook with `.catch`; validate's warning about
  it is real.
- Tests: `$.store` isn't on the test `$`, so assert through `/sl debug` or a command;
  a second `on('ui.open')` or `mock.clock(on)` in one test fails the whole load;
  `$.command.run` needs `origin` and `presentation`; a fake cwd's length changes band
  layout, so keep the one the tests use.
- Type-check: the engine writes `.claude-plugin/types/` only for a folder it has loaded
  (`claude --plugin-dir mods/<name>`). Without it, `tsc -p .` emits `.js` files next to
  the sources; delete them, never commit them. `tsc` isn't on PATH on Arch; `bun x tsc -p .`.
- Keep non-ASCII in mod source as `\u{…}` escapes. The Nerd Font rows in status-line's
  READMEs must stay byte-identical when a README is rewritten.
- status-line's guard holds any Bash containing `rm -f`, so keep that out of scratch
  commands.
- Figures: rsvg-convert renders them black (CSS custom properties). Screenshot with
  `chrome --headless=new --screenshot`; for dark mode, sed the `@media` line to `all`
  in a scratch copy.

Ban's standing decisions for mods:

- Tokens, never dollars, and no price table in status-line.
- Every borrowed idea gets an ACKNOWLEDGEMENTS.md line (person, project, licence, the
  version that took it). Ideas only, no copied code.
- A user-visible behaviour change bumps the mod's `plugin.json` version; docs-only
  commits don't.
- No absolute paths in repo code and no assumed binaries.
- Vietnamese READMEs are written straight in Vietnamese, not translated. Cell and
  switch names stay English, since that's what the panes show.
- Nothing is drawn under the prompt (`PromptHint`); effort is a pick list.
