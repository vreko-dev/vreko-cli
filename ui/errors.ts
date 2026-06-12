/**
 * Smart Errors Module
 *
 * Structured error handling with actionable suggestions.
 * Inspired by: Rust compiler, GitHub CLI, Vercel CLI
 *
 * Features:
 * - Colored error output with context
 * - Suggested fixes for common errors
 * - Command suggestions for typos
 * - Links to documentation
 * - Error codes for searchability
 *
 * @see https://bettercli.org/design/
 * @module ui/errors
 */

import { extractErrorCode } from "@vreko/contracts";
import chalk from "chalk";
import { cliState } from "../cli-state.js";

// =============================================================================
// TYPES
// =============================================================================

export interface SmartError {
	code: string;
	title: string;
	message: string;
	suggestion?: string;
	command?: string;
	docLink?: string;
	context?: Record<string, string>;
}

export interface ErrorSuggestion {
	pattern: RegExp | string;
	suggestion: string;
	command?: string;
}

// =============================================================================
// ERROR CATALOG
// =============================================================================

/**
 * Known error patterns with helpful suggestions
 */
export const ERROR_SUGGESTIONS: ErrorSuggestion[] = [
	// Authentication errors
	{
		pattern: /not logged in|unauthorized|401/i,
		suggestion: "You need to authenticate first",
		command: "vreko login",
	},
	{
		pattern: /token expired|session expired/i,
		suggestion: "Your session has expired. Please log in again",
		command: "vreko login",
	},
	{
		pattern: /invalid.*api.*key/i,
		suggestion: "Your API key appears to be invalid. Get a new one at console.vreko.dev/app/settings/api-keys",
		command: "vreko login --api-key <your-key>",
	},

	// Workspace errors
	{
		pattern: /not initialized|no.*\.vreko/i,
		suggestion: "This workspace hasn't been set up for Vreko yet",
		command: "vreko init",
	},
	{
		pattern: /already initialized/i,
		suggestion: "Vreko is already configured here. Use --force to reinitialize",
		command: "vreko init --force",
	},

	// File errors
	{
		pattern: /ENOENT|file not found|no such file/i,
		suggestion: "The file or directory doesn't exist. Check the path and try again",
	},
	{
		pattern: /EACCES|permission denied/i,
		suggestion: "You don't have permission to access this file. Check file permissions",
	},
	{
		pattern: /EEXIST|already exists/i,
		suggestion: "A file with that name already exists. Use --force to overwrite",
	},

	// Network errors
	{
		pattern: /ECONNREFUSED|connection refused/i,
		suggestion: "Cannot connect to the server. Check your internet connection",
		command: "vreko doctor",
	},
	{
		pattern: /ETIMEDOUT|timeout|timed out/i,
		suggestion: "The request timed out. The server may be slow or unreachable",
		command: "vreko doctor",
	},
	{
		pattern: /ENOTFOUND|DNS|network/i,
		suggestion: "Network error. Check your internet connection and try again",
		command: "vreko doctor",
	},

	// Git errors
	{
		pattern: /not a git repository/i,
		suggestion: "This directory is not a Git repository",
		command: "git init",
	},
	{
		pattern: /git.*not.*installed|git.*not found/i,
		suggestion: "Git is required but not installed. Please install Git first",
	},

	// Config errors
	{
		pattern: /invalid.*config|parse.*error.*json/i,
		suggestion: "The configuration file is malformed. Try resetting it",
		command: "vreko config path",
	},

	// MCP errors
	{
		pattern: /mcp.*not configured|no.*ai.*tools/i,
		suggestion: "No AI tools are configured for MCP integration",
		command: "vreko tools configure",
	},
];

// =============================================================================
// COMMAND SUGGESTIONS (for typos)
// =============================================================================

/**
 * Known commands with descriptions for better suggestions.
 * Keep this in sync with the commands registered in src/index.ts.
 */
const KNOWN_COMMANDS: Array<{ name: string; description: string; aliases?: string[] }> = [
	// Auth
	{ name: "login", description: "Authenticate with Vreko" },
	{ name: "logout", description: "Log out of Vreko" },
	{ name: "whoami", description: "Show current user" },
	{ name: "set-key", description: "Set API key directly" },
	{ name: "workspaces", description: "List connected workspaces" },
	// Workspace management
	{ name: "init", description: "Initialize workspace" },
	{ name: "status", description: "Show workspace status" },
	{ name: "analyze", description: "Run workspace intelligence analysis" },
	{ name: "fix", description: "Auto-fix detected issues" },
	{ name: "claude-sync", description: "Generate Claude Code integration files" },
	// Protection
	{ name: "protect", description: "Protect files from changes" },
	{ name: "session", description: "Manage work sessions" },
	// §15.1: snapshot has aliases ss and snap; use --list to list snapshots
	{ name: "snapshot", description: "Create a code snapshot (--list to list)", aliases: ["ss", "snap"] }, // tui-vocab-allowed
	// Intelligence
	{ name: "context", description: "Get relevant context before starting work" },
	{ name: "validate", description: "Validate patterns and changes" },
	{ name: "stats", description: "Show statistics" },
	// Momentum scoring
	{ name: "sync", description: "Collect signals for momentum scoring" },
	{ name: "metrics", description: "Show momentum scores for files", aliases: ["m"] },
	{ name: "refresh", description: "Incremental score update" },
	// Learning
	{ name: "learn", description: "Record a learning or pattern" },
	{ name: "patterns", description: "Manage learned patterns" },
	{ name: "consolidate", description: "Consolidate duplicate learnings" },
	// File analysis
	{ name: "check", description: "Pre-commit risk check" },
	{ name: "risk-analyze", description: "Analyze file risk signals" },
	{ name: "watch", description: "Watch files for AI-driven changes" },
	// MCP / ACP integration
	{ name: "tools", description: "Configure AI tools for MCP integration" },
	{ name: "mcp", description: "MCP server management" },
	{ name: "acp", description: "Agent Communication Protocol integration" },
	// Daemon / service
	{ name: "daemon", description: "Manage the Vreko service" },
	{ name: "service", description: "Manage the Vreko system service" },
	{ name: "baseline", description: "Manage workspace baselines" },
	// Interactive / guided
	{ name: "interactive", description: "Interactive guided workflow" },
	// Polish / admin
	{ name: "config", description: "Manage configuration" },
	{ name: "doctor", description: "Diagnose installation and health" },
	{ name: "diagnostics", description: "Advanced troubleshooting tools" },
	{ name: "upgrade", description: "Upgrade Vreko" },
	{ name: "undo", description: "Undo recent operations" },
	{ name: "alias", description: "Create command shortcuts" },
	{ name: "completion", description: "Generate shell completion scripts" },
	{ name: "help", description: "Show help" },
];

/**
 * Intent-based mappings for better suggestions
 * Maps common user intents to the correct command
 * §15.2: "snap" MUST suggest "snapshot" first // tui-vocab-allowed
 */
const INTENT_MAPPINGS: Record<string, string> = {
	// Snapshot-related intents  -  §15.2: "snap" MUST suggest "snapshot" first // tui-vocab-allowed
	snap: "snapshot", // tui-vocab-allowed
	ss: "snapshot", // tui-vocab-allowed
	snapshot: "snapshot", // tui-vocab-allowed
	save: "snapshot", // tui-vocab-allowed
	backup: "snapshot", // tui-vocab-allowed
	store: "snapshot", // tui-vocab-allowed
	capture: "snapshot", // tui-vocab-allowed
	// "list" is removed; snapshots are listed via `snapshot --list`
	list: "snapshot", // tui-vocab-allowed
	// Check-related intents (not "validate"  -  that is a real registered command)
	verify: "check",
	test: "check",
	// Auth-related intents
	auth: "login",
	signin: "login",
	signon: "login",
	// Status-related intents
	info: "status",
	show: "status",
};

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
	const matrix: number[][] = [];

	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i];
	}
	for (let j = 0; j <= a.length; j++) {
		matrix[0][j] = j;
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1, // substitution
					matrix[i][j - 1] + 1, // insertion
					matrix[i - 1][j] + 1, // deletion
				);
			}
		}
	}

	return matrix[b.length][a.length];
}

/**
 * Find similar commands for typo suggestions
 * §15.2: Prefers intent matches over string distance
 */
export function findSimilarCommands(input: string, maxSuggestions = 3): string[] {
	const inputLower = input.toLowerCase();

	// §15.2: Check intent mapping first (e.g., "snap" -> "snapshot") // tui-vocab-allowed
	const intentMatch = INTENT_MAPPINGS[inputLower];
	if (intentMatch) {
		const cmd = KNOWN_COMMANDS.find((c) => c.name === intentMatch);
		if (cmd) {
			// Return intent match as first suggestion, then other similar commands
			const others = KNOWN_COMMANDS.filter((c) => c.name !== intentMatch)
				.map((c) => ({ name: c.name, distance: levenshteinDistance(inputLower, c.name) }))
				.filter((s) => s.distance <= 3)
				.sort((a, b) => a.distance - b.distance)
				.slice(0, maxSuggestions - 1)
				.map((s) => s.name);
			return [intentMatch, ...others];
		}
	}

	// Check if input matches an alias
	for (const cmd of KNOWN_COMMANDS) {
		if (cmd.aliases?.includes(inputLower)) {
			return [cmd.name];
		}
	}

	// Fallback: Calculate Levenshtein distances
	const suggestions = KNOWN_COMMANDS.map((cmd) => ({
		name: cmd.name,
		distance: levenshteinDistance(inputLower, cmd.name),
	}))
		.filter((s) => s.distance <= 3) // Only suggest if within 3 edits
		.sort((a, b) => a.distance - b.distance)
		.slice(0, maxSuggestions)
		.map((s) => s.name);

	return suggestions;
}

// =============================================================================
// ERROR DISPLAY
// =============================================================================

/**
 * Display a smart error with suggestions
 */
export function displaySmartError(error: Error | SmartError | string): void {
	const errorData = normalizeError(error);

	if (cliState.json) {
		process.stdout.write(`${JSON.stringify({ error: errorData.message, code: errorData.code || null })}\n`);
		return;
	}

	// Build error content
	const lines: string[] = [];

	// Error code and title
	if (errorData.code) {
		lines.push(`${chalk.red.bold(`[${errorData.code}]`)} ${chalk.red.bold(errorData.title)}`);
	} else {
		lines.push(chalk.red.bold(errorData.title));
	}

	lines.push("");
	lines.push(errorData.message);

	// Context information
	if (errorData.context && Object.keys(errorData.context).length > 0) {
		lines.push("");
		for (const [key, value] of Object.entries(errorData.context)) {
			lines.push(chalk.gray(`${key}: ${value}`));
		}
	}

	// Suggestion
	if (errorData.suggestion) {
		lines.push("");
		lines.push(chalk.yellow("💡 Suggestion:"));
		lines.push(chalk.yellow(`   ${errorData.suggestion}`));
	}

	// Command to fix
	if (errorData.command) {
		lines.push("");
		lines.push(chalk.cyan("📋 Try running:"));
		lines.push(chalk.cyan(`   $ ${errorData.command}`));
	}

	// Documentation link
	if (errorData.docLink) {
		lines.push("");
		lines.push(chalk.gray(`📚 More info: ${errorData.docLink}`));
	}

	console.error(lines.join("\n"));
}

/**
 * Display unknown command error with suggestions
 */
export function displayUnknownCommandError(command: string): void {
	const suggestions = findSimilarCommands(command);

	const lines: string[] = [];
	lines.push(chalk.red.bold(`Unknown command: ${command}`));
	lines.push("");

	if (suggestions.length > 0) {
		lines.push(chalk.yellow("Did you mean:"));
		for (const suggestion of suggestions) {
			lines.push(chalk.cyan(`  $ vreko ${suggestion}`));
		}
	} else {
		lines.push(chalk.gray("Run 'vreko --help' to see available commands"));
	}

	console.error(lines.join("\n"));
}

/**
 * Normalize various error types to SmartError
 */
function normalizeError(error: Error | SmartError | string): SmartError {
	// Already a SmartError
	if (typeof error === "object" && "code" in error && "title" in error) {
		return error;
	}

	// String error
	if (typeof error === "string") {
		return {
			code: "ERR_UNKNOWN",
			title: "Error",
			message: error,
			...findErrorSuggestion(error),
		};
	}

	// Standard Error object
	const message = error.message;
	const suggestion = findErrorSuggestion(message);

	return {
		code: extractErrorCode(error) || "ERR_UNKNOWN",
		title: error.name || "Error",
		message,
		...suggestion,
	};
}

/**
 * Find a suggestion for an error message
 */
function findErrorSuggestion(message: string): Partial<SmartError> {
	for (const { pattern, suggestion, command } of ERROR_SUGGESTIONS) {
		const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
		if (regex.test(message)) {
			return { suggestion, command };
		}
	}
	return {};
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a SmartError with full context
 */
export function createSmartError(
	code: string,
	title: string,
	message: string,
	options?: {
		suggestion?: string;
		command?: string;
		docLink?: string;
		context?: Record<string, string>;
	},
): SmartError {
	return {
		code,
		title,
		message,
		...options,
	};
}

/**
 * Wrap a function to display smart errors on failure
 */
export function withSmartErrors<T extends (...args: unknown[]) => Promise<unknown>>(
	fn: T,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
	return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
		try {
			return (await fn(...args)) as ReturnType<T>;
		} catch (error) {
			displaySmartError(error instanceof Error ? error : String(error));
			process.exit(1);
		}
	};
}

// =============================================================================
// ERROR UTILITIES
// =============================================================================

// Re-export shared error utilities from @vreko/contracts
export { extractErrorMessage as getErrorMessage, hasErrorCode } from "@vreko/contracts";

// Import Result pattern for gradual migration
import { type CliErr, err, errFromError } from "../result.js";

/**
 * Handle error in CLI command - display smart error and exit
 * Convenience wrapper for consistent error handling
 *
 * @deprecated Prefer handleCommandErrorResult() + exitWithResult() for testable code.
 * This function will be removed in a future version.
 */
export function handleCommandError(error: unknown, exitCode = 1): never {
	displaySmartError(error instanceof Error ? error : String(error));
	process.exit(exitCode);
}

/**
 * Handle error in CLI command - returns Result instead of exiting
 *
 * SECURITY: This enables testable error handling without process.exit().
 * Caller should use exitWithResult() at the top level to actually exit.
 *
 * @example
 * ```typescript
 * import { exitWithResult } from "../result.js";
 *
 * const result = handleCommandErrorResult(error);
 * exitWithResult(result);
 * ```
 */
export function handleCommandErrorResult(error: unknown, exitCode = 1): CliErr {
	// Display the error (side effect, but necessary for UX)
	displaySmartError(error instanceof Error ? error : String(error));

	// Return error result for caller to handle exit
	return errFromError(error, { exitCode });
}

/**
 * Create error result from exception without displaying
 * Use when you want to handle display separately
 */
export function toCliError(error: unknown, exitCode = 1): CliErr {
	if (typeof error === "string") {
		const suggestion = findErrorSuggestion(error);
		return err(error, {
			code: "ERR_UNKNOWN",
			exitCode,
			...suggestion,
		});
	}

	if (error instanceof Error) {
		const suggestion = findErrorSuggestion(error.message);
		return err(error.message, {
			code: extractErrorCode(error) || "ERR_UNKNOWN",
			exitCode,
			...suggestion,
		});
	}

	return err(String(error), { exitCode });
}

/**
 * Truncate stack trace to specified number of lines
 *
 * @param stack - Full stack trace string
 * @param maxLines - Maximum number of stack frames to keep (default: 5)
 * @returns Truncated stack trace
 *
 * @example
 * ```typescript
 * const truncated = truncateStack(error.stack, 3);
 * // Shows only first 3 frames + "... N more frames"
 * ```
 */
export function truncateStack(stack: string | undefined, maxLines = 5): string {
	if (!stack) {
		return "";
	}

	const lines = stack.split("\n");
	if (lines.length <= maxLines + 1) {
		// +1 for error message line
		return stack;
	}

	const kept = lines.slice(0, maxLines + 1);
	// Calculate remaining: total lines - message line (1) - kept frames (maxLines)
	const remaining = lines.length - 1 - maxLines;
	return `${kept.join("\n")}\n    ... ${remaining} more frame${remaining > 1 ? "s" : ""}`;
}

/**
 * Format error with truncated stack for CLI display
 *
 * @param error - Error object
 * @param maxStackLines - Maximum stack frames to show (default: 5)
 * @returns Formatted error string
 */
export function formatErrorForCLI(error: Error, maxStackLines = 5): string {
	const message = error.message || "Unknown error";
	const stack = truncateStack(error.stack, maxStackLines);

	if (!stack) {
		return message;
	}

	// Extract just the stack frames (skip the first line which is the message)
	const stackLines = stack.split("\n").slice(1);
	if (stackLines.length === 0) {
		return message;
	}

	return `${message}\n${stackLines.join("\n")}`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { levenshteinDistance };
