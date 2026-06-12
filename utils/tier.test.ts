/**
 * Tier Resolution Invariants
 *
 * Tests for resolveTier() priority chain:
 *   CLI flag > VREKO_TIER env var > VREKO_API_KEY presence > default "free"
 *
 * Getting this wrong causes features to silently misbehave for paid tiers.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveTier } from "../../src/utils/tier.js";

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
	saved.VREKO_TIER = process.env.VREKO_TIER;
	saved.VREKO_API_KEY = process.env.VREKO_API_KEY;
	delete process.env.VREKO_TIER;
	delete process.env.VREKO_API_KEY;
});

afterEach(() => {
	if (saved.VREKO_TIER !== undefined) process.env.VREKO_TIER = saved.VREKO_TIER;
	else delete process.env.VREKO_TIER;

	if (saved.VREKO_API_KEY !== undefined) process.env.VREKO_API_KEY = saved.VREKO_API_KEY;
	else delete process.env.VREKO_API_KEY;
});

describe("resolveTier()  -  default", () => {
	it("returns 'free' when no flag, no env var, no API key", () => {
		expect(resolveTier()).toBe("free");
	});
});

describe("resolveTier()  -  CLI flag takes highest priority", () => {
	it("returns 'pro' when cliTier='pro'", () => {
		expect(resolveTier("pro")).toBe("pro");
	});

	it("returns 'enterprise' when cliTier='enterprise'", () => {
		expect(resolveTier("enterprise")).toBe("enterprise");
	});

	it("returns 'free' when cliTier='free'", () => {
		expect(resolveTier("free")).toBe("free");
	});

	it("CLI flag overrides VREKO_TIER env var", () => {
		process.env.VREKO_TIER = "enterprise";
		expect(resolveTier("free")).toBe("free");
	});

	it("CLI flag overrides VREKO_API_KEY", () => {
		process.env.VREKO_API_KEY = "sk-test";
		expect(resolveTier("free")).toBe("free");
	});

	it("ignores invalid CLI tier values and falls through to env", () => {
		process.env.VREKO_TIER = "pro";
		expect(resolveTier("invalid-tier")).toBe("pro");
	});
});

describe("resolveTier()  -  VREKO_TIER env var (second priority)", () => {
	it("returns 'pro' from env var", () => {
		process.env.VREKO_TIER = "pro";
		expect(resolveTier()).toBe("pro");
	});

	it("returns 'enterprise' from env var", () => {
		process.env.VREKO_TIER = "enterprise";
		expect(resolveTier()).toBe("enterprise");
	});

	it("ignores invalid VREKO_TIER values and falls through", () => {
		process.env.VREKO_TIER = "platinum";
		expect(resolveTier()).toBe("free");
	});

	it("env var overrides API key presence", () => {
		process.env.VREKO_TIER = "free";
		process.env.VREKO_API_KEY = "sk-test-key";
		expect(resolveTier()).toBe("free");
	});
});

describe("resolveTier()  -  VREKO_API_KEY presence (third priority)", () => {
	it("returns 'pro' when API key is present", () => {
		process.env.VREKO_API_KEY = "sk-test-key";
		expect(resolveTier()).toBe("pro");
	});

	it("returns 'pro' regardless of API key value", () => {
		process.env.VREKO_API_KEY = "any-value";
		expect(resolveTier()).toBe("pro");
	});
});

describe("resolveTier()  -  return type invariants", () => {
	it("always returns one of the three valid tiers", () => {
		const validTiers = new Set(["free", "pro", "enterprise"]);
		for (const input of [undefined, "free", "pro", "enterprise", "bogus", ""]) {
			expect(validTiers.has(resolveTier(input))).toBe(true);
		}
	});
});
