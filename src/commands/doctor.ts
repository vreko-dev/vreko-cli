/**
 * Doctor Command
 *
 * Full ecosystem diagnostics. Checks CLI, service, workspace,
 * knowledge store, MCP, network, and extension health.
 *
 * Every failing check includes an actionable fix.
 * --json output enables CI health gates.
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { arch, homedir, platform } from "node:os";
import { join } from "node:path";
import { getWorkspaceSessionManager } from "@vreko/auth/workspace";
import { getDefaultSocketPath } from "@vreko/local-service-client";
import {
	detectAIClients,
	getServerKey,
	isCommandExecutable,
	readClientConfig,
	validateClientConfig,
} from "@vreko/mcp-config";
import chalk from "chalk";
import { Command } from "commander";
import { getServicePidPath } from "../service-adapter/local-service-adapter";
import { connectToDaemon, getDaemonClient, isDaemonConnected } from "../services/service-client";
import { findWorkspaceRoot } from "../utils/workspace";

// =============================================================================
// TYPES
// =============================================================================

export type CheckStatus = "pass" | "warn" | "fail" | "skip";

export interface DoctorCheck {
	id: string;
	group: string;
	label: string;
	status: CheckStatus;
	detail?: string;
	fix?: string;
	fixCommand?: string;
}

export interface DoctorJsonResult {
	success: boolean;
	version: string;
	timestamp: string;
	workspace: string | null;
	platform: {
		os: string;
		arch: string;
		nodeVersion: string;
		shell: string;
	};
	summary: { total: number; pass: number; warn: number; fail: number; skip: number };
	checks: DoctorCheck[];
}

// Version resolution
declare const __CLI_VERSION__: string | undefined;
const cliVersion =
	typeof __CLI_VERSION__ !== "undefined"
		? __CLI_VERSION__
		: (() => {
				try {
					return (require("../../package.json") as { version: string }).version ?? "0.0.0";
				} catch {
					return "0.0.0-dev";
				}
			})();

type CheckGroup = "cli" | "service" | "workspace" | "knowledge" | "mcp" | "network" | "extension" | "auth";

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

export function createDoctorCommand(): Command {
	return new Command("doctor")
		.description("Diagnose Vreko installation and ecosystem health")
		.option("--json", "Output structured JSON result")
		.option("--local", "Skip network checks")
		.option(
			"--check <system>",
			"Check specific subsystem (cli|service|workspace|knowledge|mcp|network|auth|extension)",
		)
		.option("--fix", "Attempt automatic repair for known issues")
		.option("--sync-config", "Trigger immediate fingerprint config sync from cloud")
		.option("-q, --quiet", "Only show failures")
		.option("-v, --verbose", "Show all check details")
		.action(async (options) => {
			// Handle --sync-config as a special action
			if (options.syncConfig) {
				await handleSyncConfig();
				return;
			}

			const result = await runDoctor(options);
			if (options.json) {
				console.log(JSON.stringify(result, null, 2));
			}
			process.exit(result.success ? 0 : 1);
		});
}

// =============================================================================
// CORE DOCTOR LOGIC
// =============================================================================

async function runDoctor(options: {
	json?: boolean;
	local?: boolean;
	check?: string;
	fix?: boolean;
	quiet?: boolean;
	verbose?: boolean;
}): Promise<DoctorJsonResult> {
	const jsonMode = !!options.json;
	const quiet = !!options.quiet;
	const onlyGroup = options.check as CheckGroup | undefined;

	const checks: DoctorCheck[] = [];
	const workspacePath = findWorkspaceRoot(process.cwd());

	if (!jsonMode) {
		console.log(chalk.cyan(`  🦎 Vreko Doctor v${cliVersion}`));
		console.log(chalk.gray(`  Platform: ${platformLabel()}, Node ${process.version}`));
		console.log();
	}

	// Run check groups
	const groups: [CheckGroup, () => Promise<DoctorCheck[]>][] = [
		["cli", () => checkCLI()],
		["service", () => checkDaemon()],
		["workspace", () => checkWorkspace(workspacePath)],
		["knowledge", () => checkKnowledgeStore(workspacePath)],
		["mcp", () => checkMCP()],
		["network", () => (options.local ? skipGroup("network", "Skipped (--local)") : checkNetwork())],
		["auth", () => checkAuth()],
		["extension", () => checkExtension()],
	];

	for (const [group, runner] of groups) {
		if (onlyGroup && onlyGroup !== group) {
			continue;
		}

		const groupChecks = await runner();
		checks.push(...groupChecks);

		if (!jsonMode) {
			printGroup(group, groupChecks, quiet);
		}
	}

	// Auto-fix pass
	if (options.fix) {
		const fixable = checks.filter((c) => c.status === "fail" && c.fixCommand);
		if (fixable.length > 0 && !jsonMode) {
			console.log(chalk.cyan("  Attempting fixes..."));
			for (const check of fixable) {
				try {
					execSync(check.fixCommand as string, { stdio: "pipe", timeout: 15000 });
					check.status = "pass";
					check.detail = `Fixed: ${check.fixCommand}`;
					console.log(chalk.green(`  ✔ Fixed: ${check.label}`));
				} catch {
					console.log(chalk.red(`  ✖ Could not fix: ${check.label}`));
				}
			}
			console.log();
		}
	}

	// Summary
	const summary = {
		total: checks.length,
		pass: checks.filter((c) => c.status === "pass").length,
		warn: checks.filter((c) => c.status === "warn").length,
		fail: checks.filter((c) => c.status === "fail").length,
		skip: checks.filter((c) => c.status === "skip").length,
	};

	const success = summary.fail === 0;

	if (!jsonMode) {
		console.log(
			chalk.gray(
				`  Summary: ${summary.pass} passed, ${summary.warn} warning${summary.warn !== 1 ? "s" : ""}, ${summary.fail} failure${summary.fail !== 1 ? "s" : ""}`,
			),
		);
		if (success) {
			console.log(chalk.green("  ✔ 🦎 Vreko is healthy"));
		} else {
			console.log(chalk.red("  ✖ 🦎 Vreko has issues  -  run the suggested fixes above"));
		}
		console.log();
	}

	return {
		success,
		version: cliVersion,
		timestamp: new Date().toISOString(),
		workspace: workspacePath,
		platform: {
			os: platform(),
			arch: arch(),
			nodeVersion: process.version,
			shell: process.env.SHELL || process.env.ComSpec || "unknown",
		},
		summary,
		checks,
	};
}

// =============================================================================
// CHECK GROUP 1: CLI
// =============================================================================

async function checkCLI(): Promise<DoctorCheck[]> {
	const checks: DoctorCheck[] = [];

	// CLI binary location
	try {
		const which = execSync("which vreko || where vreko", {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
		checks.push({
			id: "cli.binary",
			group: "cli",
			label: "CLI binary found",
			status: "pass",
			detail: `${which} (v${cliVersion})`,
		});
	} catch {
		checks.push({
			id: "cli.binary",
			group: "cli",
			label: "CLI binary found",
			status: "pass", // We're running, so it exists
			detail: `v${cliVersion}`,
		});
	}

	// Node.js version
	const nodeVersion = process.versions.node;
	const major = Number.parseInt(nodeVersion.split(".")[0], 10);
	if (major >= 18) {
		checks.push({
			id: "cli.node",
			group: "cli",
			label: "Node.js version compatible",
			status: "pass",
			detail: `v${nodeVersion} (>=18 required)`,
		});
	} else {
		checks.push({
			id: "cli.node",
			group: "cli",
			label: "Node.js version compatible",
			status: "fail",
			detail: `v${nodeVersion} (>=18 required)`,
			fix: "Upgrade Node.js to v18 or later: https://nodejs.org",
		});
	}

	// Global config
	const globalConfigPath = join(homedir(), ".vreko", "config.json");
	if (existsSync(globalConfigPath)) {
		try {
			JSON.parse(readFileSync(globalConfigPath, "utf-8"));
			checks.push({
				id: "cli.globalConfig",
				group: "cli",
				label: "Global config valid",
				status: "pass",
				detail: globalConfigPath,
			});
		} catch {
			checks.push({
				id: "cli.globalConfig",
				group: "cli",
				label: "Global config valid",
				status: "fail",
				detail: `${globalConfigPath}  -  invalid JSON`,
				fix: "Delete and reinitialize: rm ~/.vreko/config.json && vreko init",
				fixCommand: `rm "${globalConfigPath}"`,
			});
		}
	} else {
		checks.push({
			id: "cli.globalConfig",
			group: "cli",
			label: "Global config",
			status: "warn",
			detail: "No global config (using defaults)",
		});
	}

	return checks;
}

// =============================================================================
// CHECK GROUP 2: DAEMON
// =============================================================================

async function checkDaemon(): Promise<DoctorCheck[]> {
	const checks: DoctorCheck[] = [];
	const pidPath = getServicePidPath();
	const sockPath = process.env.VREKO_DAEMON_SOCKET ?? getDefaultSocketPath();

	// PID file
	let pid: string | null = null;
	if (existsSync(pidPath)) {
		pid = readFileSync(pidPath, "utf-8").trim();
		// Check if process is actually running
		const alive = isProcessAlive(Number.parseInt(pid, 10));
		if (alive) {
			checks.push({
				id: "service.running",
				group: "service",
				label: "Service process running",
				status: "pass",
				detail: `pid ${pid}`,
			});
		} else {
			checks.push({
				id: "service.running",
				group: "service",
				label: "Service process running",
				status: "fail",
				detail: `PID ${pid} in pidfile but process not found (stale PID)`,
				fix: "Start the service: vreko service start --detach",
				fixCommand: "vreko service start --detach",
			});
			// Early return  -  no point checking IPC if service is dead
			return checks;
		}
	} else {
		checks.push({
			id: "service.running",
			group: "service",
			label: "Service process running",
			status: "fail",
			detail: "No PID file found",
			fix: "Start the service: vreko service start --detach",
			fixCommand: "vreko service start --detach",
		});
		return checks;
	}

	// Socket exists
	if (existsSync(sockPath)) {
		checks.push({
			id: "service.socket",
			group: "service",
			label: "Socket connectable",
			status: "pass",
			detail: sockPath,
		});
	} else {
		checks.push({
			id: "service.socket",
			group: "service",
			label: "Socket connectable",
			status: "fail",
			detail: `${sockPath} does not exist`,
			fix: "Restart the service: vreko service restart",
			fixCommand: "vreko service restart",
		});
		return checks;
	}

	// IPC handshake
	try {
		const client = await connectToDaemon();
		const start = Date.now();
		const ping = await client.daemon.ping();
		const latency = Date.now() - start;

		checks.push({
			id: "service.ipc",
			group: "service",
			label: "IPC handshake",
			status: latency < 100 ? "pass" : "warn",
			detail: `v${ping?.version ?? "?"}, ${latency}ms${latency >= 100 ? " (>100ms budget)" : ""}`,
		});

		// Daemon version compatibility
		if (ping?.version && ping.version !== cliVersion) {
			// Only warn on minor mismatch, fail on major
			const daemonMajor = ping.version.split(".")[0];
			const cliMajor = cliVersion.split(".")[0];
			if (daemonMajor !== cliMajor) {
				checks.push({
					id: "service.version",
					group: "service",
					label: "Service version compatible",
					status: "fail",
					detail: `Service v${ping.version}, CLI v${cliVersion} (major mismatch)`,
					fix: "Restart service to pick up new version: vreko service restart",
					fixCommand: "vreko service restart",
				});
			} else {
				checks.push({
					id: "service.version",
					group: "service",
					label: "Service version compatible",
					status: "warn",
					detail: `Service v${ping.version}, CLI v${cliVersion} (minor mismatch)`,
					fix: "Consider restarting: vreko service restart",
				});
			}
		}

		// Daemon status (workspaces, clients, uptime)
		try {
			const status = await client.daemon.status();
			const uptime = status?.uptime ? formatUptime(status.uptime) : "unknown";
			const workspaces = status?.workspaces ?? "?";
			const clients = status?.connections ?? "?";
			checks.push({
				id: "service.status",
				group: "service",
				label: "Service status",
				status: "pass",
				detail: `${workspaces} workspace(s), ${clients} client(s), uptime ${uptime}`,
			});
		} catch {
			// service/status not implemented or errored  -  non-fatal
			checks.push({
				id: "service.status",
				group: "service",
				label: "Service status",
				status: "warn",
				detail: "service/status endpoint unavailable",
			});
		}
	} catch (error) {
		checks.push({
			id: "service.ipc",
			group: "service",
			label: "IPC handshake",
			status: "fail",
			detail: error instanceof Error ? error.message : "Connection refused",
			fix: "Restart the service: vreko service restart",
			fixCommand: "vreko service restart",
		});
	}

	// Supervisor installed/active check
	checks.push(...checkDaemonSupervisor());

	return checks;
}

/** Check OS supervisor installation and active state (launchd/systemd). */
function checkDaemonSupervisor(): DoctorCheck[] {
	const result: DoctorCheck[] = [];
	const os = platform();
	if (os === "darwin") {
		result.push(...checkLaunchd());
	} else if (os === "linux") {
		result.push(...checkSystemd());
	}
	// Windows: supervisor not yet supported, skip silently
	return result;
}

function checkLaunchd(): DoctorCheck[] {
	const plistPath = join(homedir(), "Library", "LaunchAgents", "dev.vreko.daemon.plist");
	if (!existsSync(plistPath)) {
		return [
			{
				id: "service.supervisor",
				group: "service",
				label: "Supervisor (launchd) installed",
				status: "warn",
				detail: "Supervisor plist not installed  -  daemon will not auto-restart on crash",
				fix: "Install supervisor: vreko service install",
				fixCommand: "vreko service install",
			},
		];
	}
	try {
		const launchctlOut = execSync("launchctl list dev.vreko.daemon 2>/dev/null", {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
		const isLoaded = launchctlOut.length > 0;
		return [
			{
				id: "service.supervisor",
				group: "service",
				label: "Supervisor (launchd) installed",
				status: isLoaded ? "pass" : "warn",
				detail: isLoaded ? "Plist loaded by launchd" : "Plist present but not loaded by launchd",
				...(isLoaded ? {} : { fix: "Load it: vreko service start", fixCommand: "vreko service start" }),
			},
		];
	} catch {
		return [
			{
				id: "service.supervisor",
				group: "service",
				label: "Supervisor (launchd) installed",
				status: "warn",
				detail: "Plist present but launchctl query failed",
			},
		];
	}
}

function checkSystemd(): DoctorCheck[] {
	const unitPath = join(homedir(), ".config", "systemd", "user", "vrekod.service");
	if (!existsSync(unitPath)) {
		return [
			{
				id: "service.supervisor",
				group: "service",
				label: "Supervisor (systemd) installed",
				status: "warn",
				detail: "Supervisor unit not installed  -  daemon will not auto-restart on crash",
				fix: "Install supervisor: vreko service install",
				fixCommand: "vreko service install",
			},
		];
	}
	try {
		const systemctlOut = execSync("systemctl --user is-active vrekod 2>/dev/null", {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
		const isActive = systemctlOut === "active";
		return [
			{
				id: "service.supervisor",
				group: "service",
				label: "Supervisor (systemd) installed",
				status: isActive ? "pass" : "warn",
				detail: isActive ? "Unit active" : `Unit present but status: ${systemctlOut}`,
				...(isActive ? {} : { fix: "Start it: vreko service start", fixCommand: "vreko service start" }),
			},
		];
	} catch {
		return [
			{
				id: "service.supervisor",
				group: "service",
				label: "Supervisor (systemd) installed",
				status: "warn",
				detail: "Unit present but systemctl query failed",
			},
		];
	}
}

// =============================================================================
// CHECK GROUP 3: WORKSPACE
// =============================================================================

async function checkWorkspace(workspacePath: string | null): Promise<DoctorCheck[]> {
	const checks: DoctorCheck[] = [];

	if (!workspacePath) {
		checks.push({
			id: "workspace.detected",
			group: "workspace",
			label: "Workspace detected",
			status: "warn",
			detail: "Not in a Vreko workspace (no .vreko/ found in parents)",
			fix: "Run: vreko init",
		});
		return checks;
	}

	// .vreko/ directory
	const vrekoDir = join(workspacePath, ".vreko");
	if (existsSync(vrekoDir)) {
		checks.push({
			id: "workspace.directory",
			group: "workspace",
			label: ".vreko/ directory exists",
			status: "pass",
		});
	} else {
		checks.push({
			id: "workspace.directory",
			group: "workspace",
			label: ".vreko/ directory exists",
			status: "fail",
			fix: "Run: vreko init",
			fixCommand: `vreko init "${workspacePath}" --yes`,
		});
		return checks;
	}

	// config.json
	const configPath = join(vrekoDir, "config.json");
	if (existsSync(configPath)) {
		try {
			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			const created = config.createdAt
				? `created ${formatAge(Date.now() - new Date(config.createdAt).getTime())} ago`
				: "";
			checks.push({
				id: "workspace.config",
				group: "workspace",
				label: "config.json valid",
				status: "pass",
				detail: created,
			});
		} catch {
			checks.push({
				id: "workspace.config",
				group: "workspace",
				label: "config.json valid",
				status: "fail",
				detail: "Invalid JSON",
				fix: "Reinitialize: vreko init --force",
				fixCommand: `vreko init "${workspacePath}" --force --yes`,
			});
		}
	} else {
		checks.push({
			id: "workspace.config",
			group: "workspace",
			label: "config.json exists",
			status: "fail",
			fix: "Run: vreko init",
			fixCommand: `vreko init "${workspacePath}" --yes`,
		});
	}

	// Daemon workspace registration
	try {
		if (isDaemonConnected()) {
			const client = getDaemonClient();
			await client.session.current({ workspacePath: workspacePath });
			checks.push({
				id: "workspace.registered",
				group: "workspace",
				label: "Workspace registered with service",
				status: "pass",
			});
		} else {
			checks.push({
				id: "workspace.registered",
				group: "workspace",
				label: "Workspace registered with service",
				status: "warn",
				detail: "Could not verify (service may not be running)",
			});
		}
	} catch {
		checks.push({
			id: "workspace.registered",
			group: "workspace",
			label: "Workspace registered with service",
			status: "warn",
			detail: "Could not verify (service may not be running)",
		});
	}

	// File watcher
	try {
		if (isDaemonConnected()) {
			const client = getDaemonClient();
			// Subscribe to workspace - if it works, watcher is active
			await client.watch.subscribe({ workspace: workspacePath });
			checks.push({
				id: "workspace.watcher",
				group: "workspace",
				label: "File watcher active",
				status: "pass",
			});
		} else {
			checks.push({
				id: "workspace.watcher",
				group: "workspace",
				label: "File watcher",
				status: "warn",
				detail: "Could not verify file watcher status (service not running)",
			});
		}
	} catch {
		checks.push({
			id: "workspace.watcher",
			group: "workspace",
			label: "File watcher",
			status: "warn",
			detail: "Could not verify file watcher status",
		});
	}

	// workspace.json freshness  -  stale file means daemon stopped emitting
	checks.push(...checkAgentsJsonFreshness(workspacePath));

	return checks;
}

/** Resolve workspace.json path with deprecation fallback (new name first). */
function resolveWorkspaceJsonPath(workspacePath: string): string {
	const newPath = join(workspacePath, ".agents", "workspace.json");
	const legacyPath = join(workspacePath, ".agents", "agents.workspace.json");
	return existsSync(newPath) ? newPath : legacyPath;
}

/** Check whether .agents/workspace.json is fresh (written within the past hour). */
function checkAgentsJsonFreshness(workspacePath: string): DoctorCheck[] {
	const agentsJsonPath = resolveWorkspaceJsonPath(workspacePath);
	if (!existsSync(agentsJsonPath)) {
		return [
			{
				id: "workspace.agents-json-fresh",
				group: "workspace",
				label: "workspace.json",
				status: "warn",
				detail: ".agents/workspace.json not found  -  daemon may not have emitted yet",
				fix: "Restart daemon: vreko service restart",
				fixCommand: "vreko service restart",
			},
		];
	}
	try {
		const agentsStat = statSync(agentsJsonPath);
		const ageMs = Date.now() - agentsStat.mtimeMs;
		const ONE_HOUR_MS = 60 * 60 * 1000;
		if (ageMs > ONE_HOUR_MS) {
			return [
				{
					id: "workspace.agents-json-fresh",
					group: "workspace",
					label: "workspace.json fresh",
					status: "warn",
					detail: `Last updated ${formatAge(ageMs)} ago  -  daemon may have stopped emitting`,
					fix: "Restart daemon: vreko service restart",
					fixCommand: "vreko service restart",
				},
			];
		}
		return [
			{
				id: "workspace.agents-json-fresh",
				group: "workspace",
				label: "workspace.json fresh",
				status: "pass",
				detail: `Updated ${formatAge(ageMs)} ago`,
			},
		];
	} catch {
		// statSync failed  -  file may have just been created, skip
		return [];
	}
}

// =============================================================================
// CHECK GROUP 4: KNOWLEDGE STORE
// =============================================================================

async function checkKnowledgeStore(workspacePath: string | null): Promise<DoctorCheck[]> {
	const checks: DoctorCheck[] = [];

	if (!workspacePath) {
		checks.push({
			id: "knowledge.exists",
			group: "knowledge",
			label: "Knowledge store",
			status: "skip",
			detail: "No workspace detected",
		});
		return checks;
	}

	const dbPath = join(workspacePath, ".vreko", "knowledge.db");

	if (!existsSync(dbPath)) {
		checks.push({
			id: "knowledge.exists",
			group: "knowledge",
			label: "knowledge.db exists",
			status: "warn",
			detail: "No knowledge store yet (will be created on first session)",
		});
		return checks;
	}

	// DB exists  -  check size
	const stat = statSync(dbPath);
	const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
	checks.push({
		id: "knowledge.exists",
		group: "knowledge",
		label: "knowledge.db exists",
		status: "pass",
		detail: `${dbPath} (${sizeMB}MB)`,
	});

	// Query counts via SQLite CLI (direct query)
	const counts = await queryKnowledgeCountsDirect(dbPath);

	if (counts) {
		checks.push({
			id: "knowledge.chunks",
			group: "knowledge",
			label: "Chunks indexed (FTS5)",
			status: counts.chunks > 0 ? "pass" : "warn",
			detail: `${counts.chunks} chunks`,
		});

		checks.push({
			id: "knowledge.embeddings",
			group: "knowledge",
			label: "Embeddings stored",
			status: counts.embeddings > 0 ? "pass" : "warn",
			detail: `${counts.embeddings} embeddings`,
		});

		checks.push({
			id: "knowledge.edges",
			group: "knowledge",
			label: "Knowledge edges",
			status: counts.edges > 0 ? "pass" : "warn",
			detail: counts.edges > 0 ? `${counts.edges} edges` : "0 edges (graph retrieval not yet wired  -  expected)",
		});

		checks.push({
			id: "knowledge.outcomes",
			group: "knowledge",
			label: "Outcomes recorded",
			status: counts.outcomes > 0 ? "pass" : "warn",
			detail:
				counts.outcomes > 0
					? `${counts.outcomes} outcomes`
					: "0 outcomes (populates over time  -  expected for new workspaces)",
		});
	}

	return checks;
}

/**
 * Direct SQLite query for knowledge counts
 * Used when service endpoint isn't available
 */
async function queryKnowledgeCountsDirect(
	dbPath: string,
): Promise<{ chunks: number; embeddings: number; edges: number; outcomes: number } | null> {
	try {
		// Use sqlite3 CLI if available (avoids native module dependency)
		const query = (table: string): number => {
			try {
				const result = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM ${table};"`, {
					encoding: "utf-8",
					stdio: ["pipe", "pipe", "pipe"],
					timeout: 3000,
				}).trim();
				return Number.parseInt(result, 10) || 0;
			} catch {
				return 0;
			}
		};

		return {
			chunks: query("chunks"),
			embeddings: query("embeddings"),
			edges: query("knowledge_edges"),
			outcomes: query("outcomes"),
		};
	} catch {
		return null;
	}
}

// =============================================================================
// CHECK GROUP 5: MCP
// =============================================================================

async function checkMCP(): Promise<DoctorCheck[]> {
	const checks: DoctorCheck[] = [];

	// Check for .mcp.json at workspace root (Claude Code project-scoped config)
	const workspaceRoot = findWorkspaceRoot(process.cwd()) ?? process.cwd();
	const mcpJsonPath = join(workspaceRoot, ".mcp.json");
	if (existsSync(mcpJsonPath)) {
		try {
			const raw = readFileSync(mcpJsonPath, "utf-8");
			const parsed = JSON.parse(raw) as Record<string, unknown>;
			const servers = parsed.mcpServers as Record<string, unknown> | undefined;
			const vrekoEntry = servers?.vreko ?? servers?.["vreko-claude-code"];
			if (vrekoEntry && typeof vrekoEntry === "object") {
				const entry = vrekoEntry as { command?: string };
				if (entry.command && !isCommandExecutable(entry.command)) {
					checks.push({
						id: "mcp.mcp-json.command",
						group: "mcp",
						label: ".mcp.json command",
						status: "fail",
						detail: `Command not executable: ${entry.command}`,
						fix: "Run: vr claude-sync --force",
						fixCommand: "vreko claude-sync --force",
					});
				} else {
					checks.push({
						id: "mcp.mcp-json.valid",
						group: "mcp",
						label: ".mcp.json",
						status: "pass",
						detail: "Valid Vreko entry found",
					});
				}
			} else {
				checks.push({
					id: "mcp.mcp-json.missing-vreko",
					group: "mcp",
					label: ".mcp.json",
					status: "warn",
					detail: "File exists but no Vreko entry",
					fix: "Run: vr claude-sync",
					fixCommand: "vreko claude-sync",
				});
			}
		} catch {
			checks.push({
				id: "mcp.mcp-json.parse",
				group: "mcp",
				label: ".mcp.json",
				status: "fail",
				detail: "File exists but is not valid JSON",
				fix: "Delete and regenerate: vr claude-sync --force",
				fixCommand: "vreko claude-sync --force",
			});
		}
	}

	const detection = detectAIClients();

	if (detection.clients.length === 0) {
		checks.push({
			id: "mcp.detection",
			group: "mcp",
			label: "AI client detection",
			status: "warn",
			detail: "No AI clients found in standard locations",
		});
		return checks;
	}

	// FIX: Deduplicate by name  -  for clients with multiple config paths (e.g. Qoder workspace + global),
	// take the entry with the best status so one tool doesn't show contradictory results.
	const byName = new Map<string, typeof detection.clients>();
	for (const client of detection.clients) {
		const existing = byName.get(client.name) ?? [];
		existing.push(client);
		byName.set(client.name, existing);
	}

	for (const [, clientGroup] of byName) {
		// Use the entry with the best status: exists+hasVreko > exists > not found
		const client = clientGroup.reduce((a, b) => {
			if (a.hasVreko) {
				return a;
			}
			if (b.hasVreko) {
				return b;
			}
			if (a.exists) {
				return a;
			}
			return b;
		});

		if (!client.exists) {
			checks.push({
				id: `mcp.${client.name}.installed`,
				group: "mcp",
				label: `${client.displayName}`,
				status: "skip",
				detail: "Not installed",
			});
			continue;
		}

		if (!client.hasVreko) {
			checks.push({
				id: `mcp.${client.name}.configured`,
				group: "mcp",
				label: `${client.displayName}`,
				status: "warn",
				detail: "Installed but Vreko not configured",
				fix: `Configure: vreko tools configure --${client.name}`,
				fixCommand: `vreko tools configure --${client.name} --yes`,
			});
			continue;
		}

		// Validate config structure
		const validation = validateClientConfig(client);
		if (validation.valid) {
			checks.push({
				id: `mcp.${client.name}.valid`,
				group: "mcp",
				label: `${client.displayName}`,
				status: "pass",
				detail: "Configured, config valid",
			});

			// Connectivity probe: actually try to start the configured MCP server.
			// This catches binary-not-found, crash-on-startup, and missing-dependency
			// failures that config-file validation alone cannot detect.
			const probeResult = await probeMCPProcess(client);
			if (probeResult) {
				checks.push(probeResult);
			}

			// Session auth check: verify CLI mcp --stdio session tokens are valid
			// Only applies to stdio clients (HTTP clients use headers for auth)
			const serverConfig = (() => {
				const rawCfg = readClientConfig(client);
				if (!rawCfg?.mcpServers) {
					return null;
				}
				const key = getServerKey(client.format);
				return rawCfg.mcpServers[key] ?? rawCfg.mcpServers.vreko ?? null;
			})();
			if (serverConfig?.command) {
				try {
					const manager = getWorkspaceSessionManager();
					const workspacePath = findWorkspaceRoot(process.cwd()) ?? process.cwd();
					const session = await manager.getSession(workspacePath);
					if (session?.isValid) {
						checks.push({
							id: `mcp.${client.name}.auth`,
							group: "mcp",
							label: `${client.displayName} session auth`,
							status: "pass",
							detail: `Authenticated as ${session.user.email} (${session.user.tier})`,
						});
					} else if (session && !session.isValid) {
						checks.push({
							id: `mcp.${client.name}.auth`,
							group: "mcp",
							label: `${client.displayName} session auth`,
							status: "warn",
							detail: `Session for ${session.user.email} is expired  -  Pro tools unavailable until re-auth`,
							fix: "Re-authenticate: vr login",
							fixCommand: "vr login",
						});
					} else {
						// No session  -  free tier, not an error
						checks.push({
							id: `mcp.${client.name}.auth`,
							group: "mcp",
							label: `${client.displayName} session auth`,
							status: "warn",
							detail: "No session  -  running in free tier (local tools only). Run 'vr login' to access Pro features.",
							fix: "Authenticate: vr login",
							fixCommand: "vr login",
						});
					}
				} catch {
					// Auth check is non-fatal  -  CLI mcp works in free tier without a session
				}
			}
		} else {
			const errors = validation.issues.filter((i) => i.severity === "error");
			const warnings = validation.issues.filter((i) => i.severity === "warning");
			checks.push({
				id: `mcp.${client.name}.valid`,
				group: "mcp",
				label: `${client.displayName}`,
				status: errors.length > 0 ? "fail" : "warn",
				detail: [...errors, ...warnings].map((i) => i.message).join("; "),
				fix: `Repair: vreko tools configure --${client.name} --force`,
				fixCommand: `vreko tools configure --${client.name} --force --yes`,
			});
		}
	}

	return checks;
}

// =============================================================================
// MCP CONNECTIVITY PROBE
// =============================================================================

/**
 * Spawn the configured MCP server and perform a real JSON-RPC `initialize` handshake.
 *
 * Stronger than a survival check  -  confirms the server:
 * 1. Starts without crash (binary found, deps present, no startup error)
 * 2. Speaks MCP protocol (responds to JSON-RPC initialize request)
 * 3. Returns valid server info in the response
 *
 * HTTP/SSE transport entries are skipped (no process to spawn).
 *
 * @returns DoctorCheck or null if the config has no probeable entry
 */
async function probeMCPProcess(client: Parameters<typeof validateClientConfig>[0]): Promise<DoctorCheck | null> {
	const rawConfig = readClientConfig(client);
	if (!rawConfig?.mcpServers) {
		return null;
	}

	const serverKey = getServerKey(client.format);
	// Resolve server entry: try namespaced key first, fall back to legacy "vreko"
	const serverConfig = rawConfig.mcpServers[serverKey] ?? rawConfig.mcpServers.vreko;

	if (!serverConfig) {
		return null;
	}

	// HTTP/SSE transport  -  no process to spawn, skip silently
	if (!serverConfig.command) {
		return {
			id: `mcp.${client.name}.connectivity`,
			group: "mcp",
			label: `${client.displayName} connectivity`,
			status: "skip",
			detail: "HTTP transport (remote server  -  not probed locally)",
		};
	}

	const HANDSHAKE_TIMEOUT_MS = 5000;

	return new Promise<DoctorCheck>((resolve) => {
		let settled = false;
		let stderrLog = "";

		const settle = (result: DoctorCheck) => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timer);
			try {
				proc.kill("SIGTERM");
			} catch {
				// already exited  -  ignore
			}
			resolve(result);
		};

		let proc: ReturnType<typeof spawn>;
		try {
			proc = spawn(serverConfig.command as string, serverConfig.args ?? [], {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, ...(serverConfig.env ?? {}) },
			});
		} catch (spawnErr) {
			return resolve({
				id: `mcp.${client.name}.connectivity`,
				group: "mcp",
				label: `${client.displayName} server starts`,
				status: "fail",
				detail: `spawn error: ${spawnErr instanceof Error ? spawnErr.message : String(spawnErr)}`,
				fix: `Repair config: vr mcp repair --client ${client.name}`,
				fixCommand: `vreko mcp repair --client ${client.name} --force`,
			});
		}

		// Collect stderr for diagnostics (MCP servers log to stderr, not stdout)
		proc.stderr?.on("data", (chunk: Buffer) => {
			stderrLog += chunk.toString().slice(0, 500); // cap at 500 chars
		});

		// Send MCP JSON-RPC initialize request to stdin
		const initRequest = JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: "initialize",
			params: {
				protocolVersion: "2024-11-05",
				capabilities: {},
				clientInfo: { name: "vreko-doctor", version: "1.0.0" },
			},
		});

		// MCP stdio framing: each message is a newline-delimited JSON object
		try {
			proc.stdin?.write(`${initRequest}\n`);
			proc.stdin?.end();
		} catch {
			// stdin write failure is non-fatal  -  server may have already exited
		}

		// Buffer stdout and watch for a valid JSON-RPC response
		let stdoutBuf = "";
		proc.stdout?.on("data", (chunk: Buffer) => {
			stdoutBuf += chunk.toString();
			// Try to parse each newline-delimited message
			const lines = stdoutBuf.split("\n");
			stdoutBuf = lines.pop() ?? ""; // keep partial last line
			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) {
					continue;
				}
				try {
					const msg = JSON.parse(trimmed) as Record<string, unknown>;
					// Valid MCP initialize response: jsonrpc 2.0, id 1, result with serverInfo
					if (msg.jsonrpc === "2.0" && msg.id === 1 && msg.result) {
						const result = msg.result as Record<string, unknown>;
						const serverInfo = result.serverInfo as Record<string, unknown> | undefined;
						const serverName = serverInfo?.name ?? "unknown";
						const serverVersion = serverInfo?.version ?? "?";
						settle({
							id: `mcp.${client.name}.connectivity`,
							group: "mcp",
							label: `${client.displayName} server starts`,
							status: "pass",
							detail: `JSON-RPC handshake OK  -  ${serverName} v${serverVersion}`,
						});
					} else if (msg.jsonrpc === "2.0" && msg.error) {
						// Server responded with a JSON-RPC error (still alive, but unhappy)
						const err = msg.error as Record<string, unknown>;
						settle({
							id: `mcp.${client.name}.connectivity`,
							group: "mcp",
							label: `${client.displayName} server starts`,
							status: "warn",
							detail: `Server running but initialize returned error: ${err.message ?? String(err.code)}`,
						});
					}
				} catch {
					// Not valid JSON yet  -  keep buffering
				}
			}
		});

		const timer = setTimeout(() => {
			// Timeout  -  server did not respond to initialize within budget
			settle({
				id: `mcp.${client.name}.connectivity`,
				group: "mcp",
				label: `${client.displayName} server starts`,
				status: "warn",
				detail: `Server started but did not respond to initialize within ${HANDSHAKE_TIMEOUT_MS}ms`,
			});
		}, HANDSHAKE_TIMEOUT_MS);

		proc.on("error", (err: NodeJS.ErrnoException) => {
			const isNotFound = err.code === "ENOENT";
			settle({
				id: `mcp.${client.name}.connectivity`,
				group: "mcp",
				label: `${client.displayName} server starts`,
				status: "fail",
				detail: isNotFound
					? `Binary not found: '${serverConfig.command}'  -  not in IDE process PATH. Use absolute path.`
					: err.message,
				fix: isNotFound
					? `Re-link with absolute path: vr mcp repair --client ${client.name} --force`
					: `Repair config: vr mcp repair --client ${client.name}`,
				fixCommand: `vreko mcp repair --client ${client.name} --force`,
			});
		});

		proc.on("close", (code: number | null) => {
			// Killed by us (SIGTERM) after successful handshake → already settled
			if (settled) {
				return;
			}
			// Premature exit  -  the process crashed before we got a response
			const hint = stderrLog ? ` stderr: ${stderrLog.split("\n")[0]}` : "";
			if (code !== 0 && code !== null) {
				settle({
					id: `mcp.${client.name}.connectivity`,
					group: "mcp",
					label: `${client.displayName} server starts`,
					status: "fail",
					detail: `Process crashed on startup (exit code ${code})  -  check service is running.${hint}`,
					fix: `Start service then repair: vr service start && vr mcp repair --client ${client.name}`,
					fixCommand: "vreko service start",
				});
			} else {
				// Exit 0 without responding  -  unusual but possible during free-tier graceful startup
				settle({
					id: `mcp.${client.name}.connectivity`,
					group: "mcp",
					label: `${client.displayName} server starts`,
					status: "warn",
					detail: `Process exited cleanly (code 0) without responding to initialize.${hint}`,
				});
			}
		});
	});
}

// =============================================================================
// CHECK GROUP 6: NETWORK
// =============================================================================

async function checkNetwork(): Promise<DoctorCheck[]> {
	const checks: DoctorCheck[] = [];

	// API reachability
	try {
		const start = Date.now();
		const response = await fetch("https://api.vreko.dev/health", {
			signal: AbortSignal.timeout(5000),
		});
		const latency = Date.now() - start;

		checks.push({
			id: "network.api",
			group: "network",
			label: "api.vreko.dev reachable",
			status: response.ok ? "pass" : "warn",
			detail: `${response.status} (${latency}ms)`,
		});
	} catch {
		checks.push({
			id: "network.api",
			group: "network",
			label: "api.vreko.dev reachable",
			status: "warn",
			detail: "Unreachable (Pro features require network)",
			fix: "Check internet connection or firewall settings",
		});
	}

	// API key
	const apiKey = process.env.VREKO_API_KEY;
	if (apiKey) {
		// Validate key format (don't validate against server  -  that's a separate check)
		if (apiKey.startsWith("sk-") && apiKey.length > 10) {
			checks.push({
				id: "network.apiKey",
				group: "network",
				label: "API key configured",
				status: "pass",
				detail: `sk-...${apiKey.slice(-4)}`,
			});
		} else {
			checks.push({
				id: "network.apiKey",
				group: "network",
				label: "API key configured",
				status: "warn",
				detail: "Key format looks invalid",
				fix: "Check your API key at https://console.vreko.dev/app/settings/api-keys",
			});
		}
	} else {
		checks.push({
			id: "network.apiKey",
			group: "network",
			label: "API key configured",
			status: "warn",
			detail: "No API key (Pro features unavailable)",
			fix: "Set via: export VREKO_API_KEY=sk-...",
		});
	}

	return checks;
}

// =============================================================================
// CHECK GROUP 7: AUTH
// =============================================================================

type AuthData = {
	token?: string;
	accessToken?: string;
	expiresAt?: string | number;
	user?: { email?: string; tier?: string };
};

function isTokenExpired(expiresAt: string | number | undefined): boolean {
	if (!expiresAt) {
		return false;
	}
	const expMs =
		typeof expiresAt === "number"
			? expiresAt < 1e12
				? expiresAt * 1000 // Unix seconds → ms
				: expiresAt // already ms
			: new Date(expiresAt).getTime();
	return Number.isFinite(expMs) && expMs < Date.now();
}

function readAuthCheck(authPath: string): DoctorCheck {
	try {
		const authData = JSON.parse(readFileSync(authPath, "utf-8")) as AuthData;
		if (!(authData.token ?? authData.accessToken)) {
			return {
				id: "auth.token",
				group: "auth",
				label: "Auth token present",
				status: "fail",
				detail: "auth.json exists but contains no token",
				fix: "Re-authenticate: vr login",
				fixCommand: "vr login",
			};
		}
		const expired = isTokenExpired(authData.expiresAt);
		const userEmail = authData.user?.email ?? "unknown";
		const userTier = authData.user?.tier ?? "unknown";
		return expired
			? {
					id: "auth.token",
					group: "auth",
					label: "Auth token valid",
					status: "fail",
					detail: `Token expired (${userEmail})  -  Pro features unavailable`,
					fix: "Re-authenticate: vr login",
					fixCommand: "vr login",
				}
			: {
					id: "auth.token",
					group: "auth",
					label: "Auth token valid",
					status: "pass",
					detail: `Authenticated as ${userEmail} (${userTier})`,
				};
	} catch {
		return {
			id: "auth.token",
			group: "auth",
			label: "Auth token valid",
			status: "warn",
			detail: "auth.json unreadable or corrupt",
			fix: "Re-authenticate: vr login",
			fixCommand: "vr login",
		};
	}
}

async function checkAuth(): Promise<DoctorCheck[]> {
	const authPath = join(homedir(), ".vreko", "auth.json");
	if (!existsSync(authPath)) {
		return [
			{
				id: "auth.token",
				group: "auth",
				label: "Auth token present",
				status: "warn",
				detail: "No auth token  -  running in free tier (local tools only)",
				fix: "Authenticate: vr login",
				fixCommand: "vr login",
			},
		];
	}
	return [readAuthCheck(authPath)];
}

// =============================================================================
// CHECK GROUP 8: EXTENSION
// =============================================================================

async function checkExtension(): Promise<DoctorCheck[]> {
	const checks: DoctorCheck[] = [];

	// Check known extension installation paths
	const home = homedir();
	const extensionPaths = [
		join(home, ".vscode", "extensions"),
		join(home, ".vscode-insiders", "extensions"),
		join(home, ".qoder", "extensions"),
		// macOS alternate
		join(home, ".cursor", "extensions"),
	];

	let found = false;
	let extensionVersion: string | null = null;

	for (const extDir of extensionPaths) {
		if (!existsSync(extDir)) {
			continue;
		}
		try {
			const entries = execSync(`ls "${extDir}" 2>/dev/null`, { encoding: "utf-8" })
				.split("\n")
				.filter((e) => e.includes("vreko"));
			if (entries.length > 0) {
				found = true;
				// Try to extract version from directory name (e.g., "vreko.vreko-1.4.2")
				const match = entries[0].match(/(\d+\.\d+\.\d+)/);
				if (match) {
					extensionVersion = match[1];
				}
				break;
			}
		} catch {
			// Check failed  -  non-fatal, directory may not exist
		}
	}

	if (found) {
		checks.push({
			id: "extension.installed",
			group: "extension",
			label: "VS Code extension detected",
			status: "pass",
			detail: extensionVersion ? `v${extensionVersion}` : "Version unknown",
		});
	} else {
		checks.push({
			id: "extension.installed",
			group: "extension",
			label: "VS Code extension",
			status: "warn",
			detail: "Not detected (checked VS Code, Cursor, Qoder extension dirs)",
			fix: "Install from marketplace: ext install vreko.vreko",
		});
	}

	// Check if extension is connected to service (infer from service client count)
	try {
		if (isDaemonConnected()) {
			const client = getDaemonClient();
			const status = await client.daemon.status();
			const clients = status?.connections ?? 0;
			if (clients > 0) {
				checks.push({
					id: "extension.connected",
					group: "extension",
					label: "Extension connected to service",
					status: "pass",
					detail: `${clients} client(s) connected`,
				});
			} else {
				checks.push({
					id: "extension.connected",
					group: "extension",
					label: "Extension connected to service",
					status: "warn",
					detail: "No clients connected (extension may not be active)",
				});
			}
		}
	} catch {
		// Daemon not available  -  skip this check
	}

	return checks;
}

// =============================================================================
// OUTPUT FORMATTING
// =============================================================================

function printGroup(_group: string, checks: DoctorCheck[], quiet: boolean): void {
	const _groupLabels: Record<string, string> = {
		cli: "CLI",
		service: "Service",
		workspace: "Workspace",
		knowledge: "Knowledge Store",
		mcp: "MCP",
		network: "Network",
		auth: "Auth",
		extension: "Extension",
	};

	// Skip group entirely if quiet and all passing
	if (quiet && checks.every((c) => c.status === "pass" || c.status === "skip")) {
		return;
	}

	for (const check of checks) {
		if (quiet && (check.status === "pass" || check.status === "skip")) {
			continue;
		}

		const icon = statusIcon(check.status);
		const color = statusColor(check.status);
		const detail = check.detail ? chalk.gray(` (${check.detail})`) : "";

		console.log(`  ${color(icon)} ${check.label}${detail}`);
		if (check.fix && check.status !== "pass") {
			console.log(`    Fix: ${check.fix}`);
		}
	}
}

function statusIcon(status: CheckStatus): string {
	switch (status) {
		case "pass":
			return "✔";
		case "warn":
			return "⚠";
		case "fail":
			return "✖";
		case "skip":
			return "○";
	}
}

function statusColor(status: CheckStatus): (text: string) => string {
	switch (status) {
		case "pass":
			return chalk.green;
		case "warn":
			return chalk.yellow;
		case "fail":
			return chalk.red;
		case "skip":
			return chalk.gray;
	}
}

// =============================================================================
// UTILITIES
// =============================================================================

function isProcessAlive(pid: number): boolean {
	try {
		process.kill(pid, 0); // Signal 0 = check existence without killing
		return true;
	} catch {
		return false;
	}
}

function formatUptime(seconds: number): string {
	if (seconds < 60) {
		return `${Math.floor(seconds)}s`;
	}
	if (seconds < 3600) {
		return `${Math.floor(seconds / 60)}m`;
	}
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	return `${h}h ${m}m`;
}

function formatAge(ms: number): string {
	const minutes = Math.floor(ms / 60000);
	if (minutes < 60) {
		return `${minutes}m`;
	}
	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `${hours}h`;
	}
	return `${Math.floor(hours / 24)}d`;
}

function platformLabel(): string {
	const os = platform();
	const a = arch();
	const labels: Record<string, string> = { darwin: "macOS", linux: "Linux", win32: "Windows" };
	return `${labels[os] || os} ${a}`;
}

function skipGroup(group: string, reason: string): Promise<DoctorCheck[]> {
	return Promise.resolve([
		{
			id: `${group}.skipped`,
			group,
			label: group,
			status: "skip" as CheckStatus,
			detail: reason,
		},
	]);
}

// =============================================================================
// SYNC CONFIG HANDLER
// =============================================================================

async function handleSyncConfig(): Promise<void> {
	console.log(chalk.blue("Syncing fingerprint config from cloud..."));
	console.log(chalk.yellow("○ Fingerprint sync unavailable  -  handler not registered in daemon"));
}

// Re-export for external use
export { runDoctor };
