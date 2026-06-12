/**
 * TTY/CI Detection Guards Invariants
 *
 * Tests for isInteractive(), termWidth(), supportsColor(), visual(), detectCapabilities().
 * These guards control whether Ink renders or chalk fallback is used  -  getting them wrong
 * causes silent rendering failures in CI or interactive prompts in pipes.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	detectCapabilities,
	isInteractive,
	supportsColor,
	TerminalCapabilities,
	termWidth,
	visual,
} from "../../src/ui/guards.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setTTY(value: boolean) {
	Object.defineProperty(process.stdout, "isTTY", {
		value,
		writable: true,
		configurable: true,
	});
}

describe("isInteractive()", () => {
	const savedCI = process.env.CI;

	beforeEach(() => {
		delete process.env.CI;
	});

	afterEach(() => {
		if (savedCI !== undefined) process.env.CI = savedCI;
		else delete process.env.CI;
		vi.restoreAllMocks();
	});

	it("returns true when isTTY=true and CI is not set", () => {
		setTTY(true);
		expect(isInteractive()).toBe(true);
	});

	it("returns false when isTTY=false", () => {
		setTTY(false);
		expect(isInteractive()).toBe(false);
	});

	it("returns false when CI is set even if isTTY=true", () => {
		setTTY(true);
		process.env.CI = "true";
		expect(isInteractive()).toBe(false);
	});

	it("returns false when both isTTY=false and CI set", () => {
		setTTY(false);
		process.env.CI = "1";
		expect(isInteractive()).toBe(false);
	});
});

describe("termWidth()", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns stdout columns when set", () => {
		Object.defineProperty(process.stdout, "columns", {
			value: 120,
			writable: true,
			configurable: true,
		});
		expect(termWidth()).toBe(120);
	});

	it("returns 80 when stdout.columns is 0/undefined", () => {
		Object.defineProperty(process.stdout, "columns", {
			value: 0,
			writable: true,
			configurable: true,
		});
		expect(termWidth()).toBe(80);
	});
});

describe("supportsColor()", () => {
	const savedNoColor = process.env.NO_COLOR;

	afterEach(() => {
		if (savedNoColor !== undefined) process.env.NO_COLOR = savedNoColor;
		else delete process.env.NO_COLOR;
		vi.restoreAllMocks();
	});

	it("returns true when isTTY=true and NO_COLOR not set", () => {
		setTTY(true);
		delete process.env.NO_COLOR;
		expect(supportsColor()).toBe(true);
	});

	it("returns false when isTTY=false", () => {
		setTTY(false);
		delete process.env.NO_COLOR;
		expect(supportsColor()).toBe(false);
	});

	it("returns false when NO_COLOR is set", () => {
		setTTY(true);
		process.env.NO_COLOR = "1";
		expect(supportsColor()).toBe(false);
	});
});

describe("visual()", () => {
	const savedCI = process.env.CI;

	afterEach(() => {
		if (savedCI !== undefined) process.env.CI = savedCI;
		else delete process.env.CI;
		vi.restoreAllMocks();
	});

	it("calls interactive() when isInteractive() returns true", () => {
		setTTY(true);
		delete process.env.CI;
		const interactive = vi.fn(() => "interactive-result");
		const fallback = vi.fn(() => "fallback-result");
		const result = visual(interactive, fallback);
		expect(interactive).toHaveBeenCalledOnce();
		expect(fallback).not.toHaveBeenCalled();
		expect(result).toBe("interactive-result");
	});

	it("calls fallback() when isInteractive() returns false", () => {
		setTTY(false);
		const interactive = vi.fn(() => "interactive-result");
		const fallback = vi.fn(() => "fallback-result");
		const result = visual(interactive, fallback);
		expect(fallback).toHaveBeenCalledOnce();
		expect(interactive).not.toHaveBeenCalled();
		expect(result).toBe("fallback-result");
	});

	it("calls fallback when CI is set", () => {
		setTTY(true);
		process.env.CI = "true";
		const interactive = vi.fn(() => "interactive");
		const fallback = vi.fn(() => "fallback");
		visual(interactive, fallback);
		expect(fallback).toHaveBeenCalledOnce();
	});
});

describe("detectCapabilities()", () => {
	it("returns a TerminalCapabilities object", () => {
		const caps = detectCapabilities();
		expect(typeof caps.isTTY).toBe("boolean");
		expect(typeof caps.isCI).toBe("boolean");
		expect(typeof caps.width).toBe("number");
		expect(typeof caps.supportsColor).toBe("boolean");
	});

	it("passes Zod schema validation", () => {
		const caps = detectCapabilities();
		const result = TerminalCapabilities.safeParse(caps);
		expect(result.success).toBe(true);
	});

	it("width is always at least 40", () => {
		const caps = detectCapabilities();
		expect(caps.width).toBeGreaterThanOrEqual(40);
	});

	it("reflects CI env var accurately", () => {
		const savedCI = process.env.CI;
		process.env.CI = "true";
		const caps = detectCapabilities();
		expect(caps.isCI).toBe(true);
		if (savedCI === undefined) delete process.env.CI;
		else process.env.CI = savedCI;
	});
});
