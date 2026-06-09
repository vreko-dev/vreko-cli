/**
 * Service Client Wrapper Tests
 *
 * Tests for withDaemon() and withDaemonOptional() canonical wrappers.
 * These tests verify daemon connectivity handling, error rendering, and exit behavior.
 *
 * Strategy: mock VrekoLocalClient constructor so connectToDaemon() returns a
 * controlled client. withDaemon/withDaemonOptional call client.health.check()
 * after connecting — making health.check fail is the reliable way to test
 * the failure path without fighting the module singleton or ESM binding scope.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock isServiceHealthy (pre-flight check inside withDaemon)
vi.mock("../../src/service-adapter/local-service-adapter.js", () => ({
	isServiceHealthy: vi.fn().mockResolvedValue(true),
	getDefaultSocketPath: vi.fn().mockReturnValue("/tmp/vreko-test.sock"),
	getServicePidPath: vi.fn().mockReturnValue("/tmp/vreko-test.pid"),
	isServiceRunning: vi.fn().mockReturnValue(false),
	readServicePid: vi.fn().mockReturnValue(null),
}));

// Mock degraded-state rendering
vi.mock("../../src/ui/degraded-state.js", () => ({
	renderDegradedState: vi.fn(),
}));

// Shared mock client — all withDaemon/withDaemonOptional calls funnel through this
const mockHealthCheck = vi.fn().mockResolvedValue(undefined);

vi.mock("@vreko/local-service-client", () => ({
	VrekoLocalClient: vi.fn().mockImplementation(() => ({
		connect: vi.fn().mockResolvedValue(undefined),
		initialize: vi.fn().mockResolvedValue(undefined),
		isConnected: vi.fn().mockReturnValue(false),
		health: { check: mockHealthCheck },
		close: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
	})),
}));

import { VrekoLocalClient } from "@vreko/local-service-client";
import { isServiceHealthy } from "../../src/service-adapter/local-service-adapter.js";
import { withDaemon, withDaemonOptional } from "../../src/services/service-client.js";
import { renderDegradedState } from "../../src/ui/degraded-state.js";

beforeEach(() => {
	// mockReset: true (global) clears all vi.fn() implementations — restore them here.
	vi.mocked(isServiceHealthy).mockResolvedValue(true);
	mockHealthCheck.mockResolvedValue(undefined); // healthy by default

	// Restore VrekoLocalClient constructor mock so getDaemonClient() produces a usable client
	vi.mocked(VrekoLocalClient).mockImplementation(
		() =>
			({
				connect: vi.fn().mockResolvedValue(undefined),
				initialize: vi.fn().mockResolvedValue(undefined),
				isConnected: vi.fn().mockReturnValue(false),
				health: { check: mockHealthCheck },
				close: vi.fn(),
				on: vi.fn(),
				off: vi.fn(),
			}) as never,
	);

	vi.spyOn(process, "exit").mockImplementation(() => {
		throw new Error("process.exit called");
	});
});

afterEach(() => {
	vi.clearAllMocks();
	vi.restoreAllMocks();
});

describe("withDaemon", () => {
	it("executes callback when daemon is reachable", async () => {
		const callback = vi.fn().mockResolvedValue("success");
		const result = await withDaemon("test-command", callback);

		expect(result).toBe("success");
		expect(callback).toHaveBeenCalled();
	});

	it("calls renderDegradedState and exits when health check fails (daemon unreachable)", async () => {
		// Simulate unreachable daemon via health check failure (works regardless of singleton state)
		mockHealthCheck.mockRejectedValue(new Error("Connection refused"));

		const callback = vi.fn();

		await expect(withDaemon("test-command", callback)).rejects.toThrow("process.exit called");

		expect(renderDegradedState).toHaveBeenCalledWith({
			command: "test-command",
			reason: "unreachable",
		});
		expect(callback).not.toHaveBeenCalled();
	});

	it("uses custom reason when provided", async () => {
		mockHealthCheck.mockRejectedValue(new Error("Timeout"));

		const callback = vi.fn();

		await expect(withDaemon("test-command", callback, { reason: "timeout" })).rejects.toThrow(
			"process.exit called",
		);

		expect(renderDegradedState).toHaveBeenCalledWith({
			command: "test-command",
			reason: "timeout",
		});
	});

	it("defaults to 'unreachable' reason when not provided", async () => {
		mockHealthCheck.mockRejectedValue(new Error("Connection refused"));

		const callback = vi.fn();

		await expect(withDaemon("test-command", callback)).rejects.toThrow("process.exit called");

		expect(renderDegradedState).toHaveBeenCalledWith({
			command: "test-command",
			reason: "unreachable",
		});
	});

	it("calls renderDegradedState when pre-flight isServiceHealthy returns false", async () => {
		vi.mocked(isServiceHealthy).mockResolvedValue(false);

		const callback = vi.fn();

		await expect(withDaemon("test-command", callback)).rejects.toThrow("process.exit called");

		expect(renderDegradedState).toHaveBeenCalled();
		expect(callback).not.toHaveBeenCalled();
	});
});

describe("withDaemonOptional", () => {
	it("executes callback with client when daemon is reachable", async () => {
		const callback = vi.fn().mockResolvedValue("success");
		const result = await withDaemonOptional("test-command", callback);

		expect(result).toBe("success");
		expect(callback).toHaveBeenCalled();
		// Client passed is not null
		expect(callback.mock.calls[0][0]).not.toBeNull();
	});

	it("executes callback with null when health check fails (daemon unreachable)", async () => {
		mockHealthCheck.mockRejectedValue(new Error("Connection refused"));

		const callback = vi.fn().mockResolvedValue("degraded-success");

		const result = await withDaemonOptional("test-command", callback);

		expect(result).toBe("degraded-success");
		expect(callback).toHaveBeenCalledWith(null);
	});

	it("does not call renderDegradedState when daemon is unreachable", async () => {
		mockHealthCheck.mockRejectedValue(new Error("Connection refused"));

		const callback = vi.fn().mockResolvedValue("degraded-success");

		await withDaemonOptional("test-command", callback);

		expect(renderDegradedState).not.toHaveBeenCalled();
	});

	it("does not exit when daemon is unreachable", async () => {
		mockHealthCheck.mockRejectedValue(new Error("Connection refused"));

		const callback = vi.fn().mockResolvedValue("degraded-success");

		const result = await withDaemonOptional("test-command", callback);

		expect(result).toBe("degraded-success");
		expect(process.exit).not.toHaveBeenCalled();
	});
});
