/**
 * Onboard Command Flow Tests
 *
 * Covers the full `vr onboard` flow:
 * - Auth token resolution (env-service, env-api, auth-file, none)
 * - MCP scan + link lifecycle (--skip-mcp, --apply-all, --dry-run)
 * - Error handling (scan failure, link failure)
 * - Edge cases (no clients to setup, all already configured)
 *
 * @see apps/cli/src/commands/onboard.ts
 * @see .vreko-swarm/specs/onboarding-selfheal-wiring.md Phase 3
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks (hoisted) ─────────────────────────────────────────────────────────

const { mockScanMcpClients, mockLinkMcpClient, mockFormatLinkResult, mockParseAsync } = vi.hoisted(() => ({
	mockScanMcpClients: vi.fn(),
	mockLinkMcpClient: vi.fn(),
	mockFormatLinkResult: vi.fn().mockReturnValue(""),
	mockParseAsync: vi.fn().mockResolvedValue(undefined),
}));

// Stub node:os so homedir() returns a controlled path
vi.mock("node:os", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:os")>();
	return {
		...actual,
		homedir: vi.fn().mockReturnValue("/mock/home"),
	};
});

// Stub node:fs to control auth.json detection without touching real disk
vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return {
		...actual,
		existsSync: vi.fn().mockReturnValue(false),
		readFileSync: vi.fn().mockReturnValue("{}"),
	};
});

// Mock mcp-service — all three exports used by onboard
vi.mock("../../src/services/mcp-service", () => ({
	scanMcpClients: mockScanMcpClients,
	linkMcpClient: mockLinkMcpClient,
	formatLinkResult: mockFormatLinkResult,
}));

// Stub the init step — onboard delegates to it via dynamic import (with .js extension)
vi.mock("../../src/commands/init/init-command.js", () => ({
	createInitCommand: vi.fn().mockReturnValue({ parseAsync: mockParseAsync }),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createOnboardCommand } from "../../src/commands/onboard";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAIClient(name: string, displayName: string, format = name) {
	return { name, displayName, format, configPath: `/mock/${name}`, exists: true, hasVreko: false };
}

async function runOnboard(args: string[] = []) {
	const logs: string[] = [];
	const warns: string[] = [];
	const logSpy = vi.spyOn(console, "log").mockImplementation((...a) => logs.push(a.map(String).join(" ")));
	const warnSpy = vi.spyOn(console, "warn").mockImplementation((...a) => warns.push(a.map(String).join(" ")));
	const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
	const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

	try {
		const cmd = createOnboardCommand();
		await cmd.parseAsync(["node", "onboard", ...args], { from: "node" });
	} finally {
		logSpy.mockRestore();
		warnSpy.mockRestore();
		errorSpy.mockRestore();
		exitSpy.mockRestore();
	}

	return { logs, warns };
}

// ─── Auth Token Tests ─────────────────────────────────────────────────────────

describe("Auth token resolution", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockScanMcpClients.mockResolvedValue({ detected: [], needsSetup: [] });
		mockLinkMcpClient.mockResolvedValue({ success: true });
		delete process.env.VREKO_SERVICE_TOKEN;
		delete process.env.VREKO_API_KEY;
		vi.mocked(existsSync).mockReturnValue(false);
	});

	afterEach(() => {
		delete process.env.VREKO_SERVICE_TOKEN;
		delete process.env.VREKO_API_KEY;
	});

	it("detects auth via VREKO_SERVICE_TOKEN and does not warn", async () => {
		process.env.VREKO_SERVICE_TOKEN = "svc-tok-test";
		const { warns, logs } = await runOnboard(["--skip-mcp"]);
		const hasAuthWarn = warns.some((w) => w.includes("no API key"));
		expect(hasAuthWarn).toBe(false);
		const hasAuthLog = logs.some((l) => l.includes("env-service"));
		expect(hasAuthLog).toBe(true);
	});

	it("detects auth via VREKO_API_KEY and does not warn", async () => {
		process.env.VREKO_API_KEY = "api-key-test";
		const { warns, logs } = await runOnboard(["--skip-mcp"]);
		const hasAuthWarn = warns.some((w) => w.includes("no API key"));
		expect(hasAuthWarn).toBe(false);
		const hasAuthLog = logs.some((l) => l.includes("env-api"));
		expect(hasAuthLog).toBe(true);
	});

	it("detects auth via ~/.vreko/auth.json token field", async () => {
		vi.mocked(homedir).mockReturnValue("/mock/home");
		vi.mocked(existsSync).mockImplementation((p) => String(p).endsWith("auth.json"));
		vi.mocked(readFileSync).mockImplementation((p) => {
			if (String(p).endsWith("auth.json")) return JSON.stringify({ token: "from-file-tok" });
			return "{}";
		});

		const { warns, logs } = await runOnboard(["--skip-mcp"]);
		const hasAuthWarn = warns.some((w) => w.includes("no API key"));
		expect(hasAuthWarn).toBe(false);
		const hasAuthLog = logs.some((l) => l.includes("auth-file"));
		expect(hasAuthLog).toBe(true);
	});

	it("shows warning when no token is present anywhere", async () => {
		vi.mocked(existsSync).mockReturnValue(false);

		const { warns } = await runOnboard(["--skip-mcp"]);
		const hasAuthWarn = warns.some((w) => w.includes("no API key"));
		expect(hasAuthWarn).toBe(true);
	});

	it("shows warning when auth.json exists but has no token field", async () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ notAToken: "nope" }));

		const { warns } = await runOnboard(["--skip-mcp"]);
		const hasAuthWarn = warns.some((w) => w.includes("no API key"));
		expect(hasAuthWarn).toBe(true);
	});

	it("does not crash when auth.json is malformed JSON", async () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue("not-valid-json{{");

		const { warns } = await runOnboard(["--skip-mcp"]);
		// Malformed auth.json treated as missing token → warning shown
		const hasAuthWarn = warns.some((w) => w.includes("no API key"));
		expect(hasAuthWarn).toBe(true);
	});
});

// ─── --skip-mcp Flag ──────────────────────────────────────────────────────────

describe("--skip-mcp flag", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.VREKO_API_KEY = "test-key";
		mockScanMcpClients.mockResolvedValue({ detected: [], needsSetup: [] });
		mockLinkMcpClient.mockResolvedValue({ success: true });
	});

	afterEach(() => {
		delete process.env.VREKO_API_KEY;
	});

	it("does not call scanMcpClients when --skip-mcp is passed", async () => {
		await runOnboard(["--skip-mcp"]);
		expect(mockScanMcpClients).not.toHaveBeenCalled();
	});

	it("does not call linkMcpClient when --skip-mcp is passed", async () => {
		await runOnboard(["--skip-mcp"]);
		expect(mockLinkMcpClient).not.toHaveBeenCalled();
	});

	it("logs skip message when --skip-mcp is passed", async () => {
		const { logs } = await runOnboard(["--skip-mcp"]);
		expect(logs.some((l) => l.includes("skipped"))).toBe(true);
	});
});

// ─── --dry-run Flag ───────────────────────────────────────────────────────────

describe("--dry-run flag", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.VREKO_API_KEY = "test-key";
		mockLinkMcpClient.mockResolvedValue({ success: true });
	});

	afterEach(() => {
		delete process.env.VREKO_API_KEY;
	});

	it("does not call linkMcpClient in dry-run mode", async () => {
		const claude = makeAIClient("claude", "Claude Desktop");
		mockScanMcpClients.mockResolvedValue({ detected: [claude], needsSetup: [claude] });

		await runOnboard(["--dry-run"]);

		expect(mockLinkMcpClient).not.toHaveBeenCalled();
	});

	it("logs would-link message for each client in dry-run", async () => {
		const claude = makeAIClient("claude", "Claude Desktop");
		const cursor = makeAIClient("cursor", "Cursor");
		mockScanMcpClients.mockResolvedValue({ detected: [claude, cursor], needsSetup: [claude, cursor] });

		const { logs } = await runOnboard(["--dry-run"]);

		expect(logs.some((l) => l.includes("would link") && l.includes("Claude Desktop"))).toBe(true);
		expect(logs.some((l) => l.includes("would link") && l.includes("Cursor"))).toBe(true);
	});
});

// ─── --apply-all Flag ─────────────────────────────────────────────────────────

describe("--apply-all flag", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.VREKO_API_KEY = "test-key";
		mockLinkMcpClient.mockResolvedValue({
			success: true,
			clientDisplayName: "",
			serverKey: "",
			configPath: "",
			validated: true,
		});
		mockFormatLinkResult.mockReturnValue("");
	});

	afterEach(() => {
		delete process.env.VREKO_API_KEY;
	});

	it("links all needsSetup clients without prompting", async () => {
		const claude = makeAIClient("claude", "Claude Desktop");
		const cursor = makeAIClient("cursor", "Cursor");
		mockScanMcpClients.mockResolvedValue({ detected: [claude, cursor], needsSetup: [claude, cursor] });

		await runOnboard(["--apply-all"]);

		expect(mockLinkMcpClient).toHaveBeenCalledTimes(2);
		expect(mockLinkMcpClient).toHaveBeenCalledWith(expect.objectContaining({ client: "claude" }));
		expect(mockLinkMcpClient).toHaveBeenCalledWith(expect.objectContaining({ client: "cursor" }));
	});

	it("passes client.format to linkMcpClient", async () => {
		const windsurf = makeAIClient("windsurf", "Windsurf", "windsurf");
		mockScanMcpClients.mockResolvedValue({ detected: [windsurf], needsSetup: [windsurf] });

		await runOnboard(["--apply-all"]);

		expect(mockLinkMcpClient).toHaveBeenCalledWith(expect.objectContaining({ client: "windsurf" }));
	});

	it("logs 'done' after successful link", async () => {
		const claude = makeAIClient("claude", "Claude Desktop");
		mockScanMcpClients.mockResolvedValue({ detected: [claude], needsSetup: [claude] });

		const { logs } = await runOnboard(["--apply-all"]);

		expect(logs.some((l) => l.includes("done"))).toBe(true);
	});

	it("logs failure message when linkMcpClient returns success:false", async () => {
		const claude = makeAIClient("claude", "Claude Desktop");
		mockScanMcpClients.mockResolvedValue({ detected: [claude], needsSetup: [claude] });
		mockLinkMcpClient.mockResolvedValue({ success: false, error: "config locked" });

		const { logs } = await runOnboard(["--apply-all"]);

		expect(logs.some((l) => l.includes("failed") && l.includes("config locked"))).toBe(true);
	});
});

// ─── No Clients Needing Setup ─────────────────────────────────────────────────

describe("needsSetup empty", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.VREKO_API_KEY = "test-key";
	});

	afterEach(() => {
		delete process.env.VREKO_API_KEY;
	});

	it("shows 'already configured' when detected > 0 but needsSetup === 0", async () => {
		const claude = makeAIClient("claude", "Claude Desktop");
		mockScanMcpClients.mockResolvedValue({ detected: [claude], needsSetup: [] });

		const { logs } = await runOnboard();

		expect(logs.some((l) => l.includes("already configured"))).toBe(true);
	});

	it("is silent (no extra output) when detected === 0 and needsSetup === 0", async () => {
		mockScanMcpClients.mockResolvedValue({ detected: [], needsSetup: [] });

		const { logs } = await runOnboard();

		// No MCP-specific messages (just auth log if token present)
		const mcpLogs = logs.filter(
			(l) => l.includes("already configured") || l.includes("would link") || l.includes("Linking"),
		);
		expect(mcpLogs).toHaveLength(0);
	});

	it("does not call linkMcpClient when needsSetup is empty", async () => {
		mockScanMcpClients.mockResolvedValue({ detected: [], needsSetup: [] });

		await runOnboard();

		expect(mockLinkMcpClient).not.toHaveBeenCalled();
	});
});

// ─── Error Handling ───────────────────────────────────────────────────────────

describe("error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.VREKO_API_KEY = "test-key";
	});

	afterEach(() => {
		delete process.env.VREKO_API_KEY;
	});

	it("shows warning and continues when scanMcpClients throws", async () => {
		mockScanMcpClients.mockRejectedValue(new Error("scan failed: fs error"));

		const { warns } = await runOnboard();

		expect(warns.some((w) => w.includes("MCP client detection failed"))).toBe(true);
		expect(warns.some((w) => w.includes("scan failed"))).toBe(true);
	});

	it("does not crash when scanMcpClients throws", async () => {
		mockScanMcpClients.mockRejectedValue(new Error("boom"));

		// Should not throw
		await expect(runOnboard()).resolves.not.toThrow();
	});

	it("shows warning and continues when linkMcpClient throws", async () => {
		const claude = makeAIClient("claude", "Claude Desktop");
		mockScanMcpClients.mockResolvedValue({ detected: [claude], needsSetup: [claude] });
		mockLinkMcpClient.mockRejectedValue(new Error("link error"));

		const { warns } = await runOnboard(["--apply-all"]);

		expect(warns.some((w) => w.includes("Link failed") || w.includes("link error"))).toBe(true);
	});

	it("continues linking remaining clients after one link throws", async () => {
		const claude = makeAIClient("claude", "Claude Desktop");
		const cursor = makeAIClient("cursor", "Cursor");
		mockScanMcpClients.mockResolvedValue({ detected: [claude, cursor], needsSetup: [claude, cursor] });

		// First call throws, second succeeds
		mockLinkMcpClient.mockRejectedValueOnce(new Error("claude link error")).mockResolvedValueOnce({
			success: true,
			clientDisplayName: "Cursor",
			serverKey: "",
			configPath: "",
			validated: true,
		});

		const { logs } = await runOnboard(["--apply-all"]);

		expect(mockLinkMcpClient).toHaveBeenCalledTimes(2);
		// Cursor still shows "done" despite claude failing
		expect(logs.some((l) => l.includes("done"))).toBe(true);
	});
});

// ─── --quiet Flag ─────────────────────────────────────────────────────────────

describe("--quiet flag", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.VREKO_API_KEY = "test-key";
		mockScanMcpClients.mockResolvedValue({ detected: [], needsSetup: [] });
	});

	afterEach(() => {
		delete process.env.VREKO_API_KEY;
	});

	it("suppresses informational output in quiet mode", async () => {
		const { logs } = await runOnboard(["--quiet", "--skip-mcp"]);
		// Header "Vreko Onboarding" and auth-found lines should be suppressed
		expect(logs.filter((l) => l.includes("Vreko Onboarding")).length).toBe(0);
		expect(logs.filter((l) => l.includes("env-api")).length).toBe(0);
	});
});

// ─── Init Step Integration ────────────────────────────────────────────────────
//
// The init step is invoked via dynamic import inside the action handler.
// Direct mock interception of dynamic imports is unreliable in this test
// environment, so these tests verify the observable contract instead:
// onboard's MCP scan runs via scanMcpClients (proving the MCP path goes
// through onboard, not init), and the overall flow completes cleanly.

describe("init step delegation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.VREKO_API_KEY = "test-key";
		mockScanMcpClients.mockResolvedValue({ detected: [], needsSetup: [] });
		mockLinkMcpClient.mockResolvedValue({ success: true });
	});

	afterEach(() => {
		delete process.env.VREKO_API_KEY;
	});

	it("runs scanMcpClients via onboard's own MCP phase (not init's)", async () => {
		// scanMcpClients should be called exactly once — by onboard's Step 3,
		// not by init. If init ran its own MCP phase, we'd see side effects
		// in the not-mocked @vreko/mcp-config layer instead.
		await runOnboard();
		expect(mockScanMcpClients).toHaveBeenCalledTimes(1);
	});

	it("scanMcpClients is not called when --skip-mcp is passed to onboard", async () => {
		await runOnboard(["--skip-mcp"]);
		expect(mockScanMcpClients).not.toHaveBeenCalled();
	});

	it("does not exit on success — completes normally", async () => {
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
		try {
			await runOnboard(["--skip-mcp"]);
			expect(exitSpy).not.toHaveBeenCalled();
		} finally {
			exitSpy.mockRestore();
		}
	});
});
