/**
 * Gate 10: Doctor Knowledge Store Integration Tests
 *
 * Verifies the knowledge store check group handles all DB states:
 * - No workspace detected        → knowledge.exists skip
 * - Workspace + no DB            → knowledge.exists warn
 * - DB exists                    → knowledge.exists pass with size detail
 * - DB exists + sqlite3 works    → chunk/embedding/edge/outcome checks added
 * - All counts > 0               → all count checks pass
 * - All counts == 0              → all count checks warn
 * - Mixed counts                 → individual pass/warn per check
 * - sqlite3 unavailable/fails    → only knowledge.exists shown (no count checks)
 *
 * @see docs/plans/cli-refactor/vreko_init_doctor.md §2.8 Gate 5
 * @see apps/cli/src/commands/doctor.ts#checkKnowledgeStore
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

vi.mock("node:fs", () => ({
	existsSync: vi.fn().mockReturnValue(false),
	readFileSync: vi.fn().mockReturnValue(""),
	statSync: vi.fn().mockReturnValue({ size: 2 * 1024 * 1024 }), // 2 MB default
}));

vi.mock("node:child_process", () => ({
	execSync: vi.fn().mockReturnValue(""),
}));

vi.mock("node:os", () => ({
	homedir: vi.fn().mockReturnValue("/mock/home"),
	platform: vi.fn().mockReturnValue("darwin"),
	arch: vi.fn().mockReturnValue("arm64"),
}));

vi.mock("../../src/services/service-client", () => ({
	connectToDaemon: vi.fn().mockRejectedValue(new Error("daemon not running")),
	getDaemonClient: vi.fn().mockReturnValue(null),
	isDaemonConnected: vi.fn().mockReturnValue(false),
}));

vi.mock("@vreko/mcp-config", () => ({
	detectAIClients: vi.fn().mockReturnValue({ clients: [], detected: [], needsSetup: [] }),
	validateClientConfig: vi.fn().mockReturnValue({ valid: true, issues: [] }),
}));

vi.mock("../../src/utils/workspace", () => ({
	findWorkspaceRoot: vi.fn().mockReturnValue(null),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { detectAIClients, validateClientConfig } from "@vreko/mcp-config";
import type { DoctorJsonResult } from "../../src/commands/doctor";
import { createDoctorCommand } from "../../src/commands/doctor";
import { connectToDaemon, getDaemonClient, isDaemonConnected } from "../../src/services/service-client";
import { findWorkspaceRoot } from "../../src/utils/workspace";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function runDoctor(flags: string[] = []): Promise<DoctorJsonResult> {
	const captured: string[] = [];
	const logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => captured.push(String(msg)));
	const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
	vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

	try {
		await createDoctorCommand().parseAsync(["--json", "--local", "--check", "knowledge", ...flags], {
			from: "user",
		});
	} finally {
		logSpy.mockRestore();
		exitSpy.mockRestore();
		vi.unstubAllGlobals();
	}

	const jsonLine = captured.find((s) => {
		try {
			JSON.parse(s);
			return true;
		} catch {
			return false;
		}
	});
	if (!jsonLine) {
		throw new Error(`No JSON captured. stdout: ${captured.join("\n")}`);
	}
	return JSON.parse(jsonLine) as DoctorJsonResult;
}

/**
 * Set up mocks for a workspace with a knowledge.db at a given state.
 */
function setupWorkspaceWithDB(opts: {
	workspacePath?: string;
	dbExists: boolean;
	dbSizeBytes?: number;
	counts?: { chunks: number; embeddings: number; edges: number; outcomes: number } | null;
}): void {
	const { workspacePath = "/mock/workspace", dbExists, dbSizeBytes = 2 * 1024 * 1024, counts = null } = opts;

	vi.mocked(findWorkspaceRoot).mockReturnValue(workspacePath);

	vi.mocked(existsSync).mockImplementation((p: unknown) => {
		const path = String(p);
		if (path.includes("knowledge.db")) {
			return dbExists;
		}
		if (path.includes(".vreko")) {
			return true;
		}
		return false;
	});

	vi.mocked(statSync).mockReturnValue({ size: dbSizeBytes } as any);

	// Mock execSync for sqlite3 queries
	// The doctor calls: execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM ${table};"`)
	vi.mocked(execSync).mockImplementation((cmd: string) => {
		const cmdStr = String(cmd);
		if (!cmdStr.includes("sqlite3")) {
			return "" as any;
		}
		if (counts === null) {
			throw new Error("sqlite3: command not found");
		}

		if (cmdStr.includes("FROM chunks")) {
			return String(counts.chunks) as any;
		}
		if (cmdStr.includes("FROM embeddings")) {
			return String(counts.embeddings) as any;
		}
		if (cmdStr.includes("FROM knowledge_edges")) {
			return String(counts.edges) as any;
		}
		if (cmdStr.includes("FROM outcomes")) {
			return String(counts.outcomes) as any;
		}
		return "0" as any;
	});
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Gate 10: Doctor Knowledge Store Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Restore mock implementations  -  mockReset: true in vitest-config clears them between tests
		vi.mocked(existsSync).mockReturnValue(false);
		vi.mocked(statSync).mockReturnValue({ size: 2 * 1024 * 1024 } as any);
		vi.mocked(execSync).mockReturnValue("" as any);
		vi.mocked(homedir).mockReturnValue("/mock/home");
		vi.mocked(connectToDaemon).mockRejectedValue(new Error("daemon not running"));
		vi.mocked(getDaemonClient).mockReturnValue(null as any);
		vi.mocked(isDaemonConnected).mockReturnValue(false);
		vi.mocked(detectAIClients).mockReturnValue({ clients: [], detected: [], needsSetup: [] } as any);
		vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
		vi.mocked(findWorkspaceRoot).mockReturnValue(null);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ─── No workspace ─────────────────────────────────────────────────────────

	describe("No workspace detected", () => {
		it("knowledge.exists check is returned", async () => {
			vi.mocked(findWorkspaceRoot).mockReturnValue(null);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.exists");
			expect(check).toBeDefined();
		});

		it("knowledge.exists status is skip", async () => {
			vi.mocked(findWorkspaceRoot).mockReturnValue(null);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.exists");
			expect(check?.status).toBe("skip");
		});

		it("skip detail mentions no workspace detected", async () => {
			vi.mocked(findWorkspaceRoot).mockReturnValue(null);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.exists");
			expect(check?.detail?.toLowerCase()).toContain("workspace");
		});

		it("only 1 check returned (early return)", async () => {
			vi.mocked(findWorkspaceRoot).mockReturnValue(null);
			const result = await runDoctor();
			expect(result.checks).toHaveLength(1);
		});

		it("result.success is true (skip does not cause failure)", async () => {
			vi.mocked(findWorkspaceRoot).mockReturnValue(null);
			const result = await runDoctor();
			expect(result.success).toBe(true);
		});
	});

	// ─── Workspace but no DB ──────────────────────────────────────────────────

	describe("Workspace detected, knowledge.db does not exist", () => {
		it("knowledge.exists status is warn", async () => {
			setupWorkspaceWithDB({ dbExists: false });
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.exists");
			expect(check?.status).toBe("warn");
		});

		it("warn detail mentions 'first session'", async () => {
			setupWorkspaceWithDB({ dbExists: false });
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.exists");
			expect(check?.detail?.toLowerCase()).toContain("session");
		});

		it("only 1 check returned (early return after warn)", async () => {
			setupWorkspaceWithDB({ dbExists: false });
			const result = await runDoctor();
			expect(result.checks).toHaveLength(1);
		});

		it("result.success is true (warn does not cause failure)", async () => {
			setupWorkspaceWithDB({ dbExists: false });
			const result = await runDoctor();
			expect(result.success).toBe(true);
		});
	});

	// ─── DB exists ────────────────────────────────────────────────────────────

	describe("knowledge.db exists", () => {
		it("knowledge.exists status is pass", async () => {
			setupWorkspaceWithDB({ dbExists: true, counts: { chunks: 10, embeddings: 5, edges: 3, outcomes: 2 } });
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.exists");
			expect(check?.status).toBe("pass");
		});

		it("knowledge.exists detail includes file size in MB", async () => {
			setupWorkspaceWithDB({
				dbExists: true,
				dbSizeBytes: 5 * 1024 * 1024,
				counts: { chunks: 10, embeddings: 5, edges: 3, outcomes: 2 },
			});
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.exists");
			expect(check?.detail).toMatch(/\d+\.\d+MB/);
		});

		it("knowledge.exists detail includes the DB path", async () => {
			setupWorkspaceWithDB({ dbExists: true, counts: { chunks: 10, embeddings: 5, edges: 3, outcomes: 2 } });
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.exists");
			expect(check?.detail).toContain("knowledge.db");
		});

		it("count checks are added when sqlite3 succeeds", async () => {
			setupWorkspaceWithDB({ dbExists: true, counts: { chunks: 10, embeddings: 5, edges: 3, outcomes: 2 } });
			const result = await runDoctor();
			const ids = result.checks.map((c) => c.id);
			expect(ids).toContain("knowledge.chunks");
			expect(ids).toContain("knowledge.embeddings");
			expect(ids).toContain("knowledge.edges");
			expect(ids).toContain("knowledge.outcomes");
		});

		it("total of 5 knowledge checks when DB + sqlite3 works", async () => {
			setupWorkspaceWithDB({ dbExists: true, counts: { chunks: 10, embeddings: 5, edges: 3, outcomes: 2 } });
			const result = await runDoctor();
			expect(result.checks).toHaveLength(5);
		});
	});

	// ─── DB exists, counts > 0 ────────────────────────────────────────────────

	describe("DB exists, all counts positive", () => {
		beforeEach(() => {
			setupWorkspaceWithDB({
				dbExists: true,
				counts: { chunks: 42, embeddings: 38, edges: 15, outcomes: 7 },
			});
		});

		it("knowledge.chunks is pass", async () => {
			const result = await runDoctor();
			expect(result.checks.find((c) => c.id === "knowledge.chunks")?.status).toBe("pass");
		});

		it("knowledge.embeddings is pass", async () => {
			const result = await runDoctor();
			expect(result.checks.find((c) => c.id === "knowledge.embeddings")?.status).toBe("pass");
		});

		it("knowledge.edges is pass", async () => {
			const result = await runDoctor();
			expect(result.checks.find((c) => c.id === "knowledge.edges")?.status).toBe("pass");
		});

		it("knowledge.outcomes is pass", async () => {
			const result = await runDoctor();
			expect(result.checks.find((c) => c.id === "knowledge.outcomes")?.status).toBe("pass");
		});

		it("chunk count is reflected in detail", async () => {
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.chunks");
			expect(check?.detail).toContain("42");
		});

		it("embedding count is reflected in detail", async () => {
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.embeddings");
			expect(check?.detail).toContain("38");
		});

		it("edge count is reflected in detail", async () => {
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.edges");
			expect(check?.detail).toContain("15");
		});

		it("outcome count is reflected in detail", async () => {
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.outcomes");
			expect(check?.detail).toContain("7");
		});
	});

	// ─── DB exists, all counts = 0 ───────────────────────────────────────────

	describe("DB exists, all counts zero (fresh database)", () => {
		beforeEach(() => {
			setupWorkspaceWithDB({
				dbExists: true,
				counts: { chunks: 0, embeddings: 0, edges: 0, outcomes: 0 },
			});
		});

		it("knowledge.chunks is warn when 0 chunks", async () => {
			const result = await runDoctor();
			expect(result.checks.find((c) => c.id === "knowledge.chunks")?.status).toBe("warn");
		});

		it("knowledge.embeddings is warn when 0 embeddings", async () => {
			const result = await runDoctor();
			expect(result.checks.find((c) => c.id === "knowledge.embeddings")?.status).toBe("warn");
		});

		it("knowledge.edges is warn when 0 edges", async () => {
			const result = await runDoctor();
			expect(result.checks.find((c) => c.id === "knowledge.edges")?.status).toBe("warn");
		});

		it("knowledge.outcomes is warn when 0 outcomes", async () => {
			const result = await runDoctor();
			expect(result.checks.find((c) => c.id === "knowledge.outcomes")?.status).toBe("warn");
		});

		it("zero count  -  detail includes count", async () => {
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.chunks");
			expect(check?.detail).toContain("0");
		});

		it("result.success is true (warn is not a failure)", async () => {
			const result = await runDoctor();
			expect(result.success).toBe(true);
		});
	});

	// ─── DB exists, sqlite3 unavailable ──────────────────────────────────────

	describe("DB exists, sqlite3 CLI unavailable", () => {
		it("knowledge.exists is still pass", async () => {
			setupWorkspaceWithDB({ dbExists: true, counts: null });
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "knowledge.exists");
			expect(check?.status).toBe("pass");
		});

		it("count checks are added with warn when sqlite3 throws per-query (inner catch returns 0)", async () => {
			// doctor.ts has inner try/catch inside query() that returns 0 on error,
			// so queryKnowledgeCountsDirect still returns {chunks:0,...} rather than null.
			// All 4 count checks are included but with warn (0 count).
			setupWorkspaceWithDB({ dbExists: true, counts: null });
			const result = await runDoctor();
			const countCheckIds = ["knowledge.chunks", "knowledge.embeddings", "knowledge.edges", "knowledge.outcomes"];
			const countChecks = result.checks.filter((c) => countCheckIds.includes(c.id));
			// Inner catch returns 0 → counts are included as warn (not omitted)
			expect(countChecks.length).toBe(4);
			for (const check of countChecks) {
				expect(check.status).toBe("warn");
			}
		});

		it("5 checks total when sqlite3 unavailable (exists + 4 zero-count warns)", async () => {
			setupWorkspaceWithDB({ dbExists: true, counts: null });
			const result = await runDoctor();
			// knowledge.exists (pass) + chunks/embeddings/edges/outcomes (warn with 0)
			expect(result.checks).toHaveLength(5);
		});

		it("result.success is true when sqlite3 unavailable", async () => {
			setupWorkspaceWithDB({ dbExists: true, counts: null });
			const result = await runDoctor();
			expect(result.success).toBe(true);
		});
	});

	// ─── Mixed counts ─────────────────────────────────────────────────────────

	describe("DB exists, mixed count values", () => {
		it("checks with count > 0 are pass, checks with count == 0 are warn", async () => {
			setupWorkspaceWithDB({
				dbExists: true,
				counts: { chunks: 50, embeddings: 0, edges: 12, outcomes: 0 },
			});
			const result = await runDoctor();
			expect(result.checks.find((c) => c.id === "knowledge.chunks")?.status).toBe("pass");
			expect(result.checks.find((c) => c.id === "knowledge.embeddings")?.status).toBe("warn");
			expect(result.checks.find((c) => c.id === "knowledge.edges")?.status).toBe("pass");
			expect(result.checks.find((c) => c.id === "knowledge.outcomes")?.status).toBe("warn");
		});
	});

	// ─── Check structure ──────────────────────────────────────────────────────

	describe("Check structure and schema", () => {
		it("all knowledge checks have group='knowledge'", async () => {
			setupWorkspaceWithDB({ dbExists: true, counts: { chunks: 5, embeddings: 3, edges: 1, outcomes: 0 } });
			const result = await runDoctor();
			for (const check of result.checks) {
				expect(check.group).toBe("knowledge");
			}
		});

		it("all knowledge check IDs start with 'knowledge.'", async () => {
			setupWorkspaceWithDB({ dbExists: true, counts: { chunks: 5, embeddings: 3, edges: 1, outcomes: 0 } });
			const result = await runDoctor();
			for (const check of result.checks) {
				expect(check.id).toMatch(/^knowledge\./);
			}
		});

		it("every check has id, group, label, status", async () => {
			setupWorkspaceWithDB({ dbExists: true, counts: { chunks: 5, embeddings: 3, edges: 1, outcomes: 0 } });
			const result = await runDoctor();
			for (const check of result.checks) {
				expect(check.id).toBeTruthy();
				expect(check.group).toBeTruthy();
				expect(check.label).toBeTruthy();
				expect(["pass", "warn", "fail", "skip"]).toContain(check.status);
			}
		});
	});
});
