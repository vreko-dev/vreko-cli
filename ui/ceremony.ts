/**
 * Ceremony Renderer
 *
 * Renders closing ceremony data as ≤80-char terminal output that is also valid markdown.
 * Used by `session end --ceremony` to display the session summary after daemon RPC call.
 *
 * CEREM-02: Every line MUST be ≤ 80 chars.
 * CEREM-03: All numeric values derived from bound observation records  -  no fabrication.
 * CEREM-04: This function is the CLI half of the ceremony surface.
 *
 * @module ui/ceremony
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Ceremony display record  -  fields needed by renderCeremony().
 *
 * This is a structural subset compatible with ClosingCeremonyRecord from
 * apps/local-service. The CLI does not import from apps/local-service directly
 * (cross-app imports are forbidden per CLAUDE.md). Fields are optional to
 * support partial RPC responses and the null fallback path.
 */
export interface CeremonyDisplayRecord {
	sessionId?: string;
	workspacePath?: string;
	/** Duration in milliseconds */
	duration?: number;
	learningsCaptured?: number;
	checkpointsCreated?: number;
	tokensSaved?: number;
	tokensSavedIsEstimate?: true;
	fragileFilesInSession?: Array<{ path: string; riskScore: number }>;
	signalMetrics?: {
		protectionDecisions?: number;
		[key: string]: unknown;
	};
	/** Count of critical signals  -  proxy for pitfalls avoided (CEREM-03) */
	pitfallsAvoided?: number;
	/** Sum of riskScores from fragile files in session (CEREM-03) */
	fragilityExposure?: number;
	[key: string]: unknown;
}

// =============================================================================
// Constants
// =============================================================================

// Column widths: label col 21 chars, value col 15 chars
// Row format: "| {label:21}| {value:15}|" = 2+21+1+1+15+1 = 41 chars total
// Well within 80-char limit per CEREM-02.
const LABEL_WIDTH = 21;
const VALUE_WIDTH = 15;

// =============================================================================
// Renderer
// =============================================================================

/**
 * Render ceremony data as ≤80-char terminal output that is also valid markdown.
 * Returns the markdown string (caller writes to stdout).
 *
 * CEREM-02: Every line MUST be ≤ 80 chars.
 * CEREM-03: All numeric values derived from bound observation records  -  no fabrication.
 * CEREM-04: This function is the CLI half of the ceremony surface.
 *
 * @param record - Ceremony data from daemon RPC, or null if daemon unavailable.
 */
export function renderCeremony(record: CeremonyDisplayRecord | null): string {
	if (!record) {
		return [
			"## Vreko Session Summary",
			"",
			"Service not connected  -  ceremony data unavailable.",
			"",
			"Run `vreko session end` with a live service to see full summary.",
		].join("\n");
	}

	// Format a table row: "| {label:21}| {value:15}|"
	const row = (label: string, val: string | number): string =>
		`| ${label.padEnd(LABEL_WIDTH)}| ${String(val).padEnd(VALUE_WIDTH)}|`;

	// Privacy rule: show only last 12 chars of workspacePath (INV-PA-01/PA-02)
	const workspaceShort = record.workspacePath ? record.workspacePath.slice(-12) : "unknown";

	const durationMin = record.duration != null ? `${Math.round(record.duration / 60_000)} min` : " - ";

	const fragilityDisplay = record.fragilityExposure != null ? record.fragilityExposure.toFixed(1) : " - ";

	return [
		"## Vreko Session Summary",
		"",
		"| Metric              | Value         |",
		"|---------------------|---------------|",
		row("Duration", durationMin),
		row("Learnings captured", record.learningsCaptured ?? 0),
		row("Patterns surfaced", record.signalMetrics?.protectionDecisions ?? 0),
		row("Pitfalls avoided", record.pitfallsAvoided ?? 0),
		row("Fragility exposure", fragilityDisplay),
		row("Snapshots created", record.checkpointsCreated ?? 0),
		row("Token savings", `~${record.tokensSaved ?? 0}`),
		"",
		`Session ID: ${record.sessionId ?? "unknown"}`,
		`Workspace:  ${workspaceShort}`,
		`Generated:  ${new Date().toISOString()}`,
	].join("\n");
}
