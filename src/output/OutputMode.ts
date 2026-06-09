/**
 * OutputMode  -  JSON vs TTY mode detection for CLI agent-harness.
 *
 * JSON mode is active when:
 *   1. --json flag is set
 *   2. VREKO_JSON=1 env var
 *   3. stdout is not a TTY (piped/redirected)
 *
 * Spec: intelligence-projection-architecture.md §5.1
 * @module output/OutputMode
 */

export type OutputModeKind = "json" | "tty";

export interface OutputModeOpts {
	/** Explicit --json flag from commander. */
	json?: boolean;
	/** Suppress all stderr output. */
	quiet?: boolean;
}

/**
 * Detect the active output mode for the current process.
 */
export function detectOutputMode(opts: OutputModeOpts = {}): OutputModeKind {
	if (opts.json) return "json";
	if (process.env.VREKO_JSON === "1") return "json";
	if (!process.stdout.isTTY) return "json";
	return "tty";
}

/** True when stdout is in JSON (non-interactive) mode. */
export function isJsonMode(opts: OutputModeOpts = {}): boolean {
	return detectOutputMode(opts) === "json";
}
