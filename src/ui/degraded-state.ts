/**
 * Degraded State Rendering
 *
 * Single source of truth for daemon-unavailable UX.
 * All commands must use renderDegradedState() when the daemon is unavailable.
 * No command may inline its own daemon-unavailable messaging.
 *
 * @module ui/degraded-state
 */

export interface DegradedStateOptions {
	command: string;
	reason?: "unreachable" | "timeout" | "version-mismatch" | "not-started";
}

/**
 * Render consistent daemon-unavailable error message.
 *
 * This is the ONLY place that renders daemon-unavailable messaging.
 * All future changes to daemon-unavailable UX happen here and propagate automatically.
 *
 * @param opts - Options for rendering the degraded state
 */
export function renderDegradedState(opts: DegradedStateOptions): void {
	const reason = opts.reason ?? "unreachable";

	const messages: Record<typeof reason, string> = {
		unreachable: "Vreko daemon is not running or not reachable.",
		timeout: "Vreko daemon did not respond in time.",
		"version-mismatch": "Vreko daemon version does not match CLI version.",
		"not-started": "Vreko daemon has not been started.",
	};

	const fixes: Record<typeof reason, string> = {
		unreachable: "vr daemon start",
		timeout: "vr daemon restart",
		"version-mismatch": "vr upgrade",
		"not-started": "vr daemon start",
	};

	// Four-part degraded-state message per industry standard (Docker, GitHub CLI, WCAG):
	// 1. What is unavailable (text severity prefix, no color dependence)
	// 2. What is affected (the specific command that failed)
	// 3. What to do (primary recovery action)
	// 4. What still works (offline fallback)
	const lines = [
		`[ERROR] ${messages[reason]}`,
		`  Command '${opts.command}' requires the daemon.`,
		`  Run: ${fixes[reason]}`,
		"  Commands that work offline: vr learn, vr check, vr session status",
		"  Diagnostics: vr doctor",
	];

	process.stderr.write(`${lines.join("\n")}\n`);
}
