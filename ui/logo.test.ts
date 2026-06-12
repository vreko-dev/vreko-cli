/**
 * CLI Logo & Branding Invariants
 *
 * Tests for responsive logo selection, branded header, status header.
 * Invariant: terminal width thresholds must be stable (72/50/≤49).
 */

import { describe, expect, it } from "vitest";
import {
	displayBrandedHeader,
	displayDivider,
	displaySectionHeader,
	displayStatusHeader,
	displayWelcomeMessage,
	getLogo,
	LOGO_COMPACT,
	LOGO_LARGE,
	LOGO_MINIMAL,
} from "../../src/ui/logo.js";

describe("getLogo()  -  responsive width breakpoints", () => {
	it("returns LOGO_LARGE for width >= 72", () => {
		expect(getLogo(72)).toBe(LOGO_LARGE);
		expect(getLogo(100)).toBe(LOGO_LARGE);
		expect(getLogo(200)).toBe(LOGO_LARGE);
	});

	it("returns LOGO_COMPACT for width >= 50 and < 72", () => {
		expect(getLogo(71)).toBe(LOGO_COMPACT);
		expect(getLogo(50)).toBe(LOGO_COMPACT);
		expect(getLogo(60)).toBe(LOGO_COMPACT);
	});

	it("returns LOGO_MINIMAL for width < 50", () => {
		expect(getLogo(49)).toBe(LOGO_MINIMAL);
		expect(getLogo(40)).toBe(LOGO_MINIMAL);
		expect(getLogo(1)).toBe(LOGO_MINIMAL);
	});

	it("LOGO_LARGE has the most characters (widest)", () => {
		expect(LOGO_LARGE.length).toBeGreaterThan(LOGO_COMPACT.length);
	});

	it("LOGO_COMPACT has more characters than LOGO_MINIMAL", () => {
		expect(LOGO_COMPACT.length).toBeGreaterThan(LOGO_MINIMAL.length);
	});

	it("no logo variant has a leading newline", () => {
		expect(LOGO_LARGE).not.toMatch(/^\n/);
		expect(LOGO_COMPACT).not.toMatch(/^\n/);
		expect(LOGO_MINIMAL).not.toMatch(/^\n/);
	});
});

describe("displayBrandedHeader()", () => {
	it("returns a string", () => {
		const result = displayBrandedHeader();
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("includes version when provided", () => {
		const result = displayBrandedHeader({ version: "3.0.0" });
		expect(result).toContain("3.0.0");
	});

	it("omits version when not provided", () => {
		const result = displayBrandedHeader();
		expect(result).not.toContain("v3.0.0");
	});

	it("includes tagline by default", () => {
		const result = displayBrandedHeader({ color: false });
		expect(result).toContain("developer intelligence");
	});

	it("omits tagline when showTagline is false", () => {
		const result = displayBrandedHeader({ showTagline: false, color: false });
		expect(result).not.toContain("developer intelligence");
	});

	it("returns plain text when color is false", () => {
		const result = displayBrandedHeader({ color: false });
		// No ANSI escape codes when color is disabled
		expect(result).not.toContain("\x1B[");
	});
});

describe("displayWelcomeMessage()", () => {
	it("returns a non-empty string", () => {
		const result = displayWelcomeMessage();
		expect(result.length).toBeGreaterThan(0);
	});

	it("contains quick-start steps", () => {
		const result = displayWelcomeMessage();
		expect(result).toContain("vr login");
		expect(result).toContain("vr init");
	});

	it("contains docs link", () => {
		const result = displayWelcomeMessage();
		expect(result).toContain("docs.vreko.dev");
	});
});

describe("displayStatusHeader()", () => {
	it("returns empty string when no options provided", () => {
		const result = displayStatusHeader();
		expect(result).toBe("");
	});

	it("includes user when provided", () => {
		const result = displayStatusHeader({ user: "alice" });
		expect(result).toContain("alice");
	});

	it("includes pioneer number when provided", () => {
		const result = displayStatusHeader({ pioneerNumber: 42 });
		expect(result).toContain("42");
	});

	it("includes tier when provided", () => {
		const free = displayStatusHeader({ user: "bob", tier: "free" });
		expect(free).toContain("Free");

		const pro = displayStatusHeader({ user: "bob", tier: "pro" });
		expect(pro).toContain("Pro");
	});
});

describe("displayDivider()", () => {
	it("returns a string", () => {
		const result = displayDivider();
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("respects custom width", () => {
		const result = displayDivider(20);
		// The raw character count (ignoring ANSI) should be ~20
		const stripped = result.replace(/\x1B\[[0-9;]*m/g, "");
		expect(stripped.length).toBe(20);
	});

	it("uses the provided char", () => {
		const result = displayDivider(10, "=");
		expect(result).toContain("=");
	});
});

describe("displaySectionHeader()", () => {
	it("includes the title text", () => {
		const result = displaySectionHeader("Intelligence");
		expect(result).toContain("Intelligence");
	});

	it("returns a non-empty string", () => {
		expect(displaySectionHeader("Test").length).toBeGreaterThan(0);
	});
});
