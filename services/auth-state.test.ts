/**
 * Auth state regression tests
 *
 * Covers the isLoggedIn() read path fix: it must read through getCredentials()
 * (secure storage chain) not directly from credentials.json. Without this,
 * a successful vr login stores via keychain/enc but status immediately reports
 * "not logged in" because credentials.json doesn't exist.
 *
 * Regression for: isLoggedIn() calling readGlobalJson("credentials.json") directly
 * instead of getCredentials() which routes through secure-credentials.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock secure-credentials so we control what the storage layer returns,
// simulating keychain/encrypted-file without touching the real OS keychain.
vi.mock("../../src/services/secure-credentials.js", () => ({
	getCredentialsSecure: vi.fn(),
	saveCredentialsSecure: vi.fn(),
	clearCredentialsSecure: vi.fn(),
	isLoggedInSecure: vi.fn(),
	getSecureCredentials: vi.fn(() => ({
		getCredentials: vi.fn(),
		setCredentials: vi.fn(),
		clearCredentials: vi.fn(),
		isLoggedIn: vi.fn(),
		getProviderName: vi.fn(() => "encrypted-file"),
		initialize: vi.fn(),
	})),
	SecureCredentialsManager: vi.fn(),
}));

// Do NOT mock vreko-dir itself - we need the real isLoggedIn() under test.

import { getCredentialsSecure } from "../../src/services/secure-credentials.js";
import { isLoggedIn } from "../../src/services/vreko-dir.js";

const mockGetCredentialsSecure = vi.mocked(getCredentialsSecure);

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.resetModules();
});

describe("isLoggedIn() - reads through secure storage chain", () => {
	it("returns true when secure storage holds a valid non-expired token", async () => {
		mockGetCredentialsSecure.mockResolvedValue({
			accessToken: "tok_valid_abc123",
			email: "test@vreko.dev",
			tier: "pro",
			expiresAt: new Date(Date.now() + 86_400_000).toISOString(), // 24h from now
		});

		expect(await isLoggedIn()).toBe(true);
	});

	it("returns false when secure storage returns null (no credentials saved)", async () => {
		mockGetCredentialsSecure.mockResolvedValue(null);

		expect(await isLoggedIn()).toBe(false);
	});

	it("returns false when stored token has no accessToken field", async () => {
		// Malformed / legacy credential without accessToken
		mockGetCredentialsSecure.mockResolvedValue({
			accessToken: "",
			email: "test@vreko.dev",
			tier: "free",
		});

		expect(await isLoggedIn()).toBe(false);
	});

	it("returns false when stored token is expired", async () => {
		mockGetCredentialsSecure.mockResolvedValue({
			accessToken: "tok_expired_xyz",
			email: "test@vreko.dev",
			tier: "free",
			expiresAt: new Date(Date.now() - 1000).toISOString(), // 1s in the past
		});

		expect(await isLoggedIn()).toBe(false);
	});

	it("returns true when expiresAt is absent (no expiry = valid)", async () => {
		mockGetCredentialsSecure.mockResolvedValue({
			accessToken: "sk_live_api_key_no_expiry",
			email: "test@vreko.dev",
			tier: "free",
			// no expiresAt - API key credentials don't have one
		});

		expect(await isLoggedIn()).toBe(true);
	});

	it("returns false when secure storage throws (graceful failure)", async () => {
		mockGetCredentialsSecure.mockRejectedValue(new Error("keychain unavailable"));

		expect(await isLoggedIn()).toBe(false);
	});
});
