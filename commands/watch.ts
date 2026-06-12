/**
 * Watch Command
 *
 * Implements vr watch - Continuous file watching service for behavioral learning.
 *
 * Usage:
 *   vr watch              # Start watching (foreground)
 *   vr watch --verbose    # With detailed logging
 *   vr watch stop         # Not implemented yet (uses Ctrl+C)
 *   vr watch status       # Show watcher status
 *
 * @see implementation_plan.md - behavioral learning
 * @see the_vision.md - "learnFromBehavior" concept
 */

import chalk from "chalk";
import { Command } from "commander";

import { isVrekoInitialized } from "../services/vreko-dir";
import { analyzeBehavioralSignals, createWatcher, getBehavioralSignals, type WatcherStats } from "../services/watcher";

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the watch command
 */
export function createWatchCommand(): Command {
	const watch = new Command("watch")
		.description("Start file watcher for behavioral learning")
		.option("-v, --verbose", "Enable verbose logging")
		.option("--depth <number>", "Max directory depth", "10")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				// Check if initialized
				if (!(await isVrekoInitialized(cwd))) {
					console.error("Not initialized. Run `vreko init` first.");
					process.exit(1);
				}

				// Create watcher
				const watcher = createWatcher({
					workspaceRoot: cwd,
					verbose: options.verbose,
					depth: Number.parseInt(options.depth, 10),
				});

				// Set up event handlers
				watcher.on("ready", (_stats: WatcherStats) => {
					console.log("Watching for changes... (Ctrl+C to stop)");
				});

				watcher.on(
					"change",
					(path: string, meta: { isCritical: boolean; isRisky: boolean; changeCount: number }) => {
						const icon = meta.isCritical
							? chalk.red("●")
							: meta.isRisky
								? chalk.yellow("●")
								: chalk.blue("●");

						console.log(`${icon} ${path}`);
						if (meta.isCritical && meta.changeCount === 1) {
							console.log(`  ${chalk.red("Critical change detected  -  snapshot recommended")}`);
						}
					},
				);

				watcher.on("add", (path: string) => {
					console.log(`${chalk.green("+")} ${path}`);
				});

				watcher.on("unlink", (path: string) => {
					console.log(`${chalk.red("-")} ${path}`);
				});

				watcher.on("signal", (signal: { path: string; suggestion?: string }) => {
					if (signal.suggestion) {
						console.log(`  ${chalk.cyan("→")} ${signal.suggestion}`);
					}
				});

				watcher.on("pattern", (pattern: { type: string; message: string }) => {
					if (pattern.type === "PROMOTION_READY") {
						console.log(`  ${chalk.green("★")} Pattern ready: ${pattern.message}`);
					} else if (pattern.type === "FREQUENTLY_CHANGED") {
						console.log(`  ${chalk.yellow("↺")} Frequently changed: ${pattern.message}`);
					}
				});

				watcher.on("error", (error: Error) => {
					console.error(`✗ Watcher error: ${error.message}`);
				});

				// Handle graceful shutdown
				const shutdown = async () => {
					await watcher.stop();

					const stats = watcher.getStats();

					if (stats.signalsRecorded > 0) {
						console.log(`\nSession summary: ${stats.signalsRecorded} signal(s) recorded`);
					}

					process.exit(0);
				};

				process.on("SIGINT", shutdown);
				process.on("SIGTERM", shutdown);

				// Start watching
				await watcher.start();

				// Keep process alive indefinitely
				await new Promise<never>(() => {
					// This promise never resolves, keeping the watcher running
				});
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Watch error: ${message}`);
				process.exit(1);
			}
		});

	// Add status subcommand
	watch
		.command("status")
		.description("Show watcher statistics")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isVrekoInitialized(cwd))) {
					process.exit(1);
				}

				const signals = await getBehavioralSignals(cwd);

				// Compute stats
				const stats = {
					totalSignals: signals.length,
					byType: {} as Record<string, number>,
					mostChanged: [] as { path: string; count: number }[],
					criticalChanges: 0,
				};

				const fileCounts = new Map<string, number>();

				for (const signal of signals) {
					stats.byType[signal.type] = (stats.byType[signal.type] || 0) + 1;

					if (signal.type === "file_change") {
						fileCounts.set(signal.path, (fileCounts.get(signal.path) || 0) + 1);
					}

					if (signal.metadata?.critical) {
						stats.criticalChanges++;
					}
				}

				// Top 5 most changed
				stats.mostChanged = [...fileCounts.entries()]
					.sort((a, b) => b[1] - a[1])
					.slice(0, 5)
					.map(([path, count]) => ({ path, count }));

				if (options.json) {
					console.log(JSON.stringify(stats, null, 2));
					return;
				}

				console.log(`Total signals: ${stats.totalSignals}`);
				console.log(`Critical:      ${stats.criticalChanges}`);
				if (Object.keys(stats.byType).length > 0) {
					console.log("By type:");
					for (const [type, count] of Object.entries(stats.byType)) {
						console.log(`  ${type.padEnd(20)} ${count}`);
					}
				}

				if (stats.mostChanged.length > 0) {
					console.log("Most changed:");
					for (const { path, count } of stats.mostChanged) {
						console.log(`  ${String(count).padStart(3)}x  ${path}`);
					}
				}

				if (stats.totalSignals === 0) {
					console.log("No behavioral signals recorded yet. Start watching with `vreko watch`.");
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			}
		});

	// Add analyze subcommand
	watch
		.command("analyze")
		.description("Analyze behavioral signals and generate learnings")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isVrekoInitialized(cwd))) {
					process.exit(1);
				}

				const learnings = await analyzeBehavioralSignals(cwd);

				if (options.json) {
					console.log(JSON.stringify(learnings, null, 2));
					return;
				}

				if (learnings.length === 0) {
					console.log("No learnings generated. More behavioral data is needed.");
					return;
				}

				console.log(`Generated ${learnings.length} learning(s):`);
				for (const learning of learnings) {
					const text =
						typeof learning === "string"
							? learning
							: ((learning as { content?: string }).content ?? String(learning));
					console.log(`  • ${text}`);
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			}
		});

	return watch;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { createWatchCommand as default };
