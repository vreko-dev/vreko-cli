import { describe, expect, it } from "vitest";
import { Logo } from "../../../ui/init/Logo.js";

describe("Logo", () => {
	it("is a React component (function)", () => {
		expect(typeof Logo).toBe("function");
	});
});
