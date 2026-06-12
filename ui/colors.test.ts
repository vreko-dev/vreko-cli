/**
 * CLI Color System Invariants
 *
 * Tests for riskColor() boundaries and signalIcons constants.
 * Invariant: boundary thresholds (0.3, 0.5, 0.7, 0.9) must be stable.
 */

import { describe, expect, it } from "vitest";
import { riskColor, riskColors, signalColors, signalIcons } from "../../src/ui/colors.js";

describe("riskColor()  -  score boundary invariants", () => {
	it("score < 0.3 returns safe (green) color", () => {
		expect(riskColor(0)).toBe(riskColors.safe);
		expect(riskColor(0.1)).toBe(riskColors.safe);
		expect(riskColor(0.29)).toBe(riskColors.safe);
	});

	it("score = 0.3 returns low (cyan) color  -  boundary inclusive at low", () => {
		expect(riskColor(0.3)).toBe(riskColors.low);
	});

	it("score 0.3–0.499 returns low color", () => {
		expect(riskColor(0.4)).toBe(riskColors.low);
		expect(riskColor(0.49)).toBe(riskColors.low);
	});

	it("score = 0.5 returns medium (orange) color", () => {
		expect(riskColor(0.5)).toBe(riskColors.medium);
	});

	it("score 0.5–0.699 returns medium color", () => {
		expect(riskColor(0.6)).toBe(riskColors.medium);
		expect(riskColor(0.699)).toBe(riskColors.medium);
	});

	it("score = 0.7 returns high (red) color", () => {
		expect(riskColor(0.7)).toBe(riskColors.high);
	});

	it("score 0.7–0.899 returns high color", () => {
		expect(riskColor(0.8)).toBe(riskColors.high);
		expect(riskColor(0.899)).toBe(riskColors.high);
	});

	it("score = 0.9 returns critical color", () => {
		expect(riskColor(0.9)).toBe(riskColors.critical);
	});

	it("score 1.0 returns critical color", () => {
		expect(riskColor(1.0)).toBe(riskColors.critical);
	});
});

describe("riskColor()  -  return values are callable chalk functions", () => {
	for (const score of [0, 0.3, 0.5, 0.7, 0.9, 1]) {
		it(`riskColor(${score}) returns a callable function`, () => {
			const fn = riskColor(score);
			expect(typeof fn).toBe("function");
			// Should be callable like a chalk color
			const result = fn("test");
			expect(typeof result).toBe("string");
		});
	}
});

describe("riskColors  -  all entries are callable chalk functions", () => {
	for (const [name, fn] of Object.entries(riskColors)) {
		it(`riskColors.${name} is callable`, () => {
			expect(typeof fn).toBe("function");
			const result = fn("text");
			expect(typeof result).toBe("string");
		});
	}
});

describe("signalColors  -  all entries are callable chalk functions", () => {
	for (const [name, fn] of Object.entries(signalColors)) {
		it(`signalColors.${name} is callable`, () => {
			expect(typeof fn).toBe("function");
		});
	}
});

describe("signalIcons  -  all icon constants are non-empty strings", () => {
	for (const [name, icon] of Object.entries(signalIcons)) {
		it(`signalIcons.${name} is a non-empty string`, () => {
			expect(typeof icon).toBe("string");
			expect((icon as string).length).toBeGreaterThan(0);
		});
	}
});
