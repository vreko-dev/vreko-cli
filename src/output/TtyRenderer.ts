/**
 * TtyRenderer  -  human-readable TTY output renderer for interactive mode.
 *
 * Used when stdout IS a TTY and --json is not set.
 * Falls back to chalk for colors when available.
 *
 * Spec: intelligence-projection-architecture.md §5.1
 * @module output/TtyRenderer
 */

// Dynamic import to avoid adding chalk as a required dep for JSON-mode paths.
type Chalk = {
	green: (s: string) => string;
	yellow: (s: string) => string;
	red: (s: string) => string;
	gray: (s: string) => string;
};

let _chalk: Chalk | null = null;
async function getChalk(): Promise<Chalk> {
	if (_chalk) return _chalk;
	try {
		const c = await import("chalk");
		_chalk = c.default as Chalk;
		return _chalk;
	} catch {
		// chalk not available  -  passthrough
		_chalk = { green: (s) => s, yellow: (s) => s, red: (s) => s, gray: (s) => s };
		return _chalk;
	}
}

/** Print a success line. */
export function printSuccess(msg: string): void {
	console.log(msg);
}

/** Print a warning line. */
export function printWarning(msg: string): void {
	console.log(msg);
}

/** Print an error line. */
export function printError(msg: string): void {
	console.error(msg);
}

/** Print a info/detail line. */
export function printInfo(msg: string): void {
	console.log(msg);
}
