/**
 * Upgrade Command
 *
 * Implements vr upgrade - Check for and install CLI updates.
 * Self-updates the CLI to the latest version.
 *
 * @see cli_ui_imp.md Phase 6
 */

// Version is inlined at build time by tsup's define option
declare const __CLI_VERSION__: string;

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Command } from "commander";
import ora from "ora";

const execAsync = promisify(exec);

// =============================================================================
// CONSTANTS
// =============================================================================

const PACKAGE_NAME = "@vreko/cli";
const NPM_REGISTRY = "https://registry.npmjs.org";

// =============================================================================
// TYPES
// =============================================================================

interface VersionInfo {
	current: string;
	latest: string;
	updateAvailable: boolean;
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the upgrade command
 */
export function createUpgradeCommand(): Command {
	return new Command("upgrade")
		.description("Check for and install CLI updates")
		.option("--check", "Only check for updates, don't install")
		.option("--force", "Force reinstall even if up to date")
		.option("--canary", "Install latest canary/pre-release version")
		.action(async (options) => {
			try {
				const spinner = ora("Checking for updates...").start();

				// Get version info
				const versionInfo = await getVersionInfo(options.canary);

				spinner.stop();

				if (!versionInfo.updateAvailable && !options.force) {
					console.log(`✓ Already up to date (${versionInfo.current})`);
					return;
				}

				if (options.check) {
					if (versionInfo.updateAvailable) {
						console.log(`Update available: ${versionInfo.current} → ${versionInfo.latest}`);
						console.log("Run: vr upgrade");
					}
					return;
				}

				// Proceed with upgrade
				if (versionInfo.updateAvailable) {
					console.log(`Upgrading ${versionInfo.current} → ${versionInfo.latest}...`);
				} else {
					console.log(`Reinstalling ${versionInfo.current}...`);
				}

				await performUpgrade(options.canary);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Upgrade failed: ${message}`);
				process.exit(1);
			}
		});
}

// =============================================================================
// VERSION CHECKING
// =============================================================================

/**
 * Get current and latest version info
 */
async function getVersionInfo(canary = false): Promise<VersionInfo> {
	// Get current version from build-time inlined constant
	const current = __CLI_VERSION__;

	// Get latest version from npm registry
	let latest = current;
	try {
		const tag = canary ? "canary" : "latest";
		const response = await fetch(`${NPM_REGISTRY}/${PACKAGE_NAME}/${tag}`);

		if (response.ok) {
			const data = (await response.json()) as { version: string };
			latest = data.version;
		} else {
			// Fallback to npm view
			const { stdout } = await execAsync(`npm view ${PACKAGE_NAME}${canary ? "@canary" : ""} version`);
			latest = stdout.trim();
		}
	} catch {
		// Keep current as latest (can't check)
	}

	return {
		current,
		latest,
		updateAvailable: compareVersions(latest, current) > 0,
	};
}

/**
 * Compare two semantic versions
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
	const partsA = a.replace(/^v/, "").split(".").map(Number);
	const partsB = b.replace(/^v/, "").split(".").map(Number);

	for (let i = 0; i < 3; i++) {
		const partA = partsA[i] || 0;
		const partB = partsB[i] || 0;

		if (partA > partB) {
			return 1;
		}
		if (partA < partB) {
			return -1;
		}
	}

	return 0;
}

// =============================================================================
// UPGRADE EXECUTION
// =============================================================================

/**
 * Perform the upgrade
 */
async function performUpgrade(canary = false): Promise<void> {
	const spinner = ora("Installing update...").start();

	try {
		// Detect package manager
		const packageManager = await detectPackageManager();

		// Build install command
		const tag = canary ? "canary" : "latest";
		let command: string;

		switch (packageManager) {
			case "pnpm":
				command = `pnpm add -g ${PACKAGE_NAME}@${tag}`;
				break;
			case "yarn":
				command = `yarn global add ${PACKAGE_NAME}@${tag}`;
				break;
			case "bun":
				command = `bun add -g ${PACKAGE_NAME}@${tag}`;
				break;
			default:
				command = `npm install -g ${PACKAGE_NAME}@${tag}`;
		}

		spinner.text = `Running: ${command}`;

		const { stderr } = await execAsync(command);

		// Check for errors in stderr (npm sometimes outputs warnings there)
		if (stderr?.includes("ERR!")) {
			throw new Error(stderr);
		}

		spinner.succeed("Update installed");
	} catch (error) {
		spinner.fail("Installation failed");
		throw error;
	}
}

/**
 * Detect which package manager was used to install the CLI
 */
async function detectPackageManager(): Promise<"npm" | "pnpm" | "yarn" | "bun"> {
	// Check for pnpm
	try {
		await execAsync("pnpm --version");
		const { stdout } = await execAsync("pnpm list -g @vreko/cli 2>/dev/null || true");
		if (stdout.includes("@vreko/cli")) {
			return "pnpm";
		}
	} catch {
		// Not pnpm
	}

	// Check for yarn
	try {
		await execAsync("yarn --version");
		const { stdout } = await execAsync("yarn global list 2>/dev/null || true");
		if (stdout.includes("@vreko/cli")) {
			return "yarn";
		}
	} catch {
		// Not yarn
	}

	// Check for bun
	try {
		await execAsync("bun --version");
		return "bun"; // Assume bun if available
	} catch {
		// Not bun
	}

	// Default to npm
	return "npm";
}

// =============================================================================
// EXPORTS
// =============================================================================

export { getVersionInfo, compareVersions, type VersionInfo };
