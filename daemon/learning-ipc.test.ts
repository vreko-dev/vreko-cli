/**
 * Learning IPC Method Tests
 *
 * Tests for the daemon IPC wrappers for learning operations.
 * These methods replaced direct @vreko/intelligence/storage access
 * (Day 5 daemon-first architecture migration).
 *
 * Mocking strategy (post CAL-phantom-ipc-p3 migration):
 *   - pruneLearningsViaDaemon, listLearningsViaDaemon, searchLearningsViaDaemon
 *     → migrated to typed namespace methods (client.learning.prune/list/search)
 *   - gcLearningsViaDaemon → still raw (client.call); gc's "dedupe" operation has
 *     no typed wrapper yet; see deferred-work.md site #2.
 */

import type { VrekoLocalClient } from "@vreko/local-service-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	gcLearningsViaDaemon,
	listLearningsViaDaemon,
	pruneLearningsViaDaemon,
	searchLearningsViaDaemon,
} from "../../src/service-adapter/local-service-adapter.js";

const WORKSPACE = "/test/workspace";

/**
 * Build a mock client that has both the legacy `call` shim (for gc, which stays
 * raw) and the typed `learning` namespace (for prune / list / search).
 */
function makeMockClient(callImpl?: (method: string, params: unknown) => unknown): VrekoLocalClient {
	return {
		call: vi.fn().mockImplementation(callImpl ?? (() => Promise.resolve({}))),
		learning: {
			prune: vi.fn(),
			list: vi.fn(),
			search: vi.fn(),
		},
	} as unknown as VrekoLocalClient;
}

afterEach(() => {
	vi.clearAllMocks();
});

describe("pruneLearningsViaDaemon", () => {
	it("calls learning/prune with the workspace", async () => {
		const client = makeMockClient();
		(client.learning.prune as ReturnType<typeof vi.fn>).mockResolvedValue({
			pruned: 3,
			remaining: 12,
			archived: 1,
		});

		const result = await pruneLearningsViaDaemon(WORKSPACE, client);

		expect(result.success).toBe(true);
		expect(result.result).toEqual({ pruned: 3, remaining: 12, archived: 1 });
		expect(client.learning.prune).toHaveBeenCalledWith({ workspace: WORKSPACE });
	});

	it("returns success:false with error message on failure", async () => {
		const client = makeMockClient();
		(client.learning.prune as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("IPC timeout"));

		const result = await pruneLearningsViaDaemon(WORKSPACE, client);

		expect(result.success).toBe(false);
		expect(result.error).toBe("IPC timeout");
		expect(result.result).toBeUndefined();
	});

	it("handles non-Error rejections", async () => {
		const client = makeMockClient();
		(client.learning.prune as ReturnType<typeof vi.fn>).mockRejectedValue("string error");

		const result = await pruneLearningsViaDaemon(WORKSPACE, client);

		expect(result.success).toBe(false);
		expect(result.error).toBe("string error");
	});
});

describe("gcLearningsViaDaemon", () => {
	it("calls learning/gc with default options", async () => {
		const client = makeMockClient(() =>
			Promise.resolve({ operation: "all", dryRun: true, archived: 0, deleted: 0, remaining: 10 }),
		);

		const result = await gcLearningsViaDaemon(WORKSPACE, client);

		expect(result.success).toBe(true);
		expect(client.call).toHaveBeenCalledWith("learning/gc", {
			workspace: WORKSPACE,
			operation: "all",
			dryRun: true,
		});
	});

	it("passes through custom operation and dryRun=false", async () => {
		const client = makeMockClient(() =>
			Promise.resolve({ operation: "stale", dryRun: false, archived: 5, deleted: 2, remaining: 8 }),
		);

		const result = await gcLearningsViaDaemon(WORKSPACE, client, {
			operation: "stale",
			dryRun: false,
		});

		expect(result.success).toBe(true);
		expect(result.result?.operation).toBe("stale");
		expect(client.call).toHaveBeenCalledWith("learning/gc", {
			workspace: WORKSPACE,
			operation: "stale",
			dryRun: false,
		});
	});

	it("returns success:false on IPC error", async () => {
		const client = makeMockClient(() => Promise.reject(new Error("daemon not running")));

		const result = await gcLearningsViaDaemon(WORKSPACE, client);

		expect(result.success).toBe(false);
		expect(result.error).toBe("daemon not running");
	});
});

describe("listLearningsViaDaemon", () => {
	const mockLearnings = {
		learnings: [
			{ type: "pattern", trigger: "when X", action: "do Y", relevanceScore: 0.9 },
			{ type: "pitfall", trigger: "avoid Z", action: "use W", relevanceScore: 0.5 },
		],
		total: 2,
	};

	it("calls learning/list with workspace and default limit", async () => {
		const client = makeMockClient();
		(client.learning.list as ReturnType<typeof vi.fn>).mockResolvedValue(mockLearnings);

		const result = await listLearningsViaDaemon(WORKSPACE, client);

		expect(result.success).toBe(true);
		expect(result.result?.total).toBe(2);
		expect(result.result?.learnings).toHaveLength(2);
		expect(client.learning.list).toHaveBeenCalledWith({
			workspace: WORKSPACE,
			limit: 50,
		});
	});

	it("respects custom limit", async () => {
		const client = makeMockClient();
		(client.learning.list as ReturnType<typeof vi.fn>).mockResolvedValue({ learnings: [], total: 0 });

		await listLearningsViaDaemon(WORKSPACE, client, 5);

		expect(client.learning.list).toHaveBeenCalledWith({
			workspace: WORKSPACE,
			limit: 5,
		});
	});

	it("returns success:false on error", async () => {
		const client = makeMockClient();
		(client.learning.list as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("socket closed"));

		const result = await listLearningsViaDaemon(WORKSPACE, client);

		expect(result.success).toBe(false);
		expect(result.error).toBe("socket closed");
	});
});

describe("searchLearningsViaDaemon", () => {
	it("calls learning/search with keywords and workspace", async () => {
		const client = makeMockClient();
		(client.learning.search as ReturnType<typeof vi.fn>).mockResolvedValue({ learnings: [], total: 0 });

		await searchLearningsViaDaemon(WORKSPACE, client, ["react", "hooks"]);

		expect(client.learning.search).toHaveBeenCalledWith({
			workspace: WORKSPACE,
			keywords: ["react", "hooks"],
			limit: 10,
		});
	});

	it("respects custom limit", async () => {
		const client = makeMockClient();
		(client.learning.search as ReturnType<typeof vi.fn>).mockResolvedValue({ learnings: [], total: 0 });

		await searchLearningsViaDaemon(WORKSPACE, client, ["foo"], 3);

		expect(client.learning.search).toHaveBeenCalledWith({
			workspace: WORKSPACE,
			keywords: ["foo"],
			limit: 3,
		});
	});

	it("returns error result on failure", async () => {
		const client = makeMockClient();
		(client.learning.search as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("timeout"));

		const result = await searchLearningsViaDaemon(WORKSPACE, client, ["foo"]);

		expect(result.success).toBe(false);
		expect(result.error).toBe("timeout");
	});
});
