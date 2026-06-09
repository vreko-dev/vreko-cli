/**
 * Refresh Command
 *
 * @fileoverview Implements `vr refresh` - Incrementally update momentum signals.
 * Updates only changed files since last sync for faster feedback.
 *
 * ## Purpose
 *
 * While `vr sync` does a full collection of all signals, `vr refresh` provides
 * incremental updates for files that have changed since the last sync.
 *
 * ## Incremental Update Strategy
 *
 * ```
 * git diff --name-only HEAD~10 → changed files
 *           ↓
 * collectors (scoped) → merge with existing data → re-fit normalizers
 *           ↓
 * distributions.json (updated)
 * ```
 *
 * ## Usage Examples
 *
 * ```bash
 * # Refresh changed files
 * vr refresh
 *
 * # Refresh since specific commit
 * vr refresh --since abc123
 *
 * # Refresh with full re-fit
 * vr refresh --full
 *
 * # Machine-readable output
 * vr refresh --json
 * ```
 *
 * ## Output Format
 *
 * ```
 * ┌─────────────────────────────────────────┐
 * │  🔄 Momentum Refresh Complete           │
 * │                                         │
 * │  Files Updated: 12                      │
 * │  New Files: 2                           │
 * │  Duration: 0.8s                         │
 * └─────────────────────────────────────────┘
 *
 * Updated files:
 *   • src/auth.ts (change_freq +3, attention +1)
 *   • src/api/routes.ts (change_freq +1)
 *   ...
 * ```
 *
 * ## Related
 *
 * - Spec: `docs/roadmap/onboard_momentum.md`
 * - Full sync: `apps/cli/src/commands/sync.ts`
 * - Collectors: `packages/intelligence/src/collectors/`
 *
 * @module commands/refresh
 */

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
interface RefreshOptions {
	/** Commit to compare against */
	since?: string;
	/** Full re-fit of normalizers */
	full?: boolean;
	/** Output as JSON */
	json?: boolean;
	/** Verbose output */
	verbose?: boolean;
}

/**
 * Refresh result for display/JSON output
 *
 * @internal
 */
interface RefreshResult {
	refreshed: boolean;
	since: string;
	full: boolean;
	timestamp: number;
	durationMs: number;
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the refresh command
 *
 * @returns Commander Command instance
 */
export function createRefreshCommand(): Command {
	const refresh = new Command("refresh")
		.description("Incrementally update momentum signals")
		.option("--since <commit>", "Compare against specific commit")
		.option("--full", "Full re-fit of normalizers")
		.option("--json", "Output as JSON")
		.option("--verbose", "Show verbose output")
		.action(async (options: RefreshOptions) => {
			await handleRefreshCommand(options);
		});

	return refresh;
}

// =============================================================================
// COMMAND HANDLER
// =============================================================================

/**
 * Handle the refresh command execution
 *
 * @param options - Command options
 *
 * @internal
 */
async function handleRefreshCommand(options: RefreshOptions): Promise<void> {
	const cwd = process.cwd();
	const startTime = Date.now();

	// STEP 1: Check workspace initialized
	if (!(await isVrekoInitialized(cwd))) {
		console.error("Vreko not initialized in this workspace. Run 'vreko init' first.");
		process.exit(1);
	}

	if (options.verbose) {
		console.log(`Refreshing workspace: ${cwd}`);
	}

	// STEP 2: Connect to service and run refresh
	return withDaemon("refresh", async (client) => {
		const response = await client.momentum.refresh({
			workspace: cwd,
			since: options.since,
			full: options.full,
		});

		// STEP 3: Build result
		const durationMs = Date.now() - startTime;

		const result: RefreshResult = {
			refreshed: response.refreshed,
			since: response.since,
			full: response.full,
			timestamp: response.timestamp,
			durationMs,
		};

		// STEP 4: Output
		if (options.json) {
			console.log(JSON.stringify(result, null, 2));
			return;
		}

		displayRefreshResults(result);
	});
}

// =============================================================================
// DISPLAY FUNCTIONS
// =============================================================================

/**
 * Display refresh results in formatted output
 *
 * @param result - Refresh result data
 *
 * @internal
 */
function displayRefreshResults(result: RefreshResult): void {
	const durationSec = (result.durationMs / 1000).toFixed(1);
	console.log(`✓ Refresh complete in ${durationSec}s`);
	if (result.since) {
		console.log(`  Since: ${new Date(result.since).toLocaleString()}`);
	}
	if (result.full) {
		console.log("  Mode: full refresh");
	}
}

// =============================================================================
// EXPORTS
// =============================================================================

export { handleRefreshCommand };
