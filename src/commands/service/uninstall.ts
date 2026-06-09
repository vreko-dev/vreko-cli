/**
 * Service Uninstall Command
 *
 * Remove auto-start configuration for Vreko local service.
 *
 * @module commands/service/uninstall
 */

import { existsSync, unlinkSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { execa } from "execa";
import { print } from "../../utils/print.js";

export function createUninstallCommand(): Command {
	return new Command("uninstall").description("Remove auto-start for Vreko local service").action(async () => {
		const platformName = platform();

		try {
			switch (platformName) {
				case "darwin":
					await uninstallMacOS();
					break;
				case "linux":
					await uninstallLinux();
					break;
				case "win32":
					await uninstallWindows();
					break;
				default:
					throw new Error(`Unsupported platform: ${platformName}`);
			}
		} catch (_err) {
			process.exit(1);
		}
	});
}

/**
 * Uninstall LaunchAgent on macOS
 */
async function uninstallMacOS(): Promise<void> {
	const plistPath = join(homedir(), "Library", "LaunchAgents", "dev.vreko.daemon.plist");

	if (!existsSync(plistPath)) {
		return;
	}

	// Unload the LaunchAgent
	try {
		await execa("launchctl", ["unload", plistPath]);
	} catch {
		/* intentionally empty */
	}

	// Remove plist file
	unlinkSync(plistPath);
}

/**
 * Uninstall systemd user service on Linux
 */
async function uninstallLinux(): Promise<void> {
	const servicePath = join(homedir(), ".config", "systemd", "user", "vreko.service");

	if (!existsSync(servicePath)) {
		return;
	}

	// Disable and stop service
	try {
		await execa("systemctl", ["--user", "disable", "vreko.service"]);

		await execa("systemctl", ["--user", "stop", "vreko.service"]);

		await execa("systemctl", ["--user", "service-reload"]);
	} catch {
		/* intentionally empty */
	}

	// Remove service file
	unlinkSync(servicePath);
}

/**
 * Uninstall startup shortcut on Windows
 */
async function uninstallWindows(): Promise<void> {
	const vbsPath = join(
		process.env.APPDATA || homedir(),
		"Microsoft",
		"Windows",
		"Start Menu",
		"Programs",
		"Startup",
		"VrekoService.vbs",
	);

	if (!existsSync(vbsPath)) {
		return;
	}

	// Remove VBScript
	unlinkSync(vbsPath);
	print(`  Removed: ${vbsPath}`);
}
