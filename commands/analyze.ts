/**
 * Analyze Command
 *
 * Implements vr analyze - Full workspace intelligence bootstrap.
 * Runs the 5-phase analysis through the service for comprehensive workspace intelligence.
 *
 * Phases:
 * 1. Structure - File inventory and framework detection via WorkspaceProfiler
 * 2. Git - Co-change detection analysis
 * 3. Baseline - Full baseline computation
 * 4. Learnings - Seed initial learning patterns
 * 5. Readiness - Compute workspace readiness score
 *
 * Philosophy: Daemon-First Workspace Intelligence Bootstrap (DAEMON_GENERATION=2)
 * All intelligence operations go through the service for IP protection.
 *
 * @module commands/analyze
 */

import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { connectToDaemon, isDaemonAvailable } from "../services/service-client";

// =============================================================================
// TYPES
// =============================================================================

interface ReadinessAssessment {
	score: number;
	level: "ready" | "partial" | "minimal";
	factors: {
		hasBaseline: boolean;
		hasLearnings: boolean;
		hasProfile: boolean;
		healthScore: number;
	};
	recommendations: string[];
}

interface WorkspaceProfile {
	framework: {
		id: string;
		name: string;
		confidence: number;
	};
	healthScore: number;
	gaps?: Array<{
		type: string;
		severity: "critical" | "warning" | "info";
		message: string;
	}>;
}

interface AnalysisResult {
	workspace: string;
	profile: WorkspaceProfile | null;
	baselineJobId: string | null;
	learningsSeeded: {
		seeded: boolean;
		count: number;
		tiers: { hot: number; warm: number; cold: number };
		alreadySeeded: boolean;
	};
	readiness: ReadinessAssessment;
	duration: number;
	analyzedAt: string;
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the analyze command
 */
export function createAnalyzeCommand(): Command {
	return new Command("analyze")
		.description("Run full workspace intelligence analysis via service")
		.option("-w, --workspace <path>", "Workspace path", process.cwd())
		.option("--skip-baseline", "Skip baseline computation (faster but less complete)")
		.option("--skip-learnings", "Skip learning seeding")
		.option("--force-seed", "Force re-seed learnings even if already seeded")
		.option("--json", "Output result as JSON")
		.action(async (options) => {
			const workspace = options.workspace;

			// Credit estimate: full codebase analysis uses server-side compute (20-30 credits).
			// This is informational  -  operations succeed regardless of balance during Phase 1.
			if (!options.json) {
				console.log(
					chalk.gray(
						"  Credit estimate: ~20-30 credits (full_codebase_scan). Check vr credits for your balance.",
					),
				);
			}

			try {
				// Check service availability
				const spinner = ora("Connecting to service...").start();

				if (!(await isDaemonAvailable())) {
					spinner.fail("Service not available");
					process.exit(1);
				}

				spinner.text = "Running workspace analysis...";

				const client = await connectToDaemon();
				const result = (await client.workspace.analyze({
					workspace,
					skipBaseline: options.skipBaseline,
					skipLearnings: options.skipLearnings,
					forceSeedLearnings: options.forceSeed,
				})) as AnalysisResult;

				spinner.succeed(`Analysis complete in ${(result.duration / 1000).toFixed(1)}s`);

				// JSON output for automation
				if (options.json) {
					console.log(JSON.stringify(result, null, 2));
					return;
				}
				displayAnalysisResults(result);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			}
		});
}

// =============================================================================
// OUTPUT FORMATTING
// =============================================================================

/**
 * Display analysis results in human-readable format
 */
function displayAnalysisResults(result: AnalysisResult): void {
	// Readiness score with color
	const readinessColor =
		result.readiness.level === "ready"
			? chalk.green
			: result.readiness.level === "partial"
				? chalk.yellow
				: chalk.red;

	console.log(chalk.bold("Workspace Analysis Results"));
	console.log(chalk.gray("─".repeat(50)));
	console.log();
	console.log(`Readiness: ${readinessColor(result.readiness.level.toUpperCase())}`);

	// Framework detection
	if (result.profile) {
		console.log(
			`Framework: ${result.profile.framework.name ?? "detected"} (${Math.round(result.profile.framework.confidence * 100)}%)`,
		);
	} else {
		console.log("Framework: not detected");
	}
	const factors = result.readiness.factors;
	console.log(`Baseline:  ${factors.hasBaseline ? chalk.green("✓") : chalk.red("✗")}`);
	console.log(`Learnings: ${factors.hasLearnings ? chalk.green("✓") : chalk.red("✗")}`);

	// Learnings summary
	if (result.learningsSeeded.seeded) {
		const { count, tiers } = result.learningsSeeded;
		console.log(`  Seeded ${count} learning(s)  -  hot: ${tiers.hot}, warm: ${tiers.warm}, cold: ${tiers.cold}`);
	} else if (result.learningsSeeded.alreadySeeded) {
		console.log("  Learnings already seeded");
	}

	// Baseline status
	if (result.baselineJobId) {
		console.log(`  Baseline job: ${result.baselineJobId}`);
	}

	// Recommendations
	if (result.readiness.recommendations.length > 0) {
		console.log("\nRecommendations:");
		for (const rec of result.readiness.recommendations) {
			console.log(`  → ${rec}`);
		}
	}

	// Gaps (if any)
	if (result.profile?.gaps && result.profile.gaps.length > 0) {
		const criticalGaps = result.profile.gaps.filter((g) => g.severity === "critical");
		const warningGaps = result.profile.gaps.filter((g) => g.severity === "warning");

		if (criticalGaps.length > 0) {
			console.log("\nCritical gaps:");
			for (const gap of criticalGaps) {
				console.log(`  ${chalk.red("✗")} ${gap.message ?? gap.type}`);
			}
		}

		if (warningGaps.length > 0) {
			console.log("\nWarnings:");
			for (const gap of warningGaps) {
				console.log(`  ${chalk.yellow("⚠")} ${gap.message ?? gap.type}`);
			}
		}
	}

	if (result.readiness.level !== "ready") {
		console.log();
		if (!result.readiness.factors.hasBaseline) {
			console.log("  Run `vreko baseline` to establish baseline commit history");
		}
		if (!result.readiness.factors.hasLearnings) {
			console.log("  Run `vreko learn` to seed learnings for this workspace");
		}
	}
}

// =============================================================================
// EXPORTS
// =============================================================================

export { displayAnalysisResults };
