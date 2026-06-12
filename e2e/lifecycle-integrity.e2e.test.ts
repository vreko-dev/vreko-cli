/**
 * Lifecycle Integrity E2E Tests
 *
 * Validates that core CLI lifecycle commands execute without crashing
 * and produce expected output or errors. These tests invoke the actual
 * CLI binary and assert on observable behavior.
 *
 * Tests requiring a live daemon are skipped when VREKO_E2E_SKIP_DAEMON=1
 * or when no daemon is detected on the socket path.
 *
 * @integration
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Environment guards
// ---------------------------------------------------------------------------

const CLI_BIN = join(process.cwd(), "dist", "index.js");
const distExists = existsSync(CLI_BIN);
const skipDaemon = process.env.VREKO_E2E_SKIP_DAEMON === "1";

/** Run a CLI command and return { stdout, stderr, exitCode } */
function runCli(
	args: string,
	options: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): { stdout: string; stderr: string; exitCode: number } {
	const { cwd = process.cwd(), env = process.env, timeoutMs = 15000 } = options;
	try {
		const stdout = execSync(`node "${CLI_BIN}" ${args}`, {
			cwd,
			encoding: "utf8",
			stdio: "pipe",
			env,
			timeout: timeoutMs,
		});
		return { stdout, stderr: "", exitCode: 0 };
	} catch (err: any) {
		return {
			stdout: err.stdout?.toString() ?? "",
			stderr: err.stderr?.toString() ?? "",
			exitCode: err.status ?? 1,
		};
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(prefix: string): string {
	const dir = join(tmpdir(), `${prefix}-${Date.now()}`);
	mkdirSync(dir, { recursive: true });
	return dir;
}

function initGitRepo(dir: string): void {
	execSync("git init", { cwd: dir, stdio: "ignore" });
	execSync('git config user.email "test@example.com"', { cwd: dir, stdio: "ignore" });
	execSync('git config user.name "Test User"', { cwd: dir, stdio: "ignore" });
	writeFileSync(join(dir, "README.md"), "# Test");
	execSync("git add .", { cwd: dir, stdio: "ignore" });
	execSync('git commit -m "init"', { cwd: dir, stdio: "ignore" });
}

// ---------------------------------------------------------------------------
// Scenario 1: vreko init
// ---------------------------------------------------------------------------

describe.skipIf(!distExists)("Lifecycle Integrity: vreko init", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = makeTempDir("lifecycle-init");
		initGitRepo(testDir);
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	it("completes without crashing in a fresh git workspace", () => {
		const { stdout, stderr, exitCode } = runCli("init --quiet", {
			cwd: testDir,
			env: {
				...process.env,
				// Disable network calls to avoid auth prompts in CI
				VREKO_OFFLINE: "1",
				VREKO_DAEMON_DISABLED: "1",
			},
		});

		const output = stdout + stderr;

		// Should not crash with an unhandled error (no stack trace)
		expect(output).not.toMatch(/TypeError:|ReferenceError:|SyntaxError:/);
		// Exit code 0 (success) or known non-fatal exit (1) are both acceptable
		expect(exitCode).toBeGreaterThanOrEqual(0);
		expect(exitCode).toBeLessThanOrEqual(1);
	});

	it("does not produce an unhandled rejection", () => {
		const { stdout, stderr } = runCli("init --quiet", {
			cwd: testDir,
			env: {
				...process.env,
				VREKO_OFFLINE: "1",
				VREKO_DAEMON_DISABLED: "1",
			},
		});

		const output = stdout + stderr;
		expect(output).not.toMatch(/UnhandledPromiseRejection/);
		expect(output).not.toMatch(/unhandledRejection/);
	});
});

// ---------------------------------------------------------------------------
// Scenario 2: vreko daemon start
// ---------------------------------------------------------------------------

describe.skipIf(!distExists || skipDaemon)("Lifecycle Integrity: vreko daemon start", () => {
	it("returns 'already running' or starts successfully (no crash)", () => {
		const { stdout, stderr, exitCode } = runCli("daemon start --no-detach", {
			timeoutMs: 5000,
			env: {
				...process.env,
				// Tell daemon to exit quickly in test mode
				VREKO_DAEMON_IDLE_TIMEOUT: "1",
			},
		});

		const output = stdout + stderr;

		// Either already running or started  -  both are success states
		const isAlreadyRunning = output.includes("already running");
		const isStarted = output.includes("started") || output.includes("Daemon");
		const isExpectedError =
			output.includes("EADDRINUSE") || output.includes("socket") || output.includes("timeout");

		expect(isAlreadyRunning || isStarted || isExpectedError || exitCode <= 1).toBe(true);

		// Must not produce unhandled errors
		expect(output).not.toMatch(/TypeError:|ReferenceError:|SyntaxError:/);
		expect(output).not.toMatch(/UnhandledPromiseRejection/);
	});

	it("daemon status command does not crash", () => {
		const { stdout, stderr, exitCode } = runCli("daemon status", { timeoutMs: 8000 });
		const output = stdout + stderr;

		// Should not crash (unhandled errors produce stack traces)
		expect(output).not.toMatch(/TypeError:|ReferenceError:|SyntaxError:/);
		expect(output).not.toMatch(/UnhandledPromiseRejection/);
		// Exit code 0 (running) or 1 (not running) are both acceptable
		expect(exitCode).toBeLessThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// Scenario 3: Session tracking  -  basic session creation flow
// ---------------------------------------------------------------------------

describe.skipIf(!distExists)("Lifecycle Integrity: session tracking", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = makeTempDir("lifecycle-session");
		initGitRepo(testDir);

		// Pre-initialize so session commands can run
		try {
			execSync(`node "${CLI_BIN}" init --quiet`, {
				cwd: testDir,
				stdio: "ignore",
				timeout: 10000,
				env: {
					...process.env,
					VREKO_OFFLINE: "1",
					VREKO_DAEMON_DISABLED: "1",
				},
			});
		} catch {
			// Init errors are non-fatal for session tests
		}
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	it("session start does not crash", () => {
		const { stdout, stderr, exitCode } = runCli('session start "test task"', {
			cwd: testDir,
			env: {
				...process.env,
				VREKO_DAEMON_DISABLED: "1",
			},
			timeoutMs: 10000,
		});

		const output = stdout + stderr;
		expect(output).not.toMatch(/TypeError:|ReferenceError:|SyntaxError:/);
		expect(output).not.toMatch(/UnhandledPromiseRejection/);
		// May succeed or report not-initialized  -  both are non-crash exits
		expect(exitCode).toBeGreaterThanOrEqual(0);
		expect(exitCode).toBeLessThanOrEqual(1);
	});

	it("session status does not crash", () => {
		const { stdout, stderr, exitCode } = runCli("session status", {
			cwd: testDir,
			env: {
				...process.env,
				VREKO_DAEMON_DISABLED: "1",
			},
			timeoutMs: 10000,
		});

		const output = stdout + stderr;
		expect(output).not.toMatch(/TypeError:|ReferenceError:|SyntaxError:/);
		expect(output).not.toMatch(/UnhandledPromiseRejection/);
		expect(exitCode).toBeGreaterThanOrEqual(0);
		expect(exitCode).toBeLessThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// Scenario 4: vreko learn  -  command invocation doesn't crash
// ---------------------------------------------------------------------------

describe.skipIf(!distExists)("Lifecycle Integrity: vreko learn", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = makeTempDir("lifecycle-learn");
		initGitRepo(testDir);

		// Pre-initialize
		try {
			execSync(`node "${CLI_BIN}" init --quiet`, {
				cwd: testDir,
				stdio: "ignore",
				timeout: 10000,
				env: {
					...process.env,
					VREKO_OFFLINE: "1",
					VREKO_DAEMON_DISABLED: "1",
				},
			});
		} catch {
			// Non-fatal
		}
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	it("learn command invocation does not crash", () => {
		const { stdout, stderr, exitCode } = runCli('learn "silent catch" "always log errors in catch blocks"', {
			cwd: testDir,
			env: {
				...process.env,
				VREKO_DAEMON_DISABLED: "1",
			},
			timeoutMs: 10000,
		});

		const output = stdout + stderr;
		expect(output).not.toMatch(/TypeError:|ReferenceError:|SyntaxError:/);
		expect(output).not.toMatch(/UnhandledPromiseRejection/);
		// 0 = success, 1 = user error (e.g., not initialized)  -  both acceptable
		expect(exitCode).toBeGreaterThanOrEqual(0);
		expect(exitCode).toBeLessThanOrEqual(1);
	});

	it("learn --type pitfall does not crash", () => {
		const { stdout, stderr, exitCode } = runCli(
			'learn "async without await" "add await before async calls" --type pitfall',
			{
				cwd: testDir,
				env: {
					...process.env,
					VREKO_DAEMON_DISABLED: "1",
				},
				timeoutMs: 10000,
			},
		);

		const output = stdout + stderr;
		expect(output).not.toMatch(/TypeError:|ReferenceError:|SyntaxError:/);
		expect(output).not.toMatch(/UnhandledPromiseRejection/);
		expect(exitCode).toBeGreaterThanOrEqual(0);
		expect(exitCode).toBeLessThanOrEqual(1);
	});

	it("learn with invalid type reports error gracefully", () => {
		const { stdout, stderr, exitCode } = runCli('learn "trigger" "action" --type invalid-type', {
			cwd: testDir,
			env: {
				...process.env,
				VREKO_DAEMON_DISABLED: "1",
			},
			timeoutMs: 10000,
		});

		const output = stdout + stderr;
		// Should not produce unhandled errors
		expect(output).not.toMatch(/TypeError:|ReferenceError:|SyntaxError:/);
		// Should exit with non-zero (user error)
		expect(exitCode).toBeGreaterThan(0);
	});
});
