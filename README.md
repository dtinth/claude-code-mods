# claude-code-mods

Mods for Claude Code by [dtinth](https://github.com/dtinth). This repository
is a Claude Code marketplace named `dtinth-mods`.

## Plugins

| Plugin | What it does |
| --- | --- |
| [`polite-compaction`](polite-compaction/) | Shows context size and cost. Asks the agent to flush its notes before compaction. |

## Install

In Claude Code:

```
/plugin marketplace add dtinth/claude-code-mods
/plugin install polite-compaction@dtinth-mods
```

From a shell:

```
claude plugin marketplace add dtinth/claude-code-mods
claude plugin install polite-compaction@dtinth-mods
```

To get new versions later, run `claude plugin marketplace update dtinth-mods`.

## Discussion

Talk about these mods in [issue #1](https://github.com/dtinth/claude-code-mods/issues/1).
