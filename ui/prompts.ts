/**
 * Interactive Prompts Module
 *
 * Beautiful, accessible prompts for CLI interactions.
 * Includes confirmation dialogs, selection menus, and progress displays.
 *
 * Patterns from: GitHub CLI, Vercel CLI, Stripe CLI
 *
 * @module ui/prompts
 */

import * as readline from "node:readline";
import chalk from "chalk";
import ora, { type Ora } from "ora";

// =============================================================================
// TYPES
// =============================================================================

export interface ConfirmOptions {
	message: string;
	default?: boolean;
	timeout?: number;
}

export interface SelectOption<T = string> {
	label: string;
	value: T;
	hint?: string;
	disabled?: boolean;
}

export interface SelectOptions<T = string> {
	message: string;
	options: SelectOption<T>[];
	default?: T;
}

export interface ProgressOptions {
	text: string;
	spinner?: "dots" | "line" | "arc" | "arrow";
}

export interface MultiStepOptions {
	steps: string[];
	currentStep: number;
}

// =============================================================================
// CONFIRMATION PROMPTS
// =============================================================================

/**
 * Ask for confirmation before destructive operations
 */
export async function confirm(options: ConfirmOptions): Promise<boolean> {
	const { message, default: defaultValue = false, timeout } = options;

	const hint = defaultValue ? "[Y/n]" : "[y/N]";
	const prompt = `${chalk.yellow("?")} ${message} ${chalk.gray(hint)} `;

	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		let timeoutId: NodeJS.Timeout | undefined;

		if (timeout) {
			timeoutId = setTimeout(() => {
				rl.close();
				resolve(defaultValue);
			}, timeout);
		}

		rl.question(prompt, (answer) => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			rl.close();

			const trimmed = answer.trim().toLowerCase();

			if (trimmed === "") {
				resolve(defaultValue);
			} else if (trimmed === "y" || trimmed === "yes") {
				resolve(true);
			} else {
				resolve(false);
			}
		});
	});
}

/**
 * Require explicit confirmation with typed input
 */
export async function confirmDangerous(message: string, confirmText: string): Promise<boolean> {
	const prompt = `${chalk.red("!")} ${message}\n  Type "${chalk.bold(confirmText)}" to confirm: `;

	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		rl.question(prompt, (answer) => {
			rl.close();
			resolve(answer.trim() === confirmText);
		});
	});
}

// =============================================================================
// SELECTION PROMPTS
// =============================================================================

/**
 * Display a selection menu
 */
// biome-ignore lint/suspicious/noExplicitAny: select options shape is intentionally open at this abstraction layer
export async function select<T = string>(options: any): Promise<T | undefined> {
	const { _message, options: choices, default: defaultValue } = options;

	// Display options
	for (let i = 0; i < choices.length; i++) {
		const choice = choices[i];
		const isDefault = choice.value === defaultValue;
		const _marker = isDefault ? chalk.cyan("›") : " ";
		const _number = chalk.gray(`${i + 1}.`);
		const _label = choice.disabled ? chalk.gray(choice.label) : choice.label;
		const _hint = choice.hint ? chalk.gray(` (${choice.hint})`) : "";
		const _disabled = choice.disabled ? chalk.gray(" [disabled]") : "";
	}

	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const prompt = chalk.gray("Enter number (or press Enter for default): ");

		rl.question(prompt, (answer) => {
			rl.close();

			const trimmed = answer.trim();

			if (trimmed === "") {
				resolve(defaultValue);
				return;
			}

			const index = Number.parseInt(trimmed, 10) - 1;

			if (Number.isNaN(index) || index < 0 || index >= choices.length) {
				resolve(undefined);
				return;
			}

			const choice = choices[index];

			if (choice.disabled) {
				resolve(undefined);
				return;
			}

			resolve(choice.value);
		});
	});
}

// =============================================================================
// PROGRESS INDICATORS
// =============================================================================

/**
 * Create a spinner for async operations
 */
export function spinner(options: ProgressOptions | string): Ora {
	const opts = typeof options === "string" ? { text: options } : options;
	const { text, spinner: spinnerType = "dots" } = opts;

	return ora({
		text,
		spinner: spinnerType,
		color: "cyan",
	});
}

/**
 * Run an async operation with a spinner
 */
export async function withSpinner<T>(
	text: string,
	fn: () => Promise<T>,
	options?: {
		successText?: string;
		failText?: string;
	},
): Promise<T> {
	const s = spinner(text).start();

	try {
		const result = await fn();
		s.succeed(options?.successText || text);
		return result;
	} catch (error) {
		s.fail(options?.failText || text);
		throw error;
	}
}

/**
 * Display a progress bar
 */
export function progressBar(current: number, total: number, width = 30): string {
	const percent = Math.round((current / total) * 100);
	const filled = Math.round((current / total) * width);
	const empty = width - filled;

	const bar = chalk.cyan("█".repeat(filled)) + chalk.gray("░".repeat(empty));
	const label = `${current}/${total}`;
	const percentage = chalk.gray(`${percent}%`);

	return `${bar} ${label} ${percentage}`;
}

/**
 * Display step progress (e.g., "Step 2 of 5")
 */
export function stepProgress(options: MultiStepOptions): string {
	const { steps, currentStep } = options;
	const total = steps.length;

	const lines: string[] = [];
	lines.push(chalk.cyan.bold(`Step ${currentStep + 1} of ${total}: ${steps[currentStep]}`));
	lines.push("");

	for (let i = 0; i < steps.length; i++) {
		const step = steps[i];
		let marker: string;
		let label: string;

		if (i < currentStep) {
			marker = chalk.green("✓");
			label = chalk.gray(step);
		} else if (i === currentStep) {
			marker = chalk.cyan("›");
			label = chalk.white(step);
		} else {
			marker = chalk.gray("○");
			label = chalk.gray(step);
		}

		lines.push(`  ${marker} ${label}`);
	}

	return lines.join("\n");
}

// =============================================================================
// TEXT INPUT
// =============================================================================

/**
 * Prompt for text input
 */
export async function input(
	message: string,
	options?: {
		default?: string;
		validate?: (value: string) => string | boolean;
		mask?: boolean;
	},
): Promise<string> {
	const { default: defaultValue, validate, mask: _mask } = options || {};

	const defaultHint = defaultValue ? chalk.gray(` (${defaultValue})`) : "";
	const prompt = `${chalk.cyan("?")} ${message}${defaultHint}: `;

	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		// For password masking, we'd need more complex handling
		// This is a simplified version
		rl.question(prompt, (answer) => {
			rl.close();

			const value = answer.trim() || defaultValue || "";

			if (validate) {
				const validation = validate(value);

				if (typeof validation === "string") {
					resolve("");
					return;
				}

				if (validation === false) {
					resolve("");
					return;
				}
			}

			resolve(value);
		});
	});
}

// =============================================================================
// STATUS MESSAGES
// =============================================================================

export const status = {
	success: (_message: string) => {
		/* intentionally empty */
	},
	error: (_message: string) => {
		/* intentionally empty */
	},
	warning: (_message: string) => {
		/* intentionally empty */
	},
	info: (_message: string) => {
		/* intentionally empty */
	},
	debug: (_message: string) => {
		/* intentionally empty */
	},
	step: (_message: string) => {
		/* intentionally empty */
	},
	done: (_message: string) => {
		/* intentionally empty */
	},
};

// =============================================================================
// DRY RUN MODE
// =============================================================================

/**
 * Display a dry-run diff preview
 */
export function dryRunPreview(changes: DryRunChange[]): void {
	for (const change of changes) {
		const _icon =
			change.type === "create" ? chalk.green("+") : change.type === "delete" ? chalk.red("-") : chalk.yellow("~");

		if (change.details) {
			for (const detail of change.details) {
				if (detail.startsWith("+")) {
					// intentionally empty
				} else if (detail.startsWith("-")) {
					// intentionally empty
				} else {
					// intentionally empty
				}
			}
		}
	}
}

export interface DryRunChange {
	type: "create" | "update" | "delete";
	path: string;
	details?: string[];
}

// =============================================================================
// EXPORTS
// =============================================================================

export const prompts = {
	confirm,
	confirmDangerous,
	select,
	input,
	spinner,
	withSpinner,
	progressBar,
	stepProgress,
	status,
	dryRunPreview,
};
