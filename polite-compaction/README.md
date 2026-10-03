# polite-compaction

Part of [claude-code-mods](https://github.com/dtinth/claude-code-mods).

A Claude Code mod. It does two jobs:

1. It shows the context size and the session cost in a gray line above the
   prompt.
2. It helps the agent keep its notes through compaction.

## Why

Auto-compact can run in the middle of a task. The summary then loses small
details. This mod asks the agent to save what it needs, in its own words and
to a place of its own choice, before the conversation is compacted.

## What you see

```
ctx 123k / 1000k (12%) · $4.56
```

- `ctx`: tokens in the context now, the size of the context window, and the
  percentage used.
- `$`: the cost of the session so far, the same figure `/cost` shows.
- The line is gray. It is hidden while a survey shows.

## How the flush works

1. After each turn, the mod reads the context size.
2. When the context reaches the threshold (default 300k tokens), the mod sends
   this prompt: "Context window reached 300k tokens. The conversation will be
   compacted soon. If there is anything to flush, please do so now, so you can
   continue well after compaction. When you are ready, end your reply with
   `<ready-for-compaction/>`".
3. The agent saves what it needs. The prompt does not name a place.
4. When a reply ends with `<ready-for-compaction/>`, the mod runs a normal
   compaction (no custom instructions).

Scope:

- The mod works on the main session only. It does not measure or ask
  sub-agents. Their context is separate, and they do not get the flush prompt.
- The mod acts only between turns. A turn is one run of the model, from a
  prompt to the final answer, and it can include many tool calls. The mod
  reads the context size when the turn ends. It does not inject the prompt in
  the middle of a turn. The prompt goes in as a new turn, after the session is
  idle.
- A long turn can pass the threshold, and also the auto-compact point, before
  the mod gets a chance to ask. Keep the threshold well below auto-compact.

Rules:

- The mod asks one time for each crossing of the threshold. It arms again when
  the context falls below the threshold.
- If you interrupt the turn, or the turn ends in an error, the mod does not
  ask again until after the next compaction.
- Compaction cannot start while a turn runs. The mod tries again every 500 ms,
  up to 20 times.
- Set the threshold below the auto-compact point. If auto-compact runs first,
  the flush does not happen.

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| `thresholdTokens` | `300000` | Context size at which the agent is asked to flush. |

Change it in the config menu. The mod reloads with the new value.

## Hooks used

| Event | Use |
| --- | --- |
| `session.start` | Set the first text of the line. |
| `session.measure` | Update the line. Ask the agent at the threshold. |
| `turn.complete` | Look for `<ready-for-compaction/>`. Start compaction. |
| `ui.render` (`AbovePrompt`) | Draw the line. |

## Files

```
.claude-plugin/plugin.json   manifest and the threshold setting
hooks/hooks.json             names the hooks module
hooks/register.tsx           the mod
hooks/register.test.ts       test
types/index.d.ts             type of the value the line keeps in $.state
```

## Install

This repository is a Claude Code marketplace named `dtinth-mods`. In Claude
Code, run:

```
/plugin marketplace add dtinth/claude-code-mods
/plugin install polite-compaction@dtinth-mods
```

From a shell, use `claude plugin marketplace add dtinth/claude-code-mods` and
`claude plugin install polite-compaction@dtinth-mods`. The source can also be a
local path to a clone of the [repository](https://github.com/dtinth/claude-code-mods).

## Develop

```
claude plugin validate .
claude plugin test .
```

To load the mod in a terminal session, run `claude --plugin-dir <path to this
folder>`.

## Limits

- The mod needs a Claude Code build that has function hooks (a mod API).
  That API is in early access and can change.
- The test uses a stand-in for compaction. A real compaction is checked by hand.
