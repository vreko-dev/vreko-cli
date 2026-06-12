/**
 * AutomatedLearningPruner Tests
 *
 * Rewritten to test against the daemon-first architecture (Day 5).
 * All learning operations now proxy through the local service daemon.
 * Direct @vreko/intelligence/storage imports are gone.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the local-service-adapter so we control what the daemon "returns"
vi.mock("../../src/service-adapter/local-service-adapter.js", () => ({
	createServiceClient: vi.fn(),
	connectServiceClient: vi.fn().mockResolvedValue(undefined),
	pruneLearningsViaDaemon: vi.fn(),
	gcLearningsViaDaemon: vi.fn(),
	listLearningsViaDaemon: vi.fn(),
	searchLearningsViaDaemon: vi.fn(),
}));

// Mock print so tests don't produce console output
vi.mock("../../src/utils/print.js", () => ({
	print: vi.fn(),
}));

import {
	connectServiceClient,
	createServiceClient,
	gcLearningsViaDaemon,
	listLearningsViaDaemon,
	pruneLearningsViaDaemon,
} from "../../src/service-adapter/local-service-adapter.js";
import { AutomatedLearningPruner, createLearningPruner } from "../../src/services/learning-pruner.js";

const WORKSPACE = "/test/workspace";

const mockClient = { close: vi.fn(), call: vi.fn() };

beforeEach(() => {
	vi.mocked(createServiceClient).mockReturnValue(mockClient as never);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("AutomatedLearningPruner – initialization", () => {
	it("constructs with required workspaceRoot", () => {
		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE });
		expect(pruner).toBeDefined();
	});

	it("initialize() creates and connects a service client", async () => {
		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE });
		await pruner.initialize();

		expect(createServiceClient).toHaveBeenCalledOnce();
		expect(connectServiceClient).toHaveBeenCalledWith(mockClient);
	});

	it("close() cleans up the client connection", async () => {
		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE });
		await pruner.initialize();
		await pruner.close();

		expect(mockClient.close).toHaveBeenCalledOnce();
	});

	it("throws when operations are called before initialize()", async () => {
		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE });
		await expect(pruner.pruneStaleViolations()).rejects.toThrow("Pruner not initialized. Call initialize() first.");
	});
});

describe("pruneStaleViolations", () => {
	it("delegates to pruneLearningsViaDaemon and maps the result", async () => {
		vi.mocked(pruneLearningsViaDaemon).mockResolvedValue({
			success: true,
			result: { pruned: 4, remaining: 8, archived: 2 },
		});

		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE });
		await pruner.initialize();
		const result = await pruner.pruneStaleViolations();

		expect(pruneLearningsViaDaemon).toHaveBeenCalledWith(WORKSPACE, mockClient);
		expect(result.staleCount).toBe(4);
		expect(result.totalChecked).toBe(8);
		expect(result.dryRun).toBe(false);
	});

	it("returns empty result when daemon call fails", async () => {
		vi.mocked(pruneLearningsViaDaemon).mockResolvedValue({
			success: false,
			error: "connection refused",
		});

		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE });
		await pruner.initialize();
		const result = await pruner.pruneStaleViolations();

		expect(result.totalChecked).toBe(0);
		expect(result.staleCount).toBe(0);
		expect(result.archivedCount).toBe(0);
	});

	it("sets archivedCount to 0 when dryRun=true even if daemon reports archived", async () => {
		vi.mocked(pruneLearningsViaDaemon).mockResolvedValue({
			success: true,
			result: { pruned: 2, remaining: 5, archived: 10 },
		});

		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE, dryRun: true });
		await pruner.initialize();
		const result = await pruner.pruneStaleViolations();

		expect(result.archivedCount).toBe(0);
		expect(result.dryRun).toBe(true);
	});
});

describe("updateLearningScores", () => {
	it("calculates average confidence from daemon learning list", async () => {
		vi.mocked(listLearningsViaDaemon).mockResolvedValue({
			success: true,
			result: {
				learnings: [
					{ type: "pattern", trigger: "t1", action: "a1", relevanceScore: 0.8 },
					{ type: "pitfall", trigger: "t2", action: "a2", relevanceScore: 0.4 },
					{ type: "pattern", trigger: "t3", action: "a3", relevanceScore: 0.2 },
				],
				total: 3,
			},
		});

		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE });
		await pruner.initialize();
		const result = await pruner.updateLearningScores();

		expect(result.totalScored).toBe(3);
		expect(result.avgConfidence).toBeCloseTo((0.8 + 0.4 + 0.2) / 3);
		expect(result.lowConfidenceCount).toBe(1); // only 0.2 < 0.3
	});

	it("returns zeroed result when daemon call fails", async () => {
		vi.mocked(listLearningsViaDaemon).mockResolvedValue({
			success: false,
			error: "timeout",
		});

		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE });
		await pruner.initialize();
		const result = await pruner.updateLearningScores();

		expect(result.totalScored).toBe(0);
		expect(result.avgConfidence).toBe(0);
	});

	it("handles learnings without relevanceScore by defaulting to 0.5", async () => {
		vi.mocked(listLearningsViaDaemon).mockResolvedValue({
			success: true,
			result: {
				learnings: [{ type: "pattern", trigger: "t", action: "a" }],
				total: 1,
			},
		});

		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE });
		await pruner.initialize();
		const result = await pruner.updateLearningScores();

		expect(result.avgConfidence).toBe(0.5);
	});
});

describe("deduplicateLearnings", () => {
	it("calls gc with operation=dedupe and maps result", async () => {
		vi.mocked(gcLearningsViaDaemon).mockResolvedValue({
			success: true,
			result: {
				operation: "dedupe",
				dryRun: false,
				archived: 3,
				deleted: 0,
				remaining: 7,
			},
		});

		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE });
		await pruner.initialize();
		const result = await pruner.deduplicateLearnings();

		expect(gcLearningsViaDaemon).toHaveBeenCalledWith(WORKSPACE, mockClient, {
			operation: "dedupe",
			dryRun: false,
		});
		expect(result.mergedCount).toBe(3);
		expect(result.totalChecked).toBe(7);
	});

	it("passes dryRun=true through to daemon call", async () => {
		vi.mocked(gcLearningsViaDaemon).mockResolvedValue({
			success: true,
			result: { operation: "dedupe", dryRun: true, archived: 0, deleted: 0, remaining: 5 },
		});

		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE, dryRun: true });
		await pruner.initialize();
		await pruner.deduplicateLearnings();

		expect(gcLearningsViaDaemon).toHaveBeenCalledWith(WORKSPACE, mockClient, {
			operation: "dedupe",
			dryRun: true,
		});
	});
});

describe("archiveStaleItems", () => {
	it("calls gc with operation=archive and maps result", async () => {
		vi.mocked(gcLearningsViaDaemon).mockResolvedValue({
			success: true,
			result: { operation: "archive", dryRun: false, archived: 5, deleted: 2, remaining: 10 },
		});

		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE });
		await pruner.initialize();
		const result = await pruner.archiveStaleItems();

		expect(gcLearningsViaDaemon).toHaveBeenCalledWith(WORKSPACE, mockClient, {
			operation: "archive",
			dryRun: false,
		});
		expect(result.archived.learnings).toBe(5);
		expect(result.archived.violations).toBe(2);
		expect(result.archivePath).toContain(".vreko/archive");
	});
});

describe("runFullMaintenance", () => {
	it("runs all four operations and returns combined result", async () => {
		vi.mocked(pruneLearningsViaDaemon).mockResolvedValue({
			success: true,
			result: { pruned: 1, remaining: 9, archived: 0 },
		});
		vi.mocked(listLearningsViaDaemon).mockResolvedValue({
			success: true,
			result: { learnings: [], total: 0 },
		});
		vi.mocked(gcLearningsViaDaemon).mockResolvedValue({
			success: true,
			result: { operation: "all", dryRun: false, archived: 0, deleted: 0, remaining: 9 },
		});

		const pruner = new AutomatedLearningPruner({ workspaceRoot: WORKSPACE });
		await pruner.initialize();
		const result = await pruner.runFullMaintenance();

		expect(result).toHaveProperty("prune");
		expect(result).toHaveProperty("scores");
		expect(result).toHaveProperty("dedupe");
		expect(result).toHaveProperty("archive");
	});
});

describe("createLearningPruner factory", () => {
	it("returns an AutomatedLearningPruner instance", () => {
		const pruner = createLearningPruner({ workspaceRoot: WORKSPACE });
		expect(pruner).toBeInstanceOf(AutomatedLearningPruner);
	});
});
