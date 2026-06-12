/**
 * Gate 9: Doctor MCP Integration Tests
 *
 * Verifies the MCP check group handles all client states:
 * - No clients detected         → mcp.detection warn
 * - Client not installed        → mcp.X.installed skip
 * - Client installed, no config → mcp.X.configured warn + fixCommand
 * - Client installed + valid    → mcp.X.valid pass
 * - Client installed + errors   → mcp.X.valid fail + fixCommand
 * - Client installed + warnings → mcp.X.valid warn + fixCommand
 * - Multiple clients            → one check per client
 * - Deduplication               → same-name clients merged (best wins)
 * - fixCommand format           → vreko tools configure --X --yes
 *
 * @see docs/plans/cli-refactor/vreko_init_doctor.md §2.8 Gate 4
 * @see apps/cli/src/commands/doctor.ts#checkMCP
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

vi.mock("node:fs", () => ({
	existsSync: vi.fn().mockReturnValue(false),
	readFileSync: vi.fn().mockReturnValue(""),
	statSync: vi.fn().mockReturnValue({ size: 0 }),
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
	readClientConfig: vi.fn().mockReturnValue(undefined),
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function runDoctor(flags: string[] = []): Promise<DoctorJsonResult> {
	const captured: string[] = [];
	const logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => captured.push(String(msg)));
	const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
	vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

	try {
		await createDoctorCommand().parseAsync(["--json", "--local", "--check", "mcp", ...flags], { from: "user" });
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

type MockClient = {
	name: string;
	displayName: string;
	configPath: string;
	format: string;
	exists: boolean;
	hasVreko: boolean;
};

function makeClient(overrides: Partial<MockClient> = {}): MockClient {
	return {
		name: "cursor",
		displayName: "Cursor",
		configPath: "/mock/cursor/.cursor/mcp.json",
		format: "cursor",
		exists: true,
		hasVreko: true,
		...overrides,
	};
}

function setClients(clients: MockClient[]): void {
	vi.mocked(detectAIClients).mockReturnValue({
		clients,
		detected: clients.filter((c) => c.exists).map((c) => c.name),
		needsSetup: clients.filter((c) => c.exists && !c.hasVreko).map((c) => c.name),
	} as any);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Gate 9: Doctor MCP Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Restore mock implementations (mockReset: true in vitest-config clears them)
		vi.mocked(existsSync).mockReturnValue(false);
		vi.mocked(statSync).mockReturnValue({ size: 0 } as any);
		vi.mocked(execSync).mockReturnValue("" as any);
		vi.mocked(homedir).mockReturnValue("/mock/home");
		vi.mocked(connectToDaemon).mockRejectedValue(new Error("daemon not running"));
		vi.mocked(getDaemonClient).mockReturnValue(null as any);
		vi.mocked(isDaemonConnected).mockReturnValue(false);
		vi.mocked(detectAIClients).mockReturnValue({
			clients: [],
			detected: [],
			needsSetup: [],
		} as any);
		vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ─── No clients ──────────────────────────────────────────────────────────

	describe("No AI clients detected", () => {
		it("returns mcp.detection check", async () => {
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.detection");
			expect(check).toBeDefined();
		});

		it("mcp.detection status is warn", async () => {
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.detection");
			expect(check?.status).toBe("warn");
		});

		it("mcp.detection group is 'mcp'", async () => {
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.detection");
			expect(check?.group).toBe("mcp");
		});

		it("exactly 1 mcp check when no clients", async () => {
			const result = await runDoctor();
			expect(result.checks).toHaveLength(1);
			expect(result.checks[0].id).toBe("mcp.detection");
		});
	});

	// ─── Client not installed ─────────────────────────────────────────────────

	describe("Client not installed (exists=false)", () => {
		it("mcp.X.installed check with skip status", async () => {
			setClients([makeClient({ name: "windsurf", displayName: "Windsurf", exists: false, hasVreko: false })]);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.windsurf.installed");
			expect(check?.status).toBe("skip");
		});

		it("skip detail says 'Not installed'", async () => {
			setClients([makeClient({ name: "windsurf", displayName: "Windsurf", exists: false, hasVreko: false })]);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.windsurf.installed");
			expect(check?.detail).toContain("Not installed");
		});

		it("label reflects the client display name", async () => {
			setClients([makeClient({ name: "windsurf", displayName: "Windsurf", exists: false, hasVreko: false })]);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.windsurf.installed");
			expect(check?.label).toContain("Windsurf");
		});

		it("no fixCommand for not-installed client", async () => {
			setClients([makeClient({ name: "windsurf", displayName: "Windsurf", exists: false, hasVreko: false })]);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.windsurf.installed");
			expect(check?.fixCommand).toBeFalsy();
		});
	});

	// ─── Client installed, not configured ────────────────────────────────────

	describe("Client installed but Vreko not configured", () => {
		it("returns mcp.X.configured check", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: false })]);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.configured");
			expect(check).toBeDefined();
		});

		it("mcp.X.configured status is warn", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: false })]);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.configured");
			expect(check?.status).toBe("warn");
		});

		it("detail mentions Vreko not configured", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: false })]);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.configured");
			expect(check?.detail).toContain("Vreko not configured");
		});

		it("fix message suggests vreko tools configure", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: false })]);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.configured");
			expect(check?.fix).toContain("vreko tools configure");
			expect(check?.fix).toContain("--cursor");
		});

		it("fixCommand format: vreko tools configure --cursor --yes", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: false })]);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.configured");
			expect(check?.fixCommand).toBe("vreko tools configure --cursor --yes");
		});

		it("validateClientConfig is NOT called for unconfigured clients", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: false })]);
			await runDoctor();
			// validateClientConfig should only be called for clients with hasVreko=true
			expect(vi.mocked(validateClientConfig)).not.toHaveBeenCalled();
		});
	});

	// ─── Client installed and configured (valid) ──────────────────────────────

	describe("Client installed and configured (valid config)", () => {
		it("returns mcp.X.valid check", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: true })]);
			vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.valid");
			expect(check).toBeDefined();
		});

		it("mcp.X.valid status is pass", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: true })]);
			vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.valid");
			expect(check?.status).toBe("pass");
		});

		it("detail confirms config valid", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: true })]);
			vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.valid");
			expect(check?.detail).toContain("valid");
		});

		it("no fixCommand for valid config", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: true })]);
			vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.valid");
			expect(check?.fixCommand).toBeFalsy();
		});
	});

	// ─── Client installed + configured, validation errors ────────────────────

	describe("Client configured with validation errors", () => {
		it("mcp.X.valid status is fail when there are error-severity issues", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: true })]);
			vi.mocked(validateClientConfig).mockReturnValue({
				valid: false,
				issues: [{ severity: "error", message: "Missing command field" }],
			} as any);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.valid");
			expect(check?.status).toBe("fail");
		});

		it("detail includes the error message", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: true })]);
			vi.mocked(validateClientConfig).mockReturnValue({
				valid: false,
				issues: [{ severity: "error", message: "Missing command field" }],
			} as any);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.valid");
			expect(check?.detail).toContain("Missing command field");
		});

		it("fixCommand for error: vreko tools configure --cursor --force --yes", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: true })]);
			vi.mocked(validateClientConfig).mockReturnValue({
				valid: false,
				issues: [{ severity: "error", message: "Bad config" }],
			} as any);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.valid");
			expect(check?.fixCommand).toContain("--cursor");
			expect(check?.fixCommand).toContain("--force");
		});

		it("mcp.X.valid status is warn when only warning-severity issues", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: true })]);
			vi.mocked(validateClientConfig).mockReturnValue({
				valid: false,
				issues: [{ severity: "warning", message: "Consider updating server path" }],
			} as any);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.valid");
			expect(check?.status).toBe("warn");
		});

		it("multiple issues  -  all messages concatenated in detail", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: true })]);
			vi.mocked(validateClientConfig).mockReturnValue({
				valid: false,
				issues: [
					{ severity: "error", message: "Error one" },
					{ severity: "warning", message: "Warning two" },
				],
			} as any);
			const result = await runDoctor();
			const check = result.checks.find((c) => c.id === "mcp.cursor.valid");
			expect(check?.detail).toContain("Error one");
			expect(check?.detail).toContain("Warning two");
		});
	});

	// ─── Multiple clients ─────────────────────────────────────────────────────

	describe("Multiple clients", () => {
		it("each installed+configured client produces its own check", async () => {
			setClients([
				makeClient({ name: "cursor", displayName: "Cursor", hasVreko: true }),
				makeClient({
					name: "windsurf",
					displayName: "Windsurf",
					configPath: "/mock/windsurf/mcp.json",
					format: "windsurf",
					hasVreko: true,
				}),
			]);
			vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
			const result = await runDoctor();
			expect(result.checks.find((c) => c.id === "mcp.cursor.valid")).toBeDefined();
			expect(result.checks.find((c) => c.id === "mcp.windsurf.valid")).toBeDefined();
		});

		it("mixed states: one pass, one warn", async () => {
			setClients([
				makeClient({ name: "cursor", hasVreko: true }),
				makeClient({ name: "windsurf", displayName: "Windsurf", format: "windsurf", hasVreko: false }),
			]);
			vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
			const result = await runDoctor();
			const cursorCheck = result.checks.find((c) => c.id === "mcp.cursor.valid");
			const windsurfCheck = result.checks.find((c) => c.id === "mcp.windsurf.configured");
			expect(cursorCheck?.status).toBe("pass");
			expect(windsurfCheck?.status).toBe("warn");
		});

		it("check count equals number of clients (one check per client)", async () => {
			setClients([
				makeClient({ name: "cursor", hasVreko: true }),
				makeClient({ name: "windsurf", displayName: "Windsurf", format: "windsurf", hasVreko: true }),
				makeClient({
					name: "qoder",
					displayName: "Qoder",
					format: "claude",
					exists: false,
					hasVreko: false,
				}),
			]);
			vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
			const result = await runDoctor();
			// 3 clients → 3 checks
			expect(result.checks).toHaveLength(3);
		});
	});

	// ─── Deduplication ────────────────────────────────────────────────────────

	describe("Client deduplication (same name, multiple config paths)", () => {
		it("same-name clients produce a single check", async () => {
			// Simulates Cursor with both global and workspace configs
			setClients([
				makeClient({ name: "cursor", configPath: "/mock/global/mcp.json", hasVreko: false }),
				makeClient({ name: "cursor", configPath: "/mock/workspace/mcp.json", hasVreko: true }),
			]);
			vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
			const result = await runDoctor();
			const cursorChecks = result.checks.filter((c) => c.id.startsWith("mcp.cursor"));
			expect(cursorChecks).toHaveLength(1);
		});

		it("deduplication picks the entry with hasVreko=true (best wins)", async () => {
			setClients([
				makeClient({ name: "cursor", configPath: "/mock/global/mcp.json", hasVreko: false }),
				makeClient({ name: "cursor", configPath: "/mock/workspace/mcp.json", hasVreko: true }),
			]);
			vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
			const result = await runDoctor();
			// Should show 'valid' (pass), not 'configured' (warn), because hasVreko=true entry was chosen
			const check = result.checks.find((c) => c.id === "mcp.cursor.valid");
			expect(check?.status).toBe("pass");
		});

		it("deduplication prefers exists=true over exists=false", async () => {
			setClients([
				makeClient({ name: "cursor", exists: false, hasVreko: false }),
				makeClient({ name: "cursor", configPath: "/mock/other.json", exists: true, hasVreko: false }),
			]);
			const result = await runDoctor();
			// exists=true is preferred: should be 'configured' warn, not 'installed' skip
			const check = result.checks.find((c) => c.id.startsWith("mcp.cursor"));
			expect(check?.status).not.toBe("skip");
		});
	});

	// ─── Check structure ──────────────────────────────────────────────────────

	describe("Check structure and schema", () => {
		it("all mcp checks have group='mcp'", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: true })]);
			vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
			const result = await runDoctor();
			for (const check of result.checks) {
				expect(check.group).toBe("mcp");
			}
		});

		it("all mcp check IDs start with 'mcp.'", async () => {
			setClients([makeClient({ name: "cursor", hasVreko: true })]);
			vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
			const result = await runDoctor();
			for (const check of result.checks) {
				expect(check.id).toMatch(/^mcp\./);
			}
		});

		it("every check has id, group, label, status", async () => {
			setClients([
				makeClient({ name: "cursor", hasVreko: true }),
				makeClient({ name: "windsurf", displayName: "Windsurf", exists: false, hasVreko: false }),
			]);
			vi.mocked(validateClientConfig).mockReturnValue({ valid: true, issues: [] } as any);
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
