/**
 * Configure Tools Command
 *
 * Interactive TUI for configuring the primary AI tool in a workspace.
 * Writes to service workspace config for tool identity detection.
 */

import { intro, outro, select } from "@clack/prompts";
import { getClient, getVrekoMCPConfig, writeClientConfig } from "@vreko/mcp-config";
import { withDaemon } from "../services/service-client";
import { installHook } from "./hooks.js";

const KNOWN_TOOLS = [
	{ value: "cursor", label: "Cursor", description: "Cursor IDE with apply model" },
	{ value: "claude-code", label: "Claude Code", description: "Anthropic's Claude with bash execution" },
	{ value: "github-copilot", label: "GitHub Copilot", description: "GitHub's AI pair programmer" },
	{ value: "windsurf", label: "Windsurf", description: "Codeium's Windsurf IDE" },
	{ value: "augment", label: "Augment Code", description: "Augment's AI coding assistant" },
	{ value: "devin", label: "Devin", description: "Cognition AI's autonomous agent" },
	{ value: "cline", label: "Cline", description: "VS Code extension with shell access" },
	{ value: "roocode", label: "RooCode", description: "Cline fork with enhanced features" },
	{ value: "aider", label: "Aider", description: "CLI-based AI pair programmer" },
];

interface ConfigureToolsOptions {
	workspace?: string;
}

export async function configureToolsCommand(options: ConfigureToolsOptions = {}): Promise<void> {
	intro("Vreko Tool Configuration");

	// Resolve workspace
	const workspace = options.workspace || process.cwd();

	await withDaemon("configure-tools", async (service) => {
		// Get current tool identity
		let currentTool: string | undefined;
		try {
			const identity = await service.call<{ tool: string; confidence: number; source: string }>(
				"tool-identity/get",
				{
					workspace,
				},
			);
			if (identity && identity.source === "user-configured") {
				currentTool = identity.tool;
			}
		} catch {
			// No current configuration
		}

		// Show selection prompt
		const selected = await select({
			message: "Which AI tool are you using in this workspace?",
			options: KNOWN_TOOLS.map((tool) => ({
				value: tool.value,
				label: currentTool === tool.value ? `${tool.label} (current)` : tool.label,
				hint: tool.description,
			})),
		});

		if (typeof selected !== "string") {
			outro("Configuration cancelled");
			return;
		}

		// Write to service
		await service.call("tool-identity/configure", {
			workspace,
			tool: selected,
		});

		const toolLabel = KNOWN_TOOLS.find((t) => t.value === selected)?.label || selected;

		// If the selected tool is an MCP-capable client, link Vreko MCP config
		const MCP_CLIENT_MAP: Record<string, string> = {
			"claude-code": "claude-code",
			cursor: "cursor",
			windsurf: "windsurf",
			cline: "cline",
			roocode: "roo-code",
		};

		const mcpClientName = MCP_CLIENT_MAP[selected];
		if (mcpClientName) {
			const client = getClient(mcpClientName);
			if (client) {
				const mcpConfig = getVrekoMCPConfig({
					client: client.format,
					workspaceRoot: workspace,
				});
				const result = writeClientConfig(client, mcpConfig);
				if (result.success) {
					// Install PostToolUse hook when configuring claude-code so fileIndex stays
					// current via intelligence/file-modified IPC (REQ-003 coverage point).
					if (selected === "claude-code") {
						try {
							await installHook("claude-code", workspace);
						} catch {
							// Non-fatal  -  hook install failure must not block tool configuration
						}
					}
					outro(`✅ Configured workspace to use ${toolLabel} (MCP config written to ${client.configPath})`);
					return;
				}
			}
		}

		outro(`✅ Configured workspace to use ${toolLabel}`);
	});
}
