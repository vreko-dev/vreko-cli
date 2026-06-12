/**
 * MCP Service
 *
 * Business logic for MCP client management operations.
 * Extracted from mcp.ts command handlers to separate concerns.
 *
 * @module services/mcp-service
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getWorkspaceSessionManager } from "@vreko/auth/workspace";
import type { AIClientConfig, AIClientFormat } from "@vreko/mcp-config";
import {
	detectAIClients,
	getClient,
	getClientConfigPath,
	getServerKey,
	getVrekoMCPConfig,
	patchApiKeyInClientConfig,
	removeVrekoConfig,
	validateConfig,
	writeClientConfig,
} from "@vreko/mcp-config";
import chalk from "chalk";
import { resolveWorkspaceRoot } from "../utils/workspace.js";

// ---------------------------------------------------------------------------
// Local workspace config reader (replaces @vreko/intelligence/workspace)
// Phase 3A: avoids bundling intelligence monolith into CLI dist
// ---------------------------------------------------------------------------
interface VrekoWorkspaceConfig {
	workspaceId?: string;
	[key: string]: unknown;
}

function readVrekoConfig(workspacePath: string): VrekoWorkspaceConfig | undefined {
	const configPath = join(workspacePath, ".vreko", "config.json");
	try {
		if (!existsSync(configPath)) {
			return undefined;
		}
		return JSON.parse(readFileSync(configPath, "utf8")) as VrekoWorkspaceConfig;
	} catch {
		return undefined;
	}
}

export interface McpScanResult {
	detected: AIClientConfig[];
	needsSetup: AIClientConfig[];
	configured: number;
}

export interface McpLinkOptions {
	client: AIClientFormat;
	workspace?: string;
	apiKey?: string;
	workspaceId?: string;
	localCliPath: string;
	/** Use Doppler for environment injection (recommended for local dev) */
	useDoppler?: boolean;
	/** Doppler project name */
	dopplerProject?: string;
	/** Doppler config name */
	dopplerConfig?: string;
	/** Use SSE transport (HTTP to remote server) */
	useSse?: boolean;
	/** Use streamable-http transport */
	useStreamableHttp?: boolean;
}

export interface McpLinkResult {
	success: boolean;
	clientDisplayName: string;
	serverKey: string;
	configPath: string;
	backup?: string;
	validated: boolean;
	error?: string;
}

export interface McpUnlinkOptions {
	client: AIClientFormat;
}

export interface McpUnlinkResult {
	success: boolean;
	clientDisplayName: string;
	configPath: string;
	backup?: string;
	error?: string;
}

/**
 * Scan for MCP client configurations
 */
export async function scanMcpClients(): Promise<McpScanResult> {
	const result = detectAIClients();

	return {
		detected: result.detected,
		needsSetup: result.needsSetup,
		configured: result.detected.filter((c) => c.hasVreko).length,
	};
}

/**
 * Link Vreko MCP to an AI client
 */
export async function linkMcpClient(options: McpLinkOptions): Promise<McpLinkResult> {
	// Resolve workspace first (needed for project-level configs)
	const workspaceValidation = resolveWorkspaceRoot(options.workspace);
	const workspaceRoot = workspaceValidation.valid ? workspaceValidation.root : process.cwd();

	// Validate client format without requiring config file to exist
	// getClientConfigPath returns undefined for unknown client formats
	const configPath = getClientConfigPath(options.client, workspaceRoot);
	if (!configPath) {
		throw new Error(
			`Unknown client: ${options.client}\nSupported: claude, cursor, vscode, qoder, windsurf, cline, zed, continue`,
		);
	}

	// Get client config (may not exist yet for first-time setup)
	let client = getClient(options.client);

	// If client doesn't exist yet (first-time setup), construct minimal client object
	if (!client) {
		client = {
			name: options.client,
			displayName: options.client.charAt(0).toUpperCase() + options.client.slice(1),
			configPath: configPath,
			exists: false,
			hasVreko: false,
			format: options.client as AIClientFormat,
		};
	}

	// Auto-resolve workspaceId from .vreko/config.json if not provided
	let workspaceId = options.workspaceId;
	if (!workspaceId) {
		const config = readVrekoConfig(workspaceRoot);
		if (config?.workspaceId) {
			workspaceId = config.workspaceId;
		}
	}

	// SSE/HTTP mode doesn't need local session - uses remote server with Bearer auth
	const useRemoteTransport = options.useSse || options.useStreamableHttp;

	// Resolve workspace session for auth context (only needed for local stdio modes)
	let additionalEnv: Record<string, string> | undefined;

	if (!options.useDoppler && !useRemoteTransport) {
		const manager = getWorkspaceSessionManager();
		const session = await manager.getSession(workspaceRoot);

		// Build additional env with session context
		if (session) {
			additionalEnv = {
				VREKO_SESSION_TOKEN: session.tokens.accessToken,
				VREKO_SESSION_TYPE: session.authMethod === "api-key" ? "api_key" : "bearer",
				VREKO_USER_EMAIL: session.user.email,
			};
		}
	}

	// Generate config
	const mcpConfig = getVrekoMCPConfig({
		client: options.client,
		apiKey: options.apiKey,
		workspaceId,
		workspaceRoot,
		useLocalDev: !options.useDoppler && !useRemoteTransport,
		localCliPath: options.localCliPath,
		additionalEnv,
		// Doppler options
		useDoppler: options.useDoppler,
		dopplerProject: options.dopplerProject,
		dopplerConfig: options.dopplerConfig,
		// SSE/HTTP options
		useSse: options.useSse,
		useStreamableHttp: options.useStreamableHttp,
	});

	// Ensure parent directory exists (for project-level configs like .vscode/mcp.json)
	mkdirSync(dirname(client.configPath), { recursive: true });

	// Write config
	const result = writeClientConfig(client, mcpConfig);

	if (!result.success) {
		return {
			success: false,
			clientDisplayName: client.displayName,
			serverKey: getServerKey(options.client),
			configPath: client.configPath,
			error: result.error,
			validated: false,
		};
	}

	// Validate
	const validated = validateConfig(client);

	return {
		success: true,
		clientDisplayName: client.displayName,
		serverKey: getServerKey(options.client),
		configPath: client.configPath,
		backup: result.backup,
		validated,
	};
}

/**
 * Unlink Vreko MCP from an AI client
 */
export async function unlinkMcpClient(options: McpUnlinkOptions): Promise<McpUnlinkResult> {
	// Validate client format without requiring config file to exist
	const configPath = getClientConfigPath(options.client);
	if (!configPath) {
		throw new Error(
			`Unknown client: ${options.client}\nSupported: claude, cursor, vscode, qoder, windsurf, cline, zed, continue`,
		);
	}

	const client = getClient(options.client);

	// If client doesn't exist, nothing to unlink
	if (!client) {
		return {
			success: true,
			clientDisplayName: options.client,
			configPath,
		};
	}

	const result = removeVrekoConfig(client);

	return {
		success: result.success,
		clientDisplayName: client.displayName,
		configPath: client.configPath,
		error: result.error,
	};
}

/**
 * Format scan result for CLI output
 */
export function formatScanResult(result: McpScanResult): string {
	const lines: string[] = [];

	lines.push(chalk.bold("\nVreko MCP Configuration Scan"));
	lines.push(chalk.gray("=".repeat(40)));

	// Detected clients
	if (result.detected.length === 0) {
		lines.push(chalk.yellow("\nNo supported AI clients detected."));
	} else {
		lines.push(chalk.cyan(`\nDetected ${result.detected.length} client(s):`));
		for (const client of result.detected) {
			const serverKey = getServerKey(client.format);
			const status = client.hasVreko ? chalk.green("✓ Configured") : chalk.yellow("✗ Not configured");
			lines.push(`  ${chalk.bold(client.displayName)}: ${status}`);
			lines.push(chalk.gray(`    Path: ${client.configPath}`));
			lines.push(chalk.gray(`    Key: ${serverKey}`));
		}
	}

	// Clients that need setup
	if (result.needsSetup.length > 0) {
		lines.push(chalk.yellow(`\n${result.needsSetup.length} client(s) need Vreko setup:`));
		for (const client of result.needsSetup) {
			lines.push(`  - ${client.displayName}`);
		}
		lines.push(chalk.gray("\nRun: vr mcp link --client <name>"));
	}

	// Summary
	lines.push(chalk.gray(`\nSummary: ${result.configured}/${result.detected.length} clients configured`));

	return lines.join("\n");
}

/**
 * Format link result for CLI output
 */
export function formatLinkResult(result: McpLinkResult): string {
	const lines: string[] = [];

	if (result.success) {
		lines.push(chalk.green(`✓ Vreko configured for ${result.clientDisplayName}`));
		lines.push(chalk.gray(`  Server key: ${result.serverKey}`));
		lines.push(chalk.gray(`  Config: ${result.configPath}`));
		if (result.backup) {
			lines.push(chalk.gray(`  Backup: ${result.backup}`));
		}
		if (result.validated) {
			lines.push(chalk.green("✓ Configuration validated"));
		}
	} else {
		lines.push(chalk.red(`✗ Failed to configure: ${result.error}`));
	}

	return lines.join("\n");
}

/**
 * Sync a newly provisioned sk_live_* API key into all existing Vreko MCP
 * configs on this machine. Called automatically after `vr login` so users
 * don't have to manually re-run `vr mcp link`.
 *
 * @param apiKey - The sk_live_* key returned by autoProvisionApiKey
 * @returns List of client display names that were updated
 */
export async function syncApiKeyToAllConfigs(apiKey: string): Promise<string[]> {
	const result = detectAIClients();
	const updated: string[] = [];

	for (const client of result.detected) {
		if (!client.hasVreko) {
			continue;
		}

		const patched = patchApiKeyInClientConfig(client, apiKey);
		if (patched) {
			updated.push(client.displayName);
		}
	}

	return updated;
}

/**
 * Format unlink result for CLI output
 */
export function formatUnlinkResult(result: McpUnlinkResult): string {
	const lines: string[] = [];

	if (result.success) {
		lines.push(chalk.green(`✓ Vreko removed from ${result.clientDisplayName}`));
		lines.push(chalk.gray(`  Config: ${result.configPath}`));
		if (result.backup) {
			lines.push(chalk.gray(`  Backup: ${result.backup}`));
		}
	} else {
		lines.push(chalk.red(`✗ Failed to remove: ${result.error}`));
	}

	return lines.join("\n");
}
