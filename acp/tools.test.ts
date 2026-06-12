/**
 * ACP Tool Handler Tests
 *
 * Tests for snapshot and status tool handlers.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock problematic infrastructure imports that fail in test environment
vi.mock("@vreko/infrastructure/files", () => ({
	makeWatcher: vi.fn(),
}));

vi.mock("@vreko/infrastructure/cache", () => ({
	createCacheKey: vi.fn(),
	memoryCache: { get: vi.fn(), set: vi.fn() },
}));

vi.mock("@vreko/infrastructure/resiliency", () => ({
	withBreaker: vi.fn((fn: () => unknown) => fn),
	withRetry: vi.fn((fn: () => unknown) => fn),
	getCircuitBreakerState: vi.fn(() => "closed"),
	RetryOptions: {},
}));

import type { AuditLoggerInterface, ToolContext } from "../../src/acp/handlers/types";
import { snapshotHandlers } from "../../src/acp/tools/snapshot";
import { statusHandlers } from "../../src/acp/tools/status";

describe("Snapshot Tool Handlers", () => {
	let testDir: string;
	let mockAuditLogger: AuditLoggerInterface;
	let context: ToolContext;

	beforeEach(() => {
		// Create temp directory for tests
		testDir = join(tmpdir(), `acp-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });

		// Create a test file
		const testFile = join(testDir, "test.ts");
		writeFileSync(testFile, 'const x = 1;\nconsole.log("test");');

		mockAuditLogger = {
			log: vi.fn(),
			close: vi.fn().mockResolvedValue(undefined),
		};

		context = {
			workspacePath: testDir,
			auditLogger: mockAuditLogger,
		};
	});

	afterEach(() => {
		// Clean up temp directory
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("create", () => {
		it("creates snapshot successfully", async () => {
			const result = await snapshotHandlers.create({ files: ["test.ts"], message: "test snapshot" }, context);

			expect(result.isError).toBe(false);
			expect(result.content[0].type).toBe("json");

			const json = (result.content[0] as { type: "json"; json: unknown }).json as {
				success: boolean;
				snapshot: { id: string; fileCount: number };
			};

			expect(json.success).toBe(true);
			// Engine uses snapshot-<description>-<timestamp>-<nanoid> format
			expect(json.snapshot.id).toMatch(/^snapshot-/);
			expect(json.snapshot.fileCount).toBe(1);
		});

		it("returns error without workspace", async () => {
			const result = await snapshotHandlers.create(
				{ files: ["test.ts"] },
				{ ...context, workspacePath: undefined },
			);

			expect(result.isError).toBe(true);
			expect((result.content[0] as { type: "text"; text: string }).text).toContain("Workspace not initialized");
		});

		it("returns error with no readable files", async () => {
			const result = await snapshotHandlers.create({ files: ["nonexistent.ts"] }, context);

			expect(result.isError).toBe(true);
			expect((result.content[0] as { type: "text"; text: string }).text).toContain("No readable files");
		});

		it("validates input schema", async () => {
			const result = await snapshotHandlers.create(
				{ files: [] }, // Empty array should fail validation
				context,
			);

			expect(result.isError).toBe(true);
		});
	});

	describe("list", () => {
		it("returns empty list when no snapshots", async () => {
			const result = await snapshotHandlers.list({}, context);

			expect(result.isError).toBe(false);

			const json = (result.content[0] as { type: "json"; json: unknown }).json as {
				snapshots: unknown[];
				total: number;
			};

			expect(json.snapshots).toEqual([]);
			expect(json.total).toBe(0);
		});

		it("lists snapshots after creation", async () => {
			// Create a snapshot first
			await snapshotHandlers.create({ files: ["test.ts"], message: "test" }, context);

			const result = await snapshotHandlers.list({}, context);

			expect(result.isError).toBe(false);

			const json = (result.content[0] as { type: "json"; json: unknown }).json as {
				snapshots: Array<{ id: string }>;
				total: number;
			};

			expect(json.snapshots.length).toBe(1);
			expect(json.total).toBe(1);
		});
	});

	describe("restore", () => {
		it("restores snapshot successfully", async () => {
			// Create a snapshot
			const createResult = await snapshotHandlers.create({ files: ["test.ts"] }, context);

			const createJson = (createResult.content[0] as { type: "json"; json: unknown }).json as {
				snapshot: { id: string };
			};

			// Modify the file
			writeFileSync(join(testDir, "test.ts"), "modified content");

			// Restore
			const restoreResult = await snapshotHandlers.restore({ snapshotId: createJson.snapshot.id }, context);

			expect(restoreResult.isError).toBe(false);

			// Verify file was restored
			const content = readFileSync(join(testDir, "test.ts"), "utf8");
			expect(content).toContain("const x = 1;");
		});

		it("previews restore without applying", async () => {
			// Create a snapshot
			const createResult = await snapshotHandlers.create({ files: ["test.ts"] }, context);

			const createJson = (createResult.content[0] as { type: "json"; json: unknown }).json as {
				snapshot: { id: string };
			};

			// Modify the file
			writeFileSync(join(testDir, "test.ts"), "modified content");

			// Preview restore
			const previewResult = await snapshotHandlers.restore(
				{ snapshotId: createJson.snapshot.id, preview: true },
				context,
			);

			expect(previewResult.isError).toBe(false);

			const previewJson = (previewResult.content[0] as { type: "json"; json: unknown }).json as {
				preview: boolean;
			};

			expect(previewJson.preview).toBe(true);

			// Verify file was NOT restored
			const content = readFileSync(join(testDir, "test.ts"), "utf8");
			expect(content).toBe("modified content");
		});

		it("returns error for nonexistent snapshot", async () => {
			const result = await snapshotHandlers.restore({ snapshotId: "nonexistent" }, context);

			expect(result.isError).toBe(true);
			expect((result.content[0] as { type: "text"; text: string }).text).toContain("Snapshot not found");
		});
	});

	describe("diff", () => {
		it("shows diff information", async () => {
			// Create a snapshot
			const createResult = await snapshotHandlers.create({ files: ["test.ts"] }, context);

			const createJson = (createResult.content[0] as { type: "json"; json: unknown }).json as {
				snapshot: { id: string };
			};

			const diffResult = await snapshotHandlers.diff(
				{ snapshotId: createJson.snapshot.id, format: "json" },
				context,
			);

			expect(diffResult.isError).toBe(false);

			const diffJson = (diffResult.content[0] as { type: "json"; json: unknown }).json as {
				snapshotId: string;
				files: Array<{ file: string; changed: boolean }>;
			};

			expect(diffJson.snapshotId).toBe(createJson.snapshot.id);
			expect(diffJson.files.length).toBe(1);
		});
	});
});

describe("Status Tool Handlers", () => {
	let testDir: string;
	let mockAuditLogger: AuditLoggerInterface;
	let context: ToolContext;

	beforeEach(() => {
		testDir = join(tmpdir(), `acp-status-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });

		mockAuditLogger = {
			log: vi.fn(),
			close: vi.fn().mockResolvedValue(undefined),
		};

		context = {
			workspacePath: testDir,
			auditLogger: mockAuditLogger,
		};
	});

	afterEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("protection", () => {
		it("returns not initialized for fresh workspace", async () => {
			const result = await statusHandlers.protection({}, context);

			expect(result.isError).toBe(false);

			const json = (result.content[0] as { type: "json"; json: unknown }).json as {
				initialized: boolean;
			};

			expect(json.initialized).toBe(false);
		});

		it("returns initialized after creating snapshots", async () => {
			// Initialize .vreko directory
			mkdirSync(join(testDir, ".vreko", "snapshots"), { recursive: true });

			const result = await statusHandlers.protection({}, context);

			expect(result.isError).toBe(false);

			const json = (result.content[0] as { type: "json"; json: unknown }).json as {
				initialized: boolean;
			};

			expect(json.initialized).toBe(true);
		});
	});

	describe("health", () => {
		it("returns health status", async () => {
			const result = await statusHandlers.health({}, context);

			expect(result.isError).toBe(false);

			const json = (result.content[0] as { type: "json"; json: unknown }).json as {
				status: string;
				platform: string;
				memory: { usedPercent: number };
			};

			expect(json.status).toBe("healthy");
			expect(json.platform).toBeDefined();
			expect(json.memory.usedPercent).toBeGreaterThan(0);
		});
	});
});
