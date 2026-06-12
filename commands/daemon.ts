/**
 * Daemon CLI Commands
 *
 * Commands for managing the Vreko daemon lifecycle.
 *
 * Usage:
 *   vreko daemon start [--no-detach] [--idle-timeout <minutes>]
 *   vreko daemon stop
 *   vreko daemon status
 *   vreko daemon restart
 *   vreko daemon ping
 *   vreko daemon health [--watch] [--interval <seconds>]
 *
 * @module commands/daemon
 */

import { execSync, spawn } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Command } from "commander";
import {
	connectServiceClient,
	createServiceClient,
	formatBytes,
	formatDuration,
	getServiceSocketPath,
	isServiceHealthy,
	readServicePid,
} from "../service-adapter/local-service-adapter.js";
import { startDaemonDetached } from "../services/daemon-launch.js";

/**
 * Register daemon commands
 */
export function registerDaemonCommands(program: Command): void {
	const daemon = program.command("daemon", { hidden: true }).description("Manage 🦎 Vreko service");

	// ==========================================================================
	// daemon start
	// ==========================================================================
	daemon
		.command("start")
		.description("Start the 🦎 Vreko service")
		.option("--no-detach", "Run service in foreground (attached to terminal)")
		.option("-f, --foreground", "Same as --no-detach")
		.option("-t, --idle-timeout <minutes>", "Shutdown after idle (default: 240)", "240")
		.action(async (options) => {
			// Check if already running
			if (await isServiceHealthy()) {
				const pid = readServicePid();
				console.log(`Service is already running (PID: ${pid})`);
				return;
			}

			const vrekodArgs = ["--idle-timeout", options.idleTimeout];

			// ESM-compatible module resolution
			let vrekodBin: string;
			try {
				// Try ESM import.meta.resolve (Node 20.6+)
				const resolved = await import.meta.resolve("@vreko/local-service/dist/main.js");
				vrekodBin = resolved.replace("file://", "");
			} catch {
				// Fallback: try require.resolve if available (CommonJS build)
				if (require?.resolve) {
					vrekodBin = require.resolve("@vreko/local-service/dist/main.js");
				} else {
					// Last resort: relative path from CLI dist
					const { fileURLToPath } = await import("node:url");
					const { dirname, join } = await import("node:path");
					const __dirname = dirname(fileURLToPath(import.meta.url));
					vrekodBin = join(__dirname, "../../local-service/dist/main.js");
				}
			}

			if (options.detach && !options.foreground) {
				const pid = await startDaemonDetached({
					idleTimeout: options.idleTimeout,
					maxWaitMs: 5000,
				});

				console.log(`✓ Service started (PID: ${pid ?? readServicePid()})`);
				return;
			}

			const child = spawn(process.execPath, [vrekodBin, ...vrekodArgs], {
				stdio: "inherit",
			});

			await new Promise<void>((resolve, reject) => {
				child.on("exit", (code) => {
					if (code === 0) {
						resolve();
					} else {
						reject(new Error(`Service exited with code ${code}`));
					}
				});
				child.on("error", reject);
			});
		});

	// ==========================================================================
	// daemon stop
	// ==========================================================================
	daemon
		.command("stop")
		.description("Stop the 🦎 Vreko service")
		.action(async () => {
			if (!(await isServiceHealthy())) {
				console.log("Service is not running");
				return;
			}

			console.log("Stopping service...");
			const client = createServiceClient();
			try {
				await connectServiceClient(client);
				await client.daemon.shutdown();
				console.log("✓ Service stopped");
			} catch (_err) {
				// IPC failed  -  fall back to SIGTERM
				try {
					const pid = readServicePid();
					if (pid) {
						process.kill(pid, "SIGTERM");
						console.log("✓ Service stopped (SIGTERM)");
					}
				} catch (killErr) {
					console.error(
						"✗ Failed to stop service:",
						killErr instanceof Error ? killErr.message : String(killErr),
					);
					process.exitCode = 1;
				}
			} finally {
				client.close();
			}
		});

	// ==========================================================================
	// daemon status
	// ==========================================================================
	daemon
		.command("status")
		.description("Show service status")
		.option("-j, --json", "Output as JSON")
		.action(async (options) => {
			if (!(await isServiceHealthy())) {
				if (options.json) {
					console.log(JSON.stringify({ running: false }));
				} else {
					console.log("Service is not running");
				}
				return;
			}

			const client = createServiceClient();
			try {
				await connectServiceClient(client);
				const status = await client.call<{
					pid: number;
					version: string;
					uptime: number;
					startedAt: string;
					workspaces: number;
					connections: number;
					memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
					idleTimeout: number;
				}>("daemon/status", {});

				if (options.json) {
					console.log(JSON.stringify({ running: true, ...status }));
				} else {
					console.log("Service Status:");
					console.log("  Status:       ✓ Running");
					console.log(`  PID:          ${status.pid}`);
					console.log(`  Version:      ${status.version}`);
					console.log(`  Uptime:       ${formatDuration(status.uptime)}`);
					console.log(`  Started:      ${status.startedAt}`);
					console.log(`  Workspaces:   ${status.workspaces}`);
					console.log(`  Connections:  ${status.connections}`);
					console.log(`  Memory:       ${formatBytes(status.memoryUsage.heapUsed)}`);
					console.log(`  Socket:       ${getServiceSocketPath()}`);
				}
			} catch (_err) {
				if (options.json) {
					console.log(
						JSON.stringify({ running: true, error: _err instanceof Error ? _err.message : String(_err) }),
					);
				} else {
					console.error("✗ Failed to get status:", _err instanceof Error ? _err.message : String(_err));
				}
			} finally {
				client.close();
			}
		});

	// ==========================================================================
	// daemon restart
	// ==========================================================================
	daemon
		.command("restart")
		.description("Restart the Vreko service")
		.option("-t, --idle-timeout <minutes>", "Shutdown after idle (default: 15)", "15")
		.action(async (options) => {
			// Stop if running
			if (await isServiceHealthy()) {
				const stopClient = createServiceClient();
				try {
					await connectServiceClient(stopClient);
					await stopClient.daemon.shutdown();
				} catch {
					// Ignore stop errors  -  process may already be dead
				} finally {
					stopClient.close();
				}
				// Poll until the process actually exits (max 3 s) rather than
				// a fixed sleep, which can be too short under load.
				const stopStart = Date.now();
				await new Promise<void>((resolve) => {
					const wait = async () => {
						if (!(await isServiceHealthy()) || Date.now() - stopStart > 3000) {
							resolve();
						} else {
							setTimeout(() => {
								void wait();
							}, 100);
						}
					};
					setTimeout(() => {
						void wait();
					}, 100);
				});
			}

			// Start in detached mode
			// Check if Doppler is available (must be authenticated or have DOPPLER_TOKEN)
			let useDoppler = false;
			try {
				execSync("which doppler", { stdio: "ignore" });
				if (process.env.DOPPLER_TOKEN) {
					useDoppler = true;
				} else {
					try {
						execSync("doppler me", { stdio: "ignore" });
						useDoppler = true;
					} catch {
						// Doppler not authenticated
					}
				}
			} catch {
				// Doppler not installed, fall back to direct spawn
			}

			// CRITICAL: Redirect stdout/stderr to log files for detached processes
			const logDir = join(homedir(), ".vreko", "daemon");
			const logPath = join(logDir, "daemon.log");
			let logFd: number;
			try {
				mkdirSync(logDir, { recursive: true });
				logFd = openSync(logPath, "a");
			} catch {
				// /dev/null is the safe discard; using fd 1 (stdout) would
				// cause SIGPIPE when the detached parent exits.
				logFd = openSync("/dev/null", "w");
			}

			const spawnArgs = useDoppler
				? [
						"run",
						"--",
						process.execPath,
						process.argv[1],
						"daemon",
						"start",
						"--idle-timeout",
						options.idleTimeout,
					]
				: [process.argv[1], "daemon", "start", "--idle-timeout", options.idleTimeout];
			const spawnCmd = useDoppler ? "doppler" : process.execPath;

			const child = spawn(spawnCmd, spawnArgs, {
				detached: true,
				stdio: ["ignore", logFd, logFd], // Redirect to log file
			});

			child.unref();

			// Wait for startup
			const maxWait = 5000;
			const start = Date.now();

			await new Promise<void>((resolve, reject) => {
				const check = async () => {
					if (await isServiceHealthy()) {
						resolve();
					} else if (Date.now() - start > maxWait) {
						reject(new Error("Service failed to restart within timeout"));
					} else {
						setTimeout(() => {
							void check();
						}, 100);
					}
				};
				setTimeout(() => {
					void check();
				}, 100);
			});

			console.log(`✓ Service restarted (PID: ${readServicePid()})`);
		});

	// ==========================================================================
	// daemon ping
	// ==========================================================================
	daemon
		.command("ping")
		.description("Ping the service")
		.action(async () => {
			if (!(await isServiceHealthy())) {
				console.log("Service is not running");
				return;
			}

			const client = createServiceClient();
			try {
				const start = Date.now();
				await connectServiceClient(client);
				const result = await client.daemon.ping();
				const elapsed = Date.now() - start;
				console.log(`pong (${elapsed}ms, uptime: ${formatDuration(result.uptime)})`);
			} catch (_err) {
				console.error("✗ Ping failed:", _err instanceof Error ? _err.message : String(_err));
			} finally {
				client.close();
			}
		});

	// ==========================================================================
	// daemon health
	// ==========================================================================
	daemon
		.command("health")
		.description("Show service and MCP health (proactive health check)")
		.option("-w, --watch", "Continuously poll health (Ctrl+C to stop)")
		.option("-i, --interval <seconds>", "Poll interval in seconds (default: 30)", "30")
		.option("-j, --json", "Output as JSON")
		.action(async (options) => {
			const intervalMs = Number.parseInt(options.interval, 10) * 1000;

			const runCheck = async (): Promise<void> => {
				const timestamp = new Date().toISOString();
				const result: {
					timestamp: string;
					daemon: {
						status: string;
						pid?: number;
						version?: string;
						uptime?: string;
						latencyMs?: number;
						error?: string;
					};
					mcp: { status: string; details: string }[];
				} = {
					timestamp,
					daemon: { status: "unknown" },
					mcp: [],
				};

				// --- Daemon health ---
				if (!(await isServiceHealthy())) {
					result.daemon = { status: "down", error: "Not running (no PID or process dead)" };
				} else {
					const healthClient = createServiceClient();
					try {
						const t0 = Date.now();
						await connectServiceClient(healthClient);
						const ping = await healthClient.daemon.ping();
						const latencyMs = Date.now() - t0;
						const { readServicePid } = await import("../service-adapter/local-service-adapter.js");
						result.daemon = {
							status: latencyMs < 100 ? "healthy" : "degraded",
							pid: readServicePid() ?? undefined,
							version: ping.version,
							uptime: formatDuration(ping.uptime),
							latencyMs,
						};
					} catch (err) {
						result.daemon = {
							status: "unreachable",
							error: err instanceof Error ? err.message : String(err),
						};
					} finally {
						healthClient.close();
					}
				}

				// --- MCP health ---
				// Check each configured MCP server for stdio transports
				try {
					const { detectAIClients, readClientConfig, getServerKey } = await import("@vreko/mcp-config");
					const detection = detectAIClients();

					// BUG 3 fix: deduplicate clients by name (mirrors doctor.ts logic) so that
					// tools with multiple config paths (e.g. Qoder workspace + global) don't
					// appear multiple times in the health output.
					const byName = new Map<string, typeof detection.clients>();
					for (const client of detection.clients) {
						const existing = byName.get(client.name) ?? [];
						existing.push(client);
						byName.set(client.name, existing);
					}
					const dedupedClients = Array.from(byName.values()).map((group) =>
						group.reduce((a, b) => {
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
						}),
					);

					for (const client of dedupedClients) {
						if (!client.hasVreko) {
							continue;
						}
						const rawConfig = readClientConfig(client);
						if (!rawConfig?.mcpServers) {
							continue;
						}
						const serverKey = getServerKey(client.format);
						const serverConfig = rawConfig.mcpServers[serverKey] ?? rawConfig.mcpServers.vreko;
						if (!serverConfig?.command) {
							// HTTP transport  -  skip connectivity check
							result.mcp.push({
								status: "http-transport",
								details: `${client.displayName}: remote HTTP (not locally probed)`,
							});
							continue;
						}
						// Check if the configured binary/command exists
						const cmd = serverConfig.command;
						try {
							execSync(`which ${JSON.stringify(cmd)} 2>/dev/null || command -v ${JSON.stringify(cmd)}`, {
								stdio: "ignore",
							});
							result.mcp.push({
								status: "configured",
								details: `${client.displayName}: command '${cmd}' found`,
							});
						} catch {
							result.mcp.push({
								status: "broken",
								details: `${client.displayName}: command '${cmd}' not found in PATH`,
							});
						}
					}
				} catch (err) {
					result.mcp.push({
						status: "error",
						details: `Could not inspect MCP config: ${err instanceof Error ? err.message : String(err)}`,
					});
				}

				// Output
				if (options.json) {
					console.log(JSON.stringify(result, null, 2));
					return;
				}

				const daemonIcon =
					result.daemon.status === "healthy" ? "✅" : result.daemon.status === "degraded" ? "⚠️" : "❌";
				if (options.watch) {
					process.stdout.write(`\r\x1b[K[${timestamp.slice(11, 19)}] `);
				}

				console.log(
					`${daemonIcon} Service: ${result.daemon.status}` +
						(result.daemon.pid ? ` (PID: ${result.daemon.pid})` : "") +
						(result.daemon.latencyMs !== undefined ? ` ${result.daemon.latencyMs}ms` : "") +
						(result.daemon.error ? `  -  ${result.daemon.error}` : ""),
				);
				if (result.daemon.version) {
					console.log(`   Version: ${result.daemon.version}  Uptime: ${result.daemon.uptime}`);
				}

				for (const mcp of result.mcp) {
					const mcpIcon = mcp.status === "configured" ? "✅" : mcp.status === "http-transport" ? "ℹ️" : "❌";
					console.log(`${mcpIcon} MCP: ${mcp.details}`);
				}
				if (result.mcp.length === 0) {
					console.log("ℹ️  No MCP clients configured");
				}
			};

			if (options.watch) {
				await runCheck();
				const interval = setInterval(runCheck, intervalMs);
				// Keep process alive; Ctrl+C will exit
				process.on("SIGINT", () => {
					clearInterval(interval);
					process.exit(0);
				});
				await new Promise(() => {
					/* intentionally empty */
				}); // keep alive
			} else {
				await runCheck();
			}
		});
}
