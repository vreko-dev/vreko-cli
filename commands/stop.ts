/**
 * vr stop  -  graceful drain: end session, write ceremony, stop service.
 *
 * One-shot command, not a TUI (RESEARCH.md open question resolved).
 * Machine mode: outputs JSON ceremony summary.
 * Interactive mode: prints chalk ceremony to stdout, then exits.
 *
 * Security note (T-21-04-04): spawnSync calls below use only hardcoded command
 * arrays (['vreko', 'service', 'stop']). No user-controlled input is interpolated.
 * This matches the established codebase pattern. No injection risk.
 *
 * @module commands/stop
 */
import { spawnSync } from "node:child_process";
import chalk from "chalk";
import { Command } from "commander";
import { cliState } from "../cli-state.js";
import {
	connectServiceClient,
	createServiceClient,
	endSessionViaDaemon,
	isServiceHealthy,
} from "../service-adapter/local-service-adapter.js";
import { isInteractive } from "../ui/guards.js";

export function createVrStopCommand(): Command {
	return new Command("stop")
		.description("Gracefully drain the session and stop the Vreko service")
		.option("--no-ceremony", "Skip the closing ceremony output")
		.option("--no-tui", "Use plain text ceremony output (for scripts/CI)")
		.action(async (options) => {
			if (!(await isServiceHealthy())) {
				if (isInteractive()) {
					console.log(chalk.gray("Vreko service is not running."));
				} else {
					process.stdout.write(`${JSON.stringify({ ok: true, serviceWasRunning: false })}\n`);
				}
				return;
			}

			const client = createServiceClient();
			let ceremonyData: Record<string, unknown> | null = null;

			try {
				await connectServiceClient(client);

				// Find and gracefully end the active session if one exists
				try {
					const cwd = process.cwd();
					// Use the typed session.current() API (same pattern as session.ts command)
					const response = await client.session.current({ workspacePath: cwd });
					const activeSession = response;
					if (activeSession?.id) {
						if (isInteractive()) {
							process.stdout.write(`${chalk.gray("Ending session...")}\n`);
						}
						const endResult = await endSessionViaDaemon(client, activeSession.id, cwd);
						if (endResult.success) {
							ceremonyData = endResult as Record<string, unknown>;
						}
					}
				} catch {
					// No active session or session IPC unavailable  -  proceed to service stop
				}
			} catch (err) {
				if (isInteractive()) {
					console.error(
						chalk.yellow("Warning: could not connect to service for drain:"),
						err instanceof Error ? err.message : String(err),
					);
				}
			} finally {
				try {
					client.close();
				} catch {
					// best effort
				}
			}

			// Stop service  -  hardcoded args array only, no injection risk (T-21-04-04)
			if (isInteractive()) {
				process.stdout.write(`${chalk.gray("Stopping service...")}\n`);
			}
			try {
				spawnSync("vreko", ["service", "stop"], { stdio: isInteractive() ? "inherit" : "pipe" });
			} catch {
				// Service stop may fail if already stopped  -  not an error
			}

			// Output ceremony
			if (!options.noCeremony) {
				if (!isInteractive()) {
					process.stdout.write(`${JSON.stringify({ ok: true, ceremony: ceremonyData })}\n`);
				} else if (ceremonyData) {
					const useTui = isInteractive() && cliState.renderMode === "ink" && !options.noTui;

					if (useTui) {
						try {
							const { render } = await import("ink");
							const React = await import("react");
							const { CeremonyView } = await import("../ui/ceremony/CeremonyView.js");
							const instance = render(
								React.createElement(CeremonyView, {
									record: ceremonyData as import("../ui/ceremony.js").CeremonyDisplayRecord,
								}),
							);
							await instance.waitUntilExit();
						} catch {
							// Fallback if Ink render fails
							console.log(chalk.green("\nSession complete."));
						}
					} else {
						try {
							const { renderCeremony } = await import("../ui/ceremony.js");
							console.log(renderCeremony(ceremonyData as never));
						} catch {
							console.log(chalk.green("\nSession complete."));
						}
					}
				} else if (isInteractive()) {
					console.log(chalk.green("Vreko stopped."));
				}
			}
		});
}
