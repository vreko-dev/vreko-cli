/**
 * vr start  -  start the Vreko service and open the TUI dashboard.
 *
 * Idempotent: if service already running, skips start and opens TUI.
 * Machine mode (VREKO_PLAIN=1 or !TTY): starts service silently, outputs JSON status.
 *
 * Security note (T-21-04-04): execSync calls below use only hardcoded string literals
 * ('vreko service start'). No user-controlled input is interpolated. This matches the
 * established codebase pattern in index.ts lines 366-377. No injection risk.
 *
 * @module commands/start
 */
import type { BootProfileType } from "@vreko/contracts/local-service";
import { StartStatusOutput } from "@vreko/contracts/local-service";
import chalk from "chalk";
import { Command } from "commander";
import { cliState } from "../cli-state.js";
import { isServiceHealthy } from "../service-adapter/local-service-adapter.js";
import { startDaemonDetached } from "../services/daemon-launch.js";
import { connectToDaemon } from "../services/service-client.js";
import { buildStartTasks } from "../ui/start-tasks/index.js";

export function createVrStartCommand(): Command {
	return new Command("start")
		.description("Start the Vreko service and open the dashboard")
		.option("--service-only", "Start service without opening TUI")
		.action(async (options) => {
			const alreadyRunning = await isServiceHealthy();
			const isJson = cliState.renderMode === "json";

			if (!alreadyRunning) {
				if (!isJson && process.stdout.isTTY) {
					process.stdout.write(`${chalk.gray("Starting Vreko service...")}\n`);
				}
				try {
					await startDaemonDetached({ idleTimeout: "240", maxWaitMs: 5000 });
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					if (!isJson && process.stdout.isTTY) {
						console.error(chalk.red("Failed to start service:"), msg);
					} else {
						process.stdout.write(`${JSON.stringify(StartStatusOutput.parse({ ok: false, error: msg }))}\n`);
					}
					process.exit(1);
				}
			}

			// Connect to daemon to read the boot profile from initialize() response.
			// buildStartTasks MUST be called AFTER this  -  profile is undefined before init.
			// T-31-04-02: 5000ms timeout per DAEMON-04; WARM_RETURN fallback for failed connections.
			let bootProfile: BootProfileType = "WARM_RETURN"; // safe default
			try {
				const client = await connectToDaemon();
				// The daemon's initialize response includes bootProfile (optional field per contract).
				// VrekoLocalClient.initialize() return type omits it; cast via unknown for extraction.
				const initResp = (await client.initialize({
					protocolVersion: "1.0.0",
					clientInfo: { name: "@vreko/cli", version: "1.0.0" },
				})) as unknown as { bootProfile?: BootProfileType };
				if (initResp.bootProfile) {
					bootProfile = initResp.bootProfile;
				}
			} catch {
				// Connection failed  -  use WARM_RETURN default (minimal task set, most common return)
			}

			if (options.serviceOnly) {
				if (isJson) {
					process.stdout.write(
						`${JSON.stringify(StartStatusOutput.parse({ ok: true, serviceRunning: true, bootProfile, tui: false }))}\n`,
					);
				} else {
					process.stdout.write(
						`${chalk.green(alreadyRunning ? "Service already running." : "Service started.")}\n`,
					);
				}
				return;
			}

			if (isJson) {
				process.stdout.write(
					`${JSON.stringify(StartStatusOutput.parse({ ok: true, serviceRunning: true, bootProfile, tui: false }))}\n`,
				);
				return;
			}

			// In interactive TTY mode, display the profile-aware task tree before launching TUI.
			// Use cliState.renderMode (not raw isTTY) so CI=1 with a pseudo-TTY is treated as
			// machine mode  -  matching the getRenderMode() contract in guards.ts.
			if (cliState.renderMode === "ink") {
				await buildStartTasks(bootProfile).run();
			}

			// Open TUI dashboard
			const { launchTui } = await import("../ui/tui/index.js");
			await launchTui("dashboard");
		});
}
