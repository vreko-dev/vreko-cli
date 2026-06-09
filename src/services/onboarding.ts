/**
 * Interactive Onboarding Service
 *
 * Provides intelligent onboarding based on workspace analysis.
 * Uses daemon's workspace/analyze for daemon-first approach (DAEMON_GENERATION=2).
 * Falls back to direct WorkspaceProfiler if daemon is not available.
 *
 * @module services/onboarding
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
// Type-only imports from @vreko/intelligence (erased at build time, no runtime bundle).
// WorkspaceProfiler runtime is REMOVED  -  analysis now uses daemon-first IPC only.
import type { OnboardingRecommendation, PatternGap, WorkspaceProfile } from "@vreko/intelligence";
import chalk from "chalk";
import ora from "ora";
import { clackConfirm, clackLog } from "../ui/prompts-clack";
import { connectToDaemon, isDaemonAvailable } from "./service-client";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result from onboarding analysis
 */
export interface OnboardingAnalysis {
	/** Workspace profile */
	profile: WorkspaceProfile;
	/** Prioritized recommendations */
	recommendations: OnboardingRecommendation[];
	/** Quick wins (easy to implement, high impact) */
	quickWins: OnboardingRecommendation[];
	/** Critical issues to address */
	criticalIssues: PatternGap[];
}

/**
 * Options for applying recommendations
 */
export interface ApplyOptions {
	/** Dry run mode - don't actually make changes */
	dryRun?: boolean;
	/** Auto-apply all recommendations */
	autoApply?: boolean;
	/** Interactive mode - ask for each recommendation */
	interactive?: boolean;
}

// =============================================================================
// ONBOARDING RENDERER
// =============================================================================

/**
 * Render workspace profile summary
 */
export function renderProfileSummary(profile: WorkspaceProfile): void {
	// Languages
	const topLanguages = profile.languages.slice(0, 3);
	if (topLanguages.length > 0) {
		// intentionally empty
	}

	// Structure
	if (profile.structure.isMonorepo) {
		// intentionally empty
	}

	// Context
	if (profile.existingContext.hasContextDirectory) {
		// intentionally empty
	} else {
		// intentionally empty
	}

	// Health Score
	const _healthColor = profile.healthScore >= 70 ? chalk.green : profile.healthScore >= 40 ? chalk.yellow : chalk.red;
}

/**
 * Render gap analysis summary
 */
export function renderGapSummary(gaps: PatternGap[]): void {
	const critical = gaps.filter((g) => g.severity === "critical");
	const high = gaps.filter((g) => g.severity === "high");
	const medium = gaps.filter((g) => g.severity === "medium");

	if (gaps.length === 0) {
		clackLog.success("No significant gaps detected!");
		return;
	}

	if (critical.length > 0) {
		for (const _gap of critical.slice(0, 3)) {
			// intentionally empty
		}
	}

	if (high.length > 0) {
		for (const _gap of high.slice(0, 3)) {
			// intentionally empty
		}
	}

	if (medium.length > 0) {
		// intentionally empty
	}
}

/**
 * Render recommendations
 */
export function renderRecommendations(recommendations: OnboardingRecommendation[]): void {
	if (recommendations.length === 0) {
		clackLog.success("No recommendations - workspace looks good!");
		return;
	}

	for (let i = 0; i < Math.min(5, recommendations.length); i++) {
		const rec = recommendations[i];
		const _icon = rec.category === "context" ? "📝" : rec.category === "security" ? "🔒" : "💡";
	}

	if (recommendations.length > 5) {
		// intentionally empty
	}
}

// =============================================================================
// ONBOARDING SERVICE
// =============================================================================

/**
 * Analyze workspace and generate onboarding recommendations
 *
 * Uses daemon-first approach (DAEMON_GENERATION=2).
 * Workspace analysis REQUIRES the daemon  -  WorkspaceProfiler runtime
 * has been removed from the CLI bundle to enforce IP protection.
 */
export async function analyzeWorkspace(workspaceRoot: string): Promise<OnboardingAnalysis> {
	const spinner = ora("Analyzing workspace...").start();

	try {
		let profile: WorkspaceProfile;

		// Daemon-first: try daemon's workspace/analyze
		if (await isDaemonAvailable()) {
			try {
				spinner.text = "Analyzing workspace via service...";
				const client = await connectToDaemon();
				const daemonResult = await client.workspace.analyze({
					workspace: workspaceRoot,
					skipBaseline: true, // Onboarding doesn't need baseline
					skipLearnings: false, // Seed learnings during onboarding
				});

				if (daemonResult.profile) {
					// Daemon returned profile - cast to full type (daemon returns complete profile)
					profile = daemonResult.profile as unknown as WorkspaceProfile;
					spinner.succeed("Workspace analysis complete (via service)");
				} else {
					spinner.fail("Service returned no workspace profile.");
					throw new Error(
						"Workspace analysis returned no profile. Ensure the Vreko service is running and the workspace is initialized.",
					);
				}
			} catch (daemonError) {
				spinner.fail("Service workspace analysis failed.");
				throw daemonError;
			}
		} else {
			spinner.fail("Vreko service not available.");
			throw new Error(
				"Workspace analysis requires the Vreko service.\n" +
					"Start it with: npx vrekod  or  pnpm install -g @vreko/local-service",
			);
		}

		// Generate recommendations from profile
		const recommendations = generateRecommendations(profile);

		// Identify quick wins
		const quickWins = recommendations.filter(
			(r) => r.estimatedTime.includes("5 min") || r.estimatedTime.includes("15 min"),
		);

		// Get critical issues
		const criticalIssues = profile.gaps.filter((g) => g.severity === "critical");

		return {
			profile,
			recommendations,
			quickWins,
			criticalIssues,
		};
	} catch (error) {
		spinner.fail("Analysis failed");
		throw error;
	}
}

/**
 * Generate recommendations from workspace profile
 */
function generateRecommendations(profile: WorkspaceProfile): OnboardingRecommendation[] {
	const recommendations: OnboardingRecommendation[] = [];
	let priority = 1;

	// Context documentation recommendations
	if (!profile.existingContext.hasContextDirectory) {
		recommendations.push({
			id: "create-context-dir",
			category: "context",
			priority: priority++,
			title: "Create .llm-context directory",
			description: "Set up a context directory for AI assistants",
			actions: [
				{
					type: "create-file",
					target: ".llm-context/ARCHITECTURE.md",
					description: "Create architecture documentation",
					content: getArchitectureTemplate(profile),
					autoApply: true,
				},
				{
					type: "create-file",
					target: ".llm-context/PATTERNS.md",
					description: "Create patterns documentation",
					content: getPatternsTemplate(profile),
					autoApply: true,
				},
				{
					type: "create-file",
					target: ".llm-context/CONSTRAINTS.md",
					description: "Create constraints documentation",
					content: getConstraintsTemplate(profile),
					autoApply: true,
				},
			],
			estimatedTime: "15 minutes",
			healthImpact: 30,
		});
	}

	// Add gap-based recommendations
	for (const gap of profile.gaps.slice(0, 5)) {
		recommendations.push({
			id: `gap-${gap.patternId}`,
			category: "pattern",
			priority: priority++,
			title: `Add ${gap.patternName}`,
			description: gap.description,
			actions: [
				{
					type: "add-pattern",
					target: gap.patternId,
					description: gap.recommendation,
					autoApply: false,
				},
			],
			estimatedTime: gap.effort === "trivial" ? "5 minutes" : gap.effort === "small" ? "15 minutes" : "1 hour",
			healthImpact: gap.severity === "critical" ? 15 : gap.severity === "high" ? 10 : 5,
		});
	}

	return recommendations;
}

// =============================================================================
// TEMPLATE GENERATORS
// =============================================================================

function getArchitectureTemplate(profile: WorkspaceProfile): string {
	const framework = profile.framework.name;
	const isMonorepo = profile.structure.isMonorepo;

	return `# Architecture

## Overview
This is a ${framework} application${isMonorepo ? " in a monorepo structure" : ""}.

## Directory Structure
\`\`\`
${profile.structure.sourceDirectories.map((d) => `${d}/`).join("\n")}
${profile.structure.testDirectories.map((d) => `${d}/`).join("\n")}
\`\`\`

## Key Components
<!-- Document your main components here -->

## Data Flow
<!-- Describe how data flows through your application -->

## Dependencies
- Framework: ${framework}
- Package Manager: ${profile.packageManager.name}
${profile.languages
	.slice(0, 3)
	.map((l) => `- ${l.name}: ${l.percentage}%`)
	.join("\n")}
`;
}

function getPatternsTemplate(profile: WorkspaceProfile): string {
	const framework = profile.framework.name;

	return `# Patterns

## Error Handling
<!-- Document your error handling patterns -->

## Data Fetching
<!-- Document data fetching patterns for ${framework} -->

## State Management
<!-- Document state management approach -->

## Authentication
<!-- Document auth patterns -->

## Validation
<!-- Document input validation patterns -->

## Testing
<!-- Document testing patterns -->
`;
}

function getConstraintsTemplate(_profile: WorkspaceProfile): string {
	return `# Constraints

## Performance Budgets
- Initial bundle size: < 500KB
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s

## Security Requirements
- All user input must be validated
- No secrets in source code
- HTTPS only in production

## Code Quality
- TypeScript strict mode
- No process.stdout.write in production
- Test coverage > 80%

## Dependencies
- Prefer established, maintained packages
- Lock file must be committed
- Regular dependency updates
`;
}

// =============================================================================
// APPLY RECOMMENDATIONS
// =============================================================================

/**
 * Apply recommendations to the workspace
 */
export async function applyRecommendations(
	workspaceRoot: string,
	recommendations: OnboardingRecommendation[],
	options: ApplyOptions = {},
): Promise<void> {
	const { dryRun = false, autoApply = false, interactive = true } = options;

	for (const recommendation of recommendations) {
		if (interactive && !autoApply) {
			const shouldApply = await clackConfirm(`Apply: ${recommendation.title}?`, { defaultValue: true });

			if (!shouldApply) {
				continue;
			}
		}

		for (const action of recommendation.actions) {
			if (!action.autoApply && !autoApply) {
				continue;
			}

			if (dryRun) {
				clackLog.info(`[DRY RUN] Would ${action.type}: ${action.target}`);
				continue;
			}

			try {
				switch (action.type) {
					case "create-file":
						if (action.content) {
							const filePath = join(workspaceRoot, action.target);
							await mkdir(dirname(filePath), { recursive: true });
							await writeFile(filePath, action.content, "utf-8");
							clackLog.success(`Created ${action.target}`);
						}
						break;

					case "update-file":
						clackLog.info(`Update ${action.target}: ${action.description}`);
						break;

					default:
						clackLog.info(`${action.type}: ${action.description}`);
				}
			} catch (error) {
				clackLog.error(
					`Failed to apply ${action.type} to ${action.target}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}
}
