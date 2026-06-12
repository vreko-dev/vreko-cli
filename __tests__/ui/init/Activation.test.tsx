import { describe, expect, it } from "vitest";
import { Activation } from "../../../ui/init/Activation.js";

describe("Activation", () => {
	it("is a React component (function)", () => {
		expect(typeof Activation).toBe("function");
	});
});
