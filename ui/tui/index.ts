/**
 * Vreko TUI  -  barrel export + launchTui() entry function.
 *
 * launchTui() is the single entry point called by all commands that open the TUI.
 * It handles: PID lockfile, signal/error registration, gecko overlay, Ink render.
 * daemon close() lives in TuiApp useEffect cleanup  -  NOT in this file.
 * Pattern: commands/init/init-command.ts TTY guard + service client lifecycle
 */
import { readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Sentry } from "@vreko/sentry-privacy";
import chalk from "chalk";
import { render } from "ink";
import React from "react";
import { cliState } from "../../cli-state.js";
import { connectServiceClient, createServiceClient } from "../../service-adapter/local-service-adapter.js";

export type { PanelId, TuiAppProps } from "./TuiApp.js";
export { TuiApp } from "./TuiApp.js";

export interface LaunchTuiOptions {
	panel?: import("./TuiApp.js").PanelId;
	/** Alias for `panel`  -  preferred spelling in command call sites (TUI-01). */
	initialPanel?: import("./TuiApp.js").PanelId;
	/** When true, shows StatusPanel on the dashboard tab (used by `vr status`) */
	statusFocus?: boolean;
}

// =============================================================================
// MODULE-LEVEL STATE
// =============================================================================

const PID_FILE = join(homedir(), ".vreko", "tui.pid");

let isShuttingDown = false;
let inkInstance: { unmount: () => void; waitUntilExit: () => Promise<unknown> } | null = null;

// =============================================================================
// PID LOCKFILE HELPERS
// =============================================================================

async function acquirePidLock(): Promise<void> {
	try {
		const existing = await readFile(PID_FILE, "utf-8");
		const pid = Number.parseInt(existing.trim(), 10);
		try {
			process.kill(pid, 0); // throws ESRCH if PID does not exist
			console.error(`A Vreko TUI session is already running (PID ${pid}). Run \`vr stop\` first.`);
			process.exit(1);
		} catch {
			// Stale PID  -  file exists but process is dead. Fall through to overwrite.
		}
	} catch {
		// PID file does not exist  -  first launch. Proceed.
	}
	await writeFile(PID_FILE, String(process.pid), "utf-8");
}

async function releasePidLock(): Promise<void> {
	try {
		await unlink(PID_FILE);
	} catch {
		// Best effort  -  file may already be removed
	}
}

// =============================================================================
// SHUTDOWN CONTRACT
// =============================================================================

function shutdown(code: number): void {
	if (isShuttingDown) return;
	isShuttingDown = true;
	if (inkInstance) {
		inkInstance.unmount(); // triggers useEffect cleanup → daemon close() runs in TuiApp
	}
	process.stdout.write("\x1b[?25h"); // restore cursor
	process.stdout.write("\x1b[0m\n"); // reset color + newline
	releasePidLock().finally(() => process.exit(code));
}

/**
 * Launch the Vreko TUI for a given initial panel.
 * Machine mode: if cliState.renderMode !== "ink", this function does nothing (caller handles output).
 */
export async function launchTui(
	panelOrOptions: import("./TuiApp.js").PanelId | LaunchTuiOptions = "dashboard",
): Promise<void> {
	if (cliState.renderMode !== "ink") {
		// Machine mode: caller is responsible for JSON output
		return;
	}

	await acquirePidLock();

	// Register signal and error handlers before render
	for (const sig of ["SIGINT", "SIGTERM"] as const) {
		process.on(sig, () => shutdown(0));
	}
	process.on("uncaughtException", (err) => {
		Sentry.captureException(err);
		shutdown(1);
	});
	process.on("unhandledRejection", (reason) => {
		Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
		shutdown(1);
	});

	const opts: LaunchTuiOptions = typeof panelOrOptions === "string" ? { panel: panelOrOptions } : panelOrOptions;
	const panel = opts.panel ?? opts.initialPanel ?? "dashboard";
	const statusFocus = opts.statusFocus ?? false;

	const client = createServiceClient();
	try {
		await connectServiceClient(client);
	} catch (err) {
		console.error(
			chalk.red("Failed to connect to Vreko service:"),
			err instanceof Error ? err.message : String(err),
		);
		console.log(chalk.gray("Start the service with: vr service start"));
		await releasePidLock();
		process.exit(1);
	}

	// Gecko overlay  -  write before Ink render()
	const { detectOverlayCapability, writeGeckoOverlay, renderGeckoArt } = await import("../gecko/index.js");
	const capability = detectOverlayCapability();
	if (capability !== "none") {
		writeGeckoOverlay(() => renderGeckoArt(capability));
	}

	const { TuiApp } = await import("./TuiApp.js");
	const instance = render(React.createElement(TuiApp, { client, initialPanel: panel, statusFocus }), {
		exitOnCtrlC: false, // We manage shutdown ourselves
	});
	inkInstance = instance;

	try {
		await instance.waitUntilExit();
	} finally {
		inkInstance = null;
		await releasePidLock();
	}
}
