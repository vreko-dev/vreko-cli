<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/lockup-white.png" width="400">
    <img alt="Vreko" src="./assets/lockup-dark.png" width="400">
  </picture>
</p>

<p align="center">AI-aware developer intelligence from the command line</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@vreko/cli"><img src="https://img.shields.io/npm/v/%40vreko%2Fcli?style=flat-square&color=4ADE80" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@vreko/cli"><img src="https://img.shields.io/npm/dm/%40vreko%2Fcli?style=flat-square&color=4ADE80" alt="npm downloads" /></a>
  <a href="https://github.com/vreko-dev/cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square" alt="License" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" /></a>
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#what-it-does">What it does</a> ·
  <a href="#commands">Commands</a> ·
  <a href="https://docs.vreko.dev/cli">Docs</a>
</p>

---

Vreko watches what your AI tools do, learns your codebase's fragile zones, and surfaces the right context before problems occur. The CLI is the primary interface to the local Vreko daemon (`vrekod`).

## Install

```bash
npm install -g @vreko/cli
```

Shorthand: `vr --help`

## What it does

- Starts and manages the local Vreko daemon
- Surfaces codebase intelligence from the terminal
- Exposes session snapshots, risk scores, and pattern learnings
- Bridges to MCP-compatible AI tools via `vreko_pulse`
- Generates `.agents/workspace.json` and `AGENTS.md` for AI agent consumption

## Intelligence, not just recovery

Vreko learns from what breaks — secrets overwritten, phantom dependencies introduced, config files mangled by AI tools. Over time it knows your codebase's specific fragile zones and predicts problems before they occur. Recovery is instant when you need it. The goal is you rarely do.

## Proof stack

- 94% AI detection accuracy across Cursor, Copilot, and Claude Code
- <50ms overhead — zero-friction protection
- <1s context injection — full intelligence loaded instantly
- Code never leaves your machine — local-first, privacy-first

## Commands

| Command | Purpose |
|---------|---------|
| `vr init` | Initialize Vreko in the current workspace |
| `vr status` | Health check — vitals, session state, detected issues |
| `vr check` | Pre-commit risk scan on staged files |
| `vr snapshot` | Create, list, or restore snapshots |
| `vr context` | Pre-task intelligence briefing |
| `vr learn` | Capture a mid-session insight |
| `vr pulse` | Mid-session intelligence snapshot |
| `vr patterns` | Show learned patterns |
| `vr doctor` | Diagnostic checks and self-healing |
| `vr mcp` | Start/configure the MCP server |
| `vr start` / `vr stop` | Control the vrekod daemon |

## MCP Integration

The CLI bundles the Vreko MCP server. Add to your AI assistant's config:

```json
{
  "mcpServers": {
    "vreko": {
      "command": "npx",
      "args": ["-y", "@vreko/cli", "mcp", "--stdio", "--workspace", "/absolute/path/to/your/project"]
    }
  }
}
```

## Global Flags

```
--verbose / VREKO_VERBOSE   Verbose output
--debug / VREKO_DEBUG       Debug mode (implies --verbose)
--json / VREKO_JSON         JSON output for scripts and LLMs
--plain / VREKO_PLAIN       Disable TUI — plain text for CI/automation
-q, --quiet                 Suppress non-essential output
-y, --yes                   Skip confirmation prompts
```

## Docs

[docs.vreko.dev/cli](https://docs.vreko.dev/cli)

## License

Apache-2.0
