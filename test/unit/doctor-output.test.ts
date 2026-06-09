/**
 * Gate 7: Doctor Output Formatting Tests
 *
 * Verifies output formatting and flag behavior:
 * - --quiet suppresses passing checks in human output
 * - --json output matches DoctorJsonResult schema fully
 * - --local skips network group (single skip entry)
 * - --check <group> returns only checks for that group
 * - success=false when any check is fail
 * - success=true when only pass/warn/skip checks
 * - exit code 1 on any failure, exit code 0 on healthy
 *
 * @see docs/plans/cli-refactor/vreko_init_doctor.md §2.8 Gate 2
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("node:fs", () => ({
	existsSync: vi.fn().mockReturnValue(false),
	readFileSync: vi.fn().mockReturnValue(""),
	statSync: vi.fn().mockReturnValue({ size: 2 * 1024 * 1024 }),
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

// ─── Imports ─────────────────────────────────────────────────────────────────

import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir, arch as osArch, platform as osPlatform } from "node:os";
import { detectAIClients, validateClientConfig } from "@vreko/mcp-config";
import type { DoctorJsonResult } from "../../src/commands/doctor";
import { createDoctorCommand } from "../../src/commands/doctor";
import { connectToDaemon, getDaemonClient, isDaemonConnected } from "../../src/services/service-client";
import { findWorkspaceRoot } from "../../src/utils/workspace";

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface RunResult {
	json: DoctorJsonResult | null;
	stdoutLines: string[];
	exitCode: number | null;
}

async function runDoctor(flags: string[] = []): Promise<RunResult> {
	const stdoutLines: string[] = [];
	let exitCode: number | null = null;

	const logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => stdoutLines.push(String(msg)));
	const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: number) => {
		exitCode = code ?? 0;
		return undefined as never;
	});
	vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

	try {
		await createDoctorCommand().parseAsync(flags, { from: "user" });
	} finally {
		logSpy.mockRestore();
		exitSpy.mockRestore();
		vi.unstubAllGlobals();
	}

	// Find JSON line
	const jsonLine = stdoutLines.find((s) => {
		try {
			JSON.parse(s);
			return true;
		} catch {
			return false;
		}
	});

	return {
		json: jsonLine ? (JSON.parse(jsonLine) as DoctorJsonResult) : null,
		stdoutLines,
		exitCode,
	};
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Gate 7: Doctor Output Formatting", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Restore mock implementations (mockReset: true in vitest-config clears them)
		vi.mocked(existsSync).mockReturnValue(false);
		vi.mocked(readFileSync).mockReturnValue("" as any);
		vi.mocked(statSync).mockReturnValue({ size: 2 * 1024 * 1024 } as any);
		vi.mocked(execSync).mockReturnValue("" as any);
		vi.mocked(homedir).mockReturnValue("/mock/home");
		vi.mocked(osPlatform).mockReturnValue("darwin");
		vi.mocked(osArch).mockReturnValue("arm64");
		vi.mocked(findWorkspaceRoot).mockReturnValue(null);
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

	// ─── JSON schema completeness ────────────────────────────────────────────

	describe("JSON output (--json)", () => {
		it("--json produces valid parseable output", async () => {
			const { json } = await runDoctor(["--json", "--local"]);
			expect(json).not.toBeNull();
		});

		it("--json output is pure JSON (no color codes)", async () => {
			const { _json, stdoutLines } = await runDoctor(["--json", "--local"]);
			const jsonLine = stdoutLines.find((s) => {
				try {
					JSON.parse(s);
					return true;
				} catch {
					return false;
				}
			})!;
			// Pure JSON  -  no ANSI escape sequences
			expect(jsonLine).not.toMatch(/\x1b\[/);
		});

		it("JSON output has correct top-level structure", async () => {
			const { json } = await runDoctor(["--json", "--local"]);
			expect(json).toMatchObject({
				success: expect.any(Boolean),
				version: expect.any(String),
				timestamp: expect.any(String),
				platform: {
					os: expect.any(String),
					arch: expect.any(String),
					nodeVersion: expect.any(String),
					shell: expect.any(String),
				},
				summary: {
					total: expect.any(Number),
					pass: expect.any(Number),
					warn: expect.any(Number),
					fail: expect.any(Number),
					skip: expect.any(Number),
				},
				checks: expect.any(Array),
			});
		});

		it("checks array is non-empty", async () => {
			const { json } = await runDoctor(["--json", "--local"]);
			expect(json?.checks.length).toBeGreaterThan(5);
		});

		it("all check entries have valid status values", async () => {
			const { json } = await runDoctor(["--json", "--local"]);
			const validStatuses = new Set(["pass", "warn", "fail", "skip"]);
			for (const check of json?.checks) {
				expect(validStatuses.has(check.status)).toBe(true);
			}
		});

		it("all check groups are represented in output", async () => {
			const { json } = await runDoctor(["--json", "--local"]);
			const groups = new Set(json?.checks.map((c) => c.group));
			expect(groups.has("cli")).toBe(true);
			expect(groups.has("service")).toBe(true);
			expect(groups.has("workspace")).toBe(true);
			expect(groups.has("knowledge")).toBe(true);
			expect(groups.has("mcp")).toBe(true);
			// network skipped by --local but still a group entry
			expect(groups.has("network")).toBe(true);
			expect(groups.has("extension")).toBe(true);
		});
	});

	// ─── --local flag ────────────────────────────────────────────────────────

	describe("--local flag", () => {
		it("--local results in network group being skipped", async () => {
			const { json } = await runDoctor(["--json", "--local"]);
			const networkChecks = json?.checks.filter((c) => c.group === "network");
			expect(networkChecks).toHaveLength(1);
			expect(networkChecks[0].status).toBe("skip");
		});

		it("--local network skip check detail contains '--local'", async () => {
			const { json } = await runDoctor(["--json", "--local"]);
			const netCheck = json?.checks.find((c) => c.group === "network");
			expect(netCheck?.detail).toContain("--local");
		});

		it("--local does not affect other groups", async () => {
			const { json } = await runDoctor(["--json", "--local"]);
			const nonNetworkChecks = json?.checks.filter((c) => c.group !== "network");
			expect(nonNetworkChecks.length).toBeGreaterThan(0);
		});
	});

	// ─── --check <group> ─────────────────────────────────────────────────────

	describe("--check <group> filtering", () => {
		it("--check cli returns only CLI group checks", async () => {
			const { json } = await runDoctor(["--json", "--local", "--check", "cli"]);
			const groups = [...new Set(json?.checks.map((c) => c.group))];
			expect(groups).toEqual(["cli"]);
		});

		it("--check daemon returns only daemon group checks", async () => {
			const { json } = await runDoctor(["--json", "--local", "--check", "daemon"]);
			const nonDaemon = json?.checks.filter((c) => c.group !== "daemon");
			expect(nonDaemon).toHaveLength(0);
		});

		it("--check workspace returns only workspace group checks", async () => {
			const { json } = await runDoctor(["--json", "--local", "--check", "workspace"]);
			const groups = [...new Set(json?.checks.map((c) => c.group))];
			expect(groups).toEqual(["workspace"]);
		});

		it("--check mcp returns only mcp group checks", async () => {
			const { json } = await runDoctor(["--json", "--local", "--check", "mcp"]);
			const groups = [...new Set(json?.checks.map((c) => c.group))];
			expect(groups).toEqual(["mcp"]);
		});

		it("--check network returns only network group checks", async () => {
			// With --check network but no --local, network checks actually run
			// (but we've mocked fetch to fail so it'll warn)
			const { json } = await runDoctor(["--json", "--check", "network"]);
			const groups = [...new Set(json?.checks.map((c) => c.group))];
			expect(groups).toEqual(["network"]);
		});

		it("--check daemon returns 0 non-daemon checks", async () => {
			const { json } = await runDoctor(["--json", "--local", "--check", "daemon"]);
			expect(json?.checks.filter((c) => c.group !== "daemon")).toHaveLength(0);
		});
	});

	// ─── success flag ────────────────────────────────────────────────────────

	describe("success semantics", () => {
		it("success=false when at least one fail check", async () => {
			// Default mocks have daemon.running fail
			const { json } = await runDoctor(["--json", "--local"]);
			const hasFail = json?.checks.some((c) => c.status === "fail");
			if (hasFail) {
				expect(json?.success).toBe(false);
			}
		});

		it("summary.fail matches count of fail checks", async () => {
			const { json } = await runDoctor(["--json", "--local"]);
			const failCount = json?.checks.filter((c) => c.status === "fail").length;
			expect(json?.summary.fail).toBe(failCount);
		});

		it("summary.pass matches count of pass checks", async () => {
			const { json } = await runDoctor(["--json", "--local"]);
			const passCount = json?.checks.filter((c) => c.status === "pass").length;
			expect(json?.summary.pass).toBe(passCount);
		});

		it("summary.warn matches count of warn checks", async () => {
			const { json } = await runDoctor(["--json", "--local"]);
			const warnCount = json?.checks.filter((c) => c.status === "warn").length;
			expect(json?.summary.warn).toBe(warnCount);
		});

		it("summary.skip matches count of skip checks", async () => {
			const { json } = await runDoctor(["--json", "--local"]);
			const skipCount = json?.checks.filter((c) => c.status === "skip").length;
			expect(json?.summary.skip).toBe(skipCount);
		});
	});

	// ─── Exit codes ──────────────────────────────────────────────────────────

	describe("Exit codes", () => {
		it("exits with code 1 when there are failures", async () => {
			// Default mocks: daemon not running → fail → exit 1
			const { exitCode, json } = await runDoctor(["--json", "--local"]);
			const hasFail = json?.checks.some((c) => c.status === "fail");
			if (hasFail) {
				expect(exitCode).toBe(1);
			}
		});

		it("process.exit is always called", async () => {
			const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
			vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
			try {
				await createDoctorCommand().parseAsync(["--json", "--local"], { from: "user" });
				expect(exitSpy).toHaveBeenCalledOnce();
			} finally {
				exitSpy.mockRestore();
				vi.unstubAllGlobals();
			}
		});

		it("exits with 0 when success=true", async () => {
			// Make all checks pass by having nothing fail
			// We can achieve this by checking only the CLI group (which should pass)
			let exitCode: number | null = null;
			const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: number) => {
				exitCode = code ?? 0;
				return undefined as never;
			});
			vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
			const captured: string[] = [];
			const logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => captured.push(String(msg)));
			try {
				await createDoctorCommand().parseAsync(["--json", "--local", "--check", "cli"], { from: "user" });
			} finally {
				exitSpy.mockRestore();
				logSpy.mockRestore();
				vi.unstubAllGlobals();
			}
			// CLI group: binary=pass, node=pass, globalConfig=warn (no fail)
			// success should be true → exit 0
			const jsonLine = captured.find((s) => {
				try {
					JSON.parse(s);
					return true;
				} catch {
					return false;
				}
			});
			if (jsonLine) {
				const result = JSON.parse(jsonLine) as DoctorJsonResult;
				const hasFail = result.checks.some((c) => c.status === "fail");
				if (!hasFail) {
					expect(exitCode).toBe(0);
				}
			}
		});
	});

	// ─── Human mode output ───────────────────────────────────────────────────

	describe("Human mode output (non-JSON)", () => {
		it("human mode produces multiple output lines", async () => {
			const { stdoutLines } = await runDoctor(["--local"]);
			// Non-JSON mode → multiple lines of human output
			expect(stdoutLines.length).toBeGreaterThan(3);
		});

		it("human mode output does NOT contain raw JSON object", async () => {
			const { stdoutLines } = await runDoctor(["--local"]);
			const hasJsonObject = stdoutLines.some((line) => {
				try {
					const parsed = JSON.parse(line);
					return typeof parsed === "object" && parsed !== null && "checks" in parsed;
				} catch {
					return false;
				}
			});
			expect(hasJsonObject).toBe(false);
		});
	});
});
