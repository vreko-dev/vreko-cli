/**
 * Snapshot Command
 *
 * Implements snap snapshot list/restore/diagnose - Manage workspace snapshots.
 * Uses service protocol for snapshot operations.
 *
 * @see implementation_plan.md Section 1.2
 */

import { exec } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import chalk from "chalk";
import { Command } from "commander";

import {
	connectServiceClient,
	createServiceClient,
	isServiceRunning,
} from "../service-adapter/local-service-adapter.js";
import { formatTimeAgo } from "./session";

const execAsync = promisify(exec);

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the snapshot command with subcommands
 */
export function createSnapshotCommand(): Command {
	const snapshot = new Command("snapshot").description("Manage workspace snapshots");

	// Phase 21: bare `vr snapshot` in a TTY opens TUI at the snapshots panel
	snapshot.action(async () => {
		const { isInteractive } = await import("../ui/guards.js");
		if (isInteractive()) {
			const { launchTui } = await import("../ui/tui/index.js");
			await launchTui("snapshots");
			return;
		}
		// Machine mode: print usage hint and exit cleanly
		snapshot.help();
	});

	snapshot
		.command("list")
		.description("List available snapshots")
		.option("-l, --limit <number>", "Maximum number of snapshots to show", "10")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			if (!isServiceRunning()) {
				process.exitCode = 1;
				return;
			}

			const client = createServiceClient();
			try {
				await connectServiceClient(client);
				const limit = Number.parseInt(options.limit, 10) || 10;
				const result = await client.call<{
					snapshots: Array<{
						id: string;
						createdAt: string;
						fileCount: number;
						reason?: string;
					}>;
					total: number;
				}>("snapshot/list", { workspace: cwd, limit });

				if (options.json) {
					console.log(JSON.stringify(result));
					return;
				}

				if (result.snapshots.length === 0) {
					console.log("No snapshots found. Vreko creates snapshots automatically as you work.");
					return;
				}

				for (const snap of result.snapshots) {
					const age = formatTimeAgo(snap.createdAt);
					const reason = snap.reason ? chalk.gray(`  -  ${snap.reason}`) : "";
					const fileCount = snap.fileCount ?? "?";
					console.log(`  ${chalk.cyan(snap.id.slice(0, 8))}  ${age}  ${fileCount} file(s)${reason}`);
				}

				if (result.total && result.total > result.snapshots.length) {
					console.log(chalk.gray(`  ... and ${result.total - result.snapshots.length} more`));
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exitCode = 1;
			} finally {
				client.close();
			}
		});

	snapshot
		.command("restore")
		.description("Restore files from a snapshot")
		.argument("<id>", "Snapshot ID (can be partial)")
		.option("--dry-run", "Preview changes without restoring")
		.option("-f, --files <files...>", "Only restore specific files")
		.action(async (id: string, options) => {
			const cwd = process.cwd();

			if (!isServiceRunning()) {
				process.exitCode = 1;
				return;
			}

			const client = createServiceClient();
			try {
				await connectServiceClient(client);

				const result = await client.call<{
					snapshots: Array<{
						id: string;
						createdAt: string;
						fileCount: number;
						reason?: string;
					}>;
					total: number;
				}>("snapshot/list", { workspace: cwd, limit: 100 });
				const snapshot = result.snapshots.find((s) => s.id.startsWith(id));

				if (!snapshot) {
					console.error(`✗ Snapshot "${id}" not found`);
					process.exitCode = 1;
					return;
				}

				if (options.dryRun) {
					const preview = await client.call<{
						restored: boolean;
						filesRestored: number;
						dryRun: boolean;
						changes: Array<{ file: string; action: string }>;
					}>("snapshot/restore", {
						workspace: cwd,
						snapshotId: snapshot.id,
						files: options.files,
						dryRun: true,
					});

					console.log(`Preview restore from snapshot ${snapshot.id.slice(0, 8)}:`);
					if (preview.changes && preview.changes.length > 0) {
						for (const change of preview.changes) {
							console.log(`  ${chalk.cyan(change.action.padEnd(8))} ${change.file}`);
						}
					} else {
						console.log("  No changes would be made");
					}
					return;
				}

				const restoreResult = await client.call<{
					restored: boolean;
					filesRestored: number;
					changes: Array<{ file: string; action: string }>;
				}>("snapshot/restore", {
					workspace: cwd,
					snapshotId: snapshot.id,
					files: options.files,
					dryRun: false,
				});

				if (restoreResult.restored) {
					console.log(
						`✓ Restored ${restoreResult.filesRestored} file(s) from snapshot ${snapshot.id.slice(0, 8)}`,
					);
				} else {
					console.error("✗ Restore failed");
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exitCode = 1;
			} finally {
				client.close();
			}
		});

	snapshot
		.command("diagnose")
		.description("Run snapshot system diagnostics")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();
			const vrekoDir = join(cwd, ".vreko");

			const diagnostics: {
				workspace: string;
				timestamp: string;
				vrekoExists: boolean;
				permissions: Record<string, unknown>;
				diskSpace: Record<string, string>;
				snapshotCount: number;
				storageSize: string;
				serviceStatus: string;
				issues: string[];
				recommendations: string[];
			} = {
				workspace: cwd,
				timestamp: new Date().toISOString(),
				vrekoExists: false,
				permissions: {},
				diskSpace: {},
				snapshotCount: 0,
				storageSize: "0",
				serviceStatus: "unknown",
				issues: [],
				recommendations: [],
			};

			try {
				// Check if .vreko directory exists
				diagnostics.vrekoExists = existsSync(vrekoDir);

				if (diagnostics.vrekoExists) {
					// Check permissions
					try {
						const stats = statSync(vrekoDir);
						diagnostics.permissions = {
							readable: !!(stats.mode & 0o444),
							writable: !!(stats.mode & 0o222),
							executable: !!(stats.mode & 0o111),
						};

						if (!diagnostics.permissions.writable) {
							diagnostics.issues.push("PERMISSION_DENIED: .vreko directory is not writable");
							diagnostics.recommendations.push("Run: chmod -R 755 .vreko/");
						}
					} catch (error) {
						diagnostics.issues.push(`Permission check failed: ${error}`);
					}

					// Get storage size
					try {
						const { stdout } = await execAsync(`du -sh "${vrekoDir}"`);
						diagnostics.storageSize = stdout.split("\t")[0].trim();
					} catch {
						// Ignore errors - non-critical
					}

					// Count snapshots
					try {
						const { stdout } = await execAsync(
							`find "${vrekoDir}/snapshots" -type f -name "*.json" 2>/dev/null | wc -l`,
						);
						diagnostics.snapshotCount = Number.parseInt(stdout.trim(), 10);
					} catch {
						// Ignore errors - snapshots directory might not exist yet
					}
				} else {
					diagnostics.issues.push("VREKO_NOT_INITIALIZED: .vreko directory does not exist");
					diagnostics.recommendations.push("Initialize Vreko in this workspace first");
				}

				// Check disk space
				try {
					const { stdout } = await execAsync(`df -h "${cwd}"`);
					const lines = stdout.trim().split("\n");
					if (lines.length > 1) {
						const parts = lines[1].split(/\s+/);
						diagnostics.diskSpace = {
							total: parts[1],
							used: parts[2],
							available: parts[3],
							usedPercent: parts[4],
						};

						const usedPercent = Number.parseInt(parts[4].replace("%", ""), 10);
						if (usedPercent > 90) {
							diagnostics.issues.push(`STORAGE_FULL: Disk is ${usedPercent}% full`);
							diagnostics.recommendations.push("Free up disk space or prune old snapshots");
						} else if (usedPercent > 80) {
							diagnostics.issues.push(`STORAGE_WARNING: Disk is ${usedPercent}% full`);
							diagnostics.recommendations.push("Consider pruning old snapshots: snap snapshot prune");
						}
					}
				} catch {
					// Ignore errors - non-critical
				}

				// Check service status
				diagnostics.serviceStatus = isServiceRunning() ? "running" : "stopped";
				if (!isServiceRunning()) {
					diagnostics.recommendations.push("Start service: snap service start --service");
				}

				// Output results
				if (options.json) {
					console.log(JSON.stringify(diagnostics, null, 2));
					return;
				}
				console.log(`Workspace: ${diagnostics.workspace}`);
				console.log(
					`Service:   ${diagnostics.serviceStatus === "running" ? chalk.green("running") : chalk.red("stopped")}`,
				);
				if (diagnostics.vrekoExists) {
					console.log(`Snapshots: ${diagnostics.snapshotCount}`);
					console.log(`Storage:   ${diagnostics.storageSize}`);
				} else {
					console.log(`Vreko:  ${chalk.yellow("not initialized")}`);
				}

				// Disk Space
				if (diagnostics.diskSpace.total) {
					console.log(
						`Disk:      ${diagnostics.diskSpace.used}/${diagnostics.diskSpace.total} (${diagnostics.diskSpace.usedPercent} used)`,
					);
				}

				// Issues
				if (diagnostics.issues.length > 0) {
					console.log();
					console.log("Issues:");
					for (const issue of diagnostics.issues) {
						console.log(`  ${chalk.red("✗")} ${issue}`);
					}
				}

				// Recommendations
				if (diagnostics.recommendations.length > 0) {
					console.log();
					console.log("Recommendations:");
					for (const rec of diagnostics.recommendations) {
						console.log(`  → ${rec}`);
					}
				} else if (diagnostics.issues.length === 0) {
					console.log();
					console.log(chalk.green("✓ No issues found"));
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			}
		});

	return snapshot;
}

// Re-export formatTimeAgo for use in this module
export { formatTimeAgo } from "./session";
