/**
 * Tools Command
 *
 * Implements vr tools configure - Auto-setup MCP for Cursor/Claude.
 * Refactored to use shared @vreko/mcp-config package.
 *
 * @see implementation_plan.md Section 1.2
 * @see mcp_companionship.md Part 3 for CLI specification
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as clack from "@clack/prompts";
import {
	type AIClientConfig,
	detectAIClients,
	detectWorkspaceConfig,
	getVrekoMCPConfig,
	repairClientConfig,
	type ValidationResult,
	validateClientConfig,
	writeClientConfig,
} from "@vreko/mcp-config";
import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

import { cliState } from "../cli-state.js";
import { getCredentials, isLoggedIn } from "../services/vreko-dir";
import { print } from "../utils/print.js";

// =============================================================================
// JSON OUTPUT TYPES (for --json flag)
// =============================================================================

/**
 * Result status for each client during configuration
 */
export type ClientConfigStatus = "configured" | "already_configured" | "not_installed" | "failed" | "skipped";

/**
 * JSON output format for `vr tools configure --json`
 * Used by VS Code extension to get structured results
 */
export interface ToolsConfigureJsonResult {
	success: boolean;
	clients: Record<string, ClientConfigStatus>;
	configured: string[];
	skipped: string[];
	notInstalled: string[];
	failed: string[];
	version: string;
	error?: string;
}

// =============================================================================
// COMMAND DEFINITION
// =============================================================================

/**
 * Create the tools command with subcommands
 */
export function createToolsCommand(): Command {
	const tools = new Command("tools").description("Configure AI tools");

	tools
		.command("configure")
		.description("Auto-setup MCP for Cursor, Claude, or other AI tools")
		.option("--cursor", "Configure for Cursor only")
		.option("--claude", "Configure for Claude Desktop only")
		.option("--windsurf", "Configure for Windsurf only")
		.option("--continue", "Configure for Continue only")
		.option("--vscode", "Configure for VS Code only")
		.option("--zed", "Configure for Zed only")
		.option("--cline", "Configure for Cline only")
		.option("--gemini", "Configure for Gemini/Antigravity only")
		.option("--aider", "Configure for Aider only")
		.option("--roo-code", "Configure for Roo Code only")
		.option("--qoder", "Configure for Qoder only")
		.option("--list", "List available tools")
		.option("--dry-run", "Show what would be configured without writing")
		.option("--force", "Reconfigure even if already set up")
		.option("-y, --yes", "Skip confirmation prompts (for CI/scripts)")
		.option("--non-interactive", "Run without prompts (alias for --yes, for programmatic use)")
		.option("--json", "Output structured JSON result (for extension integration)")
		.option("--api-key <key>", "API key for Pro features")
		.option("--npm", "Use npm-installed CLI via npx (recommended for npm users)")
		.option("--dev", "Use local development mode (direct node execution with inferred workspace)")
		.option("--remote", "Use remote MCP server instead of local service (requires API key)")
		.option("--workspace <path>", "Override workspace root path")

		.action(async (options) => {
			try {
				// --non-interactive is an alias for --yes; global --yes also bypasses prompts
				const skipPrompts = options.yes || options.nonInteractive || cliState.yes;
				const jsonOutput = options.json;

				if (options.list) {
					await listTools(jsonOutput);
					return;
				}

				// Determine which tools to configure
				const toolsToConfig: string[] = [];

				if (options.cursor) {
					toolsToConfig.push("cursor");
				}
				if (options.claude) {
					toolsToConfig.push("claude");
				}
				if (options.windsurf) {
					toolsToConfig.push("windsurf");
				}
				if (options.continue) {
					toolsToConfig.push("continue");
				}
				if (options.vscode) {
					toolsToConfig.push("vscode");
				}
				if (options.zed) {
					toolsToConfig.push("zed");
				}
				if (options.cline) {
					toolsToConfig.push("cline");
				}
				if (options.gemini) {
					toolsToConfig.push("gemini");
				}
				if (options.aider) {
					toolsToConfig.push("aider");
				}
				if (options["roo-code"] || options.rooCode) {
					toolsToConfig.push("roo-code");
				}
				if (options.qoder) {
					toolsToConfig.push("qoder");
				}

				// If no specific tool, auto-detect
				if (toolsToConfig.length === 0) {
					const result = await autoConfigureTools({
						dryRun: options.dryRun,
						force: options.force,
						skipPrompts,
						jsonOutput,
						apiKey: options.apiKey,
						devMode: options.dev,
						npmMode: options.npm,
						remoteMode: options.remote,
						workspaceOverride: options.workspace,
					});

					// Output JSON if requested
					if (jsonOutput) {
						print(JSON.stringify(result, null, 2));
					}
				} else {
					for (const tool of toolsToConfig) {
						await configureTool(
							tool,
							options.dryRun,
							skipPrompts,
							options.apiKey,
							options.dev,
							options.npm,
							options.workspace,
							options.remote,
						);
					}
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);

				// If JSON output requested, output error as JSON
				if (options.json) {
					const errorResult: ToolsConfigureJsonResult = {
						success: false,
						clients: {},
						configured: [],
						skipped: [],
						notInstalled: [],
						failed: [],
						version: getVersion(),
						error: message,
					};
					print(JSON.stringify(errorResult, null, 2));
					process.exit(1);
				}
				print(`✗ Error: ${message}`);
				process.exit(1);
			}
		});

	tools
		.command("status")
		.description("Check MCP configuration status")
		.option("--verbose", "Show detailed validation information")
		.action(async (options) => {
			await checkToolsStatus(options.verbose);
		});

	tools
		.command("validate")
		.description("Validate MCP configurations for all detected AI tools")
		.option("--verbose", "Show detailed validation issues")
		.action(async (options) => {
			await validateTools(options.verbose);
		});

	tools
		.command("repair")
		.description("Repair broken MCP configurations")
		.option("-y, --yes", "Skip confirmation prompts")
		.option("--workspace <path>", "Override workspace root path")
		.option("--api-key <key>", "API key for Pro features")
		.action(async (options) => {
			await repairTools(options.yes || cliState.yes, options.workspace, options.apiKey);
		});

	return tools;
}

// =============================================================================
// TOOL CONFIGURATION
// =============================================================================

/**
 * Get CLI version from package.json
 */
function getVersion(): string {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const pkg = require("../../package.json");
		return pkg.version || "0.0.0";
	} catch {
		return "0.0.0";
	}
}

/**
 * List available tools and their detection status
 */
async function listTools(jsonOutput = false): Promise<void> {
	const detection = detectAIClients();

	if (jsonOutput) {
		const configured = detection.detected.filter((c) => c.hasVreko);
		const result: ToolsConfigureJsonResult = {
			success: true,
			clients: configured.reduce(
				(acc, c) => {
					acc[c.name] = "already_configured";
					return acc;
				},
				{} as Record<string, ClientConfigStatus>,
			),
			configured: configured.map((c) => c.name),
			skipped: [],
			notInstalled: detection.clients.filter((c) => !c.exists).map((c) => c.name),
			failed: [],
			version: getVersion(),
		};
		print(JSON.stringify(result, null, 2));
		return;
	}

	if (detection.clients.length === 0) {
		print("No AI clients detected. Install Cursor, Claude, or another supported client.");
		return;
	}

	for (const client of detection.clients) {
		const status = client.exists
			? client.hasVreko
				? chalk.green("✓ Configured")
				: chalk.yellow("○ Needs setup")
			: chalk.gray("Not installed");
		print(`  ${client.displayName.padEnd(20)} ${status}`);
	}
}

/**
 * Options for autoConfigureTools
 */
interface AutoConfigureOptions {
	dryRun: boolean;
	force: boolean;
	skipPrompts: boolean;
	jsonOutput: boolean;
	apiKey?: string;
	devMode: boolean;
	npmMode: boolean;
	remoteMode?: boolean;
	workspaceOverride?: string;
}

/**
 * Auto-configure all detected tools
 * Returns JSON result for programmatic use (extension integration)
 */
async function autoConfigureTools(options: AutoConfigureOptions): Promise<ToolsConfigureJsonResult> {
	const {
		dryRun,
		force,
		skipPrompts,
		jsonOutput,
		apiKey: providedApiKey,
		devMode,
		npmMode,
		remoteMode,
		workspaceOverride,
	} = options;

	const result: ToolsConfigureJsonResult = {
		success: true,
		clients: {},
		configured: [],
		skipped: [],
		notInstalled: [],
		failed: [],
		version: getVersion(),
	};

	const detection = detectAIClients();

	// Track not-installed clients
	for (const client of detection.clients) {
		if (!client.exists) {
			result.notInstalled.push(client.name);
			result.clients[client.name] = "not_installed";
		}
	}

	if (detection.detected.length === 0) {
		if (!jsonOutput) {
			print(
				"No AI tools detected. Supported tools: Cursor, Claude Code, GitHub Copilot, Windsurf, Cline, and more.",
			);
		}
		return result;
	}

	// Determine what needs configuration
	const needsSetup = force ? detection.detected : detection.needsSetup;

	// Track already-configured clients
	for (const client of detection.detected) {
		if (client.hasVreko && !needsSetup.includes(client)) {
			result.skipped.push(client.name);
			result.clients[client.name] = "already_configured";
		}
	}

	if (needsSetup.length === 0) {
		if (!jsonOutput) {
			showNextSteps();
		}
		return result;
	}

	if (!jsonOutput) {
		print("Detected AI tools:");
		for (const client of detection.detected) {
			const status = client.hasVreko ? chalk.green("(configured)") : chalk.yellow("(needs setup)");
			print(`  ${client.displayName.padEnd(20)} ${status}`);
		}
	}

	// Interactive confirmation (unless --yes/--non-interactive flag is set)
	if (!skipPrompts && !jsonOutput) {
		const clientNames = needsSetup.map((c) => c.displayName).join(", ");
		const proceedResult = await clack.confirm({
			message: `Configure 🦎 Vreko for ${clientNames}?`,
			initialValue: true,
		});
		if (clack.isCancel(proceedResult)) {
			clack.cancel("Cancelled.");
			result.success = false;
			result.error = "User cancelled";
			return result;
		}
		if (!proceedResult) {
			result.success = false;
			result.error = "User cancelled";
			return result;
		}
	}

	// Get API key (from flag, env, login, or prompt)
	const apiKey = await resolveApiKey(providedApiKey, skipPrompts || jsonOutput);

	// Configure each tool that needs setup
	for (const client of needsSetup) {
		const configResult = await configureClientWithResult(
			client,
			dryRun,
			apiKey,
			devMode,
			npmMode,
			workspaceOverride,
			remoteMode,
		);

		if (configResult.success) {
			result.configured.push(client.name);
			result.clients[client.name] = "configured";
		} else {
			result.failed.push(client.name);
			result.clients[client.name] = "failed";
			result.success = false;
		}
	}

	if (!jsonOutput) {
		showNextSteps();
	}

	return result;
}

/**
 * Configure a specific tool by name
 */
async function configureTool(
	toolName: string,
	dryRun: boolean,
	skipPrompts = false,
	providedApiKey?: string,
	devMode = false,
	npmMode = false,
	workspaceOverride?: string,
	remoteMode = false,
): Promise<void> {
	const detection = detectAIClients();
	const client = detection.clients.find((c) => c.name === toolName);

	if (!client) {
		return;
	}

	if (!client.exists) {
		return;
	}

	// Get API key (from flag, env, login, or prompt)
	const apiKey = await resolveApiKey(providedApiKey, skipPrompts);

	await configureClient(client, dryRun, apiKey, devMode, npmMode, workspaceOverride, remoteMode);
	showNextSteps();
}

/**
 * Check if a config path is global (not workspace-specific)
 */
function isGlobalConfig(configPath: string): boolean {
	const home = homedir();
	return configPath.includes(home) && !configPath.includes(process.cwd());
}

/**
 * Configure a specific AI client
 */
async function configureClient(
	client: AIClientConfig,
	dryRun: boolean,
	apiKey?: string,
	devMode = false,
	npmMode = false,
	workspaceOverride?: string,
	remoteMode = false,
): Promise<void> {
	const spinner = ora(`Configuring ${client.displayName}...`).start();

	try {
		// CONFLICT DETECTION: Check for workspace-specific configs
		const workspaceRoot = workspaceOverride || findWorkspaceRoot(process.cwd());
		const workspaceConfig = detectWorkspaceConfig(workspaceRoot);

		// If workspace config exists and this is a global client config,
		// skip to prevent conflicts (workspace takes precedence).
		//
		// Exception  -  Qoder: Qoder reads BOTH the workspace .qoder-mcp-config.json
		// AND the global SharedClientCache/mcp.json. A broken global entry (e.g.,
		// "command": "snap" which is a shell alias invisible to spawned processes)
		// can silently override a correct workspace entry, causing "workspace
		// validation failed" errors. For Qoder, validate the global entry first:
		// if it’s broken, repair it with a remote HTTP fallback instead of skipping.
		// Resolve workspace root for dev mode or npm mode
		let localCliPath: string | undefined;
		let effectiveDevMode = devMode;
		let effectiveNpmMode = npmMode;

		if (workspaceConfig && isGlobalConfig(client.configPath)) {
			if (client.format === "qoder" && client.hasVreko) {
				const existingValidation = validateClientConfig(client);
				if (existingValidation.valid) {
					// Global Qoder config is valid  -  workspace takes precedence, skip
					spinner.info(`${client.displayName} workspace config detected (global config valid, skipping)`);
					return;
				}
				// Global config is broken  -  repair it with remote HTTP so it doesn't
				// interfere with the workspace stdio entry
				spinner.text = `Repairing broken global ${client.displayName} config...`;
				effectiveDevMode = false;
				effectiveNpmMode = false;
				localCliPath = undefined;
				// Fall through with remote HTTP config
			} else {
				spinner.info(`${client.displayName} workspace config detected`);
				return;
			}
		}

		if (effectiveDevMode) {
			// Find CLI dist path relative to workspace
			localCliPath = findCliDistPath(workspaceRoot);

			if (!localCliPath) {
				spinner.fail("Could not find CLI dist. Run 'pnpm build' first.");
				return;
			}

			spinner.text = `Configuring ${client.displayName} (dev mode)...`;
		} else if (effectiveNpmMode) {
			spinner.text = `Configuring ${client.displayName} (npm/npx mode)...`;
		}

		// Pre-flight validation: Check existing config for issues
		if (client.hasVreko) {
			spinner.text = `Validating existing config for ${client.displayName}...`;
			const validation = validateClientConfig(client);

			if (!validation.valid) {
				const errors = validation.issues.filter((i) => i.severity === "error");
				if (errors.length > 0) {
					spinner.warn("Existing config has issues, will be replaced");
				}
			}
		}

		// Build MCP config  -  local stdio by default, remote HTTP only with --remote
		const mcpConfig = getVrekoMCPConfig({
			apiKey,
			useNpx: effectiveNpmMode,
			useLocalDev: effectiveDevMode,
			localCliPath,
			workspaceRoot,
			client: client.format,
			useStreamableHttp: remoteMode,
		});

		if (dryRun) {
			spinner.info(`Would configure ${client.displayName}`);
			if (effectiveDevMode) {
				spinner.info("  Mode: local dev (dist/index.js)");
			} else if (effectiveNpmMode) {
				spinner.info("  Mode: npm/npx");
			} else {
				spinner.info("  Mode: system install");
			}
			return;
		}

		// Write config using shared module
		const result = writeClientConfig(client, mcpConfig);

		if (result.success) {
			// Post-write validation to ensure config was written correctly
			const postValidation = validateClientConfig({ ...client, hasVreko: true });
			const modeLabel = effectiveDevMode ? " (dev mode)" : effectiveNpmMode ? " (npm mode)" : "";
			if (postValidation.valid) {
				spinner.succeed(`Configured ${client.displayName}${modeLabel}`);
			} else {
				const warnings = postValidation.issues.filter((i) => i.severity === "warning");
				if (warnings.length > 0) {
					spinner.succeed(`Configured ${client.displayName} (with warnings)`);
					for (const warning of warnings) {
						print(`    ${chalk.yellow("⚠")} ${warning.message}`);
					}
				} else {
					spinner.succeed(`Configured ${client.displayName}${modeLabel}`);
				}
			}
			if (effectiveDevMode || effectiveNpmMode) {
				print(
					`    Configured in ${effectiveDevMode ? "dev" : "npm"} mode  -  restart your AI tool to load changes`,
				);
			}
			if (result.backup) {
				print(`    Previous config backed up to: ${result.backup}`);
			}
		} else {
			spinner.fail(`Failed to configure ${client.displayName}`);
		}
	} catch (error) {
		spinner.fail(`Failed to configure ${client.displayName}`);
		throw error;
	}
}

/**
 * Configure a specific AI client and return a result object
 * Used by autoConfigureTools for JSON output
 */
async function configureClientWithResult(
	client: AIClientConfig,
	dryRun: boolean,
	apiKey?: string,
	devMode = false,
	npmMode = false,
	workspaceOverride?: string,
	remoteMode = false,
): Promise<{ success: boolean; error?: string }> {
	try {
		// CONFLICT DETECTION: Check for workspace-specific configs
		const workspaceRoot = workspaceOverride || findWorkspaceRoot(process.cwd());
		const workspaceConfig = detectWorkspaceConfig(workspaceRoot);

		// If workspace config exists and this is a global client config,
		// skip to prevent conflicts (workspace takes precedence).
		//
		// Exception  -  Qoder: see configureClient for reasoning. Broken global
		// Qoder entries are repaired with a remote HTTP fallback instead of skipped.
		// Resolve workspace root for dev mode or npm mode
		let localCliPath: string | undefined;
		let effectiveDevMode = devMode;
		let effectiveNpmMode = npmMode;

		if (workspaceConfig && isGlobalConfig(client.configPath)) {
			if (client.format === "qoder" && client.hasVreko) {
				const existingValidation = validateClientConfig(client);
				if (existingValidation.valid) {
					return { success: true }; // Valid global, workspace takes precedence
				}
				// Broken global Qoder entry  -  repair with remote HTTP, fall through
				effectiveDevMode = false;
				effectiveNpmMode = false;
				localCliPath = undefined;
			} else {
				return { success: true }; // Skipped  -  workspace config takes precedence
			}
		}

		if (effectiveDevMode) {
			// Find CLI dist path relative to workspace
			localCliPath = findCliDistPath(workspaceRoot);

			if (!localCliPath) {
				return { success: false, error: "Could not find CLI dist. Run 'pnpm build' first." };
			}
		}

		// Build MCP config  -  local stdio by default, remote HTTP only with --remote
		const mcpConfig = getVrekoMCPConfig({
			apiKey,
			useNpx: effectiveNpmMode,
			useLocalDev: effectiveDevMode,
			localCliPath,
			workspaceRoot,
			client: client.format,
			useStreamableHttp: remoteMode,
		});

		if (dryRun) {
			// Dry run is considered successful
			return { success: true };
		}

		// Write config using shared module
		const result = writeClientConfig(client, mcpConfig);

		if (result.success) {
			// Post-write validation to ensure config was written correctly
			const postValidation = validateClientConfig({ ...client, hasVreko: true });
			if (!postValidation.valid) {
				const errors = postValidation.issues.filter((i) => i.severity === "error");
				if (errors.length > 0) {
					return { success: false, error: errors.map((e) => e.message).join("; ") };
				}
			}
			return { success: true };
		}

		return { success: false, error: result.error };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Find the workspace root by looking for markers (.git, package.json, .vreko)
 */
function findWorkspaceRoot(startDir: string): string {
	let dir = startDir;
	const root = "/";

	while (dir !== root) {
		// Check for workspace markers
		if (existsSync(join(dir, ".git")) || existsSync(join(dir, "package.json")) || existsSync(join(dir, ".vreko"))) {
			return dir;
		}
		dir = join(dir, "..");
	}

	// Fallback to cwd
	return startDir;
}

/**
 * Find the CLI dist path relative to workspace
 */
function findCliDistPath(workspaceRoot: string): string | undefined {
	const possiblePaths = [
		join(workspaceRoot, "apps", "cli", "dist", "index.js"),
		join(workspaceRoot, "dist", "index.js"),
	];

	for (const path of possiblePaths) {
		if (existsSync(path)) {
			return path;
		}
	}

	return undefined;
}

/**
 * Resolve API key from multiple sources
 * Priority: --api-key flag > VREKO_API_KEY env > logged in credentials > interactive prompt
 */
async function resolveApiKey(providedApiKey?: string, skipPrompts = false): Promise<string | undefined> {
	// 1. Check provided flag
	if (providedApiKey) {
		return providedApiKey;
	}

	// 2. Check environment variable
	const envKey = process.env.VREKO_API_KEY;
	if (envKey) {
		return envKey;
	}

	// 3. Check logged in credentials
	if (await isLoggedIn()) {
		const credentials = await getCredentials();
		if (credentials?.accessToken) {
			return credentials.accessToken;
		}
	}

	// 4. Interactive prompt (unless --yes flag is set)
	if (!skipPrompts) {
		const wantApiKeyResult = await clack.confirm({
			message: "Do you have a 🦎 Vreko API key for Pro features?",
			initialValue: false,
		});
		if (clack.isCancel(wantApiKeyResult)) {
			clack.cancel("Cancelled.");
			return undefined;
		}
		if (wantApiKeyResult) {
			const keyResult = await clack.password({
				message: "Enter your API key:",
				mask: "*",
			});
			if (clack.isCancel(keyResult)) {
				clack.cancel("Cancelled.");
				return undefined;
			}
			return keyResult || undefined;
		}
	}

	return undefined;
}

/**
 * Check status of all tool configurations
 */
async function checkToolsStatus(verbose = false): Promise<void> {
	const detection = detectAIClients();

	let hasIssues = false;

	for (const client of detection.clients) {
		let icon: string;
		let status: string;

		if (!client.exists) {
			icon = chalk.gray("○");
			status = chalk.gray("Not installed");
		} else if (client.hasVreko) {
			// Deep validation for configured clients
			const validation = validateClientConfig(client);
			if (validation.valid) {
				icon = chalk.green("✓");
				status = chalk.green("Configured");
			} else {
				const errors = validation.issues.filter((i) => i.severity === "error");
				const warnings = validation.issues.filter((i) => i.severity === "warning");
				if (errors.length > 0) {
					icon = chalk.red("✗");
					status = chalk.red(`Invalid (${errors.length} error(s))`);
					hasIssues = true;
				} else if (warnings.length > 0) {
					icon = chalk.yellow("⚠");
					status = chalk.yellow(`Configured (${warnings.length} warning(s))`);
				} else {
					icon = chalk.green("✓");
					status = chalk.green("Configured");
				}
			}

			print(`  ${icon} ${client.displayName.padEnd(20)} ${status}`);

			// Show validation details in verbose mode (reuse validation from above)
			if (verbose && validation.issues.length > 0) {
				for (const issue of validation.issues) {
					const issueIcon =
						issue.severity === "error"
							? chalk.red("  ✗")
							: issue.severity === "warning"
								? chalk.yellow("  ⚠")
								: chalk.blue("  ℹ");
					print(`    ${issueIcon} ${issue.message}${issue.fix ? `  →  ${issue.fix}` : ""}`);
				}
			}
		} else {
			icon = chalk.yellow("○");
			status = chalk.yellow("Detected but not configured");
			print(`  ${icon} ${client.displayName.padEnd(20)} ${status}`);
		}
	}

	if (hasIssues) {
		print();
		print("  Run `vreko tools repair` to fix configuration issues");
	} else if (detection.needsSetup.length > 0) {
		print();
		print("  Run `vreko tools configure` to set up detected tools");
	} else if (detection.detected.length > 0) {
		print();
		print("  All detected tools are configured");
	} else {
		print("  No AI tools detected");
	}
}

/**
 * Validate all detected AI tool configurations
 */
async function validateTools(verbose = false): Promise<void> {
	const detection = detectAIClients();
	const configured = detection.detected.filter((c) => c.hasVreko);

	if (configured.length === 0) {
		print("No tools configured. Run `vreko tools configure` to get started.");
		return;
	}

	let totalErrors = 0;
	let totalWarnings = 0;

	for (const client of configured) {
		const validation = validateClientConfig(client);
		const errors = validation.issues.filter((i) => i.severity === "error");
		const warnings = validation.issues.filter((i) => i.severity === "warning");
		const infos = validation.issues.filter((i) => i.severity === "info");

		totalErrors += errors.length;
		totalWarnings += warnings.length;

		if (validation.valid && errors.length === 0 && warnings.length === 0) {
			print(`  ${chalk.green("✓")} ${client.displayName}`);
		} else if (errors.length > 0) {
			print(`  ${chalk.red("✗")} ${client.displayName}  -  ${errors.length} error(s)`);
		} else {
			print(`  ${chalk.yellow("⚠")} ${client.displayName}  -  ${warnings.length} warning(s)`);
		}

		if (verbose || errors.length > 0) {
			for (const issue of [...errors, ...warnings, ...(verbose ? infos : [])]) {
				const icon =
					issue.severity === "error"
						? chalk.red("  ✗")
						: issue.severity === "warning"
							? chalk.yellow("  ⚠")
							: chalk.blue("  ℹ");
				print(`    ${icon} ${issue.message}${issue.fix ? `  →  ${issue.fix}` : ""}`);
			}
		}
	}

	print();
	if (totalErrors > 0) {
		print(`  ${chalk.red(`${totalErrors} error(s)`)} found. Run \`vreko tools repair\` to fix.`);
		process.exit(1);
	} else if (totalWarnings > 0) {
		print(`  ${chalk.yellow(`${totalWarnings} warning(s)`)} found. Run \`vreko tools repair\` to fix.`);
	} else {
		print(`  ${chalk.green("All configurations valid")}`);
	}
}

/**
 * Repair broken MCP configurations
 */
async function repairTools(skipPrompts = false, workspaceOverride?: string, providedApiKey?: string): Promise<void> {
	const detection = detectAIClients();
	const configured = detection.detected.filter((c) => c.hasVreko);

	if (configured.length === 0) {
		return;
	}

	// Find clients with issues
	const clientsWithIssues: Array<{ client: AIClientConfig; validation: ValidationResult }> = [];

	for (const client of configured) {
		const validation = validateClientConfig(client);
		if (!validation.valid || validation.issues.some((i) => i.severity === "error" || i.severity === "warning")) {
			clientsWithIssues.push({ client, validation });
		}
	}

	if (clientsWithIssues.length === 0) {
		print("All configurations are valid  -  nothing to repair.");
		return;
	}

	// Show what needs repair
	print(`Found issues in ${clientsWithIssues.length} configuration(s):`);
	for (const { client, validation } of clientsWithIssues) {
		const errors = validation.issues.filter((i) => i.severity === "error");
		const warnings = validation.issues.filter((i) => i.severity === "warning");
		print(`  ${client.displayName}:`);
		for (const issue of [...errors, ...warnings]) {
			const icon = issue.severity === "error" ? chalk.red("  ✗") : chalk.yellow("  ⚠");
			print(`    ${icon} ${issue.message}`);
		}
	}

	// Confirm repair
	if (!skipPrompts) {
		const proceedResult = await clack.confirm({
			message: `Repair ${clientsWithIssues.length} configuration(s)?`,
			initialValue: true,
		});
		if (clack.isCancel(proceedResult)) {
			clack.cancel("Cancelled.");
			return;
		}
		if (!proceedResult) {
			return;
		}
	}

	// Get API key for repair
	const apiKey = await resolveApiKey(providedApiKey, skipPrompts);

	// Perform repairs
	const spinner = ora("Repairing configurations...").start();

	let repaired = 0;
	let failed = 0;

	for (const { client } of clientsWithIssues) {
		spinner.text = `Repairing ${client.displayName}...`;

		const result = repairClientConfig(client, {
			apiKey,
			workspaceRoot: workspaceOverride || findWorkspaceRoot(process.cwd()),
			force: true,
		});

		if (result.success) {
			repaired++;
		} else {
			failed++;
			spinner.warn(`Failed to repair ${client.displayName}: ${result.error}`);
		}
	}

	spinner.stop();
	if (repaired > 0) {
		print(`  ${chalk.green("✓")} Repaired ${repaired} configuration(s)`);
	}
	if (failed > 0) {
		print(`  ${chalk.red("✗")} Failed to repair ${failed} configuration(s)`);
	}

	if (repaired > 0) {
		print();
		print("  Restart your AI tool to load the repaired configuration.");
	}
}

/**
 * Show next steps after configuration
 */
function showNextSteps(): void {
	print();
	print("Next steps:");
	print("  Restart your AI tool to load Vreko MCP.");
	print("  Run `vreko service start` to begin protecting your workspace.");
	print();
}

// =============================================================================
// EXPORTS
// =============================================================================

export { listTools, autoConfigureTools, configureTool, checkToolsStatus, validateTools, repairTools };
