/**
 * Context Command
 *
 * @fileoverview Implements `vr context` - Get relevant context before starting work.
 * This is the CLI equivalent of the MCP's `codebase.start_task()` tool.
 *
 * ## Purpose
 *
 * Before implementing any code changes, developers should understand:
 * - Relevant patterns and constraints
 * - Past learnings that apply
 * - Recent violations to avoid
 *
 * This command surfaces that context in a digestible format.
 *
 * ## Usage Examples
 *
 * ```bash
 * # Get context for a task
 * vr context "add user authentication"
 *
 * # Include files you plan to modify
 * vr context "refactor auth" --files src/auth.ts src/session.ts
 *
 * # Search with specific keywords
 * vr context --keywords auth session jwt
 *
 * # Machine-readable output
 * vr context "add auth" --json
 *
 * # With semantic search (slower, more accurate)
 * vr context "add auth" --semantic
 * ```
 *
 * ## Output Format
 *
 * Default output uses boxen for visual hierarchy:
 * ```
 * ┌─────────────────────────────────────┐
 * │  📋 Context Loaded                  │
 * │                                     │
 * │  Hard Rules: 12 constraints         │
 * │  Patterns: 8 patterns               │
 * │  Learnings: 3 relevant              │
 * │  Violations: 2 to avoid             │
 * └─────────────────────────────────────┘
 *
 * Relevant Learnings:
 * ┌──────────┬───────────────────────────┐
 * │ Trigger  │ Action                    │
 * ├──────────┼───────────────────────────┤
 * │ auth     │ Use @vreko/auth...     │
 * └──────────┴───────────────────────────┘
 *
 * ⚠ Recent Violations (avoid these):
 *   • missing-error-handling: No try-catch...
 *     Fix: Always wrap async calls in try-catch
 * ```
 *
 * ## Related
 *
 * - Spec: `ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md`
 * - MCP equivalent: `ai_dev_utils/mcp/server.ts` → `handleStartTask()`
 * - Intelligence method: `Intelligence.getContext()`
 *
 * @see {@link file://ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md}
 * @module commands/context
 */

import chalk from "chalk";
import { Command } from "commander";

import { getIntelligence, getIntelligenceWithSemantic } from "../services/intelligence-service";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options parsed from command line
 *
 * @internal
 */
interface ContextOptions {
	/** Files the user plans to modify */
	files?: string[];
	/** Keywords to search for in patterns/learnings */
	keywords?: string[];
	/** Output as JSON instead of formatted */
	json?: boolean;
	/** Use semantic search (slower, more accurate) */
	semantic?: boolean;
}

/**
 * Context result from service (simplified format)
 *
 * @internal
 */
interface DaemonContextResult {
	patterns: Array<{ name: string; description: string }>;
	constraints: Array<{ domain: string; name: string; value: string | number; description: string }>;
	learnings: Array<{ type: string; trigger: string; action: string; relevanceScore: number }>;
	files: string[];
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the context command
 *
 * @returns Commander Command instance
 *
 * @remarks
 * ## Implementation Notes for LLM Agents
 *
 * 1. This command is the CLI equivalent of MCP's `start_task` tool
 * 2. It uses the Intelligence facade from @vreko/intelligence
 * 3. Display utilities should be imported from ../utils/display
 * 4. Table utilities should be imported from ../utils/tables
 *
 * ## Error Handling
 *
 * Handle these cases:
 * - Workspace not initialized → Show "Run: vr init"
 * - No task or keywords provided → Show usage hint
 * - Intelligence errors → Show error message, exit 1
 *
 * ## Display Strategy
 *
 * 1. Use `displayBox()` for the summary (type: "info")
 * 2. Use `createContextTable()` for learnings list
 * 3. Use plain chalk for violations (they're warnings)
 * 4. Always show the tip at the end
 *
 * @example
 * ```typescript
 * // In apps/cli/src/index.ts:
 * import { createContextCommand } from "./commands/context";
 * program.addCommand(createContextCommand());
 * ```
 */
export function createContextCommand(): Command {
	const context = new Command("context")
		.description("Get relevant context before starting work")
		.argument("[task]", "Description of what you want to implement")
		.option("-f, --files <files...>", "Files you plan to modify")
		.option("-k, --keywords <keywords...>", "Keywords to search for")
		.option("--json", "Output as JSON")
		.option("--semantic", "Use semantic search (slower, more accurate)")
		.action(async (task: string | undefined, options: ContextOptions) => {
			await handleContextCommand(task, options);
		});

	return context;
}

// =============================================================================
// COMMAND HANDLER
// =============================================================================

/**
 * Handle the context command execution
 *
 * @param task - Optional task description
 * @param options - Command options
 *
 * @remarks
 * ## Implementation Flow
 *
 * 1. Get Intelligence instance (with or without semantic)
 * 2. Build context input from task + files + keywords
 * 3. Call intelligence.getContext()
 * 4. Format and display results
 *
 * ## Intelligence.getContext() Input
 *
 * ```typescript
 * interface ContextInput {
 *   task: string;           // What user wants to do
 *   files?: string[];       // Files they'll modify
 *   keywords?: string[];    // Search terms
 * }
 * ```
 *
 * ## Intelligence.getContext() Output
 *
 * The result contains:
 * - `hardRules`: String of constraint rules
 * - `patterns`: String of patterns
 * - `relevantLearnings`: Array of {trigger, action, type}
 * - `recentViolations`: Array of {type, message, prevention}
 * - `semanticContext`: If semantic search enabled
 * - `hint`: Helpful tip for the user
 *
 * @internal
 */
async function handleContextCommand(task: string | undefined, options: ContextOptions): Promise<void> {
	const cwd = process.cwd();

	try {
		// STEP 1: Get Intelligence instance
		// Use semantic variant if --semantic flag is set
		const intelligence = options.semantic ? await getIntelligenceWithSemantic(cwd) : await getIntelligence(cwd);

		// STEP 2: Build context input
		// If no task provided, use a generic one
		// Keywords can come from --keywords or be extracted from task
		const contextInput = {
			task: task || "general development",
			files: options.files || [],
			keywords: options.keywords || extractKeywords(task),
		};

		// STEP 3: Get context from Intelligence
		// This searches patterns, learnings, and violations
		const result = await intelligence.getContext(contextInput);

		// STEP 4: Handle JSON output mode
		if (options.json) {
			console.log(JSON.stringify(result, null, 2));
			return;
		}

		// STEP 5: Display formatted output
		displayContextResults(result, options.semantic);
	} catch (error: unknown) {
		// Handle known error cases
		const message = error instanceof Error ? error.message : String(error);

		if (message.includes("not initialized")) {
			process.exit(1);
		}
		process.exit(1);
	}
}

// =============================================================================
// DISPLAY FUNCTIONS
// =============================================================================

/**
 * Display context results in formatted output
 *
 * @param result - Context result from Intelligence
 * @param usedSemantic - Whether semantic search was used
 *
 * @internal
 */
function displayContextResults(result: DaemonContextResult, usedSemantic?: boolean): void {
	// PART 1: Summary box
	const summaryContent = formatContextSummary(result, usedSemantic);
	if (summaryContent) {
		console.log(summaryContent);
	}

	// PART 2: Learnings
	if (result.learnings && result.learnings.length > 0) {
		console.log("\nLearnings:");
		for (const learning of result.learnings.slice(0, 5)) {
			let content: string;
			if (typeof learning === "string") {
				content = learning;
			} else {
				const l = learning as { trigger?: string; action?: string; content?: string };
				content = l.trigger && l.action ? `${l.trigger} → ${l.action}` : (l.content ?? String(learning));
			}
			console.log(`  • ${content.slice(0, 100)}${content.length > 100 ? "..." : ""}`);
		}
		if (result.learnings.length > 5) {
			console.log(`  … and ${result.learnings.length - 5} more`);
		}
	}

	// PART 3: Patterns
	if (result.patterns && result.patterns.length > 0) {
		console.log("\nPatterns:");
		for (const pattern of result.patterns.slice(0, 3)) {
			const text =
				typeof pattern === "string" ? pattern : ((pattern as { pattern?: string }).pattern ?? String(pattern));
			console.log(`  • ${text}`);
		}
	}
}

/**
 * Format context summary for display in box
 *
 * @param result - Context result from Intelligence
 * @param usedSemantic - Whether semantic search was used
 * @returns Formatted string for box content
 *
 * @internal
 */
function formatContextSummary(result: DaemonContextResult, usedSemantic?: boolean): string {
	const parts: string[] = [];

	// Count patterns
	if (result.patterns?.length) {
		parts.push(`${chalk.bold("Patterns:")} ${result.patterns.length} found`);
	}

	// Count constraints
	if (result.constraints?.length) {
		parts.push(`${chalk.bold("Constraints:")} ${result.constraints.length} rules`);
	}

	// Count learnings
	if (result.learnings?.length) {
		parts.push(`${chalk.bold("Learnings:")} ${result.learnings.length} relevant`);
	}

	// Count files
	if (result.files?.length) {
		parts.push(`${chalk.bold("Files:")} ${result.files.length} indexed`);
	}

	// Semantic search info
	if (usedSemantic) {
		parts.push(`${chalk.bold("Semantic:")} enabled`);
	}

	// If no context found, show a helpful message
	if (parts.length === 0) {
		parts.push("No specific context found for this task.");
		parts.push("Try adding --keywords to refine the search.");
	}

	return parts.join("\n");
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract keywords from task description
 *
 * @param task - Task description string
 * @returns Array of keywords
 *
 * @remarks
 * Simple keyword extraction that:
 * - Splits on whitespace
 * - Filters out common words (the, a, an, to, for, etc.)
 * - Returns up to 5 keywords
 *
 * This is a fallback when --keywords isn't provided.
 *
 * @example
 * ```typescript
 * extractKeywords("add user authentication system")
 * // Returns: ["add", "user", "authentication", "system"]
 * ```
 *
 * @internal
 */
function extractKeywords(task: string | undefined): string[] {
	if (!task) {
		return [];
	}

	// Common words to filter out
	const stopWords = new Set([
		"the",
		"a",
		"an",
		"to",
		"for",
		"of",
		"in",
		"on",
		"with",
		"and",
		"or",
		"is",
		"are",
		"it",
		"this",
		"that",
	]);

	// Split, filter, and limit
	return task
		.toLowerCase()
		.split(/\s+/)
		.filter((word) => word.length > 2 && !stopWords.has(word))
		.slice(0, 5);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { handleContextCommand };
