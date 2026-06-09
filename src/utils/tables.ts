/**
 * CLI-UX-003: CLI-Table3 Integration
 *
 * @fileoverview Table rendering utilities for structured CLI output.
 * Provides formatted tables for risk signals, file summaries, snapshots,
 * and intelligence-related data (context, validation).
 *
 * ## Purpose
 *
 * Tables make data scannable and professional-looking in CLI output.
 * All tables use cli-table3 with consistent styling.
 *
 * ## Table Types
 *
 * | Function | Purpose | Used By |
 * |----------|---------|---------|
 * | createRiskSignalTable | Risk signals with severity | vr analyze |
 * | createFileSummaryTable | File analysis results | vr check |
 * | createSnapshotTable | Snapshot listing | vr list |
 * | createStagedFilesTable | Git staged files | vr check --all |
 * | createContextTable | Learnings for context | vr context |
 * | createValidationTable | Validation results | vr validate |
 *
 * ## Styling
 *
 * - Headers: cyan color
 * - Borders: minimal (empty style)
 * - Word wrap enabled for long content
 * - Truncation for file paths
 *
 * @see {@link file://ai_dev_utils/resources/new_cli/03-cli-table3-integration.spec.md}
 * @see {@link file://ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md}
 * @module utils/tables
 */

import chalk from "chalk";
import Table from "cli-table3";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Risk signal from analysis
 */
export interface RiskSignal {
	signal: string;
	value: number;
	description?: string;
}

/**
 * File risk summary for batch analysis
 */
export interface FileRiskSummary {
	file: string;
	riskScore: number;
	riskLevel: string;
	topSignal?: string;
}

/**
 * Learning entry for context display
 *
 * @remarks
 * Matches the shape returned by Intelligence.getContext().relevantLearnings
 */
export interface LearningEntry {
	trigger: string;
	action: string;
	type: string;
}

/**
 * Validation result for display
 *
 * @remarks
 * Matches the shape returned by validate command processing
 */
export interface ValidationResult {
	file: string;
	passed: boolean;
	confidence: number;
	issues: number;
	recommendation: "auto_merge" | "quick_review" | "full_review" | "error";
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Render severity as visual indicator
 *
 * @param value - The risk value (0-10)
 * @param maxValue - Maximum possible value (default 10)
 * @returns Visual severity indicator string (e.g., "●●○")
 *
 * @remarks
 * Uses filled and empty dots to show severity level:
 * - 3 filled dots = high (red)
 * - 2 filled dots = medium (yellow)
 * - 1 filled dot = low (green)
 *
 * @example
 * ```typescript
 * renderSeverity(8.5)  // "●●●" in red
 * renderSeverity(5.0)  // "●●○" in yellow
 * renderSeverity(2.0)  // "●○○" in green
 * ```
 */
export function renderSeverity(value: number, maxValue = 10): string {
	const normalized = Math.min(value / maxValue, 1);
	const filled = Math.round(normalized * 3);
	const empty = 3 - filled;

	const dot = "●";
	const emptyDot = "○";

	let color: typeof chalk.red;
	if (normalized > 0.7) {
		color = chalk.red;
	} else if (normalized > 0.4) {
		color = chalk.yellow;
	} else {
		color = chalk.green;
	}

	return color(dot.repeat(filled)) + chalk.gray(emptyDot.repeat(empty));
}

/**
 * Truncate file path intelligently
 *
 * @param path - File path to truncate
 * @param maxLength - Maximum length allowed
 * @returns Truncated path with ellipsis if needed
 *
 * @remarks
 * Preserves:
 * - First directory (for context)
 * - Filename (always visible)
 *
 * Middle directories are replaced with "..."
 *
 * @example
 * ```typescript
 * truncatePath("src/components/auth/LoginForm.tsx", 30)
 * // Returns: "src/.../LoginForm.tsx"
 * ```
 */
export function truncatePath(path: string, maxLength: number): string {
	if (path.length <= maxLength) {
		return path;
	}

	const parts = path.split("/");
	if (parts.length <= 2) {
		return `...${path.slice(-(maxLength - 3))}`;
	}

	// Keep filename and first directory
	const filename = parts[parts.length - 1];
	const firstDir = parts[0];

	if (filename.length + firstDir.length + 5 > maxLength) {
		return `...${filename.slice(-(maxLength - 3))}`;
	}

	return `${firstDir}/.../${filename}`;
}

/**
 * Format timestamp as relative time
 *
 * @param date - Date to format
 * @returns Human-readable relative time string
 *
 * @example
 * ```typescript
 * formatRelativeTime(new Date(Date.now() - 120000))
 * // Returns: "2m ago"
 * ```
 */
export function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) {
		return "just now";
	}
	if (diffMins < 60) {
		return `${diffMins}m ago`;
	}
	if (diffHours < 24) {
		return `${diffHours}h ago`;
	}
	if (diffDays < 7) {
		return `${diffDays}d ago`;
	}

	return date.toLocaleDateString();
}

/**
 * Format ISO date string for human-readable display
 *
 * @param isoDate - ISO date string or Date object
 * @returns Formatted date string (e.g., "Dec 25, 2024")
 *
 * @example
 * ```typescript
 * formatDate("2024-12-25T10:30:00Z")
 * // Returns: "Dec 25, 2024"
 * ```
 */
export function formatDate(isoDate: string | Date): string {
	const date = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Format confidence as percentage with color
 *
 * @param confidence - Confidence value 0-1
 * @returns Colored percentage string
 *
 * @example
 * ```typescript
 * formatConfidence(0.95)  // "95%" in green
 * formatConfidence(0.65)  // "65%" in yellow
 * formatConfidence(0.35)  // "35%" in red
 * ```
 */
export function formatConfidence(confidence: number): string {
	const percentage = Math.round(confidence * 100);
	const text = `${percentage}%`;

	if (percentage >= 80) {
		return chalk.green(text);
	}
	if (percentage >= 50) {
		return chalk.yellow(text);
	}
	return chalk.red(text);
}

/**
 * Format recommendation for display
 *
 * @param recommendation - Recommendation from validation pipeline
 * @returns Colored recommendation string
 */
export function formatRecommendation(recommendation: string): string {
	switch (recommendation) {
		case "auto_merge":
			return chalk.green("auto_merge");
		case "quick_review":
			return chalk.yellow("quick_rev");
		case "full_review":
			return chalk.red("full_rev");
		case "error":
			return chalk.red("error");
		default:
			return chalk.gray(recommendation);
	}
}

// =============================================================================
// RISK TABLE FUNCTIONS
// =============================================================================

/**
 * Create a table for risk signals
 *
 * @param signals - Array of risk signals to display
 * @returns Formatted table string
 *
 * @remarks
 * Displays signals sorted by value descending with severity indicators.
 * Only shows signals with value > 0.
 *
 * @example
 * ```typescript
 * const table = createRiskSignalTable([
 *   { signal: "complexity", value: 8.5 },
 *   { signal: "churn", value: 3.2 },
 * ]);
 * print(...);
 * ```
 */
export function createRiskSignalTable(signals: RiskSignal[]): string {
	if (signals.length === 0) {
		return chalk.green("No risk signals detected.");
	}

	// Sort by value descending
	const sorted = [...signals].sort((a, b) => b.value - a.value);

	const table = new Table({
		head: [chalk.cyan("Signal"), chalk.cyan("Score"), chalk.cyan("Severity")],
		style: {
			head: [],
			border: [],
		},
		colWidths: [20, 8, 12],
	});

	for (const signal of sorted) {
		// Only show signals with value > 0
		if (signal.value <= 0) {
			continue;
		}

		table.push([signal.signal, signal.value.toFixed(1), renderSeverity(signal.value)]);
	}

	return table.toString();
}

/**
 * Create a summary table for batch file analysis
 *
 * @param files - Array of file risk summaries
 * @returns Formatted table string
 *
 * @remarks
 * Displays files sorted by risk score with color-coded levels.
 * Used by `vr check` command.
 *
 * @example
 * ```typescript
 * const table = createFileSummaryTable([
 *   { file: "src/auth.ts", riskScore: 8.5, riskLevel: "high", topSignal: "complexity" },
 *   { file: "src/utils.ts", riskScore: 2.1, riskLevel: "low" },
 * ]);
 * print(...);
 * ```
 */
export function createFileSummaryTable(files: FileRiskSummary[]): string {
	if (files.length === 0) {
		return chalk.green("No files analyzed.");
	}

	// Sort by risk score descending
	const sorted = [...files].sort((a, b) => b.riskScore - a.riskScore);

	const table = new Table({
		head: [chalk.cyan("File"), chalk.cyan("Risk"), chalk.cyan("Level"), chalk.cyan("Top Signal")],
		style: {
			head: [],
			border: [],
		},
		colWidths: [40, 8, 10, 15],
		wordWrap: true,
	});

	for (const file of sorted) {
		const levelColor =
			file.riskLevel === "high" ? chalk.red : file.riskLevel === "medium" ? chalk.yellow : chalk.green;

		table.push([
			truncatePath(file.file, 38),
			file.riskScore.toFixed(1),
			levelColor(file.riskLevel.toUpperCase()),
			file.topSignal || "-",
		]);
	}

	return table.toString();
}

// =============================================================================
// SNAPSHOT TABLE FUNCTIONS
// =============================================================================

/**
 * Create a compact inline table for snapshot listing
 *
 * @param snapshots - Array of snapshot objects
 * @returns Formatted table string
 *
 * @remarks
 * Displays snapshots with relative timestamps.
 * Used by `vr list` command.
 *
 * @example
 * ```typescript
 * const table = createSnapshotTable([
 *   { id: "abc123def", timestamp: new Date(), message: "Before refactor", fileCount: 12 },
 * ]);
 * print(...);
 * ```
 */
export function createSnapshotTable(
	snapshots: Array<{
		id: string;
		timestamp: Date;
		message?: string;
		fileCount?: number;
	}>,
): string {
	if (snapshots.length === 0) {
		return chalk.yellow("No snapshots found.");
	}

	const table = new Table({
		head: [chalk.cyan("ID"), chalk.cyan("Created"), chalk.cyan("Message"), chalk.cyan("Files")],
		style: {
			head: [],
			border: [],
		},
		colWidths: [12, 22, 30, 8],
		wordWrap: true,
	});

	for (const snap of snapshots) {
		table.push([
			snap.id.substring(0, 8),
			formatRelativeTime(snap.timestamp),
			snap.message || chalk.gray("(none)"),
			snap.fileCount?.toString() || "-",
		]);
	}

	return table.toString();
}

/**
 * Create a staged files table for pre-commit display
 *
 * @param files - Array of staged file info
 * @returns Formatted table string
 *
 * @remarks
 * Used by `vr check --all` command.
 */
export function createStagedFilesTable(
	files: Array<{
		path: string;
		status: string;
		riskScore?: number;
	}>,
): string {
	if (files.length === 0) {
		return chalk.yellow("No staged files.");
	}

	const table = new Table({
		head: [chalk.cyan("File"), chalk.cyan("Status"), chalk.cyan("Risk")],
		style: {
			head: [],
			border: [],
		},
		colWidths: [50, 12, 10],
	});

	for (const file of files) {
		const statusColor =
			file.status === "added"
				? chalk.green
				: file.status === "deleted"
					? chalk.red
					: file.status === "renamed"
						? chalk.blue
						: chalk.yellow;

		const riskDisplay = file.riskScore !== undefined ? renderSeverity(file.riskScore) : chalk.gray("-");

		table.push([truncatePath(file.path, 48), statusColor(file.status), riskDisplay]);
	}

	return table.toString();
}

// =============================================================================
// INTELLIGENCE TABLE FUNCTIONS (CLI-UX-005)
// =============================================================================

/**
 * Create a table for context learnings
 *
 * @param learnings - Array of learning entries
 * @returns Formatted table string
 *
 * @remarks
 * Displays learnings from Intelligence.getContext().relevantLearnings.
 * Used by `vr context` command.
 *
 * ## Implementation Notes for LLM Agents
 *
 * 1. Learnings have { trigger, action, type } shape
 * 2. Trigger is the keyword/situation that triggers the learning
 * 3. Action is what to do when triggered
 * 4. Type is one of: pattern, pitfall, efficiency, discovery, workflow
 *
 * @example
 * ```typescript
 * const table = createContextTable([
 *   { trigger: "auth", action: "Use @vreko/auth package", type: "pattern" },
 *   { trigger: "testing", action: "Use 4-path coverage", type: "pattern" },
 * ]);
 * print(...);
 * ```
 */
export function createContextTable(learnings: LearningEntry[]): string {
	if (learnings.length === 0) {
		return chalk.gray("No relevant learnings found.");
	}

	const table = new Table({
		head: [chalk.cyan("Type"), chalk.cyan("Trigger"), chalk.cyan("Action")],
		style: {
			head: [],
			border: [],
		},
		colWidths: [12, 20, 45],
		wordWrap: true,
	});

	for (const learning of learnings) {
		// Color-code the type
		const typeColor = getTypeColor(learning.type);

		table.push([typeColor(learning.type), learning.trigger, truncateText(learning.action, 42)]);
	}

	return table.toString();
}

/**
 * Create a table for validation results
 *
 * @param results - Array of validation results
 * @returns Formatted table string
 *
 * @remarks
 * Displays validation results with pass/fail, confidence, and recommendation.
 * Used by `vr validate` command.
 *
 * ## Column Meanings
 *
 * - File: Path to the validated file (truncated)
 * - Passed: ✓ or ✗
 * - Confidence: 0-100% with color coding
 * - Issues: Number of issues found
 * - Recommendation: auto_merge / quick_review / full_review
 *
 * @example
 * ```typescript
 * const table = createValidationTable([
 *   { file: "src/auth.ts", passed: false, confidence: 0.65, issues: 3, recommendation: "full_review" },
 *   { file: "src/utils.ts", passed: true, confidence: 0.95, issues: 0, recommendation: "auto_merge" },
 * ]);
 * print(...);
 * ```
 */
export function createValidationTable(results: ValidationResult[]): string {
	if (results.length === 0) {
		return chalk.gray("No files validated.");
	}

	const table = new Table({
		head: [
			chalk.cyan("File"),
			chalk.cyan("Passed"),
			chalk.cyan("Confidence"),
			chalk.cyan("Issues"),
			chalk.cyan("Recommendation"),
		],
		style: {
			head: [],
			border: [],
		},
		colWidths: [35, 8, 12, 8, 14],
		wordWrap: true,
	});

	for (const result of results) {
		table.push([
			truncatePath(result.file, 33),
			result.passed ? chalk.green("✓") : chalk.red("✗"),
			formatConfidence(result.confidence),
			result.issues.toString(),
			formatRecommendation(result.recommendation),
		]);
	}

	return table.toString();
}

// =============================================================================
// HELPER FUNCTIONS (PRIVATE)
// =============================================================================

/**
 * Get color function for learning type
 *
 * @param type - Learning type
 * @returns Chalk color function
 *
 * @internal
 */
function getTypeColor(type: string): typeof chalk.blue {
	switch (type) {
		case "pattern":
			return chalk.blue;
		case "pitfall":
			return chalk.red;
		case "efficiency":
			return chalk.green;
		case "discovery":
			return chalk.yellow;
		case "workflow":
			return chalk.magenta;
		default:
			return chalk.gray;
	}
}

/**
 * Truncate text with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 *
 * @internal
 */
function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return `${text.slice(0, maxLength - 3)}...`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { LearningEntry as ContextLearning, ValidationResult as FileValidationResult };
