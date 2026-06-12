/**
 * AUTH-06 honest credential storage tests (R-6.2, R-6.3).
 *
 * - R-6.2: when the secure backend is unavailable, saveCredentials writes the
 *          plaintext fallback with mode 0o600 (not 0o644).
 * - R-6.3: the result is gated on real backend success  -  secure=true only when a
 *          secure backend stored it; a downgrade returns secure=false with a
 *          reason so the caller emits a warning instead of "stored securely".
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Capture fs writes (sync + async) to inspect the mode used for the fallback.
const writeFileMock = vi.fn(async () => undefined);
vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs/promises")>();
	return {
		...actual,
		writeFile: (...args: unknown[]) => writeFileMock(...args),
		mkdir: vi.fn(async () => undefined),
	};
});

// Control the secure backend availability.
const saveCredentialsSecure = vi.fn();
const getProviderName = vi.fn(() => "encrypted-file");
vi.mock("../../src/services/secure-credentials", () => ({
	saveCredentialsSecure: (...args: unknown[]) => saveCredentialsSecure(...args),
	getSecureCredentials: () => ({ getProviderName }),
}));

import { saveCredentials } from "../../src/services/vreko-dir";

const creds = {
	accessToken: "tok",
	email: "u@example.com",
	tier: "free" as const,
	expiresAt: new Date(Date.now() + 3600_000).toISOString(),
};

describe("AUTH-06: honest credential storage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("R-6.3: secure backend success → secure=true, no fallback write", async () => {
		saveCredentialsSecure.mockResolvedValue(undefined);
		getProviderName.mockReturnValue("encrypted-file");

		const result = await saveCredentials(creds);

		expect(result.secure).toBe(true);
		expect(result.backend).toBe("encrypted-file");
		// No plaintext fallback write happened.
		expect(writeFileMock).not.toHaveBeenCalled();
	});

	it("R-6.3: keychain backend → secure=true with backend 'keychain'", async () => {
		saveCredentialsSecure.mockResolvedValue(undefined);
		getProviderName.mockReturnValue("keytar");

		const result = await saveCredentials(creds);

		expect(result.secure).toBe(true);
		expect(result.backend).toBe("keychain");
	});

	it("R-6.2 + R-6.3: secure backend failure → secure=false, fallback written 0o600", async () => {
		saveCredentialsSecure.mockRejectedValue(new Error("keychain unavailable"));

		const result = await saveCredentials(creds);

		expect(result.secure).toBe(false);
		expect(result.backend).toBe("plaintext-file");
		expect(result.downgradeReason).toContain("keychain unavailable");

		// Fallback write used mode 0o600.
		expect(writeFileMock).toHaveBeenCalledTimes(1);
		const callArgs = writeFileMock.mock.calls[0];
		const options = callArgs[2] as { mode?: number } | undefined;
		expect(options?.mode).toBe(0o600);
	});
});
