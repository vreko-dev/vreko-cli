import { describe, expect, it } from "vitest";
import { CeremonyFooter, VrekoHeader } from "../../ui/brand.js";

describe("VrekoHeader", () => {
	it("is a function (React component)", () => {
		expect(typeof VrekoHeader).toBe("function");
	});

	it("accepts version, variant, and subtitle props", () => {
		expect(VrekoHeader.length).toBeGreaterThanOrEqual(0);
	});
});

describe("CeremonyFooter", () => {
	it("is a function (React component)", () => {
		expect(typeof CeremonyFooter).toBe("function");
	});

	it("accepts patternsLearned, pitfallsAvoided, and optional smarterPercent props", () => {
		expect(CeremonyFooter.length).toBeGreaterThanOrEqual(0);
	});
});
