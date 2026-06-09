/**
 * Daemon Launch Helpers
 *
 * Shared lifecycle helper for starting the Vreko daemon in detached mode.
 * Used by both `vr start` and `vr daemon start` so the launcher logic stays
 * centralized and thin-client commands do not shell into one another.
 *
 * @module services/daemon-launch
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isServiceHealthy, readServicePid } from "../service-adapter/local-service-adapter.js";

export interface StartDaemonOptions {
	idleTimeout: string;
	maxWaitMs?: number;
	logToFile?: boolean;
}

function resolveVrekodBin(): string {
	const bundleFile = fileURLToPath(import.meta.url);
	const workspaceRoot = resolve(dirname(bundleFile), "../../..");
	const bin = join(workspaceRoot, "apps", "local-service", "dist", "main.js");
	if (!existsSync(bin)) {
		throw new Error(`Cannot find service binary at ${bin}.\nRun 'pnpm --filter @vreko/local-service build' first.`);
	}
	return bin;
}

function shouldUseDoppler(): boolean {
	try {
		execSync("which doppler", { stdio: "ignore" });
		const project = execSync("doppler configure get project --plain", {
			stdio: "pipe",
			encoding: "utf-8",
			timeout: 5000,
		}).trim();
		const config = execSync("doppler configure get config --plain", {
			stdio: "pipe",
			encoding: "utf-8",
			timeout: 5000,
		}).trim();
		return Boolean(project && config);
	} catch {
		return false;
	}
}

async function waitForDaemonHealthy(maxWaitMs: number): Promise<void> {
	const start = Date.now();

	await new Promise<void>((resolve, reject) => {
		const check = async () => {
			if (await isServiceHealthy()) {
				resolve();
				return;
			}
			if (Date.now() - start > maxWaitMs) {
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
}

export async function startDaemonDetached(options: StartDaemonOptions): Promise<number | null> {
	const vrekodBin = resolveVrekodBin();
	const vrekodArgs = ["--idle-timeout", options.idleTimeout];
	const useDoppler = shouldUseDoppler();

	const logDir = join(homedir(), ".vreko", "daemon");
	const logPath = join(logDir, "daemon.log");
	mkdirSync(logDir, { recursive: true });

	const logFd = openSync(logPath, "a");
	const spawnArgs = useDoppler
		? ["run", "--", process.execPath, vrekodBin, ...vrekodArgs]
		: [vrekodBin, ...vrekodArgs];
	const spawnCmd = useDoppler ? "doppler" : process.execPath;

	const child = spawn(spawnCmd, spawnArgs, {
		detached: true,
		stdio: ["ignore", logFd, logFd],
	});

	child.unref();

	await waitForDaemonHealthy(options.maxWaitMs ?? 5000);
	return readServicePid();
}
