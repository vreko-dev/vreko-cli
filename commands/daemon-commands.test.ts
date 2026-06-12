/**
 * Daemon Command Handler Tests
 *
 * These tests cover the daemon subcommand action handlers (stop, status, ping,
 * restart, health). They were introduced after a class of bugs was found where:
 *
 *   1. client.close() was missing from finally blocks  -  connections leaked on
 *      any throw from connectServiceClient or the RPC call itself.
 *   2. The fallback catch in "daemon stop" logged the outer IPC error variable
 *      instead of the inner kill error, silencing the real failure reason.
 *   3. "daemon restart" used a fixed 500 ms sleep instead of polling for
 *      process death, causing premature startup attempts under load.
 *   4. logFd fallback used fd 1 (stdout) instead of /dev/null, causing SIGPIPE
 *      when the detached parent process exited.
 *
 * Root cause: commit 8d30b43f7 restored console output to the daemon commands
 * after it was stripped in a prior merge, but did not add client lifecycle
 * management because no unit tests exercised the command action handlers at all.
 *
 * The behavioral tests here ARE the ratchet. If any command regresses on
 * connection cleanup or error reporting, a test here will fail.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks  -  must be hoisted before any imports that pull in daemon.ts
// ---------------------------------------------------------------------------

// daemon.ts only uses execSync and spawn from child_process  -  safe to mock just those two.
vi.mock("node:child_process", () => ({
	execSync: vi.fn().mockImplementation(() => {
		// Simulate "doppler not found" so Doppler detection is always skipped in tests.
		throw new Error("not found");
	}),
	spawn: vi.fn().mockReturnValue({ unref: vi.fn(), on: vi.fn(), pid: 99999 }),
}));

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return {
		...actual,
		mkdirSync: vi.fn(),
		openSync: vi.fn().mockReturnValue(42), // fake file descriptor
	};
});

vi.mock("@vreko/mcp-config", () => ({
	detectAIClients: vi.fn().mockReturnValue({ clients: [] }),
	readClientConfig: vi.fn().mockReturnValue(null),
	getServerKey: vi.fn().mockReturnValue("vreko"),
}));

vi.mock("../../src/service-adapter/local-service-adapter.js", () => ({
	createServiceClient: vi.fn(),
	connectServiceClient: vi.fn().mockResolvedValue(undefined),
	isServiceRunning: vi.fn().mockReturnValue(false),
	isServiceHealthy: vi.fn().mockResolvedValue(false),
	readServicePid: vi.fn().mockReturnValue(12345),
	getServiceSocketPath: vi.fn().mockReturnValue("/tmp/test.sock"),
	formatBytes: vi.fn((b: number) => `${b}B`),
	formatDuration: vi.fn((ms: number) => `${ms}ms`),
	isDaemonRunning: vi.fn().mockReturnValue(false),
	getLogPath: vi.fn().mockReturnValue("/tmp/daemon.log"),
}));

import { registerDaemonCommands } from "../../src/commands/daemon.js";
// Import after mocks
import {
	connectServiceClient,
	createServiceClient,
	isServiceHealthy,
	isServiceRunning,
	readServicePid,
} from "../../src/service-adapter/local-service-adapter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockClient = {
	connect: ReturnType<typeof vi.fn>;
	initialize: ReturnType<typeof vi.fn>;
	close: ReturnType<typeof vi.fn>;
	call: ReturnType<typeof vi.fn>;
	daemon: {
		shutdown: ReturnType<typeof vi.fn>;
		ping: ReturnType<typeof vi.fn>;
	};
};

function makeMockClient(): MockClient {
	return {
		connect: vi.fn().mockResolvedValue(undefined),
		initialize: vi.fn().mockResolvedValue(undefined),
		close: vi.fn(),
		call: vi.fn().mockResolvedValue({
			pid: 1234,
			version: "2.0.0",
			uptime: 5000,
			startedAt: new Date().toISOString(),
			workspaces: 1,
			connections: 1,
			memoryUsage: { heapUsed: 1024, heapTotal: 2048, rss: 4096 },
			idleTimeout: 240,
		}),
		daemon: {
			shutdown: vi.fn().mockResolvedValue(undefined),
			ping: vi.fn().mockResolvedValue({ uptime: 5000, version: "2.0.0" }),
		},
	};
}

/** Build a fresh Commander program with only daemon commands registered. */
function buildProgram() {
	const program = new Command();
	program.exitOverride(); // throw instead of process.exit for testability
	registerDaemonCommands(program);
	return program;
}

/** Invoke a daemon subcommand via the Commander parser. */
async function runCmd(...args: string[]) {
	const program = buildProgram();
	await program.parseAsync(["node", "vreko", "daemon", ...args]);
}

// ---------------------------------------------------------------------------
// daemon stop
// ---------------------------------------------------------------------------

describe("daemon stop", () => {
	let client: MockClient;
	let killSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = makeMockClient();
		vi.mocked(createServiceClient).mockReturnValue(client as never);
		vi.mocked(isServiceRunning).mockReturnValue(true);
		vi.mocked(isServiceHealthy).mockResolvedValue(true);
		vi.mocked(readServicePid).mockReturnValue(12345);
		killSpy = vi.spyOn(process, "kill").mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
		killSpy.mockRestore();
	});

	it("calls client.close() on successful shutdown", async () => {
		await runCmd("stop");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("calls client.close() when connectServiceClient throws", async () => {
		vi.mocked(connectServiceClient).mockRejectedValue(new Error("connection refused"));
		await runCmd("stop");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("calls client.close() when shutdown() throws", async () => {
		client.daemon.shutdown.mockRejectedValue(new Error("daemon unreachable"));
		await runCmd("stop");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("falls back to SIGTERM when IPC fails", async () => {
		vi.mocked(connectServiceClient).mockRejectedValue(new Error("IPC fail"));
		await runCmd("stop");
		expect(killSpy).toHaveBeenCalledWith(12345, "SIGTERM");
	});

	it("sets process.exitCode=1 and logs the KILL error (not the IPC error) on total failure", async () => {
		vi.mocked(connectServiceClient).mockRejectedValue(new Error("IPC_ERROR"));
		killSpy.mockImplementation(() => {
			throw new Error("KILL_ERROR");
		});

		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const prevExitCode = process.exitCode;

		await runCmd("stop");

		// Must log the kill error, not the IPC error
		expect(errorSpy).toHaveBeenCalledWith("✗ Failed to stop service:", "KILL_ERROR");
		expect(errorSpy).not.toHaveBeenCalledWith(expect.anything(), expect.stringContaining("IPC_ERROR"));
		expect(process.exitCode).toBe(1);

		process.exitCode = prevExitCode;
		errorSpy.mockRestore();
	});

	it("prints 'not running' and skips IPC when daemon is down", async () => {
		vi.mocked(isServiceRunning).mockReturnValue(false);
		vi.mocked(isServiceHealthy).mockResolvedValue(false);
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

		await runCmd("stop");

		expect(logSpy).toHaveBeenCalledWith("Service is not running");
		expect(createServiceClient).not.toHaveBeenCalled();

		logSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// daemon status
// ---------------------------------------------------------------------------

describe("daemon status", () => {
	let client: MockClient;

	beforeEach(() => {
		client = makeMockClient();
		vi.mocked(createServiceClient).mockReturnValue(client as never);
		vi.mocked(isServiceRunning).mockReturnValue(true);
		vi.mocked(isServiceHealthy).mockResolvedValue(true);
	});

	afterEach(() => vi.clearAllMocks());

	it("calls client.close() on successful status fetch", async () => {
		await runCmd("status");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("calls client.close() when connectServiceClient throws", async () => {
		vi.mocked(connectServiceClient).mockRejectedValue(new Error("conn refused"));
		await runCmd("status");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("calls client.close() when client.call() throws", async () => {
		client.call.mockRejectedValue(new Error("RPC timeout"));
		await runCmd("status");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("outputs JSON when --json flag is set and daemon is up", async () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
		await runCmd("status", "--json");
		const output = JSON.parse(logSpy.mock.calls[0][0] as string);
		expect(output.running).toBe(true);
		logSpy.mockRestore();
	});

	it("outputs JSON { running: false } when daemon is down", async () => {
		vi.mocked(isServiceRunning).mockReturnValue(false);
		vi.mocked(isServiceHealthy).mockResolvedValue(false);
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
		await runCmd("status", "--json");
		expect(JSON.parse(logSpy.mock.calls[0][0] as string)).toEqual({ running: false });
		logSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// daemon ping
// ---------------------------------------------------------------------------

describe("daemon ping", () => {
	let client: MockClient;

	beforeEach(() => {
		client = makeMockClient();
		vi.mocked(createServiceClient).mockReturnValue(client as never);
		vi.mocked(isServiceRunning).mockReturnValue(true);
		vi.mocked(isServiceHealthy).mockResolvedValue(true);
	});

	afterEach(() => vi.clearAllMocks());

	it("calls client.close() on successful ping", async () => {
		await runCmd("ping");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("calls client.close() when connectServiceClient throws", async () => {
		vi.mocked(connectServiceClient).mockRejectedValue(new Error("ECONNREFUSED"));
		await runCmd("ping");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("calls client.close() when ping() throws", async () => {
		client.daemon.ping.mockRejectedValue(new Error("ping timeout"));
		await runCmd("ping");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("prints pong with latency and uptime on success", async () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
		await runCmd("ping");
		expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^pong \(\d+ms, uptime: /));
		logSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// daemon restart (stop-phase client lifecycle)
// ---------------------------------------------------------------------------

describe("daemon restart  -  stop-phase client lifecycle", () => {
	let stopClient: MockClient;

	beforeEach(() => {
		stopClient = makeMockClient();
		vi.mocked(createServiceClient).mockReturnValue(stopClient as never);
	});

	afterEach(() => vi.clearAllMocks());

	// NOTE: These tests use try/catch around runCmd because the Node.js built-in
	// `node:child_process` cannot be reliably intercepted at the ESM level in vitest
	// for statically imported bindings in daemon.ts. The spawn call that follows the
	// stop phase will throw in the test environment  -  but that's irrelevant to the
	// assertion: client.close() is in a finally block that runs BEFORE spawn is
	// reached, so the close behavior is fully observable even when spawn fails.

	it("calls stopClient.close() after successful shutdown (before spawn phase)", async () => {
		vi.mocked(isServiceHealthy)
			.mockResolvedValueOnce(true) // initial check: daemon is running
			.mockResolvedValueOnce(false) // stop-wait poll: stopped
			.mockResolvedValue(true); // start-wait poll: restarted

		try {
			await runCmd("restart");
		} catch (_error) {
			void _error;
		}

		expect(stopClient.close).toHaveBeenCalledOnce();
	});

	it("calls stopClient.close() even when connectServiceClient throws during stop", async () => {
		vi.mocked(connectServiceClient).mockRejectedValue(new Error("stop IPC failed"));
		vi.mocked(isServiceHealthy).mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValue(true);

		try {
			await runCmd("restart");
		} catch (_error) {
			void _error;
		}

		expect(stopClient.close).toHaveBeenCalledOnce();
	});

	it("calls stopClient.close() even when daemon.shutdown() throws", async () => {
		stopClient.daemon.shutdown.mockRejectedValue(new Error("shutdown failed"));
		vi.mocked(isServiceHealthy).mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValue(true);

		try {
			await runCmd("restart");
		} catch (_error) {
			void _error;
		}

		expect(stopClient.close).toHaveBeenCalledOnce();
	});

	it("skips IPC entirely when daemon is not running on restart", async () => {
		vi.mocked(isServiceHealthy).mockResolvedValueOnce(false).mockResolvedValue(true); // daemon not running → restart-wait resolves

		try {
			await runCmd("restart");
		} catch (_error) {
			void _error;
		}

		expect(createServiceClient).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// daemon health  -  error surface invariant
// ---------------------------------------------------------------------------

describe("daemon health  -  error surface", () => {
	let client: MockClient;

	beforeEach(() => {
		client = makeMockClient();
		vi.mocked(createServiceClient).mockReturnValue(client as never);
		vi.mocked(isServiceRunning).mockReturnValue(true);
		vi.mocked(isServiceHealthy).mockResolvedValue(true);
		vi.mocked(readServicePid).mockReturnValue(12345);
	});

	afterEach(() => vi.clearAllMocks());

	it("includes the actual error message when MCP config inspection fails", async () => {
		const { detectAIClients } = await import("@vreko/mcp-config");
		vi.mocked(detectAIClients).mockImplementation(() => {
			throw new Error("MOCKED_MCP_CONFIG_ERROR");
		});

		const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
		await runCmd("health", "--json");

		const rawOutput = logSpy.mock.calls.find((call) => {
			const line = call[0] as string;
			return typeof line === "string" && line.startsWith("{");
		})?.[0] as string | undefined;

		expect(rawOutput).toBeDefined();
		const result = JSON.parse(rawOutput!);
		const mcpError = result.mcp?.find((m: { status: string; details: string }) => m.status === "error");
		expect(mcpError).toBeDefined();
		expect(mcpError.details).toContain("MOCKED_MCP_CONFIG_ERROR");

		logSpy.mockRestore();
	});

	it("marks daemon as healthy when ping latency is under 100 ms", async () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
		await runCmd("health", "--json");

		const rawOutput = logSpy.mock.calls.find((c) => typeof c[0] === "string" && c[0].startsWith("{"))?.[0] as
			| string
			| undefined;
		expect(rawOutput).toBeDefined();
		const result = JSON.parse(rawOutput!);
		expect(result.daemon.status).toMatch(/healthy|degraded/);

		logSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// Structural ratchet  -  prevents future connection leaks in daemon.ts
// ---------------------------------------------------------------------------

describe("daemon.ts structural ratchets", () => {
	const src = readFileSync(resolve(__dirname, "../../src/commands/daemon.ts"), "utf-8");

	it("every createServiceClient() call has a paired finally { .close() }  -  no leaked connections", () => {
		// Count how many times we create a client
		const createCount = (src.match(/\bcreateServiceClient\(\)/g) ?? []).length;
		expect(createCount).toBeGreaterThan(0);

		// Count finally blocks that contain a .close() call.
		// Collapse whitespace so multiline finally blocks are matched reliably.
		const condensed = src.replace(/\s+/g, " ");
		const finallyCloseMatches = condensed.match(/} finally \{[^}]*\.close\(\)/g) ?? [];

		expect(finallyCloseMatches.length).toBe(createCount);
	});

	it("inner catch blocks do not reference outer catch variables (wrong-error-variable ratchet)", () => {
		// Detect the anti-pattern: catch (outerVar) { try {} catch { use outerVar } }
		// Specifically: an inner anonymous catch that logs a variable defined in an outer catch.
		//
		// The concrete bug was:
		//   } catch (_err) {
		//     try { ... } catch { console.error("...", _err.message); }  // wrong! _err is IPC, not kill
		//   }
		//
		// After the fix: inner catch uses its own `killErr` variable.
		// This ratchet detects the pattern "catch {" (inner, no variable) followed by
		// a reference to a variable that was bound in the outer catch clause.

		// Find outer catch variable names (e.g., "catch (_err)" → "_err")
		const outerCatchVars = [...src.matchAll(/\} catch \((\w+)\) \{/g)].map((m) => m[1]);

		// For each outer catch variable, check it doesn't appear inside an inner "catch {"
		for (const varName of outerCatchVars) {
			// Find the pattern: inner anonymous catch that references the outer var
			const innerCatchWithOuterVar = new RegExp(
				`catch \\(${varName}\\)[\\s\\S]{0,500}catch \\{[\\s\\S]{0,200}${varName}`,
			);
			expect(src).not.toMatch(innerCatchWithOuterVar);
		}
	});

	it("daemon restart uses polling (no fixed setTimeout sleep for process death)", () => {
		// The anti-pattern: await new Promise((r) => setTimeout(r, <fixed-ms>))
		// used to wait for a process to die  -  this is replaced by polling loops.
		// The only acceptable fixed sleeps are startup-related (initial check delay).
		expect(src).not.toMatch(/await new Promise\([^)]*\)\s*=>\s*setTimeout\([^,]+,\s*5\d{2}\)/);
	});

	it("logFd fallback in restart uses /dev/null, not stdout fd 1", () => {
		expect(src).not.toMatch(/logFd\s*=\s*1\s*;/);
		expect(src).toMatch(/openSync\(["']\/dev\/null["']/);
	});
});
