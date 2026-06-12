/**
 * CLI Theme Invariants
 *
 * Invariants for the brand-consistent theme helper functions.
 * Guards against brand-color regressions and formatting contract breaks.
 */

import { describe, expect, it } from "vitest";
import {
	BRAND_COLORS,
	formatCommand,
	formatLabelValue,
	formatSectionHeader,
	formatStep,
	STATUS_ICONS,
	theme,
} from "../../src/ui/theme.js";

describe("BRAND_COLORS  -  constants are stable", () => {
	it("primary is the Vreko green", () => {
		expect(BRAND_COLORS.primary).toBe("#4ADE80");
	});

	it("warning is the Vreko orange", () => {
		expect(BRAND_COLORS.warning).toBe("#FF6B35");
	});

	it("error is red", () => {
		expect(BRAND_COLORS.error).toBe("#EF4444");
	});
});

describe("theme object  -  callable chalk instances", () => {
	it("theme.brand is a function (callable chalk)", () => {
		expect(typeof theme.brand).toBe("function");
	});

	it("theme.brandBold is a function", () => {
		expect(typeof theme.brandBold).toBe("function");
	});

	it("theme.success is a function", () => {
		expect(typeof theme.success).toBe("function");
	});

	it("theme.error is a function", () => {
		expect(typeof theme.error).toBe("function");
	});

	it("theme.muted is a function", () => {
		expect(typeof theme.muted).toBe("function");
	});

	it("theme.tableHeader is a function", () => {
		expect(typeof theme.tableHeader).toBe("function");
	});
});

describe("STATUS_ICONS  -  constants are present", () => {
	it("has success icon", () => {
		expect(STATUS_ICONS.success).toBeDefined();
		expect(typeof STATUS_ICONS.success).toBe("string");
	});

	it("has error icon", () => {
		expect(STATUS_ICONS.error).toBeDefined();
	});

	it("has warning icon", () => {
		expect(STATUS_ICONS.warning).toBeDefined();
	});

	it("has info icon", () => {
		expect(STATUS_ICONS.info).toBeDefined();
	});
});

describe("formatCommand()", () => {
	it("prepends $ to the command string", () => {
		const result = formatCommand("vreko init");
		expect(result).toContain("$ vreko init");
	});

	it("works for multi-word commands", () => {
		const result = formatCommand("vreko daemon start --detach");
		expect(result).toContain("$ vreko daemon start --detach");
	});

	it("returns a non-empty string", () => {
		expect(formatCommand("").length).toBeGreaterThan(0);
	});
});

describe("formatSectionHeader()", () => {
	it("includes the title text", () => {
		const result = formatSectionHeader("Workspace Status");
		expect(result).toContain("Workspace Status");
	});

	it("returns a non-empty string", () => {
		expect(formatSectionHeader("Test").length).toBeGreaterThan(0);
	});
});

describe("formatLabelValue()", () => {
	it("includes both label and value", () => {
		const result = formatLabelValue("Email", "user@example.com");
		expect(result).toContain("Email");
		expect(result).toContain("user@example.com");
	});

	it("contains a colon separator", () => {
		const result = formatLabelValue("Version", "3.0.0");
		expect(result).toContain(":");
	});
});

describe("formatStep()", () => {
	it("includes the step number and description", () => {
		const result = formatStep("1", "Connect your account");
		expect(result).toContain("1");
		expect(result).toContain("Connect your account");
	});

	it("works for two-digit step numbers", () => {
		const result = formatStep("10", "Final step");
		expect(result).toContain("10");
		expect(result).toContain("Final step");
	});
});
