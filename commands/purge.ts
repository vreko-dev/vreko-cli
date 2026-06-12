/**
 * Purge Command (D-15 / G-03)
 *
 * Deletes all local Vreko data from the current workspace's .vreko/ directory.
 * Always shows a count summary first. --dry-run exits after showing counts.
 *
 * Route: vreko purge [--dry-run] [--yes]
 */

import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import * as clack from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { cliState } from "../cli-state.js";

interface PurgeCounts {
	learnings: number;
	snapshots: number;
	snapshotBytes: number;
	blobs: number;
	blobBytes: number;
	auditEntries: number;
	dbFiles: string[];
}

function countDir(dirPath: string): { count: number; bytes: number } {
	if (!existsSync(dirPath)) {
		return { count: 0, bytes: 0 };
	}
	try {
		const entries = readdirSync(dirPath, { recursive: true }) as string[];
		let bytes = 0;
		for (const entry of entries) {
			try {
				const st = statSync(join(dirPath, entry));
				if (st.isFile()) {
					bytes += st.size;
				}
			} catch {
				// skip unreadable entries
			}
		}
		return { count: entries.filter((e) => !e.includes("/") && !e.includes("\\")).length, bytes };
	} catch {
		return { count: 0, bytes: 0 };
	}
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function gatherCounts(vrekoDir: string): PurgeCounts {
	const learnings = countDir(join(vrekoDir, "learnings"));
	const snapshots = countDir(join(vrekoDir, "snapshots"));
	const blobs = countDir(join(vrekoDir, "blobs"));
	const audit = countDir(join(vrekoDir, "audit"));

	const dbFiles: string[] = [];
	for (const db of ["knowledge.db", "intelligence.db"]) {
		if (existsSync(join(vrekoDir, db))) {
			dbFiles.push(db);
		}
	}

	return {
		learnings: learnings.count,
		snapshots: snapshots.count,
		snapshotBytes: snapshots.bytes,
		blobs: blobs.count,
		blobBytes: blobs.bytes,
		auditEntries: audit.count,
		dbFiles,
	};
}

function printCounts(counts: PurgeCounts): void {
	console.log("");
	console.log(chalk.bold("Data to be deleted:"));
	console.log(`  Knowledge store  ${chalk.cyan(counts.learnings)} learnings`);
	console.log(
		`  Snapshots        ${chalk.cyan(counts.snapshots)} snapshots ${chalk.dim(formatBytes(counts.snapshotBytes))}`,
	);
	if (counts.blobs > 0) {
		console.log(`  Blob cache       ${chalk.cyan(counts.blobs)} files ${chalk.dim(formatBytes(counts.blobBytes))}`);
	}
	if (counts.auditEntries > 0) {
		console.log(`  Audit log        ${chalk.cyan(counts.auditEntries)} entries`);
	}
	if (counts.dbFiles.length > 0) {
		console.log(`  Databases        ${chalk.cyan(counts.dbFiles.join(", "))}`);
	}
	console.log("");
}

function deleteVrekoData(vrekoDir: string): void {
	const dirsToDelete = ["learnings", "snapshots", "blobs", "audit"];
	for (const dir of dirsToDelete) {
		const p = join(vrekoDir, dir);
		if (existsSync(p)) {
			rmSync(p, { recursive: true, force: true });
		}
	}
	for (const db of ["knowledge.db", "intelligence.db"]) {
		const p = join(vrekoDir, db);
		if (existsSync(p)) {
			rmSync(p, { force: true });
		}
	}
}

export function createPurgeCommand(): Command {
	return new Command("purge")
		.description("Delete all local Vreko data from this workspace")
		.option("--dry-run", "Show what would be deleted without deleting")
		.option("-y, --yes", "Skip confirmation prompt")
		.option("--json", "Output structured JSON")
		.action(async (options) => {
			const vrekoDir = join(process.cwd(), ".vreko");

			if (!existsSync(vrekoDir)) {
				if (options.json) {
					console.log(JSON.stringify({ success: false, reason: "no-vreko-dir" }));
				} else {
					console.log("No .vreko/ directory found in the current workspace.");
				}
				return;
			}

			const counts = gatherCounts(vrekoDir);
			const totalItems =
				counts.learnings + counts.snapshots + counts.blobs + counts.auditEntries + counts.dbFiles.length;

			if (options.json) {
				console.log(
					JSON.stringify({
						dryRun: !!options.dryRun,
						counts,
						totalItems,
					}),
				);
				if (options.dryRun) {
					return;
				}
			} else {
				printCounts(counts);

				if (options.dryRun) {
					console.log(chalk.dim("Dry run  -  no data deleted. Run without --dry-run to delete."));
					return;
				}

				if (totalItems === 0) {
					console.log("Nothing to delete.");
					return;
				}
			}

			// Confirmation
			if (!options.yes && !cliState.yes && !options.json) {
				const confirmed = await clack.confirm({
					message: chalk.yellow(
						"Permanently delete all Vreko data from this workspace? This cannot be undone.",
					),
					initialValue: false,
				});
				if (clack.isCancel(confirmed) || !confirmed) {
					clack.cancel("Purge cancelled. No data was deleted.");
					return;
				}
			}

			deleteVrekoData(vrekoDir);

			if (options.json) {
				console.log(JSON.stringify({ success: true, deleted: counts }));
			} else {
				console.log(`${chalk.green("✓")} All local Vreko data deleted.`);
				console.log(chalk.dim("  Run `vreko init` to reinitialize this workspace."));
			}
		});
}
