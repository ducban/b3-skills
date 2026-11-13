# b3-grammar-helper

Grammar ghost text in the Claude Code prompt box. A wrong word gets a yellow underline and the fix shows dim right after it. A band above the prompt lists every fix and who suggested it.

```
pause 0.3 s ─► harper-cli (offline)              ─► underline + ghost text
pause 1.5 s ─► LLM chain, sentences not cached    ─► word choice, phrasing (wins a clash)
               OpenRouter → OpenAI → Fireworks → Haiku (session)
every check ─► Langfuse trace (OTLP) · alt+a = score accepted 1 · send unfixed = 0
```

## Install

```
/plugin marketplace add ducban/b3-skills
/plugin install b3-grammar-helper@b3-skills
```

The same install works on Linux, macOS and Windows. The mod is plain JavaScript run by Claude Code; only the pieces below differ per machine.

| | Arch Linux | macOS | Windows |
|---|---|---|---|
| Harper | `sudo pacman -S harper` | `brew install harper` | `harper-cli-x86_64-pc-windows-msvc.zip` from the releases page, `harper-cli.exe` on PATH |
| Keys file | `~/.config/b3-grammar-helper/.env` | `~/.config/b3-grammar-helper/.env` | `%APPDATA%\b3-grammar-helper\.env` |
| Cache | `~/.cache/b3-grammar-helper/` | `~/.cache/b3-grammar-helper/` | `%LOCALAPPDATA%\b3-grammar-helper\` |
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

## Settings

`/b3-grammar-helper` opens the settings pane. Each row has a key:

| Key | Setting |
|---|---|
| `g` | grammar check on or off |
| `h` | look for `harper-cli` again after installing it |
| `l` | LLM pass on or off (off = Harper only) |
| `f` | which route goes first: `auto`, or one that has a key |
| `m` | model for that route, from a short list |
| `d` | pause before the LLM is asked: 800, 1500 or 3000 ms |
| `t` | Langfuse tracing on or off |
| `c` | forget the cached LLM answers |
| `r` | reload the keys file |
| `1`–`9` | take a word off the ignore list |

Esc closes the pane. Choices are saved in the mod's own store and carry over to the next session; each machine keeps its own.

Text commands still work: `/b3-grammar-helper status | on | off | reload | ignore <word> | unignore <word> | ignored`.

## Keys

API keys never go in the pane. Put them in the environment or in the keys file from the table above. On first start the mod writes that file with every key name and blank values, owner-only on Linux and macOS; fill in what you have and run `/b3-grammar-helper reload`. It never writes over a file that already holds a value. Point `B3_GRAMMAR_ENV_FILE` at b3-dict's `.env` to share it. The environment wins over the file.

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
