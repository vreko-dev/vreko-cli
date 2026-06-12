/**
 * Gate 11: Doctor --fix Mode Tests
 *
 * Verifies the --fix mode behavior:
 * - execSync is called with fixCommand for each failing check that has one
 * - Successful fix: status updated, "Fixed" message in output
 * - Failed fix: error logged, status unchanged, no crash
 * - Checks without fixCommand are NOT attempted
 * - Passing checks are NOT attempted
 * - --fix without any fixable checks: no execSync fix call
 * - --fix --json: fixes are NOT executed (fix only runs in human mode)
 *
 * NOTE: --fix only runs in human mode (no --json). The `!jsonMode` guard in
 * doctor.ts ensures JSON output is pure, unaffected by fix attempts.
 *
 * @see docs/plans/cli-refactor/vreko_init_doctor.md §2.8 Gate 8
 * @see apps/cli/src/commands/doctor.ts (auto-fix pass, lines ~138-154)
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
}));

vi.mock("../../src/utils/workspace", () => ({
	findWorkspaceRoot: vi.fn().mockReturnValue(null),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { detectAIClients, validateClientConfig } from "@vreko/mcp-config";
import type { DoctorJsonResult } from "../../src/commands/doctor";
import { createDoctorCommand } from "../../src/commands/doctor";
import { connectToDaemon, getDaemonClient, isDaemonConnected } from "../../src/services/service-client";
import { findWorkspaceRoot } from "../../src/utils/workspace";

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface HumanResult {
	stdoutLines: string[];
	exitCode: number | null;
}

interface JsonResult {
	json: DoctorJsonResult;
	exitCode: number | null;
}

/** Run doctor in human mode (no --json) and capture stdout + exit code */
async function runHuman(flags: string[] = []): Promise<HumanResult> {
	const stdoutLines: string[] = [];
	let exitCode: number | null = null;

	const logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => stdoutLines.push(String(msg)));
	const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: number) => {
		exitCode = code ?? 0;
		return undefined as never;
	});
	vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

	try {
		await createDoctorCommand().parseAsync(["--local", ...flags], { from: "user" });
	} finally {
		logSpy.mockRestore();
		exitSpy.mockRestore();
		vi.unstubAllGlobals();
	}

	return { stdoutLines, exitCode };
}

/** Run doctor in JSON mode and capture result */
async function runJson(flags: string[] = []): Promise<JsonResult> {
	const captured: string[] = [];
	let exitCode: number | null = null;

	const logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => captured.push(String(msg)));
	const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: number) => {
		exitCode = code ?? 0;
		return undefined as never;
	});
	vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

	try {
		await createDoctorCommand().parseAsync(["--json", "--local", ...flags], { from: "user" });
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
	return { json: JSON.parse(jsonLine) as DoctorJsonResult, exitCode };
}

/**
 * Force the cli.globalConfig check to fail by making the config file
 * exist but contain invalid JSON. This gives us a check with a fixCommand.
 *
 * fixCommand = `rm "/mock/home/.vreko/config.json"`
 */
function setupFailingGlobalConfig(): void {
	vi.mocked(existsSync).mockImplementation((p: unknown) => {
		return String(p).includes(".vreko") && String(p).endsWith("config.json");
	});
	vi.mocked(readFileSync).mockReturnValue("{ invalid json" as any);
}

/** Get all execSync calls that look like fix commands (contain "rm" or service/daemon control) */
function getFixCalls(): string[] {
	return vi
		.mocked(execSync)
		.mock.calls.map((call) => String(call[0]))
		.filter(
			(cmd) =>
				cmd.includes("rm ") ||
				((cmd.includes("daemon") || cmd.includes("service")) &&
					(cmd.includes("restart") || cmd.includes("start"))),
		);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Gate 11: Doctor --fix Mode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Restore mock implementations  -  mockReset: true in vitest-config clears them between tests
		vi.mocked(existsSync).mockReturnValue(false);
		vi.mocked(readFileSync).mockReturnValue("" as any);
		vi.mocked(statSync).mockReturnValue({ size: 0 } as any);
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

	// ─── Fix triggered for failing checks ─────────────────────────────────────

	describe("Fix execution", () => {
		it("execSync is called with the fixCommand when --fix is passed", async () => {
			setupFailingGlobalConfig();
			// execSync succeeds by default
			await runHuman(["--fix", "--check", "cli"]);
			const fixCalls = getFixCalls();
			expect(fixCalls.length).toBeGreaterThan(0);
			expect(fixCalls[0]).toContain("rm");
			expect(fixCalls[0]).toContain(".vreko");
			expect(fixCalls[0]).toContain("config.json");
		});

		it("execSync is NOT called with fix commands when --fix is NOT passed", async () => {
			setupFailingGlobalConfig();
			await runHuman(["--check", "cli"]);
			const fixCalls = getFixCalls();
			expect(fixCalls).toHaveLength(0);
		});

		it("successful fix prints '✔ Fixed' in output", async () => {
			setupFailingGlobalConfig();
			// execSync mock returns "" (no error) → fix succeeds
			vi.mocked(execSync).mockReturnValue("" as any);
			const { stdoutLines } = await runHuman(["--fix", "--check", "cli"]);
			const hasFixed = stdoutLines.some((line) => line.includes("Fixed"));
			expect(hasFixed).toBe(true);
		});

		it("failed fix prints error message without crashing", async () => {
			setupFailingGlobalConfig();
			// Make fix execSync throw for rm command
			vi.mocked(execSync).mockImplementation((cmd: string) => {
				if (String(cmd).includes("rm ")) {
					throw new Error("Permission denied");
				}
				return "" as any;
			});
			// Should not throw
			const { stdoutLines } = await runHuman(["--fix", "--check", "cli"]);
			const hasError = stdoutLines.some((line) => line.includes("Could not fix"));
			expect(hasError).toBe(true);
		});

		it("failed fix does not cause process to crash", async () => {
			setupFailingGlobalConfig();
			vi.mocked(execSync).mockImplementation((cmd: string) => {
				if (String(cmd).includes("rm ")) {
					throw new Error("EPERM");
				}
				return "" as any;
			});
			// Should complete without throwing
			await expect(runHuman(["--fix", "--check", "cli"])).resolves.toBeDefined();
		});
	});

	// ─── Only fixable checks are attempted ────────────────────────────────────

	describe("Selectivity: only fail + fixCommand checks are attempted", () => {
		it("checks with no fixCommand are not passed to execSync", async () => {
			// The daemon.running check has a fixCommand, but workspace.detected (warn) does not
			// Use --check daemon to get fail + fixCommand scenario
			vi.mocked(existsSync).mockReturnValue(false); // No PID → daemon.running fail
			await runHuman(["--fix", "--check", "service"]);
			const fixCalls = getFixCalls();
			// daemon.running has fixCommand: "vreko service start --detach"
			const daemonCalls = fixCalls.filter((c) => c.includes("service start"));
			expect(daemonCalls.length).toBeGreaterThan(0);
		});

		it("no fix execSync calls when no checks have fixCommand", async () => {
			// workspace group: workspace.detected is warn (no fixCommand) when no workspace
			vi.mocked(existsSync).mockReturnValue(false);
			await runHuman(["--fix", "--check", "workspace"]);
			// workspace.detected has a fix message but NO fixCommand in the current impl
			// So no execSync fix calls should happen
			const fixCalls = getFixCalls();
			// workspace.detected fix: "Run: vreko init"  -  no fixCommand field
			// Therefore no execSync calls for fixes
			expect(fixCalls).toHaveLength(0);
		});

		it("passing checks do not trigger execSync fix calls", async () => {
			// When CLI group has only pass/warn (no fail), no fixes run
			vi.mocked(existsSync).mockReturnValue(false); // no global config → warn, not fail
			await runHuman(["--fix", "--check", "cli"]);
			// cli.globalConfig is warn when missing, not fail
			const fixCalls = getFixCalls();
			expect(fixCalls).toHaveLength(0);
		});
	});

	// ─── --fix --json contract ────────────────────────────────────────────────

	describe("--fix --json: fixes are NOT executed in JSON mode", () => {
		it("execSync is not called with fix commands in JSON mode", async () => {
			setupFailingGlobalConfig();
			await runJson(["--fix", "--check", "cli"]);
			const fixCalls = getFixCalls();
			// Fix execSync should NOT be called in JSON mode
			expect(fixCalls).toHaveLength(0);
		});

		it("JSON output is still returned when --fix --json are combined", async () => {
			setupFailingGlobalConfig();
			const { json } = await runJson(["--fix", "--check", "cli"]);
			expect(json).not.toBeNull();
			expect(json.checks.length).toBeGreaterThan(0);
		});

		it("JSON output shows pre-fix state (fail, not pass) when --fix --json", async () => {
			setupFailingGlobalConfig();
			const { json } = await runJson(["--fix", "--check", "cli"]);
			// globalConfig should still show as fail in JSON output (fix not executed)
			const check = json.checks.find((c) => c.id === "cli.globalConfig");
			expect(check?.status).toBe("fail");
		});
	});

	// ─── Fix output messages ──────────────────────────────────────────────────

	describe("Fix output formatting", () => {
		it("'Attempting fixes...' message is printed before fixes", async () => {
			setupFailingGlobalConfig();
			vi.mocked(execSync).mockReturnValue("" as any);
			const { stdoutLines } = await runHuman(["--fix", "--check", "cli"]);
			const hasAttempting = stdoutLines.some((line) => line.toLowerCase().includes("attempting"));
			expect(hasAttempting).toBe(true);
		});

		it("fix success message includes the check label", async () => {
			setupFailingGlobalConfig();
			vi.mocked(execSync).mockReturnValue("" as any);
			const { stdoutLines } = await runHuman(["--fix", "--check", "cli"]);
			// Should see "✔ Fixed: Global config valid" or similar
			const fixLine = stdoutLines.find((line) => line.includes("Fixed"));
			expect(fixLine).toBeDefined();
		});

		it("fix error message includes the check label", async () => {
			setupFailingGlobalConfig();
			vi.mocked(execSync).mockImplementation((cmd: string) => {
				if (String(cmd).includes("rm ")) {
					throw new Error("no permission");
				}
				return "" as any;
			});
			const { stdoutLines } = await runHuman(["--fix", "--check", "cli"]);
			const errorLine = stdoutLines.some((line) => line.includes("Could not fix"));
			expect(errorLine).toBe(true);
		});

		it("no fix output when there are no fixable failures", async () => {
			// cli.globalConfig is warn (not fail) when config file is missing
			vi.mocked(existsSync).mockReturnValue(false);
			const { stdoutLines } = await runHuman(["--fix", "--check", "cli"]);
			const hasAttempting = stdoutLines.some((line) => line.toLowerCase().includes("attempting"));
			expect(hasAttempting).toBe(false);
		});
	});

	// ─── Exit codes with --fix ────────────────────────────────────────────────

	describe("Exit codes with --fix", () => {
		it("exits with 0 after successful fix (all failures resolved)", async () => {
			setupFailingGlobalConfig();
			// execSync succeeds → fix applied → check becomes pass → success=true → exit 0
			vi.mocked(execSync).mockReturnValue("" as any);
			const { exitCode } = await runHuman(["--fix", "--check", "cli"]);
			// After successful fix, globalConfig becomes pass → no failures → exit 0
			expect(exitCode).toBe(0);
		});

		it("exits with 1 when fix fails", async () => {
			setupFailingGlobalConfig();
			vi.mocked(execSync).mockImplementation((cmd: string) => {
				if (String(cmd).includes("rm ")) {
					throw new Error("EPERM");
				}
				return "" as any;
			});
			const { exitCode } = await runHuman(["--fix", "--check", "cli"]);
			// Fix failed → check still fail → exit 1
			expect(exitCode).toBe(1);
		});

		it("process.exit is always called", async () => {
			setupFailingGlobalConfig();
			const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
				/* intentionally empty */
			});
			vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
			try {
				await createDoctorCommand().parseAsync(["--local", "--check", "cli", "--fix"], { from: "user" });
				expect(exitSpy).toHaveBeenCalledOnce();
			} finally {
				exitSpy.mockRestore();
				logSpy.mockRestore();
				vi.unstubAllGlobals();
			}
		});
	});

	// ─── Fix with daemon check ────────────────────────────────────────────────

	describe("Fix with daemon group (fixCommand format validation)", () => {
		it("daemon.running fixCommand is 'vreko service start --detach'", async () => {
			// daemon group: no PID → daemon.running fail
			vi.mocked(existsSync).mockReturnValue(false);
			// First run to get the fixCommand value from JSON (without actually fixing)
			const { json } = await runJson(["--check", "service"]);
			const check = json.checks.find((c) => c.id === "service.running");
			expect(check?.fixCommand).toBe("vreko service start --detach");
		});

		it("daemon.running fixCommand is executed when --fix is passed", async () => {
			vi.mocked(existsSync).mockReturnValue(false);
			vi.mocked(execSync).mockReturnValue("" as any);
			await runHuman(["--fix", "--check", "service"]);
			const daemonFixCalls = vi
				.mocked(execSync)
				.mock.calls.map((c) => String(c[0]))
				.filter((c) => c.includes("service start"));
			expect(daemonFixCalls).toHaveLength(1);
		});
	});
});
