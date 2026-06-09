/**
 * Service Start Command
 *
 * Start the Vreko local service (service).
 * Can run in foreground (for debugging) or background (service mode).
 *
 * @module commands/service/start
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { isServiceHealthy } from "../../service-adapter/local-service-adapter.js";

/**
 * Resolve the local-service service binary path.
 * The CLI binary sits at <workspace>/apps/cli/dist/index.js;
 * we navigate to the workspace root and find apps/local-service/dist/main.js.
 */
function resolveVrekodBin(): string {
	// import.meta.url is baked into the bundle by tsup and always points to the
	// compiled dist/index.js  -  unlike process.argv[1] which points to whatever
	// shim launched the process (e.g. a globally-installed /usr/local/bin/vreko).
	const bundleFile = fileURLToPath(import.meta.url);
	// dist/index.js → apps/cli/dist → apps/cli → apps → workspace root
	const workspaceRoot = resolve(dirname(bundleFile), "../../..");
	const bin = join(workspaceRoot, "apps", "local-service", "dist", "main.js");
	if (!existsSync(bin)) {
		throw new Error(`Cannot find service binary at ${bin}.\nRun 'pnpm --filter @vreko/local-service build' first.`);
	}
	return bin;
}

export function createStartCommand(): Command {
	return new Command("start")
		.description("Start the Vreko local service")
		.option("-d, --service", "Run service in background (service mode)")
		.option("-t, --idle-timeout <minutes>", "Shutdown after idle (default: 240)", "240")
		.action(async (options) => {
			// Check if already running
			if (await isServiceHealthy()) {
				return;
			}

			const vrekodArgs = ["--idle-timeout", options.idleTimeout];
			const vrekodBin = resolveVrekodBin();

			if (options.service) {
				const child = spawn(process.execPath, [vrekodBin, ...vrekodArgs], {
					detached: true,
					stdio: "ignore",
				});

				child.unref();

				// Wait for socket to appear
				const maxWait = 5000;
				const start = Date.now();

				try {
					await new Promise<void>((resolve, reject) => {
						const check = async () => {
							if (await isServiceHealthy()) {
								resolve();
								return;
							}
							if (Date.now() - start > maxWait) {
								reject(new Error("Service failed to start within timeout"));
								return;
							}
							setTimeout(() => {
								void check();
							}, 100);
						};
						setTimeout(() => {
							void check();
						}, 100);
					});
				} catch (_err) {
					process.exit(1);
				}

				return;
			}

			const child = spawn(process.execPath, [vrekodBin, ...vrekodArgs], {
				stdio: "inherit",
			});

			try {
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
			} catch (_err) {
				process.exit(1);
			}
		});
}
