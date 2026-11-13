# B3 Grammar Helper (`bgh`)

Grammar ghost text in the Claude Code prompt box. A wrong word gets a yellow underline and the fix shows dim right after it. A band above the prompt lists every fix and who suggested it.

```
pause 0.3 s ─► harper-cli (offline)              ─► underline + ghost text
pause 1.5 s ─► LLM chain, sentences not cached    ─► word choice, phrasing (wins a clash)
               OpenRouter → OpenAI → Fireworks → Haiku (session)
every check ─► Langfuse trace (OTLP) · alt+a = score accepted 1 · send unfixed = 0
session start ─► model lists (12 h) · a dropped model gives way · tally per model
```

## Install

```
/plugin marketplace add ducban/b3-skills
/plugin install bgh@b3-skills
```

Coming from `b3-grammar-helper` (0.4.x and earlier)? The mod's short name is now `bgh`, so the command is `/bgh`. Swap the plugin once:

```
/plugin uninstall b3-grammar-helper@b3-skills
/plugin install bgh@b3-skills
```

Your keys file moves to the new folder by itself on first start. Settings, the ignore list and the cache live in the plugin's own store, which goes by the plugin's name, so they start fresh.

The same install works on Linux, macOS and Windows. The mod is plain JavaScript run by Claude Code; only the pieces below differ per machine.

| | Arch Linux | macOS | Windows |
|---|---|---|---|
| Harper | `sudo pacman -S harper` | `brew install harper` | `harper-cli-x86_64-pc-windows-msvc.zip` from the releases page, `harper-cli.exe` on PATH |
| Keys file | `~/.config/bgh/.env` | `~/.config/bgh/.env` | `%APPDATA%\bgh\.env` |
| Cache | `~/.cache/bgh/` | `~/.cache/bgh/` | `%LOCALAPPDATA%\bgh\` |
| alt+a / alt+i | works | turn on "Use Option as Meta key" in the terminal, or Option types `å` | works |

Any other Linux (a VPS, Ubuntu, Debian) takes the release build. No Rust needed:

```bash
mkdir -p ~/.local/bin
curl -sL https://github.com/Automattic/harper/releases/latest/download/harper-cli-x86_64-unknown-linux-gnu.tar.gz | tar xz -C ~/.local/bin
harper-cli --version
```

Use `aarch64` in the file name on an ARM machine, and make sure `~/.local/bin` is on PATH. Every build is on [the releases page](https://github.com/Automattic/harper/releases/latest). Then press `h` in the settings pane.

Without Harper the LLM stage still runs. `XDG_CONFIG_HOME` and `XDG_CACHE_HOME` move the folders on Linux and macOS.

## Keys for alt+a and alt+i

The band's buttons borrow two engine actions that do nothing while you're in the chat. Bind them once in `~/.claude/keybindings.json`, in the `Global` block:

```json
"alt+a": "app:cycleDiffBase",
"alt+i": "app:toggleDiffNoiseFilter"
```

alt+a applies every fix on the band. alt+i ignores the first flagged word from then on.

## Commands

| Command | Does |
|---|---|
| `/bgh` | the setup guide while something is missing, the settings once all is ✓ |
| `/bgh setup-guide` | what this machine still needs |
| `/bgh settings` | grammar, LLM route and model, delay, Langfuse, cache, ignored words |
| `/bgh debug` | versions, which keys are set (names only), routes, model lists, accepted % per model, last trace, last check with timings |
| `/bgh test` | runs every route and Langfuse once on a sample sentence; each row in `bgh debug` shows `testing…` and turns ✓ or ✗ with its time; the model lists are fetched again |
| `/bgh status` | opens `bgh debug` |
| `/bgh on`, `off` | switch checking on or off |
| `/bgh reload` | read the keys file again |
| `/bgh ignore <word>`, `unignore <word>` | add to or take off the ignore list |
| `/bgh ignored` | opens `bgh settings`, where the list is |
| `/bgh clear-cache` | forget the remembered LLM answers |
| `/bgh help` | the `bgh help` tab: every command and every key |

Commands you read open a pane; the four open together as tabs (`bgh setup`, `bgh settings`, `bgh debug`, `bgh help`), the one you asked for in front, and Esc closes them. Commands that do one thing (`on`, `off`, `reload`, `ignore`, `unignore`, `clear-cache`) stay text and pop a toast. Where a pane can't be drawn, every command answers in text instead.

### Setup guide

Four steps, each ✓ or ✗ with the fix under it. Harper's step lists macOS, Arch and other Linux together, this machine marked, so the page read on one machine still tells you what the other needs.

| Step | ✓ when | ✗ shows |
|---|---|---|
| 1. Harper | `harper-cli` runs | `brew install harper` · `sudo pacman -S harper` · the release-build `curl` line; `h` looks again |
| 2. API keys | a route key is set | the keys file to fill in; `r` reloads it |
| 3. alt+a alt+i | both actions are in `keybindings.json` | the two lines to add, and Option-as-Meta for macOS |
| 4. Langfuse | no keys (it's optional), or the last trace got through | when it was sent, the HTTP status, what to change |

A key or `LANGFUSE_*` line left behind a `#` in the keys file is flagged on top, since the mod never reads it. `x` runs `/bgh test`.

### Settings

| Key | Setting |
|---|---|
| `g` | grammar check on or off |
| `l` | LLM pass on or off (off = Harper only) |
| `f` | which route goes first: `auto`, or one that has a key |
| `m` | model for that route, from a short list; a model the provider dropped shows `(gone)` and is skipped |
| `d` | pause before the LLM is asked: 800, 1500 or 3000 ms |
| `t` | Langfuse tracing on or off |
| `c` | forget the cached LLM answers |
| `1`–`9` | take a word off the ignore list |

Choices are saved in the mod's own store and carry over to the next session; each machine keeps its own.

### Models that disappear, and which one you keep

The pick lists are written into the mod, and providers retire models. So at session start, at most every 12 hours, the mod fetches each provider's model list: OpenRouter's always (it needs no key), OpenAI's and Fireworks' when their key is set. `/bgh test` fetches them again.

- A model the provider no longer lists is marked `(gone)` in the `m` row and skipped when you cycle. The route runs the first listed pick instead, and a toast names the swap once. Your choice stays saved, so it comes back if the model does.
- On OpenRouter, a newer model of the same vendor, family and kind that costs the same or less shows as `newer: …`. It's a hint. Nothing switches by itself.
- Every fix you take with alt+a counts as accepted, and every draft sent with fixes still showing counts as passed up. The tally is kept per model, on this machine, and reads like `qwen3-235b-a22b-2507 72% (40) · haiku 55% (31)` in `/bgh debug`. It's the number to pick a model by. Langfuse traces carry the model as a tag too, so the `accepted` score splits the same way there.

### Langfuse regions

Keys only work in the region they were made in. Leave `LANGFUSE_BASE_URL` blank for EU (`https://cloud.langfuse.com`), or set `https://us.cloud.langfuse.com`, `https://jp.cloud.langfuse.com` or `https://hipaa.cloud.langfuse.com`. A 401 from `/bgh test` names the URL the mod used.

## Keys

API keys never go in the pane. Put them in the environment or in the keys file from the table above. On first start the mod writes that file with every key name and blank values, owner-only on Linux and macOS; fill in what you have and run `/bgh reload`. It never writes over a file that already holds a value. Point `B3_GRAMMAR_ENV_FILE` at b3-dict's `.env` to share it. The environment wins over the file.

| Variable | Does |
|---|---|
| `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `FIREWORKS_API_KEY` | Each key adds its route to the chain, in that order |
| `B3_GRAMMAR_PROVIDER` | Route to put first when the pane says `auto` |
| `B3_GRAMMAR_MODEL` | Model of the first route when the pane hasn't picked one |
| `B3_GRAMMAR_LLM=off` | Harper only, whatever the pane says |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` | Tracing, only when both keys are set. The draft text is sent |

No key at all still works: the chain falls through to Haiku on the session's own login.

## What it skips

Drafts under four words, slash commands, `!` shell lines, Vietnamese, and anything inside code, paths, URLs, flags, `@mentions`, `{placeholders}` and identifiers. Words on the ignore list too.

## Cost

LLM replies are cached per sentence across sessions, and a call that a newer edit made stale is dropped. The settings pane shows the session's spend where the provider reports cost (OpenRouter does).

## Tests

`bun test tests/` covers the pure logic in `hooks/core.ts`, Windows folders included.
