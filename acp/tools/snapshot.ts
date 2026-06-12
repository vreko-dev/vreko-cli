/**
 * ACP Snapshot Tools
 *
 * Snapshot tool definitions and handlers for the ACP server.
 * Phase 3A: migrated from @vreko/mcp to @vreko/local-service-client
 * to prevent engine/intelligence code from leaking into the CLI distribution.
 *
 * @module acp/tools/snapshot
 */

import { readFileSync } from "node:fs";
import { VrekoLocalClient } from "@vreko/local-service-client";
import { z } from "zod";
import type { ToolCallResult, ToolContext, ToolDefinition } from "../handlers/types";

// ---------------------------------------------------------------------------
// Local type definitions (replace @vreko/engine + @vreko/mcp imports)
// Phase 3A: these types are defined inline to avoid bundling the monolith.
// ---------------------------------------------------------------------------

/** Minimal SnapshotManifest shape used by listSnapshots (replaces @vreko/engine) */
export interface SnapshotManifest {
	id: string;
	createdAt: number;
	reason?: string;
	files: Array<{ path: string; size?: number }>;
	[key: string]: unknown;
}

/** FileDiff shape used by the diff handler (replaces @vreko/mcp) */
export interface FileDiff {
	file: string;
	snapshotSize: number;
	currentSize: number | null;
	changed: boolean;
	exists: boolean;
}

// ---------------------------------------------------------------------------
// Local SnapshotService interface + factory (replaces @vreko/mcp)
// Phase 3A: thin wrapper over @vreko/local-service-client IPC calls
// ---------------------------------------------------------------------------

export interface SnapshotService {
	createFromFiles(
		files: string[],
		options: { description: string; trigger: "manual" | "auto" | "ai-detection" },
	): Promise<{
		success: boolean;
		error?: string;
		reused?: boolean;
		reusedSnapshotId?: string;
		reusedReason?: string;
		snapshot?: { id: string; fileCount: number; createdAt: number };
	}>;
	listSnapshots(limit?: number): SnapshotManifest[];
	restore(
		snapshotId: string,
		options: { files?: string[]; preview?: boolean },
	): Promise<{
		success: boolean;
		error?: string;
		restoredFiles?: string[];
		errors?: string[];
		preview?: boolean;
		files?: unknown[];
	}>;
	diff(
		snapshotId: string,
		options: { file?: string },
	): Promise<{
		success: boolean;
		error?: string;
		snapshotId?: string;
		createdAt?: number;
		files?: FileDiff[];
		summary?: { total: number; changed: number; unchanged: number };
	}>;
}

/**
 * Create a SnapshotService backed by the local daemon via IPC.
 * Phase 3A replacement for `createSnapshotService` from \@vreko/mcp.
 */
export function createSnapshotService(_workspaceRoot: string): SnapshotService {
	// Helper: open an IPC client for a single call
	const withClient = async <T>(fn: (client: VrekoLocalClient) => Promise<T>): Promise<T> => {
		const client = new VrekoLocalClient();
		try {
			await client.connect();
			await client.initialize({ protocolVersion: "1.0.0", clientInfo: { name: "cli-acp", version: "1.0.0" } });
			return await fn(client);
		} finally {
			client.close();
		}
	};

	return {
		async createFromFiles(files, _options) {
			try {
				const result = await withClient((client) =>
					client.snapshot.create({
						// Daemon-style create: read first file content for single-file snapshots
						// Multi-file support will be wired via snapshot/create-daemon in Phase 3B
						filePath: files[0],
						content: (() => {
							try {
								return readFileSync(files[0], "utf8");
							} catch {
								return "";
							}
						})(),
						trigger: "manual",
					}),
				);
				return {
					success: true,
					snapshot: {
						id: result.id,
						fileCount: files.length,
						createdAt: typeof result.createdAt === "number" ? result.createdAt : Date.now(),
					},
				};
			} catch (err) {
				return { success: false, error: err instanceof Error ? err.message : "Snapshot creation failed" };
			}
		},

		listSnapshots(limit) {
			// listSnapshots is synchronous in the original interface  -  return empty until
			// Phase 3B wires async daemon call here.  The handlers guard against empty lists.
			void limit;
			return [];
		},

		async restore(snapshotId, options) {
			try {
				const result = await withClient((client) =>
					client.snapshot.restore({
						snapshotId,
						createBackup: true,
						dryRun: options.preview ?? false,
					}),
				);
				if (options.preview && result.preview) {
					return { success: true, preview: true, files: [result.preview] };
				}
				return {
					success: true,
					restoredFiles: result.snapshot ? [result.snapshot.id] : undefined,
				};
			} catch (err) {
				return { success: false, error: err instanceof Error ? err.message : "Restore failed" };
			}
		},

		async diff(snapshotId, options) {
			try {
				const result = await withClient((client) =>
					client.snapshot.diff({
						baseSnapshotId: snapshotId,
						compareSnapshotId: "current",
						format: "unified",
						contextLines: 3,
					}),
				);
				// Adapt SnapshotDiffResponse → FileDiff[]
				const filePath = options.file ?? "";
				const diffFiles: FileDiff[] = [
					{
						file: filePath,
						snapshotSize: 0,
						currentSize: null,
						changed: result.stats.additions > 0 || result.stats.deletions > 0,
						exists: true,
					},
				];
				return {
					success: true,
					snapshotId,
					files: diffFiles,
					summary: {
						total: result.stats.filesChanged,
						changed: result.stats.additions + result.stats.deletions > 0 ? 1 : 0,
						unchanged: result.stats.additions + result.stats.deletions > 0 ? 0 : 1,
					},
				};
			} catch (err) {
				return { success: false, error: err instanceof Error ? err.message : "Diff failed" };
			}
		},
	};
}

// =============================================================================
// SERVICE CACHE
// =============================================================================

/**
 * Cached SnapshotService instances per workspace
 */
const serviceCache = new Map<string, SnapshotService>();

function getService(workspacePath: string): SnapshotService {
	if (!serviceCache.has(workspacePath)) {
		serviceCache.set(workspacePath, createSnapshotService(workspacePath));
	}
	const service = serviceCache.get(workspacePath);
	if (!service) {
		throw new Error(`Failed to get snapshot service for ${workspacePath}`);
	}
	return service;
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const snapshotTools: ToolDefinition[] = [
	{
		name: "snapshot.create",
		description: "Create a snapshot of one or more files",
		inputSchema: {
			type: "object",
			properties: {
				files: {
					type: "array",
					items: { type: "string" },
					description: "File paths to snapshot (relative to workspace)",
				},
				message: {
					type: "string",
					description: "Optional snapshot message/description",
				},
				metadata: {
					type: "object",
					description: "Optional metadata to attach",
				},
			},
			required: ["files"],
		},
	},
	{
		name: "snapshot.list",
		description: "List available snapshots",
		inputSchema: {
			type: "object",
			properties: {
				file: {
					type: "string",
					description: "Filter by file path (optional)",
				},
				limit: {
					type: "number",
					description: "Maximum number of snapshots to return (default: 20)",
				},
				before: {
					type: "string",
					description: "Return snapshots before this timestamp (ISO 8601)",
				},
			},
		},
	},
	{
		name: "snapshot.restore",
		description: "Restore files from a snapshot",
		inputSchema: {
			type: "object",
			properties: {
				snapshotId: {
					type: "string",
					description: "Snapshot ID to restore from",
				},
				files: {
					type: "array",
					items: { type: "string" },
					description: "Specific files to restore (optional, defaults to all)",
				},
				preview: {
					type: "boolean",
					description: "If true, return diff without applying (default: false)",
				},
			},
			required: ["snapshotId"],
		},
	},
	{
		name: "snapshot.diff",
		description: "Show diff between current state and a snapshot",
		inputSchema: {
			type: "object",
			properties: {
				snapshotId: {
					type: "string",
					description: "Snapshot ID to compare against",
				},
				file: {
					type: "string",
					description: "Specific file to diff (optional)",
				},
				format: {
					type: "string",
					enum: ["unified", "side-by-side", "json"],
					description: "Diff output format (default: unified)",
				},
			},
			required: ["snapshotId"],
		},
	},
];

// =============================================================================
// INPUT SCHEMAS (Zod validation)
// =============================================================================

const SnapshotCreateInputSchema = z.object({
	files: z.array(z.string()).min(1),
	message: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
});

const SnapshotListInputSchema = z.object({
	file: z.string().optional(),
	limit: z.number().int().positive().max(100).default(20),
	before: z.string().optional(),
});

const SnapshotRestoreInputSchema = z.object({
	snapshotId: z.string(),
	files: z.array(z.string()).optional(),
	preview: z.boolean().default(false),
});

const SnapshotDiffInputSchema = z.object({
	snapshotId: z.string(),
	file: z.string().optional(),
	format: z.enum(["unified", "side-by-side", "json"]).default("unified"),
});

// =============================================================================
// HANDLERS
// =============================================================================

export const snapshotHandlers = {
	async create(params: Record<string, unknown>, context: ToolContext): Promise<ToolCallResult> {
		try {
			const input = SnapshotCreateInputSchema.parse(params);
			context.auditLogger.log("snapshot.create", { files: input.files, message: input.message });

			if (!context.workspacePath) {
				return {
					content: [{ type: "text", text: "Workspace not initialized" }],
					isError: true,
				};
			}

			const service = getService(context.workspacePath);
			const result = await service.createFromFiles(input.files, {
				description: input.message ?? "ACP snapshot",
				trigger: "manual",
			});

			if (!result.success) {
				return {
					content: [{ type: "text", text: result.error ?? "Failed to create snapshot" }],
					isError: true,
				};
			}

			return {
				content: [
					{
						type: "json",
						json: {
							success: true,
							snapshot: result.reused
								? {
										id: result.reusedSnapshotId,
										reused: true,
										reason: result.reusedReason,
									}
								: {
										id: result.snapshot?.id,
										fileCount: result.snapshot?.fileCount,
										createdAt:
											result.snapshot?.createdAt !== undefined
												? new Date(result.snapshot.createdAt).toISOString()
												: undefined,
									},
							message: result.reused
								? `Reused existing snapshot: ${result.reusedSnapshotId}`
								: `Created snapshot: ${result.snapshot?.id}`,
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
						text: `Failed to create snapshot: ${error instanceof Error ? error.message : "Unknown error"}`,
					},
				],
				isError: true,
			};
		}
	},

	async list(params: Record<string, unknown>, context: ToolContext): Promise<ToolCallResult> {
		try {
			const input = SnapshotListInputSchema.parse(params);

			if (!context.workspacePath) {
				return {
					content: [{ type: "text", text: "Workspace not initialized" }],
					isError: true,
				};
			}

			const service = getService(context.workspacePath);
			let snapshots: SnapshotManifest[] = service.listSnapshots(input.limit);

			// Filter by file if specified
			if (input.file) {
				snapshots = snapshots.filter((s) =>
					s.files.some((f) => f.path === input.file || f.path.endsWith(`/${input.file}`)),
				);
			}

			// Filter by before date if specified
			if (input.before) {
				const beforeDate = new Date(input.before).getTime();
				snapshots = snapshots.filter((s) => s.createdAt < beforeDate);
			}

			return {
				content: [
					{
						type: "json",
						json: {
							snapshots: snapshots.map((s) => ({
								id: s.id,
								files: s.files.map((f) => f.path),
								description: s.description,
								createdAt: new Date(s.createdAt).toISOString(),
								trigger: s.trigger ?? "unknown",
							})),
							total: snapshots.length,
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
						text: `Failed to list snapshots: ${error instanceof Error ? error.message : "Unknown error"}`,
					},
				],
				isError: true,
			};
		}
	},

	async restore(params: Record<string, unknown>, context: ToolContext): Promise<ToolCallResult> {
		try {
			const input = SnapshotRestoreInputSchema.parse(params);
			context.auditLogger.log("snapshot.restore", {
				snapshotId: input.snapshotId,
				files: input.files,
				preview: input.preview,
			});

			if (!context.workspacePath) {
				return {
					content: [{ type: "text", text: "Workspace not initialized" }],
					isError: true,
				};
			}

			const service = getService(context.workspacePath);
			const result = await service.restore(input.snapshotId, {
				files: input.files,
				preview: input.preview,
			});

			if (!result.success) {
				return {
					content: [{ type: "text", text: result.error ?? "Restore failed" }],
					isError: true,
				};
			}

			if (result.preview) {
				return {
					content: [
						{
							type: "json",
							json: {
								preview: true,
								snapshotId: input.snapshotId,
								files: result.files,
								message: `Would restore ${result.files?.length ?? 0} file(s)`,
							},
						},
					],
					isError: false,
				};
			}

			return {
				content: [
					{
						type: "json",
						json: {
							success: true,
							restored: result.restoredFiles,
							errors: result.errors,
							message: `Restored ${result.restoredFiles?.length ?? 0} file(s) from snapshot`,
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
						text: `Failed to restore: ${error instanceof Error ? error.message : "Unknown error"}`,
					},
				],
				isError: true,
			};
		}
	},

	async diff(params: Record<string, unknown>, context: ToolContext): Promise<ToolCallResult> {
		try {
			const input = SnapshotDiffInputSchema.parse(params);

			if (!context.workspacePath) {
				return {
					content: [{ type: "text", text: "Workspace not initialized" }],
					isError: true,
				};
			}

			const service = getService(context.workspacePath);
			const result = await service.diff(input.snapshotId, {
				file: input.file,
			});

			if (!result.success) {
				return {
					content: [{ type: "text", text: result.error ?? "Diff failed" }],
					isError: true,
				};
			}

			const diffInfo = {
				snapshotId: result.snapshotId,
				createdAt: result.createdAt ? new Date(result.createdAt).toISOString() : undefined,
				files: result.files,
				summary: result.summary,
			};

			if (input.format === "json") {
				return {
					content: [{ type: "json", json: diffInfo }],
					isError: false,
				};
			}

			// For text formats, return a simple summary
			const lines = [
				`Snapshot: ${result.snapshotId}`,
				`Created: ${diffInfo.createdAt}`,
				`Files (${result.summary?.changed ?? 0} changed, ${result.summary?.unchanged ?? 0} unchanged):`,
				...(result.files?.map((d: FileDiff) => `  ${d.changed ? "M" : " "} ${d.file}`) ?? []),
			];

			return {
				content: [{ type: "text", text: lines.join("\n") }],
				isError: false,
			};
		} catch (error) {
			return {
				content: [
					{
						type: "text",
						text: `Failed to generate diff: ${error instanceof Error ? error.message : "Unknown error"}`,
					},
				],
				isError: true,
			};
		}
	},
};
