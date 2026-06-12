/**
 * Protect Command
 *
 * Implements vr protect add/remove/list - Manage file protection.
 * Protected files are stored in .vreko/protected.json
 *
 * @see implementation_plan.md Section 1.2
 */

import { access, constants } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import { Command } from "commander";

import { getProtectedFiles, isVrekoInitialized, type ProtectedFile, saveProtectedFiles } from "../services/vreko-dir";

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the protect command with subcommands
 */
export function createProtectCommand(): Command {
	const protect = new Command("protect").description("Manage file protection");

	protect
		.command("add")
		.description("Add a file or pattern to protection")
		.argument("<pattern>", "File path or glob pattern to protect")
		.option("-r, --reason <reason>", "Reason for protection")
		.action(async (pattern: string, options) => {
			const cwd = process.cwd();

			try {
				// Check if initialized
				if (!(await isVrekoInitialized(cwd))) {
					console.log(chalk.yellow("Vreko not initialized in this workspace"));
					console.log(chalk.gray("Run: vr init"));
					process.exit(1);
				}

				// Get current protected files
				const protectedFiles = await getProtectedFiles(cwd);

				// Check if already protected
				const existing = protectedFiles.find((f) => f.pattern === pattern);
				if (existing) {
					console.log(chalk.yellow(`Already protected: ${pattern}`));
					return;
				}

				// Validate pattern exists (for exact paths, not globs)
				if (!pattern.includes("*") && !pattern.includes("**")) {
					try {
						await access(join(cwd, pattern), constants.F_OK);
					} catch {
						console.log(chalk.yellow(`Warning: File not found: ${pattern}`));
						console.log(chalk.gray("Protection will still be added for future files matching this path."));
					}
				}

				// Add protection
				const newProtection: ProtectedFile = {
					pattern,
					addedAt: new Date().toISOString(),
					...(options.reason && { reason: options.reason }),
				};

				protectedFiles.push(newProtection);
				await saveProtectedFiles(protectedFiles, cwd);
				console.log(chalk.green("✓"), `Added protection: ${pattern}`);
				if (options.reason) {
					console.log(chalk.gray(`  Reason: ${options.reason}`));
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			}
		});

	protect
		.command("remove")
		.description("Remove a file or pattern from protection")
		.argument("<pattern>", "File path or glob pattern to unprotect")
		.action(async (pattern: string) => {
			const cwd = process.cwd();

			try {
				// Check if initialized
				if (!(await isVrekoInitialized(cwd))) {
					console.log(chalk.yellow("Vreko not initialized in this workspace"));
					console.log(chalk.gray("Run: vr init"));
					process.exit(1);
				}

				// Get current protected files
				const protectedFiles = await getProtectedFiles(cwd);

				// Find and remove
				const index = protectedFiles.findIndex((f) => f.pattern === pattern);
				if (index === -1) {
					console.log(chalk.yellow(`Not protected: ${pattern}`));
					return;
				}

				protectedFiles.splice(index, 1);
				await saveProtectedFiles(protectedFiles, cwd);
				console.log(chalk.green("✓"), `Removed protection: ${pattern}`);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			}
		});

	protect
		.command("list")
		.description("List all protected files")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				// Check if initialized
				if (!(await isVrekoInitialized(cwd))) {
					console.log(chalk.yellow("Vreko not initialized in this workspace"));
					console.log(chalk.gray("Run: vr init"));
					process.exit(1);
				}

				const protectedFiles = await getProtectedFiles(cwd);

				if (options.json) {
					console.log(JSON.stringify(protectedFiles, null, 2));
					return;
				}

				if (protectedFiles.length === 0) {
					console.log(chalk.yellow("No files protected"));
					console.log(chalk.gray("Run: vr protect add <pattern>"));
					return;
				}

				console.log(chalk.cyan("Protected files:"));
				console.log();
				for (const file of protectedFiles) {
					console.log(chalk.green("•"), file.pattern);
					if (file.reason) {
						console.log(chalk.gray(`  Reason: ${file.reason}`));
					}
				}
				console.log();
				console.log(chalk.gray(`Total: ${protectedFiles.length} protected`));
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			}
		});

	// Add shorthand for common protections
	protect
		.command("env")
		.description("Protect all .env files")
		.action(async () => {
			const cwd = process.cwd();

			try {
				if (!(await isVrekoInitialized(cwd))) {
					console.log(chalk.yellow("Vreko not initialized in this workspace"));
					console.log(chalk.gray("Run: vr init"));
					process.exit(1);
				}

				const patterns = [".env", ".env.*", "*.env"];
				const protectedFiles = await getProtectedFiles(cwd);
				let added = 0;

				for (const pattern of patterns) {
					if (!protectedFiles.some((f) => f.pattern === pattern)) {
						protectedFiles.push({
							pattern,
							addedAt: new Date().toISOString(),
							reason: "Environment variables",
						});
						added++;
					}
				}

				if (added > 0) {
					await saveProtectedFiles(protectedFiles, cwd);
					console.log(chalk.green("✓"), `Added ${added} environment file patterns`);
				} else {
					console.log(chalk.yellow("Environment files already protected"));
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			}
		});

	protect
		.command("config")
		.description("Protect common configuration files")
		.action(async () => {
			const cwd = process.cwd();

			try {
				if (!(await isVrekoInitialized(cwd))) {
					console.log(chalk.yellow("Vreko not initialized in this workspace"));
					console.log(chalk.gray("Run: vr init"));
					process.exit(1);
				}

				const patterns = [
					"*.config.js",
					"*.config.ts",
					"*.config.mjs",
					"tsconfig.json",
					"package.json",
					"pnpm-lock.yaml",
					"yarn.lock",
					"package-lock.json",
				];

				const protectedFiles = await getProtectedFiles(cwd);
				let added = 0;

				for (const pattern of patterns) {
					if (!protectedFiles.some((f) => f.pattern === pattern)) {
						protectedFiles.push({
							pattern,
							addedAt: new Date().toISOString(),
							reason: "Configuration file",
						});
						added++;
					}
				}

				if (added > 0) {
					await saveProtectedFiles(protectedFiles, cwd);
					console.log(chalk.green("✓"), `Added ${added} configuration file patterns`);
				} else {
					console.log(chalk.yellow("Configuration files already protected"));
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`✗ Error: ${message}`);
				process.exit(1);
			}
		});

	return protect;
}

// =============================================================================
// EXPORTS
// =============================================================================

// formatDate now exported from ../utils (consolidated utility)
