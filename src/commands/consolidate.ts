/**
 * Consolidate Command
 *
 * Deduplicates learning entries using enriched Jaccard similarity + union-find clustering.
 * Archives originals before mutation for safe rollback.
 *
 * @example
 * ```bash
 * vr consolidate --dry-run        # Preview dedup results
 * vr consolidate                  # Apply consolidation
 * vr consolidate --threshold 0.7  # Custom similarity threshold
 * ```
 *
 * @module commands/consolidate
 */

// Phase 3A: analyzeDeduplication / consolidateLearnings moved inline to avoid @vreko/mcp
// These functions are currently disabled (throw)  -  same semantics as the originals in
// packages/mcp/src/services/index.ts.  Phase 3B will wire them to the service.
function analyzeDeduplication(
	_cwd: string,
	_threshold: number,
): {
	totalLearnings: number;
	estimatedDuplicates: number;
	estimatedUnique: number;
	reductionPercent: number;
	topClusters: Array<{ size: number; canonical: string }>;
} {
	throw new Error("Learning consolidation is temporarily disabled. Phase 3B will re-enable via service IPC.");
}

async function consolidateLearnings(
	_cwd: string,
	_options: { threshold: number; dryRun: boolean; maxLearnings: number },
): Promise<{
	originalCount: number;
	consolidatedCount: number;
	duplicatesFound: number;
	clustersProcessed: number;
	reductionPercent: number;
	archivePath: string;
	topClusters: Array<{ size: number; canonical: string }>;
}> {
	throw new Error("Learning consolidation is temporarily disabled. Phase 3B will re-enable via service IPC.");
}

import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { isVrekoInitialized } from "../services/vreko-dir";

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

export function createConsolidateCommand(): Command {
	const consolidate = new Command("consolidate")
		.description("Consolidate duplicate learnings (Phase 1 deduplication)")
		.option("--threshold <number>", "Similarity threshold (0-1, enriched score)", "0.65")
		.option("--dry-run", "Preview without writing", false)
		.option("--max <number>", "Max learnings to process (safety limit)", "5000")
		.option("--json", "Output machine-readable JSON", false)
		.option("--analyze", "Only analyze duplication potential (no consolidation)", false)
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				// Check if initialized
				if (!(await isVrekoInitialized(cwd))) {
					console.log(chalk.yellow("🦎 Vreko not initialized"));
					console.log(chalk.gray("Run: vr init"));
					process.exit(1);
				}

				const threshold = Number.parseFloat(options.threshold);
				const maxLearnings = Number.parseInt(options.max, 10);

				if (options.analyze) {
					// Analysis-only mode
					const spinner = ora("Analyzing deduplication potential...").start();
					const analysis = analyzeDeduplication(cwd, threshold);
					spinner.succeed("Analysis complete");

					if (options.json) {
						console.log(JSON.stringify(analysis, null, 2));
						return;
					}

					console.log(chalk.cyan.bold("Deduplication Analysis"));
					console.log();
					console.log(`  Total learnings: ${analysis.totalLearnings}`);
					console.log(`  Estimated duplicates: ${analysis.estimatedDuplicates}`);
					console.log(`  Estimated unique: ${analysis.estimatedUnique}`);
					console.log(`  Reduction: ${analysis.reductionPercent.toFixed(1)}%`);

					if (analysis.topClusters.length > 0) {
						console.log();
						console.log(chalk.cyan("Top clusters:"));
						for (const cluster of analysis.topClusters) {
							console.log(`  • ${cluster.canonical} (${cluster.size} entries)`);
						}
					}

					if (analysis.estimatedDuplicates > 50) {
						console.log();
						console.log(chalk.yellow("High duplication detected. Run without --analyze to consolidate."));
					}
					return;
				}

				const spinner = ora("Finding duplicate learnings...").start();

				const result = await consolidateLearnings(cwd, {
					threshold,
					dryRun: options.dryRun,
					maxLearnings,
				});

				spinner.succeed("Consolidation complete");

				if (options.json) {
					console.log(JSON.stringify(result, null, 2));
					return;
				}

				console.log(chalk.cyan.bold("Consolidation Results"));
				console.log();
				console.log(`  Original: ${result.originalCount}`);
				console.log(`  Consolidated: ${result.consolidatedCount}`);
				console.log(`  Duplicates found: ${result.duplicatesFound}`);
				console.log(`  Reduction: ${result.reductionPercent.toFixed(1)}%`);

				if (result.topClusters.length > 0) {
					console.log();
					console.log(chalk.cyan("Top clusters:"));
					for (const cluster of result.topClusters) {
						console.log(`  • ${cluster.canonical} (${cluster.size} entries)`);
					}
				}

				if (options.dryRun) {
					console.log();
					console.log(chalk.yellow("Dry run  -  no changes written. Run without --dry-run to apply."));
				} else {
					console.log();
					console.log(chalk.green("✓"), `Archive saved to: ${result.archivePath}`);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});

	return consolidate;
}
