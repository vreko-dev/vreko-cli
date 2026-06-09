/**
 * @clack/prompts Wrappers  -  Vreko Brand
 *
 * Thin wrappers around @clack/prompts that apply Vreko brand colors
 * and non-TTY safe-defaults. Use these in wizard flows and sequential prompts.
 *
 * For static command output (not wizard flows), continue using prompts.ts.
 * Migration is incremental  -  this file coexists with prompts.ts during transition.
 *
 * Non-TTY behaviour: when !isInteractive(), all prompts auto-resolve to their
 * default values without blocking on stdin. This keeps CI pipelines from hanging.
 *
 * @module ui/prompts-clack
 */

import * as clack from "@clack/prompts";
import chalk from "chalk";
import { isInteractive } from "./guards.js";
import { BRAND_COLORS } from "./theme.js";

// =============================================================================
// INTRO / OUTRO
// =============================================================================

/** Print the branded intro header for a wizard flow. */
export function clackIntro(title: string): void {
	clack.intro(chalk.hex(BRAND_COLORS.primary).bold(title));
}

/** Print the branded outro footer for a wizard flow. */
export function clackOutro(message: string): void {
	clack.outro(chalk.hex(BRAND_COLORS.primaryDark)(message));
}

// =============================================================================
// CONFIRM
// =============================================================================

/**
 * Branded confirm prompt.
 * Non-TTY: auto-resolves to `defaultValue` (default: false).
 */
export async function clackConfirm(
	message: string,
	options?: { defaultValue?: boolean; active?: string; inactive?: string },
): Promise<boolean> {
	if (!isInteractive()) {
		return options?.defaultValue ?? false;
	}

	const result = await clack.confirm({
		message,
		active: options?.active ?? "yes",
		inactive: options?.inactive ?? "no",
		initialValue: options?.defaultValue ?? false,
	});

	if (clack.isCancel(result)) {
		clack.cancel("Cancelled.");
		process.exit(0);
	}

	return result;
}

// =============================================================================
// SELECT
// =============================================================================

/** Option shape for clackSelect */
export interface ClackSelectOption<T extends string> {
	value: T;
	label: string;
	hint?: string;
}

/**
 * Branded select prompt.
 * Non-TTY: auto-resolves to the first option's value.
 */
export async function clackSelect<T extends string>(message: string, options: ClackSelectOption<T>[]): Promise<T> {
	if (!isInteractive()) {
		return options[0].value;
	}

	// @clack/prompts Option<Value> uses a conditional type that TypeScript can't resolve
	// with a generic parameter  -  cast through unknown to bypass.
	// biome-ignore lint/suspicious/noExplicitAny: @clack/prompts Option<Value> conditional type can't be resolved with a generic param
	const result = (await clack.select({ message, options: options as any })) as T | symbol;

	if (clack.isCancel(result)) {
		clack.cancel("Cancelled.");
		process.exit(0);
	}

	return result;
}

// =============================================================================
// TEXT INPUT
// =============================================================================

/**
 * Branded text input prompt.
 * Non-TTY: auto-resolves to `defaultValue` or empty string.
 */
export async function clackInput(
	message: string,
	options?: {
		placeholder?: string;
		defaultValue?: string;
		validate?: (value: string) => string | undefined;
	},
): Promise<string> {
	if (!isInteractive()) {
		return options?.defaultValue ?? "";
	}

	const result = await clack.text({
		message,
		placeholder: options?.placeholder,
		defaultValue: options?.defaultValue,
		validate: options?.validate ? (value: string | undefined) => options.validate?.(value ?? "") : undefined,
	});

	if (clack.isCancel(result)) {
		clack.cancel("Cancelled.");
		process.exit(0);
	}

	return result;
}

// =============================================================================
// SPINNER
// =============================================================================

/**
 * Branded spinner for wizard flows.
 * Returns a clack spinner  -  use `.start(message)` and `.stop(message)`.
 *
 * NOTE: Use this for wizard sequential flows. For command output, use ora from prompts.ts.
 */
export function clackSpinner() {
	return clack.spinner();
}

// =============================================================================
// MULTI-STEP GROUP
// =============================================================================

/**
 * Run a group of prompts as a multi-step wizard.
 * Non-TTY: runs each step with its default value.
 */
export async function clackGroup<T extends Record<string, unknown>>(
	steps: Parameters<typeof clack.group>[0],
	options?: Parameters<typeof clack.group>[1],
): Promise<T> {
	const result = await clack.group(steps, {
		onCancel: () => {
			clack.cancel("Setup cancelled.");
			process.exit(0);
		},
		...options,
	});
	return result as T;
}

// =============================================================================
// NOTE / LOG
// =============================================================================

/** Print a note box in the wizard flow. */
export function clackNote(message: string, title?: string): void {
	clack.note(message, title);
}

/** Print a log message within a wizard flow (replaces console.log mid-flow). */
export const clackLog = {
	info: (message: string) => clack.log.info(message),
	success: (message: string) => clack.log.success(message),
	warn: (message: string) => clack.log.warn(message),
	error: (message: string) => clack.log.error(message),
	step: (message: string) => clack.log.step(message),
} as const;
