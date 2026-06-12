/**
 * Local Service Adapter Tests
 *
 * Tests for the CLI adapter layer over @vreko/local-service-client.
 * Replaces the deleted daemon/client.test.ts and daemon/constants.test.ts
 * which tested the now-removed hand-rolled IPC stack.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
}));

const localServiceClientMocks = vi.hoisted(() => {
	const client = {
		connect: vi.fn().mockResolvedValue(undefined),
		initialize: vi.fn().mockResolvedValue(undefined),
		close: vi.fn(),
		health: {
			ping: vi.fn().mockResolvedValue({ status: "ok" }),
		},
	};

	return {
		client,
		constructor: vi.fn(() => client),
	};
});

vi.mock("@vreko/local-service-client", async () => {
	const actual = await vi.importActual<typeof import("@vreko/local-service-client")>("@vreko/local-service-client");
	return {
		...actual,
		VrekoLocalClient: localServiceClientMocks.constructor,
	};
});

import type { VrekoLocalClient } from "@vreko/local-service-client";
import { getDefaultSocketPath } from "@vreko/local-service-client";
import {
	connectServiceClient,
	createServiceClient,
	DAEMON_GENERATION,
	formatBytes,
	formatDuration,
	getDaemonVersion,
	getLogPath,
	getServicePidPath,
	getServiceSocketPath,
	isDaemonRunning,
	isServiceHealthy,
	isServiceRunning,
	readServicePid,
} from "../../src/service-adapter/local-service-adapter.js";

/** Build a mock VrekoLocalClient for direct-injection tests */
function makeMockClient() {
	return {
		connect: vi.fn().mockResolvedValue(undefined),
		initialize: vi.fn().mockResolvedValue(undefined),
		close: vi.fn(),
		call: vi.fn(),
	} as unknown as VrekoLocalClient;
}

const HOME = homedir();

describe("service path helpers", () => {
	it("getServicePidPath returns path under ~/.vreko", () => {
		const p = getServicePidPath();
		expect(p).toBe(join(HOME, ".vreko", "service.pid"));
	});

	it("getServiceSocketPath returns path under ~/.vreko", () => {
		const p = getServiceSocketPath();
		expect(p).toBe(getDefaultSocketPath());
	});

	it("getLogPath returns path under ~/.vreko/daemon", () => {
		const p = getLogPath();
		expect(p).toBe(join(HOME, ".vreko", "daemon", "daemon.log"));
	});
});

describe("isServiceRunning", () => {
	const mockExistsSync = vi.mocked(existsSync);
	const mockReadFileSync = vi.mocked(readFileSync);
	let killSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		killSpy = vi.spyOn(process, "kill").mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("returns false when PID file does not exist", () => {
		mockExistsSync.mockReturnValue(false);
		expect(isServiceRunning()).toBe(false);
	});

	it("returns false when PID file contains non-numeric content", () => {
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue("not-a-number");
		expect(isServiceRunning()).toBe(false);
	});

	it("returns true when process exists (signal 0 succeeds)", () => {
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue("12345");
		killSpy.mockReturnValue(true);
		expect(isServiceRunning()).toBe(true);
		expect(killSpy).toHaveBeenCalledWith(12345, 0);
	});

	it("returns false when process does not exist (signal 0 throws)", () => {
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue("99999");
		killSpy.mockImplementation(() => {
			throw new Error("ESRCH");
		});
		expect(isServiceRunning()).toBe(false);
	});

	it("isDaemonRunning is an alias for isServiceRunning", () => {
		expect(isDaemonRunning).toBe(isServiceRunning);
	});
});

describe("isServiceHealthy", () => {
	const mockExistsSync = vi.mocked(existsSync);
	const mockReadFileSync = vi.mocked(readFileSync);
	let killSpy: ReturnType<typeof vi.spyOn>;
	const mockClient = localServiceClientMocks.client;

	beforeEach(() => {
		killSpy = vi.spyOn(process, "kill").mockReturnValue(true);
		mockClient.connect.mockClear();
		mockClient.initialize.mockClear();
		mockClient.close.mockClear();
		mockClient.health.ping.mockClear();
		localServiceClientMocks.constructor.mockClear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("returns true when pid probe is denied but the daemon answers health ping", async () => {
		mockExistsSync.mockReturnValueOnce(true);
		mockReadFileSync.mockReturnValue("12345");
		killSpy.mockImplementation(() => {
			const error = Object.assign(new Error("EPERM"), { code: "EPERM" });
			throw error;
		});

		await expect(isServiceHealthy()).resolves.toBe(true);
		expect(localServiceClientMocks.constructor).toHaveBeenCalledWith({
			socketPath: getServiceSocketPath(),
			timeout: 5000,
			autoReconnect: false,
		});
		expect(mockClient.connect).toHaveBeenCalledOnce();
		expect(mockClient.initialize).toHaveBeenCalledWith({
			protocolVersion: "1.0.0",
			clientInfo: { name: "vreko-cli", version: "1.0.0" },
			capabilities: { notifications: false },
		});
		expect(mockClient.health.ping).toHaveBeenCalledOnce();
		expect(mockClient.close).toHaveBeenCalledOnce();
	});
});

describe("readServicePid", () => {
	const mockReadFileSync = vi.mocked(readFileSync);

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when file cannot be read", () => {
		mockReadFileSync.mockImplementation(() => {
			throw new Error("ENOENT");
		});
		expect(readServicePid()).toBeNull();
	});

	it("returns null when file contains non-numeric content", () => {
		mockReadFileSync.mockReturnValue("garbage");
		expect(readServicePid()).toBeNull();
	});

	it("returns the PID as a number when file is valid", () => {
		mockReadFileSync.mockReturnValue("42");
		expect(readServicePid()).toBe(42);
	});

	it("trims whitespace from PID file content", () => {
		mockReadFileSync.mockReturnValue("  1337  \n");
		expect(readServicePid()).toBe(1337);
	});
});

describe("createServiceClient", () => {
	it("returns a non-null object (VrekoLocalClient instance)", () => {
		// We verify the factory returns something meaningful without needing to
		// mock the class constructor (external package mock is unreliable in vitest).
		const client = createServiceClient();
		expect(client).toBeDefined();
		expect(client).toBeTypeOf("object");
		expect(client).not.toBeNull();
	});
});

describe("connectServiceClient", () => {
	it("calls connect and initialize on the provided client", async () => {
		// Inject a mock directly  -  cleaner than mocking the constructor
		const client = makeMockClient();
		await connectServiceClient(client);
		expect(client.connect).toHaveBeenCalledOnce();
		expect(client.initialize).toHaveBeenCalledWith({
			protocolVersion: "1.0.0",
			clientInfo: { name: "vreko-cli", version: "1.0.0" },
			capabilities: { notifications: false },
		});
	});

	it("propagates connect() rejection to the caller", async () => {
		const client = makeMockClient();
		(client.connect as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ECONNREFUSED"));
		await expect(connectServiceClient(client)).rejects.toThrow("ECONNREFUSED");
	});

	it("does not call initialize() when connect() fails", async () => {
		const client = makeMockClient();
		(client.connect as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
		await expect(connectServiceClient(client)).rejects.toThrow();
		expect(client.initialize).not.toHaveBeenCalled();
	});

	it("propagates initialize() rejection to the caller", async () => {
		const client = makeMockClient();
		(client.initialize as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Protocol mismatch"));
		await expect(connectServiceClient(client)).rejects.toThrow("Protocol mismatch");
	});

	it("propagates ECONNREFUSED error code (socket exists, daemon not listening)", async () => {
		const client = makeMockClient();
		const err = Object.assign(new Error("connect ECONNREFUSED /var/run/test.sock"), { code: "ECONNREFUSED" });
		(client.connect as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);
		const caught = await connectServiceClient(client).catch((e) => e as NodeJS.ErrnoException);
		expect(caught.code).toBe("ECONNREFUSED");
	});

	it("propagates ETIMEDOUT error code (IPC timeout)", async () => {
		const client = makeMockClient();
		const err = Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" });
		(client.connect as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);
		const caught = await connectServiceClient(client).catch((e) => e as NodeJS.ErrnoException);
		expect(caught.code).toBe("ETIMEDOUT");
	});

	it("propagates ENOENT error code (socket file missing)", async () => {
		const client = makeMockClient();
		const err = Object.assign(new Error("connect ENOENT /var/run/test.sock"), { code: "ENOENT" });
		(client.connect as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);
		const caught = await connectServiceClient(client).catch((e) => e as NodeJS.ErrnoException);
		expect(caught.code).toBe("ENOENT");
	});
});

describe("formatDuration", () => {
	it("formats seconds correctly", () => {
		expect(formatDuration(5000)).toBe("5s");
		expect(formatDuration(59000)).toBe("59s");
	});

	it("formats minutes and seconds", () => {
		expect(formatDuration(65000)).toBe("1m 5s");
		expect(formatDuration(125000)).toBe("2m 5s");
	});

	it("formats hours and minutes", () => {
		expect(formatDuration(3_665_000)).toBe("1h 1m");
	});

	it("formats days and hours", () => {
		expect(formatDuration(90_000_000)).toBe("1d 1h");
	});
});

describe("formatBytes", () => {
	it("formats bytes", () => {
		expect(formatBytes(500)).toBe("500.0B");
	});

	it("formats kilobytes", () => {
		expect(formatBytes(1024)).toBe("1.0KB");
		expect(formatBytes(1536)).toBe("1.5KB");
	});

	it("formats megabytes", () => {
		expect(formatBytes(1024 * 1024)).toBe("1.0MB");
	});

	it("formats gigabytes", () => {
		expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0GB");
	});
});

describe("version detection", () => {
	it("DAEMON_GENERATION is 2 (gen1 removed)", () => {
		expect(DAEMON_GENERATION).toBe(2);
	});

	it("getDaemonVersion returns correct generation and version", () => {
		const v = getDaemonVersion();
		expect(v.generation).toBe(2);
		expect(v.version).toBe("2.0.0");
	});
});
