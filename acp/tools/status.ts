/**
 * ACP Status Tools
 *
 * Status tool definitions and handlers for the ACP server.
 *
 * @module acp/tools/status
 */

import { z } from "zod";
import type { ToolCallResult, ToolContext, ToolDefinition } from "../handlers/types";

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const statusTools: ToolDefinition[] = [
	{
		name: "status.protection",
		description: "Get current protection status for the workspace",
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description: "Check protection status for a specific file",
				},
			},
		},
	},
	{
		name: "status.health",
		description: "Get Vreko system health status",
		inputSchema: {
			type: "object",
			properties: {},
		},
	},
];

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const ProtectionStatusInputSchema = z.object({
	file: z.string().optional(),
});

// =============================================================================
// HANDLERS
// =============================================================================

export const statusHandlers = {
	async protection(params: Record<string, unknown>, context: ToolContext): Promise<ToolCallResult> {
		try {
			const input = ProtectionStatusInputSchema.parse(params);

			if (!context.workspacePath) {
				return {
					content: [{ type: "text", text: "Workspace not initialized" }],
					isError: true,
				};
			}

			// Try to read protection status from .vreko directory
			const { existsSync, readFileSync } = await import("node:fs");
			const { join } = await import("node:path");

			const vrekoDir = join(context.workspacePath, ".vreko");
			const isInitialized = existsSync(vrekoDir);

			if (!isInitialized) {
				return {
					content: [
						{
							type: "json",
							json: {
								initialized: false,
								protected: false,
								message: "Workspace not initialized with Vreko",
							},
						},
					],
					isError: false,
				};
			}

			// Check for protected files list
			const protectedFilesPath = join(vrekoDir, "protected-files.json");
			let protectedFiles: string[] = [];
			if (existsSync(protectedFilesPath)) {
				try {
					protectedFiles = JSON.parse(readFileSync(protectedFilesPath, "utf8"));
				} catch {
					// Ignore parse errors
				}
			}

			// Get snapshot count
			const snapshotsDir = join(vrekoDir, "snapshots");
			let snapshotCount = 0;
			if (existsSync(snapshotsDir)) {
				const { readdirSync } = await import("node:fs");
				snapshotCount = readdirSync(snapshotsDir).filter((f) => f.endsWith(".json")).length;
			}

			// Build status response
			const status = {
				initialized: true,
				protected: protectedFiles.length > 0,
				protectedFileCount: protectedFiles.length,
				snapshotCount,
				workspacePath: context.workspacePath,
			};

			// If specific file requested, check if it's protected
			if (input.file) {
				const isProtected = protectedFiles.some((f) => f === input.file || f.endsWith(`/${input.file}`));
				return {
					content: [
						{
							type: "json",
							json: {
								...status,
								file: input.file,
								fileProtected: isProtected,
							},
						},
					],
					isError: false,
				};
			}

			return {
				content: [{ type: "json", json: status }],
				isError: false,
			};
		} catch (error) {
			return {
				content: [
					{
						type: "text",
						text: `Failed to get protection status: ${error instanceof Error ? error.message : "Unknown error"}`,
					},
				],
				isError: true,
			};
		}
	},

	async health(_params: Record<string, unknown>, context: ToolContext): Promise<ToolCallResult> {
		try {
			const { join } = await import("node:path");
			const { existsSync, statSync } = await import("node:fs");
			const { platform, freemem, totalmem, uptime } = await import("node:os");

			// Check if workspace has .vreko directory
			const vrekoDir = context.workspacePath ? join(context.workspacePath, ".vreko") : null;

			const storageInfo = {
				initialized: false,
				snapshotCount: 0,
				totalSize: 0,
			};

			if (vrekoDir && existsSync(vrekoDir)) {
				storageInfo.initialized = true;

				const snapshotsDir = join(vrekoDir, "snapshots");
				if (existsSync(snapshotsDir)) {
					const { readdirSync } = await import("node:fs");
					const files = readdirSync(snapshotsDir);
					storageInfo.snapshotCount = files.filter((f) => f.endsWith(".json")).length;

					// Calculate total size
					for (const file of files) {
						try {
							const stats = statSync(join(snapshotsDir, file));
							storageInfo.totalSize += stats.size;
						} catch {
							// Ignore errors
						}
					}
				}
			}

			// Get package version
			let version = "unknown";
			try {
				const { fileURLToPath } = await import("node:url");
				const { readFileSync } = await import("node:fs");
				const __dirname = fileURLToPath(new URL(".", import.meta.url));
				const pkgPath = join(__dirname, "../../../../package.json");
				if (existsSync(pkgPath)) {
					const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
					version = pkg.version;
				}
			} catch {
				// Ignore version detection errors
			}

			return {
				content: [
					{
						type: "json",
						json: {
							status: "healthy",
							version,
							platform: platform(),
							uptime: Math.floor(uptime()),
							memory: {
								free: freemem(),
								total: totalmem(),
								usedPercent: Math.round((1 - freemem() / totalmem()) * 100),
							},
							storage: storageInfo,
						},
					},
				],
				isError: false,
			};
		} catch (error) {
			return {
				content: [
					{
						type: "text",
						text: `Failed to get health status: ${error instanceof Error ? error.message : "Unknown error"}`,
					},
				],
				isError: true,
			};
		}
	},
};
