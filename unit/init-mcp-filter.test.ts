/**
 * Init MCP Client Filter Tests
 *
 * Verifies that configureMCP (inside vr init) iterates detection.needsSetup
 * rather than detection.detected — preventing Zed/Continue from receiving
 * broken MCP configs during init.
 *
 * Regression guard: before the fix, line 1174 used `detection.detected`,
 * writing configs for unsupported clients that UNSUPPORTED_DEFAULT_INIT_CLIENTS
 * already excluded from needsSetup.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks (hoisted) ─────────────────────────────────────────────────────────

const { mockDetectAIClients, mockWriteClientConfig, mockGetVrekoMCPConfig } = vi.hoisted(() => ({
	mockDetectAIClients: vi.fn(),
	mockWriteClientConfig: vi.fn(),
	mockGetVrekoMCPConfig: vi.fn(),
}));

vi.mock("@inquirer/prompts", () => ({
	confirm: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../src/services/service-client", () => ({
	connectToDaemon: vi.fn().mockRejectedValue(new Error("daemon not available")),
	getDaemonClient: vi.fn().mockReturnValue(null),
	isDaemonConnected: vi.fn().mockReturnValue(false),
}));

vi.mock("@vreko/mcp-config", () => ({
	detectAIClients: mockDetectAIClients,
	getVrekoMCPConfig: mockGetVrekoMCPConfig,
	writeClientConfig: mockWriteClientConfig,
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { createInitCommand } from "../../src/commands/init";
import type { InitJsonResult } from "../../src/commands/init/init-core";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeClient(overrides: {
	name: string;
	displayName?: string;
	format: string;
	configPath?: string;
	exists?: boolean;
	hasVreko?: boolean;
}) {
	return {
		displayName: `${overrides.name} AI`,
		configPath: `/mock/${overrides.name}/config`,
		exists: true,
		hasVreko: false,
		...overrides,
	};
}

async function runInit(dir: string, extraFlags: string[] = []): Promise<InitJsonResult> {
	const captured: string[] = [];
	const logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => captured.push(String(msg)));
	const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

	try {
		const cmd = createInitCommand();
		await cmd.parseAsync([dir, "--json", "--yes", "--skip-service", ...extraFlags], { from: "user" });
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
	if (!jsonLine) throw new Error(`No JSON output. Got:\n${captured.join("\n")}`);
	return JSON.parse(jsonLine) as InitJsonResult;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Init MCP client filter — needsSetup vs detected", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = mkdtempSync(join(tmpdir(), "vr-mcp-filter-"));
		vi.clearAllMocks();
		mockGetVrekoMCPConfig.mockReturnValue({ command: "npx", args: ["vreko", "mcp"] });
		mockWriteClientConfig.mockReturnValue({ success: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	it("writes config only for clients in needsSetup, not all detected", async () => {
		const claude = makeClient({ name: "claude", format: "claude", displayName: "Claude Desktop" });
		const zed = makeClient({ name: "zed", format: "zed", displayName: "Zed" });

		mockDetectAIClients.mockReturnValue({
			clients: [claude, zed],
			detected: [claude, zed],
			// Zed excluded by UNSUPPORTED_DEFAULT_INIT_CLIENTS in detect.ts
			needsSetup: [claude],
		});

		await runInit(testDir);

		expect(mockWriteClientConfig).toHaveBeenCalledTimes(1);
		expect(mockWriteClientConfig).toHaveBeenCalledWith(claude, expect.anything());
		const zedWrite = mockWriteClientConfig.mock.calls.find(([c]) => c.name === "zed");
		expect(zedWrite).toBeUndefined();
	});

	it("excludes Continue from writes even when detected", async () => {
		const cursor = makeClient({ name: "cursor", format: "cursor", displayName: "Cursor" });
		const cont = makeClient({ name: "continue", format: "continue", displayName: "Continue" });

		mockDetectAIClients.mockReturnValue({
			clients: [cursor, cont],
			detected: [cursor, cont],
			// Continue excluded by UNSUPPORTED_DEFAULT_INIT_CLIENTS
			needsSetup: [cursor],
		});

		await runInit(testDir);

		expect(mockWriteClientConfig).toHaveBeenCalledTimes(1);
		expect(mockWriteClientConfig).toHaveBeenCalledWith(cursor, expect.anything());
		const continueWrite = mockWriteClientConfig.mock.calls.find(([c]) => c.name === "continue");
		expect(continueWrite).toBeUndefined();
	});

	it("does not re-write clients that already have Vreko (hasVreko filtered before needsSetup)", async () => {
		const alreadyConfigured = makeClient({ name: "cursor", format: "cursor", hasVreko: true });
		const fresh = makeClient({ name: "claude", format: "claude", hasVreko: false });

		mockDetectAIClients.mockReturnValue({
			clients: [alreadyConfigured, fresh],
			detected: [alreadyConfigured, fresh],
			// already-configured excluded from needsSetup
			needsSetup: [fresh],
		});

		await runInit(testDir);

		expect(mockWriteClientConfig).toHaveBeenCalledTimes(1);
		expect(mockWriteClientConfig).toHaveBeenCalledWith(fresh, expect.anything());
	});

	it("skips MCP entirely when detected list is empty", async () => {
		mockDetectAIClients.mockReturnValue({ clients: [], detected: [], needsSetup: [] });

		await runInit(testDir);

		expect(mockWriteClientConfig).not.toHaveBeenCalled();
	});

	it("configures multiple supported clients from needsSetup", async () => {
		const claude = makeClient({ name: "claude", format: "claude" });
		const cursor = makeClient({ name: "cursor", format: "cursor" });
		const windsurf = makeClient({ name: "windsurf", format: "windsurf" });

		mockDetectAIClients.mockReturnValue({
			clients: [claude, cursor, windsurf],
			detected: [claude, cursor, windsurf],
			needsSetup: [claude, cursor, windsurf],
		});

		const result = await runInit(testDir);

		expect(mockWriteClientConfig).toHaveBeenCalledTimes(3);
		expect(result.mcp.configured).toHaveLength(3);
		expect(result.mcp.configured).toContain("claude");
		expect(result.mcp.configured).toContain("cursor");
		expect(result.mcp.configured).toContain("windsurf");
	});

	it("reflects configured status in JSON mcp.clients", async () => {
		const claude = makeClient({ name: "claude", format: "claude" });
		mockDetectAIClients.mockReturnValue({ clients: [claude], detected: [claude], needsSetup: [claude] });

		const result = await runInit(testDir);

		expect(result.mcp.clients["claude"]).toBe("configured");
		expect(result.mcp.configured).toContain("claude");
	});

	it("reflects failed status in JSON mcp.clients when write fails", async () => {
		const claude = makeClient({ name: "claude", format: "claude" });
		mockDetectAIClients.mockReturnValue({ clients: [claude], detected: [claude], needsSetup: [claude] });
		mockWriteClientConfig.mockReturnValue({ success: false, error: "permission denied" });

		const result = await runInit(testDir);

		expect(result.mcp.clients["claude"]).toBe("failed");
		expect(result.mcp.configured).not.toContain("claude");
	});

	it("reflects failed status when writeClientConfig throws", async () => {
		const claude = makeClient({ name: "claude", format: "claude" });
		mockDetectAIClients.mockReturnValue({ clients: [claude], detected: [claude], needsSetup: [claude] });
		mockWriteClientConfig.mockImplementation(() => {
			throw new Error("unexpected write error");
		});

		const result = await runInit(testDir);

		expect(result.mcp.clients["claude"]).toBe("failed");
	});

	it("--skip-mcp bypasses detection entirely", async () => {
		const result = await runInit(testDir, ["--skip-mcp"]);

		expect(mockDetectAIClients).not.toHaveBeenCalled();
		expect(mockWriteClientConfig).not.toHaveBeenCalled();
		expect(result.mcp.skipped).toBe(true);
	});

	it("does not write config for clients in detected but not needsSetup (mixed scenario)", async () => {
		const claude = makeClient({ name: "claude", format: "claude" });
		const zed = makeClient({ name: "zed", format: "zed" });
		const alreadyCursor = makeClient({ name: "cursor", format: "cursor", hasVreko: true });

		// detected has 3 clients; needsSetup has only claude (zed unsupported, cursor already configured)
		mockDetectAIClients.mockReturnValue({
			clients: [claude, zed, alreadyCursor],
			detected: [claude, zed, alreadyCursor],
			needsSetup: [claude],
		});

		await runInit(testDir);

		expect(mockWriteClientConfig).toHaveBeenCalledTimes(1);
		expect(mockWriteClientConfig).toHaveBeenCalledWith(claude, expect.anything());
	});
});
