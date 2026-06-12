/**
 * Claude Code Integration Generator
 *
 * Generates .mcp.json, .claude/agents/, and .claude/commands/ files that
 * enable Claude Code auto-discovery of Vreko tools and workspace intelligence.
 *
 * Data source: BaselineRecord (fetched via `baseline/get` IPC call) provides
 * fragileFiles (compositeScore 0-100) and coChangeClusters (coOccurrenceRate 0-1).
 *
 * @module services/claude-integration
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveVrekoBinaryPath } from "@vreko/mcp-config";

// =============================================================================
// Types
// =============================================================================

export interface ClaudeIntegrationConfig {
	/** Workspace root path */
	workspacePath: string;
	/** Whether to overwrite existing files (default: false) */
	overwrite?: boolean;
	/**
	 * Whether to include channel server config in .mcp.json (default: false).
	 *
	 * NOTE: A .mcp.json entry alone does NOT enable push channel behavior.
	 * Claude Code channels require `claude --channels server:vreko-channel`
	 * at startup. During research preview: `--dangerously-load-development-channels`.
	 * Only set to true when the user explicitly opts in via `vr claude-sync --channel`.
	 */
	includeChannel?: boolean;
}

export interface GenerationResult {
	/** Files that were created or updated */
	filesWritten: string[];
	/** Files that were skipped (already exist and overwrite=false) */
	filesSkipped: string[];
	/** Whether intelligence data was available to enrich agents */
	intelligenceAvailable: boolean;
	/** Count of fragile files included in agent instructions */
	fragileFilesIncluded: number;
	/** Count of co-change patterns included */
	coChangePatternsIncluded: number;
	/** Whether the global ~/.claude/settings.json was updated */
	globalSettingsUpdated: boolean;
}

/** Fragile file entry from BaselineRecord  -  compositeScore is 0-100 */
export interface BaselineFragileFile {
	path: string;
	compositeScore: number;
}

/** Co-change cluster from BaselineRecord */
export interface BaselineCoChangeCluster {
	files: string[];
	coOccurrenceRate: number;
}

export interface BaselineData {
	fragileFiles?: BaselineFragileFile[];
	coChangeClusters?: BaselineCoChangeCluster[];
}

// =============================================================================
// Generator
// =============================================================================

/**
 * Generate Claude Code integration files for a workspace.
 *
 * Idempotent: skips files that already exist unless overwrite=true.
 * Gracefully degrades: generates static content if no baseline data is available.
 */
export function generateClaudeIntegration(config: ClaudeIntegrationConfig, baseline?: BaselineData): GenerationResult {
	const { workspacePath, overwrite = false } = config;
	const result: GenerationResult = {
		filesWritten: [],
		filesSkipped: [],
		intelligenceAvailable: false,
		fragileFilesIncluded: 0,
		coChangePatternsIncluded: 0,
		globalSettingsUpdated: false,
	};

	// Normalize fragile files: compositeScore 0-100 → score 0-1, derive level
	const fragileFiles = (baseline?.fragileFiles ?? [])
		.filter((f) => f.compositeScore >= 30)
		.sort((a, b) => b.compositeScore - a.compositeScore)
		.slice(0, 15)
		.map((f) => ({
			path: f.path,
			score: f.compositeScore / 100,
			level: f.compositeScore >= 80 ? "critical" : f.compositeScore >= 60 ? "fragile" : "moderate",
		}));

	// Extract co-change pairs from clusters (take first two files in each cluster)
	const coChangePairs = (baseline?.coChangeClusters ?? [])
		.filter((c) => c.files.length >= 2 && c.coOccurrenceRate >= 0.5)
		.sort((a, b) => b.coOccurrenceRate - a.coOccurrenceRate)
		.slice(0, 10)
		.map((c) => ({
			fileA: c.files[0] as string,
			fileB: c.files[1] as string,
			frequency: c.coOccurrenceRate,
		}));

	result.intelligenceAvailable = fragileFiles.length > 0 || coChangePairs.length > 0;
	result.fragileFilesIncluded = fragileFiles.length;
	result.coChangePatternsIncluded = coChangePairs.length;

	const files: Array<{ relativePath: string; content: string }> = [
		{ relativePath: ".mcp.json", content: buildMcpJson(config) },
		{
			relativePath: ".claude/agents/vreko-preflight.md",
			content: buildPreflightAgent(fragileFiles, coChangePairs),
		},
		{ relativePath: ".claude/agents/vreko-session.md", content: VREKO_SESSION_AGENT },
		{ relativePath: ".claude/commands/snap-check.md", content: SNAP_CHECK_COMMAND },
	];

	for (const file of files) {
		const fullPath = join(workspacePath, file.relativePath);
		const dir = join(fullPath, "..");

		if (existsSync(fullPath) && !overwrite) {
			const existing = readFileSync(fullPath, "utf-8");
			const existingHash = createHash("sha256").update(existing).digest("hex");
			const newHash = createHash("sha256").update(file.content).digest("hex");
			// Content changed but overwrite=false: mark as modified to surface in output
			const suffix = existingHash !== newHash ? " (modified, use --force to update)" : "";
			result.filesSkipped.push(`${file.relativePath}${suffix}`);
			continue;
		}

		mkdirSync(dir, { recursive: true });
		writeFileSync(fullPath, file.content, "utf-8");
		result.filesWritten.push(file.relativePath);
	}

	result.globalSettingsUpdated = writeVrekoToClaudeCodeGlobalSettings();

	return result;
}

// =============================================================================
// Template builders
// =============================================================================

function buildMcpJson(config: ClaudeIntegrationConfig): string {
	// Resolve absolute command path for MCP server entry.
	// IDE-spawned processes don't inherit shell aliases, so we need a real path.
	// Fallback chain: (a) node + CLI dist index.js, (b) resolved vreko binary
	const { command, args: cmdArgs } = resolveMcpCommand(config.workspacePath);

	const servers: Record<string, unknown> = {
		vreko: {
			type: "stdio",
			command,
			args: cmdArgs,
			instructions:
				"Vreko provides codebase intelligence. Use vreko_pulse to check risk before modifying files. Use vreko_learn to record patterns. Use vreko_end to close sessions.",
		},
	};

	if (config.includeChannel === true) {
		const channelArgs = [...cmdArgs];
		// For node-based command, append --channel flag
		channelArgs.push("--channel");
		servers["vreko-channel"] = {
			type: "stdio",
			command,
			args: channelArgs,
			instructions:
				"Vreko intelligence channel. Pushes real-time warnings about fragile files and risk spikes. Requires: claude --channels vreko-channel",
		};
	}

	return `${JSON.stringify({ mcpServers: servers }, null, 2)}\n`;
}

/**
 * Resolve the MCP command using the vreko binary absolute path.
 *
 * Uses `which vreko` to get the absolute path, with fallbacks to well-known
 * install locations. An absolute path is required because IDE and daemon
 * processes spawn without a shell (no PATH augmentation, no aliases).
 */
function resolveMcpCommand(workspacePath: string): { command: string; args: string[] } {
	return {
		command: resolveVrekoBinaryPath(),
		args: ["mcp", "--stdio", "--workspace", workspacePath],
	};
}

/**
 * Merge a `vreko` entry into ~/.claude/settings.json so Claude Code picks up
 * the MCP server globally, not just via project-level .mcp.json.
 *
 * Idempotent  -  skips if the entry already exists with the same command.
 * Returns true if the file was modified.
 */
function writeVrekoToClaudeCodeGlobalSettings(): boolean {
	const settingsPath = join(homedir(), ".claude", "settings.json");
	if (!existsSync(settingsPath)) {
		return false;
	}

	let settings: Record<string, unknown> = {};
	try {
		settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
	} catch {
		return false;
	}

	const mcpServers = (settings.mcpServers ?? {}) as Record<string, unknown>;
	const command = resolveVrekoBinaryPath();

	// Skip if already wired with the same command
	const existing = mcpServers.vreko as { command?: string } | undefined;
	if (existing?.command === command) {
		return false;
	}

	mcpServers.vreko = { command, args: ["mcp", "--stdio"] };
	settings.mcpServers = mcpServers;

	try {
		writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
		return true;
	} catch {
		return false;
	}
}

function buildPreflightAgent(
	fragileFiles: Array<{ path: string; score: number; level: string }>,
	coChangePairs: Array<{ fileA: string; fileB: string; frequency: number }>,
): string {
	let fragileSection: string;

	if (fragileFiles.length > 0) {
		const lines = fragileFiles
			.map((f) => `- \`${f.path}\`  -  fragility: ${f.level} (score: ${f.score.toFixed(2)})`)
			.join("\n");

		fragileSection = `## Known Fragile Files in This Codebase

The following files have high rollback rates or frequent issues:

${lines}

If the task involves any of these files, always recommend creating
a snapshot before modification.`;
	} else {
		fragileSection = `## Codebase Intelligence

Vreko is still learning about this codebase. Use vreko_pulse
to get real-time risk assessment for any files being modified.
Intelligence will improve as more sessions are tracked.`;
	}

	let coChangeSection = "";

	if (coChangePairs.length > 0) {
		const lines = coChangePairs
			.map((p) => `- \`${p.fileA}\` ↔ \`${p.fileB}\` (${(p.frequency * 100).toFixed(0)}% co-change rate)`)
			.join("\n");

		coChangeSection = `

## Co-Change Patterns

These files historically change together. If modifying one,
check whether the others also need updates:

${lines}`;
	}

	return `---
name: vreko-preflight
description: >
  Run before implementing changes that touch multiple files
  or modify config/infrastructure. Queries Vreko for risk
  context and known fragile patterns in this codebase.
tools:
  - Read
  - Grep
  - Glob
  - mcp__vreko__vreko_pulse
---

You are a preflight check agent for this codebase. Vreko has
accumulated intelligence about which files are risky and which
files always change together.

Before the parent agent modifies files, you:

1. Call vreko_pulse with the workspace path and list of files about to change
2. Check the risk assessment in the response
3. Flag any files with HIGH or CRITICAL fragility
4. Surface co-change patterns (files that must change together)
5. Return a structured summary to the parent agent:
   - Files safe to modify in parallel
   - Files requiring sequential, careful changes
   - Known pitfalls from codebase history
   - Whether a snapshot is recommended before proceeding

Do NOT modify any files. Read-only analysis only.

${fragileSection}${coChangeSection}
`;
}

const VREKO_SESSION_AGENT = `---
name: vreko-session
description: >
  Manage Vreko session lifecycle. Use at the start and
  end of significant implementation work to capture context
  and trigger intelligence collection.
tools:
  - mcp__vreko__vreko
  - mcp__vreko__vreko_learn
  - mcp__vreko__vreko_end
---

You manage Vreko sessions for this codebase.

When starting work:
- Call vreko to begin a session with a descriptive task name
- Note the session context for the parent agent

When completing work:
- Call vreko_learn with any patterns discovered during implementation:
  - Files that needed to change together (co-change pattern)
  - Config that was fragile or surprising (fragile pattern)
  - Dependencies that weren't obvious (dependency pattern)
  - Conventions the codebase follows (convention pattern)
- Call vreko_end to close the session

Capture learnings in this format:
- Pattern type: co-change | fragile | dependency | convention
- Affected files: list of file paths
- Description: what the implementing agent discovered

The more patterns captured, the better Vreko's intelligence
becomes for future sessions.
`;

const SNAP_CHECK_COMMAND = `---
description: Check Vreko risk context for files you're about to change
argument-hint: <file paths or description of planned changes>
---

Query Vreko intelligence for the specified files or task.

1. Call the vreko_pulse MCP tool with the provided context
2. Display risk scores, fragile file warnings, and relevant history
3. If any file has fragility level "fragile" or "critical", warn explicitly
4. List co-change groups  -  files that should be modified together
5. Recommend whether to create a manual snapshot before proceeding
6. If fragile files are involved, suggest the vreko-preflight agent
   for more detailed analysis
`;
