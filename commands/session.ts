/**
 * Session Command
 *
 * Implements vr session start/status/end - Manage development sessions.
 * Sessions track task context and snapshot count.
 *
 * @see implementation_plan.md Section 1.2
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import chalk from "chalk";
import { Command } from "commander";
import { emitPioneerEvent, PIONEER_EVENTS } from "../analytics/emit.js";
import { cliState } from "../cli-state.js";
import { connectToDaemon, disconnectFromDaemon, withDaemonOptional } from "../services/service-client";
import {
	appendVrekoJsonl,
	endCurrentSession,
	generateId,
	getCurrentSession,
	getGlobalDir,
	getGlobalPath,
	isVrekoInitialized,
	type SessionState,
	saveCurrentSession,
} from "../services/vreko-dir";

// =============================================================================
// PIONEER EVENT HELPERS
// =============================================================================

/**
 * Emit `first_session` exactly once per machine using a flag file.
 * Fire-and-forget  -  never awaited, never throws.
 * Flag: ~/.vreko/first-session
 */
function emitFirstSessionOnce(): void {
	try {
		const flagFile = getGlobalPath("first-session");
		if (!existsSync(flagFile)) {
			mkdirSync(getGlobalDir(), { recursive: true });
			writeFileSync(flagFile, new Date().toISOString(), "utf8");
			emitPioneerEvent(PIONEER_EVENTS.FIRST_SESSION);
		}
	} catch {
		// Non-fatal: analytics must never break the CLI
	}
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the session command with subcommands
 */
export function createSessionCommand(): Command {
	const session = new Command("session").description("Manage development sessions");

	// Phase 21: vr session (no args, TTY) → TUI session panel
	session.action(async () => {
		const { isInteractive } = await import("../ui/guards.js");
		if (isInteractive()) {
			const { launchTui } = await import("../ui/tui/index.js");
			await launchTui("session");
			return;
		}
		// Machine mode: fall through to help output
		session.help();
	});

	session
		.command("start")
		.description("Start a new development session")
		.argument("[task]", "Task description")
		.option("-f, --force", "End current session and start a new one")
		.option("--json", "Output session info as JSON")
		.action(async (task: string | undefined, options) => {
			const cwd = process.cwd();
			const jsonMode = options.json || cliState.json;

			try {
				// Check if initialized
				if (!(await isVrekoInitialized(cwd))) {
					if (jsonMode) {
						process.stdout.write(
							`${JSON.stringify({ error: "Vreko not initialized in this workspace" })}\n`,
						);
						process.exit(1);
					}
					console.log(chalk.yellow("🦎 Vreko not initialized in this workspace"));
					console.log(chalk.gray("Run: vr init"));
					process.exit(1);
				}

				// Try service-first for session check
				const existingSession: SessionState | null = await withDaemonOptional(
					"session start",
					async (client) => {
						if (!client) {
							return await getCurrentSession(cwd);
						}
						const response1 = await client.session.current({ workspacePath: cwd });
						const s1 = response1;
						if (s1) {
							return {
								id: s1.id,
								startedAt: s1.startedAt,
								snapshotCount: s1.snapshotIds?.length ?? 0,
							};
						}
						return null;
					},
				);

				if (existingSession && !options.force) {
					if (jsonMode) {
						process.stdout.write(
							`${JSON.stringify({ error: "A session is already active", sessionId: existingSession.id })}\n`,
						);
						process.exit(1);
					}
					console.log(chalk.yellow("A session is already active:"));
					console.log(`  ID: ${chalk.gray(existingSession.id.substring(0, 8))}`);
					if (existingSession.task) {
						console.log(`  Task: ${existingSession.task}`);
					}
					console.log(`  Started: ${formatTimeAgo(existingSession.startedAt)}`);
					console.log(`  Snapshots: ${existingSession.snapshotCount}`);
					console.log();
					console.log(chalk.gray("Use --force to end this session and start a new one"));
					return;
				}

				// End existing session if forcing
				if (existingSession && options.force) {
					if (!jsonMode) {
						console.log(chalk.gray(`Ended previous session: ${existingSession.id.substring(0, 8)}`));
					}
					await archiveSession(existingSession, cwd);
					await endCurrentSession(cwd);
				}

				// Create new session
				const newSession: SessionState = {
					id: generateId("sess"),
					task,
					startedAt: new Date().toISOString(),
					snapshotCount: 0,
					state: "active",
					active: true,
				};

				// Try service-first for session start; always dual-write to local so
				// `session status` can find the session even when the service doesn't
				// persist it immediately.
				try {
					const client = await connectToDaemon();
					const daemonSession = await client.session.start({
						workspacePath: cwd,
					});
					newSession.id = daemonSession.id ?? newSession.id;
				} catch (err: unknown) {
					const msg = err instanceof Error ? err.message : String(err);
					console.warn(
						`⚠ Service unavailable  -  session stored locally. Syncing resumes on next service connection. (${msg})`,
					);
				}
				await saveCurrentSession(newSession, cwd);

				// CLI-EVENTS-03: Emit first_session once per machine (idempotent flag file).
				// Fire-and-forget  -  never awaited, never blocks the user.
				emitFirstSessionOnce();

				if (jsonMode) {
					process.stdout.write(
						`${JSON.stringify({ sessionId: newSession.id, workspacePath: cwd, startedAt: newSession.startedAt })}\n`,
					);
					return;
				}
				console.log(chalk.green("✓"), "Session started");
				console.log(`  ID: ${chalk.gray(newSession.id.substring(0, 8))}`);
				if (task) {
					console.log(`  Task: ${task}`);
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				if (jsonMode) {
					process.stdout.write(`${JSON.stringify({ error: message })}\n`);
					process.exit(1);
				}
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			} finally {
				disconnectFromDaemon();
			}
		});

	session
		.command("status")
		.description("Show current session status")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isVrekoInitialized(cwd))) {
					console.log(chalk.yellow("🦎 Vreko not initialized"));
					console.log(chalk.gray("Run: vr init"));
					process.exit(1);
				}

				// Try service-first for session status
				let currentSession: SessionState | null = null;
				try {
					const CONNECT_TIMEOUT_MS = 3000;
					// Use a clearable timer so the race loser doesn't keep the event loop alive
					let connectTimeoutId: NodeJS.Timeout | undefined;
					const client = await Promise.race([
						connectToDaemon(),
						new Promise<never>((_, reject) => {
							connectTimeoutId = setTimeout(
								() => reject(new Error("Service connection timed out")),
								CONNECT_TIMEOUT_MS,
							);
						}),
					]).finally(() => clearTimeout(connectTimeoutId));
					const response2 = await client.session.current({ workspacePath: cwd });
					const s2 = response2;
					if (s2) {
						currentSession = {
							id: s2.id,
							startedAt: s2.startedAt,
							snapshotCount: s2.snapshotIds?.length ?? 0,
						};
					}
				} catch (err: unknown) {
					const msg = err instanceof Error ? err.message : String(err);
					console.warn(`⚠ Service unavailable  -  showing local session state. (${msg})`);
					currentSession = await getCurrentSession(cwd);
				}

				if (!currentSession) {
					if (options.json) {
						console.log(JSON.stringify({ active: false }, null, 2));
					} else {
						console.log(chalk.yellow("No active session"));
						console.log(chalk.gray("Run: vr session start [task]"));
					}
					return;
				}

				if (options.json) {
					console.log(JSON.stringify({ active: true, ...currentSession }, null, 2));
					return;
				}
				console.log(chalk.cyan("Active Session:"));
				console.log();
				console.log(`  ID:        ${chalk.gray(currentSession.id.substring(0, 8))}`);
				if (currentSession.task) {
					console.log(`  Task:      ${currentSession.task}`);
				}
				console.log(`  Started:   ${formatTimeAgo(currentSession.startedAt)}`);
				console.log(`  Snapshots: ${currentSession.snapshotCount}`);
				console.log(`  Duration:  ${formatDuration(currentSession.startedAt)}`);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			} finally {
				disconnectFromDaemon();
			}
		});

	session
		.command("end")
		.description("End the current session")
		.option("-m, --message <message>", "Session end message/summary")
		.option("-l, --learning <text>", "Add a learning (can be used multiple times)", [])
		.option("--ceremony [level]", "Validate before close: quick, standard, comprehensive")
		.option("--outcome <type>", "Session outcome: completed, abandoned, blocked", "completed")
		.option("--force", "Clear stuck session unconditionally regardless of service state")
		.option("--no-tui", "Use plain text ceremony output (for scripts/CI)")
		.action(async (options) => {
			const cwd = process.cwd();

			if (options.force) {
				try {
					const stuck = await getCurrentSession(cwd);
					if (stuck) {
						await archiveSession(stuck, cwd, options.message);
					}
				} catch (err: unknown) {
					const msg = err instanceof Error ? err.message : String(err);
					console.warn(`⚠ Could not read session before clearing  -  forcing delete anyway. (${msg})`);
				}
				try {
					await endCurrentSession(cwd);
				} catch {
					// best-effort delete
				}
				console.log("Session cleared.");
				return;
			}

			try {
				if (!(await isVrekoInitialized(cwd))) {
					console.log(chalk.yellow("🦎 Vreko not initialized"));
					console.log(chalk.gray("Run: vr init"));
					process.exit(1);
				}

				const currentSession = await getCurrentSession(cwd);

				if (!currentSession) {
					console.log(chalk.yellow("No active session"));
					return;
				}

				// Collect learnings if provided
				const learnings: string[] = Array.isArray(options.learning)
					? options.learning
					: options.learning
						? [options.learning]
						: [];

				// If learnings or ceremony requested, try to call service snap_end
				if (learnings.length > 0 || options.ceremony) {
					try {
						const { createServiceClient, connectServiceClient, isServiceRunning } = await import(
							"../service-adapter/local-service-adapter.js"
						);

						if (isServiceRunning()) {
							const client = createServiceClient();
							try {
								await connectServiceClient(client);

								if (learnings.length > 0) {
									console.log(chalk.gray(`Capturing ${learnings.length} learning(s)...`));
								}

								// CEREM-04: --ceremony renders real session summary via service session/review RPC
								if (options.ceremony) {
									try {
										const record = await client.call<Record<string, unknown>>("session/review", {
											workspacePath: cwd,
											sessionId: currentSession.id,
										});

										const { isInteractive } = await import("../ui/guards.js");
										const useTui =
											isInteractive() && cliState.renderMode === "ink" && !options.noTui;

										if (useTui) {
											const { render } = await import("ink");
											const React = await import("react");
											const { CeremonyView } = await import("../ui/ceremony/CeremonyView.js");
											const instance = render(
												React.createElement(CeremonyView, {
													record: record as
														| import("../ui/ceremony.js").CeremonyDisplayRecord
														| null,
												}),
											);
											await instance.waitUntilExit();
										} else {
											const { renderCeremony } = await import("../ui/ceremony.js");
											console.log(renderCeremony(record ?? null));
										}
									} catch {
										// session/review unavailable  -  show graceful fallback
										const { isInteractive } = await import("../ui/guards.js");
										const useTui =
											isInteractive() && cliState.renderMode === "ink" && !options.noTui;
										if (useTui) {
											const { render } = await import("ink");
											const React = await import("react");
											const { CeremonyView } = await import("../ui/ceremony/CeremonyView.js");
											const instance = render(
												React.createElement(CeremonyView, { record: null }),
											);
											await instance.waitUntilExit();
										} else {
											const { renderCeremony } = await import("../ui/ceremony.js");
											console.log(renderCeremony(null));
										}
									}
								}
							} finally {
								client.close();
							}
						} else if (options.ceremony) {
							// Daemon not running  -  graceful fallback
							const { isInteractive } = await import("../ui/guards.js");
							const useTui = isInteractive() && cliState.renderMode === "ink" && !options.noTui;
							if (useTui) {
								const { render } = await import("ink");
								const React = await import("react");
								const { CeremonyView } = await import("../ui/ceremony/CeremonyView.js");
								const instance = render(React.createElement(CeremonyView, { record: null }));
								await instance.waitUntilExit();
							} else {
								const { renderCeremony } = await import("../ui/ceremony.js");
								console.log(renderCeremony(null));
							}
						}
					} catch (err: unknown) {
						const msg = err instanceof Error ? err.message : String(err);
						console.warn(
							`⚠ Session review unavailable (service offline)  -  rendering summary without AI insights. (${msg})`,
						);
						if (options.ceremony) {
							const { isInteractive } = await import("../ui/guards.js");
							const useTui = isInteractive() && cliState.renderMode === "ink" && !options.noTui;
							if (useTui) {
								const { render } = await import("ink");
								const React = await import("react");
								const { CeremonyView } = await import("../ui/ceremony/CeremonyView.js");
								const instance = render(React.createElement(CeremonyView, { record: null }));
								await instance.waitUntilExit();
							} else {
								const { renderCeremony } = await import("../ui/ceremony.js");
								console.log(renderCeremony(null));
							}
						}
					}
				}

				// Archive the session with learnings
				const sessionSummary = {
					...currentSession,
					endMessage: options.message,
					outcome: options.outcome,
					learnings: learnings.length > 0 ? learnings : undefined,
				};

				await archiveSession(sessionSummary, cwd, options.message);
				await endCurrentSession(cwd);

				if (currentSession.id) {
					try {
						const { isServiceRunning, createServiceClient, connectServiceClient } = await import(
							"../service-adapter/local-service-adapter.js"
						);
						const { endSessionViaDaemon } = await import("../service-adapter/local-service-adapter.js");
						if (isServiceRunning()) {
							const svcClient = createServiceClient();
							try {
								await connectServiceClient(svcClient);
								await endSessionViaDaemon(svcClient, currentSession.id, cwd);
							} finally {
								svcClient.close();
							}
						}
					} catch (err: unknown) {
						const msg = err instanceof Error ? err.message : String(err);
						console.warn(`⚠ Service notification failed  -  session closed locally. (${msg})`);
					}
				}

				const duration = formatDuration(currentSession.startedAt);
				console.log(`✓ Session ended (duration: ${duration})`);

				if (learnings.length > 0) {
					for (const learning of learnings) {
						console.log(`  Learning: ${learning}`);
					}
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			}
		});

	session
		.command("history")
		.description("Show session history")
		.option("-n, --number <count>", "Number of sessions to show", "10")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				if (!(await isVrekoInitialized(cwd))) {
					process.exit(1);
				}

				const { loadVrekoJsonl } = await import("../services/vreko-dir");
				const history = await loadVrekoJsonl<ArchivedSession>("session/history.jsonl", cwd);

				const count = Number.parseInt(options.number, 10);
				const recent = history.slice(-count).reverse();

				if (options.json) {
					console.log(JSON.stringify(recent, null, 2));
					return;
				}

				if (recent.length === 0) {
					console.log(chalk.yellow("No session history"));
					return;
				}
				console.log(chalk.cyan(`Session History (${recent.length}):`));

				for (const session of recent) {
					const duration = formatDurationFromDates(session.startedAt, session.endedAt);
					console.log(`  ${session.id.substring(0, 8)} (${duration})`);
					if (session.endMessage) {
						console.log(`    ${session.endMessage}`);
					}
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			}
		});

	return session;
}

// =============================================================================
// TYPES
// =============================================================================

interface ArchivedSession extends SessionState {
	endedAt: string;
	endMessage?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Archive a session to history
 */
async function archiveSession(session: SessionState, workspaceRoot: string, endMessage?: string): Promise<void> {
	const archived: ArchivedSession = {
		...session,
		endedAt: new Date().toISOString(),
		...(endMessage && { endMessage }),
	};

	await appendVrekoJsonl("session/history.jsonl", archived, workspaceRoot);
}

/**
 * Format time ago (e.g., "2 hours ago")
 */
function formatTimeAgo(isoDate: string): string {
	const date = new Date(isoDate);
	const now = new Date();
	const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (seconds < 60) {
		return "just now";
	}
	if (seconds < 3600) {
		return `${Math.floor(seconds / 60)} minutes ago`;
	}
	if (seconds < 86400) {
		return `${Math.floor(seconds / 3600)} hours ago`;
	}
	return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Format duration from start time to now
 */
function formatDuration(startIso: string): string {
	const start = new Date(startIso);
	const now = new Date();
	const seconds = Math.floor((now.getTime() - start.getTime()) / 1000);

	return formatSeconds(seconds);
}

/**
 * Format duration between two dates
 */
function formatDurationFromDates(startIso: string, endIso: string): string {
	const start = new Date(startIso);
	const end = new Date(endIso);
	const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);

	return formatSeconds(seconds);
}

/**
 * Format seconds to human readable
 */
function formatSeconds(seconds: number): string {
	if (seconds < 60) {
		return `${seconds}s`;
	}
	if (seconds < 3600) {
		return `${Math.floor(seconds / 60)}m`;
	}

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Format date for display
 */
function _formatDate(isoDate: string): string {
	const date = new Date(isoDate);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// =============================================================================
// EXPORTS
// =============================================================================

export { archiveSession, formatTimeAgo, formatDuration };
