/**
 * Validate Command
 *
 * @fileoverview Implements `vr validate` - Run 7-layer validation pipeline on code.
 * This is the CLI equivalent of the MCP's `codebase.validate_code()` tool.
 *
 * ## Purpose
 *
 * Before committing code, developers should validate that it:
 * - Has no syntax errors
 * - Follows type conventions
 * - Passes architecture checks
 * - Has no security issues
 * - Meets performance standards
 *
 * This command runs the full ValidationPipeline from @vreko/intelligence.
 * ReviewRecommendation type sourced from @vreko/contracts (canonical).
 *
 * ## The 7 Validation Layers
 *
 * 1. **Syntax**: Basic parsing and structure
 * 2. **Types**: Type consistency and inference
 * 3. **Tests**: Test coverage and quality
 * 4. **Architecture**: Layer boundaries, import rules
 * 5. **Security**: Secrets, injection vulnerabilities
 * 6. **Dependencies**: Phantom deps, version conflicts
 * 7. **Performance**: Bundle size, complexity
 *
 * ## Usage Examples
 *
 * ```bash
 * # Validate a single file
 * vr validate src/auth.ts
 *
 * # Validate all staged files (pre-commit)
 * vr validate --all
 *
 * # Quiet mode - only output if issues found
 * vr validate --all --quiet
 *
 * # Machine-readable output
 * vr validate src/auth.ts --json
 * ```
 *
 * ## Output Format
 *
 * Default output shows progress and results table:
 * ```
 * Validating... src/auth.ts ━━━━━━━━━━━━━━━━━━ 100% (1/1)
 *
 * ┌─────────────────┬────────┬────────────┬───────────────┐
 * │ File            │ Passed │ Confidence │ Issues        │
 * ├─────────────────┼────────┼────────────┼───────────────┤
 * │ src/auth.ts     │ ✗      │ 65%        │ 3 (full_rev)  │
 * └─────────────────┴────────┴────────────┴───────────────┘
 *
 * ┌─────────────────────────────────────────┐
 * │  ❌ Validation Failed                   │
 * │                                         │
 * │  src/auth.ts: 3 issues                  │
 * └─────────────────────────────────────────┘
 * ```
 *
 * ## Related
 *
 * - Spec: `ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md`
 * - MCP equivalent: `ai_dev_utils/mcp/server.ts` → `handleValidateCode()`
 * - Intelligence method: `Intelligence.validateCode()` / `Intelligence.checkPatterns()`
 * - Pipeline: `packages/intelligence/src/validation/ValidationPipeline.ts`
 *
 * @see {@link file://ai_dev_utils/resources/new_cli/05-intelligence-integration.spec.md}
 * @module commands/validate
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ReviewRecommendation } from "@vreko/contracts";
import chalk from "chalk";
import { Command } from "commander";
import { connectServiceClient, createServiceClient } from "../service-adapter/local-service-adapter.js";
import { GitClient, isCodeFile } from "../services/git-client";
import { getIntelligence } from "../services/intelligence-service";
import { ProgressTracker } from "../utils/progress";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options parsed from command line
 *
 * @internal
 */
interface ValidateOptions {
	/** Validate all staged files instead of specific file */
	all?: boolean;
	/** Only output if issues found */
	quiet?: boolean;
	/** Output as JSON */
	json?: boolean;
}

/**
 * Result for a single file validation
 *
 * @remarks
 * This is used for both display and JSON output.
 * Maps to the shape expected by createValidationTable().
 */
export interface FileValidationResult {
	/** File path relative to workspace root */
	file: string;
	/** Whether all critical checks passed */
	passed: boolean;
	/** Confidence score 0-1 (displayed as percentage) */
	confidence: number;
	/** Total number of issues found */
	issues: number;
	/**
	 * Review recommendation from pipeline
	 * - "auto_merge": Safe to merge automatically
	 * - "quick_review": Minor issues, quick review needed
	 * - "full_review": Critical issues, full review required
	 * - "error": Validation failed (couldn't read file, etc.)
	 */
	recommendation: ReviewRecommendation | "error";
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the validate command
 *
 * @returns Commander Command instance
 *
 * @remarks
 * ## Implementation Notes for LLM Agents
 *
 * 1. This command uses Intelligence.validateCode() for the heavy lifting
 * 2. For --all mode, use GitClient to get staged files
 * 3. Use ProgressTracker for real-time feedback (CLI-UX-004)
 * 4. Use createValidationTable() for results display (CLI-UX-003)
 * 5. Use displayBox() for summary (CLI-UX-001)
 *
 * ## Exit Codes
 *
 * - 0: All files passed validation
 * - 1: One or more files failed validation
 *
 * ## Error Handling
 *
 * - File not found → Include in results with recommendation: "error"
 * - Can't read file (binary, permissions) → Skip with warning
 * - Git errors → Show helpful message about git init
 *
 * @example
 * ```typescript
 * // In apps/cli/src/index.ts:
 * import { createValidateCommand } from "./commands/validate";
 * program.addCommand(createValidateCommand());
 * ```
 */
export function createValidateCommand(): Command {
	const validate = new Command("validate")
		.description("Run validation pipeline on code")
		.argument("[file]", "File to validate")
		.option("-a, --all", "Validate all staged files")
		.option("-q, --quiet", "Only output if issues found")
		.option("--json", "Output as JSON")
		.action(async (file: string | undefined, options: ValidateOptions) => {
			await handleValidateCommand(file, options);
		});

	return validate;
}

// =============================================================================
// COMMAND HANDLER
// =============================================================================

/**
 * Handle the validate command execution
 *
 * @param file - Optional specific file to validate
 * @param options - Command options
 *
 * @remarks
 * ## Implementation Flow
 *
 * 1. Determine files to validate (specific file or staged files)
 * 2. Show progress tracker
 * 3. For each file:
 *    a. Read file content
 *    b. Call intelligence.validateCode()
 *    c. Collect results
 * 4. Display results table
 * 5. Show summary box if failures
 * 6. Exit with appropriate code
 *
 * ## Intelligence.validateCode() Input
 *
 * ```typescript
 * validateCode(code: string, filePath: string): Promise<PipelineResult>
 * ```
 *
 * ## Intelligence.validateCode() Output
 *
 * ```typescript
 * interface PipelineResult {
 *   overall: {
 *     passed: boolean;        // All critical checks passed
 *     confidence: number;     // 0-1 confidence score
 *     totalIssues: number;    // Sum of all issues
 *   };
 *   recommendation: "auto_merge" | "quick_review" | "full_review";
 *   layers: LayerResult[];    // Results from each of 7 layers
 *   focusPoints: string[];    // Key areas to review
 * }
 * ```
 *
 * @internal
 */
async function handleValidateCommand(file: string | undefined, options: ValidateOptions): Promise<void> {
	const cwd = process.cwd();

	try {
		// STEP 1: Get Intelligence instance
		const intelligence = await getIntelligence(cwd);

		// STEP 2: Determine files to validate
		const filesToValidate = await getFilesToValidate(file, options.all, cwd);

		if (filesToValidate.length === 0) {
			if (!options.quiet) {
				console.log(chalk.yellow("No files to validate"));
				console.log(chalk.gray("Usage: vr validate <file> or vr validate --all"));
			}
			return;
		}

		// STEP 3: Set up progress tracking
		const progress = new ProgressTracker({
			total: filesToValidate.length,
			label: "Validating",
			quiet: options.quiet,
		});

		progress.start();

		// STEP 4: Validate each file
		const results: FileValidationResult[] = [];
		let hasErrors = false;
		let progressCompleted = false;

		// STEP 4a: Evaluate learnings in warn mode (Phase 2)
		// For high-value commands (verify), surface warn-type learnings
		const warnings: Array<{ title: string; message: string; severity: string }> = [];
		const serviceClient = createServiceClient();
		try {
			await connectServiceClient(serviceClient);

			// Try to evaluate learnings (non-blocking)
			const learningResult = await serviceClient.learning.evaluate({
				workspace: cwd,
				commandName: "validate",
				filesOrPaths: filesToValidate,
				intent: "review",
				mode: "warn",
			});

			// Collect warn-type learnings from applicable results
			if (learningResult.applicable && learningResult.applicable.length > 0) {
				for (const learning of learningResult.applicable) {
					warnings.push({
						title: learning.trigger || "Warning",
						message: learning.action || "Check code for potential issues",
						severity: "warning",
					});
				}
			}
		} catch {
			// Daemon not available or learning evaluation failed - continue without warnings
		} finally {
			serviceClient.close();
		}

		try {
			for (const filePath of filesToValidate) {
				progress.update(filePath);

				try {
					// Read file content
					const content = await readFile(resolve(cwd, filePath), "utf-8");

					// Run validation pipeline
					const pipelineResult = await intelligence.validateCode(content, filePath);

					// Map recommendation string to type-safe value
					const recommendation: ReviewRecommendation | "error" = pipelineResult.passed
						? "auto_merge"
						: "full_review";

					// Collect result
					results.push({
						file: filePath,
						passed: pipelineResult.passed,
						confidence: pipelineResult.confidence,
						issues: pipelineResult.totalIssues,
						recommendation,
					});

					if (!pipelineResult.passed) {
						hasErrors = true;
					}
				} catch {
					// File couldn't be read/validated
					// Include in results as error
					results.push({
						file: filePath,
						passed: false,
						confidence: 0,
						issues: 1,
						recommendation: "error",
					});
					hasErrors = true;
				}
			}

			// STEP 5: Complete progress
			const passedCount = results.filter((r) => r.passed).length;

			if (hasErrors) {
				progress.fail(`${passedCount}/${results.length} files passed`);
			} else {
				progress.complete(`All ${results.length} files passed validation`);
			}
			progressCompleted = true;

			// STEP 6: Output results
			if (options.json) {
				console.log(JSON.stringify(results, null, 2));
			} else if (!options.quiet || hasErrors) {
				displayValidationResults(results, hasErrors, warnings);
			}

			// STEP 7: Exit with appropriate code
			process.exit(hasErrors ? 1 : 0);
		} finally {
			// Ensure progress is stopped if an error occurred before completion
			if (!progressCompleted) {
				progress.fail("Validation interrupted");
			}
		}
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);

		if (message.includes("not initialized")) {
			console.log(chalk.yellow("🦎 Vreko not initialized"));
			console.log(chalk.gray("Run: vr init"));
			process.exit(1);
		}
		console.error(chalk.red("Error:"), message);
		process.exit(1);
	}
}

// =============================================================================
// FILE DISCOVERY
// =============================================================================

/**
 * Get list of files to validate
 *
 * @param file - Specific file if provided
 * @param all - Whether --all flag was set
 * @param cwd - Current working directory
 * @returns Array of file paths to validate
 *
 * @remarks
 * ## Logic
 *
 * 1. If specific file provided → validate just that file
 * 2. If --all flag → get staged files from git, filter to code files
 * 3. If neither → return empty (will show usage hint)
 *
 * ## Code File Detection
 *
 * Uses isCodeFile() from git-client.ts which checks:
 * - .ts, .tsx, .js, .jsx extensions
 * - Excludes .d.ts declaration files
 * - Excludes node_modules, .git, etc.
 *
 * @internal
 */
async function getFilesToValidate(file: string | undefined, all: boolean | undefined, cwd: string): Promise<string[]> {
	// Case 1: Specific file provided
	if (file) {
		return [file];
	}

	// Case 2: --all flag - get staged files
	if (all) {
		try {
			const git = new GitClient({ cwd });

			// Check git is available and we're in a repo
			if (!(await git.isGitInstalled())) {
				return [];
			}

			if (!(await git.isGitRepository())) {
				return [];
			}

			// Get staged files
			const stagedFiles = await git.getStagedFiles();

			// Filter to code files, exclude deleted files
			return stagedFiles.filter((f) => f.status !== "deleted" && isCodeFile(f.path)).map((f) => f.path);
		} catch {
			return [];
		}
	}

	// Case 3: Neither - empty list
	return [];
}

// =============================================================================
// DISPLAY FUNCTIONS
// =============================================================================

/**
 * Display validation results
 *
 * @param results - Array of validation results
 * @param hasErrors - Whether any files failed
 * @param warnings - Array of warn-type learnings (Phase 2)
 *
 * @remarks
 * ## Display Structure
 *
 * 1. Warnings from learnings (Phase 2 warn mode)
 *    - Uses displayBox() with type: "warning"
 *    - Shows learning-based pitfalls/patterns
 *
 * 2. Results table (always if not quiet)
 *    - Uses createValidationTable()
 *    - Shows file, passed status, confidence, issues
 *
 * 3. Summary box (only if errors)
 *    - Uses displayBox() with type: "error"
 *    - Lists failed files
 *
 * 4. Tip (only if errors)
 *    - Suggests running patterns report
 *
 * @internal
 */
function displayValidationResults(
	results: FileValidationResult[],
	hasErrors: boolean,
	warnings: Array<{ title: string; message: string; severity: string }> = [],
): void {
	// PART 0: Display learning warnings (Phase 2)
	if (warnings.length > 0) {
		for (const warning of warnings) {
			const warningType = warning.severity === "error" ? "error" : "warning";
			const icon = warningType === "error" ? chalk.red("✗") : chalk.yellow("⚠");
			console.log(`${icon} ${warning.title}: ${warning.message}`);
		}
	}

	// PART 2: Summary box for failures
	if (hasErrors) {
		const failedFiles = results.filter((r) => !r.passed);
		console.log(chalk.red(`\n✗ ${failedFiles.length} file(s) failed validation:`));
		for (const f of failedFiles) {
			console.log(`  ${chalk.bold(f.file)}: ${f.issues} issue${f.issues !== 1 ? "s" : ""}`);
		}
	}
}

/**
 * Format failed files for summary box
 *
 * @param failures - Array of failed file results
 * @returns Formatted string for box content
 *
 * @internal
 */
function _formatValidationSummary(failures: FileValidationResult[]): string {
	return failures.map((f) => `${chalk.bold(f.file)}: ${f.issues} issue${f.issues !== 1 ? "s" : ""}`).join("\n");
}

// =============================================================================
// EXPORTS
// =============================================================================

export { handleValidateCommand };
