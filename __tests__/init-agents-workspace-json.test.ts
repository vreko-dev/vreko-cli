/**
 * Regression integration tests: vr init creates workspace.json
 *
 * REQ-004: Mock-based integration test of the init flow IPC call sequence.
 *
 * Tests verify that registerWithDaemon + the Phase 3 post-registration block
 * calls workspace/init, workspace/trigger-workspace-json-write, and
 * workspace/write-from-scan-profile in order when the daemon is connected.
 *
 * REQ-001 anti-pattern guard: REQ-004 anti-pattern guard: never spawn a real daemon.
 * All IPC calls are mocked via vi.mock('../services/service-client').
 *
 * Locked in 2026-05-20  -  Pioneer cohort launch blocker.
 */

import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// REQ-004 anti-pattern guard: never spawn the real daemon
vi.mock("node:child_process", () => ({
	execFileSync: vi.fn(),
}));

vi.mock("node:os", () => ({
	homedir: vi.fn().mockReturnValue("/tmp/test-home"),
}));

// Mock mcp-config so resolveVrekoBinaryPath is deterministic
vi.mock("@vreko/mcp-config", () => ({
	detectAIClients: vi.fn().mockReturnValue({ clients: [], detected: [], needsSetup: [] }),
	getVrekoMCPConfig: vi.fn().mockReturnValue({ url: "https://mcp.vreko.dev/mcp" }),
	writeClientConfig: vi.fn().mockReturnValue({ success: true }),
	resolveVrekoBinaryPath: vi.fn().mockReturnValue("/usr/local/bin/vreko"),
}));

vi.mock("@clack/prompts", () => ({
	confirm: vi.fn().mockResolvedValue(true),
	isCancel: vi.fn().mockReturnValue(false),
	cancel: vi.fn(),
}));

// node:fs mock  -  default to all-exists so workspace detection passes
vi.mock("node:fs", () => ({
	existsSync: vi.fn().mockReturnValue(true),
	mkdirSync: vi.fn(),
	statSync: vi.fn().mockReturnValue({ isDirectory: () => true, mtimeMs: Date.now() }),
	readFileSync: vi.fn().mockReturnValue("{}"),
	writeFileSync: vi.fn(),
	appendFileSync: vi.fn(),
}));

vi.mock("../utils/workspace", () => ({
	findGitRoot: vi.fn().mockReturnValue("/fake/workspace"),
}));

vi.mock("../service-adapter/local-service-adapter", () => ({
	getServicePidPath: vi.fn().mockReturnValue("/tmp/test-home/.vreko/service.pid"),
}));

// REQ-004 CORRECT: mock connectToDaemon and getDaemonClient  -  never real IPC
// vi.hoisted ensures these are initialized before the hoisted vi.mock factories run
const { mockCall, mockClient } = vi.hoisted(() => {
	const mockCall = vi.fn();
	const mockClient = {
		call: mockCall,
		health: {
			check: vi.fn().mockResolvedValue({ version: "3.0.0-test" }),
		},
	};
	return { mockCall, mockClient };
});

vi.mock("../services/service-client", () => ({
	connectToDaemon: vi.fn().mockResolvedValue(mockClient),
	getDaemonClient: vi.fn().mockReturnValue(mockClient),
	isDaemonConnected: vi.fn().mockReturnValue(true),
}));

import { createInitCommand } from "../commands/init/init-core.js";
// ── Imports after mocks ───────────────────────────────────────────────────────
import { connectToDaemon, getDaemonClient } from "../services/service-client";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the IPC call method names in order from mockCall.mock.calls */
function ipcCallOrder(): string[] {
	return mockCall.mock.calls.map((c: unknown[]) => c[0] as string);
}

/** Run vr init --json --yes --non-interactive for a given workspace path */
async function runInit(workspacePath: string, extraArgs: string[] = []): Promise<void> {
	const cmd = createInitCommand();
	await cmd.parseAsync([workspacePath, "--json", "--yes", "--non-interactive", ...extraArgs], { from: "user" });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("REQ-004: vr init IPC call sequence for workspace.json", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default: workspace dir exists, is a directory, config.json does NOT exist
		vi.mocked(existsSync).mockImplementation((p) => {
			const ps = String(p);
			if (ps.endsWith("config.json")) return false; // fresh workspace
			return true;
		});
		vi.mocked(statSync).mockReturnValue({
			isDirectory: () => true,
			mtimeMs: Date.now(),
		} as ReturnType<typeof statSync>);

		// Daemon: connectToDaemon resolves, getDaemonClient returns mock
		vi.mocked(connectToDaemon).mockResolvedValue(mockClient as never);
		vi.mocked(getDaemonClient).mockReturnValue(mockClient as never);

		// Default IPC: all calls succeed
		mockCall.mockResolvedValue({ initialized: true, triggered: true, seeded: 0, alreadyPresent: 0 });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("fresh init: workspace/init, workspace/trigger-workspace-json-write, workspace/write-from-scan-profile are all called when daemon is connected", async () => {
		await runInit("/fake/workspace");

		const calls = ipcCallOrder();
		expect(calls).toContain("workspace/init");
		expect(calls).toContain("workspace/trigger-workspace-json-write");
		expect(calls).toContain("workspace/write-from-scan-profile");

		// Ordering: init must precede the two workspace.json writes
		const initIdx = calls.indexOf("workspace/init");
		const triggerIdx = calls.indexOf("workspace/trigger-workspace-json-write");
		const writeIdx = calls.indexOf("workspace/write-from-scan-profile");
		expect(initIdx).toBeLessThan(triggerIdx);
		expect(initIdx).toBeLessThan(writeIdx);
	});

	it("--force re-init: same three IPC calls are made (not short-circuited by alreadyInitialized)", async () => {
		// config.json exists → alreadyInitialized = true; --force must bypass the early return
		vi.mocked(existsSync).mockImplementation((p) => {
			if (String(p).endsWith(".claude/settings.json")) return false;
			return true; // config.json exists
		});

		await runInit("/fake/workspace", ["--force"]);

		const calls = ipcCallOrder();
		expect(calls).toContain("workspace/init");
		expect(calls).toContain("workspace/trigger-workspace-json-write");
		expect(calls).toContain("workspace/write-from-scan-profile");
	});

	it("skipService: true  -  none of the three IPC calls are made", async () => {
		await runInit("/fake/workspace", ["--skip-service"]);

		const calls = ipcCallOrder();
		expect(calls).not.toContain("workspace/init");
		expect(calls).not.toContain("workspace/trigger-workspace-json-write");
		expect(calls).not.toContain("workspace/write-from-scan-profile");
	});

	it("daemon not connected  -  IPC calls are skipped gracefully with no unhandled rejection", async () => {
		vi.mocked(connectToDaemon).mockRejectedValue(new Error("connection refused"));
		// execFileSync (service start) also fails so we stay disconnected
		const { execFileSync } = await import("node:child_process");
		vi.mocked(execFileSync).mockImplementation(() => {
			throw new Error("vreko: command not found");
		});

		// Must not throw
		await expect(runInit("/fake/workspace")).resolves.not.toThrow();

		// IPC calls must not have been attempted
		const calls = ipcCallOrder();
		expect(calls).not.toContain("workspace/init");
		expect(calls).not.toContain("workspace/trigger-workspace-json-write");
		expect(calls).not.toContain("workspace/write-from-scan-profile");
	});
});
