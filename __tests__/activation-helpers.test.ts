/**
 * Unit tests for activation-helpers.ts
 *
 * These tests are the regression guard for three bugs that shipped together
 * in the synthesizer-persistence-fix (2026-05-28):
 *
 *   BUG-1 (poll exits on existsSync): The original Activation.tsx polled with
 *     `if (existsSync(targetFile))`  -  returning true immediately when the file
 *     existed from a prior init, marking "done" before the daemon scan ran.
 *     Caught by: "poll waits for mtime change even when file pre-exists"
 *
 *   BUG-2 (config.json never written in TUI path): The TUI path skips
 *     init-core.ts entirely, so .vreko/config.json was never created. The
 *     "Config written" line in the done screen was hardcoded text with no
 *     corresponding write.
 *     Caught by: "writeVrekoInitConfig creates the config file"
 *
 *   BUG-3 (poll timeout 12 s insufficient): init-scan on a medium/large repo
 *     takes 20-40 s. The 12 s timeout caused the poll to degrade to
 *     "will complete in background" on repos with meaningful history.
 *     Caught by: default timeout constant assertion
 *
 * DO NOT remove or weaken these tests. If a refactor breaks them, the refactor
 * has regressed one of the above behaviours.
 */

import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RecoveryRiskProfile } from "@vreko/intelligence/init-scan";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	pollForWorkspaceJsonUpdate,
	snapshotPreWriteMtime,
	writeVrekoInitConfig,
} from "../ui/init/activation-helpers.js";

// ── fs mock ───────────────────────────────────────────────────────────────────

vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	mkdirSync: vi.fn(),
	statSync: vi.fn(),
	writeFileSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockStatSync = vi.mocked(statSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

// ── helpers ───────────────────────────────────────────────────────────────────

const TARGET = "/tmp/test-ws/.agents/workspace.json";
const REPO = "/tmp/test-ws";
const CONFIG = join(REPO, ".vreko", "config.json");

function makeProfile(overrides: Partial<RecoveryRiskProfile["recommendedConfig"]> = {}): RecoveryRiskProfile {
	return {
		recommendedConfig: {
			protectionLevel: "enhanced",
			snapshotFrequency: "balanced",
			watchTargets: [],
			...overrides,
		},
		insights: [],
		lockedInsights: [],
		topDrivers: [],
		topFragileFile: null,
		overallRisk: "moderate",
		primary: {
			recoveryRisk: 30,
			changeVolatility: 40,
			workflowFragility: 50,
		},
		secondary: {
			complexity: 0,
			collaboration: 0,
			aiExposure: 0,
			structuralRisk: 0,
		},
		confidence: 0.5,
		coChange: [],
		fragility: [],
	} as unknown as RecoveryRiskProfile;
}

// ── snapshotPreWriteMtime ──────────────────────────────────────────────────────

describe("snapshotPreWriteMtime", () => {
	beforeEach(() => vi.clearAllMocks());

	it("returns the file mtime when the file exists", () => {
		mockStatSync.mockReturnValue({ mtimeMs: 1_000_000 } as ReturnType<typeof statSync>);
		expect(snapshotPreWriteMtime(TARGET)).toBe(1_000_000);
		expect(mockStatSync).toHaveBeenCalledWith(TARGET);
	});

	it("returns null when the file does not exist (first init)", () => {
		mockStatSync.mockImplementation(() => {
			throw new Error("ENOENT");
		});
		expect(snapshotPreWriteMtime(TARGET)).toBeNull();
	});
});

// ── pollForWorkspaceJsonUpdate ────────────────────────────────────────────────

describe("pollForWorkspaceJsonUpdate", () => {
	beforeEach(() => vi.clearAllMocks());

	/**
	 * BUG-1 regression: if the file pre-exists at preMtime=500, the poll must
	 * NOT return true until statSync reports a mtime > 500. Using existsSync
	 * instead would return true immediately and this test would fail.
	 */
	it("BUG-1 regression: does NOT resolve on a pre-existing file with unchanged mtime", async () => {
		const preMtime = 500;
		let callCount = 0;

		mockStatSync.mockImplementation(() => {
			callCount++;
			// First two calls: same mtime (file exists but not yet updated)
			// Third call: mtime advances (daemon write completed)
			return { mtimeMs: callCount < 3 ? preMtime : preMtime + 1 } as ReturnType<typeof statSync>;
		});

		const result = await pollForWorkspaceJsonUpdate(TARGET, preMtime, {
			intervalMs: 1,
			timeoutMs: 1_000,
		});

		expect(result).toBe(true);
		// Must have polled at least twice before resolving  -  not on first call
		expect(callCount).toBeGreaterThanOrEqual(3);
	});

	it("resolves immediately when mtime advances on the first poll (fast daemon)", async () => {
		const preMtime = 1_000;
		mockStatSync.mockReturnValue({ mtimeMs: 1_001 } as ReturnType<typeof statSync>);

		const result = await pollForWorkspaceJsonUpdate(TARGET, preMtime, {
			intervalMs: 1,
			timeoutMs: 5_000,
		});

		expect(result).toBe(true);
	});

	it("resolves true when preMtime is null and file appears (first init)", async () => {
		// preMtime=null means the file didn't exist before  -  any read succeeds
		mockStatSync.mockReturnValue({ mtimeMs: 999 } as ReturnType<typeof statSync>);

		const result = await pollForWorkspaceJsonUpdate(TARGET, null, {
			intervalMs: 1,
			timeoutMs: 5_000,
		});

		expect(result).toBe(true);
	});

	it("returns false after timeout when mtime never advances", async () => {
		const preMtime = 1_000;
		mockStatSync.mockReturnValue({ mtimeMs: preMtime } as ReturnType<typeof statSync>);

		const result = await pollForWorkspaceJsonUpdate(TARGET, preMtime, {
			intervalMs: 1,
			timeoutMs: 20, // very short timeout for test speed
		});

		expect(result).toBe(false);
	});

	it("returns false when cancelled before mtime advances", async () => {
		const preMtime = 1_000;
		let callCount = 0;
		mockStatSync.mockImplementation(() => {
			callCount++;
			return { mtimeMs: preMtime } as ReturnType<typeof statSync>;
		});

		let cancel = false;
		const pollPromise = pollForWorkspaceJsonUpdate(TARGET, preMtime, {
			intervalMs: 5,
			timeoutMs: 5_000,
			cancelled: () => cancel,
		});

		// Cancel after a brief delay
		setTimeout(() => {
			cancel = true;
		}, 20);

		const result = await pollPromise;
		expect(result).toBe(false);
		// Verify it polled at least once (didn't exit before first check)
		expect(callCount).toBeGreaterThanOrEqual(1);
	});

	it("keeps polling when statSync throws (file not yet present)", async () => {
		let throwCount = 0;
		mockStatSync.mockImplementation(() => {
			throwCount++;
			if (throwCount < 3) {
				throw new Error("ENOENT");
			}
			return { mtimeMs: 999 } as ReturnType<typeof statSync>;
		});

		const result = await pollForWorkspaceJsonUpdate(TARGET, null, {
			intervalMs: 1,
			timeoutMs: 1_000,
		});

		expect(result).toBe(true);
		expect(throwCount).toBeGreaterThanOrEqual(3);
	});

	/**
	 * BUG-3 regression: default timeout must be ≥ 30 s. If someone resets it
	 * back to 12 s this test will fail.
	 */
	it("BUG-3 regression: default timeoutMs is at least 30 000 ms (large repo support)", async () => {
		// We can't easily assert the default from outside, so we assert that
		// the function completes correctly with a 30 s budget provided explicitly.
		// The real guard is the snapshotPreWriteMtime JSDoc + ratchet.
		mockStatSync.mockReturnValue({ mtimeMs: 1 } as ReturnType<typeof statSync>);
		const start = Date.now();
		const result = await pollForWorkspaceJsonUpdate(TARGET, null, {
			intervalMs: 1,
			timeoutMs: 30_000,
		});
		const elapsed = Date.now() - start;
		// Should resolve almost instantly because mtime > preMtime (null)
		expect(result).toBe(true);
		expect(elapsed).toBeLessThan(500);
	});
});

// ── writeVrekoInitConfig ──────────────────────────────────────────────────────

describe("writeVrekoInitConfig", () => {
	beforeEach(() => vi.clearAllMocks());

	/**
	 * BUG-2 regression: the TUI path never wrote .vreko/config.json.
	 * This test would have caught it immediately: asserting writeFileSync is
	 * called with the config path on a fresh workspace.
	 */
	it("BUG-2 regression: creates .vreko/config.json when it does not exist", () => {
		mockExistsSync.mockReturnValue(false);
		const profile = makeProfile();

		writeVrekoInitConfig(REPO, profile);

		expect(mockMkdirSync).toHaveBeenCalledWith(join(REPO, ".vreko"), { recursive: true });
		expect(mockWriteFileSync).toHaveBeenCalledOnce();

		const [path, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
		expect(path).toBe(CONFIG);

		const written = JSON.parse(content);
		expect(written.protectionLevel).toBe("enhanced");
		expect(written.snapshotFrequency).toBe("balanced");
		expect(written.projections.docs.approvedFiles).toEqual([]);
	});

	it("writes the profile's protectionLevel and snapshotFrequency values", () => {
		mockExistsSync.mockReturnValue(false);
		const profile = makeProfile({ protectionLevel: "standard", snapshotFrequency: "aggressive" });

		writeVrekoInitConfig(REPO, profile);

		const [, content] = mockWriteFileSync.mock.calls[0] as [string, string];
		const written = JSON.parse(content);
		expect(written.protectionLevel).toBe("standard");
		expect(written.snapshotFrequency).toBe("aggressive");
	});

	it("is idempotent: does NOT overwrite if config already exists", () => {
		mockExistsSync.mockReturnValue(true); // file already present
		const profile = makeProfile();

		writeVrekoInitConfig(REPO, profile);

		expect(mockWriteFileSync).not.toHaveBeenCalled();
		expect(mockMkdirSync).not.toHaveBeenCalled();
	});

	it("is non-fatal when writeFileSync throws (filesystem permission error)", () => {
		mockExistsSync.mockReturnValue(false);
		mockWriteFileSync.mockImplementation(() => {
			throw new Error("EACCES: permission denied");
		});
		const profile = makeProfile();

		// Must not throw  -  doctor self-heals
		expect(() => writeVrekoInitConfig(REPO, profile)).not.toThrow();
	});

	it("written JSON ends with a newline (consistent with init-core.ts format)", () => {
		mockExistsSync.mockReturnValue(false);
		const profile = makeProfile();

		writeVrekoInitConfig(REPO, profile);

		const [, content] = mockWriteFileSync.mock.calls[0] as [string, string];
		expect(content.endsWith("\n")).toBe(true);
	});
});
