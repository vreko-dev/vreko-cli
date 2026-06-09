/**
 * ACP CLI Command
 *
 * Implements ACP server management for editor integration:
 * - `vr acp serve` - Start ACP server for Zed/JetBrains integration
 * - `vr acp info` - Print ACP agent metadata and configuration examples
 * - `vr acp configure` - Auto-configure ACP for supported editors
 *
 * @module commands/acp
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";
import { createCommand } from "commander";
import { ACPServer, toolRegistry } from "../acp";

// =============================================================================
// VERSION
// =============================================================================

async function getPackageVersion(): Promise<string> {
	try {
		const { fileURLToPath } = await import("node:url");
		const __dirname = fileURLToPath(new URL(".", import.meta.url));
		const pkgPath = join(__dirname, "../../package.json");
		if (existsSync(pkgPath)) {
			const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
			return pkg.version;
		}
	} catch {
		// Ignore
	}
	return "1.0.0";
}

// =============================================================================
// ACP COMMAND
// =============================================================================

export function createAcpCommand() {
	const cmd = createCommand("acp");

	cmd.description("Agent Communication Protocol (ACP) integration for editor agents (Zed, JetBrains, Neovim)");

	// ─────────────────────────────────────────────────────────────────────────
	// serve - Start ACP server
	// ─────────────────────────────────────────────────────────────────────────

	cmd.command("serve")
		.description("Start ACP server for editor integration (stdio transport)")
		.option("-w, --workspace <path>", "Workspace path", process.cwd())
		.option("--audit <path>", "Audit log path")
		.option("-v, --verbose", "Enable verbose logging")
		.action(async (options) => {
			const server = new ACPServer({
				workspacePath: options.workspace,
				auditPath: options.audit,
				verbose: options.verbose,
			});

			// Handle graceful shutdown
			process.on("SIGINT", () => server.shutdown());
			process.on("SIGTERM", () => server.shutdown());

			server.on("shutdown", () => {
				process.exit(0);
			});

			// Start server on stdin/stdout
			server.start(process.stdin, process.stdout);
		});

	// ─────────────────────────────────────────────────────────────────────────
	// info - Print ACP agent metadata
	// ─────────────────────────────────────────────────────────────────────────

	cmd.command("info")
		.description("Print ACP agent metadata and configuration examples")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			const version = await getPackageVersion();

			const info = {
				name: "vreko",
				version,
				description: "AI-assisted code protection agent",
				capabilities: {
					tools: toolRegistry.map((t) => ({
						name: t.name,
						description: t.description,
					})),
					sessions: true,
					streaming: false,
				},
				config: {
					zed: {
						agent_servers: {
							vreko: {
								command: "vreko",
								args: ["acp", "serve"],
							},
						},
					},
					jetbrains: {
						agent_servers: {
							vreko: {
								command: "vreko",
								args: ["acp", "serve"],
								use_idea_mcp: true,
							},
						},
					},
				},
			};

			if (options.json) {
				console.log(JSON.stringify(info, null, 2));
				return;
			}

			// Pretty output
			console.log();
			console.log(chalk.bold.cyan("Vreko ACP Agent") + chalk.gray(` v${version}`));
			console.log(chalk.white("AI-assisted code protection for any ACP editor"));
			console.log();

			console.log(chalk.bold("Available Tools:"));
			for (const tool of info.capabilities.tools) {
				console.log(`  ${chalk.green("•")} ${chalk.cyan(tool.name)}: ${tool.description}`);
			}

			console.log();
			console.log(chalk.bold("Configuration Examples:"));

			console.log();
			console.log(chalk.yellow("Zed") + chalk.gray(" (~/.config/zed/settings.json):"));
			console.log(chalk.gray(JSON.stringify(info.config.zed, null, 2)));

			console.log();
			console.log(chalk.yellow("JetBrains") + chalk.gray(" (~/.config/jetbrains/ai-assistant.json):"));
			console.log(chalk.gray(JSON.stringify(info.config.jetbrains, null, 2)));

			console.log();
			console.log(chalk.gray("Run: vreko acp configure --zed  # Auto-configure for Zed"));
			console.log();
		});

	// ─────────────────────────────────────────────────────────────────────────
	// configure - Auto-configure ACP for editors
	// ─────────────────────────────────────────────────────────────────────────

	cmd.command("configure")
		.description("Auto-configure ACP for supported editors")
		.option("--zed", "Configure for Zed")
		.option("--jetbrains", "Configure for JetBrains")
		.option("--all", "Configure for all detected editors")
		.option("--dry-run", "Show what would be configured without making changes")
		.action(async (options) => {
			const editors: Array<{
				name: string;
				detected: boolean;
				configPath: string;
				configure: () => Promise<void>;
			}> = [];

			// Detect Zed
			if (options.zed || options.all) {
				const zedConfigPath = join(homedir(), ".config", "zed", "settings.json");
				editors.push({
					name: "Zed",
					detected: existsSync(join(homedir(), ".config", "zed")),
					configPath: zedConfigPath,
					configure: async () => configureZed(zedConfigPath),
				});
			}

			// Detect JetBrains
			if (options.jetbrains || options.all) {
				const jetbrainsConfigPath = join(homedir(), ".config", "jetbrains", "ai-assistant.json");
				editors.push({
					name: "JetBrains",
					detected: existsSync(join(homedir(), ".config", "jetbrains")),
					configPath: jetbrainsConfigPath,
					configure: async () => configureJetBrains(jetbrainsConfigPath),
				});
			}

			if (editors.length === 0) {
				console.log(chalk.yellow("No editors specified. Use --zed, --jetbrains, or --all"));
				return;
			}

			for (const editor of editors) {
				if (!editor.detected && !options.all) {
					console.log(chalk.yellow(`⚠ ${editor.name} not detected, skipping`));
					continue;
				}

				if (options.dryRun) {
					console.log(chalk.cyan(`[dry-run] Would configure ${editor.name}`));
					console.log(chalk.gray(`  Config: ${editor.configPath}`));
					continue;
				}

				try {
					await editor.configure();
					console.log(chalk.green(`✓ ${editor.name} configured`));
					console.log(chalk.gray(`  Config: ${editor.configPath}`));
				} catch (error) {
					console.log(
						chalk.red(
							`✗ Failed to configure ${editor.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
						),
					);
				}
			}
		});

	return cmd;
}

// =============================================================================
// CONFIGURATION HELPERS
// =============================================================================

async function configureZed(configPath: string): Promise<void> {
	await addAgentToConfig(configPath, "vreko", {
		command: "vreko",
		args: ["acp", "serve"],
	});
}

async function configureJetBrains(configPath: string): Promise<void> {
	await addAgentToConfig(configPath, "vreko", {
		command: "vreko",
		args: ["acp", "serve"],
		use_idea_mcp: true,
	});
}

async function addAgentToConfig(
	configPath: string,
	agentName: string,
	agentConfig: Record<string, unknown>,
): Promise<void> {
	const dir = join(configPath, "..");
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	let config: Record<string, unknown> = {};
	if (existsSync(configPath)) {
		const content = readFileSync(configPath, "utf8");
		try {
			config = JSON.parse(content);
		} catch {
			// If parse fails, start fresh
		}
	}

	if (!config.agent_servers) {
		config.agent_servers = {};
	}

	(config.agent_servers as Record<string, unknown>)[agentName] = agentConfig;

	writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// =============================================================================
// EXPORT
// =============================================================================

export const acpCommand = createAcpCommand();
