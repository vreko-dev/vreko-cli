/**
 * Claude Sync Command
 *
 * Generates or refreshes Claude Code integration files for a workspace:
 *   .mcp.json                           -  MCP server auto-discovery
 *   .claude/agents/vreko-preflight.md  -  intelligence-enriched preflight agent
 *   .claude/agents/vreko-session.md    -  session lifecycle agent
 *   .claude/commands/snap-check.md        -  /snap-check slash command
 *
 * Intelligence enrichment: fetches baseline data (fragile files, co-change clusters)
 * from the Vreko service via `baseline/get` IPC call. Degrades gracefully if the
 * service is unavailable.
 *
 * @module commands/claude-sync
 */

import { resolve } from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { type BaselineData, generateClaudeIntegration } from "../services/claude-integration.js";
import { connectToDaemon } from "../services/service-client.js";

// =============================================================================
// Command Definition
// =============================================================================

export function createClaudeSyncCommand(): Command {
	return new Command("claude-sync")
		.description("Generate or refresh Claude Code integration (.mcp.json, .claude/agents/)")
		.argument("[path]", "Workspace path (default: current directory)")
		.option("--force", "Overwrite existing files")
		.option(
			"--channel",
			"Include channel server config (research preview  -  requires --channels flag at Claude Code startup)",
		)
		.option("--json", "Output structured JSON result")
		.action(
			async (
				pathArg: string | undefined,
				_options: { force?: boolean; channel?: boolean; json?: boolean },
				cmd: Command,
			) => {
				// Use optsWithGlobals so the root-level --json flag is also honoured
				const merged = cmd.optsWithGlobals<{ force?: boolean; channel?: boolean; json?: boolean }>();
				await runClaudeSync(pathArg, merged);
			},
		);
}

// =============================================================================
// Core Logic
// =============================================================================

async function runClaudeSync(
	pathArg: string | undefined,
	options: { force?: boolean; channel?: boolean; json?: boolean },
): Promise<void> {
	const workspacePath = resolve(pathArg ?? process.cwd());
	const jsonMode = !!options.json;
	const spinner = jsonMode ? null : ora("Fetching intelligence...").start();

	// Fetch baseline data for intelligence enrichment (non-blocking)
	let baseline: BaselineData | undefined;
	try {
		const client = await connectToDaemon();
		const record = await client.call<{
			fragileFiles?: Array<{ path: string; compositeScore: number }>;
			coChangeClusters?: Array<{ files: string[]; coOccurrenceRate: number }>;
		}>("baseline/get", { workspace: workspacePath });

		if (record?.fragileFiles !== undefined || record?.coChangeClusters !== undefined) {
			baseline = {
				fragileFiles: record.fragileFiles,
				coChangeClusters: record.coChangeClusters,
			};
		}

		if (spinner) {
			spinner.text = "Generating Claude Code integration...";
		}
	} catch {
		// Non-fatal  -  generate without intelligence enrichment
		if (spinner) {
			spinner.text = "Generating Claude Code integration (service unavailable, no intelligence)...";
		}
	}

	const result = generateClaudeIntegration(
		{
			workspacePath,
			overwrite: options.force ?? false,
			includeChannel: options.channel ?? false,
		},
		baseline,
	);

	if (jsonMode) {
		console.log(JSON.stringify(result));
		return;
	}

	// === Nothing to do ===
	if (result.filesWritten.length === 0 && result.filesSkipped.length === 0) {
		spinner?.warn("Nothing generated");
		return;
	}

	// === All skipped (already up-to-date) ===
	if (result.filesWritten.length === 0) {
		spinner?.info("Files already exist  -  use --force to overwrite");
		for (const f of result.filesSkipped) {
			console.log(chalk.gray(`  ~ ${f}`));
		}
		return;
	}

	// === Files written ===
	spinner?.succeed(`Generated ${result.filesWritten.length} file${result.filesWritten.length !== 1 ? "s" : ""}`);

	for (const f of result.filesWritten) {
		console.log(chalk.gray(`  + ${f}`));
	}

	if (result.filesSkipped.length > 0) {
		for (const f of result.filesSkipped) {
			console.log(chalk.gray(`  ~ ${f}`));
		}
	}

	console.log();

	if (result.intelligenceAvailable) {
		console.log(
			chalk.gray(
				`  Intelligence: ${result.fragileFilesIncluded} fragile file${result.fragileFilesIncluded !== 1 ? "s" : ""}, ${result.coChangePatternsIncluded} co-change pattern${result.coChangePatternsIncluded !== 1 ? "s" : ""}`,
			),
		);
	} else {
		console.log(chalk.gray("  Intelligence: none yet  -  run vr analyze to build it"));
	}

	console.log(chalk.gray("  Tip: commit .mcp.json and .claude/ to share with your team"));
}
