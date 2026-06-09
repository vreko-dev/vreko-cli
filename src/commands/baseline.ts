/**
 * Baseline CLI Command
 *
 * Commands for managing workspace baselines.
 * Phase 5-B: Baseline Scanner Command
 *
 * Usage:
 *   vreko baseline [scan] --workspace <path>
 *   vreko baseline status --workspace <path>
 *   vreko baseline invalidate --workspace <path>
 *   vreko baseline show --workspace <path>
 *
 * @module commands/baseline
 */

import { resolve } from "node:path";
import type { Command } from "commander";
import {
	connectServiceClient,
	createServiceClient,
	isServiceRunning,
} from "../service-adapter/local-service-adapter.js";

// =============================================================================
// Types
// =============================================================================

interface BaselineRecord {
	workspacePath: string;
	computedAt: number;
	version: string;
	totalFiles: number;
	totalLines: number;
	overallHealthScore: number;
	fragileFiles: Array<{ path: string; compositeScore: number; rank: number; dependentCount: number }>;
	domainHealthScores: Array<{ domain: string; score: number; fileCount: number; fragileFileCount: number }>;
	domainMap: Record<string, string[]>;
}

interface BaselineStatus {
	status: "ready" | "stale" | "computing" | "not_computed";
	progress: number;
	stage?: string;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Format number with commas
 */
function formatNumber(n: number): string {
	return n.toLocaleString();
}

/**
 * Check if service is running and start if needed
 */
async function ensureDaemonRunning(): Promise<boolean> {
	if (isServiceRunning()) {
		return true;
	}
	const { spawn } = await import("node:child_process");

	// Try to start service
	const child = spawn(process.execPath, [process.argv[1], "service", "start", "--detach"], {
		detached: true,
		stdio: "ignore",
	});

	child.unref();

	// Wait for service to start
	const maxWait = 5000;
	const start = Date.now();

	return new Promise((resolve) => {
		const check = () => {
			if (isServiceRunning()) {
				resolve(true);
			} else if (Date.now() - start > maxWait) {
				resolve(false);
			} else {
				setTimeout(check, 100);
			}
		};
		setTimeout(check, 100);
	});
}

// =============================================================================
// Command Registration
// =============================================================================

/**
 * Register baseline commands
 */
export function registerBaselineCommands(program: Command): void {
	const baseline = program.command("baseline", { hidden: true }).description("Manage workspace baselines");

	// ==========================================================================
	// baseline scan (default action)
	// ==========================================================================
	baseline
		.command("scan")
		.description("Scan workspace and compute baseline")
		.option("-w, --workspace <path>", "Workspace path", process.cwd())
		.option("-v, --verbose", "Show detailed progress")
		.action(async (options) => {
			const workspacePath = resolve(options.workspace);

			// Ensure service is running
			if (!(await ensureDaemonRunning())) {
				process.exit(1);
			}

			const client = createServiceClient();
			try {
				await connectServiceClient(client);

				const startTime = Date.now();

				// Trigger computation
				await client.call<{ jobId: string }>("baseline/compute", {
					workspace: workspacePath,
				});

				// Poll for completion
				let record: BaselineRecord | null = null;
				let lastProgress = 0;

				while (!record) {
					await new Promise((r) => setTimeout(r, 500));

					const status = await client.call<BaselineStatus>("baseline/status", {
						workspace: workspacePath,
					});

					if (options.verbose && status.progress > lastProgress) {
						lastProgress = status.progress;
					}

					if (status.status === "ready" || status.progress >= 100) {
						record = await client.call<BaselineRecord | null>("baseline/get", {
							workspace: workspacePath,
						});
					} else if (status.status === "stale") {
						// Continue waiting
					}
				}

				const elapsed = Date.now() - startTime;
				console.log(`✓ Baseline computed in ${elapsed}ms`);
				console.log(`  Files: ${record.totalFiles}, Health: ${record.overallHealthScore.toFixed(1)}`);

				if (record.fragileFiles.length > 0) {
					console.log("  Fragile files:");
					for (const file of record.fragileFiles.slice(0, 5)) {
						console.log(`    • ${file.path} (score: ${file.compositeScore.toFixed(2)})`);
					}
				}

				if (record.domainHealthScores.length > 0) {
					console.log("  Domain health:");
					for (const domain of record.domainHealthScores.slice(0, 5)) {
						console.log(`    • ${domain.domain}: ${domain.score.toFixed(1)}`);
					}
				}
			} catch (error) {
				console.error("✗ Baseline scan failed:", error instanceof Error ? error.message : String(error));
				process.exitCode = 1;
			} finally {
				client.close();
			}
		});

	// Default action: run scan
	baseline
		.argument("[action]", "Action to perform (default: scan)")
		.option("-w, --workspace <path>", "Workspace path", process.cwd())
		.option("-v, --verbose", "Show detailed progress")
		.action(async (action, options) => {
			// If action is not a known subcommand, treat as scan
			if (!action || action === "scan") {
				const workspacePath = resolve(options.workspace);

				// Ensure service is running
				if (!(await ensureDaemonRunning())) {
					process.exit(1);
				}

				const client = createServiceClient();
				try {
					await connectServiceClient(client);

					const startTime = Date.now();

					// Trigger computation
					await client.call<{ jobId: string }>("baseline/compute", {
						workspace: workspacePath,
					});

					// Poll for completion
					let record: BaselineRecord | null = null;

					while (!record) {
						await new Promise((r) => setTimeout(r, 500));

						const status = await client.call<BaselineStatus>("baseline/status", {
							workspace: workspacePath,
						});

						if (status.status === "ready" || status.progress >= 100) {
							record = await client.call<BaselineRecord | null>("baseline/get", {
								workspace: workspacePath,
							});
						}
					}

					const elapsed = Date.now() - startTime;
					console.log(`✓ Baseline computed in ${elapsed}ms`);
					console.log(`  Files: ${record.totalFiles}, Health: ${record.overallHealthScore.toFixed(1)}`);
				} catch (error) {
					console.error("✗ Baseline scan failed:", error instanceof Error ? error.message : String(error));
					process.exitCode = 1;
				} finally {
					client.close();
				}
			}
		});

	// ==========================================================================
	// baseline status
	// ==========================================================================
	baseline
		.command("status")
		.description("Show baseline status for workspace")
		.option("-w, --workspace <path>", "Workspace path", process.cwd())
		.option("-j, --json", "Output as JSON")
		.action(async (options) => {
			const workspacePath = resolve(options.workspace);

			if (!isServiceRunning()) {
				if (options.json) {
					console.log(JSON.stringify({ status: "daemon_not_running" }));
				} else {
					console.log("Service is not running. Start with: vreko service start");
				}
				return;
			}

			const client = createServiceClient();
			try {
				await connectServiceClient(client);
				const status = await client.call<BaselineStatus>("baseline/status", {
					workspace: workspacePath,
				});

				if (options.json) {
					console.log(JSON.stringify(status));
				} else {
					console.log(`Status: ${status.status} (${status.progress}%)`);
					if (status.stage) {
						console.log(`  Stage: ${status.stage}`);
					}
				}
			} catch (err) {
				console.error("✗", err instanceof Error ? err.message : String(err));
				process.exitCode = 1;
			} finally {
				client.close();
			}
		});

	// ==========================================================================
	// baseline invalidate
	// ==========================================================================
	baseline
		.command("invalidate")
		.description("Invalidate baseline cache for workspace")
		.option("-w, --workspace <path>", "Workspace path", process.cwd())
		.action(async (options) => {
			const workspacePath = resolve(options.workspace);

			if (!isServiceRunning()) {
				console.log("Service is not running. Start with: vreko service start");
				process.exit(1);
			}

			const client = createServiceClient();
			try {
				await connectServiceClient(client);
				await client.call("baseline/invalidate", { workspace: workspacePath });
				console.log("✓ Baseline invalidated");
			} catch (err) {
				console.error("✗", err instanceof Error ? err.message : String(err));
				process.exitCode = 1;
			} finally {
				client.close();
			}
		});

	// ==========================================================================
	// baseline show
	// ==========================================================================
	baseline
		.command("show")
		.description("Show baseline details for workspace")
		.option("-w, --workspace <path>", "Workspace path", process.cwd())
		.option("-j, --json", "Output as JSON")
		.action(async (options) => {
			const workspacePath = resolve(options.workspace);

			if (!isServiceRunning()) {
				if (options.json) {
					console.log(JSON.stringify({ error: "daemon_not_running" }));
				} else {
					console.log("Service is not running. Start with: vreko service start");
				}
				process.exit(1);
			}

			const client = createServiceClient();
			try {
				await connectServiceClient(client);
				const record = await client.call<BaselineRecord | null>("baseline/get", {
					workspace: workspacePath,
				});

				if (!record) {
					if (options.json) {
						console.log("null");
					} else {
						console.log("No baseline computed. Run: vreko baseline scan");
					}
					return;
				}

				if (options.json) {
					console.log(JSON.stringify(record, null, 2));
				} else {
					console.log("Baseline Details:");
					console.log(`  Workspace:    ${record.workspacePath}`);
					console.log(`  Version:      ${record.version}`);
					console.log(`  Computed:     ${new Date(record.computedAt).toISOString()}`);
					console.log(`  Files:        ${formatNumber(record.totalFiles)}`);
					console.log(`  Lines:        ${formatNumber(record.totalLines)}`);
					console.log(`  Health:       ${record.overallHealthScore}/100`);
					console.log();

					if (record.fragileFiles?.length > 0) {
						console.log("Fragile Files:");
						for (const file of record.fragileFiles.slice(0, 10)) {
							console.log(`  ${file.rank}. ${file.path} (score: ${file.compositeScore.toFixed(1)})`);
						}
						console.log();
					}

					if (record.domainHealthScores?.length > 0) {
						console.log("Domain Health:");
						for (const domain of record.domainHealthScores) {
							console.log(`  ${domain.domain}: ${domain.score}/100 (${domain.fileCount} files)`);
						}
					}
				}
			} catch (err) {
				console.error("✗ Failed to get baseline:", err instanceof Error ? err.message : err);
				process.exitCode = 1;
			} finally {
				client.close();
			}
		});
}
