/**
 * CI/TTY Detection Guards
 *
 * Utility functions for detecting terminal capabilities and CI environments.
 * Used by all TUI views to decide between interactive Ink rendering vs chalk fallback.
 *
 * @module ui/guards
 */

import { z } from "zod";

/**
 * Returns true when we're in an interactive terminal (not CI, not piped, not machine mode).
 */
export function isInteractive(): boolean {
	return (
		Boolean(process.stdout.isTTY) && !process.env.CI && !process.env.VREKO_PLAIN // machine mode: VREKO_PLAIN=1 suppresses TUI
	);
}

/**
 * Returns the terminal column width, defaulting to 80 if unknown.
 */
export function termWidth(): number {
	return process.stdout.columns || 80;
}

/**
 * Returns true when the terminal supports ANSI color output.
 */
export function supportsColor(): boolean {
	return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
}

/**
 * Conditionally run the interactive version or the plain fallback.
 * Use this to wrap all Ink renders  -  if not interactive, fall back to chalk output.
 *
 * @example
 * visual(
 *   () => renderInkView(<StatusView data={data} />),
 *   () => printChalkStatus(data),
 * );
 *
 * // Machine mode suppression:
 * // VREKO_PLAIN=1 vr status → calls fallback (JSON output), skips TUI render
 */
export function visual<T>(interactive: () => T, fallback: () => T): T {
	return isInteractive() ? interactive() : fallback();
}

// =============================================================================
// TERMINAL CAPABILITIES SCHEMA
// =============================================================================

/** Zod schema for terminal capability detection  -  used by view contracts */
export const TerminalCapabilities = z.object({
	isTTY: z.boolean(),
	isCI: z.boolean(),
	width: z.number().int().min(40),
	supportsColor: z.boolean(),
});
export type TerminalCapabilities = z.infer<typeof TerminalCapabilities>;

/**
 * Detect and return current terminal capabilities.
 */
export function detectCapabilities(): TerminalCapabilities {
	return {
		isTTY: Boolean(process.stdout.isTTY),
		isCI: Boolean(process.env.CI),
		width: termWidth(),
		supportsColor: supportsColor(),
	};
}

// =============================================================================
// RENDER MODE DECISION  -  set once per command invocation in preAction hook
// =============================================================================

/**
 * Four-way render mode enum for CLI output routing.
 * - "ink"    -  interactive terminal, Ink TUI renderer
 * - "clack"  -  wizard-style flows (vr init, vr onboard); returned only by those commands locally
 * - "json"   -  structured JSON to stdout (VREKO_JSON=1 or --json flag)
 * - "plain"  -  non-TTY / CI / machine mode (VREKO_PLAIN=1 or no TTY)
 *
 * getRenderMode() never returns "clack"  -  wizard commands check cliState locally.
 */
export type RenderMode = "ink" | "clack" | "json" | "plain";

/**
 * Determine the CLI render mode from environment signals.
 * Called ONCE per command invocation from the Commander preAction hook.
 * Commands read cliState.renderMode  -  they never call this directly.
 *
 * Priority order: json > plain > ink
 */
export function getRenderMode(): RenderMode {
	// JSON mode: VREKO_JSON env var (set by --json global flag or env)
	if (process.env.VREKO_JSON === "1" || process.env.VREKO_JSON === "true") {
		return "json";
	}
	// Plain/machine mode: VREKO_PLAIN, no TTY, or CI environment
	if (process.env.VREKO_PLAIN === "1" || !process.stdout.isTTY || process.env.CI) {
		return "plain";
	}
	// Interactive TTY: Ink TUI is the default renderer
	return "ink";
}
