/**
 * Authentication Commands Tests
 *
 * Tests for the multi-strategy auth system:
 * - Device Code Flow (RFC 8628)
 * - API Key Flow
 * - Credential detection (JWT vs API key)
 * - Backward compatibility
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock vreko-dir before importing auth module
vi.mock("../../src/services/vreko-dir.js", () => ({
	getCredentials: vi.fn(),
	saveCredentials: vi.fn(),
	clearCredentials: vi.fn(),
	createGlobalDirectory: vi.fn(),
}));

vi.mock("../../src/services/mcp-service.js", () => ({
	syncApiKeyToAllConfigs: vi.fn(),
}));

// Mock ora  -  create a fresh spinner per call
const createMockSpinner = () => {
	const spinner: Record<string, unknown> = {
		start: vi.fn(() => spinner),
		stop: vi.fn(() => spinner),
		succeed: vi.fn(() => spinner),
		fail: vi.fn(() => spinner),
		text: "",
	};
	return spinner;
};

vi.mock("ora", () => {
	return { default: vi.fn(() => createMockSpinner()) };
});

// Mock child_process.execFile for browser open
vi.mock("node:child_process", () => ({
	execFile: vi.fn(),
}));

// =============================================================================
// IMPORTS (after mocks)
// =============================================================================

import { createLoginCommand, createLogoutCommand, createWhoamiCommand } from "../../src/commands/auth.js";
import { syncApiKeyToAllConfigs } from "../../src/services/mcp-service.js";
import { clearCredentials, getCredentials, saveCredentials } from "../../src/services/vreko-dir.js";

// =============================================================================
// TEST HELPERS
// =============================================================================

/** Mock fetch responses sequentially. */
function mockFetch(responses: Array<{ ok: boolean; status?: number; body: unknown }>) {
	let callIndex = 0;
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => {
			const resp = responses[callIndex] ?? responses[responses.length - 1];
			callIndex++;
			return {
				ok: resp.ok,
				status: resp.status ?? (resp.ok ? 200 : 400),
				json: async () => resp.body,
				text: async () => JSON.stringify(resp.body),
			};
		}),
	);
}

/** Mock device code response matching packages/testing/src/msw/handlers/device-code.ts shapes */
const MOCK_DEVICE_CODE_RESPONSE = {
	device_code: "device_code_abc123xyz",
	user_code: "SNAP-1234",
	verification_uri: "http://localhost:3000/device",
	verification_uri_complete: "http://localhost:3000/device?user_code=SNAP-1234",
	expires_in: 900,
	interval: 5,
};

const MOCK_TOKEN_SUCCESS_RESPONSE = {
	access_token: "device_session_token_xyz",
	token_type: "Bearer",
	expires_in: 604800,
	refresh_token: "refresh_token_xyz",
	user: { email: "test@example.com", name: "Test User" },
	tier: "pro",
};

// Track exit calls without throwing (throwing interferes with fake timers)
let exitCode: number | undefined;
let consoleLogSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	exitCode = undefined;
	vi.spyOn(process, "exit").mockImplementation((code) => {
		exitCode = (code as number) ?? 0;
		// Don't throw  -  let the async flow complete naturally
		return undefined as never;
	});
	consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {
		/* intentionally empty */
	});
	consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
		/* intentionally empty */
	});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

// =============================================================================
// DEVICE CODE FLOW TESTS
// =============================================================================

describe("Device Code Flow (RFC 8628)", () => {
	it("happy path: requests code, polls, stores credentials on success", async () => {
		mockFetch([
			{ ok: true, body: MOCK_DEVICE_CODE_RESPONSE },
			{ ok: true, body: MOCK_TOKEN_SUCCESS_RESPONSE },
		]);

		const cmd = createLoginCommand();
		const loginPromise = cmd.parseAsync(["login"], { from: "user" });

		await vi.advanceTimersByTimeAsync(6000);
		await loginPromise;

		expect(saveCredentials).toHaveBeenCalledWith(
			expect.objectContaining({
				accessToken: "device_session_token_xyz",
				refreshToken: "refresh_token_xyz",
				email: "test@example.com",
				tier: "pro",
			}),
		);
		expect(syncApiKeyToAllConfigs).toHaveBeenCalledWith("device_session_token_xyz");
		expect(exitCode).toBeUndefined(); // No exit on success
	});

	it("handles authorization_pending by continuing to poll", async () => {
		mockFetch([
			{ ok: true, body: MOCK_DEVICE_CODE_RESPONSE },
			{
				ok: false,
				status: 400,
				body: {
					error: "authorization_pending",
					error_description: "The authorization request is still pending",
				},
			},
			{ ok: true, body: MOCK_TOKEN_SUCCESS_RESPONSE },
		]);

		const cmd = createLoginCommand();
		const loginPromise = cmd.parseAsync(["login"], { from: "user" });

		await vi.advanceTimersByTimeAsync(6000);
		await vi.advanceTimersByTimeAsync(6000);
		await loginPromise;

		expect(saveCredentials).toHaveBeenCalledWith(
			expect.objectContaining({
				accessToken: "device_session_token_xyz",
				email: "test@example.com",
			}),
		);
	});

	it("handles slow_down by increasing poll interval", async () => {
		mockFetch([
			{ ok: true, body: MOCK_DEVICE_CODE_RESPONSE },
			{
				ok: false,
				status: 400,
				body: { error: "slow_down", error_description: "Polling too frequently", interval: 10 },
			},
			{ ok: true, body: MOCK_TOKEN_SUCCESS_RESPONSE },
		]);

		const cmd = createLoginCommand();
		const loginPromise = cmd.parseAsync(["login"], { from: "user" });

		// First poll at ~5s
		await vi.advanceTimersByTimeAsync(6000);
		// After slow_down, interval increases by 5000ms -> 10000ms total
		await vi.advanceTimersByTimeAsync(11000);
		await loginPromise;

		expect(saveCredentials).toHaveBeenCalled();
	});

	it("handles access_denied by aborting with exit code 1", async () => {
		mockFetch([
			{ ok: true, body: MOCK_DEVICE_CODE_RESPONSE },
			{
				ok: false,
				status: 400,
				body: {
					error: "access_denied",
					error_description: "The user denied the authorization request",
				},
			},
		]);

		const cmd = createLoginCommand();
		const loginPromise = cmd.parseAsync(["login"], { from: "user" });

		await vi.advanceTimersByTimeAsync(6000);
		await loginPromise;

		expect(exitCode).toBe(1);
		expect(saveCredentials).not.toHaveBeenCalled();
		const errorOutput = consoleErrorSpy.mock.calls.flat().join(" ");
		expect(errorOutput).toContain("denied");
	});

	it("handles expired_token by aborting with retry message", async () => {
		mockFetch([
			{ ok: true, body: MOCK_DEVICE_CODE_RESPONSE },
			{
				ok: false,
				status: 400,
				body: {
					error: "expired_token",
					error_description: "The device code has expired",
				},
			},
		]);

		const cmd = createLoginCommand();
		const loginPromise = cmd.parseAsync(["login"], { from: "user" });

		await vi.advanceTimersByTimeAsync(6000);
		await loginPromise;

		expect(exitCode).toBe(1);
		expect(saveCredentials).not.toHaveBeenCalled();
		const errorOutput = consoleErrorSpy.mock.calls.flat().join(" ");
		expect(errorOutput).toContain("expired");
	});

	it("exits with not_in_cohort message when server returns not_in_cohort error", async () => {
		mockFetch([
			{ ok: true, body: MOCK_DEVICE_CODE_RESPONSE },
			{
				ok: false,
				status: 400,
				body: {
					error: "not_in_cohort",
					error_description: "Your email is not in Pioneer Batch 1. Join the waitlist at vreko.dev/pioneer",
				},
			},
		]);

		const cmd = createLoginCommand();
		const loginPromise = cmd.parseAsync(["login"], { from: "user" });

		await vi.advanceTimersByTimeAsync(6000);
		await loginPromise;

		expect(exitCode).toBe(1);
		expect(saveCredentials).not.toHaveBeenCalled();

		// CLI prints the pioneer waitlist URL so the user knows where to sign up
		const allOutput = [...consoleLogSpy.mock.calls.flat(), ...consoleErrorSpy.mock.calls.flat()].join(" ");
		expect(allOutput).toMatch(/Pioneer Batch 1/i);
		expect(allOutput).toMatch(/vreko\.dev\/pioneer/);
	});
});

// =============================================================================
// API KEY FLOW TESTS
// =============================================================================

describe("API Key Flow", () => {
	it("validates and stores API key via --api-key flag", async () => {
		mockFetch([{ ok: true, body: { user: { email: "user@example.com" } } }]);

		const cmd = createLoginCommand();
		await cmd.parseAsync(["login", "--api-key", "sk_live_test123456789"], { from: "user" });

		expect(saveCredentials).toHaveBeenCalledWith(
			expect.objectContaining({
				accessToken: "sk_live_test123456789",
				email: "user@example.com",
			}),
		);
	});

	it("rejects invalid API key format", async () => {
		const cmd = createLoginCommand();
		await cmd.parseAsync(["login", "--api-key", "invalid_key"], { from: "user" });

		expect(exitCode).toBe(1);
		expect(saveCredentials).not.toHaveBeenCalled();
	});

	it("rejects API key that fails server validation", async () => {
		mockFetch([{ ok: false, status: 401, body: { error: "unauthorized" } }]);

		const cmd = createLoginCommand();
		await cmd.parseAsync(["login", "--api-key", "sk_live_invalidkey12345"], { from: "user" });

		expect(exitCode).toBe(1);
		expect(saveCredentials).not.toHaveBeenCalled();
	});
});

// =============================================================================
// WHOAMI TESTS
// =============================================================================

describe("whoami command", () => {
	it("detects JWT (device-code) credentials", async () => {
		vi.mocked(getCredentials).mockResolvedValue({
			accessToken: "device_session_token_xyz",
			refreshToken: "refresh_token_xyz",
			email: "test@example.com",
			tier: "pro",
			expiresAt: new Date(Date.now() + 86400000).toISOString(),
		});

		mockFetch([{ ok: true, body: { user: { email: "test@example.com", tier: "pro" } } }]);

		const cmd = createWhoamiCommand();
		await cmd.parseAsync(["whoami"], { from: "user" });

		const logCalls = consoleLogSpy.mock.calls.flat().join(" ");
		expect(logCalls).toContain("device-code");
		expect(logCalls).toContain("test@example.com");
	});

	it("detects API key credentials stored as GlobalCredentials", async () => {
		vi.mocked(getCredentials).mockResolvedValue({
			accessToken: "sk_live_test123456789",
			email: "user@example.com",
			tier: "free",
		});

		mockFetch([{ ok: true, body: { user: { email: "user@example.com" } } }]);

		const cmd = createWhoamiCommand();
		await cmd.parseAsync(["whoami"], { from: "user" });

		const logCalls = consoleLogSpy.mock.calls.flat().join(" ");
		expect(logCalls).toContain("api-key");
	});

	it("shows not authenticated when no credentials", async () => {
		vi.mocked(getCredentials).mockResolvedValue(null);

		const cmd = createWhoamiCommand();
		await cmd.parseAsync(["whoami"], { from: "user" });

		const logCalls = consoleLogSpy.mock.calls.flat().join(" ");
		expect(logCalls).toContain("Not authenticated");
	});
});

// =============================================================================
// LOGOUT TESTS
// =============================================================================

describe("logout command", () => {
	it("clears all credential types via clearCredentials", async () => {
		const cmd = createLogoutCommand();
		await cmd.parseAsync(["logout"], { from: "user" });

		expect(clearCredentials).toHaveBeenCalled();
	});
});

// =============================================================================
// BACKWARD COMPATIBILITY TESTS
// =============================================================================

describe("backward compatibility", () => {
	it("handles legacy apiKey credentials via GlobalCredentials adapter", async () => {
		vi.mocked(getCredentials).mockResolvedValue({
			accessToken: "sk_live_legacy_key_12345",
			email: "legacy@example.com",
			tier: "free",
		});

		mockFetch([{ ok: true, body: { user: { email: "legacy@example.com" } } }]);

		const cmd = createWhoamiCommand();
		await cmd.parseAsync(["whoami"], { from: "user" });

		const logCalls = consoleLogSpy.mock.calls.flat().join(" ");
		expect(logCalls).toContain("api-key");
		expect(logCalls).toContain("legacy@example.com");
	});
});
