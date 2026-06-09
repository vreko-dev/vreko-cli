/**
 * Machine Mode Invariant Tests  -  Wave 0 (RED state for VREKO_PLAIN tests)
 *
 * Tests that VREKO_PLAIN=1 env var and --plain flag suppress TUI rendering.
 * The isInteractive()/visual() tests are GREEN (guards.ts already has them).
 * The VREKO_PLAIN-specific tests are RED until guards.ts is extended.
 *
 * Requirement ID: TUI-05
 */
import { afterEach, describe, expect, it, vi } from "vitest";

// guards.ts EXISTS  -  these imports resolve today
import { isInteractive, visual } from "../../guards.js";

describe("Machine mode  -  isInteractive() baseline (should be GREEN now)", () => {
	const originalEnv = { ...process.env };
	const originalStdout = process.stdout.isTTY;

	afterEach(() => {
		// Restore env
		process.env.CI = originalEnv.CI;
		delete process.env.VREKO_PLAIN;
		// isTTY is read-only on real stdout; tests that mutate it use Object.defineProperty
	});

	it("isInteractive() returns false when CI env is set", () => {
		process.env.CI = "1";
		// Force isTTY to appear true to isolate CI check
		Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
		expect(isInteractive()).toBe(false);
		Object.defineProperty(process.stdout, "isTTY", {
			value: originalStdout,
			configurable: true,
		});
	});

	it("visual() calls fallback when not interactive", () => {
		process.env.CI = "1";
		Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
		const interactive = vi.fn(() => "tui");
		const fallback = vi.fn(() => "json");
		const result = visual(interactive, fallback);
		expect(result).toBe("json");
		expect(interactive).not.toHaveBeenCalled();
		expect(fallback).toHaveBeenCalledOnce();
		Object.defineProperty(process.stdout, "isTTY", {
			value: originalStdout,
			configurable: true,
		});
	});
});

describe("Machine mode  -  VREKO_PLAIN env var (RED until 21-01 extends guards.ts)", () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		delete process.env.VREKO_PLAIN;
		process.env.CI = originalEnv.CI;
	});

	// TUI-INVARIANT: isInteractive() must return false when VREKO_PLAIN=1
	it("isInteractive() returns false when VREKO_PLAIN=1", () => {
		process.env.VREKO_PLAIN = "1";
		delete process.env.CI;
		Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
		// This will FAIL until guards.ts checks process.env.VREKO_PLAIN
		expect(isInteractive()).toBe(false);
	});

	// TUI-INVARIANT: visual() must call fallback when VREKO_PLAIN=1
	it("visual() calls json fallback when VREKO_PLAIN=1", () => {
		process.env.VREKO_PLAIN = "1";
		delete process.env.CI;
		Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
		const interactive = vi.fn(() => "tui");
		const fallback = vi.fn(() => "json");
		const result = visual(interactive, fallback);
		// This will FAIL until guards.ts is extended
		expect(result).toBe("json");
		expect(interactive).not.toHaveBeenCalled();
	});
});

describe("Machine mode  -  --plain flag propagation (RED until 21-01 wires Commander option)", () => {
	// TUI-05: --plain flag → VREKO_PLAIN=1 → isInteractive() === false
	// These are it.todo because the Commander option is wired in 21-01, not testable here without the full CLI entry point.
	it.todo("VREKO_PLAIN set via --plain flag causes isInteractive() to return false");
	it.todo("--plain flag JSON output contains expected keys for vr status machine mode");
});

describe("Machine mode  -  useDaemonPolling with mock client (RED until 21-01 creates hook)", () => {
	// TUI-06: useDaemonPolling returns null on connection failure
	// This import will fail until the hook is created
	it.todo("useDaemonPolling returns { daemon: null, error: string } when IPC fails");
	it.todo("useDaemonPolling returns daemon data when IPC succeeds");
	it.todo("useDaemonPolling cleans up interval on unmount");
});
