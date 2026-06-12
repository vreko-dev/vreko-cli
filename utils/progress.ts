/**
 * CLI-UX-004: Log-Update Integration
 *
 * Progress tracking utilities for real-time CLI feedback.
 * Provides file-by-file progress updates during multi-file operations.
 *
 * @see ai_dev_utils/resources/new_cli/04-log-update-integration.spec.md
 */

import chalk from "chalk";
import logUpdate from "log-update";
import ora, { type Ora } from "ora";

// =============================================================================
// TYPES (spec lines 94-99)
// =============================================================================

export interface ProgressTrackerOptions {
	total: number;
	label?: string;
	quiet?: boolean;
	showElapsed?: boolean;
}

// =============================================================================
// PROGRESS TRACKER CLASS (spec lines 101-204)
// =============================================================================

export class ProgressTracker {
	private current = 0;
	private total: number;
	private label: string;
	private quiet: boolean;
	private showElapsed: boolean;
	private startTime: number;
	private spinner: Ora | null = null;
	private isTTY: boolean;

	constructor(options: ProgressTrackerOptions) {
		this.total = options.total;
		this.label = options.label || "Processing";
		this.quiet = options.quiet || false;
		this.showElapsed = options.showElapsed ?? true;
		this.startTime = Date.now();
		this.isTTY = process.stdout.isTTY ?? false;
	}

	/**
	 * Start the progress tracker
	 */
	start(): void {
		if (this.quiet) {
			return;
		}

		if (this.isTTY) {
			this.spinner = ora({
				text: this.formatProgress(""),
				spinner: "dots",
			}).start();
		} else {
			console.log(this.formatProgress(""));
		}
	}

	/**
	 * Update progress with current item
	 */
	update(currentItem: string): void {
		this.current++;

		if (this.quiet) {
			return;
		}

		const progressText = this.formatProgress(currentItem);

		if (this.isTTY && this.spinner) {
			this.spinner.text = progressText;
		} else {
			// Non-TTY: log every 10th item or the final item
			if (this.current % 10 === 0 || this.current === this.total) {
				console.log(progressText);
			}
		}
	}

	/**
	 * Complete the progress with final message
	 */
	complete(message: string): void {
		if (this.quiet) {
			return;
		}

		if (this.isTTY && this.spinner) {
			this.spinner.succeed(message);
		} else {
			console.log(message);
		}
	}

	/**
	 * Fail the progress with error message
	 */
	fail(message: string): void {
		if (this.isTTY && this.spinner) {
			this.spinner.fail(message);
		} else {
			console.error(message);
		}
	}

	/**
	 * Get elapsed time string
	 */
	getElapsed(): string {
		const elapsed = Date.now() - this.startTime;
		if (elapsed < 1000) {
			return `${elapsed}ms`;
		}
		return `${(elapsed / 1000).toFixed(1)}s`;
	}

	/**
	 * Get current progress count
	 */
	getCurrent(): number {
		return this.current;
	}

	/**
	 * Get total count
	 */
	getTotal(): number {
		return this.total;
	}

	private formatProgress(currentItem: string): string {
		const counter = chalk.cyan(`[${this.current}/${this.total}]`);
		const item = currentItem ? chalk.gray(this.truncateItem(currentItem, 40)) : "";
		const elapsed =
			this.showElapsed && Date.now() - this.startTime > 2000 ? chalk.dim(` (${this.getElapsed()})`) : "";

		return `${this.label} ${counter} ${item}${elapsed}`;
	}

	private truncateItem(item: string, maxLength: number): string {
		if (item.length <= maxLength) {
			return item;
		}
		return `...${item.slice(-(maxLength - 3))}`;
	}
}

// =============================================================================
// LIVE LOGGER (spec lines 206-229)
// =============================================================================

/**
 * Simple log-update wrapper for custom progress displays
 * Handles TTY detection and provides update/done/clear methods.
 */
export function createLiveLogger() {
	const isTTY = process.stdout.isTTY ?? false;

	return {
		update: (text: string) => {
			if (isTTY) {
				logUpdate(text);
			}
		},
		done: () => {
			if (isTTY) {
				logUpdate.done();
			}
		},
		clear: () => {
			if (isTTY) {
				logUpdate.clear();
			}
		},
	};
}

// =============================================================================
// PROGRESS BAR RENDERER (spec lines 231-247)
// =============================================================================

/**
 * Progress bar renderer
 * Renders a visual progress bar with percentage.
 *
 * @param current - Current progress count
 * @param total - Total count
 * @param width - Bar width in characters (default 30)
 * @returns Formatted progress bar string
 */
export function renderProgressBar(current: number, total: number, width = 30): string {
	const percentage = Math.min(current / total, 1);
	const filled = Math.round(percentage * width);
	const empty = width - filled;

	const bar = chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
	const percent = chalk.cyan(`${Math.round(percentage * 100)}%`);

	return `${bar} ${percent}`;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a simple single-line progress indicator
 *
 * @param current - Current item number
 * @param total - Total items
 * @param item - Current item name
 * @returns Formatted progress line
 */
export function formatProgressLine(current: number, total: number, item: string): string {
	const counter = chalk.cyan(`[${current}/${total}]`);
	const truncatedItem = item.length > 50 ? `...${item.slice(-47)}` : item;
	return `${counter} ${chalk.gray(truncatedItem)}`;
}

/**
 * Format a duration in milliseconds to human-readable string
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${ms}ms`;
	}
	if (ms < 60000) {
		return `${(ms / 1000).toFixed(1)}s`;
	}
	const minutes = Math.floor(ms / 60000);
	const seconds = Math.round((ms % 60000) / 1000);
	return `${minutes}m ${seconds}s`;
}
