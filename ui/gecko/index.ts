/**
 * Gecko Overlay  -  terminal capability detection and Unicode art rendering.
 *
 * detectOverlayCapability() probes environment for graphics protocol support.
 * writeGeckoOverlay() writes the 4-line gecko art before Ink render().
 * SIGWINCH handler re-renders on terminal resize with 16ms debounce.
 *
 * Phase 32 delivers "unicode" and "none" only. Kitty/sixel detection is deferred.
 *
 * @module ui/gecko
 */

import { cliState } from "../../cli-state.js";

// =============================================================================
// TYPES
// =============================================================================

export type OverlayCapability = "kitty" | "sixel" | "unicode" | "none";

// =============================================================================
// MODULE-LEVEL MUTABLE STATE
// =============================================================================

let geckoRenderFn: (() => string) | null = null;
let geckoClearSeq: string | null = null;
let resizeTimer: NodeJS.Timeout | undefined;

// =============================================================================
// SIGWINCH HANDLER  -  registered at module load time
// =============================================================================

process.on("SIGWINCH", () => {
	clearTimeout(resizeTimer);
	resizeTimer = setTimeout(() => {
		if (geckoRenderFn && geckoClearSeq) {
			process.stdout.write(geckoClearSeq);
			process.stdout.write(geckoRenderFn());
		}
	}, 16);
});

// =============================================================================
// PRIVATE HELPERS
// =============================================================================

/**
 * Compute the ANSI escape sequence to erase N lines of output.
 * Leaves cursor at the start (column 0) of the first erased line.
 */
function computeClearSequence(output: string): string {
	const lines = output.split("\n").filter((_, i, arr) => i < arr.length - 1 || arr[arr.length - 1] !== "");
	const count = lines.length;
	if (count === 0) return "";
	let seq = "";
	for (let i = 0; i < count; i++) {
		seq += "\x1b[2K"; // erase current line
		if (i < count - 1) seq += "\x1b[1A"; // move up
	}
	seq += "\r"; // carriage return
	return seq;
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Detect the terminal overlay capability for the current environment.
 *
 * Priority order:
 * 1. !isTTY      → "none"
 * 2. CI          → "none"
 * 3. renderMode !== "ink" → "none"
 * 4. Otherwise   → "unicode"
 *
 * Kitty and sixel protocol detection is deferred to a future phase.
 */
export function detectOverlayCapability(): OverlayCapability {
	if (!process.stdout.isTTY) return "none";
	if (process.env.CI) return "none";
	if (cliState.renderMode !== "ink") return "none";
	return "unicode";
}

/**
 * Render the 4-line gecko art as a string.
 * Returns an empty string when capability is "none".
 */
export function renderGeckoArt(capability: OverlayCapability): string {
	if (capability === "none") return "";
	return " ▄▀▀▀▀▄  vreko\n(´ · ·`)  protecting your code\n  |  |\n  ˚  ˚\n";
}

/**
 * Write the gecko art overlay to stdout and set up the SIGWINCH replay state.
 *
 * Stores renderFn and the computed clear sequence at module level so the
 * SIGWINCH handler can re-render on terminal resize. Write is best-effort  -
 * no try/catch; TUI must still mount even if stdout.write fails.
 */
export function writeGeckoOverlay(renderFn: () => string): void {
	geckoRenderFn = renderFn;
	const output = renderFn();
	if (!output) return;
	geckoClearSeq = computeClearSequence(output);
	process.stdout.write(output);
}
