/**
 * Secure Credentials Tests
 *
 * FIX 4: Tests for OS keychain storage with fallback
 *
 * @see services/secure-credentials.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SecureCredentialsManager } from "../../src/services/secure-credentials";
import type { GlobalCredentials } from "../../src/services/vreko-dir";

// Force keytar to be "unavailable" so the encrypted-file fallback path is
// exercised deterministically. keytar is now a declared optionalDependency
// (AUTH-06) and may have a built native binary present, so we can no longer rely
// on its absence; the isAvailable() probe (getPassword) throwing makes the
// manager fall back, matching the no-keychain environment these tests target.
vi.mock("keytar", () => ({
	getPassword: vi.fn(async () => {
		throw new Error("keychain unavailable in test");
	}),
	setPassword: vi.fn(async () => {
		throw new Error("keychain unavailable in test");
	}),
	deletePassword: vi.fn(async () => false),
}));

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
	readFile: vi.fn(),
	writeFile: vi.fn(),
	unlink: vi.fn(),
	mkdir: vi.fn(),
}));

// Mock node:fs (sync) used by the AUTH-04 per-install secret  -  keep a stable
// in-memory secret so key derivation is deterministic within a test run and the
// real home dir is never touched.
const STABLE_SECRET = Buffer.alloc(32, 7);
vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return {
		...actual,
		existsSync: vi.fn(() => true),
		readFileSync: vi.fn(() => STABLE_SECRET),
		writeFileSync: vi.fn(),
		mkdirSync: vi.fn(),
		chmodSync: vi.fn(),
	};
});

// Mock os
vi.mock("node:os", () => ({
	homedir: () => "/mock/home",
	hostname: () => "test-machine",
	platform: () => "darwin",
	userInfo: () => ({ username: "testuser" }),
}));

describe("SecureCredentialsManager - FIX 4", () => {
	let manager: SecureCredentialsManager;

	beforeEach(() => {
		vi.clearAllMocks();
		// Create fresh instance for each test
		manager = new SecureCredentialsManager();
	});

	afterEach(() => {
		vi.resetModules();
	});

	describe("Provider Selection", () => {
		it("should initialize successfully", async () => {
			// Should not throw
			await manager.getCredentials();
		});

		it("should fallback to encrypted-file when keytar unavailable", async () => {
			// keytar is not available in test environment
			await manager.getCredentials();
			expect(manager.getProviderName()).toBe("encrypted-file");
		});
	});

	describe("Credentials Storage", () => {
		const testCredentials: GlobalCredentials = {
			accessToken: "test_token_123",
			refreshToken: "refresh_token_456",
			email: "test@example.com",
			tier: "pro",
			expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day
		};

		it("should save credentials without error", async () => {
			const { writeFile, mkdir } = await import("node:fs/promises");
			vi.mocked(mkdir).mockResolvedValue(undefined);
			vi.mocked(writeFile).mockResolvedValue(undefined);

			await expect(manager.setCredentials(testCredentials)).resolves.not.toThrow();
		});

		it("should retrieve saved credentials", async () => {
			const { readFile, writeFile, mkdir } = await import("node:fs/promises");
			vi.mocked(mkdir).mockResolvedValue(undefined);

			// Create encrypted data that can be decrypted
			// For this test, we'll mock the entire flow
			let storedData: Buffer | null = null;

			vi.mocked(writeFile).mockImplementation(async (_path, data) => {
				storedData = data as Buffer;
			});

			vi.mocked(readFile).mockImplementation(async () => {
				if (storedData) {
					return storedData;
				}
				throw new Error("File not found");
			});

			// Save
			await manager.setCredentials(testCredentials);

			// Retrieve
			const retrieved = await manager.getCredentials();

			expect(retrieved).not.toBeNull();
			expect(retrieved?.accessToken).toBe(testCredentials.accessToken);
			expect(retrieved?.email).toBe(testCredentials.email);
			expect(retrieved?.tier).toBe(testCredentials.tier);
		});

		it("should return null for non-existent credentials", async () => {
			const { readFile } = await import("node:fs/promises");
			vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

			const credentials = await manager.getCredentials();
			expect(credentials).toBeNull();
		});
	});

	describe("Login Status", () => {
		it("should return false when no credentials exist", async () => {
			const { readFile } = await import("node:fs/promises");
			vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

			const isLoggedIn = await manager.isLoggedIn();
			expect(isLoggedIn).toBe(false);
		});

		it("should return false when token is expired", async () => {
			const { readFile, writeFile, mkdir } = await import("node:fs/promises");
			vi.mocked(mkdir).mockResolvedValue(undefined);

			let storedData: Buffer | null = null;

			vi.mocked(writeFile).mockImplementation(async (_path, data) => {
				storedData = data as Buffer;
			});

			vi.mocked(readFile).mockImplementation(async () => {
				if (storedData) {
					return storedData;
				}
				throw new Error("File not found");
			});

			// Save expired credentials
			await manager.setCredentials({
				accessToken: "expired_token",
				email: "test@example.com",
				tier: "free",
				expiresAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
			});

			const isLoggedIn = await manager.isLoggedIn();
			expect(isLoggedIn).toBe(false);
		});

		it("should return true when valid credentials exist", async () => {
			const { readFile, writeFile, mkdir } = await import("node:fs/promises");
			vi.mocked(mkdir).mockResolvedValue(undefined);

			let storedData: Buffer | null = null;

			vi.mocked(writeFile).mockImplementation(async (_path, data) => {
				storedData = data as Buffer;
			});

			vi.mocked(readFile).mockImplementation(async () => {
				if (storedData) {
					return storedData;
				}
				throw new Error("File not found");
			});

			// Save valid credentials
			await manager.setCredentials({
				accessToken: "valid_token",
				email: "test@example.com",
				tier: "pro",
				expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
			});

			const isLoggedIn = await manager.isLoggedIn();
			expect(isLoggedIn).toBe(true);
		});
	});

	describe("Credentials Deletion", () => {
		it("should clear credentials without error", async () => {
			const { unlink } = await import("node:fs/promises");
			vi.mocked(unlink).mockResolvedValue(undefined);

			await expect(manager.clearCredentials()).resolves.not.toThrow();
		});

		it("should handle non-existent file gracefully", async () => {
			const { unlink } = await import("node:fs/promises");
			vi.mocked(unlink).mockRejectedValue(new Error("File not found"));

			await expect(manager.clearCredentials()).resolves.not.toThrow();
		});
	});

	describe("Encryption", () => {
		it("should not store credentials in plain text", async () => {
			const { readFile, writeFile, mkdir } = await import("node:fs/promises");
			vi.mocked(mkdir).mockResolvedValue(undefined);

			// Use object to store data (avoids TypeScript narrowing issues)
			const storage: { data: Buffer | null } = { data: null };

			vi.mocked(writeFile).mockImplementation(async (_path, data) => {
				storage.data = data as Buffer;
			});

			vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

			const credentials: GlobalCredentials = {
				accessToken: "super_secret_token",
				email: "secret@example.com",
				tier: "pro",
			};

			await manager.setCredentials(credentials);

			// Verify the stored data is not plain text JSON
			expect(storage.data).not.toBeNull();
			const storedString = storage.data?.toString("utf8");

			// Should NOT contain plain text token or email
			expect(storedString).not.toContain("super_secret_token");
			expect(storedString).not.toContain("secret@example.com");

			// Should not be valid JSON (encrypted)
			expect(() => JSON.parse(storedString)).toThrow();
		});
	});
});

describe("Secure Credentials Exports", () => {
	it("should export getCredentialsSecure", async () => {
		const mod = await import("../../src/services/secure-credentials");
		expect(typeof mod.getCredentialsSecure).toBe("function");
	});

	it("should export saveCredentialsSecure", async () => {
		const mod = await import("../../src/services/secure-credentials");
		expect(typeof mod.saveCredentialsSecure).toBe("function");
	});

	it("should export clearCredentialsSecure", async () => {
		const mod = await import("../../src/services/secure-credentials");
		expect(typeof mod.clearCredentialsSecure).toBe("function");
	});

	it("should export isLoggedInSecure", async () => {
		const mod = await import("../../src/services/secure-credentials");
		expect(typeof mod.isLoggedInSecure).toBe("function");
	});

	it("should export getSecureCredentials singleton getter", async () => {
		const mod = await import("../../src/services/secure-credentials");
		expect(typeof mod.getSecureCredentials).toBe("function");
	});
});

// ── AUTH-04: per-install entropy in key derivation ─────────────────────────────

describe("AUTH-04: per-install secret entropy (R-4.1, R-4.2)", () => {
	it("R-4.1: two installs (different per-install secrets) derive different keys", async () => {
		const { randomBytes } = await import("node:crypto");
		const { deriveKeyFromSecret } = await import("../../src/services/secure-credentials");

		// Same machine, same salt (the salt lives in the credential file header)  -
		// only the per-install secret differs, simulating a second install.
		const salt = randomBytes(32);
		const secretA = randomBytes(32);
		const secretB = randomBytes(32);

		const keyA = deriveKeyFromSecret(salt, secretA);
		const keyB = deriveKeyFromSecret(salt, secretB);

		expect(keyA.equals(keyB)).toBe(false);
	});

	it("R-4.1: identical secret + salt derive the same key (deterministic decrypt)", async () => {
		const { randomBytes } = await import("node:crypto");
		const { deriveKeyFromSecret } = await import("../../src/services/secure-credentials");

		const salt = randomBytes(32);
		const secret = randomBytes(32);

		expect(deriveKeyFromSecret(salt, secret).equals(deriveKeyFromSecret(salt, secret))).toBe(true);
	});

	it("R-4.2: the key depends on the per-install secret, not just header-derivable data", async () => {
		// Behavioral proof that the secret (not the in-file salt) is load-bearing:
		// holding machine data + salt constant, changing only the per-install secret
		// changes the derived key. An attacker who reads credentials.enc sees the
		// salt but not the secret, so cannot recompute the key.
		const { randomBytes } = await import("node:crypto");
		const { deriveKeyFromSecret } = await import("../../src/services/secure-credentials");

		const salt = randomBytes(32); // the value that DOES live in the file header
		const keyWithSecret1 = deriveKeyFromSecret(salt, Buffer.alloc(32, 1));
		const keyWithSecret2 = deriveKeyFromSecret(salt, Buffer.alloc(32, 2));

		// Same salt, different secret => different key. The header salt alone is
		// insufficient to derive the key.
		expect(keyWithSecret1.equals(keyWithSecret2)).toBe(false);
	});

	it("R-4.2: source stores the per-install secret outside the credential file at 0o600", async () => {
		// Static confirmation the secret lives in its own restricted-permission file.
		const realFs = await vi.importActual<typeof import("node:fs")>("node:fs");
		const { fileURLToPath } = await import("node:url");
		const srcPath = fileURLToPath(new URL("../../src/services/secure-credentials.ts", import.meta.url));
		const src = realFs.readFileSync(srcPath, "utf-8");
		expect(src).toContain("getOrCreatePerInstallSecret");
		expect(src).toContain("PER_INSTALL_SECRET_FILE");
		expect(src).toMatch(/mode:\s*0o600/);
	});
});
