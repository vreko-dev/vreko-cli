/**
 * Metrics Command
 *
 * @fileoverview Implements `vr metrics` - Show momentum scores for files.
 * Displays which files are critical based on multi-signal analysis.
 *
 * ## Purpose
 *
 * After `vr sync` collects signals and fits normalizers, this command
 * calculates momentum scores and shows which files are most critical.
 *
 * ## Scoring Pipeline
 *
 * ```
 * raw signals → normalize → confidence-weight → adapt weights → weighted sum → gate → suppress
 *      ↑                                                              ↓
 * distributions.json                                         momentum score 0-1
 * ```
 *
 * ## Usage Examples
 *
 * ```bash
 * # Show top critical files
 * vr metrics
 *
 * # Score specific file
 * vr metrics src/auth.ts
 *
 * # Show all files (not only critical)
 * vr metrics --all
 *
 * # Machine-readable output
 * vr metrics --json
 *
 * # Show top N files
 * vr metrics --top 20
 * ```
 *
 * ## Output Format
 *
 * ```
 * 🎯 Critical Files (Momentum Score > 0.7)
 *
 * ┌─────────────────────────────┬───────┬────────────┬─────────────────────┐
 * │ File                        │ Score │ Confidence │ Key Signals         │
 * ├─────────────────────────────┼───────┼────────────┼─────────────────────┤
 * │ src/core/engine.ts          │ 0.92  │ full       │ centrality, changes │
 * │ src/api/routes.ts           │ 0.85  │ full       │ errors, attention   │
 * │ src/utils/helpers.ts        │ 0.78  │ partial    │ centrality          │
 * └─────────────────────────────┴───────┴────────────┴─────────────────────┘
 *
 * 3 critical files out of 142 total
 * ```
 *
 * ## Related
 *
 * - Spec: `docs/roadmap/onboard_momentum.md`
 * - Scorer: `packages/intelligence/src/momentum/scorer.ts`
 * - Sync: `apps/cli/src/commands/sync.ts`
 *
 * @module commands/metrics
 */

import chalk from "chalk";
import { Command } from "commander";
import { withDaemon } from "../services/service-client";
import { isVrekoInitialized } from "../services/vreko-dir";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options parsed from command line
 *
 * @internal
 */
interface MetricsOptions {
	/** Show all files, not only critical */
	all?: boolean;
	/** Output as JSON */
	json?: boolean;
	/** Top N files to show */
	top?: number;
	/** Verbose output */
	verbose?: boolean;
}

/**
 * Metrics result for display
 *
 * @internal
 */
interface MetricsResult {
	filePath: string;
	score: number;
	factors: {
		changeFrequency: number;
		complexity: number;
		recency: number;
	};
	timestamp: number;
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the metrics command
 *
 * @returns Commander Command instance
 */
export function createMetricsCommand(): Command {
	const metrics = new Command("metrics")
		.alias("m")
		.description(
			"Show momentum scores for files\n\n" +
				"Examples:\n" +
				"  $ vr metrics              Show top 10 critical files\n" +
				"  $ vr metrics src/auth.ts  Score specific file\n" +
				"  $ vr metrics --all        Show all files (not only critical)\n" +
				"  $ vr metrics --json       JSON output\n" +
				"  $ vr metrics --top 20     Show top 20 files\n\n" +
				"Related Commands:\n" +
				"  vr sync     Collect signals before scoring\n" +
				"  vr refresh  Incremental score updates",
		)
		.argument("[path]", "Specific file to score")
		.option("--all", "Show all files, not only critical (>0.7 score)")
		.option("--json", "Output as JSON for programmatic use")
		.option("--top <n>", "Top N files to show", "10")
		.option("--verbose", "Show verbose signal breakdown")
		.action(async (path: string | undefined, options: MetricsOptions) => {
			await handleMetricsCommand(path, options);
		});

	return metrics;
}

// =============================================================================
// COMMAND HANDLER
// =============================================================================

/**
 * Handle the metrics command execution
 *
 * @param targetPath - Optional specific file to score
 * @param options - Command options
 *
 * @internal
 */
async function handleMetricsCommand(targetPath: string | undefined, options: MetricsOptions): Promise<void> {
	const cwd = process.cwd();

	// STEP 1: Check workspace initialized
	if (!(await isVrekoInitialized(cwd))) {
		process.exit(1);
	}

	if (options.verbose) {
		console.log(chalk.gray("Connecting to service..."));
	}

	// STEP 2: Connect to service and execute daemon-dependent logic
	await withDaemon("metrics", async (client) => {
		// STEP 3: Get momentum status
		const status = await client.momentum.status({
			workspace: cwd,
		});

		// STEP 4: If a specific file is targeted, score it
		let result: MetricsResult | undefined;
		if (targetPath) {
			const scoreResponse = await client.momentum.score({
				workspace: cwd,
				filePath: targetPath,
			});

			result = {
				filePath: scoreResponse.filePath,
				score: scoreResponse.score,
				factors: scoreResponse.factors,
				timestamp: scoreResponse.timestamp,
			};
		}

		// STEP 5: Output
		if (options.json) {
			console.log(JSON.stringify(result ?? status, null, 2));
			return;
		}

		// Display results
		if (result) {
			displaySingleFileMetrics(result);
		} else {
			displayStatus(status);
		}
	});
}

// =============================================================================
// DISPLAY FUNCTIONS
// =============================================================================

/**
 * Display momentum status
 *
 * @internal
 */
function displayStatus(status: {
	active: boolean;
	lastSync: string | null;
	fileCount: number;
	averageScore: number;
}): void {
	console.log(chalk.cyan.bold("Momentum Status"));
	console.log();
	console.log(`  Active: ${status.active ? chalk.green("yes") : chalk.yellow("no")}`);
	console.log(`  Last sync: ${status.lastSync ?? chalk.gray("never")}`);
	console.log(`  Files tracked: ${status.fileCount}`);
	console.log(`  Average score: ${status.averageScore.toFixed(2)}`);
}

/**
 * Display metrics for a single file
 *
 * @internal
 */
function displaySingleFileMetrics(result: MetricsResult): void {
	const isCritical = result.score > 0.7;
	console.log(`  Score: ${result.score.toFixed(2)}${isCritical ? " (critical)" : ""}`);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { handleMetricsCommand };
