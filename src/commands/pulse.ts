/**
 * Pulse Command  -  Mid-session intelligence snapshot for the CLI.
 *
 * Mirrors the `vreko_pulse` MCP tool over a CLI surface so the Claude Code
 * PreToolUse hook (AMBIENT-06) can read fragile-file intelligence without
 * talking to the MCP server. Reuses the same deterministic `composeHint()`
 * function as MCP  -  no drift between surfaces.
 *
 * Usage:
 *   vreko pulse --format json --focus packages/auth/src/session.ts
 *   vreko pulse                                (human-readable prose)
 *
 * Exit codes:
 *   0  success (including `service down`  -  advisory only, never blocks the hook)
 *
 * The hook script parses stdout with `jq -r '.llmHint // empty'`, so JSON
 * output is stable and always valid. Daemon unavailable returns `{}` to
 * keep the hook's jq pipeline happy.
 *
 * @module commands/pulse
 */

import { basename } from "node:path";
import { type ComposeHintParams, composeHint } from "@vreko/mcp/tools";
import { Command } from "commander";
import { withDaemonOptional } from "../services/service-client.js";
import { getCurrentSession } from "../services/vreko-dir.js";

// =============================================================================
// Daemon response shapes (narrow interfaces  -  we only touch what we need)
// =============================================================================

interface SessionCurrentResponse {
	state?: string;
	active?: boolean;
	id?: string;
	startedAt?: string;
	touchedFiles?: string[];
}

interface FragileFile {
	path: string;
	fragility?: number;
	reason?: string;
	rollbackCount?: number;
}

interface FragileFilesResponse {
	files?: FragileFile[];
}

interface CoChangePair {
	source: string;
	target: string;
	confidence: number;
}

interface CoChangesResponse {
	pairs?: CoChangePair[];
}

interface IntelligenceWarning {
	severity: string;
	message: string;
}

interface WarningsResponse {
	warnings?: IntelligenceWarning[];
}

// =============================================================================
// JSON output contract (stable shape  -  hook scripts parse this)
// =============================================================================

export interface PulseJsonOutput {
	sessionId: string | null;
	llmHint: string;
	fragileFiles: Array<{
		path: string;
		fragility: number;
		rollbackCount: number;
		evidence?: string;
	}>;
	warnings: string[];
}

// =============================================================================
// Command factory
// =============================================================================

export function createPulseCommand(): Command {
	const cmd = new Command("pulse");
	cmd.description("Get a mid-session intelligence snapshot (advisory  -  read-only)")
		.option("--format <format>", "Output format: json or human", "human")
		.option("--focus <file>", "Narrow fragility output to a specific file path")
		.action(async (opts: { format?: string; focus?: string }) => {
			const format = opts.format === "json" ? "json" : "human";
			const focus = opts.focus;
			await runPulse({ format, focus });
		});
	return cmd;
}

// =============================================================================
// Implementation
// =============================================================================

interface RunPulseOptions {
	format: "json" | "human";
	focus?: string;
}

/**
 * Execute the pulse command. Exported for unit testing  -  callers may wire a
 * custom service factory via the internal hook in tests.
 *
 * @internal
 */
export async function runPulse(options: RunPulseOptions): Promise<void> {
	const workspace = process.cwd();
	const workspaceName = basename(workspace) || workspace;

	await withDaemonOptional("pulse", async (service) => {
		if (!service) {
			// Daemon unavailable is advisory  -  the hook must never block on this.
			// Emit exit-0 with empty JSON for machine consumers or a terse line for
			// humans. Log to stderr so CI can still diagnose connection issues.
			printDaemonUnavailable(options.format);
			return;
		}

		// Fan-out the same read-only service queries the MCP pulse tool uses. All
		// requests are wrapped in allSettled  -  a single missing endpoint must
		// never escalate to a non-zero exit from the hook's perspective.
		const [sessionResult, fragileResult, coChangesResult, warningsResult] = await Promise.allSettled([
			service.call<SessionCurrentResponse>("session/current", { workspacePath: workspace }),
			service.call<FragileFilesResponse>("intelligence/fragile-files", { workspace }),
			service.call<CoChangesResponse>("intelligence/co-changes", { workspace }),
			service.call<WarningsResponse>("intelligence/warnings", { workspace }),
		]);

		const rawSession = sessionResult.status === "fulfilled" ? sessionResult.value : null;
		const active = isActiveSession(rawSession);

		// No session from service  -  try local .vreko/session/current.json before giving up.
		if (!active || rawSession === null) {
			const localSession = await getCurrentSession(workspace);
			// Reject only if explicitly marked ended or active: false; undefined fields default to active.
			// active !== false already accepts undefined; state !== "ended" already accepts undefined.
			const isLocalActive =
				localSession !== null && localSession.active !== false && localSession.state !== "ended";
			if (isLocalActive) {
				// Daemon is cold but the local file confirms the session is live.
				// Compose a minimal pulse hint  -  no fragile/co-change data available without service.
				const durationMinutes = localSession.startedAt
					? Math.max(0, Math.round((Date.now() - new Date(localSession.startedAt).getTime()) / 60000))
					: 0;
				const hintParams: ComposeHintParams = {
					workspaceName,
					sessionId: localSession.id,
					durationMinutes,
					fragileFiles: [],
					coChanges: [],
					warnings: [],
				};
				const hint = composeHint(hintParams);
				emitOutput(options.format, {
					sessionId: localSession.id,
					llmHint: hint,
					fragileFiles: [],
					warnings: [],
				});
				return;
			}

			// Confirmed no active session  -  emit the advisory sentinel.
			const hintParams: ComposeHintParams = {
				workspaceName,
				sessionId: "unknown",
				durationMinutes: 0,
				fragileFiles: [],
				coChanges: [],
				warnings: [],
				noSession: true,
			};
			const hint = composeHint(hintParams);
			emitOutput(options.format, {
				sessionId: null,
				llmHint: hint,
				fragileFiles: [],
				warnings: [],
			});
			return;
		}

		const fragileFilesRaw = fragileResult.status === "fulfilled" ? (fragileResult.value?.files ?? []) : [];
		const coChangesRaw = coChangesResult.status === "fulfilled" ? (coChangesResult.value?.pairs ?? []) : [];
		const warningsRaw = warningsResult.status === "fulfilled" ? (warningsResult.value?.warnings ?? []) : [];

		// Apply --focus filter. Accept absolute, relative, or trailing-segment
		// matches  -  callers (hooks) pass whatever Claude Code hands them.
		const filteredFragile = options.focus
			? fragileFilesRaw.filter((f) => {
					const target = options.focus as string;
					return f.path === target || f.path.endsWith(target) || target.endsWith(f.path);
				})
			: fragileFilesRaw;

		// Map to ComposeHintParams shape (sorted-by-rollback inside composeHint).
		const fragileForHint = filteredFragile.map((f) => ({
			path: f.path,
			fragility: typeof f.fragility === "number" && Number.isFinite(f.fragility) ? f.fragility : 0,
			rollbackCount: f.rollbackCount ?? 0,
			evidence: f.reason,
		}));

		// Session touched files → "untouched partner" detection uses the same
		// logic the MCP pulse tool uses; replicated here because service
		// `intelligence/co-changes` returns raw pairs without touched-state.
		const touchedFiles = new Set(rawSession.touchedFiles ?? []);
		const coChangesForHint = coChangesRaw
			.filter((c) => touchedFiles.has(c.source) !== touchedFiles.has(c.target))
			.map((c) => ({
				primary: touchedFiles.has(c.source) ? c.source : c.target,
				partner: touchedFiles.has(c.source) ? c.target : c.source,
				partnerTouched: false,
			}));

		const warningsForHint = warningsRaw
			.filter((w) => w.severity !== "info")
			.map((w) => ({ message: w.message, severity: w.severity }));

		const durationMinutes = rawSession.startedAt
			? Math.max(0, Math.round((Date.now() - new Date(rawSession.startedAt).getTime()) / 60000))
			: 0;

		const noFilesTracked = (rawSession.touchedFiles?.length ?? 0) === 0;

		const hintParams: ComposeHintParams = noFilesTracked
			? {
					workspaceName,
					sessionId: rawSession.id ?? "unknown",
					durationMinutes,
					fragileFiles: [],
					coChanges: [],
					warnings: [],
					noFilesTracked: true,
				}
			: {
					workspaceName,
					sessionId: rawSession.id ?? "unknown",
					durationMinutes,
					fragileFiles: fragileForHint,
					coChanges: coChangesForHint,
					warnings: warningsForHint,
				};
		const llmHint = composeHint(hintParams);

		emitOutput(options.format, {
			sessionId: rawSession.id ?? null,
			llmHint,
			fragileFiles: fragileForHint,
			warnings: warningsForHint.map((w) => `[${w.severity}] ${w.message}`),
		});
	});
}

// =============================================================================
// Output helpers
// =============================================================================

function emitOutput(format: "json" | "human", payload: PulseJsonOutput): void {
	if (format === "json") {
		// eslint-disable-next-line no-console
		console.log(JSON.stringify(payload));
		return;
	}
	// Human format  -  print the hint plus a short structured footer.
	// eslint-disable-next-line no-console
	console.log(payload.llmHint);
	if (payload.fragileFiles.length > 0 || payload.warnings.length > 0) {
		// eslint-disable-next-line no-console
		console.log("");
		if (payload.fragileFiles.length > 0) {
			// eslint-disable-next-line no-console
			console.log("Fragile files in scope:");
			for (const f of payload.fragileFiles) {
				const evidence = f.evidence ? `  -  ${f.evidence}` : "";
				// eslint-disable-next-line no-console
				console.log(`  - ${f.path} (${f.rollbackCount} rollbacks)${evidence}`);
			}
		}
		if (payload.warnings.length > 0) {
			// eslint-disable-next-line no-console
			console.log("Warnings:");
			for (const w of payload.warnings) {
				// eslint-disable-next-line no-console
				console.log(`  - ${w}`);
			}
		}
	}
}

function printDaemonUnavailable(format: "json" | "human"): void {
	if (format === "json") {
		// Exit-0, empty JSON object  -  this is the hook's contract.
		// eslint-disable-next-line no-console
		console.log("{}");
	} else {
		// eslint-disable-next-line no-console
		console.log("vreko pulse: service unavailable  -  proceeding advisory");
	}
}

function isActiveSession(raw: SessionCurrentResponse | null): boolean {
	if (!raw) {
		return false;
	}
	if (raw.state === "active") {
		return true;
	}
	if (raw.active === true) {
		return true;
	}
	return false;
}
