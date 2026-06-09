/**
 * Service Install Command
 *
 * Install auto-start configuration for Vreko local service.
 *
 * Platform-specific:
 * - macOS: LaunchAgent plist
 * - Linux: systemd user service
 * - Windows: Startup shortcut
 *
 * @module commands/service/install
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { execa } from "execa";
import { print } from "../../utils/print.js";

export function createInstallCommand(): Command {
	return new Command("install").description("Install auto-start for Vreko local service").action(async () => {
		const platformName = platform();

		try {
			switch (platformName) {
				case "darwin":
					await installMacOS();
					break;
				case "linux":
					await installLinux();
					break;
				case "win32":
					await installWindows();
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
 * Install LaunchAgent on macOS
 */
async function installMacOS(): Promise<void> {
	const launchAgentsDir = join(homedir(), "Library", "LaunchAgents");
	const plistPath = join(launchAgentsDir, "dev.vreko.daemon.plist");

	// Ensure LaunchAgents directory exists
	if (!existsSync(launchAgentsDir)) {
		mkdirSync(launchAgentsDir, { recursive: true });
	}

	// Get vreko CLI path
	const vrekoPath = process.argv[1];

	// Create plist file
	const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>dev.vreko.daemon</string>
	<key>ProgramArguments</key>
	<array>
		<string>${process.execPath}</string>
		<string>${vrekoPath}</string>
		<string>service</string>
		<string>start</string>
		<string>--service</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>KeepAlive</key>
	<dict>
		<key>Crashed</key>
		<true/>
		<key>SuccessfulExit</key>
		<false/>
	</dict>
	<key>ThrottleInterval</key>
	<integer>10</integer>
	<key>StandardOutPath</key>
	<string>${join(homedir(), ".vreko", "service", "stdout.log")}</string>
	<key>StandardErrorPath</key>
	<string>${join(homedir(), ".vreko", "service", "stderr.log")}</string>
</dict>
</plist>
`;

	writeFileSync(plistPath, plistContent, "utf-8");

	// Load the LaunchAgent
	try {
		await execa("launchctl", ["load", plistPath]);
	} catch {
		/* intentionally empty */
	}
}

/**
 * Install systemd user service on Linux
 */
async function installLinux(): Promise<void> {
	const systemdDir = join(homedir(), ".config", "systemd", "user");
	const servicePath = join(systemdDir, "vreko.service");

	// Ensure systemd user directory exists
	if (!existsSync(systemdDir)) {
		mkdirSync(systemdDir, { recursive: true });
	}

	// Get vreko CLI path
	const vrekoPath = process.argv[1];

	// Create service file
	const serviceContent = `[Unit]
Description=Vreko Local Service
After=network.target

[Service]
Type=simple
ExecStart=${process.execPath} ${vrekoPath} service start
Restart=on-failure
RestartSec=10
StandardOutput=append:${join(homedir(), ".vreko", "service", "stdout.log")}
StandardError=append:${join(homedir(), ".vreko", "service", "stderr.log")}

[Install]
WantedBy=default.target
`;

	writeFileSync(servicePath, serviceContent, "utf-8");

	// Reload systemd and enable service
	try {
		await execa("systemctl", ["--user", "service-reload"]);

		await execa("systemctl", ["--user", "enable", "vreko.service"]);
	} catch {
		/* intentionally empty */
	}
}

/**
 * Install startup shortcut on Windows
 */
async function installWindows(): Promise<void> {
	const startupDir = join(
		process.env.APPDATA || homedir(),
		"Microsoft",
		"Windows",
		"Start Menu",
		"Programs",
		"Startup",
	);

	// Ensure startup directory exists
	if (!existsSync(startupDir)) {
		mkdirSync(startupDir, { recursive: true });
	}

	const vbsPath = join(startupDir, "VrekoService.vbs");
	const vrekoPath = process.argv[1];

	// Create VBScript to run silently (no console window)
	const vbsContent = `Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """${process.execPath}"" ""${vrekoPath}"" service start --service", 0, False
Set WshShell = Nothing
`;

	writeFileSync(vbsPath, vbsContent, "utf-8");
	print(`  Created: ${vbsPath}`);
}
