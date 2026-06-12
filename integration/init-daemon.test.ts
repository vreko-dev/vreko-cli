/**
 * Gate 5: Init Daemon Registration Tests
 *
 * Tests daemon registration behavior in init:
 * - --skip-daemon → daemon.skipped=true, no daemon connection attempted
 * - Daemon unavailable → errors array populated, init still succeeds
 * - daemon.connected=false when daemon is down (non-fatal)
 * - daemon.started reflects whether init attempted to start daemon
 *
 * Full daemon integration (requires live daemon) is skipped in CI.
 *
 * @see docs/plans/cli-refactor/vreko_init_doctor.md §1.8 Gate 5
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@inquirer/prompts", () => ({
	confirm: vi.fn().mockResolvedValue(true),
}));

vi.mock("@vreko/mcp-config", () => ({
	detectAIClients: vi.fn().mockReturnValue({ clients: [], detected: [], needsSetup: [] }),
	getVrekoMCPConfig: vi.fn().mockReturnValue({}),
	writeClientConfig: vi.fn().mockReturnValue({ success: true }),
}));

// The service-client mock is set up per-test using vi.doMock for flexibility
// Base mock: daemon is unavailable
vi.mock("../../src/services/service-client", () => ({
	connectToDaemon: vi.fn().mockRejectedValue(new Error("Connection refused")),
	getDaemonClient: vi.fn().mockReturnValue({
		call: vi.fn().mockRejectedValue(new Error("not connected")),
	}),
	isDaemonConnected: vi.fn().mockReturnValue(false),
}));

// child_process mock: prevent real execFileSync from spawning daemon
// Use a full synchronous mock to avoid vi.mock async-factory hoisting issues.
vi.mock("node:child_process", () => ({
	execFileSync: vi.fn().mockImplementation((cmd: string, _args?: string[]) => {
		// Block all 'vreko daemon start' calls
		if (String(cmd) === "vreko") {
			throw new Error("daemon start failed in test");
		}
		return "";
	}),
	execSync: vi.fn().mockReturnValue(""),
	spawn: vi.fn(),
	spawnSync: vi.fn().mockReturnValue({ status: 0, stdout: Buffer.from(""), stderr: Buffer.from("") }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { execFileSync } from "node:child_process";
import type { InitJsonResult } from "../../src/commands/init";
import { createInitCommand } from "../../src/commands/init";
import { connectToDaemon } from "../../src/services/service-client";

async function runInit(dir: string, flags: string[] = []): Promise<InitJsonResult> {
	const captured: string[] = [];
	const logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => captured.push(String(msg)));
	const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
	try {
		await createInitCommand().parseAsync([dir, "--json", "--yes", "--skip-mcp", ...flags], { from: "user" });
	} finally {
		logSpy.mockRestore();
		exitSpy.mockRestore();
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
		throw new Error(`No JSON captured. Got: ${captured.join("\n")}`);
	}
	return JSON.parse(jsonLine) as InitJsonResult;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Gate 5: Daemon Registration", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = mkdtempSync(join(tmpdir(), "vr-daemon-"));
		vi.clearAllMocks();
		// mockReset: true in vitest-config resets implementations  -  restore them here
		vi.mocked(connectToDaemon).mockRejectedValue(new Error("Connection refused"));
		vi.mocked(execFileSync).mockImplementation((cmd: string, _args?: unknown) => {
			if (String(cmd) === "vreko") {
				throw new Error("daemon start failed in test");
			}
			return "" as any;
		});
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	// ─── --skip-daemon flag ─────────────────────────────────────────────────

	describe("--skip-daemon flag", () => {
		it("daemon.skipped=true when --skip-daemon is passed", async () => {
			const result = await runInit(testDir, ["--skip-daemon"]);
			expect(result.daemon.skipped).toBe(true);
		});

		it("daemon.connected=false when skipped", async () => {
			const result = await runInit(testDir, ["--skip-daemon"]);
			expect(result.daemon.connected).toBe(false);
		});

		it("daemon.started=false when skipped", async () => {
			const result = await runInit(testDir, ["--skip-daemon"]);
			expect(result.daemon.started).toBe(false);
		});

		it("init succeeds when --skip-daemon is passed", async () => {
			const result = await runInit(testDir, ["--skip-daemon"]);
			expect(result.success).toBe(true);
		});

		it("workspace files are created even when daemon is skipped", async () => {
			const { existsSync } = await import("node:fs");
			const { join: pathJoin } = await import("node:path");
			await runInit(testDir, ["--skip-daemon"]);
			expect(existsSync(pathJoin(testDir, ".vreko", "config.json"))).toBe(true);
		});
	});

	// ─── Daemon unavailable (non-fatal) ─────────────────────────────────────

	describe("Daemon unavailable (graceful degradation)", () => {
		it("init succeeds even when daemon cannot be reached", async () => {
			// Daemon mock throws Connection refused → init should still succeed
			const result = await runInit(testDir);
			expect(result.success).toBe(true);
		});

		it("daemon.connected=false when daemon is unreachable", async () => {
			const result = await runInit(testDir);
			expect(result.daemon.connected).toBe(false);
		});

		it("daemon.workspaceRegistered=false when daemon is unreachable", async () => {
			const result = await runInit(testDir);
			expect(result.daemon.workspaceRegistered).toBe(false);
		});

		it("errors array mentions daemon failure", async () => {
			const result = await runInit(testDir);
			// Non-fatal daemon error should appear in errors array
			const hasError = result.errors.some(
				(e) => e.toLowerCase().includes("daemon") || e.toLowerCase().includes("connection"),
			);
			expect(hasError).toBe(true);
		});

		it("config.json is still created when daemon fails", async () => {
			const { existsSync } = await import("node:fs");
			const { join: pathJoin } = await import("node:path");
			await runInit(testDir);
			expect(existsSync(pathJoin(testDir, ".vreko", "config.json"))).toBe(true);
		});
	});

	// ─── Full daemon integration (requires live daemon) ─────────────────────

	describe("@integration Full daemon integration (requires live daemon)", () => {
		it("daemon.connected=true when daemon is running", async () => {
			// This test requires a real daemon running at the default socket path.
			// Run: vreko daemon start --detach
			// Then run this test with VREKO_TEST_DAEMON=1
			if (!process.env.VREKO_TEST_DAEMON) {
				return;
			}
			const result = await runInit(testDir);
			expect(result.daemon.connected).toBe(true);
		});

		it("daemon.workspaceRegistered=true when daemon is running", async () => {
			if (!process.env.VREKO_TEST_DAEMON) {
				return;
			}
			const result = await runInit(testDir);
			expect(result.daemon.workspaceRegistered).toBe(true);
		});
	});
});
