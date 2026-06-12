/**
 * Intelligence Service Tests
 *
 * Rewritten for the daemon-proxy architecture.
 * IntelligenceService is a thin proxy  -  all real work runs in vrekod.
 * Tests verify the proxy contract, caching, and guard conditions.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock daemon client  -  controls daemon availability
vi.mock("../../src/services/service-client.js", () => ({
	connectToDaemon: vi.fn(),
	isDaemonAvailable: vi.fn(),
	requireDaemon: vi.fn(),
}));

// Mock workspace initialization check
vi.mock("../../src/services/vreko-dir.js", () => ({
	isVrekoInitialized: vi.fn(),
}));

// Suppress print output
vi.mock("../../src/utils/print.js", () => ({
	print: vi.fn(),
}));

import {
	clearIntelligenceCache,
	getIntelligence,
	getIntelligenceWithSemantic,
	hasIntelligence,
} from "../../src/services/intelligence-service.js";
import { connectToDaemon, isDaemonAvailable, requireDaemon } from "../../src/services/service-client.js";
import { isVrekoInitialized } from "../../src/services/vreko-dir.js";

const WORKSPACE = "/test/workspace";

function makeMockDaemonClient() {
	return {
		context: {
			get: vi.fn().mockResolvedValue({
				patterns: [],
				constraints: [],
				learnings: [],
				files: [],
			}),
		},
		validation: {
			comprehensive: vi.fn().mockResolvedValue({
				passed: true,
				confidence: 0.9,
				totalIssues: 0,
				recommendation: "looks good",
			}),
		},
		violation: {
			report: vi.fn().mockResolvedValue({
				reported: true,
				file: "src/foo.ts",
			}),
		},
		learning: {
			list: vi.fn().mockResolvedValue({
				learnings: [],
				total: 0,
			}),
		},
	};
}

beforeEach(() => {
	vi.mocked(isVrekoInitialized).mockResolvedValue(true);
	vi.mocked(isDaemonAvailable).mockReturnValue(true);
	vi.mocked(requireDaemon).mockResolvedValue(makeMockDaemonClient() as never);
});

afterEach(async () => {
	await clearIntelligenceCache();
	vi.clearAllMocks();
});

describe("getIntelligence", () => {
	it("returns a proxy when workspace is initialized", async () => {
		const intel = await getIntelligence(WORKSPACE);
		expect(intel).toBeDefined();
		expect(typeof intel.getContext).toBe("function");
	});

	it("throws when workspace is not initialized", async () => {
		vi.mocked(isVrekoInitialized).mockResolvedValue(false);
		await expect(getIntelligence(WORKSPACE)).rejects.toThrow("Vreko not initialized");
	});

	it("caches the proxy per workspace path", async () => {
		const intel1 = await getIntelligence(WORKSPACE);
		const intel2 = await getIntelligence(WORKSPACE);

		expect(intel1).toBe(intel2);
		// isVrekoInitialized is called before the cache check on every call,
		// so second call still hits it even though the proxy is cached.
		expect(isVrekoInitialized).toHaveBeenCalledTimes(2);
	});

	it("returns different instances for different workspaces", async () => {
		const intel1 = await getIntelligence("/workspace/a");
		const intel2 = await getIntelligence("/workspace/b");

		expect(intel1).not.toBe(intel2);
	});

	it("defaults to process.cwd() when no workspace provided", async () => {
		await getIntelligence();
		expect(isVrekoInitialized).toHaveBeenCalledWith(process.cwd());
	});
});

describe("getIntelligenceWithSemantic", () => {
	it("returns a proxy (semantic handled in daemon, not CLI)", async () => {
		const intel = await getIntelligenceWithSemantic(WORKSPACE);
		expect(intel).toBeDefined();
		expect(typeof intel.getContext).toBe("function");
	});
});

describe("hasIntelligence", () => {
	it("returns true when workspace initialized and daemon available", async () => {
		expect(await hasIntelligence(WORKSPACE)).toBe(true);
	});

	it("returns false when workspace is not initialized", async () => {
		vi.mocked(isVrekoInitialized).mockResolvedValue(false);
		expect(await hasIntelligence(WORKSPACE)).toBe(false);
	});

	it("returns false when daemon is not available", async () => {
		vi.mocked(isDaemonAvailable).mockReturnValue(false);
		expect(await hasIntelligence(WORKSPACE)).toBe(false);
	});
});

describe("clearIntelligenceCache", () => {
	it("forces re-initialization on next call", async () => {
		await getIntelligence(WORKSPACE);
		expect(isVrekoInitialized).toHaveBeenCalledOnce();

		await clearIntelligenceCache();
		await getIntelligence(WORKSPACE);
		expect(isVrekoInitialized).toHaveBeenCalledTimes(2);
	});
});

describe("IntelligenceProxy – method delegation", () => {
	let sharedMockClient: ReturnType<typeof makeMockDaemonClient>;

	beforeEach(() => {
		// mockReset: true (global config) clears connectToDaemon before each test.
		// Re-setup here so DaemonIntelligenceProxy methods can resolve the client.
		sharedMockClient = makeMockDaemonClient();
		vi.mocked(connectToDaemon).mockResolvedValue(sharedMockClient as never);
		vi.mocked(requireDaemon).mockResolvedValue(sharedMockClient as never);
	});

	it("getContext delegates to daemon client.context.get", async () => {
		const mockClient = sharedMockClient;

		const intel = await getIntelligence(WORKSPACE);
		const result = await intel.getContext({ task: "fix bug", keywords: ["auth"] });

		expect(mockClient.context.get).toHaveBeenCalledWith({
			workspace: WORKSPACE,
			task: "fix bug",
			keywords: ["auth"],
			files: undefined,
		});
		expect(result.patterns).toEqual([]);
	});

	it("validateCode delegates to daemon client.validation.comprehensive", async () => {
		const mockClient = sharedMockClient;

		const intel = await getIntelligence(WORKSPACE);
		const result = await intel.validateCode("const x = 1;", "src/foo.ts");

		expect(mockClient.validation.comprehensive).toHaveBeenCalledWith({
			workspace: WORKSPACE,
			filePath: "src/foo.ts",
			code: "const x = 1;",
		});
		expect(result.passed).toBe(true);
		expect(result.confidence).toBe(0.9);
	});

	it("reportViolation delegates to daemon client.violation.report", async () => {
		const mockClient = sharedMockClient;

		const intel = await getIntelligence(WORKSPACE);
		const result = await intel.reportViolation({
			type: "silent-catch",
			file: "src/foo.ts",
			message: "swallowed error",
			reason: "copy-paste",
			prevention: "always log in catch",
		});

		expect(result.recorded).toBe(true);
		expect(result.violationId).toBe("silent-catch:src/foo.ts");
	});

	it("getLearningStats reflects total from daemon learning.list", async () => {
		sharedMockClient.learning.list.mockResolvedValue({
			learnings: [{ type: "pat", trigger: "t", action: "a" }],
			total: 5,
		});

		const intel = await getIntelligence(WORKSPACE);
		const stats = await intel.getLearningStats();

		expect(stats.totalLearnings).toBe(5);
	});

	it("getStats is an alias for getLearningStats", async () => {
		const intel = await getIntelligence(WORKSPACE);
		const a = await intel.getLearningStats();
		const b = await intel.getStats();
		expect(a).toEqual(b);
	});
});
