# Backlog

Ideas approved for later, not scheduled. Each item names its owner machine (POLICY.md rule 9).

## bgh: an `amd` route for AMD Token Lab (owner: Mac)

Approved by Ban 17/11/2026. The keys are already in `~/.config/bgh/.env` on Arch, as
`AMD_BASE_URL` and `AMD_API_KEY`; bgh ignores them until this ships.

- The endpoint is OpenAI-compatible: `https://api.tokenlab.amd.com/v1`, with `/chat/completions`
  and `/models` below it, Bearer key. AMD's own note: "Set OPENAI_BASE_URL to the base URL and
  OPENAI_API_KEY to your key". bgh uses `AMD_*` instead, so the real OpenAI route keeps its own.
- Add `amd` to `ROUTES` (`mods/bgh/hooks/core.ts:144`), last of the API routes, so the
  key order stays openrouter, openai, fireworks, amd.
- `KEY_NAME.amd = 'AMD_API_KEY'`. The base URL comes from `AMD_BASE_URL`, falling back to
  `https://api.tokenlab.amd.com/v1` when blank, trailing `/` trimmed. This is the first route
  whose URLs are not constants: the models URL (`:255`) and chat URL (`:420`) tables become
  functions of the env for `amd`.
- `DEFAULT_MODEL.amd = 'DeepSeek-V4-Flash'`; `MODEL_CHOICES.amd = ['DeepSeek-V4-Flash',
  'MiniCPM5-2B']`. Check the exact ids against `GET /models` on the first `/bgh test`: the
  listed id may carry a vendor prefix or other casing. `liveModel` already falls back along
  `MODEL_CHOICES` when an id is gone.
- `ENV_TEMPLATE` (`core.ts:681`), the env list in `register.tsx:122` and `:481`, the setup
  hint (`:935`), HELP, README and `B3_GRAMMAR_PROVIDER`'s comment gain `amd` / `AMD_*`.
- Existing `.env` files get the new names too. Today the template is written only when the
  file is missing or holds no value (`needsTemplate`, `register.tsx:513-520`), so machines that
  already have keys never see `AMD_*`. At `session.start`, for each key name in `ENV_TEMPLATE`
  that the file doesn't mention at all (set, blank or commented), append it as a commented line
  (`#AMD_BASE_URL=`, `#AMD_API_KEY=`) under a `# Added by bgh <version>` comment. Append only:
  never rewrite or reorder a line, keep the file's mode, skip when `B3_GRAMMAR_ENV_FILE` points
  elsewhere or the file can't be read. Toast `Grammar: added N key names to <file>`. A pure
  `missingKeyNames(fileText, template)` in `core.ts` decides what to add.
- Tests: route order with `AMD_API_KEY` set, `AMD_BASE_URL` blank and set, the two URLs;
  `missingKeyNames` with a name set, blank, commented, and absent, and a second run adding nothing.
- Version: bgh minor bump (a new route).
- About an hour with tests (45 minutes for the route, 15 for the append).

## Shipped

- status-line 0.5.0, guard asks only on a threat: done on Arch 16/11/2026. The two items that were here
  (the approved design and the earlier "backs up instead of asking" it superseded) are in
  `mods/status-line/README.md`, "Asking only when something is at risk". One change from the design:
  `rm` and `git clean` targets are copied to the trash, not moved, so the command runs exactly as
  written (an `rm -r` whose target had gone would fail).
