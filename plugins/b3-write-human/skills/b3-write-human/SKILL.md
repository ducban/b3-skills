---
name: b3-write-human
description: |
  Write like a person from the first draft. Load BEFORE producing any
  user-facing prose: docs, README, blog posts, emails, PR descriptions,
  commit bodies, marketing copy, wiki pages, slide text. Bans the
  business-jargon vocabulary that makes generated text obvious, enforces
  uneven sentence cadence, requires contractions, and gates every output
  behind a self-audit. Complements `humanizer`, which cleans text that
  already exists; this one governs text as it is being written.
metadata:
  version: "1.0.0"
  companion: humanizer
---

# b3-write-human

A generation-time rule set. You load this before you write, not after.

## Division of labor

| Situation | Use |
|---|---|
| You are about to produce prose | this skill |
| A draft already exists and needs cleaning | `humanizer` |
| Long or high-stakes piece | this skill to draft, then `humanizer` to audit |

`humanizer` carries the full 33-pattern catalog, the false-positive list, and voice calibration. Don't restate it here. When a judgment call goes beyond the rules below, read `~/.claude/skills/humanizer/SKILL.md` instead of guessing.

## Banned vocabulary

`humanizer` §7 covers the encyclopedic tells (delve, tapestry, testament, vibrant, pivotal, underscore, foster, landscape). These are the business and product-marketing ones it misses. Don't use them:

**Verbs:** leverage, optimize, streamline, navigate (figurative), catalyze, encapsulate, harness, unlock, empower, elevate, supercharge, unpack, spearhead, orchestrate (outside software), curate.

**Nouns:** blueprint, beacon, journey (figurative), roadmap (unless a real one exists), realm, paradigm, synergy, hub, ecosystem (outside biology or a real platform), framework (as filler), lens (figurative), north star, superpower, game-changer, powerhouse, sweet spot, secret sauce.

**Adjectives and adverbs:** dynamic, paramount, seamless, revolutionary, cutting-edge, best-in-class, robust (outside engineering), holistic, bespoke, effortless, frictionless, turnkey, world-class, next-level, actionable.

**Phrases:** "look no further", "the beauty of X is", "at the end of the day", "when it comes to", "that's where X comes in", "think of it as", "here's the thing", "let's dive in", "unlock the power of", "take your X to the next level", "in an era where".

Each one has a plain replacement. *Leverage* is *use*. *Optimize* is *speed up*, *shrink*, or *tune*, whichever you actually mean. *Seamless* usually means nothing and gets cut.

## Cadence

Uniform rhythm is the loudest tell after vocabulary.

- Mix lengths on purpose. Put a sentence under five words next to one that runs thirty. Never write three medium sentences in a row.
- Break the rule of three. If you catch yourself writing a triad of adjectives, examples, or bullets, cut to two or push to four. Three is the machine default.
- Start with the point. Delete "Furthermore", "Moreover", "It's worth noting that", "In conclusion", "Importantly", "Ultimately". If the connection between paragraphs needs a word, the paragraph order is wrong.
- Active voice. "The script writes the file", not "the file is written by the script".
- Contractions always: it's, don't, can't, you're, won't, that's. Skip only in legal text or formal Vietnamese business writing.
- Vary how paragraphs open. Two paragraphs starting with the same word or the same grammatical shape reads as generated.

## Vietnamese output

The banned list above is English. Vietnamese has its own tells, mostly translationese:

- Cụm rỗng: "trong thời đại số hiện nay", "đóng vai trò quan trọng", "không chỉ... mà còn", "góp phần nâng cao", "mang tính đột phá", "tối ưu hoá trải nghiệm", "giải pháp toàn diện".
- Cấu trúc bị động dịch từ tiếng Anh: "được thực hiện bởi", "được xem như là". Viết thẳng chủ ngữ.
- Nhồi Hán Việt khi có từ thuần Việt: "tiến hành kiểm tra" là "kiểm tra"; "thực hiện việc gửi" là "gửi".
- Ba vế đối xứng ("nhanh chóng, chính xác, hiệu quả") là dấu hiệu máy viết y như rule of three tiếng Anh.

## Hard limits

Rewriting tone is allowed. Inventing content is not.

- No fact, name, number, date, quote, statistic, or citation that isn't in the source material or from the user. A vague sentence gets cut, never decorated with a specific you made up.
- Preserve the message. Compress the dull parts and dwell where a person would, but every claim in the source survives.
- Don't touch quoted text, proper names, titles, code, or an example where a banned phrase is the thing being discussed.

## Self-audit gate

Before you hand over any prose, answer these three. Out loud in your reasoning, not silently.

1. Scan for banned words. Did any survive? Replace them.
2. Read the paragraph openings in a column. Do they repeat a shape? Rewrite until they don't.
3. Ask the blunt question: **"If someone claimed this was AI-generated, what would they point at?"** Whatever you name, fix it, then ship.

If the answer to (3) is "nothing", you either did the work or stopped looking. Check the sentence lengths one more time.

## Do not over-correct

Plain writing is not a defect. Don't strip formal vocabulary just because it sounds educated, don't chop every long sentence, and don't manufacture personality in reference docs, changelogs, or API notes. Neutral and flat is the correct human voice for those. `humanizer`'s "What NOT to flag" section is the reference when you're unsure whether something is a tell or just prose.
