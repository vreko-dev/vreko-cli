/**
 * JsonRenderer  -  machine-readable JSON output renderer for agent-harness mode.
 *
 * In JSON mode:
 *   - All output goes to stdout as a single JSON object.
 *   - Logs go to stderr (suppressed when --quiet).
 *   - Schema version is always present.
 *
 * Output schema: { schemaVersion: "1.0.0", kind: string, data: unknown }
 *
 * Spec: intelligence-projection-architecture.md §5.1
 * @module output/JsonRenderer
 */

export const SCHEMA_VERSION = "1.0.0" as const;

export type JsonKind = "context" | "check" | "risk" | "session" | "intel" | "hooks" | "error";

export interface JsonOutput<T = unknown> {
	schemaVersion: typeof SCHEMA_VERSION;
	kind: JsonKind;
	data: T;
}

export interface JsonErrorData {
	code: number;
	message: string;
	details?: string;
}

/**
 * Render a JSON payload to stdout.
 * NEVER call console.log in JSON mode  -  use this instead.
 */
export function renderJson<T>(kind: JsonKind, data: T): void {
	const output: JsonOutput<T> = {
		schemaVersion: SCHEMA_VERSION,
		kind,
		data,
	};
	process.stdout.write(`${JSON.stringify(output)}\n`);
}

/** Render an error payload to stdout and optionally to stderr. */
export function renderJsonError(code: number, message: string, quiet = false): void {
	const data: JsonErrorData = { code, message };
	renderJson("error", data);
	if (!quiet) {
		process.stderr.write(`[vreko] error: ${message}\n`);
	}
}
