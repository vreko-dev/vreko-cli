/**
 * Vreko CLI MCP Command
 *
 * Implements MCP server management:
 * - `vr mcp --stdio` - Launch MCP server for Cursor/Claude integration
 * - `vr mcp scan` - Discover MCP configs across supported clients (§14.1)
 * - `vr mcp link` - Write/update Vreko entry in client config (§14.1)
 * - `vr mcp unlink` - Remove Vreko entry from client config (§14.1)
 *
 * Business logic extracted to McpService to keep commands thin.
 *
 * @module commands/mcp
 */

import { homedir } from "node:os";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getWorkspaceSessionManager, WorkspaceSessionManager } from "@vreko/auth/workspace";
import { createMcpServer } from "@vreko/mcp";
import {
	type AIClientConfig,
	type AIClientFormat,
	detectAIClients,
	detectWorkspaceConfig,
	getClient,
	removeVrekoConfig,
	repairClientConfig,
	validateClientConfig,
} from "@vreko/mcp-config";
import chalk from "chalk";
import { createCommand } from "commander";
import {
	formatLinkResult,
	formatScanResult,
	formatUnlinkResult,
	linkMcpClient,
	scanMcpClients,
	unlinkMcpClient,
} from "../services/mcp-service.js";
import { resolveTier } from "../utils/tier.js";
import { resolveWorkspaceRoot } from "../utils/workspace.js";

// ---------------------------------------------------------------------------
// Local types (Phase 3A: removed @vreko/mcp dependency)
// ---------------------------------------------------------------------------

/** Options for starting an MCP server instance */
interface McpServerOptions {
	workspaceRoot: string;
	tier: string;
	storageMode?: string;
	auth?: { apiKey?: string };
}

/**
 * Run local MCP server with stdio transport.
 *
 * Runs the full Vreko MCP server locally with all V2 tools.
 * Connects to the local service for intelligence/learning/snapshot operations.
 *
 * Benefits over remote proxy:
 * - Works offline
 * - Zero latency
 * - Immediate testing of V2 tools
 * - Easier debugging
 */
async function runStdioMcpServer(options: McpServerOptions): Promise<void> {
	// Create the full MCP server with all tools
	const server = await createMcpServer({
		workspaceRoot: options.workspaceRoot,
		tier: options.tier as "free" | "pro" | "enterprise",
		storageMode: (options.storageMode as "local" | "remote" | "readonly" | undefined) ?? "local",
	});

	// Connect to stdio transport for AI clients (Claude, Cursor, etc.)
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

/**
 * Create an HTTP server for local MCP access.
 * Note: HTTP mode is deprecated - stdio is the recommended transport.
 */
async function runHttpMcpServer(_options: McpServerOptions, _port: number): Promise<void> {
	console.error(chalk.yellow("[Vreko MCP] HTTP mode is deprecated. Use --stdio instead."));
	console.error(chalk.yellow("[Vreko MCP] HTTP support may be removed in a future version."));

	// For now, just exit - HTTP mode not supported with local server
	console.error(chalk.red("[Vreko MCP] HTTP mode not yet implemented for local server."));
	console.error(chalk.blue("[Vreko MCP] Use: vreko mcp --stdio"));
	process.exit(1);
}

// Re-export for backward compatibility
export { resolveTier };

export function createMcpCommand() {
	const cmd = createCommand("mcp");

	cmd.description("MCP server management for Cursor/Claude/VS Code integration");

	// ==========================================================================
	// Default action: Run MCP server with stdio or HTTP transport
	// ==========================================================================
	cmd.option("--stdio", "Use stdio transport (default)")
		.option("--http", "Use HTTP transport (SSE for remote clients like Qoder, Cursor)")
		.option("--port <port>", "HTTP port (default: 3002)", "3002")
		.option("--ws <path>", "Workspace root path (auto-resolved if not provided)")
		.option("--workspace <path>", "Alias for --ws (workspace root path)")
		.option(
			"--tier <tier>",
			"Override user tier (free|pro|enterprise). Auto-detected from VREKO_API_KEY or VREKO_TIER env var.",
		)
		.option(
			"--fast-mode",
			"Enable fast startup mode (skip embeddings preloading). Use VREKO_MCP_FAST_MODE=true env var or this flag.",
		)
		.action(async (options) => {
			const useHttp = options.http || process.env.VREKO_MCP_HTTP === "true";
			const useStdio = options.stdio || (!useHttp && !options.http);

			// HTTP transport mode (deprecated)
			if (useHttp) {
				const port = Number.parseInt(options.port, 10);
				const workspacePath = options.ws || options.workspace;
				const workspaceValidation = resolveWorkspaceRoot(workspacePath);

				if (!workspaceValidation.valid) {
					process.exit(1);
				}

				const tier = resolveTier(options.tier);
				const serverOptions: McpServerOptions = {
					workspaceRoot: workspaceValidation.root,
					tier,
					storageMode: "local",
				};

				await runHttpMcpServer(serverOptions, port);
			} else if (useStdio) {
				// Stdio transport mode (existing code)
				try {
					// Enable fast mode via CLI flag or env var
					if (options.fastMode) {
						process.env.VREKO_MCP_FAST_MODE = "true";
					}

					// Support both --ws and --workspace for compatibility
					const workspacePath = options.ws || options.workspace;
					const workspaceValidation = resolveWorkspaceRoot(workspacePath);

					if (!workspaceValidation.valid) {
						process.exit(1);
					}

					const tier = resolveTier(options.tier);

					// Resolve workspace session for auth context
					const manager = getWorkspaceSessionManager();
					const session = await manager.getSession(workspaceValidation.root);

					// Resolve auth context with fallback chain:
					// 1. Workspace session sk_live_* key (preferred  -  provisioned at login)
					// 2. Workspace session accessToken (device auth Bearer token)
					// 3. Environment variables (VREKO_API_KEY or VREKO_AUTH_TOKEN)
					const envApiKey = WorkspaceSessionManager.getEnvVarApiKey();
					const authContext = session
						? { apiKey: session.apiKey ?? session.tokens.accessToken }
						: envApiKey
							? { apiKey: envApiKey }
							: undefined;

					if (!session && WorkspaceSessionManager.isUsingLegacyEnvVar()) {
						console.error(
							chalk.yellow("[Vreko MCP] Using legacy env var auth. Consider running: vr auth login"),
						);
					}

					const serverOptions: McpServerOptions = {
						workspaceRoot: workspaceValidation.root,
						tier,
						storageMode: "local",
						// Auth context - apiKey is tied to userId via database foreign key
						auth: authContext,
					};

					// Run local MCP server with full V2 tool support
					await runStdioMcpServer(serverOptions);
				} catch (error) {
					console.error("[Vreko MCP] Error:", error instanceof Error ? error.message : String(error));
					process.exit(1);
				}
			} else {
				// Show help if no subcommand and no --stdio
				cmd.outputHelp();
			}
		});

	// ==========================================================================
	// §14.1: mcp scan - Discover MCP configs across supported clients
	// ==========================================================================
	cmd.command("scan")
		.description("Discover MCP configs across supported AI clients")
		.action(async () => {
			try {
				const result = await scanMcpClients();
				console.log(formatScanResult(result));
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`MCP scan failed: ${message}`);
				process.exit(1);
			}
		});

	// ==========================================================================
	// §14.1: mcp link - Write/update Vreko entry in client config
	// ==========================================================================
	cmd.command("link")
		.description("Configure Vreko MCP server in an AI client")
		.requiredOption("--client <client>", "Target client (claude, cursor, vscode, qoder, windsurf, etc.)")
		.option("--workspace <path>", "Workspace root path")
		.option("--api-key <key>", "API key for Pro features")
		.option("--workspace-id <id>", "Workspace ID")
		.option("--doppler", "Use Doppler for environment injection (recommended for local dev)")
		.option("--doppler-project <project>", "Doppler project name", "vreko-shared")
		.option("--doppler-config <config>", "Doppler config name", "dev")
		.option("--sse", "Use HTTP/SSE transport to mcp.vreko.dev (recommended for remote access)")
		.option("--remote", "Alias for --sse (use remote MCP server)")
		.action(async (options) => {
			try {
				const result = await linkMcpClient({
					client: options.client.toLowerCase() as AIClientFormat,
					workspace: options.workspace,
					apiKey: options.apiKey,
					workspaceId: options.workspaceId,
					localCliPath: process.argv[1],
					useDoppler: options.doppler,
					dopplerProject: options.dopplerProject,
					dopplerConfig: options.dopplerConfig,
					useSse: options.sse || options.remote,
					useStreamableHttp: options.sse || options.remote,
				});
				console.log(formatLinkResult(result));
				if (!result.success) {
					process.exit(1);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`MCP link failed: ${message}`);
				process.exit(1);
			}
		});

	// ==========================================================================
	// §14.1: mcp unlink - Remove Vreko entry from client config
	// ==========================================================================
	cmd.command("unlink")
		.description("Remove Vreko MCP server from an AI client")
		.requiredOption("--client <client>", "Target client (claude, cursor, vscode, qoder, windsurf, etc.)")
		.action(async (options) => {
			try {
				const result = await unlinkMcpClient({
					client: options.client.toLowerCase() as AIClientFormat,
				});
				console.log(formatUnlinkResult(result));
				if (!result.success) {
					process.exit(1);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`MCP unlink failed: ${message}`);
				process.exit(1);
			}
		});

	// ==========================================================================
	// §14.2: mcp fix-conflicts - Resolve configuration conflicts
	// ==========================================================================
	cmd.command("fix-conflicts")
		.description("Resolve MCP configuration conflicts (workspace vs global)")
		.option("--auto", "Automatically resolve conflicts (prefer workspace configs)", false)
		.action(async (options) => {
			try {
				const result = detectAIClients();
				const conflicts: Array<{
					client: AIClientConfig;
					globalPath: string;
					workspacePath: string;
					workspaceType: string;
				}> = [];

				// Detect conflicts: both workspace and global configs exist
				for (const client of result.detected) {
					if (client.hasVreko) {
						const workspaceConfig = detectWorkspaceConfig();
						if (workspaceConfig && client.configPath.startsWith(homedir())) {
							conflicts.push({
								client,
								globalPath: client.configPath,
								workspacePath: workspaceConfig.path,
								workspaceType: workspaceConfig.type,
							});
						}
					}
				}

				if (conflicts.length === 0) {
					console.log(chalk.green("\n✓ No MCP configuration conflicts detected"));
					console.log(chalk.gray("  All configurations are properly scoped\n"));
					return;
				}

				console.log(chalk.bold("\n🔍 MCP Configuration Conflicts\n"));

				for (const conflict of conflicts) {
					console.log(chalk.cyan(`${conflict.client.displayName}:`));
					console.log(chalk.gray(`  Global:    ${conflict.globalPath}`));
					console.log(chalk.gray(`  Workspace: ${conflict.workspacePath} (${conflict.workspaceType})`));
					console.log();
					if (options.auto) {
						const result = removeVrekoConfig(conflict.client);
						if (result.success) {
							console.log(chalk.green("  ✓ Removed global config (workspace takes precedence)"));
						} else {
							console.log(chalk.red("  ✗ Failed to remove global config"));
						}
					} else {
						console.log(chalk.yellow("  Run with --auto to resolve automatically"));
					}
				}

				if (options.auto) {
					console.log(chalk.green("\n✓ Conflicts resolved"));
				} else {
					console.log(chalk.gray("\nRun: vr mcp fix-conflicts --auto"));
				}
			} catch (error) {
				console.error("[Vreko MCP] Error:", error instanceof Error ? error.message : String(error));
				process.exit(1);
			}
		});

	// ==========================================================================
	// vr mcp repair - Repair stale/broken MCP configurations
	// ==========================================================================
	cmd.command("repair")
		.description("Repair stale or broken MCP configurations (escape hatch for multi-client issues)")
		.option("--client <client>", "Target client to repair (claude, cursor, qoder, etc.)")
		.option("--all", "Repair all detected clients", false)
		.option("--force", "Force complete reconfiguration", false)
		.option("--workspace <path>", "Workspace root path")
		.action(async (options) => {
			try {
				const workspaceValidation = resolveWorkspaceRoot(options.workspace);
				const workspaceRoot = workspaceValidation.valid ? workspaceValidation.root : process.cwd();

				let clientsToRepair: AIClientConfig[] = [];

				if (options.all) {
					// Repair all detected clients with Vreko
					const detection = detectAIClients({ cwd: workspaceRoot });
					clientsToRepair = detection.detected.filter((c) => c.hasVreko);

					if (clientsToRepair.length === 0) {
						console.log(chalk.yellow("No Vreko-configured clients found"));
						return;
					}
				} else if (options.client) {
					const clientName = options.client.toLowerCase() as AIClientFormat;
					const client = getClient(clientName);

					if (!client) {
						console.log(chalk.red(`Unknown client: ${options.client}`));
						process.exit(1);
					}

					clientsToRepair = [client];
				} else {
					// Show validation status for all clients
					const detection = detectAIClients({ cwd: workspaceRoot });
					const configuredClients = detection.detected.filter((c) => c.hasVreko);

					console.log(chalk.bold("\n🔧 MCP Configuration Validation\n"));

					let hasIssues = false;
					for (const client of configuredClients) {
						const validation = validateClientConfig(client);
						const errors = validation.issues.filter((i) => i.severity === "error");
						const warnings = validation.issues.filter((i) => i.severity === "warning");

						if (errors.length > 0) {
							console.log(chalk.red(`✗ ${client.displayName}: ${errors.length} error(s)`));
							for (const err of errors) {
								console.log(chalk.gray(`    - ${err.message}`));
								if (err.fix) {
									console.log(chalk.gray(`      Fix: ${err.fix}`));
								}
							}
							hasIssues = true;
						} else if (warnings.length > 0) {
							console.log(chalk.yellow(`⚠ ${client.displayName}: ${warnings.length} warning(s)`));
							for (const warn of warnings) {
								console.log(chalk.gray(`    - ${warn.message}`));
							}
						} else {
							console.log(chalk.green(`✓ ${client.displayName}: Valid`));
						}
					}

					if (hasIssues) {
						console.log(chalk.cyan("\nTo repair all clients, run:"));
						console.log(chalk.gray("  vr mcp repair --all\n"));
					} else {
						console.log(chalk.green("\n✓ All configurations are valid\n"));
					}
					return;
				}

				console.log(chalk.bold("\n🔧 Repairing MCP Configurations\n"));

				let repairCount = 0;
				for (const client of clientsToRepair) {
					console.log(chalk.cyan(`Repairing ${client.displayName}...`));
					const result = repairClientConfig(client, {
						workspaceRoot,
						force: options.force,
					});

					if (result.success) {
						console.log(chalk.green(`  ✓ ${client.displayName} repaired`));
						if (result.fixed.length > 0) {
							for (const fix of result.fixed) {
								console.log(chalk.gray(`    - ${fix}`));
							}
						}
						repairCount++;
					} else {
						console.log(chalk.red(`  ✗ ${client.displayName} repair failed`));
						if (result.error) {
							console.log(chalk.gray(`    Error: ${result.error}`));
						}
						for (const remaining of result.remaining) {
							console.log(chalk.gray(`    - ${remaining}`));
						}
					}
				}

				if (repairCount > 0) {
					console.log(chalk.green(`\n✓ Repaired ${repairCount}/${clientsToRepair.length} client(s)`));
					console.log(chalk.gray("  Restart your IDE/editor to apply changes\n"));
				} else {
					console.log(chalk.yellow("\n⚠ No clients were repaired. Try --force to reconfigure completely.\n"));
				}
			} catch (error) {
				console.error(chalk.red("Repair failed:"), error instanceof Error ? error.message : String(error));
				process.exit(1);
			}
		});

	return cmd;
}

/**
 * Export for CLI integration
 */
export const mcpCommand = createMcpCommand();
