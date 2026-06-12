/**
 * Status Command
 *
 * Implements vr status - Workspace health check.
 * Shows workspace vitals, session status, and detected issues.
 *
 * @see implementation_plan.md Section 1.2
 */

import { existsSync, readFileSync } from "node:fs";
import { access, constants, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { WorkspaceStatusOutput } from "@vreko/contracts/local-service";
import chalk from "chalk";
import { Command } from "commander";
import { cliState } from "../cli-state.js";
import { connectToDaemon } from "../services/service-client.js";
import {
	getCredentials,
	getCurrentSession,
	getProtectedFiles,
	getViolations,
	getWorkspaceConfig,
	getWorkspaceDir,
	getWorkspaceVitals,
	isLoggedIn,
	isVrekoInitialized,
} from "../services/vreko-dir";

// =============================================================================
// TYPES
// =============================================================================

interface Issue {
	id: string;
	severity: "warning" | "error";
	description: string;
	fix?: string;
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the status command
 */
export function createStatusCommand(): Command {
	return new Command("status")
		.description("Show workspace health and status")
		.option("--json", "Output as JSON")
		.option("--plain", "Machine-readable plain output (same as VREKO_PLAIN=1)")
		.option("-q, --quiet", "Suppress non-essential output")
		.action(async (options) => {
			const cwd = process.cwd();

			// Phase 21: TTY → TUI status panel
			// --plain or VREKO_PLAIN=1 suppresses the TUI (machine mode)
			if (options.plain) {
				process.env.VREKO_PLAIN = "1";
			}
			// --json or VREKO_JSON=1 routes output to JSON branch (mirrors --plain pattern)
			if (cliState.renderMode === "json") {
				process.env.VREKO_JSON = "1";
			}
			const { isInteractive } = await import("../ui/guards.js");
			if (isInteractive()) {
				const { launchTui } = await import("../ui/tui/index.js");
				await launchTui({ panel: "dashboard", statusFocus: true });
				return;
			}

			try {
				// Check if initialized
				if (!(await isVrekoInitialized(cwd))) {
					console.log(chalk.yellow("🦎 Vreko not initialized in this workspace"));
					console.log(chalk.gray("Run: vr init"));
					process.exit(1);
				}

				const status = await gatherStatus(cwd);
				const warnings = [...detectPluginIncompleteWarnings(cwd), ...detectIngressDegradedWarnings()];

				if (cliState.renderMode === "json") {
					// `warnings` is an additive CLI-surface field (R-SEAM-2). The
					// contract schema (WorkspaceStatusOutput) is frozen and strips
					// unknown keys on parse, so we attach warnings to the validated
					// payload after parsing rather than mutating the contract.
					const parsed = WorkspaceStatusOutput.parse(status as unknown);
					console.log(JSON.stringify({ ...parsed, warnings }, null, 2));
					return;
				}

				displayStatus(status, warnings);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red("Error:"), message);
				process.exit(1);
			}
		});
}

// =============================================================================
// STATUS GATHERING
// =============================================================================

interface WorkspaceStatus {
	initialized: boolean;
	loggedIn: boolean;
	user?: {
		email: string;
		tier: "free" | "pro";
	};
	workspace?: {
		id?: string;
		tier?: string;
		syncEnabled?: boolean;
	};
	vitals?: {
		framework?: string;
		packageManager?: string;
		typescript?: boolean;
		typescriptStrict?: boolean;
	};
	session?: {
		id: string;
		task?: string;
		startedAt: string;
		snapshotCount: number;
	};
	protection: {
		count: number;
		patterns: string[];
	};
	violations: {
		total: number;
		recent: number;
	};
	snapshots: {
		count: number;
		totalSize: string;
	};
	intelligence?: {
		overallRisk: string;
		confidence: number;
		topDriver: string;
		snapshotFrequency: string;
	};
	/**
	 * DAEMON-08: present when daemon topology service has detected the 5000-file cap.
	 * Absent (undefined) when no cap has been hit. Field shape is fixed by spec.
	 */
	topologyWarning?: {
		fileCap: number;
		reachedAt: string;
		workspacePath: string;
	};
	issues: Issue[];
}

/**
 * Gather all status information
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complex function, refactor deferred
async function gatherStatus(workspaceRoot: string): Promise<WorkspaceStatus> {
	const status: WorkspaceStatus = {
		initialized: true,
		loggedIn: false,
		protection: { count: 0, patterns: [] },
		violations: { total: 0, recent: 0 },
		snapshots: { count: 0, totalSize: "0 KB" },
		issues: [],
	};

	// Check login status (credentials are local, not service-managed)
	status.loggedIn = await isLoggedIn();
	if (status.loggedIn) {
		const creds = await getCredentials();
		if (creds) {
			status.user = {
				email: creds.email,
				tier: creds.tier,
			};
		}
	}

	// Try service-first for workspace data
	let daemonClient: Awaited<ReturnType<typeof connectToDaemon>> | null = null;
	try {
		daemonClient = await connectToDaemon();
	} catch {
		// Daemon unavailable - will fall back to direct file reads
	}

	// Get workspace config - use direct file reads (service context/get is for AI context, not workspace config)
	try {
		const config = await getWorkspaceConfig(workspaceRoot);
		if (config) {
			status.workspace = {
				id: config.workspaceId,
				tier: config.tier,
				syncEnabled: config.syncEnabled,
			};
		}
	} catch {
		// Config unavailable
	}

	// Get vitals
	try {
		if (daemonClient) {
			const vitals = await daemonClient.session.vitals({ workspacePath: workspaceRoot });
			if (vitals) {
				status.vitals = {
					framework: vitals.framework,
					packageManager: vitals.packageManager,
					typescript: vitals.typescript?.enabled,
					typescriptStrict: vitals.typescript?.strict,
				};
			}
		} else {
			const vitals = await getWorkspaceVitals(workspaceRoot);
			if (vitals) {
				status.vitals = {
					framework: vitals.framework,
					packageManager: vitals.packageManager,
					typescript: vitals.typescript?.enabled,
					typescriptStrict: vitals.typescript?.strict,
				};
			}
		}
	} catch {
		// Fallback to direct read
		const vitals = await getWorkspaceVitals(workspaceRoot);
		if (vitals) {
			status.vitals = {
				framework: vitals.framework,
				packageManager: vitals.packageManager,
				typescript: vitals.typescript?.enabled,
				typescriptStrict: vitals.typescript?.strict,
			};
		}
	}

	// Get session
	try {
		if (daemonClient) {
			const sessionResp = await daemonClient.session.current({ workspacePath: workspaceRoot });
			const sessionData = sessionResp;
			if (sessionData) {
				status.session = {
					id: sessionData.id,
					startedAt: sessionData.startedAt,
					snapshotCount: sessionData.snapshotIds?.length ?? 0,
				};
			}
		} else {
			const session = await getCurrentSession(workspaceRoot);
			if (session) {
				status.session = {
					id: session.id,
					task: session.task,
					startedAt: session.startedAt,
					snapshotCount: session.snapshotCount,
				};
			}
		}
	} catch {
		// Fallback to direct read
		const session = await getCurrentSession(workspaceRoot);
		if (session) {
			status.session = {
				id: session.id,
				task: session.task,
				startedAt: session.startedAt,
				snapshotCount: session.snapshotCount,
			};
		}
	}

	// Get protection
	try {
		if (daemonClient) {
			const protectedFiles = await daemonClient.protection.listDaemon({ workspace: workspaceRoot });
			status.protection = {
				count: protectedFiles?.length ?? 0,
				patterns: (protectedFiles ?? []).slice(0, 5).map((f: { pattern: string }) => f.pattern),
			};
		} else {
			const protectedFiles = await getProtectedFiles(workspaceRoot);
			status.protection = {
				count: protectedFiles.length,
				patterns: protectedFiles.slice(0, 5).map((f) => f.pattern),
			};
		}
	} catch {
		// Fallback to direct read
		const protectedFiles = await getProtectedFiles(workspaceRoot);
		status.protection = {
			count: protectedFiles.length,
			patterns: protectedFiles.slice(0, 5).map((f) => f.pattern),
		};
	}

	// Get violations
	try {
		if (daemonClient) {
			const violationResp = await daemonClient.violation.list({ workspace: workspaceRoot });
			const violationList = violationResp?.violations ?? [];
			const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
			status.violations = {
				total: violationList.length,
				recent: (violationList as Array<{ date: string }>).filter((v) => new Date(v.date) > oneWeekAgo).length,
			};
		} else {
			const violations = await getViolations(workspaceRoot);
			const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
			status.violations = {
				total: violations.length,
				recent: violations.filter((v) => new Date(v.date) > oneWeekAgo).length,
			};
		}
	} catch {
		// Fallback to direct read
		const violations = await getViolations(workspaceRoot);
		const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
		status.violations = {
			total: violations.length,
			recent: violations.filter((v) => new Date(v.date) > oneWeekAgo).length,
		};
	}

	// Get snapshots (always from disk - snapshot directory scanning)
	const snapshotInfo = await getSnapshotInfo(workspaceRoot);
	status.snapshots = snapshotInfo;

	// Get intelligence (if service is available)
	try {
		// biome-ignore lint/suspicious/noExplicitAny: service client shape is dynamic at runtime
		if (daemonClient && (daemonClient as any).workspace?.status) {
			// biome-ignore lint/suspicious/noExplicitAny: service client shape is dynamic at runtime
			const wkStatus = await (daemonClient as any).workspace.status({ workspace: workspaceRoot });
			const profile = wkStatus?.profile;
			if (profile) {
				status.intelligence = {
					overallRisk: profile.overallRisk,
					confidence: profile.confidence,
					topDriver: profile.topDrivers?.[0]?.label || "N/A",
					snapshotFrequency: profile.recommendedConfig?.snapshotFrequency || "balanced",
				};
			}
		}
	} catch {
		// Intelligence unavailable
	}

	// DAEMON-08: surface topology cap warning when the daemon reports it.
	// Uses the same dynamic-method pattern as workspace.status (above) - no full
	// local-service-client topology module is added in Phase 30 (out of scope).
	try {
		// biome-ignore lint/suspicious/noExplicitAny: service client shape is dynamic at runtime
		if (daemonClient && (daemonClient as any).topology?.status) {
			// biome-ignore lint/suspicious/noExplicitAny: service client shape is dynamic at runtime
			const topStatus = await (daemonClient as any).topology.status({ workspace: workspaceRoot });
			if (topStatus?.topologyWarning) {
				status.topologyWarning = topStatus.topologyWarning;
			}
		}
	} catch {
		// Topology unavailable - not blocking (matches existing degradation pattern in this function)
	}

	// Detect issues
	status.issues = await detectIssues(workspaceRoot, status);

	return status;
}

/**
 * Get snapshot information
 */
async function getSnapshotInfo(workspaceRoot: string): Promise<{ count: number; totalSize: string }> {
	const snapshotsDir = join(getWorkspaceDir(workspaceRoot), "snapshots");

	try {
		await access(snapshotsDir, constants.F_OK);
		const entries = await readdir(snapshotsDir, { withFileTypes: true });
		const snapDirs = entries.filter((e) => e.isDirectory());

		// Calculate total size
		let totalBytes = 0;
		for (const dir of snapDirs) {
			const stats = await getDirectorySize(join(snapshotsDir, dir.name));
			totalBytes += stats;
		}

		return {
			count: snapDirs.length,
			totalSize: formatBytes(totalBytes),
		};
	} catch {
		return { count: 0, totalSize: "0 KB" };
	}
}

/**
 * Get directory size recursively
 */
async function getDirectorySize(dirPath: string): Promise<number> {
	let size = 0;

	try {
		const entries = await readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dirPath, entry.name);
			if (entry.isDirectory()) {
				size += await getDirectorySize(fullPath);
			} else {
				const stats = await stat(fullPath);
				size += stats.size;
			}
		}
	} catch {
		// Ignore errors
	}

	return size;
}

/**
 * Detect workspace issues
 */
async function detectIssues(workspaceRoot: string, status: WorkspaceStatus): Promise<Issue[]> {
	const issues: Issue[] = [];

	// Check if logged in
	if (!status.loggedIn) {
		issues.push({
			id: "not-logged-in",
			severity: "warning",
			description: "Not logged in - some features are unavailable",
			fix: "vr login",
		});
	}

	// Check if protected files are set up
	if (status.protection.count === 0) {
		issues.push({
			id: "no-protection",
			severity: "warning",
			description: "No files are protected",
			fix: "vr protect env && vr protect config",
		});
	}

	// Check for .gitignore entry
	const gitignorePath = join(workspaceRoot, ".gitignore");
	try {
		const { readFile } = await import("node:fs/promises");
		const content = await readFile(gitignorePath, "utf-8");
		if (!content.includes(".vreko")) {
			issues.push({
				id: "missing-gitignore",
				severity: "warning",
				description: ".vreko not in .gitignore",
				fix: "Add .vreko/snapshots/ to .gitignore",
			});
		}
	} catch {
		// No .gitignore, not a critical issue
	}

	// Check for stale session
	if (status.session) {
		const sessionStart = new Date(status.session.startedAt);
		const hoursSinceStart = (Date.now() - sessionStart.getTime()) / (1000 * 60 * 60);
		if (hoursSinceStart > 24) {
			issues.push({
				id: "stale-session",
				severity: "warning",
				description: `Session started ${Math.floor(hoursSinceStart)}h ago`,
				fix: "vr session end",
			});
		}
	}

	// Check for high violation count
	if (status.violations.recent > 5) {
		issues.push({
			id: "high-violations",
			severity: "warning",
			description: `${status.violations.recent} violations in the last week`,
			fix: "vr patterns list",
		});
	}

	return issues;
}

// =============================================================================
// PLUGIN-INCOMPLETE DETECTION (R-SEAM-2)
// =============================================================================

/**
 * Marker substring that the spec's R-SEAM-2 gate greps for. The warning must
 * direct the user to run `vr init`, so the literal string is load-bearing.
 */
const VR_INIT_WARNING =
	"Vreko MCP server is registered but the PostToolUse ingress hook is missing - per-edit activity will not reach the daemon. Run `vr init` to complete the install.";

interface ParsedSettings {
	hooks?: { PostToolUse?: Array<{ hooks?: Array<{ command?: string }> }> };
	mcpServers?: Record<string, unknown>;
}

function safeReadJson(path: string): Record<string, unknown> | null {
	if (!existsSync(path)) {
		return null;
	}
	try {
		return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
	} catch (err) {
		// Malformed config - surface it, don't swallow (AP-3).
		console.error(`[vr status] Failed to parse ${path}:`, err);
		return null;
	}
}

/**
 * True when an `mcpServers` map carries any Vreko entry (`vreko` or `vreko-*`).
 */
function hasVrekoMcpServer(config: Record<string, unknown> | null): boolean {
	if (!config || typeof config.mcpServers !== "object" || config.mcpServers === null) {
		return false;
	}
	return Object.keys(config.mcpServers as Record<string, unknown>).some((key) => key.startsWith("vreko"));
}

/**
 * True when `.claude/settings.json` carries a PostToolUse hook referencing the
 * Vreko file-notify ingress script.
 */
function hasVrekoPostToolUseHook(settings: Record<string, unknown> | null): boolean {
	if (!settings) {
		return false;
	}
	const postToolUse = (settings as ParsedSettings).hooks?.PostToolUse;
	if (!Array.isArray(postToolUse)) {
		return false;
	}
	return postToolUse.some((entry) =>
		(entry?.hooks ?? []).some((h) => typeof h?.command === "string" && h.command.includes("vreko-file-notify")),
	);
}

/**
 * R-SEAM-2: detect the known-incomplete plugin-only install state.
 *
 * The Claude Code plugin registers the `vreko` MCP server but installs no
 * PostToolUse per-edit hook. A workspace in that state has a starved
 * intelligence pipeline. `vr init` is the only action that wires both surfaces,
 * so a workspace with the MCP server registered but no PostToolUse hook must
 * warn - silent incompleteness is a defect (spec §0 item 1, §2.2).
 *
 * Detection reads real on-disk config, not mocked state:
 *  - MCP registration: a `vreko*` entry under `mcpServers` in `.mcp.json`
 *    (Claude Code project scope) or `.claude/settings.json`.
 *  - PostToolUse hook: a `vreko-file-notify` command in `.claude/settings.json`.
 */
function detectPluginIncompleteWarnings(workspaceRoot: string): string[] {
	const warnings: string[] = [];

	const mcpJson = safeReadJson(join(workspaceRoot, ".mcp.json"));
	const settings = safeReadJson(join(workspaceRoot, ".claude", "settings.json"));

	const mcpRegistered = hasVrekoMcpServer(mcpJson) || hasVrekoMcpServer(settings);
	const postHookPresent = hasVrekoPostToolUseHook(settings);

	if (mcpRegistered && !postHookPresent) {
		warnings.push(VR_INIT_WARNING);
	}

	return warnings;
}

// =============================================================================
// INGRESS-DEGRADED DETECTION (R-SEAM-4 / R-FIX-3)
// =============================================================================

/**
 * Breadcrumb written by `posttooluse-file-notify.sh` when per-edit ingress
 * degrades (missing `jq`/`socat`/`nc`, or an unreachable daemon socket). It
 * lives under the global config dir (`~/.vreko/daemon/ingress-degraded`), not
 * the workspace, because the hook fires across all workspaces of the invoking
 * user. The literal "ingress" substring is load-bearing - the R-SEAM-4 gate
 * greps `.warnings[]? | select(. | contains("ingress"))`.
 */
function ingressDegradedMarkerPath(): string {
	return join(homedir(), ".vreko", "daemon", "ingress-degraded");
}

/**
 * R-FIX-3: surface the per-edit ingress degraded breadcrumb in `vr status`.
 *
 * When `posttooluse-file-notify.sh` cannot reach the daemon (missing dependency
 * or dead socket), it leaves a marker instead of failing silently - the
 * phantom-action failure mode this platform exists to detect. `vr status` reads
 * that marker so the degraded ingress is visible rather than silent (spec §2.4).
 */
function detectIngressDegradedWarnings(): string[] {
	const markerPath = ingressDegradedMarkerPath();
	if (!existsSync(markerPath)) {
		return [];
	}

	// The marker is a single line: "ingress-degraded reason=<r> at=<ts>".
	let reason = "unknown";
	let at = "";
	try {
		const contents = readFileSync(markerPath, "utf-8").trim();
		const reasonMatch = contents.match(/reason=(\S+)/);
		if (reasonMatch) {
			reason = reasonMatch[1];
		}
		const atMatch = contents.match(/at=(\S+)/);
		if (atMatch) {
			at = atMatch[1];
		}
	} catch (err) {
		// Unreadable marker - still surface that ingress degraded (AP-3: no silent swallow).
		console.error(`[vr status] Failed to read ${markerPath}:`, err);
	}

	const when = at ? ` (last seen ${at})` : "";
	return [
		`Per-edit ingress to the daemon is degraded${when}: ${reason}. ` +
			"Agent edits may not be reaching Vreko. Ensure `jq` and `socat` (or `nc`) are installed and the daemon is running (`vr start`).",
	];
}

// =============================================================================
// DISPLAY
// =============================================================================

/**
 * Display status in a nice format
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complex function, refactor deferred
function displayStatus(status: WorkspaceStatus, warnings: string[] = []): void {
	console.log(chalk.cyan.bold("Workspace Status"));
	console.log(chalk.gray("═".repeat(40)));
	console.log();

	// User status
	if (status.user) {
		console.log(
			chalk.green("✓"),
			"Logged in as",
			chalk.cyan(status.user.email),
			status.user.tier === "pro" ? chalk.magenta("Pro ⭐") : "",
		);
	} else {
		console.log(chalk.yellow("○"), "Not logged in");
	}

	// Workspace info
	if (status.workspace?.id) {
		console.log(
			chalk.green("✓"),
			"Workspace:",
			chalk.gray(status.workspace.id.substring(0, 8)),
			status.workspace.syncEnabled ? chalk.green("(synced)") : chalk.gray("(local)"),
		);
	}
	console.log();

	// Vitals
	if (status.vitals) {
		console.log(chalk.cyan("Stack:"));
		if (status.vitals.framework) {
			console.log("  •", status.vitals.framework);
		}
		if (status.vitals.packageManager) {
			console.log("  •", status.vitals.packageManager);
		}
		if (status.vitals.typescript) {
			console.log("  •", "TypeScript", status.vitals.typescriptStrict ? chalk.green("(strict)") : "");
		}
		console.log();
	}

	// Session
	if (status.session) {
		console.log(chalk.cyan("Active Session:"));
		console.log("  ID:", chalk.gray(status.session.id.substring(0, 8)));
		if (status.session.task) {
			console.log("  Task:", status.session.task);
		}
		console.log("  Snapshots:", status.session.snapshotCount);
		console.log();
	}

	// Intelligence
	if (status.intelligence) {
		console.log(chalk.cyan("Intelligence:"));
		console.log("  Risk:", status.intelligence.overallRisk);
		console.log("  Top driver:", status.intelligence.topDriver);
		console.log();
	}

	// Stats
	console.log(chalk.cyan("Stats:"));
	console.log("  Protected files:", status.protection.count);
	console.log("  Snapshots:", status.snapshots.count, chalk.gray(`(${status.snapshots.totalSize})`));
	console.log("  Violations:", status.violations.total, chalk.gray(`(${status.violations.recent} this week)`));
	console.log();

	// Issues
	if (status.issues.length > 0) {
		console.log(chalk.yellow("Issues:"));
		for (const issue of status.issues) {
			const icon = issue.severity === "error" ? chalk.red("✗") : chalk.yellow("⚠");
			console.log(` ${icon}`, issue.description);
			if (issue.fix) {
				console.log(chalk.gray(`    Fix: ${issue.fix}`));
			}
		}
	} else {
		console.log(chalk.green("✓"), "No issues detected");
	}

	// Plugin-incomplete warnings (R-SEAM-2) - surfaced distinctly from issues so
	// the "run vr init" remediation is not lost in the issue list.
	if (warnings.length > 0) {
		console.log(`\n${chalk.yellow("Warnings:")}`);
		for (const warning of warnings) {
			console.log(` ${chalk.yellow("⚠")}`, warning);
		}
	}
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) {
		return "0 KB";
	}

	const units = ["B", "KB", "MB", "GB"];
	const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const size = bytes / 1024 ** exp;

	return `${size.toFixed(exp > 0 ? 1 : 0)} ${units[exp]}`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { gatherStatus, detectIssues, formatBytes, detectPluginIncompleteWarnings, detectIngressDegradedWarnings };
