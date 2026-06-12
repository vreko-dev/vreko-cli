/**
 * Sync Command
 *
 * @fileoverview Implements `vr sync` - Collect signals and fit momentum scoring normalizers.
 * This is the initial data collection step for the momentum scoring pipeline.
 *
 * ## Purpose
 *
 * The momentum scoring system identifies critical files in a codebase using multiple signals:
 * - change_freq: How often the file changes (from git)
 * - centrality: How many files import/depend on it (from AST)
 * - test_density: Test coverage ratio (from test files)
 * - error_rate: Test failure rate (from test results)
 * - attention: Recent developer attention (from git)
 * - runtime_freq: Runtime call frequency (Phase 2, placeholder)
 *
 * ## Pipeline Overview
 *
 * ```
 * vr sync → collectors → assembler → normalizer.fit() → persist
 *                                            ↓
 *                         .vreko/momentum/distributions.json
 * ```
 *
 * ## Usage Examples
 *
 * ```bash
 * # Full sync (all collectors)
 * vr sync
 *
 * # Quick sync (git + AST only)
 * vr sync --quick
 *
 * # Machine-readable output
 * vr sync --json
 *
 * # Show verbose progress
 * vr sync --verbose
 * ```
 *
 * ## Output Format
 *
 * ```
 * ┌─────────────────────────────────────────┐
 * │  🔄 Momentum Sync Complete              │
 * │                                         │
 * │  Files Analyzed: 142                    │
 * │  Signals Collected: 5                   │
 * │  Normalizers Fitted: 6                  │
 * │  Duration: 2.3s                         │
 * └─────────────────────────────────────────┘
 *
 * Signal Summary:
 * ┌──────────────────┬───────┬────────┬────────┐
 * │ Signal           │ Files │ Min    │ Max    │
 * ├──────────────────┼───────┼────────┼────────┤
 * │ change_freq      │ 142   │ 0.00   │ 45.00  │
 * │ centrality       │ 142   │ 0.00   │ 0.89   │
 * │ test_density     │ 89    │ 0.00   │ 1.50   │
 * │ error_rate       │ 23    │ 0.00   │ 0.15   │
 * │ attention        │ 142   │ 0.00   │ 12.00  │
 * │ runtime_freq     │ 0     │ -      │ -      │
 * └──────────────────┴───────┴────────┴────────┘
 *
 * Distributions saved to .vreko/momentum/
 * ```
 *
 * ## Related
 *
 * - Spec: `docs/roadmap/onboard_momentum.md`
 * - Collectors: `packages/intelligence/src/collectors/`
 * - Normalizer: `packages/intelligence/src/momentum/normalization.ts`
 *
 * @module commands/sync
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
interface SyncOptions {
	/** Quick mode (git + AST only) */
	quick?: boolean;
	/** Output as JSON */
	json?: boolean;
	/** Verbose output */
	verbose?: boolean;
	/** Analyze commits since this ref */
	since?: string;
}

/**
 * Sync result for display/JSON output
 *
 * @internal
 */
interface SyncResult {
	filesAnalyzed: number;
	durationMs: number;
	quick: boolean;
	timestamp: number;
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the sync command
 *
 * @returns Commander Command instance
 *
 * @remarks
 * ## Implementation Notes for LLM Agents
 *
 * 1. This command proxies to the service:
 *    - Connects to vrekod via IPC
 *    - Calls `client.momentum.sync()` with workspace and options
 *    - Daemon handles all signal collection and normalization
 *
 * 2. Display uses:
 *    - `displayBox()` for the summary
 *    - Simple chalk output for tips
 *
 * 3. Daemon must be running for this command to work
 *
 * ## Error Handling
 *
 * - Workspace not initialized: prompt `vr init`
 * - Daemon not available: show helpful error with instructions
 *
 * @example
 * ```typescript
 * // In apps/cli/src/index.ts:
 * import { createSyncCommand } from "./commands/sync";
 * program.addCommand(createSyncCommand());
 * ```
 */
export function createSyncCommand(): Command {
	const sync = new Command("sync")
		.alias("s")
		.description(
			"Collect signals and fit momentum scoring normalizers\n\n" +
				"Examples:\n" +
				"  $ vr sync                    Full sync with all collectors\n" +
				"  $ vr sync --quick            Quick sync (git + AST only)\n" +
				"  $ vr sync --json             JSON output\n" +
				"  $ vr sync src/auth.ts        Analyze specific file\n" +
				"  $ vr sync --since HEAD~30    Last 30 days\n\n" +
				"Related Commands:\n" +
				"  vr metrics    Show momentum scores after sync\n" +
				"  vr refresh    Incremental updates",
		)
		.argument("[paths...]", "Specific files/dirs to analyze")
		.option("--quick", "Quick mode (git + AST only, ~5x faster)")
		.option("--json", "Output as JSON for programmatic use")
		.option("--verbose", "Show detailed progress and signal breakdown")
		.option("--since <ref>", "Analyze commits since ref (default: 90 days)", "HEAD~90")
		.action(async (paths: string[], options: SyncOptions) => {
			await handleSyncCommand(paths, options);
		});

	return sync;
}

// =============================================================================
// COMMAND HANDLER
// =============================================================================

/**
 * Handle the sync command execution
 *
 * @param options - Command options
 *
 * @remarks
 * ## Implementation Flow
 *
 * 1. Check workspace initialized
 * 2. Connect to service
 * 3. Run sync via service
 * 4. Display results
 *
 * @internal
 */
async function handleSyncCommand(paths: string[], options: SyncOptions): Promise<void> {
	const cwd = process.cwd();
	const startTime = Date.now();

	// STEP 1: Check workspace initialized
	if (!(await isVrekoInitialized(cwd))) {
		console.error("Vreko not initialized in this workspace. Run 'vreko init' first.");
		process.exit(1);
	}

	if (options.verbose) {
		console.log(chalk.gray("Connecting to service..."));
	}

	// Credit estimate: momentum sync stores signals server-side (1 credit per sync).
	if (!options.json) {
		console.log(chalk.gray("  Credit estimate: ~1 credit (memory_sync). Check vr credits for your balance."));
	}

	// STEP 2: Connect to service and run sync
	if (options.verbose) {
		if (paths.length > 0) {
			console.log(chalk.gray(`Syncing paths: ${paths.join(", ")}`));
		}
	}

	await withDaemon("sync", async (client) => {
		const response = await client.momentum.sync({
			workspace: cwd,
			quick: options.quick,
			...(paths.length > 0 && { paths }),
			...(options.since && { since: options.since }),
		});

		// STEP 3: Build result
		const durationMs = Date.now() - startTime;

		const result: SyncResult = {
			filesAnalyzed: response.filesAnalyzed,
			quick: response.quick,
			timestamp: response.timestamp,
			durationMs,
		};

		// STEP 4: Display results
		if (options.json) {
			console.log(JSON.stringify(result, null, 2));
			return;
		}

		displaySyncResults(result);
	});
}

// =============================================================================
// DISPLAY FUNCTIONS
// =============================================================================

/**
 * Display sync results in formatted output
 *
 * @param result - Sync result data
 *
 * @internal
 */
function displaySyncResults(result: SyncResult): void {
	const durationSec = (result.durationMs / 1000).toFixed(1);
	console.log(`✓ Sync complete in ${durationSec}s`);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { handleSyncCommand };
