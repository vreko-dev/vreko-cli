/**
 * CLI-UX-001: Boxen Integration
 *
 * @fileoverview Box rendering utilities for screenshot-worthy CLI output.
 * Critical moments like snapshot creation, risk detection, and recovery
 * operations are displayed in visually distinct boxes.
 *
 * ## Purpose
 *
 * These utilities provide a consistent visual language for:
 * - Success messages (green, round border)
 * - Warnings (yellow, round border)
 * - Errors (red, round border)
 * - Info (cyan, round border)
 * - Save stories (green, double border - for Pioneer Program)
 *
 * ## Usage
 *
 * ```typescript
 * import { displayBox, displaySaveStory, displaySnapshotSuccess } from "../utils/display";
 *
 * // Simple box with content and options
 * print(...));
 *
 * // Object-style API (preferred for new code)
 * print(...));
 *
 * // Specialized functions
 * print(...));
 * print(...));
 * ```
 *
 * @see {@link file://ai_dev_utils/resources/new_cli/01-boxen-integration.spec.md}
 * @module utils/display
 */

import boxen, { type Options as BoxenOptions } from "boxen";
import chalk from "chalk";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Box visual type - determines colors and styling
 */
export type BoxType = "success" | "warning" | "error" | "info" | "save-story";

/**
 * Options for displayBox when using string content
 */
interface DisplayBoxStringOptions {
	/** Title displayed at top of box */
	title?: string;
	/** Visual type (determines colors) */
	type?: BoxType;
	/** Inner padding (default: 1) */
	padding?: number;
	/** Outer margin (default: 0) */
	margin?: number;
}

/**
 * Object-style options for displayBox
 *
 * @remarks
 * This is the preferred API for new code - more explicit and readable.
 */
interface DisplayBoxObjectOptions {
	/** Title displayed at top of box */
	title?: string;
	/** Content to display inside the box */
	content: string;
	/** Visual type (determines colors) */
	type?: BoxType;
	/** Inner padding (default: 1) */
	padding?: number;
	/** Outer margin (default: 0) */
	margin?: number;
}

// =============================================================================
// BOX STYLES
// =============================================================================

/**
 * Box styles for each type
 *
 * @remarks
 * These map to boxen options. The styles are designed to be:
 * - Consistent with chalk color conventions
 * - Visually distinct from each other
 * - Screenshot-friendly (good contrast, readable)
 *
 * @internal
 */
const BOX_STYLES: Record<BoxType, Partial<BoxenOptions>> = {
	success: {
		borderColor: "green",
		borderStyle: "round",
	},
	warning: {
		borderColor: "yellow",
		borderStyle: "round",
	},
	error: {
		borderColor: "red",
		borderStyle: "round",
	},
	info: {
		borderColor: "cyan",
		borderStyle: "round",
	},
	"save-story": {
		borderColor: "green",
		borderStyle: "double",
		padding: 1,
		margin: 1,
	},
};

// =============================================================================
// CORE DISPLAY FUNCTION
// =============================================================================

/**
 * Display content in a styled box
 *
 * @param contentOrOptions - Either string content or object with content and options
 * @param options - Options when using string content (ignored for object style)
 * @returns Formatted box string ready for process.stdout.write()
 *
 * @remarks
 * ## Two calling styles
 *
 * ### String style (legacy, still supported)
 * ```typescript
 * displayBox("Hello", { type: "success", title: "Welcome" })
 * ```
 *
 * ### Object style (preferred for new code)
 * ```typescript
 * displayBox({
 *   title: "Welcome",
 *   content: "Hello",
 *   type: "success",
 * })
 * ```
 *
 * ## Implementation Notes for LLM Agents
 *
 * 1. The function detects which style is being used by checking if first arg is string
 * 2. Object style is preferred because it's more explicit
 * 3. Unknown types default to "info" (cyan border)
 * 4. Empty content is allowed but will result in small box
 *
 * @example
 * ```typescript
 * // Success box
 * print(...));
 *
 * // Error box
 * print(...));
 * ```
 */
export function displayBox(
	contentOrOptions: string | DisplayBoxObjectOptions,
	options: DisplayBoxStringOptions = {},
): string {
	// Detect which calling style is being used
	let content: string;
	let title: string | undefined;
	let type: BoxType;
	let padding: number;
	let margin: number;

	if (typeof contentOrOptions === "string") {
		// String style: displayBox("content", { options })
		content = contentOrOptions;
		title = options.title;
		type = options.type ?? "info";
		padding = options.padding ?? 1;
		margin = options.margin ?? 0;
	} else {
		// Object style: displayBox({ content, title, type, ... })
		content = contentOrOptions.content;
		title = contentOrOptions.title;
		type = contentOrOptions.type ?? "info";
		padding = contentOrOptions.padding ?? 1;
		margin = contentOrOptions.margin ?? 0;
	}

	// Handle unknown type gracefully by defaulting to 'info'
	const styleType = type in BOX_STYLES ? type : "info";

	return boxen(content, {
		...BOX_STYLES[styleType],
		padding,
		margin,
		...(title && { title, titleAlignment: "center" as const }),
	});
}

// =============================================================================
// SPECIALIZED DISPLAY FUNCTIONS
// =============================================================================

/**
 * Display a "save story" box when Vreko prevents a disaster
 *
 * @param riskScore - The risk score that was detected (0-10)
 * @param affectedFiles - Array of file paths that were protected
 * @param snapshotId - The snapshot ID that was created
 * @returns Formatted save story box string
 *
 * @remarks
 * Used for Pioneer Program gamification and screenshot-worthy moments.
 * The double border and extra padding make this stand out from regular output.
 *
 * @example
 * ```typescript
 * const story = displaySaveStory(8.5, ["src/auth.ts", "src/api.ts"], "abc123def");
 * print(...);
 * ```
 */
export function displaySaveStory(riskScore: number, affectedFiles: string[], snapshotId: string): string {
	return displayBox(
		`${chalk.bold("🦎 Vreko protected you.")}\n\n` +
			`${chalk.cyan("Risk Score:")} ${chalk.red(`${riskScore.toFixed(1)}/10`)}\n` +
			`${chalk.cyan("Files Protected:")} ${chalk.green(affectedFiles.length.toString())}\n` +
			`${chalk.cyan("Snapshot:")} ${snapshotId.substring(0, 8)}\n\n` +
			chalk.dim("Share your save story: vreko.dev/stories"),
		{
			type: "save-story",
		},
	);
}

/**
 * Display snapshot creation success box
 *
 * @param snapshotId - The created snapshot ID
 * @param message - Optional snapshot message
 * @param fileCount - Number of files protected
 * @returns Formatted success box string
 *
 * @example
 * ```typescript
 * const success = displaySnapshotSuccess("abc123", "Before major refactor", 12);
 * print(...);
 * ```
 */
export function displaySnapshotSuccess(snapshotId: string, message: string | undefined, fileCount: number): string {
	return displayBox(
		`${chalk.green("✓")} Snapshot created\n` +
			`${chalk.cyan("ID:")} ${snapshotId.substring(0, 8)}\n` +
			`${chalk.cyan("Message:")} ${message || "(none)"}\n` +
			`${chalk.cyan("Files:")} ${fileCount} protected`,
		{
			title: "🦎 Vreko Protection Active",
			type: "success",
		},
	);
}

/**
 * Display high-risk detection warning box
 *
 * @param file - The file that was analyzed
 * @param riskScore - The risk score (0-10)
 * @returns Formatted warning box string
 *
 * @example
 * ```typescript
 * const warning = displayHighRiskWarning("src/critical.ts", 9.2);
 * print(...);
 * ```
 */
export function displayHighRiskWarning(file: string, riskScore: number): string {
	return displayBox(
		`${chalk.red("⚠ High Risk Detected")}\n\n` +
			`${chalk.cyan("File:")} ${file}\n` +
			`${chalk.cyan("Risk Score:")} ${chalk.red(`${riskScore.toFixed(1)}/10`)}\n\n` +
			`${chalk.yellow("Recommendation:")} Create a snapshot before proceeding`,
		{
			title: "🚨 Risk Analysis",
			type: "warning",
		},
	);
}

/**
 * Display error box
 *
 * @param title - Error title
 * @param message - Error message
 * @param suggestion - Optional suggestion for fixing the error
 * @returns Formatted error box string
 *
 * @example
 * ```typescript
 * const error = displayError(
 *   "File Not Found",
 *   "Could not locate src/missing.ts",
 *   "Check the file path and try again"
 * );
 * print(...);
 * ```
 */
export function displayError(title: string, message: string, suggestion?: string): string {
	let content = `${chalk.red("✖")} ${title}\n\n${message}`;

	if (suggestion) {
		content += `\n\n${chalk.dim("Suggestion:")} ${suggestion}`;
	}

	return displayBox(content, {
		type: "error",
	});
}

/**
 * Display info box
 *
 * @param title - Box title
 * @param content - Content to display
 * @returns Formatted info box string
 *
 * @example
 * ```typescript
 * const info = displayInfo("📊 Summary", "Total files: 42\nModified: 12");
 * print(...);
 * ```
 */
export function displayInfo(title: string, content: string): string {
	return displayBox(content, {
		title,
		type: "info",
	});
}

// =============================================================================
// CONTEXT DISPLAY HELPERS (CLI-UX-005)
// =============================================================================

/**
 * Display context summary box
 *
 * @param summary - Summary data to display
 * @returns Formatted info box string
 *
 * @remarks
 * Used by `vr context` command to display loaded context.
 *
 * @example
 * ```typescript
 * const box = displayContextSummary({
 *   hardRules: 12,
 *   patterns: 8,
 *   learnings: 3,
 *   violations: 2,
 * });
 * print(...);
 * ```
 */
export function displayContextSummary(summary: {
	hardRules?: number;
	patterns?: number;
	learnings?: number;
	violations?: number;
	semantic?: { sections: number; compression: string };
}): string {
	const parts: string[] = [];

	if (summary.hardRules !== undefined) {
		parts.push(`${chalk.bold("Hard Rules:")} ${summary.hardRules} constraints`);
	}

	if (summary.patterns !== undefined) {
		parts.push(`${chalk.bold("Patterns:")} ${summary.patterns} patterns`);
	}

	if (summary.learnings !== undefined) {
		parts.push(`${chalk.bold("Learnings:")} ${summary.learnings} relevant`);
	}

	if (summary.violations !== undefined) {
		parts.push(`${chalk.bold("Violations:")} ${summary.violations} to avoid`);
	}

	if (summary.semantic) {
		parts.push(
			`${chalk.bold("Semantic:")} ${summary.semantic.sections} sections (${summary.semantic.compression} compression)`,
		);
	}

	if (parts.length === 0) {
		parts.push("No specific context found for this task.");
		parts.push("Try adding --keywords to refine the search.");
	}

	return displayBox({
		title: "📋 Context Loaded",
		content: parts.join("\n"),
		type: "info",
	});
}

// =============================================================================
// VALIDATION DISPLAY HELPERS (CLI-UX-005)
// =============================================================================

/**
 * Display validation failure summary box
 *
 * @param failures - Array of failed file results
 * @returns Formatted error box string
 *
 * @remarks
 * Used by `vr validate` command when files fail validation.
 *
 * @example
 * ```typescript
 * const box = displayValidationFailure([
 *   { file: "src/auth.ts", issues: 3 },
 *   { file: "src/api.ts", issues: 1 },
 * ]);
 * print(...);
 * ```
 */
export function displayValidationFailure(failures: Array<{ file: string; issues: number }>): string {
	const content = failures
		.map((f) => `${chalk.bold(f.file)}: ${f.issues} issue${f.issues !== 1 ? "s" : ""}`)
		.join("\n");

	return displayBox({
		title: "❌ Validation Failed",
		content,
		type: "error",
	});
}

/**
 * Display validation success box
 *
 * @param fileCount - Number of files that passed
 * @returns Formatted success box string
 *
 * @example
 * ```typescript
 * const box = displayValidationSuccess(5);
 * print(...);
 * ```
 */
export function displayValidationSuccess(fileCount: number): string {
	return displayBox({
		title: "✅ Validation Passed",
		content: `All ${fileCount} file${fileCount !== 1 ? "s" : ""} passed validation`,
		type: "success",
	});
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { DisplayBoxStringOptions, DisplayBoxObjectOptions };
