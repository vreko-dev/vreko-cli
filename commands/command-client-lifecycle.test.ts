/**
 * Command Client Lifecycle Tests  -  Invariant 2
 *
 * Verifies that every CLI command that creates an IPC client calls client.close()
 * on ALL exit paths  -  success, IPC connection failure, and RPC call failure.
 *
 * Root cause of the class: missing finally { client.close() } blocks allow file
 * descriptors and Node.js timers to outlive the command, causing hangs and leaks.
 *
 * Two test strategies are used here:
 *  1. Structural ratchets  -  read source text and count createServiceClient() vs
 *     finally { .close() } pairs. This catches leaks before they are shipped.
 *  2. Behavioral tests  -  mock the IPC adapter and assert close() was called after
 *     each simulated path (success / IPC error / RPC error).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("node:child_process", () => ({
	execSync: vi.fn().mockImplementation(() => {
		throw new Error("not found");
	}),
	spawn: vi.fn().mockReturnValue({ unref: vi.fn(), on: vi.fn(), pid: 99999 }),
}));

vi.mock("../../src/service-adapter/local-service-adapter.js", () => ({
	createServiceClient: vi.fn(),
	connectServiceClient: vi.fn().mockResolvedValue(undefined),
	isServiceRunning: vi.fn().mockReturnValue(true),
	readServicePid: vi.fn().mockReturnValue(12345),
	getServiceSocketPath: vi.fn().mockReturnValue("/tmp/test.sock"),
	formatBytes: vi.fn((b: number) => `${b}B`),
	formatDuration: vi.fn((ms: number) => `${ms}ms`),
}));

import { registerBaselineCommands } from "../../src/commands/baseline.js";
import {
	connectServiceClient,
	createServiceClient,
	isServiceRunning,
} from "../../src/service-adapter/local-service-adapter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockClient = {
	connect: ReturnType<typeof vi.fn>;
	initialize: ReturnType<typeof vi.fn>;
	close: ReturnType<typeof vi.fn>;
	call: ReturnType<typeof vi.fn>;
};

function makeMockClient(callResult: unknown = {}): MockClient {
	return {
		connect: vi.fn().mockResolvedValue(undefined),
		initialize: vi.fn().mockResolvedValue(undefined),
		close: vi.fn(),
		call: vi.fn().mockResolvedValue(callResult),
	};
}

function buildBaselineProgram() {
	const program = new Command();
	program.exitOverride();
	registerBaselineCommands(program);
	return program;
}

async function runBaseline(...args: string[]) {
	const program = buildBaselineProgram();
	await program.parseAsync(["node", "vreko", "baseline", ...args]);
}

// ---------------------------------------------------------------------------
// baseline status  -  client lifecycle
// ---------------------------------------------------------------------------

describe("baseline status  -  client lifecycle", () => {
	let client: MockClient;

	beforeEach(() => {
		client = makeMockClient({ status: "ready", progress: 100 });
		vi.mocked(createServiceClient).mockReturnValue(client as never);
		vi.mocked(isServiceRunning).mockReturnValue(true);
	});

	afterEach(() => vi.clearAllMocks());

	it("calls client.close() on successful status fetch", async () => {
		await runBaseline("status");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("calls client.close() when connectServiceClient throws", async () => {
		vi.mocked(connectServiceClient).mockRejectedValueOnce(new Error("ECONNREFUSED"));
		await runBaseline("status");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("calls client.close() when client.call() throws", async () => {
		client.call.mockRejectedValueOnce(new Error("RPC timeout"));
		await runBaseline("status");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("prints 'not running' and skips IPC when daemon is down", async () => {
		vi.mocked(isServiceRunning).mockReturnValue(false);
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

		await runBaseline("status");

		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("not running"));
		expect(createServiceClient).not.toHaveBeenCalled();
		logSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// baseline show  -  client lifecycle
// ---------------------------------------------------------------------------

describe("baseline show  -  client lifecycle", () => {
	let client: MockClient;
	const fakeRecord = {
		workspacePath: "/test",
		computedAt: Date.now(),
		version: "1.0.0",
		totalFiles: 100,
		totalLines: 5000,
		overallHealthScore: 85,
		fragileFiles: [],
		domainHealthScores: [],
		domainMap: {},
	};

	beforeEach(() => {
		client = makeMockClient(fakeRecord);
		vi.mocked(createServiceClient).mockReturnValue(client as never);
		vi.mocked(isServiceRunning).mockReturnValue(true);
	});

	afterEach(() => vi.clearAllMocks());

	it("calls client.close() on successful show", async () => {
		await runBaseline("show");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("calls client.close() when connectServiceClient throws", async () => {
		vi.mocked(connectServiceClient).mockRejectedValueOnce(new Error("socket hang up"));
		await runBaseline("show");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("calls client.close() when client.call() throws", async () => {
		client.call.mockRejectedValueOnce(new Error("method not found"));
		await runBaseline("show");
		expect(client.close).toHaveBeenCalledOnce();
	});
});

// ---------------------------------------------------------------------------
// baseline invalidate  -  client lifecycle
// ---------------------------------------------------------------------------

describe("baseline invalidate  -  client lifecycle", () => {
	let client: MockClient;

	beforeEach(() => {
		client = makeMockClient({ invalidated: true });
		vi.mocked(createServiceClient).mockReturnValue(client as never);
		vi.mocked(isServiceRunning).mockReturnValue(true);
	});

	afterEach(() => vi.clearAllMocks());

	it("calls client.close() on successful invalidation", async () => {
		await runBaseline("invalidate");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("calls client.close() when connectServiceClient throws", async () => {
		vi.mocked(connectServiceClient).mockRejectedValueOnce(new Error("ENOENT"));
		await runBaseline("invalidate");
		expect(client.close).toHaveBeenCalledOnce();
	});

	it("calls client.close() when client.call() throws", async () => {
		client.call.mockRejectedValueOnce(new Error("service unavailable"));
		await runBaseline("invalidate");
		expect(client.close).toHaveBeenCalledOnce();
	});
});

// ---------------------------------------------------------------------------
// Structural ratchets  -  prevent future connection leaks
// ---------------------------------------------------------------------------

describe("baseline.ts structural ratchets", () => {
	const src = readFileSync(resolve(__dirname, "../../src/commands/baseline.ts"), "utf-8");

	it("every createServiceClient() call has a paired finally { .close() }  -  no leaked connections", () => {
		const createCount = (src.match(/\bcreateServiceClient\(\)/g) ?? []).length;
		expect(createCount).toBeGreaterThan(0);

		const condensed = src.replace(/\s+/g, " ");
		const finallyCloseMatches = condensed.match(/} finally \{[^}]*\.close\(\)/g) ?? [];

		expect(finallyCloseMatches.length).toBe(createCount);
	});

	it("daemon-not-running paths in baseline status print a message (not silent)", () => {
		// Both JSON and text paths must produce output
		expect(src).toMatch(/daemon_not_running/); // json path
		expect(src).toMatch(/not running/i); // text path
	});

	it("baseline invalidate prints a message when daemon is not running (not silent exit)", () => {
		// The anti-pattern: isServiceRunning check followed immediately by process.exit
		// without any console.log  -  leaves the user with no feedback.
		// After the fix, there must be a console.log before process.exit in that block.
		const invalidateSection = src.slice(src.indexOf('"invalidate"'));
		const notRunningBlock = invalidateSection.slice(
			0,
			invalidateSection.indexOf("const client = createServiceClient"),
		);
		expect(notRunningBlock).toMatch(/console\.log/);
	});

	it("baseline show prints a message when daemon is not running (not silent exit)", () => {
		const showSection = src.slice(src.lastIndexOf('"show"'));
		const notRunningBlock = showSection.slice(0, showSection.indexOf("const client = createServiceClient"));
		expect(notRunningBlock).toMatch(/console\.log/);
	});
});

describe("session.ts structural ratchets", () => {
	const src = readFileSync(resolve(__dirname, "../../src/commands/session.ts"), "utf-8");

	it("session start has disconnectFromDaemon in a finally block", () => {
		// The session commands use connectToDaemon()/disconnectFromDaemon() singleton.
		// Missing finally { disconnectFromDaemon() } causes a 5s hang on exit.
		expect(src).toMatch(/disconnectFromDaemon/);
		const condensed = src.replace(/\s+/g, " ");
		expect(condensed).toMatch(/finally \{[^}]*disconnectFromDaemon/);
	});
});
