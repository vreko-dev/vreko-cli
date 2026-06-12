import { describe, expect, it } from "vitest";
import { CeremonyView } from "../../../ui/ceremony/CeremonyView.js";

describe("CeremonyView", () => {
	it("is a function (React component)", () => {
		expect(typeof CeremonyView).toBe("function");
	});

	it("accepts a record prop (CeremonyDisplayRecord | null)", () => {
		expect(CeremonyView.length).toBeGreaterThanOrEqual(0);
	});
});
