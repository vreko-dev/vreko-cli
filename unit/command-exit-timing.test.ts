/**
 * Command exit timing  -  Invariant 4
 *
 * CLI commands that short-circuit when the daemon is not running must complete
 * in well under one second. A command that hangs (e.g. due to an uncleared
 * setTimeout, an auto-reconnect loop, or a leaked Promise.race timer) blocks
 * the terminal and degrades developer experience.
 *
 * Each test:
 *  1. Mocks the daemon adapter so isServiceRunning() returns false.
 *  2. Runs the command via Commander.
 *  3. Asserts total wall time is below a generous threshold (250 ms).
 *     The threshold is intentionally loose  -  CI can be slow.
 *     What we're catching is the class of bugs that add seconds, not milliseconds.
 */

import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks  -  must be declared before any import that pulls in the commands
// ---------------------------------------------------------------------------

vi.mock("../../src/service-adapter/local-service-adapter.js", () => ({
	createServiceClient: vi.fn(),
	connectServiceClient: vi.fn().mockResolvedValue(undefined),
	isServiceRunning: vi.fn().mockReturnValue(false),
	readServicePid: vi.fn().mockReturnValue(null),
	getServiceSocketPath: vi.fn().mockReturnValue("/tmp/test.sock"),
	formatBytes: vi.fn((b: number) => `${b}B`),
	formatDuration: vi.fn((ms: number) => `${ms}ms`),
}));

vi.mock("@vreko/mcp-config", () => ({
	detectAIClients: vi.fn().mockReturnValue({ clients: [] }),
	readClientConfig: vi.fn().mockReturnValue(null),
	getServerKey: vi.fn().mockReturnValue("vreko"),
}));

import { registerBaselineCommands } from "../../src/commands/baseline.js";
import { registerDaemonCommands } from "../../src/commands/daemon.js";
import { isServiceRunning } from "../../src/service-adapter/local-service-adapter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Max allowed wall-clock time in ms for a short-circuit (daemon-not-running) path. */
const MAX_MS = 250;

async function timedRun(setup: (program: Command) => void, ...args: string[]): Promise<number> {
	const program = new Command();
	program.exitOverride();
	setup(program);

	const t0 = Date.now();
	try {
		await program.parseAsync(["node", "vreko", ...args]);
	} catch (_error) {
		void _error;
	}
	return Date.now() - t0;
}

// ---------------------------------------------------------------------------
// daemon status  -  not running fast-path
// ---------------------------------------------------------------------------

describe("daemon status  -  exits quickly when daemon is not running", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => undefined);
		vi.mocked(isServiceRunning).mockReturnValue(false);
	});
	afterEach(() => vi.restoreAllMocks());

	it(`completes in under ${MAX_MS}ms`, async () => {
		const elapsed = await timedRun((p) => registerDaemonCommands(p), "daemon", "status");
		expect(elapsed).toBeLessThan(MAX_MS);
	});
});

// ---------------------------------------------------------------------------
// daemon ping  -  not running fast-path
// ---------------------------------------------------------------------------

describe("daemon ping  -  exits quickly when daemon is not running", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => undefined);
		vi.mocked(isServiceRunning).mockReturnValue(false);
	});
	afterEach(() => vi.restoreAllMocks());

	it(`completes in under ${MAX_MS}ms`, async () => {
		const elapsed = await timedRun((p) => registerDaemonCommands(p), "daemon", "ping");
		expect(elapsed).toBeLessThan(MAX_MS);
	});
});

// ---------------------------------------------------------------------------
// baseline status  -  not running fast-path
// ---------------------------------------------------------------------------

describe("baseline status  -  exits quickly when daemon is not running", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => undefined);
		vi.mocked(isServiceRunning).mockReturnValue(false);
	});
	afterEach(() => vi.restoreAllMocks());

	it(`completes in under ${MAX_MS}ms`, async () => {
		const elapsed = await timedRun((p) => registerBaselineCommands(p), "baseline", "status");
		expect(elapsed).toBeLessThan(MAX_MS);
	});
});

// ---------------------------------------------------------------------------
// baseline show  -  not running fast-path
// ---------------------------------------------------------------------------

describe("baseline show  -  exits quickly when daemon is not running", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => undefined);
		vi.mocked(isServiceRunning).mockReturnValue(false);
	});
	afterEach(() => vi.restoreAllMocks());

	it(`completes in under ${MAX_MS}ms`, async () => {
		const elapsed = await timedRun((p) => registerBaselineCommands(p), "baseline", "show");
		expect(elapsed).toBeLessThan(MAX_MS);
	});
});
