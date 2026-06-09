import { describe, expect, it } from "vitest";
import { Consent } from "../../../ui/init/Consent.js";

describe("Consent", () => {
	it("is a React component (function)", () => {
		expect(typeof Consent).toBe("function");
	});
});
